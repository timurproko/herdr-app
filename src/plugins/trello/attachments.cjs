'use strict';
const {id, object} = require('./credentials.cjs');
const {fail} = require('./errors.cjs');
const text = (s, max = 1024) => typeof s === 'string' && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s);
function bytes(value) {
  if (value === null) return null;
  if (typeof value === 'string' && /^\d{1,16}$/.test(value)) value = Number(value);
  if (!Number.isSafeInteger(value) || value < 0) fail('RESPONSE');
  return value;
}
function safeUrl(value) {
  if (!text(value, 8192)) fail('RESPONSE');
  let u; try { u = new URL(value); } catch { fail('RESPONSE'); }
  if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || [...u.searchParams.keys()].some(k => /^(?:key|token|oauth_token|oauth_consumer_key)$/i.test(k))) fail('RESPONSE');
  return u.href;
}
function attachment(value) {
  if (!object(value) || !id(value.id) || typeof value.isUpload !== 'boolean') fail('RESPONSE');
  const out = {id: value.id, isUpload: value.isUpload};
  for (const key of ['name', 'fileName', 'mimeType', 'date']) if (Object.hasOwn(value, key)) {
    if (!text(value[key])) fail('RESPONSE'); out[key] = value[key];
  }
  if (Object.hasOwn(value, 'bytes')) out.bytes = bytes(value.bytes);
  if (Object.hasOwn(value, 'url')) out.url = safeUrl(value.url);
  if (Object.hasOwn(value, 'previews')) {
    if (!Array.isArray(value.previews) || value.previews.length > 100) fail('RESPONSE');
    out.previews = value.previews.map(p => {
      if (!object(p) || !id(p.id ?? p._id) || ![p.width, p.height].every(n => Number.isSafeInteger(n) && n > 0) || typeof p.scaled !== 'boolean') fail('RESPONSE');
      return {id: p.id ?? p._id, width: p.width, height: p.height, scaled: p.scaled, url: safeUrl(p.url), ...(Object.hasOwn(p, 'bytes') ? {bytes: bytes(p.bytes)} : {})};
    });
  }
  return out;
}
function singleAttachment(value, expected) {
  // The REST schema describes an array; Object Definitions shows an object.
  if (Array.isArray(value)) { if (value.length !== 1) fail('RESPONSE'); [value] = value; }
  const out = attachment(value); if (out.id !== expected) fail('SCOPE'); return out;
}
async function listAttachments(client, scope, board, card, verifiedCard) {
  // Card detail already proved membership and validated this card response.
  // Reuse only that invocation's proof; standalone attachment reads still scan.
  if (verifiedCard === undefined) await scope.card(board, card);
  else if (!object(verifiedCard) || verifiedCard.id !== card || verifiedCard.idBoard !== board || !id(verifiedCard.idList)) fail('SCOPE');
  // Unlike checklist filters, attachment filter defaults to false (all
  // attachments); the documented alternative is cover, not all.
  const rows = await client.get(`/cards/${card}/attachments`, {fields: 'all'});
  if (!Array.isArray(rows)) fail('RESPONSE');
  const items = rows.slice(0, 100).map(attachment), complete = rows.length < 100;
  if (new Set(items.map(r => r.id)).size !== items.length) fail('RESPONSE');
  return {items, count: items.length, countExact: complete, complete, truncated: !complete};
}
function filename(value) {
  if (!text(value, 512) || !value || value === '.' || value === '..' || /[/\\\\:]/.test(value) || /[. ]$/.test(value) || /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(value)) fail('RESPONSE');
  return value;
}
function downloadUrl(value, card, target) {
  if (!id(card) || !id(target)) fail('SCOPE');
  let u; try { u = new URL(value); } catch { fail('RESPONSE'); }
  if (!['https://trello.com', 'https://api.trello.com'].includes(u.origin) || u.username || u.password || u.search || u.hash) fail('SCOPE');
  const prefix = `/1/cards/${card}/attachments/${target}/`;
  if (!u.pathname.startsWith(prefix)) fail('SCOPE');
  const rest = u.pathname.slice(prefix.length);
  if (/^previews\/[a-f0-9]{24}\/download$/.test(rest)) return u;
  if (!/^download\/[^/]+$/.test(rest)) fail('SCOPE');
  let name; try { name = decodeURIComponent(rest.slice('download/'.length)); } catch { fail('RESPONSE'); }
  filename(name); return u;
}
module.exports = {attachment, singleAttachment, listAttachments, bytes, safeUrl, filename, downloadUrl};
