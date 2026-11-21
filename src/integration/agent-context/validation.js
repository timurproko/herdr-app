// Pure project-report validation, shared by providers and the consumer boundary.
export function projectDirectory(value) {
  if (typeof value !== 'string' || value.length > 4096 || /[\x00-\x1f\x7f-\x9f\u2028\u2029]/u.test(value)
    || !/^(?:[A-Za-z]:[\\/]|\/|\\\\[^\\]+\\[^\\]+)/u.test(value)) return null;
  try { if (encodeURIComponent(value).replace(/%[0-9A-F]{2}/gu, 'x').length > 4096) return null; }
  catch { return null; }
  const path = value.replace(/\\/g, '/');
  return /^[A-Za-z]:\/+$/u.test(path) ? path.slice(0, 2) + '/' : path.replace(/\/+$/u, '') || '/';
}
export function freshReportAt(value, now) {
  if (typeof value !== 'string' || !/^\d{1,16}$/u.test(value) || !Number.isSafeInteger(Number(value)) || !Number.isFinite(now)) return false;
  return now - Number(value) >= -5_000 && now - Number(value) < 90_000;
}
export const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value);
export const sessionIdentity = value => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\x00-\x20\x7f-\x9f\u2028\u2029]/u.test(value);
