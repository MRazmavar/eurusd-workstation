/**
 * Historical Candle & Intrabar Replay Engine for EUR/USD Manual Backtesting.
 * Strictly prevents look-ahead bias by only exposing historical market action
 * up to the current replay timestamp and intrabar phase.
 */
import { Candle, ReplayMode } from '../types';

export type ReplaySpeed = number;

export interface ReplayStateEvent {
  active: boolean;
  isPlaying: boolean;
  currentIndex: number;
  intrabarPhase: number; // 0=Open, 1=Extreme1, 2=Extreme2, 3=Close
  mode: ReplayMode;
  total: number;
  speed: ReplaySpeed;
  tickIntervalSec: number;
}

export interface ReplayListener {
  onCandleRevealed?: (candle: Candle, visibleCandles: Candle[]) => void;
  onStateChange?: (state: ReplayStateEvent) => void;
}

export class ReplayEngine {
  private masterCandles: Candle[] = [];
  private active: boolean = false;
  private isPlaying: boolean = false;
  private currentIndex: number = 0;
  private startIndex: number = 0;
  private intrabarPhase: number = 3; // 0=Open, 1=Ext1, 2=Ext2, 3=Close
  private mode: ReplayMode = 'candle';
  private speed: ReplaySpeed = 1;
  private tickIntervalSec: number = 1.0;
  private playIntervalId: any = null;
  private listeners: ReplayListener[] = [];

  public setMasterCandles(candles: Candle[], preserveTimestamp?: number) {
    const targetTime = preserveTimestamp !== undefined
      ? preserveTimestamp
      : (this.active ? (this.getCurrentCandle()?.time ?? null) : null);

    this.masterCandles = [...candles].sort((a, b) => a.time - b.time);

    if (this.active && targetTime !== null && this.masterCandles.length > 0) {
      // Find the candle where c.time <= targetTime (strictly preventing look-ahead bias into future bars)
      let bestIdx = 0;
      for (let i = 0; i < this.masterCandles.length; i++) {
        if (this.masterCandles[i].time <= targetTime) {
          bestIdx = i;
        } else {
          break;
        }
      }
      this.currentIndex = bestIdx;
      this.startIndex = Math.min(this.startIndex, this.currentIndex);
      this.intrabarPhase = 3;
      this.notifyState();
      this.notifyCandle();
    }
  }

  public getCurrentTimestamp(): number | null {
    const cur = this.getCurrentCandle();
    return cur ? cur.time : null;
  }

  public subscribe(listener: ReplayListener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public isActive(): boolean {
    return this.active;
  }

  public setMode(mode: ReplayMode) {
    this.mode = mode;
    this.notifyState();
  }

  public getMode(): ReplayMode {
    return this.mode;
  }

  public getVisibleCandles(): Candle[] {
    if (!this.active) return this.masterCandles;
    if (this.masterCandles.length === 0) return [];

    const baseSlice = this.masterCandles.slice(0, this.currentIndex);
    const cur = this.masterCandles[this.currentIndex];
    if (!cur) return baseSlice;

    if (this.mode === 'candle' || this.intrabarPhase === 3) {
      return [...baseSlice, cur];
    }

    // Synthesize intrabar progression strictly using current candle's boundaries
    const isBull = cur.close >= cur.open;
    let evolvingCandle: Candle;

    if (this.intrabarPhase === 0) {
      // Just opened
      evolvingCandle = {
        time: cur.time,
        open: cur.open,
        high: cur.open,
        low: cur.open,
        close: cur.open,
        volume: Number(((cur.volume || 100) * 0.25).toFixed(1)),
      };
    } else if (this.intrabarPhase === 1) {
      // Reached first extreme (low for bull, high for bear)
      const extPrice = isBull ? cur.low : cur.high;
      evolvingCandle = {
        time: cur.time,
        open: cur.open,
        high: isBull ? cur.open : extPrice,
        low: isBull ? extPrice : cur.open,
        close: extPrice,
        volume: Number(((cur.volume || 100) * 0.5).toFixed(1)),
      };
    } else {
      // Reached second extreme
      evolvingCandle = {
        time: cur.time,
        open: cur.open,
        high: cur.high,
        low: cur.low,
        close: isBull ? cur.high : cur.low,
        volume: Number(((cur.volume || 100) * 0.75).toFixed(1)),
      };
    }

    return [...baseSlice, evolvingCandle];
  }

  public getCurrentCandle(): Candle | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.masterCandles.length) {
      const visible = this.getVisibleCandles();
      return visible[visible.length - 1] || null;
    }
    return null;
  }

  public startReplay(timestampOrIndex: number, mode: ReplayMode = 'candle') {
    if (this.masterCandles.length === 0) return;

    let targetIdx = 0;
    if (timestampOrIndex > 100000) {
      targetIdx = this.masterCandles.findIndex(c => c.time >= timestampOrIndex);
      if (targetIdx === -1) targetIdx = Math.max(0, this.masterCandles.length - 100);
    } else {
      targetIdx = Math.max(0, Math.min(this.masterCandles.length - 1, timestampOrIndex));
    }

    this.active = true;
    this.isPlaying = false;
    this.mode = mode;
    this.startIndex = targetIdx;
    this.currentIndex = targetIdx;
    this.intrabarPhase = 3;
    this.clearTimer();

    this.notifyState();
    this.notifyCandle();
  }

  public play() {
    if (!this.active || this.isPlaying) return;
    this.isPlaying = true;
    this.clearTimer();

    const intervalMs = Math.max(50, Math.floor(this.tickIntervalSec * 1000));
    this.playIntervalId = setInterval(() => {
      this.stepForward(1);
      if (this.currentIndex >= this.masterCandles.length - 1 && this.intrabarPhase === 3) {
        this.pause();
      }
    }, intervalMs);

    this.notifyState();
  }

  public pause() {
    this.isPlaying = false;
    this.clearTimer();
    this.notifyState();
  }

  public togglePlayPause() {
    if (this.isPlaying) this.pause();
    else this.play();
  }

  public setTickInterval(sec: number) {
    this.tickIntervalSec = Math.max(0.05, sec);
    this.speed = Math.max(0.1, Number((1.0 / this.tickIntervalSec).toFixed(1)));
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notifyState();
    }
  }

  public getTickInterval(): number {
    return this.tickIntervalSec;
  }

  public setSpeed(speed: ReplaySpeed) {
    this.speed = speed;
    if (speed > 0) {
      this.tickIntervalSec = 1.0 / speed;
    }
    if (this.isPlaying) {
      this.pause();
      this.play();
    } else {
      this.notifyState();
    }
  }

  public stepForward(count: number = 1) {
    if (!this.active || this.masterCandles.length === 0) return;

    if (this.mode === 'intrabar') {
      for (let i = 0; i < count; i++) {
        if (this.intrabarPhase < 3) {
          this.intrabarPhase += 1;
        } else {
          if (this.currentIndex < this.masterCandles.length - 1) {
            this.currentIndex += 1;
            this.intrabarPhase = 0;
          }
        }
      }
    } else {
      // Candle-by-candle mode
      this.currentIndex = Math.min(this.masterCandles.length - 1, this.currentIndex + count);
      this.intrabarPhase = 3;
    }

    this.notifyCandle();
    this.notifyState();
  }

  public stepBackward(count: number = 1) {
    if (!this.active || this.masterCandles.length === 0) return;

    if (this.mode === 'intrabar') {
      for (let i = 0; i < count; i++) {
        if (this.intrabarPhase > 0) {
          this.intrabarPhase -= 1;
        } else {
          if (this.currentIndex > this.startIndex) {
            this.currentIndex -= 1;
            this.intrabarPhase = 3;
          }
        }
      }
    } else {
      this.currentIndex = Math.max(this.startIndex, this.currentIndex - count);
      this.intrabarPhase = 3;
    }

    this.notifyCandle();
    this.notifyState();
  }

  public jumpToCandle(index: number) {
    if (!this.active) return;
    this.currentIndex = Math.max(this.startIndex, Math.min(this.masterCandles.length - 1, index));
    this.intrabarPhase = 3;
    this.notifyCandle();
    this.notifyState();
  }

  public restart() {
    if (!this.active) return;
    this.pause();
    this.currentIndex = this.startIndex;
    this.intrabarPhase = 3;
    this.notifyCandle();
    this.notifyState();
  }

  public exitReplay() {
    this.pause();
    this.active = false;
    this.intrabarPhase = 3;
    this.notifyState();
    this.listeners.forEach(l => l.onCandleRevealed?.(this.masterCandles[this.masterCandles.length - 1], this.masterCandles));
  }

  private clearTimer() {
    if (this.playIntervalId) {
      clearInterval(this.playIntervalId);
      this.playIntervalId = null;
    }
  }

  private notifyState() {
    const state: ReplayStateEvent = {
      active: this.active,
      isPlaying: this.isPlaying,
      currentIndex: this.currentIndex,
      intrabarPhase: this.intrabarPhase,
      mode: this.mode,
      total: this.masterCandles.length,
      speed: this.speed,
      tickIntervalSec: this.tickIntervalSec,
    };
    this.listeners.forEach(l => l.onStateChange?.(state));
  }

  private notifyCandle() {
    const cur = this.getCurrentCandle();
    if (cur) {
      const visible = this.getVisibleCandles();
      this.listeners.forEach(l => l.onCandleRevealed?.(cur, visible));
    }
  }
}

export const replayEngine = new ReplayEngine();
if (typeof window !== 'undefined') {
  (window as any).__replayEngine = replayEngine;
}
