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
} from '../types';
import { DrawingEngine, CoordinateTransformer, ScreenPoint } from '../services/DrawingEngine';
import { DrawingToolbarPopup } from './DrawingToolbarPopup';
import { Check, X as CloseIcon } from 'lucide-react';

export interface MagnetSnapInfo {
  isSnapped: boolean;
  snapType?: 'High' | 'Low' | 'Open' | 'Close';
  candle?: Candle;
  screenX: number;
  screenY: number;
  time: number;
  price: number;
}

function formatBadgeTime(timeSec: number, tf: string): string {
  const d = new Date(timeSec * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const min = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');

  if (['1s', '5s', '15s', '30s'].includes(tf)) {
    return `${hh}:${min}:${ss}`;
  } else if (['1m', '3m', '5m', '15m', '30m', '45m', '1h', '2h', '4h'].includes(tf)) {
    return `${mm}/${dd} ${hh}:${min}`;
  } else {
    return `${yyyy}-${mm}-${dd}`;
  }
}

interface DrawingLayerProps {
  drawings: DrawingObject[];
  activeTool: DrawingToolType;
  transformer: CoordinateTransformer;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (d: DrawingObject) => void;
  onUpdate: (d: DrawingObject, persist?: boolean) => void;
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
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  // Crosshair & Magnet state
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 1000, height: 600 });
  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);
  const [activeCrosshair, setActiveCrosshair] = useState<MagnetSnapInfo | null>(null);

  // Drawing state
  const [inProgressDrawing, setInProgressDrawing] = useState<DrawingObject | null>(null);
  const [dragState, setDragState] = useState<{
    drawingId: string;
    pointIndex?: number;
    startMouse: ScreenPoint;
    initialPoints: Point[];
    initialLogicals?: number[];
    startLogical?: number;
    startPrice?: number;
  } | null>(null);

  // Dragging interactive trade setup lines ('entry' | 'sl' | 'tp')
  const [draggingSetupLine, setDraggingSetupLine] = useState<'entry' | 'sl' | 'tp' | null>(null);

  const selectedDrawing = drawings.find(d => d.id === selectedId) || null;
  const isDrawingToolActive = activeTool !== 'crosshair' && activeTool !== 'arrow';
  const isSingleClickTool = ['horizontal_line', 'vertical_line', 'horizontal_ray', 'price_label'].includes(activeTool);
  const isThreePointTool = ['parallel_channel', 'flat_top_bottom', 'disjoint_channel', 'triangle'].includes(activeTool);

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
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Refs for window drag listener to eliminate stale closures
  const dragStateRef = useRef<typeof dragState>(dragState);
  const draggingSetupLineRef = useRef<typeof draggingSetupLine>(draggingSetupLine);
  const drawingsRef = useRef<DrawingObject[]>(drawings);
  const activeSetupRef = useRef<DraggableTradeSetup | null | undefined>(activeSetup);
  const transformerRef = useRef<CoordinateTransformer>(transformer);

  useEffect(() => {
    dragStateRef.current = dragState;
  }, [dragState]);

  useEffect(() => {
    draggingSetupLineRef.current = draggingSetupLine;
  }, [draggingSetupLine]);

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
    const rawTime = trans.xToTime(screenX);
    const rawPrice = trans.yToPrice(screenY);
    const fallbackTime = rawTime ?? (cList.length > 0 ? cList[cList.length - 1].time : 0);
    const fallbackPrice = rawPrice ?? 1.0850;

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

  const getMouseCoord = (e: React.MouseEvent | MouseEvent): {
    x: number;
    y: number;
    time: number;
    price: number;
    snap: MagnetSnapInfo;
  } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

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
    if (!dragState && !draggingSetupLine) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const mouse = getMouseCoord(e);
      if (!mouse) return;

      // 1. Dragging Trade Setup Line
      if (draggingSetupLineRef.current && activeSetupRef.current && onUpdateSetup) {
        const rounded = Number(mouse.price.toFixed(5));
        if (draggingSetupLineRef.current === 'entry') {
          onUpdateSetup({ entryPrice: rounded });
        } else if (draggingSetupLineRef.current === 'sl') {
          onUpdateSetup({ slPrice: rounded });
        } else if (draggingSetupLineRef.current === 'tp') {
          onUpdateSetup({ tpPrice: rounded });
        }
        return;
      }

      // 2. Dragging Drawing Anchor Handle or Entire Object
      const currentDrag = dragStateRef.current;
      if (currentDrag) {
        const target = drawingsRef.current.find(d => d.id === currentDrag.drawingId);
        if (!target || target.locked) return;

        if (currentDrag.pointIndex !== undefined) {
          // Dragging specific anchor point (rotate/resize)
          const updatedPts = [...target.points];
          updatedPts[currentDrag.pointIndex] = { time: mouse.time, price: mouse.price };
          onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);
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

            onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);
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
              onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);
            }
          }
        }
      }
    };

    const handleWindowMouseUp = () => {
      if (dragStateRef.current) {
        const target = drawingsRef.current.find(d => d.id === dragStateRef.current?.drawingId);
        if (target) {
          onUpdate(target, true);
        }
        setDragState(null);
      }
      if (draggingSetupLineRef.current) {
        setDraggingSetupLine(null);
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [dragState !== null || draggingSetupLine !== null, onUpdate, onUpdateSetup]);

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

      if (entryY !== null && Math.abs(mouse.y - entryY) <= 12) {
        setDraggingSetupLine('entry');
        return;
      }
      if (slY !== null && Math.abs(mouse.y - slY) <= 12) {
        setDraggingSetupLine('sl');
        return;
      }
      if (tpY !== null && Math.abs(mouse.y - tpY) <= 12) {
        setDraggingSetupLine('tp');
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
      const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer, 12, selectedId);
      if (hit) {
        onSelect(hit.drawing.id);
        if (!hit.drawing.locked) {
          const rect = svgRef.current?.getBoundingClientRect();
          const rawX = e.clientX - (rect?.left || 0);
          const rawY = e.clientY - (rect?.top || 0);

          const currentTransformer = transformerRef.current;
          const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
          const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
          const initLogs = hit.drawing.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

          setDragState({
            drawingId: hit.drawing.id,
            pointIndex: hit.pointIndex,
            startMouse: { x: rawX, y: rawY },
            initialPoints: [...hit.drawing.points],
            initialLogicals: initLogs,
            startLogical: startLog ?? 0,
            startPrice: startP ?? 0,
          });
        }
      } else {
        onSelect(null);
      }
      return;
    }

    // 4. Start or advance drawing a new object
    if (isSingleClickTool) {
      const singleDrawing: DrawingObject = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: activeTool,
        timeframe,
        points: [{ time: mouse.time, price: mouse.price }],
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
      onAdd(singleDrawing);
      onSelect(singleDrawing.id);
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
          onUpdateSetup({ entryPrice: rounded });
        } else if (draggingSetupLine === 'sl') {
          onUpdateSetup({ slPrice: rounded });
        } else if (draggingSetupLine === 'tp') {
          onUpdateSetup({ tpPrice: rounded });
        }
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
            setInProgressDrawing(null);
            mouseDownPosRef.current = null;
            onResetTool();
          }
        }
        // If dist <= 8, it was a single click: leave inProgressDrawing active for click-to-click TV drawing!
      }
    }
  };

  // Render Draggable Trade Setup Lines (Entry, SL, TP)
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

    return (
      <g className="trade-setup-overlay pointer-events-auto select-none">
        {/* Shaded Profit Zone */}
        <rect
          x={0}
          y={minRewardY}
          width="100%"
          height={Math.max(1, maxRewardY - minRewardY)}
          fill="#089981"
          fillOpacity={0.15}
        />
        {/* Shaded Risk Zone */}
        <rect
          x={0}
          y={minRiskY}
          width="100%"
          height={Math.max(1, maxRiskY - minRiskY)}
          fill="#f23645"
          fillOpacity={0.15}
        />

        {/* 1. Take Profit Horizontal Line */}
        <line
          x1={0}
          y1={tpY}
          x2="100%"
          y2={tpY}
          stroke="#089981"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="cursor-ns-resize"
        />
        <g transform={`translate(16, ${tpY - 12})`} className="cursor-ns-resize">
          <rect
            width={280}
            height={24}
            rx={4}
            fill="#089981"
            className="shadow-lg"
          />
          <circle cx={10} cy={12} r={3} fill="#fff" />
          <text
            x={22}
            y={16}
            fill="#ffffff"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            TP: {activeSetup.tpPrice.toFixed(5)} (+{tpPips}p | +${activeSetup.rewardUsd.toFixed(2)})
          </text>
        </g>

        {/* 2. Entry Horizontal Line */}
        <line
          x1={0}
          y1={entryY}
          x2="100%"
          y2={entryY}
          stroke="#2962ff"
          strokeWidth={2.5}
          className="cursor-ns-resize"
        />
        <g transform={`translate(16, ${entryY - 12})`} className="cursor-ns-resize">
          <rect
            width={260}
            height={24}
            rx={4}
            fill="#2962ff"
            className="shadow-lg"
          />
          <circle cx={10} cy={12} r={3} fill="#fff" />
          <text
            x={22}
            y={16}
            fill="#ffffff"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            ENTRY ({activeSetup.type}): {activeSetup.entryPrice.toFixed(5)} [Drag to adjust]
          </text>
        </g>

        {/* 3. Stop Loss Horizontal Line */}
        <line
          x1={0}
          y1={slY}
          x2="100%"
          y2={slY}
          stroke="#f23645"
          strokeWidth={2}
          strokeDasharray="4,4"
          className="cursor-ns-resize"
        />
        <g transform={`translate(16, ${slY - 12})`} className="cursor-ns-resize">
          <rect
            width={280}
            height={24}
            rx={4}
            fill="#f23645"
            className="shadow-lg"
          />
          <circle cx={10} cy={12} r={3} fill="#fff" />
          <text
            x={22}
            y={16}
            fill="#ffffff"
            fontSize={11}
            fontWeight="bold"
            fontFamily="monospace"
          >
            SL: {activeSetup.slPrice.toFixed(5)} (-{slPips}p | -${activeSetup.riskUsd.toFixed(2)})
          </text>
        </g>

        {/* Central Risk / Reward Badge & Action Buttons */}
        <g transform={`translate(290, ${entryY - 16})`} className="pointer-events-auto">
          <rect
            width={380}
            height={32}
            rx={6}
            fill="#1e222d"
            stroke="#2a2e39"
            strokeWidth={1.5}
            className="shadow-xl"
          />
          <text
            x={12}
            y={20}
            fill="#fff"
            fontSize={11}
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            R:R 1 : {activeSetup.riskReward.toFixed(2)} | {activeSetup.lotSize} Lots
          </text>

          {/* Confirm Button directly on chart line */}
          <g
            transform="translate(230, 4)"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onConfirmSetup?.();
            }}
          >
            <rect width={75} height={24} rx={4} fill="#089981" />
            <text x={37} y={16} fill="#ffffff" fontSize={11} fontWeight="bold" textAnchor="middle">
              ✓ Confirm
            </text>
          </g>

          {/* Cancel Button directly on chart line */}
          <g
            transform="translate(310, 4)"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onCancelSetup?.();
            }}
          >
            <rect width={60} height={24} rx={4} fill="#2a2e39" stroke="#f23645" strokeWidth={1} />
            <text x={30} y={16} fill="#f23645" fontSize={11} fontWeight="bold" textAnchor="middle">
              ✕ Cancel
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
        opacity={isTemp ? 0.75 : 1}
        className={!isDrawingToolActive && !isTemp ? 'pointer-events-auto cursor-pointer' : undefined}
        onClick={(e) => {
          if (!isDrawingToolActive && !isTemp) {
            e.stopPropagation();
            onSelect(d.id);
          }
        }}
        onMouseDown={(e) => {
          if (!isDrawingToolActive && !isTemp && !d.locked) {
            e.stopPropagation();
            onSelect(d.id);
            const rect = svgRef.current?.getBoundingClientRect();
            const rawX = e.clientX - (rect?.left || 0);
            const rawY = e.clientY - (rect?.top || 0);

            const currentTransformer = transformerRef.current;
            const startLog = currentTransformer.xToLogical ? currentTransformer.xToLogical(rawX) : null;
            const startP = currentTransformer.yToPrice ? currentTransformer.yToPrice(rawY) : null;
            const initLogs = d.points.map(pt => currentTransformer.timeToLogical ? currentTransformer.timeToLogical(pt.time) ?? 0 : 0);

            setDragState({
              drawingId: d.id,
              startMouse: { x: rawX, y: rawY },
              initialPoints: [...d.points],
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
              className="cursor-move pointer-events-auto"
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
                className="cursor-move pointer-events-auto"
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
                className="cursor-move pointer-events-auto"
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
                className="cursor-move pointer-events-auto"
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
              className="cursor-move pointer-events-auto"
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
              className="cursor-move pointer-events-auto"
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
              className="cursor-move pointer-events-auto"
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
        {d.type === 'fib_retracement' && screenPts.length >= 2 && (
          <g>
            {[
              { ratio: 0.0, col: '#787b86' },
              { ratio: 0.236, col: '#f23645' },
              { ratio: 0.382, col: '#ff9800' },
              { ratio: 0.5, col: '#089981' },
              { ratio: 0.618, col: '#2962ff' },
              { ratio: 0.786, col: '#9c27b0' },
              { ratio: 1.0, col: '#787b86' },
            ].map((fib) => {
              const p1 = d.points[0].price;
              const p2 = d.points[1].price;
              const levelPrice = p1 + fib.ratio * (p2 - p1);
              const y = transformer.priceToY(levelPrice) ?? -9999;
              const minX = Math.min(screenPts[0].x, screenPts[1].x);
              const maxX = Math.max(screenPts[0].x, screenPts[1].x) + 160;

              return (
                <g key={fib.ratio}>
                  <line
                    x1={minX}
                    y1={y}
                    x2={maxX}
                    y2={y}
                    stroke={fib.col}
                    strokeWidth={1}
                    strokeDasharray={fib.ratio === 0.5 ? undefined : '3,3'}
                  />
                  <text
                    x={maxX + 5}
                    y={y + 3}
                    fill={fib.col}
                    fontSize={10}
                    fontFamily="monospace"
                  >
                    {fib.ratio.toFixed(3)} ({levelPrice.toFixed(5)})
                  </text>
                </g>
              );
            })}
          </g>
        )}

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
              className="cursor-move pointer-events-auto"
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
              className="cursor-move pointer-events-auto"
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

        {/* Long Position Analysis Tool */}
        {d.type === 'long_position' && screenPts.length >= 2 && (() => {
          const minX = Math.min(screenPts[0].x, screenPts[1].x);
          const maxX = Math.max(screenPts[0].x, screenPts[1].x);
          const width = Math.max(30, maxX - minX);
          const entryPrice = d.points[0].price;
          const tpPrice = d.points[1].price;
          const slPrice = d.properties.slPrice ?? Number((entryPrice - (tpPrice - entryPrice) / 2).toFixed(5));

          const entryY = screenPts[0].y;
          const tpY = screenPts[1].y;
          const slY = transformer.priceToY(slPrice) ?? entryY + (entryY - tpY);

          const tpPips = (Math.abs(tpPrice - entryPrice) / 0.0001).toFixed(1);
          const slPips = (Math.abs(entryPrice - slPrice) / 0.0001).toFixed(1);
          const rr = (parseFloat(slPips) > 0 ? (parseFloat(tpPips) / parseFloat(slPips)).toFixed(2) : '2.00');

          return (
            <g>
              {/* Target Area (Green) */}
              <rect
                x={minX}
                y={Math.min(entryY, tpY)}
                width={width}
                height={Math.abs(tpY - entryY)}
                fill="#089981"
                fillOpacity={0.2}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop Area (Red) */}
              <rect
                x={minX}
                y={Math.min(entryY, slY)}
                width={width}
                height={Math.abs(slY - entryY)}
                fill="#f23645"
                fillOpacity={0.2}
                stroke="#f23645"
                strokeWidth={1}
              />
              {/* Entry Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#2962ff"
                strokeWidth={2}
              />
              {/* Central Badge */}
              <rect
                x={minX + 6}
                y={Math.min(entryY, tpY) + 6}
                width={160}
                height={20}
                rx={3}
                fill="#1e222d"
                stroke="#2a2e39"
              />
              <text
                x={minX + 12}
                y={Math.min(entryY, tpY) + 20}
                fill="#089981"
                fontSize={10}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                Target: +{tpPips}p | R:R {rr}
              </text>
            </g>
          );
        })()}

        {/* Short Position Analysis Tool */}
        {d.type === 'short_position' && screenPts.length >= 2 && (() => {
          const minX = Math.min(screenPts[0].x, screenPts[1].x);
          const maxX = Math.max(screenPts[0].x, screenPts[1].x);
          const width = Math.max(30, maxX - minX);
          const entryPrice = d.points[0].price;
          const tpPrice = d.points[1].price;
          const slPrice = d.properties.slPrice ?? Number((entryPrice + (entryPrice - tpPrice) / 2).toFixed(5));

          const entryY = screenPts[0].y;
          const tpY = screenPts[1].y;
          const slY = transformer.priceToY(slPrice) ?? entryY - (tpY - entryY);

          const tpPips = (Math.abs(entryPrice - tpPrice) / 0.0001).toFixed(1);
          const slPips = (Math.abs(slPrice - entryPrice) / 0.0001).toFixed(1);
          const rr = (parseFloat(slPips) > 0 ? (parseFloat(tpPips) / parseFloat(slPips)).toFixed(2) : '2.00');

          return (
            <g>
              {/* Target Area (Green) */}
              <rect
                x={minX}
                y={Math.min(entryY, tpY)}
                width={width}
                height={Math.abs(tpY - entryY)}
                fill="#089981"
                fillOpacity={0.2}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop Area (Red) */}
              <rect
                x={minX}
                y={Math.min(entryY, slY)}
                width={width}
                height={Math.abs(slY - entryY)}
                fill="#f23645"
                fillOpacity={0.2}
                stroke="#f23645"
                strokeWidth={1}
              />
              {/* Entry Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#2962ff"
                strokeWidth={2}
              />
              <rect
                x={minX + 6}
                y={Math.min(entryY, tpY) + 6}
                width={160}
                height={20}
                rx={3}
                fill="#1e222d"
                stroke="#2a2e39"
              />
              <text
                x={minX + 12}
                y={Math.min(entryY, tpY) + 20}
                fill="#089981"
                fontSize={10}
                fontWeight="bold"
                fontFamily="sans-serif"
              >
                Target: +{tpPips}p | R:R {rr}
              </text>
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
          screenPts.map((pt, idx) => (
            <g key={idx}>
              {/* Anchor handle hit target: 14x14 circular target */}
              <circle
                cx={pt.x}
                cy={pt.y}
                r={7}
                fill="transparent"
                className="pointer-events-auto cursor-crosshair"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = svgRef.current?.getBoundingClientRect();
                  const rawX = e.clientX - (rect?.left || 0);
                  const rawY = e.clientY - (rect?.top || 0);
                  setDragState({
                    drawingId: d.id,
                    pointIndex: idx,
                    startMouse: { x: rawX, y: rawY },
                    initialPoints: [...d.points],
                  });
                }}
              />
              {/* Visible anchor handle (8x8 white box with blue stroke) */}
              <rect
                x={pt.x - 4}
                y={pt.y - 4}
                width={8}
                height={8}
                fill="#ffffff"
                stroke="#2962ff"
                strokeWidth={1.5}
                className="pointer-events-none shadow"
              />
            </g>
          ))}
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
        className={`w-full h-full select-none ${
          isSelectingReplayCut || isDrawingToolActive || inProgressDrawing || dragState !== null || draggingSetupLine !== null
            ? 'pointer-events-auto cursor-crosshair'
            : 'pointer-events-none'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={(e) => {
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
                }
              } else {
                onSelect(null);
              }
            }
          }
        }}
        onContextMenu={(e) => {
          if (inProgressDrawing) {
            e.preventDefault();
            setInProgressDrawing(null);
            onResetTool();
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

        {/* Drawings */}
        {drawings.map(d => renderDrawing(d))}
        {inProgressDrawing && renderDrawing(inProgressDrawing, true)}

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
                <g transform={`translate(${activeCrosshair.screenX + 10}, ${activeCrosshair.screenY - 10})`}>
                  <rect
                    width={22}
                    height={16}
                    rx={3}
                    fill="#1e222d"
                    stroke="#2962ff"
                    strokeWidth={1}
                    className="shadow-md"
                  />
                  <text
                    x={11}
                    y={12}
                    fill="#38bdf8"
                    fontSize={10}
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {activeCrosshair.snapType === 'High' ? 'H' : activeCrosshair.snapType === 'Low' ? 'L' : activeCrosshair.snapType === 'Open' ? 'O' : 'C'}
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
            {activeCrosshair.time !== null && (
              <g
                transform={`translate(${Math.max(10, Math.min(dimensions.width - 130, activeCrosshair.screenX - 55))}, ${dimensions.height - 24})`}
                data-testid="crosshair-time-badge"
              >
                <rect
                  width={110}
                  height={20}
                  rx={3}
                  fill="#1e222d"
                  stroke="#2a2e39"
                  strokeWidth={1}
                  className="shadow-lg"
                />
                <text
                  x={55}
                  y={14}
                  fill="#d1d4dc"
                  fontSize={10}
                  fontWeight="medium"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {formatBadgeTime(activeCrosshair.time, timeframe)}
                </text>
              </g>
            )}
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
                    ✂️ Click to Cut & Replay from {formatBadgeTime(activeCrosshair.time, timeframe)}
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

      {/* On-Chart Action Buttons for Active Trade Setup */}
      {activeSetup && activeSetup.active && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39] shadow-2xl z-30 font-sans text-xs pointer-events-auto">
          <span className="text-gray-300 font-semibold px-2">
            Confirm {activeSetup.type} Setup:
          </span>
          <button
            onClick={onConfirmSetup}
            data-testid="confirm-order-btn"
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#089981] hover:bg-[#078570] text-white font-bold transition-colors shadow cursor-pointer"
          >
            <Check size={14} />
            <span>Confirm Order</span>
          </button>
          <button
            onClick={onCancelSetup}
            data-testid="cancel-order-btn"
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            <CloseIcon size={14} />
            <span>Cancel</span>
          </button>
        </div>
      )}

      {/* Floating Toolbar when object selected */}
      {selectedDrawing && (
        <DrawingToolbarPopup
          drawing={selectedDrawing}
          position={{
            x: transformer.timeToX(selectedDrawing.points[0].time) ?? 200,
            y: transformer.priceToY(selectedDrawing.points[0].price) ?? 200,
          }}
          onUpdate={onUpdate}
          onDuplicate={(orig) => {
            const dupl: DrawingObject = {
              ...orig,
              id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              points: orig.points.map(p => ({ time: p.time + 300, price: p.price })),
              created_at: Date.now(),
              updated_at: Date.now(),
            };
            onAdd(dupl);
            onSelect(dupl.id);
          }}
          onDelete={onDelete}
        />
      )}
    </div>
  );
};
