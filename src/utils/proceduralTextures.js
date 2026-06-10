import * as THREE from 'three';

const textureCache = new Map();

function seededNoise(x, y, seed) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

function drawDarkWood(ctx, size) {
  const plankH = size / 8;
  for (let row = 0; row < 8; row++) {
    const y = row * plankH;
    const base = row % 2 === 0 ? '#3b2110' : '#59371b';
    ctx.fillStyle = base;
    ctx.fillRect(0, y, size, plankH);
    for (let g = 0; g < 54; g++) {
      const gx = (g / 54) * size;
      ctx.strokeStyle = `rgba(18, 9, 3, ${0.14 + seededNoise(g, row, 2) * 0.18})`;
      ctx.lineWidth = 0.7 + seededNoise(g, row, 3) * 1.2;
      ctx.beginPath();
      ctx.moveTo(gx, y + 2);
      ctx.lineTo(gx + 8, y + plankH - 2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 197, 120, 0.06)';
    ctx.fillRect(0, y + 2, size, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.fillRect(0, y + plankH - 2, size, 2);
  }
  for (let i = 0; i < 6000; i++) {
    const px = seededNoise(i, 0, 4) * size;
    const py = seededNoise(i, 1, 5) * size;
    ctx.fillStyle = `rgba(23, 12, 5, ${seededNoise(i, 2, 6) * 0.1})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawLightWood(ctx, size) {
  const plankH = size / 10;
  for (let row = 0; row < 10; row++) {
    const y = row * plankH;
    const base = row % 2 === 0 ? '#c29a58' : '#d9bb7c';
    ctx.fillStyle = base;
    ctx.fillRect(0, y, size, plankH);
    for (let g = 0; g < 50; g++) {
      const gx = (g / 50) * size;
      ctx.strokeStyle = `rgba(105, 63, 24, ${0.09 + seededNoise(g, row, 7) * 0.16})`;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(gx, y + 1);
      ctx.lineTo(gx + 6, y + plankH - 1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(80, 50, 20, 0.22)';
    ctx.fillRect(0, y + plankH - 2, size, 2);
  }
  for (let i = 0; i < 5000; i++) {
    const px = seededNoise(i, 3, 8) * size;
    const py = seededNoise(i, 4, 9) * size;
    ctx.fillStyle = `rgba(160, 120, 70, ${seededNoise(i, 5, 10) * 0.05})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawMatteBlackPvc(ctx, size) {
  ctx.fillStyle = '#161616';
  ctx.fillRect(0, 0, size, size);
  const sheetH = size / 6;
  for (let row = 0; row < 6; row++) {
    const y = row * sheetH;
    const shade = row % 2 === 0 ? '#181818' : '#141414';
    ctx.fillStyle = shade;
    ctx.fillRect(0, y, size, sheetH);
    ctx.fillStyle = 'rgba(30, 30, 30, 0.3)';
    ctx.fillRect(0, y + sheetH - 1, size, 1);
  }
  for (let i = 0; i < 4000; i++) {
    const px = seededNoise(i, 6, 11) * size;
    const py = seededNoise(i, 7, 12) * size;
    ctx.fillStyle = `rgba(255, 255, 255, ${seededNoise(i, 8, 13) * 0.03})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function drawCheerMats(ctx, size) {
  ctx.fillStyle = '#4a6fa5';
  ctx.fillRect(0, 0, size, size);

  const lineWidth = Math.max(1, size * 0.003);
  const sectionWidth = size / 9;

  ctx.fillStyle = '#1f2937';
  for (let i = 1; i < 9; i += 1) {
    const x = i * sectionWidth - lineWidth / 2;
    ctx.fillRect(x, 0, lineWidth, size);
  }

  for (let i = 0; i < 3000; i += 1) {
    const px = seededNoise(i, 9, 14) * size;
    const py = seededNoise(i, 10, 15) * size;
    ctx.fillStyle = `rgba(255, 255, 255, ${seededNoise(i, 11, 16) * 0.025})`;
    ctx.fillRect(px, py, 1, 1);
  }
}

function generateDeckTexture(key, size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  switch (key) {
    case 'dark_wood':
      drawDarkWood(ctx, size);
      break;
    case 'light_wood':
      drawLightWood(ctx, size);
      break;
    case 'matte_black':
      drawMatteBlackPvc(ctx, size);
      break;
    case 'cheer_mats':
      drawCheerMats(ctx, size);
      break;
    default:
      drawDarkWood(ctx, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}

export function getStageDeckTexture(key) {
  if (!textureCache.has(key)) {
    textureCache.set(key, generateDeckTexture(key));
  }
  return textureCache.get(key);
}

export function applyStageDeckTextureRepeat(texture, width, length, options = {}) {
  const safeWidth = Number.isFinite(Number(width)) ? Number(width) : 4;
  const safeLength = Number.isFinite(Number(length)) ? Number(length) : 4;
  if (options.spanDeck) {
    texture.repeat.set(1 / Math.max(0.001, safeWidth), 1 / Math.max(0.001, safeLength));
    texture.offset.set(0.5, 0.5);
  } else {
    texture.repeat.set(Math.max(1, safeWidth / 4), Math.max(1, safeLength / 4));
    texture.offset.set(0, 0);
  }
  texture.needsUpdate = true;
}
