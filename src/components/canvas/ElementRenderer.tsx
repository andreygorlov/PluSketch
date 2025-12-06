import { forwardRef } from 'react';
import { Element } from '../../types/element';
import { toPixels } from '../../utils/units';
import { useProjectStore } from '../../store';
interface ElementRendererProps {
  element: Element;
  scale?: number;
  selected?: boolean;
  viewType?: 'front'; // סוג המבט
}

const ElementRenderer = forwardRef<SVGGElement, ElementRendererProps>(
  ({ element, scale = 1, selected = false, viewType = 'front' }, ref) => {
    const { selectElement } = useProjectStore();
    
    // משתמש במיקום הישיר של האלמנט
    const x = toPixels(element.x, element.unit, scale);
    const y = toPixels(element.y, element.unit, scale);
    const rotation = 0;

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      // Ctrl+Click או Cmd+Click (Mac) = multi-select
      const multiSelect = e.ctrlKey || e.metaKey;
      selectElement(element.id, multiSelect);
    };

    const transform = rotation
      ? `rotate(${rotation} ${x} ${y})`
      : undefined;

    let elementSvg: JSX.Element;

    switch (element.type) {
      case 'rectangle': {
        const width = toPixels(element.width, element.unit, scale);
        const height = toPixels(element.height, element.unit, scale);
        
        // במבט חזית - הצג מלבן רגיל
        elementSvg = (
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill={element.color}
            stroke={selected ? '#3b82f6' : '#000'}
            strokeWidth={selected ? 3 : 1}
            opacity={0.7}
            transform={transform}
            onClick={handleClick}
            style={{ cursor: 'move' }}
          />
        );
        break;
      }
      case 'circle': {
        const radius = toPixels(element.radius, element.unit, scale);
        elementSvg = (
          <circle
            cx={x}
            cy={y}
            r={radius}
            fill={element.color}
            stroke={selected ? '#3b82f6' : '#000'}
            strokeWidth={selected ? 3 : 1}
            opacity={0.7}
            transform={transform}
            onClick={handleClick}
            style={{ cursor: 'move' }}
          />
        );
        break;
      }
      case 'text': {
        elementSvg = (
          <text
            x={x}
            y={y}
            fill={element.color}
            fontSize={element.fontSize || 16}
            transform={transform}
            onClick={handleClick}
            style={{ cursor: 'move' }}
          >
            {element.text}
          </text>
        );
        break;
      }
    }

    return <g ref={ref}>{elementSvg}</g>;
  }
);

ElementRenderer.displayName = 'ElementRenderer';

export default ElementRenderer;

