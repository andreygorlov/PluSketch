import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Project } from '../types/project';
import { Element } from '../types/element';
import { toPixels, formatDimension } from './units';
import { DEFAULT_PDF_SCALE } from '../constants/defaults';

// פונקציה להמרת טקסט עברי לפורמט שתומך ב-jsPDF
// jsPDF לא תומך בעברית ישירות, אז נשתמש ב-html2canvas או נמיר את הטקסט
async function loadHebrewFont(pdf: jsPDF): Promise<void> {
  try {
    // נשתמש בפונט עברי מותאם אישית
    // אם יש פונט עברי זמין, נטען אותו
    // אחרת, נשתמש בפונט ברירת מחדל עם תמיכה ב-UTF-8
    const fontName = 'hebrew';
    
    // ננסה לטעון פונט עברי מ-Google Fonts או ממקור אחר
    // כרגע נשתמש בפונט ברירת מחדל עם תמיכה ב-UTF-8
    pdf.setFont('helvetica', 'normal');
  } catch (error) {
    console.warn('Failed to load Hebrew font, using default:', error);
    pdf.setFont('helvetica', 'normal');
  }
}

// פונקציה להמרת טקסט עברי לפורמט שתומך ב-jsPDF
// נשתמש ב-html2canvas כדי להמיר את הטקסט העברי לתמונה
async function renderHebrewText(pdf: jsPDF, text: string, x: number, y: number, options?: any): Promise<void> {
  // אם הטקסט מכיל עברית, נמיר אותו לתמונה
  const hasHebrew = /[\u0590-\u05FF]/.test(text);
  
  if (hasHebrew) {
    // יצירת אלמנט HTML זמני עם הטקסט העברי
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.fontFamily = 'Heebo, Assistant, Arial, sans-serif';
    tempDiv.style.fontSize = `${options?.fontSize || pdf.getFontSize() || 12}pt`;
    tempDiv.style.direction = 'rtl';
    tempDiv.style.textAlign = options?.align === 'right' ? 'right' : options?.align === 'center' ? 'center' : 'right';
    tempDiv.style.color = '#000000';
    tempDiv.style.whiteSpace = 'nowrap';
    tempDiv.style.padding = '2px';
    tempDiv.textContent = text;
    document.body.appendChild(tempDiv);
    
    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: null,
      });
      const imgData = canvas.toDataURL('image/png');
      // המרת מידות מ-px ל-mm (1mm = 3.779527559px ב-96 DPI)
      const widthMm = canvas.width / 3.779527559;
      const heightMm = canvas.height / 3.779527559;
      pdf.addImage(imgData, 'PNG', x, y - heightMm, widthMm, heightMm);
    } catch (error) {
      console.warn('Failed to render Hebrew text as image, using default font:', error);
      pdf.text(text, x, y, options);
    } finally {
      document.body.removeChild(tempDiv);
    }
  } else {
    // אם הטקסט לא מכיל עברית, נשתמש בפונט רגיל
    pdf.text(text, x, y, options);
  }
}

export async function exportToPDF(
  project: Project,
  viewType: 'front' = 'front'
): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  // טעינת פונט עברי
  await loadHebrewFont(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - 2 * margin;
  const contentHeight = (pageHeight - 2 * margin - 30) / 2; // חלוקה לשניים אם both

  // SVG string לבנייה
  const CANVAS_WIDTH = 5000; // ס"מ
  const CANVAS_HEIGHT = 3000; // ס"מ
  const scale = DEFAULT_PDF_SCALE;
  const widthPx = toPixels(CANVAS_WIDTH, 'cm', scale);
  const heightPx = toPixels(CANVAS_HEIGHT, 'cm', scale);
  
  const elements = project.elements;

  // פונקציה לציור אלמנטים
  const drawElements = async (elements: Element[], yOffset: number, showRotation: boolean) => {
    for (const element of elements) {
      const x = (toPixels(element.x, element.unit, scale) / widthPx) * contentWidth + margin;
      const y = (toPixels(element.y, element.unit, scale) / heightPx) * contentHeight + yOffset;
      
      const color = element.color;
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);

      pdf.setDrawColor(r, g, b);
      pdf.setFillColor(r, g, b);

      const rotation = showRotation ? (element.rotation || 0) : 0;

      switch (element.type) {
        case 'rectangle': {
          const width = (toPixels(element.width, element.unit, scale) / widthPx) * contentWidth;
          const height = (toPixels(element.height, element.unit, scale) / heightPx) * contentHeight;
          
          if (rotation) {
            // סיבוב - jsPDF לא תומך ישירות, נצייר ללא סיבוב כרגע
            // ניתן להוסיף תמיכה בסיבוב עם matrix transformation
            pdf.rect(x, y, width, height, 'FD');
          } else {
            pdf.rect(x, y, width, height, 'FD');
          }
          break;
        }
        case 'circle': {
          const radius = (toPixels(element.radius, element.unit, scale) / widthPx) * contentWidth;
          pdf.circle(x, y, radius, 'FD');
          break;
        }
        case 'text': {
          pdf.setTextColor(r, g, b);
          pdf.setFontSize(element.fontSize || 12);
          if (rotation) {
            // סיבוב טקסט - נשתמש ב-renderHebrewText
            await renderHebrewText(pdf, element.text, x, y, { angle: rotation, fontSize: element.fontSize || 12 });
          } else {
            await renderHebrewText(pdf, element.text, x, y, { fontSize: element.fontSize || 12 });
          }
          break;
        }
      }
    }
  };

  // עמוד 1: כותרת + Front View
  pdf.setFontSize(18);
  await renderHebrewText(pdf, project.name, margin, 15, { fontSize: 18 });
  pdf.setFontSize(10);
  await renderHebrewText(
    pdf,
    `תאריך: ${new Date(project.updatedAt).toLocaleDateString('he-IL')}`,
    pageWidth - margin,
    15,
    { align: 'right', fontSize: 10 }
  );

  // כותרת Front View
  pdf.setFontSize(14);
  await renderHebrewText(pdf, 'מבט חזית', margin, 25, { fontSize: 14 });
  
  // ציור Front View
  await drawElements(elements, 30, false);
  
  // הוספת סקאלה
  pdf.setFontSize(8);
  pdf.setTextColor(0, 0, 0);
  await renderHebrewText(pdf, `סקאלה: 1:${scale}`, margin, pageHeight - 10, { fontSize: 8 });

  // הוספת טבלת מידות בעמוד נפרד אם יש אלמנטים
  if (elements.length > 0) {
    pdf.addPage();
    
    // כותרת עמוד
    pdf.setFontSize(18);
    await renderHebrewText(pdf, project.name, margin, 15, { fontSize: 18 });
    pdf.setFontSize(10);
    await renderHebrewText(
      pdf,
      `תאריך: ${new Date(project.updatedAt).toLocaleDateString('he-IL')}`,
      pageWidth - margin,
      15,
      { align: 'right', fontSize: 10 }
    );
    
    // כותרת
    pdf.setFontSize(16);
    await renderHebrewText(pdf, 'טבלת מידות', margin, 20, { fontSize: 16 });
    
    // פונקציות עזר
    const getDimensions = (element: Element): string => {
      switch (element.type) {
        case 'rectangle':
          return `${formatDimension(element.width, element.unit)} × ${formatDimension(element.height, element.unit)}`;
        case 'circle':
          const diameter = element.radius * 2;
          return `Ø ${formatDimension(diameter, element.unit)}`;
        case 'text':
          return element.text;
        case 'manualDimension':
          return formatDimension(element.value, element.unit);
        default:
          return '-';
      }
    };

    const getTypeLabel = (type: Element['type']): string => {
      switch (type) {
        case 'rectangle': return 'מלבן';
        case 'circle': return 'עיגול';
        case 'text': return 'טקסט';
        case 'manualDimension': return 'מידה ידנית';
        default: return '-';
      }
    };

    // טבלה
    const tableStartY = 30;
    const rowHeight = 8;
    const colWidths = [25, 20, 35, 35, 20, 25]; // סה"כ 160mm (פחות מהרוחב של A4 landscape)
    const headers = ['שם', 'סוג', 'מידות', 'מיקום', 'זווית', 'צבע'];
    let currentY = tableStartY;

    // כותרות הטבלה
    pdf.setFontSize(10);
    pdf.setFillColor(200, 200, 200);
    pdf.rect(margin, currentY - 5, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
    pdf.setTextColor(0, 0, 0);
    let xPos = margin;
    for (let idx = 0; idx < headers.length; idx++) {
      await renderHebrewText(pdf, headers[idx], xPos + colWidths[idx] / 2, currentY, { align: 'center', fontSize: 10 });
      xPos += colWidths[idx];
    }
    currentY += rowHeight;

    // שורות הטבלה
    pdf.setFontSize(9);
    for (const element of elements) {
      if (currentY > pageHeight - 20) {
        pdf.addPage();
        currentY = 20;
      }

      const rowData = [
        element.name || '-',
        getTypeLabel(element.type),
        getDimensions(element),
        `${formatDimension(element.x, element.unit)}, ${formatDimension(element.y, element.unit)}`,
        element.rotation ? `${element.rotation}°` : '-',
        element.color,
      ];

      xPos = margin;
      for (let colIdx = 0; colIdx < rowData.length; colIdx++) {
        const data = rowData[colIdx];
        if (colIdx === 5) {
          // צבע - ציור ריבוע צבעוני
          const color = element.color;
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          pdf.setFillColor(r, g, b);
          pdf.setDrawColor(0, 0, 0);
          pdf.rect(xPos + 2, currentY - 4, 4, 4, 'FD');
          pdf.setTextColor(0, 0, 0);
          await renderHebrewText(pdf, data, xPos + 8, currentY, { align: 'left', fontSize: 9 });
        } else {
          await renderHebrewText(pdf, data.substring(0, 15), xPos + 2, currentY, { align: 'left', fontSize: 9 });
        }
        xPos += colWidths[colIdx];
      }

      // קו הפרדה
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, currentY + 2, margin + colWidths.reduce((a, b) => a + b, 0), currentY + 2);
      
      currentY += rowHeight;
    }
  }

  pdf.save(`${project.name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
}

