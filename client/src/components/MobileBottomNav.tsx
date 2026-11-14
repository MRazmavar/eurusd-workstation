/**
 * Mobile Bottom Navigation Bar for EUR/USD Workstation.
 * Provides quick 1-tap switching between Chart, Trade, Positions, Analytics, and Drawing Tools.
 */
import React from 'react';
import {
  CandlestickChart,
  ShoppingBag,
  Layers,
  BarChart2,
  PenTool,
} from 'lucide-react';

export type MobileTab = 'chart' | 'trade' | 'positions' | 'analytics' | 'tools';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  openPositionsCount: number;
  hasActiveTradeSetup?: boolean;
  activeDrawingTool?: string;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  openPositionsCount,
  hasActiveTradeSetup = false,
  activeDrawingTool = 'crosshair',
}) => {
  const isToolActive = activeDrawingTool !== 'crosshair' && activeDrawingTool !== 'arrow';

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="h-14 bg-[#131722] border-t border-[#2a2e39] flex items-center justify-around px-1 z-30 select-none text-[10px]"
    >
      {/* 1. Chart Tab */}
      <button
        onClick={() => onTabChange('chart')}
        data-testid="mobile-nav-chart"
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          activeTab === 'chart'
            ? 'text-[#2962ff] font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <CandlestickChart size={19} className={activeTab === 'chart' ? 'text-[#2962ff]' : 'text-gray-400'} />
        <span className="mt-0.5">Chart</span>
      </button>

      {/* 2. Trade / Order Ticket Tab */}
      <button
        onClick={() => onTabChange('trade')}
        data-testid="mobile-nav-trade"
        className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
          activeTab === 'trade'
            ? 'text-[#089981] font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className="relative">
          <ShoppingBag size={19} className={activeTab === 'trade' ? 'text-[#089981]' : 'text-gray-400'} />
          {hasActiveTradeSetup && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#089981] animate-ping" />
          )}
        </div>
        <span className="mt-0.5">Trade</span>
      </button>

      {/* 3. Positions Tab */}
      <button
        onClick={() => onTabChange('positions')}
        data-testid="mobile-nav-positions"
        className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
          activeTab === 'positions'
            ? 'text-[#38bdf8] font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className="relative">
          <Layers size={19} className={activeTab === 'positions' ? 'text-[#38bdf8]' : 'text-gray-400'} />
          {openPositionsCount > 0 && (
            <span
              data-testid="mobile-positions-badge"
              className="absolute -top-1 -right-2 bg-[#2962ff] text-white text-[9px] px-1 rounded-full font-bold font-mono"
            >
              {openPositionsCount}
            </span>
          )}
        </div>
        <span className="mt-0.5">Positions</span>
      </button>

      {/* 4. Analytics Tab */}
      <button
        onClick={() => onTabChange('analytics')}
        data-testid="mobile-nav-analytics"
        className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
          activeTab === 'analytics'
            ? 'text-purple-400 font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <BarChart2 size={19} className={activeTab === 'analytics' ? 'text-purple-400' : 'text-gray-400'} />
        <span className="mt-0.5">Analytics</span>
      </button>

      {/* 5. Tools Tab */}
      <button
        onClick={() => onTabChange('tools')}
        data-testid="mobile-nav-tools"
        className={`flex-1 flex flex-col items-center justify-center py-1 relative transition-colors ${
          activeTab === 'tools' || isToolActive
            ? 'text-amber-400 font-bold'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      >
        <div className="relative">
          <PenTool size={19} className={activeTab === 'tools' || isToolActive ? 'text-amber-400' : 'text-gray-400'} />
          {isToolActive && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
          )}
        </div>
        <span className="mt-0.5">Tools</span>
      </button>
    </nav>
  );
};
