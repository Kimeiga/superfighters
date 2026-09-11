import {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} from '../lib/util.mjs';
import {bg,box,text,line,circle,label,bar,actor,eye} from '../lib/draw.mjs';
export const meta={id:'sink-different',title:'Sink Different',tag:'CO-OP BOAT TRIAGE',players:4,color:'#77c9e3',description:'The leaks are also your engines. Keep enough jets open to move, and enough water out to survive.',controls:'Move near a colored leak and toggle its plug. Bail near the central pump. Stabilize reduces tilt. Open jets move the boat but also fill it with water.',actions:['Toggle nearest leak','Bail at pump','Stabilize hull'],tools:[],goal:'Reach the harbor without flooding the boat.',ai:'Crew members monitor flooding, preserve propulsion, bail water, and correct dangerous tilt.'};
const pump={x:480,y:335};
export function init(seed){const s=base(seed,4,150,100);Object.assign(s,{water:22,progress:0,tilt:0,nextWave:18,rock:0,leaks:Array.from({length:6},(_,id)=>({id,x:155+id%3*325,y:id<3?225:468,open:id===0||id===4,side:id%3===0?-1:id%3===2?1:0}))});s.players.forEach((p,i)=>{p.x=355+i%2*230;p.y=300+Math.floor(i/2)*96;});note(s,'Two open jets are a good start. Use the center pump before the water reaches 100%.');return s;}
export function update(s,inputs,dt){
 s.players.forEach((p,i)=>{const input=inputs[i]||{};move(p,input,dt,245,[100,204,865,503]);
  if(input.a&&p.cooldown<=0){const leak=nearest(p,s.leaks,l=>dist(p,l)<65);if(leak){leak.open=!leak.open;p.cooldown=.45;burst(s,leak.x,leak.y,leak.open?'JET OPEN':'PLUGGED',leak.open?'#85d4ff':'#bee798');}}
  if(input.b&&p.cooldown<=0){if(dist(p,pump)<100){s.water=Math.max(0,s.water-5.5);p.cooldown=.65;burst(s,pump.x,pump.y,'-5 WATER','#8ae6ee');}else{note(s,'Move closer to the central pump to bail.');p.cooldown=.5;}}
  if(input.c&&p.cooldown<=0){s.tilt*=.5;p.cooldown=2;burst(s,p.x,p.y,'STEADY',COLORS[i]);}
 });
 const open=s.leaks.filter(l=>l.open);s.water=clamp(s.water+dt*(open.length*1.25+.08*Math.abs(s.tilt)),0,100);s.tilt=clamp(s.tilt+dt*(open.reduce((n,l)=>n+l.side,0)*2.3-s.tilt*.06),-30,30);
 s.progress+=dt*(open.length?(.27+open.length*.31):.035);s.score=Math.floor(s.progress);
 if(s.elapsed>=s.nextWave){s.nextWave+=18;const leak=s.leaks[Math.floor(rand(s)*6)];leak.open=true;s.water+=9;s.rock=2;note(s,'A wave knocked out a plug. Check the leaks and pump!');}
 s.rock=Math.max(0,s.rock-dt);
 if(s.water>=100)finish(s,false,'The harbor is close, but the boat is now a submarine.');else if(s.progress>=100){s.score=100;finish(s,true,'Harbor reached. Your controlled sinking worked.');}
}
export function bot(s,i){const p=s.players[i],open=s.leaks.filter(l=>l.open);if(s.water>35+i*2)return aim(pump.x+(i-1)*28,pump.y,{b:dist(p,pump)<85,c:Math.abs(s.tilt)>20});if(open.length<2){const leak=s.leaks.find(l=>!l.open);return aim(leak.x,leak.y,{a:dist(p,leak)<38});}if(open.length>3){const leak=nearest(p,open);return aim(leak.x,leak.y,{a:dist(p,leak)<38});}return aim(pump.x+(i-1)*50,pump.y,{c:Math.abs(s.tilt)>12});}
export function hint(s){return `${s.leaks.filter(l=>l.open).length} jets open. Water ${Math.round(s.water)}%. Keep moving, but do not open every leak.`;}
export function render(c,s,view={}){bg(c,'#244c68','#133d54');label(c,'SOMEWHAT SEAWORTHY',`${Math.floor(s.progress)}% to harbor • Flooding ${Math.round(s.water)}%`);
 for(let i=0;i<13;i++){const yy=108+i*37;for(let j=0;j<12;j++){const xx=j*90+Math.sin(s.elapsed+i)*12;line(c,xx,yy,xx+35,yy,'#8bbbc222',3);}}
 line(c,95,126,854,126,'#81aaac55',5);box(c,90+s.progress*7.2,114,30,19,'#ecd5a2',5);text(c,'HARBOR',866,125,12,'#cee5dc','center');
 c.save();c.translate(480,340);c.rotate(s.tilt*.002+Math.sin(s.elapsed*2)*.006);c.translate(-480,-340);
 box(c,65,176,829,367,'#493d32',80,'#b19f7d');box(c,84,194,791,327,'#a48e68',60);for(let y=216;y<520;y+=34)line(c,99,y,860,y,'#796a52',3);
 if(s.water>0)box(c,93,516-s.water*2.9,773,s.water*2.9,'#69bddb88',18);
 box(c,pump.x-42,pump.y-46,84,95,'#426977',12,'#bdd6cb');circle(c,pump.x,pump.y-8,25,'#a5c7bd');line(c,pump.x-22,pump.y-8,pump.x+22,pump.y-8,'#355e66',6);text(c,'PUMP',pump.x,pump.y+32,13,'#e4f2d7','center');
 for(const l of s.leaks){circle(c,l.x,l.y,25,l.open?'#143846':'#8d6a48','#d8c599');if(l.open){for(let j=0;j<3;j++)line(c,l.x-14+j*14,l.y,l.x-12+j*13,l.y+(l.id<3?42:-42)+Math.sin(s.elapsed*8+j)*8,'#9ce4f1',5);}else text(c,'×',l.x,l.y,26,'#dbc594','center');}
 s.players.forEach((p,i)=>actor(c,p,i,view.you));c.restore();bar(c,270,567,420,s.water/100,s.water>70?'#fa8c91':'#84ddeb',12);text(c,'FLOOD LEVEL',480,551,11,'#d4ebe6','center');if(s.rock>0)text(c,'WAVE!',780,165,24,'#fcdf96','center');
}
