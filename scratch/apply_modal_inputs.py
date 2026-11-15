import re

file_path = 'client/src/components/DrawingPropertiesModal.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
if 'PositionToolService' not in content:
    content = content.replace(
        "import { DEFAULT_FIB_LEVELS, getDefaultFibLevels, formatFibLevel } from '../utils/fibonacci';",
        "import { DEFAULT_FIB_LEVELS, getDefaultFibLevels, formatFibLevel } from '../utils/fibonacci';\nimport { PositionToolService } from '../services/PositionToolService';"
    )
if 'Calculator' not in content:
    content = content.replace(
        "  Palette, MapPin, Layers, Percent, Eye, EyeOff, Lock, Unlock, X, Check, RotateCcw,",
        "  Palette, MapPin, Layers, Percent, Eye, EyeOff, Lock, Unlock, X, Check, RotateCcw, Calculator,"
    )

# 2. State definition
content = content.replace(
    "  const isFib = drawing ? (drawing.type.startsWith('fib_') || drawing.type === 'fib_retracement') : false;\n\n  const [activeTab, setActiveTab] = useState<'levels' | 'style' | 'coordinates' | 'visibility'>('style');",
    """  const isFib = drawing ? (drawing.type.startsWith('fib_') || drawing.type === 'fib_retracement') : false;
  const isPosition = drawing ? (drawing.type === 'long_position' || drawing.type === 'short_position') : false;

  const [activeTab, setActiveTab] = useState<'levels' | 'inputs' | 'style' | 'coordinates' | 'visibility'>('style');
  const [accountSize, setAccountSize] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);"""
)

# In useEffect when opening drawing:
content = content.replace(
    "        setActiveTab('levels'); // Open directly into Levels tab for Fib drawings\n      } else {",
    """        setActiveTab('levels'); // Open directly into Levels tab for Fib drawings
      } else if (drawing.type === 'long_position' || drawing.type === 'short_position') {
        setAccountSize(drawing.properties?.accountSize || 10000);
        setRiskPercent(drawing.properties?.riskPercent || 1.0);
        setActiveTab('inputs');
      } else {"""
)

# In handleApply:
content = content.replace(
    "      ...(isFib ? {\n        fibLevels: fibLevels.map(l => ({ ...l })),\n        extendLinesLeft,\n        extendLinesRight,\n        fillBackground,\n        showPrices,\n        showLevels,\n      } : {}),",
    """      ...(isFib ? {
        fibLevels: fibLevels.map(l => ({ ...l })),
        extendLinesLeft,
        extendLinesRight,
        fillBackground,
        showPrices,
        showLevels,
      } : {}),
      ...(isPosition ? {
        accountSize,
        riskPercent,
      } : {}),"""
)

# 3. Tab buttons in header:
content = content.replace(
    """          <button
            type="button"
            data-testid="tab-style"
            onClick={() => setActiveTab('style')}""",
    """          {isPosition && (
            <button
              type="button"
              data-testid="tab-position-inputs"
              onClick={() => setActiveTab('inputs')}
              className={`pb-2.5 font-semibold transition-colors flex items-center space-x-1.5 border-b-2 flex-shrink-0 ${
                activeTab === 'inputs'
                  ? 'border-[#2962ff] text-[#2962ff]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Calculator size={13} />
              <span>Inputs & Sizing</span>
            </button>
          )}
          <button
            type="button"
            data-testid="tab-style"
            onClick={() => setActiveTab('style')}"""
)

# 4. Inputs Tab Content
old_style_tab = "          {/* 1. STYLE TAB */}\n          {activeTab === 'style' && ("
new_inputs_tab = """          {/* 0. POSITION INPUTS TAB (TradingView Standard Sizing & Formulas) */}
          {activeTab === 'inputs' && isPosition && (() => {
            const previewDrawing = {
              ...drawing,
              points: points.map(p => ({ ...p })),
              properties: { ...properties, accountSize, riskPercent },
            };
            const metrics = PositionToolService.calculateMetrics(previewDrawing, accountSize);
            const isLong = drawing.type === 'long_position';

            return (
              <div className="space-y-4">
                {/* Account Sizing Inputs */}
                <div className="grid grid-cols-2 gap-3 bg-[#131722] p-3 rounded border border-[#2a2e39]">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                      Account Size ($)
                    </label>
                    <input
                      type="number"
                      step="100"
                      value={accountSize}
                      onChange={(e) => setAccountSize(parseFloat(e.target.value) || 1000)}
                      className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1 uppercase text-[10px] tracking-wider">
                      Risk Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={riskPercent}
                      onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0.1)}
                      className="w-full bg-[#1e222d] border border-[#2a2e39] rounded px-2.5 py-1 text-white font-mono text-xs focus:outline-none focus:border-[#2962ff]"
                    />
                  </div>
                </div>

                {/* Price Coordinates */}
                <div className="space-y-2 bg-[#131722] p-3 rounded border border-[#2a2e39]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-300 font-semibold">Entry Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[0]?.price ?? 1.10000}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[0]) next[0] = { ...next[0], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#2a2e39] rounded px-2 py-0.5 text-right text-white font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-400 font-semibold">Take Profit Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[2]?.price ?? (isLong ? 1.10300 : 1.09700)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[2]) next[2] = { ...next[2], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#089981]/50 rounded px-2 py-0.5 text-right text-emerald-300 font-mono text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-red-400 font-semibold">Stop Loss Price:</span>
                    <input
                      type="number"
                      step="0.00001"
                      value={points[1]?.price ?? (isLong ? 1.09850 : 1.10150)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPoints(prev => {
                          const next = [...prev];
                          if (next[1]) next[1] = { ...next[1], price: val };
                          return next;
                        });
                      }}
                      className="w-32 bg-[#1e222d] border border-[#f23645]/50 rounded px-2 py-0.5 text-right text-red-300 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Real-time TradingView Statistics & Formulas Box */}
                <div className="bg-[#1e222d] p-3 rounded border border-[#2a2e39] space-y-2">
                  <div className="flex justify-between items-center pb-1.5 border-b border-[#2a2e39]">
                    <span className="text-gray-400 text-xs">Risk/Reward Ratio:</span>
                    <span className="text-[#089981] font-bold font-mono text-sm">
                      1 : {metrics.riskRewardRatio.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">REWARD</span>
                      <span className="text-emerald-400 font-mono font-semibold">
                        {metrics.rewardPips} pips ({metrics.rewardPercentOfPrice}%)
                      </span>
                      <span className="text-emerald-300 font-mono block text-[11px]">
                        +${metrics.potentialProfitUsd}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">RISK</span>
                      <span className="text-red-400 font-mono font-semibold">
                        {metrics.riskPips} pips ({metrics.riskPercentOfPrice}%)
                      </span>
                      <span className="text-red-300 font-mono block text-[11px]">
                        -${metrics.potentialLossUsd}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-[#2a2e39] flex justify-between text-xs text-gray-300 font-mono">
                    <span>Position Size: <strong>{metrics.lotSize} Lots</strong></span>
                    <span>Risk Amount: <strong>${metrics.riskAmount}</strong></span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 1. STYLE TAB */}
          {activeTab === 'style' && ("""

content = content.replace(old_style_tab, new_inputs_tab)

# 5. Coordinates tab labeling for position tools:
old_coord_item = """                  <div className="flex justify-between items-center text-gray-300 font-semibold">
                    <span>Anchor Point #{idx + 1}</span>
                    <span className="text-gray-500 font-mono text-[10px]">
                      {new Date(pt.time * 1000).toUTCString().slice(0, 22)} UTC
                    </span>
                  </div>"""

new_coord_item = """                  <div className="flex justify-between items-center text-gray-300 font-semibold">
                    <span>
                      {isPosition ? (
                        idx === 0 ? '1. Entry Level' :
                        idx === 1 ? '2. Stop Loss Level' :
                        idx === 2 ? '3. Take Profit Level' :
                        idx === 3 ? '4. Duration / End Time' : `Anchor #${idx + 1}`
                      ) : `Anchor Point #${idx + 1}`}
                    </span>
                    <span className="text-gray-500 font-mono text-[10px]">
                      {new Date(pt.time * 1000).toUTCString().slice(0, 22)} UTC
                    </span>
                  </div>"""

content = content.replace(old_coord_item, new_coord_item)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DrawingPropertiesModal successfully.")
