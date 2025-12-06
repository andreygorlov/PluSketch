import React, { useRef, useMemo, useCallback, useEffect, useState } from 'react';
import { useProjectStore } from '../../store';
import SVGCanvas, { ZoomControls } from '../canvas/SVGCanvas';
import Grid from '../canvas/Grid';
import ElementRenderer from '../canvas/ElementRenderer';
import ManualDimensionRenderer from '../dimensions/ManualDimensionRenderer';
import ResizeHandles from '../canvas/ResizeHandles';
import SnapGuides from '../canvas/SnapGuides';
import { toPixels } from '../../utils/units';
import { useDrag } from '../../hooks/useDrag';
import { ElementType, Element } from '../../types/element';
import { getAllElementsBounds, getElementBounds } from '../../utils/geometry';
import { SnapResult, snapPointToElements } from '../../utils/snap';
import { screenToSVG } from '../../utils/mouseCoordinates';

const CANVAS_WIDTH = 5000; // ס"מ
const CANVAS_HEIGHT = 3000; // ס"מ

interface FrontViewProps {
  zoomControlsRef?: React.MutableRefObject<ZoomControls | null>;
  onZoomChange?: (zoom: number) => void;
}

export default function FrontView({ zoomControlsRef, onZoomChange }: FrontViewProps) {
  const { viewType, elements, selectedElementIds, updateElement, selectElement, createElement, showDimensions, creatingElementType, toolMode } = useProjectStore();
  const elementRefsMap = useRef<Map<string, React.RefObject<SVGGElement>>>(new Map());
  const svgCanvasRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [dimensionPoint1, setDimensionPoint1] = useState<{ x: number; y: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [snapInfo, setSnapInfo] = useState<{ x: number; y: number; snapInfo: any } | null>(null);
  
  // סינון אלמנטים למבט חזית בלבד - צריך להיות לפני useEffect שמשתמש בו
  const frontViewElements = useMemo(() => elements.filter((el) => {
    // כרגע כל האלמנטים מוצגים במבט חזית
    return true;
  }), [elements]);
  
  // עדכון מיקום העכבר בזמן מיקום מידה ידנית
  useEffect(() => {
    if (creatingElementType === 'manualDimension' && dimensionPoint1) {
      const handleMouseMove = (e: MouseEvent) => {
        if (!svgCanvasRef.current) return;
        const svgPoint = screenToSVG(svgCanvasRef.current, e.clientX, e.clientY);
        if (!svgPoint) return;
        
        // בדיקת SHIFT key
        const shiftPressed = e.shiftKey;
        setIsShiftPressed(shiftPressed);
        
        // סינון אלמנטים (לא מידות ידניות)
        const otherElements = frontViewElements.filter(el => el.type !== 'manualDimension');
        
        // Snap לנקודה
        const snapped = snapPointToElements(svgPoint.x, svgPoint.y, otherElements, undefined, zoom);
        setSnapInfo(snapped);
        
        // אם SHIFT לחוץ, נשמור על זווית ישרה (90 מעלות)
        let finalX = snapped.x;
        let finalY = snapped.y;
        
        if (shiftPressed) {
          const dx = snapped.x - dimensionPoint1.x;
          const dy = snapped.y - dimensionPoint1.y;
          
          // חישוב הזווית הנוכחית
          const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
          
          // אם הזווית קרובה יותר ל-0 או 180 (אופקי) - נשמור על Y
          // אם הזווית קרובה יותר ל-90 (אנכי) - נשמור על X
          if (angle < 45) {
            // אופקי - נשמור על Y של הנקודה הראשונה
            finalY = dimensionPoint1.y;
          } else {
            // אנכי - נשמור על X של הנקודה הראשונה
            finalX = dimensionPoint1.x;
          }
        }
        
        setMousePosition({ x: finalX, y: finalY });
      };
      
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
          setIsShiftPressed(true);
        }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        if (e.key === 'Shift') {
          setIsShiftPressed(false);
        }
      };
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    } else {
      setMousePosition(null);
      setSnapInfo(null);
      setIsShiftPressed(false);
    }
  }, [creatingElementType, dimensionPoint1, frontViewElements, zoom]);

  // רק במבט חזית
  if (viewType !== 'front') return null;

  const scale = 1;
  const width = toPixels(CANVAS_WIDTH, 'cm', scale);
  const height = toPixels(CANVAS_HEIGHT, 'cm', scale);

  // עדכון zoom כשמשתנה
  const handleZoomChangeInternal = useCallback((newZoom: number) => {
    setZoom(newZoom);
    onZoomChange?.(newZoom);
  }, [onZoomChange]);

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

  const handleCanvasClick = (x: number, y: number) => {
    // אם אנחנו במצב מיקום מידה ידנית
    if (creatingElementType === 'manualDimension') {
      if (!dimensionPoint1) {
        // בחירת נקודה ראשונה - עם snap
        const otherElements = frontViewElements.filter(el => el.type !== 'manualDimension');
        const snapped = snapPointToElements(x, y, otherElements, undefined, zoom);
        setDimensionPoint1({ x: snapped.x, y: snapped.y });
      } else {
        // בחירת נקודה שנייה - יצירת מידה ידנית
        // שימוש במיקום המסונאפ או המיקום הסופי (אם SHIFT לחוץ)
        const finalX = mousePosition?.x ?? x;
        const finalY = mousePosition?.y ?? y;
        
        const distance = Math.sqrt((finalX - dimensionPoint1.x) ** 2 + (finalY - dimensionPoint1.y) ** 2);
        createElement({
          type: 'manualDimension',
          x: dimensionPoint1.x,
          y: dimensionPoint1.y,
          x1: dimensionPoint1.x,
          y1: dimensionPoint1.y,
          x2: finalX,
          y2: finalY,
          value: distance,
          color: '#000000',
          unit: 'cm',
        } as any);
        setDimensionPoint1(null);
        setMousePosition(null);
        setSnapInfo(null);
        // יציאה ממצב מיקום מידה
        useProjectStore.getState().setCreatingElementType(null);
      }
      return;
    }
    
    // אם לחצנו על הקנבס (לא על אלמנט), נבטל בחירה רק במצב select
    if (toolMode === 'select') {
      selectElement(null);
    }
  };

  const handleSelectionBox = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    // מוצא את כל האלמנטים שנמצאים בתוך המלבן
    // rect מגיע ב-SVG coordinates (ס"מ), והאלמנטים גם ב-SVG coordinates (ס"מ)
    // נשתמש בקואורדינטות SVG ישירות לבדיקה
    const selectedIds: string[] = [];
    
    // נרמול את המלבן (x, y הם הפינה השמאלית-עליונה)
    const rectX = Math.min(rect.x, rect.x + rect.width);
    const rectY = Math.min(rect.y, rect.y + rect.height);
    const rectWidth = Math.abs(rect.width);
    const rectHeight = Math.abs(rect.height);
    const rectRight = rectX + rectWidth;
    const rectBottom = rectY + rectHeight;
    
    frontViewElements.forEach((element) => {
      const bounds = getElementBounds(element);
      // שימוש בקואורדינטות SVG ישירות (ס"מ) - גם rect וגם bounds באותה מערכת
      const elementX = bounds.x;
      const elementY = bounds.y;
      const elementWidth = bounds.width;
      const elementHeight = bounds.height;
      const elementRight = elementX + elementWidth;
      const elementBottom = elementY + elementHeight;
      
      // בדיקה אם האלמנט נכנס בשלמותו למלבן בחירה (לא חלקית)
      if (
        elementX >= rectX &&
        elementRight <= rectRight &&
        elementY >= rectY &&
        elementBottom <= rectBottom
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
        ref={svgCanvasRef}
        width={width} 
        height={height} 
        onCanvasClick={handleCanvasClick}
        getElementsBounds={getElementsBounds}
        onSelectionBox={handleSelectionBox}
        zoomControlsRef={zoomControlsRef}
        onZoomChange={handleZoomChangeInternal}
        creatingElementType={creatingElementType}
        toolMode={toolMode}
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
              zoom={zoom}
              elementRefs={elementRefs}
              selectedElementIds={selectedElementIds}
              allElements={frontViewElements}
            />
          );
        })}
        
        {/* מידות ידניות */}
        {frontViewElements
          .filter(el => el.type === 'manualDimension')
          .map((element) => {
            const isSelected = selectedElementIds.includes(element.id);
            return (
              <ManualDimensionRenderer
                key={`manual-dim-${element.id}`}
                element={element as any}
                scale={scale}
                selected={isSelected}
              />
            );
          })}
        
        {/* קו עזר למיקום מידה ידנית - יוצג בזמן גרירה */}
        {creatingElementType === 'manualDimension' && dimensionPoint1 && (
          <g>
            {/* נקודה ראשונה */}
            <circle
              cx={toPixels(dimensionPoint1.x, 'cm', scale)}
              cy={toPixels(dimensionPoint1.y, 'cm', scale)}
              r={5}
              fill="#3b82f6"
              stroke="#fff"
              strokeWidth={2}
              style={{ pointerEvents: 'none' }}
            />
            
            {/* קווי snap */}
            {snapInfo?.snapInfo && (
              <>
                {snapInfo.snapInfo.axis === 'x' || snapInfo.snapInfo.axis === 'both' ? (
                  <line
                    x1={toPixels(snapInfo.snapInfo.value, 'cm', scale)}
                    y1={0}
                    x2={toPixels(snapInfo.snapInfo.value, 'cm', scale)}
                    y2={height}
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.5}
                    style={{ pointerEvents: 'none' }}
                  />
                ) : null}
                {snapInfo.snapInfo.axis === 'y' || snapInfo.snapInfo.axis === 'both' ? (
                  <line
                    x1={0}
                    y1={toPixels(snapInfo.snapInfo.value, 'cm', scale)}
                    x2={width}
                    y2={toPixels(snapInfo.snapInfo.value, 'cm', scale)}
                    stroke="#3b82f6"
                    strokeWidth={1}
                    strokeDasharray="3,3"
                    opacity={0.5}
                    style={{ pointerEvents: 'none' }}
                  />
                ) : null}
              </>
            )}
            
            {mousePosition && (
              <>
                {/* קו עזר */}
                <line
                  x1={toPixels(dimensionPoint1.x, 'cm', scale)}
                  y1={toPixels(dimensionPoint1.y, 'cm', scale)}
                  x2={toPixels(mousePosition.x, 'cm', scale)}
                  y2={toPixels(mousePosition.y, 'cm', scale)}
                  stroke={isShiftPressed ? "#10b981" : "#3b82f6"}
                  strokeWidth={2}
                  strokeDasharray="5,5"
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* נקודה שנייה */}
                <circle
                  cx={toPixels(mousePosition.x, 'cm', scale)}
                  cy={toPixels(mousePosition.y, 'cm', scale)}
                  r={5}
                  fill={isShiftPressed ? "#10b981" : "#3b82f6"}
                  stroke="#fff"
                  strokeWidth={2}
                  style={{ pointerEvents: 'none' }}
                />
                
                {/* אינדיקציה לזווית ישרה */}
                {isShiftPressed && (() => {
                  const dx = mousePosition.x - dimensionPoint1.x;
                  const dy = mousePosition.y - dimensionPoint1.y;
                  const angle = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
                  
                  // אם אופקי (זווית < 45)
                  if (angle < 45) {
                    return (
                      <g>
                        <line
                          x1={toPixels(dimensionPoint1.x, 'cm', scale)}
                          y1={toPixels(dimensionPoint1.y, 'cm', scale)}
                          x2={toPixels(mousePosition.x, 'cm', scale)}
                          y2={toPixels(dimensionPoint1.y, 'cm', scale)}
                          stroke="#10b981"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                          style={{ pointerEvents: 'none' }}
                        />
                        <line
                          x1={toPixels(mousePosition.x, 'cm', scale)}
                          y1={toPixels(dimensionPoint1.y, 'cm', scale)}
                          x2={toPixels(mousePosition.x, 'cm', scale)}
                          y2={toPixels(mousePosition.y, 'cm', scale)}
                          stroke="#10b981"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                          style={{ pointerEvents: 'none' }}
                        />
                        <path
                          d={`M ${toPixels(mousePosition.x, 'cm', scale)} ${toPixels(dimensionPoint1.y, 'cm', scale)} 
                              L ${toPixels(mousePosition.x - 5, 'cm', scale)} ${toPixels(dimensionPoint1.y - 5, 'cm', scale)}
                              L ${toPixels(mousePosition.x - 5, 'cm', scale)} ${toPixels(dimensionPoint1.y + 5, 'cm', scale)} Z`}
                          fill="#10b981"
                          opacity={0.7}
                          style={{ pointerEvents: 'none' }}
                        />
                      </g>
                    );
                  } else {
                    // אנכי
                    return (
                      <g>
                        <line
                          x1={toPixels(dimensionPoint1.x, 'cm', scale)}
                          y1={toPixels(dimensionPoint1.y, 'cm', scale)}
                          x2={toPixels(dimensionPoint1.x, 'cm', scale)}
                          y2={toPixels(mousePosition.y, 'cm', scale)}
                          stroke="#10b981"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                          style={{ pointerEvents: 'none' }}
                        />
                        <line
                          x1={toPixels(dimensionPoint1.x, 'cm', scale)}
                          y1={toPixels(mousePosition.y, 'cm', scale)}
                          x2={toPixels(mousePosition.x, 'cm', scale)}
                          y2={toPixels(mousePosition.y, 'cm', scale)}
                          stroke="#10b981"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                          style={{ pointerEvents: 'none' }}
                        />
                        <path
                          d={`M ${toPixels(dimensionPoint1.x, 'cm', scale)} ${toPixels(mousePosition.y, 'cm', scale)} 
                              L ${toPixels(dimensionPoint1.x - 5, 'cm', scale)} ${toPixels(mousePosition.y - 5, 'cm', scale)}
                              L ${toPixels(dimensionPoint1.x + 5, 'cm', scale)} ${toPixels(mousePosition.y - 5, 'cm', scale)} Z`}
                          fill="#10b981"
                          opacity={0.7}
                          style={{ pointerEvents: 'none' }}
                        />
                      </g>
                    );
                  }
                })()}
                
                {/* טקסט מרחק */}
                <text
                  x={toPixels((dimensionPoint1.x + mousePosition.x) / 2, 'cm', scale)}
                  y={toPixels((dimensionPoint1.y + mousePosition.y) / 2, 'cm', scale) - 10}
                  fill={isShiftPressed ? "#10b981" : "#3b82f6"}
                  fontSize={12}
                  fontWeight="bold"
                  textAnchor="middle"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {Math.sqrt((mousePosition.x - dimensionPoint1.x) ** 2 + (mousePosition.y - dimensionPoint1.y) ** 2).toFixed(1)} ס"מ
                  {isShiftPressed ? ' (90°)' : ''}
                </text>
              </>
            )}
          </g>
        )}
        
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
  zoom: number;
  elementRefs: Map<string, React.RefObject<SVGGElement>>;
  selectedElementIds: string[];
  allElements: Element[];
}

const ElementWithDrag = React.forwardRef<SVGGElement, ElementWithDragProps>(
  ({ element, selected, scale, zoom, elementRefs, selectedElementIds, allElements }, ref) => {
    const { updateElement, createElement, selectElement } = useProjectStore();
    const internalRef = useRef<SVGGElement>(null);
    const actualRef = (ref || internalRef) as React.RefObject<SVGGElement>;
    const transformRef = useRef<{ x: number; y: number } | null>(null);
    const selectedElementsStartPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
    const snapResultRef = useRef<SnapResult | null>(null);
    
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
      zoom: zoom,
      onDragStart: () => {
        transformRef.current = null;
        snapResultRef.current = null;
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
      onDragMove: (x, y, snapResult?: SnapResult | null) => {
        // עדכון transform בצורה חלקה
        updateTransform(x, y);
        // שמירת snap info להצגת קווי עזר
        snapResultRef.current = snapResult?.snapInfo || null;
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
        snapResultRef.current = null;
        selectedElementsStartPosRef.current.clear();
      },
    });

    return (
      <g ref={actualRef} style={{ cursor: 'move' }}>
        <ElementRenderer element={element} scale={scale} selected={selected} viewType="front" />
        {/* קווי עזר ל-snap - מוצגים רק במהלך גרירה */}
        {snapResultRef.current && snapResultRef.current.snapInfo && (
          <SnapGuides 
            element={element} 
            snapInfo={snapResultRef.current.snapInfo}
            verticalSnap={snapResultRef.current.verticalSnap}
            horizontalSnap={snapResultRef.current.horizontalSnap}
            scale={scale * zoom} 
          />
        )}
      </g>
    );
  }
);

ElementWithDrag.displayName = 'ElementWithDrag';
