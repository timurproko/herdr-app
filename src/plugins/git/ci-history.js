export const HISTORY_LIMIT=512;
export function parseHistory(text) {
  if(text===null)return {version:1,entries:[]};
  const value=JSON.parse(text);
  if(value?.version!==1||Object.keys(value).some(k=>!['version','entries'].includes(k))||!Array.isArray(value.entries)||value.entries.length>HISTORY_LIMIT
      ||value.entries.some(e=>!e||Object.keys(e).some(k=>!['key','at','token','outcome'].includes(k))||typeof e.key!=='string'||e.key.length>256
        ||!e.key.length||/[\u0000-\u001f\u007f]/.test(e.key)||!Number.isSafeInteger(e.at)||e.at<0
        ||(e.token!==undefined&&(typeof e.token!=='string'||!/^[a-z0-9-]{1,80}$/.test(e.token)))
        ||(e.outcome!==undefined&&!['attempted','delivered','unknown'].includes(e.outcome)))
      ||new Set(value.entries.map(e=>e.key)).size!==value.entries.length)throw Error('Invalid CI request history; refusing to overwrite it.');
  return value;
}
