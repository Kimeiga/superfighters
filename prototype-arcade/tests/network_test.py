import asyncio,json
from pathlib import Path
import websockets

async def take(ws,kind,predicate=lambda p:True):
    async def receive():
        for _ in range(100):
            packet=json.loads(await ws.recv())
            if packet.get('type')==kind and predicate(packet):return packet
        raise AssertionError('Packet not found')
    return await asyncio.wait_for(receive(),5)
async def send(ws,**data):await ws.send(json.dumps(data))
async def run():
    report=[]
    async with websockets.connect('ws://127.0.0.1:3000/ws') as a, websockets.connect('ws://127.0.0.1:3000/ws') as b:
        await send(a,type='create',game='grab-shift',name='Host')
        one=await take(a,'joined');room=one['room'];assert one['seat']==0 and one['paused'];report.append('create room paused with AI seats')
        await send(b,type='join',room=room,name='Guest');two=await take(b,'joined');assert two['seat']==1;report.append('join second independent websocket client')
        await take(a,'state',lambda p:len([m for m in p['members'] if m['kind']=='human'])==2)
        await send(b,type='control',action='restart');err=await take(b,'error');assert 'host' in err['message'];report.append('guest cannot restart room')
        await send(a,type='control',action='pause');frame=await take(b,'state',lambda p:not p['paused']);old=frame['state']['players'][1]['x']
        await send(b,type='input',input={'target':{'x':840,'y':280}})
        await take(a,'state',lambda p:abs(p['state']['players'][1]['x']-old)>20);report.append('guest movement visible to host')
        async with websockets.connect('ws://127.0.0.1:3000/ws') as c,websockets.connect('ws://127.0.0.1:3000/ws') as d,websockets.connect('ws://127.0.0.1:3000/ws') as e:
            for i,w in enumerate([c,d],2):await send(w,type='join',room=room,name=f'Player{i}');assert (await take(w,'joined'))['seat']==i
            await send(e,type='join',room=room,name='Overflow');assert 'full' in (await take(e,'error'))['message'];report.append('four seats enforced')
        await b.close();await take(a,'state',lambda p:p['members'][1]['kind']=='bot');report.append('disconnected guest replaced by AI')
        async with websockets.connect('ws://127.0.0.1:3000/ws') as recovered:
            await send(recovered,type='join',room=room,name='Guest',token=two['token']);assert (await take(recovered,'joined'))['seat']==1;report.append('seat recovery using session token')
            await a.close();await take(recovered,'state',lambda p:p['host']==1);report.append('host handover on disconnect')
    async with websockets.connect('ws://127.0.0.1:3000/ws') as bad:
        await send(bad,type='join',room='NOPE');assert 'not found' in (await take(bad,'error'))['message'];report.append('invalid room rejected')
    Path('playwright-results/network-results.json').write_text(json.dumps({'transport':'native WebSocket server','passed':report},indent=2))
    print(json.dumps(report,indent=2))
asyncio.run(run())
