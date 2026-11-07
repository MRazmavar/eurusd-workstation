/**
 * Workstation Settings & Risk Management Configuration Modal.
 */
import React, { useState } from 'react';
import { Settings, X, Save, ShieldCheck, Database, Sliders, Globe } from 'lucide-react';
import { UserSettings } from '../types';

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
                  <option value="yahoo">Yahoo Finance Interbank Feed (Authentic Data, Zero-Config)</option>
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
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="w-full bg-[#131722] border border-[#2a2e39] rounded px-3 py-2 text-white focus:outline-none focus:border-[#2962ff]"
                >
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">EST / EDT (New York)</option>
                  <option value="Europe/London">GMT / BST (London)</option>
                  <option value="Europe/Frankfurt">CET / CEST (Frankfurt / Paris)</option>
                  <option value="Asia/Tokyo">JST (Tokyo)</option>
                </select>
              </div>

              <div className="p-3 bg-[#131722] rounded border border-[#2a2e39] space-y-2">
                <span className="font-bold text-gray-200 block text-[11px]">Session Windows</span>
                <div className="space-y-1 text-gray-400 text-[11px]">
                  <div className="flex justify-between">
                    <span>Asian Session (Tokyo):</span>
                    <span className="font-mono text-white">00:00 - 09:00 UTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>London Session:</span>
                    <span className="font-mono text-white">07:00 - 16:00 UTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>New York Session:</span>
                    <span className="font-mono text-white">12:00 - 21:00 UTC</span>
                  </div>
                  <div className="flex justify-between">
                    <span>London / NY Overlap:</span>
                    <span className="font-mono text-[#2962ff] font-bold">12:00 - 16:00 UTC</span>
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
