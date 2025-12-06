import { Element } from '../types/element';
import { getElementBounds } from './geometry';

export function snapToGrid(value: number, gridSpacing: number): number {
  return Math.round(value / gridSpacing) * gridSpacing;
}

export function snapPoint(x: number, y: number, gridSpacing: number): [number, number] {
  return [snapToGrid(x, gridSpacing), snapToGrid(y, gridSpacing)];
}

// מרחק היצמדות בסיסי (בס"מ) - כמה קרוב צריך להיות כדי להיצמד
const BASE_SNAP_THRESHOLD = 10; // 10 ס"מ - הגדלנו כדי שיהיה יותר "דביק"

// חישוב snap threshold דינמי בהתאם לזום
export function getSnapThreshold(zoom: number = 1): number {
  // ככל שהזום גדול יותר, ה-threshold קטן יותר (ביחידות SVG)
  // אבל בפיקסלים הוא נשאר דומה
  // הגדלנו את המכפיל כדי שה-snap יהיה יותר חזק
  return BASE_SNAP_THRESHOLD / Math.max(1, zoom * 0.3);
}

// נקודות היצמדות של אלמנט (קצוות ומרכזים)
export interface SnapPoints {
  left: number;   // x של הקצה השמאלי
  right: number;  // x של הקצה הימני
  top: number;    // y של הקצה העליון
  bottom: number; // y של הקצה התחתון
  centerX: number; // x של המרכז
  centerY: number; // y של המרכז
}

// מידע על snap - כולל מידע על שני הצירים
export interface SnapInfo {
  type: string;
  value: number;
  axis: 'x' | 'y' | 'both';
}

// תוצאה משופרת של snap
export interface SnapResult {
  x: number;
  y: number;
  snapInfo: SnapInfo | null;
  verticalSnap: { type: string; value: number } | null;
  horizontalSnap: { type: string; value: number } | null;
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
  snapThreshold?: number,
  zoom: number = 1
): SnapResult {
  const draggedBounds = getElementBounds(draggedElement);
  
  // שימוש ב-threshold דינמי אם לא סופק
  const threshold = snapThreshold ?? getSnapThreshold(zoom);
  
  let snappedX = x;
  let snappedY = y;
  // התחלה עם ערך גדול כדי למצוא את המרחק הקטן ביותר
  let minDistanceX = threshold + 1;
  let minDistanceY = threshold + 1;
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
  
  // סינון אלמנטים קרובים בלבד לביצועים טובים יותר
  // הגדלנו את טווח הסינון כדי לבדוק יותר אלמנטים (threshold * 3 במקום * 2)
  const nearbyElements = otherElements.filter(otherElement => {
    if (otherElement.id === draggedElement.id) return false;
    
    const otherBounds = getElementBounds(otherElement);
    const otherSnapPoints = getElementSnapPoints(otherElement);
    
    // בדיקה אם האלמנט קרוב מספיק (בטווח של threshold * 3 - הגדלנו את הטווח)
    const minX = Math.min(
      Math.abs(otherSnapPoints.left - newDraggedSnapPoints.left),
      Math.abs(otherSnapPoints.left - newDraggedSnapPoints.centerX),
      Math.abs(otherSnapPoints.left - newDraggedSnapPoints.right),
      Math.abs(otherSnapPoints.centerX - newDraggedSnapPoints.left),
      Math.abs(otherSnapPoints.centerX - newDraggedSnapPoints.centerX),
      Math.abs(otherSnapPoints.centerX - newDraggedSnapPoints.right),
      Math.abs(otherSnapPoints.right - newDraggedSnapPoints.left),
      Math.abs(otherSnapPoints.right - newDraggedSnapPoints.centerX),
      Math.abs(otherSnapPoints.right - newDraggedSnapPoints.right)
    );
    
    const minY = Math.min(
      Math.abs(otherSnapPoints.top - newDraggedSnapPoints.top),
      Math.abs(otherSnapPoints.top - newDraggedSnapPoints.centerY),
      Math.abs(otherSnapPoints.top - newDraggedSnapPoints.bottom),
      Math.abs(otherSnapPoints.centerY - newDraggedSnapPoints.top),
      Math.abs(otherSnapPoints.centerY - newDraggedSnapPoints.centerY),
      Math.abs(otherSnapPoints.centerY - newDraggedSnapPoints.bottom),
      Math.abs(otherSnapPoints.bottom - newDraggedSnapPoints.top),
      Math.abs(otherSnapPoints.bottom - newDraggedSnapPoints.centerY),
      Math.abs(otherSnapPoints.bottom - newDraggedSnapPoints.bottom)
    );
    
    return minX < threshold * 3 || minY < threshold * 3;
  });
  
  // בדיקה מול אלמנטים קרובים בלבד
  for (const otherElement of nearbyElements) {
    const otherSnapPoints = getElementSnapPoints(otherElement);
    
    // בדיקת היצמדות אנכית (X) - עם עדיפות ל-center-to-center
    const verticalSnaps = [
      { type: 'center-to-center', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.centerX, priority: 1 },
      { type: 'left-to-left', value: otherSnapPoints.left, target: newDraggedSnapPoints.left, priority: 2 },
      { type: 'right-to-right', value: otherSnapPoints.right, target: newDraggedSnapPoints.right, priority: 2 },
      { type: 'left-to-center', value: otherSnapPoints.left, target: newDraggedSnapPoints.centerX, priority: 3 },
      { type: 'right-to-center', value: otherSnapPoints.right, target: newDraggedSnapPoints.centerX, priority: 3 },
      { type: 'center-to-left', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.left, priority: 3 },
      { type: 'center-to-right', value: otherSnapPoints.centerX, target: newDraggedSnapPoints.right, priority: 3 },
      { type: 'left-to-right', value: otherSnapPoints.left, target: newDraggedSnapPoints.right, priority: 4 },
      { type: 'right-to-left', value: otherSnapPoints.right, target: newDraggedSnapPoints.left, priority: 4 },
    ];
    
    for (const snap of verticalSnaps) {
      const distance = Math.abs(snap.value - snap.target);
      // אם המרחק קטן יותר, או שווה אבל עם עדיפות טובה יותר
      // שיפרנו: אם המרחק קטן מ-threshold, האלמנט נצמד בדיוק (snap "דביק")
      if (distance < threshold) {
        if (distance < minDistanceX) {
          minDistanceX = distance;
          // נצמד בדיוק לנקודת ה-snap
          snappedX = snap.value - (snap.target - x);
          bestSnapX = { type: snap.type, value: snap.value };
        } else if (distance === minDistanceX && bestSnapX) {
          // אם המרחק שווה, נבדוק עדיפות (priority נמוך יותר = עדיפות טובה יותר)
          const currentPriority = verticalSnaps.find(s => s.type === bestSnapX!.type)?.priority || 999;
          if (snap.priority < currentPriority) {
            snappedX = snap.value - (snap.target - x);
            bestSnapX = { type: snap.type, value: snap.value };
          }
        }
      }
    }
    
    // בדיקת היצמדות אופקית (Y) - עם עדיפות ל-center-to-center
    const horizontalSnaps = [
      { type: 'center-to-center', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.centerY, priority: 1 },
      { type: 'top-to-top', value: otherSnapPoints.top, target: newDraggedSnapPoints.top, priority: 2 },
      { type: 'bottom-to-bottom', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.bottom, priority: 2 },
      { type: 'top-to-center', value: otherSnapPoints.top, target: newDraggedSnapPoints.centerY, priority: 3 },
      { type: 'bottom-to-center', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.centerY, priority: 3 },
      { type: 'center-to-top', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.top, priority: 3 },
      { type: 'center-to-bottom', value: otherSnapPoints.centerY, target: newDraggedSnapPoints.bottom, priority: 3 },
      { type: 'top-to-bottom', value: otherSnapPoints.top, target: newDraggedSnapPoints.bottom, priority: 4 },
      { type: 'bottom-to-top', value: otherSnapPoints.bottom, target: newDraggedSnapPoints.top, priority: 4 },
    ];
    
    for (const snap of horizontalSnaps) {
      const distance = Math.abs(snap.value - snap.target);
      // אם המרחק קטן יותר, או שווה אבל עם עדיפות טובה יותר
      // שיפרנו: אם המרחק קטן מ-threshold, האלמנט נצמד בדיוק (snap "דביק")
      if (distance < threshold) {
        if (distance < minDistanceY) {
          minDistanceY = distance;
          // נצמד בדיוק לנקודת ה-snap
          snappedY = snap.value - (snap.target - y);
          bestSnapY = { type: snap.type, value: snap.value };
        } else if (distance === minDistanceY && bestSnapY) {
          // אם המרחק שווה, נבדוק עדיפות (priority נמוך יותר = עדיפות טובה יותר)
          const currentPriority = horizontalSnaps.find(s => s.type === bestSnapY!.type)?.priority || 999;
          if (snap.priority < currentPriority) {
            snappedY = snap.value - (snap.target - y);
            bestSnapY = { type: snap.type, value: snap.value };
          }
        }
      }
    }
  }
  
  // בניית snapInfo משופר
  let snapInfo: SnapInfo | null = null;
  
  if (bestSnapX && bestSnapY) {
    // אם שניהם center-to-center, נחזיר snap כפול
    if (bestSnapX.type.includes('center') && bestSnapY.type.includes('center')) {
      snapInfo = {
        type: 'center-to-center',
        value: bestSnapX.value,
        axis: 'both'
      };
    } else {
      // אחרת, נחזיר את ה-snap הכי קרוב
      if (minDistanceX < minDistanceY) {
        snapInfo = {
          type: bestSnapX.type,
          value: bestSnapX.value,
          axis: 'x'
        };
      } else {
        snapInfo = {
          type: bestSnapY.type,
          value: bestSnapY.value,
          axis: 'y'
        };
      }
    }
  } else if (bestSnapX) {
    snapInfo = {
      type: bestSnapX.type,
      value: bestSnapX.value,
      axis: 'x'
    };
  } else if (bestSnapY) {
    snapInfo = {
      type: bestSnapY.type,
      value: bestSnapY.value,
      axis: 'y'
    };
  }
  
  return {
    x: snappedX,
    y: snappedY,
    snapInfo,
    verticalSnap: bestSnapX,
    horizontalSnap: bestSnapY
  };
}

// פונקציה ל-snap נקודה בודדת לאלמנטים (לשימוש במיקום מידות ידניות)
export function snapPointToElements(
  x: number,
  y: number,
  otherElements: Element[],
  snapThreshold?: number,
  zoom: number = 1
): { x: number; y: number; snapInfo: SnapInfo | null } {
  const threshold = snapThreshold ?? getSnapThreshold(zoom);
  
  let snappedX = x;
  let snappedY = y;
  let minDistanceX = threshold + 1;
  let minDistanceY = threshold + 1;
  let bestSnapX: { type: string; value: number } | null = null;
  let bestSnapY: { type: string; value: number } | null = null;
  
  // סינון אלמנטים קרובים בלבד
  const nearbyElements = otherElements.filter(otherElement => {
    const otherBounds = getElementBounds(otherElement);
    const otherSnapPoints = getElementSnapPoints(otherElement);
    
    // בדיקה אם האלמנט קרוב מספיק
    const minX = Math.min(
      Math.abs(otherSnapPoints.left - x),
      Math.abs(otherSnapPoints.centerX - x),
      Math.abs(otherSnapPoints.right - x)
    );
    
    const minY = Math.min(
      Math.abs(otherSnapPoints.top - y),
      Math.abs(otherSnapPoints.centerY - y),
      Math.abs(otherSnapPoints.bottom - y)
    );
    
    return minX < threshold * 3 || minY < threshold * 3;
  });
  
  // בדיקה מול אלמנטים קרובים
  for (const otherElement of nearbyElements) {
    const otherSnapPoints = getElementSnapPoints(otherElement);
    
    // בדיקת היצמדות אנכית (X)
    const verticalSnaps = [
      { type: 'center', value: otherSnapPoints.centerX, priority: 1 },
      { type: 'left', value: otherSnapPoints.left, priority: 2 },
      { type: 'right', value: otherSnapPoints.right, priority: 2 },
    ];
    
    for (const snap of verticalSnaps) {
      const distance = Math.abs(snap.value - x);
      if (distance < threshold && distance < minDistanceX) {
        minDistanceX = distance;
        snappedX = snap.value;
        bestSnapX = { type: snap.type, value: snap.value };
      }
    }
    
    // בדיקת היצמדות אופקית (Y)
    const horizontalSnaps = [
      { type: 'center', value: otherSnapPoints.centerY, priority: 1 },
      { type: 'top', value: otherSnapPoints.top, priority: 2 },
      { type: 'bottom', value: otherSnapPoints.bottom, priority: 2 },
    ];
    
    for (const snap of horizontalSnaps) {
      const distance = Math.abs(snap.value - y);
      if (distance < threshold && distance < minDistanceY) {
        minDistanceY = distance;
        snappedY = snap.value;
        bestSnapY = { type: snap.type, value: snap.value };
      }
    }
  }
  
  // בניית snapInfo
  let snapInfo: SnapInfo | null = null;
  
  if (bestSnapX && bestSnapY) {
    snapInfo = {
      type: 'point-snap',
      value: bestSnapX.value,
      axis: 'both'
    };
  } else if (bestSnapX) {
    snapInfo = {
      type: bestSnapX.type,
      value: bestSnapX.value,
      axis: 'x'
    };
  } else if (bestSnapY) {
    snapInfo = {
      type: bestSnapY.type,
      value: bestSnapY.value,
      axis: 'y'
    };
  }
  
  return {
    x: snappedX,
    y: snappedY,
    snapInfo
  };
}

