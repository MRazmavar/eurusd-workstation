/**
 * Synchronized Sub-Chart Panels for Oscillators (RSI, MACD, Stochastic, ATR).
 */
import React from 'react';
import { Candle, IndicatorConfig } from '../types';
import { IndicatorEngine } from '../services/IndicatorEngine';
import { X, Eye, EyeOff } from 'lucide-react';

interface IndicatorPanelsProps {
  indicators: IndicatorConfig[];
  candles: Candle[];
  onToggleIndicator: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
}

export const IndicatorPanels: React.FC<IndicatorPanelsProps> = ({
  indicators,
  candles,
  onToggleIndicator,
  onRemoveIndicator,
}) => {
  const panelIndicators = indicators.filter(ind => !ind.isOverlay && ind.visible);

  if (panelIndicators.length === 0 || candles.length === 0) return null;

  return (
    <div className="flex flex-col border-t border-[#2a2e39] bg-[#131722] z-10 select-none">
      {panelIndicators.map((ind) => (
        <SinglePanel
          key={ind.id}
          indicator={ind}
          candles={candles}
          onToggle={() => onToggleIndicator(ind.id)}
          onRemove={() => onRemoveIndicator(ind.id)}
        />
      ))}
    </div>
  );
};

const SinglePanel: React.FC<{
  indicator: IndicatorConfig;
  candles: Candle[];
  onToggle: () => void;
  onRemove: () => void;
}> = ({ indicator, candles, onToggle, onRemove }) => {
  if (indicator.type === 'RSI') {
    const period = Number(indicator.params.period || 14);
    const rsiData = IndicatorEngine.calculateRSI(candles, period);
    const latest = rsiData[rsiData.length - 1]?.value ?? 50;

    return (
      <div className="h-24 border-b border-[#2a2e39] relative px-3 py-1 flex flex-col justify-between">
        {/* Panel Header */}
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-gray-300">RSI ({period})</span>
            <span className="font-mono text-xs font-bold text-[#ab47bc]">{latest.toFixed(2)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <button onClick={onRemove} className="text-gray-500 hover:text-red-400 p-0.5">
              <X size={12} />
            </button>
          </div>
        </div>

        {/* SVG Sparkline / Level Lines */}
        <div className="w-full h-16 relative">
          <svg className="w-full h-full overflow-hidden" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* 70 Overbought & 30 Oversold */}
            <line x1="0" y1="30" x2="100" y2="30" stroke="#787b86" strokeDasharray="3,3" opacity="0.4" />
            <line x1="0" y1="70" x2="100" y2="70" stroke="#787b86" strokeDasharray="3,3" opacity="0.4" />
            {/* 50 Mid line */}
            <line x1="0" y1="50" x2="100" y2="50" stroke="#2a2e39" opacity="0.6" />

            {rsiData.length > 1 && (
              <polyline
                fill="none"
                stroke={indicator.color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={rsiData
                  .map((d, i) => {
                    const x = Number(((i / (rsiData.length - 1)) * 100).toFixed(2));
                    const y = Number((100 - (d.value ?? 50)).toFixed(2));
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>
        </div>
      </div>
    );
  }

  if (indicator.type === 'MACD') {
    const macdData = IndicatorEngine.calculateMACD(candles);
    const latest = macdData[macdData.length - 1];

    return (
      <div className="h-24 border-b border-[#2a2e39] relative px-3 py-1 flex flex-col justify-between">
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[11px] text-gray-300">MACD (12, 26, 9)</span>
            {latest && (
              <span className="font-mono text-[10px] space-x-1.5">
                <span className="text-[#2962ff]">M: {latest.macd}</span>
                <span className="text-[#ff9800]">S: {latest.signal}</span>
                <span className={(latest.hist || 0) >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                  H: {latest.hist}
                </span>
              </span>
            )}
          </div>
          <button onClick={onRemove} className="text-gray-500 hover:text-red-400 p-0.5">
            <X size={12} />
          </button>
        </div>

        {/* SVG MACD */}
        <div className="w-full h-16 relative">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <line x1="0" y1="50" x2="100" y2="50" stroke="#2a2e39" />
            {macdData.length > 1 && (
              <polyline
                fill="none"
                stroke={indicator.color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                points={macdData
                  .map((d, i) => {
                    const x = Number(((i / (macdData.length - 1)) * 100).toFixed(2));
                    const y = Number(Math.max(5, Math.min(95, 50 - (d.macd ?? 0) * 10000)).toFixed(2));
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />
            )}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="h-16 border-b border-[#2a2e39] px-3 py-1 flex items-center justify-between text-gray-400">
      <span className="font-bold text-xs">{indicator.name}</span>
      <button onClick={onRemove} className="hover:text-red-400">
        <X size={12} />
      </button>
    </div>
  );
};
