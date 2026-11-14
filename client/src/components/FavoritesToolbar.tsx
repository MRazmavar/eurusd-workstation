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
  // Load saved position or default to top-left of chart below timeframe bar
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem('eurusd_fav_toolbar_pos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const winW = typeof window !== 'undefined' ? window.innerWidth : 1200;
          const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
          // Ensure toolbar is never off-screen or buried behind bottom sub-panels
          if (parsed.x >= 10 && parsed.x <= winW - 150 && parsed.y >= 10 && parsed.y <= Math.min(winH - 100, 420)) {
            return parsed;
          }
        }
      }
    } catch {}
    return { x: 80, y: 16 };
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  // Dragging logic (supports Mouse and Touch for mobile/tablet)
  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: clientX,
      mouseY: clientY,
      startX: position.x,
      startY: position.y,
    };
  }, [position]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDragStart(e.clientX, e.clientY);
  }, [handleDragStart]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      handleDragStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, [handleDragStart]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (clientX: number, clientY: number) => {
      if (!dragStartRef.current) return;
      const dx = clientX - dragStartRef.current.mouseX;
      const dy = clientY - dragStartRef.current.mouseY;

      const newX = Math.max(10, Math.min(window.innerWidth - 120, dragStartRef.current.startX + dx));
      const newY = Math.max(40, Math.min(window.innerHeight - 80, dragStartRef.current.startY + dy));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem('eurusd_fav_toolbar_pos', JSON.stringify(position));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
    window.addEventListener('touchcancel', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
      window.removeEventListener('touchcancel', handleEnd);
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
      className={`absolute z-40 flex items-center bg-[#1e222d]/95 backdrop-blur-md border border-[#2a2e39] rounded-lg shadow-2xl p-1 select-none font-sans text-xs transition-shadow ${
        isDragging ? 'shadow-blue-500/20 ring-1 ring-[#2962ff]/50 cursor-grabbing' : 'shadow-black/60'
      }`}
    >
      {/* Draggable Grip Handle */}
      <div
        data-testid="favorites-toolbar-handle"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="flex items-center justify-center w-5 h-8 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing px-0.5 group touch-none"
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
