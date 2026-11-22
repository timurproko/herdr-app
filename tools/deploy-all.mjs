// Explicit watched deployment, never a daemon or a terminal-based remote command.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import worker from './deploy-all-worker.cjs';
const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function deployAll(args = [], { root = project, log = console.log, ...options } = {}) {
  if (args.length) throw Error('Use npm run deploy:all (options are not yet supported).');
  let source;
  try { source = worker.checkSource(root, options); }
  catch (error) {
    log(`local: refused: ${error.message}; nothing deployed anywhere`);
    return { code: 1, results: [] };
  }
  let result;
  try {
    worker.fastForward(root, source.commit, options);
    result = worker.deployCheckout(root, source.commit, 'deploy', { ...options, log });
  } catch (error) { result = { action: 'failed', reason: error.message, commit: source.commit }; }
  log(`local: ${result.action}${result.reason ? ': ' + result.reason : ''}; source ${result.commit}; backup ${result.backup || '-'}`);
  return { code: result.action === 'failed' ? 1 : 0, results: [{ machine: 'local', ...result }] };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = deployAll(process.argv.slice(2)).code; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
