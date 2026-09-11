import {base,clamp,dist,aim,note,burst,finish,COLORS} from '../lib/util.mjs';
import {bg,box,text,line,circle,eye,label,bar,actor} from '../lib/draw.mjs';
export const meta={id:'yesterdays-crew',title:"Yesterday’s Crew",tag:'TIME-LOOP HEIST',players:1,color:'#86bfe6',description:'Record a past self holding a switch. Rewind. Cooperate with your own echoes to steal the jewel.',controls:'Click a destination or use WASD. Stand on switch A and record a loop. Your echo repeats the route and holds it. Do the same at B, then take the jewel and return to EXIT.',actions:['Take jewel','Record & rewind','Erase echoes'],tools:[],goal:'Steal the jewel and return to the exit.',ai:'The planner records switch-holding loops, waits for doors, then retrieves the jewel and returns.'};
const X=74,Y=113,Z=58,C=14,R=8;
const point=(x,y)=>({x:X+(x+.5)*Z,y:Y+(y+.5)*Z});
const spawn=point(1,6),padA=point(3,4),padB=point(9,6),jewel=point(12,4);
function cell(p){return {x:clamp(Math.floor((p.x-X)/Z),0,C-1),y:clamp(Math.floor((p.y-Y)/Z),0,R-1)};}
function wall(x,y,doors){return x<=0||x>=C-1||y<=0||y>=R-1||(x===6&&(y!==4||!doors[0]))||(x===11&&(y!==4||!doors[1]));}
function path(s,from,to){const a=cell(from),b=cell(to);const q=[a],seen=new Set([a.x+','+a.y]),prev=new Map();let found=null;while(q.length){const p=q.shift();if(p.x===b.x&&p.y===b.y){found=p;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},k=n.x+','+n.y;if(wall(n.x,n.y,s.doors)||seen.has(k))continue;seen.add(k);prev.set(k,p);q.push(n);}}if(!found)return null;let p=found;while(prev.has(p.x+','+p.y)){const last=prev.get(p.x+','+p.y);if(last.x===a.x&&last.y===a.y)return point(p.x,p.y);p=last;}return to;}
function rewind(s,save){if(save&&s.track.length){s.echoes.push(s.track.map(p=>({...p})));s.echoes=s.echoes.slice(-4);note(s,`Echo ${s.echoes.length} recorded. It will hold its final position.`);}s.players[0].x=spawn.x;s.players[0].y=spawn.y;s.loop=0;s.track=[];s.sample=0;}
export function init(seed){const s=base(seed,1,360,1);Object.assign(s,{echoes:[],track:[],loop:0,sample:0,doors:[false,false],hasJewel:false,alerts:0,guards:[{x:point(8,2).x,y:point(8,2).y}]});Object.assign(s.players[0],spawn);note(s,'First job: stand on switch A, then Record & rewind.');return s;}
export function echoPositions(s){return s.echoes.map(track=>track[Math.min(track.length-1,Math.floor(s.loop*10))]).filter(Boolean);}
export function update(s,inputs,dt){const input=inputs[0]||{},p=s.players[0];s.loop+=dt;const actors=[p,...echoPositions(s)];s.doors=[actors.some(a=>dist(a,padA)<24),actors.some(a=>dist(a,padB)<24)];
 let target=input.target;if(input.dx||input.dy)target={x:p.x+(input.dx||0)*60,y:p.y+(input.dy||0)*60};
 if(target){const next=path(s,p,target);if(next){const d=dist(p,next);if(d>1){const step=Math.min(d,150*dt);const nx=p.x+(next.x-p.x)/d*step,ny=p.y+(next.y-p.y)/d*step;const k=cell({x:nx,y:ny});if(!wall(k.x,k.y,s.doors)){p.x=nx;p.y=ny;}}}}
 s.sample+=dt;if(s.sample>=.1){s.sample=0;s.track.push({x:p.x,y:p.y});s.track=s.track.slice(0,260);}
 if(input.b&&p.cooldown<=0){rewind(s,true);p.cooldown=.5;}
 if(input.c&&p.cooldown<=0){s.echoes=[];s.hasJewel=false;rewind(s,false);p.cooldown=.5;note(s,'All echoes erased. Plan a new route.');}
 if(input.a&&!s.hasJewel&&dist(p,jewel)<40){s.hasJewel=true;burst(s,jewel.x,jewel.y,'GOT IT');note(s,'Jewel acquired. Return to the green EXIT while your echoes hold the doors.');}
 if(s.hasJewel&&dist(p,spawn)<27){s.score=1;finish(s,true,'The jewel is yours. Past you deserves some credit.');}
 const guard=s.guards[0];guard.x=point(8,2).x+Math.sin(s.elapsed*.8)*70;if(dist(p,guard)<26){s.alerts++;rewind(s,false);note(s,'A guard spotted you. Current loop reset; recorded echoes are safe.');}
 if(s.loop>=25){rewind(s,false);note(s,'Loop reset after 25 seconds. Your existing echoes remain.');}
}
export function bot(s){const p=s.players[0];if(!s.echoes.length)return aim(padA.x,padA.y,{b:dist(p,padA)<14});if(s.echoes.length===1)return aim(padB.x,padB.y,{b:dist(p,padB)<14});if(!s.hasJewel)return aim(jewel.x,jewel.y,{a:dist(p,jewel)<30});return aim(spawn.x,spawn.y);}
export function hint(s){return !s.echoes.length?'Stand on A and record. Do not walk away before recording.':s.echoes.length===1?'Your first echo opens door A after retracing its route. Reach B and record again.':s.hasJewel?'Return to EXIT. Let your echoes keep both switches pressed.':'Wait for both echoes to reach their switches, then steal the jewel.';}
export function render(c,s,view={}){bg(c,'#193e51','#132937');label(c,'THE 25-SECOND JOB',`${s.echoes.length} / 4 recorded echoes • ${Math.floor(s.loop)} seconds into this loop`);
 for(let y=0;y<R;y++)for(let x=0;x<C;x++){const d=x===6&&y===4?0:x===11&&y===4?1:-1;box(c,X+x*Z+2,Y+y*Z+2,Z-4,Z-4,wall(x,y,s.doors)?'#536879':'#254557',5);if(d>=0){box(c,X+x*Z+5,Y+y*Z+5,Z-10,Z-10,s.doors[d]?'#7ad9a755':'#e89477',5);text(c,d===0?'A':'B',X+(x+.5)*Z,Y+(y+.5)*Z,18,s.doors[d]?'#a6efd4':'#263948','center');}}
 for(const [pad,title] of [[padA,'A'],[padB,'B']]){circle(c,pad.x,pad.y,23,'#a88be855','#bba0f4');text(c,title,pad.x,pad.y,23,'#dccaff','center');}
 box(c,spawn.x-25,spawn.y-25,50,50,'#488d76',7);text(c,'EXIT',spawn.x,spawn.y,12,'#d8ffe0','center');
 if(!s.hasJewel){c.save();c.translate(jewel.x,jewel.y);c.rotate(Math.PI/4);box(c,-13,-13,26,26,'#e7cf73',2);c.restore();}
 s.echoes.forEach((track,i)=>{c.save();c.globalAlpha=.19;for(let j=0;j<track.length;j+=4)circle(c,track[j].x,track[j].y,3,COLORS[(i+1)%4]);c.restore();});
 echoPositions(s).forEach((p,i)=>{c.save();c.globalAlpha=.6;actor(c,p,(i+1)%4,-1,16);text(c,`E${i+1}`,p.x,p.y-27,11,'#decdff','center');c.restore();});
 s.guards.forEach(g=>{circle(c,g.x,g.y,30,'#ed7e8d22');box(c,g.x-12,g.y-13,24,26,'#ec8e98',5);text(c,'!',g.x,g.y,19,'#273843','center');});actor(c,s.players[0],0,view.you,17);bar(c,270,584,420,s.loop/25,'#99ccef',6);
}
