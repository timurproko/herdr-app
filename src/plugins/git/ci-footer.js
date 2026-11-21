// Only a complete current footer paired with a usage row, never conversation PR mentions.
export function agentPullNumber(stdout, app = 'a1') {
  try {
    const screen = JSON.parse(stdout);
    if (screen.how !== 'screen' || screen.complete !== true || typeof screen.text !== 'string') return null;
    const lines = screen.text.trimEnd().split(/\r?\n/).slice(-8);
    if (app === 'claude-code') {
      if (!/\b[\d.]+[kKmM]?\/[\d.]+[kKmM]?\s+\d+(?:\.\d+)?%/.test(lines.at(-2) ?? '')) return null;
      const match = /^\s*[⏵⏸▶►]+\s+(?:auto mode|accept edits|bypass permissions|plan mode) on\s+\(shift\+tab to cycle\)\s*[·•]\s*PR #([1-9]\d*)\s*$/.exec(lines.at(-1) ?? '');
      const number = match ? Number(match[1]) : null;
      return Number.isSafeInteger(number) ? number : null;
    }
    if (app !== 'a1') return null;
    // The usage row: its context counter (13.1%/500k), or its token counters (↑67k ↓5.7k) when
    // a narrow pane cuts the row off before the counter. Either way it's the footer, not chat.
    const usage = line => /(?:\d+(?:\.\d+)?%|\?)\/[\d.]+[kKmM]?\b/.test(line) || /^\s*↑[\d.]+[kKmM]?\s+↓[\d.]+[kKmM]?(?:\s|$)/.test(line);
    for (let i = lines.length - 2; i >= 0; i--) {
      if (!usage(lines[i + 1])) continue;
      const match = /^\s*(?:[a-z]:[\\/]|\/|~(?:[\\/]|\s)).*?\s(?:[•·]\s)?#([1-9]\d*)(?:\s[•·].*)?\s*$/i.exec(lines[i]);
      const number = match ? Number(match[1]) : null;
      if (Number.isSafeInteger(number)) return number;
    }
  } catch {}
  return null;
}
