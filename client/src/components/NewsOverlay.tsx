/**
 * Forex Factory Economic Calendar & News Events Overlay on Chart Canvas.
 * Renders interactive High Impact (Red) and Medium Impact (Yellow) event markers,
 * release candle vertical guide lines, and detailed Forex Factory event cards.
 */
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Folder,
  Flame,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { EconomicNewsEvent, NewsImpact } from '../types';
import { CoordinateTransformer } from '../services/DrawingEngine';
import { formatTimeInTimezone, getTimezoneAbbr } from '../utils/timezone';
import { NEWS_IMPACT_THEMES } from '../utils/economicNews';

interface NewsOverlayProps {
  events: EconomicNewsEvent[];
  visible: boolean;
  filter: 'ALL' | 'HIGH_ONLY';
  transformer: CoordinateTransformer;
  timezone: string;
  replayActive?: boolean;
  currentReplayTimestamp?: number | null;
}

interface ClusteredNewsEvents {
  key: string;
  time: number;
  currency: 'USD' | 'EUR';
  highestImpact: NewsImpact;
  events: EconomicNewsEvent[];
}

export const NewsOverlay: React.FC<NewsOverlayProps> = ({
  events,
  visible,
  filter,
  transformer,
  timezone,
  replayActive,
  currentReplayTimestamp,
}) => {
  const [hoveredClusterKey, setHoveredClusterKey] = useState<string | null>(null);
  const [pinnedClusterKey, setPinnedClusterKey] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Close pinned card on click outside
  useEffect(() => {
    if (!pinnedClusterKey) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setPinnedClusterKey(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [pinnedClusterKey]);

  // Filter events according to user preference and replay cut-off
  const filteredEvents = useMemo(() => {
    if (!visible) return [];
    return events.filter((ev) => {
      if (filter === 'HIGH_ONLY' && ev.impact !== 'HIGH') {
        return false;
      }
      // In Bar Replay, show events on visible historical candles (up to replay candle + 1 day)
      if (replayActive && currentReplayTimestamp) {
        if (ev.time > currentReplayTimestamp + 86400 * 2) {
          return false;
        }
      }
      return true;
    });
  }, [events, visible, filter, replayActive, currentReplayTimestamp]);

  // Cluster events that happen at the exact same timestamp (e.g. NFP + Unemployment Rate)
  const clusteredEvents = useMemo(() => {
    const map = new Map<number, EconomicNewsEvent[]>();
    filteredEvents.forEach((ev) => {
      const bucket = map.get(ev.time) || [];
      bucket.push(ev);
      map.set(ev.time, bucket);
    });

    const clusters: ClusteredNewsEvents[] = [];
    map.forEach((bucket, time) => {
      const hasHigh = bucket.some(b => b.impact === 'HIGH');
      clusters.push({
        key: `cluster_${time}_${bucket[0].id}`,
        time,
        currency: bucket[0].currency,
        highestImpact: hasHigh ? 'HIGH' : 'MEDIUM',
        events: bucket,
      });
    });

    return clusters;
  }, [filteredEvents]);

  if (!visible || clusteredEvents.length === 0) {
    return null;
  }

  const activeClusterKey = pinnedClusterKey || hoveredClusterKey;
  const activeCluster = clusteredEvents.find(c => c.key === activeClusterKey);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none font-sans">
      {/* 1. SVG Layer for Vertical Event Guide Lines */}
      <svg className="w-full h-full pointer-events-none">
        {clusteredEvents.map((cluster) => {
          const x = transformer.timeToX(cluster.time);
          if (x === null || x < -50 || x > 2500) return null;

          const isHigh = cluster.highestImpact === 'HIGH';
          const isHovered = cluster.key === activeClusterKey;
          const strokeColor = isHigh ? '#ef4444' : '#f59e0b';

          return (
            <g key={`line_${cluster.key}`} className="pointer-events-none">
              <line
                x1={x}
                y1={0}
                x2={x}
                y2="100%"
                stroke={strokeColor}
                strokeWidth={isHovered ? 2 : 1}
                strokeDasharray={isHovered ? '2,2' : '4,4'}
                opacity={isHovered ? 0.85 : (isHigh ? 0.35 : 0.25)}
              />
            </g>
          );
        })}
      </svg>

      {/* 2. HTML Layer for Forex Factory Event Badges along bottom axis */}
      <div className="absolute bottom-6 left-0 right-14 h-9 pointer-events-none">
        {clusteredEvents.map((cluster) => {
          const x = transformer.timeToX(cluster.time);
          if (x === null || x < -30 || x > 2500) return null;

          const isHigh = cluster.highestImpact === 'HIGH';
          const isSelected = cluster.key === activeClusterKey;
          const eventCount = cluster.events.length;
          const firstTitle = cluster.events[0].title;
          const shortCode = firstTitle.includes('NFP')
            ? 'NFP'
            : firstTitle.includes('CPI')
            ? 'CPI'
            : firstTitle.includes('FOMC')
            ? 'FOMC'
            : firstTitle.includes('ECB')
            ? 'ECB'
            : firstTitle.includes('Claims')
            ? 'CLAIMS'
            : cluster.currency;

          return (
            <div
              key={cluster.key}
              style={{
                left: `${x}px`,
                transform: 'translateX(-50%)',
              }}
              data-testid={`news-badge-${cluster.events[0].id}`}
              className={`absolute bottom-0 pointer-events-auto ${isSelected ? 'z-30' : isHigh ? 'z-20' : 'z-10'} hover:z-40`}
            >
              <button
                type="button"
                onClick={() => setPinnedClusterKey(prev => (prev === cluster.key ? null : cluster.key))}
                onMouseEnter={() => setHoveredClusterKey(cluster.key)}
                onMouseLeave={() => setHoveredClusterKey(null)}
                className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg transition-transform hover:scale-110 active:scale-95 border ${
                  isHigh
                    ? isSelected
                      ? 'bg-[#dc2626] text-white border-white ring-2 ring-red-400'
                      : 'bg-[#dc2626] text-white border-[#f87171] hover:bg-[#b91c1c]'
                    : isSelected
                    ? 'bg-[#d97706] text-black border-white ring-2 ring-amber-400'
                    : 'bg-[#f59e0b] text-black border-[#fbbf24] hover:bg-[#d97706]'
                }`}
                title={`Forex Factory: ${cluster.events.map(e => e.title).join(', ')} (${isHigh ? 'Red High Impact' : 'Yellow Medium Impact'})`}
              >
                <Folder size={11} className={isHigh ? 'fill-white text-white' : 'fill-black text-black'} />
                <span className="font-mono text-[9px] uppercase tracking-tight">{cluster.currency}</span>
                {eventCount > 1 ? (
                  <span className={`text-[8px] px-1 rounded-full ${isHigh ? 'bg-black/40 text-white' : 'bg-black text-amber-300'}`}>
                    {eventCount}
                  </span>
                ) : (
                  <span className="text-[8px] opacity-90">{shortCode}</span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* 3. Detailed Forex Factory News Card Popover */}
      {activeCluster && (() => {
        const x = transformer.timeToX(activeCluster.time);
        if (x === null) return null;

        const isHigh = activeCluster.highestImpact === 'HIGH';
        const formattedTime = formatTimeInTimezone(activeCluster.time, timezone, true);
        const tzAbbr = getTimezoneAbbr(timezone);

        // Keep card inside bounds
        const safeX = Math.max(160, Math.min(window.innerWidth - 200, x));

        return (
          <div
            ref={cardRef}
            data-testid="news-card-popover"
            style={{
              left: `${safeX}px`,
              bottom: '50px',
              transform: 'translateX(-50%)',
            }}
            className="absolute pointer-events-auto z-40 w-80 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden font-sans text-xs animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Header Banner */}
            <div
              className={`px-3 py-2 flex items-center justify-between text-white ${
                isHigh ? 'bg-gradient-to-r from-red-700 to-rose-600' : 'bg-gradient-to-r from-amber-600 to-yellow-600'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Folder size={14} className="fill-white" />
                <span className="font-bold text-[11px] tracking-wide uppercase">
                  Forex Factory • {isHigh ? 'Red (High Impact)' : 'Yellow (Medium Impact)'}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="bg-black/30 text-white text-[10px] font-mono px-1.5 py-0.5 rounded font-bold">
                  {activeCluster.currency}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPinnedClusterKey(null);
                    setHoveredClusterKey(null);
                  }}
                  className="text-white/80 hover:text-white p-0.5"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-3 space-y-2.5 max-h-80 overflow-y-auto">
              {/* Event Time */}
              <div className="flex items-center justify-between text-[11px] text-gray-400 border-b border-[#2a2e39] pb-1.5 font-mono">
                <span className="flex items-center space-x-1">
                  <Clock size={11} className="text-gray-400" />
                  <span>{formattedTime}</span>
                </span>
                <span className="text-[10px] bg-[#131722] text-[#2962ff] px-1.5 py-0.5 rounded font-semibold">
                  {tzAbbr}
                </span>
              </div>

              {/* Individual Event Rows */}
              {activeCluster.events.map((ev, idx) => (
                <div key={ev.id} className={idx > 0 ? 'pt-2 border-t border-[#2a2e39]/60' : ''}>
                  <div className="font-bold text-gray-100 text-xs flex items-center justify-between mb-1">
                    <span>{ev.title}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                        ev.impact === 'HIGH' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {ev.impact}
                    </span>
                  </div>

                  {/* Actual / Forecast / Previous Data Grid */}
                  <div className="grid grid-cols-3 gap-1 bg-[#131722] p-2 rounded border border-[#2a2e39]/80 text-center font-mono text-[11px] my-1.5">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-sans font-semibold">Actual</span>
                      <span
                        className={`font-bold ${
                          ev.actual
                            ? ev.sentiment === 'BULLISH'
                              ? 'text-[#089981]'
                              : ev.sentiment === 'BEARISH'
                              ? 'text-[#f23645]'
                              : 'text-white'
                            : 'text-gray-500 italic'
                        }`}
                      >
                        {ev.actual || 'Pending'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-sans font-semibold">Forecast</span>
                      <span className="text-gray-300">{ev.forecast || '--'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-sans font-semibold">Previous</span>
                      <span className="text-gray-400">{ev.previous || '--'}</span>
                    </div>
                  </div>

                  {/* Market Effect & Description */}
                  {ev.sentiment && (
                    <div className="flex items-center space-x-1.5 text-[10px] mt-1 text-gray-300">
                      {ev.sentiment === 'BULLISH' ? (
                        <TrendingUp size={12} className="text-[#089981]" />
                      ) : (
                        <TrendingDown size={12} className="text-[#f23645]" />
                      )}
                      <span>
                        EUR/USD Expected Bias:{' '}
                        <span className={ev.sentiment === 'BULLISH' ? 'text-[#089981] font-bold' : 'text-[#f23645] font-bold'}>
                          {ev.sentiment}
                        </span>
                      </span>
                    </div>
                  )}

                  {ev.description && (
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                      {ev.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 bg-[#131722]/80 border-t border-[#2a2e39] text-[9px] text-gray-400 flex items-center justify-between">
              <span>Source: Forex Factory Economic Calendar</span>
              <span className="text-gray-400">Click to pin card</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
