import {readdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
for(const dir of ['lib','games','web','tests']) {
  for(const file of readdirSync(dir)) {
    if(file.endsWith('.mjs'))execFileSync(process.execPath,['--check',`${dir}/${file}`]);
  }
}
execFileSync(process.execPath,['--check','server.mjs']);
console.log('JavaScript syntax checks passed.');
