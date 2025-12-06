import { ManualDimensionElement } from '../../types/element';
import { toPixels, formatDimension } from '../../utils/units';
import { useProjectStore } from '../../store';

interface ManualDimensionRendererProps {
  element: ManualDimensionElement;
  scale?: number;
  selected?: boolean;
}

export default function ManualDimensionRenderer({ element, scale = 1, selected = false }: ManualDimensionRendererProps) {
  const { currentProject, updateElement, selectElement, toolMode } = useProjectStore();
  const displayUnit = currentProject?.settings?.displayUnit;
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // בחירה רק במצב select
    if (toolMode === 'select') {
      // Ctrl+Click או Cmd+Click (Mac) = multi-select
      const multiSelect = e.ctrlKey || e.metaKey;
      selectElement(element.id, multiSelect);
    }
  };
  
  const lineColor = '#666';
  const textColor = '#000';
  const fontSize = 8;
  const offset = 15; // מרחק מהקו
  
  // המרת הקואורדינטות לפיקסלים
  const x1 = toPixels(element.x1, element.unit, scale);
  const y1 = toPixels(element.y1, element.unit, scale);
  const x2 = toPixels(element.x2, element.unit, scale);
  const y2 = toPixels(element.y2, element.unit, scale);
  
  // חישוב מרכז הקו
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  
  // חישוב זווית הקו
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  
  // חישוב אורך הקו בפיקסלים
  const lineLength = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  
  // חישוב מיקום הטקסט (מעל הקו)
  const textOffsetX = -Math.sin(angle * Math.PI / 180) * offset;
  const textOffsetY = -Math.cos(angle * Math.PI / 180) * offset;
  
  // חישוב מיקום קווי העזר (ניצבים לקו הראשי)
  const perpAngle = angle + 90;
  const perpOffsetX = Math.cos(perpAngle * Math.PI / 180) * 5;
  const perpOffsetY = Math.sin(perpAngle * Math.PI / 180) * 5;
  
  const selectedLineColor = selected ? '#3b82f6' : lineColor;
  const selectedStrokeWidth = selected ? 2.5 : 1;
  
  return (
    <g onClick={handleClick} style={{ cursor: toolMode === 'select' ? 'pointer' : 'default' }}>
      {/* קו עזר ראשי */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={selectedLineColor}
        strokeWidth={selectedStrokeWidth}
        strokeDasharray="2,2"
      />
      
      {/* קווי עזר ניצבים בקצוות */}
      <line
        x1={x1 - perpOffsetX}
        y1={y1 - perpOffsetY}
        x2={x1 + perpOffsetX}
        y2={y1 + perpOffsetY}
        stroke={selectedLineColor}
        strokeWidth={selected ? 2 : 1.5}
      />
      <line
        x1={x2 - perpOffsetX}
        y1={y2 - perpOffsetY}
        x2={x2 + perpOffsetX}
        y2={y2 + perpOffsetY}
        stroke={selectedLineColor}
        strokeWidth={selected ? 2 : 1.5}
      />
      
      {/* חצים */}
      <path
        d={`M ${x1} ${y1} L ${x1 - perpOffsetX * 0.6} ${y1 - perpOffsetY * 0.6 - 3} M ${x1} ${y1} L ${x1 - perpOffsetX * 0.6} ${y1 - perpOffsetY * 0.6 + 3}`}
        stroke={selectedLineColor}
        strokeWidth={selected ? 2 : 1.5}
        fill="none"
      />
      <path
        d={`M ${x2} ${y2} L ${x2 + perpOffsetX * 0.6} ${y2 + perpOffsetY * 0.6 - 3} M ${x2} ${y2} L ${x2 + perpOffsetX * 0.6} ${y2 + perpOffsetY * 0.6 + 3}`}
        stroke={selectedLineColor}
        strokeWidth={selected ? 2 : 1.5}
        fill="none"
      />
      
      {/* רקע לטקסט */}
      <rect
        x={centerX + textOffsetX - 40}
        y={centerY + textOffsetY - 12}
        width={80}
        height={18}
        fill="white"
        stroke={selectedLineColor}
        strokeWidth={selected ? 1.5 : 0.5}
        rx={2}
        transform={`rotate(${angle}, ${centerX + textOffsetX}, ${centerY + textOffsetY})`}
      />
      
      {/* טקסט המידה */}
      <text
        x={centerX + textOffsetX}
        y={centerY + textOffsetY + 3}
        fontSize={fontSize}
        fill={textColor}
        textAnchor="middle"
        fontWeight="bold"
        transform={`rotate(${angle}, ${centerX + textOffsetX}, ${centerY + textOffsetY})`}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {formatDimension(element.value, element.unit, displayUnit)}
      </text>
    </g>
  );
}

