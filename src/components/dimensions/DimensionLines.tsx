import { Element } from '../../types/element';
import { toPixels, formatDimension } from '../../utils/units';
import { useProjectStore } from '../../store';
import EditableDimensionText from './EditableDimensionText';

interface DimensionLinesProps {
  element: Element;
  scale?: number;
  viewType?: 'front';
}

export default function DimensionLines({ element, scale = 1, viewType = 'front' }: DimensionLinesProps) {
  const { currentProject } = useProjectStore();
  const displayUnit = currentProject?.settings?.displayUnit;
  // במבט חזית: X, Y
  const x = toPixels(element.x, element.unit, scale);
  const y = toPixels(element.y, element.unit, scale);
  
  const lineColor = '#666';
  const textColor = '#000';
  const fontSize = 8;
  const offset = 15; // מרחק מהאלמנט

  if (element.type === 'rectangle') {
    const width = toPixels(element.width, element.unit, scale);
    const height = toPixels(element.height, element.unit, scale);
    const centerX = x + width / 2;
    const centerY = y + height / 2;

    return (
      <g>
        {/* רוחב - מלמעלה */}
        <g>
          {/* קו עזר אופקי מלמעלה */}
          <line
            x1={x}
            y1={y - offset}
            x2={x + width}
            y2={y - offset}
            stroke={lineColor}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          {/* קווים אנכיים בקצוות */}
          <line
            x1={x}
            y1={y - offset - 5}
            x2={x}
            y2={y - offset + 5}
            stroke={lineColor}
            strokeWidth={1.5}
          />
          <line
            x1={x + width}
            y1={y - offset - 5}
            x2={x + width}
            y2={y - offset + 5}
            stroke={lineColor}
            strokeWidth={1.5}
          />
          {/* חצים */}
          <path
            d={`M ${x} ${y - offset} L ${x - 5} ${y - offset - 3} M ${x} ${y - offset} L ${x - 5} ${y - offset + 3}`}
            stroke={lineColor}
            strokeWidth={1.5}
            fill="none"
          />
          <path
            d={`M ${x + width} ${y - offset} L ${x + width + 5} ${y - offset - 3} M ${x + width} ${y - offset} L ${x + width + 5} ${y - offset + 3}`}
            stroke={lineColor}
            strokeWidth={1.5}
            fill="none"
          />
          {/* טקסט רוחב */}
          <rect
            x={centerX - 40}
            y={y - offset - 12}
            width={80}
            height={18}
            fill="white"
            stroke={lineColor}
            strokeWidth={0.5}
            rx={2}
          />
          <EditableDimensionText
            element={element}
            x={centerX}
            y={y - offset - 3}
            value={element.width}
            dimension="width"
            scale={scale}
            displayUnit={displayUnit}
          />
        </g>

        {/* גובה - מימין */}
        <g>
            {/* קו עזר אנכי מימין */}
            <line
              x1={x + width + offset}
              y1={y}
              x2={x + width + offset}
              y2={y + height}
              stroke={lineColor}
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            {/* קווים אופקיים בקצוות */}
            <line
              x1={x + width + offset - 5}
              y1={y}
              x2={x + width + offset + 5}
              y2={y}
              stroke={lineColor}
              strokeWidth={1.5}
            />
            <line
              x1={x + width + offset - 5}
              y1={y + height}
              x2={x + width + offset + 5}
              y2={y + height}
              stroke={lineColor}
              strokeWidth={1.5}
            />
            {/* חצים */}
            <path
              d={`M ${x + width + offset} ${y} L ${x + width + offset - 3} ${y - 5} M ${x + width + offset} ${y} L ${x + width + offset + 3} ${y - 5}`}
              stroke={lineColor}
              strokeWidth={1.5}
              fill="none"
            />
            <path
              d={`M ${x + width + offset} ${y + height} L ${x + width + offset - 3} ${y + height + 5} M ${x + width + offset} ${y + height} L ${x + width + offset + 3} ${y + height + 5}`}
              stroke={lineColor}
              strokeWidth={1.5}
              fill="none"
            />
            {/* טקסט גובה */}
            <rect
              x={x + width + offset + 8}
              y={centerY - 9}
              width={50}
              height={18}
              fill="white"
              stroke={lineColor}
              strokeWidth={0.5}
              rx={2}
            />
            <EditableDimensionText
              element={element}
              x={x + width + offset + 33}
              y={centerY + 3}
              value={element.height}
              dimension="height"
              scale={scale}
              displayUnit={displayUnit}
            />
          </g>
      </g>
    );
  }

  if (element.type === 'circle') {
    const radius = toPixels(element.radius, element.unit, scale);
    const diameter = radius * 2;

    return (
      <g>
        {/* קוטר - אופקי */}
        <g>
          <line
            x1={x - radius}
            y1={y - radius - offset}
            x2={x + radius}
            y2={y - radius - offset}
            stroke={lineColor}
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <line
            x1={x - radius}
            y1={y - radius - offset - 5}
            x2={x - radius}
            y2={y - radius - offset + 5}
            stroke={lineColor}
            strokeWidth={1.5}
          />
          <line
            x1={x + radius}
            y1={y - radius - offset - 5}
            x2={x + radius}
            y2={y - radius - offset + 5}
            stroke={lineColor}
            strokeWidth={1.5}
          />
          <path
            d={`M ${x - radius} ${y - radius - offset} L ${x - radius - 5} ${y - radius - offset - 3} M ${x - radius} ${y - radius - offset} L ${x - radius - 5} ${y - radius - offset + 3}`}
            stroke={lineColor}
            strokeWidth={1.5}
            fill="none"
          />
          <path
            d={`M ${x + radius} ${y - radius - offset} L ${x + radius + 5} ${y - radius - offset - 3} M ${x + radius} ${y - radius - offset} L ${x + radius + 5} ${y - radius - offset + 3}`}
            stroke={lineColor}
            strokeWidth={1.5}
            fill="none"
          />
          <rect
            x={x - 40}
            y={y - radius - offset - 12}
            width={80}
            height={18}
            fill="white"
            stroke={lineColor}
            strokeWidth={0.5}
            rx={2}
          />
          <text
            x={x}
            y={y - radius - offset - 3}
            fontSize={fontSize}
            fill={textColor}
            textAnchor="middle"
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            Ø {formatDimension(diameter, element.unit, displayUnit)}
          </text>
        </g>
      </g>
    );
  }

  if (element.type === 'text') {
    return null;
  }

  return null;
}

