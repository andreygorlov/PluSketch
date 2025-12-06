import { Element } from '../../types/element';
import { getElementBounds } from '../../utils/geometry';
import { toPixels } from '../../utils/units';

interface SnapGuidesProps {
  element: Element;
  snapInfo: { type: string; value: number } | null;
  scale?: number;
}

export default function SnapGuides({ element, snapInfo, scale = 1 }: SnapGuidesProps) {
  if (!snapInfo) return null;

  const bounds = getElementBounds(element);
  const snapValue = toPixels(snapInfo.value, element.unit, scale);

  // בדיקה אם זה snap אנכי (X) או אופקי (Y)
  const isVerticalSnap = snapInfo.type.includes('left') || snapInfo.type.includes('center') || snapInfo.type.includes('right');
  const isHorizontalSnap = snapInfo.type.includes('top') || snapInfo.type.includes('bottom');

  // אם זה snap אנכי - מציג קו אנכי
  if (isVerticalSnap && !isHorizontalSnap) {
    const topY = toPixels(bounds.y - 50, element.unit, scale); // 50 ס"מ מעל
    const bottomY = toPixels(bounds.y + bounds.height + 50, element.unit, scale); // 50 ס"מ מתחת

    return (
      <line
        x1={snapValue}
        y1={topY}
        x2={snapValue}
        y2={bottomY}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.7}
        pointerEvents="none"
      />
    );
  }

  // אם זה snap אופקי - מציג קו אופקי
  if (isHorizontalSnap && !isVerticalSnap) {
    const leftX = toPixels(bounds.x - 50, element.unit, scale); // 50 ס"מ משמאל
    const rightX = toPixels(bounds.x + bounds.width + 50, element.unit, scale); // 50 ס"מ מימין

    return (
      <line
        x1={leftX}
        y1={snapValue}
        x2={rightX}
        y2={snapValue}
        stroke="#3b82f6"
        strokeWidth={2}
        strokeDasharray="5,5"
        opacity={0.7}
        pointerEvents="none"
      />
    );
  }

  // אם זה snap גם אנכי וגם אופקי (center-to-center) - מציג שני קווים
  if (isVerticalSnap && isHorizontalSnap) {
    const topY = toPixels(bounds.y - 50, element.unit, scale);
    const bottomY = toPixels(bounds.y + bounds.height + 50, element.unit, scale);
    const leftX = toPixels(bounds.x - 50, element.unit, scale);
    const rightX = toPixels(bounds.x + bounds.width + 50, element.unit, scale);

    // נצטרך להחזיר שני קווים - אבל כרגע נחזיר רק אחד
    // TODO: לתמוך בשני קווים בו-זמנית
    return (
      <g>
        <line
          x1={snapValue}
          y1={topY}
          x2={snapValue}
          y2={bottomY}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.7}
          pointerEvents="none"
        />
        <line
          x1={leftX}
          y1={snapValue}
          x2={rightX}
          y2={snapValue}
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5,5"
          opacity={0.7}
          pointerEvents="none"
        />
      </g>
    );
  }

  return null;
}

