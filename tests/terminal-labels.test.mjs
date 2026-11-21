import assert from 'node:assert/strict';
import { reportedLabels } from '../src/integration/herdr/terminal-labels.js';
const none = { cwd: undefined, home: undefined };
assert.deepEqual(reportedLabels(), none);
assert.deepEqual(reportedLabels({ 'custom.cwd':'D:/project', 'custom.home':'C:/Users/local', 'previous.cwd':'D:/stale' }),
  { cwd:'D:/project', home:'C:/Users/local' });
assert.deepEqual(reportedLabels({ 'a1.cwd':'D:/agent', 'custom.claude.cwd':'D:/other', 'previous.home':'C:/old' }), none,
  'The shell facade knows no agent protocol; provider adapters own project reports');
console.log('PASS: agent-neutral shell directory reports; agent protocols stay outside the facade');
