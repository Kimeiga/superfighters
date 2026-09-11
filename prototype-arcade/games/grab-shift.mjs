import {base, rand, clamp, dist, nearest, move, aim, note, burst, finish, COLORS} from '../lib/util.mjs';
import {bg, box, circle, line, text, eye, label, bar} from '../lib/draw.mjs';
export const meta = {id:'grab-shift', title:'Grab Shift', tag:'CO-OP SALVAGE', players:4, color:'#f8bb56', description:'You and your friends are the claw machine. Extract the valuables; leave the bombs.', controls:'Move your claw with WASD / arrows, or touch a destination. Grip near an object. Carry it to the green bay at left and drop it.', actions:['Grip / drop','Magnet pulse','Repair cargo'], tools:[], goal:'Recover $240 before the shift ends.', ai:'Bots choose unclaimed cargo, carry it to the extraction bay, and avoid bombs.'};
export function init(seed) {
  const s = base(seed,4,150,240);
  s.objects = Array.from({length:20}, (_,id)=>({id, x:210+rand(s)*660, y:330+rand(s)*150, vx:0, vy:0, r:18+rand(s)*9, mass:id%5===0?2:1, kind:id%7===0?'bomb':id%3===0?'creature':'metal', value:15+5*(id%5), health:3, owners:[], delivered:false}));
  s.players.forEach((p,i)=>Object.assign(p,{x:220+i*190,y:170,hand:null,magnet:0,repair:0}));
  note(s,'Grab a valuable, carry it left, and release it inside EXTRACTION.'); return s;
}
export function update(s,inputs,dt) {
  s.pulse = s.elapsed%13>10;
  s.players.forEach((p,i)=>{
    const input=inputs[i]||{}; p.magnet=Math.max(0,p.magnet-dt); p.repair=Math.max(0,p.repair-dt);
    const held=s.objects.find(o=>o.id===p.hand && !o.delivered);
    move(p,input,dt,held?.mass===2&&held.owners.length<2?105:230,[45,135,915,515]);
    if(input.a && p.cooldown<=0) {
      p.cooldown=.24;
      if(held) {held.owners=held.owners.filter(x=>x!==i); p.hand=null;}
      else {
        const o=nearest(p,s.objects,o=>!o.delivered&&(o.owners.length===0||o.mass===2)&&o.owners.length<2&&dist(p,o)<55);
        if(o) {o.owners.push(i); p.hand=o.id; if(o.mass===2) note(s,'Heavy cargo: a second claw can share the lift.');}
        else burst(s,p.x,p.y,'Move closer');
      }
    }
    if(input.b && p.magnet===0) {p.magnet=4; for(const o of s.objects) if(!o.delivered&&o.kind==='metal'&&!o.owners.length&&dist(p,o)<210) {o.vx+=(p.x-o.x)*3; o.vy+=(p.y-o.y)*3;} burst(s,p.x,p.y,'MAGNET',COLORS[i]);}
    if(input.c&&p.repair===0&&held&&held.health<3) {held.health=3;p.repair=10;burst(s,p.x,p.y,'Repaired');}
  });
  for(const o of s.objects) {
    if(o.delivered) continue;
    if(o.owners.length) {
      const targets=o.owners.map(i=>s.players[i]);
      o.x+=(targets.reduce((n,p)=>n+p.x,0)/targets.length-o.x)*Math.min(1,dt*14);
      o.y+=(targets.reduce((n,p)=>n+p.y,0)/targets.length+28-o.y)*Math.min(1,dt*14);o.vx=0;o.vy=0;
    } else {o.vy+=330*dt;o.x+=o.vx*dt;o.y+=o.vy*dt;o.vx*=Math.pow(.3,dt);}
    if(o.y>551-o.r){o.y=551-o.r;if(o.vy>300&&o.kind!=='bomb') o.health=Math.max(1,o.health-1);o.vy=-Math.abs(o.vy)*.15;}
    o.x=clamp(o.x,o.r+23,937-o.r);
    if(!o.owners.length && o.x<145 && o.y>360) {
      o.delivered=true;
      if(o.kind==='bomb'){s.score=Math.max(0,s.score-40);note(s,'That was a bomb. Extraction lost $40.');}
      else {const v=Math.round(o.value*(.6+.4*o.health/3));s.score+=v;burst(s,85,370,`+$${v}`,'#7af0c1');note(s,o.kind==='creature'?'Creature rescued. It approves of your methods.':'Cargo extracted. Find the next valuable.');}
    }
    if(s.pulse&&o.x>570&&o.x<690&&o.y>330&&o.owners.length&&!o.shocked){o.shocked=true;o.health=Math.max(1,o.health-1);burst(s,o.x,o.y,'ZAP!','#ff7988');}
    if(!s.pulse)o.shocked=false;
  }
  // Bounded circle collision gives loose cargo weight without a heavy physics dependency.
  for(let a=0;a<s.objects.length;a++) for(let b=a+1;b<s.objects.length;b++) {
    const x=s.objects[a],y=s.objects[b]; if(x.delivered||y.delivered||x.owners.length||y.owners.length)continue;
    let dx=y.x-x.x,dy=y.y-x.y,d=Math.hypot(dx,dy); const r=x.r+y.r;
    if(d>0&&d<r){const push=(r-d)*.5; x.x-=dx/d*push;y.x+=dx/d*push;x.y-=dy/d*push;y.y+=dy/d*push;}
  }
  if(s.score>=s.goal) finish(s,true,'Shift complete. The creatures have unionized.');
}
export function bot(s,i) {
  const p=s.players[i],o=s.objects.find(o=>o.id===p.hand&&!o.delivered);
  if(o)return aim(82,350,{a:p.x<125&&p.y>325});
  const target=nearest(p,s.objects,o=>!o.delivered&&o.kind!=='bomb'&&!o.owners.length);
  return target?aim(target.x,target.y-20,{a:dist(p,{x:target.x,y:target.y-20})<30}):aim(250+i*150,200);
}
export function hint(s){return s.pulse?'The red electrified strip is active. Route your cargo around it.':'Heavy objects move slowly with one claw. Two claws can share a load.';}
export function render(c,s,view={}) {
  bg(c,'#18353d','#0b242a');label(c,'SALVAGE BAY 04',`Recover $${s.goal} • Cargo condition affects its value`);
  box(c,18,108,924,461,'#21434a',18,'#4e6d70');
  for(let x=45;x<940;x+=40)line(c,x,112,x,565,'#ffffff05',1);
  box(c,27,351,122,205,'#225d50',14,'#83e6b9');text(c,'EXTRACTION',88,385,14,'#adffd6','center');text(c,'DROP HERE',88,415,14,'#adffd6','center');
  box(c,570,330,120,224,s.pulse?'#dc596066':'#243139',8);text(c,s.pulse?'LIVE':'CAUTION',630,520,14,s.pulse?'#ffbdaf':'#8b8d74','center');
  line(c,32,123,928,123,'#768e91',10);
  for(const o of s.objects) {
    if(o.delivered)continue;
    c.save();c.translate(o.x,o.y);circle(c,4,6,o.r,'#071b2355');
    if(o.kind==='creature'){circle(c,0,0,o.r,'#8fd8a8');circle(c,-o.r*.65,-o.r*.8,7,'#8fd8a8');circle(c,o.r*.65,-o.r*.8,7,'#8fd8a8');eye(c,0,-4,.8);}
    else if(o.kind==='bomb'){circle(c,0,0,o.r,'#3e3f4f','#f18b8b');line(c,0,-o.r,10,-o.r-7,'#e6ab75',3);text(c,'!',0,0,23,'#ff8e88','center');}
    else {box(c,-o.r,-o.r,o.r*2,o.r*2,o.mass===2?'#859eac':'#cdad77',6);line(c,-o.r+5,-o.r+5,o.r-5,o.r-5,'#ffffff33',3);text(c,o.mass===2?'2×':'$',0,0,17,'#1b3740','center');}
    if(o.kind!=='bomb')text(c,`$${o.value}`,0,o.r+16,12,'#d9efdd','center');c.restore();
  }
  s.players.forEach((p,i)=>{
    line(c,p.x,123,p.x,p.y-15,COLORS[i]+'99',4);box(c,p.x-22,113,44,20,COLORS[i],7);circle(c,p.x,p.y,16,COLORS[i]);eye(c,p.x,p.y-3,.55);
    for(const side of [-1,1]){line(c,p.x+side*10,p.y+8,p.x+side*25,p.y+24,COLORS[i],6);line(c,p.x+side*25,p.y+24,p.x+side*(p.hand===null?26:9),p.y+37,COLORS[i],5);}
    if(i===view.you)text(c,'YOU',p.x,p.y-33,13,'#fff2cc','center');
    if(p.magnet>3.6){c.beginPath();c.arc(p.x,p.y,(4-p.magnet)*400,0,Math.PI*2);c.strokeStyle=COLORS[i]+'88';c.lineWidth=3;c.stroke();}
  });
}
