/**
 * TradingView-Style Drawing Properties & Settings Modal.
 * Opens on double-clicking any drawing tool on chart, or clicking Settings in toolbar/object tree.
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Sliders,
  Maximize2,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Palette,
  Check,
  RotateCcw,
  Type,
  Layers,
  MapPin,
} from 'lucide-react';
import { DrawingObject, Point, DrawingProperties } from '../types';

interface DrawingPropertiesModalProps {
  isOpen: boolean;
  drawing: DrawingObject | null;
  onClose: () => void;
  onSave: (updated: DrawingObject) => void;
}

const PRESET_COLORS = [
  '#2962ff', '#089981', '#f23645', '#ff9800', '#ab47bc',
  '#00bcd4', '#4caf50', '#ffeb3b', '#ffffff', '#787b86',
];

export const DrawingPropertiesModal: React.FC<DrawingPropertiesModalProps> = ({
  isOpen,
  drawing,
  onClose,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'style' | 'coordinates' | 'visibility'>('style');
  const [properties, setProperties] = useState<DrawingProperties>({});
  const [points, setPoints] = useState<Point[]>([]);
  const [locked, setLocked] = useState<boolean>(false);
  const [hidden, setHidden] = useState<boolean>(false);

  useEffect(() => {
    if (drawing) {
      setProperties({ ...drawing.properties });
      setPoints(drawing.points.map(p => ({ ...p })));
      setLocked(drawing.locked);
      setHidden(drawing.hidden);
    }
  }, [drawing, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !drawing) return null;

  const currentColor = properties.color || '#2962ff';
  const currentFillColor = properties.fillColor || currentColor;
  const currentFillOpacity = properties.fillOpacity !== undefined ? properties.fillOpacity : 0.15;
  const currentWidth = properties.strokeWidth || 2;
  const currentStyle = properties.lineStyle || 'solid';
  const textContent = properties.text || '';
  const fontSize = properties.fontSize || 12;

  const hasFill = [
    'rectangle', 'rotated_rectangle', 'circle', 'ellipse', 'triangle',
    'parallel_channel', 'regression_trend', 'flat_top_bottom', 'disjoint_channel',
    'long_position', 'short_position', 'measure', 'price_range', 'date_price_range',
  ].includes(drawing.type);

  const hasText = [
    'text', 'note', 'callout', 'price_label', 'trend_angle',
  ].includes(drawing.type);

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: DrawingObject = {
      ...drawing,
      properties: { ...properties },
      points: points.map(p => ({ ...p })),
      locked,
      hidden,
      updated_at: Date.now(),
    };
    onSave(updated);
    onClose();
  };

  const handleReset = () => {
    setProperties({
      color: '#2962ff',
      fillColor: '#2962ff',
      fillOpacity: 0.15,
      strokeWidth: 2,
      lineStyle: 'solid',
      fontSize: 12,
      text: drawing.type === 'text' ? 'EUR/USD Setup' : '',
    });
  };

  const toolDisplayName = drawing.type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div
      data-testid="drawing-properties-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none font-sans"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-[480px] overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] bg-[#171b26]">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Sliders size={15} className="text-[#2962ff]" />
            <span>{toolDisplayName} Properties</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-drawing-properties-btn"
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2e39] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-4 pt-2 border-b border-[#2a2e39] bg-[#171b26] space-x-4">
          <button
            type="button"
            data-testid="tab-style"
            onClick={() => setActiveTab('style')}
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'style'
                ? 'border-[#2962ff] text-[#2962ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Palette size={13} />
            <span>Style</span>
          </button>
          <button
            type="button"
            data-testid="tab-coordinates"
            onClick={() => setActiveTab('coordinates')}
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'coordinates'
                ? 'border-[#2962ff] text-[#2962ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MapPin size={13} />
            <span>Coordinates</span>
          </button>
          <button
            type="button"
            data-testid="tab-visibility"
            onClick={() => setActiveTab('visibility')}
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 ${
              activeTab === 'visibility'
                ? 'border-[#2962ff] text-[#2962ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Visibility & Lock</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          {/* 1. STYLE TAB */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Line Color & Custom Color Picker */}
              <div>
                <label className="block text-gray-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                  Line & Border Color
                </label>
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      data-testid={`modal-color-${c.replace('#', '')}`}
                      onClick={() => setProperties(prev => ({ ...prev, color: c, fillColor: c }))}
                      className={`w-5 h-5 rounded-full border transition-all ${
                        currentColor.toLowerCase() === c.toLowerCase()
                          ? 'border-white scale-125 shadow-lg ring-2 ring-white/50'
                          : 'border-transparent hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  <div className="relative w-6 h-6 flex items-center justify-center ml-2 rounded border border-[#2a2e39] bg-[#131722] hover:border-[#38bdf8] transition-colors">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setProperties(prev => ({ ...prev, color: e.target.value, fillColor: e.target.value }))}
                      className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      title="Custom Color"
                    />
                    <Palette size={13} className="text-gray-300" />
                  </div>
                  <span className="font-mono text-gray-400 text-[11px] ml-1">{currentColor.toUpperCase()}</span>
                </div>
              </div>

              {/* Stroke Width & Line Style */}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Line Width / Thickness
                  </label>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4].map((w) => (
                      <button
                        type="button"
                        key={w}
                        data-testid={`modal-width-${w}`}
                        onClick={() => setProperties(prev => ({ ...prev, strokeWidth: w }))}
                        className={`flex-1 py-1.5 rounded font-mono font-bold text-xs border transition-all ${
                          currentWidth === w
                            ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/30'
                            : 'bg-[#131722] border-[#2a2e39] text-gray-300 hover:text-white hover:border-[#363c4e]'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1.5 uppercase text-[10px] tracking-wider">
                    Line Style
                  </label>
                  <div className="flex space-x-1">
                    {(['solid', 'dashed', 'dotted'] as const).map((st) => (
                      <button
                        type="button"
                        key={st}
                        data-testid={`modal-style-${st}`}
                        onClick={() => setProperties(prev => ({ ...prev, lineStyle: st }))}
                        className={`flex-1 py-1.5 rounded font-mono capitalize text-[11px] border transition-all ${
                          currentStyle === st
                            ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/30'
                            : 'bg-[#131722] border-[#2a2e39] text-gray-300 hover:text-white hover:border-[#363c4e]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fill Controls (For Shapes, Channels, and Position Tools) */}
              {hasFill && (
                <div className="pt-2 border-t border-[#2a2e39] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                      Fill Background
                    </label>
                    <span className="text-gray-300 font-mono text-[11px]">
                      {Math.round(currentFillOpacity * 100)}% Opacity
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="relative w-8 h-8 rounded border border-[#2a2e39] overflow-hidden flex items-center justify-center">
                      <input
                        type="color"
                        value={currentFillColor}
                        onChange={(e) => setProperties(prev => ({ ...prev, fillColor: e.target.value }))}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                      />
                      <div className="w-full h-full" style={{ backgroundColor: currentFillColor }} />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={currentFillOpacity}
                      onChange={(e) => setProperties(prev => ({ ...prev, fillOpacity: parseFloat(e.target.value) }))}
                      className="flex-1 accent-[#2962ff] h-1.5 bg-[#131722] rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {/* Text / Label Controls */}
              {hasText && (
                <div className="pt-2 border-t border-[#2a2e39] space-y-2">
                  <label className="block text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
                    Text Content
                  </label>
                  <input
                    type="text"
                    value={textContent}
                    onChange={(e) => setProperties(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter annotation text..."
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-[#2962ff]"
                  />
                  <div className="flex items-center space-x-2 pt-1">
                    <span className="text-gray-400 text-[11px]">Font Size:</span>
                    {[10, 12, 14, 16, 20].map((sz) => (
                      <button
                        type="button"
                        key={sz}
                        onClick={() => setProperties(prev => ({ ...prev, fontSize: sz }))}
                        className={`px-2 py-0.5 rounded font-mono text-xs border ${
                          fontSize === sz
                            ? 'bg-[#2962ff] text-white border-[#2962ff]'
                            : 'bg-[#131722] text-gray-400 border-[#2a2e39] hover:text-white'
                        }`}
                      >
                        {sz}px
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. COORDINATES TAB */}
          {activeTab === 'coordinates' && (
            <div className="space-y-3">
              <span className="text-gray-400 block text-[11px]">
                Adjust exact price and candle timestamps for each anchor point:
              </span>
              {points.map((pt, idx) => (
                <div key={idx} className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-1.5">
                  <div className="flex justify-between items-center text-gray-300 font-semibold">
                    <span>Anchor Point #{idx + 1}</span>
                    <span className="text-gray-500 font-mono text-[10px]">
                      {new Date(pt.time * 1000).toUTCString().slice(0, 22)} UTC
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-xs">Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={pt.price}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          next[idx] = { ...next[idx], price: val };
                          return next;
                        });
                      }}
                      className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 3. VISIBILITY & LOCK TAB */}
          {activeTab === 'visibility' && (
            <div className="space-y-3">
              <div className="bg-[#131722] p-3 rounded border border-[#2a2e39] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Lock Object</span>
                  <span className="text-gray-500 text-[11px]">Prevent accidental moving or deletion</span>
                </div>
                <button
                  type="button"
                  onClick={() => setLocked(!locked)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors border ${
                    locked
                      ? 'bg-amber-900/40 text-amber-300 border-amber-700'
                      : 'bg-[#1e222d] text-gray-300 border-[#2a2e39] hover:text-white'
                  }`}
                >
                  {locked ? <Lock size={13} className="text-amber-400" /> : <Unlock size={13} />}
                  <span>{locked ? 'Locked' : 'Unlocked'}</span>
                </button>
              </div>

              <div className="bg-[#131722] p-3 rounded border border-[#2a2e39] flex items-center justify-between">
                <div>
                  <span className="text-white font-bold block">Hide Object</span>
                  <span className="text-gray-500 text-[11px]">Temporarily hide from chart display</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHidden(!hidden)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded font-semibold text-xs transition-colors border ${
                    hidden
                      ? 'bg-red-900/40 text-red-300 border-red-700'
                      : 'bg-[#1e222d] text-gray-300 border-[#2a2e39] hover:text-white'
                  }`}
                >
                  {hidden ? <EyeOff size={13} className="text-red-400" /> : <Eye size={13} />}
                  <span>{hidden ? 'Hidden' : 'Visible'}</span>
                </button>
              </div>

              <div className="bg-[#131722] p-3 rounded border border-[#2a2e39] space-y-1">
                <span className="text-gray-400 block text-[10px] uppercase font-bold tracking-wider">
                  Origin Details
                </span>
                <div className="flex justify-between text-gray-300">
                  <span>Creation Timeframe</span>
                  <span className="font-mono text-[#2962ff] font-bold">{drawing.timeframe || 'Active'}</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Total Points</span>
                  <span className="font-mono">{drawing.points.length} coordinates</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2a2e39]">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center space-x-1 text-gray-400 hover:text-white text-xs px-2 py-1.5 rounded hover:bg-[#2a2e39] transition-colors"
              title="Reset styling to defaults"
            >
              <RotateCcw size={13} />
              <span>Defaults</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                data-testid="save-drawing-properties-btn"
                className="px-4 py-1.5 rounded bg-[#2962ff] hover:bg-[#1f4cdb] text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-[#2962ff]/20"
              >
                <Check size={14} />
                <span>Apply / OK</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
