// The panel kit: composite parts plugin panels and dialogs share (the Files and Git
// sidebars, the Usage dialog). Built from ui.js's basics (iconButton, menuRow, tag), which
// the whole app uses; Settings has its own kit (settings-kit.js).
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { U, spinner, menuSurface, menuHeading, menuRow, menuSeparator, iconButton, dropdown, pillTrigger, pillMenu, dialogSurface, dialogHeader, dialogBody, description, button } from './ui.js';
export { tag } from './ui.js';

// A hover card's body: rows of cells laid out as left-aligned columns, so separators
// line up. Odd columns (separators, trailing notes) are dimmed.
export function hintTable(t, rows) {
  const columns = (rows[0] ?? []).map((_cell, index) => v_flex().flex_none().gap(2).text_color(index % 2 ? t.dim : t.foreground)
    .children(rows.map(row => div().h(18).flex().items_center().whitespace_nowrap().child(row[index] ?? ''))));
  return menuSurface(t).px(10).py(6).flex().gap(6).text_size(U.meta).children(columns);
}

// A panel header's icon button: ui.js's iconButton, inert until the header is hovered.
export const headerTool = (t, { id, icon, label, enabled = true, onClick }) => iconButton(t, { id, icon, label, enabled, onClick: (_e, cx) => onClick(cx) });

// What a panel shows instead of its content: the working bulb with "Loading" while it
// reads, otherwise a short muted line ("No open pull requests", an error). The bulb already
// says it's busy, so the word has no "…" (like the plugins' "Checking").
// A message sits exactly where the panel's first row does, so swapping it for content
// (Loading… → the first file or PR) moves nothing: the row's 8px side inset and a box of
// the row's height with the text centred. `rowInset` grows that box by the same amount
// above and below, for rows whose first line sits lower than a plain list row's (the Git
// panel's PR rows: a 20px title line 6px down = a 28px row plus 2px).
export function panelMessage(t, id, { text, loading = false, rowInset = 0 }) {
  const line = el => el.px(8).py(rowInset).min_h(U.row + 2 * rowInset).items_center();
  if (loading) return line(h_flex().id(id)).gap(6)
    .child(spinner(t.working)).child(div().text_size(U.meta).text_color(t.working).child((text ?? 'Loading').replace(/\s*(?:…|\.{3})$/u, '')));
  return line(h_flex().id(id)).text_size(U.meta).text_color(t.dim).child(text);
}

// A right-click menu: `items: [{ id, label, icon, separator? }]` (separator: a line above).
// Arrow keys move the highlight, Enter chooses it, Escape closes; the pointer highlights
// too. `state` keeps the highlight across renders (any object, e.g. the panel).
export function contextMenu(t, { id, prefix, items, heading = null, headingId = `${prefix}-title`, focus = null, state, onChoose, onClose }) {
  const at = state.menuAt ?? null;
  return menuSurface(t, v_flex()).id(id).w_full().text_color(t.foreground)
    .when(Boolean(focus), el => el.track_focus(focus))
    .on_key_down((event, cx) => {
      if (event.key === 'escape') onClose(cx);
      else if (event.key === 'enter') onChoose(items[at ?? 0], cx);
      else if (event.key === 'down' || event.key === 'up') {
        const step = event.key === 'down' ? 1 : -1;
        state.menuAt = ((at ?? (step > 0 ? -1 : 0)) + step + items.length) % items.length;
        state.menuKeyboard = true; cx.notify();
      } else return;
      cx.stop_propagation();
    })
    .when(Boolean(heading), el => el.child(menuHeading(t, heading).id(headingId)
      .h(24).px(8).flex_none().flex().items_center().min_w(0).truncate()))
    .children(items.flatMap((item, index) => [
      ...(item.separator ? [menuSeparator(t, `${prefix}-separator`)] : []),
      menuRow(t, { id: `${prefix}-${item.id}`, icon: item.icon, label: item.label, highlighted: state.menuKeyboard === true && at === index,
        onHover: (over, cx) => {
          if (!over) return;
          const changed = state.menuKeyboard || state.menuAt !== index;
          state.menuKeyboard = false; state.menuAt = index; if (changed) cx.notify();
        },
        onClick: (_e, cx) => onChoose(item, cx) })]));
}

// A question before something that cannot be undone here: title, what happens, what it
// applies to, then Cancel and the action (80px each). Escape cancels, Enter confirms.
export function confirmDialog(t, { id, title, body, subject = null, confirm, confirmEnabled = true, confirmDanger = false, focus = null, onCancel, onConfirm }) {
  return dialogSurface(t, v_flex()).id(id).overflow_hidden().when(Boolean(focus), el => el.track_focus(focus))
    .on_key_down((e, cx) => {
      if (e.key === 'escape') onCancel(cx);
      else if (e.key === 'enter') onConfirm(cx);
      else return;
      cx.stop_propagation();
    })
    .child(dialogHeader(t, title, () => onCancel()))
    .child(dialogBody(v_flex()).gap(8)
      .child(description(t, body))
      .when(Boolean(subject), el => el.child(div().text_size(U.meta).text_color(t.foreground).child(subject))))
    .child(h_flex().p(16).gap(8).justify_end().border_t(1).border_color(t.border)
      .child(button(t, `${id}-cancel`, 'Cancel', (_e, cx) => onCancel(cx)).w(80))
      .child(button(t, `${id}-confirm`, confirm, (_e, cx) => onConfirm(cx), { primary: true, danger: confirmDanger, enabled: confirmEnabled }).w(80)));
}

// A dropdown that reads as text (an account's email with a chevron) rather than a field.
// `options: [{ id, label }]`; the chosen one is ticked. Every row keeps the tick's slot,
// so choosing never changes the menu's width.
export function inlineDropdown(t, { id, text, label, options, selected, open, focus, onOpen, onSelect, optionPrefix = id, hover }) {
  const trigger = pillTrigger(t, id, { label, open, hover, children: [div().min_w(0).truncate().child(text)] }).text_size(U.meta);
  const list = menuSurface(t, v_flex()).min_w(180).max_w(360).max_h(280).overflow_y_scroll().track_focus(focus)
    .children(options.map(option => menuRow(t, { id: `${optionPrefix}-${option.id}`, label: option.label, onClick: (_e, cx) => onSelect(option.id, cx),
      trailing: div().size(U.smallIcon).flex_none().when(option.id === selected, e => e.child(svg('mods/custom-workspace-chrome/check.svg').size(U.smallIcon)))
    }).min_w(0)));
  return dropdown(`${id}-popup`, trigger, pillMenu(list), { open, focus, onOpen });
}
