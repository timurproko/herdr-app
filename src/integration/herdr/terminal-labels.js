// Agent-neutral shell reports. Project capabilities belong to provider adapters.
export function reportedLabels(labels = {}) {
  return { cwd: labels['custom.cwd'], home: labels['custom.home'] };
}
