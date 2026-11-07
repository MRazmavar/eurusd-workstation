/**
 * Drawing Engine for TradingView-style interactive chart overlays.
 * Translates between Chart Market Coordinates (time, price) and Screen Coordinates (pixel x, y).
 * Provides robust hit-testing, handle manipulation, and geometric calculations for all tools.
 */
import { DrawingObject } from '../types';

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface CoordinateTransformer {
  timeToX: (time: number) => number | null;
  priceToY: (price: number) => number | null;
  xToTime: (x: number) => number | null;
  yToPrice: (y: number) => number | null;
}

export class DrawingEngine {
  /** Euclidean distance between two screen points */
  static dist(p1: ScreenPoint, p2: ScreenPoint): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Shortest distance from point to line segment */
  static distToSegment(p: ScreenPoint, v: ScreenPoint, w: ScreenPoint): number {
    const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
    if (l2 === 0) return this.dist(p, v);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return this.dist(p, {
      x: v.x + t * (w.x - v.x),
      y: v.y + t * (w.y - v.y),
    });
  }

  /** Shortest distance from point to ray starting at v through w */
  static distToRay(p: ScreenPoint, v: ScreenPoint, w: ScreenPoint): number {
    const dx = w.x - v.x;
    const dy = w.y - v.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return this.dist(p, v);
    const ux = dx / len;
    const uy = dy / len;
    const proj = (p.x - v.x) * ux + (p.y - v.y) * uy;
    if (proj <= 0) return this.dist(p, v);
    const closest = { x: v.x + proj * ux, y: v.y + proj * uy };
    return this.dist(p, closest);
  }

  /** Point in polygon check (ray casting) */
  static pointInPolygon(point: ScreenPoint, vs: ScreenPoint[]): boolean {
    let inside = false;
    for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      const xi = vs[i].x, yi = vs[i].y;
      const xj = vs[j].x, yj = vs[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /** Comprehensive Hit test for all drawing tool objects */
  static hitTest(
    mouse: ScreenPoint,
    drawings: DrawingObject[],
    transformer: CoordinateTransformer,
    hitTolerance: number = 8
  ): { drawing: DrawingObject; pointIndex?: number } | null {
    // Traverse backwards (topmost drawing first)
    for (let i = drawings.length - 1; i >= 0; i--) {
      const d = drawings[i];
      if (d.hidden) continue;

      const screenPoints: ScreenPoint[] = [];
      for (const pt of d.points) {
        const x = transformer.timeToX(pt.time);
        const y = transformer.priceToY(pt.price);
        if (x !== null && y !== null) {
          screenPoints.push({ x, y });
        }
      }

      if (screenPoints.length === 0) continue;

      // 1. Check control handles (points)
      for (let pIdx = 0; pIdx < screenPoints.length; pIdx++) {
        if (this.dist(mouse, screenPoints[pIdx]) <= hitTolerance + 3) {
          return { drawing: d, pointIndex: pIdx };
        }
      }

      // 2. Check Horizontal Lines / Horizontal Rays
      if (d.type === 'horizontal_line') {
        const y = screenPoints[0].y;
        if (Math.abs(mouse.y - y) <= hitTolerance) {
          return { drawing: d };
        }
      } else if (d.type === 'horizontal_ray' && screenPoints.length >= 1) {
        const y = screenPoints[0].y;
        if (Math.abs(mouse.y - y) <= hitTolerance && mouse.x >= screenPoints[0].x - hitTolerance) {
          return { drawing: d };
        }
      }

      // 3. Check Vertical Line
      else if (d.type === 'vertical_line') {
        const x = screenPoints[0].x;
        if (Math.abs(mouse.x - x) <= hitTolerance) {
          return { drawing: d };
        }
      }

      // 4. Check Trendlines / Rays / Extended Lines / Trend Angle
      else if (['trendline', 'trend_angle', 'arrow'].includes(d.type) && screenPoints.length >= 2) {
        if (this.distToSegment(mouse, screenPoints[0], screenPoints[1]) <= hitTolerance) {
          return { drawing: d };
        }
      } else if (d.type === 'ray' && screenPoints.length >= 2) {
        if (this.distToRay(mouse, screenPoints[0], screenPoints[1]) <= hitTolerance) {
          return { drawing: d };
        }
      } else if (d.type === 'extended_line' && screenPoints.length >= 2) {
        const d1 = this.distToRay(mouse, screenPoints[0], screenPoints[1]);
        const d2 = this.distToRay(mouse, screenPoints[1], screenPoints[0]);
        if (Math.min(d1, d2) <= hitTolerance) {
          return { drawing: d };
        }
      }

      // 5. Check Polyline / Path
      else if (['polyline', 'path'].includes(d.type) && screenPoints.length >= 2) {
        for (let j = 0; j < screenPoints.length - 1; j++) {
          if (this.distToSegment(mouse, screenPoints[j], screenPoints[j + 1]) <= hitTolerance) {
            return { drawing: d };
          }
        }
      }

      // 6. Check Triangle
      else if (d.type === 'triangle' && screenPoints.length >= 3) {
        if (this.pointInPolygon(mouse, screenPoints.slice(0, 3))) {
          return { drawing: d };
        }
        for (let j = 0; j < 3; j++) {
          const next = (j + 1) % 3;
          if (this.distToSegment(mouse, screenPoints[j], screenPoints[next]) <= hitTolerance) {
            return { drawing: d };
          }
        }
      }

      // 7. Check Parallel Channel
      else if (d.type === 'parallel_channel' && screenPoints.length >= 2) {
        const offset = 40;
        const p1 = screenPoints[0];
        const p2 = screenPoints[1];
        const p3 = { x: p2.x, y: p2.y + offset };
        const p4 = { x: p1.x, y: p1.y + offset };
        if (this.pointInPolygon(mouse, [p1, p2, p3, p4])) {
          return { drawing: d };
        }
      }

      // 8. Check Boxes / Positions / Measurement
      else if (
        ['rectangle', 'rotated_rectangle', 'long_position', 'short_position', 'price_range', 'date_range', 'date_price_range', 'measure'].includes(d.type) &&
        screenPoints.length >= 2
      ) {
        const minX = Math.min(screenPoints[0].x, screenPoints[1].x);
        const maxX = Math.max(screenPoints[0].x, screenPoints[1].x);
        const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
        const maxY = Math.max(screenPoints[0].y, screenPoints[1].y);

        if (
          mouse.x >= minX - hitTolerance && mouse.x <= maxX + hitTolerance &&
          mouse.y >= minY - hitTolerance && mouse.y <= maxY + hitTolerance
        ) {
          return { drawing: d };
        }
      }

      // 9. Check Fibonacci Tools
      else if (['fib_retracement', 'fib_extension', 'fib_channel', 'fib_fan', 'fib_timezones'].includes(d.type) && screenPoints.length >= 2) {
        const minY = Math.min(screenPoints[0].y, screenPoints[1].y);
        const maxY = Math.max(screenPoints[0].y, screenPoints[1].y);
        const minX = Math.min(screenPoints[0].x, screenPoints[1].x);
        const maxX = Math.max(screenPoints[0].x, screenPoints[1].x) + 250;

        if (
          mouse.y >= minY - hitTolerance && mouse.y <= maxY + hitTolerance &&
          mouse.x >= minX - 50 && mouse.x <= maxX + 50
        ) {
          return { drawing: d };
        }
      }

      // 10. Check Circle / Ellipse
      else if (['circle', 'ellipse'].includes(d.type) && screenPoints.length >= 2) {
        const radius = this.dist(screenPoints[0], screenPoints[1]);
        const dCenter = this.dist(mouse, screenPoints[0]);
        if (Math.abs(dCenter - radius) <= hitTolerance || dCenter <= radius) {
          return { drawing: d };
        }
      }

      // 11. Check Text / Note / Callout / Price Label
      else if (['text', 'note', 'price_label', 'callout', 'arrow_marker'].includes(d.type)) {
        if (this.dist(mouse, screenPoints[0]) <= 28) {
          return { drawing: d };
        }
      }
    }
    return null;
  }
}
