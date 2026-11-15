import re

# 1. Update DrawingEngine.ts to increase control handle hit tolerance
engine_path = r'C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/client/src/services/DrawingEngine.ts'
with open(engine_path, 'r', encoding='utf-8') as f:
    engine_text = f.read()

engine_text = engine_text.replace('if (dHandle <= 8) {', 'if (dHandle <= 16) {')
with open(engine_path, 'w', encoding='utf-8') as f:
    f.write(engine_text)
print("Updated DrawingEngine.ts handle hit tolerance to 16px.")

# 2. Update DrawingLayer.tsx
layer_path = r'C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/client/src/components/DrawingLayer.tsx'
with open(layer_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize line endings to \n
text = text.replace('\r\n', '\n')

# 2a. Extrapolate time in calculateMagnetSnap when xToTime returns null
old_snap_time = """    const rawTime = trans.xToTime(screenX);
    const rawPrice = trans.yToPrice(screenY);
    const fallbackTime = rawTime ?? (cList.length > 0 ? cList[cList.length - 1].time : 0);
    const fallbackPrice = rawPrice ?? (cList.length > 0 ? cList[cList.length - 1].close : 1.11380);"""

new_snap_time = """    let rawTime = trans.xToTime(screenX);
    if (rawTime === null && cList.length >= 2) {
      const step = Math.max(60, (cList[cList.length - 1].time - cList[0].time) / (cList.length - 1));
      const lastX = trans.timeToX(cList[cList.length - 1].time);
      if (lastX !== null) {
        const firstX = trans.timeToX(cList[0].time) ?? 0;
        const pxPerBar = Math.max(2, (lastX - firstX) / (cList.length - 1));
        const barsDelta = (screenX - lastX) / pxPerBar;
        rawTime = Math.round(cList[cList.length - 1].time + barsDelta * step);
      }
    }
    const rawPrice = trans.yToPrice(screenY);
    const fallbackTime = rawTime ?? (cList.length > 0 ? cList[cList.length - 1].time : 0);
    const fallbackPrice = rawPrice ?? (cList.length > 0 ? cList[cList.length - 1].close : 1.11380);"""

assert old_snap_time in text, "Could not find old_snap_time in DrawingLayer.tsx"
text = text.replace(old_snap_time, new_snap_time, 1)
print("Updated calculateMagnetSnap time extrapolation.")

# 2b. Update handleWindowMouseMove dragging logic for long_position and short_position
old_drag_block = re.compile(
    r'if \(target\.type === \'long_position\' \|\| target\.type === \'short_position\'\) \{.*?'
    r'onUpdate\(\{ \.\.\.target, points: updatedPts, updated_at: Date\.now\(\) \}, false\);',
    re.DOTALL
)

new_drag_block = """if (target.type === 'long_position' || target.type === 'short_position') {
            const pIdx = currentDrag.pointIndex;
            const initPts = currentDrag.initialPoints;

            // Ensure updatedPts has 4 points
            while (updatedPts.length < 4) {
              const init0 = target.points[0];
              const isLong = target.type === 'long_position';
              if (updatedPts.length === 1) {
                updatedPts.push({ time: init0.time + 3600, price: Number((isLong ? init0.price - 0.00150 : init0.price + 0.00150).toFixed(5)) });
              } else if (updatedPts.length === 2) {
                updatedPts.push({ time: init0.time + 3600, price: Number((isLong ? init0.price + 0.00300 : init0.price - 0.00300).toFixed(5)) });
              } else if (updatedPts.length === 3) {
                updatedPts.push({ time: init0.time + 7200, price: init0.price });
              }
            }

            if (pIdx === 0) {
              // Handle 0: Left Entry Handle. Moves entry price and shifts bracket, moves start time.
              const deltaPrice = Number((mouse.price - initPts[0].price).toFixed(5));
              updatedPts[0] = { time: mouse.time, price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[3] && initPts[3]) {
                updatedPts[3] = { ...updatedPts[3], price: mouse.price };
              }
            } else if (pIdx === 1) {
              // Handle 1: Stop Loss Center Handle. Moves Stop Loss price ONLY. TP frozen!
              if (updatedPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
              }
            } else if (pIdx === 2) {
              // Handle 2: Take Profit Center Handle. Moves Take Profit price ONLY. SL frozen!
              if (updatedPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: mouse.price };
              }
            } else if (pIdx === 3) {
              // Handle 3: Middle-Right Anchor. Goes WHEREVER the mouse goes (X and Y)!
              // Horizontally: stretches or shrinks width to mouse.time in any direction.
              // Vertically: moves entry and bracket so anchor stays directly attached to mouse!
              const deltaPrice = Number((mouse.price - (initPts[3]?.price ?? initPts[0].price)).toFixed(5));
              updatedPts[3] = { time: mouse.time, price: mouse.price };
              updatedPts[0] = { ...updatedPts[0], price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
            } else if (pIdx === 4) {
              // Handle 4: Top-Right Take Profit Anchor. Goes WHEREVER the mouse goes!
              // Horizontally: extends/shrinks width to mouse.time.
              // Vertically: adjusts Take Profit level to mouse.price! SL frozen!
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              if (updatedPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: mouse.price };
              }
            } else if (pIdx === 5) {
              // Handle 5: Bottom-Right Stop Loss Anchor. Goes WHEREVER the mouse goes!
              // Horizontally: extends/shrinks width to mouse.time.
              // Vertically: adjusts Stop Loss level to mouse.price! TP frozen!
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              if (updatedPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
              }
            }

            // Keep midTime centered between start and end
            const tStart = updatedPts[0].time;
            const tEnd = updatedPts[3].time;
            const newMidTime = Math.min(tStart, tEnd) + Math.round(Math.abs(tEnd - tStart) / 2);
            if (updatedPts[1]) updatedPts[1] = { ...updatedPts[1], time: newMidTime };
            if (updatedPts[2]) updatedPts[2] = { ...updatedPts[2], time: newMidTime };
          } else {
            updatedPts[currentDrag.pointIndex] = { time: mouse.time, price: mouse.price };
          }
          onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);"""

m_drag = old_drag_block.search(text)
assert m_drag, "Could not find old_drag_block in DrawingLayer.tsx"
text = text[:m_drag.start()] + new_drag_block + text[m_drag.end():]
print("Updated handleWindowMouseMove drag handling for all anchor points.")

# 2c. Update Selection Handles rendering
old_handles_block = re.compile(
    r'\{\/\* Selection Handles \(Resize\/Rotate Anchors\) \*\/.*?return ptsToRender\.map\(\(pt, idx\) => \(.*?\)\);\s*\}\)\(\)\}',
    re.DOTALL
)

new_handles_block = """{/* Selection Handles (Resize/Rotate Anchors) */}
        {isSelected &&
          !d.locked &&
          (() => {
            const isPosition = d.type === 'long_position' || d.type === 'short_position';
            let ptsToRender: { x: number; y: number; cursor?: string; color?: string; pointIndex: number; title?: string }[] = [];

            if (isPosition) {
              const startX = screenPts[0].x;
              const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
              const minX = Math.min(startX, endX);
              const maxX = Math.max(startX, endX);
              const width = Math.max(20, maxX - minX);
              const midX = minX + width / 2;

              const entryPrice = d.points[0].price;
              const slPrice = d.points.length >= 2 ? d.points[1].price : (d.type === 'long_position' ? entryPrice - 0.00150 : entryPrice + 0.00150);
              const tpPrice = d.points.length >= 3 ? d.points[2].price : (d.type === 'long_position' ? entryPrice + 0.00300 : entryPrice - 0.00300);

              const entryY = screenPts[0].y;
              const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
              const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY - 80);

              // 6 Intuitive Handles that go wherever the mouse goes:
              // 0: Left Entry (minX, entryY)
              // 1: Center Stop Loss (midX, slY)
              // 2: Center Take Profit (midX, tpY)
              // 3: Middle-Right Entry/Width Anchor (maxX, entryY)
              // 4: Top-Right Take Profit Anchor (maxX, tpY)
              // 5: Bottom-Right Stop Loss Anchor (maxX, slY)
              ptsToRender = [
                { x: minX, y: entryY, cursor: 'cursor-move', color: '#2962ff', pointIndex: 0, title: 'Entry & Start' },
                { x: midX, y: slY, cursor: 'cursor-ns-resize', color: '#f23645', pointIndex: 1, title: 'Stop Loss Level' },
                { x: midX, y: tpY, cursor: 'cursor-ns-resize', color: '#089981', pointIndex: 2, title: 'Take Profit Level' },
                { x: maxX, y: entryY, cursor: 'cursor-move', color: '#38bdf8', pointIndex: 3, title: 'Right Width & Entry Anchor' },
                { x: maxX, y: tpY, cursor: 'cursor-move', color: '#089981', pointIndex: 4, title: 'Right Take Profit Anchor' },
                { x: maxX, y: slY, cursor: 'cursor-move', color: '#f23645', pointIndex: 5, title: 'Right Stop Loss Anchor' },
              ];
            } else {
              ptsToRender = screenPts.map((pt, idx) => ({
                x: pt.x,
                y: pt.y,
                cursor: 'cursor-crosshair',
                color: '#2962ff',
                pointIndex: idx,
                title: 'Anchor Handle',
              }));
            }

            return ptsToRender.map((pt) => (
              <g key={pt.pointIndex}>
                {/* Large 28px diameter hit target for easy mouse grabbing */}
                <circle
                  data-testid={`anchor-handle-${d.id}-${pt.pointIndex}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={14}
                  fill="transparent"
                  className={`pointer-events-auto ${pt.cursor}`}
                  title={pt.title}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const rect = svgRef.current?.getBoundingClientRect();
                    const rawX = e.clientX - (rect?.left || 0);
                    const rawY = e.clientY - (rect?.top || 0);
                    setDragState({
                      drawingId: d.id,
                      pointIndex: pt.pointIndex,
                      startMouse: { x: rawX, y: rawY },
                      initialPoints: [...d.points],
                    });
                  }}
                />
                {/* Visible anchor handle (9x9 rounded white box with color-coded border) */}
                <rect
                  x={pt.x - 4.5}
                  y={pt.y - 4.5}
                  width={9}
                  height={9}
                  rx={2}
                  fill="#ffffff"
                  stroke={pt.color}
                  strokeWidth={2}
                  className="pointer-events-none shadow"
                />
              </g>
            ));
          })()}"""

m_handles = old_handles_block.search(text)
assert m_handles, "Could not find old_handles_block in DrawingLayer.tsx"
text = text[:m_handles.start()] + new_handles_block + text[m_handles.end():]
print("Updated Selection Handles rendering with 6 handles and 28px hit targets.")

# Write back with \r\n
with open(layer_path, 'wb') as f:
    f.write(text.replace('\n', '\r\n').encode('utf-8'))
print("Successfully applied all updates to DrawingLayer.tsx!")
