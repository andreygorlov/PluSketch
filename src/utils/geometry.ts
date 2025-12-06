import { Element } from '../types/element';

export function getElementBounds(element: Element): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  switch (element.type) {
    case 'rectangle':
      return {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
      };
    case 'circle':
      const diameter = element.radius * 2;
      return {
        x: element.x - element.radius,
        y: element.y - element.radius,
        width: diameter,
        height: diameter,
      };
    case 'text':
      // טקסט - נשתמש בגודל ברירת מחדל או מהפונט
      const fontSize = element.fontSize || 12;
      const estimatedWidth = (element.text.length * fontSize * 0.6);
      return {
        x: element.x,
        y: element.y,
        width: estimatedWidth,
        height: fontSize,
      };
    default:
      return { x: 0, y: 0, width: 0, height: 0 };
  }
}

export function isPointInElement(x: number, y: number, element: Element): boolean {
  const bounds = getElementBounds(element);
  
  if (element.rotation) {
    // TODO: טיפול בסיבוב
    // כרגע נשתמש בבונדס ללא סיבוב
  }
  
  return (
    x >= bounds.x &&
    x <= bounds.x + bounds.width &&
    y >= bounds.y &&
    y <= bounds.y + bounds.height
  );
}

/**
 * מחשב את ה-bounding box של כל האלמנטים
 * מחזיר null אם אין אלמנטים
 */
export function getAllElementsBounds(elements: Element[]): { x: number; y: number; width: number; height: number } | null {
  if (elements.length === 0) {
    return null;
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  elements.forEach(element => {
    const bounds = getElementBounds(element);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

