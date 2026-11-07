/**
 * Backtesting Performance Analytics Engine for EUR/USD.
 */
import { Trade } from '../types';

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRate: number; // percentage e.g. 62.5
  netProfit: number;
  netProfitPips: number;
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgRiskReward: number;
  avgWinningTrade: number;
  avgLosingTrade: number;
  maxDrawdownUsd: number;
  maxDrawdownPercent: number;
  expectancy: number; // expected value per trade
  avgHoldingTimeMinutes: number;
  largestWin: number;
  largestLoss: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  longCount: number;
  longWinRate: number;
  shortCount: number;
  shortWinRate: number;
}

export interface CurvePoint {
  time: number;
  balance: number;
  equity: number;
  drawdownPercent: number;
}

export class AnalyticsEngine {
  static computeStats(trades: Trade[], initialBalance: number = 10000): { stats: PerformanceStats; curve: CurvePoint[] } {
    const closedTrades = trades
      .filter(t => t.status === 'CLOSED' && t.pnl !== undefined && t.pnl !== null)
      .sort((a, b) => (a.exit_time || 0) - (b.exit_time || 0));

    if (closedTrades.length === 0) {
      return {
        stats: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          breakEvenTrades: 0,
          winRate: 0,
          netProfit: 0,
          netProfitPips: 0,
          grossProfit: 0,
          grossLoss: 0,
          profitFactor: 0,
          avgRiskReward: 0,
          avgWinningTrade: 0,
          avgLosingTrade: 0,
          maxDrawdownUsd: 0,
          maxDrawdownPercent: 0,
          expectancy: 0,
          avgHoldingTimeMinutes: 0,
          largestWin: 0,
          largestLoss: 0,
          maxConsecutiveWins: 0,
          maxConsecutiveLosses: 0,
          longCount: 0,
          longWinRate: 0,
          shortCount: 0,
          shortWinRate: 0,
        },
        curve: [{ time: Math.floor(Date.now() / 1000), balance: initialBalance, equity: initialBalance, drawdownPercent: 0 }],
      };
    }

    let winningTrades = 0;
    let losingTrades = 0;
    let breakEvenTrades = 0;
    let grossProfit = 0;
    let grossLoss = 0;
    let netProfitPips = 0;
    let totalRiskReward = 0;
    let validRCount = 0;
    let totalHoldingSec = 0;
    let largestWin = 0;
    let largestLoss = 0;

    let consecutiveWins = 0;
    let maxConsecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;

    let longCount = 0;
    let longWins = 0;
    let shortCount = 0;
    let shortWins = 0;

    let currentBalance = initialBalance;
    let peakBalance = initialBalance;
    let maxDrawdownUsd = 0;
    let maxDrawdownPercent = 0;

    const curve: CurvePoint[] = [
      {
        time: closedTrades[0].entry_time - 60,
        balance: initialBalance,
        equity: initialBalance,
        drawdownPercent: 0,
      },
    ];

    for (const t of closedTrades) {
      const pnl = t.pnl || 0;
      const pips = t.pnl_pips || 0;
      netProfitPips += pips;

      if (t.type === 'BUY') {
        longCount++;
        if (pnl > 0) longWins++;
      } else {
        shortCount++;
        if (pnl > 0) shortWins++;
      }

      if (pnl > 0) {
        winningTrades++;
        grossProfit += pnl;
        consecutiveWins++;
        consecutiveLosses = 0;
        if (consecutiveWins > maxConsecutiveWins) maxConsecutiveWins = consecutiveWins;
        if (pnl > largestWin) largestWin = pnl;
      } else if (pnl < 0) {
        losingTrades++;
        grossLoss += Math.abs(pnl);
        consecutiveLosses++;
        consecutiveWins = 0;
        if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
        if (pnl < largestLoss) largestLoss = pnl;
      } else {
        breakEvenTrades++;
      }

      if (t.r_multiple !== undefined && t.r_multiple !== null) {
        totalRiskReward += t.r_multiple;
        validRCount++;
      }

      if (t.exit_time && t.entry_time) {
        totalHoldingSec += Math.max(0, t.exit_time - t.entry_time);
      }

      // Track Balance and Drawdown
      currentBalance += pnl;
      if (currentBalance > peakBalance) {
        peakBalance = currentBalance;
      }
      const ddUsd = peakBalance - currentBalance;
      const ddPct = peakBalance > 0 ? (ddUsd / peakBalance) * 100 : 0;
      if (ddUsd > maxDrawdownUsd) maxDrawdownUsd = ddUsd;
      if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;

      curve.push({
        time: t.exit_time || t.entry_time,
        balance: round(currentBalance, 2),
        equity: round(currentBalance, 2),
        drawdownPercent: round(ddPct, 2),
      });
    }

    const totalTrades = closedTrades.length;
    const netProfit = grossProfit - grossLoss;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const avgRiskReward = validRCount > 0 ? totalRiskReward / validRCount : 0;
    const avgWinningTrade = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLosingTrade = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const avgHoldingTimeMinutes = totalTrades > 0 ? totalHoldingSec / 60 / totalTrades : 0;
    const expectancy = totalTrades > 0 ? netProfit / totalTrades : 0;

    const stats: PerformanceStats = {
      totalTrades,
      winningTrades,
      losingTrades,
      breakEvenTrades,
      winRate: round(winRate, 2),
      netProfit: round(netProfit, 2),
      netProfitPips: round(netProfitPips, 1),
      grossProfit: round(grossProfit, 2),
      grossLoss: round(grossLoss, 2),
      profitFactor: round(profitFactor, 2),
      avgRiskReward: round(avgRiskReward, 2),
      avgWinningTrade: round(avgWinningTrade, 2),
      avgLosingTrade: round(avgLosingTrade, 2),
      maxDrawdownUsd: round(maxDrawdownUsd, 2),
      maxDrawdownPercent: round(maxDrawdownPercent, 2),
      expectancy: round(expectancy, 2),
      avgHoldingTimeMinutes: round(avgHoldingTimeMinutes, 1),
      largestWin: round(largestWin, 2),
      largestLoss: round(largestLoss, 2),
      maxConsecutiveWins,
      maxConsecutiveLosses,
      longCount,
      longWinRate: longCount > 0 ? round((longWins / longCount) * 100, 1) : 0,
      shortCount,
      shortWinRate: shortCount > 0 ? round((shortWins / shortCount) * 100, 1) : 0,
    };

    return { stats, curve };
  }
}

function round(val: number, decimals: number): number {
  return Number(val.toFixed(decimals));
}
