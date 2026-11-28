'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {safePath, security} = require('./credentials.cjs');
const {singleAttachment, downloadUrl, filename} = require('./attachments.cjs');
const {fail, TrelloError} = require('./errors.cjs');
const MAX_BYTES = 20 * 1024 * 1024;
const imageTypes = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
function mime(value) {
  if (typeof value !== 'string') fail('ATTACHMENT_TYPE');
  const type = value.split(';')[0].trim().toLowerCase();
  if (!/^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(type)) fail('ATTACHMENT_TYPE');
  return type;
}
function signature(buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  return null;
}
function representation(row, card, width) {
  if (!row.isUpload) fail('ATTACHMENT_LINK');
  if (width !== undefined) {
    const previews = (row.previews ?? []).filter(p => p.scaled).sort((a, b) => a.width - b.width || a.height - b.height || a.id.localeCompare(b.id));
    const preview = previews.find(p => p.width >= width) ?? previews.at(-1);
    if (!preview) fail('ATTACHMENT_PREVIEW');
    const url = downloadUrl(preview.url, card, row.id);
    if (url.pathname !== `/1/cards/${card}/attachments/${row.id}/previews/${preview.id}/download`) fail('SCOPE');
    return {...preview, url: url.href, name: 'preview', preview: true};
  }
  let name = row.fileName;
  if (row.url) {
    const url = downloadUrl(row.url, card, row.id);
    if (!url.pathname.startsWith(`/1/cards/${card}/attachments/${row.id}/download/`)) fail('SCOPE');
    if (!name) { try { name = decodeURIComponent(url.pathname.split('/').at(-1)); } catch { fail('RESPONSE'); } }
  }
  filename(name);
  const url = `https://trello.com/1/cards/${card}/attachments/${row.id}/download/${encodeURIComponent(name)}`;
  downloadUrl(url, card, row.id);
  return {url, name, bytes: row.bytes, preview: false};
}
async function binary(response, signal, expectedType, allowOtherTypes) {
  const type = mime(response.headers.get('content-type'));
  if (type !== expectedType || !allowOtherTypes && !imageTypes.has(type)) fail('ATTACHMENT_TYPE');
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)))) fail('RESPONSE');
  if (length !== null && Number(length) > MAX_BYTES) fail('ATTACHMENT_SIZE');
  if (!response.body || typeof response.body[Symbol.asyncIterator] !== 'function') fail('RESPONSE');
  const chunks = []; let size = 0;
  for await (const chunk of response.body) {
    if (signal.aborted) fail('TRANSPORT');
    size += chunk.byteLength; if (size > MAX_BYTES) fail('ATTACHMENT_SIZE');
    chunks.push(Buffer.from(chunk));
  }
  if (length !== null && size !== Number(length)) fail('RESPONSE');
  const buffer = Buffer.concat(chunks);
  // Recognized image MIME still requires the matching signature under opt-in.
  if (imageTypes.has(type) && signature(buffer) !== type) fail('ATTACHMENT_TYPE');
  return {buffer, type};
}
function outputFile(out, name, buffer, check, budget) {
  let dir, file, fd, owned;
  try {
    out = path.resolve(out); safePath(out);
    if (!fs.lstatSync(out).isDirectory()) fail('STORE_UNSAFE_PATH');
    check(); dir = fs.mkdtempSync(path.join(out, 'trello-attachment-'));
    safePath(dir); security(dir, true, true, {budget}); check();
    file = path.join(dir, name); fd = fs.openSync(file, 'wx', 0o600); owned = fs.fstatSync(fd);
    safePath(file); security(file, true, false, {budget}); check();
    const current = fs.lstatSync(file);
    if (!current.isFile() || current.nlink !== 1 || current.ino !== owned.ino || current.dev !== owned.dev) fail('STORE_UNSAFE_PATH');
    fs.writeFileSync(fd, buffer); fs.fsyncSync(fd);
    safePath(file); security(file, false, false, {budget}); check();
    fs.closeSync(fd); fd = undefined;
    return file;
  } catch (e) {
    if (fd !== undefined) fs.closeSync(fd);
    // Only files created exclusively by this invocation can be cleaned up.
    if (file && owned) {
      try { const s = fs.lstatSync(file); if (s.ino === owned.ino && s.dev === owned.dev) fs.unlinkSync(file); } catch {}
    }
    if (dir) { try { fs.rmdirSync(dir); } catch {} }
    if (e instanceof TrelloError) throw e;
    fail('STORE_IO');
  }
}
async function downloadAttachment(client, scope, a) {
  await scope.card(a.board, a.card);
  const row = singleAttachment(await client.get(`/cards/${a.card}/attachments/${a.attachment}`, {fields: 'all'}), a.attachment);
  const selected = representation(row, a.card, a.previewWidth), type = mime(row.mimeType);
  if ([client.gate.credentials.apiKey, client.gate.credentials.token].some(secret => selected.url.includes(secret) || selected.url.includes(encodeURIComponent(secret)))) fail('RESPONSE');
  if (!a.allowOtherTypes && !imageTypes.has(type) || selected.preview && !imageTypes.has(type)) fail('ATTACHMENT_TYPE');
  if (selected.bytes != null && selected.bytes > MAX_BYTES) fail('ATTACHMENT_SIZE');
  // No disk output before the complete bounded body and MIME/signature validation.
  const {buffer} = await client.download(selected.url, a.card, a.attachment, async (response, signal) => {
    try { return await binary(response, signal, type, a.allowOtherTypes === true); }
    catch (e) { try { Promise.resolve(response.body?.cancel()).catch(() => {}); } catch {} throw e; }
  });
  await scope.card(a.board, a.card); // Re-prove board membership before publishing.
  const extension = ({'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp'})[type] ?? '';
  let name = selected.preview ? 'preview' + extension : selected.name;
  for (const secret of [client.gate.credentials.apiKey, client.gate.credentials.token]) name = name.split(secret).join('redacted');
  name = `${row.id}-${name.replace(/[^\p{L}\p{N}._-]/gu, '_').slice(0, 180)}`;
  const file = outputFile(a.out, name, buffer, () => client.check(), client.budget);
  return {board: a.board, card: a.card, attachment: row.id, preview: selected.preview, ...(selected.preview ? {width: selected.width, height: selected.height} : {}), mimeType: type, bytes: buffer.length, path: file};
}
module.exports = {downloadAttachment, outputFile, representation, binary, signature, MAX_BYTES};
