// Stable internal identity. Display names must not become feature dependencies.
export const CUSTOM = Object.freeze({
  id: 'custom', layout: 'Custom', theme: 'Custom', palette: 'custom-palette',
  owner: '.customizations', namespace: 'custom.',
});
export const isCustomLayout = name => String(name ?? '').toLowerCase() === CUSTOM.id;
export const modId = feature => `${CUSTOM.id}-${feature}`;
export const stateKey = name => `${CUSTOM.namespace}${name}`;
