// Keep entry IDs/history and displayed bindings native; route only at activation.
export function paletteCommand(entry, skin) {
  if (skin && entry.name === "app.settings") return { name: "mod.open", args: { name: "custom-settings" } };
  const mod = { picker: "custom-picker", settings: "custom-settings", "machine-add": "custom-machine-add", worktree: "custom-worktree" }[entry.args?.name];
  if (skin && entry.name === "mod.open" && typeof mod === "string") return { name: "mod.open", args: { ...entry.args, name: mod } };
  // Inline rename editors; custom-tabs falls back to Herdr's prompt when they can't open.
  if (skin && entry.name === "tab.rename") return { name: "custom-tabs.rename-tab", args: {} };
  if (skin && entry.name === "space.rename") return { name: "custom-tabs.rename-space", args: {} };
  // Only untargeted built-in entries go through the tab bar's shared receiver;
  // never discard explicit command arguments or broaden a targeted close.
  if (skin && ['pane.close', 'tab.close', 'space.close'].includes(entry.name) && !Object.keys(entry.args ?? {}).length) {
    return { name: `custom-tabs.close-${entry.name.split('.')[0]}`, args: {} };
  }
  return { name: entry.name, args: entry.args };
}
