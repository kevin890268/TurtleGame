// 程式畫的手繪小圖：小魚、龜龜頭上的對話泡泡。之後可以換成 ChatGPT 畫的圖。

// 小魚（側面、頭朝右）：身體漸層、鱗片、側線、鰓、背鰭、尾鰭的鰭條、眼睛亮點
export function drawFish(w = 128, h = 64) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.scale(w / 128, h / 64);
  g.lineJoin = g.lineCap = 'round';
  const ink = '#3d3a2c';

  const body = new Path2D();
  body.moveTo(26, 32);
  body.bezierCurveTo(40, 14, 80, 10, 106, 27);
  body.quadraticCurveTo(116, 33, 106, 39);
  body.bezierCurveTo(80, 53, 42, 50, 26, 32);

  // 尾鰭（先畫，身體蓋在上面）
  g.fillStyle = '#8fa56c';
  g.strokeStyle = ink;
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(30, 32);
  g.lineTo(7, 14);
  g.quadraticCurveTo(15, 32, 7, 50);
  g.closePath();
  g.fill();
  g.stroke();
  g.lineWidth = 1;
  g.strokeStyle = 'rgba(61,58,44,.55)';
  for (const [x, y] of [[12, 20], [11, 27], [11, 37], [12, 44]]) {
    g.beginPath(); g.moveTo(27, 32); g.lineTo(x, y); g.stroke();
  }
  // 背鰭、腹鰭
  g.fillStyle = '#8fa56c';
  g.strokeStyle = ink;
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(52, 17); g.quadraticCurveTo(64, 2, 82, 14); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(62, 46); g.quadraticCurveTo(66, 58, 76, 47); g.closePath(); g.fill(); g.stroke();

  // 身體：背部橄欖綠、肚子米白
  const grad = g.createLinearGradient(0, 12, 0, 50);
  grad.addColorStop(0, '#6c8757');
  grad.addColorStop(0.5, '#b7c197');
  grad.addColorStop(1, '#ece6c9');
  g.fillStyle = grad;
  g.fill(body);
  // 鱗片：一排排小弧線（只畫在身體裡）
  g.save();
  g.clip(body);
  g.strokeStyle = 'rgba(55,60,35,.32)';
  g.lineWidth = 1;
  for (let row = 0; row < 5; row++) {
    const y = 20 + row * 6;
    for (let x = 40 + (row % 2) * 3.5; x < 92; x += 7) {
      g.beginPath(); g.arc(x, y, 3.6, -Math.PI * 0.35, Math.PI * 0.35); g.stroke();
    }
  }
  // 側線
  g.setLineDash([3, 3]);
  g.strokeStyle = 'rgba(55,60,35,.5)';
  g.beginPath(); g.moveTo(36, 31); g.quadraticCurveTo(66, 27, 96, 30); g.stroke();
  g.restore();
  g.setLineDash([]);
  g.strokeStyle = ink;
  g.lineWidth = 2.4;
  g.stroke(body);
  // 鰓、胸鰭、嘴
  g.lineWidth = 1.6;
  g.beginPath(); g.arc(88, 32, 10, -1.1, 1.1); g.stroke();
  g.fillStyle = '#a3b57c';
  g.beginPath(); g.moveTo(84, 36); g.quadraticCurveTo(76, 44, 72, 38); g.quadraticCurveTo(78, 35, 84, 36); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(111, 35); g.lineTo(106, 35); g.stroke();
  // 眼睛
  g.fillStyle = '#fffdf2';
  g.beginPath(); g.arc(99, 28, 4.4, 0, Math.PI * 2); g.fill(); g.stroke();
  g.fillStyle = '#1f1c14';
  g.beginPath(); g.arc(100, 28, 2.3, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff';
  g.beginPath(); g.arc(100.8, 27, 0.9, 0, Math.PI * 2); g.fill();
  return c;
}

// 龜龜頭上的對話泡泡：歪歪的手繪框＋底下一個小尖角，裡面是符號或顏文字
export function drawEmote(text) {
  const font = 'bold 44px "Segoe UI Symbol","Noto Sans TC","Microsoft JhengHei",sans-serif';
  const probe = document.createElement('canvas').getContext('2d');
  probe.font = font;
  const tw = Math.ceil(probe.measureText(text).width);
  const w = Math.max(96, tw + 56), h = 104;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  g.lineJoin = g.lineCap = 'round';

  // 泡泡外框：沿著圓角矩形取點，每一點稍微抖一下，像手畫的
  const x0 = 8, y0 = 8, x1 = w - 8, y1 = h - 30, r = 22;
  const pts = [];
  const corner = (cx, cy, a0) => {
    for (let i = 0; i <= 6; i++) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x1 - r, y0 + r, -Math.PI / 2);
  corner(x1 - r, y1 - r, 0);
  pts.push([w / 2 + 12, y1], [w / 2 + 2, h - 8], [w / 2 - 8, y1]);  // 尖角
  corner(x0 + r, y1 - r, Math.PI / 2);
  corner(x0 + r, y0 + r, Math.PI);
  let seed = text.length * 7 + 3;
  const jitter = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 2.2;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x + jitter(), y + jitter()) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = '#fffdf3';
  g.fill();
  g.strokeStyle = '#4a3f30';
  g.lineWidth = 4;
  g.stroke();

  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#3a3226';
  g.fillText(text, w / 2, (y0 + y1) / 2 + 2);
  return c;
}
