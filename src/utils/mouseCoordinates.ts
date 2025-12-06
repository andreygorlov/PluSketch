/**
 * המרת מיקום מסך (clientX, clientY) למיקום SVG
 * פונקציה מרכזית שמטפלת בכל ההמרות בצורה עקבית
 * משתמשת ב-createSVGPoint ו-getScreenCTM לשיטה המדויקת ביותר
 */
export function screenToSVG(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  if (!svg) return null;

  const rect = svg.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;
  
  // שימוש ב-createSVGPoint - השיטה המדויקת ביותר
  const point = svg.createSVGPoint();
  point.x = clientX - rect.left;
  point.y = clientY - rect.top;
  
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  
  const svgPoint = point.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

