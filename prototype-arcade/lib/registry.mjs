import * as grab from '../games/grab-shift.mjs';
import * as misprint from '../games/misprint.mjs';
import * as haunt from '../games/haunt-for-hire.mjs';
import * as upstairs from '../games/upstairs-is-on-fire.mjs';
import * as floor from '../games/we-are-the-floor.mjs';
import * as parcels from '../games/do-not-open.mjs';
import * as echoes from '../games/yesterdays-crew.mjs';
import * as boat from '../games/sink-different.mjs';
import * as sumo from '../games/scrap-sumo.mjs';
import * as pets from '../games/pet-sitting-is-easy.mjs';
import {finish} from './util.mjs';
export const games = [grab,misprint,haunt,upstairs,floor,parcels,echoes,boat,sumo,pets];
export const byId = Object.fromEntries(games.map(g=>[g.meta.id,g]));
export function step(game,s,inputs,bots,dt=.05) {
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
