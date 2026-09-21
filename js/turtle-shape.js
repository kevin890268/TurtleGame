// 程式畫的斑龜與小圖示。沒有姿勢圖時用這個當替代。

// 內建的斑龜側面圖（面向右）。深橄欖色背甲、脖子有細黃線是斑龜的特徵。
const DEFAULT_PALETTE = { shellTop: '#5b5a36', shellBottom: '#3a3822', skin: '#55583a', stripe: '#e6d95c', plastron: '#c7b36a', neckStripes: 3 };

// pal：品種配色（見 species.js 的 palette），沒給就用斑龜的顏色
export function drawTurtleShape(ctx, w, pose, anim, pal = DEFAULT_PALETTE) {
  const h = w * 0.5;
  const skin = pal.skin;
  const stripe = pal.stripe;
  const pad = pose === 'swim' ? Math.sin(anim * 7) : 0;

  const leg = (x, y, len, ang) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(len * 0.5, 0, len * 0.5, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // 四肢與尾巴（畫在殼的後面）
  if (pose === 'bask') {
    leg(-w * 0.3, h * 0.12, w * 0.3, Math.PI * 0.97); // 曬背時後腳往後伸直
    leg(w * 0.2, h * 0.14, w * 0.2, 0.9);
  } else if (pose === 'sleep') {
    leg(-w * 0.28, h * 0.14, w * 0.14, 2.2);
    leg(w * 0.22, h * 0.14, w * 0.14, 0.9);
  } else {
    leg(-w * 0.28, h * 0.12, w * 0.22, 2.4 + pad * 0.4);
    leg(w * 0.22, h * 0.12, w * 0.24, 0.5 - pad * 0.5);
  }
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(-w * 0.4, h * 0.02);
  ctx.lineTo(-w * 0.58, h * 0.14);
  ctx.lineTo(-w * 0.4, h * 0.16);
  ctx.closePath();
  ctx.fill();

  // 頭和脖子
  const retracted = pose === 'sleep';
  const hx = retracted ? w * 0.46 : w * (pose === 'bask' ? 0.64 : 0.6);
  const hy = retracted ? h * 0.06 : pose === 'bask' ? -h * 0.12 : -h * 0.02;
  const hr = h * 0.22;
  ctx.strokeStyle = skin;
  ctx.lineWidth = h * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.3, h * 0.05);
  ctx.lineTo(hx - hr * 0.5, hy);
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.ellipse(hx, hy, hr * 1.25, hr, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!retracted) {
    ctx.strokeStyle = stripe;
    ctx.lineWidth = Math.max(1, h * 0.03);
    const n = pal.neckStripes;
    for (let i = -(n - 1) / 2; i <= (n - 1) / 2 + 1e-6; i++) {
      ctx.beginPath();
      ctx.moveTo(w * 0.32, h * 0.05 + i * h * 0.07);
      ctx.quadraticCurveTo(hx - hr * 0.6, hy + i * h * 0.06, hx + hr * 1.1, hy + i * h * 0.05 + h * 0.03);
      ctx.stroke();
    }
  }
  // 眼睛
  const ex = hx + hr * 0.45, ey = hy - hr * 0.25;
  if (retracted) {
    ctx.strokeStyle = '#1d1d12';
    ctx.lineWidth = Math.max(1, h * 0.03);
    ctx.beginPath();
    ctx.moveTo(ex - hr * 0.25, ey);
    ctx.lineTo(ex + hr * 0.25, ey);
    ctx.stroke();
  } else {
    ctx.fillStyle = stripe;
    ctx.beginPath();
    ctx.arc(ex, ey, hr * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#141408';
    ctx.beginPath();
    ctx.arc(ex + hr * 0.04, ey, hr * 0.19, 0, Math.PI * 2);
    ctx.fill();
  }

  // 腹甲
  // 巴西龜眼睛後面的紅斑
  if (pal.earPatch && !retracted) {
    ctx.fillStyle = pal.earPatch;
    ctx.beginPath();
    ctx.ellipse(hx - hr * 0.35, hy + hr * 0.05, hr * 0.45, hr * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = pal.plastron;
  roundRect(ctx, -w * 0.43, h * 0.02, w * 0.86, h * 0.17, h * 0.08);
  ctx.fill();

  // 背甲
  const shell = ctx.createLinearGradient(0, -h * 0.6, 0, h * 0.1);
  shell.addColorStop(0, pal.shellTop);
  shell.addColorStop(1, pal.shellBottom);
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.moveTo(-w * 0.47, h * 0.08);
  ctx.bezierCurveTo(-w * 0.45, -h * 0.78, w * 0.45, -h * 0.78, w * 0.47, h * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#26241a';
  ctx.lineWidth = Math.max(1, h * 0.04);
  ctx.stroke();

  // 盾片紋路
  ctx.strokeStyle = 'rgba(210, 190, 110, .45)';
  ctx.lineWidth = Math.max(1, h * 0.025);
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, -h * 0.02);
  ctx.bezierCurveTo(-w * 0.35, -h * 0.12, w * 0.35, -h * 0.12, w * 0.44, -h * 0.02);
  ctx.stroke();
  for (const x of [-0.22, 0, 0.22]) {
    ctx.beginPath();
    ctx.moveTo(w * x, -h * 0.08);
    ctx.lineTo(w * x * 0.9, -h * 0.5);
    ctx.stroke();
  }
  // 反光
  ctx.fillStyle = 'rgba(255, 255, 255, .1)';
  ctx.beginPath();
  ctx.ellipse(-w * 0.08, -h * 0.4, w * 0.2, h * 0.08, -0.15, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHeart(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.6);
  ctx.bezierCurveTo(x - r * 1.4, y - r * 0.3, x - r * 0.5, y - r * 1.3, x, y - r * 0.4);
  ctx.bezierCurveTo(x + r * 0.5, y - r * 1.3, x + r * 1.4, y - r * 0.3, x, y + r * 0.6);
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
