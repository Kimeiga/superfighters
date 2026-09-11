export class NativeTransport {
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
