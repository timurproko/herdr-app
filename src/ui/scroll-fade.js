import { div, Background, PathBuilder } from 'gpui-kit';

// Immutable native path, no hitbox or handlers: wheel/row presses pass through.
export function bottomFade(state, id, color, options) {
  return edgeFade(state, id, color, 'below', options);
}

export function topFade(state, id, color, options) {
  return edgeFade(state, id, color, 'above', options);
}

function edgeFade(state, id, color, edge, { left = 8, right = 8 } = {}) {
  state.fadeShape ??= PathBuilder.fill().move_to(0, 0).line_to('100%', 0)
    .line_to('100%', '100%').line_to(0, '100%').close().build();
  if (state.fadeColor !== color) {
    const transparent = /^#[0-9a-f]{6}$/i.test(color ?? '') ? `${color}00` : '#00000000';
    state.fadeBackground = Background.linear_gradient(180, transparent, color).color_space('srgb');
    state.topFadeBackground = Background.linear_gradient(180, color, transparent).color_space('srgb');
    state.fadeColor = color;
  }
  const above = edge === 'above';
  return div().id(`${id}-more-${edge}`).absolute().left(left).right(right).h(40)
    .when(above, el => el.top(0))
    .when(!above, el => el.bottom(0))
    .child(globalThis.window.paint_path(state.fadeShape, above ? state.topFadeBackground : state.fadeBackground).size_full());
}
