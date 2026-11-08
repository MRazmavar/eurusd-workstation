/**
 * TradingView-Style Bottom Dock: Replay Controller, Open Positions, Trade History, Strategy Tester & Analytics.
 */
import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  FastForward,
  RotateCcw,
  X,
  Download,
  Trash2,
  TrendingUp,
  TrendingDown,
  BarChart2,
  Clock,
  ChevronDown,
  ChevronUp,
  Scissors,
  Calendar,
  Edit3,
  Wallet,
} from 'lucide-react';
import { Trade, UserSettings } from '../types';
import { replayEngine, ReplaySpeed } from '../services/ReplayEngine';
import { backtestingEngine } from '../services/BacktestingEngine';
import { AnalyticsEngine, PerformanceStats, CurvePoint } from '../services/AnalyticsEngine';

interface BottomPanelProps {
  replayActive: boolean;
  replayPlaying: boolean;
  replaySpeed: ReplaySpeed;
  replayCurrentIndex: number;
  replayTotalCandles: number;
  replayMode?: 'candle' | 'intrabar' | 'tick';
  intrabarPhase?: number;
  trades: Trade[];
  currentPrice: number;
  settings: UserSettings;
  onExitReplay: () => void;
  onStartSelectCut?: () => void;
  isSelectingCut?: boolean;
  onOpenJumpDateTime?: () => void;
  replayTickIntervalSec?: number;
  onOpenBalanceModal?: () => void;
}

type BottomTab = 'analytics' | 'history' | 'positions';

export const BottomPanel: React.FC<BottomPanelProps> = ({
  replayActive,
  replayPlaying,
  replaySpeed,
  replayCurrentIndex,
  replayTotalCandles,
  replayMode = 'candle',
  intrabarPhase = 3,
  trades,
  currentPrice,
  settings,
  onExitReplay,
  onStartSelectCut,
  isSelectingCut = false,
  onOpenJumpDateTime,
  replayTickIntervalSec = 1.0,
  onOpenBalanceModal,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<BottomTab>('analytics');

  const openTrades = trades.filter(t => t.status === 'OPEN');
  const pendingTrades = trades.filter(t => t.status === 'PENDING');
  const closedTrades = trades.filter(t => t.status === 'CLOSED');

  const { stats, curve } = AnalyticsEngine.computeStats(trades, settings.initial_balance);

  const phaseNames = ['OPEN', 'EXTREME 1', 'EXTREME 2', 'CLOSE'];

  // CSV Export for trade history
  const exportToCSV = () => {
    if (closedTrades.length === 0) {
      alert('No closed trades to export.');
      return;
    }
    const headers = ['ID,Symbol,Type,EntryTime,EntryPrice,ExitTime,ExitPrice,SL,TP,LotSize,PnL_USD,PnL_Pips,R_Multiple,ExitReason,Notes'];
    const rows = closedTrades.map(t => [
      t.id,
      t.symbol,
      t.type,
      new Date(t.entry_time * 1000).toISOString(),
      t.entry_price,
      t.exit_time ? new Date(t.exit_time * 1000).toISOString() : '',
      t.exit_price || '',
      t.sl || '',
      t.tp || '',
      t.lot_size,
      t.pnl || 0,
      t.pnl_pips || 0,
      t.r_multiple || '',
      t.exit_reason || '',
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `EURUSD_Backtest_Trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClosePosition = (trade: Trade) => {
    backtestingEngine.closeTrade(trade.id, currentPrice, Math.floor(Date.now() / 1000), 'MANUAL');
  };

  return (
    <div className="bg-[#131722] border-t border-[#2a2e39] flex flex-col z-30 select-none">
      {/* 1. REPLAY CONTROLLER BAR (Visible when Replay Mode is Active) */}
      {replayActive && (
        <div className="h-10 bg-[#1e222d] border-b border-[#2a2e39] px-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#2962ff] flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#2962ff] animate-ping" />
              <span>BAR REPLAY ACTIVE</span>
            </span>
            <span className="text-gray-500 font-mono">
              Bar {replayCurrentIndex + 1} of {replayTotalCandles}
            </span>

            {/* Replay Mode Switch: Candle vs Simulated Intrabar */}
            <div className="flex items-center space-x-1 bg-[#131722] rounded px-1.5 py-0.5 border border-[#2a2e39] ml-2">
              <span className="text-[10px] text-gray-400">Mode:</span>
              <button
                onClick={() => replayEngine.setMode('candle')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  replayMode === 'candle'
                    ? 'bg-[#2962ff] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Advance full candles"
              >
                Candle
              </button>
              <button
                onClick={() => replayEngine.setMode('intrabar')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                  replayMode === 'intrabar'
                    ? 'bg-[#089981] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="4-phase simulated intrabar stepping (O->Ext1->Ext2->C)"
              >
                Intrabar
              </button>
            </div>

            {/* Intrabar Phase Indicator */}
            {replayMode === 'intrabar' && (
              <span className="text-[10px] bg-[#1e222d] text-[#089981] border border-[#089981]/50 px-1.5 py-0.5 rounded font-mono font-bold">
                Phase {intrabarPhase + 1}/4: {phaseNames[intrabarPhase]}
              </span>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-1.5">
            {/* Jump to Bar (Select with Mouse) */}
            <button
              onClick={onStartSelectCut}
              className={`px-2 py-1 rounded flex items-center space-x-1 text-xs font-semibold transition-all ${
                isSelectingCut
                  ? 'bg-[#f23645] text-white shadow-lg shadow-[#f23645]/40 ring-1 ring-white animate-pulse'
                  : 'bg-[#131722] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#f23645]'
              }`}
              title="Jump to Bar: Click anywhere on chart to cut future bars and start replay"
              data-testid="jump-to-bar-btn"
            >
              <Scissors size={13} className={isSelectingCut ? 'text-white' : 'text-[#f23645]'} />
              <span>Jump to Bar</span>
            </button>

            {/* Jump to Date & Time Modal */}
            <button
              onClick={onOpenJumpDateTime}
              className="px-2 py-1 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#38bdf8] text-gray-200 hover:text-white flex items-center space-x-1 text-xs transition-colors"
              title="Jump to specific date & time"
              data-testid="jump-to-date-btn"
            >
              <Calendar size={13} className="text-[#38bdf8]" />
              <span>Jump to Date</span>
            </button>

            <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

            {/* Step Back */}
            <button
              onClick={() => replayEngine.stepBackward(1)}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#2a2e39]"
              title={replayMode === 'intrabar' ? 'Step Back (-1 Intrabar Phase)' : 'Step Back (-1 Candle)'}
            >
              <SkipBack size={15} />
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => replayEngine.togglePlayPause()}
              className="p-1.5 rounded bg-[#2962ff] text-white hover:bg-[#1f4cdb] shadow"
              title={replayPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {replayPlaying ? <Pause size={15} /> : <Play size={15} className="fill-white" />}
            </button>

            {/* Step Forward (+1) */}
            <button
              onClick={() => replayEngine.stepForward(1)}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#2a2e39]"
              title={replayMode === 'intrabar' ? 'Step Forward (+1 Intrabar Phase)' : 'Step Forward (+1 Candle)'}
            >
              <SkipForward size={15} />
            </button>

            {/* Step Multiple (+5) */}
            <button
              onClick={() => replayEngine.stepForward(5)}
              className="p-1 rounded text-gray-300 hover:text-white hover:bg-[#2a2e39]"
              title="Advance 5 Steps"
            >
              <FastForward size={15} />
            </button>

            {/* Tick Rate / Speed Selector */}
            <div className="flex items-center space-x-1 bg-[#131722] rounded px-1.5 py-0.5 border border-[#2a2e39] ml-1">
              <span className="text-[10px] text-gray-400">Tick Rate:</span>
              {[
                { label: '0.1s', sec: 0.1 },
                { label: '0.25s', sec: 0.25 },
                { label: '0.5s', sec: 0.5 },
                { label: '1s', sec: 1.0 },
                { label: '2s', sec: 2.0 },
                { label: '3s', sec: 3.0 },
                { label: '5s', sec: 5.0 },
              ].map((t) => {
                const isActive = Math.abs((replayTickIntervalSec ?? 1.0) - t.sec) < 0.05;
                return (
                  <button
                    key={t.label}
                    onClick={() => replayEngine.setTickInterval(t.sec)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      isActive
                        ? 'bg-[#2962ff] text-white font-bold shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    title={`Tick update every ${t.sec}s`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Restart */}
            <button
              onClick={() => replayEngine.restart()}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39] ml-1"
              title="Restart from Replay Start"
            >
              <RotateCcw size={14} />
            </button>

            {/* Exit Replay */}
            <button
              onClick={onExitReplay}
              className="px-2 py-0.5 rounded bg-red-900/40 text-red-300 hover:bg-red-800/60 border border-red-800 text-[11px] font-semibold flex items-center space-x-1 ml-1"
              title="Exit Replay Mode"
            >
              <X size={13} />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. DOCK HEADER (TABS & COLLAPSE) */}
      <div className="h-9 bg-[#131722] px-3 flex items-center justify-between border-b border-[#2a2e39] text-xs">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => { setActiveTab('analytics'); setCollapsed(false); }}
            data-testid="dock-tab-analytics"
            className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 ${
              activeTab === 'analytics' && !collapsed
                ? 'bg-[#1e222d] text-[#2962ff] border border-[#2a2e39]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <BarChart2 size={13} />
            <span>Strategy Tester & Analytics</span>
          </button>

          <button
            onClick={() => { setActiveTab('positions'); setCollapsed(false); }}
            data-testid="dock-tab-positions"
            className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 ${
              activeTab === 'positions' && !collapsed
                ? 'bg-[#1e222d] text-[#2962ff] border border-[#2a2e39]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>Positions & Orders</span>
            {(openTrades.length > 0 || pendingTrades.length > 0) && (
              <span className="bg-[#2962ff] text-white text-[10px] px-1.5 rounded-full font-bold">
                {openTrades.length} {pendingTrades.length > 0 ? `+ ${pendingTrades.length}p` : ''}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab('history'); setCollapsed(false); }}
            data-testid="dock-tab-history"
            className={`px-2.5 py-1 rounded font-medium flex items-center space-x-1.5 ${
              activeTab === 'history' && !collapsed
                ? 'bg-[#1e222d] text-[#2962ff] border border-[#2a2e39]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Clock size={13} />
            <span>Trade History ({closedTrades.length})</span>
          </button>
        </div>

        {/* Right side: Balance and collapse toggle */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-[11px] font-mono text-gray-300 bg-[#1e222d] px-2 py-0.5 rounded border border-[#2a2e39]">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white font-bold">${(settings.initial_balance + stats.netProfit).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <button
              onClick={onOpenBalanceModal}
              className="p-0.5 rounded text-gray-400 hover:text-white transition-colors ml-0.5"
              title="Change Default / Initial Balance"
              data-testid="bottom-panel-balance-edit-btn"
            >
              <Edit3 size={11} />
            </button>
          </div>

          <div className="text-[11px] font-mono text-gray-300">
            <span>Net PnL: </span>
            <span className={stats.netProfit >= 0 ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
              {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)} ({stats.netProfitPips >= 0 ? '+' : ''}{stats.netProfitPips.toFixed(1)}p)
            </span>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
            title={collapsed ? 'Expand Dock' : 'Collapse Dock'}
          >
            {collapsed ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* 3. DOCK BODY */}
      {!collapsed && (
        <div className="h-56 overflow-y-auto p-3 text-xs">
          {/* TAB 1: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-3">
              {/* Top Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
                <MetricCard label="Net Profit" value={`$${stats.netProfit.toFixed(2)}`} isPositive={stats.netProfit >= 0} />
                <MetricCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} isPositive={stats.winRate >= 50} />
                <MetricCard label="Profit Factor" value={stats.profitFactor.toFixed(2)} isPositive={stats.profitFactor >= 1.5} />
                <MetricCard label="Max Drawdown" value={`-${stats.maxDrawdownPercent.toFixed(1)}%`} isPositive={false} />
                <MetricCard label="Total Trades" value={stats.totalTrades.toString()} />
                <MetricCard label="Avg R:R" value={`1:${stats.avgRiskReward.toFixed(2)}`} />
                <MetricCard label="Expectancy" value={`$${stats.expectancy.toFixed(2)}`} isPositive={stats.expectancy >= 0} />
                <MetricCard label="Gross Profit" value={`$${stats.grossProfit.toFixed(2)}`} isPositive={true} />
              </div>

              {/* Middle Row: Equity Curve SVG & Secondary Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Equity & Balance Curve */}
                <div className="md:col-span-2 bg-[#1e222d] p-3 rounded border border-[#2a2e39] flex flex-col justify-between">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-200">Equity & Balance Curve</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      Initial: ${settings.initial_balance} → Current: ${(settings.initial_balance + stats.netProfit).toFixed(2)}
                    </span>
                  </div>

                  {/* SVG Line Chart */}
                  <div className="h-28 w-full relative">
                    <svg className="w-full h-full overflow-hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {curve.length > 1 && (
                        <polyline
                          fill="none"
                          stroke="#2962ff"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                          points={curve
                            .map((pt, i) => {
                              const x = ((i / (curve.length - 1)) * 100).toFixed(2);
                              const minBal = Math.min(...curve.map(c => c.balance)) * 0.98;
                              const maxBal = Math.max(...curve.map(c => c.balance)) * 1.02;
                              const range = maxBal - minBal || 1;
                              const y = (100 - ((pt.balance - minBal) / range) * 100).toFixed(2);
                              return `${x},${y}`;
                            })
                            .join(' ')}
                        />
                      )}
                    </svg>
                  </div>
                </div>

                {/* Additional Stats Table */}
                <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-gray-400">
                    <span>Winning / Losing Trades</span>
                    <span className="font-mono text-white">
                      <span className="text-[#089981]">{stats.winningTrades}</span> / <span className="text-[#f23645]">{stats.losingTrades}</span>
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Avg Win / Avg Loss</span>
                    <span className="font-mono text-white">
                      +${stats.avgWinningTrade.toFixed(2)} / -${stats.avgLosingTrade.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Consecutive Wins / Losses</span>
                    <span className="font-mono text-white">
                      {stats.maxConsecutiveWins} wins / {stats.maxConsecutiveLosses} losses
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Longs vs Shorts</span>
                    <span className="font-mono text-white">
                      {stats.longCount}L ({stats.longWinRate}%) / {stats.shortCount}S ({stats.shortWinRate}%)
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Avg Holding Time</span>
                    <span className="font-mono text-white">{stats.avgHoldingTimeMinutes.toFixed(0)} min</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: OPEN POSITIONS & PENDING ORDERS */}
          {activeTab === 'positions' && (
            <div className="space-y-4">
              {/* Active Open Positions */}
              <div>
                <div className="text-[11px] font-bold text-gray-300 mb-1 flex items-center justify-between">
                  <span>Open Positions ({openTrades.length})</span>
                </div>
                {openTrades.length === 0 ? (
                  <div className="text-gray-500 py-3 text-center">No active open positions.</div>
                ) : (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-[#2a2e39]">
                        <th className="pb-1.5">Side</th>
                        <th className="pb-1.5">Lots</th>
                        <th className="pb-1.5">Entry</th>
                        <th className="pb-1.5">Current</th>
                        <th className="pb-1.5">SL</th>
                        <th className="pb-1.5">TP</th>
                        <th className="pb-1.5">Unrealized PnL</th>
                        <th className="pb-1.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map((t) => {
                        const pips = t.type === 'BUY'
                          ? (currentPrice - t.entry_price) / 0.0001
                          : (t.entry_price - currentPrice) / 0.0001;
                        const pnl = pips * 10 * t.lot_size;

                        return (
                          <tr key={t.id} className="border-b border-[#2a2e39]/60 hover:bg-[#1e222d]">
                            <td className="py-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                t.type === 'BUY' ? 'bg-[#089981]/20 text-[#089981]' : 'bg-[#f23645]/20 text-[#f23645]'
                              }`}>
                                {t.type}
                              </span>
                            </td>
                            <td className="py-1.5 text-white">{t.lot_size.toFixed(2)}</td>
                            <td className="py-1.5 text-gray-300">{t.entry_price.toFixed(5)}</td>
                            <td className="py-1.5 text-white font-bold">{currentPrice.toFixed(5)}</td>
                            <td className="py-1.5 text-[#f23645]">{t.sl ? t.sl.toFixed(5) : '-'}</td>
                            <td className="py-1.5 text-[#089981]">{t.tp ? t.tp.toFixed(5) : '-'}</td>
                            <td className="py-1.5">
                              <span className={pnl >= 0 ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                                {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pips >= 0 ? '+' : ''}{pips.toFixed(1)}p)
                              </span>
                            </td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() => handleClosePosition(t)}
                                data-testid="close-trade-btn"
                                title="Close Position"
                                className="px-2 py-0.5 rounded bg-red-900/40 text-red-300 hover:bg-red-800 border border-red-800 text-[10px] font-sans"
                              >
                                Close
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pending Orders */}
              {pendingTrades.length > 0 && (
                <div className="pt-2 border-t border-[#2a2e39]">
                  <div className="text-[11px] font-bold text-amber-400 mb-1">
                    Pending Orders ({pendingTrades.length})
                  </div>
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="text-gray-400 border-b border-[#2a2e39]">
                        <th className="pb-1.5">Order Type</th>
                        <th className="pb-1.5">Lots</th>
                        <th className="pb-1.5">Target Price</th>
                        <th className="pb-1.5">Distance</th>
                        <th className="pb-1.5">SL</th>
                        <th className="pb-1.5">TP</th>
                        <th className="pb-1.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTrades.map((t) => {
                        const target = t.limit_price || t.stop_price || t.entry_price;
                        const distPips = (Math.abs(target - currentPrice) / 0.0001).toFixed(1);
                        return (
                          <tr key={t.id} className="border-b border-[#2a2e39]/60 hover:bg-[#1e222d]">
                            <td className="py-1.5">
                              <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-amber-900/30 text-amber-300 border border-amber-800/50">
                                {t.order_type || t.type}
                              </span>
                            </td>
                            <td className="py-1.5 text-white">{t.lot_size.toFixed(2)}</td>
                            <td className="py-1.5 text-white font-bold">{target.toFixed(5)}</td>
                            <td className="py-1.5 text-gray-400">{distPips} pips</td>
                            <td className="py-1.5 text-[#f23645]">{t.sl ? t.sl.toFixed(5) : '-'}</td>
                            <td className="py-1.5 text-[#089981]">{t.tp ? t.tp.toFixed(5) : '-'}</td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() => backtestingEngine.cancelTrade(t.id)}
                                className="px-2 py-0.5 rounded bg-[#2a2e39] text-gray-300 hover:text-white border border-[#363c4e] text-[10px] font-sans"
                              >
                                Cancel
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TRADE HISTORY */}
          {activeTab === 'history' && (
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 font-semibold">Completed Trades Log</span>
                <button
                  onClick={exportToCSV}
                  className="flex items-center space-x-1 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white"
                >
                  <Download size={13} />
                  <span>Export to CSV</span>
                </button>
              </div>

              {closedTrades.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  No trades recorded yet. As trades are executed and hit SL/TP during backtesting, they will be listed here.
                </div>
              ) : (
                <table className="w-full text-left font-mono text-[11px]">
                  <thead>
                    <tr className="text-gray-400 border-b border-[#2a2e39]">
                      <th className="pb-2">Side</th>
                      <th className="pb-2">Lots</th>
                      <th className="pb-2">Entry</th>
                      <th className="pb-2">Exit</th>
                      <th className="pb-2">PnL ($)</th>
                      <th className="pb-2">PnL (pips)</th>
                      <th className="pb-2">R:R</th>
                      <th className="pb-2">Exit Reason</th>
                      <th className="pb-2">Notes</th>
                      <th className="pb-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map((t) => (
                      <tr key={t.id} className="border-b border-[#2a2e39]/60 hover:bg-[#1e222d]">
                        <td className="py-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                            t.type === 'BUY' ? 'bg-[#089981]/20 text-[#089981]' : 'bg-[#f23645]/20 text-[#f23645]'
                          }`}>
                            {t.type}
                          </span>
                        </td>
                        <td className="py-1.5 text-white">{t.lot_size.toFixed(2)}</td>
                        <td className="py-1.5 text-gray-300">{t.entry_price.toFixed(5)}</td>
                        <td className="py-1.5 text-white">{t.exit_price ? t.exit_price.toFixed(5) : '-'}</td>
                        <td className={`py-1.5 font-bold ${(t.pnl || 0) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                          {(t.pnl || 0) >= 0 ? '+' : ''}${(t.pnl || 0).toFixed(2)}
                        </td>
                        <td className={`py-1.5 ${(t.pnl_pips || 0) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                          {(t.pnl_pips || 0) >= 0 ? '+' : ''}{(t.pnl_pips || 0).toFixed(1)}p
                        </td>
                        <td className="py-1.5 text-gray-300">{t.r_multiple ? `${t.r_multiple}R` : '-'}</td>
                        <td className="py-1.5">
                          <span className="text-[10px] bg-[#131722] px-1 py-0.5 rounded border border-[#2a2e39] text-gray-300">
                            {t.exit_reason || 'MANUAL'}
                          </span>
                        </td>
                        <td className="py-1.5 text-gray-400 font-sans max-w-[150px] truncate">
                          {t.notes || '-'}
                        </td>
                        <td className="py-1.5 text-right">
                          <button
                            onClick={() => backtestingEngine.deleteTrade(t.id)}
                            className="p-1 rounded text-gray-500 hover:text-red-400"
                            title="Delete Trade Record"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ label: string; value: string; isPositive?: boolean }> = ({ label, value, isPositive }) => (
  <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39]">
    <span className="text-gray-400 text-[10px] block">{label}</span>
    <span
      className={`font-mono text-xs font-bold ${
        isPositive === true ? 'text-[#089981]' : isPositive === false ? 'text-[#f23645]' : 'text-white'
      }`}
    >
      {value}
    </span>
  </div>
);
