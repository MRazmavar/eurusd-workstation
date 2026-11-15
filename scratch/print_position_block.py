with open('client/src/components/DrawingLayer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_str = "{d.type === 'long_position' && screenPts.length >= 1 && (() => {"
end_str = "{/* Selection Handles (Resize/Rotate Anchors) */}"

idx1 = text.find(start_str)
idx2 = text.find(end_str, idx1)
block = text[idx1:idx2]
print(f"Total length of block: {len(block)}")
with open('scratch/current_position_render_block.txt', 'w', encoding='utf-8') as out:
    out.write(block)
print("Saved to scratch/current_position_render_block.txt")
