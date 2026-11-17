/**
 * Main Chart Container powered by TradingView Lightweight Charts v5.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  LineStyle,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  ColorType,
  Time,
} from 'lightweight-charts';
import { Candle, ChartType, IndicatorConfig, Quote } from '../types';
import { CoordinateTransformer } from '../services/DrawingEngine';
import { IndicatorEngine } from '../services/IndicatorEngine';
import { Globe, Clock, ChevronsRight } from 'lucide-react';
import {
  TIMEZONE_OPTIONS,
  TIME_FORMAT_OPTIONS,
  getTimezoneAbbr,
  formatTimeInTimezone,
  formatTickMarkInTimezone,
  getTimeframeSeconds,
} from '../utils/timezone';

interface ChartContainerProps {
  candles: Candle[];
  chartType: ChartType;
  indicators: IndicatorConfig[];
  timeframe: string;
  quote: Quote | null;
  isDrawingToolActive?: boolean;
  onTransformerReady: (t: CoordinateTransformer) => void;
  onCrosshairMove?: (param: { time?: number; price?: number; candle?: Candle }) => void;
  onChartInstanceReady?: (instance: {
    fitContent: () => void;
    resetScale: () => void;
    centerOnLastCandle?: () => void;
    centerOnTimestamp?: (timestamp: number) => void;
    getVisibleCenterTime?: () => number | null;
  }) => void;
  onChartClick?: (point: { x: number; y: number }) => void;
  hoveredCandleOverride?: Candle | null;
  centerTrigger?: number;
  anchorTimestamp?: number | null;
  isReplayActive?: boolean;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
  timeFormat?: string;
  showSeconds?: boolean;
  onTimeFormatChange?: (format: string, showSeconds?: boolean) => void;
  onLoadOlderData?: () => void;
  isLoadingOlder?: boolean;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  chartType,
  indicators,
  timeframe,
  quote,
  isDrawingToolActive = false,
  onTransformerReady,
  onCrosshairMove,
  onChartInstanceReady,
  onChartClick,
  hoveredCandleOverride,
  centerTrigger,
  anchorTimestamp = null,
  isReplayActive = false,
  timezone = 'UTC',
  onTimezoneChange,
  timeFormat = 'adaptive',
  showSeconds = false,
  onTimeFormatChange,
  onLoadOlderData,
  isLoadingOlder = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const askPriceLineRef = useRef<IPriceLine | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const candlesRef = useRef<Candle[]>(candles);
  const onChartClickRef = useRef(onChartClick);
  const timeframeRef = useRef(timeframe);
  const restoredTfMapRef = useRef<{ [tf: string]: boolean }>({});
  const isReplayActiveRef = useRef(isReplayActive);
  const anchorTimestampRef = useRef(anchorTimestamp);
  const onLoadOlderDataRef = useRef(onLoadOlderData);
  const isLoadingOlderRef = useRef(isLoadingOlder);
  const prevFirstCandleTimeRef = useRef<number | null>(null);
  const prevCandlesCountRef = useRef<number>(0);
  const prevTimeframeRef = useRef<string>(timeframe);
  const currentDevelopingBarRef = useRef<{
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

  // Candle Countdown Timer (Time to Bar Close)
  const [countdownText, setCountdownText] = useState<string>('');
  const [countdownY, setCountdownY] = useState<number | null>(null);

  useEffect(() => {
    onLoadOlderDataRef.current = onLoadOlderData;
  }, [onLoadOlderData]);

  useEffect(() => {
    isLoadingOlderRef.current = isLoadingOlder;
  }, [isLoadingOlder]);

  useEffect(() => {
    isReplayActiveRef.current = isReplayActive;
  }, [isReplayActive]);

  useEffect(() => {
    anchorTimestampRef.current = anchorTimestamp;
  }, [anchorTimestamp]);

  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement | null>(null);
  const timezoneRef = useRef(timezone);

  useEffect(() => {
    timezoneRef.current = timezone;
  }, [timezone]);

  const [isTimeFormatDropdownOpen, setIsTimeFormatDropdownOpen] = useState(false);
  const timeFormatDropdownRef = useRef<HTMLDivElement | null>(null);
  const timeFormatRef = useRef(timeFormat);
  const showSecondsRef = useRef(showSeconds);

  useEffect(() => {
    timeFormatRef.current = timeFormat;
    showSecondsRef.current = showSeconds;
  }, [timeFormat, showSeconds]);

  // Listen for open-timeformat-dropdown custom event
  useEffect(() => {
    const handleOpenTimeFormat = () => {
      setIsTimeFormatDropdownOpen(true);
      setIsTzDropdownOpen(false);
    };
    window.addEventListener('open-timeformat-dropdown', handleOpenTimeFormat);
    return () => window.removeEventListener('open-timeformat-dropdown', handleOpenTimeFormat);
  }, []);

  // Native contextmenu listener on chart container in capture phase
  // Enables right-clicking anywhere on the bottom time axis to directly open Time Format dropdown
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleContextMenu = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const clickX = e.clientX - rect.left;
      // If right-clicked on the bottom time axis (bottom 30px before price scale)
      if (clickY >= rect.height - 30 && clickX < rect.width - 55) {
        e.preventDefault();
        e.stopPropagation();
        setIsTimeFormatDropdownOpen(true);
        setIsTzDropdownOpen(false);
      }
    };

    el.addEventListener('contextmenu', handleContextMenu, { capture: true });
    return () => el.removeEventListener('contextmenu', handleContextMenu, { capture: true });
  }, []);

  // TradingView-Style Scroll-To-Recent State
  const [isScrolledBack, setIsScrolledBack] = useState<boolean>(false);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!isTzDropdownOpen && !isTimeFormatDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setIsTzDropdownOpen(false);
      }
      if (timeFormatDropdownRef.current && !timeFormatDropdownRef.current.contains(e.target as Node)) {
        setIsTimeFormatDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isTzDropdownOpen, isTimeFormatDropdownOpen]);

  useEffect(() => {
    timeframeRef.current = timeframe;
  }, [timeframe]);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  useEffect(() => {
    onChartClickRef.current = onChartClick;
  }, [onChartClick]);

  const updateTransformer = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const series = seriesRef.current;

    // Helper to safely interpolate logical to coordinate (lightweight-charts returns 0 for non-integer logicals)
    const getLogicalCoord = (logical: number): number | null => {
      if (logical === undefined || logical === null || isNaN(logical)) return null;
      try {
        const lFloor = Math.floor(logical);
        const lCeil = Math.ceil(logical);
        if (lFloor === lCeil) {
          const c = chart.timeScale().logicalToCoordinate(lFloor as any);
          return (c !== null && !isNaN(c)) ? c : null;
        }
        const c1 = chart.timeScale().logicalToCoordinate(lFloor as any);
        const c2 = chart.timeScale().logicalToCoordinate(lCeil as any);
        if (c1 !== null && c2 !== null && !isNaN(c1) && !isNaN(c2)) {
          return c1 + (c2 - c1) * (logical - lFloor);
        }
        if (c1 !== null && !isNaN(c1)) return c1;
        if (c2 !== null && !isNaN(c2)) return c2;
        return null;
      } catch {
        return null;
      }
    };

    const transformer: CoordinateTransformer = {
      timeToX: (t: number) => {
        if (t === undefined || t === null || isNaN(t)) return null;
        try {
          const coord = chart.timeScale().timeToCoordinate(t as unknown as Time);
          if (coord !== null) return coord;

          // Extrapolate/interpolate using candles list
          const list = candlesRef.current;
          if (list && list.length > 0) {
            const len = list.length;
            if (len === 1) return getLogicalCoord(0);

            // Timeframe step determination: always use real timeframe duration
            const tfSec = getTimeframeSeconds(timeframeRef.current);

            if (t <= list[0].time) {
              const logIdx = (t - list[0].time) / tfSec;
              return getLogicalCoord(logIdx);
            } else if (t >= list[len - 1].time) {
              const logIdx = len - 1 + (t - list[len - 1].time) / tfSec;
              const coordAhead = getLogicalCoord(logIdx);
              if (coordAhead !== null && !isNaN(coordAhead)) {
                return coordAhead;
              }
              // Pixel-based extrapolation fallback so future/close boundaries never return 0 or null
              const lastCandleX = chart.timeScale().timeToCoordinate(list[len - 1].time as unknown as Time);
              const prevCandleX = len > 1 ? chart.timeScale().timeToCoordinate(list[len - 2].time as unknown as Time) : null;
              if (lastCandleX !== null && prevCandleX !== null && lastCandleX > prevCandleX) {
                const pxPerSec = (lastCandleX - prevCandleX) / tfSec;
                return lastCandleX + (t - list[len - 1].time) * pxPerSec;
              }
              return coordAhead;
            } else {
              // Binary search for surrounding bar
              let low = 0, high = len - 1;
              while (low <= high) {
                const mid = Math.floor((low + high) / 2);
                if (list[mid].time < t) low = mid + 1;
                else high = mid - 1;
              }
              const i = Math.max(0, Math.min(len - 2, high));
              const barDiff = Math.max(1, list[i + 1].time - list[i].time);
              const frac = (t - list[i].time) / barDiff;
              return getLogicalCoord(i + frac);
            }
          }
          return null;
        } catch {
          return null;
        }
      },
      priceToY: (p: number) => {
        if (p === undefined || p === null || isNaN(p) || !seriesRef.current) return null;
        try {
          return series.priceToCoordinate(p);
        } catch {
          return null;
        }
      },
      xToTime: (x: number) => {
        if (x === undefined || x === null || isNaN(x)) return null;
        try {
          const timeVal = chart.timeScale().coordinateToTime(x);
          if (typeof timeVal === 'number') return timeVal;

          // Fallback via logical index
          const logical = chart.timeScale().coordinateToLogical(x);
          const list = candlesRef.current;
          if (logical !== null && list && list.length > 0) {
            const len = list.length;
            if (len === 1) return list[0].time;
            const tfSec = getTimeframeSeconds(timeframeRef.current);
            if (logical >= 0 && logical < len) {
              const idx = Math.min(len - 1, Math.max(0, Math.round(logical)));
              return list[idx].time;
            } else if (logical >= len) {
              return Math.round(list[len - 1].time + (logical - (len - 1)) * tfSec);
            } else {
              return Math.round(list[0].time + logical * tfSec);
            }
          }
          return null;
        } catch {
          return null;
        }
      },
      yToPrice: (y: number) => {
        if (y === undefined || y === null || isNaN(y) || !seriesRef.current) return null;
        try {
          const directPrice = series.coordinateToPrice(y);
          if (directPrice !== null) return directPrice;

          // Extrapolate linearly if out-of-bounds (e.g. fast vertical swipe)
          const pTop = series.coordinateToPrice(10);
          const pBottom = series.coordinateToPrice(100);
          if (pTop !== null && pBottom !== null && pBottom !== pTop) {
            const pricePerPixel = (pBottom - pTop) / 90;
            return pTop + (y - 10) * pricePerPixel;
          }
          return null;
        } catch {
          return null;
        }
      },
      timeToLogical: (t: number) => {
        if (t === undefined || t === null || isNaN(t)) return null;
        const list = candlesRef.current;
        if (!list || list.length === 0) return null;
        const len = list.length;
        if (len === 1) return 0;
        const tfSec = getTimeframeSeconds(timeframeRef.current);
        if (t >= list[len - 1].time) {
          return len - 1 + (t - list[len - 1].time) / tfSec;
        }
        if (t <= list[0].time) {
          return (t - list[0].time) / tfSec;
        }
        let low = 0, high = len - 1;
        while (low <= high) {
          const mid = Math.floor((low + high) / 2);
          if (list[mid].time === t) return mid;
          if (list[mid].time < t) low = mid + 1;
          else high = mid - 1;
        }
        const i = Math.max(0, Math.min(len - 2, high));
        const barDiff = Math.max(1, list[i + 1].time - list[i].time);
        const frac = (t - list[i].time) / barDiff;
        return i + frac;
      },
      logicalToTime: (logical: number) => {
        if (logical === undefined || logical === null || isNaN(logical)) return null;
        const list = candlesRef.current;
        if (!list || list.length === 0) return null;
        const len = list.length;
        if (len === 1) return list[0].time;
        const tfSec = getTimeframeSeconds(timeframeRef.current);
        if (logical >= 0 && logical < len) {
          const idx = Math.min(len - 1, Math.max(0, Math.round(logical)));
          return list[idx].time;
        } else if (logical >= len) {
          return Math.round(list[len - 1].time + (logical - (len - 1)) * tfSec);
        } else {
          return Math.round(list[0].time + logical * tfSec);
        }
      },
      xToLogical: (x: number) => {
        if (x === undefined || x === null || isNaN(x)) return null;
        try {
          return chart.timeScale().coordinateToLogical(x as any);
        } catch {
          return null;
        }
      },
      logicalToX: (logical: number) => {
        return getLogicalCoord(logical);
      },
      getVisibleRange: () => {
        if (!chartRef.current) return null;
        try {
          const r = chartRef.current.timeScale().getVisibleRange();
          if (!r || !r.from || !r.to) return null;
          const from = typeof r.from === 'number' ? r.from : (r.from as any)?.timestamp;
          const to = typeof r.to === 'number' ? r.to : (r.to as any)?.timestamp;
          return (from && to) ? { from, to } : null;
        } catch {
          return null;
        }
      },
      isScrolledBack: () => {
        if (!chartRef.current) return false;
        try {
          const lr = chartRef.current.timeScale().getVisibleLogicalRange();
          const list = candlesRef.current;
          if (lr && list && list.length > 0) {
            return lr.to < (list.length - 1) - 2;
          }
        } catch {}
        return false;
      },
    };

    onTransformerReady(transformer);
  }, [onTransformerReady]);

  const centerOnLastCandle = useCallback(() => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const list = candlesRef.current;
    if (!list || list.length === 0) return;

    const lastIdx = list.length - 1;
    const leftBars = Math.min(45, Math.floor(lastIdx * 0.8));
    const rightBars = 25;
    const from = Math.max(0, lastIdx - leftBars);
    const to = lastIdx + rightBars;

    try {
      chart.timeScale().setVisibleLogicalRange({ from, to });
      chart.priceScale('right').applyOptions({ autoScale: true });
    } catch (e) {
      console.warn('Error centering on last candle:', e);
    }
    updateTransformer();
  }, [updateTransformer]);

  const handleScrollToRecent = useCallback(() => {
    centerOnLastCandle();
    setIsScrolledBack(false);
  }, [centerOnLastCandle]);

  const centerOnTimestamp = useCallback((targetTime: number) => {
    if (!chartRef.current || !seriesRef.current) return;
    const chart = chartRef.current;
    const list = candlesRef.current;
    if (!list || list.length === 0) return;

    let closestIdx = -1;
    let minDiff = Infinity;
    for (let i = 0; i < list.length; i++) {
      const diff = Math.abs(list[i].time - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    }

    if (closestIdx !== -1) {
      const leftBars = Math.min(45, Math.floor(closestIdx * 0.8));
      const rightBars = 25;
      const from = Math.max(0, closestIdx - leftBars);
      const to = closestIdx + rightBars;
      try {
        chart.timeScale().setVisibleLogicalRange({ from, to });
        chart.priceScale('right').applyOptions({ autoScale: true });
      } catch (e) {
        console.warn('Error centering on timestamp:', e);
      }
      updateTransformer();
    }
  }, [updateTransformer]);

  const getVisibleCenterTime = useCallback(() => {
    if (!chartRef.current) return null;
    try {
      const range = chartRef.current.timeScale().getVisibleRange();
      if (range && range.from && range.to) {
        const fromSec = typeof range.from === 'number' ? range.from : (range.from as any)?.timestamp;
        const toSec = typeof range.to === 'number' ? range.to : (range.to as any)?.timestamp;
        if (fromSec && toSec) {
          const list = candlesRef.current;
          if (list && list.length > 0) {
            const lastTime = list[list.length - 1].time;
            if (toSec >= lastTime - 60) {
              return null; // viewing live edge
            }
          }
          return Math.round((fromSec + toSec) / 2);
        }
      }
    } catch {}
    return null;
  }, []);

  // Respond to centerTrigger to center the last candle or anchor timestamp
  useEffect(() => {
    if (centerTrigger === undefined || centerTrigger === 0) return;
    const timer = setTimeout(() => {
      if (isReplayActiveRef.current) {
        centerOnLastCandle();
      } else if (anchorTimestampRef.current) {
        centerOnTimestamp(anchorTimestampRef.current);
      } else {
        centerOnLastCandle();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [centerTrigger, centerOnLastCandle, centerOnTimestamp]);

  // Create chart instance
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#131722' },
        textColor: '#d1d4dc',
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Trebuchet MS', Roboto, sans-serif",
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      crosshair: {
        vertLine: {
          color: '#787b86',
          width: 1,
          style: 3,
          visible: false,
        },
        horzLine: {
          color: '#787b86',
          width: 1,
          style: 3,
          visible: false,
        },
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      localization: {
        timeFormatter: (timestamp: number) => {
          const secVis = showSecondsRef.current || timeFormatRef.current.includes('sec');
          return formatTimeInTimezone(
            timestamp,
            timezoneRef.current,
            ['1d', '1w', '1mo'].includes(timeframeRef.current),
            timeFormatRef.current,
            secVis
          );
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: showSecondsRef.current || timeFormatRef.current.includes('sec'),
        shiftVisibleRangeOnNewBar: false,
        tickMarkFormatter: (time: any, tickMarkType: any) => {
          const tSec = typeof time === 'number' ? time : (time?.timestamp || 0);
          const secVis = showSecondsRef.current || timeFormatRef.current.includes('sec');
          return formatTickMarkInTimezone(tSec, tickMarkType, timezoneRef.current, timeFormatRef.current, secVis);
        },
      },
      handleScale: {
        mouseWheel: true,
        pinch: true,
        axisPressedMouseMove: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
    });

    chartRef.current = chart;
    if (typeof window !== 'undefined') {
      (window as any).__EURUSD_CHART__ = chart;
    }

    if (onChartInstanceReady) {
      onChartInstanceReady({
        fitContent: () => chart.timeScale().fitContent(),
        resetScale: () => chart.timeScale().resetTimeScale(),
        centerOnLastCandle: () => centerOnLastCandle(),
        centerOnTimestamp: (ts: number) => centerOnTimestamp(ts),
        getVisibleCenterTime: () => getVisibleCenterTime(),
      });
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        try {
          localStorage.setItem(`eurusd_logical_range_${timeframeRef.current}`, JSON.stringify(range));
        } catch {}

        if (range.from < 25 && onLoadOlderDataRef.current && !isLoadingOlderRef.current) {
          onLoadOlderDataRef.current();
        }

        const totalBars = candlesRef.current.length;
        if (totalBars > 0) {
          const targetIndex = totalBars - 1;
          const isBack = range.to < targetIndex - 1;
          setIsScrolledBack(isBack);
        }
      }
      updateTransformer();
    });

    chart.timeScale().subscribeVisibleTimeRangeChange((range) => {
      if (range && range.from && range.to) {
        try {
          localStorage.setItem(`eurusd_time_range_${timeframeRef.current}`, JSON.stringify({ from: range.from, to: range.to }));
        } catch {}
      }
    });

    // Keep chart layout and viewport position perfectly intact when tab is backgrounded or hidden
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && chartRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          chartRef.current.applyOptions({ width: w, height: h });
        }
        if (!isReplayActiveRef.current) {
          const savedRange = localStorage.getItem(`eurusd_logical_range_${timeframeRef.current}`);
          if (savedRange) {
            try {
              chartRef.current.timeScale().setVisibleLogicalRange(JSON.parse(savedRange));
            } catch {}
          }
        } else {
          centerOnLastCandle();
        }
        updateTransformer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Handle canvas clicks for drawing selection and deselection
    chart.subscribeClick((param) => {
      if (param.point && onChartClickRef.current) {
        onChartClickRef.current(param.point);
      }
    });

    // Crosshair movement handler for top bar metrics
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time || !seriesRef.current) {
        setHoveredCandle(null);
        onCrosshairMove?.({ time: undefined, price: undefined, candle: undefined });
        return;
      }
      const time = typeof param.time === 'number' ? param.time : undefined;
      const seriesData = param.seriesData.get(seriesRef.current) as any;
      if (seriesData) {
        const ohlc: Candle = {
          time: time || 0,
          open: seriesData.open ?? seriesData.value ?? 0,
          high: seriesData.high ?? seriesData.value ?? 0,
          low: seriesData.low ?? seriesData.value ?? 0,
          close: seriesData.close ?? seriesData.value ?? 0,
        };
        setHoveredCandle(ohlc);
        onCrosshairMove?.({ time, price: seriesData.close ?? seriesData.value, candle: ohlc });
      }
    });

    // ResizeObserver ensures instant chart layout recalculation on sidebar/dock toggles
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === containerRef.current && chartRef.current) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            chartRef.current.applyOptions({ width, height });
            updateTransformer();
          }
        }
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
        updateTransformer();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      seriesRef.current = null;
      indicatorSeriesRef.current.clear();
      chart.remove();
      chartRef.current = null;
    };
  }, []);

  // Dynamically apply timezone & time format localization to chart time axis and crosshair
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      const secVis = showSeconds || timeFormat.includes('sec');
      chartRef.current.applyOptions({
        localization: {
          timeFormatter: (timestamp: number) => {
            return formatTimeInTimezone(
              timestamp,
              timezone,
              ['1d', '1w', '1mo'].includes(timeframeRef.current),
              timeFormat,
              secVis
            );
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: secVis,
          tickMarkFormatter: (time: any, tickMarkType: any) => {
            const tSec = typeof time === 'number' ? time : (time?.timestamp || 0);
            return formatTickMarkInTimezone(tSec, tickMarkType, timezone, timeFormat, secVis);
          },
        },
      });
    } catch (e) {
      console.warn('Error applying timezone/format options to chart:', e);
    }
  }, [timezone, timeFormat, showSeconds]);

  // Create & Update Main Series
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Remove old main series safely
    if (seriesRef.current) {
      try {
        if (askPriceLineRef.current) {
          seriesRef.current.removePriceLine(askPriceLineRef.current);
        }
        chart.removeSeries(seriesRef.current);
      } catch {
        // Ignored in strict mode re-mount
      }
      seriesRef.current = null;
      askPriceLineRef.current = null;
    }

    let newSeries: ISeriesApi<any>;

    if (chartType === 'candlestick') {
      newSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        borderUpColor: '#089981',
        borderDownColor: '#f23645',
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#089981',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'hollow') {
      newSeries = chart.addSeries(CandlestickSeries, {
        upColor: 'transparent',
        downColor: '#f23645',
        borderUpColor: '#089981',
        borderDownColor: '#f23645',
        wickUpColor: '#089981',
        wickDownColor: '#f23645',
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#089981',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'bar') {
      newSeries = chart.addSeries(BarSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#089981',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'line') {
      newSeries = chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#2962ff',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'area') {
      newSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962ff',
        lineWidth: 2,
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#2962ff',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else {
      // Baseline
      newSeries = chart.addSeries(BaselineSeries, {
        topLineColor: '#089981',
        bottomLineColor: '#f23645',
        priceLineVisible: true,
        priceLineWidth: 1,
        priceLineColor: '#089981',
        priceLineStyle: LineStyle.Dashed,
        lastValueVisible: true,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    }

    seriesRef.current = newSeries;

    // Populate data immediately if candles already available
    if (candles.length > 0) {
      if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
        const lineData = candles.map(c => ({
          time: c.time as unknown as Time,
          value: c.close,
        }));
        newSeries.setData(lineData);
      } else {
        const barData = candles.map(c => ({
          time: c.time as unknown as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        newSeries.setData(barData);
      }
    }

    updateTransformer();
  }, [chartType]);

  // Update Data when candles change
  useEffect(() => {
    if (!seriesRef.current || candles.length === 0) return;

    const prevFirst = prevFirstCandleTimeRef.current;
    const isPrependingOlder = prevFirst !== null && candles[0].time < prevFirst;
    const addedCount = isPrependingOlder ? candles.filter(c => c.time < prevFirst).length : 0;
    const currentLogicalRange = isPrependingOlder && chartRef.current ? chartRef.current.timeScale().getVisibleLogicalRange() : null;
    const isTfSwitch = prevTimeframeRef.current !== timeframe;
    prevTimeframeRef.current = timeframe;

    if (isTfSwitch) {
      currentDevelopingBarRef.current = null;
    }

    // Keep current developing candle synchronized
    if (candles.length > 0) {
      const lastCandle = candles[candles.length - 1];
      if (!currentDevelopingBarRef.current || lastCandle.time >= currentDevelopingBarRef.current.time) {
        currentDevelopingBarRef.current = {
          time: lastCandle.time,
          open: lastCandle.open,
          high: lastCandle.high,
          low: lastCandle.low,
          close: lastCandle.close,
        };
      }
    }

    // Check if this is an incremental live bar append/update rather than a full history reload
    const isLiveIncremental = !isTfSwitch && !isPrependingOlder && prevFirst === candles[0].time && 
      candles.length >= prevCandlesCountRef.current && (candles.length - prevCandlesCountRef.current <= 10);
    prevCandlesCountRef.current = candles.length;

    if (isLiveIncremental) {
      // Incremental bar update: update ONLY the newest bar directly on Lightweight Charts series.
      // Avoids rebuilding 1,000 candles with setData(), preventing chart freezes and gesture disruption on sub-minute charts.
      const lastBar = candles[candles.length - 1];
      try {
        if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
          seriesRef.current.update({
            time: lastBar.time as unknown as Time,
            value: lastBar.close,
          });
        } else {
          seriesRef.current.update({
            time: lastBar.time as unknown as Time,
            open: lastBar.open,
            high: lastBar.high,
            low: lastBar.low,
            close: lastBar.close,
          });
        }
      } catch {}

      const totalBars = candles.length;
      if (chartRef.current && totalBars > 0) {
        try {
          const range = chartRef.current.timeScale().getVisibleLogicalRange();
          if (range) {
            setIsScrolledBack(range.to < totalBars - 2);
          }
        } catch {}
      }
      return;
    }

    if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
      const lineData = candles.map(c => ({
        time: c.time as unknown as Time,
        value: c.close,
      }));
      seriesRef.current.setData(lineData);
    } else {
      const barData = candles.map(c => ({
        time: c.time as unknown as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }));
      seriesRef.current.setData(barData);
    }

    if (isPrependingOlder && currentLogicalRange && chartRef.current && addedCount > 0) {
      try {
        chartRef.current.timeScale().setVisibleLogicalRange({
          from: currentLogicalRange.from + addedCount,
          to: currentLogicalRange.to + addedCount,
        });
      } catch {}
    }

    prevFirstCandleTimeRef.current = candles[0].time;

    // Restore saved viewport position on initial timeframe boot
    if (!restoredTfMapRef.current[timeframe] && chartRef.current && candles.length > 0) {
      const savedRange = localStorage.getItem(`eurusd_logical_range_${timeframe}`);
      const savedTimeRange = localStorage.getItem(`eurusd_time_range_${timeframe}`);
      if (savedRange) {
        try {
          const parsed = JSON.parse(savedRange);
          chartRef.current.timeScale().setVisibleLogicalRange(parsed);
          restoredTfMapRef.current[timeframe] = true;
        } catch {}
      } else if (savedTimeRange) {
        try {
          const parsed = JSON.parse(savedTimeRange);
          chartRef.current.timeScale().setVisibleRange(parsed);
          restoredTfMapRef.current[timeframe] = true;
        } catch {}
      }
    }

    const totalBars = candles.length;
    if (chartRef.current && totalBars > 0) {
      try {
        const range = chartRef.current.timeScale().getVisibleLogicalRange();
        if (range) {
          setIsScrolledBack(range.to < totalBars - 2);
        }
      } catch {}
    }

    updateTransformer();
  }, [candles]);

  // Real-time sub-millisecond candle & price line update directly on Lightweight Charts series
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || !quote || isReplayActive || candles.length === 0) return;

    // 1. Update or create Ask Price Line
    try {
      if (!askPriceLineRef.current) {
        askPriceLineRef.current = seriesRef.current.createPriceLine({
          price: quote.ask,
          color: '#f23645',
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          axisLabelVisible: true,
          title: 'ASK',
        });
      } else {
        askPriceLineRef.current.applyOptions({
          price: quote.ask,
        });
      }
    } catch {}

    // 2. Real-time active developing candle update with preserved OHLC wicks and bodies
    const tfSec = getTimeframeSeconds(timeframeRef.current);
    const quoteSec = (quote && quote.timestamp && quote.timestamp > 1000000000)
      ? quote.timestamp
      : Math.floor(Date.now() / 1000);
    const barTime = Math.floor(quoteSec / tfSec) * tfSec;
    const lastCandle = candles[candles.length - 1];
    if (!lastCandle) return;

    // Reject only if timestamp is in the distant future or corrupted
    if (barTime > lastCandle.time + Math.max(86400, tfSec * 500)) {
      return;
    }

    if (!currentDevelopingBarRef.current) {
      currentDevelopingBarRef.current = {
        time: lastCandle.time,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
      };
    }

    const devBar = currentDevelopingBarRef.current;
    if (barTime > devBar.time) {
      // New candle starts: open is previous candle's close
      const prevClose = devBar.close;
      const newBar = {
        time: barTime,
        open: prevClose,
        high: parseFloat((Math.max(prevClose, quote.bid) + 0.00002).toFixed(5)),
        low: parseFloat((Math.min(prevClose, quote.bid) - 0.00002).toFixed(5)),
        close: quote.bid,
      };
      currentDevelopingBarRef.current = newBar;

      try {
        if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
          seriesRef.current.update({
            time: newBar.time as unknown as Time,
            value: newBar.close,
          });
        } else {
          seriesRef.current.update({
            time: newBar.time as unknown as Time,
            open: newBar.open,
            high: newBar.high,
            low: newBar.low,
            close: newBar.close,
          });
        }
      } catch (e) {}
    } else if (barTime === devBar.time) {
      // Continuing the existing candle:
      // OPEN is preserved 100%!
      // HIGH only expands upwards!
      // LOW only expands downwards!
      // CLOSE updates with live tick!
      devBar.close = quote.bid;
      devBar.high = Math.max(devBar.high, quote.bid);
      devBar.low = Math.min(devBar.low, quote.bid);

      try {
        if (chartType === 'line' || chartType === 'area' || chartType === 'baseline') {
          seriesRef.current.update({
            time: devBar.time as unknown as Time,
            value: devBar.close,
          });
        } else {
          seriesRef.current.update({
            time: devBar.time as unknown as Time,
            open: devBar.open,
            high: devBar.high,
            low: devBar.low,
            close: devBar.close,
          });
        }
      } catch (e) {}
    }
  }, [quote, isReplayActive, chartType]);

  // Update Overlay Indicators
  useEffect(() => {
    if (!chartRef.current || candles.length === 0) return;
    const chart = chartRef.current;

    // Clear old indicator series safely
    indicatorSeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // Ignored
      }
    });
    indicatorSeriesRef.current.clear();

    for (const ind of indicators) {
      if (!ind.visible || !ind.isOverlay) continue;

      try {
        if (ind.type === 'SMA') {
          const period = Number(ind.params.period || 20);
          const data = IndicatorEngine.calculateSMA(candles, period);
          const series = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          series.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.value! })));
          indicatorSeriesRef.current.set(ind.id, series);
        } else if (ind.type === 'EMA') {
          const period = Number(ind.params.period || 50);
          const data = IndicatorEngine.calculateEMA(candles, period);
          const series = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          series.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.value! })));
          indicatorSeriesRef.current.set(ind.id, series);
        } else if (ind.type === 'VWAP') {
          const data = IndicatorEngine.calculateVWAP(candles);
          const series = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          series.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.value! })));
          indicatorSeriesRef.current.set(ind.id, series);
        } else if (ind.type === 'BB') {
          const period = Number(ind.params.period || 20);
          const mult = Number(ind.params.mult || 2);
          const data = IndicatorEngine.calculateBB(candles, period, mult);
          const upper = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, priceLineVisible: false });
          const lower = chart.addSeries(LineSeries, { color: ind.color, lineWidth: 1, priceLineVisible: false });
          const mid = chart.addSeries(LineSeries, { color: ind.secondaryColor || '#ff9800', lineWidth: 1, priceLineVisible: false });

          upper.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.upper! })));
          lower.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.lower! })));
          mid.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.middle! })));

          indicatorSeriesRef.current.set(`${ind.id}_upper`, upper);
          indicatorSeriesRef.current.set(`${ind.id}_lower`, lower);
          indicatorSeriesRef.current.set(`${ind.id}_mid`, mid);
        } else if (ind.type === 'SUPERTREND') {
          const data = IndicatorEngine.calculateSupertrend(candles, 10, 3);
          const series = chart.addSeries(LineSeries, {
            color: ind.color,
            lineWidth: 2,
            priceLineVisible: false,
          });
          series.setData(data.map(d => ({ time: d.time as unknown as Time, value: d.value! })));
          indicatorSeriesRef.current.set(ind.id, series);
        }
      } catch (err) {
        console.error(`Error adding indicator ${ind.name}:`, err);
      }
    }
  }, [indicators, candles]);

  // Candle Countdown Timer (Time to Bar Close based on Timeframe)
  useEffect(() => {
    const updateCountdown = () => {
      const tfSec = getTimeframeSeconds(timeframe);
      const nowSec = (isReplayActive && anchorTimestamp)
        ? anchorTimestamp
        : (isReplayActive && candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000));

      // Remaining seconds until the current candle interval completes
      const elapsedInBar = nowSec % tfSec;
      const remainingSec = Math.max(0, tfSec - elapsedInBar);

      let formatted = '';
      if (tfSec < 60) {
        // Under 1 minute (1s, 5s, 15s, 30s): format as 00:SS
        formatted = `00:${String(remainingSec).padStart(2, '0')}`;
      } else if (tfSec < 3600) {
        // Under 1 hour (1m, 5m, 15m, 30m): format as MM:SS
        const m = Math.floor(remainingSec / 60);
        const s = remainingSec % 60;
        formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else if (tfSec < 86400) {
        // Under 24 hours (1h, 4h): format as HH:MM:SS
        const h = Math.floor(remainingSec / 3600);
        const m = Math.floor((remainingSec % 3600) / 60);
        const s = remainingSec % 60;
        formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      } else {
        // Daily and higher: format as days and HH:MM:SS
        const d = Math.floor(remainingSec / 86400);
        const h = Math.floor((remainingSec % 86400) / 3600);
        const m = Math.floor((remainingSec % 3600) / 60);
        const s = remainingSec % 60;
        formatted = d > 0 
          ? `${d}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
          : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }

      setCountdownText(formatted);

      if (seriesRef.current && quote && quote.bid) {
        try {
          const y = seriesRef.current.priceToCoordinate(quote.bid);
          if (y !== null && !isNaN(y)) {
            setCountdownY(y);
          }
        } catch {}
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [timeframe, quote?.bid, isReplayActive, anchorTimestamp, candles]);

  const displayCandle = hoveredCandleOverride !== undefined && hoveredCandleOverride !== null
    ? hoveredCandleOverride
    : (hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null));
  const change = displayCandle ? displayCandle.close - displayCandle.open : 0;
  const changePercent = displayCandle && displayCandle.open ? (change / displayCandle.open) * 100 : 0;
  const rangePips = displayCandle ? (displayCandle.high - displayCandle.low) / 0.0001 : 0;
  const isUp = change >= 0;

  return (
    <div className="relative w-full h-full select-none">
      {/* Top Legend Bar */}
      <div className="absolute top-2 left-3 z-10 pointer-events-none flex flex-wrap items-center gap-x-3 gap-y-1 text-xs bg-[#131722]/80 backdrop-blur-sm px-2.5 py-1.5 rounded border border-[#2a2e39]/60 font-mono shadow-md">
        <div className="flex items-center space-x-1.5 font-bold font-sans">
          <span className="text-white">EUR/USD</span>
          <span className="text-[#2962ff] text-[10px] bg-[#1e222d] px-1 rounded">{timeframe}</span>
          <span className="text-gray-400 text-[10px]">{quote?.provider || 'FOREX'}</span>
          {quote?.market_status === 'OPEN' ? (
            <span className="flex items-center space-x-1 text-[10px] text-[#089981] font-semibold bg-[#089981]/15 px-1.5 py-0.5 rounded border border-[#089981]/30">
              <span className="w-1.5 h-1.5 rounded-full bg-[#089981] animate-pulse"></span>
              <span>LIVE</span>
            </span>
          ) : (
            <span className="text-[10px] text-gray-400 bg-gray-800 px-1.5 py-0.5 rounded">CLOSED (WEEKEND)</span>
          )}
          {countdownText && (
            <span
              data-testid="legend-countdown"
              className="flex items-center space-x-1 text-[10px] text-[#f59e0b] bg-[#f59e0b]/15 border border-[#f59e0b]/35 px-1.5 py-0.5 rounded font-mono shadow-sm"
              title="Time remaining until the current candle closes"
            >
              <Clock className="w-2.5 h-2.5 text-[#f59e0b] animate-pulse" />
              <span>Close: {countdownText}</span>
            </span>
          )}
        </div>

        {displayCandle && (
          <div className="flex items-center gap-x-2.5 text-[11px]">
            <span
              data-testid="legend-candle-time"
              className="text-[#38bdf8] font-mono font-medium border-r border-[#2a2e39] pr-2.5"
              title={`Candle time in ${timezone} (${timeFormat})`}
            >
              {formatTimeInTimezone(displayCandle.time, timezone, true, timeFormat, showSeconds)}
            </span>
            <span>
              <span className="text-gray-500 font-sans mr-0.5">O</span>
              <span className={isUp ? 'text-[#089981]' : 'text-[#f23645]'}>{displayCandle.open.toFixed(5)}</span>
            </span>
            <span>
              <span className="text-gray-500 font-sans mr-0.5">H</span>
              <span className={isUp ? 'text-[#089981]' : 'text-[#f23645]'}>{displayCandle.high.toFixed(5)}</span>
            </span>
            <span>
              <span className="text-gray-500 font-sans mr-0.5">L</span>
              <span className={isUp ? 'text-[#089981]' : 'text-[#f23645]'}>{displayCandle.low.toFixed(5)}</span>
            </span>
            <span>
              <span className="text-gray-500 font-sans mr-0.5">C</span>
              <span className={isUp ? 'text-[#089981]' : 'text-[#f23645]'}>{displayCandle.close.toFixed(5)}</span>
            </span>
            <span className={isUp ? 'text-[#089981]' : 'text-[#f23645]'}>
              {isUp ? '+' : ''}{change.toFixed(5)} ({isUp ? '+' : ''}{changePercent.toFixed(2)}%)
            </span>
            <span className="text-gray-400 text-[10px]">
              Range: {rangePips.toFixed(1)} pips
            </span>
          </div>
        )}

        {quote && (
          <div className="hidden lg:flex items-center gap-x-2 text-[10px] text-gray-400 border-l border-[#2a2e39] pl-2 font-sans">
            <span>Bid: <span className="text-[#089981] font-mono font-semibold">{quote.bid.toFixed(5)}</span></span>
            <span>Ask: <span className="text-[#f23645] font-mono font-semibold">{quote.ask.toFixed(5)}</span></span>
            <span>Spr: <span className="text-gray-200 font-mono">{quote.spread.toFixed(1)}p</span></span>
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-full"
        onContextMenu={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          // If right-clicked on the bottom time axis (bottom 26px before the price scale)
          if (e.clientY >= rect.bottom - 26 && e.clientX < rect.right - 55) {
            e.preventDefault();
            setIsTimeFormatDropdownOpen(true);
            setIsTzDropdownOpen(false);
          }
        }}
        onDoubleClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          // If double-clicked on the bottom time axis (bottom 26px before the price scale)
          if (e.clientY >= rect.bottom - 26 && e.clientX < rect.right - 55) {
            e.preventDefault();
            setIsTimeFormatDropdownOpen(prev => !prev);
            setIsTzDropdownOpen(false);
          }
        }}
      />

      {/* Loading older historical data overlay indicator */}
      {isLoadingOlder && (
        <div
          data-testid="loading-older-indicator"
          className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center space-x-2 px-3 py-1 bg-[#1e222d]/95 border border-[#2a2e39] rounded-full shadow-2xl backdrop-blur-md pointer-events-none text-xs text-[#2962ff] select-none"
        >
          <div className="w-3 h-3 border-2 border-[#2962ff] border-t-transparent rounded-full animate-spin" />
          <span className="font-medium text-[11px] text-gray-200">Loading historical data...</span>
        </div>
      )}

      {/* TradingView-Style "Scroll to the most recent bar" Quick Jump Button */}
      {isScrolledBack && (
        <div
          data-testid="scroll-to-recent-container"
          className="absolute bottom-9 right-16 z-30 group flex flex-col items-center"
        >
          {/* Tooltip Popup: strictly on mouse hover only, matching user requirement */}
          <div
            role="tooltip"
            data-testid="scroll-to-recent-tooltip"
            className="absolute bottom-full mb-1.5 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex flex-col items-center z-40 select-none"
          >
            <div className="bg-[#1e222d] border border-[#2a2e39] text-gray-200 text-[11px] font-sans px-2.5 py-1 rounded shadow-2xl whitespace-nowrap">
              Scroll to the most recent bar
            </div>
            {/* Downward Caret Triangle */}
            <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-[#2a2e39]" />
          </div>

          {/* Quick Jump Button */}
          <button
            type="button"
            data-testid="scroll-to-recent-btn"
            onClick={handleScrollToRecent}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[#1e222d]/95 hover:bg-[#2a2e39] active:bg-[#363a45] text-gray-300 hover:text-white border border-[#2a2e39] hover:border-gray-500 shadow-xl transition-all cursor-pointer"
            title="Scroll to the most recent bar"
            aria-label="Scroll to the most recent bar"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TradingView-Style Candle Countdown Timer on Right Price Scale */}
      {countdownText && (
        <div
          data-testid="candle-countdown-badge"
          className="absolute right-0 z-30 pointer-events-none select-none flex items-center justify-end pr-1 transition-all duration-150"
          style={{
            top: countdownY !== null
              ? `${Math.max(28, Math.min((containerRef.current?.clientHeight || 600) - 65, countdownY + 12))}px`
              : '40px',
            width: '68px',
          }}
        >
          <div className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-[#1e222d]/95 border border-[#f59e0b]/70 text-[10px] font-mono text-[#f59e0b] shadow-xl backdrop-blur-sm">
            <Clock className="w-2.5 h-2.5 text-[#f59e0b] animate-pulse" />
            <span className="font-bold tracking-tight">{countdownText}</span>
          </div>
        </div>
      )}

      {/* Bottom-Right TradingView-Style Timezone & Time Format Switchers */}
      <div className="absolute bottom-1 right-14 z-20 flex items-center space-x-1.5">
        {/* Time Format Switcher Button & Dropdown */}
        <div className="relative" ref={timeFormatDropdownRef}>
          <button
            type="button"
            data-testid="chart-timeformat-btn"
            onClick={() => {
              setIsTimeFormatDropdownOpen(prev => !prev);
              setIsTzDropdownOpen(false);
            }}
            className="flex items-center space-x-1 px-1.5 py-0.5 rounded text-[11px] font-mono bg-[#1e222d]/90 hover:bg-[#2a2e39] text-gray-300 hover:text-white border border-[#2a2e39] transition-colors shadow"
            title={`Current time format: ${timeFormat}. Click or right-click bottom time scale to customize display format.`}
          >
            <Clock className="w-3 h-3 text-[#089981]" />
            <span className="max-w-[120px] truncate">
              {timeFormat === 'adaptive' ? 'Adaptive' : (TIME_FORMAT_OPTIONS.find(f => f.id === timeFormat)?.label || timeFormat)}
            </span>
          </button>

          {/* Time Format Dropdown Menu */}
          {isTimeFormatDropdownOpen && (
            <div
              data-testid="timeformat-dropdown"
              className="absolute bottom-full right-0 mb-1 w-72 max-h-80 overflow-y-auto bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl py-1 z-30 font-sans"
            >
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-[#2a2e39]/60 flex items-center justify-between">
                <span>Date & Time Format</span>
                <span className="text-[#089981] font-mono text-[9px]">{getTimezoneAbbr(timezone)}</span>
              </div>

              {/* Show Seconds Toggle */}
              <div className="px-3 py-2 border-b border-[#2a2e39]/40 bg-[#131722]/60">
                <label className="flex items-center space-x-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    data-testid="timeformat-toggle-seconds"
                    checked={showSeconds || timeFormat.includes('sec')}
                    onChange={(e) => {
                      onTimeFormatChange?.(timeFormat, e.target.checked);
                    }}
                    className="rounded border-[#2a2e39] bg-[#1e222d] text-[#089981] focus:ring-0"
                  />
                  <span className="text-[11px] text-gray-200 font-medium">Show Seconds (:ss)</span>
                </label>
              </div>

              {/* Format Presets */}
              <div className="py-1">
                {TIME_FORMAT_OPTIONS.map((opt) => {
                  const isSelected = opt.id === timeFormat;
                  const sampleTimestamp = candles.length > 0 ? candles[candles.length - 1].time : Math.floor(Date.now() / 1000);
                  const livePreview = formatTimeInTimezone(sampleTimestamp, timezone, true, opt.id, showSeconds);
                  return (
                    <button
                      key={opt.id}
                      data-testid={`timeformat-option-${opt.id}`}
                      onClick={() => {
                        onTimeFormatChange?.(opt.id, showSeconds);
                        setIsTimeFormatDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex flex-col hover:bg-[#2a2e39] transition-colors border-l-2 ${
                        isSelected ? 'border-[#089981] bg-[#089981]/15 text-white font-medium' : 'border-transparent text-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[11px] text-white">{opt.label}</span>
                        <span className="font-mono text-[10px] text-[#34d399] bg-[#131722] px-1.5 py-0.5 rounded border border-[#2a2e39]">
                          {livePreview}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5">{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Timezone Switcher Button & Dropdown */}
        <div className="relative" ref={tzDropdownRef}>
          <button
            type="button"
            data-testid="chart-timezone-btn"
            onClick={() => {
              setIsTzDropdownOpen(prev => !prev);
              setIsTimeFormatDropdownOpen(false);
            }}
            className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-[#1e222d]/90 hover:bg-[#2a2e39] text-gray-300 hover:text-white border border-[#2a2e39] transition-colors shadow"
            title={`Current chart timezone: ${timezone}. Click to change.`}
          >
            <Globe className="w-3 h-3 text-[#2962ff]" />
            <span>{getTimezoneAbbr(timezone)}</span>
          </button>

          {/* Timezone Dropdown Menu */}
          {isTzDropdownOpen && (
            <div
              data-testid="timezone-dropdown"
              className="absolute bottom-full right-0 mb-1 w-64 max-h-72 overflow-y-auto bg-[#1e222d] border border-[#2a2e39] rounded shadow-xl py-1 z-30 font-sans"
            >
              <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 border-b border-[#2a2e39]/60">
                Select Chart Timezone
              </div>
              {TIMEZONE_OPTIONS.map((opt) => {
                const isSelected = opt.value === timezone;
                return (
                  <button
                    key={opt.value}
                    data-testid={`tz-option-${opt.value.replace('/', '_')}`}
                    onClick={() => {
                      onTimezoneChange?.(opt.value);
                      setIsTzDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-[#2a2e39] transition-colors ${
                      isSelected ? 'text-[#2962ff] bg-[#2962ff]/10 font-medium' : 'text-gray-300'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    <span className="text-[10px] text-gray-400 ml-2 font-mono flex-shrink-0">{opt.utcOffset}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
