// Explicit, reversible Bash Readline preference. Does not touch running shells or clipboard data.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const BLOCK='# Custom terminal: plain paste display; keep bracketed-paste protection.\nset enable-bracketed-paste on\nset enable-active-region off\n';
const read=p=>fs.existsSync(p)?fs.readFileSync(p,'utf8'):null;
function atomic(file,text) {
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.custom-readline-${process.pid}.tmp`;
  try {fs.writeFileSync(temp,text);fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
export function readlinePaste(action,appHome,userHome=os.homedir()) {
  const file=path.join(userHome,'.inputrc'),recordFile=path.join(appHome,'.customizations/readline-paste.json');
  const recordRaw=read(recordFile),record=recordRaw===null?null:JSON.parse(recordRaw),current=read(file);
  if(record&&(record.version!==1||record.file!==file))throw Error('Unknown Readline preference record.');
  if(record&&!([record.original,record.installed].includes(current)))throw Error('Personal inputrc conflict; nothing changed.');
  if(action==='apply') {
    if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Refusing to replace a personal inputrc symlink.');
    const original=record?record.original:current;
    const installed=(original?(original.endsWith('\n')?original:original+'\n')+'\n':'')+BLOCK;
    atomic(recordFile,JSON.stringify({version:1,file,original,installed},null,2)+'\n');atomic(file,installed);return;
  }
  if(!record)throw Error('Readline preferences were not opted into.');
  if(action==='check'){if(current!==record.installed)throw Error('Readline preferences are not applied.');return;}
  if(action==='restore') {
    if(record.original===null){if(fs.existsSync(file))fs.unlinkSync(file);}else atomic(file,record.original);
    fs.unlinkSync(recordFile);return;
  }
  throw Error('Unsupported Readline preference operation.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  try {readlinePaste(process.argv[2],process.argv[3]??process.env.HERDR_APP_HOME??path.join(os.homedir(),'.config/herdr-app'),process.argv[4]??os.homedir());console.log('Readline paste preference '+process.argv[2]+': OK');}
  catch(error){console.error(error.message);process.exitCode=1;}
}
