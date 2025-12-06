/**
 * המרת מיקום מסך (clientX, clientY) למיקום SVG
 * פונקציה מרכזית שמטפלת בכל ההמרות בצורה עקבית
 * משתמשת ב-viewBox ישירות לחישוב מדויק
 */
export function screenToSVG(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  
  // קריאת viewBox ישירות מה-SVG
  const viewBox = svg.viewBox.baseVal;
  if (!viewBox || viewBox.width === 0 || viewBox.height === 0) {
    // fallback לשיטה הישנה אם viewBox לא זמין
    const point = svg.createSVGPoint();
    point.x = clientX - rect.left;
    point.y = clientY - rect.top;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const svgPoint = point.matrixTransform(ctm.inverse());
    return { x: svgPoint.x, y: svgPoint.y };
  }
  
  // חישוב מיקום יחסי ל-SVG element (0-1)
  const relativeX = (clientX - rect.left) / rect.width;
  const relativeY = (clientY - rect.top) / rect.height;
  
  // המרה למיקום SVG באמצעות viewBox
  // viewBox = "x y width height" - הקואורדינטות הן ב-pixels של הקנבס המלא
  // המיקום ב-SVG = viewBox.x + (relativeX * viewBox.width)
  const svgX = viewBox.x + (relativeX * viewBox.width);
  const svgY = viewBox.y + (relativeY * viewBox.height);
  
  return { x: svgX, y: svgY };
}

