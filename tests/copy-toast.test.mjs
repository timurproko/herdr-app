// Copy notice: selection signature, character count and label wording.
import assert from 'node:assert/strict';
import { selectionSignature, countChars, copiedLabel } from '../src/features/copy-toast/model.js';

assert.equal(selectionSignature([{ address: 't1', selection: null }]), '');
const sel = (a, r0, c0, r1, c1) => ({ address: a, selection: { start: { row: r0, col: c0 }, end: { row: r1, col: c1 } } });
assert.equal(selectionSignature([sel('t2', 1, 2, 3, 4), sel('t1', 0, 0, 0, 5)]), 't1:0,0-0,5|t2:1,2-3,4');
assert.notEqual(selectionSignature([sel('t1', 0, 0, 0, 5)]), selectionSignature([sel('t1', 0, 0, 0, 6)]));
assert.equal(countChars('questions'), 9);
assert.equal(countChars('a\r\nb'), 3);
assert.equal(countChars('ok 👍'), 4);
assert.equal(copiedLabel(9), 'Copied 9 chars to clipboard');
assert.equal(copiedLabel(1), 'Copied 1 char to clipboard');
console.log('copy-toast ok');

const { selectionsByTerminal, changedTerminal } = await import('../src/features/copy-toast/model.js');
const before = selectionsByTerminal([sel('t1', 0, 0, 0, 5)]);
assert.equal(changedTerminal(before, selectionsByTerminal([sel('t1', 0, 0, 0, 5), sel('t2', 1, 1, 1, 3)])), 't2');
assert.equal(changedTerminal(before, selectionsByTerminal([sel('t1', 0, 0, 0, 7)])), 't1');
assert.equal(changedTerminal(before, {}), null);
console.log('copy-toast tab ok');

const { copyDecision } = await import('../src/features/copy-toast/model.js');
assert.equal(copyDecision('new', 'old', 0, false), 'show');      // new text: at once
assert.equal(copyDecision('same', 'same', 0, false), 'wait');    // first check: maybe still dragging
assert.equal(copyDecision('same', 'same', 1, false), 'assume');  // re-copy of identical text
assert.equal(copyDecision('same', 'same', 2, true), 'wait');     // already shown: no repeat
assert.equal(copyDecision('late', 'same', 3, true), 'show');     // a late real change still wins
assert.equal(copyDecision(null, 'x', 4, false), 'wait');
assert.equal(copyDecision(undefined, 'x', 1, false), 'wait');    // read failed
console.log('copy-toast same-text ok');
