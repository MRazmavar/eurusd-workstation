/**
 * Floating Context Toolbar for selected drawing objects.
 */
import React from 'react';
import { Trash2, Copy, Lock, Unlock, Palette, Settings } from 'lucide-react';
import { DrawingObject } from '../types';

interface DrawingToolbarPopupProps {
  drawing: DrawingObject;
  position: { x: number; y: number };
  onUpdate: (updated: DrawingObject) => void;
  onDuplicate: (drawing: DrawingObject) => void;
  onDelete: (id: string) => void;
  onOpenProperties?: (drawing: DrawingObject) => void;
}

const PRESET_COLORS = ['#2962ff', '#089981', '#f23645', '#ff9800', '#ab47bc', '#ffffff', '#787b86'];

export const DrawingToolbarPopup: React.FC<DrawingToolbarPopupProps> = ({
  drawing,
  position,
  onUpdate,
  onDuplicate,
  onDelete,
  onOpenProperties,
}) => {
  const currentColor = drawing.properties.color || '#2962ff';
  const currentWidth = drawing.properties.strokeWidth || 2;
  const currentStyle = drawing.properties.lineStyle || 'solid';

  return (
    <div
      data-testid="drawing-toolbar-popup"
      className="absolute z-50 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl p-1.5 flex items-center space-x-2 text-xs select-none pointer-events-auto cursor-default"
      style={{
        left: Math.max(10, Math.min(window.innerWidth - 300, position.x - 100)),
        top: Math.max(10, position.y - 45),
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color Swatches */}
      <div className="flex items-center space-x-1 border-r border-[#2a2e39] pr-2">
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
            className={`w-4 h-4 rounded-full border transition-all ${
              currentColor.toLowerCase() === c.toLowerCase() ? 'border-white scale-125 shadow ring-1 ring-white' : 'border-transparent hover:scale-110'
            }`}
            style={{ backgroundColor: c }}
            title={`Set color to ${c}`}
          />
        ))}

        {/* Custom Color Picker Input */}
        <div className="relative ml-1 w-4 h-4 flex items-center justify-center cursor-pointer">
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
      <div className="flex items-center space-x-0.5 border-r border-[#2a2e39] pr-2">
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
            className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[11px] transition-colors ${
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
        className="px-1.5 py-0.5 rounded text-gray-300 hover:text-white hover:bg-[#2a2e39] text-[10px] font-mono capitalize border border-[#2a2e39] transition-colors"
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
          className="p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-[#38bdf8] transition-colors"
          title="Drawing Properties & Settings (or Double-Click Line)"
        >
          <Settings size={13} />
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
        className="p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-white transition-colors"
        title="Duplicate Object"
      >
        <Copy size={13} />
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
        className={`p-1 rounded transition-colors ${
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
        className="p-1 rounded text-gray-400 hover:text-[#f23645] hover:bg-[#2a2e39] transition-colors"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};
