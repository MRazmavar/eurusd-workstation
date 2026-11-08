/**
 * TradingView-Style Quick Timeframe Jump & Custom Interval Dialog.
 * Triggered automatically by typing numeric digits (0-9) or timeframe characters on keyboard.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Clock, Check, X, ArrowRight } from 'lucide-react';

interface QuickTimeframeModalProps {
  isOpen: boolean;
  initialValue: string;
  onClose: () => void;
  onSelectTimeframe: (tf: string) => void;
}

type IntervalUnit = 'm' | 'h' | 'd' | 'w' | 's';

interface ParsedInterval {
  value: number;
  unit: IntervalUnit;
  normalized: string;
  label: string;
  isValid: boolean;
}

export const parseTimeframeInput = (raw: string): ParsedInterval => {
  const trimmed = (raw || '').trim().toLowerCase();
  if (!trimmed) {
    return {
      value: 1,
      unit: 'm',
      normalized: '1m',
      label: '1 Minute',
      isValid: false,
    };
  }

  // Pure digits default to minutes (TradingView standard convention)
  if (/^\d+$/.test(trimmed)) {
    const val = parseInt(trimmed, 10);
    return {
      value: val,
      unit: 'm',
      normalized: `${val}m`,
      label: `${val} Minute${val === 1 ? '' : 's'} (${val}m)`,
      isValid: val > 0 && val <= 10080,
    };
  }

  // Regex matching number and optional unit suffix
  const match = trimmed.match(/^(\d+)\s*([a-z]+)$/);
  if (match) {
    const val = parseInt(match[1], 10);
    const suffix = match[2];

    if (['s', 'sec', 'secs', 'second', 'seconds'].includes(suffix)) {
      return {
        value: val,
        unit: 's',
        normalized: `${val}s`,
        label: `${val} Second${val === 1 ? '' : 's'} (${val}s)`,
        isValid: val > 0 && val <= 3600,
      };
    }
    if (['m', 'min', 'mins', 'minute', 'minutes'].includes(suffix)) {
      return {
        value: val,
        unit: 'm',
        normalized: `${val}m`,
        label: `${val} Minute${val === 1 ? '' : 's'} (${val}m)`,
        isValid: val > 0 && val <= 10080,
      };
    }
    if (['h', 'hr', 'hrs', 'hour', 'hours'].includes(suffix)) {
      return {
        value: val,
        unit: 'h',
        normalized: `${val}h`,
        label: `${val} Hour${val === 1 ? '' : 's'} (${val}h)`,
        isValid: val > 0 && val <= 168,
      };
    }
    if (['d', 'day', 'days'].includes(suffix)) {
      return {
        value: val,
        unit: 'd',
        normalized: `${val}D`,
        label: `${val} Day${val === 1 ? '' : 's'} (${val}D)`,
        isValid: val > 0 && val <= 365,
      };
    }
    if (['w', 'wk', 'wks', 'week', 'weeks'].includes(suffix)) {
      return {
        value: val,
        unit: 'w',
        normalized: `${val}W`,
        label: `${val} Week${val === 1 ? '' : 's'} (${val}W)`,
        isValid: val > 0 && val <= 52,
      };
    }
  }

  // Fallback for special single-letter units like 'd' or 'w'
  if (trimmed === 'd') return { value: 1, unit: 'd', normalized: '1D', label: '1 Day (1D)', isValid: true };
  if (trimmed === 'w') return { value: 1, unit: 'w', normalized: '1W', label: '1 Week (1W)', isValid: true };
  if (trimmed === 'm') return { value: 1, unit: 'm', normalized: '1m', label: '1 Minute (1m)', isValid: true };
  if (trimmed === 'h') return { value: 1, unit: 'h', normalized: '1h', label: '1 Hour (1h)', isValid: true };

  return {
    value: 1,
    unit: 'm',
    normalized: trimmed,
    label: `Custom (${trimmed})`,
    isValid: false,
  };
};

export const QuickTimeframeModal: React.FC<QuickTimeframeModalProps> = ({
  isOpen,
  initialValue,
  onClose,
  onSelectTimeframe,
}) => {
  const [inputValue, setInputValue] = useState(initialValue || '');
  const [selectedUnit, setSelectedUnit] = useState<IntervalUnit>('m');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialValue || '');
      const parsed = parseTimeframeInput(initialValue || '');
      setSelectedUnit(parsed.unit);

      // Auto-focus and place cursor at end
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 30);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const parsed = parseTimeframeInput(inputValue);

  const handleApply = () => {
    if (!inputValue.trim()) return;

    // If pure number entered without unit, use selectedUnit
    let target = inputValue.trim();
    if (/^\d+$/.test(target)) {
      target = `${target}${selectedUnit === 'd' ? 'D' : selectedUnit === 'w' ? 'W' : selectedUnit}`;
    } else {
      target = parsed.normalized;
    }

    onSelectTimeframe(target);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleUnitClick = (unit: IntervalUnit) => {
    setSelectedUnit(unit);
    // If input is pure digits or already has suffix, adapt it
    const digitsOnly = inputValue.replace(/[^0-9]/g, '') || '1';
    setInputValue(`${digitsOnly}${unit === 'd' ? 'D' : unit === 'w' ? 'W' : unit}`);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const presets = [
    { label: '1m', tf: '1m' },
    { label: '5m', tf: '5m' },
    { label: '15m', tf: '15m' },
    { label: '20m', tf: '20m' },
    { label: '30m', tf: '30m' },
    { label: '45m', tf: '45m' },
    { label: '1h', tf: '1h' },
    { label: '2h', tf: '2h' },
    { label: '4h', tf: '4h' },
    { label: '1D', tf: '1D' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-96 bg-[#1e222d] border border-[#2a2e39] rounded-xl shadow-2xl overflow-hidden flex flex-col text-gray-200 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        data-testid="quick-timeframe-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39] bg-[#131722]/50">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Clock size={16} className="text-[#2962ff]" />
            <span>Change Interval</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2e39] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Large Input Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-400 mb-1.5 uppercase tracking-wider">
              Interval (Type number, e.g. 20 = 20m)
            </label>
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="20"
                data-testid="quick-timeframe-input"
                className="w-full bg-[#131722] border-2 border-[#2962ff] focus:border-[#3d7aff] rounded-lg px-4 py-2.5 text-2xl font-mono font-bold text-white tracking-wider outline-none shadow-inner"
              />
              <button
                onClick={handleApply}
                disabled={!inputValue.trim()}
                data-testid="quick-timeframe-submit-btn"
                className="absolute right-2 px-3 py-1.5 bg-[#2962ff] hover:bg-[#1e53e5] disabled:opacity-40 text-white rounded-md font-semibold text-xs flex items-center space-x-1 shadow transition-all"
              >
                <span>Go</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Resolution Preview Badge */}
          <div className="bg-[#131722] rounded-lg p-3 border border-[#2a2e39] flex items-center justify-between">
            <span className="text-xs text-gray-400">Target Resolution:</span>
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#089981]" />
              <span className="text-sm font-semibold text-white font-mono" data-testid="quick-timeframe-preview">
                {parsed.label}
              </span>
            </div>
          </div>

          {/* Unit Switcher Pills */}
          <div>
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-medium">
              Time Unit
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {(
                [
                  { id: 'm', label: 'Minutes', code: 'm' },
                  { id: 'h', label: 'Hours', code: 'h' },
                  { id: 'd', label: 'Days', code: 'D' },
                  { id: 'w', label: 'Weeks', code: 'W' },
                  { id: 's', label: 'Seconds', code: 's' },
                ] as const
              ).map((u) => {
                const isSelected = parsed.unit === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleUnitClick(u.id)}
                    className={`py-1.5 rounded-md text-xs font-semibold transition-all border ${
                      isSelected
                        ? 'bg-[#2962ff] text-white border-[#2962ff] shadow'
                        : 'bg-[#131722] text-gray-300 border-[#2a2e39] hover:border-gray-500 hover:text-white'
                    }`}
                  >
                    {u.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <div className="text-[11px] text-gray-400 mb-1.5 uppercase tracking-wider font-medium">
              Popular Intervals
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.tf}
                  type="button"
                  onClick={() => {
                    onSelectTimeframe(p.tf);
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Hints */}
        <div className="px-4 py-2.5 bg-[#131722]/80 border-t border-[#2a2e39] flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center space-x-2">
            <span>Press <kbd className="px-1.5 py-0.5 rounded bg-[#2a2e39] text-gray-200 font-mono">Enter</kbd> to apply</span>
            <span>•</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-[#2a2e39] text-gray-200 font-mono">Esc</kbd> to cancel</span>
          </div>
          <span className="text-[#2962ff] font-medium">TradingView Style</span>
        </div>
      </div>
    </div>
  );
};
