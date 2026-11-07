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
  onOpenIndicators: () => void;
  onOpenSettings: () => void;
  onOpenSessions?: () => void;
  onOpenValidation?: () => void;
  onResetChart: () => void;
  onFitData: () => void;
  activeIndicatorsCount: number;
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
  onOpenIndicators,
  onOpenSettings,
  onOpenSessions,
  onOpenValidation,
  onResetChart,
  onFitData,
  activeIndicatorsCount,
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
            <span className={`font-mono text-sm font-semibold tabular-nums ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {quote.bid.toFixed(5)}
            </span>
            <span className={`text-[11px] tabular-nums ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}>
              {isBull ? '+' : ''}{quote.changePercent.toFixed(2)}%
            </span>
            <span className="text-[10px] text-gray-400 bg-[#1e222d] px-1 py-0.5 rounded border border-[#2a2e39]">
              Spread {quote.spread.toFixed(1)}p
            </span>
          </div>
        )}

        {/* Favorite Timeframes Quick Access */}
        <div className="flex items-center space-x-0.5">
          {FAVORITE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
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

        {/* Sessions Button */}
        <button
          onClick={onOpenSessions}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e]"
          title="Manage Backtesting Sessions"
        >
          <FolderOpen size={14} className="text-amber-400" />
          <span>Sessions</span>
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
      </div>
    </div>
  );
};
