// Deploy to YOUR Cloudflare account; nothing is deployed by the customization build.
// Only validated, minimal invalidation notices leave this receiver, not GitHub bodies.
import { relayNotice } from './relay-notice.js';
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
export const digest = async text => hex(await crypto.subtle.digest('SHA-256',encoder.encode(text)));
export async function validSignature(body, signature, secret) {
  if (!secret || !/^sha256=[a-f0-9]{64}$/.test(signature ?? '')) return false;
  const key = await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  const bytes = Uint8Array.from(signature.slice(7).match(/../g),h=>parseInt(h,16));
  return crypto.subtle.verify('HMAC',key,bytes,body);
}
export function notice(payload, event, delivery) {
  return relayNotice({type:'github',repository:payload?.repository?.full_name,event,delivery,
    ref:payload?.ref,action:payload?.action,merged:payload?.pull_request?.merged,base:payload?.pull_request?.base?.ref});
}
export class WebhookHub {
  constructor(state, env) { this.env=env;this.state=state;this.seen=new Map();this.authTimers=new Map(); }
  async fetch(request) {
    const url = new URL(request.url), env = this.env;
    if (!/^[a-f0-9]{64}$/.test(env.CLIENT_TOKEN ?? '') || !/^[a-f0-9]{64}$/.test(env.GITHUB_SECRET ?? '')) return new Response('Configure relay secrets',{status:503});
    if (url.pathname === '/configuration' && request.method === 'GET') {
      const supplied = request.headers.get('Authorization') ?? '';
      if (await digest(supplied) !== await digest(`Bearer ${env.CLIENT_TOKEN}`)) return new Response('Unauthorized',{status:401});
      return Response.json({protocol:1,noticeVersion:2,secretHash:await digest(env.GITHUB_SECRET)}, {headers:{'Cache-Control':'no-store'}});
    }
    if (url.pathname === '/events' && request.method === 'GET' && request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      if (this.state.getWebSockets().length >= 32) return new Response('Too many clients',{status:429});
      const [client,server] = Object.values(new WebSocketPair());
      this.state.acceptWebSocket(server);server.serializeAttachment({authenticated:false});
      this.authTimers.set(server,setTimeout(()=>{this.authTimers.delete(server);if(!server.deserializeAttachment()?.authenticated)server.close(1008,'Authentication required');},5000));
      return new Response(null,{status:101,webSocket:client});
    }
    if (url.pathname !== '/github' || request.method !== 'POST') return new Response('Not found',{status:404});
    if (Number(request.headers.get('Content-Length')) > 2**20) return new Response('Too large',{status:413});
    // Bound chunked requests too; do not allocate an unbounded webhook body.
    const reader=request.body?.getReader();const chunks=[];let length=0;
    if (!reader) return new Response('Missing body',{status:400});
    for (;;) { const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>2**20){await reader.cancel();return new Response('Too large',{status:413});}chunks.push(value); }
    const body=new Uint8Array(length);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
    if (!await validSignature(body,request.headers.get('X-Hub-Signature-256'),env.GITHUB_SECRET)) return new Response('Invalid signature',{status:401});
    let payload;try {payload=JSON.parse(new TextDecoder().decode(body));} catch {return new Response('Invalid JSON',{status:400});}
    const message=notice(payload,request.headers.get('X-GitHub-Event'),request.headers.get('X-GitHub-Delivery'));
    if (!message) return new Response('Ignored',{status:202});
    if (this.seen.has(message.delivery)) return new Response('Duplicate',{status:200});
    this.seen.set(message.delivery,true);if(this.seen.size>2048)this.seen.delete(this.seen.keys().next().value);
    const tokenHash=await digest(env.CLIENT_TOKEN);
    for (const socket of this.state.getWebSockets()) if(socket.deserializeAttachment()?.authenticated) {
      try {
        if(socket.deserializeAttachment().tokenHash!==tokenHash)socket.close(1008,'Credentials changed');
        else socket.send(JSON.stringify(message));
      } catch {try{socket.close();}catch{}}
    }
    return new Response('Accepted',{status:200});
  }
  async webSocketMessage(socket, text) {
    try {
      if(socket.deserializeAttachment()?.authenticated || typeof text!=='string' || text.length>512)throw Error();
      const message=JSON.parse(text);
      if(message.type!=='authenticate' || typeof message.token!=='string' || await digest(message.token)!==await digest(this.env.CLIENT_TOKEN))throw Error();
      this.clearAuthTimer(socket);socket.serializeAttachment({authenticated:true,tokenHash:await digest(this.env.CLIENT_TOKEN)});socket.send(JSON.stringify({type:'ready',protocol:1}));
    } catch {this.clearAuthTimer(socket);socket.close(1008,'Authentication failed');}
  }
  clearAuthTimer(socket) {clearTimeout(this.authTimers.get(socket));this.authTimers.delete(socket);}
  webSocketClose(socket, code) {this.clearAuthTimer(socket);socket.close(code===1005 ? 1000 : code);}
  webSocketError(socket) {this.clearAuthTimer(socket);socket.close(1011,'Connection error');}
}
export default {
  fetch(request, env) {return env.HUB.get(env.HUB.idFromName('git-webhooks')).fetch(request);},
};
