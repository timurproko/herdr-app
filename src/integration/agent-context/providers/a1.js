// A1's public native report. Paths are hints, never session-control authority.
import { freshReportAt, uuid } from '../validation.js';
export default {
  id: 'a1',
  matches: ({ app }) => app === 'a1',
  projectDirectory({ terminal, now }) {
    const labels = terminal.labels ?? {};
    if (!uuid(labels['a1.session']) || !uuid(labels['a1.runtime']) || !freshReportAt(labels['a1.at'], now)
      || labels['a1.cwd.binding'] !== `${labels['a1.runtime']}/${labels['a1.session']}/${labels['a1.at']}`) return null;
    return labels['a1.cwd'];
  },
};
