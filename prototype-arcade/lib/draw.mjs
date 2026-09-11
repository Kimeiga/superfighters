import {W, H, COLORS, clamp} from './util.mjs';
export function box(c, x, y, w, h, color, radius = 12, stroke) {
  c.beginPath(); c.roundRect(x, y, Math.max(0, w), Math.max(0, h), radius); c.fillStyle = color; c.fill();
  if (stroke) {c.strokeStyle = stroke; c.lineWidth = 2; c.stroke();}
}
export function line(c, x, y, xx, yy, color, width = 3) {
  c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.stroke();
}
export function circle(c, x, y, r, color, stroke) {
  c.beginPath(); c.arc(x, y, Math.max(0,r), 0, Math.PI * 2); c.fillStyle = color; c.fill();
  if (stroke) {c.strokeStyle = stroke; c.lineWidth = 2; c.stroke();}
}
export function text(c, str, x, y, size = 20, color = '#e7eee9', align = 'left', weight = 700) {
  c.font = `${weight} ${size}px ui-rounded, system-ui, sans-serif`; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(str), x, y);
}
export function bg(c, top = '#152c33', bottom = '#0f2026') {
  const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H);
}
export function grid(c, x, y, cols, rows, size, fill = '#263e46') {
  for (let i = 0; i < cols * rows; i++) box(c, x + i % cols * size + 3, y + Math.floor(i / cols) * size + 3, size - 6, size - 6, fill, 9);
}
export function eye(c, x, y, scale = 1, mood = 'happy') {
  for (const k of [-1, 1]) {circle(c, x + k * 7 * scale, y, 4 * scale, '#142a30'); circle(c, x + k * 7 * scale + 1, y - scale, 1.2 * scale, '#ffffff');}
  if (mood === 'worried') circle(c, x, y + 12 * scale, 3.5 * scale, '#142a30');
  else {c.beginPath(); c.arc(x, y + 7 * scale, 6 * scale, .2, Math.PI - .2); c.strokeStyle = '#142a30'; c.lineWidth = 2 * scale; c.stroke();}
}
export function actor(c, p, index, you, size = 17) {
  circle(c, p.x + 3, p.y + 8, size + 3, '#09182055'); circle(c, p.x, p.y, size, COLORS[index % 4], index === you ? '#fff4d4' : undefined); eye(c, p.x, p.y - 3, .65);
  if (index === you) text(c, 'YOU', p.x, p.y - size - 14, 12, '#fff4d4', 'center');
}
export function bar(c, x, y, w, ratio, color = '#5ce0bf', h = 8) {
  box(c, x, y, w, h, '#081e2877', h / 2); if (ratio > 0) box(c, x, y, Math.max(h, w * clamp(ratio, 0, 1)), h, color, h / 2);
}
export function label(c, title, subtitle) {
  text(c, title, 32, 35, 23, '#f8ebcf'); if (subtitle) text(c, subtitle, 32, 65, 15, '#b5c8c8', 'left', 500);
}
export function effects(c, s) {
  for (const p of s.fx) {c.save(); c.globalAlpha = clamp(p.life, 0, 1); text(c, p.text, p.x, p.y - (1.3 - p.life) * 30, 22, p.color, 'center'); c.restore();}
}
export function gear(c, x, y, r, color) {
  c.save(); c.translate(x, y); for(let i = 0; i < 8; i++) {c.rotate(Math.PI / 4); box(c, -4, -r - 3, 8, 11, color, 2);} circle(c, 0, 0, r, color); circle(c, 0, 0, r * .4, '#223c43'); c.restore();
}
