/**
 * PositionToolService
 * Implements TradingView-standard geometry, formulas, position sizing,
 * visual statistics, and historical Bar Replay evaluation for Long and Short Position tools.
 */
import { Candle, DrawingObject } from '../types';

export interface PositionMetrics {
  isLong: boolean;
  entryPrice: number;
  slPrice: number;
  tpPrice: number;
  startTime: number;
  endTime: number;
  durationSec: number;

  // Distances
  riskDistance: number;
  rewardDistance: number;
  riskPips: number;
  rewardPips: number;
  riskTicks: number;
  rewardTicks: number;
  riskPercentOfPrice: number;
  rewardPercentOfPrice: number;
  riskRewardRatio: number;

  // Account & Sizing (TradingView Formulas)
  accountSize: number;
  riskPercent: number;
  riskAmount: number;
  lotSize: number;
  quantity: number;

  // PnL & Balances
  potentialProfitUsd: number;
  potentialLossUsd: number;
  balanceAfterTP: number;
  balanceAfterSL: number;
}

export interface PositionReplayStatus {
  state: 'planned' | 'active' | 'target_hit' | 'stopped_out';
  openPnlUsd: number;
  openPips: number;
  exitPrice?: number;
  exitTime?: number;
}

export class PositionToolService {
  /**
   * Calculates complete TradingView-standard metrics for a Long or Short Position drawing.
   */
  static calculateMetrics(drawing: DrawingObject, accountBalance: number = 10000): PositionMetrics {
    const isLong = drawing.type === 'long_position';
    const entryPrice = drawing.points[0]?.price ?? 1.10000;
    const startTime = drawing.points[0]?.time ?? Math.floor(Date.now() / 1000);

    // Default 15 pips SL / 15 pips TP if points not yet populated
    const defaultSl = isLong ? entryPrice - 0.00150 : entryPrice + 0.00150;
    const defaultTp = isLong ? entryPrice + 0.00300 : entryPrice - 0.00300;

    const slPrice = drawing.points[1]?.price ?? drawing.properties.slPrice ?? Number(defaultSl.toFixed(5));
    const tpPrice = drawing.points[2]?.price ?? drawing.properties.tpPrice ?? Number(defaultTp.toFixed(5));
    const endTime = drawing.points[3]?.time ?? (startTime + 7200);
    const durationSec = Math.max(60, Math.abs(endTime - startTime));

    // Distances
    const riskDistance = isLong ? Math.max(0.00001, entryPrice - slPrice) : Math.max(0.00001, slPrice - entryPrice);
    const rewardDistance = isLong ? Math.max(0.00001, tpPrice - entryPrice) : Math.max(0.00001, entryPrice - tpPrice);

    const riskPips = Number((riskDistance / 0.0001).toFixed(1));
    const rewardPips = Number((rewardDistance / 0.0001).toFixed(1));
    const riskTicks = Math.round(riskPips * 10);
    const rewardTicks = Math.round(rewardPips * 10);

    const riskPercentOfPrice = Number(((riskDistance / entryPrice) * 100).toFixed(2));
    const rewardPercentOfPrice = Number(((rewardDistance / entryPrice) * 100).toFixed(2));

    const riskRewardRatio = riskDistance > 0 ? Number((rewardDistance / riskDistance).toFixed(2)) : 0;

    // Account & Position Sizing
    const accountSize = drawing.properties.accountSize ?? accountBalance;
    const riskPercent = drawing.properties.riskPercent ?? 1.0;
    const riskAmount = Number((accountSize * (riskPercent / 100)).toFixed(2));

    // Forex EUR/USD: 1 pip = $10 / standard lot
    const calculatedLots = Math.max(0.01, Number((riskAmount / (Math.max(0.1, riskPips) * 10)).toFixed(2)));
    const lotSize = drawing.properties.lotSize ?? calculatedLots;
    const quantity = lotSize;

    // PnL
    const potentialLossUsd = Number((riskPips * 10 * lotSize).toFixed(2));
    const potentialProfitUsd = Number((rewardPips * 10 * lotSize).toFixed(2));

    const balanceAfterTP = Number((accountSize + potentialProfitUsd).toFixed(2));
    const balanceAfterSL = Number((accountSize - potentialLossUsd).toFixed(2));

    return {
      isLong,
      entryPrice,
      slPrice,
      tpPrice,
      startTime,
      endTime,
      durationSec,
      riskDistance,
      rewardDistance,
      riskPips,
      rewardPips,
      riskTicks,
      rewardTicks,
      riskPercentOfPrice,
      rewardPercentOfPrice,
      riskRewardRatio,
      accountSize,
      riskPercent,
      riskAmount,
      lotSize,
      quantity,
      potentialProfitUsd,
      potentialLossUsd,
      balanceAfterTP,
      balanceAfterSL,
    };
  }

  /**
   * Evaluates the historical Bar Replay status of a position without look-ahead bias.
   */
  static evaluateReplayStatus(
    drawing: DrawingObject,
    candles: Candle[],
    isReplayActive: boolean,
    currentPrice: number
  ): PositionReplayStatus {
    const metrics = this.calculateMetrics(drawing);
    const { isLong, entryPrice, slPrice, tpPrice, startTime, lotSize } = metrics;

    if (!isReplayActive || candles.length === 0) {
      return {
        state: 'planned',
        openPnlUsd: 0,
        openPips: 0,
      };
    }

    // Filter revealed historical candles strictly up to current replay step
    // candles array passed from ReplayEngine already strictly contains only revealed candles!
    let isEntered = false;
    let entryCandleIndex = -1;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (c.time < startTime) continue;

      if (!isEntered) {
        // Did price reach or cross entry price in this candle?
        const reached = (c.low <= entryPrice && c.high >= entryPrice) || c.time >= startTime;
        if (reached) {
          isEntered = true;
          entryCandleIndex = i;
        }
      }

      if (isEntered && entryCandleIndex >= 0) {
        const hitTp = isLong ? c.high >= tpPrice : c.low <= tpPrice;
        const hitSl = isLong ? c.low <= slPrice : c.high >= slPrice;

        if (hitTp && hitSl) {
          // Deterministic resolution: level closer to candle open was touched first
          const distToSl = Math.abs(c.open - slPrice);
          const distToTp = Math.abs(c.open - tpPrice);
          if (distToSl <= distToTp) {
            return {
              state: 'stopped_out',
              openPnlUsd: -metrics.potentialLossUsd,
              openPips: -metrics.riskPips,
              exitPrice: slPrice,
              exitTime: c.time,
            };
          } else {
            return {
              state: 'target_hit',
              openPnlUsd: metrics.potentialProfitUsd,
              openPips: metrics.rewardPips,
              exitPrice: tpPrice,
              exitTime: c.time,
            };
          }
        } else if (hitTp) {
          return {
            state: 'target_hit',
            openPnlUsd: metrics.potentialProfitUsd,
            openPips: metrics.rewardPips,
            exitPrice: tpPrice,
            exitTime: c.time,
          };
        } else if (hitSl) {
          return {
            state: 'stopped_out',
            openPnlUsd: -metrics.potentialLossUsd,
            openPips: -metrics.riskPips,
            exitPrice: slPrice,
            exitTime: c.time,
          };
        }
      }
    }

    if (!isEntered) {
      return {
        state: 'planned',
        openPnlUsd: 0,
        openPips: 0,
      };
    }

    // Position is currently active in replay
    const livePriceDiff = isLong ? (currentPrice - entryPrice) : (entryPrice - currentPrice);
    const openPips = Number((livePriceDiff / 0.0001).toFixed(1));
    const openPnlUsd = Number((openPips * 10 * lotSize).toFixed(2));

    return {
      state: 'active',
      openPnlUsd,
      openPips,
    };
  }
}
