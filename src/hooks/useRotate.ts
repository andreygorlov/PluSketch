import { useRef, useEffect } from 'react';
import { Element } from '../types/element';
import { toPixels } from '../utils/units';
import { screenToSVG } from '../utils/mouseCoordinates';

interface UseRotateOptions {
  element: Element;
  enabled?: boolean;
  onRotate?: (angle: number) => void;
}

export function useRotate(
  handleRef: React.RefObject<SVGElement>,
  { element, enabled = true, onRotate }: UseRotateOptions
) {
  const isRotating = useRef(false);
  const startAngle = useRef(0);
  const elementStartRotation = useRef(0);

  useEffect(() => {
    if (!enabled || !handleRef.current) return;

    const handle = handleRef.current;
    const svg = handle.ownerSVGElement;
    if (!svg) return;

    const getAngle = (e: MouseEvent): number => {
      const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
      if (!svgPoint) return 0;
      
      const centerX = toPixels(element.x, element.unit);
      const centerY = toPixels(element.y, element.unit);
      
      const dx = svgPoint.x - centerX;
      const dy = svgPoint.y - centerY;
      
      return (Math.atan2(dy, dx) * 180) / Math.PI;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      
      isRotating.current = true;
      startAngle.current = getAngle(e);
      elementStartRotation.current = element.rotation || 0;
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isRotating.current) return;
      
      const currentAngle = getAngle(e);
      const deltaAngle = currentAngle - startAngle.current;
      const newRotation = elementStartRotation.current + deltaAngle;
      
      // נרמול ל-0-360
      const normalizedRotation = ((newRotation % 360) + 360) % 360;
      
      onRotate?.(normalizedRotation);
    };

    const handleMouseUp = () => {
      if (isRotating.current) {
        isRotating.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      }
    };

    handle.addEventListener('mousedown', handleMouseDown);

    return () => {
      handle.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, element, handleRef, onRotate]);
}

