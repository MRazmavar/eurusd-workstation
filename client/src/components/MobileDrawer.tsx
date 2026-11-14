/**
 * Mobile Drawer Menu.
 * Slide-over menu for accessing workstation features, indicator controls, session data,
 * account balance, and device view mode switching on mobile screens.
 */
import React from 'react';
import {
  X,
  Smartphone,
  Monitor,
  Sparkles,
  Wallet,
  Sliders,
  Clock,
  Newspaper,
  Play,
  Dices,
  ShieldCheck,
  Settings,
  FolderOpen,
  Maximize2,
  Minimize2,
  RotateCcw,
  Layers,
  Edit3,
} from 'lucide-react';
import { ViewModePreference, EffectiveMode } from '../hooks/useDeviceMode';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: ViewModePreference;
  effectiveMode: EffectiveMode;
  onSetViewMode: (mode: ViewModePreference) => void;
  balance?: number;
  equity?: number;
  onOpenBalanceModal?: () => void;
  onOpenIndicators: () => void;
  activeIndicatorsCount: number;
  sessionsIndicatorActive?: boolean;
  activeSessionLabel?: string;
  onToggleSessionsIndicator?: () => void;
  onOpenSessions?: () => void;
  newsActive?: boolean;
  onToggleNews?: () => void;
  newsFilter?: 'ALL' | 'HIGH_ONLY';
  onToggleNewsFilter?: () => void;
  replayActive: boolean;
  onToggleReplay: () => void;
  onRandomDateReplay?: () => void;
  onOpenValidation?: () => void;
  onOpenSettings: () => void;
  onResetChart: () => void;
  onFitData: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  viewMode,
  effectiveMode,
  onSetViewMode,
  balance = 10000,
  equity = 10000,
  onOpenBalanceModal,
  onOpenIndicators,
  activeIndicatorsCount,
  sessionsIndicatorActive = true,
  activeSessionLabel,
  onToggleSessionsIndicator,
  onOpenSessions,
  newsActive = true,
  onToggleNews,
  newsFilter = 'ALL',
  onToggleNewsFilter,
  replayActive,
  onToggleReplay,
  onRandomDateReplay,
  onOpenValidation,
  onOpenSettings,
  onResetChart,
  onFitData,
}) => {
  if (!isOpen) return null;

  return (
    <div
      data-testid="mobile-drawer-overlay"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        data-testid="mobile-drawer-content"
        className="w-80 max-w-[85vw] h-full bg-[#131722] border-l border-[#2a2e39] flex flex-col shadow-2xl animate-in slide-in-from-right duration-250 select-none text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="h-14 px-4 bg-[#1e222d] border-b border-[#2a2e39] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2962ff] animate-pulse" />
            <span className="font-bold text-white text-sm">EUR/USD Workstation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39]"
            title="Close Drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 1. Device Mode Recognition & Switcher */}
          <div className="bg-[#1e222d] p-3 rounded-lg border border-[#2a2e39] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-300 text-[11px] uppercase tracking-wider">
                Display Mode
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Active: <span className="text-[#2962ff] font-bold uppercase">{effectiveMode}</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 bg-[#131722] p-1 rounded border border-[#2a2e39]">
              <button
                type="button"
                onClick={() => onSetViewMode('auto')}
                data-testid="mode-select-auto"
                className={`py-1.5 rounded flex flex-col items-center justify-center font-medium transition-colors ${
                  viewMode === 'auto'
                    ? 'bg-[#2962ff] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Sparkles size={13} />
                <span className="text-[10px] mt-0.5">Auto</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewMode('mobile')}
                data-testid="mode-select-mobile"
                className={`py-1.5 rounded flex flex-col items-center justify-center font-medium transition-colors ${
                  viewMode === 'mobile'
                    ? 'bg-[#2962ff] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Smartphone size={13} />
                <span className="text-[10px] mt-0.5">Mobile</span>
              </button>
              <button
                type="button"
                onClick={() => onSetViewMode('desktop')}
                data-testid="mode-select-desktop"
                className={`py-1.5 rounded flex flex-col items-center justify-center font-medium transition-colors ${
                  viewMode === 'desktop'
                    ? 'bg-[#2962ff] text-white shadow'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Monitor size={13} />
                <span className="text-[10px] mt-0.5">Desktop</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500 leading-tight">
              Auto detects whether your device is a phone, tablet or desktop computer. You can override it anytime.
            </p>
          </div>

          {/* 2. Account Balance Card */}
          <div className="bg-[#1e222d] p-3 rounded-lg border border-[#2a2e39] space-y-2">
            <div className="flex items-center justify-between text-gray-300">
              <div className="flex items-center space-x-1.5">
                <Wallet size={14} className="text-[#089981]" />
                <span className="font-semibold text-[11px] uppercase tracking-wider">Simulated Account</span>
              </div>
              {onOpenBalanceModal && (
                <button
                  onClick={() => {
                    onClose();
                    onOpenBalanceModal();
                  }}
                  className="text-[10px] text-[#38bdf8] hover:underline flex items-center space-x-0.5"
                >
                  <Edit3 size={10} />
                  <span>Edit</span>
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
              <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                <span className="text-gray-400 text-[10px] block font-sans">Balance</span>
                <span className="text-white font-bold text-xs">
                  ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="bg-[#131722] p-2 rounded border border-[#2a2e39]">
                <span className="text-gray-400 text-[10px] block font-sans">Equity</span>
                <span className={`font-bold text-xs ${equity >= balance ? 'text-[#089981]' : 'text-[#f23645]'}`}>
                  ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Analysis & Overlays */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block px-1">
              Chart & Analysis
            </span>

            {/* Indicators */}
            <button
              onClick={() => {
                onClose();
                onOpenIndicators();
              }}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-200 hover:text-white hover:border-[#38bdf8] transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Sliders size={15} className="text-[#2962ff]" />
                <span className="font-medium">Technical Indicators</span>
              </div>
              <span className="bg-[#2962ff] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {activeIndicatorsCount}
              </span>
            </button>

            {/* Forex Sessions */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-200">
              <div className="flex items-center space-x-2">
                <Clock size={15} className="text-[#8b5cf6]" />
                <div>
                  <span className="font-medium block">Market Sessions</span>
                  {activeSessionLabel && (
                    <span className="text-[10px] text-[#10b981] font-mono">
                      Active: {activeSessionLabel}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={onToggleSessionsIndicator}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    sessionsIndicatorActive
                      ? 'bg-[#8b5cf6] text-white'
                      : 'bg-[#131722] text-gray-400 border border-[#2a2e39]'
                  }`}
                >
                  {sessionsIndicatorActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Forex Factory News */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-200">
              <div className="flex items-center space-x-2">
                <Newspaper size={15} className="text-[#ef4444]" />
                <div>
                  <span className="font-medium block">Economic News</span>
                  <span className="text-[10px] text-gray-400">
                    {newsFilter === 'HIGH_ONLY' ? 'High Impact Only' : 'All Releases'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {onToggleNewsFilter && (
                  <button
                    onClick={onToggleNewsFilter}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-[#131722] text-gray-300 border border-[#2a2e39]"
                    title="Toggle News Filter"
                  >
                    {newsFilter === 'HIGH_ONLY' ? 'High' : 'All'}
                  </button>
                )}
                <button
                  onClick={onToggleNews}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                    newsActive
                      ? 'bg-[#ef4444] text-white'
                      : 'bg-[#131722] text-gray-400 border border-[#2a2e39]'
                  }`}
                >
                  {newsActive ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Bar Replay */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-200">
              <div className="flex items-center space-x-2">
                <Play size={15} className="text-[#089981]" />
                <span className="font-medium">Bar Replay Engine</span>
              </div>
              <button
                data-testid="mobile-drawer-replay-toggle"
                onClick={onToggleReplay}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                  replayActive
                    ? 'bg-[#2962ff] text-white'
                    : 'bg-[#131722] text-gray-400 border border-[#2a2e39]'
                }`}
              >
                {replayActive ? 'ACTIVE' : 'START'}
              </button>
            </div>

            {/* Random Date */}
            {onRandomDateReplay && (
              <button
                onClick={() => {
                  onClose();
                  onRandomDateReplay();
                }}
                className="w-full flex items-center space-x-2 p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-purple-300 hover:text-white hover:border-purple-500 transition-colors"
              >
                <Dices size={15} className="text-purple-400" />
                <span className="font-medium">Jump to Random Date (Blind Test)</span>
              </button>
            )}

            {/* Saved Sessions */}
            {onOpenSessions && (
              <button
                onClick={() => {
                  onClose();
                  onOpenSessions();
                }}
                className="w-full flex items-center space-x-2 p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-amber-300 hover:text-white hover:border-amber-500 transition-colors"
              >
                <FolderOpen size={15} className="text-amber-400" />
                <span className="font-medium">Saved Backtesting Sessions</span>
              </button>
            )}
          </div>

          {/* 4. Chart Tools & System */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block px-1">
              Viewport & System
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onResetChart();
                  onClose();
                }}
                className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white"
              >
                <RotateCcw size={13} />
                <span>Reset Scale</span>
              </button>
              <button
                onClick={() => {
                  onFitData();
                  onClose();
                }}
                className="flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white"
              >
                <Layers size={13} />
                <span>Fit All Data</span>
              </button>
            </div>

            {onOpenValidation && (
              <button
                onClick={() => {
                  onClose();
                  onOpenValidation();
                }}
                className="w-full flex items-center space-x-2 p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-[#089981] hover:text-white transition-colors"
              >
                <ShieldCheck size={15} />
                <span className="font-medium">Market Data Integrity Audit</span>
              </button>
            )}

            <button
              onClick={() => {
                onClose();
                onOpenSettings();
              }}
              className="w-full flex items-center space-x-2 p-2.5 rounded-lg bg-[#1e222d] border border-[#2a2e39] text-gray-300 hover:text-white transition-colors"
            >
              <Settings size={15} />
              <span className="font-medium">Workstation Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
