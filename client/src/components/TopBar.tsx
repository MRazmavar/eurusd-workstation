/**
 * TradingView-Style Top Navigation Bar.
 */
import React, { useState } from 'react';
import {
  BarChart2,
  CandlestickChart,
  LineChart,
  AreaChart,
  Sliders,
  Play,
  RotateCcw,
  RotateCw,
  Maximize2,
  Minimize2,
  Settings,
  ChevronDown,
  Activity,
  Calendar,
  Layers,
  FolderOpen,
  ShieldCheck,
  Wallet,
  Edit3,
  Dices,
  Clock,
  Globe,
  Newspaper,
  Menu,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { ChartType, Timeframe, Quote } from '../types';

interface TopBarProps {
  quote: Quote | null;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (ct: ChartType) => void;
  replayActive: boolean;
  onToggleReplay: () => void;
  onRandomDateReplay?: () => void;
  onOpenIndicators: () => void;
  onOpenSettings: () => void;
  onOpenSessions?: () => void;
  onOpenValidation?: () => void;
  onResetChart: () => void;
  onFitData: () => void;
  activeIndicatorsCount: number;
  balance?: number;
  equity?: number;
  onOpenBalanceModal?: () => void;
  onOpenQuickTimeframe?: () => void;
  sessionsIndicatorActive?: boolean;
  activeSessionLabel?: string;
  onToggleSessionsIndicator?: () => void;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
  newsActive?: boolean;
  onToggleNews?: () => void;
  newsFilter?: 'ALL' | 'HIGH_ONLY';
  onToggleNewsFilter?: () => void;
  isMobile?: boolean;
  effectiveMode?: 'mobile' | 'desktop';
  viewMode?: 'auto' | 'mobile' | 'desktop';
  onToggleMode?: () => void;
  onOpenMobileMenu?: () => void;
}

const TIMEFRAMES: { label: string; value: Timeframe }[] = [
  { label: '1s', value: '1s' },
  { label: '5s', value: '5s' },
  { label: '15s', value: '15s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '3m', value: '3m' },
  { label: '5m', value: '5m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '45m', value: '45m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '4h', value: '4h' },
  { label: '1D', value: '1D' },
  { label: '1W', value: '1W' },
  { label: '1M', value: '1M' },
];

const FAVORITE_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

export const TopBar: React.FC<TopBarProps> = ({
  quote,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  replayActive,
  onToggleReplay,
  onRandomDateReplay,
  onOpenIndicators,
  onOpenSettings,
  onOpenSessions,
  onOpenValidation,
  onResetChart,
  onFitData,
  activeIndicatorsCount,
  balance,
  equity,
  onOpenBalanceModal,
  onOpenQuickTimeframe,
  sessionsIndicatorActive = true,
  activeSessionLabel,
  onToggleSessionsIndicator,
  timezone = 'UTC',
  onTimezoneChange,
  newsActive = true,
  onToggleNews,
  newsFilter = 'ALL',
  onToggleNewsFilter,
  isMobile = false,
  effectiveMode = 'desktop',
  viewMode = 'auto',
  onToggleMode,
  onOpenMobileMenu,
}) => {
  const [showTfDropdown, setShowTfDropdown] = useState(false);
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const isBull = (quote?.change ?? 0) >= 0;

  // Mobile Top Bar
  if (isMobile) {
    return (
      <div className="h-11 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-2 text-xs select-none z-30">
        {/* Left: Symbol & Live Bid Price */}
        <div className="flex items-center space-x-1.5 min-w-0">
          <div className="flex items-center space-x-1 px-1.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-white font-bold text-xs">
            <span className="text-[#2962ff] text-xs">●</span>
            <span>EUR/USD</span>
          </div>

          {quote && (
            <span
              data-testid="mobile-topbar-bid"
              className={`font-mono text-xs font-semibold tabular-nums ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}
            >
              {quote.bid.toFixed(5)}
            </span>
          )}

          {/* Timeframe Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowTfDropdown(!showTfDropdown)}
              data-testid="mobile-tf-btn"
              className="flex items-center space-x-0.5 px-2 py-1 rounded bg-[#1e222d] text-gray-200 border border-[#2a2e39] font-mono font-semibold text-[11px] hover:text-white"
            >
              <span>{timeframe}</span>
              <ChevronDown size={11} className="text-gray-400" />
            </button>

            {showTfDropdown && (
              <div
                className="absolute top-8 left-0 w-36 bg-[#1e222d] border border-[#2a2e39] rounded shadow-xl py-1 z-50 max-h-72 overflow-y-auto"
                onMouseLeave={() => setShowTfDropdown(false)}
              >
                <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Quick Timeframes
                </div>
                {FAVORITE_TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf);
                      setShowTfDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex justify-between ${
                      timeframe === tf ? 'text-[#2962ff] font-bold' : 'text-gray-200'
                    }`}
                  >
                    <span>{tf}</span>
                  </button>
                ))}
                <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
                  All Timeframes
                </div>
                {TIMEFRAMES.filter(t => !FAVORITE_TIMEFRAMES.includes(t.value)).map((item) => (
                  <button
                    key={item.value}
                    onClick={() => {
                      onTimeframeChange(item.value);
                      setShowTfDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex justify-between ${
                      timeframe === item.value ? 'text-[#2962ff] font-bold' : 'text-gray-200'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chart Type Selector */}
          <div className="relative">
            <button
              onClick={() => setShowChartTypeDropdown(!showChartTypeDropdown)}
              data-testid="mobile-chart-type-btn"
              className="p-1.5 rounded bg-[#1e222d] text-gray-300 border border-[#2a2e39] hover:text-white"
              title="Chart Type"
            >
              {chartType === 'candlestick' && <CandlestickChart size={13} />}
              {chartType === 'hollow' && <CandlestickChart size={13} className="text-gray-400" />}
              {chartType === 'bar' && <BarChart2 size={13} />}
              {chartType === 'line' && <LineChart size={13} />}
              {chartType === 'area' && <AreaChart size={13} />}
              {chartType === 'baseline' && <Activity size={13} />}
            </button>

            {showChartTypeDropdown && (
              <div
                className="absolute top-8 left-0 w-36 bg-[#1e222d] border border-[#2a2e39] rounded shadow-xl py-1 z-50"
                onMouseLeave={() => setShowChartTypeDropdown(false)}
              >
                {[
                  { id: 'candlestick', label: 'Candles', icon: CandlestickChart },
                  { id: 'hollow', label: 'Hollow', icon: CandlestickChart },
                  { id: 'bar', label: 'Bars', icon: BarChart2 },
                  { id: 'line', label: 'Line', icon: LineChart },
                  { id: 'area', label: 'Area', icon: AreaChart },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onChartTypeChange(item.id as ChartType);
                      setShowChartTypeDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex items-center space-x-2 ${
                      chartType === item.id ? 'text-[#2962ff] font-semibold' : 'text-gray-200'
                    }`}
                  >
                    <item.icon size={13} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Mode Switcher, Replay, Mobile Hamburger Menu */}
        <div className="flex items-center space-x-1.5">
          {/* Mode Switcher Pill */}
          {onToggleMode && (
            <button
              onClick={onToggleMode}
              data-testid="topbar-mode-toggle"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#2962ff] text-[10px] font-semibold shadow-sm"
              title="Click to switch to Desktop Mode"
            >
              <Smartphone size={12} />
              <span>Mobile</span>
            </button>
          )}

          {/* Bar Replay button */}
          <button
            onClick={onToggleReplay}
            data-testid="topbar-replay-btn"
            className={`p-1.5 rounded border transition-colors ${
              replayActive ? 'bg-[#2962ff] text-white border-[#2962ff]' : 'bg-[#1e222d] border-[#2a2e39] text-gray-300 hover:text-white'
            }`}
            title="Toggle Bar Replay"
          >
            <Play size={13} className={replayActive ? 'fill-white' : 'text-[#089981]'} />
          </button>

          {/* Menu Drawer Hamburger */}
          <button
            onClick={onOpenMobileMenu}
            data-testid="topbar-mobile-menu-btn"
            className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#38bdf8] transition-colors"
            title="Open Workstation Menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-11 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-2 text-xs select-none z-30">
      {/* Left: Symbol, Price, Timeframes, Chart Type */}
      <div className="flex items-center space-x-1.5 h-full">
        {/* Symbol badge */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-white font-bold cursor-pointer hover:border-[#363c4e]">
          <span className="text-[#2962ff] text-sm">●</span>
          <span className="tracking-wide">EUR/USD</span>
          <span className="text-[10px] text-gray-400 font-normal">Euro / US Dollar</span>
        </div>

        {/* Live Price & Spread */}
        {quote && (
          <div className="flex items-center space-x-2 px-2 py-0.5 border-r border-[#2a2e39]">
            {quote.market_status === 'OPEN' ? (
              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#089981]/20 text-[#089981] border border-[#089981]/40 shadow-sm" title="Real-time interbank stream is active">
                <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-pulse"></span>
                <span>LIVE</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">
                CLOSED
              </span>
            )}
            <span className={`font-mono text-sm font-semibold tabular-nums ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {quote.bid.toFixed(5)}
            </span>
            <span className={`text-[11px] tabular-nums ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {isBull ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
            <span className="text-[10px] text-gray-400 bg-[#1e222d] px-1.5 py-0.5 rounded border border-[#2a2e39] font-mono">
              Spr {quote.spread.toFixed(1)}p
            </span>
          </div>
        )}

        {/* Favorite Timeframes Quick Access */}
        <div className="flex items-center space-x-0.5">
          {FAVORITE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              data-testid={`topbar-tf-${tf}`}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                timeframe === tf
                  ? 'bg-[#2962ff] text-white'
                  : 'text-gray-300 hover:bg-[#1e222d] hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}

          {/* Active Custom Timeframe Pill if not in favorites */}
          {!FAVORITE_TIMEFRAMES.includes(timeframe) && (
            <button
              onClick={() => onOpenQuickTimeframe?.()}
              data-testid="topbar-custom-timeframe-pill"
              className="px-2 py-1 rounded font-medium bg-[#2962ff] text-white shadow font-mono flex items-center space-x-1"
              title={`Custom Timeframe: ${timeframe} (Click or type 0-9 to change)`}
            >
              <span>{timeframe}</span>
            </button>
          )}

          {/* Timeframes Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowTfDropdown(!showTfDropdown)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
              title="All Timeframes"
            >
              <ChevronDown size={14} />
            </button>

            {showTfDropdown && (
              <div
                className="absolute top-8 left-0 w-36 bg-[#1e222d] border border-[#2a2e39] rounded shadow-xl py-1 z-50 max-h-72 overflow-y-auto"
                onMouseLeave={() => setShowTfDropdown(false)}
              >
                <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                  Seconds
                </div>
                {['1s', '5s', '15s', '30s'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf as Timeframe);
                      setShowTfDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between"
                  >
                    <span>{tf}</span>
                    <span className="text-[10px] text-gray-400">Sec</span>
                  </button>
                ))}
                <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
                  Minutes
                </div>
                {['1m', '3m', '5m', '15m', '30m', '45m'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf as Timeframe);
                      setShowTfDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between"
                  >
                    <span>{tf}</span>
                    <span className="text-[10px] text-gray-400">Min</span>
                  </button>
                ))}
                <div className="px-2 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
                  Hours & Days
                </div>
                {['1h', '2h', '4h', '1D', '1W', '1M'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      onTimeframeChange(tf as Timeframe);
                      setShowTfDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between"
                  >
                    <span>{tf}</span>
                    <span className="text-[10px] text-gray-400">
                      {tf.includes('D') ? 'Day' : tf.includes('W') ? 'Week' : tf.includes('M') ? 'Month' : 'Hour'}
                    </span>
                  </button>
                ))}

                {/* Custom Interval trigger */}
                <div className="p-1 border-t border-[#2a2e39] mt-1">
                  <button
                    onClick={() => {
                      setShowTfDropdown(false);
                      onOpenQuickTimeframe?.();
                    }}
                    data-testid="topbar-custom-interval-btn"
                    className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2962ff] text-white font-medium text-[11px] flex items-center justify-between transition-colors"
                  >
                    <span>Custom Interval...</span>
                    <span className="text-[10px] text-gray-300 font-mono bg-black/40 px-1 py-0.5 rounded">0-9</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

        {/* Chart Type Selector */}
        <div className="relative">
          <button
            onClick={() => setShowChartTypeDropdown(!showChartTypeDropdown)}
            className="flex items-center space-x-1 px-2 py-1 rounded text-gray-300 hover:bg-[#1e222d] hover:text-white"
            title="Chart Type"
          >
            {chartType === 'candlestick' && <CandlestickChart size={15} />}
            {chartType === 'hollow' && <CandlestickChart size={15} className="text-gray-400" />}
            {chartType === 'bar' && <BarChart2 size={15} />}
            {chartType === 'line' && <LineChart size={15} />}
            {chartType === 'area' && <AreaChart size={15} />}
            {chartType === 'baseline' && <Activity size={15} />}
            <ChevronDown size={12} className="text-gray-400 ml-0.5" />
          </button>

          {showChartTypeDropdown && (
            <div
              className="absolute top-8 left-0 w-36 bg-[#1e222d] border border-[#2a2e39] rounded shadow-xl py-1 z-50"
              onMouseLeave={() => setShowChartTypeDropdown(false)}
            >
              {[
                { id: 'candlestick', label: 'Candles', icon: CandlestickChart },
                { id: 'hollow', label: 'Hollow Candles', icon: CandlestickChart },
                { id: 'bar', label: 'Bars (OHLC)', icon: BarChart2 },
                { id: 'line', label: 'Line', icon: LineChart },
                { id: 'area', label: 'Area', icon: AreaChart },
                { id: 'baseline', label: 'Baseline', icon: Activity },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onChartTypeChange(item.id as ChartType);
                    setShowChartTypeDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex items-center space-x-2 ${
                    chartType === item.id ? 'text-[#2962ff] font-semibold' : 'text-gray-200'
                  }`}
                >
                  <item.icon size={14} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-[1px] bg-[#2a2e39] mx-1" />

        {/* Indicators Dialog Trigger */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e]"
          title="Technical Indicators"
        >
          <Sliders size={14} className="text-[#2962ff]" />
          <span>Indicators</span>
          {activeIndicatorsCount > 0 && (
            <span className="bg-[#2962ff] text-white text-[10px] px-1 rounded-full font-bold">
              {activeIndicatorsCount}
            </span>
          )}
        </button>

        {/* Historical Candle Replay Toggle Button */}
        <button
          onClick={onToggleReplay}
          data-testid="topbar-replay-btn"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors ${
            replayActive
              ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/20'
              : 'bg-[#1e222d] border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e]'
          }`}
          title="Manual Replay & Backtest Mode"
        >
          <Play size={13} className={replayActive ? 'fill-white' : 'text-[#089981]'} />
          <span className="font-semibold">Bar Replay</span>
        </button>

        {/* Random Date Backtest Button */}
        <button
          onClick={onRandomDateReplay}
          data-testid="topbar-random-date-btn"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors bg-[#1e222d] border-[#2a2e39] text-purple-300 hover:text-white hover:border-purple-500 hover:bg-[#2a2e39]"
          title="Jump to a random historical date for blind backtesting"
        >
          <Dices size={13} className="text-purple-400" />
          <span className="font-semibold">Random Date</span>
        </button>

        {/* Forex Sessions Indicator Toggle Button */}
        <button
          onClick={onToggleSessionsIndicator}
          data-testid="topbar-sessions-btn"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors ${
            sessionsIndicatorActive
              ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-purple-200 shadow-sm'
              : 'bg-[#1e222d] border-[#2a2e39] text-gray-400 hover:text-white hover:border-[#363c4e]'
          }`}
          title="Toggle Forex Sessions indicator (Asia / Shield Area, Frankfurt 1h, London 1h, NY 1h)"
        >
          <Clock size={13} className={sessionsIndicatorActive ? 'text-purple-400' : 'text-gray-400'} />
          <span className="font-semibold">Sessions</span>
          {sessionsIndicatorActive && activeSessionLabel ? (
            <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#10b981]/25 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              {activeSessionLabel}
            </span>
          ) : (
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                sessionsIndicatorActive ? 'bg-[#8b5cf6] text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {sessionsIndicatorActive ? 'ON' : 'OFF'}
            </span>
          )}
        </button>

        {/* Forex Factory News Events Toggle Button */}
        <button
          onClick={onToggleNews}
          data-testid="topbar-news-btn"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors ${
            newsActive
              ? 'bg-[#ef4444]/20 border-[#ef4444] text-red-200 shadow-sm'
              : 'bg-[#1e222d] border-[#2a2e39] text-gray-400 hover:text-white hover:border-[#363c4e]'
          }`}
          title="Toggle Forex Factory Economic Calendar news releases on chart (Red High Impact & Yellow Medium Impact)"
        >
          <Newspaper size={13} className={newsActive ? 'text-red-400' : 'text-gray-400'} />
          <span className="font-semibold">News</span>
          <span
            className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
              newsActive ? 'bg-[#ef4444] text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            {newsActive ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Saved Sessions Button */}
        <button
          onClick={onOpenSessions}
          data-testid="topbar-saved-sessions-btn"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e]"
          title="Manage Saved Backtesting Sessions"
        >
          <FolderOpen size={14} className="text-amber-400" />
          <span>Saved</span>
        </button>

        {/* Data Quality / Audit Button */}
        <button
          onClick={onOpenValidation}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white hover:border-[#363c4e]"
          title="Market Data Integrity Audit"
        >
          <ShieldCheck size={14} className="text-[#089981]" />
          <span className="hidden xl:inline">Audit</span>
        </button>
      </div>

      {/* Right Controls: Auto-Scale, Reset, Status, Settings */}
      <div className="flex items-center space-x-2">
        {/* Account Capital & Balance Widget */}
        {balance !== undefined && (
          <button
            onClick={onOpenBalanceModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-[#38bdf8] text-gray-200 hover:text-white transition-all text-xs font-mono group"
            title="Click to view or change default account balance"
            data-testid="topbar-balance-btn"
          >
            <Wallet size={14} className="text-[#089981] group-hover:text-[#38bdf8] transition-colors" />
            <div className="flex items-center space-x-1">
              <span className="text-gray-400 text-[10px]">BAL:</span>
              <span className="font-bold text-white">${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            {equity !== undefined && (
              <div className="hidden lg:flex items-center space-x-1 pl-1.5 border-l border-[#2a2e39]">
                <span className="text-gray-400 text-[10px]">EQ:</span>
                <span className={`font-bold ${equity >= balance ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <Edit3 size={11} className="text-gray-500 group-hover:text-white transition-colors ml-0.5" />
          </button>
        )}

        {/* Quick Viewport Helpers */}
        <button
          onClick={onFitData}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Fit All Available Data"
        >
          <Layers size={14} />
        </button>
        <button
          onClick={onResetChart}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Reset Chart Viewport"
        >
          <RotateCcw size={14} />
        </button>

        {/* Feed & Market Status Pill */}
        {quote && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39]">
            <span
              className={`w-2 h-2 rounded-full ${
                quote.status === 'LIVE'
                  ? 'bg-[#089981] animate-pulse'
                  : quote.status === 'DELAYED'
                  ? 'bg-amber-400'
                  : 'bg-blue-400'
              }`}
            />
            <span className="text-[10px] font-semibold tracking-wider text-gray-300">
              {quote.status}
            </span>
            {quote.market_status === 'CLOSED_WEEKEND' && (
              <span className="text-[9px] text-amber-300 bg-amber-900/40 px-1 rounded">
                Weekend
              </span>
            )}
            <span className="text-[9px] text-gray-500 font-mono">
              {quote.latency_ms ?? 45}ms
            </span>
          </div>
        )}

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Settings Dialog Trigger */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Workstation Settings"
        >
          <Settings size={15} />
        </button>

        {/* Display Mode Toggle (Desktop / Mobile) */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            data-testid="topbar-mode-toggle"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-[#2962ff] text-gray-300 hover:text-white transition-colors"
            title={`Display Mode: ${viewMode?.toUpperCase() || 'AUTO'} (Click to switch to Mobile view)`}
          >
            <Monitor size={13} className="text-[#2962ff]" />
            <span className="text-[11px] font-medium hidden md:inline">
              {viewMode === 'auto' ? 'Auto (Desktop)' : 'Desktop'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
