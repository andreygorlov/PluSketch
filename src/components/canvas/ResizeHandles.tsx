import { useRef, useState, useEffect } from 'react';
import { Element } from '../../types/element';
import { toPixels, fromPixels, formatDimension } from '../../utils/units';
import { useProjectStore } from '../../store';
import { screenToSVG } from '../../utils/mouseCoordinates';

interface ResizeHandlesProps {
  element: Element;
  scale: number;
  onResize?: (width: number, height: number, x: number, y: number) => void;
}

type HandlePosition = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export default function ResizeHandles({ element, scale, onResize }: ResizeHandlesProps) {
  const { updateElement, currentProject } = useProjectStore();
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; elementX: number; elementY: number } | null>(null);
  const [tempSize, setTempSize] = useState<{ width: number; height: number; x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const activeHandleRef = useRef<HandlePosition | null>(null);
  const displayUnit = currentProject?.settings?.displayUnit;

  // רק למלבנים
  if (element.type !== 'rectangle') return null;

  const x = toPixels(element.x, element.unit, scale);
  const y = toPixels(element.y, element.unit, scale);
  const width = toPixels(element.width, element.unit, scale);
  const height = toPixels(element.height, element.unit, scale);

  const handleSize = 8;
  const handleOffset = handleSize / 2;

  const handles: { position: HandlePosition; x: number; y: number; cursor: string }[] = [
    { position: 'nw', x: x, y: y, cursor: 'nw-resize' },
    { position: 'ne', x: x + width, y: y, cursor: 'ne-resize' },
    { position: 'sw', x: x, y: y + height, cursor: 'sw-resize' },
    { position: 'se', x: x + width, y: y + height, cursor: 'se-resize' },
    { position: 'n', x: x + width / 2, y: y, cursor: 'n-resize' },
    { position: 's', x: x + width / 2, y: y + height, cursor: 's-resize' },
    { position: 'e', x: x + width, y: y + height / 2, cursor: 'e-resize' },
    { position: 'w', x: x, y: y + height / 2, cursor: 'w-resize' },
  ];

  const displayWidth = tempSize ? tempSize.width : width;
  const displayHeight = tempSize ? tempSize.height : height;
  const displayX = tempSize ? tempSize.x : x;
  const displayY = tempSize ? tempSize.y : y;

  const displayHandles = handles.map(handle => {
    if (tempSize) {
      // עדכון מיקום ה-handles לפי הגודל הזמני
      const baseX = displayX;
      const baseY = displayY;
      const baseWidth = displayWidth;
      const baseHeight = displayHeight;

      switch (handle.position) {
        case 'nw': return { ...handle, x: baseX, y: baseY };
        case 'ne': return { ...handle, x: baseX + baseWidth, y: baseY };
        case 'sw': return { ...handle, x: baseX, y: baseY + baseHeight };
        case 'se': return { ...handle, x: baseX + baseWidth, y: baseY + baseHeight };
        case 'n': return { ...handle, x: baseX + baseWidth / 2, y: baseY };
        case 's': return { ...handle, x: baseX + baseWidth / 2, y: baseY + baseHeight };
        case 'e': return { ...handle, x: baseX + baseWidth, y: baseY + baseHeight / 2 };
        case 'w': return { ...handle, x: baseX, y: baseY + baseHeight / 2 };
        default: return handle;
      }
    }
    return handle;
  });

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStart || !activeHandleRef.current) return;

      const svg = (e.target as HTMLElement).closest('svg') as SVGSVGElement;
      if (!svg) return;

      const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
      if (!svgPoint) return;

      const deltaX = svgPoint.x - resizeStart.x;
      const deltaY = svgPoint.y - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.elementX;
      let newY = resizeStart.elementY;

      const handle = activeHandleRef.current;

      // חישוב גודל ומיקום חדש לפי ה-handle שנגרר
      switch (handle) {
        case 'nw':
          newWidth = resizeStart.width - deltaX;
          newHeight = resizeStart.height - deltaY;
          newX = resizeStart.elementX + deltaX;
          newY = resizeStart.elementY + deltaY;
          break;
        case 'ne':
          newWidth = resizeStart.width + deltaX;
          newHeight = resizeStart.height - deltaY;
          newY = resizeStart.elementY + deltaY;
          break;
        case 'sw':
          newWidth = resizeStart.width - deltaX;
          newHeight = resizeStart.height + deltaY;
          newX = resizeStart.elementX + deltaX;
          break;
        case 'se':
          newWidth = resizeStart.width + deltaX;
          newHeight = resizeStart.height + deltaY;
          break;
        case 'n':
          newHeight = resizeStart.height - deltaY;
          newY = resizeStart.elementY + deltaY;
          break;
        case 's':
          newHeight = resizeStart.height + deltaY;
          break;
        case 'e':
          newWidth = resizeStart.width + deltaX;
          break;
        case 'w':
          newWidth = resizeStart.width - deltaX;
          newX = resizeStart.elementX + deltaX;
          break;
      }

      // הגבלת גודל מינימלי
      const minSize = 10 / scale; // 10 ס"מ מינימום
      if (newWidth < minSize) {
        if (handle === 'w' || handle === 'nw' || handle === 'sw') {
          newX = resizeStart.elementX + resizeStart.width - minSize;
        }
        newWidth = minSize;
      }
      if (newHeight < minSize) {
        if (handle === 'n' || handle === 'nw' || handle === 'ne') {
          newY = resizeStart.elementY + resizeStart.height - minSize;
        }
        newHeight = minSize;
      }

      // המרה חזרה ליחידות המקור
      const newWidthCm = fromPixels(newWidth, element.unit, scale);
      const newHeightCm = fromPixels(newHeight, element.unit, scale);
      const newXCm = fromPixels(newX, element.unit, scale);
      const newYCm = fromPixels(newY, element.unit, scale);

      setTempSize({ width: newWidth, height: newHeight, x: newX, y: newY });
      setMousePos({ x: svgPoint.x, y: svgPoint.y });
      onResize?.(newWidthCm, newHeightCm, newXCm, newYCm);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.stopPropagation();
      if (resizeStart && activeHandleRef.current) {
        const finalWidth = tempSize ? fromPixels(tempSize.width, element.unit, scale) : element.width;
        const finalHeight = tempSize ? fromPixels(tempSize.height, element.unit, scale) : element.height;
        const finalX = tempSize ? fromPixels(tempSize.x, element.unit, scale) : element.x;
        const finalY = tempSize ? fromPixels(tempSize.y, element.unit, scale) : element.y;

        updateElement(element.id, {
          width: finalWidth,
          height: finalHeight,
          x: finalX,
          y: finalY,
        });
      }

      setIsResizing(false);
      setResizeStart(null);
      setTempSize(null);
      setMousePos(null);
      activeHandleRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, resizeStart, tempSize, element, scale, updateElement, onResize]);

  const handleMouseDown = (e: React.MouseEvent, position: HandlePosition) => {
    e.stopPropagation();
    activeHandleRef.current = position;
    
    const svg = (e.target as HTMLElement).closest('svg') as SVGSVGElement;
    if (!svg) return;
    
    const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
    if (!svgPoint) return;
    
    setIsResizing(true);
    setResizeStart({
      x: svgPoint.x,
      y: svgPoint.y,
      width: displayWidth,
      height: displayHeight,
      elementX: displayX,
      elementY: displayY,
    });
  };

  // חישוב מידות לתצוגה
  const currentWidth = tempSize ? fromPixels(tempSize.width, element.unit, scale) : element.width;
  const currentHeight = tempSize ? fromPixels(tempSize.height, element.unit, scale) : element.height;

  return (
    <g>
      {displayHandles.map((handle) => (
        <g key={handle.position}>
          <rect
            x={handle.x - handleOffset}
            y={handle.y - handleOffset}
            width={handleSize}
            height={handleSize}
            fill="#3b82f6"
            stroke="#fff"
            strokeWidth={1}
            cursor={handle.cursor}
            onMouseDown={(e) => handleMouseDown(e, handle.position)}
            style={{ pointerEvents: 'all' }}
          />
        </g>
      ))}
      
      {/* הצגת מידות live בזמן resize */}
      {isResizing && mousePos && (
        <g>
          <rect
            x={mousePos.x + 10}
            y={mousePos.y - 30}
            width={120}
            height={40}
            fill="rgba(0, 0, 0, 0.8)"
            stroke="#fff"
            strokeWidth={1}
            rx={4}
          />
          <text
            x={mousePos.x + 70}
            y={mousePos.y - 15}
            fontSize={12}
            fill="#fff"
            textAnchor="middle"
            fontWeight="bold"
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {formatDimension(currentWidth, element.unit, displayUnit)} × {formatDimension(currentHeight, element.unit, displayUnit)}
          </text>
        </g>
      )}
    </g>
  );
}

