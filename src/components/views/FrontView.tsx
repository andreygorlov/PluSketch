import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { useProjectStore } from '../../store';
import SVGCanvas, { ZoomControls } from '../canvas/SVGCanvas';
import Grid from '../canvas/Grid';
import ElementRenderer from '../canvas/ElementRenderer';
import DimensionLabel from '../dimensions/DimensionLabel';
import ResizeHandles from '../canvas/ResizeHandles';
import { toPixels } from '../../utils/units';
import { useDrag } from '../../hooks/useDrag';
import { ElementType, Element } from '../../types/element';
import { getAllElementsBounds, getElementBounds } from '../../utils/geometry';

const CANVAS_WIDTH = 5000; // ס"מ
const CANVAS_HEIGHT = 3000; // ס"מ

interface FrontViewProps {
  zoomControlsRef?: React.MutableRefObject<ZoomControls | null>;
  onZoomChange?: (zoom: number) => void;
}

export default function FrontView({ zoomControlsRef, onZoomChange }: FrontViewProps) {
  const { viewType, elements, selectedElementIds, updateElement, selectElement, createElement, showDimensions } = useProjectStore();
  const elementRefsMap = useRef<Map<string, React.RefObject<SVGGElement>>>(new Map());

  // רק במבט חזית
  if (viewType !== 'front') return null;

  const scale = 1;
  const width = toPixels(CANVAS_WIDTH, 'cm', scale);
  const height = toPixels(CANVAS_HEIGHT, 'cm', scale);

  // יצירת refs לאלמנטים
  const elementRefs = useMemo(() => {
    const refs = new Map<string, React.RefObject<SVGGElement>>();
    elements.forEach((el) => {
      if (!elementRefsMap.current.has(el.id)) {
        elementRefsMap.current.set(el.id, React.createRef<SVGGElement>());
      }
      refs.set(el.id, elementRefsMap.current.get(el.id)!);
    });
    return refs;
  }, [elements]);

  // סינון אלמנטים למבט חזית בלבד
  const frontViewElements = useMemo(() => elements.filter((el) => {
    // כרגע כל האלמנטים מוצגים במבט חזית
    return true;
  }), [elements]);

  const handleCanvasClick = (x: number, y: number) => {
    // אם לחצנו על הקנבס (לא על אלמנט), נבטל בחירה
    selectElement(null);
  };

  const handleSelectionBox = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    // מוצא את כל האלמנטים שנמצאים בתוך המלבן
    const selectedIds: string[] = [];
    
    frontViewElements.forEach((element) => {
      const bounds = getElementBounds(element);
      const elementX = toPixels(bounds.x, element.unit, scale);
      const elementY = toPixels(bounds.y, element.unit, scale);
      const elementWidth = toPixels(bounds.width, element.unit, scale);
      const elementHeight = toPixels(bounds.height, element.unit, scale);
      
      // בדיקה אם האלמנט נכנס למלבן בחירה
      const elementRight = elementX + elementWidth;
      const elementBottom = elementY + elementHeight;
      const rectRight = rect.x + rect.width;
      const rectBottom = rect.y + rect.height;
      
      // בדיקה אם המלבן כולל את האלמנט (או חלק ממנו)
      if (
        elementX < rectRight &&
        elementRight > rect.x &&
        elementY < rectBottom &&
        elementBottom > rect.y
      ) {
        selectedIds.push(element.id);
      }
    });
    
    // בוחר את כל האלמנטים שנמצאו
    if (selectedIds.length > 0) {
      // בוחר את הראשון רגיל, ואז מוסיף את השאר
      selectedIds.forEach((id, index) => {
        if (index === 0) {
          selectElement(id, false);
        } else {
          selectElement(id, true);
        }
      });
    } else {
      // אם אין אלמנטים, מבטל בחירה
      selectElement(null);
    }
  }, [frontViewElements, selectElement, scale]);

  // פונקציה לחישוב bounding box של כל האלמנטים
  const getElementsBounds = useCallback(() => {
    if (frontViewElements.length === 0) return null;
    
    // המרה לפיקסלים
    const bounds = getAllElementsBounds(frontViewElements);
    if (!bounds) return null;
    
    return {
      x: toPixels(bounds.x, frontViewElements[0].unit, scale),
      y: toPixels(bounds.y, frontViewElements[0].unit, scale),
      width: toPixels(bounds.width, frontViewElements[0].unit, scale),
      height: toPixels(bounds.height, frontViewElements[0].unit, scale),
    };
  }, [frontViewElements, scale]);


  return (
    <div>
      <SVGCanvas 
        width={width} 
        height={height} 
        onCanvasClick={handleCanvasClick}
        getElementsBounds={getElementsBounds}
        onSelectionBox={handleSelectionBox}
        zoomControlsRef={zoomControlsRef}
        onZoomChange={onZoomChange}
      >
        <Grid width={width} height={height} scale={scale} />
        
        {/* אלמנטים */}
        {frontViewElements.map((element) => {
          const ref = elementRefs.get(element.id);
          if (!ref) return null;

          // שימוש ב-useDrag רק אם האלמנט נבחר
          const isSelected = selectedElementIds.includes(element.id);
          
          return (
            <ElementWithDrag
              key={element.id}
              element={element}
              ref={ref}
              selected={isSelected}
              scale={scale}
              elementRefs={elementRefs}
              selectedElementIds={selectedElementIds}
              allElements={frontViewElements}
            />
          );
        })}
        
        {/* מידות - מוצגות רק אם showDimensions פעיל */}
        {showDimensions && frontViewElements.map((element) => (
          <DimensionLabel key={`dim-${element.id}`} element={element} scale={scale} viewType="front" />
        ))}
        
        {/* Resize handles - רק למלבנים שנבחרו */}
        {frontViewElements
          .filter(el => el.type === 'rectangle' && selectedElementIds.includes(el.id))
          .map((element) => (
            <ResizeHandles
              key={`resize-${element.id}`}
              element={element}
              scale={scale}
            />
          ))}
      </SVGCanvas>
    </div>
  );
}

// רכיב עזר עם גרירה
interface ElementWithDragProps {
  element: Element;
  selected: boolean;
  scale: number;
  elementRefs: Map<string, React.RefObject<SVGGElement>>;
  selectedElementIds: string[];
  allElements: Element[];
}

const ElementWithDrag = React.forwardRef<SVGGElement, ElementWithDragProps>(
  ({ element, selected, scale, elementRefs, selectedElementIds, allElements }, ref) => {
    const { updateElement, createElement, selectElement } = useProjectStore();
    const internalRef = useRef<SVGGElement>(null);
    const actualRef = (ref || internalRef) as React.RefObject<SVGGElement>;
    const transformRef = useRef<{ x: number; y: number } | null>(null);
    const selectedElementsStartPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    
    // שמירה אם האלמנט היה נבחר בתחילת הגרירה
    const wasSelectedRef = useRef(selected);
    
    // עדכון wasSelectedRef כשהאלמנט משתנה
    useEffect(() => {
      wasSelectedRef.current = selected;
    }, [selected]);
    
    // עדכון transform ישירות - ללא עיכוב
    const updateTransform = useCallback((x: number, y: number) => {
      if (!actualRef.current) return;
      
      // חישוב הדלתא ישירות ב-SVG coordinates (ס"מ)
      const deltaX = x - element.x;
      const deltaY = y - element.y;
      
      // המרה ל-pixels עבור ה-transform
      const deltaXPixels = toPixels(deltaX, element.unit, scale);
      const deltaYPixels = toPixels(deltaY, element.unit, scale);
      
      // עדכון transform של האלמנט הנוכחי - ישירות ב-DOM
      actualRef.current.setAttribute('transform', `translate(${deltaXPixels}, ${deltaYPixels})`);
      
      // אם יש כמה אלמנטים נבחרים, מעדכנים את כולם
      if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
        selectedElementIds.forEach((selectedId) => {
          if (selectedId === element.id) return; // כבר עדכנו אותו
          
          const selectedElement = allElements.find(el => el.id === selectedId);
          if (!selectedElement) return;
          
          const selectedRef = elementRefs.get(selectedId);
          if (!selectedRef?.current) return;
          
          const startPos = selectedElementsStartPosRef.current.get(selectedId);
          if (!startPos) return;
          
          // חישוב הדלתא ב-SVG coordinates (אותו דלתא)
          const selectedDeltaX = deltaX;
          const selectedDeltaY = deltaY;
          
          // המרה ל-pixels עבור האלמנט הנבחר
          const selectedDeltaXPixels = toPixels(selectedDeltaX, selectedElement.unit, scale);
          const selectedDeltaYPixels = toPixels(selectedDeltaY, selectedElement.unit, scale);
          
          selectedRef.current.setAttribute('transform', `translate(${selectedDeltaXPixels}, ${selectedDeltaYPixels})`);
        });
      }
      
      transformRef.current = { x, y };
    }, [element, scale, selectedElementIds, allElements, elementRefs]);

    useDrag(actualRef, {
      element,
      enabled: true, // תמיד אפשר לגרור
      onDragStart: () => {
        transformRef.current = null;
        if (actualRef.current) {
          actualRef.current.removeAttribute('transform');
        }
        
        // שמירת המיקומים ההתחלתיים של כל האלמנטים הנבחרים
        selectedElementsStartPosRef.current.clear();
        if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
          selectedElementIds.forEach((selectedId) => {
            const selectedElement = allElements.find(el => el.id === selectedId);
            if (selectedElement) {
              selectedElementsStartPosRef.current.set(selectedId, {
                x: selectedElement.x,
                y: selectedElement.y
              });
              
              // איפוס transform של כל האלמנטים הנבחרים
              const selectedRef = elementRefs.get(selectedId);
              if (selectedRef?.current) {
                selectedRef.current.removeAttribute('transform');
              }
            }
          });
        }
        
        // שמירה אם האלמנט נבחר בתחילת הגרירה
        wasSelectedRef.current = selected;
      },
      onDragMove: (x, y) => {
        // עדכון transform בצורה חלקה
        updateTransform(x, y);
      },
      onDragEnd: (x, y, isDuplicating) => {
        // איפוס transform של כל האלמנטים הנבחרים
        if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
          selectedElementIds.forEach((selectedId) => {
            const selectedRef = elementRefs.get(selectedId);
            if (selectedRef?.current) {
              selectedRef.current.removeAttribute('transform');
            }
          });
        } else {
          if (actualRef.current) {
            actualRef.current.removeAttribute('transform');
          }
        }
        
        if (isDuplicating) {
          // שכפול כל האלמנטים הנבחרים
          if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
            const deltaX = x - element.x;
            const deltaY = y - element.y;
            
            selectedElementIds.forEach((selectedId) => {
              const selectedElement = allElements.find(el => el.id === selectedId);
              if (selectedElement) {
                const { id: _, ...elementCopy } = selectedElement;
                createElement({
                  ...elementCopy,
                  x: selectedElement.x + deltaX,
                  y: selectedElement.y + deltaY,
                  z: selectedElement.z !== undefined ? selectedElement.z + deltaX : undefined,
                } as any);
              }
            });
          } else {
            // שכפול אלמנט בודד
            const { id: _, ...elementCopy } = element;
            createElement({
              ...elementCopy,
              x,
              y,
              z: element.z !== undefined ? element.z : undefined,
            } as any);
          }
        } else {
          // עדכון מיקום כל האלמנטים הנבחרים
          if (selectedElementIds.length > 1 && selectedElementIds.includes(element.id)) {
            const deltaX = x - element.x;
            const deltaY = y - element.y;
            
            selectedElementIds.forEach((selectedId) => {
              const selectedElement = allElements.find(el => el.id === selectedId);
              if (selectedElement) {
                const updates: any = {
                  x: selectedElement.x + deltaX,
                  y: selectedElement.y + deltaY
                };
                if (selectedElement.z !== undefined) {
                  updates.z = selectedElement.z + deltaX;
                }
                updateElement(selectedId, updates);
              }
            });
          } else {
            // עדכון מיקום האלמנט המקורי
            const updates: any = { x, y };
            if (element.z !== undefined) {
              updates.z = element.z;
            }
            updateElement(element.id, updates);
          }
          
          // אם האלמנט לא היה נבחר לפני הגרירה, בוחרים אותו עכשיו
          if (!wasSelectedRef.current) {
            selectElement(element.id);
          }
        }
        
        transformRef.current = null;
        selectedElementsStartPosRef.current.clear();
      },
    });

    return (
      <g ref={actualRef} style={{ cursor: 'move' }}>
        <ElementRenderer element={element} scale={scale} selected={selected} viewType="front" />
      </g>
    );
  }
);

ElementWithDrag.displayName = 'ElementWithDrag';
