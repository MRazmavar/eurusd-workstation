/**
 * Floating Context Toolbar for selected drawing objects.
 */
import React from 'react';
import { Trash2, Copy, Lock, Unlock, Palette } from 'lucide-react';
import { DrawingObject } from '../types';

interface DrawingToolbarPopupProps {
  drawing: DrawingObject;
  position: { x: number; y: number };
  onUpdate: (updated: DrawingObject) => void;
  onDuplicate: (drawing: DrawingObject) => void;
  onDelete: (id: string) => void;
}

const PRESET_COLORS = ['#2962ff', '#089981', '#f23645', '#ffb300', '#ab47bc', '#ffffff', '#787b86'];

export const DrawingToolbarPopup: React.FC<DrawingToolbarPopupProps> = ({
  drawing,
  position,
  onUpdate,
  onDuplicate,
  onDelete,
}) => {
  const currentColor = drawing.properties.color || '#2962ff';
  const currentWidth = drawing.properties.strokeWidth || 2;
  const currentStyle = drawing.properties.lineStyle || 'solid';

  return (
    <div
      className="absolute z-50 bg-[#1e222d] border border-[#2a2e39] rounded shadow-2xl p-1.5 flex items-center space-x-2 text-xs select-none"
      style={{
        left: Math.max(10, Math.min(window.innerWidth - 250, position.x - 100)),
        top: Math.max(10, position.y - 45),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Color Swatches */}
      <div className="flex items-center space-x-1 border-r border-[#2a2e39] pr-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => {
              onUpdate({
                ...drawing,
                properties: { ...drawing.properties, color: c, fillColor: c },
                updated_at: Date.now(),
              });
            }}
            className={`w-4 h-4 rounded-full border ${
              currentColor === c ? 'border-white scale-110 shadow' : 'border-transparent'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      {/* Stroke Width */}
      <div className="flex items-center space-x-0.5 border-r border-[#2a2e39] pr-2">
        {[1, 2, 3, 4].map((w) => (
          <button
            key={w}
            onClick={() => {
              onUpdate({
                ...drawing,
                properties: { ...drawing.properties, strokeWidth: w },
                updated_at: Date.now(),
              });
            }}
            className={`w-5 h-5 rounded flex items-center justify-center font-mono ${
              currentWidth === w ? 'bg-[#2962ff] text-white' : 'text-gray-400 hover:bg-[#2a2e39]'
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* Line Style */}
      <button
        onClick={() => {
          const nextStyle = currentStyle === 'solid' ? 'dashed' : currentStyle === 'dashed' ? 'dotted' : 'solid';
          onUpdate({
            ...drawing,
            properties: { ...drawing.properties, lineStyle: nextStyle },
            updated_at: Date.now(),
          });
        }}
        className="px-1.5 py-0.5 rounded text-gray-300 hover:bg-[#2a2e39] text-[10px] font-mono capitalize border border-[#2a2e39]"
        title="Toggle Line Style"
      >
        {currentStyle}
      </button>

      {/* Duplicate */}
      <button
        onClick={() => onDuplicate(drawing)}
        className="p-1 rounded text-gray-300 hover:bg-[#2a2e39] hover:text-white"
        title="Duplicate Object"
      >
        <Copy size={13} />
      </button>

      {/* Lock / Unlock */}
      <button
        onClick={() => {
          onUpdate({
            ...drawing,
            locked: !drawing.locked,
            updated_at: Date.now(),
          });
        }}
        className={`p-1 rounded ${
          drawing.locked ? 'text-amber-400' : 'text-gray-300 hover:bg-[#2a2e39]'
        }`}
        title={drawing.locked ? 'Unlock' : 'Lock'}
      >
        {drawing.locked ? <Lock size={13} /> : <Unlock size={13} />}
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(drawing.id)}
        className="p-1 rounded text-gray-400 hover:text-[#f23645] hover:bg-[#2a2e39]"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
};
