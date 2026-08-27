/**
 * DSE-style Cartesian plane SVG renderer.
 * Lines: Ax + By + C = 0; points with labels; print-friendly greys.
 */

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Clip infinite line Ax+By+C=0 to axis-aligned rectangle [xMin,xMax]×[yMin,yMax]. */
export function clipLineToRect(A, B, C, xMin, xMax, yMin, yMax) {
  const pts = [];
  const add = (x, y) => {
    if (x >= xMin - 1e-9 && x <= xMax + 1e-9 && y >= yMin - 1e-9 && y <= yMax + 1e-9) {
      pts.push({ x: clamp(x, xMin, xMax), y: clamp(y, yMin, yMax) });
    }
  };

  if (Math.abs(B) > 1e-12) {
    add(xMin, (-C - A * xMin) / B);
    add(xMax, (-C - A * xMax) / B);
  }
  if (Math.abs(A) > 1e-12) {
    add((-C - B * yMin) / A, yMin);
    add((-C - B * yMax) / A, yMax);
  }

  // Deduplicate
  const uniq = [];
  for (const p of pts) {
    if (!uniq.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-6)) uniq.push(p);
  }
  if (uniq.length < 2) return null;
  // Pick the two farthest endpoints for a stable segment
  let best = [uniq[0], uniq[1]];
  let bestD = -1;
  for (let i = 0; i < uniq.length; i++) {
    for (let j = i + 1; j < uniq.length; j++) {
      const d = Math.hypot(uniq[i].x - uniq[j].x, uniq[i].y - uniq[j].y);
      if (d > bestD) {
        bestD = d;
        best = [uniq[i], uniq[j]];
      }
    }
  }
  return best;
}

/**
 * @param {object} graph
 * @param {{ width?: number, height?: number, padding?: number }} [opts]
 * @returns {string} SVG markup
 */
export function renderCartesianSvg(graph, opts = {}) {
  if (!graph) return '';

  const width = opts.width || 420;
  const height = opts.height || 420;
  const padding = opts.padding != null ? opts.padding : 36;

  let xMin = Number(graph.x_min);
  let xMax = Number(graph.x_max);
  let yMin = Number(graph.y_min);
  let yMax = Number(graph.y_max);
  if (![xMin, xMax, yMin, yMax].every(Number.isFinite) || xMin >= xMax || yMin >= yMax) {
    xMin = -8;
    xMax = 8;
    yMin = -8;
    yMax = 8;
  }

  // Slight padding of data range so lines don't sit on the frame edge
  const xPad = (xMax - xMin) * 0.02;
  const yPad = (yMax - yMin) * 0.02;
  xMin -= xPad;
  xMax += xPad;
  yMin -= yPad;
  yMax += yPad;

  const plotW = width - padding * 2;
  const plotH = height - padding * 2;

  const sx = (x) => padding + ((x - xMin) / (xMax - xMin)) * plotW;
  const sy = (y) => padding + ((yMax - y) / (yMax - yMin)) * plotH;

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cartesian plane">`,
  );
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);

  // Grid (light) — skip dense grid for sparse DSE-style figures
  const sparseTicks = graph.ticks && (graph.ticks.x || graph.ticks.y);
  if (!sparseTicks) {
    const xStart = Math.ceil(xMin);
    const yStart = Math.ceil(yMin);
    for (let xi = xStart; xi <= Math.floor(xMax); xi++) {
      if (xi === 0) continue;
      parts.push(
        `<line x1="${sx(xi)}" y1="${sy(yMin)}" x2="${sx(xi)}" y2="${sy(yMax)}" stroke="#e8e8e8" stroke-width="1"/>`,
      );
    }
    for (let yi = yStart; yi <= Math.floor(yMax); yi++) {
      if (yi === 0) continue;
      parts.push(
        `<line x1="${sx(xMin)}" y1="${sy(yi)}" x2="${sx(xMax)}" y2="${sy(yi)}" stroke="#e8e8e8" stroke-width="1"/>`,
      );
    }
  }

  // Axes
  const xAxisY = sy(0);
  const yAxisX = sx(0);
  const axisStroke = '#222222';
  if (yMin < 0 && yMax > 0) {
    parts.push(
      `<line x1="${sx(xMin)}" y1="${xAxisY}" x2="${sx(xMax)}" y2="${xAxisY}" stroke="${axisStroke}" stroke-width="1.5"/>`,
    );
    // arrow
    parts.push(
      `<polygon points="${sx(xMax)},${xAxisY} ${sx(xMax) - 10},${xAxisY - 4} ${sx(xMax) - 10},${xAxisY + 4}" fill="${axisStroke}"/>`,
    );
    parts.push(
      `<text x="${sx(xMax) - 14}" y="${xAxisY + 16}" font-family="Times New Roman, serif" font-size="14" fill="${axisStroke}">x</text>`,
    );
  }
  if (xMin < 0 && xMax > 0) {
    parts.push(
      `<line x1="${yAxisX}" y1="${sy(yMin)}" x2="${yAxisX}" y2="${sy(yMax)}" stroke="${axisStroke}" stroke-width="1.5"/>`,
    );
    parts.push(
      `<polygon points="${yAxisX},${sy(yMax)} ${yAxisX - 4},${sy(yMax) + 10} ${yAxisX + 4},${sy(yMax) + 10}" fill="${axisStroke}"/>`,
    );
    parts.push(
      `<text x="${yAxisX + 8}" y="${sy(yMax) + 14}" font-family="Times New Roman, serif" font-size="14" fill="${axisStroke}">y</text>`,
    );
  }

  // Origin
  if (xMin < 0 && xMax > 0 && yMin < 0 && yMax > 0) {
    parts.push(
      `<text x="${yAxisX - 12}" y="${xAxisY + 14}" font-family="Times New Roman, serif" font-size="12" fill="${axisStroke}">O</text>`,
    );
  }

  // Tick labels — sparse DSE style (e.g. only 1 or −1) or full integers
  const xTicks = sparseTicks
    ? (Array.isArray(graph.ticks.x) ? graph.ticks.x : [])
    : Array.from({ length: Math.floor(xMax) - Math.ceil(xMin) + 1 }, (_, i) => Math.ceil(xMin) + i).filter((v) => v !== 0);
  const yTicks = sparseTicks
    ? (Array.isArray(graph.ticks.y) ? graph.ticks.y : [])
    : Array.from({ length: Math.floor(yMax) - Math.ceil(yMin) + 1 }, (_, i) => Math.ceil(yMin) + i).filter((v) => v !== 0);

  xTicks.forEach((xi) => {
    if (!Number.isFinite(xi) || xi === 0) return;
    if (!(yMin < 0 && yMax > 0)) return;
    parts.push(
      `<line x1="${sx(xi)}" y1="${xAxisY - 4}" x2="${sx(xi)}" y2="${xAxisY + 4}" stroke="${axisStroke}" stroke-width="1"/>`,
    );
    parts.push(
      `<text x="${sx(xi)}" y="${xAxisY + 14}" text-anchor="middle" font-family="Times New Roman, serif" font-size="11" fill="#444">${xi}</text>`,
    );
  });
  yTicks.forEach((yi) => {
    if (!Number.isFinite(yi) || yi === 0) return;
    if (!(xMin < 0 && xMax > 0)) return;
    parts.push(
      `<line x1="${yAxisX - 4}" y1="${sy(yi)}" x2="${yAxisX + 4}" y2="${sy(yi)}" stroke="${axisStroke}" stroke-width="1"/>`,
    );
    parts.push(
      `<text x="${yAxisX - 8}" y="${sy(yi) + 4}" text-anchor="end" font-family="Times New Roman, serif" font-size="11" fill="#444">${yi}</text>`,
    );
  });

  const lineColors = ['#1a1a1a', '#333333', '#555555'];
  const lines = Array.isArray(graph.lines) ? graph.lines : [];
  lines.forEach((L, idx) => {
    const seg = clipLineToRect(L.A, L.B, L.C, xMin, xMax, yMin, yMax);
    if (!seg) return;
    const [p, q] = seg;
    const color = lineColors[idx % lineColors.length];
    parts.push(
      `<line x1="${sx(p.x)}" y1="${sy(p.y)}" x2="${sx(q.x)}" y2="${sy(q.y)}" stroke="${color}" stroke-width="2"/>`,
    );
    // Label near the end farther from origin
    const labelAt = Math.hypot(q.x, q.y) >= Math.hypot(p.x, p.y) ? q : p;
    const lx = sx(labelAt.x);
    const ly = sy(labelAt.y);
    const label = escapeXml(L.label || L.id || 'L');
    parts.push(
      `<text x="${lx + 6}" y="${ly - 6}" font-family="Times New Roman, serif" font-size="14" font-style="italic" fill="${color}">${label}</text>`,
    );
  });

  const points = Array.isArray(graph.points) ? graph.points : [];
  points.forEach((P) => {
    const cx = sx(P.x);
    const cy = sy(P.y);
    parts.push(`<circle cx="${cx}" cy="${cy}" r="3.5" fill="#111"/>`);
    const label = escapeXml(P.label || P.id || '');
    if (label) {
      parts.push(
        `<text x="${cx + 8}" y="${cy - 8}" font-family="Times New Roman, serif" font-size="14" font-style="italic" fill="#111">${label}</text>`,
      );
    }
  });

  parts.push('</svg>');
  return parts.join('');
}

/**
 * Convert SVG string to PNG data URL via canvas (for print/export helpers).
 */
export function svgToPngDataUrl(svgMarkup, scale = 2) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = (img.width || 420) * scale;
        canvas.height = (img.height || 420) * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to rasterize SVG'));
    };
    img.src = url;
  });
}
