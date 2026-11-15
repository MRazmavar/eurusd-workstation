with open('client/src/components/DrawingLayer.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start_str = "{d.type === 'long_position' && screenPts.length >= 1 && (() => {"
end_str = "{/* Selection Handles (Resize/Rotate Anchors) */}"

idx1 = text.find(start_str)
idx2 = text.find(end_str, idx1)
print(f"Found idx1: {idx1}, idx2: {idx2}")
print(text[idx1:idx1 + 400])
print("... (middle) ...")
print(text[idx2 - 300:idx2])
