import os

file_path = r'client/src/components/DrawingLayer.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add PositionToolService import if not present
if 'import { PositionToolService }' not in content:
    content = content.replace(
        "import { DEFAULT_FIB_LEVELS, getDefaultFibLevels, formatFibLevel } from '../utils/fibonacci';",
        "import { DEFAULT_FIB_LEVELS, getDefaultFibLevels, formatFibLevel } from '../utils/fibonacci';\nimport { PositionToolService } from '../services/PositionToolService';"
    )
    print("Added PositionToolService import.")

# 2. Add isCtrlPressedRef
if 'const isCtrlPressedRef = useRef<boolean>(false);' not in content:
    content = content.replace(
        "  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);",
        "  const [isCtrlPressed, setIsCtrlPressed] = useState<boolean>(false);\n  const isCtrlPressedRef = useRef<boolean>(false);"
    )
    print("Added isCtrlPressedRef.")

# Update keyboard listeners to keep isCtrlPressedRef in sync
content = content.replace(
    "      if (e.key === 'Control' || e.key === 'Meta') {\r\n        setIsCtrlPressed(true);\r\n      }",
    "      if (e.key === 'Control' || e.key === 'Meta') {\r\n        setIsCtrlPressed(true);\r\n        isCtrlPressedRef.current = true;\r\n      }"
).replace(
    "      if (e.key === 'Control' || e.key === 'Meta') {\n        setIsCtrlPressed(true);\n      }",
    "      if (e.key === 'Control' || e.key === 'Meta') {\n        setIsCtrlPressed(true);\n        isCtrlPressedRef.current = true;\n      }"
)

content = content.replace(
    "      if (e.key === 'Control' || e.key === 'Meta') {\r\n        setIsCtrlPressed(false);\r\n      }",
    "      if (e.key === 'Control' || e.key === 'Meta') {\r\n        setIsCtrlPressed(false);\r\n        isCtrlPressedRef.current = false;\r\n      }"
).replace(
    "      if (e.key === 'Control' || e.key === 'Meta') {\n        setIsCtrlPressed(false);\n      }",
    "      if (e.key === 'Control' || e.key === 'Meta') {\n        setIsCtrlPressed(false);\n        isCtrlPressedRef.current = false;\n      }"
)

content = content.replace(
    "    const handleBlur = () => {\r\n      setIsCtrlPressed(false);\r\n    };",
    "    const handleBlur = () => {\r\n      setIsCtrlPressed(false);\r\n      isCtrlPressedRef.current = false;\r\n    };"
).replace(
    "    const handleBlur = () => {\n      setIsCtrlPressed(false);\n    };",
    "    const handleBlur = () => {\n      setIsCtrlPressed(false);\n      isCtrlPressedRef.current = false;\n    };"
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated DrawingLayer step 1.")
