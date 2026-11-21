// Passive, synchronous capabilities. No host IO, preference gates or saved state.
import providers from './providers.js';
import { projectDirectory } from './validation.js';

/** Providers implement id, matches(context), and optional projectDirectory(context).
 * Reads are pure and terminal-local; unavailable/ambiguous/throwing capabilities
 * yield null, so callers keep their native/shell fallbacks. */
export function createAgentContext(registrations) {
  const list = Object.freeze([...registrations]);
  return Object.freeze({
    projectDirectory({ terminal, pane, now = Date.now() } = {}) {
      if (!terminal?.address || pane?.terminal && pane.terminal !== terminal.address) return null;
      const app = pane?.app ?? terminal.report?.app ?? terminal.reported?.app ?? terminal.app ?? terminal.program?.key;
      const context = Object.freeze({ terminal, pane, app, now });
      try {
        const matches = list.filter(provider => typeof provider.projectDirectory === 'function' && provider.matches(context));
        if (matches.length !== 1) return null;
        const provider = matches[0], cwd = projectDirectory(provider.projectDirectory(context));
        return cwd ? Object.freeze({ cwd, provider: provider.id }) : null;
      } catch { return null; }
    },
  });
}
const context = createAgentContext(providers);
export const agentProjectDirectory = input => context.projectDirectory(input);
