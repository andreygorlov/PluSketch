import { ReactNode, useRef, useEffect, useState, forwardRef, useCallback } from 'react';
import { isDraggingRef, justFinishedDraggingRef } from '../../hooks/useDrag';
import { screenToSVG } from '../../utils/mouseCoordinates';
import { toPixels } from '../../utils/units';

export interface ZoomControls {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomReset: () => void;
  fitToView: () => void;
  getZoom: () => number;
}

interface SVGCanvasProps {
  children: ReactNode;
  width?: number;
  height?: number;
  onCanvasClick?: (x: number, y: number) => void;
  getElementsBounds?: () => { x: number; y: number; width: number; height: number } | null;
  onSelectionBox?: (rect: { x: number; y: number; width: number; height: number }) => void;
  zoomControlsRef?: React.MutableRefObject<ZoomControls | null>;
  onZoomChange?: (zoom: number) => void;
  creatingElementType?: 'rectangle' | 'circle' | 'text' | 'manualDimension' | null;
  toolMode?: 'select' | 'create' | null;
}

const SVGCanvas = forwardRef<SVGSVGElement, SVGCanvasProps>(({
  children,
  width = 2000,
  height = 2000,
  onCanvasClick,
  getElementsBounds,
  onSelectionBox,
  zoomControlsRef,
  onZoomChange,
  creatingElementType,
  toolMode,
}, ref) => {
  const internalRef = useRef<SVGSVGElement>(null);
  const svgRef = (ref || internalRef) as React.RefObject<SVGSVGElement>;
  
  // מצב הזום והפאן
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isClickOnBackground, setIsClickOnBackground] = useState(false);
  
  // מלבן בחירה (Marquee Selection)
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  
  // refs לערכים נוכחיים לשימוש ב-callbacks
  const panXRef = useRef(panX);
  const panYRef = useRef(panY);
  
  useEffect(() => {
    panXRef.current = panX;
    panYRef.current = panY;
  }, [panX, panY]);
  
  // פונקציה להגבלת panX ו-panY לגבולות הקנבס
  const constrainPan = useCallback((x: number, y: number, z: number) => {
    const viewBoxWidth = width / z;
    const viewBoxHeight = height / z;
    
    // הגבלת panX: לא יכול להיות שלילי, ולא יכול להיות מעבר ל-width
    const minPanX = 0;
    const maxPanX = Math.max(0, width - viewBoxWidth);
    const constrainedX = Math.max(minPanX, Math.min(maxPanX, x));
    
    // הגבלת panY: לא יכול להיות שלילי, ולא יכול להיות מעבר ל-height
    const minPanY = 0;
    const maxPanY = Math.max(0, height - viewBoxHeight);
    const constrainedY = Math.max(minPanY, Math.min(maxPanY, y));
    
    return { x: constrainedX, y: constrainedY };
  }, [width, height]);
  
  // חישוב viewBox על בסיס zoom ו-pan (מוגבל לגבולות)
  const constrainedPan = constrainPan(panX, panY, zoom);
  const viewBox = `${constrainedPan.x} ${constrainedPan.y} ${width / zoom} ${height / zoom}`;

  // עדכון viewBox בהתאם לגודל החלון
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateInitialViewBox = () => {
      const rect = svg.getBoundingClientRect();
      const scaleX = rect.width / width;
      const scaleY = rect.height / height;
      const initialScale = Math.min(scaleX, scaleY);
      
      // הכפלת הזום הראשוני ב-3 כדי שיהיה קרוב יותר
      const zoomFactor = 3;
      const adjustedScale = Math.max(1, initialScale * zoomFactor); // מינימום 1
      
      // אם זה הפעם הראשונה, נגדיר zoom התחלתי
      if (zoom === 1 && panX === 0 && panY === 0) {
        setZoom(adjustedScale);
      }
    };

    updateInitialViewBox();
    window.addEventListener('resize', updateInitialViewBox);
    return () => window.removeEventListener('resize', updateInitialViewBox);
  }, [width, height, svgRef, zoom, panX, panY]);

  // זום עם גלגלת העכבר - נשאר ממורכז
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    
    // חישוב זום חדש - מינימום 1 (לא לאפשר zoom out יותר מהקנבס)
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(1, Math.min(10, zoom * zoomFactor));

    // שמירה על המרכז - הזום נשאר ממורכז
    const centerX = panX + (width / zoom) / 2;
    const centerY = panY + (height / zoom) / 2;
    
    // חישוב pan חדש כך שהמרכז נשאר באותו מקם
    const newPanX = centerX - (width / newZoom) / 2;
    const newPanY = centerY - (height / newZoom) / 2;

    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [zoom, panX, panY, width, height]);

  // פונקציה עטיפה ל-screenToSVG עם svgRef
  const getSVGPoint = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = screenToSVG(svg, clientX, clientY);
    return point || { x: 0, y: 0 };
  }, []);

  // התחלת פאן או בחירה - גם בלחיצה רגילה על הרקע
  const handleMouseDown = useCallback((e: MouseEvent) => {
    // אם זה כפתור אמצעי או Ctrl+Click, תמיד אפשר פאן
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setIsClickOnBackground(false);
      return;
    }
    
    // אם זה click רגיל על הרקע (SVG עצמו או Grid)
    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const isSVG = target.tagName === 'svg';
      const isGrid = target.closest('[data-grid]') !== null || 
                     target.getAttribute('data-grid') !== null;
      
      // אם זה click על SVG או על Grid (רקע) ולא גוררים אלמנט
      if ((isSVG || isGrid) && !isDraggingRef.current) {
        e.preventDefault();
        
        // אם Shift לא לחוץ ומצב select, נתחיל מלבן בחירה במקום Pan
        if (!e.shiftKey && onSelectionBox && toolMode === 'select') {
          const svg = svgRef.current;
          if (svg) {
            // שימוש ישיר ב-screenToSVG כדי לוודא שהמיקום מדויק
            const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
            if (svgPoint) {
              setIsSelecting(true);
              setSelectionStart(svgPoint);
              setSelectionEnd(svgPoint);
            }
          }
        } else {
          // אחרת, Pan כרגיל
          setIsPanning(true);
          setPanStart({ x: e.clientX, y: e.clientY });
          setIsClickOnBackground(true);
        }
      }
    }
  }, [onSelectionBox, getSVGPoint, toolMode]);

  // סיום פאן או בחירה
  const handleMouseUp = useCallback((e?: MouseEvent) => {
    setIsPanning(false);
    
    // סיום מלבן בחירה
    if (isSelecting && selectionStart && selectionEnd && onSelectionBox) {
      const rect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y),
      };
      
      // רק אם המלבן גדול מספיק (לפחות 5 פיקסלים)
      if (rect.width > 5 && rect.height > 5) {
        onSelectionBox(rect);
      }
      
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  }, [isSelecting, selectionStart, selectionEnd, onSelectionBox]);

  // פונקציות זום - נשאר ממורכז
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(10, zoom * 1.2);
    
    // שמירה על המרכז
    const centerX = panX + (width / zoom) / 2;
    const centerY = panY + (height / zoom) / 2;
    
    let newPanX = centerX - (width / newZoom) / 2;
    let newPanY = centerY - (height / newZoom) / 2;
    
    // הגבלת pan לגבולות
    const constrained = constrainPan(newPanX, newPanY, newZoom);
    newPanX = constrained.x;
    newPanY = constrained.y;
    
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [zoom, panX, panY, width, height, constrainPan]);

  const handleZoomOut = useCallback(() => {
    // מינימום 1 - לא לאפשר zoom out יותר מהקנבס
    const newZoom = Math.max(1, zoom / 1.2);
    
    // שמירה על המרכז
    const centerX = panX + (width / zoom) / 2;
    const centerY = panY + (height / zoom) / 2;
    
    let newPanX = centerX - (width / newZoom) / 2;
    let newPanY = centerY - (height / newZoom) / 2;
    
    // הגבלת pan לגבולות
    const constrained = constrainPan(newPanX, newPanY, newZoom);
    newPanX = constrained.x;
    newPanY = constrained.y;
    
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [zoom, panX, panY, width, height, constrainPan]);

  const handleZoomReset = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    
    const rect = svg.getBoundingClientRect();
    const scaleX = rect.width / width;
    const scaleY = rect.height / height;
    const initialScale = Math.min(scaleX, scaleY);
    
    // הכפלת הזום ב-3 כדי שיהיה קרוב יותר
    const zoomFactor = 3;
    const adjustedScale = Math.max(1, initialScale * zoomFactor); // מינימום 1
    
    setZoom(adjustedScale);
    setPanX(0);
    setPanY(0);
  }, [width, height, svgRef]);

  // זום לכל האלמנטים
  const handleFitToView = useCallback(() => {
    const svg = svgRef.current;
    if (!svg || !getElementsBounds) return;

    const bounds = getElementsBounds();
    if (!bounds || bounds.width === 0 || bounds.height === 0) {
      // אם אין אלמנטים, נשתמש באיפוס רגיל
      handleZoomReset();
      return;
    }

    const rect = svg.getBoundingClientRect();
    const padding = 50; // רווח מסביב לאלמנטים
    
    // חישוב זום כך שכל האלמנטים יראו עם רווח
    const scaleX = (rect.width - padding * 2) / bounds.width;
    const scaleY = (rect.height - padding * 2) / bounds.height;
    const newZoom = Math.max(1, Math.min(scaleX, scaleY, 10)); // מינימום 1, מקסימום 10x
    
    // חישוב מרכז האלמנטים
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // חישוב pan כך שהמרכז יהיה במרכז המסך
    let newPanX = centerX - (rect.width / 2) / newZoom;
    let newPanY = centerY - (rect.height / 2) / newZoom;
    
    // הגבלת pan לגבולות
    const constrained = constrainPan(newPanX, newPanY, newZoom);
    newPanX = constrained.x;
    newPanY = constrained.y;
    
    setZoom(newZoom);
    setPanX(newPanX);
    setPanY(newPanY);
  }, [getElementsBounds, svgRef, handleZoomReset, constrainPan]);

  // עדכון zoomControlsRef עם הפונקציות
  useEffect(() => {
    if (zoomControlsRef) {
      zoomControlsRef.current = {
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        zoomReset: handleZoomReset,
        fitToView: handleFitToView,
        getZoom: () => zoom,
      };
    }
  }, [zoomControlsRef, handleZoomIn, handleZoomOut, handleZoomReset, handleFitToView, zoom]);

  // עדכון onZoomChange כשהזום משתנה
  useEffect(() => {
    if (onZoomChange) {
      onZoomChange(zoom);
    }
  }, [zoom, onZoomChange]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !onCanvasClick) return;
    
    // אם זה היה גרירה או פאן על הרקע, לא לקרוא ל-onCanvasClick
    if (isDraggingRef.current || (isPanning && isClickOnBackground)) {
      setIsClickOnBackground(false);
      return;
    }
    
    // אם הסתיימה גרירה עכשיו, לא לבטל את הבחירה
    if (justFinishedDraggingRef.current) {
      setIsClickOnBackground(false);
      return;
    }
    
    // אם זה היה פאן קצר (לא גרירה), עדיין נקרא ל-onCanvasClick
    setIsClickOnBackground(false);
    
    const svgPoint = getSVGPoint(e.clientX, e.clientY);
    onCanvasClick(svgPoint.x, svgPoint.y);
  };


  // הוספת native event listeners עם passive: false עבור preventDefault
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheelNative = (e: WheelEvent) => {
      handleWheel(e);
    };

    const handleMouseDownNative = (e: MouseEvent) => {
      handleMouseDown(e);
    };

    svg.addEventListener('wheel', handleWheelNative, { passive: false });
    svg.addEventListener('mousedown', handleMouseDownNative, { passive: false });

    return () => {
      svg.removeEventListener('wheel', handleWheelNative);
      svg.removeEventListener('mousedown', handleMouseDownNative);
    };
  }, [handleWheel, handleMouseDown]);

  // הוספת event listeners לפאן ולבחירה
  useEffect(() => {
    if (isPanning) {
      let lastX = panStart.x;
      let lastY = panStart.y;

      const handleGlobalMouseMove = (e: MouseEvent) => {
        const deltaX = (e.clientX - lastX) / zoom;
        const deltaY = (e.clientY - lastY) / zoom;
        
        const newX = panXRef.current - deltaX;
        const newY = panYRef.current - deltaY;
        const constrained = constrainPan(newX, newY, zoom);
        
        setPanX(constrained.x);
        setPanY(constrained.y);
        lastX = e.clientX;
        lastY = e.clientY;
      };

      const handleGlobalMouseUp = () => {
        handleMouseUp();
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    } else if (isSelecting) {
      // event listeners למלבן בחירה
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        // שימוש ישיר ב-screenToSVG כדי לוודא שהמיקום מדויק
        const svgPoint = screenToSVG(svg, e.clientX, e.clientY);
        if (svgPoint) {
          setSelectionEnd(svgPoint);
        }
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        handleMouseUp(e);
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isPanning, isSelecting, panStart, zoom, panX, panY, constrainPan, handleMouseUp, svgRef]);


  return (
    <div className="relative w-full h-full overflow-hidden">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        className="w-full h-full"
        onClick={handleClick}
        onMouseUp={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : (isSelecting ? 'crosshair' : 'default'), overflow: 'hidden' }}
      >
        <defs>
          <clipPath id="canvas-clip">
            <rect x="0" y="0" width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath="url(#canvas-clip)">
          {children}
          {/* מלבן בחירה */}
          {isSelecting && selectionStart && selectionEnd && (() => {
            // screenToSVG מחזיר קואורדינטות ב-viewBox coordinates (pixels)
            // האלמנטים מוצגים ב-pixels של הקנבס המלא (לאחר המרה מ-SVG coordinates)
            // אז המלבן בחירה צריך להיות ב-viewBox coordinates (כי זה מה ש-screenToSVG מחזיר)
            // אבל האלמנטים מוצגים ב-pixels של הקנבס המלא, אז צריך להמיר
            
            // הקואורדינטות כבר ב-viewBox coordinates (pixels), אז פשוט משתמשים בהם ישירות
            const x1 = selectionStart.x;
            const y1 = selectionStart.y;
            const x2 = selectionEnd.x;
            const y2 = selectionEnd.y;
            
            return (
              <rect
                x={Math.min(x1, x2)}
                y={Math.min(y1, y2)}
                width={Math.abs(x2 - x1)}
                height={Math.abs(y2 - y1)}
                fill="rgba(59, 130, 246, 0.1)"
                stroke="#3b82f6"
                strokeWidth={2 / (zoom || 1)}
                strokeDasharray={`${5 / (zoom || 1)},${5 / (zoom || 1)}`}
                pointerEvents="none"
              />
            );
          })()}
        </g>
      </svg>
    </div>
  );
});

SVGCanvas.displayName = 'SVGCanvas';

export default SVGCanvas;

