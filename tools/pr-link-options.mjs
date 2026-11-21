// Pure argument parsing. Never imports live-home diagnostics.
export function prLinkOptions(args) {
  const [repository, ...values] = args;
  if (!/^[A-Za-z0-9][A-Za-z0-9_.-]*\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(repository ?? '') || !values.length)
    throw Error('Use: node tools/inspect-pr-links.mjs owner/repository PR-number [PR-number ...]');
  const numbers = values.map(value => {
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw Error('Invalid PR number.');
    return Number(value);
  });
  if (new Set(numbers).size !== numbers.length) throw Error('Duplicate PR number.');
  return {repository, numbers};
}
