/**
 * Draws the latent image for the hero sheet: the name in Fenice plus small
 * printed marks. White = full density once developed. The canvas covers the
 * sheet exactly (sheet space, y down).
 */
export interface LatentOptions {
  width: number;
  height: number;
  dpr: number;
  lines: string[];
  subtitle: string;
  corners: [string, string, string, string]; // top-left, top-right, bottom-left, bottom-right
}

const TRACKING = -0.035; // em, matches the CSS fallback

export function drawLatent(canvas: HTMLCanvasElement, o: LatentOptions) {
  const W = Math.max(2, Math.round(o.width * o.dpr));
  const H = Math.max(2, Math.round(o.height * o.dpr));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  // Lay each line out at a reference size: per-glyph advance + pair kerning + tracking.
  const REF = 200;
  ctx.font = `400 ${REF}px Fenice`;
  const layout = (text: string) => {
    const xs: number[] = [];
    let x = 0;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      const next = text.charAt(i + 1);
      xs.push(x);
      const w = ctx.measureText(ch).width;
      if (next) {
        const kern = ctx.measureText(ch + next).width - w - ctx.measureText(next).width;
        x += w + kern + TRACKING * REF;
      } else {
        x += w;
      }
    }
    return { text, xs, width: x };
  };
  const lines = o.lines.map(layout);
  const widest = Math.max(...lines.map((l) => l.width));
  const capRef = ctx.measureText('H').actualBoundingBoxAscent || REF * 0.7;
  const gapRef = REF * 0.14;

  // Fit: 86% of the sheet width, and no taller than 56% of its height.
  const blockRef = lines.length * capRef + (lines.length - 1) * gapRef;
  const k = Math.min((W * 0.86) / widest, (H * 0.56) / blockRef);
  const size = REF * k;
  const cap = capRef * k;
  const gap = gapRef * k;
  const blockH = lines.length * cap + (lines.length - 1) * gap;
  let baseline = (H - blockH) / 2 + cap - H * 0.02;

  ctx.fillStyle = '#fff';
  ctx.font = `400 ${size}px Fenice`;
  ctx.textBaseline = 'alphabetic';
  for (const line of lines) {
    const x0 = (W - line.width * k) / 2;
    for (let i = 0; i < line.text.length; i++) {
      ctx.fillText(line.text.charAt(i), x0 + (line.xs[i] ?? 0) * k, baseline);
    }
    baseline += cap + gap;
  }

  // Printed marks develop a shade lighter than the name.
  const pad = 22 * o.dpr;
  const mono = Math.round(Math.max(9, Math.min(12, o.width / 90)) * o.dpr);
  ctx.font = `400 ${mono}px "Fragment Mono"`;
  ctx.fillStyle = 'rgba(255,255,255,0.78)';
  const [tl, tr, bl, br] = o.corners;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(tl, pad, pad);
  ctx.textAlign = 'right';
  ctx.fillText(tr, W - pad, pad);
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'left';
  ctx.fillText(bl, pad, H - pad);
  ctx.textAlign = 'right';
  ctx.fillText(br, W - pad, H - pad);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(255,255,255,0.86)';
  ctx.font = `400 ${Math.round(mono * 1.1)}px "Fragment Mono"`;
  ctx.fillText(o.subtitle, W / 2, baseline - cap - gap + Math.max(cap * 0.32, mono * 2));

  // Crop marks.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = Math.max(1, o.dpr);
  const m = pad * 0.45;
  const len = pad * 0.9;
  ctx.beginPath();
  for (const [cx, cy, sx, sy] of [
    [m, m, 1, 1],
    [W - m, m, -1, 1],
    [m, H - m, 1, -1],
    [W - m, H - m, -1, -1],
  ] as const) {
    ctx.moveTo(cx, cy + sy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * len, cy);
  }
  ctx.stroke();
}
