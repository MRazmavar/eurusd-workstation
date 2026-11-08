/**
 * TradingView-Style Right Sidebar: Watchlist, Market Depth, Object Tree, and Trade Order Ticket.
 */
import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Layers,
  ShoppingBag,
  Bell,
  ChevronRight,
  ChevronLeft,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  TrendingUp,
  TrendingDown,
  Globe,
  Clock,
  Crosshair,
  Wallet,
  Settings,
} from 'lucide-react';
import { Quote, DrawingObject, Trade, UserSettings, DraggableTradeSetup, Candle } from '../types';
import { backtestingEngine } from '../services/BacktestingEngine';
import { replayEngine } from '../services/ReplayEngine';
import { getSessionStatusesForTime } from '../utils/sessions';

interface RightSidebarProps {
  quote: Quote | null;
  drawings: DrawingObject[];
  onSelectDrawing: (id: string | null) => void;
  onUpdateDrawing: (d: DrawingObject) => void;
  onDeleteDrawing: (id: string) => void;
  selectedDrawingId: string | null;
  currentReplayCandleTime?: number;
  currentChartPrice?: number;
  settings: UserSettings;
  balance?: number;
  equity?: number;
  onOpenBalanceModal?: () => void;
  onOpenDrawingProperties?: (d: DrawingObject) => void;
  candles?: Candle[];
}

type TabType = 'market' | 'order' | 'objects' | 'alerts';

export const RightSidebar: React.FC<RightSidebarProps> = ({
  quote,
  drawings,
  onSelectDrawing,
  onUpdateDrawing,
  onDeleteDrawing,
  selectedDrawingId,
  currentReplayCandleTime,
  currentChartPrice,
  settings,
  balance,
  equity,
  onOpenBalanceModal,
  onOpenDrawingProperties,
  candles = [],
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('order');

  const effectiveRefTime = currentReplayCandleTime ?? (
    candles.length > 0 ? candles[candles.length - 1].time : (quote?.timestamp ? Math.floor(new Date(quote.timestamp).getTime() / 1000) : Math.floor(Date.now() / 1000))
  );

  const sessionSummaries = React.useMemo(() => {
    return getSessionStatusesForTime(effectiveRefTime, candles);
  }, [effectiveRefTime, candles]);

  // Trade ticket form state
  const [orderType, setOrderType] = useState<'BUY' | 'SELL'>('BUY');
  const [execType, setExecType] = useState<'MARKET' | 'LIMIT' | 'STOP'>('MARKET');
  const [customPrice, setCustomPrice] = useState<number | ''>('');
  const [sizingMode, setSizingMode] = useState<'risk_percent' | 'lot_size'>('risk_percent');
  const [riskPercent, setRiskPercent] = useState<number>(() => settings.default_risk_percent || 1.0);
  const [lotSize, setLotSize] = useState<number>(() => settings.default_lot_size || 1.0);
  const [slPips, setSlPips] = useState<number>(5);
  const [tpPips, setTpPips] = useState<number>(5);
  const [tradeNotes, setTradeNotes] = useState<string>('');

  // Active draggable on-chart setup
  const [chartSetup, setChartSetup] = useState<DraggableTradeSetup | null>(null);

  useEffect(() => {
    const unsub = backtestingEngine.subscribeSetup((setup) => {
      setChartSetup(setup);
      if (setup && setup.active) {
        setOrderType(setup.type);
        setLotSize(setup.lotSize);
        if (setup.sizingMode) setSizingMode(setup.sizingMode);
        if (setup.riskPercent) setRiskPercent(setup.riskPercent);
        const slDiff = Math.abs(setup.entryPrice - setup.slPrice) / 0.0001;
        const tpDiff = Math.abs(setup.tpPrice - setup.entryPrice) / 0.0001;
        setSlPips(Math.max(1, Math.round(slDiff)));
        setTpPips(Math.max(1, Math.round(tpDiff)));
      }
    });
    return unsub;
  }, []);

  const effectiveBalance = balance || settings.initial_balance || 10000;

  // Authoritative real-time live price: Replay candle price takes priority when replay is active,
  // followed by currentChartPrice (latest visible candle close), followed by live quote.
  const getActiveLivePrice = (): number => {
    if (currentReplayCandleTime || replayEngine.isActive()) {
      const replayCandle = replayEngine.getCurrentCandle();
      if (replayCandle) return replayCandle.close;
      if (currentChartPrice) return currentChartPrice;
    }
    if (currentChartPrice) return currentChartPrice;
    if (quote) {
      return orderType === 'BUY' ? quote.ask : quote.bid;
    }
    return 1.11380;
  };

  const currentPrice = getActiveLivePrice();
  const baseEntryPrice = execType === 'MARKET'
    ? currentPrice
    : (Number(customPrice) || currentPrice);

  const entryPrice = chartSetup?.active ? chartSetup.entryPrice : baseEntryPrice;
  const slPrice = chartSetup?.active
    ? chartSetup.slPrice
    : (orderType === 'BUY'
        ? Number((entryPrice - slPips * 0.0001).toFixed(5))
        : Number((entryPrice + slPips * 0.0001).toFixed(5)));

  const tpPrice = chartSetup?.active
    ? chartSetup.tpPrice
    : (orderType === 'BUY'
        ? Number((entryPrice + tpPips * 0.0001).toFixed(5))
        : Number((entryPrice - tpPips * 0.0001).toFixed(5)));

  const effectiveSlPips = Math.max(0.1, Math.abs(entryPrice - slPrice) / 0.0001);
  const effectiveTpPips = Math.max(0.1, Math.abs(tpPrice - entryPrice) / 0.0001);

  // Position Sizing calculations
  const targetRiskUsd = effectiveBalance * (riskPercent / 100);
  const calculatedLotSize = Math.max(0.01, Number((targetRiskUsd / (effectiveSlPips * 10)).toFixed(2)));
  const effectiveLotSize = sizingMode === 'risk_percent' ? calculatedLotSize : lotSize;

  const riskUsd = Number((effectiveSlPips * 10 * effectiveLotSize).toFixed(2));
  const rewardUsd = Number((effectiveTpPips * 10 * effectiveLotSize).toFixed(2));
  const effectiveRiskPercent = effectiveBalance > 0 ? Number(((riskUsd / effectiveBalance) * 100).toFixed(2)) : riskPercent;
  const rrRatio = effectiveSlPips > 0 ? (effectiveTpPips / effectiveSlPips).toFixed(2) : '0';

  const toggleOnChartSetup = () => {
    if (chartSetup && chartSetup.active) {
      backtestingEngine.cancelTradeSetup();
    } else {
      // Always place entry at the current live chart price with 5 pips SL and 5 pips TP!
      const freshLivePrice = getActiveLivePrice();
      const defaultPips = 5;
      setSlPips(defaultPips);
      setTpPips(defaultPips);
      setCustomPrice(freshLivePrice);

      backtestingEngine.startTradeSetup(
        orderType,
        freshLivePrice,
        defaultPips,
        defaultPips,
        effectiveLotSize,
        sizingMode,
        riskPercent,
        effectiveBalance
      );
    }
  };

  const handleLotSizeChange = (newLots: number) => {
    setSizingMode('lot_size');
    setLotSize(newLots);
    const newRiskUsd = effectiveSlPips * 10 * newLots;
    const newRiskPct = effectiveBalance > 0 ? Number(((newRiskUsd / effectiveBalance) * 100).toFixed(2)) : riskPercent;
    setRiskPercent(newRiskPct);
    if (chartSetup?.active) {
      backtestingEngine.updateTradeSetup({ lotSize: newLots, sizingMode: 'lot_size', riskPercent: newRiskPct }, effectiveBalance);
    }
  };

  const handleRiskPercentChange = (newPct: number) => {
    setSizingMode('risk_percent');
    setRiskPercent(newPct);
    const newTarget = effectiveBalance * (newPct / 100);
    const newLots = Math.max(0.01, Number((newTarget / (effectiveSlPips * 10)).toFixed(2)));
    setLotSize(newLots);
    if (chartSetup?.active) {
      backtestingEngine.updateTradeSetup({ sizingMode: 'risk_percent', riskPercent: newPct, lotSize: newLots }, effectiveBalance);
    }
  };

  const handleExecuteTrade = async () => {
    const time = currentReplayCandleTime || Math.floor(Date.now() / 1000);

    let specificOrderType: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP' = 'MARKET';
    if (execType === 'LIMIT') {
      specificOrderType = orderType === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT';
    } else if (execType === 'STOP') {
      specificOrderType = orderType === 'BUY' ? 'BUY_STOP' : 'SELL_STOP';
    }

    await backtestingEngine.openTrade({
      type: orderType,
      order_type: specificOrderType,
      entryPrice,
      limit_price: execType === 'LIMIT' ? entryPrice : undefined,
      stop_price: execType === 'STOP' ? entryPrice : undefined,
      sl: slPrice,
      tp: tpPrice,
      lotSize: effectiveLotSize,
      riskUsd,
      notes: tradeNotes,
      time,
    });

    if (chartSetup?.active) {
      backtestingEngine.cancelTradeSetup();
    }
    setTradeNotes('');
  };

  if (collapsed) {
    return (
      <div className="w-10 bg-[#131722] border-l border-[#2a2e39] flex flex-col items-center py-2 space-y-3 z-20 select-none">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Expand Sidebar"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={() => { setCollapsed(false); setActiveTab('market'); }}
          className={`p-1.5 rounded ${activeTab === 'market' ? 'text-[#2962ff] bg-[#1e222d]' : 'text-gray-400'}`}
          title="Market Watch"
        >
          <ListFilter size={16} />
        </button>
        <button
          onClick={() => { setCollapsed(false); setActiveTab('order'); }}
          className={`p-1.5 rounded ${activeTab === 'order' ? 'text-[#2962ff] bg-[#1e222d]' : 'text-gray-400'}`}
          title="Trade Ticket"
        >
          <ShoppingBag size={16} />
        </button>
        <button
          onClick={() => { setCollapsed(false); setActiveTab('objects'); }}
          className={`p-1.5 rounded ${activeTab === 'objects' ? 'text-[#2962ff] bg-[#1e222d]' : 'text-gray-400'}`}
          title="Object Tree"
        >
          <Layers size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 bg-[#131722] border-l border-[#2a2e39] flex flex-col h-full z-20 text-xs select-none">
      {/* Sidebar Header Tabs */}
      <div className="h-10 bg-[#131722] border-b border-[#2a2e39] flex items-center justify-between px-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('order')}
            data-testid="sidebar-tab-order"
            className={`px-2 py-1 rounded font-medium flex items-center space-x-1 ${
              activeTab === 'order' ? 'bg-[#1e222d] text-[#2962ff]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShoppingBag size={13} />
            <span>Order</span>
          </button>
          <button
            onClick={() => setActiveTab('market')}
            data-testid="sidebar-tab-market"
            className={`px-2 py-1 rounded font-medium flex items-center space-x-1 ${
              activeTab === 'market' ? 'bg-[#1e222d] text-[#2962ff]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <ListFilter size={13} />
            <span>Market</span>
          </button>
          <button
            onClick={() => setActiveTab('objects')}
            data-testid="sidebar-tab-objects"
            className={`px-2 py-1 rounded font-medium flex items-center space-x-1 ${
              activeTab === 'objects' ? 'bg-[#1e222d] text-[#2962ff]' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Objects ({drawings.length})</span>
          </button>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#1e222d]"
          title="Collapse Sidebar"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* 1. ORDER TICKET */}
        {activeTab === 'order' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#2a2e39]">
              <span className="font-bold text-gray-200">EUR/USD Trade Order</span>
              <button
                onClick={toggleOnChartSetup}
                data-testid="on-chart-setup-btn"
                className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                  chartSetup?.active
                    ? 'bg-[#2962ff] text-white border-[#2962ff]'
                    : 'bg-[#1e222d] text-gray-300 border-[#2a2e39] hover:bg-[#2a2e39]'
                }`}
                title="Toggle Draggable Lines on Chart"
              >
                <Crosshair size={12} />
                <span>{chartSetup?.active ? 'Chart Lines ON' : 'On-Chart Setup'}</span>
              </button>
            </div>

            {/* Account Capital Card */}
            <div className="bg-[#1e222d] px-2.5 py-1.5 rounded border border-[#2a2e39] flex items-center justify-between text-[11px] font-mono">
              <div className="flex items-center space-x-1.5 text-gray-400">
                <Wallet size={13} className="text-[#089981]" />
                <span>Balance:</span>
                <span className="text-white font-bold">${settings.initial_balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {onOpenBalanceModal && (
                <button
                  onClick={onOpenBalanceModal}
                  className="px-1.5 py-0.5 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 hover:text-white text-[10px] font-sans transition-colors"
                  title="Change Initial Balance"
                >
                  Edit
                </button>
              )}
            </div>

            {/* Execution Type: Market / Limit / Stop */}
            <div className="grid grid-cols-3 gap-1 bg-[#1e222d] p-1 rounded border border-[#2a2e39] text-center text-[10px]">
              {(['MARKET', 'LIMIT', 'STOP'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setExecType(mode)}
                  className={`py-1 rounded font-semibold transition-colors ${
                    execType === mode
                      ? 'bg-[#2962ff] text-white shadow'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Buy / Sell Switch */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#1e222d] rounded border border-[#2a2e39]">
              <button
                onClick={() => {
                  setOrderType('BUY');
                  if (chartSetup?.active) backtestingEngine.updateTradeSetup({ type: 'BUY' });
                }}
                className={`py-2 rounded font-bold transition-colors ${
                  orderType === 'BUY'
                    ? 'bg-[#089981] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                BUY / LONG
              </button>
              <button
                onClick={() => {
                  setOrderType('SELL');
                  if (chartSetup?.active) backtestingEngine.updateTradeSetup({ type: 'SELL' });
                }}
                className={`py-2 rounded font-bold transition-colors ${
                  orderType === 'SELL'
                    ? 'bg-[#f23645] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                SELL / SHORT
              </button>
            </div>

            {/* Price Preview / Limit Price */}
            <div className="bg-[#1e222d] p-2.5 rounded border border-[#2a2e39] space-y-1.5">
              <div className="flex justify-between text-gray-400 text-[11px] items-center">
                <span>{execType === 'MARKET' ? `Execution (${orderType === 'BUY' ? 'Ask' : 'Bid'})` : `${execType} Price`}</span>
                {execType === 'MARKET' ? (
                  <span className="text-white font-mono font-bold">{entryPrice.toFixed(5)}</span>
                ) : (
                  <input
                    type="number"
                    step="0.00001"
                    value={customPrice === '' ? entryPrice : customPrice}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCustomPrice(val);
                      if (chartSetup?.active) backtestingEngine.updateTradeSetup({ entryPrice: val });
                    }}
                    className="w-24 bg-[#131722] border border-[#2a2e39] rounded px-1.5 py-0.5 text-white font-mono text-right text-xs focus:outline-none focus:border-[#2962ff]"
                  />
                )}
              </div>
              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>Spread</span>
                <span className="text-gray-300 font-mono">{settings.spread_pips} pips</span>
              </div>
            </div>

            {/* Sizing Mode Switch & Position Sizing Header */}
            <div className="bg-[#1e222d] p-2.5 rounded border border-[#2a2e39] space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-200 text-[11px]">Position Sizing</span>
                <div className="flex bg-[#131722] p-0.5 rounded border border-[#2a2e39] text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSizingMode('risk_percent');
                      if (chartSetup?.active) {
                        backtestingEngine.updateTradeSetup({ sizingMode: 'risk_percent', riskPercent }, effectiveBalance);
                      }
                    }}
                    data-testid="sizing-mode-risk-btn"
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      sizingMode === 'risk_percent'
                        ? 'bg-[#2962ff] text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Risk %
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSizingMode('lot_size');
                      if (chartSetup?.active) {
                        backtestingEngine.updateTradeSetup({ sizingMode: 'lot_size', lotSize: effectiveLotSize }, effectiveBalance);
                      }
                    }}
                    data-testid="sizing-mode-lot-btn"
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      sizingMode === 'lot_size'
                        ? 'bg-[#2962ff] text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Fixed Lot
                  </button>
                </div>
              </div>

              {/* If Risk % Mode Active */}
              {sizingMode === 'risk_percent' ? (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-gray-300 text-[11px]">
                    <span>Risk Percentage</span>
                    <span className="text-[#f23645] font-mono font-bold">
                      ${targetRiskUsd.toFixed(2)} ({riskPercent}%)
                    </span>
                  </div>
                  {/* Quick % chips */}
                  <div className="flex space-x-1">
                    {[0.5, 1.0, 2.0, 3.0, 5.0].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleRiskPercentChange(p)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono border transition-colors ${
                          riskPercent === p
                            ? 'bg-[#2962ff] text-white border-[#2962ff]'
                            : 'bg-[#131722] text-gray-300 border-[#2a2e39] hover:bg-[#2a2e39]'
                        }`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="0.05"
                      max="100"
                      value={riskPercent}
                      onChange={(e) => {
                        const val = Math.max(0.05, parseFloat(e.target.value) || 0.1);
                        handleRiskPercentChange(val);
                      }}
                      data-testid="risk-percent-input"
                      className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                    />
                    <span className="absolute right-3 text-gray-400 text-xs font-mono">%</span>
                  </div>

                  {/* Auto-calculated Lot Size preview */}
                  <div className="bg-[#131722] p-1.5 rounded border border-[#2a2e39] flex items-center justify-between text-[11px]">
                    <span className="text-gray-400">Calculated Volume:</span>
                    <span className="text-[#38bdf8] font-mono font-bold" data-testid="auto-calculated-lots">
                      {calculatedLotSize.toFixed(2)} Lots (${(calculatedLotSize * 10).toFixed(2)}/pip)
                    </span>
                  </div>
                </div>
              ) : (
                /* Fixed Lot Mode */
                <div className="space-y-1.5">
                  <div className="flex justify-between text-gray-300 text-[11px]">
                    <span>Lot Size (Standard)</span>
                    <span className="text-gray-400 text-[10px] font-mono">
                      ${(lotSize * 10).toFixed(1)} / pip
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {[0.1, 0.5, 1.0, 2.0].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => handleLotSizeChange(l)}
                        className={`flex-1 py-1 rounded text-[10px] font-mono border transition-colors ${
                          lotSize === l
                            ? 'bg-[#2962ff] text-white border-[#2962ff]'
                            : 'bg-[#131722] text-gray-300 border-[#2a2e39] hover:bg-[#2a2e39]'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={lotSize}
                    onChange={(e) => {
                      const val = Math.max(0.01, parseFloat(e.target.value) || 0.01);
                      handleLotSizeChange(val);
                    }}
                    data-testid="lot-size-input"
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400">
                    <span>Equivalent Risk:</span>
                    <span className="text-[#f23645] font-mono">
                      ${(effectiveSlPips * 10 * lotSize).toFixed(2)} ({((effectiveSlPips * 10 * lotSize / effectiveBalance) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Stop Loss (Pips) */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Stop Loss (Pips)</span>
                <span className="text-[#f23645] font-mono text-[11px]">{slPrice.toFixed(5)}</span>
              </div>
              <input
                type="number"
                value={slPips}
                data-testid="sl-pips-input"
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setSlPips(val);
                  const newSl = orderType === 'BUY'
                    ? Number((entryPrice - val * 0.0001).toFixed(5))
                    : Number((entryPrice + val * 0.0001).toFixed(5));
                  if (chartSetup?.active) {
                    if (sizingMode === 'risk_percent') {
                      const newLots = Math.max(0.01, Number(((effectiveBalance * (riskPercent / 100)) / (val * 10)).toFixed(2)));
                      backtestingEngine.updateTradeSetup({ slPrice: newSl, lotSize: newLots, sizingMode, riskPercent }, effectiveBalance);
                    } else {
                      backtestingEngine.updateTradeSetup({ slPrice: newSl }, effectiveBalance);
                    }
                  }
                }}
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#2962ff]"
              />
              <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                <span>Est. Risk:</span>
                <span className="text-[#f23645] font-mono font-semibold">
                  -${riskUsd.toFixed(2)} ({effectiveRiskPercent.toFixed(2)}%)
                </span>
              </div>
            </div>

            {/* Take Profit (Pips) */}
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Take Profit (Pips)</span>
                <span className="text-[#089981] font-mono text-[11px]">{tpPrice.toFixed(5)}</span>
              </div>
              <input
                type="number"
                value={tpPips}
                data-testid="tp-pips-input"
                onChange={(e) => {
                  const val = Math.max(1, parseInt(e.target.value) || 1);
                  setTpPips(val);
                  if (chartSetup?.active) {
                    const newTp = orderType === 'BUY'
                      ? Number((entryPrice + val * 0.0001).toFixed(5))
                      : Number((entryPrice - val * 0.0001).toFixed(5));
                    backtestingEngine.updateTradeSetup({ tpPrice: newTp }, effectiveBalance);
                  }
                }}
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1.5 text-white font-mono focus:outline-none focus:border-[#2962ff]"
              />
              <div className="text-[10px] text-gray-400 mt-0.5 flex justify-between">
                <span>Est. Reward:</span>
                <span className="text-[#089981] font-mono font-semibold">+${rewardUsd.toFixed(2)}</span>
              </div>
            </div>

            {/* Risk / Reward Badge */}
            <div className="bg-[#1e222d] p-2 rounded border border-[#2a2e39] flex justify-between items-center">
              <span className="text-gray-400">Risk-to-Reward Ratio</span>
              <span className="font-bold font-mono text-[#2962ff] text-sm">
                1 : {rrRatio}
              </span>
            </div>

            {/* Notes */}
            <div>
              <span className="text-gray-300 block mb-1">Trade Notes / Setup Rationale</span>
              <textarea
                value={tradeNotes}
                onChange={(e) => setTradeNotes(e.target.value)}
                placeholder="e.g. London session breakout, key support retest..."
                rows={2}
                className="w-full bg-[#1e222d] border border-[#2a2e39] rounded p-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#2962ff] resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleExecuteTrade}
              className={`w-full py-2.5 rounded font-bold text-white text-sm transition-colors shadow-lg ${
                orderType === 'BUY'
                  ? 'bg-[#089981] hover:bg-[#078570]'
                  : 'bg-[#f23645] hover:bg-[#d62837]'
              }`}
            >
              Place Simulated {orderType} Order
            </button>
          </div>
        )}

        {/* 2. MARKET WATCH & FOREX SESSIONS */}
        {activeTab === 'market' && (
          <div className="space-y-3">
            {quote && (
              <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-white">EUR/USD</span>
                  <span className="text-[10px] text-gray-400">{quote.provider}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center pt-1">
                  <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                    <span className="text-gray-400 text-[10px] block">BID</span>
                    <span className="font-mono text-base font-bold text-[#089981]">
                      {quote.bid.toFixed(5)}
                    </span>
                  </div>
                  <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                    <span className="text-gray-400 text-[10px] block">ASK</span>
                    <span className="font-mono text-base font-bold text-[#f23645]">
                      {quote.ask.toFixed(5)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Stats */}
            {quote && (
              <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-2 text-[11px]">
                <div className="flex justify-between text-gray-400">
                  <span>Daily High</span>
                  <span className="font-mono text-white">{quote.high.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Daily Low</span>
                  <span className="font-mono text-white">{quote.low.toFixed(5)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Spread</span>
                  <span className="font-mono text-white">{quote.spread.toFixed(1)} pips</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Change %</span>
                  <span className={`font-mono ${quote.change >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                    {quote.changePercent.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Market Status</span>
                  <span className={quote.market_status === 'OPEN' ? 'text-[#089981] font-bold' : 'text-amber-400 font-bold'}>
                    {quote.market_status === 'OPEN' ? 'OPEN' : 'WEEKEND CLOSED'}
                  </span>
                </div>
              </div>
            )}

            {/* Forex Trading Sessions Indicator - Real-Time & Backtest Synchronized */}
            <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-2" data-testid="sidebar-sessions-widget">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-200 block text-[11px] flex items-center gap-1.5">
                  <Clock size={12} className="text-[#8b5cf6]" />
                  <span>Forex Sessions (UTC)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  {currentReplayCandleTime ? 'Backtest Synced' : 'Live'}
                </span>
              </div>
              {sessionSummaries.map((s) => (
                <div key={s.session.id} className="p-1.5 rounded bg-[#131722]/60 border border-[#2a2e39]/50 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-medium text-gray-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.session.color }} />
                      <span>{s.session.shortLabel}</span>
                    </span>
                    {s.status === 'ACTIVE' ? (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/40 flex items-center gap-1 animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                        ACTIVE
                      </span>
                    ) : s.status === 'CLOSED' ? (
                      <span className="text-gray-500 text-[10px] font-mono">CLOSED</span>
                    ) : (
                      <span className="text-amber-400/70 text-[10px] font-mono">UPCOMING</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-gray-400">
                    <span>
                      {String(s.session.startHourUtc).padStart(2, '0')}:00 - {String(s.session.endHourUtc).padStart(2, '0')}:00 UTC
                    </span>
                    {s.candleCount > 0 && s.high !== undefined && s.low !== undefined ? (
                      <span className="text-[#38bdf8] font-semibold">
                        {s.pips}p (H:{s.high.toFixed(5)} L:{s.low.toFixed(5)})
                      </span>
                    ) : (
                      <span className="text-gray-600">-- pips</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. OBJECT TREE */}
        {activeTab === 'objects' && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center pb-1 text-gray-400 text-[11px]">
              <span>Drawing Objects</span>
              <span>{drawings.length} total</span>
            </div>

            {drawings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No drawings placed yet.
                <br />
                Use the left toolbar to draw trendlines, fibonacci, or positions.
              </div>
            ) : (
              drawings.map((d) => {
                const isSelected = selectedDrawingId === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => onSelectDrawing(d.id)}
                    className={`flex items-center justify-between p-2 rounded cursor-pointer border transition-colors ${
                      isSelected
                        ? 'bg-[#2962ff]/20 border-[#2962ff] text-white'
                        : 'bg-[#1e222d] border-[#2a2e39] text-gray-300 hover:bg-[#2a2e39]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: d.properties.color || '#2962ff' }}
                      />
                      <span className="capitalize font-medium truncate">
                        {d.type.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      {/* Properties / Settings */}
                      <button
                        onClick={() => onOpenDrawingProperties?.(d)}
                        className="p-1 rounded text-gray-400 hover:text-white"
                        title="Properties"
                        data-testid={`drawing-props-btn-${d.id}`}
                      >
                        <Settings size={12} />
                      </button>
                      {/* Hide/Show */}
                      <button
                        onClick={() => onUpdateDrawing({ ...d, hidden: !d.hidden })}
                        className="p-1 rounded text-gray-400 hover:text-white"
                        title={d.hidden ? 'Show' : 'Hide'}
                      >
                        {d.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                      {/* Lock/Unlock */}
                      <button
                        onClick={() => onUpdateDrawing({ ...d, locked: !d.locked })}
                        className="p-1 rounded text-gray-400 hover:text-white"
                        title={d.locked ? 'Unlock' : 'Lock'}
                      >
                        {d.locked ? <Lock size={12} className="text-amber-400" /> : <Unlock size={12} />}
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => onDeleteDrawing(d.id)}
                        className="p-1 rounded text-gray-400 hover:text-[#f23645]"
                        title="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
