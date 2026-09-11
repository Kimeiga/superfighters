import {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} from '../lib/util.mjs';
import {bg,box,text,line,circle,eye,label,bar,actor} from '../lib/draw.mjs';
export const meta={id:'do-not-open',title:'Do Not Open',tag:'CURSED PACKING CO-OP',players:4,color:'#c4da78',description:'Pack cursed objects on one shared table. The contents have strong opinions about their neighbors.',controls:'Pick up an item, move to an empty crate slot, and drop it. Ship at least four items. Mirrors cannot touch; creatures need music. Seal an item to neutralize its rule.',actions:['Pick up / drop','Ship crate','Seal nearest item'],tools:[],goal:'Ship three safe crates of at least four objects.',ai:'Packers pick separate objects, place them in free slots, and seal incompatible cargo before shipping.'};
const slots=Array.from({length:9},(_,i)=>({x:594+i%3*104,y:223+Math.floor(i/3)*104}));
const names=['MIRROR','MUSIC','CREATURE','SHADOW','LAMP','TEETH'];
const colors=['#afbdda','#e4b47a','#96d3a4','#bd9acf','#f1da8d','#ee9e97'];
function spawn(s){s.items=Array.from({length:8},(_,id)=>({id,type:[0,1,2,3,4,5,1,0][id],x:91+id%2*123,y:192+Math.floor(id/2)*90,slot:-1,held:-1,sealed:false}));s.players.forEach(p=>p.hand=-1);s.seals=4;}
export function violations(s){const out=[];for(const o of s.items){if(o.slot<0||o.sealed)continue;const neighbors=s.items.filter(b=>b.slot>=0&&b.id!==o.id&&Math.abs(b.slot%3-o.slot%3)+Math.abs(Math.floor(b.slot/3)-Math.floor(o.slot/3))===1);
  if(o.type===0&&neighbors.some(b=>b.type===0&&!b.sealed))out.push({id:o.id,why:'Mirrors cannot touch.'});
  if(o.type===2&&!neighbors.some(b=>b.type===1))out.push({id:o.id,why:'A creature needs an adjacent music box.'});
  if(o.type===3&&neighbors.some(b=>b.type===4&&!b.sealed))out.push({id:o.id,why:'Keep shadows away from lamps.'});
  if(o.type===5&&neighbors.some(b=>b.type===2&&!b.sealed))out.push({id:o.id,why:'Teeth will eat the creature.'});
 }return out;}
export function init(seed){const s=base(seed,4,200,3);s.seals=4;s.chaos=0;s.shippingCooldown=0;spawn(s);s.players.forEach((p,i)=>{p.x=365+i%2*95;p.y=180+Math.floor(i/2)*285;});note(s,'Pack four objects into the 3×3 crate. Read their rules, or use a seal.');return s;}
export function update(s,inputs,dt){s.shippingCooldown=Math.max(0,s.shippingCooldown-dt);s.players.forEach((p,i)=>{const input=inputs[i]||{};move(p,input,dt,260,[45,135,915,535]);
  if(input.a&&p.cooldown<=0){p.cooldown=.22;const held=s.items.find(o=>o.id===p.hand&&o.held===i);if(held){const available=slots.map((v,id)=>({...v,id})).filter(v=>!s.items.some(o=>o.slot===v.id));const slot=nearest(p,available,q=>dist(p,q)<75);if(slot){held.slot=slot.id;held.x=slot.x;held.y=slot.y;held.held=-1;p.hand=-1;}else{held.x=p.x;held.y=p.y;held.held=-1;held.slot=-1;p.hand=-1;}}else{const o=nearest(p,s.items,o=>o.held<0&&dist(p,o)<65);if(o){o.held=i;o.slot=-1;p.hand=o.id;}}}
  if(input.c&&p.cooldown<=0&&s.seals>0){const o=s.items.find(o=>o.id===p.hand)||nearest(p,s.items,o=>!o.sealed&&dist(p,o)<90);if(o&&!o.sealed){o.sealed=true;s.seals--;p.cooldown=.4;burst(s,o.x,o.y,'SEALED','#cef09b');}}
  if(input.b&&s.shippingCooldown<=0){s.shippingCooldown=1;const count=s.items.filter(o=>o.slot>=0).length;const bad=violations(s);if(count<4)note(s,'The crate needs at least four objects.');else if(bad.length){note(s,bad[0].why);s.chaos+=8;burst(s,705,162,'SHIPMENT REJECTED','#ff9e91');}else{s.score++;s.chaos=Math.max(0,s.chaos-25);note(s,`Safe shipment ${s.score} dispatched.`);spawn(s);if(s.score>=s.goal)finish(s,true,'Three safe shipments. No parcels ate their recipients.');}}
 });
 for(const o of s.items)if(o.held>=0){o.x=s.players[o.held].x;o.y=s.players[o.held].y+18;}
 s.chaos=clamp(s.chaos+violations(s).length*dt*.45-dt*.12,0,100);if(s.chaos>=100)finish(s,false,'The warehouse has become a parcel. Try a safer arrangement.');
}
export function bot(s,i){const p=s.players[i],held=s.items.find(o=>o.id===p.hand&&o.held===i),bad=violations(s);if(!held&&bad.length&&s.seals>0){const item=s.items.find(o=>o.id===bad[0].id);return aim(item.x,item.y,{c:dist(p,item)<65});}if(s.items.filter(o=>o.slot>=0).length>=4&&!bad.length)return {b:true};if(held){const slot=slots.find((v,id)=>!s.items.some(o=>o.slot===id));return slot?aim(slot.x,slot.y,{a:dist(p,slot)<26}):{};}
 const o=nearest(p,s.items,o=>o.held<0&&o.slot<0);return o?aim(o.x,o.y,{a:dist(p,o)<34}):{};}
export function hint(s){const bad=violations(s);return bad.length?bad[0].why:`${s.items.filter(o=>o.slot>=0).length} objects packed. ${s.seals} seals available. Seal neutralizes that object's curse.`;}
export function render(c,s,view={}){bg(c,'#344d43','#1c3333');label(c,'DEPARTMENT OF UNUSUAL POST',`${s.score} / 3 shipments • ${s.seals} containment seals`);box(c,22,112,916,447,'#75634b',18,'#b39f7c');box(c,35,140,280,385,'#30443f',12);text(c,'INCOMING',172,155,16,'#dddfbf','center');box(c,530,153,354,359,'#b59b6c',15);text(c,'OUTGOING CRATE',707,176,17,'#343c32','center');
 slots.forEach((p,i)=>{box(c,p.x-45,p.y-34,91,88,'#5c604b',8);text(c,i+1,p.x,p.y+17,15,'#ffffff25','center');});
 for(const o of s.items){box(c,o.x-36,o.y-29,72,62,colors[o.type],8);if(o.type===2||o.type===5)eye(c,o.x,o.y-12,.65);else text(c,['◇','♪','','☾','☼',''][o.type],o.x,o.y-8,26,'#2b4140','center');text(c,names[o.type],o.x,o.y+20,9,'#1c393b','center');if(o.sealed){line(c,o.x-31,o.y-24,o.x+30,o.y+27,'#ecf3d4',7);text(c,'S',o.x,o.y,20,'#376256','center');}}
 s.players.forEach((p,i)=>actor(c,{...p,y:p.y-9},i,view.you,15));text(c,'CURSE PRESSURE',341,515,11,'#efddba');bar(c,340,531,160,s.chaos/100,'#ee8f8b',10);
}
