/**
 * Workstation Settings & Risk Management Configuration Modal.
 */
import React, { useState } from 'react';
import { Settings, X, Save, ShieldCheck, Database, Sliders, Globe } from 'lucide-react';
import { UserSettings } from '../types';
import { TIMEZONE_OPTIONS, TIME_FORMAT_OPTIONS } from '../utils/timezone';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSave: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [formData, setFormData] = useState<UserSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<'account' | 'broker' | 'feed' | 'sessions'>('account');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col text-xs select-none">
        {/* Header */}
        <div className="h-12 border-b border-[#2a2e39] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Settings size={16} className="text-[#2962ff]" />
            <span className="font-bold text-sm text-white">Workstation Settings</span>
          </div>
          <button
            onClick={onClose}
            data-testid="close-settings-modal"
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#2a2e39] px-3 bg-[#131722]">
          {[
            { id: 'account', label: 'Account & Sizing', icon: ShieldCheck },
            { id: 'broker', label: 'Spread & Execution', icon: Sliders },
            { id: 'feed', label: 'Data Source', icon: Database },
            { id: 'sessions', label: 'Sessions & Timezone', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 py-2.5 px-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-[#2962ff] text-[#2962ff]'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: ACCOUNT & RISK */}
          {activeTab === 'account' && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-300 block mb-1">Initial Backtesting Balance ($)</label>
                <input
                  type="number"
                  value={formData.initial_balance}
                  onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 10000 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Account Currency</label>
                <input
                  type="text"
                  value={formData.account_currency}
                  disabled
                  className="w-full bg-[#131722]/50 border border-[#2a2e39] rounded px-3 py-2 text-gray-400 font-mono"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Default Risk Per Trade (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.default_risk_percent}
                  onChange={(e) => setFormData({ ...formData, default_risk_percent: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Default Lot Size</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.default_lot_size}
                  onChange={(e) => setFormData({ ...formData, default_lot_size: parseFloat(e.target.value) || 1 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BROKER & SPREAD */}
          {activeTab === 'broker' && (
            <div className="space-y-3">
              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-gray-400 text-[11px] leading-relaxed">
                Realistic trade simulation executes BUY orders at the Ask price and SELL orders at the Bid price, factoring in broker commission and slippage.
              </div>

              <div>
                <label className="text-gray-300 block mb-1">EUR/USD Spread (Pips)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.spread_pips}
                  onChange={(e) => setFormData({ ...formData, spread_pips: parseFloat(e.target.value) || 1.2 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Commission ($ per round-turn standard lot)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.commission_per_lot}
                  onChange={(e) => setFormData({ ...formData, commission_per_lot: parseFloat(e.target.value) || 3.5 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Simulated Slippage (Pips)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.slippage_pips}
                  onChange={(e) => setFormData({ ...formData, slippage_pips: parseFloat(e.target.value) || 0.2 })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white font-mono focus:outline-none focus:border-[#2962ff]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: DATA SOURCE */}
          {activeTab === 'feed' && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-300 block mb-1">Active Market Data Provider</label>
                <select
                  value={formData.active_provider}
                  onChange={(e) => setFormData({ ...formData, active_provider: e.target.value })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff]"
                >
                  <option value="dukascopy">Dukascopy Bank SA (Swiss Forex Bank - Real bi5 Feed)</option>
                  <option value="twelvedata">Twelve Data WebSocket (Requires API Key)</option>
                  <option value="finnhub">Finnhub Forex API (Requires API Key)</option>
                </select>
              </div>

              {formData.active_provider === 'twelvedata' && (
                <div>
                  <label className="text-gray-300 block mb-1">Twelve Data API Key</label>
                  <input
                    type="password"
                    placeholder="Enter Twelve Data API key..."
                    value={formData.twelvedata_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, twelvedata_api_key: e.target.value })}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              )}

              {formData.active_provider === 'finnhub' && (
                <div>
                  <label className="text-gray-300 block mb-1">Finnhub API Key</label>
                  <input
                    type="password"
                    placeholder="Enter Finnhub API key..."
                    value={formData.finnhub_api_key || ''}
                    onChange={(e) => setFormData({ ...formData, finnhub_api_key: e.target.value })}
                    className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff]"
                  />
                </div>
              )}

              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] text-gray-400 text-[11px]">
                <span className="text-[#089981] font-bold">Data Integrity Guarantee:</span> The platform only fetches authentic interbank EUR/USD rates and historical OHLCV candles without synthetic generation. When global Forex markets close on weekends, the status indicator displays <span className="text-amber-400 font-bold">CLOSED_WEEKEND</span> with the latest official close price.
              </div>
            </div>
          )}

          {/* TAB 4: SESSIONS & TIMEZONE */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div>
                <label className="text-gray-300 block mb-1">Chart Timezone</label>
                <select
                  data-testid="settings-timezone-select"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff] text-xs font-mono"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label} ({tz.utcOffset})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-gray-300 block mb-1">Date & Time Format (Bottom Axis & Badges)</label>
                <select
                  data-testid="settings-timeformat-select"
                  value={formData.time_format || 'adaptive'}
                  onChange={(e) => setFormData({ ...formData, time_format: e.target.value })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff] text-xs font-mono"
                >
                  {TIME_FORMAT_OPTIONS.map((fmt) => (
                    <option key={fmt.id} value={fmt.id}>
                      {fmt.label} — {fmt.example}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2 pt-0.5">
                <input
                  type="checkbox"
                  id="settings-show-seconds"
                  data-testid="settings-show-seconds-toggle"
                  checked={formData.show_seconds || false}
                  onChange={(e) => setFormData({ ...formData, show_seconds: e.target.checked })}
                  className="rounded border-[#2a2e39] bg-[#131722] text-[#2962ff] focus:ring-0"
                />
                <label htmlFor="settings-show-seconds" className="text-xs text-gray-300 cursor-pointer select-none">
                  Show Seconds (:ss) on Bottom Time Axis & Badges
                </label>
              </div>

              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] space-y-2">
                <span className="font-bold text-gray-200 block text-[11px]">Filtered Forex Session Windows</span>
                <div className="space-y-1.5 text-gray-400 text-[11px]">
                  <div className="flex justify-between items-center">
                    <span className="text-cyan-400 font-semibold">🛡️ Shield Area (Asia 1st hour):</span>
                    <span className="font-mono text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-800/40">00:00 - 01:00 UTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-purple-400 font-semibold">Asia Full Session:</span>
                    <span className="font-mono text-purple-300 bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">00:00 - 08:00 UTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-amber-400 font-semibold">Frankfurt Session (1st hour):</span>
                    <span className="font-mono text-amber-300 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">07:00 - 08:00 UTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-blue-400 font-semibold">London Session (1st hour):</span>
                    <span className="font-mono text-blue-300 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-800/40">08:00 - 09:00 UTC</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-400 font-semibold">New York Open (1st hour):</span>
                    <span className="font-mono text-emerald-300 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">13:00 - 14:00 UTC</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="border-t border-[#2a2e39] pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-[#131722] border border-[#2a2e39] text-gray-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="settings-save-btn"
              className="px-4 py-2 rounded bg-[#2962ff] hover:bg-[#1f4cdb] text-white font-bold flex items-center space-x-1.5 shadow"
            >
              <Save size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
