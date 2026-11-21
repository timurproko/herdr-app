import { layout, spaces, shared, setShared, run } from '../api.js';
import { sidebarUsageVisible } from './model.js';
export { sidebarUsageVisible } from './model.js';
function usageNode(node) {
  if (node?.id === 'sidebar-usage') return node;
  for (const child of node?.children ?? []) {
    const found = usageNode(child);
    if (found) return found;
  }
  return null;
}
function visibilityChange(enabled) {
  const node = usageNode(layout());
  if (!node || node.content?.mod !== 'custom-usage' || !node.content?.props?.summary) return null;
  const machine = spaces().find(space => space.active)?.machine ?? null;
  const machineKey = machine === null ? 'local' : `remote:${machine}`;
  const visible = enabled && sidebarUsageVisible(shared(`custom.usage.${machineKey}.preferences`));
  const ownershipKey = `custom.usage.sidebar.${shared('layout') ?? 'Custom'}.auto-hidden`;
  const owned = shared(ownershipKey) === true;
  const hidden = node.hidden === true;
  if (visible === !hidden) return null;
  if (visible && !owned) return null; // Never undo somebody's deliberate layout.hide.
  return {hidden: !visible, ownershipKey};
}

// The permanently mounted header owns this, not the widget that may be hidden.
// Live layout/space/preferences reads wake it on pin, host and setting changes;
// no timer, render-time command, or additional usage collection is needed.
export function syncSidebarUsage(owner, cx, enabled = true) {
  const change = visibilityChange(enabled);
  if (!change || owner.usageVisibilityQueued || !cx?.spawn) return;
  owner.usageVisibilityQueued = true;
  cx.spawn(async () => {
    try {
      // A queued update must use the newest plugin, host and preferences.
      const latestEnabled = shared('custom.plugins')?.usage?.enabled !== false;
      const latest = visibilityChange(latestEnabled);
      if (!latest) return;
      if (latest.hidden) setShared(latest.ownershipKey, true);
      run(latest.hidden ? 'layout.hide' : 'layout.show', {id: 'sidebar-usage'});
      if (!latest.hidden) setShared(latest.ownershipKey, false);
    } finally { owner.usageVisibilityQueued = false; }
  });
}
