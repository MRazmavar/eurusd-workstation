import os

file_path = 'client/src/components/DrawingLayer.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update dragging logic for long_position / short_position
old_drag_block = """            if (pIdx === 0) {
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
              // Handle 1: Stop Loss Center Handle. Moves Stop Loss price.
              // Auto-flips between Long Position and Short Position if SL crosses Entry!
              if (updatedPts[1] && updatedPts[0]) {
                const entryPrice = updatedPts[0].price;
                const newSl = mouse.price;
                if (target.type === 'long_position' && newSl > entryPrice + 0.00002) {
                  target.type = 'short_position';
                  const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - entryPrice) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice - tpDist).toFixed(5)) };
                  }
                } else if (target.type === 'short_position' && newSl < entryPrice - 0.00002) {
                  target.type = 'long_position';
                  const tpDist = updatedPts[2] ? Math.abs(entryPrice - updatedPts[2].price) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice + tpDist).toFixed(5)) };
                  }
                } else {
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                }
              }
            } else if (pIdx === 2) {
              // Handle 2: Take Profit Center Handle. Moves Take Profit price ONLY. SL frozen!
              if (updatedPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: mouse.price };
              }
            } else if (pIdx === 3) {
              // Handle 3: Middle-Right Duration Handle.
              // Horizontally: stretches or shrinks width to mouse.time in any direction.
              // Vertically: stays locked on the entry price line!
              updatedPts[3] = { time: mouse.time, price: target.points[0].price };
            } else if (pIdx === 4) {
              // Handle 4: Top-Right Corner.
              // Horizontally: stretches width to mouse.time.
              // Vertically: adjusts top level to mouse.price.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (!isLong && mouse.price < updatedPts[0].price - 0.00002) {
                // Short position top SL dragged below entry -> flip to Long
                target.type = 'long_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[0].price - updatedPts[2].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price + tpDist).toFixed(5)) };
                }
              } else {
                const topIdx = isLong ? 2 : 1;
                if (updatedPts[topIdx]) {
                  updatedPts[topIdx] = { ...updatedPts[topIdx], price: mouse.price };
                }
              }
            } else if (pIdx === 5) {
              // Handle 5: Bottom-Right Corner.
              // Horizontally: stretches width to mouse.time.
              // Vertically: adjusts bottom level to mouse.price.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (isLong && mouse.price > updatedPts[0].price + 0.00002) {
                // Long position bottom SL dragged above entry -> flip to Short
                target.type = 'short_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - updatedPts[0].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price - tpDist).toFixed(5)) };
                }
              } else {
                const bottomIdx = isLong ? 1 : 2;
                if (updatedPts[bottomIdx]) {
                  updatedPts[bottomIdx] = { ...updatedPts[bottomIdx], price: mouse.price };
                }
              }
            }"""

new_drag_block = """            if (pIdx === 0) {
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
              // Handle 1: Stop Loss Handle (midX, slY). Moves Stop Loss price ONLY.
              // Auto-flips between Long Position and Short Position if SL crosses Entry!
              if (updatedPts[1] && updatedPts[0]) {
                const entryPrice = updatedPts[0].price;
                const newSl = mouse.price;
                if (target.type === 'long_position' && newSl > entryPrice + 0.00002) {
                  target.type = 'short_position';
                  const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - entryPrice) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice - tpDist).toFixed(5)) };
                  }
                } else if (target.type === 'short_position' && newSl < entryPrice - 0.00002) {
                  target.type = 'long_position';
                  const tpDist = updatedPts[2] ? Math.abs(entryPrice - updatedPts[2].price) : 0.00150;
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                  if (updatedPts[2]) {
                    updatedPts[2] = { ...updatedPts[2], price: Number((entryPrice + tpDist).toFixed(5)) };
                  }
                } else {
                  updatedPts[1] = { ...updatedPts[1], price: newSl };
                }
              }
            } else if (pIdx === 2) {
              // Handle 2: Take Profit Handle (midX, tpY). Moves Take Profit price ONLY. SL frozen!
              if (updatedPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: mouse.price };
              }
            } else if (pIdx === 3) {
              // Handle 3: Right Boundary Handle (maxX, entryY).
              // Horizontally: stretches or shrinks width to mouse.time in any direction.
              // Vertically: stays locked on the entry price line!
              updatedPts[3] = { time: mouse.time, price: target.points[0].price };
            } else if (pIdx === 4) {
              // Handle 4: Top-Right Corner.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (!isLong && mouse.price < updatedPts[0].price - 0.00002) {
                target.type = 'long_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[0].price - updatedPts[2].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price + tpDist).toFixed(5)) };
                }
              } else {
                const topIdx = isLong ? 2 : 1;
                if (updatedPts[topIdx]) {
                  updatedPts[topIdx] = { ...updatedPts[topIdx], price: mouse.price };
                }
              }
            } else if (pIdx === 5) {
              // Handle 5: Bottom-Right Corner.
              updatedPts[3] = { ...updatedPts[3], time: mouse.time };
              const isLong = target.type === 'long_position';
              if (isLong && mouse.price > updatedPts[0].price + 0.00002) {
                target.type = 'short_position';
                const tpDist = updatedPts[2] ? Math.abs(updatedPts[2].price - updatedPts[0].price) : 0.00150;
                updatedPts[1] = { ...updatedPts[1], price: mouse.price };
                if (updatedPts[2]) {
                  updatedPts[2] = { ...updatedPts[2], price: Number((updatedPts[0].price - tpDist).toFixed(5)) };
                }
              } else {
                const bottomIdx = isLong ? 1 : 2;
                if (updatedPts[bottomIdx]) {
                  updatedPts[bottomIdx] = { ...updatedPts[bottomIdx], price: mouse.price };
                }
              }
            } else if (pIdx === 6) {
              // Handle 6: Left Boundary Handle (minX, (slY + tpY)/2).
              // Stretches or shrinks start time to mouse.time without altering price!
              updatedPts[0] = { time: mouse.time, price: updatedPts[0].price };
            } else if (pIdx === 7) {
              // Handle 7: Center Entry Handle (midX, entryY).
              // Translates entry price vertically and shifts bracket together.
              const deltaPrice = Number((mouse.price - initPts[0].price).toFixed(5));
              updatedPts[0] = { ...updatedPts[0], price: mouse.price };
              if (updatedPts[1] && initPts[1]) {
                updatedPts[1] = { ...updatedPts[1], price: Number((initPts[1].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[2] && initPts[2]) {
                updatedPts[2] = { ...updatedPts[2], price: Number((initPts[2].price + deltaPrice).toFixed(5)) };
              }
              if (updatedPts[3] && initPts[3]) {
                updatedPts[3] = { ...updatedPts[3], price: mouse.price };
              }
            }"""

if old_drag_block in content:
    content = content.replace(old_drag_block, new_drag_block)
    print("Replaced handle dragging block successfully.")
else:
    # Try normalized newlines
    old_norm = old_drag_block.replace('\r\n', '\n')
    new_norm = new_drag_block.replace('\r\n', '\n')
    content_norm = content.replace('\r\n', '\n')
    if old_norm in content_norm:
        content = content_norm.replace(old_norm, new_norm)
        print("Replaced handle dragging block with normalized newlines.")
    else:
        print("WARNING: old_drag_block not found.")

# 2. Update rendering of long_position and short_position to TradingView standard with PositionToolService
old_render_start = "{d.type === 'long_position' && screenPts.length >= 1 && (() => {"
old_render_end = "        {/* Measurement / Price Range Tool */}"

idx1 = content.find(old_render_start)
idx2 = content.find(old_render_end, idx1)

if idx1 != -1 and idx2 != -1:
    new_render_positions = """{/* Long Position Analysis Tool (TradingView Standard with Live Metrics & Replay Status) */}
        {d.type === 'long_position' && screenPts.length >= 1 && (() => {
          const metrics = PositionToolService.calculateMetrics(d, d.properties?.accountSize || 10000);
          const replayStatus = PositionToolService.evaluateReplayStatus(
            d,
            candles,
            Boolean(currentReplayTimestamp),
            currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : metrics.entryPrice)
          );

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(metrics.slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
          const tpY = transformer.priceToY(metrics.tpPrice) ?? (screenPts[2]?.y ?? entryY - 80);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(20, maxX - minX);

          const profitTop = Math.min(entryY, tpY);
          const profitHeight = Math.max(1, Math.abs(tpY - entryY));
          const riskTop = Math.min(entryY, slY);
          const riskHeight = Math.max(1, Math.abs(slY - entryY));

          const badgeText = `Risk/reward ratio: ${metrics.riskRewardRatio.toFixed(2)}`;
          const badgeWidth = Math.max(136, badgeText.length * 6.8 + 20);
          const badgeX = minX + (width - badgeWidth) / 2;

          return (
            <g data-testid={`drawing-long-position-${d.id}`} className="select-none">
              {/* Target / Profit Area (Green) */}
              <rect
                x={minX}
                y={profitTop}
                width={width}
                height={profitHeight}
                fill="#089981"
                fillOpacity={0.20}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop / Loss Area (Red) */}
              <rect
                x={minX}
                y={riskTop}
                width={width}
                height={riskHeight}
                fill="#f23645"
                fillOpacity={0.20}
                stroke="#f23645"
                strokeWidth={1}
              />

              {/* Entry Dividing Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#787b86"
                strokeWidth={1}
                opacity={0.8}
              />

              {/* Target Tag Badge on TP Boundary */}
              <g transform={`translate(${minX + 8}, ${tpY - (tpY < entryY ? 18 : -4)})`} className="pointer-events-none select-none">
                <rect
                  width={Math.min(width - 16, 260)}
                  height={16}
                  rx={2}
                  fill="#089981"
                  fillOpacity={0.9}
                />
                <text
                  x={6}
                  y={12}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                >
                  Target: {metrics.tpPrice.toFixed(5)} | {metrics.rewardPips} pips (+${metrics.potentialProfitUsd})
                </text>
              </g>

              {/* Stop Tag Badge on SL Boundary */}
              <g transform={`translate(${minX + 8}, ${slY - (slY > entryY ? -4 : 18)})`} className="pointer-events-none select-none">
                <rect
                  width={Math.min(width - 16, 260)}
                  height={16}
                  rx={2}
                  fill="#f23645"
                  fillOpacity={0.9}
                />
                <text
                  x={6}
                  y={12}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                >
                  Stop: {metrics.slPrice.toFixed(5)} | {metrics.riskPips} pips (-${metrics.potentialLossUsd})
                </text>
              </g>

              {/* Central Risk/reward ratio Pill Badge */}
              <g transform={`translate(${badgeX}, ${entryY - 11})`} className="pointer-events-none select-none">
                <rect
                  width={badgeWidth}
                  height={22}
                  rx={4}
                  fill="#089981"
                  stroke="#ffffff"
                  strokeWidth={1}
                  className="shadow-sm"
                />
                <text
                  x={badgeWidth / 2}
                  y={15}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  textAnchor="middle"
                >
                  {badgeText}
                </text>
              </g>

              {/* Bar Replay Status Indicator Badge (when replay active) */}
              {Boolean(currentReplayTimestamp) && (
                <g transform={`translate(${badgeX}, ${entryY + 14})`} className="pointer-events-none select-none">
                  <rect
                    width={badgeWidth}
                    height={18}
                    rx={3}
                    fill={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    className="shadow-sm"
                  />
                  <text
                    x={badgeWidth / 2}
                    y={13}
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    textAnchor="middle"
                  >
                    {replayStatus.state === 'target_hit' ? `TARGET HIT (+${metrics.potentialProfitUsd})` :
                     replayStatus.state === 'stopped_out' ? `STOPPED OUT (-${metrics.potentialLossUsd})` :
                     replayStatus.state === 'active' ? `ACTIVE: ${replayStatus.openPips >= 0 ? '+' : ''}${replayStatus.openPips} pips (${replayStatus.openPnlUsd >= 0 ? '+' : ''}$${replayStatus.openPnlUsd})` :
                     'PLANNED (Waiting Entry)'}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        {/* Short Position Analysis Tool (TradingView Standard with Live Metrics & Replay Status) */}
        {d.type === 'short_position' && screenPts.length >= 1 && (() => {
          const metrics = PositionToolService.calculateMetrics(d, d.properties?.accountSize || 10000);
          const replayStatus = PositionToolService.evaluateReplayStatus(
            d,
            candles,
            Boolean(currentReplayTimestamp),
            currentPrice || (candles.length > 0 ? candles[candles.length - 1].close : metrics.entryPrice)
          );

          const entryY = screenPts[0].y;
          const slY = transformer.priceToY(metrics.slPrice) ?? (screenPts[1]?.y ?? entryY - 40);
          const tpY = transformer.priceToY(metrics.tpPrice) ?? (screenPts[2]?.y ?? entryY + 40);

          const startX = screenPts[0].x;
          const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
          const minX = Math.min(startX, endX);
          const maxX = Math.max(startX, endX);
          const width = Math.max(20, maxX - minX);

          const profitTop = Math.min(entryY, tpY);
          const profitHeight = Math.max(1, Math.abs(tpY - entryY));
          const riskTop = Math.min(entryY, slY);
          const riskHeight = Math.max(1, Math.abs(slY - entryY));

          const badgeText = `Risk/reward ratio: ${metrics.riskRewardRatio.toFixed(2)}`;
          const badgeWidth = Math.max(136, badgeText.length * 6.8 + 20);
          const badgeX = minX + (width - badgeWidth) / 2;

          return (
            <g data-testid={`drawing-short-position-${d.id}`} className="select-none">
              {/* Target / Profit Area (Green) */}
              <rect
                x={minX}
                y={profitTop}
                width={width}
                height={profitHeight}
                fill="#089981"
                fillOpacity={0.20}
                stroke="#089981"
                strokeWidth={1}
              />
              {/* Stop / Loss Area (Red) */}
              <rect
                x={minX}
                y={riskTop}
                width={width}
                height={riskHeight}
                fill="#f23645"
                fillOpacity={0.20}
                stroke="#f23645"
                strokeWidth={1}
              />

              {/* Entry Dividing Line */}
              <line
                x1={minX}
                y1={entryY}
                x2={minX + width}
                y2={entryY}
                stroke="#787b86"
                strokeWidth={1}
                opacity={0.8}
              />

              {/* Target Tag Badge on TP Boundary */}
              <g transform={`translate(${minX + 8}, ${tpY - (tpY > entryY ? -4 : 18)})`} className="pointer-events-none select-none">
                <rect
                  width={Math.min(width - 16, 260)}
                  height={16}
                  rx={2}
                  fill="#089981"
                  fillOpacity={0.9}
                />
                <text
                  x={6}
                  y={12}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                >
                  Target: {metrics.tpPrice.toFixed(5)} | {metrics.rewardPips} pips (+${metrics.potentialProfitUsd})
                </text>
              </g>

              {/* Stop Tag Badge on SL Boundary */}
              <g transform={`translate(${minX + 8}, ${slY - (slY < entryY ? 18 : -4)})`} className="pointer-events-none select-none">
                <rect
                  width={Math.min(width - 16, 260)}
                  height={16}
                  rx={2}
                  fill="#f23645"
                  fillOpacity={0.9}
                />
                <text
                  x={6}
                  y={12}
                  fill="#ffffff"
                  fontSize={10}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                >
                  Stop: {metrics.slPrice.toFixed(5)} | {metrics.riskPips} pips (-${metrics.potentialLossUsd})
                </text>
              </g>

              {/* Central Risk/reward ratio Pill Badge */}
              <g transform={`translate(${badgeX}, ${entryY - 11})`} className="pointer-events-none select-none">
                <rect
                  width={badgeWidth}
                  height={22}
                  rx={4}
                  fill="#089981"
                  stroke="#ffffff"
                  strokeWidth={1}
                  className="shadow-sm"
                />
                <text
                  x={badgeWidth / 2}
                  y={15}
                  fill="#ffffff"
                  fontSize={11}
                  fontWeight={600}
                  fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                  textAnchor="middle"
                >
                  {badgeText}
                </text>
              </g>

              {/* Bar Replay Status Indicator Badge (when replay active) */}
              {Boolean(currentReplayTimestamp) && (
                <g transform={`translate(${badgeX}, ${entryY + 14})`} className="pointer-events-none select-none">
                  <rect
                    width={badgeWidth}
                    height={18}
                    rx={3}
                    fill={
                      replayStatus.state === 'target_hit' ? '#089981' :
                      replayStatus.state === 'stopped_out' ? '#f23645' :
                      replayStatus.state === 'active' ? '#0284c7' : '#475569'
                    }
                    className="shadow-sm"
                  />
                  <text
                    x={badgeWidth / 2}
                    y={13}
                    fill="#ffffff"
                    fontSize={10}
                    fontWeight={600}
                    fontFamily='-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, sans-serif'
                    textAnchor="middle"
                  >
                    {replayStatus.state === 'target_hit' ? `TARGET HIT (+${metrics.potentialProfitUsd})` :
                     replayStatus.state === 'stopped_out' ? `STOPPED OUT (-${metrics.potentialLossUsd})` :
                     replayStatus.state === 'active' ? `ACTIVE: ${replayStatus.openPips >= 0 ? '+' : ''}${replayStatus.openPips} pips (${replayStatus.openPnlUsd >= 0 ? '+' : ''}$${replayStatus.openPnlUsd})` :
                     'PLANNED (Waiting Entry)'}
                  </text>
                </g>
              )}
            </g>
          );
        })()}

        """
    content = content[:idx1] + new_render_positions + content[idx2:]
    print("Replaced long/short position render block successfully.")
else:
    print(f"WARNING: position render markers not found: idx1={idx1}, idx2={idx2}")

# 3. Update selection handles for isPosition and general handles
old_handles_start = "        {/* Selection Handles (Resize/Rotate Anchors) */}\n        {isSelected &&\n          !d.locked &&\n          (() => {"
old_handles_end = "            return ptsToRender.map((pt) => (\n              <g key={pt.pointIndex}>"

# Let's inspect the exact handle text
idx_h1 = content.find("{/* Selection Handles (Resize/Rotate Anchors) */}")
idx_h2 = content.find("return ptsToRender.map((pt) => (", idx_h1)

if idx_h1 != -1 and idx_h2 != -1:
    handles_header = content[idx_h1:idx_h2]
    new_handles_header = """{/* Selection Handles (Resize/Rotate Anchors) */}
        {isSelected &&
          !d.locked &&
          (() => {
            const isPosition = d.type === 'long_position' || d.type === 'short_position';
            let ptsToRender: { x: number; y: number; cursor?: string; color?: string; pointIndex: number; title?: string; isVisible?: boolean }[] = [];

            if (isPosition) {
              const startX = screenPts[0].x;
              const endX = screenPts.length >= 4 ? screenPts[3].x : (transformer.timeToX(d.points[0].time + 7200) ?? startX + 150);
              const minX = Math.min(startX, endX);
              const maxX = Math.max(startX, endX);
              const midX = minX + (maxX - minX) / 2;

              const entryPrice = d.points[0].price;
              const slPrice = d.points.length >= 2 ? d.points[1].price : (d.type === 'long_position' ? entryPrice - 0.00150 : entryPrice + 0.00150);
              const tpPrice = d.points.length >= 3 ? d.points[2].price : (d.type === 'long_position' ? entryPrice + 0.00150 : entryPrice - 0.00150);

              const entryY = screenPts[0].y;
              const slY = transformer.priceToY(slPrice) ?? (screenPts[1]?.y ?? entryY + 40);
              const tpY = transformer.priceToY(tpPrice) ?? (screenPts[2]?.y ?? entryY - 40);

              const isLong = d.type === 'long_position';
              const topY = isLong ? tpY : slY;
              const bottomY = isLong ? slY : tpY;
              const topPointIndex = isLong ? 2 : 1;
              const bottomPointIndex = isLong ? 1 : 2;

              // TradingView Complete 8 Anchor Handles:
              // 1. Top Center: (midX, topY) -> controls top level (TP for Long, SL for Short)
              // 2. Bottom Center: (midX, bottomY) -> controls bottom level (SL for Long, TP for Short)
              // 3. Left Middle: (minX, entryY) -> controls entry & shifts bracket
              // 4. Center Entry: (midX, entryY) -> controls entry price vertically
              // 5. Right Middle: (maxX, entryY) -> controls horizontal duration
              // 6. Left Middle Duration: (minX, (topY + bottomY) / 2) -> controls start time
              // 7. Right Top Corner: (maxX, topY)
              // 8. Right Bottom Corner: (maxX, bottomY)
              ptsToRender = [
                { x: midX, y: topY, cursor: 'cursor-ns-resize', pointIndex: topPointIndex, isVisible: true },
                { x: midX, y: bottomY, cursor: 'cursor-ns-resize', pointIndex: bottomPointIndex, isVisible: true },
                { x: minX, y: entryY, cursor: 'cursor-move', pointIndex: 0, isVisible: true },
                { x: midX, y: entryY, cursor: 'cursor-ns-resize', pointIndex: 7, isVisible: true },
                { x: maxX, y: entryY, cursor: 'cursor-ew-resize', pointIndex: 3, isVisible: true },
                { x: minX, y: (topY + bottomY) / 2, cursor: 'cursor-ew-resize', pointIndex: 6, isVisible: false },
                { x: maxX, y: topY, cursor: 'cursor-ns-resize', pointIndex: 4, isVisible: false },
                { x: maxX, y: bottomY, cursor: 'cursor-ns-resize', pointIndex: 5, isVisible: false },
              ];
            } else {
              ptsToRender = screenPts.map((pt, idx) => ({
                x: pt.x,
                y: pt.y,
                cursor: 'cursor-crosshair',
                pointIndex: idx,
                isVisible: true,
              }));
            }

            """
    content = content[:idx_h1] + new_handles_header + content[idx_h2:]
    print("Replaced selection handles header successfully.")

# 4. Now update circle inside handles mapping to have large touch hitbox (r=32 on mobile) & onPointerDown
idx_map = content.find("return ptsToRender.map((pt) => (")
idx_map_end = content.find("</g>\n            ));", idx_map)
if idx_map_end == -1:
    idx_map_end = content.find("</g>\r\n            ));", idx_map)

if idx_map != -1 and idx_map_end != -1:
    old_circle_block = content[idx_map:idx_map_end + 18]
    new_circle_block = """return ptsToRender.map((pt) => (
              <g key={pt.pointIndex}>
                {/* Large 32px diameter / 64px touch target on mobile for effortless grabbing */}
                <circle
                  data-testid={`anchor-handle-${d.id}-${pt.pointIndex}`}
                  cx={pt.x}
                  cy={pt.y}
                  r={isMobile ? 32 : 16}
                  fill="transparent"
                  style={{ touchAction: 'none' }}
                  className={`pointer-events-auto ${pt.cursor}`}
                  onPointerDown={(e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    e.stopPropagation();
                    e.preventDefault();
                    try {
                      (e.currentTarget as Element).setPointerCapture(e.pointerId);
                    } catch (_) {}
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
                  onPointerUp={(e) => {
                    try {
                      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
                    } catch (_) {}
                  }}
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
                  onTouchStart={(e) => {
                    if (e.touches.length === 1) {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = svgRef.current?.getBoundingClientRect();
                      const rawX = e.touches[0].clientX - (rect?.left || 0);
                      const rawY = e.touches[0].clientY - (rect?.top || 0);
                      setDragState({
                        drawingId: d.id,
                        pointIndex: pt.pointIndex,
                        startMouse: { x: rawX, y: rawY },
                        initialPoints: [...d.points],
                      });
                    }
                  }}
                />
                {/* TradingView Signature 10x10 Rounded Square with #2962ff border */}
                {pt.isVisible && (
                  <rect
                    x={pt.x - 5}
                    y={pt.y - 5}
                    width={10}
                    height={10}
                    rx={2.5}
                    fill="#131722"
                    stroke="#2962ff"
                    strokeWidth={2}
                    className="pointer-events-none shadow"
                  />
                )}
              </g>
            ));"""
    content = content[:idx_map] + new_circle_block + content[idx_map_end + 18:]
    print("Replaced handle circle mapping successfully.")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Finished applying full position tools & clone updates to DrawingLayer.tsx.")
