/**
 * Modal to view and update account balance and initial capital.
 */
import React, { useState, useEffect } from 'react';
import { X, DollarSign, Wallet, Check, RotateCcw } from 'lucide-react';

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onSaveBalance: (newBalance: number) => void;
}

const PRESET_BALANCES = [1000, 5000, 10000, 25000, 50000, 100000];

export const BalanceModal: React.FC<BalanceModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onSaveBalance,
}) => {
  const [balanceInput, setBalanceInput] = useState<string>(currentBalance.toString());

  useEffect(() => {
    setBalanceInput(currentBalance.toString());
  }, [currentBalance, isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(balanceInput);
    if (!isNaN(parsed) && parsed > 0) {
      onSaveBalance(parsed);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm select-none font-sans">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-[420px] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39]">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Wallet size={16} className="text-[#089981]" />
            <span>Account Balance & Capital</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-balance-modal"
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#2a2e39] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Initial / Default Balance (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-mono font-bold">
                $
              </span>
              <input
                type="number"
                step="any"
                min="100"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                autoFocus
                data-testid="balance-input"
                className="w-full bg-[#131722] border border-[#2a2e39] focus:border-[#2962ff] focus:outline-none rounded pl-8 pr-3 py-2 text-white font-mono font-bold text-base"
              />
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Updating initial balance recalculates equity, drawdown %, and risk metrics.
            </p>
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_BALANCES.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setBalanceInput(preset.toString())}
                  className={`py-1.5 rounded text-xs font-mono font-semibold border transition-all ${
                    parseFloat(balanceInput) === preset
                      ? 'bg-[#2962ff] text-white border-[#2962ff] shadow-md shadow-[#2962ff]/30'
                      : 'bg-[#131722] border-[#2a2e39] text-gray-300 hover:text-white hover:border-[#363c4e]'
                  }`}
                >
                  ${preset.toLocaleString()}
                </button>
              ))}
            </div>
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
              data-testid="save-balance-btn"
              className="px-4 py-2 rounded bg-[#2962ff] hover:bg-[#1f4cdb] text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-lg shadow-[#2962ff]/20"
            >
              <Check size={14} />
              <span>Save Balance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
