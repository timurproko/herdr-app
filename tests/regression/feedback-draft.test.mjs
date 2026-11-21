import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { feedbackDraft, buildDraft, parseArgs, DRAFT_FILE } from './feedback-draft.mjs';

// Disposable fixture home; never opens a real dialog (run is stubbed) or sends feedback.
const here = path.dirname(fileURLToPath(import.meta.url));
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'custom-feedback-draft-'));
try {
  const shot = path.join(home, 'shot.png'); fs.writeFileSync(shot, 'png');
  const msgFile = path.join(home, 'msg.txt'); fs.writeFileSync(msgFile, 'Line one\r\nLine two\r\n');
  const calls = [], run = args => { calls.push(args); return ''; };

  assert.throws(() => parseArgs(['--email']), /needs a value/);
  assert.throws(() => parseArgs(['--bogus']), /Unknown option/);
  const base = { images: [], from: 'person' };
  assert.throws(() => buildDraft({ ...base, message: '  ' }), /empty/);
  assert.throws(() => buildDraft({ ...base, message: 'x'.repeat(4001) }), /4001 characters/);
  assert.equal(buildDraft({ ...base, message: '😀'.repeat(4000) }).chars, 4000, 'Counts characters, not UTF-16 units');
  assert.throws(() => buildDraft({ ...base, message: 'hi', email: 'nope' }), /Not an email/);
  assert.throws(() => buildDraft({ ...base, message: 'hi', images: ['a.png', 'b.png', 'c.png', 'd.png'] }), /limit is 3/);
  assert.throws(() => buildDraft({ ...base, message: 'hi', images: ['notes.txt'] }), /Not an image/);
  assert.throws(() => buildDraft({ ...base, message: 'hi', images: [path.join(home, 'missing.png')] }), /No such file/);
  assert.throws(() => buildDraft({ ...base, message: 'hi', from: 'robot' }), /person or agent/);

  // Without the dialog patch, email/images would be silently dropped: refuse.
  assert.throws(() => feedbackDraft(['--message', 'hi', '--email', 'me@example.invalid'], { home, run }), /patch is not applied/);
  assert.equal(calls.length, 0);
  // A plain message works without the patch.
  feedbackDraft(['--message', 'hi'], { home, run });
  assert.deepEqual(JSON.parse(calls.at(-1)[2]), { message: 'hi', from: 'person' });

  fs.mkdirSync(path.join(home, 'frame/feedback'), { recursive: true });
  fs.writeFileSync(path.join(home, 'frame/feedback/main.js'), `const DRAFT_FILE = ".customizations/feedback-draft.json";`);
  const dry = feedbackDraft(['--message-file', msgFile, '--image', shot, '--dry-run'], { home, run });
  assert.equal(dry.dryRun, true); assert.equal(calls.length, 1, 'Dry run opens nothing');

  const result = feedbackDraft(['--message-file', msgFile, '--email', 'me@example.invalid', '--image', shot, '--from', 'agent'], { home, run, now: 1234 });
  assert.deepEqual(result, { chars: 17, email: true, images: 1, patched: true, opened: true });
  assert.deepEqual(calls.at(-1).slice(0, 2), ['do', 'app.feedback']);
  assert.deepEqual(JSON.parse(calls.at(-1)[2]), { message: 'Line one\nLine two', from: 'agent' });
  const draft = JSON.parse(fs.readFileSync(path.join(home, DRAFT_FILE), 'utf8'));
  assert.deepEqual(draft, { version: 1, created: 1234, message: 'Line one\nLine two', email: 'me@example.invalid', images: [shot] });
  assert.ok(fs.readFileSync(path.join(here, 'feedback-draft.mjs'), 'utf8').includes("'do', 'app.feedback'"), 'Only ever opens the review dialog');
  console.log('PASS: feedback-draft validates limits, refuses unpatched email/images, writes a one-time draft and opens app.feedback (no real dialog or send)');
} finally { fs.rmSync(home, { recursive: true, force: true }); }
