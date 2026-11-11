/**
 * Comprehensive Metadata and Icon Registry for all Technical Drawing Tools.
 */
import React from 'react';
import {
  Crosshair,
  MousePointer,
  Eraser,
  TrendingUp,
  Minus,
  MoveVertical,
  ArrowUpRight,
  GitCommit,
  Compass,
  Maximize,
  Percent,
  Square,
  Circle,
  Triangle,
  PenTool,
  Type,
  Tag,
  ArrowRight,
  MessageSquare,
  BarChart,
  Ruler,
} from 'lucide-react';
import { DrawingToolType } from '../types';

export interface ToolMetadata {
  tool: DrawingToolType;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  category: string;
}

/**
 * Dedicated Distinct Visual Icons for Long and Short Trading Positions.
 * Long Position: Green target area on top with upward indicator, bright blue entry line, red stop area on bottom.
 * Short Position: Red stop area on top, bright blue entry line, green target area on bottom with downward indicator.
 */
export const LongPositionIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="18" height="8" rx="1.5" fill="#089981" fillOpacity="0.4" stroke="#089981" strokeWidth="1.5" />
    <path d="M12 9V5M9 7l3-2 3 2" stroke="#089981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <rect x="3" y="13" width="18" height="8" rx="1.5" fill="#f23645" fillOpacity="0.4" stroke="#f23645" strokeWidth="1.5" />
  </svg>
);

export const ShortPositionIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <rect x="3" y="3" width="18" height="8" rx="1.5" fill="#f23645" fillOpacity="0.4" stroke="#f23645" strokeWidth="1.5" />
    <path d="M12 5v4m-3-2 3 2 3-2" stroke="#f23645" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="2" y1="12" x2="22" y2="12" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
    <rect x="3" y="13" width="18" height="8" rx="1.5" fill="#089981" fillOpacity="0.4" stroke="#089981" strokeWidth="1.5" />
  </svg>
);

export const ALL_DRAWING_TOOLS: Record<DrawingToolType, ToolMetadata> = {
  // Cursor
  crosshair: { tool: 'crosshair', label: 'Crosshair', icon: Crosshair, category: 'Cursor' },
  arrow: { tool: 'arrow', label: 'Arrow Cursor', icon: MousePointer, category: 'Cursor' },
  eraser: { tool: 'eraser', label: 'Eraser', icon: Eraser, category: 'Cursor' },

  // Trend Lines
  trendline: { tool: 'trendline', label: 'Trend Line', icon: TrendingUp, category: 'Lines' },
  horizontal_line: { tool: 'horizontal_line', label: 'Horizontal Line', icon: Minus, category: 'Lines' },
  vertical_line: { tool: 'vertical_line', label: 'Vertical Line', icon: MoveVertical, category: 'Lines' },
  ray: { tool: 'ray', label: 'Ray', icon: ArrowUpRight, category: 'Lines' },
  extended_line: { tool: 'extended_line', label: 'Extended Line', icon: GitCommit, category: 'Lines' },
  horizontal_ray: { tool: 'horizontal_ray', label: 'Horizontal Ray', icon: ArrowRight, category: 'Lines' },
  trend_angle: { tool: 'trend_angle', label: 'Trend Angle', icon: Compass, category: 'Lines' },

  // Channels
  parallel_channel: { tool: 'parallel_channel', label: 'Parallel Channel', icon: Maximize, category: 'Channels' },
  regression_trend: { tool: 'regression_trend', label: 'Regression Trend', icon: TrendingUp, category: 'Channels' },
  flat_top_bottom: { tool: 'flat_top_bottom', label: 'Flat Top/Bottom', icon: Minus, category: 'Channels' },
  disjoint_channel: { tool: 'disjoint_channel', label: 'Disjoint Channel', icon: Maximize, category: 'Channels' },

  // Fibonacci
  fib_retracement: { tool: 'fib_retracement', label: 'Fib Retracement', icon: Percent, category: 'Fibonacci' },
  fib_extension: { tool: 'fib_extension', label: 'Fib Extension', icon: TrendingUp, category: 'Fibonacci' },
  fib_channel: { tool: 'fib_channel', label: 'Fib Channel', icon: Maximize, category: 'Fibonacci' },
  fib_fan: { tool: 'fib_fan', label: 'Fib Fan', icon: Compass, category: 'Fibonacci' },
  fib_timezones: { tool: 'fib_timezones', label: 'Fib Time Zones', icon: MoveVertical, category: 'Fibonacci' },

  // Geometric
  rectangle: { tool: 'rectangle', label: 'Rectangle', icon: Square, category: 'Shapes' },
  rotated_rectangle: { tool: 'rotated_rectangle', label: 'Rotated Rectangle', icon: Square, category: 'Shapes' },
  circle: { tool: 'circle', label: 'Circle', icon: Circle, category: 'Shapes' },
  ellipse: { tool: 'ellipse', label: 'Ellipse', icon: Circle, category: 'Shapes' },
  triangle: { tool: 'triangle', label: 'Triangle', icon: Triangle, category: 'Shapes' },
  polyline: { tool: 'polyline', label: 'Polyline', icon: PenTool, category: 'Shapes' },
  path: { tool: 'path', label: 'Path', icon: PenTool, category: 'Shapes' },

  // Annotations
  text: { tool: 'text', label: 'Text', icon: Type, category: 'Annotations' },
  note: { tool: 'note', label: 'Note', icon: MessageSquare, category: 'Annotations' },
  price_label: { tool: 'price_label', label: 'Price Label', icon: Tag, category: 'Annotations' },
  arrow_marker: { tool: 'arrow_marker', label: 'Arrow Marker', icon: ArrowRight, category: 'Annotations' },
  callout: { tool: 'callout', label: 'Callout', icon: MessageSquare, category: 'Annotations' },

  // Trading Analysis
  long_position: { tool: 'long_position', label: 'Long Position', icon: LongPositionIcon, category: 'Trading' },
  short_position: { tool: 'short_position', label: 'Short Position', icon: ShortPositionIcon, category: 'Trading' },
  price_range: { tool: 'price_range', label: 'Price Range', icon: MoveVertical, category: 'Trading' },
  date_range: { tool: 'date_range', label: 'Date Range', icon: Minus, category: 'Trading' },
  date_price_range: { tool: 'date_price_range', label: 'Date & Price Range', icon: Square, category: 'Trading' },
  measure: { tool: 'measure', label: 'Measure Tool', icon: Ruler, category: 'Trading' },
};

export const getToolMetadata = (tool: DrawingToolType): ToolMetadata => {
  return ALL_DRAWING_TOOLS[tool] || {
    tool,
    label: tool.replace('_', ' '),
    icon: TrendingUp,
    category: 'Drawing',
  };
};

export const DEFAULT_FAVORITE_TOOLS: DrawingToolType[] = [
  'trendline',
  'horizontal_line',
  'rectangle',
  'fib_retracement',
  'long_position',
  'short_position',
];
