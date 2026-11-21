// Opens Herdr's Send feedback dialog filled in: message (app.feedback), plus email and up to
// 3 screenshots through a one-time draft the patched dialog loads. Never sends: the person
// reviews the dialog and clicks Send.
//
//   node feedback-draft.mjs --message-file request.txt [--email you@x.com] [--image a.png]...
//                           [--message "text"] [--from person|agent] [--dry-run]
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const MAX_CHARS = 4000;
export const MAX_IMAGES = 3;
const IMAGE = /\.(png|jpe?g|gif|webp|bmp)$/i;
export const DRAFT_FILE = '.customizations/feedback-draft.json';
const MARKER = 'feedback-draft.json';

export function parseArgs(argv) {
  const out = { images: [], from: 'person', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i], value = () => {
      if (i + 1 >= argv.length) throw Error(`${flag} needs a value.`);
      return argv[++i];
    };
    if (flag === '--message') out.message = value();
    else if (flag === '--message-file') out.messageFile = value();
    else if (flag === '--email') out.email = value();
    else if (flag === '--image') out.images.push(value());
    else if (flag === '--from') out.from = value();
    else if (flag === '--dry-run') out.dryRun = true;
    else throw Error(`Unknown option ${flag}.`);
  }
  return out;
}

/** Validates and returns the draft (absolute image paths) or throws with every problem. */
export function buildDraft(opts, { cwd = process.cwd(), now = Date.now(), exists = fs.existsSync, readFile = f => fs.readFileSync(f, 'utf8') } = {}) {
  const problems = [];
  if (opts.message != null && opts.messageFile) problems.push('Use --message or --message-file, not both.');
  let message = opts.messageFile ? readFile(path.resolve(cwd, opts.messageFile)) : (opts.message ?? '');
  message = message.replace(/\r\n?/g, '\n').trim();
  const chars = [...message].length;
  if (!message) problems.push('The message is empty.');
  if (chars > MAX_CHARS) problems.push(`The message is ${chars} characters; the limit is ${MAX_CHARS}.`);
  const email = (opts.email ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push(`Not an email address: ${email}`);
  if (!['person', 'agent'].includes(opts.from)) problems.push('--from is person or agent.');
  if (opts.images.length > MAX_IMAGES) problems.push(`${opts.images.length} images; the limit is ${MAX_IMAGES}.`);
  const images = opts.images.map(p => path.resolve(cwd, p));
  for (const p of images) {
    if (!IMAGE.test(p)) problems.push(`Not an image (png, jpg, gif, webp, bmp): ${p}`);
    else if (!exists(p)) problems.push(`No such file: ${p}`);
  }
  if (problems.length) throw Error(problems.join('\n'));
  return { version: 1, created: now, message, email, images, from: opts.from, chars };
}

export function feedbackDraft(argv, { home, run = (args) => execFileSync('herdr-app', args, { encoding: 'utf8', timeout: 30000, stdio: ['ignore', 'pipe', 'pipe'] }), now } = {}) {
  const opts = parseArgs(argv);
  const draft = buildDraft(opts, { now });
  const file = path.join(home, DRAFT_FILE);
  const patched = (() => { try { return fs.readFileSync(path.join(home, 'frame/feedback/main.js'), 'utf8').includes(MARKER); } catch { return false; } })();
  const summary = { chars: draft.chars, email: Boolean(draft.email), images: draft.images.length, patched };
  if (opts.dryRun) return { ...summary, dryRun: true };
  if ((draft.email || draft.images.length) && !patched) throw Error('The feedback dialog patch is not applied, so email and images would be dropped. Run npm run deploy, or leave them out.');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const { chars, from, ...stored } = draft;
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(stored, null, 2) + '\n');
  fs.renameSync(temp, file);
  run(['do', 'app.feedback', JSON.stringify({ message: draft.message, from: draft.from })]);
  return { ...summary, opened: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const home = process.env.HERDR_APP_HOME || path.join(process.env.USERPROFILE || process.env.HOME, '.config/herdr-app');
  try { console.log(JSON.stringify(feedbackDraft(process.argv.slice(2), { home }))); }
  catch (e) { console.error(e.message); process.exitCode = 1; }
}
