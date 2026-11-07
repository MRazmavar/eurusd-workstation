/**
 * Interactive SVG Drawing Overlay for TradingView-style technical analysis tools
 * and Draggable Trade Setup Lines (Entry, Stop Loss, Take Profit).
 */
import React, { useState, useRef } from 'react';
import {
  DrawingObject,
  DrawingToolType,
  Point,
  Candle,
  DraggableTradeSetup,
} from '../types';
import { DrawingEngine, CoordinateTransformer, ScreenPoint } from '../services/DrawingEngine';
import { DrawingToolbarPopup } from './DrawingToolbarPopup';
import { Check, X as CloseIcon } from 'lucide-react';

interface DrawingLayerProps {
  drawings: DrawingObject[];
  activeTool: DrawingToolType;
  transformer: CoordinateTransformer;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: (d: DrawingObject) => void;
  onUpdate: (d: DrawingObject) => void;
  onDelete: (id: string) => void;
  onResetTool: () => void;
  magnetMode: boolean;
  candles: Candle[];
  timeframe: string;
  activeSetup?: DraggableTradeSetup | null;
  onUpdateSetup?: (setup: Partial<DraggableTradeSetup>) => void;
  onConfirmSetup?: () => void;
  onCancelSetup?: () => void;
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
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Drawing state
  const [inProgressDrawing, setInProgressDrawing] = useState<DrawingObject | null>(null);
  const [dragState, setDragState] = useState<{
    drawingId: string;
    pointIndex?: number;
    startMouse: ScreenPoint;
    initialPoints: Point[];
  } | null>(null);

  // Dragging interactive trade setup lines ('entry' | 'sl' | 'tp')
  const [draggingSetupLine, setDraggingSetupLine] = useState<'entry' | 'sl' | 'tp' | null>(null);

  const selectedDrawing = drawings.find(d => d.id === selectedId) || null;

  // Snaps point to nearest OHLC if magnet mode is on
  const snapPrice = (time: number, price: number): { time: number; price: number } => {
    if (!magnetMode || candles.length === 0) return { time, price };
    let closest = candles[0];
    let minDiff = Math.abs(closest.time - time);
    for (const c of candles) {
      const diff = Math.abs(c.time - time);
      if (diff < minDiff) {
        minDiff = diff;
        closest = c;
      }
    }
    const levels = [closest.open, closest.high, closest.low, closest.close];
    let bestLevel = levels[0];
    let bestDist = Math.abs(price - bestLevel);
    for (const lvl of levels) {
      const d = Math.abs(price - lvl);
      if (d < bestDist) {
        bestDist = d;
        bestLevel = lvl;
      }
    }
    return { time: closest.time, price: bestLevel };
  };

  const getMouseCoord = (e: React.MouseEvent): { x: number; y: number; time: number; price: number } | null => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const t = transformer.xToTime(x);
    const p = transformer.yToPrice(y);
    if (t === null || p === null) return null;

    const snapped = snapPrice(t, p);
    return { x, y, time: snapped.time, price: snapped.price };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mouse = getMouseCoord(e);
    if (!mouse) return;

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

    // 3. Selection / Object Move
    if (activeTool === 'crosshair' || activeTool === 'arrow') {
      const hit = DrawingEngine.hitTest({ x: mouse.x, y: mouse.y }, drawings, transformer);
      if (hit) {
        onSelect(hit.drawing.id);
        if (!hit.drawing.locked) {
          setDragState({
            drawingId: hit.drawing.id,
            pointIndex: hit.pointIndex,
            startMouse: { x: mouse.x, y: mouse.y },
            initialPoints: [...hit.drawing.points],
          });
        }
      } else {
        onSelect(null);
      }
      return;
    }

    // 4. Start drawing a new object
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
      pts[1] = { time: mouse.time, price: mouse.price };
      setInProgressDrawing({ ...inProgressDrawing, points: pts });
      return;
    }

    if (dragState) {
      const target = drawings.find(d => d.id === dragState.drawingId);
      if (!target || target.locked) return;

      if (dragState.pointIndex !== undefined) {
        // Dragging a specific handle
        const updatedPts = [...target.points];
        updatedPts[dragState.pointIndex] = { time: mouse.time, price: mouse.price };
        onUpdate({ ...target, points: updatedPts, updated_at: Date.now() });
      } else {
        // Dragging entire body
        const startT = transformer.xToTime(dragState.startMouse.x);
        const startP = transformer.yToPrice(dragState.startMouse.y);
        if (startT !== null && startP !== null) {
          const dt = mouse.time - startT;
          const dp = mouse.price - startP;
          const updatedPts = dragState.initialPoints.map(p => ({
            time: p.time + dt,
            price: Number((p.price + dp).toFixed(5)),
          }));
          onUpdate({ ...target, points: updatedPts, updated_at: Date.now() });
        }
      }
    }
  };

  const handleMouseUp = () => {
    if (draggingSetupLine) {
      setDraggingSetupLine(null);
    }
    if (inProgressDrawing) {
      onAdd(inProgressDrawing);
      onSelect(inProgressDrawing.id);
      setInProgressDrawing(null);
      onResetTool();
    }
    if (dragState) {
      setDragState(null);
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
        <g transform={`translate(320, ${entryY - 16})`}>
          <rect
            width={240}
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
      <g key={d.id} opacity={isTemp ? 0.7 : 1}>
        {/* Trendline */}
        {d.type === 'trendline' && screenPts.length >= 2 && (
          <line
            x1={screenPts[0].x}
            y1={screenPts[0].y}
            x2={screenPts[1].x}
            y2={screenPts[1].y}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
          />
        )}

        {/* Ray */}
        {d.type === 'ray' && screenPts.length >= 2 && (() => {
          const dx = screenPts[1].x - screenPts[0].x;
          const dy = screenPts[1].y - screenPts[0].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const scale = len > 0 ? 3000 / len : 1;
          return (
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[0].x + dx * scale}
              y2={screenPts[0].y + dy * scale}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          );
        })()}

        {/* Extended Line */}
        {d.type === 'extended_line' && screenPts.length >= 2 && (() => {
          const dx = screenPts[1].x - screenPts[0].x;
          const dy = screenPts[1].y - screenPts[0].y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const scale = len > 0 ? 3000 / len : 1;
          return (
            <line
              x1={screenPts[0].x - dx * scale}
              y1={screenPts[0].y - dy * scale}
              x2={screenPts[1].x + dx * scale}
              y2={screenPts[1].y + dy * scale}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
          );
        })()}

        {/* Trend Angle */}
        {d.type === 'trend_angle' && screenPts.length >= 2 && (() => {
          const angle = (Math.atan2(screenPts[1].y - screenPts[0].y, screenPts[1].x - screenPts[0].x) * 180) / Math.PI;
          return (
            <>
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
            </>
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
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
            />
            <circle cx={screenPts[0].x} cy={screenPts[0].y} r={3} fill={color} />
          </g>
        )}

        {/* Vertical Line */}
        {d.type === 'vertical_line' && screenPts.length >= 1 && (
          <line
            x1={screenPts[0].x}
            y1={0}
            x2={screenPts[0].x}
            y2={3000}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
          />
        )}

        {/* Parallel Channel / Disjoint Channel / Regression Trend */}
        {['parallel_channel', 'regression_trend', 'flat_top_bottom', 'disjoint_channel'].includes(d.type) && screenPts.length >= 2 && (
          <g>
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y}
              x2={screenPts[1].x}
              y2={screenPts[1].y}
              stroke={color}
              strokeWidth={strokeWidth}
            />
            <line
              x1={screenPts[0].x}
              y1={screenPts[0].y + 45}
              x2={screenPts[1].x}
              y2={screenPts[1].y + 45}
              stroke={color}
              strokeWidth={strokeWidth}
              strokeDasharray="4,4"
            />
            <polygon
              points={`${screenPts[0].x},${screenPts[0].y} ${screenPts[1].x},${screenPts[1].y} ${screenPts[1].x},${screenPts[1].y + 45} ${screenPts[0].x},${screenPts[0].y + 45}`}
              fill={color}
              fillOpacity={0.12}
            />
          </g>
        )}

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
          const p3 = { x: screenPts[0].x, y: screenPts[1].y };
          return (
            <polygon
              points={`${screenPts[0].x},${screenPts[0].y} ${screenPts[1].x},${screenPts[1].y} ${p3.x},${p3.y}`}
              fill={color}
              fillOpacity={0.15}
              stroke={color}
              strokeWidth={strokeWidth}
            />
          );
        })()}

        {/* Arrow Line */}
        {d.type === 'arrow' && screenPts.length >= 2 && (
          <line
            x1={screenPts[0].x}
            y1={screenPts[0].y}
            x2={screenPts[1].x}
            y2={screenPts[1].y}
            stroke={color}
            strokeWidth={strokeWidth}
            markerEnd="url(#arrowhead)"
          />
        )}

        {/* Polyline / Path */}
        {['polyline', 'path'].includes(d.type) && screenPts.length >= 2 && (
          <polyline
            points={screenPts.map(pt => `${pt.x},${pt.y}`).join(' ')}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
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

        {/* Selection Handles */}
        {isSelected &&
          !d.locked &&
          screenPts.map((pt, idx) => (
            <rect
              key={idx}
              x={pt.x - 4}
              y={pt.y - 4}
              width={8}
              height={8}
              fill="#ffffff"
              stroke="#2962ff"
              strokeWidth={2}
              className="cursor-pointer"
            />
          ))}
      </g>
    );
  };

  return (
    <div className="absolute inset-0 pointer-events-auto overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
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
      </svg>

      {/* On-Chart Action Buttons for Active Trade Setup */}
      {activeSetup && activeSetup.active && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-[#1e222d] p-1.5 rounded-lg border border-[#2a2e39] shadow-2xl z-30 font-sans text-xs">
          <span className="text-gray-300 font-semibold px-2">
            Confirm {activeSetup.type} Setup:
          </span>
          <button
            onClick={onConfirmSetup}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#089981] hover:bg-[#078570] text-white font-bold transition-colors shadow"
          >
            <Check size={14} />
            <span>Confirm Order</span>
          </button>
          <button
            onClick={onCancelSetup}
            className="flex items-center space-x-1 px-3 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 hover:text-white font-medium transition-colors"
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
