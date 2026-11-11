/**
 * Floating Trade Settings & Control Panel.
 * Positioned by default at the lowest left of the chart and movable anywhere by mouse dragging.
 * Replaces on-candle badges to keep candlestick chart analysis clean and unobstructed.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  GripHorizontal,
  X,
  Shield,
  Target,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Trade, DraggableTradeSetup } from '../types';

interface FloatingTradeControlPanelProps {
  trades: Trade[];
  activeSetup?: DraggableTradeSetup | null;
  currentPrice: number;
  onConfirmSetup?: () => void;
  onCancelSetup?: () => void;
  onCloseTrade?: (tradeId: string) => void;
  onModifyTrade?: (tradeId: string, updates: Partial<Trade>) => void;
}

export const FloatingTradeControlPanel: React.FC<FloatingTradeControlPanelProps> = ({
  trades,
  activeSetup,
  currentPrice,
  onConfirmSetup,
  onCancelSetup,
  onCloseTrade,
  onModifyTrade,
}) => {
  // Only show when there is an active trade setup or an open/pending trade
  const openTrades = trades.filter(t => t.status === 'OPEN' || t.status === 'PENDING');
  const hasSetup = activeSetup && activeSetup.active;
  const isVisible = hasSetup || openTrades.length > 0;

  // Selected trade index if multiple open trades exist
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Position state (default: lowest left of viewport)
  const getDefaultPosition = useCallback(() => {
    const parentH = panelRef.current?.parentElement?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight - 150 : 600);
    const defaultY = Math.max(20, parentH - 240);
    return { x: 16, y: defaultY };
  }, []);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('eurusd_trade_panel_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { x: 16, y: 500 };
  });

  const positionRef = useRef(position);
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Position calibration on initial mount if not explicitly saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem('eurusd_trade_panel_pos');
      if (!saved && panelRef.current?.parentElement) {
        const parentH = panelRef.current.parentElement.clientHeight;
        const initialPos = { x: 16, y: Math.max(20, parentH - 240) };
        setPosition(initialPos);
        positionRef.current = initialPos;
      }
    } catch {}
  }, []);

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: positionRef.current.x,
      startY: positionRef.current.y,
    };
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const parent = panelRef.current?.parentElement;
      const parentW = parent ? parent.clientWidth : window.innerWidth;
      const parentH = parent ? parent.clientHeight : window.innerHeight;

      const maxX = Math.max(10, parentW - 330);
      const maxY = Math.max(20, parentH - 50);

      const newX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + dy));

      const updated = { x: newX, y: newY };
      setPosition(updated);
      positionRef.current = updated;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem('eurusd_trade_panel_pos', JSON.stringify(positionRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = getDefaultPosition();
    setPosition(pos);
    positionRef.current = pos;
    try {
      localStorage.setItem('eurusd_trade_panel_pos', JSON.stringify(pos));
    } catch {}
  };

  if (!isVisible) {
    return null;
  }

  // Active Trade Setup Mode
  if (hasSetup && activeSetup) {
    const isBuy = activeSetup.type === 'BUY';
    const entry = activeSetup.entryPrice;
    const sl = activeSetup.slPrice;
    const tp = activeSetup.tpPrice;
    const slPips = Math.abs(entry - sl) / 0.0001;
    const tpPips = Math.abs(tp - entry) / 0.0001;

    return (
      <div
        ref={panelRef}
        data-testid="floating-trade-panel"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        className={`absolute z-30 w-[320px] bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl select-none font-sans text-xs transition-shadow ${
          isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50' : 'shadow-black/70'
        }`}
      >
        {/* Drag Handle Bar */}
        <div
          onMouseDown={handleMouseDown}
          data-testid="trade-panel-drag-handle"
          className="flex items-center justify-between px-3 py-1.5 bg-[#131722]/90 border-b border-[#2a2e39] cursor-grab active:cursor-grabbing rounded-t-lg"
          title="Drag to move trade settings anywhere on chart"
        >
          <div className="flex items-center space-x-1.5 text-gray-300 font-semibold text-[11px]">
            <GripHorizontal className="w-3.5 h-3.5 text-gray-400" />
            <span>TRADE SETTINGS (NEW SETUP)</span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={handleResetPosition}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39]"
              title="Reset position to lowest left"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsMinimized(prev => !prev)}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39]"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Content Body */}
        {!isMinimized && (
          <div className="p-3 space-y-2.5">
            {/* Direction & Lot Size */}
            <div className="flex items-center justify-between">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold text-white uppercase ${
                  isBuy ? 'bg-[#089981]' : 'bg-[#f23645]'
                }`}
              >
                {activeSetup.type} SETUP
              </span>
              <span className="font-mono text-gray-200 font-medium">
                {activeSetup.lotSize} Lots {activeSetup.riskPercent ? `(${activeSetup.riskPercent.toFixed(1)}% Risk)` : ''}
              </span>
            </div>

            {/* Entry, SL, TP Metrics Grid */}
            <div className="grid grid-cols-3 gap-1.5 bg-[#131722]/80 p-2 rounded border border-[#2a2e39]/60 font-mono text-[11px]">
              <div>
                <span className="text-[10px] text-gray-400 block font-sans">ENTRY</span>
                <span className="font-semibold text-white">{entry.toFixed(5)}</span>
              </div>
              <div>
                <span className="text-[10px] text-[#f23645] block font-sans">STOP LOSS</span>
                <span className="font-semibold text-[#f23645]">{sl.toFixed(5)}</span>
                <span className="text-[9px] text-gray-400 block">-{slPips.toFixed(1)}p</span>
              </div>
              <div>
                <span className="text-[10px] text-[#089981] block font-sans">TAKE PROFIT</span>
                <span className="font-semibold text-[#089981]">{tp.toFixed(5)}</span>
                <span className="text-[9px] text-gray-400 block">+{tpPips.toFixed(1)}p</span>
              </div>
            </div>

            {/* Risk / Reward & Dollar Metrics */}
            <div className="flex items-center justify-between text-[11px] text-gray-300 px-0.5">
              <span>Risk: <span className="font-mono text-[#f23645]">-${activeSetup.riskUsd.toFixed(2)}</span></span>
              <span className="bg-[#2a2e39] px-1.5 py-0.5 rounded font-mono font-semibold text-[#38bdf8]">
                R:R 1 : {activeSetup.riskReward.toFixed(2)}
              </span>
              <span>Reward: <span className="font-mono text-[#089981]">+${activeSetup.rewardUsd.toFixed(2)}</span></span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 pt-1">
              <button
                onClick={onConfirmSetup}
                data-testid="trade-panel-confirm-setup-btn"
                className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded font-semibold text-white bg-[#089981] hover:bg-[#07806c] shadow transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Confirm Trade</span>
              </button>
              <button
                onClick={onCancelSetup}
                data-testid="trade-panel-cancel-setup-btn"
                className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded font-semibold text-gray-300 bg-[#2a2e39] hover:bg-[#363c4e] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Active Confirmed Open Trades Mode
  const activeTrade = openTrades[selectedTradeIndex] || openTrades[0];
  if (!activeTrade) return null;

  const isBuy = activeTrade.type === 'BUY';
  const entryPrice = activeTrade.entry_price;
  const slPrice = activeTrade.sl ?? (isBuy ? entryPrice - 0.0020 : entryPrice + 0.0020);
  const tpPrice = activeTrade.tp ?? (isBuy ? entryPrice + 0.0040 : entryPrice - 0.0040);
  const effectiveMarketPrice = currentPrice || entryPrice;

  const pipDiff = isBuy
    ? (effectiveMarketPrice - entryPrice) / 0.0001
    : (entryPrice - effectiveMarketPrice) / 0.0001;

  const grossPnl = pipDiff * 10 * activeTrade.lot_size;
  const commission = activeTrade.commission || 0;
  const liveNetPnl = grossPnl - commission;
  const isProfit = liveNetPnl >= 0;

  const slDiffPips = Math.abs(entryPrice - slPrice) / 0.0001;
  const tpDiffPips = Math.abs(tpPrice - entryPrice) / 0.0001;
  const slLossUsd = slDiffPips * 10 * activeTrade.lot_size;
  const tpGainUsd = tpDiffPips * 10 * activeTrade.lot_size;
  const rrRatio = slDiffPips > 0 ? tpDiffPips / slDiffPips : 2.0;

  return (
    <div
      ref={panelRef}
      data-testid="floating-trade-panel"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`absolute z-30 w-[320px] bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl select-none font-sans text-xs transition-shadow ${
        isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50' : 'shadow-black/70'
      }`}
    >
      {/* Drag Handle Bar */}
      <div
        onMouseDown={handleMouseDown}
        data-testid="trade-panel-drag-handle"
        className="flex items-center justify-between px-3 py-1.5 bg-[#131722]/90 border-b border-[#2a2e39] cursor-grab active:cursor-grabbing rounded-t-lg"
        title="Drag to move trade settings anywhere on chart"
      >
        <div className="flex items-center space-x-1.5 text-gray-300 font-semibold text-[11px]">
          <GripHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span>TRADE SETTINGS</span>
          {openTrades.length > 1 && (
            <span className="text-[10px] bg-[#2a2e39] text-[#38bdf8] px-1.5 py-0.2 rounded font-mono">
              {selectedTradeIndex + 1}/{openTrades.length}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          {openTrades.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedTradeIndex(prev => (prev + 1) % openTrades.length);
              }}
              className="text-[10px] text-gray-400 hover:text-white px-1 py-0.5 rounded hover:bg-[#2a2e39]"
              title="Next Trade"
            >
              Next
            </button>
          )}
          <button
            onClick={handleResetPosition}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39]"
            title="Reset position to lowest left"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsMinimized(prev => !prev)}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39]"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Content Body */}
      {!isMinimized && (
        <div className="p-3 space-y-2.5">
          {/* Header Row: Direction, Lots, Current Market Price */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold text-white uppercase ${
                  isBuy ? 'bg-[#089981]' : 'bg-[#f23645]'
                }`}
              >
                {activeTrade.type}
              </span>
              <span className="font-mono text-gray-200 font-medium">
                {activeTrade.lot_size.toFixed(2)}L @ {entryPrice.toFixed(5)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Mkt: <span className="text-white">{effectiveMarketPrice.toFixed(5)}</span>
            </div>
          </div>

          {/* Real-time Profit / Loss Banner */}
          <div
            className={`p-2 rounded border flex items-center justify-between font-mono ${
              isProfit
                ? 'bg-[#089981]/15 border-[#089981]/40 text-[#26a69a]'
                : 'bg-[#f23645]/15 border-[#f23645]/40 text-[#ef5350]'
            }`}
          >
            <div className="flex items-center space-x-1.5">
              {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              <span className="font-sans text-[11px] font-semibold text-gray-300">Live P&L:</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-bold">
                {isProfit ? '+' : ''}${liveNetPnl.toFixed(2)}
              </span>
              <span className="text-[10px] ml-1.5 font-medium">
                ({isProfit ? '+' : ''}{pipDiff.toFixed(1)}p)
              </span>
            </div>
          </div>

          {/* SL & TP Details Grid */}
          <div className="grid grid-cols-2 gap-2 bg-[#131722]/80 p-2 rounded border border-[#2a2e39]/60 font-mono text-[11px]">
            <div>
              <div className="flex items-center space-x-1 text-[10px] text-[#f23645] font-sans font-semibold">
                <Shield className="w-3 h-3" />
                <span>STOP LOSS</span>
              </div>
              <div className="font-semibold text-white mt-0.5">{slPrice.toFixed(5)}</div>
              <div className="text-[9px] text-gray-400">-{slDiffPips.toFixed(1)}p (-${slLossUsd.toFixed(2)})</div>
            </div>
            <div>
              <div className="flex items-center space-x-1 text-[10px] text-[#089981] font-sans font-semibold">
                <Target className="w-3 h-3" />
                <span>TAKE PROFIT</span>
              </div>
              <div className="font-semibold text-white mt-0.5">{tpPrice.toFixed(5)}</div>
              <div className="text-[9px] text-gray-400">+{tpDiffPips.toFixed(1)}p (+${tpGainUsd.toFixed(2)})</div>
            </div>
          </div>

          {/* R:R Ratio & Risk / Reward Overview */}
          <div className="flex items-center justify-between text-[10px] text-gray-400 px-0.5">
            <span>Risk/Reward:</span>
            <span className="font-mono font-semibold text-[#38bdf8] bg-[#2a2e39] px-1.5 py-0.5 rounded">
              1 : {rrRatio.toFixed(2)}
            </span>
          </div>

          {/* Action Buttons: Breakeven & Close Trade */}
          <div className="flex items-center space-x-2 pt-1">
            {activeTrade.sl !== entryPrice && (
              <button
                onClick={() => onModifyTrade?.(activeTrade.id, { sl: entryPrice })}
                data-testid="trade-panel-be-btn"
                className="flex-1 py-1.5 rounded font-semibold text-gray-200 bg-[#2a2e39] hover:bg-[#363c4e] border border-gray-600 transition-colors"
                title="Move Stop Loss to Entry (Breakeven)"
              >
                Breakeven [BE]
              </button>
            )}
            <button
              onClick={() => onCloseTrade?.(activeTrade.id)}
              data-testid="trade-panel-close-btn"
              className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded font-semibold text-white bg-[#f23645] hover:bg-[#d32f2f] shadow transition-colors"
              title="Close position at current market price"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Position</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
