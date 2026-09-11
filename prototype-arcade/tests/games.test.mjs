import test from 'node:test';
import assert from 'node:assert/strict';
import {games,step} from '../lib/registry.mjs';
import {evaluate} from '../games/misprint.mjs';

function finiteTree(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), 'State contains a non-finite number');
  else if (Array.isArray(value)) value.forEach(finiteTree);
  else if (value && typeof value === 'object') Object.values(value).forEach(finiteTree);
}
for (const game of games) {
  test(`${game.meta.title}: deterministic initial state`, () => {
    assert.deepEqual(game.init(2819), game.init(2819));
    assert.equal(typeof game.bot,'function');
    assert.equal(typeof game.render,'function');
  });
  test(`${game.meta.title}: AI runs finish without invalid state`, () => {
    for (const seed of [1,42,2819]) {
      const state=game.init(seed);
      for(let i=0; i<14000 && state.status==='playing';i++) {
        step(game,state,[],state.players.map(()=>true),.05);
        if(i%200===0) finiteTree(state);
      }
      finiteTree(state);
      assert.notEqual(state.status,'playing');
      assert.ok(state.elapsed>0);
    }
  });
  test(`${game.meta.title}: completed runs stop advancing`, () => {
    const state=game.init(123);state.status='won';
    const before=structuredClone(state);
    step(game,state,[],state.players.map(()=>true),.05);
    assert.deepEqual(state,before);
  });
}
test('Misprint: installed stamps calculate actual left-to-right combinations',()=>{
  assert.equal(evaluate([0,2,2,-1,-1]).total,21);
});
