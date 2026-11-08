/**
 * Modal to jump to an exact date & time for Bar Replay, cutting all future candles.
 */
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Scissors, FastForward, Check } from 'lucide-react';
import { Candle } from '../types';

interface JumpDateTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToTime: (timestampSec: number) => void;
  candles: Candle[];
  timezone?: string;
}

export const JumpDateTimeModal: React.FC<JumpDateTimeModalProps> = ({
  isOpen,
  onClose,
  onJumpToTime,
  candles,
  timezone = 'UTC',
}) => {
  const [selectedDateTime, setSelectedDateTime] = useState<string>('');

  useEffect(() => {
    if (candles.length > 0) {
      // Default to roughly 100 bars ago or midpoint
      const midIdx = Math.max(0, candles.length - 100);
      const targetTime = candles[midIdx].time * 1000;
      if (timezone === 'UTC') {
        const iso = new Date(targetTime).toISOString().slice(0, 16);
        setSelectedDateTime(iso);
      } else {
        const d = new Date(targetTime);
        const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        setSelectedDateTime(iso);
      }
    }
  }, [candles, isOpen, timezone]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || candles.length === 0) return null;

  const minCandle = candles[0];
  const maxCandle = candles[candles.length - 1];

  const minIso = timezone === 'UTC'
    ? new Date(minCandle.time * 1000).toISOString().slice(0, 16)
    : new Date(minCandle.time * 1000 - new Date(minCandle.time * 1000).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const maxIso = timezone === 'UTC'
    ? new Date(maxCandle.time * 1000).toISOString().slice(0, 16)
    : new Date(maxCandle.time * 1000 - new Date(maxCandle.time * 1000).getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  const handlePreset = (offsetBars: number) => {
    const idx = Math.max(0, candles.length - 1 - offsetBars);
    const targetTime = candles[idx].time * 1000;
    if (timezone === 'UTC') {
      const iso = new Date(targetTime).toISOString().slice(0, 16);
      setSelectedDateTime(iso);
    } else {
      const d = new Date(targetTime);
      const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      setSelectedDateTime(iso);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDateTime) return;

    if (timezone === 'UTC') {
      const parts = selectedDateTime.split(/[-T:]/);
      if (parts.length >= 5) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const d = parseInt(parts[2], 10);
        const h = parseInt(parts[3], 10);
        const min = parseInt(parts[4], 10);
        const epochSec = Math.floor(Date.UTC(y, m, d, h, min) / 1000);
        onJumpToTime(epochSec);
        onClose();
        return;
      }
    }

    const epochSec = Math.floor(new Date(selectedDateTime).getTime() / 1000);
    onJumpToTime(epochSec);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm select-none font-sans">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-[460px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39]">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Scissors size={16} className="text-[#f23645]" />
            <span>Jump to Time & Cut Future Bars</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-jump-modal"
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2e39] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApply} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5 flex items-center justify-between">
              <span>Select Date & Time (UTC)</span>
              <span className="text-[10px] text-gray-500 font-normal">
                Dataset: {candles.length} bars loaded
              </span>
            </label>
            <div className="relative">
              <input
                type="datetime-local"
                value={selectedDateTime}
                min={minIso}
                max={maxIso}
                onChange={(e) => setSelectedDateTime(e.target.value)}
                required
                data-testid="jump-datetime-input"
                className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none rounded px-3 py-2 text-white font-mono text-sm"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
              <span>Earliest: {new Date(minCandle.time * 1000).toLocaleDateString()}</span>
              <span>Latest: {new Date(maxCandle.time * 1000).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Quick Bar Jump Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handlePreset(24)}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                24 Bars Back
              </button>
              <button
                type="button"
                onClick={() => handlePreset(72)}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                72 Bars Back
              </button>
              <button
                type="button"
                onClick={() => handlePreset(150)}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                150 Bars Back
              </button>
              <button
                type="button"
                onClick={() => handlePreset(300)}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                300 Bars Back
              </button>
              <button
                type="button"
                onClick={() => handlePreset(Math.floor(candles.length / 2))}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                Midpoint (50%)
              </button>
              <button
                type="button"
                onClick={() => handlePreset(candles.length - 10)}
                className="py-1.5 px-2 rounded bg-[#131722] border border-[#2a2e39] hover:border-[#363c4e] text-gray-300 hover:text-white text-xs font-mono font-medium transition-colors text-center"
              >
                Start of Data
              </button>
            </div>
          </div>

          <div className="bg-[#131722] p-2.5 rounded border border-[#2a2e39] text-[11px] text-gray-400">
            <span className="text-[#f23645] font-bold mr-1">TradingView Note:</span>
            All candles after the selected date will be erased so you can manually backtest forward without look-ahead bias.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-[#2a2e39]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#2a2e39] hover:bg-[#363c4e] text-gray-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="confirm-jump-btn"
              className="px-4 py-2 rounded bg-[#f23645] hover:bg-[#d92130] text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-[#f23645]/20"
            >
              <Scissors size={14} />
              <span>Cut & Start Replay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
