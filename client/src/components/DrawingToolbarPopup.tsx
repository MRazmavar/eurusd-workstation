/**
 * Floating Context Toolbar for selected drawing objects.
 * Supports touch swipe and physical slider for small/mobile screens.
 */
import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Copy, CopyPlus, Lock, Unlock, Palette, Settings, Scissors, ChevronLeft, ChevronRight, GripVertical, X } from 'lucide-react';
import { DrawingObject } from '../types';

interface DrawingToolbarPopupProps {
  drawing: DrawingObject;
  position: { x: number; y: number };
  onUpdate: (updated: DrawingObject) => void;
  onDuplicate: (drawing: DrawingObject) => void;
  onCopy?: (drawing: DrawingObject) => void;
  onCut?: (drawing: DrawingObject) => void;
  onDelete: (id: string) => void;
  onOpenProperties?: (drawing: DrawingObject) => void;
  onClose?: () => void;
}

const PRESET_COLORS = ['#2962ff', '#089981', '#f23645', '#ff9800', '#ab47bc', '#ffffff', '#787b86'];

export const DrawingToolbarPopup: React.FC<DrawingToolbarPopupProps> = ({
  drawing,
  position,
  onUpdate,
  onDuplicate,
  onCopy,
  onCut,
  onDelete,
  onOpenProperties,
  onClose,
}) => {
  const currentColor = drawing.properties.color || '#2962ff';
  const currentWidth = drawing.properties.strokeWidth || 2;
  const currentStyle = drawing.properties.lineStyle || 'solid';

  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const [scrollPos, setScrollPos] = useState<number>(0);
  const [maxScroll, setMaxScroll] = useState<number>(0);
  const [canScroll, setCanScroll] = useState<boolean>(false);
  const [measuredWidth, setMeasuredWidth] = useState<number>(360);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    const max = Math.max(0, scrollWidth - clientWidth);
    setMaxScroll(max);
    setScrollPos(scrollLeft);
    setCanScroll(max > 4);
    if (containerRef.current) {
      setMeasuredWidth(containerRef.current.offsetWidth);
    }
  };

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawing.id]);

  useEffect(() => {
    const timer = setTimeout(checkScroll, 50);
    return () => clearTimeout(timer);
  }, []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setScrollPos(val);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = val;
    }
  };

  const scrollByAmount = (amount: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  // Safe screen clamping for position
  const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1000;
  const clampedLeft = Math.max(8, Math.min(winWidth - measuredWidth - 8, position.x - measuredWidth / 2));
  const clampedTop = position.y < 70 ? position.y + 25 : Math.max(10, position.y - 65);

  return (
    <div
      ref={containerRef}
      data-testid="drawing-toolbar-popup"
      className="absolute z-50 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-2xl flex flex-col text-xs select-none pointer-events-auto cursor-default max-w-[calc(100vw-16px)] transition-all"
      style={{
        left: clampedLeft,
        top: clampedTop,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Scrollable Tool Items Row */}
      <div
        ref={scrollRef}
        data-testid="drawing-toolbar-scroll-container"
        onScroll={checkScroll}
        className="flex items-center space-x-2 p-1.5 overflow-x-auto overflow-y-hidden no-scrollbar scroll-smooth"
        style={{
          touchAction: 'pan-x',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Grip handle indicator */}
        <div className="flex-shrink-0 text-gray-500 pl-0.5 pr-1 cursor-grab" title="Drawing options">
          <GripVertical size={14} />
        </div>

        {/* Color Swatches */}
        <div className="flex-shrink-0 flex items-center space-x-1 border-r border-[#2a2e39] pr-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              data-testid={`color-swatch-${c.replace('#', '')}`}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  ...drawing,
                  properties: { ...drawing.properties, color: c, fillColor: c },
                  updated_at: Date.now(),
                });
              }}
              className={`w-4 h-4 rounded-full border transition-all flex-shrink-0 ${
                currentColor.toLowerCase() === c.toLowerCase() ? 'border-white scale-125 shadow ring-1 ring-white' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c }}
              title={`Set color to ${c}`}
            />
          ))}

          {/* Custom Color Picker Input */}
          <div className="relative ml-1 w-4 h-4 flex items-center justify-center cursor-pointer flex-shrink-0">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => {
                onUpdate({
                  ...drawing,
                  properties: { ...drawing.properties, color: e.target.value, fillColor: e.target.value },
                  updated_at: Date.now(),
                });
              }}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
              title="Choose Custom Color"
            />
            <Palette size={13} className="text-gray-400 hover:text-white transition-colors" />
          </div>
        </div>

        {/* Stroke Width */}
        <div className="flex-shrink-0 flex items-center space-x-0.5 border-r border-[#2a2e39] pr-2">
          {[1, 2, 3, 4].map((w) => (
            <button
              key={w}
              type="button"
              data-testid={`width-btn-${w}`}
              onClick={(e) => {
                e.stopPropagation();
                onUpdate({
                  ...drawing,
                  properties: { ...drawing.properties, strokeWidth: w },
                  updated_at: Date.now(),
                });
              }}
              className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] transition-colors flex-shrink-0 ${
                currentWidth === w ? 'bg-[#2962ff] text-white font-bold shadow' : 'text-gray-400 hover:bg-[#2a2e39] hover:text-white'
              }`}
              title={`${w}px line thickness`}
            >
              {w}
            </button>
          ))}
        </div>

        {/* Line Style Toggle */}
        <button
          type="button"
          data-testid="toggle-line-style-btn"
          onClick={(e) => {
            e.stopPropagation();
            const nextStyle = currentStyle === 'solid' ? 'dashed' : currentStyle === 'dashed' ? 'dotted' : 'solid';
            onUpdate({
              ...drawing,
              properties: { ...drawing.properties, lineStyle: nextStyle },
              updated_at: Date.now(),
            });
          }}
          className="flex-shrink-0 px-1.5 py-0.5 rounded text-gray-300 hover:text-white hover:bg-[#2a2e39] text-[10px] font-mono capitalize border border-[#2a2e39] transition-colors"
          title="Toggle Line Style (Solid / Dashed / Dotted)"
        >
          {currentStyle}
        </button>

        {/* Full Settings Dialog Trigger */}
        {onOpenProperties && (
          <button
            type="button"
            data-testid="drawing-settings-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpenProperties(drawing);
            }}
            className="flex-shrink-0 p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-[#38bdf8] transition-colors"
            title="Drawing Properties & Settings (or Double-Click Line)"
          >
            <Settings size={13} />
          </button>
        )}

        {/* Copy */}
        {onCopy && (
          <button
            type="button"
            data-testid="copy-drawing-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCopy(drawing);
            }}
            className="flex-shrink-0 p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-white transition-colors"
            title="Copy Object (Ctrl+C)"
          >
            <Copy size={13} />
          </button>
        )}

        {/* Cut */}
        {onCut && (
          <button
            type="button"
            data-testid="cut-drawing-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCut(drawing);
            }}
            className="flex-shrink-0 p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-white transition-colors"
            title="Cut Object (Ctrl+X)"
          >
            <Scissors size={13} />
          </button>
        )}

        {/* Duplicate */}
        <button
          type="button"
          data-testid="duplicate-drawing-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(drawing);
          }}
          className="flex-shrink-0 p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-white transition-colors"
          title="Duplicate Object (Ctrl+D)"
        >
          <CopyPlus size={13} />
        </button>

        {/* Lock / Unlock */}
        <button
          type="button"
          data-testid="lock-drawing-btn"
          onClick={(e) => {
            e.stopPropagation();
            onUpdate({
              ...drawing,
              locked: !drawing.locked,
              updated_at: Date.now(),
            });
          }}
          className={`flex-shrink-0 p-1 rounded transition-colors ${
            drawing.locked ? 'text-amber-400' : 'text-gray-300 hover:bg-[#2a2e39] hover:text-white'
          }`}
          title={drawing.locked ? 'Unlock' : 'Lock'}
        >
          {drawing.locked ? <Lock size={13} /> : <Unlock size={13} />}
        </button>

        {/* Delete */}
        <button
          type="button"
          data-testid="delete-drawing-btn"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(drawing.id);
          }}
          className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-[#f23645] hover:bg-[#2a2e39] transition-colors"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>

        {/* Close Toolbar */}
        {onClose && (
          <button
            type="button"
            data-testid="close-drawing-toolbar-btn"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39] transition-colors ml-0.5"
            title="Close Options Toolbar"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Physical Slider & Touch Scroll Controls (Shown whenever content overflows or on small screens) */}
      {canScroll && (
        <div
          data-testid="drawing-toolbar-slider-bar"
          className="flex items-center space-x-1.5 px-2 py-1 bg-[#181a20]/90 border-t border-[#2a2e39]/60 rounded-b-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            data-testid="drawing-toolbar-scroll-left"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(-80);
            }}
            disabled={scrollPos <= 2}
            className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Scroll options left"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Physical interactive slider track */}
          <div className="relative flex-1 flex items-center h-4">
            <input
              type="range"
              min={0}
              max={maxScroll}
              value={scrollPos}
              onChange={handleSliderChange}
              data-testid="drawing-toolbar-physical-slider"
              className="w-full h-1.5 bg-[#2a2e39] rounded-lg appearance-none cursor-pointer accent-[#2962ff] focus:outline-none"
              style={{ touchAction: 'none' }}
              title="Slide to reveal all drawing options"
              aria-label="Drawing toolbar options slider"
            />
          </div>

          <button
            type="button"
            data-testid="drawing-toolbar-scroll-right"
            onClick={(e) => {
              e.stopPropagation();
              scrollByAmount(80);
            }}
            disabled={scrollPos >= maxScroll - 2}
            className="p-0.5 rounded text-gray-400 hover:text-white hover:bg-[#2a2e39] disabled:opacity-30 disabled:pointer-events-none transition-colors"
            title="Scroll options right"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  );
};
