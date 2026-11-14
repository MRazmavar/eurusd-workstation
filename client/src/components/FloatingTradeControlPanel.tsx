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
  isMobile?: boolean;
  onConfirmSetup?: () => void;
  onCancelSetup?: () => void;
  onCloseTrade?: (tradeId: string) => void;
  onModifyTrade?: (tradeId: string, updates: Partial<Trade>) => void;
}

export const FloatingTradeControlPanel: React.FC<FloatingTradeControlPanelProps> = ({
  trades,
  activeSetup,
  currentPrice,
  isMobile = false,
  onConfirmSetup,
  onCancelSetup,
  onCloseTrade,
  onModifyTrade,
}) => {
  // Only show when there is an active trade setup or an open/pending trade
  const openTrades = trades.filter(t => t.status === 'OPEN' || t.status === 'PENDING');
  const hasSetup = activeSetup && activeSetup.active;
  const isVisible = hasSetup || openTrades.length > 0;

  const isMobileViewport = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);
  const storageKey = isMobileViewport ? 'eurusd_trade_panel_pos_mobile' : 'eurusd_trade_panel_pos';

  // Selected trade index if multiple open trades exist
  const [selectedTradeIndex, setSelectedTradeIndex] = useState<number>(0);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Position state (default: lowest left on desktop, centered bottom on mobile)
  const getDefaultPosition = useCallback(() => {
    const parent = panelRef.current?.parentElement;
    const parentW = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 390);
    const parentH = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight - 150 : 600);
    const panelW = panelRef.current?.offsetWidth || (isMobileViewport ? Math.min(340, parentW - 20) : 320);
    const panelH = panelRef.current?.offsetHeight || 190;

    if (isMobileViewport) {
      const defaultY = Math.max(10, parentH - panelH - 10);
      const defaultX = Math.max(10, Math.floor((parentW - panelW) / 2));
      return { x: defaultX, y: defaultY };
    }
    const defaultY = Math.max(20, parentH - 240);
    return { x: 16, y: defaultY };
  }, [isMobileViewport]);

  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    if (typeof window !== 'undefined' && (isMobile || window.innerWidth < 768)) {
      return { x: 10, y: Math.max(10, window.innerHeight - 380) };
    }
    return { x: 16, y: 500 };
  });

  const positionRef = useRef(position);
  positionRef.current = position;

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);

  // Auto-clamp position inside container bounds on resize or mount
  useEffect(() => {
    const clampToVisible = () => {
      const parent = panelRef.current?.parentElement;
      const parentW = parent?.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 390);
      const parentH = parent?.clientHeight || (typeof window !== 'undefined' ? window.innerHeight - 150 : 600);
      const panelW = panelRef.current?.offsetWidth || (isMobileViewport ? Math.min(340, parentW - 20) : 320);
      const panelH = panelRef.current?.offsetHeight || 190;

      setPosition((prev) => {
        const maxX = Math.max(10, parentW - panelW - 10);
        const maxY = Math.max(10, parentH - panelH - 10);
        const clampedX = Math.max(10, Math.min(maxX, prev.x));
        const clampedY = Math.max(10, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          positionRef.current = { x: clampedX, y: clampedY };
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    clampToVisible();
    window.addEventListener('resize', clampToVisible);
    return () => window.removeEventListener('resize', clampToVisible);
  }, [isMobileViewport, isMinimized]);

  // Position calibration on initial mount if not explicitly saved
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved && panelRef.current?.parentElement) {
        const initialPos = getDefaultPosition();
        setPosition(initialPos);
        positionRef.current = initialPos;
      }
    } catch {}
  }, [storageKey, getDefaultPosition]);

  // Dragging logic (supports both Mouse and Touch for mobile)
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: positionRef.current.x,
      startY: positionRef.current.y,
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      const parent = panelRef.current?.parentElement;
      const parentW = parent ? parent.clientWidth : window.innerWidth;
      const parentH = parent ? parent.clientHeight : window.innerHeight;

      const panelW = panelRef.current ? panelRef.current.offsetWidth : 300;
      const maxX = Math.max(10, parentW - panelW - 10);
      const maxY = Math.max(20, parentH - 50);

      const newX = Math.max(10, Math.min(maxX, dragStartRef.current.startX + dx));
      const newY = Math.max(10, Math.min(maxY, dragStartRef.current.startY + dy));

      const updated = { x: newX, y: newY };
      setPosition(updated);
      positionRef.current = updated;
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem(storageKey, JSON.stringify(positionRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
    };
  }, [isDragging, storageKey]);

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    const pos = getDefaultPosition();
    setPosition(pos);
    positionRef.current = pos;
    try {
      localStorage.setItem(storageKey, JSON.stringify(pos));
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

    // Deduce Order Type relative to current market price
    const pipDiff = (entry - currentPrice) / 0.0001;
    let deducedType = 'MARKET';
    if (Math.abs(pipDiff) <= 0.3) {
      deducedType = `${activeSetup.type} MKT`;
    } else if (isBuy) {
      deducedType = entry < currentPrice ? 'BUY LIMIT' : 'BUY STOP';
    } else {
      deducedType = entry > currentPrice ? 'SELL LIMIT' : 'SELL STOP';
    }
    const orderTypeLabel = activeSetup.order_type || deducedType;
    const isPendingOrder = !orderTypeLabel.includes('MKT') && !orderTypeLabel.includes('MARKET');

    return (
      <div
        ref={panelRef}
        data-testid="floating-trade-panel"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        className={`absolute z-30 ${
          isMobileViewport ? 'w-[calc(100%-20px)] max-w-[360px]' : 'w-[92vw] max-w-[320px]'
        } bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl select-none font-sans text-xs transition-shadow ${
          isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50' : 'shadow-black/70'
        }`}
      >
        {/* Drag Handle Bar */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          data-testid="trade-panel-drag-handle"
          className="flex items-center justify-between px-3 py-1.5 bg-[#131722]/90 border-b border-[#2a2e39] cursor-grab active:cursor-grabbing rounded-t-lg touch-none"
          title="Drag to move trade settings anywhere on chart"
        >
          <div className="flex items-center space-x-1.5 text-gray-300 font-semibold text-[11px] min-w-0">
            <GripHorizontal className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="truncate">{isMinimized ? `${orderTypeLabel}` : 'TRADE SETTINGS'}</span>
            {isMinimized && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold text-white uppercase shrink-0 ${isBuy ? 'bg-[#089981]' : 'bg-[#f23645]'}`}>
                {activeSetup.lotSize}L
              </span>
            )}
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {isMinimized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onConfirmSetup?.();
                }}
                data-testid="trade-panel-minimized-confirm-btn"
                className="flex items-center space-x-1 px-2.5 py-0.5 rounded bg-[#089981] hover:bg-[#07806c] active:bg-[#066e5d] text-white font-bold text-[10px] shadow transition-colors cursor-pointer"
                title="Confirm & Execute Order"
              >
                <Check className="w-3 h-3" />
                <span>Confirm</span>
              </button>
            )}
            <button
              onClick={handleResetPosition}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#2a2e39]"
              title="Reset position"
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
            {/* Direction, Order Type & Lot Size */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold text-white uppercase ${
                    isBuy ? 'bg-[#089981]' : 'bg-[#f23645]'
                  }`}
                >
                  {orderTypeLabel}
                </span>
                {isPendingOrder && (
                  <span className="text-[10px] text-amber-400 font-semibold">
                    (Pending)
                  </span>
                )}
              </div>
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
                className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded font-bold text-white bg-[#089981] hover:bg-[#07806c] active:bg-[#066e5d] shadow transition-colors cursor-pointer text-xs min-h-[40px]"
              >
                <Check className="w-4 h-4 shrink-0" />
                <span className="truncate">{isPendingOrder ? `Place ${orderTypeLabel}` : `Execute Market ${activeSetup.type}`}</span>
              </button>
              <button
                onClick={onCancelSetup}
                data-testid="trade-panel-cancel-setup-btn"
                className="flex items-center justify-center space-x-1 py-2 px-3 rounded font-semibold text-gray-300 bg-[#2a2e39] hover:bg-[#363c4e] active:bg-[#444b5f] transition-colors cursor-pointer text-xs min-h-[40px]"
              >
                <X className="w-4 h-4 shrink-0" />
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
      className={`absolute z-30 ${
        isMobileViewport ? 'w-[calc(100%-20px)] max-w-[360px]' : 'w-[92vw] max-w-[320px]'
      } bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl select-none font-sans text-xs transition-shadow ${
        isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50' : 'shadow-black/70'
      }`}
    >
      {/* Drag Handle Bar */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        data-testid="trade-panel-drag-handle"
        className="flex items-center justify-between px-3 py-1.5 bg-[#131722]/90 border-b border-[#2a2e39] cursor-grab active:cursor-grabbing rounded-t-lg touch-none"
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
                {activeTrade.order_type || activeTrade.type}
              </span>
              <span className="font-mono text-gray-200 font-medium">
                {activeTrade.lot_size.toFixed(2)}L @ {entryPrice.toFixed(5)}
              </span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Mkt: <span className="text-white">{effectiveMarketPrice.toFixed(5)}</span>
            </div>
          </div>

          {/* Real-time Profit / Loss Banner or Pending Order Status */}
          {activeTrade.status === 'PENDING' ? (
            <div className="p-2 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 font-mono flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
                <span className="font-sans text-[11px] font-semibold">ORDER PENDING:</span>
              </div>
              <span className="text-[10px] font-bold">
                Waits for touch @ {entryPrice.toFixed(5)}
              </span>
            </div>
          ) : (
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
          )}

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
              className="flex-1 flex items-center justify-center space-x-1 py-1.5 rounded font-semibold text-white bg-[#f23645] hover:bg-[#d32f2f] shadow transition-colors cursor-pointer"
              title={activeTrade.status === 'PENDING' ? "Cancel pending order" : "Close position at current market price"}
            >
              <X className="w-3.5 h-3.5" />
              <span>{activeTrade.status === 'PENDING' ? 'Cancel Order' : 'Close Position'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
