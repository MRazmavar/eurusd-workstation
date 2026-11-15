with open('client/src/components/DrawingLayer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_str = "if (target.type === 'long_position' || target.type === 'short_position') {"
end_str = "onUpdate({ ...target, points: updatedPts, updated_at: Date.now() }, false);"

idx1 = text.find(start_str)
idx2 = text.find(end_str, idx1)
print("=== BLOCK START ===")
print(text[idx1:idx2 + len(end_str)])
print("=== BLOCK END ===")
