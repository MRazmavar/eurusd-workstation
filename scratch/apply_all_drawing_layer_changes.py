import re

path = r'C:/Users/moham/.gemini/antigravity/scratch/eurusd-workstation/client/src/components/DrawingLayer.tsx'
with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Normalize line endings to \n for processing
text = text.replace('\r\n', '\n')

# 1. Add justCreatedTimeRef after draggingTradeLine
needle_ref = "const [draggingTradeLine, setDraggingTradeLine] = useState<{ tradeId: string; lineType: 'sl' | 'tp' | 'entry' } | null>(null);"
repl_ref = needle_ref + "\n  const justCreatedTimeRef = useRef<number>(0);"
assert needle_ref in text, "Could not find draggingTradeLine"
text = text.replace(needle_ref, repl_ref, 1)
print("1. Added justCreatedTimeRef")

# 2. Update isSingleClickTool and isThreePointTool
tools_pattern = re.compile(
    r'const isSingleClickTool = \[.*?\]\.includes\(activeTool\);\s*'
    r'const isThreePointTool = \[\s*\'parallel_channel\',\s*\'flat_top_bottom\',\s*\'disjoint_channel\',\s*\'triangle\',.*?\s*\]\.includes\(activeTool\);',
    re.DOTALL
)
new_tools = """const isSingleClickTool = [
    'horizontal_line',
    'vertical_line',
    'horizontal_ray',
    'price_label',
    'long_position',
    'short_position',
  ].includes(activeTool);
  const isThreePointTool = [
    'parallel_channel',
    'flat_top_bottom',
    'disjoint_channel',
    'triangle',
  ].includes(activeTool);"""
m_tools = tools_pattern.search(text)
assert m_tools, "Could not find tools declarations"
text = text[:m_tools.start()] + new_tools + text[m_tools.end():]
print("2. Updated tools definitions")

# 3. Update handleWindowMouseMove dragging logic
needle_drag = """        if (currentDrag.pointIndex !== undefined) {
          // Dragging specific anchor point (rotate/resize)
          const updatedPts = [...target.points];
          updatedPts[currentDrag.pointIndex] = { time: mouse.time, price: mouse.price };
          onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);
        } else {"""

new_drag = """        if (currentDrag.pointIndex !== undefined) {
          // Dragging specific anchor point (rotate/resize)
          const updatedPts = [...target.points];
          if (target.type === 'long_position' || target.type === 'short_position') {
            const pIdx = currentDrag.pointIndex;
            const initPts = currentDrag.initialPoints;
            if (pIdx === 0) {
              // Handle 0: Entry handle (Left-center). Shifts entry price and moves the whole bracket together preserving pip distances
              const deltaPrice = Number((mouse.price - initPts[0].price).toFixed(5));
              updatedPts[0] = { ...target.points[0], price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...target.points[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...target.points[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[3]) {
                updatedPts[3] = { ...target.points[3], price: mouse.price };
              }
            } else if (pIdx === 1) {
              // Handle 1: Stop Loss handle. Moves ONLY Stop Loss price. Take Profit is 100% FROZEN!
              if (updatedPts[1]) {
                updatedPts[1] = { ...target.points[1], price: mouse.price };
              }
            } else if (pIdx === 2) {
              // Handle 2: Take Profit handle. Moves ONLY Take Profit price. Stop Loss is 100% FROZEN!
              if (updatedPts[2]) {
                updatedPts[2] = { ...target.points[2], price: mouse.price };
              }
            } else if (pIdx === 3) {
              // Handle 3: Width / End Time handle. Stretches or shrinks width horizontally into future/past. Prices 100% FROZEN!
              const newEndTime = Math.max(target.points[0].time + 60, mouse.time);
              const newMidTime = target.points[0].time + Math.round((newEndTime - target.points[0].time) / 2);
              if (updatedPts[3]) {
                updatedPts[3] = { time: newEndTime, price: target.points[0].price };
              }
              if (updatedPts[1]) updatedPts[1] = { ...updatedPts[1], time: newMidTime };
              if (updatedPts[2]) updatedPts[2] = { ...updatedPts[2], time: newMidTime };
            }
          } else {
            updatedPts[currentDrag.pointIndex] = { time: mouse.time, price: mouse.price };
          }
          onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);
        } else {"""
assert needle_drag in text, "Could not find handleWindowMouseMove point dragging block"
text = text.replace(needle_drag, new_drag, 1)
print("3. Updated handleWindowMouseMove point dragging")

# 4. Update single-click tool creation
single_pattern = re.compile(
    r'\/\/ 4\. Start or advance drawing a new object\s*if \(isSingleClickTool\) \{.*?\bonResetTool\(\);\s*return;\s*\}',
    re.DOTALL
)
new_single = """// 4. Start or advance drawing a new object
    if (isSingleClickTool) {
      let pts = [{ time: mouse.time, price: mouse.price }];
      if (activeTool === 'long_position' || activeTool === 'short_position') {
        const isLong = activeTool === 'long_position';
        const entryPrice = mouse.price;
        const entryTime = mouse.time;
        // Default standard bracket: 15 pips stop loss, 30 pips take profit (1:2 Risk/Reward)
        const slPrice = Number((isLong ? entryPrice - 0.00150 : entryPrice + 0.00150).toFixed(5));
        const tpPrice = Number((isLong ? entryPrice + 0.00300 : entryPrice - 0.00300).toFixed(5));

        // Default width: 25 candles into the future
        let candleStep = 300;
        if (candles.length >= 2) {
          candleStep = Math.max(60, Math.round((candles[candles.length - 1].time - candles[0].time) / (candles.length - 1)));
        }
        const endTime = entryTime + candleStep * 25;
        const midTime = entryTime + Math.round((endTime - entryTime) / 2);

        pts = [
          { time: entryTime, price: entryPrice }, // 0: Entry (Left handle)
          { time: midTime, price: slPrice },      // 1: Stop Loss (SL handle)
          { time: midTime, price: tpPrice },      // 2: Take Profit (TP handle)
          { time: endTime, price: entryPrice },   // 3: Width / End (Right handle)
        ];
      }

      const singleDrawing: DrawingObject = {
        id: `draw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: activeTool,
        timeframe,
        points: pts,
        properties: {
          color: '#2962ff',
          fillColor: '#2962ff',
          fillOpacity: 0.15,
          strokeWidth: 2,
          lineStyle: 'solid',
          fontSize: 12,
          text: activeTool === 'price_label' ? mouse.price.toFixed(5) : '',
        },
        locked: false,
        hidden: false,
        created_at: Date.now(),
        updated_at: Date.now(),
      };
      justCreatedTimeRef.current = Date.now();
      onAdd(singleDrawing);
      onSelect(singleDrawing.id);
      onResetTool();
      return;
    }"""
m_single = single_pattern.search(text)
assert m_single, "Could not find isSingleClickTool creation block"
text = text[:m_single.start()] + new_single + text[m_single.end():]
print("4. Updated single-click creation handling")

# 5. Long & Short Position Rendering
new_position_render = """        {/* Long Position Analysis Tool (TradingView-Style 1-Click & Independent Handles) */}
        {d.type === 'long_position' && screenPts.length >= 1 && (() => {
          const entryPrice = d.points[0].price;
          const slPrice = d.points.length >= 2 ? d.points[1].price : Number((entryPrice - 0.00150).toFixed(5));
          const tpPrice = d.points.length >= 3 ? d.points[2].price : Number((entryPrice + 0.00300).toFixed(5));

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
          const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY - 80);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(60, maxX - minX);

          const slPips = (Math.abs(entryPrice - slPrice) / 0.0001).toFixed(1);
          const tpPips = (Math.abs(tpPrice - entryPrice) / 0.0001).toFixed(1);
          const rr = (parseFloat(slPips) > 0 ? (parseFloat(tpPips) / parseFloat(slPips)).toFixed(2) : '0.00');

          return (
            <g data-testid={`drawing-long-position-${d.id}`}>
              {/* Target Area (Green) */}
              <rect
                x={minX}
                y={Math.min(entryY, tpY)}
                width={width}
                height={Math.max(1, Math.abs(tpY - entryY))}
                fill="#089981"
                fillOpacity={0.2}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop Area (Red) */}
              <rect
                x={minX}
                y={Math.min(entryY, slY)}
                width={width}
                height={Math.max(1, Math.abs(slY - entryY))}
                fill="#f23645"
                fillOpacity={0.2}
                stroke="#f23645"
                strokeWidth={1}
              />
              {/* Take Profit Line */}
              <line
                x1={minX}
                y1={tpY}
                x2={minX + width}
                y2={tpY}
                stroke="#089981"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              {/* Stop Loss Line */}
              <line
                x1={minX}
                y1={slY}
                x2={minX + width}
                y2={slY}
                stroke="#f23645"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              {/* Entry Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#2962ff"
                strokeWidth={2}
              />

              {/* Side Boundary Dotted Lines */}
              <line x1={minX} y1={Math.min(entryY, slY, tpY)} x2={minX} y2={Math.max(entryY, slY, tpY)} stroke="#787b86" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />
              <line x1={minX + width} y1={Math.min(entryY, slY, tpY)} x2={minX + width} y2={Math.max(entryY, slY, tpY)} stroke="#787b86" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />

              {/* Compact Labels along the right edge */}
              <g transform={`translate(${minX + width - 90}, ${tpY - 16})`}>
                <rect width={88} height={15} rx={3} fill="#089981" fillOpacity={0.9} />
                <text x={44} y={11} fill="#ffffff" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  TP: +{tpPips}p ({tpPrice.toFixed(5)})
                </text>
              </g>
              <g transform={`translate(${minX + width - 85}, ${entryY - 16})`}>
                <rect width={83} height={15} rx={3} fill="#1e222d" stroke="#2962ff" strokeWidth={1} />
                <text x={41} y={11} fill="#38bdf8" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ENTRY: {entryPrice.toFixed(5)}
                </text>
              </g>
              <g transform={`translate(${minX + width - 90}, ${slY - 16})`}>
                <rect width={88} height={15} rx={3} fill="#f23645" fillOpacity={0.9} />
                <text x={44} y={11} fill="#ffffff" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  SL: -{slPips}p ({slPrice.toFixed(5)})
                </text>
              </g>

              {/* Central Metrics Card */}
              <g transform={`translate(${minX + 6}, ${Math.min(entryY, tpY) + 6})`}>
                <rect
                  width={185}
                  height={20}
                  rx={3}
                  fill="#1e222d"
                  fillOpacity={0.95}
                  stroke="#2a2e39"
                />
                <text
                  x={8}
                  y={14}
                  fill="#38bdf8"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  LONG | R:R 1:{rr}
                </text>
                <text
                  x={100}
                  y={14}
                  fill="#089981"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Target: +{tpPips}p
                </text>
              </g>
            </g>
          );
        })()}

        {/* Short Position Analysis Tool (TradingView-Style 1-Click & Independent Handles) */}
        {d.type === 'short_position' && screenPts.length >= 1 && (() => {
          const entryPrice = d.points[0].price;
          const slPrice = d.points.length >= 2 ? d.points[1].price : Number((entryPrice + 0.00150).toFixed(5));
          const tpPrice = d.points.length >= 3 ? d.points[2].price : Number((entryPrice - 0.00300).toFixed(5));

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY - 40);
          const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY + 80);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(60, maxX - minX);

          const slPips = (Math.abs(slPrice - entryPrice) / 0.0001).toFixed(1);
          const tpPips = (Math.abs(entryPrice - tpPrice) / 0.0001).toFixed(1);
          const rr = (parseFloat(slPips) > 0 ? (parseFloat(tpPips) / parseFloat(slPips)).toFixed(2) : '0.00');

          return (
            <g data-testid={`drawing-short-position-${d.id}`}>
              {/* Target Area (Green) */}
              <rect
                x={minX}
                y={Math.min(entryY, tpY)}
                width={width}
                height={Math.max(1, Math.abs(tpY - entryY))}
                fill="#089981"
                fillOpacity={0.2}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop Area (Red) */}
              <rect
                x={minX}
                y={Math.min(entryY, slY)}
                width={width}
                height={Math.max(1, Math.abs(slY - entryY))}
                fill="#f23645"
                fillOpacity={0.2}
                stroke="#f23645"
                strokeWidth={1}
              />
              {/* Take Profit Line */}
              <line
                x1={minX}
                y1={tpY}
                x2={minX + width}
                y2={tpY}
                stroke="#089981"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              {/* Stop Loss Line */}
              <line
                x1={minX}
                y1={slY}
                x2={minX + width}
                y2={slY}
                stroke="#f23645"
                strokeWidth={1.5}
                strokeDasharray="4,3"
              />
              {/* Entry Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#2962ff"
                strokeWidth={2}
              />

              {/* Side Boundary Dotted Lines */}
              <line x1={minX} y1={Math.min(entryY, slY, tpY)} x2={minX} y2={Math.max(entryY, slY, tpY)} stroke="#787b86" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />
              <line x1={minX + width} y1={Math.min(entryY, slY, tpY)} x2={minX + width} y2={Math.max(entryY, slY, tpY)} stroke="#787b86" strokeWidth={1} strokeDasharray="2,2" opacity={0.6} />

              {/* Compact Labels along the right edge */}
              <g transform={`translate(${minX + width - 90}, ${tpY - 16})`}>
                <rect width={88} height={15} rx={3} fill="#089981" fillOpacity={0.9} />
                <text x={44} y={11} fill="#ffffff" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  TP: +{tpPips}p ({tpPrice.toFixed(5)})
                </text>
              </g>
              <g transform={`translate(${minX + width - 85}, ${entryY - 16})`}>
                <rect width={83} height={15} rx={3} fill="#1e222d" stroke="#2962ff" strokeWidth={1} />
                <text x={41} y={11} fill="#38bdf8" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ENTRY: {entryPrice.toFixed(5)}
                </text>
              </g>
              <g transform={`translate(${minX + width - 90}, ${slY - 16})`}>
                <rect width={88} height={15} rx={3} fill="#f23645" fillOpacity={0.9} />
                <text x={44} y={11} fill="#ffffff" fontSize={9} fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  SL: -{slPips}p ({slPrice.toFixed(5)})
                </text>
              </g>

              {/* Central Metrics Card */}
              <g transform={`translate(${minX + 6}, ${Math.min(entryY, tpY) + 6})`}>
                <rect
                  width={185}
                  height={20}
                  rx={3}
                  fill="#1e222d"
                  fillOpacity={0.95}
                  stroke="#2a2e39"
                />
                <text
                  x={8}
                  y={14}
                  fill="#38bdf8"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  SHORT | R:R 1:{rr}
                </text>
                <text
                  x={105}
                  y={14}
                  fill="#089981"
                  fontSize={10}
                  fontWeight="bold"
                  fontFamily="monospace"
                >
                  Target: +{tpPips}p
                </text>
              </g>
            </g>
          );
        })()}"""

pos_pattern = re.compile(r'\{\/\* Long Position Analysis Tool.*?\n\s*\{\/\* Measurement \/ Price Range Tool \*\/', re.DOTALL)
m_pos = pos_pattern.search(text)
assert m_pos, "Could not find Long Position to Measurement block"
text = text[:m_pos.start()] + new_position_render + '\n\n        {/* Measurement / Price Range Tool */' + text[m_pos.end():]
print("5. Updated Long & Short position render blocks")

# 6. Update svg onClick to prevent deselecting immediately after single click creation
svg_click_pattern = re.compile(
    r'onClick=\{\(e\) => \{\s*if \(!isDrawingToolActive\) \{',
    re.DOTALL
)
new_svg_click = """onClick={(e) => {
            if (Date.now() - justCreatedTimeRef.current < 400) return;
            if (!isDrawingToolActive) {"""
assert svg_click_pattern.search(text), "Could not find svg onClick block"
text = svg_click_pattern.sub(new_svg_click, text, count=1)
print("6. Updated svg onClick guard")

# Write back with \r\n
with open(path, 'w', encoding='utf-8') as f:
    f.write(text.replace('\n', '\r\n'))

print("ALL CHANGES SUCCESSFULLY APPLIED!")
