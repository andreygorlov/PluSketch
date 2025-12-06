import { useRef, useEffect } from 'react';
import { Element } from '../types/element';
import { useProjectStore } from '../store';
import { snapPoint, snapToElements } from '../utils/snap';
import { screenToSVG } from '../utils/mouseCoordinates';

// ref גלובלי למעקב אחרי גרירה (משותף עם SVGCanvas)
export const isDraggingRef = { current: false };
// ref גלובלי למעקב אחרי סיום גרירה - מונע ביטול בחירה אחרי גרירה
export const justFinishedDraggingRef = { current: false };

interface UseDragOptions {
  element: Element;
  enabled?: boolean;
  onDragStart?: () => void; // כשמתחיל גרירה
  onDragMove?: (x: number, y: number, snapInfo?: { type: string; value: number } | null) => void; // מיקום זמני במהלך הגרירה
  onDragEnd?: (x: number, y: number, isDuplicating?: boolean) => void; // עדכון סופי כשמשחררים, isDuplicating = true אם CTRL לחוץ
}

export function useDrag(
  elementRef: React.RefObject<SVGElement>,
  { element, enabled = true, onDragStart, onDragMove, onDragEnd }: UseDragOptions
) {
  const { currentProject, elements } = useProjectStore();
  const isDragging = useRef(false);
  const hasMoved = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const elementStartPos = useRef({ x: 0, y: 0 });
  const lastPos = useRef({ x: 0, y: 0 });
  const mouseStartPos = useRef({ x: 0, y: 0 }); // מיקום העכבר בפיקסלים של המסך
  const elementRef_stable = useRef(element);
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);
  const currentProjectRef = useRef(currentProject);
  const elementsRef = useRef(elements);

  // עדכון refs כשהערכים משתנים
  useEffect(() => {
    elementRef_stable.current = element;
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
    currentProjectRef.current = currentProject;
    elementsRef.current = elements;
  }, [element, onDragStart, onDragMove, onDragEnd, currentProject, elements]);

  useEffect(() => {
    if (!enabled || !elementRef.current) return;

    const svgElement = elementRef.current;
    const svg = svgElement.ownerSVGElement;
    if (!svg) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // רק כפתור שמאלי
      
      // בדיקה שהאירוע הגיע מהאלמנט או מילדיו
      const target = e.target as SVGElement;
      if (!svgElement.contains(target) && target !== svgElement) return;
      
      e.stopPropagation();
      
      isDragging.current = true;
      hasMoved.current = false; // איפוס - עדיין לא הייתה תנועה
      isDraggingRef.current = true; // עדכון ref גלובלי
      
      // שמירת מיקום העכבר בפיקסלים של המסך
      mouseStartPos.current = { x: e.clientX, y: e.clientY };
      
      // חישוב המיקום ב-SVG באמצעות הפונקציה המרכזית
      const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
      if (!svgPoint) return;
      
      startPos.current = { x: svgPoint.x, y: svgPoint.y };
      // שימוש ב-ref כדי לקבל את הערך העדכני
      elementStartPos.current = { x: elementRef_stable.current.x, y: elementRef_stable.current.y };
      // אתחול lastPos למיקום ההתחלתי
      lastPos.current = { x: elementStartPos.current.x, y: elementStartPos.current.y };
      
      onDragStartRef.current?.();
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      // חישוב המיקום הנוכחי ב-SVG באמצעות הפונקציה המרכזית
      const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
      if (!svgPoint) return;
      
      // חישוב הדלתא ב-SVG coordinates
      const deltaX = svgPoint.x - startPos.current.x;
      const deltaY = svgPoint.y - startPos.current.y;
      
      // הכפלת הדלתא פי 2.61 כדי שהגרירה תהיה מהירה יותר
      const multipliedDeltaX = deltaX * 2.61;
      const multipliedDeltaY = deltaY * 2.61;
      
      // המיקום החדש הוא המיקום ההתחלתי של האלמנט + הדלתא המוכפל
      // ללא snap במהלך הגרירה כדי לשמור על ביצועים טובים
      let newX = elementStartPos.current.x + multipliedDeltaX;
      let newY = elementStartPos.current.y + multipliedDeltaY;
      
      // שמירת המיקום האחרון
      lastPos.current = { x: newX, y: newY };
      hasMoved.current = true; // סימן שהייתה תנועה
      
      // במהלך הגרירה - מעדכנים את המיקום הוויזואלי ללא snap (מהיר יותר)
      onDragMoveRef.current?.(newX, newY, null);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!isDragging.current) return;
      
      // בדיקה אם CTRL לחוץ
      const isDuplicating = e.ctrlKey || e.metaKey;
      
      // אם הייתה תנועה, מעדכנים את המיקום
      if (hasMoved.current) {
        // חישוב המיקום הסופי עם snap אם צריך
        let finalX = lastPos.current.x;
        let finalY = lastPos.current.y;
        
        // Snap to elements - גם בסוף (למקרה שלא היה snap במהלך הגרירה)
        const otherElements = elementsRef.current.filter(el => el.id !== elementRef_stable.current.id);
        const snapResult = snapToElements(finalX, finalY, elementRef_stable.current, otherElements);
        finalX = snapResult.x;
        finalY = snapResult.y;
        
        // Snap to grid אם מופעל - רק בסוף (אחרי snap to elements)
        if (currentProjectRef.current?.settings.snapToGrid) {
          const gridSpacing = currentProjectRef.current.settings.gridSpacing;
          [finalX, finalY] = snapPoint(finalX, finalY, gridSpacing);
        }
        
        onDragEndRef.current?.(finalX, finalY, isDuplicating);
        // אם הייתה תנועה, נסמן שהסתיימה גרירה - כדי למנוע ביטול בחירה
        justFinishedDraggingRef.current = true;
        // איפוס אחרי זמן קצר (לפני שה-onClick נקרא)
        setTimeout(() => {
          justFinishedDraggingRef.current = false;
        }, 100);
      }
      // אם לא הייתה תנועה (רק לחיצה), לא קוראים ל-onDragEnd כדי לא לאפס את המיקום
      
      isDragging.current = false;
      isDraggingRef.current = false; // עדכון ref גלובלי
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    // מקשיבים על ה-SVG עם capture phase כדי לתפוס אירועים מהילדים
    svg.addEventListener('mousedown', handleMouseDown, true);

    return () => {
      svg.removeEventListener('mousedown', handleMouseDown, true);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [enabled, elementRef]);
}

