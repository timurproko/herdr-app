// Development-only release evidence. Downloaded source is data, never imported.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {HOST_CONTRACT, HOST_PROFILES} from '../src/integration/herdr/compatibility.js';
import {stockBaseline} from './runtime/stock-baseline.mjs';
const {PROFILE} = createRequire(import.meta.url)('../src/integration/herdr/documents/tab-move-v1.cjs');
export const REPOSITORIES = Object.freeze({app:'herdrdev/herdr-app',core:'herdrdev/herdr-core'});
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const gitBlob = bytes => createHash('sha1').update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest('hex');
export function releaseVersion(value) {
  if(typeof value !== 'string' || value.length > 40 || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value))throw Error('Expected an exact stable release version.');
  return value;
}
export function compareVersions(a,b) { const x=releaseVersion(a).split('.').map(BigInt),y=releaseVersion(b).split('.').map(BigInt); for(let i=0;i<3;i++)if(x[i]!==y[i])return x[i]>y[i]?1:-1; return 0; }
export function commitSha(value) {if(!/^[a-f0-9]{40}$/.test(value??''))throw Error('Invalid immutable commit/blob identity.'); return value;}
export function safePath(value) {
  if(typeof value!=='string'||value.length>500||!/^[A-Za-z0-9_./-]+$/.test(value)||value.split('/').some(p=>!p||p==='.'||p==='..'))throw Error('Unsafe evidence path.');
  return value;
}
export function evidenceFile(value) {
  safePath(value);
  if(!/^(?:logs\/[a-z0-9-]+\.txt|diffs\/[A-Za-z0-9_.-]+\.diff|[a-z0-9-]+\.json)$/.test(value)||value==='report.json')throw Error('Unsafe generated evidence.');
  return value;
}
export function releaseIdentity(versions) {
  const parts=['app','core'].filter(c=>versions[c]).map(c=>`${c}-${releaseVersion(versions[c])}`);
  if(!parts.length)throw Error('No candidate release.'); return parts.join('-');
}
export function parseIdentity(value) {
  const m=/^(?:app-(\d+\.\d+\.\d+))?(?:-?core-(\d+\.\d+\.\d+))?$/.exec(value??'');
  if(!m||(!m[1]&&!m[2]))throw Error('Invalid migration identity.');
  const result={...(m[1]?{app:releaseVersion(m[1])}:{}),...(m[2]?{core:releaseVersion(m[2])}:{})};
  if(releaseIdentity(result)!==value)throw Error('Noncanonical migration identity.'); return result;
}
export function validateFeed(component, data) {
  if(!REPOSITORIES[component])throw Error('Unknown release component.');
  releaseVersion(data?.version);
  if(component==='core'&&(!Number.isSafeInteger(data.generation)||data.generation<1))throw Error('Missing Core generation.');
  if(component==='app')releaseVersion(data.core_min);
  if(!data.targets||!Object.keys(data.targets).length||Object.keys(data.targets).length>20)throw Error('Missing release targets.');
  for(const [target,entry] of Object.entries(data.targets)) {
    if(!/^(linux|macos|windows)-(x86_64|aarch64)$/.test(target)||!/^[a-f0-9]{64}$/.test(entry?.sha256??''))throw Error('Invalid release target/checksum.');
    const url=new URL(entry.url);
    if(url.origin!=='https://releases.herdr.dev'||url.username||url.password||url.search||url.hash||!url.pathname.startsWith(`/${component}/${data.version}/`)||url.pathname.includes('..'))throw Error('Untrusted release URL.');
  }
  return data;
}
// Token is only attached to the fixed GitHub origin, never the feed or a redirect.
export function publicReader({fetchImpl=fetch,token=process.env.GH_TOKEN,timeout=25000,maxBytes=8*1024*1024}={}) {
  return async url => {
    const parsed=new URL(url);
    if(parsed.username||parsed.password||!['https://api.github.com','https://releases.herdr.dev'].includes(parsed.origin))throw Error('Untrusted evidence origin.');
    const headers={Accept:'application/json','User-Agent':'Custom-Herdr-release-audit'};
    if(parsed.origin==='https://api.github.com'&&token)headers.Authorization=`Bearer ${token}`;
    const response=await fetchImpl(url,{headers,redirect:'error',signal:AbortSignal.timeout(timeout)});
    if(!response.ok)throw Error(`Evidence HTTP ${response.status}: ${parsed.origin}${parsed.pathname}`);
    let size=0;const chunks=[];
    for await(const chunk of response.body){size+=chunk.length;if(size>maxBytes)throw Error('Evidence response exceeds size limit.');chunks.push(Buffer.from(chunk));}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
}
export const githubUrl=(component,suffix)=>`https://api.github.com/repos/${REPOSITORIES[component]}/${suffix}`;
export async function resolveTag(component, version, get, expected) {
  releaseVersion(version); const ref=await get(githubUrl(component,`git/ref/tags/v${version}`));
  if(ref.ref!==`refs/tags/v${version}`)throw Error('Release tag does not match requested version.');
  let object=ref.object;
  for(let i=0;i<4;i++) {
    commitSha(object?.sha);
    if(object.type==='commit'){if(expected&&expected!==object.sha)throw Error(`Reviewed release tag moved: expected ${expected}, observed ${object.sha}.`);return object.sha;}
    if(object.type!=='tag')throw Error('Release tag is not a commit.');
    object=(await get(githubUrl(component,`git/tags/${object.sha}`))).object;
  }
  throw Error('Release tag nesting exceeds limit.');
}
const json=file=>{if(!fs.lstatSync(file).isFile())throw Error('Review evidence must be a regular file.');return JSON.parse(fs.readFileSync(file,'utf8'));};
export function reviewInventory(root) {
  const appSource=json(path.join(root,'tools/contracts/tab-move-0.1.16.json'));
  const coreSource=json(path.join(root,'tools/contracts/herdr-core-reviewed.json'));
  for(const [component,pin] of Object.entries({app:appSource,core:coreSource})) {
    commitSha(pin.commit); releaseVersion(pin.appVersion??pin.coreVersion);
    if(pin.repository!==REPOSITORIES[component])throw Error('Unexpected reviewed repository.');
  }
  const directory=path.join(root,'upstream/baselines');
  const baselines=Object.fromEntries(fs.readdirSync(directory).filter(n=>/^\d+\.\d+\.\d+\.json$/.test(n)).map(n=>{json(path.join(directory,n));const version=n.slice(0,-5);return [version,stockBaseline(path.join(root,'upstream'),version).baseline];}));
  const provenance=Object.fromEntries(fs.readdirSync(directory).filter(n=>n.endsWith('.provenance.json')).map(n=>[n.replace('.provenance.json',''),json(path.join(directory,n))]));
  const config=json(path.join(root,'customization.json'));
  const registry=json(path.join(root,'src/integration/native-patches/registry.json'));
  const canonical=name=>{
    const file=safePath(config.files[name]);
    if(!file.startsWith('src/integration/native-patches/')||!fs.lstatSync(path.join(root,file)).isFile()||!fs.realpathSync(path.join(root,file)).startsWith(fs.realpathSync(root)+path.sep))throw Error('Native original/source must be a canonical regular checkout file.');
    return file;
  };
  const patches=registry.patches.map(p=>{
    if(!/^[a-z0-9-]{1,60}$/.test(p.id))throw Error('Invalid native patch ID.');
    const main=canonical(p.files['main.js']);
    if(Object.keys(p.mainByOriginal??{}).some(name=>!p.originals.includes(name)))throw Error('Native replacement selector names an unregistered original.');
    const originals=p.originals.map(name=>{
      const file=canonical(name),bytes=fs.readFileSync(path.join(root,file));return {file,sha256:sha256(bytes),bytes:bytes.length,main:canonical(p.mainByOriginal?.[name]??p.files['main.js'])};
    });
    const provenanceOutput=path.posix.join(path.posix.dirname(p.files['main.js']),'provenance.json');
    let provenance=null;
    if(Object.hasOwn(config.files,provenanceOutput)) {
      const file=canonical(provenanceOutput),data=json(path.join(root,file));
      if(data.repository!==REPOSITORIES.app||data.source!==`defaults/${p.target}/main.js`||!Array.isArray(data.releases)||!data.releases.length||!Array.isArray(data.originals))throw Error('Invalid native provenance record.');
      for(const release of data.releases){if(!release.tag?.startsWith('v'))throw Error('Invalid native provenance release tag.');releaseVersion(release.tag.slice(1));commitSha(release.commit);}
      for(const original of originals) {
        const record=data.originals.find(r=>r.file===path.posix.basename(original.file));
        if(!record||record.sha256!==original.sha256||record.bytes!==original.bytes)throw Error(`Native original/provenance mismatch: ${original.file}`);
      }
      if(data.installedVerification&&(!/^[a-f0-9]{64}$/.test(data.installedVerification.executableSha256??'')||!data.originals.some(r=>r.file===data.installedVerification.original)))throw Error('Invalid recorded native binary verification.');
      provenance={file,sha256:sha256(fs.readFileSync(path.join(root,file))),data};
    }
    return {id:p.id,target:safePath(p.target),main,mains:[...new Set([main,...originals.map(o=>o.main)])],originals,provenance};
  });
  return {host:{versions:[...HOST_CONTRACT.reviewedVersions],profiles:Object.keys(HOST_PROFILES)},documents:{app:[...PROFILE.apps],core:[...PROFILE.cores],generation:PROFILE.generation},appSource,coreSource,baselines,provenance,patches};
}
export function reviewedVersion(inventory,component) {
  const values=component==='app'?inventory.host.versions:inventory.documents.core;
  if(!values.length)throw Error(`Missing ${component} review inventory.`);
  return [...values].sort(compareVersions).at(-1);
}
export function selectedCoreGeneration(release) {
  const version=release?.version,feedVersion=release?.feed?.version;
  if(version!==feedVersion||!Number.isSafeInteger(release?.feed?.generation)||release.feed.generation<1)return {
    status:'unavailable',version,generation:null,feedVersion:feedVersion??null,
    reason:`Generation evidence unavailable for selected Core ${version??'unknown'}; latest feed describes ${feedVersion??'an unknown version'}. No other release's generation is substituted.`,
  };
  return {status:'available',version,generation:release.feed.generation,feedVersion,source:'https://releases.herdr.dev/core/latest.json',feedSha256:release.feedSha256};
}
export async function discoverReleases({inventory,get=publicReader(),requested={}}) {
  const releases={},errors={},candidates={};
  await Promise.all(['app','core'].map(async component=>{
    try {
      const feed=validateFeed(component,await get(`https://releases.herdr.dev/${component}/latest.json`));
      const version=requested[component]?releaseVersion(requested[component]):feed.version;
      const pin=component==='app'?inventory.appSource:inventory.coreSource;
      const expected=version===(pin.appVersion??pin.coreVersion)?pin.commit:undefined;
      // Keep the observed version even if its source is not yet published.
      releases[component]={version,feed,feedSha256:sha256(JSON.stringify(feed)),commit:null};
      if(component==='core')releases[component].generationEvidence=selectedCoreGeneration(releases[component]);
      if(compareVersions(version,reviewedVersion(inventory,component))>0||requested[component])candidates[component]=version;
      releases[component].commit=await resolveTag(component,version,get,expected);
    } catch(error){errors[component]=error.message;}
  }));
  return {releases,errors,candidates};
}
