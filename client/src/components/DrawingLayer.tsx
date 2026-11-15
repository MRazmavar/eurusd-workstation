/**
 * Interactive SVG Drawing Overlay for TradingView-style technical analysis tools
 * and Draggable Trade Setup Lines (Entry, Stop Loss, Take Profit).
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  DrawingObject,
  DrawingToolType,
  Point,
  Candle,
  DraggableTradeSetup,
  MagnetMode,
  Trade,
  IndicatorConfig,
  FibLevel,
} from '../types';
import { DrawingEngine, CoordinateTransformer, ScreenPoint } from '../services/DrawingEngine';
import { DrawingToolbarPopup } from './DrawingToolbarPopup';
import { Check, X as CloseIcon } from 'lucide-react';
import { computeSessionBlocks, getCandleBarInterval } from '../utils/sessions';
import { formatTimeInTimezone, formatBadgeTimeInTimezone, getTimeframeSeconds } from '../utils/timezone';
import { DEFAULT_FIB_LEVELS, getDefaultFibLevels, formatFibLevel } from '../utils/fibonacci';
import { PositionToolService } from '../services/PositionToolService';

export interface MagnetSnapInfo {
  isSnapped: boolean;
  snapType?: 'High' | 'Low' | 'Open' | 'Close';
  candle?: Candle;
  screenX: number;
  screenY: number;
  time: number;
  price: number;
}

interface DrawingLayerProps {
  drawings: DrawingObject[];
  activeTool: DrawingToolType;
  transformer: CoordinateTransformer;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (d: DrawingObject) => void;
  onUpdate: (d: DrawingObject, persist?: boolean, pushUndo?: boolean) => void;
  onDelete: (id: string) => void;
  onResetTool: () => void;
  magnetMode: MagnetMode;
  candles: Candle[];
  timeframe: string;
  activeSetup?: DraggableTradeSetup | null;
  onUpdateSetup?: (setup: Partial<DraggableTradeSetup>) => void;
  onConfirmSetup?: () => void;
  onCancelSetup?: () => void;
  externalMousePos?: { x: number; y: number } | null;
  onHoverCandle?: (candle: Candle | null) => void;
  isSelectingReplayCut?: boolean;
  onSelectReplayCutCandle?: (candle: Candle) => void;
  onCancelSelectReplayCut?: () => void;
  onOpenPropertiesModal?: (drawing: DrawingObject) => void;
  onCopyDrawing?: (drawing: DrawingObject) => void;
  onCutDrawing?: (drawing: DrawingObject) => void;
  onDuplicateDrawing?: (drawing: DrawingObject) => void;
  onShowToast?: (msg: string) => void;
  trades?: Trade[];
  currentPrice?: number;
  onCloseTrade?: (tradeId: string) => void;
  onModifyTrade?: (tradeId: string, updates: Partial<Trade>) => void;
  onCancelTrade?: (tradeId: string) => void;
  indicators?: IndicatorConfig[];
  timezone?: string;
  timeFormat?: string;
  showSeconds?: boolean;
  sessionsActive?: boolean;
  currentReplayTimestamp?: number | null;
  isLoadingCandles?: boolean;
  isMobile?: boolean;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({
  drawings,
  activeTool,
  transformer,
  selectedId,
  onSelect,
  onAdd,
  onUpdate,
  onDelete,
  onResetTool,
  magnetMode,
  candles,
  timeframe,
  activeSetup,
  onUpdateSetup,
  onConfirmSetup,
  onCancelSetup,
  externalMousePos,
  onHoverCandle,
  isSelectingReplayCut,
  onSelectReplayCutCandle,
  onCancelSelectReplayCut,
  onOpenPropertiesModal,
  onCopyDrawing,
  onCutDrawing,
  onDuplicateDrawing,
  onShowToast,
  trades,
  currentPrice,
  onCloseTrade,
  onModifyTrade,
  onCancelTrade,
  indicators,
  timezone = 'UTC',
  timeFormat = 'adaptive',
  showSeconds = false,
  sessionsActive = true,
  currentReplayTimestamp,
  isLoadingCandles = false,
  isMobile = false,
}) => {
  const isMobileScreen = isMobile || (typeof window !== 'undefined' && window.innerWidth < 768);
  const hitTargetWidth = isMobileScreen ? 36 : 16;
  const handleHitRadius = isMobileScreen ? 24 : 12;
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Crosshair & Magnet state
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1000, height: 600 });
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const isCtrlPressedRef = useRef<boolean>(false);
  const [activeCrosshair, setActiveCrosshair] = useState<MagnetSnapInfo | null>(null);

  // Drawing state
  const [inProgressDrawing, setInProgressDrawing] = useState<DrawingObject | null>(null);
  const [dragState, setDragState] = useState<{
    drawingId: string;
    drawing?: DrawingObject;
    pointIndex?: number;
    startMouse: ScreenPoint;
    initialPoints: Point[];
    initialLogicals?: number[];
    startLogical?: number;
    startPrice?: number;
    isClone?: boolean;
  } | null>(null);

  // Dragging interactive trade setup lines ('entry' | 'sl' | 'tp' | 'body' | 'start' | 'end')
  const [draggingSetupLine, setDraggingSetupLine] = useState<'entry' | 'sl' | 'tp' | 'body' | 'start' | 'end' | null>(null);
  const dragSetupInitialRef = useRef<{
    mouseTime: number;
    mousePrice: number;
    entry: number;
    sl: number;
    tp: number;
    startTime: number;
    endTime: number;
  } | null>(null);
  // Dragging confirmed active trade lines (SL or TP or Entry of an active/pending trade)
  const [draggingTradeLine, setDraggingTradeLine] = useState<{ tradeId: string; lineType: 'sl' | 'tp' | 'entry' } | null>(null);
  const justCreatedTimeRef = useRef<number>(0);

  // Floating options toolbar: ONLY shown when explicitly double-clicked, right-clicked, or touch-held on phone
  const [activeToolbarDrawingId, setActiveToolbarDrawingId] = useState<string | null>(null);
  const touchHoldTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isTouchHoldTriggeredRef = useRef<boolean>(false);

  // Automatically dismiss options toolbar when selection is cleared
  useEffect(() => {
    if (!selectedId) {
      setActiveToolbarDrawingId(null);
    }
  }, [selectedId]);

  // Clean up touch hold timer on unmount
  useEffect(() => {
    return () => {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
      }
    };
  }, []);

  const selectedDrawing = drawings.find(d => d.id === selectedId) || null;
  const isDrawingToolActive = activeTool !== 'crosshair' && activeTool !== 'arrow';
  const isSingleClickTool = [
    'horizontal_line',
    'vertical_line',
    'horizontal_ray',
    'price_label',
    'long_position',
    'short_position',
  ].includes(activeTool);
  const isThreePointTool = [
    'parallel_channel',
    'flat_top_bottom',
    'disjoint_channel',
    'triangle',
  ].includes(activeTool);

  // ResizeObserver to track SVG viewport dimensions for exact scale badges
  useEffect(() => {
    if (!svgRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(svgRef.current);
    return () => observer.disconnect();
  }, []);

  // TradingView-style Ctrl key listener: dynamically toggles Magnet snapping while held
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
        isCtrlPressedRef.current = true;
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
        isCtrlPressedRef.current = false;
      }
    };
    const handleBlur = () => {
      setIsCtrlPressed(false);
      isCtrlPressedRef.current = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Refs for window drag listener to eliminate stale closures
  const dragStateRef = useRef<typeof dragState>(dragState);
  const draggingSetupLineRef = useRef<typeof draggingSetupLine>(draggingSetupLine);
  const draggingTradeLineRef = useRef<typeof draggingTradeLine>(draggingTradeLine);
  const drawingsRef = useRef<DrawingObject[]>(drawings);
  const activeSetupRef = useRef<DraggableTradeSetup | null | undefined>(activeSetup);
  const transformerRef = useRef<CoordinateTransformer>(transformer);
  const latestDraggedDrawingRef = useRef<DrawingObject | null>(null);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    draggingSetupLineRef.current = draggingSetupLine;
  }, [draggingSetupLine]);

  useEffect(() => {
    draggingTradeLineRef.current = draggingTradeLine;
  }, [draggingTradeLine]);

  useEffect(() => {
    drawingsRef.current = drawings;
  }, [drawings]);

  useEffect(() => {
    activeSetupRef.current = activeSetup;
  }, [activeSetup]);

  useEffect(() => {
    transformerRef.current = transformer;
  }, [transformer]);

  // Global escape key listener to cancel in-progress drawing or replay cut selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSelectingReplayCut) {
          onCancelSelectReplayCut?.();
        } else if (inProgressDrawing) {
          setInProgressDrawing(null);
          onResetTool();
        } else if (activeToolbarDrawingId) {
          setActiveToolbarDrawingId(null);
        } else if (selectedId) {
          onSelect(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inProgressDrawing, selectedId, isSelectingReplayCut, onResetTool, onSelect, onCancelSelectReplayCut]);

  // TradingView-Grade Magnet Snapping Engine: snaps to High/Low wicks and Open/Close bodies
  const calculateMagnetSnap = useCallback((
    screenX: number,
    screenY: number,
    mode: MagnetMode,
    isCtrl: boolean,
    cList: Candle[],
    trans: CoordinateTransformer
  ): MagnetSnapInfo => {
    let rawTime = trans.xToTime(screenX);
    if (rawTime === null && cList.length >= 1) {
      if (trans.xToLogical && trans.logicalToTime) {
        const log = trans.xToLogical(screenX);
        if (log !== null) {
          rawTime = trans.logicalToTime(log);
        }
      }
      if (rawTime === null) {
        const tfSec = getTimeframeSeconds(timeframe);
        const lastCandle = cList[cList.length - 1];
        const lastX = trans.timeToX(lastCandle.time);
        if (lastX !== null) {
          const prevX = cList.length >= 2 ? trans.timeToX(cList[cList.length - 2].time) : null;
          const barPx = (prevX !== null && lastX > prevX) ? (lastX - prevX) : 12;
          const barsDelta = (screenX - lastX) / Math.max(2, barPx);
          rawTime = Math.round(lastCandle.time + barsDelta * tfSec);
        }
      }
    }
    const rawPrice = trans.yToPrice(screenY);
    const fallbackTime = rawTime ?? (cList.length > 0 ? cList[cList.length - 1].time : 0);
    const fallbackPrice = rawPrice ?? (cList.length > 0 ? cList[cList.length - 1].close : 1.11380);

    // Holding Ctrl dynamically inverts the magnet mode
    const effectiveMode: MagnetMode = isCtrl
      ? (mode === 'off' ? 'weak' : 'off')
      : mode;

    if (effectiveMode === 'off' || cList.length === 0 || rawTime === null || rawPrice === null) {
      return {
        isSnapped: false,
        screenX,
        screenY,
        time: fallbackTime,
        price: fallbackPrice,
      };
    }

    // Binary search to find candle closest to rawTime
    let low = 0;
    let high = cList.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (cList[mid].time < rawTime) low = mid + 1;
      else high = mid - 1;
    }

    const candidateIndices = [
      Math.max(0, high),
      Math.min(cList.length - 1, low),
      Math.max(0, Math.min(cList.length - 1, high + 1)),
      Math.max(0, Math.min(cList.length - 1, low - 1)),
    ];

    let bestCandle: Candle | null = null;
    let minCandleDist = Infinity;

    for (const idx of candidateIndices) {
      const c = cList[idx];
      const cx = trans.timeToX(c.time);
      if (cx !== null) {
        const d = Math.abs(cx - screenX);
        if (d < minCandleDist) {
          minCandleDist = d;
          bestCandle = c;
        }
      }
    }

    if (!bestCandle) {
      return {
        isSnapped: false,
        screenX,
        screenY,
        time: fallbackTime,
        price: fallbackPrice,
      };
    }

    const candleX = trans.timeToX(bestCandle.time) ?? screenX;
    const dx = Math.abs(candleX - screenX);

    const levels: { type: 'High' | 'Low' | 'Open' | 'Close'; price: number }[] = [
      { type: 'High', price: bestCandle.high },
      { type: 'Low', price: bestCandle.low },
      { type: 'Open', price: bestCandle.open },
      { type: 'Close', price: bestCandle.close },
    ];

    let bestLevel = levels[0];
    let bestLevelY = trans.priceToY(bestLevel.price) ?? screenY;
    let bestDist = Infinity;

    for (const lvl of levels) {
      const ly = trans.priceToY(lvl.price);
      if (ly !== null) {
        const dy = Math.abs(ly - screenY);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestLevel = lvl;
          bestLevelY = ly;
        }
      }
    }

    // Evaluate distance thresholds: Weak = within 35px Euclidean; Strong = within 55px bar column
    const isWeakSnapped = effectiveMode === 'weak' && bestDist <= 35;
    const isStrongSnapped = effectiveMode === 'strong' && dx <= 55;

    if (isWeakSnapped || isStrongSnapped) {
      return {
        isSnapped: true,
        snapType: bestLevel.type,
        candle: bestCandle,
        screenX: candleX,
        screenY: bestLevelY,
        time: bestCandle.time,
        price: bestLevel.price,
      };
    }

    return {
      isSnapped: false,
      candle: bestCandle,
      screenX,
      screenY,
      time: fallbackTime,
      price: fallbackPrice,
    };
  }, []);

  const getMouseCoord = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent): {
    x: number;
    y: number;
    time: number;
    price: number;
    snap: MagnetSnapInfo;
  } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('changedTouches' in e && (e as any).changedTouches.length > 0) {
      clientX = (e as any).changedTouches[0].clientX;
      clientY = (e as any).changedTouches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    } else {
      return null;
    }
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;

    const snap = calculateMagnetSnap(
      rawX,
      rawY,
      magnetMode,
      isCtrlPressed,
      candles,
      transformerRef.current
    );

    return {
      x: snap.isSnapped ? snap.screenX : rawX,
      y: snap.isSnapped ? snap.screenY : rawY,
      time: snap.time,
      price: snap.price,
      snap,
    };
  };

  // Synchronize crosshair position and hovered candle from outside mouse movements (when SVG is transparent)
  useEffect(() => {
    if (externalMousePos) {
      const snap = calculateMagnetSnap(
        externalMousePos.x,
        externalMousePos.y,
        magnetMode,
        isCtrlPressed,
        candles,
        transformer
      );
      setActiveCrosshair(snap);
      if (onHoverCandle) {
        onHoverCandle(snap.candle || null);
      }
    } else if (!inProgressDrawing && dragState === null && draggingSetupLine === null) {
      setActiveCrosshair(null);
      if (onHoverCandle) {
        onHoverCandle(null);
      }
    }
  }, [externalMousePos, magnetMode, isCtrlPressed, candles, transformer, calculateMagnetSnap, onHoverCandle, inProgressDrawing, dragState, draggingSetupLine]);

  // High-performance global window drag tracking: handles move at ANY speed without dropping
  useEffect(() => {
    if (!dragState && !draggingSetupLine && !draggingTradeLine) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const mouse = getMouseCoord(e);
      if (!mouse) return;

      // 1. Dragging Trade Setup Line
      if (draggingSetupLineRef.current && activeSetupRef.current && onUpdateSetup) {
        const rounded = Number(mouse.price.toFixed(5));
        const mode = draggingSetupLineRef.current;
        if (mode === 'entry') {
          const init = dragSetupInitialRef.current;
          if (init) {
            const deltaTime = Math.round(mouse.time - init.mouseTime);
            onUpdateSetup({
              entryPrice: rounded,
              startTime: Math.round(init.startTime + deltaTime),
              endTime: Math.round(init.endTime + deltaTime),
            });
          } else {
            onUpdateSetup({ entryPrice: rounded });
          }
        } else if (mode === 'sl') {
          onUpdateSetup({ slPrice: rounded });
        } else if (mode === 'tp') {
          onUpdateSetup({ tpPrice: rounded });
        } else if (mode === 'start') {
          onUpdateSetup({ startTime: mouse.time });
        } else if (mode === 'end') {
          onUpdateSetup({ endTime: mouse.time });
        } else if (mode === 'body') {
          const init = dragSetupInitialRef.current;
          if (init) {
            const deltaPrice = Number((mouse.price - init.mousePrice).toFixed(5));
            const deltaTime = Math.round(mouse.time - init.mouseTime);
            onUpdateSetup({
              entryPrice: Number((init.entry + deltaPrice).toFixed(5)),
              slPrice: Number((init.sl + deltaPrice).toFixed(5)),
              tpPrice: Number((init.tp + deltaPrice).toFixed(5)),
              startTime: Math.round(init.startTime + deltaTime),
              endTime: Math.round(init.endTime + deltaTime),
            });
          }
        }
        return;
      }

      // 2. Dragging Confirmed Open Trade Line (SL / TP / Entry)
      if (draggingTradeLineRef.current && onModifyTrade) {
        const rounded = Number(mouse.price.toFixed(5));
        const lineType = draggingTradeLineRef.current.lineType;
        if (lineType === 'entry') {
          onModifyTrade(draggingTradeLineRef.current.tradeId, {
            entry_price: rounded,
          });
        } else {
          onModifyTrade(draggingTradeLineRef.current.tradeId, {
            [lineType]: rounded,
          });
        }
        return;
      }

      // 3. Dragging Drawing Anchor Handle or Entire Object
      const currentDrag = dragStateRef.current;
      if (currentDrag) {
        const target = drawingsRef.current.find(d => d.id === currentDrag.drawingId) || currentDrag.drawing;
        if (!target || target.locked) return;

        if (currentDrag.pointIndex !== undefined) {
          // Dragging specific anchor point (rotate/resize)
          const updatedPts = [...target.points];
          let updatedType = target.type;
          if (target.type === 'long_position' || target.type === 'short_position') {
            const pIdx = currentDrag.pointIndex;
            const initPts = currentDrag.initialPoints;

            // Ensure updatedPts has 4 points
            while (updatedPts.length < 4) {
              const init0 = target.points[0];
              const isLong = target.type === 'long_position';
              if (updatedPts.length === 1) {
                updatedPts.push({ time: init0.time + 3600, price: Number((isLong ? init0.price - 0.00150 : init0.price + 0.00150).toFixed(5)) });
              } else if (updatedPts.length === 2) {
                updatedPts.push({ time: init0.time + 3600, price: Number((isLong ? init0.price + 0.00300 : init0.price - 0.00300).toFixed(5)) });
              } else if (updatedPts.length === 3) {
                updatedPts.push({ time: init0.time + 7200, price: init0.price });
              }
            }

            if (pIdx === 0) {
              // Handle 0: Left Entry Handle. Moves entry price and shifts bracket, moves start time.
              const deltaPrice = Number((mouse.price - initPts[0].price).toFixed(5));
              updatedPts[0] = { time: mouse.time, price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[3] && initPts[3]) {
                updatedPts[3] = { ...updatedPts[3], price: mouse.price };
              }
            } else if (pIdx === 1) {
              // Handle 1: Stop Loss Handle (midX, slY). Moves Stop Loss price ONLY.
              // Auto-flips between Long Position and Short Position if SL crosses Entry!
              if (updatedPts[1] && updatedPts[0]) {
                const entryPrice = updatedPts[0].price;
                const newSl = mouse.price;
                if (target.type === 'long_position' && newSl > entryPrice + 0.00002) {
                  target.type = 'short_position';
                  updatedType = 'short_position';
                  const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - entryPrice) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice - tpDist).toFixed(5)) };
                  }
                } else if (target.type === 'short_position' && newSl < entryPrice - 0.00002) {
                  target.type = 'long_position';
                  updatedType = 'long_position';
                  const tpDist = updatedPts[2] ? Math.abs(entryPrice - updatedPts[2].price) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice + tpDist).toFixed(5)) };
                  }
                } else {
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                }
              }
            } else if (pIdx === 2) {
              // Handle 2: Take Profit Handle (midX, tpY). Moves Take Profit price ONLY. SL frozen!
              if (updatedPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: mouse.price };
              }
            } else if (pIdx === 3) {
              // Handle 3: Right Boundary Handle (maxX, entryY).
              // Horizontally: stretches or shrinks width to mouse.time in any direction.
              // Vertically: stays locked on the entry price line!
              updatedPts[3] = { time: mouse.time, price: target.points[0].price };
            } else if (pIdx === 4) {
              // Handle 4: Top-Right Corner.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (!isLong && mouse.price < updatedPts[0].price - 0.00002) {
                target.type = 'long_position';
                updatedType = 'long_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[0].price - updatedPts[2].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price + tpDist).toFixed(5)) };
                }
              } else {
                const topIdx = isLong ? 2 : 1;
                if (updatedPts[topIdx]) {
                  updatedPts[topIdx] = { ...updatedPts[topIdx], price: mouse.price };
                }
              }
            } else if (pIdx === 5) {
              // Handle 5: Bottom-Right Corner.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (isLong && mouse.price > updatedPts[0].price + 0.00002) {
                target.type = 'short_position';
                updatedType = 'short_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - updatedPts[0].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price - tpDist).toFixed(5)) };
                }
              } else {
                const bottomIdx = isLong ? 1 : 2;
                if (updatedPts[bottomIdx]) {
                  updatedPts[bottomIdx] = { ...updatedPts[bottomIdx], price: mouse.price };
                }
              }
            } else if (pIdx === 6) {
              // Handle 6: Left Boundary Handle (minX, (slY + tpY)/2).
              // Stretches or shrinks start time to mouse.time without altering price!
              updatedPts[0] = { time: mouse.time, price: updatedPts[0].price };
            } else if (pIdx === 7) {
              // Handle 7: Center Entry Handle (midX, entryY).
              // Translates entry price vertically and shifts bracket together.
              const deltaPrice = Number((mouse.price - initPts[0].price).toFixed(5));
              updatedPts[0] = { ...updatedPts[0], price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[3] && initPts[3]) {
                updatedPts[3] = { ...updatedPts[3], price: mouse.price };
              }
            }

            // Keep midTime centered between start and end
            const tStart = updatedPts[0].time;
            const tEnd = updatedPts[3].time;
            const newMidTime = Math.min(tStart, tEnd) + Math.round(Math.abs(tEnd - tStart) / 2);
            if (updatedPts[1]) updatedPts[1] = { ...updatedPts[1], time: newMidTime };
            if (updatedPts[2]) updatedPts[2] = { ...updatedPts[2], time: newMidTime };
          } else {
            updatedPts[currentDrag.pointIndex] = { time: mouse.time, price: mouse.price };
          }
          const updatedDrawing = { ...target, type: updatedType, points: updatedPts, updated_at: Date.now() };
          latestDraggedDrawingRef.current = updatedDrawing;
          const dIdx = drawingsRef.current.findIndex(d => d.id === target.id);
          if (dIdx !== -1) drawingsRef.current[dIdx] = updatedDrawing;
          onUpdate(updatedDrawing, false);
        } else {
          // Dragging entire body: preserve exact bar distances and price differences
          const currentTransformer = transformerRef.current;
          const rect = svgRef.current?.getBoundingClientRect();
          const rawX = e.clientX - (rect?.left || 0);
          const rawY = e.clientY - (rect?.top || 0);

          const curLogical = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
          const curPrice = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;

          if (
            curLogical !== null &&
            curPrice !== null &&
            currentDrag.startLogical !== undefined &&
            currentDrag.startPrice !== undefined &&
            currentDrag.initialLogicals
          ) {
            const deltaLogical = curLogical - currentDrag.startLogical;
            const deltaPrice = curPrice - currentDrag.startPrice;

            const updatedPts = currentDrag.initialPoints.map((pt, idx) => {
              const baseLog = currentDrag.initialLogicals![idx];
              const targetLog = baseLog + deltaLogical;
              const targetTime = currentTransformer.logicalToTime ? (currentTransformer.logicalToTime(targetLog) ?? pt.time) : pt.time;
              const targetPrice = Number((pt.price + deltaPrice).toFixed(5));
              return { time: targetTime, price: targetPrice };
            });

            const updatedDrawing = { ...target, points: updatedPts, updated_at: Date.now() };
            latestDraggedDrawingRef.current = updatedDrawing;
            const dIdx = drawingsRef.current.findIndex(d => d.id === target.id);
            if (dIdx !== -1) drawingsRef.current[dIdx] = updatedDrawing;
            onUpdate(updatedDrawing, false);
          } else {
            const startT = currentTransformer.xToTime(currentDrag.startMouse.x);
            const startP = currentTransformer.yToPrice(currentDrag.startMouse.y);
            if (startT !== null && startP !== null) {
              const dt = mouse.time - startT;
              const dp = mouse.price - startP;
              const updatedPts = currentDrag.initialPoints.map(pt => ({
                time: pt.time + dt,
                price: Number((pt.price + dp).toFixed(5)),
              }));
              const updatedDrawing = { ...target, points: updatedPts, updated_at: Date.now() };
              latestDraggedDrawingRef.current = updatedDrawing;
              const dIdx = drawingsRef.current.findIndex(d => d.id === target.id);
              if (dIdx !== -1) drawingsRef.current[dIdx] = updatedDrawing;
              onUpdate(updatedDrawing, false);
            }
          }
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (dragStateRef.current) {
        const isClone = dragStateRef.current.isClone;
        const target = latestDraggedDrawingRef.current || drawingsRef.current.find(d => d.id === dragStateRef.current?.drawingId) || dragStateRef.current?.drawing;
        if (target) {
          onUpdate(target, true, !isClone);
        }
        latestDraggedDrawingRef.current = null;
        setDragState(null);
      }
      if (draggingSetupLineRef.current) {
        setDraggingSetupLine(null);
        dragSetupInitialRef.current = null;
      }
      if (draggingTradeLineRef.current) {
        setDraggingTradeLine(null);
      }
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        if (dragStateRef.current || draggingSetupLineRef.current || draggingTradeLineRef.current) {
          if (e.cancelable) {
            e.preventDefault();
          }
        }
        handleWindowMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as any);
      }
    };
    const handleWindowTouchEnd = () => {
      handleWindowMouseUp();
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      handleWindowMouseMove(e as any);
    };
    const handleWindowPointerUp = () => {
      handleWindowMouseUp();
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerUp);
    window.addEventListener('pointercancel', handleWindowPointerUp);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: false });
    window.addEventListener('touchend', handleWindowTouchEnd);
    window.addEventListener('touchcancel', handleWindowTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerUp);
      window.removeEventListener('pointercancel', handleWindowPointerUp);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleWindowTouchEnd);
      window.removeEventListener('touchcancel', handleWindowTouchEnd);
    };
  }, [dragState !== null || draggingSetupLine !== null || draggingTradeLine !== null, onUpdate, onUpdateSetup, onModifyTrade]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const mouse = getMouseCoord(e);
    if (!mouse) return;

    // 0. Replay Cut selection mode: click candle to cut future bars and start replay
    if (isSelectingReplayCut) {
      const targetCandle = mouse.snap.candle || candles.find(c => {
        const cx = transformer.timeToX(c.time);
        return cx !== null && Math.abs(cx - mouse.x) <= 30;
      }) || (candles.length > 0 ? candles[candles.length - 1] : null);

      if (targetCandle) {
        onSelectReplayCutCandle?.(targetCandle);
      }
      return;
    }

    // 1. Check if user clicked on interactive trade setup lines
    if (activeSetup && activeSetup.active) {
      const entryY = transformer.priceToY(activeSetup.entryPrice);
      const slY = transformer.priceToY(activeSetup.slPrice);
      const tpY = transformer.priceToY(activeSetup.tpPrice);
      const currentCandleTime = candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
      const tfSeconds = candles.length > 1 ? Math.max(60, candles[candles.length - 1].time - candles[candles.length - 2].time) : 900;
      const sStart = activeSetup.startTime || currentCandleTime;
      const sEnd = activeSetup.endTime || (sStart + tfSeconds * 15);

      if (entryY !== null && Math.abs(mouse.y - entryY) <= 8) {
        setDraggingSetupLine('entry');
        draggingSetupLineRef.current = 'entry';
        dragSetupInitialRef.current = {
          mouseTime: mouse.time,
          mousePrice: mouse.price,
          entry: activeSetup.entryPrice,
          sl: activeSetup.slPrice,
          tp: activeSetup.tpPrice,
          startTime: sStart,
          endTime: sEnd,
        };
        return;
      }
      if (slY !== null && Math.abs(mouse.y - slY) <= 8) {
        setDraggingSetupLine('sl');
        draggingSetupLineRef.current = 'sl';
        return;
      }
      if (tpY !== null && Math.abs(mouse.y - tpY) <= 8) {
        setDraggingSetupLine('tp');
        draggingSetupLineRef.current = 'tp';
        return;
      }
    }

    // 2. Eraser tool
    if (activeTool === 'eraser') {
      const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer);
      if (hit) {
        onDelete(hit.drawing.id);
      }
      return;
    }

    // 3. Selection / Object Move when cursor active
    if (!isDrawingToolActive) {
      const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer, isMobile ? 24 : 14, selectedId);
      if (hit) {
        if (!hit.drawing.locked) {
          // TradingView Ctrl + Mouse Drag to Clone:
          // Holding Ctrl/Cmd and dragging an existing drawing body or handle creates an identical clone.
          const isClone = (e.ctrlKey || e.metaKey || isCtrlPressed || isCtrlPressedRef.current);
          let targetDrawing = hit.drawing;
          if (isClone) {
            const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const clonedDrawing: DrawingObject = {
              ...JSON.parse(JSON.stringify(hit.drawing)),
              id: cloneId,
              created_at: Date.now(),
              updated_at: Date.now(),
            };
            onAdd(clonedDrawing);
            targetDrawing = clonedDrawing;
          }

          onSelect(targetDrawing.id);
          const rect = svgRef.current?.getBoundingClientRect();
          const rawX = e.clientX - (rect?.left || 0);
          const rawY = e.clientY - (rect?.top || 0);

          const currentTransformer = transformerRef.current;
          const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
          const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
          const initLogs = targetDrawing.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

          setDragState({
            drawingId: targetDrawing.id,
            drawing: targetDrawing,
            isClone: isClone ? true : false,
            pointIndex: isClone ? undefined : hit.pointIndex,
            startMouse: { x: rawX, y: rawY },
            initialPoints: [...targetDrawing.points],
            initialLogicals: initLogs,
            startLogical: startLog ?? 0,
            startPrice: startP ?? 0,
          });
        } else {
          onSelect(hit.drawing.id);
        }
      } else {
        onSelect(null);
        setActiveToolbarDrawingId(null);
      }
      return;
    }

    // 4. Start or advance drawing a new object
    if (isSingleClickTool) {
      let pts = [{ time: mouse.time, price: mouse.price }];
      if (activeTool === 'long_position' || activeTool === 'short_position') {
        const isLong = activeTool === 'long_position';
        const entryPrice = mouse.price;
        const entryTime = mouse.time;
        // Default standard bracket: 15 pips stop loss, 15 pips take profit (1:1 Risk/Reward, matching TradingView default)
        const slPrice = Number((isLong ? entryPrice - 0.00150 : entryPrice + 0.00150).toFixed(5));
        const tpPrice = Number((isLong ? entryPrice + 0.00150 : entryPrice - 0.00150).toFixed(5));

        // Default width: 25 candles into the future matching TradingView standard
        const candleStep = getTimeframeSeconds(timeframe);
        const endTime = entryTime + candleStep * 25;
        const midTime = entryTime + Math.round((endTime - entryTime) / 2);

        pts = [
          { time: entryTime, price: entryPrice }, // 0: Entry (Left handle)
          { time: midTime, price: slPrice },      // 1: Stop Loss (SL handle)
          { time: midTime, price: tpPrice },      // 2: Take Profit (TP handle)
          { time: endTime, price: entryPrice },   // 3: Width / End (Right handle)
        ];
      }

      const singleDrawing: DrawingObject = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: activeTool,
        timeframe,
        points: pts,
        properties: {
          color: '#2962ff',
          fillColor: '#2962ff',
          fillOpacity: 0.15,
          strokeWidth: 2,
          lineStyle: 'solid',
          fontSize: 12,
          text: activeTool === 'price_label' ? mouse.price.toFixed(5) : '',
        },
        locked: false,
        hidden: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      justCreatedTimeRef.current = Date.now();
      onAdd(singleDrawing);
      onSelect(singleDrawing.id);
      setActiveToolbarDrawingId(null);
      onResetTool();
      return;
    }

    // Click-to-click advance
    if (inProgressDrawing) {
      if (isThreePointTool && inProgressDrawing.points.length === 2) {
        // Step 2 -> 3: Base line locked, add 3rd point for height
        const pts = [
          inProgressDrawing.points[0],
          inProgressDrawing.points[1],
          { time: mouse.time, price: mouse.price },
        ];
        setInProgressDrawing({ ...inProgressDrawing, points: pts });
        mouseDownPosRef.current = { x: mouse.x, y: mouse.y };
        return;
      }

      // Complete 2-point or 3-point drawing
      const finalPts = [...inProgressDrawing.points];
      finalPts[finalPts.length - 1] = { time: mouse.time, price: mouse.price };
      const completed: DrawingObject = {
        ...inProgressDrawing,
        points: finalPts,
        updated_at: Date.now(),
      };
      onAdd(completed);
      onSelect(completed.id);
      setActiveToolbarDrawingId(null);
      setInProgressDrawing(null);
      mouseDownPosRef.current = null;
      onResetTool();
      return;
    }

    // Fresh drawing initiation
    mouseDownPosRef.current = { x: mouse.x, y: mouse.y };
    const newDrawing: DrawingObject = {
      id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: activeTool,
      timeframe,
      points: [
        { time: mouse.time, price: mouse.price },
        { time: mouse.time, price: mouse.price },
      ],
      properties: {
        color: '#2962ff',
        fillColor: '#2962ff',
        fillOpacity: 0.15,
        strokeWidth: 2,
        lineStyle: 'solid',
        fontSize: 12,
        text: activeTool === 'text' ? 'EUR/USD Setup' : '',
        ...(activeTool === 'fib_retracement' ? {
          fibLevels: getDefaultFibLevels(),
          extendLinesLeft: false,
          extendLinesRight: false,
          fillBackground: true,
          showPrices: true,
          showLevels: true,
        } : {}),
      },
      locked: false,
      hidden: false,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    setInProgressDrawing(newDrawing);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mouse = getMouseCoord(e);
    if (!mouse) return;

    setActiveCrosshair(mouse.snap);
    if (onHoverCandle) {
      onHoverCandle(mouse.snap.candle || null);
    }

    // Handle dragging trade setup lines
    if (draggingSetupLine && activeSetup && onUpdateSetup) {
      const newPrice = transformer.yToPrice(mouse.y);
      if (newPrice !== null) {
        const rounded = Number(newPrice.toFixed(5));
        if (draggingSetupLine === 'entry') {
          const init = dragSetupInitialRef.current;
          if (init) {
            const deltaTime = Math.round(mouse.time - init.mouseTime);
            onUpdateSetup({
              entryPrice: rounded,
              startTime: Math.round(init.startTime + deltaTime),
              endTime: Math.round(init.endTime + deltaTime),
            });
          } else {
            onUpdateSetup({ entryPrice: rounded });
          }
        } else if (draggingSetupLine === 'sl') {
          onUpdateSetup({ slPrice: rounded });
        } else if (draggingSetupLine === 'tp') {
          onUpdateSetup({ tpPrice: rounded });
        } else if (draggingSetupLine === 'start') {
          onUpdateSetup({ startTime: mouse.time });
        } else if (draggingSetupLine === 'end') {
          onUpdateSetup({ endTime: mouse.time });
        } else if (draggingSetupLine === 'body') {
          const init = dragSetupInitialRef.current;
          if (init) {
            const deltaPrice = Number((mouse.price - init.mousePrice).toFixed(5));
            const deltaTime = Math.round(mouse.time - init.mouseTime);
            console.log('[DEBUG DRAG BODY]', {
              mouseTime: mouse.time,
              initMouseTime: init.mouseTime,
              deltaTime,
              initStartTime: init.startTime,
              newStartTime: init.startTime + deltaTime
            });
            onUpdateSetup({
              entryPrice: Number((init.entry + deltaPrice).toFixed(5)),
              slPrice: Number((init.sl + deltaPrice).toFixed(5)),
              tpPrice: Number((init.tp + deltaPrice).toFixed(5)),
              startTime: Math.round(init.startTime + deltaTime),
              endTime: Math.round(init.endTime + deltaTime),
            });
          }
        }
      }
      return;
    }

    // Handle dragging confirmed open trade lines (SL or TP)
    if (draggingTradeLine && onModifyTrade) {
      const newPrice = transformer.yToPrice(mouse.y);
      if (newPrice !== null) {
        const rounded = Number(newPrice.toFixed(5));
        onModifyTrade(draggingTradeLine.tradeId, {
          [draggingTradeLine.lineType]: rounded,
        });
      }
      return;
    }

    if (inProgressDrawing) {
      const pts = [...inProgressDrawing.points];
      pts[pts.length - 1] = { time: mouse.time, price: mouse.price };
      setInProgressDrawing({ ...inProgressDrawing, points: pts });
      return;
    }

    if (dragState) {
      // Handled globally by handleWindowMouseMove for maximum smoothness and escape resistance
      return;
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (draggingSetupLine) {
      setDraggingSetupLine(null);
      dragSetupInitialRef.current = null;
    }
    if (draggingTradeLine) {
      setDraggingTradeLine(null);
    }
    if (dragState) {
      const target = drawings.find(d => d.id === dragState.drawingId);
      if (target) {
        onUpdate(target, true);
      }
      setDragState(null);
    }

    if (inProgressDrawing && mouseDownPosRef.current) {
      const mouse = getMouseCoord(e);
      if (mouse) {
        const dx = mouse.x - mouseDownPosRef.current.x;
        const dy = mouse.y - mouseDownPosRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // If user performed a drag gesture (> 8px)
        if (dist > 8) {
          if (isThreePointTool && inProgressDrawing.points.length === 2) {
            // Dragged baseline, now initialize point 3 for parallel channel height
            const pts = [
              inProgressDrawing.points[0],
              inProgressDrawing.points[1],
              { time: mouse.time, price: mouse.price },
            ];
            setInProgressDrawing({ ...inProgressDrawing, points: pts });
            mouseDownPosRef.current = null;
          } else {
            // Commit drawing
            const finalPts = [...inProgressDrawing.points];
            finalPts[finalPts.length - 1] = { time: mouse.time, price: mouse.price };
            const completed = {
              ...inProgressDrawing,
              points: finalPts,
              updated_at: Date.now(),
            };
            onAdd(completed);
            onSelect(completed.id);
            setActiveToolbarDrawingId(null);
            setInProgressDrawing(null);
            mouseDownPosRef.current = null;
            onResetTool();
          }
        }
        // If dist <= 8, it was a single click: leave inProgressDrawing active for click-to-click TV drawing!
      }
    }
  };

  // Render Forex Sessions & Killzones Overlay as Bounded Price-Range Rectangles
  // Render Forex Sessions & Killzones Overlay as Bounded Price-Range Rectangles
  const renderSessions = () => {
    if (isLoadingCandles) return null;

    // Hide sessions on timeframes of 2 hours and above (2h, 3h, 4h, 1D, 1W, 1M, or >= 120m)
    const isHighTf = 
      ['2h', '3h', '4h', '6h', '8h', '12h', '1D', '1W', '1M', '1d', '1w', '1mo'].includes(timeframe) ||
      timeframe.toUpperCase().includes('D') ||
      timeframe.toUpperCase().includes('W') ||
      (timeframe.endsWith('M') && !timeframe.toLowerCase().endsWith('m') && timeframe !== '1m' && timeframe !== '3m' && timeframe !== '5m' && timeframe !== '15m' && timeframe !== '30m' && timeframe !== '45m') ||
      (timeframe.endsWith('h') && parseInt(timeframe, 10) >= 2) ||
      (timeframe.endsWith('m') && parseInt(timeframe, 10) >= 120);

    if (isHighTf) return null;

    // Verify actual candles currently loaded aren't multi-hour bars (guards transition during timeframe switch)
    if (candles.length >= 2) {
      const barInterval = getCandleBarInterval(candles);
      if (barInterval >= 7200) return null;
    }

    // Check if sessions indicator is active
    if (!sessionsActive) return null;
    const sessionsInd = indicators?.find(i => i.type === 'SESSIONS');
    if (sessionsInd && !sessionsInd.visible) return null;

    // Compute active session blocks across visible candles
    const blocks = computeSessionBlocks(candles, currentReplayTimestamp);
    if (blocks.length === 0) return null;

    return (
      <g className="sessions-layer pointer-events-none select-none" data-testid="sessions-layer">
        {blocks.map((block) => {
          const x1 = transformer.timeToX(block.firstCandleTime ?? block.startTime);
          const x2 = transformer.timeToX(block.lastCandleCloseTime ?? block.endTime);

          if (x1 === null && x2 === null) return null;

          // Avoid rendering boxes that are completely offscreen
          if (x1 !== null && x2 !== null && Math.max(x1, x2) < -50) return null;
          if (x1 !== null && x2 !== null && Math.min(x1, x2) > dimensions.width + 50) return null;

          const safeX1 = x1 !== null ? x1 : (x2 !== null ? x2 - 40 : null);
          const safeX2 = x2 !== null ? x2 : (x1 !== null ? x1 + 40 : null);
          if (safeX1 === null || safeX2 === null) return null;

          const boxLeft = Math.min(safeX1, safeX2);
          const boxRight = Math.max(safeX1, safeX2);
          const width = Math.max(4, boxRight - boxLeft);

          // Viewport culling for horizontal visibility
          if (boxRight < -100 || boxLeft > dimensions.width + 100) return null;

          const highY = transformer.priceToY(block.high);
          const lowY = transformer.priceToY(block.low);

          if (highY === null || lowY === null) return null;

          // Upper boundary is highest High reached, lower boundary is lowest Low reached
          const boxTop = Math.min(highY, lowY);
          const boxBottom = Math.max(highY, lowY);
          const boxHeight = Math.max(4, boxBottom - boxTop);

          // Viewport culling for vertical visibility
          if (boxBottom < -100 || boxTop > dimensions.height + 100) return null;

          // Main window session parameters
          const isShield = block.session.id === 'shield_area';
          const isActive = block.status === 'ACTIVE';

          return (
            <g key={block.key} data-testid={`session-block-${block.session.id}`}>
              {/* Bounded Session Range Rectangle (Actual High-Low price range and session duration) */}
              <rect
                x={boxLeft}
                y={boxTop}
                width={width}
                height={boxHeight}
                fill={block.session.color}
                fillOpacity={isActive ? Math.min(0.12, block.session.fillOpacity * 1.3) : block.session.fillOpacity}
                stroke={isActive ? '#10b981' : block.session.borderColor}
                strokeWidth={isActive ? 1.5 : 1}
                rx={2}
                data-testid={`session-rect-${block.session.id}`}
              />

              {/* Start Vertical Boundary Line */}
              {x1 !== null && (
                <line
                  x1={boxLeft}
                  y1={boxTop}
                  x2={boxLeft}
                  y2={boxBottom}
                  stroke={block.session.borderColor}
                  strokeWidth={1.2}
                  strokeDasharray="4,4"
                  opacity={0.75}
                />
              )}

              {/* End Vertical Boundary Line */}
              {x2 !== null && (
                <line
                  x1={boxRight}
                  y1={boxTop}
                  x2={boxRight}
                  y2={boxBottom}
                  stroke={block.session.borderColor}
                  strokeWidth={1.2}
                  strokeDasharray="4,4"
                  opacity={0.75}
                />
              )}

              {/* Projected remaining duration for active session */}
              {isActive && (() => {
                const xEnd = transformer.timeToX(block.endTime);
                if (xEnd !== null && xEnd > boxRight) {
                  return (
                    <rect
                      x={boxRight}
                      y={boxTop}
                      width={Math.max(4, xEnd - boxRight)}
                      height={boxHeight}
                      fill={block.session.color}
                      fillOpacity={block.session.fillOpacity * 0.35}
                      stroke={block.session.borderColor}
                      strokeWidth={1}
                      strokeDasharray="3,3"
                      data-testid={`session-projected-${block.session.id}`}
                    />
                  );
                }
                return null;
              })()}

              {/* Session Highest High Horizontal Line */}
              <line
                x1={boxLeft}
                y1={boxTop}
                x2={boxRight}
                y2={boxTop}
                stroke={block.session.borderColor}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.8}
              />

              {/* Session Lowest Low Horizontal Line */}
              <line
                x1={boxLeft}
                y1={boxBottom}
                x2={boxRight}
                y2={boxBottom}
                stroke={block.session.borderColor}
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.8}
              />

              {/* Active Session Real-Time Breakout Levels & Price Badges */}
              {isActive && (
                <g data-testid={`session-active-levels-${block.session.id}`}>
                  {/* High Breakout Line */}
                  <line
                    x1={boxRight}
                    y1={boxTop}
                    x2={Math.min(dimensions.width - 60, boxRight + 55)}
                    y2={boxTop}
                    stroke={block.session.borderColor}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                  <g transform={`translate(${Math.min(dimensions.width - 55, boxRight + 4)}, ${boxTop - 8})`}>
                    <rect
                      width={50}
                      height={16}
                      rx={3}
                      fill={block.session.badgeBg}
                      stroke={block.session.badgeBorder}
                      strokeWidth={1}
                      className="shadow-sm"
                    />
                    <text
                      x={25}
                      y={11.5}
                      fill={block.session.badgeText}
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {block.high.toFixed(5)}
                    </text>
                  </g>

                  {/* Low Breakout Line */}
                  <line
                    x1={boxRight}
                    y1={boxBottom}
                    x2={Math.min(dimensions.width - 60, boxRight + 55)}
                    y2={boxBottom}
                    stroke={block.session.borderColor}
                    strokeWidth={1.5}
                    strokeDasharray="3,3"
                  />
                  <g transform={`translate(${Math.min(dimensions.width - 55, boxRight + 4)}, ${boxBottom - 8})`}>
                    <rect
                      width={50}
                      height={16}
                      rx={3}
                      fill={block.session.badgeBg}
                      stroke={block.session.badgeBorder}
                      strokeWidth={1}
                      className="shadow-sm"
                    />
                    <text
                      x={25}
                      y={11.5}
                      fill={block.session.badgeText}
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      {block.low.toFixed(5)}
                    </text>
                  </g>
                </g>
              )}

              {/* Session Tag on Main Window (No protruding upper window, low transparency, only first letters) */}
              {boxLeft > -100 && boxLeft < dimensions.width + 100 && (
                <g
                  transform={`translate(${isShield ? boxLeft + 24 : boxLeft + 4}, ${boxTop + 4})`}
                  data-testid={`session-badge-${block.session.id}`}
                  className="pointer-events-none select-none"
                >
                  <title>{`${block.session.name} (${block.session.code}) | Range: ${block.pips}p | High: ${block.high.toFixed(5)} | Low: ${block.low.toFixed(5)}`}</title>
                  {/* Subtle, low-transparency letter badge directly on the main session box */}
                  <rect
                    width={block.session.code.length > 1 ? 24 : 16}
                    height={16}
                    rx={3}
                    fill={block.session.color}
                    fillOpacity={0.2}
                    stroke={block.session.borderColor}
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={block.session.code.length > 1 ? 12 : 8}
                    y={11.5}
                    fill={block.session.color}
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace, system-ui, sans-serif"
                    textAnchor="middle"
                    opacity={0.9}
                  >
                    {block.session.code}
                  </text>
                  {isActive && (
                    <circle
                      cx={block.session.code.length > 1 ? 20 : 13}
                      cy={3.5}
                      r={1.8}
                      fill="#10b981"
                      className="animate-pulse"
                    />
                  )}
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  };

  // Render Confirmed On-Chart Trades (TradingView Long / Short Position Boxes)
  // Only active (OPEN / PENDING) trades are rendered as on-chart position boxes.
  // When a trade is closed, the position box is dismissed from the screen.
  const renderOpenTrades = () => {
    if (!trades || trades.length === 0) return null;

    const activeTrades = trades.filter(t => t.status === 'OPEN' || t.status === 'PENDING');
    if (activeTrades.length === 0) return null;

    const effectiveMarketPrice = currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : 1.11380);

    return (
      <g className="open-trades-layer select-none pointer-events-auto" data-testid="open-trades-layer">
        {activeTrades.map((trade) => {
          const isBuy = trade.type === 'BUY';
          const isOpen = trade.status === 'OPEN';
          const isPending = trade.status === 'PENDING';
          const isClosed = false;

          const entryPrice = trade.entry_price;
          const slPrice = trade.sl !== null && trade.sl !== undefined
            ? trade.sl
            : (isBuy ? entryPrice - 0.0010 : entryPrice + 0.0010);
          const tpPrice = trade.tp !== null && trade.tp !== undefined
            ? trade.tp
            : (isBuy ? entryPrice + 0.0020 : entryPrice - 0.0020);

          const entryY = transformer.priceToY(entryPrice);
          const slY = transformer.priceToY(slPrice);
          const tpY = transformer.priceToY(tpPrice);

          if (entryY === null || slY === null || tpY === null) return null;

          // Time coordinates (Horizontal boundaries)
          const x1 = transformer.timeToX(trade.entry_time);
          // Extends dynamically with incoming live/backtest candles
          const lastCandleTime = candles.length > 0 ? candles[candles.length - 1].time : trade.entry_time;
          const currentCandleX = transformer.timeToX(lastCandleTime);
          const x2 = currentCandleX !== null ? currentCandleX + 45 : null;

          const safeX1 = x1 !== null ? x1 : (x2 !== null ? x2 - 180 : 80);
          const safeX2 = x2 !== null ? x2 : (safeX1 + 180);
          const boxLeft = Math.min(safeX1, safeX2);
          const boxRight = Math.max(safeX1, safeX2);
          const boxWidth = Math.max(80, boxRight - boxLeft);
          const cardX = Math.max(10, Math.min(boxLeft + 10, Math.max(10, dimensions.width - 540)));

          // Profit & Risk Zones (TradingView Long/Short Position Box)
          // For BUY: tpY < entryY (above entry), slY > entryY (below entry)
          // For SELL: tpY > entryY (below entry), slY < entryY (above entry)
          const profitZoneTop = Math.min(entryY, tpY);
          const profitZoneHeight = Math.max(2, Math.abs(tpY - entryY));
          const riskZoneTop = Math.min(entryY, slY);
          const riskZoneHeight = Math.max(2, Math.abs(slY - entryY));

          // Metrics calculation
          const pipDiff = isBuy
            ? (effectiveMarketPrice - entryPrice) / 0.0001
            : (entryPrice - effectiveMarketPrice) / 0.0001;

          const grossPnl = pipDiff * 10 * trade.lot_size;
          const commission = trade.commission || 0;
          const liveNetPnl = grossPnl - commission;
          const isProfit = liveNetPnl >= 0;

          const slDiffPips = Math.abs(entryPrice - slPrice) / 0.0001;
          const tpDiffPips = Math.abs(tpPrice - entryPrice) / 0.0001;
          const slLossUsd = slDiffPips * 10 * trade.lot_size;
          const tpGainUsd = tpDiffPips * 10 * trade.lot_size;
          const rrRatio = slDiffPips > 0 ? (tpDiffPips / slDiffPips) : 2.0;

          return (
            <g
              key={trade.id}
              data-testid={`on-chart-trade-${trade.id}`}
              className="opacity-100"
            >
              {/* Green Profit Zone Box */}
              <rect
                x={boxLeft}
                y={profitZoneTop}
                width={boxWidth}
                height={profitZoneHeight}
                fill="#089981"
                fillOpacity={0.20}
                stroke="#089981"
                strokeWidth={1}
                className="pointer-events-none"
                data-testid={`position-profit-zone-${trade.id}`}
              />

              {/* Red Risk Zone Box */}
              <rect
                x={boxLeft}
                y={riskZoneTop}
                width={boxWidth}
                height={riskZoneHeight}
                fill="#f23645"
                fillOpacity={0.20}
                stroke="#f23645"
                strokeWidth={1}
                className="pointer-events-none"
                data-testid={`position-risk-zone-${trade.id}`}
              />

              {/* Box Left & Right Boundary Borders */}
              <line
                x1={boxLeft}
                y1={Math.min(profitZoneTop, riskZoneTop)}
                x2={boxLeft}
                y2={Math.max(profitZoneTop + profitZoneHeight, riskZoneTop + riskZoneHeight)}
                stroke="#787b86"
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />
              <line
                x1={boxRight}
                y1={Math.min(profitZoneTop, riskZoneTop)}
                x2={boxRight}
                y2={Math.max(profitZoneTop + profitZoneHeight, riskZoneTop + riskZoneHeight)}
                stroke="#787b86"
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.6}
              />

              {/* 1. Take Profit (Target Point) Horizontal Line & Interactive Badge */}
              <g data-testid={`on-chart-tp-${trade.id}`}>
                <line
                  x1={boxLeft}
                  y1={tpY}
                  x2={boxRight}
                  y2={tpY}
                  stroke="#089981"
                  strokeWidth={2}
                  strokeDasharray="4,3"
                  className={!isClosed ? "cursor-ns-resize pointer-events-auto" : "pointer-events-none"}
                  onMouseDown={!isClosed ? (e) => {
                    e.stopPropagation();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                  } : undefined}
                />
                {!isClosed && (
                  <line
                    x1={boxLeft}
                    y1={tpY}
                    x2={boxRight}
                    y2={tpY}
                    stroke="transparent"
                    strokeWidth={16}
                    className="cursor-ns-resize pointer-events-auto"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                    }}
                  />
                )}
                {/* TP Anchor Handle at Right Edge */}
                {!isClosed && (
                  <circle
                    cx={boxRight}
                    cy={tpY}
                    r={4.5}
                    fill="#089981"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="cursor-ns-resize pointer-events-auto shadow"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                      }
                    }}
                  />
                )}
                {/* Compact TP Label inside profit zone with low transparency */}
                <g
                  transform={`translate(${boxRight - 55}, ${isBuy ? tpY + 4 : tpY - 20})`}
                  className={!isClosed ? "cursor-ns-resize pointer-events-auto" : "pointer-events-none"}
                  onMouseDown={!isClosed ? (e) => {
                    e.stopPropagation();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                  } : undefined}
                  onTouchStart={!isClosed ? (e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      if (e.cancelable) e.preventDefault();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'tp' });
                    }
                  } : undefined}
                  data-testid={`on-chart-tp-badge-${trade.id}`}
                >
                  <rect
                    width={50}
                    height={16}
                    rx={3}
                    fill="#089981"
                    fillOpacity={0.25}
                    stroke="#089981"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={25}
                    y={12}
                    fill="#34d399"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    TP
                  </text>
                </g>
              </g>

              {/* 2. Stop Loss (SL Point) Horizontal Line & Interactive Badge */}
              <g data-testid={`on-chart-sl-${trade.id}`}>
                <line
                  x1={boxLeft}
                  y1={slY}
                  x2={boxRight}
                  y2={slY}
                  stroke="#f23645"
                  strokeWidth={2}
                  strokeDasharray="4,3"
                  className={!isClosed ? "cursor-ns-resize pointer-events-auto" : "pointer-events-none"}
                  onMouseDown={!isClosed ? (e) => {
                    e.stopPropagation();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                  } : undefined}
                  onTouchStart={!isClosed ? (e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      if (e.cancelable) e.preventDefault();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                    }
                  } : undefined}
                />
                {!isClosed && (
                  <line
                    x1={boxLeft}
                    y1={slY}
                    x2={boxRight}
                    y2={slY}
                    stroke="transparent"
                    strokeWidth={hitTargetWidth}
                    className="cursor-ns-resize pointer-events-auto"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                      }
                    }}
                  />
                )}
                {/* SL Anchor Handle at Right Edge */}
                {!isClosed && (
                  <circle
                    cx={boxRight}
                    cy={slY}
                    r={4.5}
                    fill="#f23645"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                    className="cursor-ns-resize pointer-events-auto shadow"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                    }}
                    onTouchStart={(e) => {
                      if (e.touches.length === 1) {
                        e.stopPropagation();
                        if (e.cancelable) e.preventDefault();
                        setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                      }
                    }}
                  />
                )}
                {/* Compact SL Label inside risk zone with low transparency */}
                <g
                  transform={`translate(${boxRight - 55}, ${isBuy ? slY - 20 : slY + 4})`}
                  className={!isClosed ? "cursor-ns-resize pointer-events-auto" : "pointer-events-none"}
                  onMouseDown={!isClosed ? (e) => {
                    e.stopPropagation();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                  } : undefined}
                  onTouchStart={!isClosed ? (e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      if (e.cancelable) e.preventDefault();
                      setDraggingTradeLine({ tradeId: trade.id, lineType: 'sl' });
                    }
                  } : undefined}
                  data-testid={`on-chart-sl-badge-${trade.id}`}
                >
                  <rect
                    width={50}
                    height={16}
                    rx={3}
                    fill="#f23645"
                    fillOpacity={0.25}
                    stroke="#f23645"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={25}
                    y={12}
                    fill="#f87171"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    SL
                  </text>
                </g>
              </g>

              {/* 3. Main Entry Point Dividing Line */}
              <line
                x1={boxLeft}
                y1={entryY}
                x2={boxRight}
                y2={entryY}
                stroke={isPending ? '#ff9800' : '#2962ff'}
                strokeWidth={2}
                strokeDasharray={isPending ? '6,4' : undefined}
                className={isPending ? "cursor-ns-resize pointer-events-auto" : "pointer-events-none"}
                onMouseDown={isPending ? (e) => {
                  e.stopPropagation();
                  setDraggingTradeLine({ tradeId: trade.id, lineType: 'entry' });
                } : undefined}
                onTouchStart={isPending ? (e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    if (e.cancelable) e.preventDefault();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'entry' });
                  }
                } : undefined}
                data-testid={`position-entry-line-${trade.id}`}
              />
              {/* Entry Anchor Handle at Right Edge */}
              <circle
                cx={boxRight}
                cy={entryY}
                r={4.5}
                fill="#2962ff"
                stroke="#ffffff"
                strokeWidth={1.5}
                className={isPending ? "cursor-ns-resize pointer-events-auto shadow" : "pointer-events-none"}
                onMouseDown={isPending ? (e) => {
                  e.stopPropagation();
                  setDraggingTradeLine({ tradeId: trade.id, lineType: 'entry' });
                } : undefined}
                onTouchStart={isPending ? (e) => {
                  if (e.touches.length === 1) {
                    e.stopPropagation();
                    if (e.cancelable) e.preventDefault();
                    setDraggingTradeLine({ tradeId: trade.id, lineType: 'entry' });
                  }
                } : undefined}
              />

              {/* Compact Entry Tag inside box with low transparency */}
              <g
                transform={`translate(${boxRight - 65}, ${entryY + 4})`}
                className="pointer-events-none select-none"
                data-testid={`on-chart-entry-badge-${trade.id}`}
              >
                <rect
                  width={60}
                  height={16}
                  rx={3}
                  fill="#1e222d"
                  fillOpacity={0.4}
                  stroke={isPending ? '#ff9800' : (isBuy ? '#089981' : '#f23645')}
                  strokeWidth={0.8}
                  strokeOpacity={0.6}
                />
                <text
                  x={30}
                  y={12}
                  fill={isBuy ? '#34d399' : '#f87171'}
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {trade.type}
                </text>
              </g>
            </g>
          );
        })}
      </g>
    );
  };

  // Render Draggable Trade Setup Lines (TradingView-Style Position Setup Box)
  const renderDraggableTradeSetup = () => {
    if (!activeSetup || !activeSetup.active) return null;

    const entryY = transformer.priceToY(activeSetup.entryPrice);
    const slY = transformer.priceToY(activeSetup.slPrice);
    const tpY = transformer.priceToY(activeSetup.tpPrice);

    if (entryY === null || slY === null || tpY === null) return null;

    const minRewardY = Math.min(entryY, tpY);
    const maxRewardY = Math.max(entryY, tpY);
    const minRiskY = Math.min(entryY, slY);
    const maxRiskY = Math.max(entryY, slY);

    const slPips = (Math.abs(activeSetup.entryPrice - activeSetup.slPrice) / 0.0001).toFixed(1);
    const tpPips = (Math.abs(activeSetup.tpPrice - activeSetup.entryPrice) / 0.0001).toFixed(1);

    const currentCandleTime = candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
    const tfSeconds = candles.length > 1 ? Math.max(60, candles[candles.length - 1].time - candles[candles.length - 2].time) : 900;

    const setupStartTime = activeSetup.startTime || currentCandleTime;
    const setupEndTime = activeSetup.endTime || (setupStartTime + tfSeconds * 15);

    const x1 = transformer.timeToX(setupStartTime);
    const x2 = transformer.timeToX(setupEndTime);
    
    const defaultX1 = transformer.timeToX(currentCandleTime) ?? 100;
    const safeX1 = x1 !== null ? x1 : defaultX1;
    const safeX2 = x2 !== null ? x2 : (safeX1 + 220);

    const boxLeft = Math.min(safeX1, safeX2);
    const boxRight = Math.max(safeX1, safeX2);
    const boxWidth = Math.max(40, boxRight - boxLeft);

    // Deduce order type relative to current market price
    const mktPrice = currentPrice ?? (candles.length > 0 ? candles[candles.length - 1].close : activeSetup.entryPrice);
    const pipDiff = (activeSetup.entryPrice - mktPrice) / 0.0001;
    let deducedType = 'MARKET';
    if (Math.abs(pipDiff) <= 0.3) {
      deducedType = `${activeSetup.type} MKT`;
    } else if (activeSetup.type === 'BUY') {
      deducedType = activeSetup.entryPrice < mktPrice ? 'BUY LIMIT' : 'BUY STOP';
    } else {
      deducedType = activeSetup.entryPrice > mktPrice ? 'SELL LIMIT' : 'SELL STOP';
    }
    const orderTypeLabel = activeSetup.order_type || deducedType;

    return (
      <g className="trade-setup-overlay pointer-events-auto select-none" data-testid="trade-setup-overlay">
        {/* Shaded Profit Zone - Drag body to freely move trade setup in time (left/right) & price (up/down) */}
        <rect
          x={boxLeft}
          y={minRewardY}
          width={boxWidth}
          height={Math.max(1, maxRewardY - minRewardY)}
          fill="#089981"
          fillOpacity={0.2}
          stroke="#089981"
          strokeWidth={1}
          className="cursor-move pointer-events-auto"
          data-testid="on-chart-setup-profit-zone"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('body');
            draggingSetupLineRef.current = 'body';
            const mouse = getMouseCoord(e);
            dragSetupInitialRef.current = {
              mouseTime: mouse?.time || setupStartTime,
              mousePrice: mouse?.price || activeSetup.entryPrice,
              entry: activeSetup.entryPrice,
              sl: activeSetup.slPrice,
              tp: activeSetup.tpPrice,
              startTime: setupStartTime,
              endTime: setupEndTime,
            };
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('body');
              draggingSetupLineRef.current = 'body';
              const mouse = getMouseCoord(e);
              dragSetupInitialRef.current = {
                mouseTime: mouse?.time || setupStartTime,
                mousePrice: mouse?.price || activeSetup.entryPrice,
                entry: activeSetup.entryPrice,
                sl: activeSetup.slPrice,
                tp: activeSetup.tpPrice,
                startTime: setupStartTime,
                endTime: setupEndTime,
              };
            }
          }}
        />
        {/* Shaded Risk Zone - Drag body to freely move trade setup in time (left/right) & price (up/down) */}
        <rect
          x={boxLeft}
          y={minRiskY}
          width={boxWidth}
          height={Math.max(1, maxRiskY - minRiskY)}
          fill="#f23645"
          fillOpacity={0.2}
          stroke="#f23645"
          strokeWidth={1}
          className="cursor-move pointer-events-auto"
          data-testid="on-chart-setup-risk-zone"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('body');
            draggingSetupLineRef.current = 'body';
            const mouse = getMouseCoord(e);
            dragSetupInitialRef.current = {
              mouseTime: mouse?.time || setupStartTime,
              mousePrice: mouse?.price || activeSetup.entryPrice,
              entry: activeSetup.entryPrice,
              sl: activeSetup.slPrice,
              tp: activeSetup.tpPrice,
              startTime: setupStartTime,
              endTime: setupEndTime,
            };
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('body');
              draggingSetupLineRef.current = 'body';
              const mouse = getMouseCoord(e);
              dragSetupInitialRef.current = {
                mouseTime: mouse?.time || setupStartTime,
                mousePrice: mouse?.price || activeSetup.entryPrice,
                entry: activeSetup.entryPrice,
                sl: activeSetup.slPrice,
                tp: activeSetup.tpPrice,
                startTime: setupStartTime,
                endTime: setupEndTime,
              };
            }
          }}
        />

        {/* Bounding Vertical Left Side Line (Drag Start Time Left/Right) */}
        <g
          className="cursor-ew-resize pointer-events-auto"
          data-testid="on-chart-setup-start-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('start');
            draggingSetupLineRef.current = 'start';
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('start');
              draggingSetupLineRef.current = 'start';
            }
          }}
        >
          <line
            x1={boxLeft}
            y1={Math.min(minRewardY, minRiskY)}
            x2={boxLeft}
            y2={Math.max(maxRewardY, maxRiskY)}
            stroke="transparent"
            strokeWidth={hitTargetWidth}
          />
          <line
            x1={boxLeft}
            y1={Math.min(minRewardY, minRiskY)}
            x2={boxLeft}
            y2={Math.max(maxRewardY, maxRiskY)}
            stroke="#787b86"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            opacity={0.8}
          />
          <circle
            cx={boxLeft}
            cy={entryY}
            r={handleHitRadius}
            fill="transparent"
            stroke="transparent"
          />
          <circle
            cx={boxLeft}
            cy={entryY}
            r={5}
            fill="#2962ff"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="shadow cursor-ew-resize"
          />
        </g>

        {/* Bounding Vertical Right Side Line (Drag End Time / Width Left/Right) */}
        <g
          className="cursor-ew-resize pointer-events-auto"
          data-testid="on-chart-setup-end-handle"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('end');
            draggingSetupLineRef.current = 'end';
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('end');
              draggingSetupLineRef.current = 'end';
            }
          }}
        >
          <line
            x1={boxRight}
            y1={Math.min(minRewardY, minRiskY)}
            x2={boxRight}
            y2={Math.max(maxRewardY, maxRiskY)}
            stroke="transparent"
            strokeWidth={hitTargetWidth}
          />
          <line
            x1={boxRight}
            y1={Math.min(minRewardY, minRiskY)}
            x2={boxRight}
            y2={Math.max(maxRewardY, maxRiskY)}
            stroke="#787b86"
            strokeWidth={1.5}
            strokeDasharray="3,3"
            opacity={0.8}
          />
          <circle
            cx={boxRight}
            cy={entryY}
            r={handleHitRadius}
            fill="transparent"
            stroke="transparent"
          />
          <circle
            cx={boxRight}
            cy={entryY}
            r={5}
            fill="#2962ff"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="shadow cursor-ew-resize"
          />
        </g>

        {/* 1. Take Profit Horizontal Line & Interactive Drag Hit Target */}
        <g
          data-testid="on-chart-setup-tp"
          className="cursor-ns-resize pointer-events-auto"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('tp');
            draggingSetupLineRef.current = 'tp';
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('tp');
              draggingSetupLineRef.current = 'tp';
            }
          }}
        >
          {/* Hit area */}
          <line
            x1={boxLeft}
            y1={tpY}
            x2={boxRight}
            y2={tpY}
            stroke="transparent"
            strokeWidth={hitTargetWidth}
          />
          <line
            x1={boxLeft}
            y1={tpY}
            x2={boxRight}
            y2={tpY}
            stroke="#089981"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          {/* TP Anchor Handle Dot Touch Target */}
          <circle
            cx={boxRight}
            cy={tpY}
            r={handleHitRadius}
            fill="transparent"
            stroke="transparent"
          />
          {/* TP Anchor Handle Dot */}
          <circle
            cx={boxRight}
            cy={tpY}
            r={4.5}
            fill="#089981"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="shadow"
          />
          {/* Compact TP Label inside profit zone with low transparency */}
          <g transform={`translate(${boxRight - 55}, ${activeSetup.type === 'BUY' ? tpY + 4 : tpY - 20})`}>
            <rect width={50} height={16} rx={3} fill="#089981" fillOpacity={0.25} stroke="#089981" strokeWidth={0.8} strokeOpacity={0.6} />
            <text x={25} y={12} fill="#34d399" fontSize={10} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              TP
            </text>
          </g>
        </g>

        {/* 2. Entry Horizontal Line & Interactive Drag Hit Target */}
        <g
          data-testid="on-chart-setup-entry"
          className="cursor-move pointer-events-auto"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('entry');
            draggingSetupLineRef.current = 'entry';
            const mouse = getMouseCoord(e);
            dragSetupInitialRef.current = {
              mouseTime: mouse?.time || setupStartTime,
              mousePrice: mouse?.price || activeSetup.entryPrice,
              entry: activeSetup.entryPrice,
              sl: activeSetup.slPrice,
              tp: activeSetup.tpPrice,
              startTime: setupStartTime,
              endTime: setupEndTime,
            };
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('entry');
              draggingSetupLineRef.current = 'entry';
              const mouse = getMouseCoord(e);
              dragSetupInitialRef.current = {
                mouseTime: mouse?.time || setupStartTime,
                mousePrice: mouse?.price || activeSetup.entryPrice,
                entry: activeSetup.entryPrice,
                sl: activeSetup.slPrice,
                tp: activeSetup.tpPrice,
                startTime: setupStartTime,
                endTime: setupEndTime,
              };
            }
          }}
        >
          {/* Hit area */}
          <line
            x1={boxLeft}
            y1={entryY}
            x2={boxRight}
            y2={entryY}
            stroke="transparent"
            strokeWidth={hitTargetWidth}
          />
          <line
            x1={boxLeft}
            y1={entryY}
            x2={boxRight}
            y2={entryY}
            stroke="#2962ff"
            strokeWidth={2.5}
          />
          {/* Entry Anchor Handle Dot Touch Target */}
          <circle
            cx={boxRight}
            cy={entryY}
            r={handleHitRadius}
            fill="transparent"
            stroke="transparent"
          />
          {/* Entry Anchor Handle Dot */}
          <circle
            cx={boxRight}
            cy={entryY}
            r={4.5}
            fill="#2962ff"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="shadow"
          />
          {/* Compact Entry Label inside box with low transparency */}
          <g transform={`translate(${boxRight - 75}, ${entryY + 4})`}>
            <rect width={70} height={16} rx={3} fill="#2962ff" fillOpacity={0.25} stroke="#2962ff" strokeWidth={0.8} strokeOpacity={0.6} />
            <text x={35} y={12} fill="#93c5fd" fontSize={9.5} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              {orderTypeLabel}
            </text>
          </g>
        </g>

        {/* 3. Stop Loss Horizontal Line & Interactive Drag Hit Target */}
        <g
          data-testid="on-chart-setup-sl"
          className="cursor-ns-resize pointer-events-auto"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggingSetupLine('sl');
            draggingSetupLineRef.current = 'sl';
          }}
          onTouchStart={(e) => {
            if (e.touches.length === 1) {
              e.stopPropagation();
              if (e.cancelable) e.preventDefault();
              setDraggingSetupLine('sl');
              draggingSetupLineRef.current = 'sl';
            }
          }}
        >
          {/* Invisible hit area */}
          <line
            x1={boxLeft}
            y1={slY}
            x2={boxRight}
            y2={slY}
            stroke="transparent"
            strokeWidth={hitTargetWidth}
          />
          <line
            x1={boxLeft}
            y1={slY}
            x2={boxRight}
            y2={slY}
            stroke="#f23645"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          {/* SL Anchor Handle Dot Touch Target */}
          <circle
            cx={boxRight}
            cy={slY}
            r={handleHitRadius}
            fill="transparent"
            stroke="transparent"
          />
          {/* SL Anchor Handle Dot */}
          <circle
            cx={boxRight}
            cy={slY}
            r={4.5}
            fill="#f23645"
            stroke="#ffffff"
            strokeWidth={1.5}
            className="shadow"
          />
          {/* Compact SL Label inside risk zone with low transparency */}
          <g transform={`translate(${boxRight - 55}, ${activeSetup.type === 'BUY' ? slY - 20 : slY + 4})`}>
            <rect width={50} height={16} rx={3} fill="#f23645" fillOpacity={0.25} stroke="#f23645" strokeWidth={0.8} strokeOpacity={0.6} />
            <text x={25} y={12} fill="#f87171" fontSize={10} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
              SL
            </text>
          </g>
        </g>
      </g>
    );
  };

  const renderDrawing = (d: DrawingObject, isTemp: boolean = false) => {
    if (d.hidden) return null;

    const screenPts: ScreenPoint[] = d.points.map(pt => ({
      x: transformer.timeToX(pt.time) ?? -9999,
      y: transformer.priceToY(pt.price) ?? -9999,
    }));

    if (screenPts.some(pt => pt.x === -9999 || pt.y === -9999)) return null;

    const isSelected = selectedId === d.id;
    const color = d.properties.color || '#2962ff';
    const strokeWidth = d.properties.strokeWidth || 2;
    const dashArray = d.properties.lineStyle === 'dashed' ? '6,4' : d.properties.lineStyle === 'dotted' ? '2,2' : undefined;

    return (
      <g
        key={d.id}
        data-testid={isTemp ? 'drawing-temp' : `drawing-object-${d.id}`}
        opacity={isTemp ? 0.75 : 1}
        className={!isDrawingToolActive && !isTemp ? 'pointer-events-auto cursor-pointer' : undefined}
        onClick={(e) => {
          if (!isDrawingToolActive && !isTemp) {
            e.stopPropagation();
            onSelect(d.id);
            // Single-click selects anchors ONLY; options toolbar is NOT shown!
          }
        }}
        onDoubleClick={(e) => {
          if (!isDrawingToolActive && !isTemp) {
            e.stopPropagation();
            e.preventDefault();
            onSelect(d.id);
            setActiveToolbarDrawingId(d.id);
          }
        }}
        onContextMenu={(e) => {
          if (!isDrawingToolActive && !isTemp) {
            e.stopPropagation();
            e.preventDefault();
            onSelect(d.id);
            setActiveToolbarDrawingId(d.id);
          }
        }}
        onTouchStart={(e) => {
          if (isDrawingToolActive || isTemp) return;
          const touch = e.touches[0];
          touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
          isTouchHoldTriggeredRef.current = false;
          if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
          touchHoldTimerRef.current = setTimeout(() => {
            isTouchHoldTriggeredRef.current = true;
            onSelect(d.id);
            setActiveToolbarDrawingId(d.id);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(40); } catch (_) {}
            }
          }, 450);

          if (!d.locked && e.touches.length === 1) {
            e.stopPropagation();
            onSelect(d.id);
            const rect = svgRef.current?.getBoundingClientRect();
            const rawX = e.touches[0].clientX - (rect?.left || 0);
            const rawY = e.touches[0].clientY - (rect?.top || 0);

            const currentTransformer = transformerRef.current;
            const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
            const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
            const initLogs = d.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

            setDragState({
              drawingId: d.id,
              drawing: d,
              startMouse: { x: rawX, y: rawY },
              initialPoints: [...d.points],
              initialLogicals: initLogs,
              startLogical: startLog ?? 0,
              startPrice: startP ?? 0,
            });
          }
        }}
        onTouchMove={(e) => {
          if (touchStartPosRef.current && e.touches[0]) {
            const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
            if (dx > 8 || dy > 8) {
              if (touchHoldTimerRef.current) {
                clearTimeout(touchHoldTimerRef.current);
                touchHoldTimerRef.current = null;
              }
            }
          }
        }}
        onTouchEnd={() => {
          if (touchHoldTimerRef.current) {
            clearTimeout(touchHoldTimerRef.current);
            touchHoldTimerRef.current = null;
          }
        }}
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => {
          if (!isDrawingToolActive && !isTemp && !d.locked) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            e.stopPropagation();
            try {
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
            } catch (_) {}

            const isClone = (e.ctrlKey || e.metaKey || isCtrlPressed || isCtrlPressedRef.current);
            let targetDrawing = d;
            if (isClone) {
              const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const clonedDrawing: DrawingObject = {
                ...JSON.parse(JSON.stringify(d)),
                id: cloneId,
                created_at: Date.now(),
                updated_at: Date.now(),
              };
              onAdd(clonedDrawing);
              targetDrawing = clonedDrawing;
            }

            onSelect(targetDrawing.id);
            const rect = svgRef.current?.getBoundingClientRect();
            const rawX = e.clientX - (rect?.left || 0);
            const rawY = e.clientY - (rect?.top || 0);

            const currentTransformer = transformerRef.current;
            const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
            const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
            const initLogs = targetDrawing.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

            setDragState({
              drawingId: targetDrawing.id,
              drawing: targetDrawing,
              isClone: isClone ? true : false,
              startMouse: { x: rawX, y: rawY },
              initialPoints: [...targetDrawing.points],
              initialLogicals: initLogs,
              startLogical: startLog ?? 0,
              startPrice: startP ?? 0,
            });
          }
        }}
        onPointerUp={(e) => {
          try {
            (e.currentTarget as Element).releasePointerCapture(e.pointerId);
          } catch (_) {}
        }}
        onMouseDown={(e) => {
          if (!isDrawingToolActive && !isTemp && !d.locked) {
            e.stopPropagation();
            if (dragStateRef.current) return;
            const isClone = (e.ctrlKey || e.metaKey || isCtrlPressed || isCtrlPressedRef.current);
            let targetDrawing = d;
            if (isClone) {
              const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const clonedDrawing: DrawingObject = {
                ...JSON.parse(JSON.stringify(d)),
                id: cloneId,
                created_at: Date.now(),
                updated_at: Date.now(),
              };
              onAdd(clonedDrawing);
              targetDrawing = clonedDrawing;
            }

            onSelect(targetDrawing.id);
            const rect = svgRef.current?.getBoundingClientRect();
            const rawX = e.clientX - (rect?.left || 0);
            const rawY = e.clientY - (rect?.top || 0);

            const currentTransformer = transformerRef.current;
            const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
            const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
            const initLogs = targetDrawing.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

            setDragState({
              drawingId: targetDrawing.id,
              drawing: targetDrawing,
              isClone: isClone ? true : false,
              startMouse: { x: rawX, y: rawY },
              initialPoints: [...targetDrawing.points],
              initialLogicals: initLogs,
              startLogical: startLog ?? 0,
              startPrice: startP ?? 0,
            });
          }
        }}
      >
        {/* Trendline */}
        {d.type === 'trendline' && screenPts.length >= 2 && (
          <g>
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[1].x}
              y2={screenPts[1].y}
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              strokeLinecap="round"
              className={`cursor-move pointer-events-auto`}
            />
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[1].x}
              y2={screenPts[1].y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          </g>
        )}

        {/* Ray */}
        {d.type === 'ray' && screenPts.length >= 2 && (() => {
          const dx = screenPts[1].x - screenPts[0].x;
          const dy = screenPts[1].y - screenPts[0].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const scale = len > 0 ? 3000 / len : 1;
          const endX = screenPts[0].x + dx * scale;
          const endY = screenPts[0].y + dy * scale;
          return (
            <g>
              <line
                x1={screenPts[0].x}
                y1={screenPts[0].y}
                x2={endX}
                y2={endY}
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidth + 12)}
                strokeLinecap="round"
                className={`cursor-move pointer-events-auto`}
              />
              <line
                x1={screenPts[0].x}
                y1={screenPts[0].y}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
            </g>
          );
        })()}

        {/* Extended Line */}
        {d.type === 'extended_line' && screenPts.length >= 2 && (() => {
          const dx = screenPts[1].x - screenPts[0].x;
          const dy = screenPts[1].y - screenPts[0].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const scale = len > 0 ? 3000 / len : 1;
          const startX = screenPts[0].x - dx * scale;
          const startY = screenPts[0].y - dy * scale;
          const endX = screenPts[1].x + dx * scale;
          const endY = screenPts[1].y + dy * scale;
          return (
            <g>
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidth + 12)}
                strokeLinecap="round"
                className={`cursor-move pointer-events-auto`}
              />
              <line
                x1={startX}
                y1={startY}
                x2={endX}
                y2={endY}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
            </g>
          );
        })()}

        {/* Trend Angle */}
        {d.type === 'trend_angle' && screenPts.length >= 2 && (() => {
          const angle = (Math.atan2(screenPts[1].y - screenPts[0].y, screenPts[1].x - screenPts[0].x) * 180) / Math.PI;
          return (
            <g>
              <line
                x1={screenPts[0].x}
                y1={screenPts[0].y}
                x2={screenPts[1].x}
                y2={screenPts[1].y}
                stroke="transparent"
                strokeWidth={Math.max(16, strokeWidth + 12)}
                strokeLinecap="round"
                className={`cursor-move pointer-events-auto`}
              />
              <line
                x1={screenPts[0].x}
                y1={screenPts[0].y}
                x2={screenPts[1].x}
                y2={screenPts[1].y}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={dashArray}
              />
              <text
                x={(screenPts[0].x + screenPts[1].x) / 2 + 10}
                y={(screenPts[0].y + screenPts[1].y) / 2 - 5}
                fill={color}
                fontSize={11}
                fontWeight="bold"
                fontFamily="monospace"
              >
                {angle.toFixed(1)}°
              </text>
            </g>
          );
        })()}

        {/* Horizontal Line */}
        {d.type === 'horizontal_line' && screenPts.length >= 1 && (
          <g>
            <line
              x1={0}
              y1={screenPts[0].y}
              x2={3000}
              y2={screenPts[0].y}
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              className={`cursor-move pointer-events-auto`}
            />
            <line
              x1={0}
              y1={screenPts[0].y}
              x2={3000}
              y2={screenPts[0].y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
            <rect
              x={10}
              y={screenPts[0].y - 9}
              width={70}
              height={18}
              fill="#1e222d"
              stroke={color}
              rx={2}
            />
            <text
              x={45}
              y={screenPts[0].y + 4}
              fill="#fff"
              fontSize={10}
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {d.points[0].price.toFixed(5)}
            </text>
          </g>
        )}

        {/* Horizontal Ray */}
        {d.type === 'horizontal_ray' && screenPts.length >= 1 && (
          <g>
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={3000}
              y2={screenPts[0].y}
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              className={`cursor-move pointer-events-auto`}
            />
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={3000}
              y2={screenPts[0].y}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
            <circle cx={screenPts[0].x} cy={screenPts[0].y} r={3} fill={color} />
          </g>
        )}

        {/* Vertical Line */}
        {d.type === 'vertical_line' && screenPts.length >= 1 && (
          <g>
            <line
              x1={screenPts[0].x}
              y1={0}
              x2={screenPts[0].x}
              y2={3000}
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              className={`cursor-move pointer-events-auto`}
            />
            <line
              x1={screenPts[0].x}
              y1={0}
              x2={screenPts[0].x}
              y2={3000}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          </g>
        )}

        {/* Parallel Channel / Disjoint Channel / Regression Trend */}
        {['parallel_channel', 'regression_trend', 'flat_top_bottom', 'disjoint_channel'].includes(d.type) && screenPts.length >= 2 && (() => {
          const p1 = screenPts[0];
          const p2 = screenPts[1];
          // Use 3rd point if available for real channel offset, otherwise default offset
          const offsetY = screenPts.length >= 3 ? screenPts[2].y - p1.y : 45;
          const offsetX = screenPts.length >= 3 ? screenPts[2].x - p1.x : 0;
          const p3 = { x: p2.x + offsetX, y: p2.y + offsetY };
          const p4 = { x: p1.x + offsetX, y: p1.y + offsetY };
          const mid1 = { x: (p1.x + p4.x) / 2, y: (p1.y + p4.y) / 2 };
          const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

          return (
            <g>
              <polygon
                points={`${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`}
                fill={color}
                fillOpacity={d.properties.fillOpacity || 0.12}
              />
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={color}
                strokeWidth={strokeWidth}
              />
              <line
                x1={p4.x}
                y1={p4.y}
                x2={p3.x}
                y2={p3.y}
                stroke={color}
                strokeWidth={strokeWidth}
              />
              <line
                x1={mid1.x}
                y1={mid1.y}
                x2={mid2.x}
                y2={mid2.y}
                stroke={color}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
            </g>
          );
        })()}

        {/* Fibonacci Retracement */}
        {d.type === 'fib_retracement' && screenPts.length >= 2 && (() => {
          const p1 = d.points[0].price;
          const p2 = d.points[1].price;
          const levels: FibLevel[] = (d.properties?.fibLevels && d.properties.fibLevels.length > 0)
            ? d.properties.fibLevels
            : DEFAULT_FIB_LEVELS;

          const visibleLevels = levels.filter(lvl => lvl.visible !== false);
          const extendLeft = !!d.properties?.extendLinesLeft;
          const extendRight = !!d.properties?.extendLinesRight;
          const fillBg = d.properties?.fillBackground !== false;
          const showPrices = d.properties?.showPrices !== false;
          const showLevels = d.properties?.showLevels !== false;

          const anchorMinX = Math.min(screenPts[0].x, screenPts[1].x);
          const anchorMaxX = Math.max(screenPts[0].x, screenPts[1].x);
          const minX = extendLeft ? 0 : anchorMinX;
          const maxX = extendRight ? dimensions.width : anchorMaxX + 160;

          // For background fill between consecutive sorted levels
          const sortedLevels = [...visibleLevels].sort((a, b) => a.level - b.level);

          return (
            <g key={`fib-ret-${d.id}`}>
              {/* Trendline connecting Anchor 1 and Anchor 2 */}
              <line
                x1={screenPts[0].x}
                y1={screenPts[0].y}
                x2={screenPts[1].x}
                y2={screenPts[1].y}
                stroke={d.properties?.color || '#2962ff'}
                strokeWidth={1}
                strokeDasharray="3,3"
                opacity={0.65}
              />

              {/* Background Bands */}
              {fillBg && sortedLevels.map((lvlA, idx) => {
                if (idx === sortedLevels.length - 1) return null;
                const lvlB = sortedLevels[idx + 1];
                const priceA = p1 + lvlA.level * (p2 - p1);
                const priceB = p1 + lvlB.level * (p2 - p1);
                const yA = transformer.priceToY(priceA);
                const yB = transformer.priceToY(priceB);
                if (yA === null || yB === null || isNaN(yA) || isNaN(yB)) return null;
                const topY = Math.min(yA, yB);
                const height = Math.abs(yB - yA);
                if (height <= 0) return null;

                return (
                  <rect
                    key={`fib-band-${idx}`}
                    x={minX}
                    y={topY}
                    width={Math.max(10, maxX - minX)}
                    height={height}
                    fill={lvlA.color}
                    opacity={0.08}
                  />
                );
              })}

              {/* Individual Level Lines & Text Labels */}
              {visibleLevels.map((fib, idx) => {
                const levelPrice = p1 + fib.level * (p2 - p1);
                const y = transformer.priceToY(levelPrice);
                if (y === null || isNaN(y)) return null;

                const labelParts: string[] = [];
                if (showLevels) labelParts.push(formatFibLevel(fib.level));
                if (showPrices) labelParts.push(`(${levelPrice.toFixed(5)})`);
                const labelText = labelParts.join(' ');

                // Label positioning
                const labelX = extendRight
                  ? Math.min(dimensions.width - 120, anchorMaxX + 10)
                  : maxX + 5;

                const isMajor = fib.level === 0.0 || fib.level === 0.5 || fib.level === 1.0;

                return (
                  <g key={`fib-lvl-${idx}-${fib.level}`}>
                    <line
                      x1={minX}
                      y1={y}
                      x2={maxX}
                      y2={y}
                      stroke={fib.color}
                      strokeWidth={d.properties?.strokeWidth || 1}
                      strokeDasharray={isMajor ? undefined : '3,3'}
                      opacity={0.9}
                    />
                    {labelText && (
                      <text
                        x={labelX}
                        y={y - 3}
                        fill={fib.color}
                        fontSize={10}
                        fontWeight={isMajor ? 'bold' : 'normal'}
                        fontFamily="monospace"
                        className="select-none pointer-events-none drop-shadow-sm"
                      >
                        {labelText}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* Rectangle */}
        {d.type === 'rectangle' && screenPts.length >= 2 && (
          <rect
            x={Math.min(screenPts[0].x, screenPts[1].x)}
            y={Math.min(screenPts[0].y, screenPts[1].y)}
            width={Math.abs(screenPts[1].x - screenPts[0].x)}
            height={Math.abs(screenPts[1].y - screenPts[0].y)}
            fill={color}
            fillOpacity={d.properties.fillOpacity || 0.15}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )}

        {/* Circle / Ellipse */}
        {['circle', 'ellipse'].includes(d.type) && screenPts.length >= 2 && (
          <ellipse
            cx={screenPts[0].x}
            cy={screenPts[0].y}
            rx={Math.abs(screenPts[1].x - screenPts[0].x)}
            ry={Math.abs(screenPts[1].y - screenPts[0].y)}
            fill={color}
            fillOpacity={0.15}
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )}

        {/* Triangle */}
        {d.type === 'triangle' && screenPts.length >= 2 && (() => {
          const p3 = screenPts.length >= 3 ? screenPts[2] : { x: screenPts[0].x, y: screenPts[1].y };
          return (
            <polygon
              points={`${screenPts[0].x},${screenPts[0].y} ${screenPts[1].x},${screenPts[1].y} ${p3.x},${p3.y}`}
              fill={color}
              fillOpacity={d.properties.fillOpacity || 0.15}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        })()}

        {/* Arrow Line */}
        {d.type === 'arrow' && screenPts.length >= 2 && (
          <g>
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[1].x}
              y2={screenPts[1].y}
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              strokeLinecap="round"
              className={`cursor-move pointer-events-auto`}
            />
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[1].x}
              y2={screenPts[1].y}
              stroke={color}
              strokeWidth={strokeWidth}
              markerEnd="url(#arrowhead)"
            />
          </g>
        )}

        {/* Polyline / Path */}
        {['polyline', 'path'].includes(d.type) && screenPts.length >= 2 && (
          <g>
            <polyline
              points={screenPts.map(pt => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(16, strokeWidth + 12)}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`cursor-move pointer-events-auto`}
            />
            <polyline
              points={screenPts.map(pt => `${pt.x},${pt.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
            />
          </g>
        )}

                {/* Long Position Analysis Tool (TradingView-Style 1-Click & Independent Handles) */}
        {/* Long Position Analysis Tool (TradingView Standard with Live Metrics & Replay Status) */}
        {d.type === 'long_position' && screenPts.length >= 1 && (() => {
          const metrics = PositionToolService.calculateMetrics(d, d.properties?.accountSize || 10000);
          const replayStatus = PositionToolService.evaluateReplayStatus(
            d,
            candles,
            Boolean(currentReplayTimestamp),
            currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : metrics.entryPrice)
          );

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(metrics.slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
          const tpY = transformer.priceToY(metrics.tpPrice) ?? (screenPts[2]?.y ?? entryY - 80);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(20, maxX - minX);

          const profitTop = Math.min(entryY, tpY);
          const profitHeight = Math.max(1, Math.abs(tpY - entryY));
          const riskTop = Math.min(entryY, slY);
          const riskHeight = Math.max(1, Math.abs(slY - entryY));

          const contentWidth = Math.max(20, width - 12);

          const targetText = contentWidth >= 210
            ? `Target: ${metrics.tpPrice.toFixed(5)} | ${metrics.rewardPips} pips (+${metrics.potentialProfitUsd})`
            : contentWidth >= 135
            ? `Target: ${metrics.tpPrice.toFixed(5)} (+${metrics.rewardPips}p)`
            : `Target: ${metrics.tpPrice.toFixed(5)}`;

          const stopText = contentWidth >= 210
            ? `Stop: ${metrics.slPrice.toFixed(5)} | ${metrics.riskPips} pips (-${metrics.potentialLossUsd})`
            : contentWidth >= 135
            ? `Stop: ${metrics.slPrice.toFixed(5)} (-${metrics.riskPips}p)`
            : `Stop: ${metrics.slPrice.toFixed(5)}`;

          const rrText = contentWidth >= 135
            ? `Risk/reward ratio: ${metrics.riskRewardRatio.toFixed(2)}`
            : `R:R: ${metrics.riskRewardRatio.toFixed(2)}`;

          const targetTagWidth = Math.min(contentWidth, Math.max(60, targetText.length * 5.8 + 14));
          const stopTagWidth = Math.min(contentWidth, Math.max(60, stopText.length * 5.8 + 14));
          const rrTagWidth = Math.min(contentWidth, Math.max(50, rrText.length * 5.8 + 14));

          return (
            <g data-testid={`drawing-long-position-${d.id}`} className="select-none">
              <defs>
                <clipPath id={`clip-tag-${d.id}-tp`}>
                  <rect width={targetTagWidth} height={16} rx={3} />
                </clipPath>
                <clipPath id={`clip-tag-${d.id}-sl`}>
                  <rect width={stopTagWidth} height={16} rx={3} />
                </clipPath>
                <clipPath id={`clip-tag-${d.id}-rr`}>
                  <rect width={rrTagWidth} height={16} rx={3} />
                </clipPath>
              </defs>

              {/* Target / Profit Area (Green) */}
              <rect
                x={minX}
                y={profitTop}
                width={width}
                height={profitHeight}
                fill="#089981"
                fillOpacity={0.20}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop / Loss Area (Red) */}
              <rect
                x={minX}
                y={riskTop}
                width={width}
                height={riskHeight}
                fill="#f23645"
                fillOpacity={0.20}
                stroke="#f23645"
                strokeWidth={1}
              />

              {/* Entry Dividing Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#787b86"
                strokeWidth={1}
                opacity={0.8}
              />

              {/* Information placed cleanly INSIDE the respective parts with low transparency (matching sessions) */}
              {/* 1. Target & Risk/Reward inside Green Profit Zone */}
              {profitHeight >= 36 ? (
                <g className="pointer-events-none select-none">
                  {/* Target Info Badge inside Profit Zone */}
                  <g transform={`translate(${minX + 6}, ${profitTop + 4})`}>
                    <rect
                      width={targetTagWidth}
                      height={16}
                      rx={3}
                      fill="#089981"
                      fillOpacity={0.25}
                      stroke="#089981"
                      strokeWidth={0.8}
                      strokeOpacity={0.6}
                    />
                    <text
                      x={6}
                      y={11.5}
                      fill="#34d399"
                      fontSize={9.5}
                      fontWeight={600}
                      fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                      clipPath={`url(#clip-tag-${d.id}-tp)`}
                    >
                      {targetText}
                    </text>
                  </g>
                  {/* Risk/Reward Ratio Badge inside Profit Zone */}
                  <g transform={`translate(${minX + 6}, ${profitHeight >= 46 ? entryY - 20 : profitTop + 22})`}>
                    <rect
                      width={rrTagWidth}
                      height={16}
                      rx={3}
                      fill="#089981"
                      fillOpacity={0.25}
                      stroke="#089981"
                      strokeWidth={0.8}
                      strokeOpacity={0.6}
                    />
                    <text
                      x={6}
                      y={11.5}
                      fill="#34d399"
                      fontSize={9.5}
                      fontWeight={600}
                      fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                      clipPath={`url(#clip-tag-${d.id}-rr)`}
                    >
                      {rrText}
                    </text>
                  </g>
                </g>
              ) : profitHeight >= 18 ? (
                <g transform={`translate(${minX + 6}, ${profitTop + (profitHeight - 16) / 2})`} className="pointer-events-none select-none">
                  <rect
                    width={targetTagWidth}
                    height={16}
                    rx={3}
                    fill="#089981"
                    fillOpacity={0.25}
                    stroke="#089981"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#34d399"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    clipPath={`url(#clip-tag-${d.id}-tp)`}
                  >
                    {targetText} | {rrText}
                  </text>
                </g>
              ) : (
                <text
                  x={minX + 6}
                  y={profitTop + profitHeight / 2 + 3}
                  fill="#34d399"
                  fontSize={9}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  className="pointer-events-none select-none"
                >
                  {targetText} | {rrText}
                </text>
              )}

              {/* 2. Stop Info inside Red Loss Zone */}
              {riskHeight >= 18 ? (
                <g transform={`translate(${minX + 6}, ${riskHeight >= 28 ? slY - 20 : riskTop + (riskHeight - 16) / 2})`} className="pointer-events-none select-none">
                  <rect
                    width={stopTagWidth}
                    height={16}
                    rx={3}
                    fill="#f23645"
                    fillOpacity={0.25}
                    stroke="#f23645"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#f87171"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    clipPath={`url(#clip-tag-${d.id}-sl)`}
                  >
                    {stopText}
                  </text>
                </g>
              ) : (
                <text
                  x={minX + 6}
                  y={riskTop + riskHeight / 2 + 3}
                  fill="#f87171"
                  fontSize={9}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  className="pointer-events-none select-none"
                >
                  {stopText}
                </text>
              )}

              {/* 3. Bar Replay Status Indicator Badge (when replay active) */}
              {Boolean(currentReplayTimestamp) && (
                <g transform={`translate(${minX + 6}, ${profitHeight >= 64 ? entryY - 38 : profitTop + 4})`} className="pointer-events-none select-none">
                  <rect
                    width={Math.min(Math.max(20, width - 12), 190)}
                    height={16}
                    rx={3}
                    fill={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    fillOpacity={0.25}
                    stroke={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#ffffff"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  >
                    {replayStatus.state === 'target_hit' ? `TARGET HIT (+${metrics.potentialProfitUsd})` :
                     replayStatus.state === 'stopped_out' ? `STOPPED OUT (-${metrics.potentialLossUsd})` :
                     replayStatus.state === 'active' ? `ACTIVE: ${replayStatus.openPips >= 0 ? '+' : ''}${replayStatus.openPips}p ($${replayStatus.openPnlUsd})` :
                     'PLANNED'}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* Short Position Analysis Tool (TradingView Standard with Live Metrics & Replay Status) */}
        {d.type === 'short_position' && screenPts.length >= 1 && (() => {
          const metrics = PositionToolService.calculateMetrics(d, d.properties?.accountSize || 10000);
          const replayStatus = PositionToolService.evaluateReplayStatus(
            d,
            candles,
            Boolean(currentReplayTimestamp),
            currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : metrics.entryPrice)
          );

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(metrics.slPrice) ?? (screenPts[1]?.y ?? entryY - 40);
          const tpY = transformer.priceToY(metrics.tpPrice) ?? (screenPts[2]?.y ?? entryY + 40);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(20, maxX - minX);

          const profitTop = Math.min(entryY, tpY);
          const profitHeight = Math.max(1, Math.abs(tpY - entryY));
          const riskTop = Math.min(entryY, slY);
          const riskHeight = Math.max(1, Math.abs(slY - entryY));

          const contentWidth = Math.max(20, width - 12);

          const targetText = contentWidth >= 210
            ? `Target: ${metrics.tpPrice.toFixed(5)} | ${metrics.rewardPips} pips (+${metrics.potentialProfitUsd})`
            : contentWidth >= 135
            ? `Target: ${metrics.tpPrice.toFixed(5)} (+${metrics.rewardPips}p)`
            : `Target: ${metrics.tpPrice.toFixed(5)}`;

          const stopText = contentWidth >= 210
            ? `Stop: ${metrics.slPrice.toFixed(5)} | ${metrics.riskPips} pips (-${metrics.potentialLossUsd})`
            : contentWidth >= 135
            ? `Stop: ${metrics.slPrice.toFixed(5)} (-${metrics.riskPips}p)`
            : `Stop: ${metrics.slPrice.toFixed(5)}`;

          const rrText = contentWidth >= 135
            ? `Risk/reward ratio: ${metrics.riskRewardRatio.toFixed(2)}`
            : `R:R: ${metrics.riskRewardRatio.toFixed(2)}`;

          const targetTagWidth = Math.min(contentWidth, Math.max(60, targetText.length * 5.8 + 14));
          const stopTagWidth = Math.min(contentWidth, Math.max(60, stopText.length * 5.8 + 14));
          const rrTagWidth = Math.min(contentWidth, Math.max(50, rrText.length * 5.8 + 14));

          return (
            <g data-testid={`drawing-short-position-${d.id}`} className="select-none">
              <defs>
                <clipPath id={`clip-tag-${d.id}-tp`}>
                  <rect width={targetTagWidth} height={16} rx={3} />
                </clipPath>
                <clipPath id={`clip-tag-${d.id}-sl`}>
                  <rect width={stopTagWidth} height={16} rx={3} />
                </clipPath>
                <clipPath id={`clip-tag-${d.id}-rr`}>
                  <rect width={rrTagWidth} height={16} rx={3} />
                </clipPath>
              </defs>

              {/* Target / Profit Area (Green) */}
              <rect
                x={minX}
                y={profitTop}
                width={width}
                height={profitHeight}
                fill="#089981"
                fillOpacity={0.20}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop / Loss Area (Red) */}
              <rect
                x={minX}
                y={riskTop}
                width={width}
                height={riskHeight}
                fill="#f23645"
                fillOpacity={0.20}
                stroke="#f23645"
                strokeWidth={1}
              />

              {/* Entry Dividing Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#787b86"
                strokeWidth={1}
                opacity={0.8}
              />

              {/* Information placed cleanly INSIDE the respective parts with low transparency (matching sessions) */}
              {/* 1. Stop Info inside Red Loss Zone (Top part for Short) */}
              {riskHeight >= 18 ? (
                <g transform={`translate(${minX + 6}, ${riskHeight >= 28 ? riskTop + 4 : riskTop + (riskHeight - 16) / 2})`} className="pointer-events-none select-none">
                  <rect
                    width={stopTagWidth}
                    height={16}
                    rx={3}
                    fill="#f23645"
                    fillOpacity={0.25}
                    stroke="#f23645"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#f87171"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    clipPath={`url(#clip-tag-${d.id}-sl)`}
                  >
                    {stopText}
                  </text>
                </g>
              ) : (
                <text
                  x={minX + 6}
                  y={riskTop + riskHeight / 2 + 3}
                  fill="#f87171"
                  fontSize={9}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  className="pointer-events-none select-none"
                >
                  {stopText}
                </text>
              )}

              {/* 2. Target & Risk/Reward inside Green Profit Zone (Bottom part for Short) */}
              {profitHeight >= 36 ? (
                <g className="pointer-events-none select-none">
                  {/* Risk/Reward Ratio Badge near entry line */}
                  <g transform={`translate(${minX + 6}, ${profitTop + 4})`}>
                    <rect
                      width={rrTagWidth}
                      height={16}
                      rx={3}
                      fill="#089981"
                      fillOpacity={0.25}
                      stroke="#089981"
                      strokeWidth={0.8}
                      strokeOpacity={0.6}
                    />
                    <text
                      x={6}
                      y={11.5}
                      fill="#34d399"
                      fontSize={9.5}
                      fontWeight={600}
                      fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                      clipPath={`url(#clip-tag-${d.id}-rr)`}
                    >
                      {rrText}
                    </text>
                  </g>
                  {/* Target Info Badge near TP bottom boundary */}
                  <g transform={`translate(${minX + 6}, ${profitHeight >= 46 ? tpY - 20 : profitTop + 22})`}>
                    <rect
                      width={targetTagWidth}
                      height={16}
                      rx={3}
                      fill="#089981"
                      fillOpacity={0.25}
                      stroke="#089981"
                      strokeWidth={0.8}
                      strokeOpacity={0.6}
                    />
                    <text
                      x={6}
                      y={11.5}
                      fill="#34d399"
                      fontSize={9.5}
                      fontWeight={600}
                      fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                      clipPath={`url(#clip-tag-${d.id}-tp)`}
                    >
                      {targetText}
                    </text>
                  </g>
                </g>
              ) : profitHeight >= 18 ? (
                <g transform={`translate(${minX + 6}, ${profitTop + (profitHeight - 16) / 2})`} className="pointer-events-none select-none">
                  <rect
                    width={targetTagWidth}
                    height={16}
                    rx={3}
                    fill="#089981"
                    fillOpacity={0.25}
                    stroke="#089981"
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#34d399"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    clipPath={`url(#clip-tag-${d.id}-tp)`}
                  >
                    {targetText} | {rrText}
                  </text>
                </g>
              ) : (
                <text
                  x={minX + 6}
                  y={profitTop + profitHeight / 2 + 3}
                  fill="#34d399"
                  fontSize={9}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  className="pointer-events-none select-none"
                >
                  {targetText} | {rrText}
                </text>
              )}

              {/* 3. Bar Replay Status Indicator Badge (when replay active) */}
              {Boolean(currentReplayTimestamp) && (
                <g transform={`translate(${minX + 6}, ${profitHeight >= 64 ? entryY + 22 : profitTop + 4})`} className="pointer-events-none select-none">
                  <rect
                    width={Math.min(Math.max(20, width - 12), 190)}
                    height={16}
                    rx={3}
                    fill={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    fillOpacity={0.25}
                    stroke={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    strokeWidth={0.8}
                    strokeOpacity={0.6}
                  />
                  <text
                    x={6}
                    y={11.5}
                    fill="#ffffff"
                    fontSize={9.5}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  >
                    {replayStatus.state === 'target_hit' ? `TARGET HIT (+${metrics.potentialProfitUsd})` :
                     replayStatus.state === 'stopped_out' ? `STOPPED OUT (-${metrics.potentialLossUsd})` :
                     replayStatus.state === 'active' ? `ACTIVE: ${replayStatus.openPips >= 0 ? '+' : ''}${replayStatus.openPips}p ($${replayStatus.openPnlUsd})` :
                     'PLANNED'}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

                {/* Measurement / Price Range Tool */}
        {['measure', 'price_range', 'date_range', 'date_price_range'].includes(d.type) && screenPts.length >= 2 && (() => {
          const minX = Math.min(screenPts[0].x, screenPts[1].x);
          const maxX = Math.max(screenPts[0].x, screenPts[1].x);
          const minY = Math.min(screenPts[0].y, screenPts[1].y);
          const maxY = Math.max(screenPts[0].y, screenPts[1].y);
          const pips = (((d.points[1].price - d.points[0].price) / 0.0001)).toFixed(1);
          const isUp = parseFloat(pips) >= 0;

          return (
            <g>
              <rect
                x={minX}
                y={minY}
                width={Math.max(10, maxX - minX)}
                height={Math.max(10, maxY - minY)}
                fill="#2962ff"
                fillOpacity={0.12}
                stroke="#2962ff"
                strokeWidth={1.5}
                strokeDasharray="3,3"
              />
              <rect
                x={(minX + maxX) / 2 - 60}
                y={(minY + maxY) / 2 - 12}
                width={120}
                height={24}
                fill="#1e222d"
                stroke="#2a2e39"
                rx={4}
              />
              <text
                x={(minX + maxX) / 2}
                y={(minY + maxY) / 2 + 4}
                fill={isUp ? '#089981' : '#f23645'}
                fontSize={10}
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                {isUp ? '+' : ''}{pips} pips
              </text>
            </g>
          );
        })()}

        {/* Text Annotation / Note / Callout */}
        {['text', 'note', 'callout'].includes(d.type) && screenPts.length >= 1 && (
          <g>
            <rect
              x={screenPts[0].x - 5}
              y={screenPts[0].y - 18}
              width={Math.max(80, (d.properties.text?.length || 10) * 8 + 16)}
              height={26}
              fill="#1e222d"
              stroke={color}
              rx={3}
            />
            <text
              x={screenPts[0].x + 4}
              y={screenPts[0].y - 1}
              fill="#fff"
              fontSize={12}
              fontWeight="bold"
            >
              {d.properties.text || 'EUR/USD Setup'}
            </text>
          </g>
        )}

        {/* Price Label */}
        {d.type === 'price_label' && screenPts.length >= 1 && (
          <g>
            <rect
              x={screenPts[0].x}
              y={screenPts[0].y - 10}
              width={65}
              height={20}
              fill="#2962ff"
              rx={3}
            />
            <text
              x={screenPts[0].x + 32}
              y={screenPts[0].y + 4}
              fill="#ffffff"
              fontSize={10}
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {d.points[0].price.toFixed(5)}
            </text>
          </g>
        )}

        {/* Selection Handles (Resize/Rotate Anchors) */}
        {isSelected &&
          !d.locked &&
          (() => {
            const isPosition = d.type === 'long_position' || d.type === 'short_position';
            let ptsToRender: { x: number; y: number; cursor?: string; color?: string; pointIndex: number; title?: string; isVisible?: boolean }[] = [];

            if (isPosition) {
              const startX = screenPts[0].x;
              const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
              const minX = Math.min(startX, endX);
              const maxX = Math.max(startX, endX);
              const midX = minX + (maxX - minX) / 2;

              const entryPrice = d.points[0].price;
              const slPrice = d.points.length >= 2 ? d.points[1].price : (d.type === 'long_position' ? entryPrice - 0.00150 : entryPrice + 0.00150);
              const tpPrice = d.points.length >= 3 ? d.points[2].price : (d.type === 'long_position' ? entryPrice + 0.00150 : entryPrice - 0.00150);

              const entryY = screenPts[0].y;
              const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
              const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY - 40);

              const isLong = d.type === 'long_position';
              const topY = isLong ? tpY : slY;
              const bottomY = isLong ? slY : tpY;
              const topPointIndex = isLong ? 2 : 1;
              const bottomPointIndex = isLong ? 1 : 2;

              // TradingView Complete 8 Anchor Handles:
              // 1. Top Center: (midX, topY) -> controls top level (TP for Long, SL for Short)
              // 2. Bottom Center: (midX, bottomY) -> controls bottom level (SL for Long, TP for Short)
              // 3. Left Middle: (minX, entryY) -> controls entry & shifts bracket
              // 4. Center Entry: (midX, entryY) -> controls entry price vertically
              // 5. Right Middle: (maxX, entryY) -> controls horizontal duration
              // 6. Left Middle Duration: (minX, (topY + bottomY) / 2) -> controls start time
              // 7. Right Top Corner: (maxX, topY)
              // 8. Right Bottom Corner: (maxX, bottomY)
              ptsToRender = [
                { x: midX, y: topY, cursor: 'cursor-ns-resize', pointIndex: topPointIndex, isVisible: true },
                { x: midX, y: bottomY, cursor: 'cursor-ns-resize', pointIndex: bottomPointIndex, isVisible: true },
                { x: minX, y: entryY, cursor: 'cursor-move', pointIndex: 0, isVisible: true },
                { x: midX, y: entryY, cursor: 'cursor-ns-resize', pointIndex: 7, isVisible: true },
                { x: maxX, y: entryY, cursor: 'cursor-ew-resize', pointIndex: 3, isVisible: true },
                { x: minX, y: (topY + bottomY) / 2, cursor: 'cursor-ew-resize', pointIndex: 6, isVisible: false },
                { x: maxX, y: topY, cursor: 'cursor-ns-resize', pointIndex: 4, isVisible: false },
                { x: maxX, y: bottomY, cursor: 'cursor-ns-resize', pointIndex: 5, isVisible: false },
              ];
            } else {
              ptsToRender = screenPts.map((pt, idx) => ({
                x: pt.x,
                y: pt.y,
                cursor: 'cursor-crosshair',
                pointIndex: idx,
                isVisible: true,
              }));
            }

            return ptsToRender.map((pt) => (
              <g key={pt.pointIndex}>
                {/* Large 32px diameter / 64px touch target on mobile for effortless grabbing */}
                <circle
                  data-testid={`anchor-handle-${d.id}-${pt.pointIndex}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isMobile ? 32 : 16}
                  fill="transparent"
                  style={{ touchAction: 'none' }}
                  className={`pointer-events-auto ${pt.cursor}`}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      (e.currentTarget as Element).setPointerCapture(e.pointerId);
                    } catch (_) {}

                    const isClone = (e.ctrlKey || e.metaKey || isCtrlPressed || isCtrlPressedRef.current);
                    let targetDrawing = d;
                    if (isClone) {
                      const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                      const clonedDrawing: DrawingObject = {
                        ...JSON.parse(JSON.stringify(d)),
                        id: cloneId,
                        created_at: Date.now(),
                        updated_at: Date.now(),
                      };
                      onAdd(clonedDrawing);
                      targetDrawing = clonedDrawing;
                    }

                    onSelect(targetDrawing.id);
                    const rect = svgRef.current?.getBoundingClientRect();
                    const rawX = e.clientX - (rect?.left || 0);
                    const rawY = e.clientY - (rect?.top || 0);

                    const currentTransformer = transformerRef.current;
                    const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
                    const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
                    const initLogs = targetDrawing.points.map(p => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(p.time) ?? 0 : 0);

                    setDragState({
                      drawingId: targetDrawing.id,
                      drawing: targetDrawing,
                      isClone: isClone ? true : false,
                      pointIndex: isClone ? undefined : pt.pointIndex,
                      startMouse: { x: rawX, y: rawY },
                      initialPoints: [...targetDrawing.points],
                      initialLogicals: initLogs,
                      startLogical: startLog ?? 0,
                      startPrice: startP ?? 0,
                    });
                  }}
                  onPointerUp={(e) => {
                    try {
                      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
                    } catch (_) {}
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (dragStateRef.current) return;
                    const isClone = (e.ctrlKey || e.metaKey || isCtrlPressed || isCtrlPressedRef.current);
                    let targetDrawing = d;
                    if (isClone) {
                      const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                      const clonedDrawing: DrawingObject = {
                        ...JSON.parse(JSON.stringify(d)),
                        id: cloneId,
                        created_at: Date.now(),
                        updated_at: Date.now(),
                      };
                      onAdd(clonedDrawing);
                      targetDrawing = clonedDrawing;
                    }

                    onSelect(targetDrawing.id);
                    const rect = svgRef.current?.getBoundingClientRect();
                    const rawX = e.clientX - (rect?.left || 0);
                    const rawY = e.clientY - (rect?.top || 0);

                    const currentTransformer = transformerRef.current;
                    const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
                    const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
                    const initLogs = targetDrawing.points.map(p => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(p.time) ?? 0 : 0);

                    setDragState({
                      drawingId: targetDrawing.id,
                      drawing: targetDrawing,
                      isClone: isClone ? true : false,
                      pointIndex: isClone ? undefined : pt.pointIndex,
                      startMouse: { x: rawX, y: rawY },
                      initialPoints: [...targetDrawing.points],
                      initialLogicals: initLogs,
                      startLogical: startLog ?? 0,
                      startPrice: startP ?? 0,
                    });
                  }}
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      if (dragStateRef.current) return;
                      const rect = svgRef.current?.getBoundingClientRect();
                      const rawX = e.touches[0].clientX - (rect?.left || 0);
                      const rawY = e.touches[0].clientY - (rect?.top || 0);

                      const currentTransformer = transformerRef.current;
                      const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
                      const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
                      const initLogs = d.points.map(p => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(p.time) ?? 0 : 0);

                      setDragState({
                        drawingId: d.id,
                        drawing: d,
                        pointIndex: pt.pointIndex,
                        startMouse: { x: rawX, y: rawY },
                        initialPoints: [...d.points],
                        initialLogicals: initLogs,
                        startLogical: startLog ?? 0,
                        startPrice: startP ?? 0,
                      });
                    }
                  }}
                />
                {/* TradingView Signature 10x10 Rounded Square with #2962ff border */}
                {pt.isVisible && (
                  <rect
                    x={pt.x - 5}
                    y={pt.y - 5}
                    width={10}
                    height={10}
                    rx={2.5}
                    fill="#131722"
                    stroke="#2962ff"
                    strokeWidth={2}
                    className="pointer-events-none shadow"
                  />
                )}
              </g>
            ));
          })()}
      </g>
    );
  };

  return (
    <div
      className={`absolute inset-0 z-[15] overflow-hidden pointer-events-none`}
    >
      <svg
        ref={svgRef}
        data-testid="drawing-svg"
        style={{
          touchAction: dragState !== null || draggingSetupLine !== null || draggingTradeLine !== null || isDrawingToolActive ? 'none' : 'auto',
        }}
        className={`w-full h-full select-none ${
          isSelectingReplayCut || isDrawingToolActive || inProgressDrawing || dragState !== null || draggingSetupLine !== null || draggingTradeLine !== null
            ? 'pointer-events-auto cursor-crosshair'
            : 'pointer-events-none'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDoubleClick={(e) => {
          if (!isDrawingToolActive) {
            const mouse = getMouseCoord(e);
            if (mouse) {
              const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer, 14, selectedId);
              if (hit) {
                e.stopPropagation();
                e.preventDefault();
                onSelect(hit.drawing.id);
                setActiveToolbarDrawingId(hit.drawing.id);
              }
            }
          }
        }}
        onClick={(e) => {
            if (Date.now() - justCreatedTimeRef.current < 400) return;
            if (!isDrawingToolActive) {
            // Clicking empty space on SVG deselects the current object
            if (e.target === svgRef.current) {
              const mouse = getMouseCoord(e);
              if (mouse) {
                const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer, 12);
                if (hit) {
                  onSelect(hit.drawing.id);
                } else {
                  onSelect(null);
                  setActiveToolbarDrawingId(null);
                }
              } else {
                onSelect(null);
                setActiveToolbarDrawingId(null);
              }
            }
          }
        }}
        onContextMenu={(e) => {
          if (inProgressDrawing) {
            e.preventDefault();
            setInProgressDrawing(null);
            onResetTool();
            return;
          }
          if (!isDrawingToolActive) {
            const mouse = getMouseCoord(e);
            if (mouse) {
              const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer, 14, selectedId);
              if (hit) {
                e.preventDefault();
                e.stopPropagation();
                onSelect(hit.drawing.id);
                setActiveToolbarDrawingId(hit.drawing.id);
              }
            }
          }
        }}
        onTouchStart={(e) => {
          if (!isDrawingToolActive && e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = svgRef.current?.getBoundingClientRect();
            const sx = touch.clientX - (rect?.left || 0);
            const sy = touch.clientY - (rect?.top || 0);
            const hit = DrawingEngine.hitTest({ x: sx, y: sy }, drawings, transformer, 18, selectedId);
            if (hit) {
              touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
              isTouchHoldTriggeredRef.current = false;
              if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
              touchHoldTimerRef.current = setTimeout(() => {
                isTouchHoldTriggeredRef.current = true;
                onSelect(hit.drawing.id);
                setActiveToolbarDrawingId(hit.drawing.id);
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate(40); } catch (_) {}
                }
              }, 450);
            }
          }
        }}
        onTouchMove={(e) => {
          if (touchStartPosRef.current && e.touches[0]) {
            const dx = Math.abs(e.touches[0].clientX - touchStartPosRef.current.x);
            const dy = Math.abs(e.touches[0].clientY - touchStartPosRef.current.y);
            if (dx > 8 || dy > 8) {
              if (touchHoldTimerRef.current) {
                clearTimeout(touchHoldTimerRef.current);
                touchHoldTimerRef.current = null;
              }
            }
          }
        }}
        onTouchEnd={() => {
          if (touchHoldTimerRef.current) {
            clearTimeout(touchHoldTimerRef.current);
            touchHoldTimerRef.current = null;
          }
        }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="9"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#2962ff" />
          </marker>
        </defs>

        {/* Forex Session Indicator Highlights */}
        {renderSessions()}

        {/* Drawings */}
        {drawings.map(d => renderDrawing(d))}
        {inProgressDrawing && renderDrawing(inProgressDrawing, true)}

        {/* Confirmed Active Open Trades on Chart */}
        {renderOpenTrades()}

        {/* Draggable Trade Setup Lines */}
        {renderDraggableTradeSetup()}

        {/* TradingView-Style Interactive Crosshair & Magnet Snapping */}
        {activeTool !== 'arrow' && activeCrosshair && (
          <g className="crosshair-layer pointer-events-none select-none">
            {/* Horizontal Crosshair Line */}
            <line
              x1={0}
              y1={activeCrosshair.screenY}
              x2="100%"
              y2={activeCrosshair.screenY}
              stroke="#787b86"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.85}
            />
            {/* Vertical Crosshair Line */}
            <line
              x1={activeCrosshair.screenX}
              y1={0}
              x2={activeCrosshair.screenX}
              y2="100%"
              stroke="#787b86"
              strokeWidth={1}
              strokeDasharray="3,3"
              opacity={0.85}
            />

            {/* Glowing Magnet Snap Target Ring & Level Badge */}
            {activeCrosshair.isSnapped && (
              <g data-testid="magnet-snap-indicator">
                <circle
                  cx={activeCrosshair.screenX}
                  cy={activeCrosshair.screenY}
                  r={8}
                  fill="rgba(41, 98, 255, 0.25)"
                  stroke="#2962ff"
                  strokeWidth={2}
                  className="animate-pulse"
                />
                <circle
                  cx={activeCrosshair.screenX}
                  cy={activeCrosshair.screenY}
                  r={2.5}
                  fill="#ffffff"
                  stroke="#2962ff"
                  strokeWidth={1}
                />
                <g transform={`translate(${Math.min(dimensions.width - 110, activeCrosshair.screenX + 10)}, ${Math.max(16, activeCrosshair.screenY - 12)})`}>
                  <rect
                    width={96}
                    height={18}
                    rx={3}
                    fill="#1e222d"
                    stroke="#2962ff"
                    strokeWidth={1}
                    className="shadow-md"
                  />
                  <text
                    x={48}
                    y={13}
                    fill="#38bdf8"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {activeCrosshair.snapType ? `${activeCrosshair.snapType[0]} ` : ''}{formatBadgeTimeInTimezone(activeCrosshair.time, timeframe, timezone)}
                  </text>
                </g>
              </g>
            )}

            {/* Price Axis Badge on Right */}
            {activeCrosshair.price !== null && !isNaN(activeCrosshair.price) && (
              <g
                transform={`translate(${dimensions.width - 76}, ${Math.max(4, Math.min(dimensions.height - 24, activeCrosshair.screenY - 10))})`}
                data-testid="crosshair-price-badge"
              >
                <rect
                  width={72}
                  height={20}
                  rx={3}
                  fill={activeCrosshair.isSnapped ? '#2962ff' : '#1e222d'}
                  stroke={activeCrosshair.isSnapped ? '#38bdf8' : '#2a2e39'}
                  strokeWidth={1}
                  className="shadow-lg"
                />
                <text
                  x={36}
                  y={14}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {activeCrosshair.price.toFixed(5)}
                </text>
              </g>
            )}

            {/* Time Axis Badge on Bottom */}
            {activeCrosshair.time !== null && (() => {
              const badgeText = formatBadgeTimeInTimezone(activeCrosshair.time, timeframe, timezone, timeFormat, showSeconds);
              const badgeWidth = Math.max(110, badgeText.length * 7.5 + 16);
              const badgeX = Math.max(10, Math.min(dimensions.width - badgeWidth - 20, activeCrosshair.screenX - badgeWidth / 2));
              return (
                <g
                  transform={`translate(${badgeX}, ${dimensions.height - 24})`}
                  data-testid="crosshair-time-badge"
                >
                  <rect
                    width={badgeWidth}
                    height={20}
                    rx={3}
                    fill="#1e222d"
                    stroke="#2a2e39"
                    strokeWidth={1}
                    className="shadow-lg"
                  />
                  <text
                    x={badgeWidth / 2}
                    y={14}
                    fill="#d1d4dc"
                    fontSize={10}
                    fontWeight="medium"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {badgeText}
                  </text>
                </g>
              );
            })()}
            {/* Replay Cut Bar Indicator when Selecting Cut Point with Mouse */}
            {isSelectingReplayCut && (
              <g className="replay-cut-indicator pointer-events-none select-none" data-testid="replay-cut-indicator">
                {/* Bright Red Vertical Cut Line */}
                <line
                  x1={activeCrosshair.screenX}
                  y1={0}
                  x2={activeCrosshair.screenX}
                  y2="100%"
                  stroke="#f23645"
                  strokeWidth={2}
                  strokeDasharray="4,4"
                />
                {/* Floating Cut Tooltip Banner */}
                <g transform={`translate(${Math.max(10, Math.min(dimensions.width - 290, activeCrosshair.screenX - 140))}, 24)`}>
                  <rect
                    width={280}
                    height={28}
                    rx={6}
                    fill="#1e222d"
                    stroke="#f23645"
                    strokeWidth={1.5}
                    className="shadow-2xl"
                  />
                  <text
                    x={140}
                    y={18}
                    fill="#f23645"
                    fontSize={11}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    ✂️ Click to Cut & Replay from {formatBadgeTimeInTimezone(activeCrosshair.time, timeframe, timezone)}
                  </text>
                </g>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* Replay Cut Active Banner */}
      {isSelectingReplayCut && (
        <div
          data-testid="replay-cut-banner"
          className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center space-x-3 bg-[#1e222d] px-4 py-2 rounded-lg border border-[#f23645] shadow-2xl z-30 font-sans text-xs pointer-events-auto"
        >
          <span className="text-[#f23645] font-bold flex items-center space-x-1.5">
            <span>✂️</span>
            <span>JUMP TO BAR: Hover and click any candle to erase all future data</span>
          </span>
          <button
            onClick={onCancelSelectReplayCut}
            className="px-2 py-0.5 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 hover:text-white text-[11px] font-semibold"
          >
            Cancel (Esc)
          </button>
        </div>
      )}



      {/* Floating Options Toolbar: ONLY rendered when explicitly activated via double-click, right-click, or touch-hold */}
      {selectedDrawing && activeToolbarDrawingId === selectedDrawing.id && (
        <DrawingToolbarPopup
          drawing={selectedDrawing}
          position={(() => {
            const isPos = selectedDrawing.type === 'long_position' || selectedDrawing.type === 'short_position';
            if (isPos && selectedDrawing.points.length >= 3) {
              const p0 = selectedDrawing.points[0].price;
              const p1 = selectedDrawing.points[1].price;
              const p2 = selectedDrawing.points[2].price;
              const maxP = Math.max(p0, p1, p2);
              const minT = Math.min(selectedDrawing.points[0].time, selectedDrawing.points.length >= 4 ? selectedDrawing.points[3].time : selectedDrawing.points[0].time);
              const maxT = Math.max(selectedDrawing.points[0].time, selectedDrawing.points.length >= 4 ? selectedDrawing.points[3].time : selectedDrawing.points[0].time);
              const midT = minT + (maxT - minT) / 2;
              return {
                x: transformer.timeToX(midT) ?? 200,
                y: transformer.priceToY(maxP) ?? 200,
              };
            }
            return {
              x: transformer.timeToX(selectedDrawing.points[0].time) ?? 200,
              y: transformer.priceToY(selectedDrawing.points[0].price) ?? 200,
            };
          })()}
          onUpdate={onUpdate}
          onDuplicate={onDuplicateDrawing || ((orig) => {
            const dupl: DrawingObject = {
              ...orig,
              id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              points: orig.points.map(p => ({ time: p.time + 300, price: p.price })),
              created_at: Date.now(),
              updated_at: Date.now(),
            };
            onAdd(dupl);
            onSelect(dupl.id);
            setActiveToolbarDrawingId(dupl.id);
            onShowToast?.(`Duplicated ${orig.type.replace('_', ' ')}`);
          })}
          onCopy={onCopyDrawing}
          onCut={onCutDrawing}
          onDelete={(id) => {
            setActiveToolbarDrawingId(null);
            onDelete(id);
          }}
          onOpenProperties={onOpenPropertiesModal}
          onClose={() => setActiveToolbarDrawingId(null)}
        />
      )}
    </div>
  );
};
