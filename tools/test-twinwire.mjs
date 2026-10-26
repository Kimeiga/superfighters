import assert from 'node:assert/strict';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import WebSocket from 'ws';
import {EventClient} from 'twinwire/client';
import {NAMESPACE,LATEST} from '../src/networkConfig.js';
const reserve=net.createServer();await new Promise(r=>reserve.listen(0,'127.0.0.1',r));const port=reserve.address().port;await new Promise(r=>reserve.close(r));
const rtc=process.env.TEST_RTC==='1',base='http://127.0.0.1:'+port;
if(rtc)globalThis.RTCPeerConnection=(await import('node-datachannel/polyfill')).RTCPeerConnection;
const child=spawn(process.execPath,['server/index.js'],{env:{...process.env,PORT:String(port),RTC:rtc?'1':'0',TWINWIRE_UDP_PORT:String(port+1),BASE_PATH:'/superfighters/'},stdio:['ignore','pipe','pipe']});
let log='';for(const stream of [child.stdout,child.stderr])stream.on('data',d=>{log=(log+d).slice(-10000);});
const clients=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,timeout=12000){const end=performance.now()+timeout;while(!await fn()){if(performance.now()>end)throw Error('Timed out: '+log);await sleep(10);}}
function make(){
 const c=new EventClient({url:base.replace('http','ws')+'/superfighters/connect',room:NAMESPACE,latest:LATEST,stateMaxAgeMs:500,rtc:rtc?undefined:false,reconnectBaseMs:30,websocket:url=>new WebSocket(url,{origin:'http://localhost'})});
 const messages=new Map();for(const name of ['lobby-created','lobby-joined','lobby-state','match-start','restart-match','peer-presence','input-p1','input-p2','snapshot-p1','snapshot-p2','host-snapshot','lobby-error']){
   messages.set(name,[]);c.on(name,data=>messages.get(name).push(data));
 }
 clients.push(c);c.connect();return {c,messages,all:n=>messages.get(n),last:n=>messages.get(n).at(-1)};
}
const snapshot=x=>({x,y:20,vx:0,vy:0,health:100,lives:3,kills:0});
try{
 await wait(async()=>{try{return(await fetch(base+'/health')).ok;}catch{return false;}});
 const a=make(),b=make();await wait(()=>a.c.net.status==='online'&&b.c.net.status==='online'&&a.c.net.clock.synced&&b.c.net.clock.synced);
 if(rtc)await wait(()=>a.c.transport==='rtc'&&b.c.transport==='rtc');
 a.c.emit('create-lobby',{skinIndex:0});await wait(()=>a.last('lobby-created'));const code=a.last('lobby-created').code;
 b.c.emit('join-lobby',{code,skinIndex:1});await wait(()=>b.last('lobby-joined')&&a.last('lobby-state')?.players.length===2);
 a.c.emit('start-match',{});await wait(()=>a.last('match-start')&&b.last('match-start'));
 const roundId=a.last('match-start').roundId,id=b.c.id;
 // Bursts from both owners must reach both clients independently, even when coalesced.
 for(let seq=1;seq<=30;seq++){
   a.c.emit('player-input',{roundId,seq,input:{left:true}});
   b.c.emit('player-input',{roundId,seq,input:{shoot:true}});
   a.c.emit('player-snapshot',{roundId,snapshot:snapshot(seq)});
   b.c.emit('player-snapshot',{roundId,snapshot:snapshot(100+seq)});
 }
 await wait(()=>[a,b].every(p=>p.last('input-p1')?.seq===30&&p.last('input-p2')?.seq===30&&p.last('snapshot-p1')?.snapshot.x===30&&p.last('snapshot-p2')?.snapshot.x===130));
 a.c.emit('host-snapshot',{roundId,snapshots:{p1:snapshot(30),p2:snapshot(130)},pickups:[]});
 await wait(()=>b.c.ready('host-snapshot'));
 b.c.net.pause();await wait(()=>a.last('peer-presence')?.playerId==='p2'&&!a.last('peer-presence').online);
 assert.equal((await fetch(base+'/api/lobbies/'+code).then(r=>r.json())).players.length,2,'pause retains both seats');
 const priorEpoch=a.last('input-p2').peerEpoch;
 b.c.connect();await wait(()=>b.c.net.status==='online'&&a.last('peer-presence')?.online);
 assert.equal(b.c.id,id);assert.equal(b.c.ready('host-snapshot'),false,'resume cannot render the previous host world');
 assert.equal(b.all('lobby-joined').length,1);assert.equal(b.all('match-start').length,1,'resume cannot restart match physics');
 b.c.emit('player-input',{roundId,seq:31,input:{right:true}});
 await wait(()=>a.last('input-p2')?.seq===31);assert.ok(a.last('input-p2').peerEpoch>priorEpoch);
 // An old/duplicate sequence cannot overwrite current input after recovery.
 b.c.emit('player-input',{roundId,seq:30,input:{shoot:true}});await sleep(100);assert.equal(a.last('input-p2').seq,31);
 a.c.emit('host-snapshot',{roundId,snapshots:{p1:snapshot(31),p2:snapshot(131)},pickups:[]});
 await wait(()=>b.c.ready('host-snapshot')&&b.last('host-snapshot')?.snapshots.p2.x===131);
 const health=await fetch(base+'/health').then(r=>r.json());assert.equal(health.twinwire,'2.2.0');assert.equal(health.sessions,2);assert.equal(health.lobbies,1);
 console.log(JSON.stringify({ok:true,transport:rtc?'rtc':'ws',independentOwnerStreams:true,sameSessionAndRound:true,presenceEpochFence:true,freshWorldAfterResume:true,roundId}));
}finally{
 clients.forEach(c=>c.close());if(child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}
}
