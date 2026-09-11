(() => {
// lib/util.mjs
const M_lib_util_mjs = (() => {
const W = 960;
const H = 600;
const COLORS = ['#ffbd59', '#5ce0bf', '#9fafff', '#ff87ac'];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const nearest = (p, list, accept = () => true) => list.filter(accept).sort((a, b) => dist(p, a) - dist(p, b))[0];
function rand(s) {
  s.rng = ((s.rng >>> 0) * 1664525 + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
function base(seed, count = 4, seconds = 150, goal = 100) {
  return {rng: seed >>> 0, time: seconds, elapsed: 0, score: 0, goal, status: 'playing', message: 'Ready for your first run.', events: [], fx: [], players: Array.from({length: count}, (_, i) => ({x: 170 + i * 200, y: 320, cooldown: 0, tool: 0}))};
}
function note(s, text) {
  s.message = text;
  s.events.unshift({text, at: s.elapsed});
  s.events = s.events.slice(0, 4);
}
function burst(s, x, y, text, color = '#ffda8a') {
  s.fx.push({x, y, text, color, life: 1.3});
  s.fx = s.fx.slice(-24);
}
function finish(s, won, message) {
  s.status = won ? 'won' : 'lost';
  note(s, message);
}
function move(p, input = {}, dt, speed = 230, bounds = [40, 100, 920, 545]) {
  let dx = Number(input.dx) || 0;
  let dy = Number(input.dy) || 0;
  if (!dx && !dy && input.target) {dx = input.target.x - p.x; dy = input.target.y - p.y;}
  const length = Math.hypot(dx, dy);
  if ((input.dx || input.dy) ? length > 0 : length > 2) {
    const step = Math.min(speed * dt, input.dx || input.dy ? speed * dt : length);
    p.x += dx / length * step; p.y += dy / length * step;
  }
  p.x = clamp(p.x, bounds[0], bounds[2]); p.y = clamp(p.y, bounds[1], bounds[3]);
  if (Number.isInteger(input.tool)) p.tool = clamp(input.tool, 0, 9);
}
const idle = () => ({dx: 0, dy: 0, a: false, b: false, c: false});
const aim = (x, y, extras = {}) => ({target: {x, y}, ...extras});
function cellAt(input, x, y, size, cols, rows) {
  const p = input.target; if (!p) return -1;
  const col = Math.floor((p.x - x) / size), row = Math.floor((p.y - y) / size);
  return col >= 0 && col < cols && row >= 0 && row < rows ? row * cols + col : -1;
}
const center = (index, x, y, size, cols) => ({x: x + (index % cols + .5) * size, y: y + (Math.floor(index / cols) + .5) * size});

return {W,H,COLORS,clamp,dist,nearest,rand,pick,base,note,burst,finish,move,idle,aim,cellAt,center};
})();
// lib/draw.mjs
const M_lib_draw_mjs = (() => {
const {W, H, COLORS, clamp} = M_lib_util_mjs;
function box(c, x, y, w, h, color, radius = 12, stroke) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius); c.fillStyle = color; c.fill();
  if (stroke) {c.strokeStyle = stroke; c.lineWidth = 2; c.stroke();}
}
function line(c, x, y, xx, yy, color, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.stroke();
}
function circle(c, x, y, r, color, stroke) {
  c.beginPath(); c.arc(x, y, Math.max(0,r), 0, Math.PI * 2); c.fillStyle = color; c.fill();
  if (stroke) {c.strokeStyle = stroke; c.lineWidth = 2; c.stroke();}
}
function text(c, str, x, y, size = 20, color = '#e7eee9', align = 'left', weight = 700) {
  c.font = `${weight} ${size}px ui-rounded, system-ui, sans-serif`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(str), x, y);
}
function bg(c, top = '#152c33', bottom = '#0f2026') {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
function grid(c, x, y, cols, rows, size, fill = '#263e46') {
  for (let i = 0; i < cols * rows; i++) box(c, x + i % cols * size + 3, y + Math.floor(i / cols) * size + 3, size - 6, size - 6, fill, 9);
}
function eye(c, x, y, scale = 1, mood = 'happy') {
  for (const k of [-1, 1]) {circle(c, x + k * 7 * scale, y, 4 * scale, '#142a30'); circle(c, x + k * 7 * scale + 1, y - scale, 1.2 * scale, '#ffffff');}
  if (mood === 'worried') circle(c, x, y + 12 * scale, 3.5 * scale, '#142a30');
  else {c.beginPath(); c.arc(x, y + 7 * scale, 6 * scale, .2, Math.PI - .2); c.strokeStyle = '#142a30'; c.lineWidth = 2 * scale; c.stroke();}
}
function actor(c, p, index, you, size = 17) {
  circle(c, p.x + 3, p.y + 8, size + 3, '#09182055'); circle(c, p.x, p.y, size, COLORS[index % 4], index === you ? '#fff4d4' : undefined); eye(c, p.x, p.y - 3, .65);
  if (index === you) text(c, 'YOU', p.x, p.y - size - 14, 12, '#fff4d4', 'center');
}
function bar(c, x, y, w, ratio, color = '#5ce0bf', h = 8) {
  box(c, x, y, w, h, '#081e2877', h / 2); if (ratio > 0) box(c, x, y, Math.max(h, w * clamp(ratio, 0, 1)), h, color, h / 2);
}
function label(c, title, subtitle) {
  text(c, title, 32, 35, 23, '#f8ebcf'); if (subtitle) text(c, subtitle, 32, 65, 15, '#b5c8c8', 'left', 500);
}
function effects(c, s) {
  for (const p of s.fx) {c.save(); c.globalAlpha = clamp(p.life, 0, 1); text(c, p.text, p.x, p.y - (1.3 - p.life) * 30, 22, p.color, 'center'); c.restore();}
}
function gear(c, x, y, r, color) {
  c.save(); c.translate(x, y); for(let i = 0; i < 8; i++) {c.rotate(Math.PI / 4); box(c, -4, -r - 3, 8, 11, color, 2);} circle(c, 0, 0, r, color); circle(c, 0, 0, r * .4, '#223c43'); c.restore();
}

return {box,line,circle,text,bg,grid,eye,actor,bar,label,effects,gear};
})();
// games/do-not-open.mjs
const M_games_do_not_open_mjs = (() => {
const {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,eye,label,bar,actor} = M_lib_draw_mjs;
const meta={id:'do-not-open',title:'Do Not Open',tag:'CURSED PACKING CO-OP',players:4,color:'#c4da78',description:'Pack cursed objects on one shared table. The contents have strong opinions about their neighbors.',controls:'Pick up an item, move to an empty crate slot, and drop it. Ship at least four items. Mirrors cannot touch; creatures need music. Seal an item to neutralize its rule.',actions:['Pick up / drop','Ship crate','Seal nearest item'],tools:[],goal:'Ship three safe crates of at least four objects.',ai:'Packers pick separate objects, place them in free slots, and seal incompatible cargo before shipping.'};
const slots=Array.from({length:9},(_,i)=>({x:594+i%3*104,y:223+Math.floor(i/3)*104}));
const names=['MIRROR','MUSIC','CREATURE','SHADOW','LAMP','TEETH'];
const colors=['#afbdda','#e4b47a','#96d3a4','#bd9acf','#f1da8d','#ee9e97'];
function spawn(s){s.items=Array.from({length:8},(_,id)=>({id,type:[0,1,2,3,4,5,1,0][id],x:91+id%2*123,y:192+Math.floor(id/2)*90,slot:-1,held:-1,sealed:false}));s.players.forEach(p=>p.hand=-1);s.seals=4;}
function violations(s){const out=[];for(const o of s.items){if(o.slot<0||o.sealed)continue;const neighbors=s.items.filter(b=>b.slot>=0&&b.id!==o.id&&Math.abs(b.slot%3-o.slot%3)+Math.abs(Math.floor(b.slot/3)-Math.floor(o.slot/3))===1);
  if(o.type===0&&neighbors.some(b=>b.type===0&&!b.sealed))out.push({id:o.id,why:'Mirrors cannot touch.'});
  if(o.type===2&&!neighbors.some(b=>b.type===1))out.push({id:o.id,why:'A creature needs an adjacent music box.'});
  if(o.type===3&&neighbors.some(b=>b.type===4&&!b.sealed))out.push({id:o.id,why:'Keep shadows away from lamps.'});
  if(o.type===5&&neighbors.some(b=>b.type===2&&!b.sealed))out.push({id:o.id,why:'Teeth will eat the creature.'});
 }return out;}
function init(seed){const s=base(seed,4,200,3);s.seals=4;s.chaos=0;s.shippingCooldown=0;spawn(s);s.players.forEach((p,i)=>{p.x=365+i%2*95;p.y=180+Math.floor(i/2)*285;});note(s,'Pack four objects into the 3×3 crate. Read their rules, or use a seal.');return s;}
function update(s,inputs,dt){s.shippingCooldown=Math.max(0,s.shippingCooldown-dt);s.players.forEach((p,i)=>{const input=inputs[i]||{};move(p,input,dt,260,[45,135,915,535]);
  if(input.a&&p.cooldown<=0){p.cooldown=.22;const held=s.items.find(o=>o.id===p.hand&&o.held===i);if(held){const available=slots.map((v,id)=>({...v,id})).filter(v=>!s.items.some(o=>o.slot===v.id));const slot=nearest(p,available,q=>dist(p,q)<75);if(slot){held.slot=slot.id;held.x=slot.x;held.y=slot.y;held.held=-1;p.hand=-1;}else{held.x=p.x;held.y=p.y;held.held=-1;held.slot=-1;p.hand=-1;}}else{const o=nearest(p,s.items,o=>o.held<0&&dist(p,o)<65);if(o){o.held=i;o.slot=-1;p.hand=o.id;}}}
  if(input.c&&p.cooldown<=0&&s.seals>0){const o=s.items.find(o=>o.id===p.hand)||nearest(p,s.items,o=>!o.sealed&&dist(p,o)<90);if(o&&!o.sealed){o.sealed=true;s.seals--;p.cooldown=.4;burst(s,o.x,o.y,'SEALED','#cef09b');}}
  if(input.b&&s.shippingCooldown<=0){s.shippingCooldown=1;const count=s.items.filter(o=>o.slot>=0).length;const bad=violations(s);if(count<4)note(s,'The crate needs at least four objects.');else if(bad.length){note(s,bad[0].why);s.chaos+=8;burst(s,705,162,'SHIPMENT REJECTED','#ff9e91');}else{s.score++;s.chaos=Math.max(0,s.chaos-25);note(s,`Safe shipment ${s.score} dispatched.`);spawn(s);if(s.score>=s.goal)finish(s,true,'Three safe shipments. No parcels ate their recipients.');}}
 });
 for(const o of s.items)if(o.held>=0){o.x=s.players[o.held].x;o.y=s.players[o.held].y+18;}
 s.chaos=clamp(s.chaos+violations(s).length*dt*.45-dt*.12,0,100);if(s.chaos>=100)finish(s,false,'The warehouse has become a parcel. Try a safer arrangement.');
}
function bot(s,i){const p=s.players[i],held=s.items.find(o=>o.id===p.hand&&o.held===i),bad=violations(s);if(!held&&bad.length&&s.seals>0){const item=s.items.find(o=>o.id===bad[0].id);return aim(item.x,item.y,{c:dist(p,item)<65});}if(s.items.filter(o=>o.slot>=0).length>=4&&!bad.length)return {b:true};if(held){const slot=slots.find((v,id)=>!s.items.some(o=>o.slot===id));return slot?aim(slot.x,slot.y,{a:dist(p,slot)<26}):{};}
 const o=nearest(p,s.items,o=>o.held<0&&o.slot<0);return o?aim(o.x,o.y,{a:dist(p,o)<34}):{};}
function hint(s){const bad=violations(s);return bad.length?bad[0].why:`${s.items.filter(o=>o.slot>=0).length} objects packed. ${s.seals} seals available. Seal neutralizes that object's curse.`;}
function render(c,s,view={}){bg(c,'#344d43','#1c3333');label(c,'DEPARTMENT OF UNUSUAL POST',`${s.score} / 3 shipments • ${s.seals} containment seals`);box(c,22,112,916,447,'#75634b',18,'#b39f7c');box(c,35,140,280,385,'#30443f',12);text(c,'INCOMING',172,155,16,'#dddfbf','center');box(c,530,153,354,359,'#b59b6c',15);text(c,'OUTGOING CRATE',707,176,17,'#343c32','center');
 slots.forEach((p,i)=>{box(c,p.x-45,p.y-34,91,88,'#5c604b',8);text(c,i+1,p.x,p.y+17,15,'#ffffff25','center');});
 for(const o of s.items){box(c,o.x-36,o.y-29,72,62,colors[o.type],8);if(o.type===2||o.type===5)eye(c,o.x,o.y-12,.65);else text(c,['◇','♪','','☾','☼',''][o.type],o.x,o.y-8,26,'#2b4140','center');text(c,names[o.type],o.x,o.y+20,9,'#1c393b','center');if(o.sealed){line(c,o.x-31,o.y-24,o.x+30,o.y+27,'#ecf3d4',7);text(c,'S',o.x,o.y,20,'#376256','center');}}
 s.players.forEach((p,i)=>actor(c,{...p,y:p.y-9},i,view.you,15));text(c,'CURSE PRESSURE',341,515,11,'#efddba');bar(c,340,531,160,s.chaos/100,'#ee8f8b',10);
}

return {meta,violations,init,update,bot,hint,render};
})();
// games/grab-shift.mjs
const M_games_grab_shift_mjs = (() => {
const {base, rand, clamp, dist, nearest, move, aim, note, burst, finish, COLORS} = M_lib_util_mjs;
const {bg, box, circle, line, text, eye, label, bar} = M_lib_draw_mjs;
const meta = {id:'grab-shift', title:'Grab Shift', tag:'CO-OP SALVAGE', players:4, color:'#f8bb56', description:'You and your friends are the claw machine. Extract the valuables; leave the bombs.', controls:'Move your claw with WASD / arrows, or touch a destination. Grip near an object. Carry it to the green bay at left and drop it.', actions:['Grip / drop','Magnet pulse','Repair cargo'], tools:[], goal:'Recover $240 before the shift ends.', ai:'Bots choose unclaimed cargo, carry it to the extraction bay, and avoid bombs.'};
function init(seed) {
  const s = base(seed,4,150,240);
  s.objects = Array.from({length:20}, (_,id)=>({id, x:210+rand(s)*660, y:330+rand(s)*150, vx:0, vy:0, r:18+rand(s)*9, mass:id%5===0?2:1, kind:id%7===0?'bomb':id%3===0?'creature':'metal', value:15+5*(id%5), health:3, owners:[], delivered:false}));
  s.players.forEach((p,i)=>Object.assign(p,{x:220+i*190,y:170,hand:null,magnet:0,repair:0}));
  note(s,'Grab a valuable, carry it left, and release it inside EXTRACTION.'); return s;
}
function update(s,inputs,dt) {
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
function bot(s,i) {
  const p=s.players[i],o=s.objects.find(o=>o.id===p.hand&&!o.delivered);
  if(o)return aim(82,350,{a:p.x<125&&p.y>325});
  const target=nearest(p,s.objects,o=>!o.delivered&&o.kind!=='bomb'&&!o.owners.length);
  return target?aim(target.x,target.y-20,{a:dist(p,{x:target.x,y:target.y-20})<30}):aim(250+i*150,200);
}
function hint(s){return s.pulse?'The red electrified strip is active. Route your cargo around it.':'Heavy objects move slowly with one claw. Two claws can share a load.';}
function render(c,s,view={}) {
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

return {meta,init,update,bot,hint,render};
})();
// games/haunt-for-hire.mjs
const M_games_haunt_for_hire_mjs = (() => {
const {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,eye,label,bar} = M_lib_draw_mjs;
const meta={id:'haunt-for-hire',title:'Haunt for Hire',tag:'SUPERNATURAL CO-OP',players:4,color:'#a89bfa',description:'Be the ghosts. Possess household objects and coordinate scares against reactive residents.',controls:'Move near a household prop and possess it. Scare when a resident is nearby. Different props in quick succession create stronger scares.',actions:['Possess / release','Scare','Flicker lights'],tools:[],goal:'Scare five residents out of the house.',ai:'Ghosts pick props near residents; residents flee, investigate, or become less sensitive to repeated scares.'};
const props=[{x:170,y:232,name:'TV',room:0},{x:470,y:232,name:'PIANO',room:1},{x:780,y:232,name:'MIRROR',room:2},{x:175,y:480,name:'LAMP',room:3},{x:470,y:480,name:'FRIDGE',room:4},{x:780,y:480,name:'FAN',room:5}];
function resident(s,id){return {id,x:100+rand(s)*740,y:id%2?420:190,tx:100+rand(s)*750,fear:0,memory:Array(6).fill(0),lastProp:-1,lastScare:-20,kind:id%3};}
function init(seed){const s=base(seed,4,160,5);s.props=props.map((p,id)=>({...p,id,owner:-1,glow:0}));s.residents=[0,1,2].map(i=>resident(s,i));s.next=3;s.dark=0;s.players.forEach(p=>p.possess=-1);note(s,'Scares work within 190 pixels. Chain different props for a bonus.');return s;}
function update(s,inputs,dt){
  s.dark=Math.max(0,s.dark-dt);s.props.forEach(p=>p.glow=Math.max(0,p.glow-dt));
  s.players.forEach((p,i)=>{const input=inputs[i]||{};if(p.possess<0)move(p,input,dt,220,[50,130,910,535]);else{p.x=s.props[p.possess].x;p.y=s.props[p.possess].y-40;}
    if(input.a&&p.cooldown<=0){p.cooldown=.3;if(p.possess>=0){s.props[p.possess].owner=-1;p.possess=-1;}else{const prop=nearest(p,s.props,q=>q.owner<0&&dist(p,q)<85);if(prop){prop.owner=i;p.possess=prop.id;burst(s,prop.x,prop.y-45,'Possessed',COLORS[i]);}}}
    if(input.c&&p.cooldown<=0){s.dark=2;p.cooldown=3;burst(s,p.x,p.y,'Lights out','#bab6ff');}
    if(input.b&&p.cooldown<=0){p.cooldown=1.3;const prop=s.props[p.possess];if(prop)prop.glow=.8;
      let hit=0;for(const r of s.residents){if(dist(p,r)>195)continue;const prior=prop?r.memory[prop.id]:3;const combo=prop&&r.lastProp!==prop.id&&s.elapsed-r.lastScare<3.5;const amount=(prop?22:5)*(combo?1.6:1)*(s.dark>0?1.25:1)/(1+prior*.2);r.fear+=amount;r.lastScare=s.elapsed;if(prop){r.memory[prop.id]++;r.lastProp=prop.id;}hit++;burst(s,r.x,r.y-28,combo?'COMBO!':`+${Math.round(amount)}`,'#cabfff');}
      if(!hit)note(s,'Nobody is close enough. Release this prop and find another.');
    }
  });
  for(const r of s.residents){r.fear=Math.max(0,r.fear-dt*.7);const speed=r.fear>65?90:25+r.kind*8;if(Math.abs(r.x-r.tx)<15)r.tx=80+rand(s)*800;r.x+=Math.sign(r.tx-r.x)*dt*speed;
    if(r.fear>=100){s.score++;burst(s,r.x,r.y,'I QUIT!','#9bffd2');Object.assign(r,resident(s,s.next++));note(s,`${s.score} resident${s.score===1?'':'s'} fled. Next tenant is moving in.`);}
  }
  if(s.score>=s.goal)finish(s,true,'Five-star haunting. The deposit is yours.');
}
function bot(s,i){const p=s.players[i];if(p.possess>=0){const has=s.residents.some(r=>dist(p,r)<185);return has?{b:true}:{a:true};}const prop=nearest(p,s.props,q=>q.owner<0&&s.residents.some(r=>dist(q,r)<190));return prop?aim(prop.x,prop.y-35,{a:dist(p,{x:prop.x,y:prop.y-35})<35}):aim(480,280);}
function hint(s){return 'Residents get used to the same prop. Move to a new object or coordinate a scare with another ghost.';}
function render(c,s,view={}){
  bg(c,'#292d50','#191b31');label(c,'WELCOME TO 13 WISTERIA LANE',`${s.score} / 5 tenants persuaded to leave`);
  for(let i=0;i<6;i++){const x=32+i%3*300,y=110+Math.floor(i/3)*233;box(c,x,y,291,219,i%2?'#404362':'#374953',12,'#647187');for(let xx=x+20;xx<x+280;xx+=24)line(c,xx,y+8,xx,y+180,'#ffffff05',1);box(c,x+205,y+27,55,77,'#142334',4);line(c,x+233,y+28,x+233,y+100,'#566582',3);line(c,x+207,y+64,x+258,y+64,'#566582',3);box(c,x+5,y+182,280,27,'#786378',3);}
  s.props.forEach(p=>{if(p.glow>0)circle(c,p.x,p.y-13,60+p.glow*35,'#d1bcff33');box(c,p.x-39,p.y-44,78,62,p.owner>=0?COLORS[p.owner]:'#9f92aa',8);text(c,p.name,p.x,p.y-10,14,'#22263b','center');if(p.owner>=0)eye(c,p.x,p.y-33,.5);});
  s.residents.forEach(r=>{circle(c,r.x+3,r.y+14,20,'#13182c66');box(c,r.x-12,r.y+3,24,28,['#d09767','#719aaa','#aa7989'][r.kind],8);circle(c,r.x,r.y-6,17,'#ebcda5');eye(c,r.x,r.y-10,.6,r.fear>45?'worried':'happy');bar(c,r.x-30,r.y-40,60,r.fear/100,'#f39eb6');});
  s.players.forEach((p,i)=>{c.save();c.globalAlpha=p.possess>=0?.6:.95;circle(c,p.x,p.y,21,COLORS[i]);box(c,p.x-21,p.y,42,24,COLORS[i],8);for(let j=0;j<3;j++)circle(c,p.x-14+j*14,p.y+22,7,COLORS[i]);eye(c,p.x,p.y-3,.8);if(i===view.you)text(c,'YOU',p.x,p.y-32,12,'#fff3d6','center');c.restore();});
  if(s.dark>0)box(c,20,100,920,467,'#060b2555',15);
}

return {meta,init,update,bot,hint,render};
})();
// games/misprint.mjs
const M_games_misprint_mjs = (() => {
const {base, clamp, cellAt, center, aim, note, burst, finish} = M_lib_util_mjs;
const {bg,box,text,line,grid,label,bar,circle} = M_lib_draw_mjs;
const meta={id:'misprint',title:'Misprint',tag:'PRINTING ROGUELITE',players:1,color:'#ef88aa',description:'Build an impossible press. Copy, multiply, and foil your way through three print orders.',controls:'Select a stamp below, then tap a grid cell to install it. Print when your preview reaches the order target. Remove refunds a stamp.',actions:['Install stamp','Run the press','Remove stamp'],tools:['Star +3','Copy left','Double left','Foil neighbors','Copy above'],tapAction:true,goal:'Complete three print orders.',ai:'The autopilot searches legal placements and evaluates the resulting print score.'};
const X=190,Y=142,Z=106,C=5,R=3;
const names=['STAR','COPY','DOUBLE','FOIL','ABOVE'],symbols=['★','→','×2','+','↓'],colors=['#f7bb61','#85d6bd','#fa86b0','#b49aed','#8bbfee'];
function evaluate(board) {
  const values=[];
  for(let i=0;i<board.length;i++){
    const left=i%C?values[i-1]||0:0,above=i>=C?values[i-C]||0:0;
    const n=[i%C?i-1:-1,i%C<C-1?i+1:-1,i-C,i+C].filter(j=>j>=0&&j<board.length&&board[j]>=0).length;
    values[i]=board[i]===0?3:board[i]===1?left:board[i]===2?left*2:board[i]===3?4*n:board[i]===4?above:0;
  }
  return {values,total:values.reduce((a,b)=>a+b,0)};
}
function init(seed){const s=base(seed,1,600,3);Object.assign(s,{board:Array(15).fill(-1),ink:9,order:1,target:85,printing:false,printIndex:0,printClock:0,printed:[],wait:0});note(s,'Install stamps left to right. COPY and DOUBLE need a valuable stamp on their left.');return s;}
function update(s,inputs,dt){
  const input=inputs[0]||{},p=s.players[0];if(Number.isInteger(input.tool))p.tool=clamp(input.tool,0,4);
  if(s.printing){s.printClock+=dt;if(s.printClock>.12){s.printClock=0;s.printed.push(evaluate(s.board).values[s.printIndex]);s.printIndex++;if(s.printIndex===15){s.printing=false;const total=evaluate(s.board).total;if(total>=s.target){s.score++;s.wait=2;note(s,`Order ${s.order} accepted: ${total} points!`);if(s.score===3)finish(s,true,'Three extraordinary print orders delivered.');}else note(s,`${total} / ${s.target}. Rearrange the press and try again.`);}}return;}
  if(s.wait>0){s.wait-=dt;if(s.wait<=0){s.order++;s.target=[85,145,220][s.order-1];s.board=Array(15).fill(-1);s.ink=9+s.order;s.printed=[];note(s,`Order ${s.order}: reach ${s.target} points. You have ${s.ink} stamps.`);}return;}
  const index=cellAt(input,X,Y,Z,C,R);
  if(input.a&&index>=0&&s.ink>0&&s.board[index]<0){s.board[index]=p.tool;s.ink--;burst(s,X+index%C*Z+Z/2,Y+Math.floor(index/C)*Z+Z/2,symbols[p.tool]);}
  if(input.c&&index>=0&&s.board[index]>=0){s.board[index]=-1;s.ink++;}
  if(input.b){s.printing=true;s.printIndex=0;s.printed=[];s.printClock=0;note(s,'The press is running.');}
}
function bot(s){
  if(s.printing||s.wait>0)return {};
  if(evaluate(s.board).total>=s.target||s.ink===0)return {b:true};
  let best=-1,choice=null;
  for(let i=0;i<15;i++)if(s.board[i]<0)for(let type=0;type<5;type++){const board=[...s.board];board[i]=type;const score=evaluate(board).total+(i%C<4&&type===0?1:0);if(score>best){best=score;choice={i,type};}}
  if(!choice)return {b:true};return {...aim(...Object.values(center(choice.i,X,Y,Z,C))),tool:choice.type,a:true};
}
function hint(s){return `Preview: ${evaluate(s.board).total} / ${s.target}. A STAR → DOUBLE → DOUBLE chain prints 3, 6, then 12.`;}
function render(c,s){
  bg(c,'#482d47','#251f35');label(c,`ORDER ${s.order} / 3`,`${s.ink} stamps left • Target ${s.target} • Preview ${evaluate(s.board).total}`);
  box(c,154,114,606,389,'#171f2c',20,'#9d708d');box(c,155,492,605,51,'#6e6072',10);
  grid(c,X,Y,C,R,Z,'#343447');
  for(let i=0;i<15;i++){const xx=X+i%C*Z,yy=Y+Math.floor(i/C)*Z,t=s.board[i];
    if(t>=0){box(c,xx+8,yy+8,Z-16,Z-16,colors[t],10);text(c,symbols[t],xx+Z/2,yy+39,32,'#222a35','center');text(c,names[t],xx+Z/2,yy+74,12,'#343343','center');}
    else text(c,'+',xx+Z/2,yy+Z/2,26,'#6d677d','center',400);
    if(s.printed[i]!=null){box(c,xx+12,yy+14,58,32,'#fff4d6',6);text(c,s.printed[i],xx+41,yy+30,21,'#253139','center');}
  }
  for(let i=0;i<7;i++)circle(c,200+i*82,521,12,'#aba0b1');
  const active=s.printing?s.printIndex%5:-1;if(active>=0){box(c,X+active*Z,125,Z,342,'#fff5ce19',8);line(c,X+active*Z,130,X+active*Z,480,'#fff1c2',3);}
  text(c,'BUILD A COMBO. PRINT SOMETHING IMPOSSIBLE.',480,575,17,'#e8becf','center');
}

return {meta,evaluate,init,update,bot,hint,render};
})();
// games/pet-sitting-is-easy.mjs
const M_games_pet_sitting_is_easy_mjs = (() => {
const {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,eye,label,bar,actor} = M_lib_draw_mjs;
const meta={id:'pet-sitting-is-easy',title:'Pet Sitting Is Easy',tag:'CO-OP CREATURE CARE',players:4,color:'#d4a7d7',description:'Feed a balloon dog, calm a sneezy dragon, and stop a chameleon from eating the furniture.',controls:'Choose Food, Play, Calm, or Weight. Move near a pet and Care for it. Carry / release can relocate a pet. Rescue calms and grounds a nearby creature.',actions:['Care for pet','Carry / release','Emergency rescue'],tools:['Food','Play','Calm','Weight'],goal:'Earn 260 care points while keeping trust above zero.',ai:'Caretakers prioritize unmet needs, ground the balloon dog, calm the dragon, and feed hungry pets.'};
const names=['BALLOON DOG','CHAMELEON','SNEEZY DRAGON','WALL CAT'];
const colors=['#edb09d','#9ed1aa','#cca7e6','#9dbddc'];
function init(seed){const s=base(seed,4,170,260);s.trust=100;s.pets=Array.from({length:4},(_,id)=>({id,x:230+(id%2)*480,y:235+Math.floor(id/2)*210,tx:230+(id%2)*480,ty:235+Math.floor(id/2)*210,hunger:35+rand(s)*25,boredom:30+rand(s)*30,stress:25+rand(s)*25,inflation:id===0?45:0,grounded:0,held:-1,incident:0}));s.players.forEach(p=>{p.hand=-1;p.rescue=0;});note(s,'Pick a care kit. Move beside a pet and use Care. Different creatures need different help.');return s;}
function update(s,inputs,dt){s.players.forEach((p,i)=>{const input=inputs[i]||{};p.rescue=Math.max(0,p.rescue-dt);move(p,input,dt,240,[65,150,905,525]);const pet=nearest(p,s.pets,q=>dist(p,q)<90);
 if(input.a&&p.cooldown<=0&&pet){let gain=0;if(p.tool===0){gain=Math.min(32,pet.hunger);pet.hunger-=gain;if(pet.id===0&&pet.grounded<=0)pet.inflation+=12;}if(p.tool===1){gain=Math.min(32,pet.boredom);pet.boredom-=gain;pet.stress+=pet.id===2?8:-4;}if(p.tool===2){gain=Math.min(32,pet.stress);pet.stress-=gain;}if(p.tool===3&&pet.id===0){gain=Math.min(30,pet.inflation);pet.inflation=Math.max(0,pet.inflation-40);pet.grounded=18;}const points=Math.floor(gain*.3);s.score+=points;p.cooldown=.85;burst(s,pet.x,pet.y-30,points?`+${points} CARE`:'Already happy',points?'#c9f1bf':'#e6d9cb');}
 if(input.b&&p.cooldown<=0){if(p.hand>=0){s.pets[p.hand].held=-1;p.hand=-1;}else if(pet&&pet.held<0){pet.held=i;p.hand=pet.id;}p.cooldown=.4;}
 if(input.c&&pet&&p.rescue===0){pet.stress=Math.max(0,pet.stress-30);pet.inflation=Math.max(0,pet.inflation-35);pet.grounded=10;p.rescue=9;burst(s,pet.x,pet.y,'RESCUED','#c2e7f4');}
 });
 for(const pet of s.pets){pet.hunger=clamp(pet.hunger+dt*1.0,0,100);pet.boredom=clamp(pet.boredom+dt*.8,0,100);pet.stress=clamp(pet.stress+dt*(pet.id===2?1.1:.5),0,100);pet.grounded=Math.max(0,pet.grounded-dt);pet.incident=Math.max(0,pet.incident-dt);if(pet.id===0&&pet.grounded<=0)pet.inflation=clamp(pet.inflation+dt*1.5,0,100);
  if(pet.held>=0){const p=s.players[pet.held];pet.x=p.x;pet.y=p.y-22;}else{if(dist(pet,{x:pet.tx,y:pet.ty})<12){pet.tx=120+rand(s)*720;pet.ty=180+rand(s)*320;}move(pet,aim(pet.tx,pet.ty),dt,pet.id===3?52:27,[90,170,875,515]);}
  if((pet.hunger>90||pet.stress>90||pet.inflation>=95)&&pet.incident===0){s.trust-=7;pet.incident=5;burst(s,pet.x,pet.y-50,pet.id===0?'FLOATING AWAY!':pet.id===2?'ACHOO!':'UNHAPPY!','#ff9aac');if(pet.id===2)s.pets.forEach(q=>{if(q.id!==2&&dist(q,pet)<160)q.stress=clamp(q.stress+15,0,100);});note(s,`${names[pet.id]} needs help. Trust -7.`);}
 }
 if(s.trust<=0)finish(s,false,'The pets have filed a complaint. Try a different care strategy.');else if(s.score>=s.goal)finish(s,true,'Happy creatures. The owners will definitely book you again.');
}
function bot(s,i){const p=s.players[i];let best=null,urgency=-1;for(const pet of s.pets){const needs=[pet.hunger,pet.boredom,pet.stress,pet.id===0?pet.inflation+(pet.inflation>55?20:0):-10];for(let tool=0;tool<4;tool++){const u=needs[tool]-dist(p,pet)*.035-i*.01;if(u>urgency){urgency=u;best={pet,tool};}}}return best?aim(best.pet.x,best.pet.y,{a:dist(p,best.pet)<68,tool:best.tool,c:best.pet.inflation>88}):{};}
function hint(s){const pet=s.pets.reduce((a,b)=>Math.max(a.hunger,a.boredom,a.stress,a.inflation)>Math.max(b.hunger,b.boredom,b.stress,b.inflation)?a:b);return `${names[pet.id]}: hunger ${Math.round(pet.hunger)}, boredom ${Math.round(pet.boredom)}, stress ${Math.round(pet.stress)}${pet.id===0?', inflation '+Math.round(pet.inflation):''}.`;}
function render(c,s,view={}){bg(c,'#5b5264','#353e4a');label(c,'TOTALLY NORMAL PET DAYCARE',`${s.score} / 260 care points • Owner trust ${Math.round(s.trust)}%`);box(c,31,111,898,448,'#798680',25,'#c5c4ad');for(let x=47;x<930;x+=40)line(c,x,117,x,550,'#ffffff09',1);box(c,57,132,845,51,'#bcc3a9',12);text(c,'PLEASE DO NOT FEED THE FURNITURE TO THE CHAMELEON',480,158,15,'#385452','center');
 for(const pet of s.pets){const x=pet.x,y=pet.y;circle(c,x+3,y+18,36,'#293d4633');if(pet.id===0){line(c,x,y+15,x,y+65,'#eee2c6',2);circle(c,x,y,24+pet.inflation*.09,colors[0]);circle(c,x-20,y-21,13,colors[0]);circle(c,x+20,y-21,13,colors[0]);if(pet.grounded>0)box(c,x-12,y+58,24,13,'#5a6771',4);}
  if(pet.id===1){box(c,x-35,y-18,70,40,colors[1],20);circle(c,x+28,y-22,12,colors[1]);c.beginPath();c.arc(x-35,y+4,17,0,Math.PI*1.6);c.strokeStyle=colors[1];c.lineWidth=10;c.stroke();}
  if(pet.id===2){box(c,x-26,y-24,52,55,colors[2],16);for(const side of [-1,1]){c.beginPath();c.moveTo(x+side*16,y-14);c.lineTo(x+side*52,y-30);c.lineTo(x+side*37,y+9);c.closePath();c.fillStyle='#ae83c8';c.fill();}}
  if(pet.id===3){box(c,x-26,y-23,52,49,colors[3],12);for(const side of [-1,1]){c.beginPath();c.moveTo(x+side*25,y-8);c.lineTo(x+side*21,y-42);c.lineTo(x+side*8,y-20);c.fillStyle=colors[3];c.fill();}}
  eye(c,x,y-7,.95,pet.stress>65?'worried':'happy');text(c,names[pet.id],x,y+43,11,'#eff0db','center');bar(c,x-38,y+57,76,pet.hunger/100,'#efbd7c',5);bar(c,x-38,y+65,76,pet.boredom/100,'#90cdec',5);bar(c,x-38,y+73,76,pet.stress/100,'#ed99b1',5);
 }
 s.players.forEach((p,i)=>actor(c,p,i,view.you,13));text(c,'ORANGE: HUNGER    BLUE: BOREDOM    PINK: STRESS',480,581,12,'#dce9df','center');
}

return {meta,init,update,bot,hint,render};
})();
// games/scrap-sumo.mjs
const M_games_scrap_sumo_mjs = (() => {
const {base,rand,clamp,dist,aim,cellAt,center,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,label,bar,eye,gear} = M_lib_draw_mjs;
const meta={id:'scrap-sumo',title:'Scrap Sumo',tag:'BUILD & BATTLE',players:4,color:'#f19b7c',description:'Build a toy fighter from wheels, springs, fans, weights, and sticky pads. Push rivals out of the ring.',controls:'During building: choose parts and tap the 3×3 chassis; press Ready. During battle: steer toward a target, Dash into rivals, Reverse, or Brake.',actions:['Mount / dash','Ready / reverse','Remove / brake'],tools:['Wheel','Spring','Fan','Weight','Sticky pad'],tapAction:true,goal:'Win a best-of-three toy-sumo tournament.',ai:'Bots build functional chassis, pursue opponents, dash at contact range, and steer away from the edge.'};
const BX=320,BY=182,BZ=102;
const colors=['#e5b277','#cd9ddb','#91c7dd','#a3b5c0','#9fd1a3'],names=['WHEEL','SPRING','FAN','WEIGHT','STICKY'];
function stats(p){const n=t=>p.parts.filter(x=>x===t).length;return {mass:1+n(3)*.32,thrust:120+n(0)*23+n(2)*14,dash:210+n(1)*65,drag:n(4)*.3};}
function startRound(s){s.phase='battle';s.roundTime=35;s.players.forEach((p,i)=>{p.x=480+Math.cos(i*Math.PI/2)*140;p.y=345+Math.sin(i*Math.PI/2)*140;p.vx=0;p.vy=0;p.alive=true;p.cooldown=0;});note(s,`Round ${s.round}: push the other toys out of the ring.`);}
function init(seed){const s=base(seed,4,210,2);s.phase='build';s.buildTime=35;s.round=1;s.wait=0;s.players.forEach((p,i)=>Object.assign(p,{parts:Array(9).fill(-1),ready:false,vx:0,vy:0,alive:true,wins:0}));note(s,'Install up to eight parts, then press Ready. The middle square is your core.');return s;}
function update(s,inputs,dt){
 if(s.phase==='build'){s.buildTime-=dt;s.players.forEach((p,i)=>{const input=inputs[i]||{};if(Number.isInteger(input.tool))p.tool=clamp(input.tool,0,4);const cell=cellAt(input,BX,BY,BZ,3,3);if(input.a&&cell>=0&&cell!==4&&!p.ready)p.parts[cell]=p.tool;if(input.c&&cell>=0&&cell!==4&&!p.ready)p.parts[cell]=-1;if(input.b){if(p.parts.every(v=>v<0))p.parts[7]=0;p.ready=true;}});if(s.players.every(p=>p.ready)||s.buildTime<=0)startRound(s);return;}
 if(s.phase==='between'){s.wait-=dt;if(s.wait<=0){s.round++;startRound(s);}return;}
 s.roundTime-=dt;
 s.players.forEach((p,i)=>{if(!p.alive)return;const input=inputs[i]||{},a=stats(p);let dx=input.dx||0,dy=input.dy||0;if(!dx&&!dy&&input.target){dx=input.target.x-p.x;dy=input.target.y-p.y;}const d=Math.hypot(dx,dy);if((input.dx||input.dy)?d>0:d>3){dx/=d;dy/=d;p.vx+=dx*a.thrust*dt;p.vy+=dy*a.thrust*dt;p.angle=Math.atan2(dy,dx);}
  if(input.a&&p.cooldown<=0){p.vx+=Math.cos(p.angle||0)*a.dash;p.vy+=Math.sin(p.angle||0)*a.dash;p.cooldown=3;burst(s,p.x,p.y,'BOOST',COLORS[i]);}
  if(input.b&&p.cooldown<=0){p.vx*=-.8;p.vy*=-.8;p.cooldown=.4;}
  const drag=input.c?6:1.1+a.drag;p.vx*=Math.exp(-drag*dt);p.vy*=Math.exp(-drag*dt);p.x+=p.vx*dt;p.y+=p.vy*dt;if(Math.hypot(p.x-480,p.y-345)>242){p.alive=false;burst(s,p.x,p.y,'OUT','#ff9c92');}
 });
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=s.players[i],b=s.players[j];if(!a.alive||!b.alive)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<61&&d>.01){const nx=dx/d,ny=dy/d,over=61-d;a.x-=nx*over/2;a.y-=ny*over/2;b.x+=nx*over/2;b.y+=ny*over/2;const velocity=(a.vx-b.vx)*nx+(a.vy-b.vy)*ny;const impulse=Math.max(0,velocity)*1.5+45;a.vx-=nx*impulse/stats(a).mass;a.vy-=ny*impulse/stats(a).mass;b.vx+=nx*impulse/stats(b).mass;b.vy+=ny*impulse/stats(b).mass;}}
 const living=s.players.map((p,i)=>({...p,i})).filter(p=>p.alive);if(living.length<=1||s.roundTime<=0){let winner=living.length===1?living[0].i:living.sort((a,b)=>dist(a,{x:480,y:345})-dist(b,{x:480,y:345}))[0]?.i;
  if(winner!=null){s.players[winner].wins++;note(s,`Player ${winner+1} wins round ${s.round}.`);}s.score=s.players[0].wins;
  const champion=s.players.findIndex(p=>p.wins>=2);if(champion>=0||s.round>=5){s.winner=champion>=0?champion:s.players.map((p,i)=>({i,w:p.wins})).sort((a,b)=>b.w-a.w)[0].i;finish(s,true,`Player ${s.winner+1} wins the scrap tournament!`);}else{s.phase='between';s.wait=3;}
 }
}
function bot(s,i){const p=s.players[i];if(s.phase==='build'){if(p.ready)return{};const cell=p.parts.findIndex((v,j)=>v<0&&j!==4);if(cell<0)return {b:true};const pt=center(cell,BX,BY,BZ,3);return aim(pt.x,pt.y,{a:true,tool:[0,1,3,2,4][(cell+i)%5]});}if(!p.alive)return{};if(dist(p,{x:480,y:345})>174)return aim(480,345,{c:dist(p,{x:480,y:345})>215});const other=s.players.filter((q,j)=>j!==i&&q.alive).sort((a,b)=>dist(p,a)-dist(p,b))[0];return other?aim(other.x,other.y,{a:dist(p,other)<105}):aim(480,345);}
function hint(s){return s.phase==='build'?'Wheels add thrust. Springs add dash force. Weights resist impacts. Sticky pads add drag.':'Steer back toward the middle before dashing again. Braking helps you survive near the edge.';}
function toy(c,p,i){const a=p.angle||0;c.save();c.translate(p.x,p.y);c.rotate(a);box(c,-25,-22,50,44,COLORS[i],9,'#e6e6c4');for(let j=0;j<9;j++){if(p.parts[j]<0)continue;const x=(j%3-1)*21,y=(Math.floor(j/3)-1)*20;box(c,x-7,y-7,14,14,colors[p.parts[j]],4);}text(c,'›',27,0,27,'#fff6d5','center');c.restore();text(c,p.wins+' WIN'+(p.wins===1?'':'S'),p.x,p.y-47,11,COLORS[i],'center');}
function render(c,s,view={}){bg(c,'#443b40','#262d38');label(c,s.phase==='build'?'SCRAP WORKSHOP':`SUMO ROUND ${s.round}`,s.phase==='build'?`${Math.ceil(s.buildTime)}s to build • Your chassis is shown below`:`${Math.ceil(s.roundTime||0)} seconds • First to two round wins`);
 if(s.phase==='build'){const p=s.players[view.you??0];box(c,BX-20,BY-20,BZ*3+40,BZ*3+40,'#213444',15,'#829092');for(let i=0;i<9;i++){const x=BX+i%3*BZ,y=BY+Math.floor(i/3)*BZ;box(c,x+4,y+4,BZ-8,BZ-8,i===4?COLORS[view.you??0]:p.parts[i]<0?'#365062':colors[p.parts[i]],10);text(c,i===4?'CORE':p.parts[i]<0?'+':names[p.parts[i]],x+BZ/2,y+BZ/2,i===4?20:p.parts[i]<0?30:12,'#f1edda','center');}text(c,p.ready?'READY FOR THE RING':'YOUR BUILD',480,526,20,'#ebd1ac','center');s.players.forEach((p,i)=>text(c,`P${i+1}: ${p.ready?'READY':p.parts.filter(x=>x>=0).length+' PARTS'}`,65,185+i*48,16,COLORS[i]));}
 else{circle(c,480,351,251,'#102731');circle(c,480,345,239,'#b9a184','#f4d9a3');circle(c,480,345,206,'#b2a487');circle(c,480,345,98,'#bfad8e');for(let i=0;i<8;i++){const a=i*Math.PI/4;line(c,480+Math.cos(a)*213,345+Math.sin(a)*213,480+Math.cos(a)*235,345+Math.sin(a)*235,'#584e45',7);}s.players.forEach((p,i)=>{if(p.alive)toy(c,p,i);});if(s.phase==='between')text(c,s.message,480,340,24,'#333443','center');}
}

return {meta,init,update,bot,hint,render};
})();
// games/sink-different.mjs
const M_games_sink_different_mjs = (() => {
const {base,rand,clamp,dist,nearest,move,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,label,bar,actor,eye} = M_lib_draw_mjs;
const meta={id:'sink-different',title:'Sink Different',tag:'CO-OP BOAT TRIAGE',players:4,color:'#77c9e3',description:'The leaks are also your engines. Keep enough jets open to move, and enough water out to survive.',controls:'Move near a colored leak and toggle its plug. Bail near the central pump. Stabilize reduces tilt. Open jets move the boat but also fill it with water.',actions:['Toggle nearest leak','Bail at pump','Stabilize hull'],tools:[],goal:'Reach the harbor without flooding the boat.',ai:'Crew members monitor flooding, preserve propulsion, bail water, and correct dangerous tilt.'};
const pump={x:480,y:335};
function init(seed){const s=base(seed,4,150,100);Object.assign(s,{water:22,progress:0,tilt:0,nextWave:18,rock:0,leaks:Array.from({length:6},(_,id)=>({id,x:155+id%3*325,y:id<3?225:468,open:id===0||id===4,side:id%3===0?-1:id%3===2?1:0}))});s.players.forEach((p,i)=>{p.x=355+i%2*230;p.y=300+Math.floor(i/2)*96;});note(s,'Two open jets are a good start. Use the center pump before the water reaches 100%.');return s;}
function update(s,inputs,dt){
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
function bot(s,i){const p=s.players[i],open=s.leaks.filter(l=>l.open);if(s.water>35+i*2)return aim(pump.x+(i-1)*28,pump.y,{b:dist(p,pump)<85,c:Math.abs(s.tilt)>20});if(open.length<2){const leak=s.leaks.find(l=>!l.open);return aim(leak.x,leak.y,{a:dist(p,leak)<38});}if(open.length>3){const leak=nearest(p,open);return aim(leak.x,leak.y,{a:dist(p,leak)<38});}return aim(pump.x+(i-1)*50,pump.y,{c:Math.abs(s.tilt)>12});}
function hint(s){return `${s.leaks.filter(l=>l.open).length} jets open. Water ${Math.round(s.water)}%. Keep moving, but do not open every leak.`;}
function render(c,s,view={}){bg(c,'#244c68','#133d54');label(c,'SOMEWHAT SEAWORTHY',`${Math.floor(s.progress)}% to harbor • Flooding ${Math.round(s.water)}%`);
 for(let i=0;i<13;i++){const yy=108+i*37;for(let j=0;j<12;j++){const xx=j*90+Math.sin(s.elapsed+i)*12;line(c,xx,yy,xx+35,yy,'#8bbbc222',3);}}
 line(c,95,126,854,126,'#81aaac55',5);box(c,90+s.progress*7.2,114,30,19,'#ecd5a2',5);text(c,'HARBOR',866,125,12,'#cee5dc','center');
 c.save();c.translate(480,340);c.rotate(s.tilt*.002+Math.sin(s.elapsed*2)*.006);c.translate(-480,-340);
 box(c,65,176,829,367,'#493d32',80,'#b19f7d');box(c,84,194,791,327,'#a48e68',60);for(let y=216;y<520;y+=34)line(c,99,y,860,y,'#796a52',3);
 if(s.water>0)box(c,93,516-s.water*2.9,773,s.water*2.9,'#69bddb88',18);
 box(c,pump.x-42,pump.y-46,84,95,'#426977',12,'#bdd6cb');circle(c,pump.x,pump.y-8,25,'#a5c7bd');line(c,pump.x-22,pump.y-8,pump.x+22,pump.y-8,'#355e66',6);text(c,'PUMP',pump.x,pump.y+32,13,'#e4f2d7','center');
 for(const l of s.leaks){circle(c,l.x,l.y,25,l.open?'#143846':'#8d6a48','#d8c599');if(l.open){for(let j=0;j<3;j++)line(c,l.x-14+j*14,l.y,l.x-12+j*13,l.y+(l.id<3?42:-42)+Math.sin(s.elapsed*8+j)*8,'#9ce4f1',5);}else text(c,'×',l.x,l.y,26,'#dbc594','center');}
 s.players.forEach((p,i)=>actor(c,p,i,view.you));c.restore();bar(c,270,567,420,s.water/100,s.water>70?'#fa8c91':'#84ddeb',12);text(c,'FLOOD LEVEL',480,551,11,'#d4ebe6','center');if(s.rock>0)text(c,'WAVE!',780,165,24,'#fcdf96','center');
}

return {meta,init,update,bot,hint,render};
})();
// games/upstairs-is-on-fire.mjs
const M_games_upstairs_is_on_fire_mjs = (() => {
const {base,clamp,cellAt,center,aim,note,burst,finish} = M_lib_util_mjs;
const {bg,box,text,line,grid,label,bar,circle} = M_lib_draw_mjs;
const meta={id:'upstairs-is-on-fire',title:'Upstairs Is on Fire',tag:'BUILDING COMBO PUZZLE',players:1,color:'#ffad75',description:'Build an absurd apartment block. Heat, noise, water, and neighbors turn rooms into combinations.',controls:'Choose a room and tap an empty lot. Neighbors matter. Inspect your building to claim income; remove a room to recover its permit.',actions:['Place room','Inspect building','Remove room'],tools:['Bakery','Greenhouse','Ice studio','Drummer','Laboratory','Aquarium'],tapAction:true,goal:'Earn a building inspection score of 130 using 14 rooms.',ai:'The builder evaluates room placements against the same adjacency rules you use.'};
const X=225,Y=122,Z=91,C=5,R=4;
const names=['BAKERY','GARDEN','ICE','DRUMMER','LAB','AQUARIUM'],icons=['B','G','I','D','L','A'],colors=['#dfa168','#90c99a','#9dd6e5','#cf96cf','#b6b9e9','#74c1bd'];
function evaluate(board){
  let score=0;const values=[];const details=[];
  for(let i=0;i<20;i++){
    const type=board[i];if(type<0){values.push(0);continue;}let v=4;const below=board[i+C],above=board[i-C];const neighbors=[i%C?i-1:-1,i%C<C-1?i+1:-1,i-C,i+C].filter(j=>j>=0&&j<20);
    if(type===1&&below===0){v+=18;details.push('Bakery warms greenhouse +18');}
    if(type===2&&below===0){v-=18;details.push('Bakery melts ice studio -18');}
    if(type===4){v+=neighbors.filter(j=>board[j]===3).length*13;v-=neighbors.filter(j=>board[j]===5).length*9;}
    if(type===5&&above===1){v+=16;details.push('Garden drainage fills aquarium +16');}
    if(type===2){v+=neighbors.filter(j=>board[j]===2).length*5;}
    if(type===0&&above===5)v-=14;
    values.push(v);score+=v;
  }
  return {score,values,details:[...new Set(details)]};
}
function init(seed){const s=base(seed,1,600,130);Object.assign(s,{board:Array(20).fill(-1),permits:14,inspections:0});note(s,'A greenhouse ABOVE a bakery gets free heat. Labs love neighboring drummers.');return s;}
function update(s,inputs){const input=inputs[0]||{},p=s.players[0];if(Number.isInteger(input.tool))p.tool=clamp(input.tool,0,5);const i=cellAt(input,X,Y,Z,C,R);
  if(input.a&&i>=0&&s.board[i]<0&&s.permits>0){s.board[i]=p.tool;s.permits--;const v=evaluate(s.board);s.score=v.score;note(s,v.details.at(-1)||'New tenant installed. Build a useful neighbor.');}
  if(input.c&&i>=0&&s.board[i]>=0){s.board[i]=-1;s.permits++;s.score=evaluate(s.board).score;}
  if(input.b){s.inspections++;s.score=evaluate(s.board).score;if(s.score>=s.goal)finish(s,true,'Inspection passed. Your very strange building is profitable.');else note(s,`Inspection: ${s.score} / ${s.goal}. Rearrange rooms for stronger combinations.`);}
}
function bot(s){if(s.score>=s.goal||s.permits===0)return {b:true};let best=-Infinity,choice=null;for(let i=0;i<20;i++)if(s.board[i]<0)for(let t=0;t<6;t++){const b=[...s.board];b[i]=t;let v=evaluate(b).score;if(t===3)v+=.2;if(v>best){best=v;choice={i,t};}}if(!choice)return{};const p=center(choice.i,X,Y,Z,C);return aim(p.x,p.y,{a:true,tool:choice.t});}
function hint(s){return `Projected income: ${s.score} / 130. Labs gain +13 for every adjacent drummer. Gardens above bakeries gain +18.`;}
function render(c,s){bg(c,'#635365','#273540');label(c,'THE VERTICAL ECONOMY',`${s.permits} building permits • ${s.score} projected income • Inspect at 130`);
  for(let i=0;i<12;i++)box(c,35+i*78,365-(i%3)*35,61,212+(i%3)*35,'#292e43',2);
  box(c,X-19,Y-19,Z*C+38,Z*R+35,'#ced3c1',9);grid(c,X,Y,C,R,Z,'#404e53');const result=evaluate(s.board);
  for(let i=0;i<20;i++){const x=X+i%C*Z,y=Y+Math.floor(i/C)*Z,t=s.board[i];if(t>=0){box(c,x+5,y+5,Z-10,Z-10,colors[t],5);text(c,icons[t],x+Z/2,y+34,28,'#253740','center');text(c,names[t],x+Z/2,y+60,10,'#253740','center');text(c,`${result.values[i]>=0?'+':''}${result.values[i]}`,x+Z-19,y+17,12,result.values[i]<0?'#b33039':'#215748','center');}else{box(c,x+26,y+23,37,42,'#a4b9b222',3);line(c,x+44,y+24,x+44,y+64,'#b5cfc244',2);}}
  box(c,X-30,Y+R*Z+14,Z*C+60,45,'#c0ac95',6);text(c,'ROOMS CREATE THE RULES',480,552,20,'#e7d7bd','center');
  text(c,'HEAT',92,193,17,'#f5bf86');text(c,'Bakery → Garden',92,218,13,'#ddd0c3');text(c,'NOISE',742,300,17,'#ddaaed');text(c,'Drummer → Lab',742,325,13,'#ddd0c3');
}

return {meta,evaluate,init,update,bot,hint,render};
})();
// games/we-are-the-floor.mjs
const M_games_we_are_the_floor_mjs = (() => {
const {base,clamp,dist,move,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,eye,label,bar} = M_lib_draw_mjs;
const meta={id:'we-are-the-floor',title:'We Are the Floor',tag:'CO-OP PLATFORM RESCUE',players:4,color:'#83d9b8',description:'You are the platforms, not the platformer. Guide a delivery robot over a very hot floor.',controls:'Move your platform under the robot. Leapfrog ahead once it passes. Boost jumps when the robot is on you; Rescue pulls a nearby falling robot back up.',actions:['Change shape','Boost robot','Rescue robot'],tools:[],goal:'Deliver three cakes before losing four robots.',ai:'Platforms move ahead of the robot, support gaps, and rescue it when it falls.'};
function resetRobot(s){s.robot={x:58,y:363,vx:52,vy:0,on:-1};s.players.forEach((p,i)=>{p.x=190+i*186;p.y=420;p.form=0;p.rescue=0;});}
function init(seed){const s=base(seed,4,210,3);s.lives=4;s.delivery=1;resetRobot(s);note(s,'Keep the robot above the lava. Move passed platforms ahead of it.');return s;}
function update(s,inputs,dt){
  const r=s.robot;
  s.players.forEach((p,i)=>{const oldX=p.x,oldY=p.y,input=inputs[i]||{};p.rescue=Math.max(0,p.rescue-dt);move(p,input,dt,260,[90,265,870,490]);if(r.on===i){r.x+=p.x-oldX;r.y+=p.y-oldY;}
    if(input.a&&p.cooldown<=0){p.form=(p.form+1)%3;p.cooldown=.35;}
    if(input.b&&r.on===i&&p.cooldown<=0){r.vy=-290;r.on=-1;p.cooldown=1;burst(s,r.x,r.y,'BOING!',COLORS[i]);}
    if(input.c&&p.rescue===0&&dist(p,r)<155&&r.y>p.y-10){r.x=p.x;r.y=p.y-32;r.vy=0;r.on=i;p.rescue=6;burst(s,r.x,r.y,'SAVED',COLORS[i]);}
  });
  const oldY=r.y;r.vx=r.on>=0&&s.players[r.on].form===2?90:54;r.x+=r.vx*dt;r.vy+=500*dt;r.y+=r.vy*dt;r.on=-1;
  const surfaces=[{x:45,y:420,w:115,id:-2},...s.players.map((p,i)=>({...p,w:172,id:i})),{x:923,y:420,w:105,id:-3}];
  for(const p of surfaces){const top=p.y-(p.form===1?clamp((r.x-p.x)*-.12,-10,10):0);if(r.x>p.x-p.w/2&&r.x<p.x+p.w/2&&r.vy>=0&&oldY+25<=top+18&&r.y+25>=top){r.y=top-25;r.vy=0;r.on=p.id;break;}}
  if(r.y>575){s.lives--;s.time=Math.max(0,s.time-6);burst(s,480,360,'DELIVERY LOST','#ff8798');note(s,`${s.lives} robots left. Move a platform under the next delivery.`);resetRobot(s);if(s.lives<=0)finish(s,false,'Out of delivery robots. The cake was not lava-proof.');}
  if(r.x>906){s.score++;s.delivery++;note(s,`Cake ${s.score} delivered! The next customer is hungry.`);burst(s,850,340,'DELIVERED','#83efd0');resetRobot(s);if(s.score>=s.goal)finish(s,true,'All three cakes delivered. You are an excellent floor.');}
}
function bot(s,i){const p=s.players[i],r=s.robot;if(r.on===i)return{};if(r.y>455&&Math.abs(p.x-r.x)<180)return aim(r.x,420,{c:true});let x=p.x;if(p.x<r.x-105)x=Math.min(860,Math.max(...s.players.map(q=>q.x))+175);if(p.x>r.x+450&&s.players.every(q=>q===p||Math.abs(q.x-(r.x+140))>100))x=r.x+140;return aim(clamp(x,150,860),420);}
function hint(s){return 'Stay still while the robot is standing on you. Move behind-the-robot platforms ahead to bridge the next gap.';}
function render(c,s,view={}){bg(c,'#214b52','#102f39');label(c,`DELIVERY ${s.delivery} / 3`,`${s.lives} spare robots • You are the floor`);
  for(let i=0;i<8;i++){box(c,30+i*134,126+(i%2)*38,91,137,'#42646833',14);line(c,30+i*134,126,72+i*134,90,'#78918f33',3);}
  box(c,0,550,960,50,'#da7155',0);for(let i=0;i<25;i++){const x=i*42+Math.sin(s.elapsed+i)*8;circle(c,x,555+Math.sin(s.elapsed*2+i)*6,22,'#f5a967');}
  box(c,0,420,101,150,'#507879',8);box(c,873,420,87,150,'#507879',8);text(c,'START',49,463,12,'#ddf2d8','center');text(c,'CAKE',915,465,14,'#ddf2d8','center');
  s.players.forEach((p,i)=>{const width=172;box(c,p.x-width/2,p.y,width,24,COLORS[i],9);eye(c,p.x,p.y+8,.8);text(c,['FLOOR','RAMP','BELT'][p.form],p.x,p.y+47,12,COLORS[i],'center');if(p.form===2)for(let j=-55;j<70;j+=30)text(c,'›',p.x+j,p.y+11,26,'#233d44','center');if(p.form===1)line(c,p.x-72,p.y+2,p.x+72,p.y-9,COLORS[i],8);if(i===view.you)text(c,'YOU',p.x,p.y-19,13,'#fff4d0','center');});
  const r=s.robot;box(c,r.x-18,r.y-21,36,42,'#dfd7b8',8);eye(c,r.x,r.y-6,.75);circle(c,r.x-13,r.y+23,6,'#152e38');circle(c,r.x+13,r.y+23,6,'#152e38');box(c,r.x-13,r.y-35,26,14,'#faa7b8',4);line(c,r.x,r.y-35,r.x,r.y-43,'#fbecc6',3);circle(c,r.x,r.y-47,3,'#ffd78a');
}

return {meta,init,update,bot,hint,render};
})();
// games/yesterdays-crew.mjs
const M_games_yesterdays_crew_mjs = (() => {
const {base,clamp,dist,aim,note,burst,finish,COLORS} = M_lib_util_mjs;
const {bg,box,text,line,circle,eye,label,bar,actor} = M_lib_draw_mjs;
const meta={id:'yesterdays-crew',title:"Yesterday’s Crew",tag:'TIME-LOOP HEIST',players:1,color:'#86bfe6',description:'Record a past self holding a switch. Rewind. Cooperate with your own echoes to steal the jewel.',controls:'Click a destination or use WASD. Stand on switch A and record a loop. Your echo repeats the route and holds it. Do the same at B, then take the jewel and return to EXIT.',actions:['Take jewel','Record & rewind','Erase echoes'],tools:[],goal:'Steal the jewel and return to the exit.',ai:'The planner records switch-holding loops, waits for doors, then retrieves the jewel and returns.'};
const X=74,Y=113,Z=58,C=14,R=8;
const point=(x,y)=>({x:X+(x+.5)*Z,y:Y+(y+.5)*Z});
const spawn=point(1,6),padA=point(3,4),padB=point(9,6),jewel=point(12,4);
function cell(p){return {x:clamp(Math.floor((p.x-X)/Z),0,C-1),y:clamp(Math.floor((p.y-Y)/Z),0,R-1)};}
function wall(x,y,doors){return x<=0||x>=C-1||y<=0||y>=R-1||(x===6&&(y!==4||!doors[0]))||(x===11&&(y!==4||!doors[1]));}
function path(s,from,to){const a=cell(from),b=cell(to);const q=[a],seen=new Set([a.x+','+a.y]),prev=new Map();let found=null;while(q.length){const p=q.shift();if(p.x===b.x&&p.y===b.y){found=p;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n={x:p.x+dx,y:p.y+dy},k=n.x+','+n.y;if(wall(n.x,n.y,s.doors)||seen.has(k))continue;seen.add(k);prev.set(k,p);q.push(n);}}if(!found)return null;let p=found;while(prev.has(p.x+','+p.y)){const last=prev.get(p.x+','+p.y);if(last.x===a.x&&last.y===a.y)return point(p.x,p.y);p=last;}return to;}
function rewind(s,save){if(save&&s.track.length){s.echoes.push(s.track.map(p=>({...p})));s.echoes=s.echoes.slice(-4);note(s,`Echo ${s.echoes.length} recorded. It will hold its final position.`);}s.players[0].x=spawn.x;s.players[0].y=spawn.y;s.loop=0;s.track=[];s.sample=0;}
function init(seed){const s=base(seed,1,360,1);Object.assign(s,{echoes:[],track:[],loop:0,sample:0,doors:[false,false],hasJewel:false,alerts:0,guards:[{x:point(8,2).x,y:point(8,2).y}]});Object.assign(s.players[0],spawn);note(s,'First job: stand on switch A, then Record & rewind.');return s;}
function echoPositions(s){return s.echoes.map(track=>track[Math.min(track.length-1,Math.floor(s.loop*10))]).filter(Boolean);}
function update(s,inputs,dt){const input=inputs[0]||{},p=s.players[0];s.loop+=dt;const actors=[p,...echoPositions(s)];s.doors=[actors.some(a=>dist(a,padA)<24),actors.some(a=>dist(a,padB)<24)];
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
function bot(s){const p=s.players[0];if(!s.echoes.length)return aim(padA.x,padA.y,{b:dist(p,padA)<14});if(s.echoes.length===1)return aim(padB.x,padB.y,{b:dist(p,padB)<14});if(!s.hasJewel)return aim(jewel.x,jewel.y,{a:dist(p,jewel)<30});return aim(spawn.x,spawn.y);}
function hint(s){return !s.echoes.length?'Stand on A and record. Do not walk away before recording.':s.echoes.length===1?'Your first echo opens door A after retracing its route. Reach B and record again.':s.hasJewel?'Return to EXIT. Let your echoes keep both switches pressed.':'Wait for both echoes to reach their switches, then steal the jewel.';}
function render(c,s,view={}){bg(c,'#193e51','#132937');label(c,'THE 25-SECOND JOB',`${s.echoes.length} / 4 recorded echoes • ${Math.floor(s.loop)} seconds into this loop`);
 for(let y=0;y<R;y++)for(let x=0;x<C;x++){const d=x===6&&y===4?0:x===11&&y===4?1:-1;box(c,X+x*Z+2,Y+y*Z+2,Z-4,Z-4,wall(x,y,s.doors)?'#536879':'#254557',5);if(d>=0){box(c,X+x*Z+5,Y+y*Z+5,Z-10,Z-10,s.doors[d]?'#7ad9a755':'#e89477',5);text(c,d===0?'A':'B',X+(x+.5)*Z,Y+(y+.5)*Z,18,s.doors[d]?'#a6efd4':'#263948','center');}}
 for(const [pad,title] of [[padA,'A'],[padB,'B']]){circle(c,pad.x,pad.y,23,'#a88be855','#bba0f4');text(c,title,pad.x,pad.y,23,'#dccaff','center');}
 box(c,spawn.x-25,spawn.y-25,50,50,'#488d76',7);text(c,'EXIT',spawn.x,spawn.y,12,'#d8ffe0','center');
 if(!s.hasJewel){c.save();c.translate(jewel.x,jewel.y);c.rotate(Math.PI/4);box(c,-13,-13,26,26,'#e7cf73',2);c.restore();}
 s.echoes.forEach((track,i)=>{c.save();c.globalAlpha=.19;for(let j=0;j<track.length;j+=4)circle(c,track[j].x,track[j].y,3,COLORS[(i+1)%4]);c.restore();});
 echoPositions(s).forEach((p,i)=>{c.save();c.globalAlpha=.6;actor(c,p,(i+1)%4,-1,16);text(c,`E${i+1}`,p.x,p.y-27,11,'#decdff','center');c.restore();});
 s.guards.forEach(g=>{circle(c,g.x,g.y,30,'#ed7e8d22');box(c,g.x-12,g.y-13,24,26,'#ec8e98',5);text(c,'!',g.x,g.y,19,'#273843','center');});actor(c,s.players[0],0,view.you,17);bar(c,270,584,420,s.loop/25,'#99ccef',6);
}

return {meta,init,echoPositions,update,bot,hint,render};
})();
// lib/registry.mjs
const M_lib_registry_mjs = (() => {
const grab = M_games_grab_shift_mjs;
const misprint = M_games_misprint_mjs;
const haunt = M_games_haunt_for_hire_mjs;
const upstairs = M_games_upstairs_is_on_fire_mjs;
const floor = M_games_we_are_the_floor_mjs;
const parcels = M_games_do_not_open_mjs;
const echoes = M_games_yesterdays_crew_mjs;
const boat = M_games_sink_different_mjs;
const sumo = M_games_scrap_sumo_mjs;
const pets = M_games_pet_sitting_is_easy_mjs;
const {finish} = M_lib_util_mjs;
const games = [grab,misprint,haunt,upstairs,floor,parcels,echoes,boat,sumo,pets];
const byId = Object.fromEntries(games.map(g=>[g.meta.id,g]));
function step(game,s,inputs,bots,dt=.05) {
  if(s.status!=='playing')return;
  dt=Math.max(.001,Math.min(dt,.08));
  s.elapsed+=dt;s.time=Math.max(0,s.time-dt);
  for(const p of s.players)p.cooldown=Math.max(0,(p.cooldown||0)-dt);
  for(const fx of s.fx)fx.life-=dt;s.fx=s.fx.filter(f=>f.life>0);
  s.aiClocks ||= s.players.map(() => 0);
  s.aiInputs ||= s.players.map(() => ({}));
  const effective=s.players.map((_,i)=>{
    if(!bots[i]) return inputs[i]||{};
    s.aiClocks[i]-=dt;
    if(s.aiClocks[i]<=0){s.aiClocks[i]=.28;s.aiInputs[i]=game.bot(s,i);return s.aiInputs[i];}
    const prior=s.aiInputs[i];return {...prior,a:false,b:false,c:false};
  });
  game.update(s,effective,dt);
  if(s.time<=0&&s.status==='playing')finish(s,false,'Time is up. Replay to try a different approach.');
}

return {games,byId,step};
})();
// web/network.mjs
const M_web_network_mjs = (() => {
class NativeTransport {
  constructor(onPacket) {
    this.onPacket=onPacket;
    this.socket=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/ws`);
    this.ready=new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('The room server did not respond. Solo play still works.')),9000);
      this.socket.addEventListener('open',()=>{clearTimeout(timer);resolve();},{once:true});
      this.socket.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('Cannot connect to the room server.'));},{once:true});
    });
    this.socket.addEventListener('message',event=>{try{onPacket(JSON.parse(event.data));}catch{onPacket({type:'error',message:'An invalid room update was received.'});}});
    this.socket.addEventListener('close',()=>{if(!this.closing)onPacket({type:'closed',message:'Connection closed. Rejoin with the same invite to recover your seat.'});});
  }
  send(packet){if(this.socket.readyState===WebSocket.OPEN)this.socket.send(JSON.stringify(packet));}
  close(){this.closing=true;this.send({type:'leave'});this.socket.close();}
}

return {NativeTransport};
})();
const {games,byId,step} = M_lib_registry_mjs;
const {COLORS,clamp} = M_lib_util_mjs;
const {effects} = M_lib_draw_mjs;
const {NativeTransport} = M_web_network_mjs;
const app=document.getElementById('app');
const $=id=>document.getElementById(id);
const esc=value=>String(value).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const store={get(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}},set(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}};
let game=null,state=null,mode='preview',you=0,host=0,members=[],paused=true,botsEnabled=true,autopilot=false,connection=null,roomId='',token='',canvas=null,ctx=null,animation=0,previous=0,accumulator=0,lastUi=0,lastSend=0,lastSync=0,completed=false,remoteInputs=[],selectedTool=0,sound=false,audio=null;
let input={dx:0,dy:0,a:false,b:false,c:false,target:null,tool:0};
const keys=new Set();
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),4200);}
function beep(freq=330){if(!sound)return;try{audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.09);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.1);}catch{}}
function newSeed(){return crypto.getRandomValues(new Uint32Array(1))[0];}
function nav(){return `<nav><a class="brand" href="#"><span class="brandmark">+</span> THE PLAYTEST ARCADE</a><div class="nav-right"><span><i class="status-dot"></i>10 PLAYABLE EXPERIMENTS</span><span class="extra">DESKTOP + TOUCH</span></div></nav>`;}
function shutdown(){cancelAnimationFrame(animation);if(connection)connection.close();connection=null;game=null;keys.clear();roomId='';token='';}
function renderHub(){shutdown();const reviews=store.get('arcade-reviews',{});app.innerHTML=nav()+`<main class="container"><div class="hero"><div><div class="eyebrow">Haki’s prototype collection · build 01</div><h1>Ten ideas.<br>Find your <span>next obsession.</span></h1><p>Claws, ghosts, cursed parcels, and questionable boats. Play a quick round, bring a friend, or let the AI fill the empty seats.</p></div><aside class="hero-aside"><b>How to playtest</b>Try the same idea solo and with friends. Rate the interaction, not the art polish. Your ratings and notes stay on this device.</aside></div><div class="section-line"><span>THE LINEUP / 01—10</span><span>7 multiplayer games · 3 solo experiments</span></div><div class="cards">${games.map((g,i)=>`<article class="card"><a href="#game=${g.meta.id}" aria-label="Play ${esc(g.meta.title)}"><canvas id="preview-${i}" class="preview" width="480" height="300" aria-label="${esc(g.meta.title)} preview"></canvas></a><div class="card-body"><div class="card-index"><span>${String(i+1).padStart(2,'0')} / ${g.meta.tag}</span><span>${reviews[g.meta.id]?.rating?'★ '+reviews[g.meta.id].rating+'/5':''}</span></div><h2>${esc(g.meta.title)}</h2><p>${esc(g.meta.description)}</p><div class="card-footer"><span class="pill">${g.meta.players>1?'1–4 PLAYERS + AI':'SOLO + AI AUTOPILOT'}</span><a class="play" href="#game=${g.meta.id}">Play prototype <span>↗</span></a></div></div></article>`).join('')}</div><p class="footer-note">These are compact mechanical prototypes, not finished commercial games. Solo runs use your device; rooms use a shared host and state-based bots. No paid AI API, accounts, or tracking are required. Browser audio is optional.</p></main>`;
 games.forEach((g,i)=>{const c=$('preview-'+i).getContext('2d');c.scale(.5,.5);g.render(c,g.init(8121+i),{you:0});});
}
function buildGame(id){game=byId[id];if(!game){renderHub();return;}state=game.init(8121);you=0;host=0;mode='preview';paused=true;botsEnabled=true;autopilot=false;completed=false;selectedTool=0;input={dx:0,dy:0,a:false,b:false,c:false,target:null,tool:0};remoteInputs=[];
 const review=store.get('arcade-reviews',{})[id]||{};const incoming=new URLSearchParams(location.hash.slice(1)).get('room')||'';
 app.innerHTML=nav()+`<main class="game-container"><header class="game-header"><div><a class="back" href="#">← All prototypes</a><h1>${esc(game.meta.title)}</h1></div><div class="badges"><span class="pill">${game.meta.tag}</span><span class="pill">${game.meta.players>1?'1–4 PLAYERS':'1 PLAYER'}</span></div></header><div class="layout"><section class="stage-wrap"><div class="stage"><canvas id="game-canvas" width="960" height="600" tabindex="0" role="img" aria-label="${esc(game.meta.title)} interactive game. ${esc(game.meta.controls)}"></canvas><div id="overlay" class="overlay"><div class="overlay-panel"><div class="tag" id="overlay-tag">MECHANICAL PROTOTYPE</div><h2 id="overlay-title">${esc(game.meta.title)}</h2><p id="overlay-text">${esc(game.meta.goal)}</p><button id="overlay-action" class="primary">${incoming?'Join invited room':game.meta.players>1?'Play solo + AI':'Start solo'}</button></div></div></div><div class="score-strip"><div class="stat"><span>Progress</span><strong id="score">0 / ${state.goal}</strong></div><div class="stat"><span>Time left</span><strong id="timer">${Math.ceil(state.time)}s</strong></div><div class="stat"><span>Session</span><strong id="mode">Preview</strong></div></div><div class="tools" id="tools">${game.meta.tools.map((tool,i)=>`<button data-tool="${i}" class="${i===0?'active':''}">${esc(tool)}</button>`).join('')}</div><div class="control-panel"><div class="dpad" aria-label="Movement controls"><button data-dir="up" aria-label="Move up">↑</button><button data-dir="left" aria-label="Move left">←</button><button data-dir="down" aria-label="Move down">↓</button><button data-dir="right" aria-label="Move right">→</button></div><div class="action-buttons">${game.meta.actions.map((name,i)=>`<button data-action="${'abc'[i]}" class="${i===0?'primary':''}"><span class="key">${['SPACE','E','Q'][i]}</span>${esc(name)}</button>`).join('')}</div></div><p class="help">${esc(game.meta.controls)}</p><div id="hint" class="hint"></div><p id="event-log" class="event-log" aria-live="polite"></p></section><aside class="sidebar"><h3>Your session</h3><p id="connection-label">${incoming?'An invite is ready. Choose your name and join.':'Start immediately with AI, or create a room to invite friends.'}</p><label for="player-name" class="field">DISPLAY NAME</label><input id="player-name" maxlength="18" value="${esc(store.get('arcade-name','Haki'))}" autocomplete="nickname"><div class="mode-buttons"><button id="solo" class="primary">${game.meta.players>1?'Play solo + AI':'Start solo'}</button>${game.meta.players>1?'<button id="create" class="secondary">Create friend room</button>':''}</div>${game.meta.players>1?`<label for="join-code" class="field">ROOM CODE OR INVITE URL</label><div class="join-row"><input id="join-code" placeholder="Paste invite" value="${esc(incoming)}"><button id="join">Join</button></div><div id="invite-row" class="mode-buttons hidden"><button id="copy-invite">Copy invite link</button><p class="small">Friends take over an AI seat when they join.</p></div>`:''}<div id="members" class="members"></div><div class="session-controls"><button id="pause">Pause</button><button id="restart">Restart</button><button id="bots">${game.meta.players>1?'AI crew: ON':'AI autopilot: OFF'}</button><button id="audio">Sound: OFF</button></div><p class="read-only hidden" id="guest-note">The host controls restart, pause, and AI seats.</p><div class="divider"></div><h3>How the AI works</h3><p class="small">${esc(game.meta.ai)} No AI API calls are made.</p><div class="divider"></div><section class="review"><h3>Would you play again?</h3><div class="ratings">${[1,2,3,4,5].map(n=>`<button data-rating="${n}" aria-label="Rate ${n} out of 5" class="${review.rating===n?'active':''}">${n}</button>`).join('')}</div><label for="review-notes" class="field">YOUR PLAYTEST NOTES</label><textarea id="review-notes" placeholder="What felt fun? What felt confusing?">${esc(review.notes||'')}</textarea><p class="small">Saved on this device only.</p></section></aside></div></main>`;
 canvas=$('game-canvas');ctx=canvas.getContext('2d');
 $('solo').onclick=startSolo;if($('create'))$('create').onclick=()=>network('create');if($('join'))$('join').onclick=()=>network('join');
 $('overlay-action').onclick=()=>{if(mode==='preview'){incoming?network('join'):startSolo();}else if(state.status!=='playing')control('restart');else control('pause');};
 $('pause').onclick=()=>control('pause');$('restart').onclick=()=>control('restart');$('bots').onclick=()=>control('bots');$('audio').onclick=()=>{sound=!sound;$('audio').textContent='Sound: '+(sound?'ON':'OFF');beep();};if($('copy-invite'))$('copy-invite').onclick=copyInvite;
 document.querySelectorAll('[data-action]').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();press(b.dataset.action);}));
 document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(Number(b.dataset.tool)));
 document.querySelectorAll('[data-dir]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.dir);movement();});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>{keys.delete(b.dataset.dir);movement();});});
 let dragging=false;
 function point(e){const r=canvas.getBoundingClientRect();input.target={x:clamp((e.clientX-r.left)/r.width*960,0,960),y:clamp((e.clientY-r.top)/r.height*600,0,600)};}
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);dragging=true;point(e);if(game.meta.tapAction)press('a');});canvas.addEventListener('pointermove',e=>{if(dragging){e.preventDefault();point(e);}});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
 document.querySelectorAll('[data-rating]').forEach(b=>b.onclick=()=>{const data=store.get('arcade-reviews',{});data[id]={...(data[id]||{}),rating:Number(b.dataset.rating)};store.set('arcade-reviews',data);document.querySelectorAll('[data-rating]').forEach(x=>x.classList.toggle('active',x===b));toast('Rating saved on this device.');});
 $('review-notes').oninput=()=>{const data=store.get('arcade-reviews',{});data[id]={...(data[id]||{}),notes:$('review-notes').value.slice(0,3000)};store.set('arcade-reviews',data);};
 previous=performance.now();accumulator=0;lastUi=0;cancelAnimationFrame(animation);animation=requestAnimationFrame(loop);updateUi();
}
function movement(){input.dx=(keys.has('right')?1:0)-(keys.has('left')?1:0);input.dy=(keys.has('down')?1:0)-(keys.has('up')?1:0);if(input.dx||input.dy)input.target=null;}
function press(action){if(!game)return;if(mode==='preview'){toast('Start a solo run or create a room first.');return;}input[action]=true;beep(action==='a'?440:330);}
function setTool(index){selectedTool=index;input.tool=index;document.querySelectorAll('[data-tool]').forEach(b=>b.classList.toggle('active',Number(b.dataset.tool)===index));}
function clearActions(){input.a=false;input.b=false;input.c=false;}
function localMembers(){return state.players.map((_,i)=>({seat:i,name:i===0?'You':['Pip','Mica','Moss','Bram'][i],kind:i===0?(autopilot?'bot':'human'):botsEnabled?'bot':'empty'}));}
function startSolo(){if(connection)connection.close();connection=null;roomId='';token='';you=0;host=0;state=game.init(newSeed());mode='local';paused=false;completed=false;autopilot=false;botsEnabled=true;members=localMembers();input.target=null;clearActions();if($('invite-row'))$('invite-row').classList.add('hidden');$('connection-label').textContent='Local run. No network connection needed.';history.replaceState(null,'',`#game=${game.meta.id}`);beep(560);updateUi();}
function control(action){if(mode==='preview'){startSolo();return;}if(mode==='online'&&you!==host){toast('Only the host can change the session.');return;}if(mode==='online'){connection.send({type:'control',action});return;}if(mode==='hosted'&&you!==host)return;
 if(action==='pause')paused=!paused;if(action==='restart'){state=game.init(newSeed());paused=false;completed=false;input.target=null;clearActions();remoteInputs=[];}
 if(action==='bots'){if(game.meta.players===1)autopilot=!autopilot;else botsEnabled=!botsEnabled;}
 if(mode==='local')members=localMembers();if(mode==='hosted')syncFrame();updateUi();}
async function network(type){if(window.ARCADE_OFFLINE){toast('Online rooms require the hosted arcade or included Node server. Local solo and AI work here.');return;}if(!game)return;const name=$('player-name').value.trim().slice(0,18)||'Player';store.set('arcade-name',name);let code=($('join-code')?.value||'').trim();if(type==='join'){try{const u=new URL(code);code=new URLSearchParams(u.hash.slice(1)).get('room')||u.searchParams.get('room')||code;}catch{}if(!code){toast('Paste the room code or invite link first.');return;}}
 if(connection)connection.close();mode='connecting';paused=true;$('connection-label').textContent='Connecting to the room server…';
 try{const Factory=window.createArcadeTransport||((cb)=>new NativeTransport(cb));connection=Factory(packet);await connection.ready;const saved=store.get('arcade-seat-'+code,null);connection.send({type,game:game.meta.id,name,room:code,token:saved?.token});}catch(e){mode='preview';$('connection-label').textContent=e.message;toast(e.message);updateUi();}
}
function packet(p){
 if(p.type==='error'){toast(p.message);if(mode==='connecting')mode='preview';if($('connection-label'))$('connection-label').textContent=p.message;updateUi();return;}
 if(p.type==='closed'){paused=true;if($('connection-label'))$('connection-label').textContent=p.message;toast(p.message);return;}
 if(p.type==='joined'){
  if(p.game!==game.meta.id){buildGame(p.game);}
  roomId=p.room;token=p.token;you=p.seat;host=p.host;mode=p.clientHosted&&you===host?'hosted':'online';members=p.members;paused=p.paused;botsEnabled=p.bots;state=p.state||game.init(p.seed||8121);completed=false;store.set('arcade-seat-'+roomId,{token,seat:you});history.replaceState(null,'',`#game=${game.meta.id}&room=${roomId}`);if($('invite-row'))$('invite-row').classList.remove('hidden');$('connection-label').textContent=`Room ${roomId.slice(0,12)} · ${you===host?'you are hosting':'connected'}`;if(mode==='hosted')syncFrame();updateUi();return;
 }
 if(p.type==='input'&&mode==='hosted'){const prior=remoteInputs[p.seat]||{};remoteInputs[p.seat]={...p.input,a:p.input.a||prior.a,b:p.input.b||prior.b,c:p.input.c||prior.c};return;}
 if(p.type==='state'||p.type==='members'){
  if(p.members)members=p.members;if(p.host!=null)host=p.host;if(p.bots!=null)botsEnabled=p.bots;
  if(p.type==='state'&&mode!=='hosted'){state=p.state||state;paused=p.paused;}
  if(p.promote&&you===host){mode='hosted';toast('You are now hosting this room.');}
  updateUi();
 }
}
function syncFrame(){if(connection&&mode==='hosted')connection.send({type:'sync',state,paused,bots:botsEnabled});}
async function copyInvite(){const url=location.href.split('#')[0]+`#game=${game.meta.id}&room=${roomId}`;try{await navigator.clipboard.writeText(url);toast('Invite copied. Friends can join this run.');}catch{if(navigator.share){try{await navigator.share({title:game.meta.title,url});}catch{}}else{const field=$('join-code');field.value=url;field.focus();field.select();toast('Invite selected. Copy it to send to a friend.');}}}
function loop(now){if(!game)return;const delta=Math.min(.1,(now-previous)/1000);previous=now;
 if(mode==='local'||mode==='hosted'){
  accumulator+=delta;
  while(accumulator>=.05){accumulator-=.05;if(!paused){const inputs=state.players.map((_,i)=>i===you?{...input}:remoteInputs[i]||{});const bots=state.players.map((_,i)=>game.meta.players===1?autopilot:mode==='local'?i!==0&&botsEnabled:!members.some(m=>m.seat===i&&m.kind==='human')&&botsEnabled);step(game,state,inputs,bots,.05);clearActions();remoteInputs=remoteInputs.map(x=>({...x,a:false,b:false,c:false}));}}
  if(mode==='hosted'&&now-lastSync>260){lastSync=now;syncFrame();}
 }else if(mode==='online'&&connection&&now-lastSend>70){lastSend=now;connection.send({type:'input',input:{...input}});clearActions();}
 try{game.render(ctx,state,{you,members});effects(ctx,state);}catch(e){console.error(e);paused=true;toast('Rendering stopped: '+e.message);}
 if(input.target&&mode!=='preview'&&game.meta.players>1){ctx.save();ctx.strokeStyle=COLORS[you]+'99';ctx.lineWidth=2;ctx.beginPath();ctx.arc(input.target.x,input.target.y,9,0,Math.PI*2);ctx.stroke();ctx.restore();}
 if(now-lastUi>150){lastUi=now;updateUi();}animation=requestAnimationFrame(loop);
}
function updateUi(){if(!state||!$('score'))return;const score=game.meta.id==='scrap-sumo'?(state.players[you]?.wins||0):state.score;$('score').textContent=`${score} / ${state.goal}`;$('timer').textContent=`${Math.floor(state.time/60)}:${String(Math.ceil(state.time%60)).padStart(2,'0')}`;$('mode').textContent=mode==='local'?(autopilot?'AI demo':'Solo'):mode==='preview'?'Preview':mode==='connecting'?'Connecting':'Online';
 $('hint').textContent=game.hint?.(state)||game.meta.goal;$('event-log').textContent=state.message;$('pause').textContent=paused?'Resume':'Pause';$('bots').textContent=game.meta.players===1?`AI autopilot: ${autopilot?'ON':'OFF'}`:`AI crew: ${botsEnabled?'ON':'OFF'}`;
 const isGuest=mode==='online'&&you!==host;for(const id of ['pause','restart','bots'])$(id).disabled=isGuest;$('guest-note').classList.toggle('hidden',!isGuest);
 if(mode==='local')members=localMembers();$('members').innerHTML=members.map(m=>`<span class="member" style="border-color:${COLORS[m.seat]}66">${esc(m.name)}${m.seat===you?' · YOU':''}${m.kind==='bot'?' · AI':m.kind==='empty'?' · EMPTY':''}</span>`).join('');
 const overlay=$('overlay');const result=state.status!=='playing';overlay.classList.toggle('hidden',mode!=='preview'&&mode!=='connecting'&&!paused&&!result);
 if(mode==='preview'){$('overlay-tag').textContent='MECHANICAL PROTOTYPE';$('overlay-title').textContent=game.meta.title;$('overlay-text').textContent=game.meta.goal;$('overlay-action').textContent=new URLSearchParams(location.hash.slice(1)).get('room')?'Join invited room':game.meta.players>1?'Play solo + AI':'Start solo';$('overlay-action').disabled=false;}
 else if(result){$('overlay-tag').textContent='PLAYTEST COMPLETE';$('overlay-title').textContent=game.meta.id==='scrap-sumo'?state.winner===you?'Scrap champion!':'The tournament is over':state.status==='won'?'Job beautifully done.':'Try a different approach.';$('overlay-text').textContent=state.message;$('overlay-action').textContent=isGuest?'Waiting for host':'Play again';$('overlay-action').disabled=isGuest;if(!completed){completed=true;const data=store.get('arcade-results',{});data[game.meta.id]={plays:(data[game.meta.id]?.plays||0)+1,best:Math.max(data[game.meta.id]?.best||0,score)};store.set('arcade-results',data);beep(state.status==='won'?620:220);}}
 else if(mode==='connecting'){$('overlay-tag').textContent='CONNECTING';$('overlay-title').textContent='Opening your room…';$('overlay-text').textContent='The host keeps the session in sync.';$('overlay-action').disabled=true;}
 else if(paused){$('overlay-tag').textContent=roomId?'FRIEND ROOM':'PAUSED';$('overlay-title').textContent=roomId&&state.elapsed<1?'Your crew is ready.':'Take a breather.';$('overlay-text').textContent=isGuest?'The host can start the round.':roomId?'Copy the invite for friends, or start with AI filling the empty seats.':'Your run will continue where you left off.';$('overlay-action').textContent=isGuest?'Waiting for host':state.elapsed<1?'Start the round':'Resume';$('overlay-action').disabled=isGuest;}
}
const directions={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
window.addEventListener('keydown',e=>{if(!game||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;if(directions[e.code]){e.preventDefault();keys.add(directions[e.code]);movement();}if(!e.repeat){if(e.code==='Space'){e.preventDefault();press('a');}if(e.code==='KeyE')press('b');if(e.code==='KeyQ')press('c');if(e.code==='Escape')control('pause');if(/^Digit[1-6]$/.test(e.code)){const n=Number(e.code.slice(-1))-1;if(n<game.meta.tools.length)setTool(n);}}});
window.addEventListener('keyup',e=>{if(directions[e.code]){keys.delete(directions[e.code]);movement();}});
window.addEventListener('blur',()=>{keys.clear();if(game)movement();});
window.addEventListener('beforeunload',()=>connection?.close());
function route(){shutdown();const hash=new URLSearchParams(location.hash.slice(1));const fromPath=location.pathname.match(/\/play\/([a-z-]+)/)?.[1];const id=hash.get('game')||fromPath||(location.hash===''?window.ARCADE_DEFAULT_GAME:null);if(id&&byId[id])buildGame(id);else renderHub();}
window.addEventListener('hashchange',route);
Object.defineProperty(window,'__arcade',{value:{snapshot:()=>({game:game?.meta.id,mode,you,host,paused,roomId,members:structuredClone(members),state:state?structuredClone(state):null})}});
route();

})();