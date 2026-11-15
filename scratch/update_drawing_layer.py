import re

path = r'C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/client/src/components/DrawingLayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Locate from {/* Selection Handles to </g>\n    );\n  };
idx = text.find('{/* Selection Handles (Resize/Rotate Anchors) */}')
assert idx != -1, "Cannot find Selection Handles"
end_marker = '</g>\n    );\n  };'
end_idx = text.find(end_marker, idx)
assert end_idx != -1, "Cannot find end marker"

new_handles = """{/* Selection Handles (Resize/Rotate Anchors) */}
        {isSelected &&
          !d.locked &&
          (() => {
            const isPosition = d.type === 'long_position' || d.type === 'short_position';
            let ptsToRender: { x: number; y: number }[] = screenPts;
            if (isPosition) {
              const startX = screenPts[0].x;
              const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
              const minX = Math.min(startX, endX);
              const maxX = Math.max(startX, endX);
              const width = Math.max(60, maxX - minX);
              const midX = minX + width / 2;
              const entryY = screenPts[0].y;
              const slPrice = d.points.length >= 2 ? d.points[1].price : (d.type === 'long_position' ? d.points[0].price - 0.00150 : d.points[0].price + 0.00150);
              const tpPrice = d.points.length >= 3 ? d.points[2].price : (d.type === 'long_position' ? d.points[0].price + 0.00300 : d.points[0].price - 0.00300);
              const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
              const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY - 80);

              ptsToRender = [
                { x: minX, y: entryY }, // 0: Entry (Left handle)
                { x: midX, y: slY },    // 1: Stop Loss (Red handle)
                { x: midX, y: tpY },    // 2: Take Profit (Green handle)
                { x: maxX, y: entryY }, // 3: Width (Right handle)
              ];
            }

            return ptsToRender.map((pt, idx) => (
              <g key={idx}>
                {/* Anchor handle hit target: 18x18 circular target */}
                <circle
                  data-testid={`anchor-handle-${d.id}-${idx}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={9}
                  fill="transparent"
                  className={`pointer-events-auto ${
                    isPosition
                      ? idx === 3
                        ? 'cursor-ew-resize'
                        : 'cursor-ns-resize'
                      : 'cursor-crosshair'
                  }`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = svgRef.current?.getBoundingClientRect();
                    const rawX = e.clientX - (rect?.left || 0);
                    const rawY = e.clientY - (rect?.top || 0);
                    setDragState({
                      drawingId: d.id,
                      pointIndex: idx,
                      startMouse: { x: rawX, y: rawY },
                      initialPoints: [...d.points],
                    });
                  }}
                />
                {/* Visible anchor handle (8x8 white box with color-coded stroke) */}
                <rect
                  x={pt.x - 4}
                  y={pt.y - 4}
                  width={8}
                  height={8}
                  fill="#ffffff"
                  stroke={
                    isPosition
                      ? idx === 0
                        ? '#2962ff'
                        : idx === 1
                        ? '#f23645'
                        : idx === 2
                        ? '#089981'
                        : '#94a3b8'
                      : '#2962ff'
                  }
                  strokeWidth={1.5}
                  className="pointer-events-none shadow"
                />
              </g>
            ));
          })()}
      """

text = text[:idx] + new_handles + text[end_idx:]

with open(path, 'w', encoding='utf-8') as f:
    f.write(text)

print("SUCCESS: Handles successfully updated in DrawingLayer.tsx!")
