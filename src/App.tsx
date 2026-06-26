import { useEffect, useRef, useState } from 'react';

interface LeafState {
  x: number;
  y: number;
  angle: number;         // 2D spin angle
  spinSpeed: number;     // Continuous auto-rotation
  
  swayPhase: number;     // Sinusoidal horizontal sway phase
  swaySpeed: number;     // Frequency of the sway
  swayAmplitude: number; // Width of horizontal sway (now very small & gentle)
  
  pitchPhase: number;    // Phase for 3D tumbling
  pitchSpeed: number;    // Frequency of pitch oscillation
  
  rollPhase: number;     // Phase for side-to-side roll (3D scaleX)
  rollSpeed: number;     
  
  speedY: number;        // Downward velocity (slow and steady)
  speedX: number;        
  
  size: number;          // Leaf size
  
  // Interactive wind response
  windInfluenceX: number;
  windInfluenceY: number;
  rotationalInertia: number;
}

interface EngravingCloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speedY: number;        // Speed of upward scrolling
  opacity: number;
  influence: number;     // For woodcut lines thickness
}

interface WindWisp {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  amplitude: number;
  frequency: number;
  phase: number;
  width: number;
}

interface SpeedLine {
  x: number;
  y: number;
  length: number;
  speedY: number;
  opacity: number;
}

interface GuideCircle {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  pulsePhase: number;
  scale: number;
  clicked: boolean;
  hillType: 'near' | 'mid' | 'far';
  offsetY: number;
}

interface EngravingSheep {
  x: number;
  y: number;
  hillType: 'near' | 'mid' | 'far';
  offsetY: number;
  scale: number;
  facingLeft: boolean;
  bouncePhase: number;
  legsSway: number;
  opacity: number;
  eatingTimer: number;
  isBackgroundFlock?: boolean;
  speedX?: number;
}

interface HistoricalCharacter {
  type: 'king' | 'artisan' | 'priest' | 'shepherd';
  x: number;
  y: number;
  hillType: 'near' | 'mid' | 'far';
  offsetY: number;
  scale: number;
  opacity: number;
  bouncePhase: number;
  swayPhase: number;
}

interface GoldSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

// Audio Synthesis Helpers (Pure Web Audio physical modeling of sheep and bronze chime bells)
const playSheepSound = (pitch = 1.0) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Main vocal cord oscillator (sawtooth/triangle blend for rich harmonics)
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200 * pitch, now);

    // Vocal tract formant filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850 * pitch, now);
    filter.Q.setValueAtTime(1.8, now);

    // Secondary peak filter to add nasality
    const peakFilter = ctx.createBiquadFilter();
    peakFilter.type = 'peaking';
    peakFilter.frequency.setValueAtTime(1400 * pitch, now);
    peakFilter.Q.setValueAtTime(1.2, now);
    peakFilter.gain.setValueAtTime(10, now);

    // LFO for characteristic sheep "baa-aa-aa" flutter/tremolo
    const vibrato = ctx.createOscillator();
    vibrato.frequency.setValueAtTime(8.8, now);
    
    const vibratoGain = ctx.createGain();
    vibratoGain.gain.setValueAtTime(16 * pitch, now);

    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    // Gain envelope
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.24, now + 0.1);
    
    // Add distinct bumpy volumes for "baa-aa-aa-a"
    gainNode.gain.setValueAtTime(0.24, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.14, now + 0.22);
    gainNode.gain.linearRampToValueAtTime(0.22, now + 0.35);
    gainNode.gain.linearRampToValueAtTime(0.10, now + 0.5);
    gainNode.gain.linearRampToValueAtTime(0.0, now + 0.65);

    osc.connect(filter);
    filter.connect(peakFilter);
    peakFilter.connect(gainNode);
    gainNode.connect(ctx.destination);

    vibrato.start(now);
    osc.start(now);

    vibrato.stop(now + 0.68);
    osc.stop(now + 0.68);
  } catch (err) {
    console.warn("Audio Context blocked or not supported:", err);
  }
};

const playChimeBellSound = (freq = 440) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Bronze chime bells have key overtones (ratios) that decay at different rates
    const overtones = [1.0, 1.52, 1.98, 2.45, 3.12];
    const gains = [0.38, 0.2, 0.15, 0.1, 0.05];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(0.8, now);

    overtones.forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, now);

      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(gains[idx], now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2 / ratio);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start(now);
      osc.stop(now + 2.3);
    });

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);
  } catch (err) {
    console.warn("Chime Audio failed:", err);
  }
};

const drawNanyuePalace = (ctx: CanvasRenderingContext2D, cx: number, baseY: number, progress: number, time: number) => {
  if (progress <= 0.01) return;

  ctx.save();
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const h = 140; // Max height of palace
  const w = 260; // Max width of palace
  const py = baseY - h * progress; // Rise up from the ground!

  // Golden and cream glow
  ctx.strokeStyle = `rgba(251, 191, 36, ${progress * 0.9})`;
  ctx.fillStyle = `rgba(10, 25, 20, ${progress * 0.92})`; // Dark background fill to mask hills behind it

  // Draw the main solid back fill
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5, baseY);
  ctx.lineTo(cx - w * 0.5, py + h * 0.65);
  ctx.lineTo(cx - w * 0.35, py + h * 0.65);
  ctx.lineTo(cx - w * 0.35, py + h * 0.25);
  ctx.lineTo(cx - w * 0.22, py);
  ctx.lineTo(cx + w * 0.22, py);
  ctx.lineTo(cx + w * 0.35, py + h * 0.25);
  ctx.lineTo(cx + w * 0.35, py + h * 0.65);
  ctx.lineTo(cx + w * 0.5, baseY);
  ctx.closePath();
  ctx.fill();

  // --- 1. THE FOUNDATION PLATFORM (台基) ---
  const pad = 15;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.5 - pad, baseY);
  ctx.lineTo(cx + w * 0.5 + pad, baseY);
  ctx.lineTo(cx + w * 0.45, baseY - 16 * progress);
  ctx.lineTo(cx - w * 0.45, baseY - 16 * progress);
  ctx.closePath();
  ctx.stroke();

  // Draw steps (台阶)
  const stairW = 50;
  ctx.beginPath();
  ctx.moveTo(cx - stairW * 0.5, baseY);
  ctx.lineTo(cx + stairW * 0.5, baseY);
  ctx.lineTo(cx + stairW * 0.4, baseY - 16 * progress);
  ctx.lineTo(cx - stairW * 0.4, baseY - 16 * progress);
  ctx.closePath();
  ctx.stroke();
  
  for (let step = 1; step <= 4; step++) {
    const sy = baseY - (16 * progress) * (step / 4);
    const sw = stairW * (0.5 - 0.1 * (step / 4));
    ctx.beginPath();
    ctx.moveTo(cx - sw, sy);
    ctx.lineTo(cx + sw, sy);
    ctx.stroke();
  }

  // --- 2. COLUMNS & WALLS (柱网) ---
  const colYTop = py + h * 0.55;
  const colYBot = baseY - 16 * progress;
  const colPositions = [-0.4, -0.2, 0, 0.2, 0.4];
  
  colPositions.forEach((coef) => {
    const colX = cx + w * coef * progress;
    ctx.beginPath();
    ctx.moveTo(colX, colYBot);
    ctx.lineTo(colX, colYTop);
    ctx.stroke();

    // Column base (柱础)
    ctx.fillStyle = '#fbf1c7';
    ctx.fillRect(colX - 3.5, colYBot - 4, 7, 4);
    ctx.strokeRect(colX - 3.5, colYBot - 4, 7, 4);
  });

  // --- 3. LOWER ROOF (下层檐) ---
  const lowRoofY = py + h * 0.55;
  const lowRoofW = w * 0.46;
  ctx.fillStyle = `rgba(15, 30, 24, ${progress * 0.95})`;
  ctx.beginPath();
  ctx.moveTo(cx - lowRoofW - 14 * progress, lowRoofY + 5);
  ctx.quadraticCurveTo(cx - lowRoofW, lowRoofY - 8, cx - lowRoofW * 0.8, lowRoofY - 14);
  ctx.lineTo(cx + lowRoofW * 0.8, lowRoofY - 14);
  ctx.quadraticCurveTo(cx + lowRoofW, lowRoofY - 8, cx + lowRoofW + 14 * progress, lowRoofY + 5);
  ctx.lineTo(cx + lowRoofW * 0.85, lowRoofY);
  ctx.lineTo(cx - lowRoofW * 0.85, lowRoofY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // --- 4. UPPER ROOF (重檐歇山顶) ---
  const upRoofY = py + h * 0.22;
  const upRoofW = w * 0.36;
  ctx.fillStyle = `rgba(18, 35, 28, ${progress * 0.95})`;
  ctx.beginPath();
  ctx.moveTo(cx - upRoofW - 18 * progress, upRoofY + 8);
  ctx.quadraticCurveTo(cx - upRoofW, upRoofY - 12, cx - upRoofW * 0.6, upRoofY - 20);
  ctx.lineTo(cx - upRoofW * 0.25, py);
  ctx.lineTo(cx + upRoofW * 0.25, py);
  ctx.lineTo(cx + upRoofW * 0.6, upRoofY - 20);
  ctx.quadraticCurveTo(cx + upRoofW, upRoofY - 12, cx + upRoofW + 18 * progress, upRoofY + 8);
  ctx.lineTo(cx + upRoofW * 0.8, upRoofY);
  ctx.lineTo(cx - upRoofW * 0.8, upRoofY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Main roof ridge ornament (吻兽)
  ctx.beginPath();
  ctx.arc(cx - upRoofW * 0.25, py, 4 * progress, 0, Math.PI * 2);
  ctx.arc(cx + upRoofW * 0.25, py, 4 * progress, 0, Math.PI * 2);
  ctx.fillStyle = '#fbbf24';
  ctx.fill();
  ctx.stroke();

  // Draw tile ridges (瓦垄) on roofs
  ctx.strokeStyle = `rgba(251, 191, 36, ${progress * 0.45})`;
  for (let offset = -0.55; offset <= 0.55; offset += 0.2) {
    ctx.beginPath();
    ctx.moveTo(cx + upRoofW * offset * 0.4 * progress, py);
    ctx.lineTo(cx + upRoofW * offset * progress, upRoofY - 14);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(251, 191, 36, ${progress * 0.9})`;

  // --- 5. CENTRAL PLAQUE / TABLET ("南越王宫") ---
  const plaqueW = 22 * progress;
  const plaqueH = 36 * progress;
  const plaqueX = cx - plaqueW * 0.5;
  const plaqueY = py + h * 0.23;
  ctx.fillStyle = '#2d1508';
  ctx.fillRect(plaqueX, plaqueY, plaqueW, plaqueH);
  ctx.strokeRect(plaqueX, plaqueY, plaqueW, plaqueH);

  // Vertical text
  ctx.fillStyle = '#fbf1c7';
  ctx.font = `bold ${8 * progress}px "Inter", "SimSun", "STSong", serif`;
  ctx.textAlign = 'center';
  ctx.fillText("南", cx, plaqueY + 9 * progress);
  ctx.fillText("越", cx, plaqueY + 17 * progress);
  ctx.fillText("王", cx, plaqueY + 25 * progress);
  ctx.fillText("宫", cx, plaqueY + 33 * progress);

  // --- 6. FLYING ORBITING CRANES ---
  for (let b = 0; b < 2; b++) {
    const angle = time * 0.015 + b * Math.PI;
    const birdX = cx + Math.cos(angle) * (w * 0.6) * progress;
    const birdY = py + h * 0.35 + Math.sin(angle * 2) * 20;
    
    ctx.save();
    ctx.translate(birdX, birdY);
    ctx.rotate(angle + Math.PI * 0.5);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 5);
    ctx.moveTo(-9, -1);
    ctx.quadraticCurveTo(0, -6, 9, -1);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
};

const drawEngravedGoldLeaf = (
  ctx: CanvasRenderingContext2D,
  size: number,
  opacity: number,
  showInterior: 'solid' | 'outline' | 'engraved',
  glowLevel: number
) => {
  ctx.save();
  ctx.globalAlpha = opacity;

  // Set line styling
  ctx.lineWidth = 2.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Choose styling based on mode
  if (showInterior === 'solid') {
    // Beautiful rich multi-stop solid golden gradient to simulate real polished solid gold
    const goldGrad = ctx.createLinearGradient(-size * 0.5, -size * 0.5, size * 0.5, size * 0.5);
    goldGrad.addColorStop(0, '#9a6a15');      // Antique deep bronze-gold
    goldGrad.addColorStop(0.24, '#f59e0b');   // Saturated amber gold
    goldGrad.addColorStop(0.5, '#fffbeb');    // Bright white-gold specular highlight
    goldGrad.addColorStop(0.76, '#fbbf24');   // Glowing yellow gold
    goldGrad.addColorStop(1, '#78350f');      // Deep bronze shadow
    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = `rgba(251, 191, 36, ${opacity * 0.95})`;
  } else {
    // Transparent base with a very subtle dark tinted backing to let gold lines stand out
    ctx.fillStyle = `rgba(10, 24, 18, ${opacity * 0.45})`;
    // Golden lines
    ctx.strokeStyle = `rgba(251, 191, 36, ${opacity * 0.95})`;
  }

  // Gold glow shadow
  ctx.shadowColor = `rgba(245, 158, 11, ${glowLevel * 0.85})`;
  ctx.shadowBlur = 8 + glowLevel * 18;

  // --- DRAW OUTER CONTOUR ---
  // The outer contour is a shield/leaf shape matching the user's uploaded image.
  ctx.beginPath();
  // Bottom-center
  ctx.moveTo(0, size * 0.85);
  // Bottom-left corner
  ctx.bezierCurveTo(-size * 0.4, size * 0.85, -size * 0.8, size * 0.7, -size * 0.8, size * 0.25);
  // Mid-left swelling
  ctx.bezierCurveTo(-size * 0.85, -size * 0.1, -size * 0.8, -size * 0.5, -size * 0.4, -size * 0.75);
  // Top apex curvature
  ctx.bezierCurveTo(-size * 0.2, -size * 0.88, size * 0.2, -size * 0.88, size * 0.4, -size * 0.75);
  // Mid-right swelling
  ctx.bezierCurveTo(size * 0.8, -size * 0.5, size * 0.85, -size * 0.1, size * 0.8, size * 0.25);
  // Bottom-right corner
  ctx.bezierCurveTo(size * 0.8, size * 0.7, size * 0.4, size * 0.85, 0, size * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Draw some small rivet circles along the edge (at top, sides, bottom)
  ctx.fillStyle = `rgba(251, 191, 36, ${opacity * 0.9})`;
  const drawRivet = (rx: number, ry: number, r: number) => {
    ctx.beginPath();
    ctx.arc(rx, ry, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  // Top rivets
  drawRivet(-size * 0.1, -size * 0.82, size * 0.04);
  drawRivet(size * 0.1, -size * 0.82, size * 0.04);
  // Side rivets
  drawRivet(-size * 0.78, size * 0.25, size * 0.035);
  drawRivet(-size * 0.75, size * 0.12, size * 0.03);
  drawRivet(size * 0.78, size * 0.25, size * 0.035);
  drawRivet(size * 0.75, size * 0.12, size * 0.03);
  // Bottom rivets
  drawRivet(-size * 0.12, size * 0.81, size * 0.04);
  drawRivet(size * 0.12, size * 0.81, size * 0.04);

  // Turn off shadow for detailed interior lines to prevent blurring
  ctx.shadowBlur = 0;

  // --- DRAW INTERIOR CONTENTS (if showInterior is 'engraved') ---
  if (showInterior === 'engraved') {
    // 1. OWL HEAD (at the top center)
    // Eyes
    ctx.beginPath();
    ctx.arc(-size * 0.14, -size * 0.46, size * 0.07, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-size * 0.14, -size * 0.46, size * 0.02, 0, Math.PI * 2); // Pupil
    ctx.fillStyle = `rgba(251, 191, 36, ${opacity * 0.95})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(size * 0.14, -size * 0.46, size * 0.07, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(size * 0.14, -size * 0.46, size * 0.02, 0, Math.PI * 2); // Pupil
    ctx.fill();

    // Sharp Beak pointing down
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.42);
    ctx.quadraticCurveTo(-size * 0.06, -size * 0.42, -size * 0.08, -size * 0.52);
    ctx.quadraticCurveTo(0, -size * 0.65, size * 0.08, -size * 0.52);
    ctx.quadraticCurveTo(size * 0.06, -size * 0.42, 0, -size * 0.42);
    ctx.closePath();
    ctx.stroke();
    // Beak center line
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.42);
    ctx.lineTo(0, -size * 0.58);
    ctx.stroke();

    // Curly Owl Ears / crest
    ctx.beginPath();
    ctx.moveTo(-size * 0.06, -size * 0.65);
    ctx.bezierCurveTo(-size * 0.18, -size * 0.74, -size * 0.28, -size * 0.75, -size * 0.22, -size * 0.65);
    ctx.bezierCurveTo(-size * 0.16, -size * 0.58, -size * 0.06, -size * 0.58, -size * 0.06, -size * 0.65);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.06, -size * 0.65);
    ctx.bezierCurveTo(size * 0.18, -size * 0.74, size * 0.28, -size * 0.75, size * 0.22, -size * 0.65);
    ctx.bezierCurveTo(size * 0.16, -size * 0.58, size * 0.06, -size * 0.58, size * 0.06, -size * 0.65);
    ctx.stroke();

    // 2. LARGE SYMMETRICAL HORN-LIKE SHAPES (Sheep horns)
    // Horn outline curving downwards and outwards, then swirling
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.bezierCurveTo(-size * 0.35, -size * 0.38, -size * 0.75, -size * 0.2, -size * 0.65, size * 0.12);
    ctx.bezierCurveTo(-size * 0.55, size * 0.38, -size * 0.3, size * 0.4, -size * 0.3, size * 0.15);
    ctx.bezierCurveTo(-size * 0.3, -size * 0.08, -size * 0.5, -size * 0.12, -size * 0.42, size * 0.08);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, -size * 0.4);
    ctx.bezierCurveTo(size * 0.35, size * 0.38, size * 0.75, -size * 0.2, size * 0.65, size * 0.12);
    ctx.bezierCurveTo(size * 0.55, size * 0.38, size * 0.3, size * 0.4, size * 0.3, size * 0.15);
    ctx.bezierCurveTo(size * 0.3, -size * 0.08, size * 0.5, -size * 0.12, size * 0.42, size * 0.08);
    ctx.stroke();

    // Parallel ridges/folds along the horns
    for (let h = 1; h <= 4; h++) {
      const scale = 1.0 - h * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4 * scale);
      ctx.bezierCurveTo(-size * 0.35 * scale, -size * 0.38, -size * 0.75 * scale, -size * 0.2 * scale, -size * 0.65 * scale, size * 0.12 * scale);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4 * scale);
      ctx.bezierCurveTo(size * 0.35 * scale, -size * 0.38, size * 0.75 * scale, -size * 0.2 * scale, size * 0.65 * scale, size * 0.12 * scale);
      ctx.stroke();
    }

    // 3. CENTRAL COLUMN / SPINE (Tail/column with ladder segments)
    const colW = size * 0.12;
    const colH = size * 0.45;
    const colBotY = size * 0.8;
    const colTopY = colBotY - colH;

    ctx.beginPath();
    ctx.moveTo(-colW, colBotY);
    ctx.lineTo(-colW, colTopY);
    ctx.quadraticCurveTo(0, colTopY - 10, colW, colTopY);
    ctx.lineTo(colW, colBotY);
    ctx.stroke();

    // Segment lines (chevron/V shaped ladders)
    const numSegments = 10;
    for (let s = 0; s < numSegments; s++) {
      const sy = colBotY - (colH * (s / numSegments));
      ctx.beginPath();
      ctx.moveTo(-colW, sy);
      ctx.lineTo(0, sy - 5);
      ctx.lineTo(colW, sy);
      ctx.stroke();
    }

    // 4. CORNER SCROLL CLOUDS (祥云/卷草纹)
    // Left corner swirl
    ctx.beginPath();
    ctx.moveTo(-size * 0.55, size * 0.65);
    ctx.bezierCurveTo(-size * 0.72, size * 0.82, -size * 0.3, size * 0.88, -size * 0.38, size * 0.65);
    ctx.bezierCurveTo(-size * 0.44, size * 0.48, -size * 0.58, size * 0.52, -size * 0.5, size * 0.62);
    ctx.stroke();

    // Right corner swirl
    ctx.beginPath();
    ctx.moveTo(size * 0.55, size * 0.65);
    ctx.bezierCurveTo(size * 0.72, size * 0.82, size * 0.3, size * 0.88, size * 0.38, size * 0.65);
    ctx.bezierCurveTo(size * 0.44, size * 0.48, size * 0.58, size * 0.52, size * 0.5, size * 0.62);
    ctx.stroke();

    // Symmetrical wing/horn feathers or outer wavy strands
    ctx.beginPath();
    ctx.moveTo(-size * 0.65, -size * 0.2);
    ctx.bezierCurveTo(-size * 0.78, -size * 0.35, -size * 0.82, -size * 0.1, -size * 0.65, size * 0.05);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(size * 0.65, -size * 0.2);
    ctx.bezierCurveTo(size * 0.78, -size * 0.35, size * 0.82, -size * 0.1, size * 0.65, size * 0.05);
    ctx.stroke();
  }

  ctx.restore();
};

const NARRATIVE_LINES = [
  "我记得。",
  "年轻的王。",
  "登上宫殿。",
  "我记得。",
  "工匠挥动木槌。",
  "一下一下。",
  "把黄金敲成生命。",
  "我记得。",
  "珠江上的商船。",
  "来自远方。",
  "带来香料。",
  "玉石。",
  "玻璃。",
  "又带走岭南的故事。",
  "我也记得。",
  "祭祀。",
  "礼乐。",
  "繁华的城池。",
  "以及。",
  "属于南越的荣耀。"
];

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const leafRef = useRef<LeafState | null>(null);
  const cloudsRef = useRef<EngravingCloud[]>([]);
  const speedLinesRef = useRef<SpeedLine[]>([]);
  const wispsRef = useRef<WindWisp[]>([]);
  
  // Chapter 3 Guide Circles & Sheep Elements
  const [activeGuideIndex, setActiveGuideIndex] = useState(-1);
  const activeGuideIndexRef = useRef(-1);
  const guideCirclesRef = useRef<GuideCircle[]>([]);
  const sheepRef = useRef<EngravingSheep[]>([]);
  const particlesRef = useRef<GoldSpark[]>([]);

  // Chapter 3 Story Progression & Audio
  const [storyStage, setStoryStage] = useState<'summoning' | 'transition' | 'shepherd' | 'characters' | 'palace' | 'reminisce' | 'ritual_outline' | 'ritual_interior' | 'ritual_final'>('summoning');
  const storyStageRef = useRef<'summoning' | 'transition' | 'shepherd' | 'characters' | 'palace' | 'reminisce' | 'ritual_outline' | 'ritual_interior' | 'ritual_final'>('summoning');
  
  const [reminisceStep, setReminisceStep] = useState(0);
  const reminisceStepRef = useRef(0);

  const [lightningFlash, setLightningFlash] = useState(0);
  const lightningFlashRef = useRef(0);

  const shipXRef = useRef(-120);
  const lastStrikeTimeRef = useRef(0);
  
  const [summonedTypes, setSummonedTypes] = useState<('king' | 'artisan' | 'priest')[]>([]);
  const summonedTypesRef = useRef<('king' | 'artisan' | 'priest')[]>([]);
  
  const [palaceProgress, setPalaceProgress] = useState(0);
  const palaceProgressRef = useRef(0);

  const charactersRef = useRef<HistoricalCharacter[]>([]);
  const timeRef = useRef(0);
  const [transitionOverlayOpacity, setTransitionOverlayOpacity] = useState(0);
  const transitionOverlayOpacityRef = useRef(0);

  // Time-based progress tracking for exactly 10 seconds transition from blue to black
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const [part2Time, setPart2Time] = useState(0);
  
  const [isResetting, setIsResetting] = useState(false);

  // Chapter 2 Dynamic click-to-glow and wind blow interactive states
  const [clickCount, setClickCount] = useState(0);
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef<number>(0);
  const mouseCoordsRef = useRef({ x: 0, y: 0 });

  // Initialize leaf and background elements
  const initSimulation = (width: number, height: number) => {
    // Exactly ONE leaf, locked visually near the center
    leafRef.current = {
      x: width * 0.5,
      y: height * 0.44,
      angle: Math.random() * Math.PI * 2,
      spinSpeed: 0.003 + Math.random() * 0.004,
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.005,
      swayAmplitude: 24 + Math.random() * 8, // Very small, gentle sway amplitude (幅度小，缓缓降落)
      pitchPhase: Math.random() * Math.PI * 2,
      pitchSpeed: 0.012 + Math.random() * 0.008,
      rollPhase: Math.random() * Math.PI * 2,
      rollSpeed: 0.006 + Math.random() * 0.006,
      speedY: 0.5 + Math.random() * 0.25, // Extremely slow drifting speed
      speedX: 0,
      size: 33 + Math.random() * 5,
      windInfluenceX: 0,
      windInfluenceY: 0,
      rotationalInertia: 0,
    };

    // Build engraving clouds
    const clouds: EngravingCloud[] = [];
    for (let i = 0; i < 5; i++) {
      clouds.push(createCloud(width, height, true));
    }
    cloudsRef.current = clouds;

    // Speed lines
    const speedLines: SpeedLine[] = [];
    for (let i = 0; i < 10; i++) {
      speedLines.push(createSpeedLine(width, height, true));
    }
    speedLinesRef.current = speedLines;

    // Wind wisps
    const wisps: WindWisp[] = [];
    for (let i = 0; i < 4; i++) {
      wisps.push(createWisp(width, height, true));
    }
    wispsRef.current = wisps;

    // Initialize guide circles and sheep
    guideCirclesRef.current = [
      { x: width * 0.28, y: 0, radius: 25, opacity: 0, pulsePhase: 0, scale: 1.0, clicked: false, hillType: 'near', offsetY: 15 },
      { x: width * 0.72, y: 0, radius: 25, opacity: 0, pulsePhase: Math.PI * 0.5, scale: 1.0, clicked: false, hillType: 'mid', offsetY: 15 },
      { x: width * 0.48, y: 0, radius: 25, opacity: 0, pulsePhase: Math.PI, scale: 1.0, clicked: false, hillType: 'near', offsetY: 22 }
    ];
    sheepRef.current = [];
    particlesRef.current = [];
    activeGuideIndexRef.current = -1;
    setActiveGuideIndex(-1);

    // Reset Chapter 3 story phases
    storyStageRef.current = 'summoning';
    setStoryStage('summoning');
    summonedTypesRef.current = [];
    setSummonedTypes([]);
    palaceProgressRef.current = 0;
    setPalaceProgress(0);
    charactersRef.current = [];
    transitionOverlayOpacityRef.current = 0;
    setTransitionOverlayOpacity(0);

    reminisceStepRef.current = 0;
    setReminisceStep(0);
    lightningFlashRef.current = 0.0;
    setLightningFlash(0.0);
    shipXRef.current = -120;
    lastStrikeTimeRef.current = 0;
  };

  const createCloud = (width: number, height: number, randomStart = false): EngravingCloud => {
    return {
      x: Math.random() * width,
      y: randomStart ? Math.random() * (height + 200) - 100 : height + 150,
      width: 280 + Math.random() * 260,
      height: 130 + Math.random() * 110,
      speedY: 0.25 + Math.random() * 0.35, // slow upward drift
      opacity: 0.8 + Math.random() * 0.2,
      influence: 0.85 + Math.random() * 0.15,
    };
  };

  const createSpeedLine = (width: number, height: number, randomStart = false): SpeedLine => {
    return {
      x: Math.random() * width,
      y: randomStart ? Math.random() * height : height + 100,
      length: 50 + Math.random() * 100,
      speedY: 2.5 + Math.random() * 3.5,
      opacity: 0.05 + Math.random() * 0.08,
    };
  };

  const createWisp = (width: number, height: number, randomStart = false): WindWisp => {
    const length = 180 + Math.random() * 220;
    return {
      x: randomStart ? Math.random() * width : -length,
      y: Math.random() * height,
      length,
      speed: 1.5 + Math.random() * 1.8,
      opacity: 0.04 + Math.random() * 0.04,
      amplitude: 12 + Math.random() * 14,
      frequency: 0.003 + Math.random() * 0.003,
      phase: Math.random() * Math.PI * 2,
      width: 0.9 + Math.random() * 1.1,
    };
  };

  // Rewind/Reset to sky
  const handleRewind = () => {
    if (isResetting) return;
    setIsResetting(true);

    // Reset interactive states
    setClickCount(0);
    clickCountRef.current = 0;
    lastClickTimeRef.current = 0;
    activeGuideIndexRef.current = -1;
    setActiveGuideIndex(-1);
    sheepRef.current = [];
    particlesRef.current = [];
    
    // Reset all story progression variables
    storyStageRef.current = 'summoning';
    setStoryStage('summoning');
    summonedTypesRef.current = [];
    setSummonedTypes([]);
    palaceProgressRef.current = 0;
    setPalaceProgress(0);
    charactersRef.current = [];
    transitionOverlayOpacityRef.current = 0;
    setTransitionOverlayOpacity(0);
    
    reminisceStepRef.current = 0;
    setReminisceStep(0);
    lightningFlashRef.current = 0.0;
    setLightningFlash(0.0);
    shipXRef.current = -120;
    lastStrikeTimeRef.current = 0;

    // Re-initialize guide circles
    const w = window.innerWidth;
    const h = window.innerHeight;
    guideCirclesRef.current = [
      { x: w * 0.28, y: h * 0.74, radius: 25, opacity: 0, pulsePhase: 0, scale: 1.0, clicked: false },
      { x: w * 0.72, y: h * 0.81, radius: 25, opacity: 0, pulsePhase: Math.PI * 0.5, scale: 1.0, clicked: false },
      { x: w * 0.48, y: h * 0.71, radius: 25, opacity: 0, pulsePhase: Math.PI, scale: 1.0, clicked: false }
    ];

    // Reset leaf position and dynamics so it can fall gracefully again
    const leaf = leafRef.current;
    if (leaf) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      leaf.x = width * 0.5;
      leaf.y = height * 0.44;
      leaf.angle = Math.random() * Math.PI * 2;
      leaf.speedX = 0;
      leaf.speedY = 0.5 + Math.random() * 0.25;
      leaf.rotationalInertia = 0;
      leaf.windInfluenceX = 0;
      leaf.windInfluenceY = 0;
      leaf.swayPhase = Math.random() * Math.PI * 2;
      leaf.pitchPhase = Math.random() * Math.PI * 2;
      leaf.rollPhase = Math.random() * Math.PI * 2;
    }

    const startVal = progressRef.current;
    const duration = 1500; // 1.5s swift and gorgeous rewind back to blue sky
    const startTime = performance.now();

    const animateRewind = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1.0, elapsed / duration);
      
      // Easing: easeInOutCubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const curVal = startVal * (1 - ease);
      
      setProgress(curVal);
      progressRef.current = curVal;

      if (t < 1.0) {
        requestAnimationFrame(animateRewind);
      } else {
        setIsResetting(false);
      }
    };

    requestAnimationFrame(animateRewind);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    initSimulation(width, height);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    window.addEventListener('resize', handleResize);

    const handlePointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouseCoordsRef.current = { x, y };
    };

    const spawnSheep = (sx: number, sy: number, hType: 'near' | 'mid' | 'far', offsetY: number) => {
      const newSheep: EngravingSheep = {
        x: sx,
        y: sy,
        hillType: hType,
        offsetY,
        scale: 0.76 + Math.random() * 0.16,
        facingLeft: Math.random() > 0.5,
        bouncePhase: Math.PI, // drop/jump bounce
        legsSway: 0,
        opacity: 0,
        eatingTimer: 0
      };
      sheepRef.current.push(newSheep);
      playSheepSound(1.0 + Math.random() * 0.15);
    };

    const spawnGoldParticles = (px: number, py: number) => {
      for (let i = 0; i < 35; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 4.5;
        particlesRef.current.push({
          x: px,
          y: py,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: 1.5 + Math.random() * 3.0,
          alpha: 1.0,
          decay: 0.01 + Math.random() * 0.012,
          color: Math.random() > 0.4 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.95)'
        });
      }
    };

    const spawnNextHistoricalCharacter = () => {
      const currentSummoned = summonedTypesRef.current;
      if (currentSummoned.length === 0) {
        // Spawn 1: Nanyue King (南越王) on Near Hill
        const px = width * 0.22;
        const newChar: HistoricalCharacter = {
          type: 'king',
          x: px,
          y: 0,
          hillType: 'near',
          offsetY: 6,
          scale: 1.05,
          opacity: 0,
          bouncePhase: Math.PI,
          swayPhase: 0
        };
        charactersRef.current.push(newChar);
        summonedTypesRef.current.push('king');
        setSummonedTypes([...summonedTypesRef.current]);
        playChimeBellSound(261.63); // majestic low middle C bell
        spawnGoldParticles(newChar.x, height * 0.78 + 6);
      } else if (currentSummoned.length === 1) {
        // Spawn 2: Artisan (工匠) on Far Hill
        const px = width * 0.82;
        const newChar: HistoricalCharacter = {
          type: 'artisan',
          x: px,
          y: 0,
          hillType: 'far',
          offsetY: 6,
          scale: 0.9,
          opacity: 0,
          bouncePhase: Math.PI,
          swayPhase: 0
        };
        charactersRef.current.push(newChar);
        summonedTypesRef.current.push('artisan');
        setSummonedTypes([...summonedTypesRef.current]);
        playChimeBellSound(329.63); // focused E bell
        spawnGoldParticles(newChar.x, height * 0.58 + 6);
      } else if (currentSummoned.length === 2) {
        // Spawn 3: Priest (祭祀) on Mid Hill
        const px = width * 0.65;
        const newChar: HistoricalCharacter = {
          type: 'priest',
          x: px,
          y: 0,
          hillType: 'mid',
          offsetY: 6,
          scale: 0.98,
          opacity: 0,
          bouncePhase: Math.PI,
          swayPhase: 0
        };
        charactersRef.current.push(newChar);
        summonedTypesRef.current.push('priest');
        setSummonedTypes([...summonedTypesRef.current]);
        playChimeBellSound(392.00); // ringing G bell
        spawnGoldParticles(newChar.x, height * 0.68 + 6);

        // All 3 historical characters are now spawned!
        // Automatically transition to the grand palace construction after 3.2 seconds
        setTimeout(() => {
          if (storyStageRef.current === 'characters') {
            storyStageRef.current = 'palace';
            setStoryStage('palace');
            
            // Grand resonant bronze bell chime chord
            playChimeBellSound(261.63); // low C
            setTimeout(() => playChimeBellSound(329.63), 180); // E
            setTimeout(() => playChimeBellSound(392.00), 360); // G
            setTimeout(() => playChimeBellSound(523.25), 540); // high C
            
            // Spawn gold particle geyser from the center valley where the palace builds
            for (let i = 0; i < 30; i++) {
              setTimeout(() => {
                const px = width * 0.5 + (Math.random() - 0.5) * 80;
                const py = height * 0.68;
                spawnGoldParticles(px, py);
              }, i * 40);
            }
          }
        }, 3200);
      } else {
        // All spawned! manual transition if we click again and haven't transitioned
        if (storyStageRef.current !== 'palace') {
          storyStageRef.current = 'palace';
          setStoryStage('palace');
          
          playChimeBellSound(523.25);
          for (let i = 0; i < 20; i++) {
            const px = width * 0.5 + (Math.random() - 0.5) * 80;
            const py = height * 0.68;
            spawnGoldParticles(px, py);
          }
        } else {
          // All spawned & transitioned! Trigger jumps & sound
          playChimeBellSound(523.25);
          charactersRef.current.forEach(c => {
            c.bouncePhase = Math.PI;
          });
        }
      }
    };

    const triggerWeatherBurst = () => {
      lightningFlashRef.current = 1.0;
      setLightningFlash(1.0);
      lastStrikeTimeRef.current = performance.now();

      // Spawn a wave of clouds, speed lines, and wisps
      const w = canvas.width;
      const h = canvas.height;
      for (let i = 0; i < 8; i++) {
        speedLinesRef.current.push(createSpeedLine(w, h));
      }
      for (let i = 0; i < 4; i++) {
        wispsRef.current.push(createWisp(w, h));
      }

      // Play dramatic sound chords
      playChimeBellSound(130.81); // Deep C3 rumble
      setTimeout(() => playChimeBellSound(146.83), 100); // Deep D3 rumble
    };

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const leaf = leafRef.current;
      if (leaf && progressRef.current >= 0.99) {
        const dx = x - leaf.x;
        const dy = y - leaf.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Allow click transitions if within active clickable stages
        if (dist < 150 && clickCountRef.current < 3) {
          const nextCount = clickCountRef.current + 1;
          clickCountRef.current = nextCount;
          setClickCount(nextCount);
          lastClickTimeRef.current = performance.now();
          return; // Prevent clicking on sheep/guides in the same frame
        }
      }

      // If we are in the Grassland phase (clickCount === 3)
      if (clickCountRef.current === 3) {
        const stage = storyStageRef.current;

        // A. Summoning stage: clicking the guide circles to summon 3 sheep
        if (stage === 'summoning') {
          const curIdx = activeGuideIndexRef.current;
          if (curIdx >= 0 && curIdx <= 2) {
            const targetCircle = guideCirclesRef.current[curIdx];
            if (targetCircle && !targetCircle.clicked) {
              const dx = x - targetCircle.x;
              const dy = y - targetCircle.y;
              const dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < 50) {
                targetCircle.clicked = true;
                spawnSheep(targetCircle.x, targetCircle.y, targetCircle.hillType, targetCircle.offsetY);
                
                // Spawn a burst of sparkling golden particles
                for (let i = 0; i < 24; i++) {
                  const angle = Math.random() * Math.PI * 2;
                  const speed = 1.0 + Math.random() * 3.5;
                  particlesRef.current.push({
                    x: targetCircle.x,
                    y: targetCircle.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1.2,
                    size: 1.5 + Math.random() * 2.5,
                    alpha: 1.0,
                    decay: 0.012 + Math.random() * 0.012,
                    color: Math.random() > 0.45 ? 'rgba(251, 191, 36, 0.9)' : 'rgba(255, 255, 255, 0.9)'
                  });
                }

                // Advance guide index
                const nextIdx = curIdx + 1;
                activeGuideIndexRef.current = nextIdx;
                setActiveGuideIndex(nextIdx);

                if (nextIdx === 3) {
                  // Pause for exactly 2 seconds (2000ms) before entering the transition animation
                  setTimeout(() => {
                    if (storyStageRef.current === 'summoning') {
                      storyStageRef.current = 'transition';
                      setStoryStage('transition');
                      transitionOverlayOpacityRef.current = 1.0;
                      setTransitionOverlayOpacity(1.0);

                      // Play gorgeous series of simulated sheep sound sequences
                      playSheepSound(1.0);
                      setTimeout(() => playSheepSound(1.18), 350);
                      setTimeout(() => playSheepSound(0.88), 750);

                      // Spawn background walking sheep flock (sheep parade across hills)
                      for (let j = 0; j < 12; j++) {
                        const hTypes: ('near'|'mid'|'far')[] = ['far', 'mid', 'near'];
                        const hType = hTypes[j % 3];
                        const offY = hType === 'far' ? 10 : (hType === 'mid' ? 15 : 20);
                        const startX = -100 - j * 90 - Math.random() * 40;
                        sheepRef.current.push({
                          x: startX,
                          y: 0,
                          hillType: hType,
                          offsetY: offY,
                          scale: 0.45 + Math.random() * 0.15 + (hType === 'near' ? 0.22 : 0),
                          facingLeft: false, // walk to right
                          bouncePhase: 0,
                          legsSway: Math.random() * Math.PI,
                          opacity: 0.8,
                          eatingTimer: 0,
                          isBackgroundFlock: true,
                          speedX: 0.8 + Math.random() * 0.5 + (hType === 'near' ? 0.3 : 0)
                        });
                      }

                      // After 4.5 seconds, auto transition to 'shepherd' stage where the shepherd appears
                      setTimeout(() => {
                        storyStageRef.current = 'shepherd';
                        setStoryStage('shepherd');
                        transitionOverlayOpacityRef.current = 0.0;
                        setTransitionOverlayOpacity(0.0);

                        // Spawn the shepherd on the mid hill
                        charactersRef.current.push({
                          type: 'shepherd',
                          x: width * 0.45,
                          y: 0,
                          hillType: 'mid',
                          offsetY: 4,
                          scale: 0.95,
                          opacity: 0,
                          bouncePhase: Math.PI,
                          swayPhase: 0
                        });
                        
                        // Play a welcoming low woodwind chime
                        playChimeBellSound(196.00); // G3 chime
                      }, 4500);
                    }
                  }, 2000);
                }
                return;
              }
            }
          }
        }

        // B. Shepherd and historical characters stages: click the sacred amulet ring to summon figures
        if (stage === 'shepherd' || stage === 'characters') {
          const ringX = width * 0.52;
          const nearY = height * 0.78 + 42 * Math.sin(ringX * 0.006 + 0.5 + timeRef.current * 0.0025);
          const ringY = nearY + 25;
          const dx = x - ringX;
          const dy = y - ringY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 55) {
            if (stage === 'shepherd') {
              storyStageRef.current = 'characters';
              setStoryStage('characters');
            }
            spawnNextHistoricalCharacter();
            return;
          }
        }

        // C. Interactive tapping: make characters bounce and play sound
        for (let i = 0; i < charactersRef.current.length; i++) {
          const c = charactersRef.current[i];
          const dx = x - c.x;
          const dy = y - (c.y - 20); // click offset center up
          if (Math.sqrt(dx * dx + dy * dy) < 45) {
            c.bouncePhase = Math.PI; // trigger jump bounce
            if (c.type === 'king') playChimeBellSound(261.63);
            else if (c.type === 'artisan') playChimeBellSound(329.63);
            else if (c.type === 'priest') playChimeBellSound(392.00);
            else if (c.type === 'shepherd') playSheepSound(1.12);
            return;
          }
        }

        // D. Check if clicked on any already spawned sheep (easter egg bounce!)
        for (let i = 0; i < sheepRef.current.length; i++) {
          const s = sheepRef.current[i];
          const dx = x - s.x;
          // Sheep center is roughly y - 12
          const dy = y - (s.y - 12);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 40) {
            // Make the sheep jump!
            s.bouncePhase = Math.PI; // trigger high jump bounce decay
            s.facingLeft = !s.facingLeft; // turn around
            s.eatingTimer = 0; // look awake!
            playSheepSound(1.0 + Math.random() * 0.2);
            
            // Spawn some tiny wool/cloud dust particles
            for (let j = 0; j < 8; j++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 0.5 + Math.random() * 1.5;
              particlesRef.current.push({
                x: s.x,
                y: s.y - 10,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5,
                size: 1.0 + Math.random() * 2.0,
                alpha: 0.8,
                decay: 0.02 + Math.random() * 0.02,
                color: 'rgba(255, 255, 255, 0.7)'
              });
            }
            return;
          }
        }

        // E. Palace stage clicks: touch anywhere to trigger reminisce stage
        if (stage === 'palace') {
          storyStageRef.current = 'reminisce';
          setStoryStage('reminisce');
          reminisceStepRef.current = 0;
          setReminisceStep(0);
          
          playChimeBellSound(261.63); // Resonant chime
          
          // Spawn golden fireworks at click
          for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 3.0;
            particlesRef.current.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 0.5,
              size: 1.5 + Math.random() * 2.0,
              alpha: 1.0,
              decay: 0.015 + Math.random() * 0.015,
              color: Math.random() > 0.4 ? 'rgba(251, 191, 36, 0.95)' : 'rgba(255, 255, 255, 0.9)'
            });
          }
          return;
        }

        // F. Reminisce narrative text stage: click progresses the beautiful story lines
        if (stage === 'reminisce') {
          const nextStep = reminisceStepRef.current + 1;
          if (nextStep < NARRATIVE_LINES.length) {
            reminisceStepRef.current = nextStep;
            setReminisceStep(nextStep);
            
            const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
            playChimeBellSound(pentatonic[nextStep % pentatonic.length]);

            // Spawn particles at click coordinates
            for (let i = 0; i < 15; i++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 0.5 + Math.random() * 2.5;
              particlesRef.current.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 0.5,
                size: 1.5 + Math.random() * 2.0,
                alpha: 1.0,
                decay: 0.012 + Math.random() * 0.012,
                color: 'rgba(251, 191, 36, 0.92)'
              });
            }
          } else {
            // Narrative ends! Transition to unpredictable weather and leaf outline
            storyStageRef.current = 'ritual_outline';
            setStoryStage('ritual_outline');
            triggerWeatherBurst();
          }
          return;
        }

        // G. Ritual Outline stage: click turns weather turbulent, sheep bleat, artisan builds, interior gold leaf content appears
        if (stage === 'ritual_outline') {
          storyStageRef.current = 'ritual_interior';
          setStoryStage('ritual_interior');
          
          triggerWeatherBurst();
          
          // Play sheep call!
          playSheepSound(1.0);
          setTimeout(() => playSheepSound(1.15), 350);
          return;
        }

        // H. Ritual Interior stage: click turns weather extremely turbulent, screen blackens, restored gold leaf shines!
        if (stage === 'ritual_interior') {
          storyStageRef.current = 'ritual_final';
          setStoryStage('ritual_final');
          
          triggerWeatherBurst();
          
          // Grand chord of complete restoration
          playChimeBellSound(261.63);
          setTimeout(() => playChimeBellSound(329.63), 150);
          setTimeout(() => playChimeBellSound(392.00), 300);
          setTimeout(() => playChimeBellSound(523.25), 450);
          return;
        }

        // I. Ritual Final stage: clicks spawn gold sparks and chimes
        if (stage === 'ritual_final') {
          const pentatonic = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25];
          playChimeBellSound(pentatonic[Math.floor(Math.random() * pentatonic.length)]);
          
          for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.8 + Math.random() * 4.0;
            particlesRef.current.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 0.5,
              size: 2.0 + Math.random() * 3.0,
              alpha: 1.0,
              decay: 0.01 + Math.random() * 0.015,
              color: 'rgba(251, 191, 36, 0.95)'
            });
          }
          return;
        }
      }
    };

    canvas.addEventListener('pointermove', handlePointerMove);
    canvas.addEventListener('click', handleClick);

    let time = 0;
    const startTime = performance.now();

    const evaluateCloudDensity = (x: number, y: number, clouds: EngravingCloud[]): number => {
      let density = 0;
      for (let i = 0; i < clouds.length; i++) {
        const c = clouds[i];
        if (Math.abs(y - c.y) > c.height) continue;

        const dx = x - c.x;
        const dy = y - c.y;
        
        const rx = c.width * 0.5;
        const ry = c.height * 0.5;
        const distSq = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

        if (distSq < 1.0) {
          const factor = Math.cos(distSq * Math.PI * 0.5);
          density += factor * c.influence;
        }
      }
      return Math.min(1.0, density);
    };

    const updateAndRender = () => {
      time += 1;

      // Update transition progress smoothly from 0 to 1 over exactly 10000ms
      let p2Time = 0;
      let grassProgress = 0;
      let glowLevel = 0;

      if (!isResetting) {
        const elapsed = performance.now() - startTime;
        const targetProgress = Math.min(1.0, elapsed / 10000); // 10 seconds transition
        setProgress(targetProgress);
        progressRef.current = targetProgress;
      }

      const curProgress = progressRef.current;

      if (curProgress === 1.0) {
        const clickCountVal = clickCountRef.current;
        const lastClick = lastClickTimeRef.current;
        const leaf = leafRef.current;
        
        let isHovered = false;
        if (leaf) {
          const dx = mouseCoordsRef.current.x - leaf.x;
          const dy = mouseCoordsRef.current.y - leaf.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          isHovered = dist < 150;
        }

        // Dynamically change cursor over the golden leaf
        if (canvas && clickCountVal < 3 && isHovered) {
          canvas.style.cursor = 'pointer';
        } else if (canvas) {
          canvas.style.cursor = 'default';
        }

        if (clickCountVal === 0) {
          // Sleep state: subtle organic heartbeat pulse + hover reaction pulse
          const pulse = 0.22 + 0.12 * Math.sin(time * 0.04);
          glowLevel = isHovered ? pulse + 0.18 : pulse;
          p2Time = 0;
          grassProgress = 0;
        } else if (clickCountVal === 1) {
          const clickElapsed = performance.now() - lastClick;
          p2Time = Math.min(2000, clickElapsed);
          
          if (clickElapsed < 800) {
            // Rise easeOutCubic
            const t = clickElapsed / 800;
            glowLevel = 1.0 - Math.pow(1 - t, 3);
          } else if (clickElapsed < 2000) {
            // Fall easeInCubic
            const t = (clickElapsed - 800) / 1200;
            glowLevel = 1.0 - Math.pow(t, 2);
          } else {
            glowLevel = 0;
          }
          grassProgress = 0;
        } else if (clickCountVal === 2) {
          const clickElapsed = performance.now() - lastClick;
          p2Time = 2000 + Math.min(2000, clickElapsed);
          
          if (clickElapsed < 800) {
            const t = clickElapsed / 800;
            glowLevel = (1.0 - Math.pow(1 - t, 3)) * 1.05;
          } else if (clickElapsed < 2000) {
            const t = (clickElapsed - 800) / 1200;
            glowLevel = (1.0 - Math.pow(t, 2)) * 1.05;
          } else {
            glowLevel = 0;
          }
          grassProgress = 0;
        } else if (clickCountVal === 3) {
          const clickElapsed = performance.now() - lastClick;
          p2Time = 4000 + clickElapsed;
          
          if (clickElapsed < 800) {
            const t = clickElapsed / 800;
            glowLevel = 1.0 - Math.pow(1 - t, 3);
          } else if (clickElapsed < 3500) {
            // Subtle breathing fluctuation (0.95 - 1.05)
            glowLevel = 0.98 + Math.sin(time * 0.08) * 0.06;
          } else {
            // Fades out slowly as it is blown away into the distance
            const windElapsed = clickElapsed - 3500;
            glowLevel = Math.max(0.08, 1.0 - windElapsed / 8000);
          }
          
          // Grassland fades in during the 3.5 seconds of sustained glow
          grassProgress = Math.min(1.0, clickElapsed / 3500);
        }
      } else {
        if (canvas) {
          canvas.style.cursor = 'default';
        }
      }
      setPart2Time(p2Time);

      // --- 1. INTERPOLATE COLOR SPECTRUM (Direct Blue to Pure Velvet Black/Grassland) ---
      // Sky blue rgb(122, 179, 191) -> black rgb(0,0,0) -> deep elegant twilight pasture (15, 30, 20)
      let r = Math.round(122 * (1.0 - curProgress));
      let g = Math.round(179 * (1.0 - curProgress));
      let b = Math.round(191 * (1.0 - curProgress));

      if (grassProgress > 0) {
        r = Math.round(r * (1.0 - grassProgress) + 15 * grassProgress);
        g = Math.round(g * (1.0 - grassProgress) + 30 * grassProgress);
        b = Math.round(b * (1.0 - grassProgress) + 20 * grassProgress);
      }

      const currentStage = storyStageRef.current;
      if (currentStage === 'ritual_outline' || currentStage === 'ritual_interior') {
        // Dark, turbulent stormy charcoal blue
        r = Math.round(r * 0.15 + 8);
        g = Math.round(g * 0.15 + 14);
        b = Math.round(b * 0.15 + 18);
      } else if (currentStage === 'ritual_final') {
        // Complete black out except the golden leaf!
        r = 0;
        g = 0;
        b = 0;
      }

      // Lightning Flash effect
      if (lightningFlashRef.current > 0.01) {
        lightningFlashRef.current -= 0.035; // smooth lightning decay
        const lf = lightningFlashRef.current;
        r = Math.min(255, r + Math.round(230 * lf));
        g = Math.min(255, g + Math.round(210 * lf));
        b = Math.min(255, b + Math.round(190 * lf));
      } else {
        lightningFlashRef.current = 0;
      }

      const skyColor = `rgb(${r}, ${g}, ${b})`;

      // Line color: cream #f7f2e1 -> fades out slightly, so it merges cleanly with black
      const lineAlpha = Math.max(0, 1.0 - curProgress);
      const lineStrokeColor = `rgba(247, 242, 225, ${lineAlpha})`;

      // Fill background sky color
      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, width, height);

      // --- 2. UPDATE CLOUDS (Upward drift, fades during grassland) ---
      cloudsRef.current.forEach((cloud, idx) => {
        const scrollFactor = cloud.speedY * (isResetting ? -3.5 : 1.0);
        cloud.y -= scrollFactor;

        if (cloud.y < -cloud.height) {
          cloudsRef.current[idx] = createCloud(width, height, false);
          cloudsRef.current[idx].y = height + cloud.height;
        } else if (cloud.y > height + cloud.height && isResetting) {
          cloudsRef.current[idx] = createCloud(width, height, false);
          cloudsRef.current[idx].y = -cloud.height;
        }
      });

      // --- 3. RENDER ENGRAVING LINES (Only if they are still visible) ---
      if (lineAlpha > 0.01) {
        const lineGap = 9;
        const xStep = 22;
        ctx.fillStyle = lineStrokeColor;

        for (let y = 0; y < height; y += lineGap) {
          ctx.beginPath();
          let started = false;

          for (let x = 0; x <= width + xStep; x += xStep) {
            const rx = Math.min(width, x);
            const waveVal = Math.sin(rx * 0.016 + y * 0.02 + time * 0.004) * 2.2;
            const targetY = y + waveVal;

            const density = evaluateCloudDensity(rx, targetY, cloudsRef.current);
            const maxThickness = lineGap * 0.94;
            const minThickness = 0.8;
            const thickness = minThickness + (maxThickness - minThickness) * density;

            const topY = targetY - thickness * 0.5;

            if (!started) {
              ctx.moveTo(rx, topY);
              started = true;
            } else {
              ctx.lineTo(rx, topY);
            }
          }

          for (let x = Math.ceil((width + xStep) / xStep) * xStep; x >= 0; x -= xStep) {
            const rx = Math.min(width, x);
            const waveVal = Math.sin(rx * 0.016 + y * 0.02 + time * 0.004) * 2.2;
            const targetY = y + waveVal;

            const density = evaluateCloudDensity(rx, targetY, cloudsRef.current);
            const maxThickness = lineGap * 0.94;
            const minThickness = 0.8;
            const thickness = minThickness + (maxThickness - minThickness) * density;

            const bottomY = targetY + thickness * 0.5;
            ctx.lineTo(rx, bottomY);
          }

          ctx.closePath();
          ctx.fill();
        }
      }

      // --- 4. RENDER SPEED LINES (Vertical guidelines, fades out entirely as grassland appears) ---
      if (grassProgress < 1.0) {
        speedLinesRef.current.forEach((line, idx) => {
          const scrollFactor = line.speedY * (isResetting ? -3.0 : 1.0);
          line.y -= scrollFactor;

          ctx.save();
          const strokeAlpha = curProgress > 0.8 
            ? line.opacity * 0.16 * (1.0 - grassProgress)
            : line.opacity * 0.1 * (1.0 - curProgress);

          ctx.strokeStyle = `rgba(255, 255, 255, ${strokeAlpha})`;
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(line.x, line.y);
          ctx.lineTo(line.x, line.y + line.length);
          ctx.stroke();
          ctx.restore();

          if (line.y < -line.length) {
            speedLinesRef.current[idx] = createSpeedLine(width, height, false);
          } else if (line.y > height && isResetting) {
            speedLinesRef.current[idx] = createSpeedLine(width, height, false);
            speedLinesRef.current[idx].y = -line.length;
          }
        });
      }

      // --- 5. RENDER FLOWING WIND WISPS ---
      wispsRef.current.forEach((wisp, idx) => {
        // Blow faster and tilt diagonally during the grassland transition (wind blowing leaf away)
        const windSpeedMultiplier = 1.0 + grassProgress * 2.8;
        wisp.x += wisp.speed * windSpeedMultiplier;
        wisp.phase += 0.012;

        ctx.save();
        const baseAlpha = wisp.opacity * (1.2 - curProgress * 0.4);
        const wispColor = `rgba(255, 255, 255, ${baseAlpha})`;
        ctx.beginPath();
        ctx.strokeStyle = wispColor;
        ctx.lineWidth = wisp.width * (1.0 + grassProgress * 0.6);
        
        for (let offset = 0; offset < wisp.length; offset += 10) {
          const px = wisp.x + offset;
          // Apply diagonal tilt to wind lines when the strong wind blows (towards top-right)
          const tilt = -offset * 0.42 * grassProgress;
          const py = wisp.y + tilt + Math.sin((px * wisp.frequency) + wisp.phase) * wisp.amplitude;
          
          const edgeFade = Math.sin((offset / wisp.length) * Math.PI);
          ctx.strokeStyle = wispColor.replace(/[\d.]+\)$/, `${parseFloat(wispColor.match(/[\d.]+\)$/)?.[0] || '1') * edgeFade})`);

          if (offset === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.stroke();
        ctx.restore();

        if (wisp.x > width + 100) {
          wispsRef.current[idx] = createWisp(width, height, false);
          wispsRef.current[idx].x = -wispsRef.current[idx].length - 50;
        }
      });

      // --- 6. RENDER GRASSLAND HILLS (草原山丘) ---
      let pastureOpacity = grassProgress;
      if (storyStageRef.current === 'ritual_final') {
        pastureOpacity = Math.max(0, 1.0 - (performance.now() - lastStrikeTimeRef.current) / 2000);
      }

      const drawMerchantShip = (ctx: CanvasRenderingContext2D, sx: number, sy: number) => {
        ctx.save();
        ctx.globalAlpha = pastureOpacity * 0.8;
        ctx.fillStyle = '#0a1410'; 
        ctx.strokeStyle = `rgba(251, 191, 36, ${pastureOpacity * 0.85})`; 
        ctx.lineWidth = 1.3;

        ctx.translate(sx, sy);
        ctx.scale(0.55, 0.55); 

        // Hull
        ctx.beginPath();
        ctx.moveTo(-35, 10);
        ctx.lineTo(35, 10);
        ctx.lineTo(25, 22);
        ctx.lineTo(-25, 22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Masts & Sails (Chinese Junk style)
        const drawSail = (mx: number, h: number, w: number) => {
          ctx.beginPath();
          ctx.moveTo(mx, 10);
          ctx.lineTo(mx, 10 - h);
          ctx.stroke();

          ctx.fillStyle = `rgba(10, 24, 18, ${pastureOpacity * 0.9})`;
          ctx.beginPath();
          ctx.moveTo(mx, 10 - h);
          ctx.quadraticCurveTo(mx + w * 0.6, 10 - h * 0.62, mx, 10 - h * 0.2);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Rib lines
          ctx.beginPath();
          for (let ry = 0.2; ry < 1.0; ry += 0.25) {
            ctx.moveTo(mx, 10 - h * ry);
            ctx.quadraticCurveTo(mx + w * 0.4, 10 - h * (ry + 0.1), mx, 10 - h * (ry + 0.2));
          }
          ctx.stroke();
        };

        drawSail(-12, 38, 22); // Main mast
        drawSail(10, 28, 16);  // Fore mast
        ctx.restore();
      };

      if (pastureOpacity > 0.001) {
        // Increment palace progress if in 'palace' story stage
        if (storyStageRef.current === 'palace') {
          palaceProgressRef.current += (1.0 - palaceProgressRef.current) * 0.015;
          if (palaceProgressRef.current > 0.999) {
            palaceProgressRef.current = 1.0;
          }
          if (Math.abs(palaceProgress - palaceProgressRef.current) > 0.01) {
            setPalaceProgress(palaceProgressRef.current);
          }
        }

        // Slide hills up from the bottom as they fade/rise in
        const hillOffset = (1.0 - grassProgress) * height * 0.42;

        // Wave formulas for 3 layers of rolling hills
        const farY = (x: number) => height * 0.58 + 22 * Math.sin(x * 0.003 + 1.2 + time * 0.002) + hillOffset;
        const midY = (x: number) => height * 0.68 + 32 * Math.sin(x * 0.0045 + 3.8 - time * 0.0015) + hillOffset;
        const nearY = (x: number) => height * 0.78 + 42 * Math.sin(x * 0.006 + 0.5 + time * 0.0025) + hillOffset;

        const getHillY = (x: number, hType: 'near' | 'mid' | 'far') => {
          if (hType === 'far') return farY(x);
          if (hType === 'mid') return midY(x);
          return nearY(x);
        };

        // 1. Far Hill (Background)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, farY(0));
        for (let x = 0; x <= width + 40; x += 40) {
          ctx.lineTo(x, farY(x));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.clip();

        // Draw horizontal scanlines inside Far Hill
        ctx.strokeStyle = `rgba(45, 85, 58, ${pastureOpacity * 0.45})`; // Soft muted dark sage
        ctx.lineWidth = 1.0;
        const farStep = 11;
        const yStartFar = Math.floor((height * 0.4) / farStep) * farStep;
        for (let y = yStartFar; y < height + 50; y += farStep) {
          ctx.beginPath();
          for (let x = 0; x <= width + 30; x += 30) {
            const wave = Math.sin(x * 0.025 + time * 0.01) * 1.5;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }
        ctx.restore();

        // Draw the merchant ship sailing if we are in reminisce stage showing ship lines
        if (storyStageRef.current === 'reminisce' && reminisceStepRef.current >= 7 && reminisceStepRef.current <= 13) {
          shipXRef.current += 0.85;
          if (shipXRef.current > width + 100) {
            shipXRef.current = -100;
          }
          const sy = farY(shipXRef.current) - 10;
          drawMerchantShip(ctx, shipXRef.current, sy);
        }

        // --- DRAW NANYUE PALACE (南越国建筑) ---
        // Center the palace on the mid-hill coordinate at width * 0.52
        if (palaceProgressRef.current > 0.01) {
          const palaceCX = width * 0.52;
          const palaceBaseY = midY(palaceCX);
          drawNanyuePalace(ctx, palaceCX, palaceBaseY, palaceProgressRef.current, time);
        }

        // 2. Mid Hill (Midground)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, midY(0));
        for (let x = 0; x <= width + 40; x += 40) {
          ctx.lineTo(x, midY(x));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.clip();

        // Draw horizontal scanlines inside Mid Hill
        ctx.strokeStyle = `rgba(55, 110, 75, ${pastureOpacity * 0.65})`; // Muted pasture green
        ctx.lineWidth = 1.15;
        const midStep = 9;
        const yStartMid = Math.floor((height * 0.5) / midStep) * midStep;
        for (let y = yStartMid; y < height + 50; y += midStep) {
          ctx.beginPath();
          for (let x = 0; x <= width + 25; x += 25) {
            const wave = Math.sin(x * 0.03 + time * 0.014) * 1.6;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }

        // Draw midground swaying grass blades along ridge
        ctx.strokeStyle = `rgba(60, 125, 85, ${pastureOpacity * 0.65})`;
        ctx.lineWidth = 1.2;
        const midGrassSpacing = 55;
        for (let x = 20; x < width; x += midGrassSpacing) {
          const rx = x + Math.sin(x * 0.05) * 15;
          const ry = midY(rx);
          const sway = Math.sin(time * 0.035 + x * 0.04) * 4.5;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(rx - 3 + sway, ry - 7, rx - 6 + sway * 1.3, ry - 13);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(rx + 4, ry);
          ctx.quadraticCurveTo(rx + 2 + sway, ry - 6, rx + sway * 1.1, ry - 11);
          ctx.stroke();
        }
        ctx.restore();

        // 3. Near Hill (Foreground)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(0, nearY(0));
        for (let x = 0; x <= width + 40; x += 40) {
          ctx.lineTo(x, nearY(x));
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.clip();

        // Draw horizontal scanlines inside Near Hill
        ctx.strokeStyle = `rgba(75, 145, 95, ${pastureOpacity * 0.82})`; // Vibrant hand-drawn green
        ctx.lineWidth = 1.35;
        const nearStep = 7.5;
        const yStartNear = Math.floor((height * 0.6) / nearStep) * nearStep;
        for (let y = yStartNear; y < height + 50; y += nearStep) {
          ctx.beginPath();
          for (let x = 0; x <= width + 20; x += 20) {
            const wave = Math.sin(x * 0.035 + time * 0.018) * 1.8;
            if (x === 0) ctx.moveTo(x, y + wave);
            else ctx.lineTo(x, y + wave);
          }
          ctx.stroke();
        }

        // Draw foreground rich grass blades with delicate elegant gold hints
        ctx.strokeStyle = `rgba(110, 195, 130, ${pastureOpacity * 0.85})`;
        ctx.lineWidth = 1.5;
        const nearGrassSpacing = 40;
        for (let x = 15; x < width; x += nearGrassSpacing) {
          const rx = x + Math.sin(x * 0.08) * 10;
          const ry = nearY(rx);
          const sway = Math.sin(time * 0.045 + x * 0.05) * 6.5;
          
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.quadraticCurveTo(rx - 4 + sway, ry - 9, rx - 8 + sway * 1.4, ry - 16);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rx + 6, ry);
          ctx.quadraticCurveTo(rx + 4 + sway, ry - 7, rx + sway * 1.2, ry - 13);
          ctx.stroke();

          // A gorgeous tiny gold highlight blade on random clusters to match the golden leaves!
          if (x % 120 === 0) {
            ctx.strokeStyle = `rgba(251, 191, 36, ${pastureOpacity * 0.7})`;
            ctx.beginPath();
            ctx.moveTo(rx + 11, ry);
            ctx.quadraticCurveTo(rx + 8 + sway, ry - 11, rx + 4 + sway * 1.5, ry - 18);
            ctx.stroke();
            ctx.strokeStyle = `rgba(110, 195, 130, ${pastureOpacity * 0.85})`;
          }
        }
        ctx.restore();

        // Draw cinematic diagonal speed streaks matching the strong wind gust
        if (pastureOpacity > 0.1) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${pastureOpacity * 0.15})`;
          ctx.lineWidth = 1.2;
          for (let i = 0; i < 5; i++) {
            const streakX = ((time * 7 + i * width * 0.3) % (width * 1.6)) - width * 0.3;
            const streakY = height * 0.7 - i * height * 0.12 - (streakX * 0.42);
            ctx.beginPath();
            ctx.moveTo(streakX, streakY);
            ctx.lineTo(streakX + 180, streakY - 75);
            ctx.stroke();
          }
          ctx.restore();
        }

        // --- 6.5 CHAPTER 3: UPDATE & DRAW INTERACTIVE GUIDE CIRCLES AND LINE-ART SHEEP ---
        if (grassProgress === 1.0 && activeGuideIndexRef.current === -1) {
          activeGuideIndexRef.current = 0;
          setActiveGuideIndex(0);
        }

        const curActiveIdx = activeGuideIndexRef.current;

        // Draw Guide Circles
        guideCirclesRef.current.forEach((circle, i) => {
          // Update dynamic Y position to stay perfectly locked to waving hill
          circle.y = getHillY(circle.x, circle.hillType) - circle.offsetY;

          // Fade in if active, fade out if clicked or not active
          const isActive = (i === curActiveIdx);
          const targetOpacity = circle.clicked ? 0.0 : (isActive ? 1.0 : 0.0);
          circle.opacity += (targetOpacity - circle.opacity) * 0.08;

          if (circle.opacity > 0.01) {
            circle.pulsePhase += 0.045;
            circle.scale = 1.0 + 0.12 * Math.sin(circle.pulsePhase);
            
            const drawY = circle.y;

            // Step A: Draw wide radial aura
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const aura = ctx.createRadialGradient(circle.x, drawY, 0, circle.x, drawY, circle.radius * 2.5 * circle.scale);
            aura.addColorStop(0, `rgba(251, 191, 36, ${circle.opacity * 0.45})`);
            aura.addColorStop(0.4, `rgba(245, 158, 11, ${circle.opacity * 0.22})`);
            aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = aura;
            ctx.beginPath();
            ctx.arc(circle.x, drawY, circle.radius * 2.5 * circle.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // Step B: Draw dashed spinning compass ring (woodblock look)
            ctx.save();
            ctx.strokeStyle = `rgba(251, 191, 36, ${circle.opacity * 0.85})`;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 4]);
            ctx.translate(circle.x, drawY);
            ctx.rotate(time * 0.012);
            ctx.beginPath();
            ctx.arc(0, 0, circle.radius * circle.scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.setLineDash([]);

            // Step C: Draw outer expanding ripple
            const rippleScale = (time * 0.01 + i * 0.5) % 1.8;
            ctx.save();
            ctx.strokeStyle = `rgba(251, 191, 36, ${circle.opacity * (1.0 - rippleScale / 1.8) * 0.72})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(circle.x, drawY, circle.radius * rippleScale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();

            // Step D: Solid core hot spot
            ctx.save();
            ctx.fillStyle = `rgba(251, 191, 36, ${circle.opacity * 0.95})`;
            ctx.beginPath();
            ctx.arc(circle.x, drawY, 4 * circle.scale, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.strokeStyle = `rgba(255, 255, 255, ${circle.opacity * 0.95})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(circle.x, drawY, 7 * circle.scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        });

        // Draw and Update Sheep
        sheepRef.current.forEach((sheep, i) => {
          sheep.opacity += (1.0 - sheep.opacity) * 0.08;
          
          // Stay locked perfectly to the dynamic hill coordinate!
          sheep.y = getHillY(sheep.x, sheep.hillType) - sheep.offsetY;

          // Decaying landing bounce phase
          let bounceY = 0;
          if (sheep.bouncePhase > 0) {
            sheep.bouncePhase -= 0.085;
            if (sheep.bouncePhase < 0) sheep.bouncePhase = 0;
            bounceY = Math.abs(Math.sin(sheep.bouncePhase)) * 16 * (sheep.bouncePhase / Math.PI);
          }

          // Dynamic walk behaviors for background flock vs active grazing sheep
          if (sheep.isBackgroundFlock && sheep.speedX) {
            // Background walking flock behaviors
            sheep.legsSway += 0.16;
            sheep.x += sheep.speedX;
            // Naturally fade in and out as they cross bounds
            if (sheep.x < 50) {
              sheep.opacity = Math.max(0, sheep.x / 50);
            } else if (sheep.x > width - 100) {
              sheep.opacity = Math.max(0, (width - sheep.x) / 100);
            } else {
              sheep.opacity = 0.8;
            }
          } else {
            // Standard grazing/eating and standing AI behavior
            if (sheep.eatingTimer > 0) {
              sheep.eatingTimer--;
              sheep.legsSway = 0;
            } else {
              if (Math.random() < 0.003) {
                sheep.eatingTimer = 80 + Math.floor(Math.random() * 90);
              }
              if (Math.random() < 0.004) {
                sheep.facingLeft = !sheep.facingLeft;
              }
              if (Math.random() < 0.3 && sheep.bouncePhase === 0) {
                sheep.legsSway += 0.12;
                sheep.x += sheep.facingLeft ? -0.16 : 0.16;
                // Keep within screen bounds
                sheep.x = Math.max(width * 0.08, Math.min(width * 0.92, sheep.x));
              }
            }
          }

          // Final draw Y position
          const drawY = sheep.y - bounceY;

          // Render the hand-drawn engraving sheep
          ctx.save();
          ctx.translate(sheep.x, drawY);
          ctx.scale(sheep.scale * (sheep.facingLeft ? -1 : 1), sheep.scale);
          
          // Breathe / stretch slightly
          const breatheStretchX = 1.0 + Math.sin(time * 0.045 + i) * 0.012;
          const breatheStretchY = 1.0 + Math.cos(time * 0.045 + i) * 0.012;
          ctx.scale(breatheStretchX, breatheStretchY);
          ctx.globalAlpha = sheep.opacity * pastureOpacity; // match hill fade

          // 1. Sheep fluff body (clouds of wool)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.fillStyle = '#0a1410'; // Deep dark green backdrop mask
          
          ctx.beginPath();
          ctx.moveTo(-16, -10);
          ctx.quadraticCurveTo(-24, -14, -18, -22); // Rear hump
          ctx.quadraticCurveTo(-16, -32, -6, -28);  // Top back
          ctx.quadraticCurveTo(4, -34, 12, -26);   // Top front
          ctx.quadraticCurveTo(22, -22, 16, -14);   // Front shoulder
          ctx.quadraticCurveTo(14, -6, 2, -8);     // Front bottom
          ctx.quadraticCurveTo(-8, -6, -16, -10);   // Rear bottom
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // 2. Fine-line engraving/hatching wool spirals
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 0.85;
          for (let ix = -12; ix <= 10; ix += 5.5) {
            ctx.beginPath();
            ctx.arc(ix, -18 + Math.sin(ix * 0.15) * 1.5, 4.5, 0.4 * Math.PI, 1.8 * Math.PI);
            ctx.stroke();
          }

          // Magical gold curl spirals (connecting them to the golden leaf)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(-3, -16, 5, 0.25 * Math.PI, 1.45 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(5, -20, 4, 0.45 * Math.PI, 1.65 * Math.PI);
          ctx.stroke();

          // 3. Cute little stick legs
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          
          const walkSway = Math.sin(sheep.legsSway);
          // Leg 1 (Front Left)
          ctx.beginPath();
          ctx.moveTo(7, -8);
          ctx.lineTo(8 + walkSway * 2.2, 4);
          ctx.stroke();

          // Leg 2 (Front Right)
          ctx.beginPath();
          ctx.moveTo(12, -8);
          ctx.lineTo(11 - walkSway * 2.2, 4);
          ctx.stroke();

          // Leg 3 (Back Left)
          ctx.beginPath();
          ctx.moveTo(-9, -9);
          ctx.lineTo(-8 - walkSway * 2.2, 4);
          ctx.stroke();

          // Leg 4 (Back Right)
          ctx.beginPath();
          ctx.moveTo(-13, -9);
          ctx.lineTo(-12 + walkSway * 2.2, 4);
          ctx.stroke();

          // 4. Elegant head & ears (animated lowering for grazing)
          const isEating = sheep.eatingTimer > 0;
          const headAngle = isEating ? 0.42 + Math.sin(time * 0.18) * 0.12 : Math.sin(time * 0.04) * 0.05;
          const headX = 18;
          const headY = -18;

          ctx.save();
          ctx.translate(headX, headY);
          ctx.rotate(headAngle);

          // Head outline
          ctx.fillStyle = '#0a1410';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.35;
          ctx.beginPath();
          ctx.ellipse(4, 2, 7.2, 5.2, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Floppy Ear
          ctx.beginPath();
          ctx.ellipse(-1, -1, 4.2, 1.8, -0.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Elegant Golden Horn (Ram horns!)
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.88)';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.arc(-2, -3.2, 3.8, 1.0 * Math.PI, 2.6 * Math.PI);
          ctx.stroke();

          ctx.restore();

          // 5. Tail
          ctx.save();
          ctx.translate(-18, -15);
          ctx.rotate(Math.sin(time * 0.12) * 0.25);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.3;
          ctx.beginPath();
          ctx.ellipse(-2, 0, 3, 1.5, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();

          ctx.restore();
        });

        // --- DRAW HISTORICAL CHARACTERS ---
        charactersRef.current.forEach((c) => {
          c.opacity += (1.0 - c.opacity) * 0.06;
          c.y = getHillY(c.x, c.hillType) - c.offsetY;

          let bounceY = 0;
          if (c.bouncePhase > 0) {
            c.bouncePhase -= 0.085;
            if (c.bouncePhase < 0) c.bouncePhase = 0;
            bounceY = Math.abs(Math.sin(c.bouncePhase)) * 25 * (c.bouncePhase / Math.PI);
          }

          c.swayPhase += 0.025;
          const swayAngle = Math.sin(c.swayPhase) * 0.025;

          const drawY = c.y - bounceY;

          ctx.save();
          ctx.translate(c.x, drawY);
          ctx.scale(c.scale, c.scale);
          ctx.rotate(swayAngle);
          ctx.globalAlpha = c.opacity * pastureOpacity;

          ctx.lineWidth = 1.6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          if (c.type === 'shepherd') {
            // Shepherd styling: rustic green robe, big conical hat, holding staff
            ctx.fillStyle = '#fcf8f2';
            ctx.strokeStyle = '#2d553a';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-6, -26);
            ctx.lineTo(6, -26);
            ctx.lineTo(10, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Head
            ctx.beginPath();
            ctx.arc(0, -32, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#fdfbf7';
            ctx.fill();
            ctx.stroke();

            // Conical Hat
            ctx.fillStyle = '#fbf1c7';
            ctx.strokeStyle = '#2d553a';
            ctx.beginPath();
            ctx.moveTo(-16, -34);
            ctx.lineTo(0, -45);
            ctx.lineTo(16, -34);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Wooden crook staff
            ctx.strokeStyle = '#795548';
            ctx.beginPath();
            ctx.moveTo(11, -38);
            ctx.lineTo(8, 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(13, -38, 3, Math.PI, Math.PI * 2, false);
            ctx.stroke();

            // Explicit woodblock label
            ctx.fillStyle = 'rgba(45, 85, 58, 0.72)';
            ctx.font = 'bold 11px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText("牧羊人", 0, -52);

          } else if (c.type === 'king') {
            // King styling: elegant royal robes, holding jade bi scepter
            ctx.fillStyle = '#fbf1c7';
            ctx.strokeStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(-12, 0);
            ctx.lineTo(-8, -32);
            ctx.lineTo(8, -32);
            ctx.lineTo(12, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Belt
            ctx.strokeStyle = '#fbbf24';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(-9, -15);
            ctx.lineTo(9, -15);
            ctx.stroke();
            ctx.lineWidth = 1.6;

            // Head
            ctx.fillStyle = '#fdfbf7';
            ctx.strokeStyle = '#991b1b';
            ctx.beginPath();
            ctx.arc(0, -39, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Tall imperial crown
            ctx.fillStyle = '#fbbf24';
            ctx.strokeStyle = '#991b1b';
            ctx.beginPath();
            ctx.moveTo(-6, -45);
            ctx.lineTo(-6, -55);
            ctx.lineTo(6, -55);
            ctx.lineTo(6, -45);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Jade Bi
            ctx.fillStyle = '#6ee7b7';
            ctx.strokeStyle = '#047857';
            ctx.beginPath();
            ctx.arc(0, -22, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Explicit label
            ctx.fillStyle = 'rgba(153, 27, 27, 0.85)';
            ctx.font = 'bold 11px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText("南越王赵眜", 0, -62);

          } else if (c.type === 'artisan') {
            // Artisan styling: tool belt, carrying hammer
            ctx.fillStyle = '#f1f5f9';
            ctx.strokeStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-7, -28);
            ctx.lineTo(7, -28);
            ctx.lineTo(10, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Apron
            ctx.fillStyle = '#3b82f6';
            ctx.beginPath();
            ctx.moveTo(-5, -16);
            ctx.lineTo(5, -16);
            ctx.lineTo(4, 0);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Head
            ctx.fillStyle = '#fdfbf7';
            ctx.strokeStyle = '#1e3a8a';
            ctx.beginPath();
            ctx.arc(0, -34, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Headband
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(-8, -36);
            ctx.lineTo(8, -36);
            ctx.stroke();
            ctx.lineWidth = 1.6;

            // Hammer
            ctx.strokeStyle = '#4b5563';
            ctx.beginPath();
            ctx.moveTo(-9, -24);
            ctx.lineTo(-9, -8);
            ctx.stroke();
            ctx.fillStyle = '#1f2937';
            ctx.fillRect(-13, -24, 8, 4);
            ctx.strokeRect(-13, -24, 8, 4);

            // Explicit label
            ctx.fillStyle = 'rgba(30, 58, 138, 0.85)';
            ctx.font = 'bold 11px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText("百越工匠", 0, -50);

          } else if (c.type === 'priest') {
            // Priest styling: feather crown robes, holding staff
            ctx.fillStyle = '#fae8ff';
            ctx.strokeStyle = '#581c87';
            ctx.beginPath();
            ctx.moveTo(-11, 0);
            ctx.lineTo(-7, -30);
            ctx.lineTo(7, -30);
            ctx.lineTo(11, 0);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Head
            ctx.fillStyle = '#fdfbf7';
            ctx.strokeStyle = '#581c87';
            ctx.beginPath();
            ctx.arc(0, -36, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Feathers
            ctx.fillStyle = '#f3e8ff';
            ctx.strokeStyle = '#581c87';
            ctx.beginPath();
            ctx.moveTo(-5, -42);
            ctx.quadraticCurveTo(-11, -56, -6, -58);
            ctx.quadraticCurveTo(-2, -50, 0, -42);
            ctx.fill();
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(5, -42);
            ctx.quadraticCurveTo(11, -56, 6, -58);
            ctx.quadraticCurveTo(2, -50, 0, -42);
            ctx.fill();
            ctx.stroke();

            // Staff
            ctx.strokeStyle = '#a21caf';
            ctx.beginPath();
            ctx.moveTo(-10, -28);
            ctx.lineTo(-10, 4);
            ctx.stroke();
            ctx.fillStyle = '#e879f9';
            ctx.beginPath();
            ctx.arc(-10, -28, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Explicit label
            ctx.fillStyle = 'rgba(88, 28, 135, 0.85)';
            ctx.font = 'bold 11px Inter, system-ui';
            ctx.textAlign = 'center';
            ctx.fillText("大祭司", 0, -66);
          }

          ctx.restore();
        });

        // --- DRAW SACRED COMPASS AMULET RING ---
        const stageVal = storyStageRef.current;
        if (stageVal === 'shepherd' || stageVal === 'characters') {
          const ringX = width * 0.52;
          const ringY = nearY(ringX) + 25;
          
          ctx.save();
          const ringPulse = 1.0 + 0.15 * Math.sin(time * 0.05);
          ctx.globalCompositeOperation = 'lighter';
          const ringGrad = ctx.createRadialGradient(ringX, ringY, 0, ringX, ringY, 48 * ringPulse);
          ringGrad.addColorStop(0, 'rgba(251, 191, 36, 0.42)');
          ringGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
          ringGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = ringGrad;
          ctx.beginPath();
          ctx.arc(ringX, ringY, 48 * ringPulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // Outer rotating compass lines
          ctx.save();
          ctx.strokeStyle = 'rgba(251, 191, 36, 0.88)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([6, 4]);
          ctx.translate(ringX, ringY);
          ctx.rotate(-time * 0.008);
          ctx.beginPath();
          ctx.arc(0, 0, 22, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([3, 5]);
          ctx.translate(ringX, ringY);
          ctx.rotate(time * 0.015);
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          ctx.setLineDash([]);

          // Glowing gold core
          ctx.save();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.98)';
          ctx.beginPath();
          ctx.arc(ringX, ringY, 6, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(ringX, ringY, 11, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Soft golden floating tooltip text
          ctx.save();
          ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
          ctx.font = 'bold 11px Inter, system-ui';
          ctx.textAlign = 'center';
          const summonText = stageVal === 'shepherd' ? "唤醒古老圣迹" : "叩问南越文明";
          ctx.fillText(summonText, ringX, ringY - 42);
          ctx.restore();
        }

        // --- DRAW BLACK OVERLAY WITH TRANSITION DIALOGUES ---
        if (transitionOverlayOpacityRef.current > 0.01) {
          ctx.save();
          ctx.fillStyle = `rgba(10, 20, 16, ${transitionOverlayOpacityRef.current})`;
          ctx.fillRect(0, 0, width, height);
          
          ctx.fillStyle = 'rgba(251, 191, 36, ' + transitionOverlayOpacityRef.current + ')';
          ctx.font = 'italic 16px Inter, "Playfair Display", serif';
          ctx.textAlign = 'center';
          ctx.fillText("长风拂过草原，千载岁月悠悠回响...", width * 0.5, height * 0.48);
          
          ctx.fillStyle = 'rgba(255, 255, 255, ' + transitionOverlayOpacityRef.current * 0.6 + ')';
          ctx.font = '12px Inter, system-ui';
          ctx.fillText("（羊群在低诉，牧羊人自远方缓缓走来）", width * 0.5, height * 0.54);
          ctx.restore();
        }
      }

      // --- 7. UPDATE AND RENDER SINGLE LEAF (Camera Locked) ---
      const leaf = leafRef.current;
      if (leaf) {
        // Natural extremely gentle wind wobble
        const ambientWindX = 0.12 * Math.sin(time * 0.003) + 0.06 * Math.cos(time * 0.006) + 0.06;
        const ambientWindY = 0.02 * Math.sin(time * 0.004);

        leaf.windInfluenceX *= 0.96;
        leaf.windInfluenceY *= 0.96;
        leaf.rotationalInertia *= 0.96;

        leaf.swayPhase += leaf.swaySpeed;
        leaf.pitchPhase += leaf.pitchSpeed;
        leaf.rollPhase += leaf.rollSpeed;

        const landProgress = Math.min(1.0, curProgress);

        const clickCountVal = clickCountRef.current;
        const lastClick = lastClickTimeRef.current;
        const clickElapsed = landProgress === 1.0 ? (performance.now() - lastClick) : 0;

        if (landProgress === 1.0 && clickCountVal === 3 && clickElapsed >= 3500) {
          // --- PHYSICS: BLOWN AWAY TO TOP-RIGHT (Extremely slow and graceful) ---
          const windElapsed = clickElapsed - 3500;
          
          // Gently build very tiny wind forces so it drifts like a dream
          const windForceX = 0.012 + (windElapsed * 0.000001);
          const windForceY = -0.008 - (windElapsed * 0.0000008);
          
          leaf.speedX = (leaf.speedX || 0) + windForceX;
          leaf.speedY = (leaf.speedY || 0) + windForceY;
          
          // Apply high elegant dampening to cap terminal velocity extremely low
          leaf.speedX *= 0.94;
          leaf.speedY *= 0.94;
          
          leaf.x += leaf.speedX;
          leaf.y += leaf.speedY;
          
          // Spin and roll with ultra-gentle wind-vibe rotation
          leaf.angle += 0.006;
          leaf.rollPhase += 0.008;
          leaf.pitchPhase += 0.006;
        } else {
          // Reset speed parameters for next wind blow
          leaf.speedX = 0;
          leaf.speedY = 0;

          const currentStage = storyStageRef.current;
          if (currentStage === 'ritual_outline' || currentStage === 'ritual_interior' || currentStage === 'ritual_final') {
            // center on the screen and float gracefully above the blackout
            const targetX = width * 0.5;
            const targetY = height * 0.44;
            const floatOffset = Math.sin(time * 0.035) * 11;
            leaf.x += (targetX - leaf.x) * 0.08;
            leaf.y += (targetY + floatOffset - leaf.y) * 0.08;

            // rotate erect (fully face-up)
            const targetAngle = 0.0;
            const diff = targetAngle - leaf.angle;
            const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
            leaf.angle += wrappedDiff * 0.08;

            // smooth reset of roll and pitch phases so it lays flat facing the viewer
            leaf.rollPhase += (0 - leaf.rollPhase) * 0.08;
            leaf.pitchPhase += (0 - leaf.pitchPhase) * 0.08;
          } else {
            // --- STANDARD DESCENDING / RESTING BEHAVIOR ---
            const targetX = width * 0.5;
            const swayOffset = Math.sin(leaf.swayPhase) * leaf.swayAmplitude * (1.0 - landProgress * 0.85);
            leaf.x += (targetX + swayOffset + leaf.windInfluenceX - leaf.x) * 0.05;

            // Leaf descends to the bottom (82% of height) to lie on the ground as progress goes to 1.0
            const targetY = height * (0.44 + landProgress * 0.38);
            leaf.y += (targetY + leaf.windInfluenceY - leaf.y) * 0.05;

            // Dampen rotation to lay flat and peaceful on the ground
            const currentSpin = leaf.spinSpeed * (1.0 - landProgress * 0.95);
            leaf.angle += currentSpin + leaf.rotationalInertia * 0.05 * (1.0 - landProgress * 0.95);
            
            if (landProgress > 0.7) {
              const landT = (landProgress - 0.7) / 0.3; // 0 to 1
              // Smoothly guide leaf to rest flat (nearly horizontal, say 1.15 radians)
              const restAngle = 1.15;
              const diff = restAngle - leaf.angle;
              const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
              leaf.angle += wrappedDiff * landT * 0.08;
            }
          }
        }

        // Override glowLevel for ritual stages
        const stageForGlow = storyStageRef.current;
        if (stageForGlow === 'ritual_outline') {
          glowLevel = 0.38 + Math.sin(time * 0.05) * 0.12;
        } else if (stageForGlow === 'ritual_interior') {
          glowLevel = 0.88 + Math.sin(time * 0.065) * 0.22;
        } else if (stageForGlow === 'ritual_final') {
          glowLevel = 1.95 + Math.sin(time * 0.08) * 0.35;
        }

        // Render leaf with 3D folding scales
        ctx.save();
        
        // --- EXTRA LUMINOUS LIGHT BULB GLOW BULB (Global coordinate system to prevent squashing) ---
        if (glowLevel > 0) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          
          let glowScale = 1.0;
          if (landProgress === 1.0 && clickCountVal === 3 && clickElapsed >= 3500) {
            const windElapsed = clickElapsed - 3500;
            glowScale = Math.max(0.15, 1.0 - (windElapsed / 8000) * 0.8);
          }
          const baseSize = leaf.size * glowScale;

          // Layer 1: Core Intense Light Bulb Filament (blinding white-gold)
          const coreGrad = ctx.createRadialGradient(leaf.x, leaf.y, 0, leaf.x, leaf.y, baseSize * 0.45);
          coreGrad.addColorStop(0, `rgba(255, 255, 255, ${glowLevel * 1.0})`);
          coreGrad.addColorStop(0.25, `rgba(255, 250, 210, ${glowLevel * 1.0})`);
          coreGrad.addColorStop(0.6, `rgba(251, 191, 36, ${glowLevel * 0.95})`);
          coreGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
          ctx.fillStyle = coreGrad;
          ctx.beginPath();
          ctx.arc(leaf.x, leaf.y, baseSize * 0.45, 0, Math.PI * 2);
          ctx.fill();

          // Layer 2: Medium Radiant Halo (saturated gold aura)
          const midGrad = ctx.createRadialGradient(leaf.x, leaf.y, 0, leaf.x, leaf.y, baseSize * 1.3);
          midGrad.addColorStop(0, `rgba(251, 191, 36, ${glowLevel * 0.95})`);
          midGrad.addColorStop(0.4, `rgba(245, 158, 11, ${glowLevel * 0.7})`);
          midGrad.addColorStop(1, 'rgba(217, 119, 6, 0)');
          ctx.fillStyle = midGrad;
          ctx.beginPath();
          ctx.arc(leaf.x, leaf.y, baseSize * 1.3, 0, Math.PI * 2);
          ctx.fill();

          // Layer 3: Ultra-wide Soft Atmospheric Bloom (large volumetric dispersion)
          const wideGrad = ctx.createRadialGradient(leaf.x, leaf.y, 0, leaf.x, leaf.y, baseSize * 3.0);
          wideGrad.addColorStop(0, `rgba(251, 191, 36, ${glowLevel * 0.65})`);
          wideGrad.addColorStop(0.45, `rgba(217, 119, 6, ${glowLevel * 0.3})`);
          wideGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = wideGrad;
          ctx.beginPath();
          ctx.arc(leaf.x, leaf.y, baseSize * 3.0, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        ctx.translate(leaf.x, leaf.y);
        ctx.rotate(leaf.angle);

        const normalScaleX = Math.cos(leaf.rollPhase) * 0.82 + 0.18;
        const normalScaleY = Math.sin(leaf.pitchPhase) * 0.74 + 0.26;
        
        // As it lands, it lies flat: roll/pitch slows down and scales flatten
        const flatScaleX = 0.95;
        const flatScaleY = 0.35; // squashed 3D perspective lying flat
        
        let scaleX = normalScaleX * (1.0 - landProgress) + flatScaleX * landProgress;
        let scaleY = normalScaleY * (1.0 - landProgress) + flatScaleY * landProgress;

        const stage = storyStageRef.current;
        if (stage === 'ritual_outline' || stage === 'ritual_interior' || stage === 'ritual_final') {
          // Perfectly erect and large for magnificent detail visibility
          scaleX = 1.35;
          scaleY = 1.35;
        } else if (landProgress === 1.0 && clickCountVal === 3 && clickElapsed >= 3500) {
          const windElapsed = clickElapsed - 3500;
          const distScale = Math.max(0.15, 1.0 - (windElapsed / 8000) * 0.8);
          scaleX *= distScale;
          scaleY *= distScale;
        }

        ctx.scale(scaleX, scaleY);

        const size = leaf.size;

        // Draw the stunning engraved gold leaf (transparent base, golden lines)
        let shadowColor: string;
        let shadowBlur = 0;

        if (curProgress < 0.8) {
          const t = curProgress / 0.8;
          const s_r = Math.round(245 + (251 - 245) * t);
          const s_g = Math.round(158 + (191 - 158) * t);
          const s_b = Math.round(11 + (36 - 11) * t);
          const s_a = 0.65 - t * 0.45;
          shadowColor = `rgba(${s_r}, ${s_g}, ${s_b}, ${s_a})`;
          shadowBlur = 15 - 9 * t;
        } else {
          shadowColor = `rgba(217, 119, 6, ${glowLevel * 0.55})`;
          shadowBlur = 4 + glowLevel * 18;
        }

        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;

        // Hide during initial storytelling stages and fade in during ritual_outline
        let leafAlpha = 0.95;
        if (stage === 'shepherd' || stage === 'characters' || stage === 'palace' || stage === 'reminisce') {
          leafAlpha = 0;
        } else if (stage === 'ritual_outline') {
          const elapsed = performance.now() - lastStrikeTimeRef.current;
          leafAlpha = Math.min(0.95, elapsed / 2000);
        }

        if (leafAlpha > 0.01) {
          let drawMode: 'solid' | 'outline' | 'engraved' = 'engraved';
          if (stage === 'summoning' || stage === 'transition') {
            drawMode = 'solid';
          } else if (stage === 'ritual_outline') {
            drawMode = 'outline';
          }
          drawEngravedGoldLeaf(ctx, size, leafAlpha, drawMode, glowLevel);
        }

        ctx.restore();
      }

      // --- 8. UPDATE AND DRAW GOLD SPARKLES (Magical particle effects) ---
      if (particlesRef.current.length > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        particlesRef.current.forEach((spark) => {
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.alpha -= spark.decay;
          
          if (spark.alpha > 0.01) {
            ctx.globalAlpha = spark.alpha;
            ctx.fillStyle = spark.color;
            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
        particlesRef.current = particlesRef.current.filter(p => p.alpha > 0.01);
      }

      animationId = requestAnimationFrame(updateAndRender);
    };

    updateAndRender();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('pointermove', handlePointerMove);
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [isResetting]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none" id="main-container">
      {/* Background canvas */}
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-default"
        id="falling-leaf-canvas"
      />

      {/* Elegant Return back to Sky trigger (appears in black stage) */}
      <div 
        className={`absolute top-6 right-6 transition-all duration-1000 ease-in-out ${
          progress > 0.95 && !isResetting ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95 pointer-events-none'
        }`}
        id="rewind-button-container"
      >
        <button
          onClick={handleRewind}
          className="px-5 py-2.5 rounded-none border-2 border-white bg-black text-white hover:bg-white hover:text-black hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.3)] active:translate-y-0.5 transition-all duration-200 cursor-pointer text-xs tracking-widest font-mono"
        >
          重温晴空 / RETURN TO SKY
        </button>
      </div>

      {/* Retro Altitudinal Indicators */}
      <div 
        className="absolute top-6 left-6 flex flex-col gap-1 pointer-events-none font-mono text-[10px] md:text-xs text-white mix-blend-difference"
        id="metadata-meter"
      >
        <div>
          高度 / ALTITUDE: {
            progress < 1.0 
              ? Math.max(0, Math.round(3500 - progress * 3500)) 
              : (clickCount === 3 && (part2Time - 4000) >= 3500)
                ? Math.round(((part2Time - 4000) - 3500) * 0.08)
                : 0
          }m
        </div>
        <div>
          状态 / STATE: {
            progress < 1.0 
              ? (progress > 0.7 ? '夜色将至' : progress > 0.35 ? '晴空流云' : '御风初绽')
              : clickCount === 0
                ? '金叶沉睡 / SLEEPING'
                : clickCount === 1
                  ? '一重灵觉 / FIRST AWAKENING'
                  : clickCount === 2
                    ? '双宿灵犀 / SECOND AWAKENING'
                    : (part2Time - 4000) >= 3500
                      ? '随风入原 / MEADOW DRIFT'
                      : '金光凝驻 / CHERISHED GLOW'
          }
        </div>
      </div>

      {/* Dynamic Chapter Instruction Overlay */}
      {progress > 0.95 && !isResetting && clickCount < 3 && (
        <div 
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none text-center select-none animate-fade-in"
          id="chapter2-instructions"
        >
          <div className="text-amber-100/40 text-[10px] md:text-xs tracking-[0.25em] font-mono uppercase animate-pulse">
            {clickCount === 0 
              ? "✦ 触碰金叶 唤醒灵光 ✦" 
              : clickCount === 1 
                ? "✦ 灵光苏醒 再抚一次 ✦" 
                : "✦ 孤叶轻颤 即将御风 ✦"}
          </div>
          <div className="text-amber-200/90 text-[10px] md:text-xs tracking-widest font-sans font-light">
            {clickCount === 0 
              ? "CLICK ON THE GOLDEN LEAF TO AWAKEN THE SPIRIT LIGHT" 
              : clickCount === 1 
                ? "TOUCH ONCE MORE TO DEEPEN THE CONNECTION" 
                : "ONE LAST TAP TO SET THE WIND IN MOTION"}
          </div>
        </div>
      )}

      {/* Chapter 3 Grassland Interaction Overlay */}
      {progress > 0.95 && !isResetting && clickCount === 3 && (
        <div 
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none text-center select-none"
          id="chapter3-instructions"
        >
          <div className="text-amber-100/45 text-[10px] md:text-xs tracking-[0.25em] font-mono uppercase animate-pulse">
            {storyStage === 'summoning' && activeGuideIndex === 0 && "✦ 星芒指引 叩草灵现 ✦"}
            {storyStage === 'summoning' && activeGuideIndex === 1 && "✦ 旷野微光 繁星有约 ✦"}
            {storyStage === 'summoning' && activeGuideIndex === 2 && "✦ 浅草吟梦 仙音和歌 ✦"}
            {storyStage === 'transition' && "✦ 长风浩荡 岁月悠悠 ✦"}
            {storyStage === 'shepherd' && "✦ 牧野古声 唤醒圣迹 ✦"}
            {storyStage === 'characters' && summonedTypes.length === 1 && "✦ 南越王现 续叩古道 ✦"}
            {storyStage === 'characters' && summonedTypes.length === 2 && "✦ 工匠毕至 三抚灵犀 ✦"}
            {storyStage === 'characters' && summonedTypes.length >= 3 && "✦ 华夏神音 亘古齐鸣 ✦"}
            {storyStage === 'palace' && "✦ 南越盛景 宫殿初成 ✦"}
          </div>
          <div className="text-amber-200/90 text-[10px] md:text-xs tracking-widest font-sans font-light px-4">
            {storyStage === 'summoning' && activeGuideIndex === 0 && "TAP THE FIRST GLOWING GUIDE COMPASS TO SUMMON THE SHEEP"}
            {storyStage === 'summoning' && activeGuideIndex === 1 && "TAP THE SECOND GLOWING GUIDE COMPASS TO SUMMON THE NEXT SHEEP"}
            {storyStage === 'summoning' && activeGuideIndex === 2 && "TAP THE THIRD GLOWING GUIDE COMPASS TO SUMMON THE FINAL SHEEP"}
            {storyStage === 'transition' && "A THOUSAND YEARS OF ANCIENT NANYUE ECHO IN THE WIND"}
            {storyStage === 'shepherd' && "CLICK THE GLOWING COMPASS RING TO AWAKEN THE IMPERIAL KING"}
            {storyStage === 'characters' && summonedTypes.length === 1 && "CLICK THE COMPASS RING TO AWAKEN THE ANCIENT ARTISAN"}
            {storyStage === 'characters' && summonedTypes.length === 2 && "CLICK THE COMPASS RING TO AWAKEN THE MYSTICAL PRIEST"}
            {storyStage === 'characters' && summonedTypes.length >= 3 && "TAP ANY ANCIENT CHARACTER OR SHEEP TO HEAR RESONATING BRONZE CHIMES"}
            {storyStage === 'palace' && "TAP ANYWHERE TO PLAY THE SACRED CHINESE PENTATONIC CHIMES OVER THE GLOWING NANYUE PALACE"}
          </div>
        </div>
      )}

      {/* Narrative Line-by-Line Story Overlay (Reminisce Stage) */}
      {storyStage === 'reminisce' && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 animate-fade-in"
          id="reminisce-narrative-container"
        >
          <div className="max-w-2xl px-6 text-center flex flex-col items-center gap-6">
            <p className="text-amber-100 font-serif text-2xl md:text-3xl tracking-[0.35em] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              {NARRATIVE_LINES[reminisceStep]}
            </p>
            <span className="text-amber-200/40 font-mono text-[9px] md:text-[10px] tracking-[0.4em] uppercase mt-4 animate-pulse">
              ✦ 点击画面继续 / CLICK ANYWHERE TO CONTINUE ✦
            </span>
          </div>
        </div>
      )}

      {/* Ritual Outline instructions */}
      {storyStage === 'ritual_outline' && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 animate-fade-in"
          id="ritual-outline-narrative-container"
        >
          <div className="max-w-xl px-6 text-center flex flex-col items-center gap-4">
            <p className="text-amber-100/90 font-serif text-xl md:text-2xl tracking-[0.25em] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              天气变幻莫测，大祭司似乎在说些什么……
            </p>
            <p className="text-amber-200/50 font-serif text-xs md:text-sm tracking-widest leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              The weather shifts unpredictably, as the High Priest chants his sacred prayers...
            </p>
            <span className="text-amber-200/35 font-mono text-[9px] md:text-[10px] tracking-[0.4em] uppercase mt-6 animate-pulse">
              ✦ 叩抚唤醒金叶外轮廓 / TOUCH TO SUMMON THE OUTLINE ✦
            </span>
          </div>
        </div>
      )}

      {/* Ritual Interior instructions */}
      {storyStage === 'ritual_interior' && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 animate-fade-in"
          id="ritual-interior-narrative-container"
        >
          <div className="max-w-xl px-6 text-center flex flex-col items-center gap-4">
            <p className="text-amber-100/90 font-serif text-xl md:text-2xl tracking-[0.25em] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              风起云涌，百越工匠开始打造，金叶内容渐显！
            </p>
            <p className="text-amber-200/50 font-serif text-xs md:text-sm tracking-widest leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              The winds rise, as the artisan hammers away to awaken the golden core...
            </p>
            <span className="text-amber-200/35 font-mono text-[9px] md:text-[10px] tracking-[0.4em] uppercase mt-6 animate-pulse">
              ✦ 续抚重铸金叶之魂 / TOUCH TO REFORGE THE GOLDEN HEART ✦
            </span>
          </div>
        </div>
      )}

      {/* Ritual Final instructions */}
      {storyStage === 'ritual_final' && (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none z-10 animate-fade-in"
          id="ritual-final-narrative-container"
        >
          <div className="max-w-xl px-6 text-center flex flex-col items-center gap-4">
            <p className="text-amber-100 font-serif text-2xl md:text-3xl tracking-[0.3em] leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] animate-pulse">
              金叶复归，光华万丈！
            </p>
            <p className="text-amber-200/60 font-serif text-xs md:text-sm tracking-widest leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
              The Gold Leaf is fully restored, shining alone in the pitch dark void!
            </p>
            <span className="text-amber-200/30 font-mono text-[9px] md:text-[10px] tracking-[0.4em] uppercase mt-6">
              ✦ 触碰画面奏响千古礼乐 / TAP TO RING THE BIENZHONG CHIMES ✦
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
