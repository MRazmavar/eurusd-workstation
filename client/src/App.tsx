/**
 * EUR/USD Forex Charting & Backtesting Workstation - Main Application Shell.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Candle,
  ChartType,
  Timeframe,
  Quote,
  DrawingObject,
  DrawingToolType,
  IndicatorConfig,
  Trade,
  UserSettings,
  MagnetMode,
} from './types';
import { marketClient } from './services/MarketDataClient';
import { replayEngine, ReplaySpeed } from './services/ReplayEngine';
import { backtestingEngine } from './services/BacktestingEngine';
import { CoordinateTransformer, DrawingEngine } from './services/DrawingEngine';
import { TopBar } from './components/TopBar';
import { LeftToolbar } from './components/LeftToolbar';
import { ChartContainer } from './components/ChartContainer';
import { DrawingLayer } from './components/DrawingLayer';
import { RightSidebar } from './components/RightSidebar';
import { BottomPanel } from './components/BottomPanel';
import { IndicatorsModal } from './components/IndicatorsModal';
import { IndicatorPanels } from './components/IndicatorPanels';
import { SettingsModal } from './components/SettingsModal';
import { SessionsModal } from './components/SessionsModal';
import { DataValidationModal } from './components/DataValidationModal';
import { BalanceModal } from './components/BalanceModal';
import { JumpDateTimeModal } from './components/JumpDateTimeModal';
import { DrawingPropertiesModal } from './components/DrawingPropertiesModal';
import { QuickTimeframeModal } from './components/QuickTimeframeModal';
import { DraggableTradeSetup, ReplayMode, BacktestSession } from './types';

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  {
    id: 'ind_sma20',
    type: 'SMA',
    name: 'SMA (20)',
    color: '#2962ff',
    visible: true,
    isOverlay: true,
    params: { period: 20 },
  },
  {
    id: 'ind_ema50',
    type: 'EMA',
    name: 'EMA (50)',
    color: '#ff9800',
    visible: true,
    isOverlay: true,
    params: { period: 50 },
  },
  {
    id: 'ind_rsi',
    type: 'RSI',
    name: 'RSI (14)',
    color: '#ab47bc',
    visible: true,
    isOverlay: false,
    params: { period: 14 },
  },
];

export const App: React.FC = () => {
  // Market & Chart State (with Persistent Local Storage Memory)
  const [quote, setQuote] = useState<Quote | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>(() => {
    return (localStorage.getItem('eurusd_saved_timeframe') as Timeframe) || '1h';
  });
  const [chartType, setChartType] = useState<ChartType>(() => {
    return (localStorage.getItem('eurusd_saved_chart_type') as ChartType) || 'candlestick';
  });
  const [masterCandles, setMasterCandles] = useState<Candle[]>([]);
  const [visibleCandles, setVisibleCandles] = useState<Candle[]>([]);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(true);

  // Drawing Tools State (with Instant Local Storage Restore)
  const [drawings, setDrawings] = useState<DrawingObject[]>(() => {
    try {
      const saved = localStorage.getItem('eurusd_saved_drawings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeTool, setActiveTool] = useState<DrawingToolType>('crosshair');
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [editingDrawing, setEditingDrawing] = useState<DrawingObject | null>(null);
  const [magnetMode, setMagnetMode] = useState<MagnetMode>(() => {
    return (localStorage.getItem('eurusd_saved_magnet_mode') as MagnetMode) || 'weak';
  });
  const [lockedAll, setLockedAll] = useState<boolean>(false);
  const [hiddenAll, setHiddenAll] = useState<boolean>(false);
  const [chartMousePos, setChartMousePos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // Indicators State (with Persistence)
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    try {
      const saved = localStorage.getItem('eurusd_saved_indicators');
      return saved ? JSON.parse(saved) : DEFAULT_INDICATORS;
    } catch {
      return DEFAULT_INDICATORS;
    }
  });
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState<boolean>(false);

  // HUD Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  }, []);

  // Drawing Clipboard & Undo/Redo Stacks
  const clipboardRef = useRef<DrawingObject | null>((() => {
    try {
      const saved = localStorage.getItem('eurusd_drawing_clipboard');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })());
  const undoStackRef = useRef<DrawingObject[][]>([]);
  const redoStackRef = useRef<DrawingObject[][]>([]);

  // Automatic Persistence Effects
  useEffect(() => {
    try {
      localStorage.setItem('eurusd_saved_timeframe', timeframe);
    } catch {}
  }, [timeframe]);

  useEffect(() => {
    try {
      localStorage.setItem('eurusd_saved_chart_type', chartType);
    } catch {}
  }, [chartType]);

  useEffect(() => {
    try {
      localStorage.setItem('eurusd_saved_magnet_mode', magnetMode);
    } catch {}
  }, [magnetMode]);

  useEffect(() => {
    try {
      localStorage.setItem('eurusd_saved_indicators', JSON.stringify(indicators));
    } catch {}
  }, [indicators]);

  useEffect(() => {
    try {
      localStorage.setItem('eurusd_saved_drawings', JSON.stringify(drawings));
    } catch {}
  }, [drawings]);

  // Trades & Backtesting State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>({
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
  });
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState<boolean>(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState<boolean>(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState<boolean>(false);
  const [isJumpDateTimeModalOpen, setIsJumpDateTimeModalOpen] = useState<boolean>(false);
  const [isQuickTfModalOpen, setIsQuickTfModalOpen] = useState<boolean>(false);
  const [quickTfInitialValue, setQuickTfInitialValue] = useState<string>('');
  const [isSelectingReplayCut, setIsSelectingReplayCut] = useState<boolean>(false);
  const [activeSetup, setActiveSetup] = useState<DraggableTradeSetup | null>(null);

  // Replay State
  const [replayActive, setReplayActive] = useState<boolean>(false);
  const [replayPlaying, setReplayPlaying] = useState<boolean>(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>(1);
  const [replayTickIntervalSec, setReplayTickIntervalSec] = useState<number>(1.0);
  const [replayCurrentIndex, setReplayCurrentIndex] = useState<number>(0);
  const [replayMode, setReplayMode] = useState<ReplayMode>('candle');
  const [intrabarPhase, setIntrabarPhase] = useState<number>(3);

  // Chart Coordinate Transformer
  const [transformer, setTransformer] = useState<CoordinateTransformer>({
    timeToX: () => null,
    priceToY: () => null,
    xToTime: () => null,
    yToPrice: () => null,
  });

  const chartHelpersRef = useRef<{ fitContent: () => void; resetScale: () => void } | null>(null);

  // Load Historical Candles
  const loadCandles = useCallback(async (tf: Timeframe) => {
    setIsLoadingCandles(true);
    try {
      const data = await marketClient.fetchCandles(tf);
      setMasterCandles(data);
      replayEngine.setMasterCandles(data);

      if (!replayEngine.isActive()) {
        setVisibleCandles(data);
      } else {
        setVisibleCandles(replayEngine.getVisibleCandles());
      }
    } catch (e) {
      console.error('Failed to load candles:', e);
    } finally {
      setIsLoadingCandles(false);
    }
  }, []);

  // Initial Boot
  useEffect(() => {
    loadCandles(timeframe);

    // Initial Quote & Live WebSocket subscription
    marketClient.fetchQuote().then(setQuote).catch(() => {});
    const unsubQuote = marketClient.subscribeQuote((q) => {
      setQuote(q);
      // If not in replay mode, live ticks can update the current active candle
      if (!replayEngine.isActive()) {
        setVisibleCandles((prev) => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          const updatedLast = {
            ...last,
            close: q.bid,
            high: Math.max(last.high, q.bid),
            low: Math.min(last.low, q.bid),
          };
          return [...prev.slice(0, -1), updatedLast];
        });
      }
    });

    // Subscribe to trades
    const unsubTrades = backtestingEngine.subscribe(setTrades);

    // Load drawings
    marketClient.fetchDrawings().then(setDrawings).catch(() => {});

    // Load settings
    marketClient.fetchSettings().then(setSettings).catch(() => {});

    // Subscribe to draggable trade setup
    const unsubSetup = backtestingEngine.subscribeSetup(setActiveSetup);

    // Subscribe to replay engine
    const unsubReplay = replayEngine.subscribe({
      onCandleRevealed: (candle, visible) => {
        setVisibleCandles([...visible]);
        backtestingEngine.onCandleRevealed(candle);
      },
      onStateChange: (st) => {
        setReplayActive(st.active);
        setReplayPlaying(st.isPlaying);
        setReplayCurrentIndex(st.currentIndex);
        setReplaySpeed(st.speed);
        setReplayTickIntervalSec(st.tickIntervalSec);
        setReplayMode(st.mode);
        setIntrabarPhase(st.intrabarPhase);
      },
    });

    return () => {
      unsubQuote();
      unsubTrades();
      unsubSetup();
      unsubReplay();
    };
  }, []);

  // Handle Timeframe Change
  const handleTimeframeChange = (newTf: Timeframe) => {
    setTimeframe(newTf);
    loadCandles(newTf);
  };

  // Drawing History & Undo/Redo Engine
  const pushUndoSnapshot = useCallback((snapshot: DrawingObject[]) => {
    undoStackRef.current.push(JSON.parse(JSON.stringify(snapshot)));
    if (undoStackRef.current.length > 40) {
      undoStackRef.current.shift();
    }
    redoStackRef.current = [];
  }, []);

  const formatToolName = (type: string) => {
    return type
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getTimeframeSeconds = (tf: string): number => {
    if (tf.endsWith('s')) return parseInt(tf) || 30;
    if (tf.endsWith('m')) return (parseInt(tf) || 1) * 60;
    if (tf.endsWith('h')) return (parseInt(tf) || 1) * 3600;
    if (tf.endsWith('D')) return (parseInt(tf) || 1) * 86400;
    if (tf.endsWith('W')) return (parseInt(tf) || 1) * 604800;
    return 3600;
  };

  const handleCopyDrawing = useCallback((target?: DrawingObject | null) => {
    const d = target || drawings.find(item => item.id === selectedDrawingId);
    if (!d) return;
    clipboardRef.current = JSON.parse(JSON.stringify(d));
    try {
      localStorage.setItem('eurusd_drawing_clipboard', JSON.stringify(d));
    } catch {}
    showToast(`Copied ${formatToolName(d.type)} (Ctrl+V to paste)`);
  }, [drawings, selectedDrawingId, showToast]);

  const handleCutDrawing = useCallback((target?: DrawingObject | null) => {
    const d = target || drawings.find(item => item.id === selectedDrawingId);
    if (!d) return;
    handleCopyDrawing(d);
    pushUndoSnapshot(drawings);
    setDrawings(prev => prev.filter(item => item.id !== d.id));
    if (selectedDrawingId === d.id) setSelectedDrawingId(null);
    marketClient.deleteDrawing(d.id);
    showToast(`Cut ${formatToolName(d.type)}`);
  }, [drawings, selectedDrawingId, handleCopyDrawing, pushUndoSnapshot, showToast]);

  const handlePasteDrawing = useCallback(() => {
    let source = clipboardRef.current;
    if (!source) {
      try {
        const saved = localStorage.getItem('eurusd_drawing_clipboard');
        if (saved) source = JSON.parse(saved);
      } catch {}
    }
    if (!source || !source.points || source.points.length === 0) {
      showToast('Clipboard is empty (Select a tool and press Ctrl+C)');
      return;
    }

    let deltaT = 0;
    let deltaP = 0;

    if (chartMousePos && transformer.xToTime && transformer.yToPrice) {
      const mouseT = transformer.xToTime(chartMousePos.x);
      const mouseP = transformer.yToPrice(chartMousePos.y);
      if (mouseT !== null && mouseP !== null && source.points.length > 0) {
        deltaT = mouseT - source.points[0].time;
        deltaP = Number((mouseP - source.points[0].price).toFixed(5));
      }
    }

    // Default offset if mouse is not over chart (+5 bars, +2 pips)
    if (deltaT === 0 && deltaP === 0) {
      const stepSec = getTimeframeSeconds(timeframe);
      deltaT = stepSec * 5;
      deltaP = 0.00020;
    }

    const newPoints = source.points.map(pt => ({
      time: pt.time + deltaT,
      price: Number((pt.price + deltaP).toFixed(5)),
    }));

    const pasted: DrawingObject = {
      ...source,
      id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      points: newPoints,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    pushUndoSnapshot(drawings);
    setDrawings(prev => [...prev, pasted]);
    setSelectedDrawingId(pasted.id);
    marketClient.saveDrawing(pasted);
    showToast(`Pasted ${formatToolName(pasted.type)}`);
  }, [chartMousePos, transformer, timeframe, drawings, pushUndoSnapshot, showToast]);

  const handleDuplicateDrawing = useCallback((target?: DrawingObject | null) => {
    const d = target || drawings.find(item => item.id === selectedDrawingId);
    if (!d) return;
    const stepSec = getTimeframeSeconds(timeframe);
    const deltaT = stepSec * 4;
    const deltaP = 0.00015;

    const duplicated: DrawingObject = {
      ...d,
      id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      points: d.points.map(pt => ({
        time: pt.time + deltaT,
        price: Number((pt.price + deltaP).toFixed(5)),
      })),
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    pushUndoSnapshot(drawings);
    setDrawings(prev => [...prev, duplicated]);
    setSelectedDrawingId(duplicated.id);
    marketClient.saveDrawing(duplicated);
    showToast(`Duplicated ${formatToolName(duplicated.type)}`);
  }, [drawings, selectedDrawingId, timeframe, pushUndoSnapshot, showToast]);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      showToast('Nothing to undo');
      return;
    }
    const previous = undoStackRef.current.pop()!;
    redoStackRef.current.push(JSON.parse(JSON.stringify(drawings)));
    setDrawings(previous);
    marketClient.clearAllDrawings().then(() => {
      previous.forEach(d => marketClient.saveDrawing(d));
    });
    showToast('Undo Drawing Action');
  }, [drawings, showToast]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      showToast('Nothing to redo');
      return;
    }
    const next = redoStackRef.current.pop()!;
    undoStackRef.current.push(JSON.parse(JSON.stringify(drawings)));
    setDrawings(next);
    marketClient.clearAllDrawings().then(() => {
      next.forEach(d => marketClient.saveDrawing(d));
    });
    showToast('Redo Drawing Action');
  }, [drawings, showToast]);

  // Keyboard Shortcuts (Including Control Button Operations)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA';
      if (isInput) return;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;

      if (isCtrlOrCmd) {
        // Ctrl + C: Copy drawing
        if (e.key === 'c' || e.key === 'C') {
          if (selectedDrawingId) {
            e.preventDefault();
            handleCopyDrawing();
          }
        }
        // Ctrl + V: Paste drawing
        else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          handlePasteDrawing();
        }
        // Ctrl + X: Cut drawing
        else if (e.key === 'x' || e.key === 'X') {
          if (selectedDrawingId) {
            e.preventDefault();
            handleCutDrawing();
          }
        }
        // Ctrl + D: Duplicate drawing
        else if (e.key === 'd' || e.key === 'D') {
          if (selectedDrawingId) {
            e.preventDefault();
            handleDuplicateDrawing();
          }
        }
        // Ctrl + Z: Undo / Redo
        else if (e.key === 'z' || e.key === 'Z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        }
        // Ctrl + Y: Redo
        else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          handleRedo();
        }
        // Ctrl + A: Cycle or select all drawings
        else if (e.key === 'a' || e.key === 'A') {
          if (drawings.length > 0) {
            e.preventDefault();
            const curIdx = drawings.findIndex(d => d.id === selectedDrawingId);
            const nextIdx = (curIdx + 1) % drawings.length;
            setSelectedDrawingId(drawings[nextIdx].id);
            showToast(`Selected ${formatToolName(drawings[nextIdx].type)}`);
          }
        }
      }

      // Space: toggle replay play/pause
      if (e.code === 'Space' && replayActive) {
        e.preventDefault();
        replayEngine.togglePlayPause();
      }
      // Right arrow: step forward
      if (e.code === 'ArrowRight' && replayActive) {
        e.preventDefault();
        replayEngine.stepForward(1);
      }
      // Left arrow: step backward
      if (e.code === 'ArrowLeft' && replayActive) {
        e.preventDefault();
        replayEngine.stepBackward(1);
      }
      // Escape: clear active tool & selection
      if (e.code === 'Escape') {
        setActiveTool('crosshair');
        setSelectedDrawingId(null);
      }
      // Delete / Backspace: remove selected drawing
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedDrawingId) {
        handleDeleteDrawing(selectedDrawingId);
      }

      // Quick Numeric Timeframe Jump: Typing 0-9 anywhere on the chart opens the Quick Timeframe Jump dialog
      if (!isCtrlOrCmd && !e.altKey && /^[0-9]$/.test(e.key)) {
        if (
          !isIndicatorsModalOpen &&
          !isSettingsModalOpen &&
          !isSessionsModalOpen &&
          !isValidationModalOpen &&
          !isBalanceModalOpen &&
          !isJumpDateTimeModalOpen &&
          !editingDrawing &&
          !isQuickTfModalOpen
        ) {
          e.preventDefault();
          setQuickTfInitialValue(e.key);
          setIsQuickTfModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    replayActive,
    selectedDrawingId,
    drawings,
    handleCopyDrawing,
    handleCutDrawing,
    handlePasteDrawing,
    handleDuplicateDrawing,
    handleUndo,
    handleRedo,
    showToast,
    isIndicatorsModalOpen,
    isSettingsModalOpen,
    isSessionsModalOpen,
    isValidationModalOpen,
    isBalanceModalOpen,
    isJumpDateTimeModalOpen,
    editingDrawing,
    isQuickTfModalOpen,
  ]);

  // Drawing Actions
  const handleAddDrawing = (newD: DrawingObject) => {
    pushUndoSnapshot(drawings);
    setDrawings(prev => [...prev, newD]);
    marketClient.saveDrawing(newD);
  };

  const handleUpdateDrawing = (updated: DrawingObject, persist: boolean = true) => {
    if (persist) {
      pushUndoSnapshot(drawings);
    }
    setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (persist) {
      marketClient.saveDrawing(updated);
    }
  };

  const handleDeleteDrawing = (id: string) => {
    pushUndoSnapshot(drawings);
    setDrawings(prev => prev.filter(d => d.id !== id));
    if (selectedDrawingId === id) setSelectedDrawingId(null);
    marketClient.deleteDrawing(id);
    showToast('Deleted drawing');
  };

  const handleDeleteAllDrawings = () => {
    pushUndoSnapshot(drawings);
    setDrawings([]);
    setSelectedDrawingId(null);
    marketClient.clearAllDrawings();
    showToast('Cleared all drawings');
  };

  // Handle clicking on chart canvas (select nearby drawing or deselect when clicking empty space)
  const handleChartClick = useCallback((point: { x: number; y: number }) => {
    if (activeTool !== 'crosshair' && activeTool !== 'arrow') return;
    const hit = DrawingEngine.hitTest(point, drawings, transformer, 14, selectedDrawingId);
    if (hit) {
      setSelectedDrawingId(hit.drawing.id);
    } else {
      setSelectedDrawingId(null);
    }
  }, [activeTool, drawings, transformer, selectedDrawingId]);

  // Account Balance & Equity Calculation
  const netProfit = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const currentBalance = settings.initial_balance + netProfit;
  const openPnL = trades.filter(t => t.status === 'OPEN').reduce((acc, t) => {
    if (!quote) return acc;
    const curP = t.type === 'BUY' ? quote.bid : quote.ask;
    const diff = t.type === 'BUY' ? curP - t.entry_price : t.entry_price - curP;
    const pips = diff / 0.0001;
    return acc + pips * 10 * t.lot_size - (t.commission || 0);
  }, 0);
  const currentEquity = currentBalance + openPnL;

  const handleSaveBalance = (newBalance: number) => {
    const updated = { ...settings, initial_balance: newBalance };
    setSettings(updated);
    backtestingEngine.updateSettings(updated);
    marketClient.saveSettings(updated);
    setIsBalanceModalOpen(false);
  };

  const handleSelectReplayCutCandle = (candle: Candle) => {
    replayEngine.startReplay(candle.time);
    setVisibleCandles(replayEngine.getVisibleCandles());
    setIsSelectingReplayCut(false);
  };

  const handleJumpToTime = (epochSec: number) => {
    replayEngine.startReplay(epochSec);
    setVisibleCandles(replayEngine.getVisibleCandles());
    setIsJumpDateTimeModalOpen(false);
  };

  // Toggle Replay Mode
  const handleToggleReplay = () => {
    if (replayActive) {
      replayEngine.exitReplay();
      setVisibleCandles(masterCandles);
      setIsSelectingReplayCut(false);
    } else {
      if (masterCandles.length > 0) {
        const cutIdx = Math.max(0, masterCandles.length - 100);
        replayEngine.startReplay(cutIdx);
        setVisibleCandles(replayEngine.getVisibleCandles());
      }
    }
  };

  const handleLoadSession = (session: BacktestSession) => {
    if (session.timeframe && session.timeframe !== timeframe) {
      setTimeframe(session.timeframe as Timeframe);
      loadCandles(session.timeframe as Timeframe);
    }
    if (session.drawings) {
      setDrawings(session.drawings);
      session.drawings.forEach(d => marketClient.saveDrawing(d));
    }
    if (session.settings) {
      setSettings(session.settings);
      backtestingEngine.updateSettings(session.settings);
    }
    if (session.trades) {
      session.trades.forEach(t => marketClient.saveTrade(t));
      setTrades(session.trades);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#131722] text-[#d1d4dc] overflow-hidden select-none font-sans">
      {/* 1. TOP NAVIGATION BAR */}
      <TopBar
        quote={quote}
        timeframe={timeframe}
        onTimeframeChange={handleTimeframeChange}
        chartType={chartType}
        onChartTypeChange={setChartType}
        replayActive={replayActive}
        onToggleReplay={handleToggleReplay}
        onOpenIndicators={() => setIsIndicatorsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSessions={() => setIsSessionsModalOpen(true)}
        onOpenValidation={() => setIsValidationModalOpen(true)}
        onResetChart={() => chartHelpersRef.current?.resetScale()}
        onFitData={() => chartHelpersRef.current?.fitContent()}
        activeIndicatorsCount={indicators.filter(i => i.visible).length}
        balance={currentBalance}
        equity={currentEquity}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        onOpenQuickTimeframe={() => {
          setQuickTfInitialValue('');
          setIsQuickTfModalOpen(true);
        }}
      />

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Vertical Drawing Toolbar */}
        <LeftToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          magnetMode={magnetMode}
          onToggleMagnet={(mode) => {
            if (mode) {
              setMagnetMode(mode);
            } else {
              setMagnetMode(prev => (prev === 'off' ? 'weak' : prev === 'weak' ? 'strong' : 'off'));
            }
          }}
          lockedAll={lockedAll}
          onToggleLockAll={() => {
            const next = !lockedAll;
            setLockedAll(next);
            setDrawings(prev => prev.map(d => ({ ...d, locked: next })));
          }}
          hiddenAll={hiddenAll}
          onToggleHideAll={() => {
            const next = !hiddenAll;
            setHiddenAll(next);
            setDrawings(prev => prev.map(d => ({ ...d, hidden: next })));
          }}
          onDeleteAll={handleDeleteAllDrawings}
        />

        {/* Center Chart Viewport with Interactive Drawing Layer */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#131722]">
          {isLoadingCandles && (
            <div className="absolute inset-0 z-40 bg-[#131722]/60 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-[#2962ff] font-bold">
                <div className="w-4 h-4 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin" />
                <span>Loading EUR/USD Market Data...</span>
              </div>
            </div>
          )}

          {/* Main Candlestick Chart */}
          <div
            className="flex-1 relative"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setChartMousePos({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }}
            onMouseLeave={() => {
              setChartMousePos(null);
              setHoveredCandle(null);
            }}
          >
            <ChartContainer
              candles={visibleCandles}
              chartType={chartType}
              indicators={indicators}
              timeframe={timeframe}
              quote={quote}
              onTransformerReady={setTransformer}
              onChartInstanceReady={(inst) => { chartHelpersRef.current = inst; }}
              onChartClick={handleChartClick}
              hoveredCandleOverride={hoveredCandle}
            />

            {/* Interactive Drawing Layer Canvas Overlay */}
            <DrawingLayer
              drawings={drawings}
              activeTool={activeTool}
              transformer={transformer}
              selectedId={selectedDrawingId}
              onSelect={setSelectedDrawingId}
              onAdd={handleAddDrawing}
              onUpdate={handleUpdateDrawing}
              onDelete={handleDeleteDrawing}
              onResetTool={() => setActiveTool('crosshair')}
              magnetMode={magnetMode}
              candles={visibleCandles}
              timeframe={timeframe}
              activeSetup={activeSetup}
              onUpdateSetup={(updates) => backtestingEngine.updateTradeSetup(updates)}
              onConfirmSetup={() => backtestingEngine.confirmTradeSetup(replayEngine.getCurrentCandle()?.time || Math.floor(Date.now() / 1000))}
              onCancelSetup={() => backtestingEngine.cancelTradeSetup()}
              externalMousePos={chartMousePos}
              onHoverCandle={setHoveredCandle}
              isSelectingReplayCut={isSelectingReplayCut}
              onSelectReplayCutCandle={handleSelectReplayCutCandle}
              onCancelSelectReplayCut={() => setIsSelectingReplayCut(false)}
              onOpenPropertiesModal={setEditingDrawing}
              onCopyDrawing={handleCopyDrawing}
              onCutDrawing={handleCutDrawing}
              onDuplicateDrawing={handleDuplicateDrawing}
              onShowToast={showToast}
            />
          </div>

          {/* Oscillator Sub-panels (e.g. RSI, MACD, etc.) */}
          <IndicatorPanels
            indicators={indicators}
            candles={visibleCandles}
            onToggleIndicator={(id) => {
              setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, visible: !ind.visible } : ind));
            }}
            onRemoveIndicator={(id) => {
              setIndicators(prev => prev.filter(ind => ind.id !== id));
            }}
          />
        </div>

        {/* Right Sidebar (Order Ticket, Market Depth, Object Tree) */}
        <RightSidebar
          quote={quote}
          drawings={drawings}
          onSelectDrawing={setSelectedDrawingId}
          onUpdateDrawing={handleUpdateDrawing}
          onDeleteDrawing={handleDeleteDrawing}
          selectedDrawingId={selectedDrawingId}
          currentReplayCandleTime={replayEngine.getCurrentCandle()?.time}
          currentChartPrice={visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : undefined}
          settings={settings}
          onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
          onOpenDrawingProperties={setEditingDrawing}
        />
      </div>

      {/* 3. BOTTOM DOCK (REPLAY CONTROLLER, OPEN POSITIONS, TRADE LOG & ANALYTICS) */}
      <BottomPanel
        replayActive={replayActive}
        replayPlaying={replayPlaying}
        replaySpeed={replaySpeed}
        replayCurrentIndex={replayCurrentIndex}
        replayTotalCandles={masterCandles.length}
        replayMode={replayMode}
        intrabarPhase={intrabarPhase}
        trades={trades}
        currentPrice={quote ? quote.bid : 1.1143}
        settings={settings}
        onExitReplay={handleToggleReplay}
        onStartSelectCut={() => setIsSelectingReplayCut(true)}
        isSelectingCut={isSelectingReplayCut}
        onOpenJumpDateTime={() => setIsJumpDateTimeModalOpen(true)}
        replayTickIntervalSec={replayTickIntervalSec}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
      />

      {/* Workstation HUD Toast */}
      {toastMessage && (
        <div
          data-testid="workstation-hud-toast"
          className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-[#1e222d]/95 backdrop-blur-md border border-[#2962ff] px-4 py-1.5 rounded-full shadow-2xl text-xs font-semibold text-white flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 duration-150 pointer-events-none"
        >
          <span className="w-2 h-2 rounded-full bg-[#2962ff] animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4. MODALS */}
      <IndicatorsModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        activeIndicators={indicators}
        onToggleIndicator={(id) => {
          setIndicators(prev => prev.map(ind => ind.id === id ? { ...ind, visible: !ind.visible } : ind));
        }}
        onRemoveIndicator={(id) => {
          setIndicators(prev => prev.filter(ind => ind.id !== id));
        }}
        onAddIndicator={(newInd) => {
          setIndicators(prev => [...prev, newInd]);
        }}
        onUpdateIndicator={(updated) => {
          setIndicators(prev => prev.map(ind => ind.id === updated.id ? updated : ind));
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={(newSettings) => {
          setSettings(newSettings);
          backtestingEngine.updateSettings(newSettings);
        }}
      />

      <SessionsModal
        isOpen={isSessionsModalOpen}
        onClose={() => setIsSessionsModalOpen(false)}
        currentTrades={trades}
        currentDrawings={drawings}
        currentSettings={settings}
        currentTimeframe={timeframe}
        onLoadSession={handleLoadSession}
      />

      <DataValidationModal
        isOpen={isValidationModalOpen}
        onClose={() => setIsValidationModalOpen(false)}
        timeframe={timeframe}
      />

      <BalanceModal
        isOpen={isBalanceModalOpen}
        onClose={() => setIsBalanceModalOpen(false)}
        currentBalance={settings.initial_balance}
        onSaveBalance={handleSaveBalance}
      />

      <JumpDateTimeModal
        isOpen={isJumpDateTimeModalOpen}
        onClose={() => setIsJumpDateTimeModalOpen(false)}
        onJumpToTime={handleJumpToTime}
        candles={masterCandles}
      />

      <DrawingPropertiesModal
        isOpen={editingDrawing !== null}
        drawing={editingDrawing}
        onClose={() => setEditingDrawing(null)}
        onSave={(updated) => handleUpdateDrawing(updated, true)}
      />

      <QuickTimeframeModal
        isOpen={isQuickTfModalOpen}
        initialValue={quickTfInitialValue}
        onClose={() => setIsQuickTfModalOpen(false)}
        onSelectTimeframe={(newTf) => {
          handleTimeframeChange(newTf as Timeframe);
          showToast(`Timeframe changed to ${newTf}`);
        }}
      />
    </div>
  );
};

export default App;
