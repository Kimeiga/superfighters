import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {games,byId,step} from './lib/registry.mjs';
const require=createRequire(import.meta.url);
const {WebSocketServer,WebSocket}=require('ws');
const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT)||3000;
const rooms=new Map();
const MAX_ROOMS=40;
const ticks=50;
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
function response(res,status,body,type='application/json; charset=utf-8'){
 res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' ws: wss:; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"});res.end(body);
}
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/health')return response(res,200,JSON.stringify({ok:true,games:games.length,transport:'websocket',version:'0.1.0'}));
  if(url.pathname==='/api/catalog')return response(res,200,JSON.stringify(games.map(g=>g.meta)));
  if(req.method!=='GET'&&req.method!=='HEAD')return response(res,405,'{"error":"Method not allowed"}');
  let pathname=decodeURIComponent(url.pathname);
  if(pathname==='/'||pathname.startsWith('/play/'))pathname='/web/index.html';
  if(!/^\/(web|lib|games)\/[a-zA-Z0-9_./-]+$/.test(pathname)||pathname.includes('..'))return response(res,404,'{"error":"Not found"}');
  const target=path.resolve(root,'.'+pathname);if(!target.startsWith(root+path.sep))return response(res,404,'{}');
  const content=await fs.readFile(target);response(res,200,req.method==='HEAD'?'':content,mime[path.extname(target)]||'application/octet-stream');
 }catch{response(res,404,'{"error":"Not found"}');}
});
const wss=new WebSocketServer({noServer:true,maxPayload:4096,perMessageDeflate:false});
server.on('upgrade',(req,socket,head)=>{
 try{const url=new URL(req.url,'http://localhost');const origin=req.headers.origin;
  if(url.pathname!=='/ws'||(origin&&new URL(origin).host!==req.headers.host)){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 }catch{socket.destroy();}
});
const send=(ws,payload)=>{if(ws?.readyState===WebSocket.OPEN&&ws.bufferedAmount<512000)ws.send(JSON.stringify(payload));};
function members(room){return room.slots.map((slot,i)=>({seat:i,name:slot?.ws?slot.name:['Pip','Mica','Moss','Bram'][i],kind:slot?.ws?'human':room.bots?'bot':'empty'}));}
function broadcast(room,payload){for(const slot of room.slots)if(slot?.ws)send(slot.ws,payload);}
function frame(room){return {type:'state',state:room.state,members:members(room),host:room.host,paused:room.paused,bots:room.bots,seq:room.seq};}
function detach(ws){const room=rooms.get(ws.room);if(!room)return;const slot=room.slots[ws.seat];if(slot?.ws!==ws)return;slot.ws=null;slot.left=Date.now();slot.input={};room.lastActive=Date.now();const human=room.slots.findIndex(p=>p?.ws);if(human<0)room.paused=true;else if(room.host===ws.seat)room.host=human;broadcast(room,frame(room));ws.room=null;}
function attach(ws,room,seat,name,token){detach(ws);const existing=room.slots[seat];if(existing?.ws&&existing.ws!==ws){existing.ws.room=null;existing.ws.close(1000,'Replaced by a reconnected session');}
 const slot={name,token:token||crypto.randomBytes(24).toString('hex'),ws,input:{},left:0};room.slots[seat]=slot;ws.room=room.id;ws.seat=seat;room.lastActive=Date.now();
 send(ws,{type:'joined',room:room.id,game:room.game.meta.id,seat,token:slot.token,...frame(room),type:'joined'});broadcast(room,frame(room));
}
function cleanInput(value){const b=value||{},out={dx:0,dy:0,a:!!b.a,b:!!b.b,c:!!b.c};for(const k of ['dx','dy'])if(Number.isFinite(b[k]))out[k]=Math.max(-1,Math.min(1,b[k]));if(b.target&&Number.isFinite(b.target.x)&&Number.isFinite(b.target.y))out.target={x:Math.max(0,Math.min(960,b.target.x)),y:Math.max(0,Math.min(600,b.target.y))};if(Number.isInteger(b.tool))out.tool=Math.max(0,Math.min(9,b.tool));return out;}
wss.on('connection',ws=>{
 ws.alive=true;ws.budget=0;ws.window=Date.now();ws.on('pong',()=>ws.alive=true);
 ws.on('message',raw=>{try{
  const now=Date.now();if(now-ws.window>1000){ws.budget=0;ws.window=now;}if(++ws.budget>60){send(ws,{type:'error',message:'Input rate exceeded. Please slow down.'});return;}
  const msg=JSON.parse(raw.toString());if(!msg||typeof msg!=='object')throw new Error('Invalid message');
  const name=String(msg.name||'Player').replace(/[\u0000-\u001f<>]/g,'').trim().slice(0,18)||'Player';
  if(msg.type==='create'){
   const game=byId[msg.game];if(!game)throw new Error('Unknown game.');if(rooms.size>=MAX_ROOMS)throw new Error('The prototype server is full. Try local solo, or retry later.');
   const id=crypto.randomBytes(6).toString('hex').toUpperCase();const room={id,game,state:game.init(crypto.randomBytes(4).readUInt32LE()),slots:Array(game.meta.players).fill(null),host:0,paused:true,bots:true,seq:0,lastActive:now};rooms.set(id,room);attach(ws,room,0,name);
  }else if(msg.type==='join'){
   const room=rooms.get(String(msg.room||'').toUpperCase());if(!room)throw new Error('Room not found or expired. Ask the host for a fresh invite.');
   let seat=typeof msg.token==='string'?room.slots.findIndex(p=>p?.token===msg.token):-1;
   if(seat<0)seat=room.slots.findIndex(p=>!p?.ws);if(seat<0)throw new Error('This room is full.');attach(ws,room,seat,name,room.slots[seat]?.token===msg.token?msg.token:undefined);
  }else if(msg.type==='leave'){detach(ws);
  }else{const room=rooms.get(ws.room);if(!room||room.slots[ws.seat]?.ws!==ws)throw new Error('Join or create a room first.');
   if(msg.type==='input'){const p=room.slots[ws.seat],n=cleanInput(msg.input);p.input={...n,a:n.a||p.input.a,b:n.b||p.input.b,c:n.c||p.input.c};}
   else if(msg.type==='control'){
    if(room.host!==ws.seat)throw new Error('Only the room host can change the session.');
    if(msg.action==='pause')room.paused=!room.paused;
    else if(msg.action==='restart'){room.state=room.game.init(crypto.randomBytes(4).readUInt32LE());room.paused=false;room.slots.forEach(p=>{if(p)p.input={};});}
    else if(msg.action==='bots')room.bots=!room.bots;
    else throw new Error('Unknown room control.');broadcast(room,frame(room));
   }
  }
 }catch(e){send(ws,{type:'error',message:e.message||'Unable to process that action.'});}});
 ws.on('error',()=>{});ws.on('close',()=>detach(ws));
});
let interval=setInterval(()=>{
 const now=Date.now();for(const [id,room] of rooms){const online=room.slots.some(p=>p?.ws);if(!online){if(now-room.lastActive>600000)rooms.delete(id);continue;}room.lastActive=now;
  if(!room.paused&&room.state.status==='playing'){
   const inputs=room.slots.map(p=>p?.input||{}),bots=room.slots.map(p=>!p?.ws&&room.bots);step(room.game,room.state,inputs,bots,ticks/1000);room.slots.forEach(p=>{if(p)p.input={...p.input,a:false,b:false,c:false};});
  }room.seq++;if(room.seq%2===0)broadcast(room,frame(room));
 }
},ticks);
let heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}},20000);
server.listen(port,'0.0.0.0',()=>console.log(`Prototype arcade listening on ${port}; ${games.length} games.`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearInterval(interval);clearInterval(heartbeat);for(const ws of wss.clients)ws.close(1001,'Server restarting');server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),2500).unref();});
