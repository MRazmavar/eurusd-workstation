/**
 * Backtesting and Trade Management Engine for EUR/USD.
 * Realistic trade execution with bid/ask spreads, commissions, pip values, pending orders,
 * conservative same-candle execution rules, and interactive on-chart draggable setups.
 */
import { Trade, Candle, UserSettings, DraggableTradeSetup } from '../types';
import { marketClient } from './MarketDataClient';

export interface TradeOrderParams {
  type: 'BUY' | 'SELL';
  order_type?: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP';
  entryPrice: number;
  limit_price?: number | null;
  stop_price?: number | null;
  sl?: number | null;
  tp?: number | null;
  lotSize: number;
  riskUsd?: number | null;
  notes?: string;
  time: number;
}

export class BacktestingEngine {
  private trades: Trade[] = [];
  private activeSetup: DraggableTradeSetup | null = null;
  private settings: UserSettings = {
    initial_balance: 10000,
    account_currency: 'USD',
    default_risk_percent: 1,
    default_lot_size: 1,
    spread_pips: 1.2,
    commission_per_lot: 3.5,
    slippage_pips: 0.2,
    active_provider: 'dukascopy',
    timezone: 'UTC',
    theme: 'dark',
    conservative_execution: true,
  };
  private listeners: ((trades: Trade[]) => void)[] = [];
  private setupListeners: ((setup: DraggableTradeSetup | null) => void)[] = [];

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData() {
    try {
      const [loadedTrades, loadedSettings] = await Promise.all([
        marketClient.fetchTrades(),
        marketClient.fetchSettings(),
      ]);
      this.trades = loadedTrades;
      this.settings = loadedSettings;
      this.notify();
    } catch {
      const local = localStorage.getItem('eurusd_trades');
      if (local) {
        this.trades = JSON.parse(local);
        this.notify();
      }
    }
  }

  public subscribe(cb: (trades: Trade[]) => void) {
    this.listeners.push(cb);
    cb(this.trades);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public subscribeSetup(cb: (setup: DraggableTradeSetup | null) => void) {
    this.setupListeners.push(cb);
    cb(this.activeSetup);
    return () => {
      this.setupListeners = this.setupListeners.filter(l => l !== cb);
    };
  }

  public getTrades(): Trade[] {
    return [...this.trades];
  }

  public getOpenTrades(): Trade[] {
    return this.trades.filter(t => t.status === 'OPEN');
  }

  public getPendingTrades(): Trade[] {
    return this.trades.filter(t => t.status === 'PENDING');
  }

  public getClosedTrades(): Trade[] {
    return this.trades.filter(t => t.status === 'CLOSED');
  }

  public updateSettings(settings: UserSettings) {
    this.settings = settings;
    marketClient.saveSettings(settings);
  }

  public getSettings(): UserSettings {
    return this.settings;
  }

  // ---------------- Interactive On-Chart Draggable Setup ----------------

  public startTradeSetup(type: 'BUY' | 'SELL', currentPrice: number, defaultSlPips: number = 20, defaultTpPips: number = 40) {
    const slDistance = defaultSlPips * 0.0001;
    const tpDistance = defaultTpPips * 0.0001;
    const lotSize = this.settings.default_lot_size || 1.0;

    const entryPrice = currentPrice;
    const slPrice = type === 'BUY'
      ? Number((entryPrice - slDistance).toFixed(5))
      : Number((entryPrice + slDistance).toFixed(5));
    const tpPrice = type === 'BUY'
      ? Number((entryPrice + tpDistance).toFixed(5))
      : Number((entryPrice - tpDistance).toFixed(5));

    const riskUsd = defaultSlPips * 10 * lotSize;
    const rewardUsd = defaultTpPips * 10 * lotSize;
    const riskReward = defaultSlPips > 0 ? Number((defaultTpPips / defaultSlPips).toFixed(2)) : 2.0;

    this.activeSetup = {
      active: true,
      type,
      entryPrice,
      slPrice,
      tpPrice,
      lotSize,
      riskUsd,
      rewardUsd,
      riskReward,
      notes: '',
    };
    this.notifySetup();
  }

  public updateTradeSetup(updates: Partial<DraggableTradeSetup>) {
    if (!this.activeSetup) return;

    const updated = { ...this.activeSetup, ...updates };
    // Recalculate pips and risk/reward
    const slPips = Math.abs(updated.entryPrice - updated.slPrice) / 0.0001;
    const tpPips = Math.abs(updated.tpPrice - updated.entryPrice) / 0.0001;

    updated.riskUsd = Number((slPips * 10 * updated.lotSize).toFixed(2));
    updated.rewardUsd = Number((tpPips * 10 * updated.lotSize).toFixed(2));
    updated.riskReward = slPips > 0 ? Number((tpPips / slPips).toFixed(2)) : 0;

    this.activeSetup = updated;
    this.notifySetup();
  }

  public cancelTradeSetup() {
    this.activeSetup = null;
    this.notifySetup();
  }

  public async confirmTradeSetup(time: number): Promise<Trade | null> {
    if (!this.activeSetup) return null;
    const setup = this.activeSetup;

    const trade = await this.openTrade({
      type: setup.type,
      order_type: 'MARKET',
      entryPrice: setup.entryPrice,
      sl: setup.slPrice,
      tp: setup.tpPrice,
      lotSize: setup.lotSize,
      riskUsd: setup.riskUsd,
      notes: setup.notes,
      time,
    });

    this.activeSetup = null;
    this.notifySetup();
    return trade;
  }

  public getActiveSetup(): DraggableTradeSetup | null {
    return this.activeSetup;
  }

  // ---------------- Trade Execution & Orders ----------------

  public async openTrade(params: TradeOrderParams): Promise<Trade> {
    const halfSpread = (this.settings.spread_pips * 0.0001) / 2;
    const order_type = params.order_type || 'MARKET';
    const isPending = order_type !== 'MARKET';

    // BUY enters at Ask (higher), SELL enters at Bid (lower)
    const executedPrice = params.type === 'BUY'
      ? params.entryPrice + halfSpread
      : params.entryPrice - halfSpread;

    let rMultiple: number | null = null;
    if (params.sl && params.tp) {
      const risk = Math.abs(executedPrice - params.sl);
      const reward = Math.abs(params.tp - executedPrice);
      if (risk > 0) {
        rMultiple = Number((reward / risk).toFixed(2));
      }
    }

    const trade: Trade = {
      id: `tr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      symbol: 'EUR/USD',
      type: params.type,
      order_type,
      entry_time: params.time,
      entry_price: Number(executedPrice.toFixed(5)),
      limit_price: params.limit_price || null,
      stop_price: params.stop_price || null,
      sl: params.sl ? Number(params.sl.toFixed(5)) : null,
      tp: params.tp ? Number(params.tp.toFixed(5)) : null,
      lot_size: params.lotSize,
      risk_usd: params.riskUsd || null,
      r_multiple: rMultiple,
      commission: Number((this.settings.commission_per_lot * params.lotSize).toFixed(2)),
      spread_cost: Number((this.settings.spread_pips * 10 * params.lotSize).toFixed(2)),
      status: isPending ? 'PENDING' : 'OPEN',
      notes: params.notes || '',
    };

    this.trades = [trade, ...this.trades];
    this.saveState();
    this.notify();
    try {
      await marketClient.saveTrade(trade);
    } catch (err) {
      console.error('Failed to save trade to backend:', err);
    }
    return trade;
  }

  public async modifyTrade(tradeId: string, updates: Partial<Trade>): Promise<Trade | null> {
    const idx = this.trades.findIndex(t => t.id === tradeId);
    if (idx === -1) return null;

    const existing = this.trades[idx];
    const updated = { ...existing, ...updates };

    if (updated.sl && updated.tp) {
      const risk = Math.abs(updated.entry_price - updated.sl);
      const reward = Math.abs(updated.tp - updated.entry_price);
      if (risk > 0) {
        updated.r_multiple = Number((reward / risk).toFixed(2));
      }
    }

    this.trades = [
      ...this.trades.slice(0, idx),
      updated,
      ...this.trades.slice(idx + 1),
    ];
    this.saveState();
    await marketClient.saveTrade(updated);
    this.notify();
    return updated;
  }

  public async cancelTrade(tradeId: string): Promise<Trade | null> {
    return this.closeTrade(tradeId, 0, Math.floor(Date.now() / 1000), 'CANCELLED');
  }

  public async closeTrade(
    tradeId: string,
    exitPrice: number,
    exitTime: number,
    reason: 'TP' | 'SL' | 'MANUAL' | 'CANCELLED' = 'MANUAL'
  ): Promise<Trade | null> {
    const idx = this.trades.findIndex(t => t.id === tradeId);
    if (idx === -1) return null;

    const t = this.trades[idx];
    if (t.status === 'CLOSED' || t.status === 'CANCELLED') return t;

    if (reason === 'CANCELLED') {
      const cancelled: Trade = {
        ...t,
        status: 'CANCELLED',
        exit_time: exitTime,
        exit_reason: 'CANCELLED',
      };
      this.trades = [
        ...this.trades.slice(0, idx),
        cancelled,
        ...this.trades.slice(idx + 1),
      ];
      this.saveState();
      await marketClient.saveTrade(cancelled);
      this.notify();
      return cancelled;
    }

    // BUY closes at Bid, SELL closes at Ask
    const halfSpread = (this.settings.spread_pips * 0.0001) / 2;
    const effectiveExitPrice = t.type === 'BUY'
      ? exitPrice - halfSpread
      : exitPrice + halfSpread;

    const pipDiff = t.type === 'BUY'
      ? (effectiveExitPrice - t.entry_price) / 0.0001
      : (t.entry_price - effectiveExitPrice) / 0.0001;

    const grossPnl = pipDiff * 10 * t.lot_size;
    const commission = this.settings.commission_per_lot * t.lot_size;
    const netPnl = grossPnl - commission;

    const closed: Trade = {
      ...t,
      exit_time: exitTime,
      exit_price: Number(effectiveExitPrice.toFixed(5)),
      pnl: Number(netPnl.toFixed(2)),
      pnl_pips: Number(pipDiff.toFixed(1)),
      commission: Number(commission.toFixed(2)),
      status: 'CLOSED',
      exit_reason: reason,
    };

    this.trades = [
      ...this.trades.slice(0, idx),
      closed,
      ...this.trades.slice(idx + 1),
    ];
    this.saveState();
    this.notify();
    try {
      await marketClient.saveTrade(closed);
    } catch (err) {
      console.error('Failed to save closed trade to backend:', err);
    }
    return closed;
  }

  public async deleteTrade(tradeId: string): Promise<boolean> {
    this.trades = this.trades.filter(t => t.id !== tradeId);
    this.saveState();
    await marketClient.deleteTrade(tradeId);
    this.notify();
    return true;
  }

  /**
   * Evaluates pending orders and open positions against a revealed candle.
   * Handles pending order fills and conservative execution when both SL & TP are hit.
   */
  public onCandleRevealed(candle: Candle) {
    // 1. Evaluate Pending Orders
    const pendingOrders = this.getPendingTrades();
    for (const p of pendingOrders) {
      if (candle.time < p.entry_time) continue;

      let triggered = false;
      let fillPrice = p.entry_price;

      if (p.order_type === 'BUY_LIMIT' && p.limit_price && candle.low <= p.limit_price) {
        triggered = true;
        fillPrice = p.limit_price;
      } else if (p.order_type === 'SELL_LIMIT' && p.limit_price && candle.high >= p.limit_price) {
        triggered = true;
        fillPrice = p.limit_price;
      } else if (p.order_type === 'BUY_STOP' && p.stop_price && candle.high >= p.stop_price) {
        triggered = true;
        fillPrice = p.stop_price;
      } else if (p.order_type === 'SELL_STOP' && p.stop_price && candle.low <= p.stop_price) {
        triggered = true;
        fillPrice = p.stop_price;
      }

      if (triggered) {
        this.modifyTrade(p.id, {
          status: 'OPEN',
          entry_price: fillPrice,
          entry_time: candle.time,
        });
      }
    }

    // 2. Evaluate Open Positions against Candle
    const openPositions = this.getOpenTrades();
    if (openPositions.length === 0) return;

    for (const t of openPositions) {
      if (candle.time < t.entry_time) continue;

      if (t.type === 'BUY') {
        const hitSL = t.sl !== null && t.sl !== undefined && candle.low <= t.sl;
        const hitTP = t.tp !== null && t.tp !== undefined && candle.high >= t.tp;

        if (hitSL && hitTP) {
          // Both SL and TP hit in same candle! Apply documented conservative rule
          if (this.settings.conservative_execution) {
            // Assume Stop Loss was hit first
            const exitPrice = t.sl! - (this.settings.slippage_pips * 0.0001);
            this.closeTrade(t.id, exitPrice, candle.time, 'SL');
          } else {
            // Proximity rule: check whether Open was closer to SL or TP
            const distSL = Math.abs(candle.open - t.sl!);
            const distTP = Math.abs(candle.open - t.tp!);
            if (distSL <= distTP) {
              const exitPrice = t.sl! - (this.settings.slippage_pips * 0.0001);
              this.closeTrade(t.id, exitPrice, candle.time, 'SL');
            } else {
              this.closeTrade(t.id, t.tp!, candle.time, 'TP');
            }
          }
          continue;
        }

        if (hitSL) {
          const exitPrice = t.sl! - (this.settings.slippage_pips * 0.0001);
          this.closeTrade(t.id, exitPrice, candle.time, 'SL');
          continue;
        }
        if (hitTP) {
          this.closeTrade(t.id, t.tp!, candle.time, 'TP');
          continue;
        }
      } else {
        // SELL
        const hitSL = t.sl !== null && t.sl !== undefined && candle.high >= t.sl;
        const hitTP = t.tp !== null && t.tp !== undefined && candle.low <= t.tp;

        if (hitSL && hitTP) {
          if (this.settings.conservative_execution) {
            const exitPrice = t.sl! + (this.settings.slippage_pips * 0.0001);
            this.closeTrade(t.id, exitPrice, candle.time, 'SL');
          } else {
            const distSL = Math.abs(candle.open - t.sl!);
            const distTP = Math.abs(candle.open - t.tp!);
            if (distSL <= distTP) {
              const exitPrice = t.sl! + (this.settings.slippage_pips * 0.0001);
              this.closeTrade(t.id, exitPrice, candle.time, 'SL');
            } else {
              this.closeTrade(t.id, t.tp!, candle.time, 'TP');
            }
          }
          continue;
        }

        if (hitSL) {
          const exitPrice = t.sl! + (this.settings.slippage_pips * 0.0001);
          this.closeTrade(t.id, exitPrice, candle.time, 'SL');
          continue;
        }
        if (hitTP) {
          this.closeTrade(t.id, t.tp!, candle.time, 'TP');
          continue;
        }
      }
    }
  }

  private saveState() {
    try {
      localStorage.setItem('eurusd_trades', JSON.stringify(this.trades));
    } catch {
      // Ignore
    }
  }

  private notify() {
    const current = [...this.trades];
    this.listeners.forEach(cb => cb(current));
  }

  private notifySetup() {
    const current = this.activeSetup ? { ...this.activeSetup } : null;
    this.setupListeners.forEach(cb => cb(current));
  }
}

export const backtestingEngine = new BacktestingEngine();
