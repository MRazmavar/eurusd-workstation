/**
 * TradingView-Style Drawing Properties & Settings Modal.
 * Opens on double-clicking any drawing tool on chart, or clicking Settings in toolbar/object tree.
 */
import React, { useState, useEffect, useRef } from 'react';
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
  Percent,
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  ChevronDown,
  Save,
} from 'lucide-react';
import { PositionToolService } from '../services/PositionToolService';
import { DrawingObject, Point, DrawingProperties, FibLevel } from '../types';
import {
  getDefaultFibLevels,
  getSavedFibSettings,
  saveDefaultFibSettings,
  FIB_PRESETS,
  FIB_LEVEL_PRESET_COLORS,
  calculateFibPrice,
  formatFibLevel,
} from '../utils/fibonacci';

function normalizeHexColor(color?: string): string {
  if (!color) return '#2962ff';
  const c = color.trim();
  if (c.startsWith('#')) {
    if (c.length === 7) return c;
    if (c.length === 4) {
      return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`;
    }
  }
  return '#2962ff';
}

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
  const isFib = drawing ? (drawing.type === 'fibonacci' || drawing.type.startsWith('fib') || drawing.type.includes('fib')) : false;
  const isPosition = drawing ? (drawing.type === 'long_position' || drawing.type === 'short_position') : false;

  const [activeTab, setActiveTab] = useState<'levels' | 'inputs' | 'style' | 'coordinates' | 'visibility'>('style');
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [properties, setProperties] = useState<DrawingProperties>({});
  const [points, setPoints] = useState<Point[]>([]);
  const [locked, setLocked] = useState<boolean>(false);
  const [hidden, setHidden] = useState<boolean>(false);

  // Fibonacci-specific state
  const [fibLevels, setFibLevels] = useState<FibLevel[]>([]);
  const [extendLinesLeft, setExtendLinesLeft] = useState<boolean>(false);
  const [extendLinesRight, setExtendLinesRight] = useState<boolean>(false);
  const [fillBackground, setFillBackground] = useState<boolean>(true);
  const [showPrices, setShowPrices] = useState<boolean>(true);
  const [showLevels, setShowLevels] = useState<boolean>(true);
  const [colorPickerIndex, setColorPickerIndex] = useState<number | null>(null);
  const [isSavedDefaultFeedback, setIsSavedDefaultFeedback] = useState<boolean>(false);
  const colorPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPopoverRef.current && !colorPopoverRef.current.contains(e.target as Node)) {
        setColorPickerIndex(null);
      }
    };
    if (colorPickerIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [colorPickerIndex]);

  useEffect(() => {
    if (drawing) {
      setProperties({ ...drawing.properties });
      setPoints(drawing.points.map(p => ({ ...p })));
      setLocked(drawing.locked);
      setHidden(drawing.hidden);

      if (drawing.type === 'fibonacci' || drawing.type.startsWith('fib') || drawing.type.includes('fib')) {
        const savedSettings = getSavedFibSettings();
        const initialLevels = drawing.properties?.fibLevels && drawing.properties.fibLevels.length > 0
          ? drawing.properties.fibLevels.map(lvl => ({ ...lvl }))
          : savedSettings.fibLevels.map(lvl => ({ ...lvl }));
        setFibLevels(initialLevels);
        setExtendLinesLeft(drawing.properties?.extendLinesLeft ?? savedSettings.extendLinesLeft);
        setExtendLinesRight(drawing.properties?.extendLinesRight ?? savedSettings.extendLinesRight);
        setFillBackground(drawing.properties?.fillBackground ?? savedSettings.fillBackground);
        setShowPrices(drawing.properties?.showPrices ?? savedSettings.showPrices);
        setShowLevels(drawing.properties?.showLevels ?? savedSettings.showLevels);
        setActiveTab('levels'); // Open directly into Levels tab for Fib drawings
      } else if (drawing.type === 'long_position' || drawing.type === 'short_position') {
        setAccountSize(drawing.properties?.accountSize || 10000);
        setRiskPercent(drawing.properties?.riskPercent || 1.0);
        setActiveTab('inputs');
      } else {
        setActiveTab('style');
      }
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
    const updatedProps: DrawingProperties = {
      ...properties,
      ...(isFib ? {
        fibLevels: fibLevels.map(l => ({ ...l })),
        extendLinesLeft,
        extendLinesRight,
        fillBackground,
        showPrices,
        showLevels,
      } : {}),
      ...(isPosition ? {
        accountSize,
        riskPercent,
      } : {}),
    };

    const updated: DrawingObject = {
      ...drawing,
      properties: updatedProps,
      points: points.map(p => ({ ...p })),
      locked,
      hidden,
      updated_at: Date.now(),
    };

    if (isFib) {
      saveDefaultFibSettings({
        fibLevels: fibLevels.map(l => ({ ...l })),
        extendLinesLeft,
        extendLinesRight,
        fillBackground,
        showPrices,
        showLevels,
        color: properties.color || '#2962ff',
        strokeWidth: properties.strokeWidth || 1,
        lineStyle: properties.lineStyle || 'dashed',
      });
    }

    onSave(updated);
    onClose();
  };

  const handleSaveAsDefault = () => {
    saveDefaultFibSettings({
      fibLevels: fibLevels.map(l => ({ ...l })),
      extendLinesLeft,
      extendLinesRight,
      fillBackground,
      showPrices,
      showLevels,
      color: properties.color || '#2962ff',
      strokeWidth: properties.strokeWidth || 1,
      lineStyle: properties.lineStyle || 'dashed',
    });
    setIsSavedDefaultFeedback(true);
    setTimeout(() => setIsSavedDefaultFeedback(false), 2000);
  };

  const handleReset = () => {
    if (isFib) {
      const defLevels = getDefaultFibLevels();
      setFibLevels(defLevels);
      setExtendLinesLeft(false);
      setExtendLinesRight(false);
      setFillBackground(true);
      setShowPrices(true);
      setShowLevels(true);
      setProperties(prev => ({
        ...prev,
        color: '#2962ff',
        strokeWidth: 1,
        lineStyle: 'dashed',
      }));
      saveDefaultFibSettings({
        fibLevels: defLevels,
        extendLinesLeft: false,
        extendLinesRight: false,
        fillBackground: true,
        showPrices: true,
        showLevels: true,
        color: '#2962ff',
        strokeWidth: 1,
        lineStyle: 'dashed',
      });
    } else {
      setProperties({
        color: '#2962ff',
        fillColor: '#2962ff',
        fillOpacity: 0.15,
        strokeWidth: 2,
        lineStyle: 'solid',
        fontSize: 12,
        text: drawing.type === 'text' ? 'EUR/USD Setup' : '',
      });
    }
  };

  // Level editing handlers
  const handleToggleLevel = (index: number) => {
    setFibLevels(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], visible: !copy[index].visible };
      return copy;
    });
  };

  const handleUpdateLevelValue = (index: number, val: number) => {
    setFibLevels(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], level: val };
      return copy;
    });
  };

  const handleUpdateLevelColor = (index: number, color: string) => {
    setFibLevels(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], color };
      return copy;
    });
  };

  const handleDeleteLevel = (index: number) => {
    setFibLevels(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleAddLevel = () => {
    setFibLevels(prev => {
      // Find a reasonable new level not already present
      const existing = prev.map(p => p.level);
      const candidates = [0.705, 0.886, 1.272, 1.414, 1.618, 2.0, 2.618, -0.27, -0.618, 0.25, 0.75];
      const nextRatio = candidates.find(c => !existing.includes(c)) ?? (Math.max(...existing, 0) + 0.25);
      return [
        ...prev,
        {
          level: parseFloat(nextRatio.toFixed(3)),
          color: '#2962ff',
          visible: true,
        },
      ].sort((a, b) => a.level - b.level);
    });
  };

  const handleApplyPreset = (key: string) => {
    const preset = FIB_PRESETS[key];
    if (preset) {
      setFibLevels(preset.levels.map(l => ({ ...l })));
    }
  };

  const p1 = points[0]?.price ?? 1.08000;
  const p2 = points[1]?.price ?? 1.09000;

  const toolDisplayName = drawing.type
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return (
    <div
      data-testid="drawing-properties-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none font-sans p-3"
    >
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-[520px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] bg-[#171b26] flex-shrink-0">
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
        <div className="flex items-center px-4 pt-2 border-b border-[#2a2e39] bg-[#171b26] space-x-3 overflow-x-auto flex-shrink-0">
          {isFib && (
            <button
              type="button"
              data-testid="tab-fib-levels"
              onClick={() => setActiveTab('levels')}
              className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
                activeTab === 'levels'
                  ? 'border-[#2962ff] text-[#2962ff]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Percent size={13} />
              <span>Fib Levels</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[#131722] text-[10px] text-gray-300 border border-[#2a2e39]">
                {fibLevels.filter(l => l.visible).length}
              </span>
            </button>
          )}
          {isPosition && (
            <button
              type="button"
              data-testid="tab-position-inputs"
              onClick={() => setActiveTab('inputs')}
              className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
                activeTab === 'inputs'
                  ? 'border-[#2962ff] text-[#2962ff]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Calculator size={13} />
              <span>Inputs & Sizing</span>
            </button>
          )}
          <button
            type="button"
            data-testid="tab-style"
            onClick={() => setActiveTab('style')}
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
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
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
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
            className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
              activeTab === 'visibility'
                ? 'border-[#2962ff] text-[#2962ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Layers size={13} />
            <span>Visibility & Lock</span>
          </button>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleApply} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* 0. FIBONACCI LEVELS TAB */}
          {activeTab === 'levels' && isFib && (
            <div className="space-y-4" data-testid="fib-levels-content">
              {/* Presets & Header */}
              <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <span className="text-gray-300 font-bold flex items-center space-x-1.5 text-xs">
                    <Sparkles size={13} className="text-amber-400" />
                    <span>Quick Presets & Defaults</span>
                  </span>
                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      data-testid="save-as-default-fib-btn"
                      onClick={handleSaveAsDefault}
                      className={`px-2 py-1 rounded text-xs font-semibold flex items-center space-x-1 border transition-all ${
                        isSavedDefaultFeedback
                          ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50'
                          : 'bg-[#2a2e39] hover:bg-[#363c4e] text-gray-200 border-[#3a3f50]'
                      }`}
                      title="Save current levels and options as the default template for all future Fib drawings"
                    >
                      {isSavedDefaultFeedback ? <Check size={12} /> : <Save size={12} />}
                      <span>{isSavedDefaultFeedback ? 'Saved as Default!' : 'Save as Default'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddLevel}
                      data-testid="add-fib-level-btn"
                      className="px-2.5 py-1 rounded bg-[#2962ff]/20 hover:bg-[#2962ff]/30 text-[#2962ff] hover:text-[#5887ff] border border-[#2962ff]/40 font-semibold text-xs flex items-center space-x-1 transition-all"
                    >
                      <Plus size={13} />
                      <span>Add Level</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  {Object.entries(FIB_PRESETS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      data-testid={`fib-preset-${key}`}
                      onClick={() => handleApplyPreset(key)}
                      className="px-2.5 py-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-gray-300 hover:text-white font-medium text-[11px] transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="fib-preset-reset"
                    onClick={() => setFibLevels(getDefaultFibLevels())}
                    className="px-2 py-1 rounded bg-[#1e222d] hover:bg-[#2a2e39] border border-[#2a2e39] text-gray-400 hover:text-white text-[11px] transition-colors flex items-center space-x-1"
                    title="Reset to 16 default levels"
                  >
                    <RotateCcw size={11} />
                    <span>All Defaults</span>
                  </button>
                </div>
              </div>

              {/* Fibonacci Display Options */}
              <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="fib-extend-right-toggle"
                    checked={extendLinesRight}
                    onChange={(e) => setExtendLinesRight(e.target.checked)}
                    className="accent-[#2962ff] rounded cursor-pointer"
                  />
                  <span>Extend Right</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="fib-extend-left-toggle"
                    checked={extendLinesLeft}
                    onChange={(e) => setExtendLinesLeft(e.target.checked)}
                    className="accent-[#2962ff] rounded cursor-pointer"
                  />
                  <span>Extend Left</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="fib-fill-bg-toggle"
                    checked={fillBackground}
                    onChange={(e) => setFillBackground(e.target.checked)}
                    className="accent-[#2962ff] rounded cursor-pointer"
                  />
                  <span>Fill Bands</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="fib-show-prices-toggle"
                    checked={showPrices}
                    onChange={(e) => setShowPrices(e.target.checked)}
                    className="accent-[#2962ff] rounded cursor-pointer"
                  />
                  <span>Show Prices</span>
                </label>
                <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    data-testid="fib-show-levels-toggle"
                    checked={showLevels}
                    onChange={(e) => setShowLevels(e.target.checked)}
                    className="accent-[#2962ff] rounded cursor-pointer"
                  />
                  <span>Show Ratios</span>
                </label>
              </div>

              {/* Levels Table / List */}
              <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between text-gray-400 font-semibold px-2 py-1 uppercase text-[10px] tracking-wider border-b border-[#2a2e39]">
                  <span className="w-8">Active</span>
                  <span className="w-24 text-left">Level Ratio</span>
                  <span className="w-14 text-center">Color</span>
                  <span className="flex-1 text-right pr-4">Target Price</span>
                  <span className="w-7 text-right">Del</span>
                </div>

                {fibLevels.map((lvl, index) => {
                  const targetPrice = calculateFibPrice(p1, p2, lvl.level);
                  const isPickerOpen = colorPickerIndex === index;
                  return (
                    <div
                      key={`fib-lvl-${index}`}
                      data-testid={`fib-level-row-${index}`}
                      className={`flex items-center justify-between p-1.5 rounded border transition-colors relative ${
                        lvl.visible
                          ? 'bg-[#131722] border-[#2a2e39] text-white'
                          : 'bg-[#131722]/50 border-transparent text-gray-500 opacity-60'
                      }`}
                    >
                      {/* Visible Toggle */}
                      <div className="w-8 flex items-center justify-center">
                        <input
                          type="checkbox"
                          data-testid={`fib-level-visible-${index}`}
                          checked={lvl.visible}
                          onChange={() => handleToggleLevel(index)}
                          className="accent-[#2962ff] rounded cursor-pointer w-3.5 h-3.5"
                        />
                      </div>

                      {/* Level Ratio Input */}
                      <div className="w-24">
                        <input
                          type="number"
                          step="0.001"
                          data-testid={`fib-level-input-${index}`}
                          value={lvl.level}
                          onChange={(e) => handleUpdateLevelValue(index, parseFloat(e.target.value) || 0)}
                          className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                        />
                      </div>

                      {/* Interactive Color Picker Swatch & Dropdown Popover */}
                      <div className="w-14 flex items-center justify-center relative">
                        <button
                          type="button"
                          data-testid={`fib-level-color-btn-${index}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setColorPickerIndex(prev => prev === index ? null : index);
                          }}
                          className="w-8 h-6 rounded border border-[#2a2e39] cursor-pointer flex items-center justify-between px-1 hover:border-white/60 transition-all shadow-inner group"
                          style={{ backgroundColor: lvl.color }}
                          title={`Click to change color: ${lvl.color}`}
                        >
                          <span className="w-1" />
                          <ChevronDown size={11} className="text-white drop-shadow stroke-[3] group-hover:scale-110 transition-transform" />
                        </button>

                        {/* Dropdown Color Palette Popover */}
                        {isPickerOpen && (
                          <div
                            ref={colorPopoverRef}
                            data-testid={`fib-color-popover-${index}`}
                            className="absolute z-50 top-8 left-1/2 -translate-x-1/2 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl p-2.5 w-52 flex flex-col space-y-2 text-xs animate-in fade-in zoom-in-95 duration-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-between text-[11px] text-gray-300 font-semibold border-b border-[#2a2e39] pb-1">
                              <span>Level {lvl.level} Color</span>
                              <button
                                type="button"
                                onClick={() => setColorPickerIndex(null)}
                                className="text-gray-400 hover:text-white p-0.5 rounded"
                              >
                                <X size={12} />
                              </button>
                            </div>

                            {/* Preset Color Swatches */}
                            <div className="grid grid-cols-6 gap-1.5">
                              {FIB_LEVEL_PRESET_COLORS.map((pc) => (
                                <button
                                  key={pc}
                                  type="button"
                                  data-testid={`fib-color-preset-${pc.replace('#', '')}-${index}`}
                                  onClick={() => {
                                    handleUpdateLevelColor(index, pc);
                                    setColorPickerIndex(null);
                                  }}
                                  className={`w-5 h-5 rounded border transition-transform ${
                                    lvl.color.toLowerCase() === pc.toLowerCase()
                                      ? 'border-white scale-110 ring-1 ring-white'
                                      : 'border-transparent hover:scale-110'
                                  }`}
                                  style={{ backgroundColor: pc }}
                                  title={pc}
                                />
                              ))}
                            </div>

                            {/* Custom Native Color Picker & Hex Code */}
                            <div className="flex items-center space-x-1.5 pt-1 border-t border-[#2a2e39]">
                              <div className="relative w-6 h-6 rounded border border-[#2a2e39] overflow-hidden flex-shrink-0 cursor-pointer shadow-inner">
                                <input
                                  type="color"
                                  data-testid={`fib-level-color-${index}`}
                                  value={normalizeHexColor(lvl.color)}
                                  onChange={(e) => handleUpdateLevelColor(index, e.target.value)}
                                  className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
                                />
                                <div className="w-full h-full" style={{ backgroundColor: lvl.color }} />
                              </div>
                              <input
                                type="text"
                                data-testid={`fib-level-hex-input-${index}`}
                                value={lvl.color}
                                onChange={(e) => handleUpdateLevelColor(index, e.target.value)}
                                className="flex-1 bg-[#131722] border border-[#2a2e39] rounded px-1.5 py-0.5 text-white font-mono text-[11px] uppercase focus:outline-none focus:border-[#2962ff]"
                                placeholder="#2962FF"
                              />
                            </div>

                            {/* Apply to All Levels Shortcut */}
                            <button
                              type="button"
                              data-testid={`fib-apply-all-color-${index}`}
                              onClick={() => {
                                const selectedColor = lvl.color;
                                setFibLevels(prev => prev.map(l => ({ ...l, color: selectedColor })));
                                setColorPickerIndex(null);
                              }}
                              className="w-full py-1 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-200 text-[10px] font-semibold text-center transition-colors"
                            >
                              Apply this color to all levels
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Computed Price Preview */}
                      <div className="flex-1 text-right font-mono text-[11px] text-gray-300 pr-4">
                        {targetPrice.toFixed(5)}
                      </div>

                      {/* Delete Level */}
                      <div className="w-7 flex items-center justify-end">
                        <button
                          type="button"
                          data-testid={`fib-level-delete-${index}`}
                          onClick={() => handleDeleteLevel(index)}
                          className="text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-950/30 transition-colors"
                          title="Remove level"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 0. POSITION INPUTS TAB (TradingView Standard Sizing & Formulas) */}
          {activeTab === 'inputs' && isPosition && (() => {
            const previewDrawing = {
              ...drawing,
              points: points.map(p => ({ ...p })),
              properties: { ...properties, accountSize, riskPercent },
            };
            const metrics = PositionToolService.calculateMetrics(previewDrawing, accountSize);
            const isLong = drawing.type === 'long_position';

            return (
              <div className="space-y-4">
                {/* Account Sizing Inputs */}
                <div className="grid grid-cols-2 gap-3 bg-[#131722] p-3 rounded border border-[#2a2e39]">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                      Account Size ($)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={accountSize}
                      onChange={(e) => setAccountSize(parseFloat(e.target.value) || 1000)}
                      className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                      Risk Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </div>

                {/* Price Coordinates */}
                <div className="space-y-2 bg-[#131722] p-3 rounded border border-[#2a2e39]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-semibold">Entry Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[0]?.price ?? 1.10000}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[0]) next[0] = { ...next[0], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-0.5 text-right text-white font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-semibold">Take Profit Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[2]?.price ?? (isLong ? 1.10300 : 1.09700)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[2]) next[2] = { ...next[2], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#089981]/50 rounded px-2 py-0.5 text-right text-emerald-300 font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-400 font-semibold">Stop Loss Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[1]?.price ?? (isLong ? 1.09850 : 1.10150)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[1]) next[1] = { ...next[1], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#f23645]/50 rounded px-2 py-0.5 text-right text-red-300 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Real-time TradingView Statistics & Formulas Box */}
                <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#2a2e39]">
                    <span className="text-gray-400 text-xs">Risk/Reward Ratio:</span>
                    <span className="text-[#089981] font-bold font-mono text-sm">
                      1 : {metrics.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">REWARD</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {metrics.rewardPips} pips ({metrics.rewardPercentOfPrice}%)
                      </span>
                      <span className="text-emerald-300 font-mono block text-[11px]">
                        +${metrics.potentialProfitUsd}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">RISK</span>
                      <span className="text-red-400 font-mono font-semibold">
                        {metrics.riskPips} pips ({metrics.riskPercentOfPrice}%)
                      </span>
                      <span className="text-red-300 font-mono block text-[11px]">
                        -${metrics.potentialLossUsd}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-[#2a2e39] flex justify-between text-xs text-gray-300 font-mono">
                    <span>Position Size: <strong>{metrics.lotSize} Lots</strong></span>
                    <span>Risk Amount: <strong>${metrics.riskAmount}</strong></span>
                  </div>
                </div>
              </div>
            );
          })()}

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
                    <span>
                      {isPosition ? (
                        idx === 0 ? '1. Entry Level' :
                        idx === 1 ? '2. Stop Loss Level' :
                        idx === 2 ? '3. Take Profit Level' :
                        idx === 3 ? '4. Duration / End Time' : `Anchor #${idx + 1}`
                      ) : `Anchor Point #${idx + 1}`}
                    </span>
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
          <div className="flex items-center justify-between pt-3 border-t border-[#2a2e39] flex-shrink-0">
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

