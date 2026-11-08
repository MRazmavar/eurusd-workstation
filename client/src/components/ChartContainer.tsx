/**
 * Main Chart Container powered by TradingView Lightweight Charts v5.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
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
import { Globe } from 'lucide-react';
import {
  TIMEZONE_OPTIONS,
  getTimezoneAbbr,
  formatTimeInTimezone,
  formatTickMarkInTimezone,
} from '../utils/timezone';

interface ChartContainerProps {
  candles: Candle[];
  chartType: ChartType;
  indicators: IndicatorConfig[];
  timeframe: string;
  quote: Quote | null;
  onTransformerReady: (t: CoordinateTransformer) => void;
  onCrosshairMove?: (param: { time?: number; price?: number; candle?: Candle }) => void;
  onChartInstanceReady?: (instance: { fitContent: () => void; resetScale: () => void; centerOnLastCandle?: () => void }) => void;
  onChartClick?: (point: { x: number; y: number }) => void;
  hoveredCandleOverride?: Candle | null;
  centerTrigger?: number;
  timezone?: string;
  onTimezoneChange?: (tz: string) => void;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  candles,
  chartType,
  indicators,
  timeframe,
  quote,
  onTransformerReady,
  onCrosshairMove,
  onChartInstanceReady,
  onChartClick,
  hoveredCandleOverride,
  centerTrigger,
  timezone = 'UTC',
  onTimezoneChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<any> | null>(null);
  const indicatorSeriesRef = useRef<Map<string, ISeriesApi<any>>>(new Map());
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const candlesRef = useRef<Candle[]>(candles);
  const onChartClickRef = useRef(onChartClick);
  const timeframeRef = useRef(timeframe);
  const restoredTfMapRef = useRef<{ [tf: string]: boolean }>({});

  const [isTzDropdownOpen, setIsTzDropdownOpen] = useState(false);
  const tzDropdownRef = useRef<HTMLDivElement | null>(null);
  const timezoneRef = useRef(timezone);

  useEffect(() => {
    timezoneRef.current = timezone;
  }, [timezone]);

  // Close timezone dropdown on outside click
  useEffect(() => {
    if (!isTzDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (tzDropdownRef.current && !tzDropdownRef.current.contains(e.target as Node)) {
        setIsTzDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isTzDropdownOpen]);

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
            if (len === 1) return chart.timeScale().logicalToCoordinate(0 as any);
            const step = (list[len - 1].time - list[0].time) / Math.max(1, len - 1);
            if (step <= 0) return chart.timeScale().logicalToCoordinate(0 as any);

            if (t <= list[0].time) {
              const logIdx = (t - list[0].time) / step;
              return chart.timeScale().logicalToCoordinate(logIdx as any);
            } else if (t >= list[len - 1].time) {
              const logIdx = len - 1 + (t - list[len - 1].time) / step;
              return chart.timeScale().logicalToCoordinate(logIdx as any);
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
              return chart.timeScale().logicalToCoordinate((i + frac) as any);
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
            const step = (list[len - 1].time - list[0].time) / Math.max(1, len - 1);
            if (logical >= 0 && logical < len) {
              const idx = Math.min(len - 1, Math.max(0, Math.round(logical)));
              return list[idx].time;
            } else if (logical >= len) {
              return Math.round(list[len - 1].time + (logical - (len - 1)) * step);
            } else {
              return Math.round(list[0].time + logical * step);
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
        const step = (list[len - 1].time - list[0].time) / Math.max(1, len - 1);
        if (logical >= 0 && logical < len) {
          const idx = Math.min(len - 1, Math.max(0, Math.round(logical)));
          return list[idx].time;
        } else if (logical >= len) {
          return Math.round(list[len - 1].time + (logical - (len - 1)) * step);
        } else {
          return Math.round(list[0].time + logical * step);
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
        if (logical === undefined || logical === null || isNaN(logical)) return null;
        try {
          return chart.timeScale().logicalToCoordinate(logical as any);
        } catch {
          return null;
        }
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

  // Respond to centerTrigger to center the last candle and keep price in center of chart
  useEffect(() => {
    if (centerTrigger === undefined || centerTrigger === 0) return;
    const timer = setTimeout(() => {
      centerOnLastCandle();
    }, 40);
    return () => clearTimeout(timer);
  }, [centerTrigger, centerOnLastCandle]);

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
          return formatTimeInTimezone(timestamp, timezoneRef.current, ['1d', '1w', '1mo'].includes(timeframeRef.current));
        },
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: true,
        tickMarkFormatter: (time: any, tickMarkType: any) => {
          const tSec = typeof time === 'number' ? time : (time?.timestamp || 0);
          return formatTickMarkInTimezone(tSec, tickMarkType, timezoneRef.current);
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

    if (onChartInstanceReady) {
      onChartInstanceReady({
        fitContent: () => chart.timeScale().fitContent(),
        resetScale: () => chart.timeScale().resetTimeScale(),
        centerOnLastCandle: () => centerOnLastCandle(),
      });
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range) {
        try {
          localStorage.setItem(`eurusd_logical_range_${timeframeRef.current}`, JSON.stringify(range));
        } catch {}
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
        const savedRange = localStorage.getItem(`eurusd_logical_range_${timeframeRef.current}`);
        if (savedRange) {
          try {
            chartRef.current.timeScale().setVisibleLogicalRange(JSON.parse(savedRange));
          } catch {}
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

  // Dynamically apply timezone localization to chart time axis and crosshair
  useEffect(() => {
    if (!chartRef.current) return;
    try {
      chartRef.current.applyOptions({
        localization: {
          timeFormatter: (timestamp: number) => {
            return formatTimeInTimezone(timestamp, timezone, ['1d', '1w', '1mo'].includes(timeframeRef.current));
          },
        },
        timeScale: {
          tickMarkFormatter: (time: any, tickMarkType: any) => {
            const tSec = typeof time === 'number' ? time : (time?.timestamp || 0);
            return formatTickMarkInTimezone(tSec, tickMarkType, timezone);
          },
        },
      });
    } catch (e) {
      console.warn('Error applying timezone options to chart:', e);
    }
  }, [timezone]);

  // Create & Update Main Series
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Remove old main series safely
    if (seriesRef.current) {
      try {
        chart.removeSeries(seriesRef.current);
      } catch {
        // Ignored in strict mode re-mount
      }
      seriesRef.current = null;
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
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'bar') {
      newSeries = chart.addSeries(BarSeries, {
        upColor: '#089981',
        downColor: '#f23645',
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'line') {
      newSeries = chart.addSeries(LineSeries, {
        color: '#2962ff',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else if (chartType === 'area') {
      newSeries = chart.addSeries(AreaSeries, {
        topColor: 'rgba(41, 98, 255, 0.4)',
        bottomColor: 'rgba(41, 98, 255, 0.0)',
        lineColor: '#2962ff',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 5, minMove: 0.00001 },
      });
    } else {
      // Baseline
      newSeries = chart.addSeries(BaselineSeries, {
        topLineColor: '#089981',
        bottomLineColor: '#f23645',
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

    // Restore remembered viewport position for this timeframe
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

    updateTransformer();
  }, [candles]);

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
        </div>

        {displayCandle && (
          <div className="flex items-center gap-x-2.5 text-[11px]">
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

      <div ref={containerRef} className="w-full h-full" />

      {/* Bottom-Right TradingView-Style Timezone Switcher */}
      <div className="absolute bottom-1 right-14 z-20" ref={tzDropdownRef}>
        <button
          type="button"
          data-testid="chart-timezone-btn"
          onClick={() => setIsTzDropdownOpen(prev => !prev)}
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
  );
};
