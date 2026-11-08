/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MapId, Particle } from '../types/game';
import { MAPS } from './gameConstants';

export const WORLD_WIDTH = 1800;
export const WORLD_HEIGHT = 800;
export const VOID_LEVEL = 740; // Characters below this fall into the abyss

export class TerrainEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixelData: Uint8ClampedArray;
  private currentMapId: MapId = 'COSMIC_BOWLING_ALLEY';

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = WORLD_WIDTH;
    this.canvas.height = WORLD_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.pixelData = new Uint8ClampedArray(WORLD_WIDTH * WORLD_HEIGHT * 4);
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public isSolid(x: number, y: number): boolean {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    if (ix < 0 || ix >= WORLD_WIDTH || iy < 0) return false;
    if (iy >= VOID_LEVEL) return false; // In void
    const idx = (iy * WORLD_WIDTH + ix) * 4 + 3;
    return this.pixelData[idx] > 30;
  }

  public getGroundY(x: number, startY: number = 50): number | null {
    for (let y = Math.max(0, Math.floor(startY)); y < VOID_LEVEL; y += 2) {
      if (this.isSolid(x, y)) {
        return y;
      }
    }
    return null;
  }

  public sampleTerrainColor(x: number, y: number): string {
    const ix = Math.max(0, Math.min(WORLD_WIDTH - 1, Math.floor(x)));
    const iy = Math.max(0, Math.min(WORLD_HEIGHT - 1, Math.floor(y)));
    const idx = (iy * WORLD_WIDTH + ix) * 4;
    const r = this.pixelData[idx];
    const g = this.pixelData[idx + 1];
    const b = this.pixelData[idx + 2];
    return `rgb(${r}, ${g}, ${b})`;
  }

  public generateMap(mapId: MapId) {
    this.currentMapId = mapId;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    const mapDef = MAPS[mapId];

    ctx.save();

    switch (mapId) {
      case 'COSMIC_BOWLING_ALLEY':
        this.generateBowlingAlley(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      case 'GARDEN_OF_EDEN':
        this.generateGardenOfEden(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      case 'ARCHON_CITADEL':
        this.generateArchonCitadel(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      case 'SEVEN_HEAVENS':
        this.generateSevenHeavens(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      case 'AKASHIC_LIBRARY':
        this.generateAkashicLibrary(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      case 'VOID_OF_NOTHINGNESS':
        this.generateVoidIslands(ctx, mapDef.terrainFill, mapDef.terrainAccent);
        break;
      default:
        this.generateBowlingAlley(ctx, mapDef.terrainFill, mapDef.terrainAccent);
    }

    ctx.restore();

    // Cache full pixel buffer
    const imgData = ctx.getImageData(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.pixelData = imgData.data;
  }

  // Map 1: Cosmic Bowling Alley
  private generateBowlingAlley(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    // Main rolling lane undulating across the landscape
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, 520);

    for (let x = 0; x <= WORLD_WIDTH; x += 20) {
      const y =
        480 +
        Math.sin(x * 0.0035) * 80 +
        Math.sin(x * 0.01) * 35 +
        Math.cos(x * 0.002) * 50;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(WORLD_WIDTH, VOID_LEVEL - 40);
    ctx.lineTo(0, VOID_LEVEL - 40);
    ctx.closePath();
    ctx.fill();

    // Floating bowling pin platforms
    this.drawFloatingPlatform(ctx, 350, 360, 260, 45, fill, accent);
    this.drawFloatingPlatform(ctx, 850, 310, 280, 50, fill, accent);
    this.drawFloatingPlatform(ctx, 1350, 370, 260, 45, fill, accent);

    // Decorative lane markings and golden arrow inlays
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    for (let x = 120; x < WORLD_WIDTH; x += 160) {
      const gy = this.getGroundY(x, 200) || 500;
      ctx.beginPath();
      ctx.moveTo(x - 20, gy - 2);
      ctx.lineTo(x + 20, gy - 2);
      ctx.stroke();

      // Golden arrow triangle
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x, gy - 16);
      ctx.lineTo(x - 12, gy - 4);
      ctx.lineTo(x + 12, gy - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Map 2: Garden of Eden
  private generateGardenOfEden(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    ctx.fillStyle = fill;
    // Layered mystical hills
    ctx.beginPath();
    ctx.moveTo(0, 560);
    for (let x = 0; x <= WORLD_WIDTH; x += 15) {
      const y =
        510 +
        Math.sin(x * 0.004) * 110 +
        Math.cos(x * 0.009) * 45 +
        Math.sin(x * 0.02) * 15;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD_WIDTH, VOID_LEVEL - 30);
    ctx.lineTo(0, VOID_LEVEL - 30);
    ctx.closePath();
    ctx.fill();

    // Eden floating tree-root islands
    this.drawFloatingPlatform(ctx, 220, 380, 220, 60, fill, accent);
    this.drawFloatingPlatform(ctx, 680, 320, 340, 70, fill, accent);
    this.drawFloatingPlatform(ctx, 1280, 340, 300, 65, fill, accent);

    // Crystal grass edging
    ctx.strokeStyle = accent;
    ctx.lineWidth = 5;
    for (let x = 0; x < WORLD_WIDTH; x += 10) {
      const gy = this.getGroundY(x, 250);
      if (gy) {
        ctx.beginPath();
        ctx.moveTo(x, gy);
        ctx.lineTo(x + 4, gy - 6);
        ctx.stroke();
      }
    }
  }

  // Map 3: Archon Bureaucratic Citadel
  private generateArchonCitadel(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    ctx.fillStyle = fill;
    // Monumental stepped ledger structure
    const steps = [
      { x: 50, w: 260, y: 460 },
      { x: 360, w: 320, y: 390 },
      { x: 740, w: 320, y: 340 },
      { x: 1120, w: 320, y: 410 },
      { x: 1480, w: 260, y: 480 },
    ];

    steps.forEach((step) => {
      ctx.fillRect(step.x, step.y, step.w, VOID_LEVEL - step.y - 40);
      // Gold regulatory strip
      ctx.fillStyle = accent;
      ctx.fillRect(step.x, step.y, step.w, 8);
      ctx.fillStyle = fill;
    });

    // Archon connecting bridges
    this.drawFloatingPlatform(ctx, 280, 480, 140, 25, fill, accent);
    this.drawFloatingPlatform(ctx, 1030, 430, 150, 25, fill, accent);

    // Deep central audit abyss
    ctx.fillStyle = fill;
    ctx.fillRect(800, 240, 200, 35);
  }

  // Map 4: The Seven Heavens
  private generateSevenHeavens(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    const rainbowColors = [
      '#ef4444', // Red
      '#f97316', // Orange
      '#eab308', // Yellow
      '#22c55e', // Green
      '#06b6d4', // Cyan
      '#3b82f6', // Blue
      '#a855f7', // Violet
    ];

    // Seven ascending and descending tiers
    const platforms = [
      { x: 80, y: 550, w: 280, c: rainbowColors[0] },
      { x: 340, y: 460, w: 300, c: rainbowColors[1] },
      { x: 620, y: 380, w: 280, c: rainbowColors[2] },
      { x: 860, y: 300, w: 320, c: rainbowColors[3] },
      { x: 1140, y: 380, w: 280, c: rainbowColors[4] },
      { x: 1380, y: 460, w: 300, c: rainbowColors[5] },
      { x: 700, y: 580, w: 420, c: rainbowColors[6] },
    ];

    platforms.forEach((p) => {
      ctx.fillStyle = fill;
      this.drawFloatingPlatform(ctx, p.x, p.y, p.w, 45, fill, p.c);
    });
  }

  // Map 5: Akashic Library
  private generateAkashicLibrary(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    ctx.fillStyle = fill;
    // Massive floating book shelves & parchment islands
    const books = [
      { x: 100, y: 440, w: 360, h: 55 },
      { x: 520, y: 370, w: 380, h: 60 },
      { x: 960, y: 320, w: 360, h: 55 },
      { x: 1360, y: 410, w: 360, h: 60 },
      { x: 400, y: 560, w: 450, h: 50 },
      { x: 950, y: 540, w: 460, h: 50 },
    ];

    books.forEach((b) => {
      this.drawFloatingPlatform(ctx, b.x, b.y, b.w, b.h, fill, accent);
    });
  }

  // Map 6: Void of Nothingness
  private generateVoidIslands(ctx: CanvasRenderingContext2D, fill: string, accent: string) {
    ctx.fillStyle = fill;
    // Jagged fragmented obsidian asteroids
    const asteroids = [
      { x: 120, y: 490, r: 110 },
      { x: 450, y: 390, r: 130 },
      { x: 880, y: 350, r: 150 },
      { x: 1320, y: 420, r: 130 },
      { x: 1600, y: 520, r: 100 },
      { x: 680, y: 580, r: 110 },
      { x: 1100, y: 560, r: 110 },
    ];

    asteroids.forEach((ast) => {
      ctx.beginPath();
      const points = 14;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dist = ast.r * (0.8 + Math.sin(i * 3 + ast.x) * 0.2);
        const px = ast.x + Math.cos(angle) * dist * 1.3;
        const py = ast.y + Math.sin(angle) * dist * 0.75;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Sharp glowing border
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }

  private drawFloatingPlatform(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
    accent: string
  ) {
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [12, 12, 28, 28]);
    ctx.fill();

    // Top surface accent rim
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(x + 2, y, w - 4, 6, [6, 6, 0, 0]);
    ctx.fill();
  }

  // Carve explosion out of the terrain bitmap and update local pixel buffer
  public carveExplosion(
    cx: number,
    cy: number,
    radius: number,
    particlesList?: Particle[]
  ): void {
    if (radius <= 0) return;

    // Spawn debris particles before erasing
    if (particlesList) {
      const count = Math.min(30, Math.floor(radius * 0.6));
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius * 0.9;
        const px = cx + Math.cos(angle) * dist;
        const py = cy + Math.sin(angle) * dist;

        if (this.isSolid(px, py)) {
          const col = this.sampleTerrainColor(px, py);
          const pAngle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
          const speed = 2 + Math.random() * 7;
          particlesList.push({
            x: px,
            y: py,
            vx: Math.cos(pAngle) * speed + (Math.random() - 0.5) * 3,
            vy: Math.sin(pAngle) * speed,
            color: col,
            size: 2 + Math.random() * 4,
            life: 0,
            maxLife: 35 + Math.random() * 30,
            type: 'DIRT',
          });
        }
      }
    }

    // Canvas destination-out cut
    const ctx = this.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Update pixel buffer bounding box
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(WORLD_WIDTH - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(WORLD_HEIGHT - 1, Math.ceil(cy + radius));
    const bw = maxX - minX + 1;
    const bh = maxY - minY + 1;

    if (bw > 0 && bh > 0) {
      const updatedPatch = ctx.getImageData(minX, minY, bw, bh);
      const patchData = updatedPatch.data;

      for (let row = 0; row < bh; row++) {
        const destRowStart = ((minY + row) * WORLD_WIDTH + minX) * 4;
        const srcRowStart = row * bw * 4;
        for (let col = 0; col < bw; col++) {
          const sIdx = srcRowStart + col * 4 + 3;
          const dIdx = destRowStart + col * 4 + 3;
          this.pixelData[dIdx] = patchData[sIdx];
        }
      }
    }
  }

  public findSpawnPositions(count: number): Array<{ x: number; y: number }> {
    const spawns: Array<{ x: number; y: number }> = [];
    const step = Math.floor((WORLD_WIDTH - 300) / (count + 1));

    for (let i = 1; i <= count; i++) {
      let x = 150 + i * step + (Math.random() * 80 - 40);
      x = Math.max(100, Math.min(WORLD_WIDTH - 100, x));
      const gy = this.getGroundY(x, 80);
      if (gy && gy < VOID_LEVEL - 50) {
        spawns.push({ x, y: gy - 20 });
      } else {
        // Fallback search around x
        let found = false;
        for (let dx = -80; dx <= 80; dx += 20) {
          const testY = this.getGroundY(x + dx, 80);
          if (testY && testY < VOID_LEVEL - 50) {
            spawns.push({ x: x + dx, y: testY - 20 });
            found = true;
            break;
          }
        }
        if (!found) {
          // Broad scan across map to guarantee valid ground surface
          for (let testX = 120; testX < WORLD_WIDTH - 120; testX += 25) {
            const altY = this.getGroundY(testX, 60);
            if (altY && altY < VOID_LEVEL - 50) {
              spawns.push({ x: testX, y: altY - 20 });
              found = true;
              break;
            }
          }
        }
        if (!found) {
          spawns.push({ x: 200 + i * 150, y: 350 });
        }
      }
    }
    return spawns;
  }
}

export const terrain = new TerrainEngine();
