/**
 * TradingView-Style Left Vertical Drawing Toolbar.
 */
import React, { useState } from 'react';
import {
  Crosshair,
  MousePointer,
  Eraser,
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowUpRight,
  GitCommit,
  Maximize,
  Square,
  Circle,
  Triangle,
  PenTool,
  Type,
  Tag,
  ArrowRight,
  MessageSquare,
  BarChart,
  Percent,
  Ruler,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Compass,
  Layers,
  ChevronRight,
  Magnet,
} from 'lucide-react';
import { DrawingToolType, MagnetMode } from '../types';

interface LeftToolbarProps {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  magnetMode: MagnetMode;
  onToggleMagnet: (mode?: MagnetMode) => void;
  lockedAll: boolean;
  onToggleLockAll: () => void;
  hiddenAll: boolean;
  onToggleHideAll: () => void;
  onDeleteAll: () => void;
}

interface ToolGroup {
  id: string;
  defaultTool: DrawingToolType;
  icon: any;
  title: string;
  items: { tool: DrawingToolType; label: string; icon: any }[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: 'cursor',
    defaultTool: 'crosshair',
    icon: Crosshair,
    title: 'Cursor Tools',
    items: [
      { tool: 'crosshair', label: 'Crosshair', icon: Crosshair },
      { tool: 'arrow', label: 'Arrow Cursor', icon: MousePointer },
      { tool: 'eraser', label: 'Eraser', icon: Eraser },
    ],
  },
  {
    id: 'trendlines',
    defaultTool: 'trendline',
    icon: TrendingUp,
    title: 'Trend Lines',
    items: [
      { tool: 'trendline', label: 'Trend Line', icon: TrendingUp },
      { tool: 'horizontal_line', label: 'Horizontal Line', icon: Minus },
      { tool: 'vertical_line', label: 'Vertical Line', icon: MoveVertical },
      { tool: 'ray', label: 'Ray', icon: ArrowUpRight },
      { tool: 'extended_line', label: 'Extended Line', icon: GitCommit },
      { tool: 'trend_angle', label: 'Trend Angle', icon: Compass },
    ],
  },
  {
    id: 'channels',
    defaultTool: 'parallel_channel',
    icon: Maximize,
    title: 'Channels',
    items: [
      { tool: 'parallel_channel', label: 'Parallel Channel', icon: Maximize },
      { tool: 'regression_trend', label: 'Regression Trend', icon: TrendingUp },
      { tool: 'flat_top_bottom', label: 'Flat Top/Bottom', icon: Minus },
    ],
  },
  {
    id: 'fibonacci',
    defaultTool: 'fib_retracement',
    icon: Percent,
    title: 'Fibonacci Tools',
    items: [
      { tool: 'fib_retracement', label: 'Fib Retracement', icon: Percent },
      { tool: 'fib_extension', label: 'Fib Extension', icon: TrendingUp },
      { tool: 'fib_fan', label: 'Fib Fan', icon: Compass },
      { tool: 'fib_timezones', label: 'Fib Time Zones', icon: MoveVertical },
    ],
  },
  {
    id: 'shapes',
    defaultTool: 'rectangle',
    icon: Square,
    title: 'Geometric Shapes',
    items: [
      { tool: 'rectangle', label: 'Rectangle', icon: Square },
      { tool: 'circle', label: 'Circle / Ellipse', icon: Circle },
      { tool: 'triangle', label: 'Triangle', icon: Triangle },
      { tool: 'polyline', label: 'Polyline', icon: PenTool },
    ],
  },
  {
    id: 'annotations',
    defaultTool: 'text',
    icon: Type,
    title: 'Annotation Tools',
    items: [
      { tool: 'text', label: 'Text', icon: Type },
      { tool: 'note', label: 'Note', icon: MessageSquare },
      { tool: 'price_label', label: 'Price Label', icon: Tag },
      { tool: 'arrow_marker', label: 'Arrow Marker', icon: ArrowRight },
      { tool: 'callout', label: 'Callout', icon: MessageSquare },
    ],
  },
  {
    id: 'trading',
    defaultTool: 'long_position',
    icon: BarChart,
    title: 'Prediction & Measurement',
    items: [
      { tool: 'long_position', label: 'Long Position', icon: BarChart },
      { tool: 'short_position', label: 'Short Position', icon: BarChart },
      { tool: 'price_range', label: 'Price Range', icon: MoveVertical },
      { tool: 'date_range', label: 'Date Range', icon: Minus },
      { tool: 'date_price_range', label: 'Date & Price Range', icon: Square },
      { tool: 'measure', label: 'Measure Tool', icon: Ruler },
    ],
  },
];

export const LeftToolbar: React.FC<LeftToolbarProps> = ({
  activeTool,
  onSelectTool,
  magnetMode,
  onToggleMagnet,
  lockedAll,
  onToggleLockAll,
  hiddenAll,
  onToggleHideAll,
  onDeleteAll,
}) => {
  const [openFlyoutId, setOpenFlyoutId] = useState<string | null>(null);
  const [lastSelectedTools, setLastSelectedTools] = useState<Record<string, DrawingToolType>>({});

  // Determine current active group icon
  const getGroupIcon = (group: ToolGroup) => {
    const selectedInGroup = lastSelectedTools[group.id];
    if (selectedInGroup) {
      const match = group.items.find(i => i.tool === selectedInGroup);
      if (match) return match.icon;
    }
    const matched = group.items.find(i => i.tool === activeTool);
    return matched ? matched.icon : group.icon;
  };

  const isGroupActive = (group: ToolGroup) => {
    return group.items.some(i => i.tool === activeTool);
  };

  return (
    <div className="w-12 bg-[#131722] border-r border-[#2a2e39] flex flex-col justify-between items-center py-2 z-20 select-none">
      {/* Top Drawing Tool Groups */}
      <div className="flex flex-col space-y-1 w-full items-center">
        {TOOL_GROUPS.map((group) => {
          const Icon = getGroupIcon(group);
          const active = isGroupActive(group);
          const isFlyoutOpen = openFlyoutId === group.id;

          return (
            <div key={group.id} className="relative flex justify-center items-center">
              <button
                onClick={() => {
                  const tool = lastSelectedTools[group.id] || group.defaultTool;
                  onSelectTool(tool);
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setOpenFlyoutId(isFlyoutOpen ? null : group.id);
                }}
                className={`w-7 h-8 rounded-l flex items-center justify-center transition-colors ${
                  active
                    ? 'bg-[#2962ff] text-white shadow'
                    : 'text-gray-400 hover:text-white hover:bg-[#1e222d]'
                }`}
                title={group.title}
              >
                <Icon size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFlyoutId(isFlyoutOpen ? null : group.id);
                }}
                className={`w-3 h-8 rounded-r flex items-center justify-center text-[7px] transition-colors ${
                  active
                    ? 'bg-[#2962ff] text-white'
                    : 'text-gray-500 hover:text-white hover:bg-[#2a2e39]'
                }`}
                title={`${group.title} Menu`}
              >
                ▸
              </button>

              {/* Flyout Submenu */}
              {isFlyoutOpen && (
                <div
                  className="absolute left-11 top-0 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl py-1 w-48 z-50 text-xs"
                  onMouseLeave={() => setOpenFlyoutId(null)}
                >
                  <div className="px-3 py-1 text-[10px] text-gray-400 font-semibold uppercase tracking-wider border-b border-[#2a2e39] mb-1">
                    {group.title}
                  </div>
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = activeTool === item.tool;
                    return (
                      <button
                        key={item.tool}
                        onClick={() => {
                          setLastSelectedTools(prev => ({ ...prev, [group.id]: item.tool }));
                          onSelectTool(item.tool);
                          setOpenFlyoutId(null);
                        }}
                        className={`w-full flex items-center space-x-2.5 px-3 py-1.5 text-left transition-colors ${
                          isSelected
                            ? 'bg-[#2962ff]/20 text-[#2962ff] font-semibold'
                            : 'text-gray-300 hover:bg-[#2a2e39] hover:text-white'
                        }`}
                      >
                        <ItemIcon size={14} className={isSelected ? 'text-[#2962ff]' : 'text-gray-400'} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Global Modifiers */}
      <div className="flex flex-col space-y-1.5 w-full items-center border-t border-[#2a2e39] pt-2">
        {/* Magnet Mode */}
        <div className="relative">
          <button
            onClick={() => {
              if (magnetMode === 'off') onToggleMagnet('weak');
              else if (magnetMode === 'weak') onToggleMagnet('strong');
              else onToggleMagnet('off');
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setOpenFlyoutId(openFlyoutId === 'magnet' ? null : 'magnet');
            }}
            className={`w-8 h-8 rounded flex items-center justify-center transition-all relative ${
              magnetMode === 'weak'
                ? 'bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/40 ring-1 ring-[#38bdf8]'
                : magnetMode === 'strong'
                ? 'bg-[#00bcd4] text-black shadow-md shadow-[#00bcd4]/40 ring-1 ring-white'
                : 'text-gray-400 hover:text-white hover:bg-[#1e222d]'
            }`}
            title={`Magnet Mode: ${magnetMode.toUpperCase()} (Click to cycle Off/Weak/Strong, Right-click for menu, Hold Ctrl to toggle)`}
            data-testid="magnet-mode-button"
          >
            <Magnet size={16} />
            {magnetMode === 'weak' && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-[#1e222d] text-[#38bdf8] text-[8px] font-black px-0.5 rounded leading-none border border-[#2962ff]">
                W
              </span>
            )}
            {magnetMode === 'strong' && (
              <span className="absolute -bottom-0.5 -right-0.5 bg-[#131722] text-[#00bcd4] text-[8px] font-black px-0.5 rounded leading-none border border-[#00bcd4]">
                S
              </span>
            )}
          </button>

          {/* Magnet Submenu */}
          {openFlyoutId === 'magnet' && (
            <div className="absolute left-10 bottom-0 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl py-1 z-50 w-44 font-sans text-xs">
              <div className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 border-b border-[#2a2e39]">
                Magnet Snapping
              </div>
              <button
                onClick={() => {
                  onToggleMagnet('weak');
                  setOpenFlyoutId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                  magnetMode === 'weak' ? 'bg-[#2962ff]/20 text-[#38bdf8] font-bold' : 'text-gray-300 hover:bg-[#2a2e39]'
                }`}
              >
                <span>Weak Magnet</span>
                <span className="text-[10px] text-gray-400">Within 35px</span>
              </button>
              <button
                onClick={() => {
                  onToggleMagnet('strong');
                  setOpenFlyoutId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                  magnetMode === 'strong' ? 'bg-[#00bcd4]/20 text-[#00bcd4] font-bold' : 'text-gray-300 hover:bg-[#2a2e39]'
                }`}
              >
                <span>Strong Magnet</span>
                <span className="text-[10px] text-gray-400">Nearest Bar</span>
              </button>
              <button
                onClick={() => {
                  onToggleMagnet('off');
                  setOpenFlyoutId(null);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors ${
                  magnetMode === 'off' ? 'bg-gray-800 text-white font-bold' : 'text-gray-400 hover:bg-[#2a2e39]'
                }`}
              >
                <span>Magnet Off</span>
                <span className="text-[10px] text-gray-500">Free Cursor</span>
              </button>
            </div>
          )}
        </div>

        {/* Lock All Drawings */}
        <button
          onClick={onToggleLockAll}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
            lockedAll
              ? 'bg-amber-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#1e222d]'
          }`}
          title={lockedAll ? 'Unlock All Drawings' : 'Lock All Drawings'}
        >
          {lockedAll ? <Lock size={15} /> : <Unlock size={15} />}
        </button>

        {/* Hide All Drawings */}
        <button
          onClick={onToggleHideAll}
          className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
            hiddenAll
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-[#1e222d]'
          }`}
          title={hiddenAll ? 'Show All Drawings' : 'Hide All Drawings'}
        >
          {hiddenAll ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>

        {/* Delete All Drawings */}
        <button
          onClick={() => {
            if (window.confirm('Delete all drawing objects on the chart?')) {
              onDeleteAll();
            }
          }}
          className="w-8 h-8 rounded flex items-center justify-center text-gray-400 hover:text-[#f23645] hover:bg-[#1e222d] transition-colors"
          title="Remove All Drawings"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
};
