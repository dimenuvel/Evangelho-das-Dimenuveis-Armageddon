/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Character,
  DamageIndicator,
  MapDef,
  Particle,
  Projectile,
  WeaponId,
} from '../types/game';
import { FACTIONS } from '../services/gameConstants';
import { terrain, VOID_LEVEL, WORLD_HEIGHT, WORLD_WIDTH } from '../services/terrain';

interface GameCanvasProps {
  mapDef: MapDef;
  characters: Character[];
  activeCharacter: Character | null;
  projectiles: Projectile[];
  particles: Particle[];
  damageIndicators: DamageIndicator[];
  aimAngle: number;
  aimPower: number;
  isCharging: boolean;
  activeWeaponId: WeaponId;
  wind: number;
  airstrikeTargetX: number | null;
  onSetAirstrikeTarget?: (x: number) => void;
  onAimAngleChange?: (angle: number) => void;
  isFreeCamera: boolean;
  cameraOffset: { x: number; y: number };
  zoom: number;
  onZoomChange?: (zoom: number) => void;
  impactPoint?: { x: number; y: number } | null;
  turnPhase?: 'AIMING' | 'FIRING' | 'IMPACT_SETTLING' | 'RETREAT';
  recenterKey?: number;
  onPanStateChange?: (isPanned: boolean) => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mapDef,
  characters,
  activeCharacter,
  projectiles,
  particles,
  damageIndicators,
  aimAngle,
  aimPower,
  isCharging,
  activeWeaponId,
  wind,
  airstrikeTargetX,
  onSetAirstrikeTarget,
  onAimAngleChange,
  isFreeCamera,
  cameraOffset,
  zoom,
  onZoomChange,
  impactPoint,
  turnPhase = 'AIMING',
  recenterKey,
  onPanStateChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImgRef = useRef<HTMLImageElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 720 });
  const cameraPosRef = useRef<{ x: number; y: number }>({
    x: activeCharacter?.x || WORLD_WIDTH / 2,
    y: activeCharacter?.y || WORLD_HEIGHT / 2,
  });

  // User map pan state refs (butter-smooth touch/pointer map panning with momentum & multi-touch)
  const userPannedRef = useRef<boolean>(false);
  const pannedPosRef = useRef<{ x: number; y: number }>({
    x: activeCharacter?.x || WORLD_WIDTH / 2,
    y: activeCharacter?.y || WORLD_HEIGHT / 2,
  });
  const isPointerDownRef = useRef<boolean>(false);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const primaryPointerIdRef = useRef<number | null>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const dragDistanceRef = useRef<number>(0);
  const velocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1.0);

  // Synchronous ref to access latest props in continuous RAF loop without tearing down animation frame
  const latestPropsRef = useRef({
    mapDef,
    characters,
    activeCharacter,
    projectiles,
    particles,
    damageIndicators,
    aimAngle,
    aimPower,
    isCharging,
    activeWeaponId,
    wind,
    airstrikeTargetX,
    onSetAirstrikeTarget,
    onAimAngleChange,
    isFreeCamera,
    cameraOffset,
    zoom,
    onZoomChange,
    dimensions,
    impactPoint,
    turnPhase,
    onPanStateChange,
  });

  latestPropsRef.current = {
    mapDef,
    characters,
    activeCharacter,
    projectiles,
    particles,
    damageIndicators,
    aimAngle,
    aimPower,
    isCharging,
    activeWeaponId,
    wind,
    airstrikeTargetX,
    onSetAirstrikeTarget,
    onAimAngleChange,
    isFreeCamera,
    cameraOffset,
    zoom,
    onZoomChange,
    dimensions,
    impactPoint,
    turnPhase,
    onPanStateChange,
  };

  // Track active character ID so camera automatically refocuses on new character when turns change
  const prevCharIdRef = useRef<string | null>(activeCharacter?.id || null);
  useEffect(() => {
    if (activeCharacter?.id && activeCharacter.id !== prevCharIdRef.current) {
      prevCharIdRef.current = activeCharacter.id;
      userPannedRef.current = false;
      velocityRef.current = { vx: 0, vy: 0 };
      latestPropsRef.current.onPanStateChange?.(false);
    }
  }, [activeCharacter?.id]);

  // Recenter trigger from HUD - only trigger when user explicitly clicked recenter
  const prevRecenterKeyRef = useRef<number>(recenterKey || 0);
  useEffect(() => {
    if (recenterKey && recenterKey !== prevRecenterKeyRef.current) {
      prevRecenterKeyRef.current = recenterKey;
      userPannedRef.current = false;
      velocityRef.current = { vx: 0, vy: 0 };
      latestPropsRef.current.onPanStateChange?.(false);
    }
  }, [recenterKey]);

  // Reset pan during projectile flight or explosion settling so action is always watched
  const prevTurnPhaseRef = useRef<string>(turnPhase);
  useEffect(() => {
    const isActionPhase = turnPhase === 'FIRING' || turnPhase === 'IMPACT_SETTLING';
    const isNewAction = isActionPhase && prevTurnPhaseRef.current !== turnPhase;
    const hasProjectiles = projectiles.length > 0;

    prevTurnPhaseRef.current = turnPhase;

    if (isNewAction || hasProjectiles) {
      userPannedRef.current = false;
      velocityRef.current = { vx: 0, vy: 0 };
      latestPropsRef.current.onPanStateChange?.(false);
    }
  }, [turnPhase, projectiles.length]);

  // Load map background image if specified
  useEffect(() => {
    let active = true;
    if (mapDef.bgImage) {
      const img = new Image();

      const handleSuccess = () => {
        if (active) {
          bgImgRef.current = img;
        }
      };

      img.onload = handleSuccess;
      img.onerror = () => {
        if (active) {
          bgImgRef.current = null;
        }
      };

      img.src = mapDef.bgImage;
      if (img.complete && img.naturalWidth > 0) {
        handleSuccess();
      }

      return () => {
        active = false;
      };
    } else {
      bgImgRef.current = null;
    }
  }, [mapDef.bgImage]);

  // Track container dimensions dynamically for responsive portrait & landscape
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth || window.innerWidth;
        const h = containerRef.current.clientHeight || window.innerHeight;
        setDimensions({ width: w, height: h });
        if (canvasRef.current) {
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          canvasRef.current.width = w * dpr;
          canvasRef.current.height = h * dpr;
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, []);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let waveOffset = 0;

    const render = () => {
      waveOffset += 0.05;
      const {
        mapDef,
        characters,
        activeCharacter,
        projectiles,
        particles,
        damageIndicators,
        aimAngle,
        aimPower,
        isCharging,
        activeWeaponId,
        wind,
        airstrikeTargetX,
        isFreeCamera,
        cameraOffset,
        zoom,
        dimensions,
        impactPoint,
      } = latestPropsRef.current;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const width = dimensions.width;
      const height = dimensions.height;
      const isPortrait = height > width;

      // Adjust effective zoom based on orientation so portrait displays enough field of view
      const effectiveZoom = isPortrait ? zoom * Math.max(0.65, Math.min(1.0, width / 640)) : zoom;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Determine camera target
      let targetX = WORLD_WIDTH / 2;
      let targetY = WORLD_HEIGHT / 2;

      if (projectiles.length > 0) {
        // Track the centroid of active projectiles
        let sumX = 0;
        let sumY = 0;
        for (const p of projectiles) {
          sumX += p.x;
          sumY += p.y;
        }
        targetX = sumX / projectiles.length;
        targetY = isPortrait ? (sumY / projectiles.length) - 20 : (sumY / projectiles.length);
      } else if (impactPoint) {
        // Firmly stay focused on the point of impact during explosion, knockback, and settling
        targetX = impactPoint.x;
        targetY = isPortrait ? impactPoint.y - 15 : impactPoint.y;
      } else if (userPannedRef.current) {
        // Inertia / momentum glide when user finger is released
        if (!isPointerDownRef.current && (Math.abs(velocityRef.current.vx) > 0.05 || Math.abs(velocityRef.current.vy) > 0.05)) {
          pannedPosRef.current.x += velocityRef.current.vx;
          pannedPosRef.current.y += velocityRef.current.vy;

          if (pannedPosRef.current.x <= 100 || pannedPosRef.current.x >= WORLD_WIDTH - 100) {
            velocityRef.current.vx = 0;
          }
          if (pannedPosRef.current.y <= 80 || pannedPosRef.current.y >= VOID_LEVEL + 40) {
            velocityRef.current.vy = 0;
          }

          pannedPosRef.current.x = Math.max(100, Math.min(WORLD_WIDTH - 100, pannedPosRef.current.x));
          pannedPosRef.current.y = Math.max(80, Math.min(VOID_LEVEL + 40, pannedPosRef.current.y));

          // Friction damping decay
          velocityRef.current.vx *= 0.91;
          velocityRef.current.vy *= 0.91;
        }

        targetX = pannedPosRef.current.x;
        targetY = pannedPosRef.current.y;
      } else if (isFreeCamera) {
        targetX = cameraOffset.x;
        targetY = cameraOffset.y;
      } else if (activeCharacter && !activeCharacter.isDead) {
        targetX = activeCharacter.x;
        targetY = isPortrait ? activeCharacter.y + 35 : activeCharacter.y;
      }

      // Clamp camera target within world bounds so it stays nicely framed
      targetX = Math.max(100, Math.min(WORLD_WIDTH - 100, targetX));
      targetY = Math.max(80, Math.min(VOID_LEVEL + 40, targetY));

      // Camera interpolation:
      // When dragging or gliding with momentum, camera tracks directly 1:1 without lagging
      // Otherwise smoothly lerps toward target
      if (userPannedRef.current) {
        if (isPointerDownRef.current || Math.hypot(velocityRef.current.vx, velocityRef.current.vy) > 0.05) {
          cameraPosRef.current.x = targetX;
          cameraPosRef.current.y = targetY;
        } else {
          cameraPosRef.current.x += (targetX - cameraPosRef.current.x) * 0.15;
          cameraPosRef.current.y += (targetY - cameraPosRef.current.y) * 0.15;
        }
      } else {
        const lerp = projectiles.length > 0 ? 0.16 : 0.09;
        cameraPosRef.current.x += (targetX - cameraPosRef.current.x) * lerp;
        cameraPosRef.current.y += (targetY - cameraPosRef.current.y) * lerp;
      }

      const focusX = Math.round(cameraPosRef.current.x);
      const focusY = Math.round(cameraPosRef.current.y);

      ctx.save();

      // Camera transformation
      ctx.translate(width / 2, height / 2);
      ctx.scale(effectiveZoom, effectiveZoom);
      ctx.translate(-focusX, -focusY);

      // 1. Draw Background
      if (
        bgImgRef.current &&
        bgImgRef.current.complete &&
        bgImgRef.current.naturalWidth > 0
      ) {
        ctx.drawImage(bgImgRef.current, 0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        ctx.fillStyle = 'rgba(5, 5, 15, 0.35)';
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
        grad.addColorStop(0, mapDef.skyGradient[0]);
        grad.addColorStop(1, mapDef.skyGradient[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
      }

      // Parallax cosmic stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      for (let s = 0; s < 50; s++) {
        const sx = ((s * 137.5) % WORLD_WIDTH);
        const sy = ((s * 89.3) % (VOID_LEVEL - 100));
        ctx.fillRect(sx, sy, (s % 3) + 1, (s % 3) + 1);
      }

      // 2. Draw Destructible Terrain from offscreen canvas
      const terrainCanvas = terrain.getCanvas();
      ctx.drawImage(terrainCanvas, 0, 0);

      // 3. Draw Cosmic Void (liquid water/abyss at bottom)
      const voidGrad = ctx.createLinearGradient(0, VOID_LEVEL, 0, WORLD_HEIGHT);
      voidGrad.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
      voidGrad.addColorStop(0.3, mapDef.voidColor);
      voidGrad.addColorStop(1, '#000000');
      ctx.fillStyle = voidGrad;

      ctx.beginPath();
      ctx.moveTo(0, WORLD_HEIGHT);
      ctx.lineTo(0, VOID_LEVEL);
      for (let vx = 0; vx <= WORLD_WIDTH; vx += 25) {
        const vy =
          VOID_LEVEL +
          Math.sin(vx * 0.02 + waveOffset) * 6 +
          Math.cos(vx * 0.05 + waveOffset * 0.7) * 3;
        ctx.lineTo(vx, vy);
      }
      ctx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
      ctx.closePath();
      ctx.fill();

      // Glowing liquid void foam
      ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let vx = 0; vx <= WORLD_WIDTH; vx += 25) {
        const vy =
          VOID_LEVEL +
          Math.sin(vx * 0.02 + waveOffset) * 6 +
          Math.cos(vx * 0.05 + waveOffset * 0.7) * 3;
        if (vx === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.stroke();

      // Disable image smoothing for authentic retro pixel crispness
      ctx.imageSmoothingEnabled = false;

      // 4. Draw Airstrike Target Marker
      if (airstrikeTargetX !== null) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(airstrikeTargetX, 0);
        ctx.lineTo(airstrikeTargetX, VOID_LEVEL);
        ctx.stroke();
        ctx.setLineDash([]);

        // Retro arcade target crosshair box
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(airstrikeTargetX - 12, 90, 24, 24);
        ctx.fillStyle = '#f43f5e';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('TARGET', airstrikeTargetX, 130);
      }

      // 5. Draw Characters (16-bit Arcade Pixel Sprites)
      characters.forEach((char) => {
        if (char.isDead) return;

        ctx.save();
        ctx.translate(Math.round(char.x), Math.round(char.y));

        const isActive = activeCharacter?.id === char.id;
        const faction = FACTIONS[char.faction];

        // Active indicator arrow (chunky retro arcade flashing arrow)
        if (isActive) {
          const bounce = Math.floor(Math.sin(Date.now() * 0.008) * 3);
          ctx.fillStyle = '#fde047';
          // Pixelated pointing triangle
          ctx.fillRect(-6, -46 + bounce, 12, 3);
          ctx.fillRect(-4, -43 + bounce, 8, 3);
          ctx.fillRect(-2, -40 + bounce, 4, 3);

          // Pulsing retro neon target box
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-14, -20, 28, 32);
        }

        ctx.scale(char.facing, 1);

        // Pixel Halo
        ctx.fillStyle = faction.secondaryColor;
        ctx.fillRect(-8, -20, 16, 2);
        ctx.fillRect(-10, -18, 2, 3);
        ctx.fillRect(8, -18, 2, 3);
        ctx.fillRect(-8, -15, 16, 1);

        // Character Body / Robe (Layered Chunky Pixel Sprite)
        ctx.fillStyle = faction.primaryColor;
        ctx.fillRect(-7, -13, 14, 18);
        // Robe trim / shading
        ctx.fillStyle = faction.secondaryColor;
        ctx.fillRect(-6, -11, 12, 3);
        ctx.fillRect(-5, 3, 10, 2);

        // Cosmic Bowling Shirt stripe or Faction sigil
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-2, -8, 4, 10);

        // Faction Crest letter / symbol
        ctx.fillStyle = '#0f172a';
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(faction.symbol, 0, -2);

        // Head (Pixel Face)
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-5, -12, 10, 7);

        // Pixel Visor / Sunglasses or Eye
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(1, -10, 4, 3);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(2, -9, 2, 1); // Eye twinkle

        // Pixel Feet / Shoes with animation step
        const footOffset = char.animFrame === 1 || char.animFrame === 3 ? 2 : 0;
        ctx.fillStyle = '#f43f5e'; // Retro red bowling shoes
        ctx.fillRect(-6, 5 - footOffset, 5, 4);
        ctx.fillRect(1, 5 + footOffset, 5, 4);
        ctx.fillStyle = '#ffffff'; // White bowling shoe laces
        ctx.fillRect(-5, 5 - footOffset, 2, 1);
        ctx.fillRect(2, 5 + footOffset, 2, 1);

        ctx.restore();

        // 16-bit Segmented Arcade Health Bar & Character Tag
        const barWidth = 36;
        const barHeight = 5;
        const barX = Math.round(char.x - barWidth / 2);
        const barY = Math.round(char.y - 28);

        // Outer black arcade bezel
        ctx.fillStyle = '#000000';
        ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Segmented HP pips
        const totalSegments = 8;
        const hpFraction = Math.max(0, char.hp / char.maxHp);
        const activeSegments = Math.ceil(hpFraction * totalSegments);
        const pipColor = hpFraction > 0.5 ? '#22c55e' : hpFraction > 0.25 ? '#eab308' : '#ef4444';

        for (let s = 0; s < activeSegments; s++) {
          const segX = barX + s * 4.5 + 0.5;
          ctx.fillStyle = pipColor;
          ctx.fillRect(segX, barY + 1, 3.5, barHeight - 2);
        }

        // Retro Arcade Pixel Name
        ctx.fillStyle = '#000000';
        ctx.font = '7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        // Black outline for high readability against retro backgrounds
        ctx.fillText(char.name, char.x + 1, char.y - 32);
        ctx.fillText(char.name, char.x - 1, char.y - 32);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(char.name, char.x, char.y - 33);
      });

      // 6. Draw Aiming Reticle & Retro Forecast Arc
      if (activeCharacter && !activeCharacter.isDead && projectiles.length === 0 && (!turnPhase || turnPhase === 'AIMING')) {
        const rad = (aimAngle * Math.PI) / 180;
        const barrelLen = 32;
        // In Canvas coordinates, -Y is UP towards the sky
        const reticleX = activeCharacter.x + Math.cos(rad) * barrelLen;
        const reticleY = activeCharacter.y - Math.sin(rad) * barrelLen;

        // Arcade pixel line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(Math.round(activeCharacter.x), Math.round(activeCharacter.y));
        ctx.lineTo(Math.round(reticleX), Math.round(reticleY));
        ctx.stroke();

        // Retro Crosshair Box
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(Math.round(reticleX - 5), Math.round(reticleY - 5), 10, 10);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(Math.round(reticleX - 1), Math.round(reticleY - 1), 2, 2);

        // Dotted Pixel Forecast Arc
        const simSpeed = (Math.max(20, aimPower) / 100) * 12;
        let simX = activeCharacter.x + Math.cos(rad) * 18;
        let simY = activeCharacter.y - Math.sin(rad) * 18;
        let simVx = Math.cos(rad) * simSpeed;
        let simVy = -Math.sin(rad) * simSpeed; // Negative is UP!

        ctx.fillStyle = '#38bdf8';
        for (let step = 0; step < 26; step++) {
          simX += simVx;
          simY += simVy;
          simVy += 0.24 * 0.85; // Gravity pulls downwards
          if (step % 2 === 0) {
            ctx.fillRect(Math.round(simX - 1.5), Math.round(simY - 1.5), 3, 3);
          }
          if (terrain.isSolid(simX, simY) || simY >= VOID_LEVEL) break;
        }
      }

      // 7. Draw Projectiles (Retro Arcade Pixel Art Style)
      projectiles.forEach((p) => {
        ctx.save();
        ctx.translate(Math.round(p.x), Math.round(p.y));
        ctx.rotate(p.rotation);

        if (p.type === 'COSMIC_BOWLING_BALL') {
          // Pixel bowling ball
          ctx.fillStyle = '#1e1b4b';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#c084fc';
          ctx.lineWidth = 2;
          ctx.stroke();

          // 3 finger holes (square pixels)
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(-3, -4, 2.5, 2.5);
          ctx.fillRect(1, -4, 2.5, 2.5);
          ctx.fillRect(-1, 1, 2.5, 2.5);
        } else if (p.type === 'HOLY_HAND_GRENADE') {
          // Pixel Holy Hand Grenade
          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.arc(0, 0, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Pixel Cross
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-1, -12, 2, 7);
          ctx.fillRect(-3, -10, 6, 2);
        } else if (p.type === 'GOLDEN_RATIO_CANNON') {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -4, 8, 8);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-2, -2, 4, 4);
        } else if (p.type === 'ARCHON_TAX_COLLECTOR') {
          // Pixel tax briefcase
          ctx.fillStyle = '#78716c';
          ctx.fillRect(-7, -6, 14, 12);
          ctx.fillStyle = '#fbbf24';
          ctx.font = '6px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TAX', 0, 2);
        } else {
          // Chunky Retro Rocket
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(-6, -3, 12, 6);
          // Nosecone
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(6, -2, 3, 4);
          ctx.fillRect(9, -1, 2, 2);
          // Fins
          ctx.fillStyle = '#818cf8';
          ctx.fillRect(-7, -5, 3, 2);
          ctx.fillRect(-7, 3, 3, 2);
          // Pixel exhaust thruster
          ctx.fillStyle = '#f97316';
          ctx.fillRect(-10, -2, 4, 4);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(-8, -1, 2, 2);
        }

        ctx.restore();
      });

      // 8. Draw Particles (Square Retro Pixel Chunks)
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;

        if (pt.type === 'DIRT') {
          pt.vy += 0.22;
        } else if (pt.type === 'SMOKE') {
          pt.size += 0.15;
          pt.vy -= 0.05;
        }

        const alpha = Math.max(0, 1 - pt.life / pt.maxLife);
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;

        // Render as sharp square pixel fragments
        const pSize = Math.max(2, Math.round(pt.size));
        ctx.fillRect(Math.round(pt.x - pSize / 2), Math.round(pt.y - pSize / 2), pSize, pSize);

        if (pt.life >= pt.maxLife) {
          particles.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;

      // 9. Draw Floating Damage Indicators ("Press Start 2P" Arcade Font)
      for (let i = damageIndicators.length - 1; i >= 0; i--) {
        const di = damageIndicators[i];
        di.y += di.vy;
        di.alpha -= 0.015;

        ctx.globalAlpha = Math.max(0, di.alpha);
        ctx.font = '10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';

        // 8-bit black shadow/border
        ctx.fillStyle = '#000000';
        ctx.fillText(di.text, di.x + 2, di.y + 2);
        ctx.fillText(di.text, di.x - 1, di.y - 1);

        // Foreground neon damage text
        ctx.fillStyle = di.color;
        ctx.fillText(di.text, di.x, di.y);

        if (di.alpha <= 0) {
          damageIndicators.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { turnPhase } = latestPropsRef.current;
    // Only allow map panning when not resolving projectile impacts
    if (turnPhase && turnPhase !== 'AIMING' && turnPhase !== 'RETREAT') return;

    // Track active pointer for multi-touch & pinch-zoom
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    // Stop ongoing momentum glide upon new touch
    velocityRef.current = { vx: 0, vy: 0 };

    if (activePointersRef.current.size === 1) {
      primaryPointerIdRef.current = e.pointerId;
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
      dragDistanceRef.current = 0;
      isPointerDownRef.current = true;

      // Sync panned target directly with current camera position to eliminate any initial jump
      pannedPosRef.current.x = cameraPosRef.current.x;
      pannedPosRef.current.y = cameraPosRef.current.y;
    } else if (activePointersRef.current.size === 2) {
      // Two fingers down: initialize pinch zoom
      const pts = Array.from(activePointersRef.current.values());
      pinchStartDistRef.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartZoomRef.current = latestPropsRef.current.zoom;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // 2-finger pinch zoom
    if (activePointersRef.current.size >= 2 && pinchStartDistRef.current && pinchStartDistRef.current > 10) {
      const pts = Array.from(activePointersRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (currentDist > 10) {
        const factor = currentDist / pinchStartDistRef.current;
        const newZoom = Math.max(0.65, Math.min(1.8, pinchStartZoomRef.current * factor));
        latestPropsRef.current.onZoomChange?.(Number(newZoom.toFixed(2)));
      }
      return;
    }

    // 1-finger panning
    if (e.pointerId === primaryPointerIdRef.current) {
      const now = performance.now();
      const dx = e.clientX - lastPointerPosRef.current.x;
      const dy = e.clientY - lastPointerPosRef.current.y;
      const dt = Math.max(1, now - lastPointerPosRef.current.time);

      dragDistanceRef.current += Math.hypot(dx, dy);

      if (dragDistanceRef.current > 4) {
        if (!userPannedRef.current) {
          userPannedRef.current = true;
          latestPropsRef.current.onPanStateChange?.(true);
        }

        const dims = latestPropsRef.current.dimensions;
        const curZoom = latestPropsRef.current.zoom;
        const isPortrait = dims.height > dims.width;
        const effectiveZoom = isPortrait ? curZoom * Math.max(0.65, Math.min(1.0, dims.width / 640)) : curZoom;

        // Invert delta: dragging screen right pulls world right (camera moves left)
        const worldDx = dx / effectiveZoom;
        const worldDy = dy / effectiveZoom;

        pannedPosRef.current.x = Math.max(100, Math.min(WORLD_WIDTH - 100, pannedPosRef.current.x - worldDx));
        pannedPosRef.current.y = Math.max(80, Math.min(VOID_LEVEL + 40, pannedPosRef.current.y - worldDy));

        // 1:1 camera lock during active touch drag
        cameraPosRef.current.x = pannedPosRef.current.x;
        cameraPosRef.current.y = pannedPosRef.current.y;

        // Velocity tracking for smooth momentum
        const factor = 16.67 / dt;
        const instVx = -worldDx * factor;
        const instVy = -worldDy * factor;
        velocityRef.current.vx = velocityRef.current.vx * 0.35 + instVx * 0.65;
        velocityRef.current.vy = velocityRef.current.vy * 0.35 + instVy * 0.65;
      }

      lastPointerPosRef.current = { x: e.clientX, y: e.clientY, time: now };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }

    if (e.pointerId === primaryPointerIdRef.current) {
      isPointerDownRef.current = false;

      // If it was a quick tap without drag:
      if (dragDistanceRef.current <= 5) {
        velocityRef.current = { vx: 0, vy: 0 };

        // Check if active weapon is Airstrike / Teleport targeting
        const { activeWeaponId, onSetAirstrikeTarget, dimensions, zoom } = latestPropsRef.current;
        const isAirstrikeOrTeleport =
          activeWeaponId === 'ARCHON_TAX_COLLECTOR' ||
          activeWeaponId === 'SEVEN_CHAKRA_STRIKE' ||
          activeWeaponId === 'AKASHIC_METEOR' ||
          activeWeaponId === 'DIVINE_BOWLING_STRIKE' ||
          activeWeaponId === 'DIMENSIONAL_TELEPORT';

        if (isAirstrikeOrTeleport && onSetAirstrikeTarget && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const clickScreenX = e.clientX - rect.left;
          const width = dimensions.width;
          const height = dimensions.height;
          const isPortrait = height > width;
          const effectiveZoom = isPortrait ? zoom * Math.max(0.65, Math.min(1.0, width / 640)) : zoom;
          const focusX = cameraPosRef.current.x;
          const worldX = (clickScreenX - width / 2) / effectiveZoom + focusX;
          onSetAirstrikeTarget(Math.max(50, Math.min(WORLD_WIDTH - 50, worldX)));
        }
      } else {
        // Clamp flick velocity so it glides smoothly without sudden teleportation
        const speed = Math.hypot(velocityRef.current.vx, velocityRef.current.vy);
        if (speed > 25) {
          const scale = 25 / speed;
          velocityRef.current.vx *= scale;
          velocityRef.current.vy *= scale;
        } else if (speed < 0.3) {
          velocityRef.current = { vx: 0, vy: 0 };
        }
      }

      // If other fingers are still touching, smoothly promote one as primary
      if (activePointersRef.current.size > 0) {
        const nextId = activePointersRef.current.keys().next().value;
        if (nextId !== undefined) {
          const nextPos = activePointersRef.current.get(nextId);
          if (nextPos) {
            primaryPointerIdRef.current = nextId;
            lastPointerPosRef.current = { x: nextPos.x, y: nextPos.y, time: performance.now() };
            dragDistanceRef.current = 0;
            isPointerDownRef.current = true;
          } else {
            primaryPointerIdRef.current = null;
          }
        } else {
          primaryPointerIdRef.current = null;
        }
      } else {
        primaryPointerIdRef.current = null;
      }
    }

    if (activePointersRef.current.size < 2) {
      pinchStartDistRef.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-black select-none touch-none overscroll-none scanlines"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onLostPointerCapture={handlePointerUp}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        className="block cursor-grab active:cursor-grabbing game-viewport bg-black select-none touch-none overscroll-none"
      />
    </div>
  );
};
