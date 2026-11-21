// Modal layout contract. Content rows own their spacing: parent stacks add none.
import { div } from 'gpui-kit';
export const M = Object.freeze({
  sectionInset: 12, rowMin: 64, bodyInset: 16,
  dividerGap: 12, compactDividerGap: 8,
  compactBodyInset: 6, compactFooterInset: 8,
  editorActionWidth: 88, editorActionHeight: 32,
});
export function sectionStack(element) { return element.w_full().gap(0); }
// Match a settings row's control baseline after the shared title/description block.
export function sectionAction(element) {
  return element.w_full().min_h(M.rowMin).py(M.sectionInset).items_center();
}
export function sectionRow(t, element, { last = false } = {}) {
  return element.w_full().min_h(M.rowMin).py(M.sectionInset)
    .when(!last, e => e.border_b(1).border_color(t.border));
}
export function dividerHeight(compact = false) {
  return 1 + 2 * (compact ? M.compactDividerGap : M.dividerGap);
}
export function divider(t, { id, compact = false, inset = 0 } = {}) {
  return div().when(Boolean(id), e => e.id(id)).h(dividerHeight(compact))
    .flex_none().px(inset).flex().items_center()
    .child(div().h(1).w_full().bg(t.border));
}
export function editorActionButton(element) {
  return element.w(M.editorActionWidth).h(M.editorActionHeight);
}
export function modalFooter(t, element) {
  return element.flex_none().px(M.bodyInset).py(M.bodyInset)
    .border_t(1).border_color(t.border);
}
