// The existing Claude hook reports session.root(), not a tool's transient cd.
import { freshReportAt, sessionIdentity } from '../validation.js';
export default {
  id: 'claude-code',
  matches: ({ app }) => app === 'claude-code' || app === 'claude',
  projectDirectory({ terminal, now }) {
    const labels = terminal.labels ?? {};
    if (!sessionIdentity(labels['custom.claude.session']) || !freshReportAt(labels['custom.claude.at'], now)) return null;
    return labels['custom.claude.cwd'];
  },
};
