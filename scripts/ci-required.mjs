// Every selected dependency must succeed; skipped or cancelled suites cannot satisfy the gate.
export function requiredProblems(needs) {
  const problems = [];
  for (const name of ['readiness', 'openspec', 'tests']) {
    if (needs[name]?.result !== 'success') problems.push(`${name}: expected success, got ${needs[name]?.result ?? 'missing'}`);
  }
  if (needs.readiness?.outputs?.ready !== 'true') problems.push('candidate is not ready');
  return problems;
}

if (process.env.NEEDS) {
  const problems = requiredProblems(JSON.parse(process.env.NEEDS));
  if (problems.length) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
  }
}
