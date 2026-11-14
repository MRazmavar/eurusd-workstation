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
import { FavoritesToolbar } from './components/FavoritesToolbar';
import { FloatingTradeControlPanel } from './components/FloatingTradeControlPanel';
import { NewsOverlay } from './components/NewsOverlay';
import { useDeviceMode } from './hooks/useDeviceMode';
import { MobileBottomNav, MobileTab } from './components/MobileBottomNav';
import { MobileToolsSheet } from './components/MobileToolsSheet';
import { MobileDrawer } from './components/MobileDrawer';
import { MobileReplayBar } from './components/MobileReplayBar';
import { DEFAULT_FAVORITE_TOOLS } from './utils/drawingTools';
import { generateEconomicNewsEvents } from './utils/economicNews';
import { getSessionStatusesForTime } from './utils/sessions';
import { DraggableTradeSetup, ReplayMode, BacktestSession, EconomicNewsEvent } from './types';

const DEFAULT_INDICATORS: IndicatorConfig[] = [
  {
    id: 'ind_sessions',
    type: 'SESSIONS',
    name: 'Forex Sessions (NY 1h, Asia / Shield Area, London 1h, Frankfurt 1h)',
    color: '#8b5cf6',
    visible: true,
    isOverlay: true,
    params: {
      showAsia: 1,
      showShieldArea: 1,
      showFrankfurt1h: 1,
      showLondon1h: 1,
      showNy1h: 1,
      showHighLow: 1,
    },
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
  const visibleCandlesRef = useRef<Candle[]>([]);
  const lastCandleCommitTimeRef = useRef<number>(0);

  useEffect(() => {
    visibleCandlesRef.current = visibleCandles;
  }, [visibleCandles]);

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

  // Indicators State (with Persistence: only Sessions auto-activates on open, unless turned off)
  const [indicators, setIndicators] = useState<IndicatorConfig[]>(() => {
    try {
      const MIGRATION_KEY = 'eurusd_indicators_cleaned_v2';
      const isCleaned = localStorage.getItem(MIGRATION_KEY);
      const saved = localStorage.getItem('eurusd_saved_indicators');

      if (!isCleaned) {
        localStorage.setItem(MIGRATION_KEY, 'true');
        if (saved) {
          const parsed: IndicatorConfig[] = JSON.parse(saved);
          const sessionsItem = parsed.find(i => i.type === 'SESSIONS');
          // Preserve user preference for sessions (defaulting to true on open)
          const sessionsVisible = sessionsItem !== undefined ? sessionsItem.visible : true;

          const cleaned: IndicatorConfig[] = [
            {
              ...(sessionsItem || DEFAULT_INDICATORS[0]),
              visible: sessionsVisible,
            },
          ];

          // Preserve any custom user-added indicators, but exclude legacy auto-activated defaults (SMA, EMA, RSI)
          for (const ind of parsed) {
            if (ind.type === 'SESSIONS') continue;
            if (['ind_sma20', 'ind_ema50', 'ind_rsi'].includes(ind.id)) {
              continue; // Legacy default: do NOT auto-activate
            }
            cleaned.push(ind);
          }

          localStorage.setItem('eurusd_saved_indicators', JSON.stringify(cleaned));
          return cleaned;
        } else {
          localStorage.setItem('eurusd_saved_indicators', JSON.stringify(DEFAULT_INDICATORS));
          return DEFAULT_INDICATORS;
        }
      }

      if (saved) {
        const parsed: IndicatorConfig[] = JSON.parse(saved);
        if (!parsed.some((i: IndicatorConfig) => i.type === 'SESSIONS')) {
          parsed.unshift(DEFAULT_INDICATORS[0]);
        }
        return parsed;
      }
      return DEFAULT_INDICATORS;
    } catch {
      return DEFAULT_INDICATORS;
    }
  });
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState<boolean>(false);

  // HUD Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<any>(null);

  // Device Mode Recognition & Mobile Responsiveness
  const { viewMode, effectiveMode, isMobile, setViewMode, toggleMode } = useDeviceMode();
  const [mobileActiveTab, setMobileActiveTab] = useState<MobileTab>('chart');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState<boolean>(false);

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
  const justCreatedDrawingTimeRef = useRef<number>(0);

  // Automatic Persistence Effects
  useEffect(() => {
    const handleOpenProperties = (e: any) => {
      if (e.detail) setEditingDrawing(e.detail);
    };
    window.addEventListener('open-drawing-properties', handleOpenProperties);
    return () => window.removeEventListener('open-drawing-properties', handleOpenProperties);
  }, []);

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

  // Favorite Drawing Tools State (Persisted in localStorage)
  const [favoriteTools, setFavoriteTools] = useState<DrawingToolType[]>(() => {
    try {
      const saved = localStorage.getItem('eurusd_favorite_tools');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_FAVORITE_TOOLS;
  });
  const [showFavoritesToolbar, setShowFavoritesToolbar] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('eurusd_show_fav_toolbar');
      if (saved !== null) {
        return JSON.parse(saved);
      }
    } catch {}
    return true;
  });

  useEffect(() => {
    try {
      localStorage.setItem('eurusd_show_fav_toolbar', JSON.stringify(showFavoritesToolbar));
    } catch {}
  }, [showFavoritesToolbar]);

  const handleToggleFavorite = useCallback((tool: DrawingToolType) => {
    setFavoriteTools(prev => {
      const exists = prev.includes(tool);
      const updated = exists ? prev.filter(t => t !== tool) : [...prev, tool];
      try {
        localStorage.setItem('eurusd_favorite_tools', JSON.stringify(updated));
      } catch {}
      showToast(exists ? `Removed ${tool.replace('_', ' ')} from favorites` : `Added ${tool.replace('_', ' ')} to favorites`);
      return updated;
    });
  }, [showToast]);

  // Trades & Backtesting State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<UserSettings>(() => ({
    initial_balance: 10000,
    account_currency: 'USD',
    default_risk_percent: 1,
    default_lot_size: 1,
    spread_pips: 1.2,
    commission_per_lot: 3.5,
    slippage_pips: 0.2,
    active_provider: 'dukascopy',
    timezone: localStorage.getItem('eurusd_saved_timezone') || 'UTC',
    theme: 'dark',
  }));

  const handleTimezoneChange = useCallback((newTz: string) => {
    setSettings(prev => {
      const updated = { ...prev, timezone: newTz };
      localStorage.setItem('eurusd_saved_timezone', newTz);
      backtestingEngine.updateSettings(updated);
      return updated;
    });
    showToast(`Timezone changed to ${newTz}`);
  }, [showToast]);

  const handleToggleSessions = useCallback(() => {
    setIndicators(prev => {
      const existing = prev.find(i => i.type === 'SESSIONS');
      if (!existing) {
        const next = [DEFAULT_INDICATORS[0], ...prev];
        localStorage.setItem('eurusd_saved_indicators', JSON.stringify(next));
        showToast('Forex Sessions Indicator: ON');
        return next;
      }
      const next = prev.map(ind =>
        ind.type === 'SESSIONS' ? { ...ind, visible: !ind.visible } : ind
      );
      localStorage.setItem('eurusd_saved_indicators', JSON.stringify(next));
      const willBeVisible = !existing.visible;
      showToast(`Forex Sessions Indicator: ${willBeVisible ? 'ON' : 'OFF'}`);
      return next;
    });
  }, [showToast]);

  // Forex Factory Economic News State
  const [newsActive, setNewsActive] = useState<boolean>(() => {
    return localStorage.getItem('eurusd_news_active') !== 'false';
  });
  const [newsFilter, setNewsFilter] = useState<'ALL' | 'HIGH_ONLY'>(() => {
    return (localStorage.getItem('eurusd_news_filter') as 'ALL' | 'HIGH_ONLY') || 'ALL';
  });
  const [newsEvents, setNewsEvents] = useState<EconomicNewsEvent[]>([]);

  const handleToggleNews = useCallback(() => {
    setNewsActive(prev => {
      const next = !prev;
      localStorage.setItem('eurusd_news_active', next ? 'true' : 'false');
      showToast(`Forex Factory News: ${next ? 'ON' : 'OFF'}`);
      return next;
    });
  }, [showToast]);

  const handleToggleNewsFilter = useCallback(() => {
    setNewsFilter(prev => {
      const next = prev === 'ALL' ? 'HIGH_ONLY' : 'ALL';
      localStorage.setItem('eurusd_news_filter', next);
      showToast(next === 'HIGH_ONLY' ? 'News: High Impact (Red) Only' : 'News: All (Red & Yellow)');
      return next;
    });
  }, [showToast]);

  // Load / Compute Economic News Events for visible market span + upcoming future days
  useEffect(() => {
    const list = masterCandles.length > 0 ? masterCandles : visibleCandles;
    if (list.length === 0) return;

    const startSec = list[0].time - 86400 * 7;
    const endSec = Math.max(list[list.length - 1].time, Math.floor(Date.now() / 1000)) + 86400 * 14;

    marketClient
      .fetchNews(startSec, endSec)
      .then((data) => {
        if (data && data.length > 0) {
          setNewsEvents(data);
        } else {
          setNewsEvents(generateEconomicNewsEvents(startSec, endSec));
        }
      })
      .catch(() => {
        setNewsEvents(generateEconomicNewsEvents(startSec, endSec));
      });
  }, [masterCandles, visibleCandles]);

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
  const [centerTrigger, setCenterTrigger] = useState<number>(0);

  // Chart Coordinate Transformer
  const [transformer, setTransformer] = useState<CoordinateTransformer>({
    timeToX: () => null,
    priceToY: () => null,
    xToTime: () => null,
    yToPrice: () => null,
  });

  const [anchorTimestamp, setAnchorTimestamp] = useState<number | null>(null);
  const timeframeRef = useRef<Timeframe>(timeframe);
  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  const getTimeframeSeconds = (tf: string): number => {
    if (tf.endsWith('s')) return parseInt(tf) || 30;
    if (tf.endsWith('m')) return (parseInt(tf) || 1) * 60;
    if (tf.endsWith('h')) return (parseInt(tf) || 1) * 3600;
    if (tf.endsWith('D')) return (parseInt(tf) || 1) * 86400;
    if (tf.endsWith('W')) return (parseInt(tf) || 1) * 604800;
    return 3600;
  };

  const isTimestampInCandle = (ts: number, candle: Candle, tf: string): boolean => {
    const dur = getTimeframeSeconds(tf);
    return ts >= candle.time && ts < candle.time + dur;
  };

  const chartHelpersRef = useRef<{
    fitContent: () => void;
    resetScale: () => void;
    centerOnLastCandle?: () => void;
    centerOnTimestamp?: (timestamp: number) => void;
    getVisibleCenterTime?: () => number | null;
  } | null>(null);

  const getQueryWindowForTimeframe = (tf: string, anchorTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    let daysBefore = 30;
    let daysAfter = 30;

    if (tf.endsWith('s') || tf === '1m') {
      daysBefore = 5;
      daysAfter = 5;
    } else if (['3m', '5m', '15m', '20m', '30m', '45m'].includes(tf)) {
      daysBefore = 20;
      daysAfter = 20;
    } else if (['1h', '2h', '3h', '4h'].includes(tf)) {
      daysBefore = 90;
      daysAfter = 90;
    } else {
      daysBefore = 365;
      daysAfter = 180;
    }

    const startTime = anchorTime - daysBefore * 86400;
    const endTime = Math.min(now, anchorTime + daysAfter * 86400);
    return { startTime, endTime };
  };

  // Load Historical Candles with anchor window support
  const loadCandles = useCallback(async (tf: Timeframe, anchorTime?: number | null) => {
    setIsLoadingCandles(true);
    try {
      let data: Candle[] = [];
      const now = Math.floor(Date.now() / 1000);
      const isHistorical = anchorTime && (replayEngine.isActive() || (now - anchorTime > 86400 * 3));

      if (isHistorical && anchorTime) {
        const { startTime, endTime } = getQueryWindowForTimeframe(tf, anchorTime);
        data = await marketClient.fetchCandles(tf, undefined, startTime, endTime);
        if (!data || data.length === 0) {
          data = await marketClient.fetchCandles(tf);
        }
      } else {
        data = await marketClient.fetchCandles(tf);
      }

      setMasterCandles(data);
      replayEngine.setMasterCandles(data, anchorTime ?? undefined);

      if (!replayEngine.isActive()) {
        setVisibleCandles(data);
      } else {
        setVisibleCandles(replayEngine.getVisibleCandles());
      }
      return data;
    } catch (e) {
      console.error('Failed to load candles:', e);
      return [];
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
      // If not in replay mode, live ticks update the active developing candle
      if (!replayEngine.isActive()) {
        const currentList = visibleCandlesRef.current;
        if (currentList.length === 0) return;

        const tfSec = getTimeframeSeconds(timeframeRef.current);
        const barTime = Math.floor(q.timestamp / tfSec) * tfSec;
        const last = currentList[currentList.length - 1];

        if (barTime > last.time) {
          // New candle period started: open new bar immediately
          const newCandle: Candle = {
            time: barTime,
            open: q.bid,
            high: q.bid,
            low: q.bid,
            close: q.bid,
            volume: 1,
          };
          const nextList = [...currentList, newCandle];
          visibleCandlesRef.current = nextList;
          setVisibleCandles(nextList);
        } else if (barTime === last.time) {
          // Update current developing bar
          last.close = q.bid;
          last.high = Math.max(last.high, q.bid);
          last.low = Math.min(last.low, q.bid);
          last.volume = (last.volume || 0) + 1;

          // Commit to React state every 800ms to keep React components in sync
          // while ChartContainer receives quote and updates HTML5 canvas at full 4 FPS
          const now = Date.now();
          if (now - lastCandleCommitTimeRef.current >= 800) {
            lastCandleCommitTimeRef.current = now;
            setVisibleCandles([...currentList]);
          }
        }
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
        setAnchorTimestamp(prev => {
          if (prev && isTimestampInCandle(prev, candle, timeframeRef.current)) {
            return prev;
          }
          return candle.time;
        });
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

  // Handle Timeframe Change with seamless anchor date/time preservation
  const handleTimeframeChange = async (newTf: Timeframe) => {
    let anchorTime: number | null = null;
    if (replayEngine.isActive()) {
      anchorTime = anchorTimestamp ?? replayEngine.getCurrentTimestamp();
    } else {
      anchorTime = chartHelpersRef.current?.getVisibleCenterTime?.() ?? null;
    }

    setTimeframe(newTf);
    if (anchorTime) {
      setAnchorTimestamp(anchorTime);
    }
    await loadCandles(newTf, anchorTime);
    setCenterTrigger(prev => prev + 1);
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
    justCreatedDrawingTimeRef.current = Date.now();
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
    if (Date.now() - justCreatedDrawingTimeRef.current < 400) return;
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
    setAnchorTimestamp(candle.time);
    replayEngine.startReplay(candle.time);
    setVisibleCandles(replayEngine.getVisibleCandles());
    setIsSelectingReplayCut(false);
    setCenterTrigger(prev => prev + 1);
  };

  const handleJumpToTime = async (epochSec: number) => {
    setAnchorTimestamp(epochSec);
    await loadCandles(timeframe, epochSec);
    replayEngine.startReplay(epochSec);
    setVisibleCandles(replayEngine.getVisibleCandles());
    setIsJumpDateTimeModalOpen(false);
    setCenterTrigger(prev => prev + 1);
  };

  // Jump to Random Date in history for blind, unpredictable backtesting
  const handleRandomDateReplay = async () => {
    const now = Math.floor(Date.now() / 1000);
    // Pick a random historical trading day between 15 days ago and 180 days ago
    const minDaysAgo = 15;
    const maxDaysAgo = 180;
    const randomDaysAgo = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
    let targetTime = now - randomDaysAgo * 86400;

    // Adjust if target falls on weekend (Forex is closed Saturday/Sunday)
    const targetDate = new Date(targetTime * 1000);
    const day = targetDate.getUTCDay();
    if (day === 0) { // Sunday -> push to Tuesday
      targetTime += 2 * 86400;
    } else if (day === 6) { // Saturday -> push to Friday
      targetTime -= 86400;
    }

    // Set hour to active London/NY session overlap (13:00 UTC)
    targetDate.setUTCHours(13, 0, 0, 0);
    targetTime = Math.floor(targetDate.getTime() / 1000);

    setAnchorTimestamp(targetTime);
    const loaded = await loadCandles(timeframe, targetTime);

    if (loaded && loaded.length > 0) {
      replayEngine.startReplay(targetTime);
      const visible = replayEngine.getVisibleCandles();
      setVisibleCandles(visible);
      setIsSelectingReplayCut(false);
      setCenterTrigger(prev => prev + 1);

      const actualCandle = replayEngine.getCurrentCandle();
      const displayTime = actualCandle ? actualCandle.time : targetTime;
      const dateStr = new Date(displayTime * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      showToast(`🎲 Jumped to Random Date: ${dateStr}`);
    }
  };

  // Toggle Replay Mode
  const handleToggleReplay = () => {
    if (replayActive) {
      replayEngine.exitReplay();
      setAnchorTimestamp(null);
      setVisibleCandles(masterCandles);
      setIsSelectingReplayCut(false);
      setCenterTrigger(prev => prev + 1);
      showToast('Exited Replay Mode');
    } else {
      if (masterCandles.length > 0) {
        const cutIdx = Math.max(0, masterCandles.length - 100);
        const cutTime = masterCandles[cutIdx].time;
        setAnchorTimestamp(cutTime);
        replayEngine.startReplay(cutIdx);
        setVisibleCandles(replayEngine.getVisibleCandles());
        setCenterTrigger(prev => prev + 1);
        showToast('Bar Replay Active: Centered on Price');
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

  const currentSessionRefTime = replayActive
    ? (replayEngine.getCurrentCandle()?.time ?? (visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].time : Math.floor(Date.now() / 1000)))
    : (visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].time : Math.floor(Date.now() / 1000));

  const activeSessionSummary = React.useMemo(() => {
    const summaries = getSessionStatusesForTime(currentSessionRefTime, visibleCandles);
    return summaries.find(s => s.status === 'ACTIVE');
  }, [currentSessionRefTime, visibleCandles]);

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
        onRandomDateReplay={handleRandomDateReplay}
        onOpenIndicators={() => setIsIndicatorsModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenSessions={() => setIsSessionsModalOpen(true)}
        onOpenValidation={() => setIsValidationModalOpen(true)}
        onResetChart={() => chartHelpersRef.current?.resetScale()}
        onFitData={() => chartHelpersRef.current?.fitContent()}
        activeIndicatorsCount={indicators.filter(i => i.visible && i.type !== 'SESSIONS').length}
        balance={currentBalance}
        equity={currentEquity}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        onOpenQuickTimeframe={() => {
          setQuickTfInitialValue('');
          setIsQuickTfModalOpen(true);
        }}
        sessionsIndicatorActive={indicators.find(i => i.type === 'SESSIONS')?.visible ?? true}
        activeSessionLabel={activeSessionSummary?.session.shortLabel}
        onToggleSessionsIndicator={handleToggleSessions}
        timezone={settings.timezone}
        onTimezoneChange={handleTimezoneChange}
        newsActive={newsActive}
        onToggleNews={handleToggleNews}
        newsFilter={newsFilter}
        onToggleNewsFilter={handleToggleNewsFilter}
        isMobile={isMobile}
        effectiveMode={effectiveMode}
        viewMode={viewMode}
        onToggleMode={toggleMode}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
      />

      {/* Mobile Bar Replay Controller Header */}
      {isMobile && replayActive && (
        <MobileReplayBar
          replayPlaying={replayPlaying}
          replaySpeed={replaySpeed}
          replayCurrentIndex={replayCurrentIndex}
          replayTotalCandles={masterCandles.length}
          onExitReplay={handleToggleReplay}
          onStartSelectCut={() => setIsSelectingReplayCut(true)}
          isSelectingCut={isSelectingReplayCut}
        />
      )}

      {/* 2. MAIN WORKSPACE AREA */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Vertical Drawing Toolbar (Desktop Mode) */}
        {!isMobile && (
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
            favoriteTools={favoriteTools}
            onToggleFavorite={handleToggleFavorite}
            showFavoritesToolbar={showFavoritesToolbar}
            onToggleShowFavoritesToolbar={() => setShowFavoritesToolbar(prev => !prev)}
          />
        )}

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
            className="flex-1 min-h-0 relative"
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
              centerTrigger={centerTrigger}
              anchorTimestamp={anchorTimestamp}
              isReplayActive={replayActive}
              timezone={settings.timezone}
              onTimezoneChange={handleTimezoneChange}
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
              trades={trades}
              currentPrice={visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (quote?.bid || (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : 1.11380))}
              onCloseTrade={(tradeId) => {
                const curP = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (quote?.bid || (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : 1.11380));
                const time = replayEngine.getCurrentCandle()?.time || Math.floor(Date.now() / 1000);
                backtestingEngine.closeTrade(tradeId, curP, time, 'MANUAL');
                showToast('Closed Position from Chart');
              }}
              onModifyTrade={(tradeId, updates) => {
                backtestingEngine.modifyTrade(tradeId, updates);
                showToast('Updated Trade Level on Chart');
              }}
              onCancelTrade={(tradeId) => {
                backtestingEngine.cancelTrade(tradeId);
                showToast('Cancelled Pending Order');
              }}
              indicators={indicators}
              timezone={settings.timezone}
              sessionsActive={indicators.find(i => i.type === 'SESSIONS')?.visible ?? true}
              currentReplayTimestamp={replayActive ? (replayEngine.getCurrentCandle()?.time || null) : null}
            />

            {/* Forex Factory Economic Calendar News Events Overlay */}
            <NewsOverlay
              events={newsEvents}
              visible={newsActive}
              filter={newsFilter}
              transformer={transformer}
              timezone={settings.timezone}
              replayActive={replayActive}
              currentReplayTimestamp={replayEngine.getCurrentCandle()?.time || null}
              isMobile={isMobile}
            />

            {/* Draggable Floating Favorite Tools Toolbar directly on Chart */}
            {favoriteTools.length > 0 && showFavoritesToolbar && (
              <FavoritesToolbar
                favoriteTools={favoriteTools}
                activeTool={activeTool}
                onSelectTool={setActiveTool}
                onToggleFavorite={handleToggleFavorite}
                onClose={() => setShowFavoritesToolbar(false)}
              />
            )}

            {/* Draggable Floating Trade Settings & Control Panel (Lowest Left by default) */}
            <FloatingTradeControlPanel
              trades={trades}
              activeSetup={activeSetup}
              currentPrice={visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (quote?.bid || (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : 1.11380))}
              onConfirmSetup={() => backtestingEngine.confirmTradeSetup(replayEngine.getCurrentCandle()?.time || Math.floor(Date.now() / 1000))}
              onCancelSetup={() => backtestingEngine.cancelTradeSetup()}
              onCloseTrade={(tradeId) => {
                const curP = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (quote?.bid || (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : 1.11380));
                const time = replayEngine.getCurrentCandle()?.time || Math.floor(Date.now() / 1000);
                backtestingEngine.closeTrade(tradeId, curP, time, 'MANUAL');
                showToast('Closed Position');
              }}
              onModifyTrade={(tradeId, updates) => {
                backtestingEngine.modifyTrade(tradeId, updates);
                showToast('Updated Trade Level');
              }}
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

        {/* Right Sidebar (Desktop Mode) */}
        {!isMobile && (
          <RightSidebar
            quote={quote}
            drawings={drawings}
            onSelectDrawing={setSelectedDrawingId}
            onUpdateDrawing={handleUpdateDrawing}
            onDeleteDrawing={handleDeleteDrawing}
            selectedDrawingId={selectedDrawingId}
            currentReplayCandleTime={replayEngine.getCurrentCandle()?.time}
            currentChartPrice={visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : (quote?.bid || 1.11380))}
            settings={settings}
            balance={currentBalance}
            equity={currentEquity}
            onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
            onOpenDrawingProperties={setEditingDrawing}
            candles={visibleCandles}
          />
        )}
      </div>

      {/* 3. BOTTOM DOCK (Desktop Mode) */}
      {!isMobile && (
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
          onRandomDateReplay={handleRandomDateReplay}
          replayTickIntervalSec={replayTickIntervalSec}
          onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        />
      )}

      {/* 4. MOBILE BOTTOM NAVIGATION (Mobile Mode) */}
      {isMobile && (
        <MobileBottomNav
          activeTab={mobileActiveTab}
          onTabChange={(tab) => {
            if (tab === 'tools') {
              setIsMobileToolsOpen(true);
            } else {
              setMobileActiveTab(tab);
            }
          }}
          openPositionsCount={trades.filter(t => t.status === 'OPEN').length}
          hasActiveTradeSetup={Boolean(activeSetup?.active)}
          activeDrawingTool={activeTool}
        />
      )}

      {/* 5. MOBILE MODALS & SHEETS */}
      {/* Mobile Trade / Order Ticket Sheet */}
      {isMobile && mobileActiveTab === 'trade' && (
        <div
          data-testid="mobile-trade-sheet"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setMobileActiveTab('chart')}
        >
          <div
            className="bg-[#131722] border-t border-[#2a2e39] rounded-t-2xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
            <RightSidebar
              quote={quote}
              drawings={drawings}
              onSelectDrawing={setSelectedDrawingId}
              onUpdateDrawing={handleUpdateDrawing}
              onDeleteDrawing={handleDeleteDrawing}
              selectedDrawingId={selectedDrawingId}
              currentReplayCandleTime={replayEngine.getCurrentCandle()?.time}
              currentChartPrice={visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1].close : (masterCandles.length > 0 ? masterCandles[masterCandles.length - 1].close : (quote?.bid || 1.11380))}
              settings={settings}
              balance={currentBalance}
              equity={currentEquity}
              onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
              onOpenDrawingProperties={setEditingDrawing}
              candles={visibleCandles}
              isMobile={true}
              onCloseMobile={() => setMobileActiveTab('chart')}
            />
          </div>
        </div>
      )}

      {/* Mobile Positions / Analytics Sheet */}
      {isMobile && (mobileActiveTab === 'positions' || mobileActiveTab === 'analytics') && (
        <div
          data-testid="mobile-dock-sheet"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
          onClick={() => setMobileActiveTab('chart')}
        >
          <div
            className="bg-[#131722] border-t border-[#2a2e39] rounded-t-2xl h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-250"
            onClick={(e) => e.stopPropagation()}
          >
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
              onRandomDateReplay={handleRandomDateReplay}
              replayTickIntervalSec={replayTickIntervalSec}
              onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
              isMobile={true}
              initialTab={mobileActiveTab === 'positions' ? 'positions' : 'analytics'}
              hideReplayBar={true}
              onCloseMobile={() => setMobileActiveTab('chart')}
            />
          </div>
        </div>
      )}

      {/* Mobile Tools Sheet */}
      <MobileToolsSheet
        isOpen={isMobileToolsOpen}
        onClose={() => {
          setIsMobileToolsOpen(false);
          setMobileActiveTab('chart');
        }}
        activeTool={activeTool}
        onSelectTool={(t) => {
          setActiveTool(t);
          setIsMobileToolsOpen(false);
          setMobileActiveTab('chart');
          showToast(`Selected ${t.replace('_', ' ')}`);
        }}
        magnetMode={magnetMode}
        onToggleMagnet={(mode) => {
          if (mode) setMagnetMode(mode);
          else setMagnetMode(prev => (prev === 'off' ? 'weak' : prev === 'weak' ? 'strong' : 'off'));
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
        favoriteTools={favoriteTools}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Mobile Menu Drawer */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        viewMode={viewMode}
        effectiveMode={effectiveMode}
        onSetViewMode={(mode) => {
          setViewMode(mode);
          setIsMobileMenuOpen(false);
          showToast(`Switched to ${mode.toUpperCase()} view mode`);
        }}
        balance={currentBalance}
        equity={currentEquity}
        onOpenBalanceModal={() => setIsBalanceModalOpen(true)}
        onOpenIndicators={() => setIsIndicatorsModalOpen(true)}
        activeIndicatorsCount={indicators.filter(i => i.visible && i.type !== 'SESSIONS').length}
        sessionsIndicatorActive={indicators.find(i => i.type === 'SESSIONS')?.visible ?? true}
        activeSessionLabel={activeSessionSummary?.session.shortLabel}
        onToggleSessionsIndicator={handleToggleSessions}
        onOpenSessions={() => setIsSessionsModalOpen(true)}
        newsActive={newsActive}
        onToggleNews={handleToggleNews}
        newsFilter={newsFilter}
        onToggleNewsFilter={handleToggleNewsFilter}
        replayActive={replayActive}
        onToggleReplay={handleToggleReplay}
        onRandomDateReplay={handleRandomDateReplay}
        onOpenValidation={() => setIsValidationModalOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onResetChart={() => chartHelpersRef.current?.resetScale()}
        onFitData={() => chartHelpersRef.current?.fitContent()}
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
          if (newSettings.timezone) {
            localStorage.setItem('eurusd_saved_timezone', newSettings.timezone);
          }
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
        timezone={settings.timezone}
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
