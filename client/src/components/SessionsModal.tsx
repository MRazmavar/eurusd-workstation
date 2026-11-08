/**
 * Modal for Managing Backtesting Sessions:
 * Create, Save, Load, Delete, Export, and Import sessions with full trades and drawings state.
 */
import React, { useState, useEffect } from 'react';
import { X, Save, FolderOpen, Trash2, Download, Upload, Plus, Check } from 'lucide-react';
import { BacktestSession, Trade, DrawingObject, UserSettings } from '../types';
import { marketClient } from '../services/MarketDataClient';

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTrades: Trade[];
  currentDrawings: DrawingObject[];
  currentSettings: UserSettings;
  currentTimeframe: string;
  onLoadSession: (session: BacktestSession) => void;
}

export const SessionsModal: React.FC<SessionsModalProps> = ({
  isOpen,
  onClose,
  currentTrades,
  currentDrawings,
  currentSettings,
  currentTimeframe,
  onLoadSession,
}) => {
  const [sessions, setSessions] = useState<BacktestSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const list = await marketClient.listSessions();
      setSessions(list);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      loadSessions();
      setSuccessMessage(null);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveCurrentSession = async () => {
    const name = sessionName.trim() || `EURUSD Backtest ${new Date().toLocaleDateString()}`;
    const newSession: BacktestSession = {
      session_id: `session_${Date.now()}`,
      name,
      created_at: Date.now(),
      updated_at: Date.now(),
      timeframe: currentTimeframe,
      trades: currentTrades,
      drawings: currentDrawings,
      settings: currentSettings,
    };

    try {
      await marketClient.saveSession(newSession);
      setSessionName('');
      setSuccessMessage(`Session "${name}" saved successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
      loadSessions();
    } catch (err) {
      alert('Failed to save session');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm('Are you sure you want to delete this session?')) return;
    try {
      await marketClient.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.session_id !== sessionId));
    } catch (err) {
      alert('Failed to delete session');
    }
  };

  const handleExportJSON = (s: BacktestSession) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(s, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${s.name.replace(/\s+/g, '_')}_${s.session_id}.json`);
    dlAnchor.click();
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed: BacktestSession = JSON.parse(event.target?.result as string);
        if (!parsed.session_id || !parsed.name) {
          alert('Invalid session file format.');
          return;
        }
        await marketClient.saveSession(parsed);
        loadSessions();
        setSuccessMessage(`Imported session "${parsed.name}" successfully!`);
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        alert('Failed to parse session JSON file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none font-sans text-xs">
      <div className="bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl w-[560px] max-h-[85vh] flex flex-col overflow-hidden text-gray-200">
        {/* Header */}
        <div className="h-11 px-4 border-b border-[#2a2e39] flex items-center justify-between bg-[#131722]">
          <div className="flex items-center space-x-2 font-bold text-sm text-white">
            <FolderOpen size={16} className="text-[#2962ff]" />
            <span>Backtesting Sessions Management</span>
          </div>
          <button data-testid="close-sessions-modal" onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39]">
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {successMessage && (
            <div className="p-2.5 rounded bg-[#089981]/20 border border-[#089981] text-[#089981] font-semibold flex items-center space-x-2">
              <Check size={14} />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Save Current Session Bar */}
          <div className="bg-[#131722] p-3 rounded-lg border border-[#2a2e39] space-y-2">
            <span className="font-semibold text-gray-300 block">Save Current Workspace Session</span>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Session name (e.g. London Breakout Jan 2024)"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                className="flex-1 bg-[#1e222d] border border-[#2a2e39] rounded px-3 py-1.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#2962ff]"
              />
              <button
                onClick={handleSaveCurrentSession}
                data-testid="save-session-btn"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#2962ff] hover:bg-[#1f4cdb] text-white font-bold transition-colors shadow"
              >
                <Save size={14} />
                <span>Save</span>
              </button>
            </div>
            <div className="flex items-center space-x-4 text-[10px] text-gray-400 pt-1">
              <span>Trades: <strong className="text-white">{currentTrades.length}</strong></span>
              <span>Drawings: <strong className="text-white">{currentDrawings.length}</strong></span>
              <span>Timeframe: <strong className="text-white">{currentTimeframe}</strong></span>
            </div>
          </div>

          {/* Import Session Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-semibold text-gray-300">Saved Sessions ({sessions.length})</span>
            <label className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-[#131722] hover:bg-[#2a2e39] border border-[#2a2e39] text-gray-300 hover:text-white cursor-pointer font-medium transition-colors">
              <Upload size={13} />
              <span>Import Session JSON</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>

          {/* Sessions List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">Loading sessions...</div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-[#131722]/50 rounded border border-[#2a2e39]/50">
                No saved backtesting sessions yet. Save your current progress above!
              </div>
            ) : (
              sessions.map((s, idx) => (
                <div
                  key={s.session_id || s.id || `session-${idx}`}
                  className="bg-[#131722] p-3 rounded-lg border border-[#2a2e39] flex items-center justify-between hover:border-[#363c4e] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">{s.name}</div>
                    <div className="flex items-center space-x-3 text-[10px] text-gray-400 font-mono">
                      <span>{new Date(s.updated_at).toLocaleDateString()}</span>
                      <span>{s.trades?.length || 0} Trades</span>
                      <span>{s.drawings?.length || 0} Drawings</span>
                      <span className="text-[#2962ff]">{s.timeframe || '1h'}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Load */}
                    <button
                      onClick={async () => {
                        try {
                          const full = await marketClient.fetchSession(s.session_id || s.id);
                          onLoadSession(full);
                        } catch {
                          onLoadSession(s);
                        }
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-[#089981]/20 hover:bg-[#089981] text-[#089981] hover:text-white font-semibold transition-colors border border-[#089981]/40"
                    >
                      Load
                    </button>
                    {/* Export */}
                    <button
                      onClick={() => handleExportJSON(s)}
                      className="p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39]"
                      title="Export JSON"
                    >
                      <Download size={14} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteSession(s.session_id || s.id)}
                      className="p-1 rounded text-gray-400 hover:text-[#f23645] hover:bg-[#2a2e39]"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
