import {base,clamp,dist,move,aim,note,burst,finish,COLORS} from '../lib/util.mjs';
import {bg,box,text,line,circle,eye,label,bar} from '../lib/draw.mjs';
export const meta={id:'we-are-the-floor',title:'We Are the Floor',tag:'CO-OP PLATFORM RESCUE',players:4,color:'#83d9b8',description:'You are the platforms, not the platformer. Guide a delivery robot over a very hot floor.',controls:'Move your platform under the robot. Leapfrog ahead once it passes. Boost jumps when the robot is on you; Rescue pulls a nearby falling robot back up.',actions:['Change shape','Boost robot','Rescue robot'],tools:[],goal:'Deliver three cakes before losing four robots.',ai:'Platforms move ahead of the robot, support gaps, and rescue it when it falls.'};
function resetRobot(s){s.robot={x:58,y:363,vx:52,vy:0,on:-1};s.players.forEach((p,i)=>{p.x=190+i*186;p.y=420;p.form=0;p.rescue=0;});}
export function init(seed){const s=base(seed,4,210,3);s.lives=4;s.delivery=1;resetRobot(s);note(s,'Keep the robot above the lava. Move passed platforms ahead of it.');return s;}
export function update(s,inputs,dt){
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
export function bot(s,i){const p=s.players[i],r=s.robot;if(r.on===i)return{};if(r.y>455&&Math.abs(p.x-r.x)<180)return aim(r.x,420,{c:true});let x=p.x;if(p.x<r.x-105)x=Math.min(860,Math.max(...s.players.map(q=>q.x))+175);if(p.x>r.x+450&&s.players.every(q=>q===p||Math.abs(q.x-(r.x+140))>100))x=r.x+140;return aim(clamp(x,150,860),420);}
export function hint(s){return 'Stay still while the robot is standing on you. Move behind-the-robot platforms ahead to bridge the next gap.';}
export function render(c,s,view={}){bg(c,'#214b52','#102f39');label(c,`DELIVERY ${s.delivery} / 3`,`${s.lives} spare robots • You are the floor`);
  for(let i=0;i<8;i++){box(c,30+i*134,126+(i%2)*38,91,137,'#42646833',14);line(c,30+i*134,126,72+i*134,90,'#78918f33',3);}
  box(c,0,550,960,50,'#da7155',0);for(let i=0;i<25;i++){const x=i*42+Math.sin(s.elapsed+i)*8;circle(c,x,555+Math.sin(s.elapsed*2+i)*6,22,'#f5a967');}
  box(c,0,420,101,150,'#507879',8);box(c,873,420,87,150,'#507879',8);text(c,'START',49,463,12,'#ddf2d8','center');text(c,'CAKE',915,465,14,'#ddf2d8','center');
  s.players.forEach((p,i)=>{const width=172;box(c,p.x-width/2,p.y,width,24,COLORS[i],9);eye(c,p.x,p.y+8,.8);text(c,['FLOOR','RAMP','BELT'][p.form],p.x,p.y+47,12,COLORS[i],'center');if(p.form===2)for(let j=-55;j<70;j+=30)text(c,'›',p.x+j,p.y+11,26,'#233d44','center');if(p.form===1)line(c,p.x-72,p.y+2,p.x+72,p.y-9,COLORS[i],8);if(i===view.you)text(c,'YOU',p.x,p.y-19,13,'#fff4d0','center');});
  const r=s.robot;box(c,r.x-18,r.y-21,36,42,'#dfd7b8',8);eye(c,r.x,r.y-6,.75);circle(c,r.x-13,r.y+23,6,'#152e38');circle(c,r.x+13,r.y+23,6,'#152e38');box(c,r.x-13,r.y-35,26,14,'#faa7b8',4);line(c,r.x,r.y-35,r.x,r.y-43,'#fbecc6',3);circle(c,r.x,r.y-47,3,'#ffd78a');
}
