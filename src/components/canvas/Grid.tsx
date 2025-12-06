import { useProjectStore } from '../../store';
import { toPixels } from '../../utils/units';

interface GridProps {
  width: number;
  height: number;
  scale?: number;
}

export default function Grid({ width, height, scale = 1 }: GridProps) {
  const { currentProject } = useProjectStore();
  const gridSpacing = currentProject?.settings.gridSpacing || 10;
  const showGrid = currentProject?.settings.showGrid !== false; // default true
  
  if (!showGrid) {
    return null;
  }
  
  const spacingPx = toPixels(gridSpacing, 'cm', scale);

  const lines: JSX.Element[] = [];
  const strokeColor = '#e5e7eb';

  // קווי רשת אנכיים
  for (let x = 0; x <= width; x += spacingPx) {
    lines.push(
      <line
        key={`v-${x}`}
        x1={x}
        y1={0}
        x2={x}
        y2={height}
        stroke={strokeColor}
        strokeWidth={0.5}
      />
    );
  }

  // קווי רשת אופקיים
  for (let y = 0; y <= height; y += spacingPx) {
    lines.push(
      <line
        key={`h-${y}`}
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={strokeColor}
        strokeWidth={0.5}
      />
    );
  }

  return <g data-grid="true">{lines}</g>;
}

