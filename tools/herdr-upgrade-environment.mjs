// Candidate code/tests never inherit GitHub, delivery, provider or Node preload credentials.
export function testEnvironment(env=process.env) {
  const allowed=['PATH','Path','HOME','USERPROFILE','SYSTEMROOT','SystemRoot','WINDIR','COMSPEC','ComSpec','PATHEXT','TEMP','TMP','TMPDIR','APPDATA','LOCALAPPDATA','ProgramFiles','ProgramFiles(x86)','NUMBER_OF_PROCESSORS'];
  return {...Object.fromEntries(allowed.filter(k=>env[k]!==undefined).map(k=>[k,env[k]])),CI:'true'};
}
