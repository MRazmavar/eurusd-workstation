/**
 * TradingView-Style Technical Indicators Search and Configuration Modal.
 */
import React, { useState } from 'react';
import { Search, X, Check, Sliders, Eye, EyeOff, Trash2 } from 'lucide-react';
import { IndicatorConfig } from '../types';

interface IndicatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeIndicators: IndicatorConfig[];
  onToggleIndicator: (id: string) => void;
  onRemoveIndicator: (id: string) => void;
  onAddIndicator: (ind: IndicatorConfig) => void;
  onUpdateIndicator: (ind: IndicatorConfig) => void;
}

const AVAILABLE_INDICATORS: Omit<IndicatorConfig, 'id' | 'visible'>[] = [
  {
    type: 'SESSIONS',
    name: 'Forex Sessions (NY 1h, Asia / Shield Area, London 1h, Frankfurt 1h)',
    color: '#8b5cf6',
    secondaryColor: '#06b6d4',
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
  {
    type: 'SMA',
    name: 'Moving Average (SMA 20)',
    color: '#2962ff',
    isOverlay: true,
    params: { period: 20 },
  },
  {
    type: 'EMA',
    name: 'Exponential Moving Average (EMA 50)',
    color: '#ff9800',
    isOverlay: true,
    params: { period: 50 },
  },
  {
    type: 'EMA',
    name: 'Exponential Moving Average (EMA 200)',
    color: '#e91e63',
    isOverlay: true,
    params: { period: 200 },
  },
  {
    type: 'VWAP',
    name: 'Volume Weighted Average Price (VWAP)',
    color: '#ab47bc',
    isOverlay: true,
    params: {},
  },
  {
    type: 'BB',
    name: 'Bollinger Bands (20, 2)',
    color: '#2196f3',
    secondaryColor: '#ff9800',
    isOverlay: true,
    params: { period: 20, mult: 2 },
  },
  {
    type: 'SUPERTREND',
    name: 'Supertrend (10, 3)',
    color: '#089981',
    isOverlay: true,
    params: { period: 10, mult: 3 },
  },
  {
    type: 'RSI',
    name: 'Relative Strength Index (RSI 14)',
    color: '#ab47bc',
    isOverlay: false,
    params: { period: 14, overbought: 70, oversold: 30 },
  },
  {
    type: 'MACD',
    name: 'Moving Average Convergence Divergence (MACD 12, 26, 9)',
    color: '#2962ff',
    secondaryColor: '#ff9800',
    isOverlay: false,
    params: { fast: 12, slow: 26, signal: 9 },
  },
  {
    type: 'STOCH',
    name: 'Stochastic Oscillator (%K 14, %D 3)',
    color: '#2962ff',
    secondaryColor: '#f23645',
    isOverlay: false,
    params: { k: 14, d: 3 },
  },
  {
    type: 'ATR',
    name: 'Average True Range (ATR 14)',
    color: '#ffb300',
    isOverlay: false,
    params: { period: 14 },
  },
  {
    type: 'ADX',
    name: 'Average Directional Index (ADX 14)',
    color: '#00e676',
    isOverlay: false,
    params: { period: 14 },
  },
  {
    type: 'CCI',
    name: 'Commodity Channel Index (CCI 20)',
    color: '#00b0ff',
    isOverlay: false,
    params: { period: 20 },
  },
  {
    type: 'WILLIAMS_R',
    name: 'Williams %R (14)',
    color: '#ec407a',
    isOverlay: false,
    params: { period: 14 },
  },
  {
    type: 'ICHIMOKU',
    name: 'Ichimoku Cloud (9, 26, 52)',
    color: '#089981',
    secondaryColor: '#f23645',
    isOverlay: true,
    params: { conversion: 9, base: 26, span: 52 },
  },
  {
    type: 'PSAR',
    name: 'Parabolic SAR (0.02, 0.2)',
    color: '#2962ff',
    isOverlay: true,
    params: { step: 0.02, max: 0.2 },
  },
  {
    type: 'VOLUME',
    name: 'Volume / Tick Volume',
    color: '#2962ff',
    isOverlay: false,
    params: {},
  },
];

export const IndicatorsModal: React.FC<IndicatorsModalProps> = ({
  isOpen,
  onClose,
  activeIndicators,
  onToggleIndicator,
  onRemoveIndicator,
  onAddIndicator,
  onUpdateIndicator,
}) => {
  const [search, setSearch] = useState('');

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = AVAILABLE_INDICATORS.filter((ind) =>
    ind.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col text-xs select-none">
        {/* Header */}
        <div className="h-12 border-b border-[#2a2e39] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sliders size={16} className="text-[#2962ff]" />
            <span className="font-bold text-sm text-white">Technical Indicators</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-indicators-modal"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-3 border-b border-[#2a2e39]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search indicators (e.g., SMA, EMA, RSI, MACD, Bollinger)..."
              className="w-full bg-[#131722] border border-[#2a2e39] rounded pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#2962ff]"
              autoFocus
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Indicators List */}
          {activeIndicators.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                Active on Chart ({activeIndicators.length})
              </div>
              <div className="space-y-1.5">
                {activeIndicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="flex items-center justify-between p-2 rounded bg-[#131722] border border-[#2a2e39]"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ind.color }} />
                      <span className="text-white font-medium">{ind.name}</span>
                      <span className="text-[10px] text-gray-500 bg-[#1e222d] px-1 py-0.5 rounded">
                        {ind.isOverlay ? 'Overlay' : 'Sub-panel'}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleIndicator(ind.id)}
                        className="p-1 rounded text-gray-400 hover:text-white"
                        title={ind.visible ? 'Hide' : 'Show'}
                      >
                        {ind.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => onRemoveIndicator(ind.id)}
                        className="p-1 rounded text-gray-400 hover:text-[#f23645]"
                        title="Remove"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Indicators */}
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Available Indicators
            </div>
            <div className="space-y-1">
              {filtered.map((ind, i) => {
                const isActive = activeIndicators.some(a => a.type === ind.type && a.name === ind.name);
                return (
                  <div
                    key={i}
                    onClick={() => {
                      if (!isActive) {
                        onAddIndicator({
                          ...ind,
                          id: `ind_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                          visible: true,
                        });
                      }
                    }}
                    className={`flex items-center justify-between p-2.5 rounded cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-[#2962ff]/10 border border-[#2962ff]/30 text-white'
                        : 'hover:bg-[#131722] text-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ind.color }} />
                      <span className="font-medium">{ind.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-gray-500">
                        {ind.isOverlay ? 'Chart Overlay' : 'Oscillator Panel'}
                      </span>
                      {isActive ? (
                        <Check size={14} className="text-[#089981]" />
                      ) : (
                        <button className="px-2 py-0.5 rounded bg-[#2962ff] text-white hover:bg-[#1f4cdb] text-[10px] font-bold">
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-11 border-t border-[#2a2e39] px-4 flex items-center justify-between bg-[#171b26]">
          <span className="text-[11px] text-gray-400">
            {activeIndicators.length} active indicator(s)
          </span>
          <button
            onClick={onClose}
            data-testid="done-indicators-btn"
            className="px-4 py-1.5 rounded bg-[#2962ff] hover:bg-[#1f4cdb] text-white text-xs font-bold transition-colors"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
