import { Element } from '../../types/element';
import { getElementBounds } from '../../utils/geometry';
import { toPixels } from '../../utils/units';
import { SnapInfo } from '../../utils/snap';

interface SnapGuidesProps {
  element: Element;
  snapInfo: SnapInfo | null;
  verticalSnap?: { type: string; value: number } | null;
  horizontalSnap?: { type: string; value: number } | null;
  scale?: number;
}

export default function SnapGuides({ element, snapInfo, verticalSnap, horizontalSnap, scale = 1 }: SnapGuidesProps) {
  if (!snapInfo) return null;

  const bounds = getElementBounds(element);

  // שימוש ב-axis מהמידע החדש
  const isVerticalSnap = snapInfo.axis === 'x' || snapInfo.axis === 'both';
  const isHorizontalSnap = snapInfo.axis === 'y' || snapInfo.axis === 'both';
  
  // שימוש בערכים הנכונים מהמידע המלא
  const verticalValue = verticalSnap ? toPixels(verticalSnap.value, element.unit, scale) : null;
  const horizontalValue = horizontalSnap ? toPixels(horizontalSnap.value, element.unit, scale) : null;

  // חישוב אורך הקווים - 100 ס"מ מעבר לאלמנט
  const guideLength = 100;
  const topY = toPixels(bounds.y - guideLength, element.unit, scale);
  const bottomY = toPixels(bounds.y + bounds.height + guideLength, element.unit, scale);
  const leftX = toPixels(bounds.x - guideLength, element.unit, scale);
  const rightX = toPixels(bounds.x + bounds.width + guideLength, element.unit, scale);

  // אם יש snap אנכי בלבד
  if (isVerticalSnap && !isHorizontalSnap && verticalValue !== null) {
    return (
      <line
        x1={verticalValue}
        y1={topY}
        x2={verticalValue}
        y2={bottomY}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.8}
        pointerEvents="none"
      />
    );
  }

  // אם יש snap אופקי בלבד
  if (isHorizontalSnap && !isVerticalSnap && horizontalValue !== null) {
    return (
      <line
        x1={leftX}
        y1={horizontalValue}
        x2={rightX}
        y2={horizontalValue}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.8}
        pointerEvents="none"
      />
    );
  }

  // אם יש snap גם אנכי וגם אופקי - מציג שני קווים
  if (isVerticalSnap && isHorizontalSnap && verticalValue !== null && horizontalValue !== null) {
    return (
      <g>
        <line
          x1={verticalValue}
          y1={topY}
          x2={verticalValue}
          y2={bottomY}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.8}
          pointerEvents="none"
        />
        <line
          x1={leftX}
          y1={horizontalValue}
          x2={rightX}
          y2={horizontalValue}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.8}
          pointerEvents="none"
        />
      </g>
    );
  }

  return null;
}

