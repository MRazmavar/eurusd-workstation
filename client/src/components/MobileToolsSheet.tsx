/**
 * Mobile Drawing Tools Bottom Sheet.
 * Displays categorized drawing tools with touch-friendly buttons for mobile screens.
 */
import React from 'react';
import {
  X,
  Crosshair,
  MousePointer,
  Eraser,
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowUpRight,
  GitCommit,
  Compass,
  Maximize,
  Percent,
  Square,
  Circle,
  Triangle,
  Type,
  MessageSquare,
  Tag,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Magnet,
  Star,
} from 'lucide-react';
import { DrawingToolType, MagnetMode } from '../types';
import { LongPositionIcon, ShortPositionIcon } from '../utils/drawingTools';

interface MobileToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  magnetMode: MagnetMode;
  onToggleMagnet: (mode?: MagnetMode) => void;
  lockedAll: boolean;
  onToggleLockAll: () => void;
  hiddenAll: boolean;
  onToggleHideAll: () => void;
  onDeleteAll: () => void;
  favoriteTools?: DrawingToolType[];
  onToggleFavorite?: (tool: DrawingToolType) => void;
}

interface ToolItem {
  tool: DrawingToolType;
  label: string;
  icon: any;
  customIcon?: boolean;
}

export const MobileToolsSheet: React.FC<MobileToolsSheetProps> = ({
  isOpen,
  onClose,
  activeTool,
  onSelectTool,
  magnetMode,
  onToggleMagnet,
  lockedAll,
  onToggleLockAll,
  hiddenAll,
  onToggleHideAll,
  onDeleteAll,
  favoriteTools = [],
  onToggleFavorite,
}) => {
  if (!isOpen) return null;

  const handleToolClick = (tool: DrawingToolType) => {
    onSelectTool(tool);
    onClose();
  };

  const categories: { title: string; items: ToolItem[] }[] = [
    {
      title: 'Forecasting & Position Tools',
      items: [
        { tool: 'long_position', label: 'Long Position', icon: LongPositionIcon, customIcon: true },
        { tool: 'short_position', label: 'Short Position', icon: ShortPositionIcon, customIcon: true },
        { tool: 'price_range', label: 'Price Range', icon: Minus },
        { tool: 'date_range', label: 'Date Range', icon: MoveVertical },
      ],
    },
    {
      title: 'Cursor & Erase',
      items: [
        { tool: 'crosshair', label: 'Crosshair', icon: Crosshair },
        { tool: 'arrow', label: 'Arrow Cursor', icon: MousePointer },
        { tool: 'eraser', label: 'Eraser', icon: Eraser },
      ],
    },
    {
      title: 'Lines & Channels',
      items: [
        { tool: 'trendline', label: 'Trend Line', icon: TrendingUp },
        { tool: 'horizontal_line', label: 'Horizontal Line', icon: Minus },
        { tool: 'vertical_line', label: 'Vertical Line', icon: MoveVertical },
        { tool: 'ray', label: 'Ray', icon: ArrowUpRight },
        { tool: 'extended_line', label: 'Extended Line', icon: GitCommit },
        { tool: 'trend_angle', label: 'Trend Angle', icon: Compass },
        { tool: 'parallel_channel', label: 'Parallel Channel', icon: Maximize },
      ],
    },
    {
      title: 'Fibonacci',
      items: [
        { tool: 'fib_retracement', label: 'Fib Retracement', icon: Percent },
        { tool: 'fib_extension', label: 'Fib Extension', icon: Percent },
        { tool: 'fib_channel', label: 'Fib Channel', icon: Maximize },
      ],
    },
    {
      title: 'Shapes & Annotations',
      items: [
        { tool: 'rectangle', label: 'Rectangle', icon: Square },
        { tool: 'circle', label: 'Circle', icon: Circle },
        { tool: 'triangle', label: 'Triangle', icon: Triangle },
        { tool: 'text', label: 'Text', icon: Type },
        { tool: 'callout', label: 'Callout', icon: MessageSquare },
        { tool: 'price_label', label: 'Price Note', icon: Tag },
      ],
    },
  ];

  return (
    <div
      data-testid="mobile-tools-sheet"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-[#1e222d] border-t border-[#2a2e39] rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2e39]">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-white text-sm">Drawing & Analysis Tools</span>
            {activeTool !== 'crosshair' && (
              <span className="text-[10px] bg-[#2962ff] text-white px-2 py-0.5 rounded font-medium">
                Active: {activeTool.replace('_', ' ')}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#2a2e39]"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Global Utilities Strip (Magnet, Lock, Hide, Clear) */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#131722] border-b border-[#2a2e39] text-xs">
          {/* Magnet Mode Cycle */}
          <button
            onClick={() => onToggleMagnet()}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border transition-colors ${
              magnetMode !== 'off'
                ? 'bg-[#2962ff]/20 border-[#2962ff] text-[#2962ff]'
                : 'bg-[#1e222d] border-[#2a2e39] text-gray-300'
            }`}
          >
            <Magnet size={14} />
            <span className="font-medium text-[11px]">
              Magnet: {magnetMode.toUpperCase()}
            </span>
          </button>

          <div className="flex items-center space-x-1.5">
            {/* Lock / Unlock */}
            <button
              onClick={onToggleLockAll}
              className={`p-1.5 rounded border transition-colors ${
                lockedAll
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-[#1e222d] border-[#2a2e39] text-gray-300'
              }`}
              title={lockedAll ? 'Unlock All' : 'Lock All'}
            >
              {lockedAll ? <Lock size={15} /> : <Unlock size={15} />}
            </button>

            {/* Hide / Show */}
            <button
              onClick={onToggleHideAll}
              className={`p-1.5 rounded border transition-colors ${
                hiddenAll
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                  : 'bg-[#1e222d] border-[#2a2e39] text-gray-300'
              }`}
              title={hiddenAll ? 'Show All' : 'Hide All'}
            >
              {hiddenAll ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {/* Delete All */}
            <button
              onClick={() => {
                if (window.confirm('Delete all drawing objects on the chart?')) {
                  onDeleteAll();
                  onClose();
                }
              }}
              className="p-1.5 rounded border border-[#2a2e39] bg-[#1e222d] text-gray-400 hover:text-[#f23645] hover:border-[#f23645]"
              title="Delete All Drawings"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {categories.map((cat) => (
            <div key={cat.title} className="space-y-1.5">
              <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                {cat.title}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {cat.items.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeTool === item.tool;
                  const isFav = favoriteTools.includes(item.tool);

                  return (
                    <div
                      key={item.tool}
                      onClick={() => handleToolClick(item.tool)}
                      data-testid={`mobile-tool-item-${item.tool}`}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#2962ff]/20 border-[#2962ff] text-white shadow-sm'
                          : 'bg-[#131722] border-[#2a2e39] text-gray-200 hover:bg-[#2a2e39]'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        {item.customIcon ? (
                          <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#2962ff]' : 'text-gray-300'}`} />
                        ) : (
                          <Icon size={16} className={`flex-shrink-0 ${isSelected ? 'text-[#2962ff]' : 'text-gray-300'}`} />
                        )}
                        <span className="text-xs font-medium truncate">{item.label}</span>
                      </div>
                      {onToggleFavorite && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.tool);
                          }}
                          className="p-1 text-gray-500 hover:text-amber-400"
                          title="Toggle Favorite"
                        >
                          <Star size={13} className={isFav ? 'text-amber-400 fill-amber-400' : ''} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
