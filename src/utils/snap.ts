import { Element } from '../types/element';
import { getElementBounds } from './geometry';

export function snapToGrid(value: number, gridSpacing: number): number {
  return Math.round(value / gridSpacing) * gridSpacing;
}

export function snapPoint(x: number, y: number, gridSpacing: number): [number, number] {
  return [snapToGrid(x, gridSpacing), snapToGrid(y, gridSpacing)];
}

// מרחק היצמדות (בס"מ) - כמה קרוב צריך להיות כדי להיצמד
const SNAP_THRESHOLD = 5; // 5 ס"מ

// נקודות היצמדות של אלמנט (קצוות ומרכזים)
export interface SnapPoints {
  left: number;   // x של הקצה השמאלי
  right: number;  // x של הקצה הימני
  top: number;    // y של הקצה העליון
  bottom: number; // y של הקצה התחתון
  centerX: number; // x של המרכז
  centerY: number; // y של המרכז
}

// חישוב נקודות היצמדות של אלמנט
export function getElementSnapPoints(element: Element): SnapPoints {
  const bounds = getElementBounds(element);
  
  return {
    left: bounds.x,
    right: bounds.x + bounds.width,
    top: bounds.y,
    bottom: bounds.y + bounds.height,
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
  };
}

// חישוב snap בין אלמנט שנגרר לאלמנטים אחרים
export function snapToElements(
  x: number,
  y: number,
  draggedElement: Element,
  otherElements: Element[],
  snapThreshold: number = SNAP_THRESHOLD
): { x: number; y: number; snapInfo: { type: string; value: number } | null } {
  const draggedBounds = getElementBounds(draggedElement);
  
  let snappedX = x;
  let snappedY = y;
  let snapInfo: { type: string; value: number } | null = null;
  let minDistanceX = snapThreshold;
  let minDistanceY = snapThreshold;
  let bestSnapX: { type: string; value: number } | null = null;
  let bestSnapY: { type: string; value: number } | null = null;
  
  // נקודות היצמדות של האלמנט שנגרר (יחסית למיקום החדש)
  const newDraggedSnapPoints: SnapPoints = {
    left: x,
    right: x + draggedBounds.width,
    top: y,
    bottom: y + draggedBounds.height,
    centerX: x + draggedBounds.width / 2,
    centerY: y + draggedBounds.height / 2,
  };
  
  // בדיקה מול כל האלמנטים האחרים
  for (const otherElement of otherElements) {
    if (otherElement.id === draggedElement.id) continue;
    
    const otherSnapPoints = getElementSnapPoints(otherElement);
    
    // בדיקת היצמדות אנכית (X)
    const verticalSnaps = [
      { type: 'left-to-left', value: otherSnapPoints.left, target: newDraggedSnapPoints.left },
      { type: 'left-to-center', value: otherSnapPoints.left, target: newDraggedSnapPoints.centerX },
      { type: 'left-to-right', value: otherSnapPoints.left, target: newDraggedSnapPoints.right },
      { type: 'center-to-left', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.left },
      { type: 'center-to-center', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.centerX },
      { type: 'center-to-right', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.right },
      { type: 'right-to-left', value: otherSnapPoints.right, target: newDraggedSnapPoints.left },
      { type: 'right-to-center', value: otherSnapPoints.right, target: newDraggedSnapPoints.centerX },
      { type: 'right-to-right', value: otherSnapPoints.right, target: newDraggedSnapPoints.right },
    ];
    
    for (const snap of verticalSnaps) {
      const distance = Math.abs(snap.value - snap.target);
      if (distance < minDistanceX) {
        minDistanceX = distance;
        snappedX = snap.value - (snap.target - x);
        bestSnapX = { type: snap.type, value: snap.value };
      }
    }
    
    // בדיקת היצמדות אופקית (Y)
    const horizontalSnaps = [
      { type: 'top-to-top', value: otherSnapPoints.top, target: newDraggedSnapPoints.top },
      { type: 'top-to-center', value: otherSnapPoints.top, target: newDraggedSnapPoints.centerY },
      { type: 'top-to-bottom', value: otherSnapPoints.top, target: newDraggedSnapPoints.bottom },
      { type: 'center-to-top', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.top },
      { type: 'center-to-center', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.centerY },
      { type: 'center-to-bottom', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.bottom },
      { type: 'bottom-to-top', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.top },
      { type: 'bottom-to-center', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.centerY },
      { type: 'bottom-to-bottom', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.bottom },
    ];
    
    for (const snap of horizontalSnaps) {
      const distance = Math.abs(snap.value - snap.target);
      if (distance < minDistanceY) {
        minDistanceY = distance;
        snappedY = snap.value - (snap.target - y);
        bestSnapY = { type: snap.type, value: snap.value };
      }
    }
  }
  
  // אם יש snap גם ב-X וגם ב-Y, נחזיר את שניהם (עם עדיפות ל-center-to-center)
  if (bestSnapX && bestSnapY) {
    // אם שניהם center-to-center, נחזיר את שניהם
    if (bestSnapX.type.includes('center') && bestSnapY.type.includes('center')) {
      snapInfo = { type: 'center-to-center', value: bestSnapX.value }; // נשתמש ב-X value
    } else {
      // אחרת, נחזיר את ה-snap הכי קרוב
      snapInfo = minDistanceX < minDistanceY ? bestSnapX : bestSnapY;
    }
  } else if (bestSnapX) {
    snapInfo = bestSnapX;
  } else if (bestSnapY) {
    snapInfo = bestSnapY;
  }
  
  return { x: snappedX, y: snappedY, snapInfo };
}

