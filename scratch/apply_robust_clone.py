file_path = 'client/src/components/DrawingLayer.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update dragState type
content = content.replace(
    """  const [dragState, setDragState] = useState<{
    drawingId: string;
    pointIndex?: number;""",
    """  const [dragState, setDragState] = useState<{
    drawingId: string;
    drawing?: DrawingObject;
    pointIndex?: number;"""
)

# 2. In handleWindowMouseMove line ~530:
content = content.replace(
    "const target = drawingsRef.current.find(d => d.id === currentDrag.drawingId);",
    "const target = drawingsRef.current.find(d => d.id === currentDrag.drawingId) || currentDrag.drawing;"
)

# 3. In handleWindowMouseUp:
content = content.replace(
    "const target = latestDraggedDrawingRef.current || drawingsRef.current.find(d => d.id === dragStateRef.current?.drawingId);",
    "const target = latestDraggedDrawingRef.current || drawingsRef.current.find(d => d.id === dragStateRef.current?.drawingId) || dragStateRef.current?.drawing;"
)

# 4. Wherever a clone is created, push to drawingsRef.current and add drawing to dragState:
old_clone_pattern = """          if (isClone) {
            const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const clonedDrawing: DrawingObject = {
              ...JSON.parse(JSON.stringify(hit.drawing)),
              id: cloneId,
              created_at: Date.now(),
              updated_at: Date.now(),
            };
            onAdd(clonedDrawing);
            targetDrawing = clonedDrawing;
          }"""

new_clone_pattern = """          if (isClone) {
            const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const clonedDrawing: DrawingObject = {
              ...JSON.parse(JSON.stringify(hit.drawing)),
              id: cloneId,
              created_at: Date.now(),
              updated_at: Date.now(),
            };
            drawingsRef.current.push(clonedDrawing);
            onAdd(clonedDrawing);
            targetDrawing = clonedDrawing;
          }"""

content = content.replace(old_clone_pattern, new_clone_pattern)

old_g_clone = """            if (isClone) {
              const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const clonedDrawing: DrawingObject = {
                ...JSON.parse(JSON.stringify(d)),
                id: cloneId,
                created_at: Date.now(),
                updated_at: Date.now(),
              };
              onAdd(clonedDrawing);
              targetDrawing = clonedDrawing;
            }"""

new_g_clone = """            if (isClone) {
              const cloneId = `draw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
              const clonedDrawing: DrawingObject = {
                ...JSON.parse(JSON.stringify(d)),
                id: cloneId,
                created_at: Date.now(),
                updated_at: Date.now(),
              };
              drawingsRef.current.push(clonedDrawing);
              onAdd(clonedDrawing);
              targetDrawing = clonedDrawing;
            }"""

content = content.replace(old_g_clone, new_g_clone)

# Update setDragState calls to pass drawing: targetDrawing
content = content.replace(
    """          setDragState({
            drawingId: targetDrawing.id,
            pointIndex: isClone ? undefined : hit.pointIndex,""",
    """          setDragState({
            drawingId: targetDrawing.id,
            drawing: targetDrawing,
            pointIndex: isClone ? undefined : hit.pointIndex,"""
)

content = content.replace(
    """            setDragState({
              drawingId: targetDrawing.id,
              startMouse: { x: rawX, y: rawY },""",
    """            setDragState({
              drawingId: targetDrawing.id,
              drawing: targetDrawing,
              startMouse: { x: rawX, y: rawY },"""
)

content = content.replace(
    """                    setDragState({
                      drawingId: targetDrawing.id,
                      pointIndex: isClone ? undefined : pt.pointIndex,""",
    """                    setDragState({
                      drawingId: targetDrawing.id,
                      drawing: targetDrawing,
                      pointIndex: isClone ? undefined : pt.pointIndex,"""
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Applied robust clone updates.")
