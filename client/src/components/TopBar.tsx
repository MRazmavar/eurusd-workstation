/**
 * TradingView-Style Top Navigation Bar with Smooth Horizontal Scrolling.
 * Supports touch swiping on mobile and mouse wheel + scroll buttons on desktop.
 * Uses fixed-positioned dropdown overlays to prevent container overflow clipping.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  ChevronLeft,
  ChevronRight,
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
  // Dropdown visibility states
  const [showTfDropdown, setShowTfDropdown] = useState(false);
  const [showChartTypeDropdown, setShowChartTypeDropdown] = useState(false);

  // Exact fixed coordinates for dropdown overlays so they escape overflow-x containers
  const [tfDropdownPos, setTfDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [chartTypeDropdownPos, setChartTypeDropdownPos] = useState<{ top: number; left: number } | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // References and states for horizontal toolbar scrolling
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [desktopCanScrollLeft, setDesktopCanScrollLeft] = useState(false);
  const [desktopCanScrollRight, setDesktopCanScrollRight] = useState(false);
  const [mobileCanScrollLeft, setMobileCanScrollLeft] = useState(false);
  const [mobileCanScrollRight, setMobileCanScrollRight] = useState(false);

  const checkDesktopScroll = useCallback(() => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setDesktopCanScrollLeft(canLeft);
    setDesktopCanScrollRight(canRight);
  }, []);

  const checkMobileScroll = useCallback(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const canLeft = el.scrollLeft > 4;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    setMobileCanScrollLeft(canLeft);
    setMobileCanScrollRight(canRight);
  }, []);

  useEffect(() => {
    checkDesktopScroll();
    checkMobileScroll();
    const handleResize = () => {
      checkDesktopScroll();
      checkMobileScroll();
      setShowTfDropdown(false);
      setShowChartTypeDropdown(false);
    };
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(() => {
      checkDesktopScroll();
      checkMobileScroll();
    }, 200);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [checkDesktopScroll, checkMobileScroll, quote, balance, timeframe]);

  // Handle dropdown open with viewport boundary clamping
  const handleOpenTfDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 155;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 8));
    setTfDropdownPos({ top: rect.bottom + 4, left });
    setShowTfDropdown((prev) => !prev);
    setShowChartTypeDropdown(false);
  };

  const handleOpenChartTypeDropdown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownWidth = 155;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - dropdownWidth - 8));
    setChartTypeDropdownPos({ top: rect.bottom + 4, left });
    setShowChartTypeDropdown((prev) => !prev);
    setShowTfDropdown(false);
  };

  // Handle vertical mouse wheel conversion to horizontal scroll on desktop
  const handleDesktopWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = desktopScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkDesktopScroll();
      if (showTfDropdown) setShowTfDropdown(false);
      if (showChartTypeDropdown) setShowChartTypeDropdown(false);
    }
  };

  // Handle vertical mouse wheel conversion to horizontal scroll on mobile
  const handleMobileWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = mobileScrollRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
      checkMobileScroll();
      if (showTfDropdown) setShowTfDropdown(false);
      if (showChartTypeDropdown) setShowChartTypeDropdown(false);
    }
  };

  const scrollDesktop = (direction: 'left' | 'right') => {
    const el = desktopScrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -260 : 260;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkDesktopScroll, 350);
  };

  const scrollMobile = (direction: 'left' | 'right') => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const amount = direction === 'left' ? -200 : 200;
    el.scrollBy({ left: amount, behavior: 'smooth' });
    setTimeout(checkMobileScroll, 350);
  };

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

  // ==========================================
  // FIXED DROPDOWN OVERLAYS (Portaled to document.body)
  // ==========================================
  const renderTimeframeDropdown = () => {
    if (!showTfDropdown || !tfDropdownPos || typeof document === 'undefined') return null;
    return createPortal(
      <>
        {/* Invisible backdrop to dismiss dropdown on click outside */}
        <div
          data-testid="tf-dropdown-backdrop"
          className="fixed inset-0 z-[9998] cursor-default"
          onClick={() => setShowTfDropdown(false)}
        />
        <div
          data-testid="timeframe-dropdown-menu"
          style={{
            position: 'fixed',
            top: `${tfDropdownPos.top}px`,
            left: `${tfDropdownPos.left}px`,
          }}
          className="w-40 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl py-1 z-[9999] max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-2.5 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
            Quick Timeframes
          </div>
          {FAVORITE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              data-testid={`tf-select-${tf}`}
              onClick={() => {
                onTimeframeChange(tf);
                setShowTfDropdown(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex justify-between cursor-pointer transition-colors ${
                timeframe === tf ? 'text-[#2962ff] font-bold bg-[#2962ff]/10' : 'text-gray-200'
              }`}
            >
              <span>{tf}</span>
            </button>
          ))}
          <div className="px-2.5 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
            Seconds
          </div>
          {['1s', '5s', '15s', '30s'].map((tf) => (
            <button
              key={tf}
              data-testid={`tf-select-${tf}`}
              onClick={() => {
                onTimeframeChange(tf as Timeframe);
                setShowTfDropdown(false);
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between cursor-pointer transition-colors"
            >
              <span>{tf}</span>
              <span className="text-[10px] text-gray-400">Sec</span>
            </button>
          ))}
          <div className="px-2.5 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
            Minutes
          </div>
          {['1m', '3m', '5m', '15m', '30m', '45m'].map((tf) => (
            <button
              key={tf}
              data-testid={`tf-select-${tf}`}
              onClick={() => {
                onTimeframeChange(tf as Timeframe);
                setShowTfDropdown(false);
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between cursor-pointer transition-colors"
            >
              <span>{tf}</span>
              <span className="text-[10px] text-gray-400">Min</span>
            </button>
          ))}
          <div className="px-2.5 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-t border-[#2a2e39] mt-1">
            Hours & Days
          </div>
          {['1h', '2h', '4h', '1D', '1W', '1M'].map((tf) => (
            <button
              key={tf}
              data-testid={`tf-select-${tf}`}
              onClick={() => {
                onTimeframeChange(tf as Timeframe);
                setShowTfDropdown(false);
              }}
              className="w-full text-left px-3 py-1 hover:bg-[#2a2e39] text-gray-200 flex justify-between cursor-pointer transition-colors"
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
              className="w-full text-left px-2 py-1.5 rounded hover:bg-[#2962ff] text-white font-medium text-[11px] flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Custom Interval...</span>
              <span className="text-[10px] text-gray-300 font-mono bg-black/40 px-1 py-0.5 rounded">0-9</span>
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  };

  const renderChartTypeDropdown = () => {
    if (!showChartTypeDropdown || !chartTypeDropdownPos || typeof document === 'undefined') return null;
    return createPortal(
      <>
        {/* Invisible backdrop to dismiss dropdown on click outside */}
        <div
          data-testid="chart-type-dropdown-backdrop"
          className="fixed inset-0 z-[9998] cursor-default"
          onClick={() => setShowChartTypeDropdown(false)}
        />
        <div
          data-testid="chart-type-dropdown-menu"
          style={{
            position: 'fixed',
            top: `${chartTypeDropdownPos.top}px`,
            left: `${chartTypeDropdownPos.left}px`,
          }}
          className="w-40 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl py-1 z-[9999] animate-in fade-in zoom-in-95 duration-100 font-sans select-none"
          onClick={(e) => e.stopPropagation()}
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
              data-testid={`chart-type-select-${item.id}`}
              onClick={() => {
                onChartTypeChange(item.id as ChartType);
                setShowChartTypeDropdown(false);
              }}
              className={`w-full text-left px-3 py-1.5 hover:bg-[#2a2e39] flex items-center space-x-2 cursor-pointer transition-colors ${
                chartType === item.id ? 'text-[#2962ff] font-semibold bg-[#2962ff]/10' : 'text-gray-200'
              }`}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </>,
      document.body
    );
  };

  // ==========================================
  // MOBILE TOP BAR (Swipeable & Scrollable Row)
  // ==========================================
  if (isMobile) {
    return (
      <div className="relative h-11 bg-[#131722] border-b border-[#2a2e39] flex items-center text-xs select-none z-30 w-full min-w-0">
        {/* Left Scroll Chevron Button (appears when scrolled right) */}
        {mobileCanScrollLeft && (
          <button
            onClick={() => scrollMobile('left')}
            data-testid="mobile-topbar-scroll-left-btn"
            className="absolute left-0 z-40 h-full px-1.5 bg-gradient-to-r from-[#131722] via-[#131722]/95 to-transparent flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Scroll left"
          >
            <ChevronLeft size={15} />
          </button>
        )}

        {/* Scrollable Container with all options */}
        <div
          ref={mobileScrollRef}
          onScroll={checkMobileScroll}
          onWheel={handleMobileWheel}
          data-testid="mobile-topbar-scroll"
          className="flex-1 flex items-center space-x-1.5 px-2 overflow-x-auto scroll-smooth no-scrollbar h-full touch-pan-x min-w-0"
        >
          {/* 1. Symbol badge */}
          <div className="flex items-center space-x-1 px-1.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-white font-bold text-xs flex-shrink-0">
            <span className="text-[#2962ff] text-xs">●</span>
            <span>EUR/USD</span>
          </div>

          {/* 2. Live Bid Price */}
          {quote && (
            <span
              data-testid="mobile-topbar-bid"
              className={`font-mono text-xs font-semibold tabular-nums flex-shrink-0 ${isBull ? 'text-[#089981]' : 'text-[#f23645]'}`}
            >
              {quote.bid.toFixed(5)}
            </span>
          )}

          {/* 3. Timeframe Selector Dropdown Button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={handleOpenTfDropdown}
              data-testid="mobile-tf-btn"
              className="flex items-center space-x-0.5 px-2 py-1 rounded bg-[#1e222d] text-gray-200 border border-[#2a2e39] font-mono font-semibold text-[11px] hover:text-white active:scale-95 cursor-pointer transition-all"
              title="Select Timeframe"
            >
              <span>{timeframe}</span>
              <ChevronDown size={11} className="text-gray-400" />
            </button>
          </div>

          {/* 4. Chart Type Selector Button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={handleOpenChartTypeDropdown}
              data-testid="mobile-chart-type-btn"
              className="p-1.5 rounded bg-[#1e222d] text-gray-300 border border-[#2a2e39] hover:text-white active:scale-95 cursor-pointer transition-all"
              title="Chart Type"
            >
              {chartType === 'candlestick' && <CandlestickChart size={13} />}
              {chartType === 'hollow' && <CandlestickChart size={13} className="text-gray-400" />}
              {chartType === 'bar' && <BarChart2 size={13} />}
              {chartType === 'line' && <LineChart size={13} />}
              {chartType === 'area' && <AreaChart size={13} />}
              {chartType === 'baseline' && <Activity size={13} />}
            </button>
          </div>

          {/* 5. Indicators Dialog Trigger with Count Badge */}
          <button
            onClick={onOpenIndicators}
            data-testid="mobile-indicators-btn"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white flex-shrink-0 cursor-pointer"
            title="Technical Indicators"
          >
            <Sliders size={12} className="text-[#2962ff]" />
            <span className="text-[11px] font-semibold">Ind</span>
            {activeIndicatorsCount > 0 && (
              <span className="bg-[#2962ff] text-white text-[9px] px-1 rounded-full font-bold">
                {activeIndicatorsCount}
              </span>
            )}
          </button>

          {/* 6. Forex Sessions Indicator Toggle with Live Badge */}
          <button
            onClick={onToggleSessionsIndicator}
            data-testid="mobile-sessions-btn"
            className={`flex items-center space-x-1 px-2 py-1 rounded border flex-shrink-0 text-[11px] font-semibold transition-colors cursor-pointer ${
              sessionsIndicatorActive
                ? 'bg-[#8b5cf6]/20 border-[#8b5cf6] text-purple-200'
                : 'bg-[#1e222d] border-[#2a2e39] text-gray-400'
            }`}
            title="Toggle Forex Sessions (Asia, Frankfurt, London, NY)"
          >
            <Clock size={12} className={sessionsIndicatorActive ? 'text-purple-400' : 'text-gray-400'} />
            <span>Sess</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                sessionsIndicatorActive ? 'bg-[#8b5cf6] text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {sessionsIndicatorActive ? (activeSessionLabel || 'ON') : 'OFF'}
            </span>
          </button>

          {/* 7. Forex Factory News Events Toggle */}
          <button
            onClick={onToggleNews}
            data-testid="mobile-news-btn"
            className={`flex items-center space-x-1 px-2 py-1 rounded border flex-shrink-0 text-[11px] font-semibold transition-colors cursor-pointer ${
              newsActive
                ? 'bg-[#ef4444]/20 border-[#ef4444] text-red-200'
                : 'bg-[#1e222d] border-[#2a2e39] text-gray-400'
            }`}
            title="Toggle Forex Factory Economic Calendar Events"
          >
            <Newspaper size={12} className={newsActive ? 'text-red-400' : 'text-gray-400'} />
            <span>News</span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-mono font-bold ${
                newsActive ? 'bg-[#ef4444] text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {newsActive ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* 8. Bar Replay button */}
          <button
            onClick={onToggleReplay}
            data-testid="topbar-replay-btn"
            className={`flex items-center space-x-1 px-2 py-1 rounded border flex-shrink-0 text-[11px] font-semibold transition-colors cursor-pointer ${
              replayActive ? 'bg-[#2962ff] text-white border-[#2962ff]' : 'bg-[#1e222d] border-[#2a2e39] text-gray-300 hover:text-white'
            }`}
            title="Toggle Bar Replay"
          >
            <Play size={12} className={replayActive ? 'fill-white' : 'text-[#089981]'} />
            <span>Replay</span>
          </button>

          {/* 9. Random Date Backtest Button */}
          {onRandomDateReplay && (
            <button
              onClick={onRandomDateReplay}
              data-testid="topbar-random-date-btn"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-purple-300 hover:text-white flex-shrink-0 text-[11px] font-semibold cursor-pointer"
              title="Jump to a Random Past Date"
            >
              <Dices size={12} className="text-purple-400" />
              <span>Random</span>
            </button>
          )}

          {/* 10. Saved Sessions Trigger */}
          {onOpenSessions && (
            <button
              onClick={onOpenSessions}
              data-testid="mobile-saved-sessions-btn"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-amber-300 hover:text-white flex-shrink-0 text-[11px] font-semibold cursor-pointer"
              title="Saved Sessions"
            >
              <FolderOpen size={12} className="text-amber-400" />
              <span>Saved</span>
            </button>
          )}

          {/* 11. Market Data Integrity Audit */}
          {onOpenValidation && (
            <button
              onClick={onOpenValidation}
              data-testid="mobile-audit-btn"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#089981] hover:text-white flex-shrink-0 text-[11px] font-semibold cursor-pointer"
              title="Audit Data Quality"
            >
              <ShieldCheck size={12} className="text-[#089981]" />
              <span>Audit</span>
            </button>
          )}

          {/* 12. Account Balance Widget */}
          {balance !== undefined && onOpenBalanceModal && (
            <button
              onClick={onOpenBalanceModal}
              data-testid="mobile-balance-btn"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white flex-shrink-0 text-[11px] font-mono cursor-pointer"
              title="View / Edit Account Balance"
            >
              <Wallet size={12} className="text-[#089981]" />
              <span className="font-bold">${Math.round(balance).toLocaleString()}</span>
            </button>
          )}

          {/* 13. Settings Dialog Trigger */}
          <button
            onClick={onOpenSettings}
            data-testid="mobile-settings-btn"
            className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white flex-shrink-0 cursor-pointer"
            title="Settings"
          >
            <Settings size={13} />
          </button>

          {/* 14. Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            data-testid="mobile-fullscreen-btn"
            className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white flex-shrink-0 cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>

          {/* 15. Mode Switcher Pill */}
          {onToggleMode && (
            <button
              onClick={onToggleMode}
              data-testid="topbar-mode-toggle"
              className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-[#2962ff] text-[10px] font-semibold shadow-sm flex-shrink-0 cursor-pointer"
              title="Switch to Desktop Mode"
            >
              <Smartphone size={12} />
              <span>Mobile</span>
            </button>
          )}

          {/* 16. Menu Drawer Hamburger */}
          <button
            onClick={onOpenMobileMenu}
            data-testid="topbar-mobile-menu-btn"
            className="p-1.5 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#38bdf8] transition-colors flex-shrink-0 cursor-pointer"
            title="Open Workstation Menu"
          >
            <Menu size={15} />
          </button>
        </div>

        {/* Right Scroll Chevron Button (appears when more options exist to the right) */}
        {mobileCanScrollRight && (
          <button
            onClick={() => scrollMobile('right')}
            data-testid="mobile-topbar-scroll-right-btn"
            className="absolute right-0 z-40 h-full px-1.5 bg-gradient-to-l from-[#131722] via-[#131722]/95 to-transparent flex items-center justify-center text-gray-300 hover:text-white transition-all shadow-md active:scale-95"
            title="Scroll right"
          >
            <ChevronRight size={15} />
          </button>
        )}

        {/* Fixed Dropdown Overlays */}
        {renderTimeframeDropdown()}
        {renderChartTypeDropdown()}
      </div>
    );
  }

  // ==========================================
  // DESKTOP TOP BAR (Horizontal Scroll + Wheel)
  // ==========================================
  return (
    <div className="relative h-11 bg-[#131722] border-b border-[#2a2e39] flex items-center text-xs select-none z-30 w-full min-w-0">
      {/* Left Scroll Navigation Chevron (visible when scrolled right) */}
      {desktopCanScrollLeft && (
        <button
          onClick={() => scrollDesktop('left')}
          data-testid="topbar-scroll-left-btn"
          className="absolute left-0 z-40 h-full px-2 bg-gradient-to-r from-[#131722] via-[#131722]/95 to-transparent flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#1e222d]/60 transition-all shadow-md active:scale-95 cursor-pointer"
          title="Scroll left (or use mouse wheel)"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Main Continuous Scrollable Options Row */}
      <div
        ref={desktopScrollRef}
        onScroll={checkDesktopScroll}
        onWheel={handleDesktopWheel}
        data-testid="desktop-topbar-scroll"
        className="flex-1 flex items-center space-x-2 px-3 overflow-x-auto scroll-smooth toolbar-scroll h-full min-w-0"
      >
        {/* Symbol badge */}
        <div className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-white font-bold cursor-pointer hover:border-[#363c4e] flex-shrink-0">
          <span className="text-[#2962ff] text-sm">●</span>
          <span className="tracking-wide">EUR/USD</span>
          <span className="text-[10px] text-gray-400 font-normal hidden sm:inline">Euro / US Dollar</span>
        </div>

        {/* Quick Return to Mobile Mode Button (Always visible right at the front on Desktop view) */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            data-testid="topbar-desktop-return-mobile-btn"
            className="flex items-center space-x-1 px-2.5 py-1 rounded-md bg-[#2962ff] hover:bg-[#1f4cdb] text-white font-bold text-[11px] shadow-sm transition-all flex-shrink-0 active:scale-95 cursor-pointer"
            title="Switch back to Mobile Mode"
          >
            <Smartphone size={12} className="text-white" />
            <span>Mobile Mode</span>
          </button>
        )}

        {/* Live Price & Spread */}
        {quote && (
          <div className="flex items-center space-x-2 px-2 py-0.5 border-r border-[#2a2e39] flex-shrink-0">
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
        <div className="flex items-center space-x-0.5 flex-shrink-0">
          {FAVORITE_TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              data-testid={`topbar-tf-${tf}`}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
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
              className="px-2 py-1 rounded font-medium bg-[#2962ff] text-white shadow font-mono flex items-center space-x-1 cursor-pointer"
              title={`Custom Timeframe: ${timeframe} (Click or type 0-9 to change)`}
            >
              <span>{timeframe}</span>
            </button>
          )}

          {/* Timeframes Dropdown Button */}
          <div className="relative flex-shrink-0">
            <button
              onClick={handleOpenTfDropdown}
              data-testid="topbar-tf-dropdown-btn"
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d] cursor-pointer transition-colors active:scale-95"
              title="All Timeframes"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 flex-shrink-0" />

        {/* Chart Type Selector */}
        <div className="relative flex-shrink-0">
          <button
            onClick={handleOpenChartTypeDropdown}
            data-testid="topbar-chart-type-btn"
            className="flex items-center space-x-1 px-2 py-1 rounded text-gray-300 hover:bg-[#1e222d] hover:text-white cursor-pointer transition-colors active:scale-95"
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
        </div>

        <div className="h-4 w-[1px] bg-[#2a2e39] mx-1 flex-shrink-0" />

        {/* Indicators Dialog Trigger */}
        <button
          onClick={onOpenIndicators}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e] flex-shrink-0 cursor-pointer"
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
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors flex-shrink-0 cursor-pointer ${
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
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors bg-[#1e222d] border-[#2a2e39] text-purple-300 hover:text-white hover:border-purple-500 hover:bg-[#2a2e39] flex-shrink-0 cursor-pointer"
          title="Jump to a random historical date for blind backtesting"
        >
          <Dices size={13} className="text-purple-400" />
          <span className="font-semibold">Random Date</span>
        </button>

        {/* Forex Sessions Indicator Toggle Button */}
        <button
          onClick={onToggleSessionsIndicator}
          data-testid="topbar-sessions-btn"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors flex-shrink-0 cursor-pointer ${
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
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors flex-shrink-0 cursor-pointer ${
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
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#363c4e] flex-shrink-0 cursor-pointer"
          title="Manage Saved Backtesting Sessions"
        >
          <FolderOpen size={14} className="text-amber-400" />
          <span>Saved</span>
        </button>

        {/* Data Quality / Audit Button */}
        <button
          onClick={onOpenValidation}
          className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white hover:border-[#363c4e] flex-shrink-0 cursor-pointer"
          title="Market Data Integrity Audit"
        >
          <ShieldCheck size={14} className="text-[#089981]" />
          <span className="hidden xl:inline">Audit</span>
        </button>

        {/* Flexible spacer between primary tools and system controls */}
        <div className="flex-1 min-w-[12px]" />

        {/* Account Capital & Balance Widget */}
        {balance !== undefined && (
          <button
            onClick={onOpenBalanceModal}
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-[#38bdf8] text-gray-200 hover:text-white transition-all text-xs font-mono group flex-shrink-0 cursor-pointer"
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
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d] flex-shrink-0 cursor-pointer"
          title="Fit All Available Data"
        >
          <Layers size={14} />
        </button>
        <button
          onClick={onResetChart}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d] flex-shrink-0 cursor-pointer"
          title="Reset Chart Viewport"
        >
          <RotateCcw size={14} />
        </button>

        {/* Feed & Market Status Pill */}
        {quote && (
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-[#1e222d] border border-[#2a2e39] flex-shrink-0">
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
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1e222d] flex-shrink-0 cursor-pointer"
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>

        {/* Settings Dialog Trigger */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-[#1e222d] flex-shrink-0 cursor-pointer"
          title="Workstation Settings"
        >
          <Settings size={15} />
        </button>

        {/* Display Mode Toggle (Desktop / Mobile) */}
        {onToggleMode && (
          <button
            onClick={onToggleMode}
            data-testid="topbar-mode-toggle"
            className="flex items-center space-x-1 px-2 py-1 rounded bg-[#1e222d] border border-[#2a2e39] hover:border-[#2962ff] text-gray-300 hover:text-white transition-colors flex-shrink-0 cursor-pointer"
            title={`Display Mode: ${viewMode?.toUpperCase() || 'AUTO'} (Click to switch to Mobile view)`}
          >
            <Smartphone size={13} className="text-[#2962ff]" />
            <span className="text-[11px] font-medium hidden md:inline">
              Switch to Mobile
            </span>
          </button>
        )}
      </div>

      {/* Right Scroll Navigation Chevron (visible when more options exist to the right) */}
      {desktopCanScrollRight && (
        <button
          onClick={() => scrollDesktop('right')}
          data-testid="topbar-scroll-right-btn"
          className="absolute right-0 z-40 h-full px-2 bg-gradient-to-l from-[#131722] via-[#131722]/95 to-transparent flex items-center justify-center text-gray-300 hover:text-white hover:bg-[#1e222d]/60 transition-all shadow-md active:scale-95 cursor-pointer"
          title="Scroll right (or use mouse wheel)"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Fixed Dropdown Overlays */}
      {renderTimeframeDropdown()}
      {renderChartTypeDropdown()}
    </div>
  );
};
