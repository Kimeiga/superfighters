from pathlib import Path
import re,json
ROOT=Path(__file__).resolve().parents[1]
files=['lib/util.mjs','lib/draw.mjs']+[str(p.relative_to(ROOT)) for p in sorted((ROOT/'games').glob('*.mjs'))]+['lib/registry.mjs','web/network.mjs']
names={f:'M_'+re.sub('[^a-zA-Z0-9]','_',f) for f in files}
def transform(f):
 text=(ROOT/f).read_text(); exports=re.findall(r'export\s+(?:const|function|class)\s+(\w+)',text)
 def imp(m):
  spec,rel=m.group(1),m.group(2);resolved=str(((ROOT/f).parent/rel).resolve().relative_to(ROOT));target=names[resolved]
  if spec.startswith('* as '): return 'const '+spec[5:].strip()+' = '+target+';'
  return 'const '+spec+' = '+target+';'
 text=re.sub(r"import\s+(.+?)\s+from\s+['\"](.+?)['\"];",imp,text)
 text=re.sub(r'\bexport\s+(?=const|function|class)','',text)
 return text,exports
parts=[]
for f in files:
 code,exports=transform(f);parts.append(f'// {f}\nconst {names[f]} = (() => {{\n{code}\nreturn {{'+','.join(exports)+'};\n})();\n')
main,_=transform('web/main.mjs')
script='(() => {\n'+''.join(parts)+main+'\n})();'
(ROOT/'web/arcade.bundle.js').write_text(script)
css=(ROOT/'web/styles.css').read_text()
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Playtest Arcade</title><style>'+css+'</style></head><body><div id="app"></div><div id="toast" role="status" aria-live="polite"></div><script>window.ARCADE_OFFLINE=true;'+script.replace('</script','<\\/script')+'</script></body></html>'
(ROOT/'arcade-offline.html').write_text(html)
print(json.dumps({'bundle_bytes':len(script),'offline_bytes':len(html)},indent=2))
