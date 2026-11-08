/**
 * TradingView-Style Draggable Floating Favorites Drawing Toolbar.
 * Provides quick 1-click access to starred technical analysis drawing tools.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical, X, Star } from 'lucide-react';
import { DrawingToolType } from '../types';
import { getToolMetadata } from '../utils/drawingTools';

interface FavoritesToolbarProps {
  favoriteTools: DrawingToolType[];
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  onToggleFavorite: (tool: DrawingToolType) => void;
  onClose?: () => void;
}

export const FavoritesToolbar: React.FC<FavoritesToolbarProps> = ({
  favoriteTools,
  activeTool,
  onSelectTool,
  onToggleFavorite,
  onClose,
}) => {
  // Load saved position or default to bottom-left floating dock
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('eurusd_fav_toolbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          return parsed;
        }
      }
    } catch {}
    return { x: 70, y: 520 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Dragging logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: position.x,
      startY: position.y,
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newX = Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.startX + dx));
      const newY = Math.max(40, Math.min(window.innerHeight - 100, dragStartRef.current.startY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem('eurusd_fav_toolbar_pos', JSON.stringify(position));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  if (!favoriteTools || favoriteTools.length === 0) {
    return null;
  }

  return (
    <div
      ref={toolbarRef}
      data-testid="favorites-toolbar"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      className={`absolute z-30 flex items-center bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl p-1 select-none font-sans text-xs transition-shadow ${
        isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50 cursor-grabbing' : 'shadow-black/60'
      }`}
    >
      {/* Draggable Grip Handle */}
      <div
        data-testid="favorites-toolbar-handle"
        onMouseDown={handleMouseDown}
        className="flex items-center justify-center w-5 h-8 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 group"
        title="Drag to reposition favorites toolbar"
      >
        <GripVertical size={14} className="group-hover:scale-110 transition-transform" />
      </div>

      <div className="h-5 w-[1px] bg-[#2a2e39] mx-1" />

      {/* Favorite Tools List */}
      <div className="flex items-center space-x-1">
        {favoriteTools.map((tool) => {
          const meta = getToolMetadata(tool);
          const Icon = meta.icon;
          const isActive = activeTool === tool;

          return (
            <div key={tool} className="relative group/fav">
              <button
                type="button"
                data-testid={`fav-tool-${tool}`}
                onClick={() => onSelectTool(tool)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onToggleFavorite(tool);
                }}
                className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${
                  isActive
                    ? 'bg-[#2962ff] text-white shadow-md shadow-[#2962ff]/30 font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a2e39]'
                }`}
                title={`${meta.label} (Click to use, Right-click to unstar)`}
              >
                <Icon size={16} />
              </button>

              {/* Quick remove unstar button on hover */}
              <button
                type="button"
                data-testid={`fav-unstar-${tool}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(tool);
                }}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#131722] border border-amber-500/60 rounded-full flex items-center justify-center text-amber-400 opacity-0 group-hover/fav:opacity-100 hover:scale-110 transition-all shadow-sm"
                title={`Remove ${meta.label} from favorites`}
              >
                <Star size={8} className="fill-amber-400 text-amber-400" />
              </button>
            </div>
          );
        })}
      </div>

      {onClose && (
        <>
          <div className="h-5 w-[1px] bg-[#2a2e39] mx-1" />
          {/* Close / Hide Button */}
          <button
            type="button"
            data-testid="favorites-toolbar-close-btn"
            onClick={onClose}
            className="w-6 h-8 rounded flex items-center justify-center text-gray-500 hover:text-gray-200 hover:bg-[#2a2e39] transition-colors"
            title="Hide favorites toolbar (click star on left toolbar to reopen)"
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
};
