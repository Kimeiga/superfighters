export const W = 960;
export const H = 600;
export const COLORS = ['#ffbd59', '#5ce0bf', '#9fafff', '#ff87ac'];
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const nearest = (p, list, accept = () => true) => list.filter(accept).sort((a, b) => dist(p, a) - dist(p, b))[0];
export function rand(s) {
  s.rng = ((s.rng >>> 0) * 1664525 + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export const pick = (s, arr) => arr[Math.floor(rand(s) * arr.length)];
export function base(seed, count = 4, seconds = 150, goal = 100) {
  return {rng: seed >>> 0, time: seconds, elapsed: 0, score: 0, goal, status: 'playing', message: 'Ready for your first run.', events: [], fx: [], players: Array.from({length: count}, (_, i) => ({x: 170 + i * 200, y: 320, cooldown: 0, tool: 0}))};
}
export function note(s, text) {
  s.message = text;
  s.events.unshift({text, at: s.elapsed});
  s.events = s.events.slice(0, 4);
}
export function burst(s, x, y, text, color = '#ffda8a') {
  s.fx.push({x, y, text, color, life: 1.3});
  s.fx = s.fx.slice(-24);
}
export function finish(s, won, message) {
  s.status = won ? 'won' : 'lost';
  note(s, message);
}
export function move(p, input = {}, dt, speed = 230, bounds = [40, 100, 920, 545]) {
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
export const idle = () => ({dx: 0, dy: 0, a: false, b: false, c: false});
export const aim = (x, y, extras = {}) => ({target: {x, y}, ...extras});
export function cellAt(input, x, y, size, cols, rows) {
  const p = input.target; if (!p) return -1;
  const col = Math.floor((p.x - x) / size), row = Math.floor((p.y - y) / size);
  return col >= 0 && col < cols && row >= 0 && row < rows ? row * cols + col : -1;
}
export const center = (index, x, y, size, cols) => ({x: x + (index % cols + .5) * size, y: y + (Math.floor(index / cols) + .5) * size});
