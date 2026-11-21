// Pure helpers for the copy notice (no host imports, so tests load them directly).
export function selectionSignature(list) {
  return (list || [])
    .filter(t => t && t.selection)
    .map(t => `${t.address}:${t.selection.start.row},${t.selection.start.col}-${t.selection.end.row},${t.selection.end.col}`)
    .sort()
    .join('|');
}

// What one clipboard check after a settled selection means. Herdr leaves the
// clipboard untouched when the copied text equals what it already holds (no write,
// no sequence-number change), so an unchanged clipboard on a later check is taken
// as the same text copied again.
// 'show': new text, a definite copy. 'assume': same text copied again (keep checking
// so a late real change still corrects the count). 'wait': look again if retries remain.
export const SAME_TEXT_AFTER = 1; // checks that must see the old text before assuming
export function copyDecision(text, clip, attempt, shown) {
  if (typeof text !== 'string' || !text.length) return 'wait';
  if (text !== clip) return 'show';
  if (!shown && attempt >= SAME_TEXT_AFTER) return 'assume';
  return 'wait';
}

export function countChars(text) {
  return [...String(text).replace(/\r\n/g, '\n')].length;
}

export function copiedLabel(count) {
  return `Copied ${count} ${count === 1 ? 'char' : 'chars'} to clipboard`;
}

// address -> selection key, for terminals with a selection.
export function selectionsByTerminal(list) {
  const out = {};
  for (const t of list || []) if (t && t.selection) out[t.address] = selectionSignature([t]);
  return out;
}

// The terminal whose selection is new or moved (null when only cleared).
export function changedTerminal(before, after) {
  for (const [address, key] of Object.entries(after || {})) if ((before || {})[address] !== key) return address;
  return null;
}
