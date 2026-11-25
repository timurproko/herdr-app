#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const {Store, protectedInput, object} = require('./credentials.cjs');
const {setup, configure, status} = require('./setup.cjs');
const {run, definitions} = require('./operations.cjs');
const {fail, publicError} = require('./errors.cjs');
const help = `herdr-trello: scoped Trello JSON CLI (Node 20+)\n\nLocal: status; setup [--rotate] [--input PRIVATE_FILE]; policy allow/remove BOARD; policy writes on/off\nReads: boards list; lists list; cards list/get; labels list; checklists list; checkitems list\nEvery child operation needs --board BOARD and its explicit --card/--list/--checklist IDs.\nPaging: --limit 1..100 --before CARD_OR_ACTION_ID; lists/cards: --filter open|closed|all\nJSON input: --input FILE or stdin (setup/mutations only). Never pass credentials in argv.\nGlobal: --home HERDR_HOME; --json (results are JSON by default). No arbitrary HTTP operations.\nSee docs/TRELLO.md for setup, write authorization, scope, errors and revocation.\n`;
function parse(argv) {
  const words = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith('--')) { words.push(token); continue; }
    const key = token.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (Object.hasOwn(flags, key) || !/^[a-zA-Z]+$/.test(key)) fail('INPUT');
    if (['rotate', 'json'].includes(key)) flags[key] = true;
    else { if (!argv[i + 1] || argv[i + 1].startsWith('--')) fail('INPUT'); flags[key] = argv[++i]; }
  }
  return {words, flags};
}
async function inputText(file) {
  if (file) { const s = fs.statSync(file); if (!s.isFile() || s.size > 262144) fail('INPUT'); return fs.readFileSync(file, 'utf8'); }
  const chunks = []; let n = 0;
  for await (const chunk of process.stdin) { n += chunk.length; if (n > 262144) fail('INPUT'); chunks.push(Buffer.from(chunk)); }
  return Buffer.concat(chunks).toString('utf8');
}
async function execute(argv, options = {}) {
  try {
    if (argv.length === 1 && argv[0] === '--help') return {help, exit: 0};
    const {words, flags} = parse(argv);
    const home = flags.home; delete flags.home; delete flags.json;
    const store = options.store || new Store(home);
    const file = flags.input; delete flags.input;
    const readInput = async privateInput => {
      let text;
      try { text = options.input !== undefined ? options.input : privateInput && file ? protectedInput(file) : await inputText(file); } catch { fail('INPUT'); }
      if (typeof text !== 'string' || Buffer.byteLength(text) > 262144) fail('INPUT');
      try { const v = JSON.parse(text); if (!object(v)) fail('INPUT'); return v; } catch { fail('INPUT'); }
    };
    let data;
    if (words[0] === 'setup' && words.length === 1) {
      const rotate = flags.rotate === true; delete flags.rotate;
      if (Object.keys(flags).length) fail('INPUT');
      data = setup(store, await readInput(true), rotate);
    } else if (words[0] === 'status' && words.length === 1) {
      if (Object.keys(flags).length || file) fail('INPUT'); data = status(store);
    } else if (words[0] === 'policy' && words.length === 3) {
      if (Object.keys(flags).length || file) fail('INPUT'); data = configure(store, words[1], words[2]);
    } else {
      let op = words.slice(0, 2).join('.'), rest = words.slice(2);
      if (words[0] === 'cards' && words[1] === 'label') { op = words.slice(0, 3).join('.'); rest = words.slice(3); }
      if (!definitions[op]) fail('INPUT');
      if (rest.length) {
        if (rest.length !== 1 || !['cards.get', 'cards.update', 'cards.move', 'cards.archive'].includes(op) || flags.card) fail('INPUT');
        flags.card = rest[0];
      }
      if ('limit' in flags) { if (!/^\d+$/.test(flags.limit)) fail('INPUT'); flags.limit = Number(flags.limit); }
      if (file) fail('INPUT');
      data = await run(store, op, flags, options);
    }
    return {result: {version: 1, ok: true, data}, exit: 0};
  } catch (e) {
    const error = publicError(e);
    return {result: {version: 1, ok: false, error}, exit: error.code === 'INPUT' ? 2 : error.code === 'UNKNOWN_WRITE' ? 4 : 3};
  }
}
if (require.main === module) execute(process.argv.slice(2)).then(out => {
  process.stdout.write(out.help || JSON.stringify(out.result) + '\n'); process.exitCode = out.exit;
}).catch(() => { process.stdout.write(JSON.stringify({version: 1, ok: false, error: publicError(null)}) + '\n'); process.exitCode = 3; });
module.exports = {execute, parse, inputText, help};
