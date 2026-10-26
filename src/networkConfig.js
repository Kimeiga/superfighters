export const NAMESPACE = 'superfighters-v1';
// Relayed owners use separate streams: p1 must never coalesce p2's latest input.
export const LATEST = {'player-input':1,'input-p1':2,'input-p2':3,'player-snapshot':4,'snapshot-p1':5,'snapshot-p2':6,'host-snapshot':7};
