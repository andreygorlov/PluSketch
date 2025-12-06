import { useMemo, useRef } from 'react';
import { useProjectStore } from '../../store';
import { Element } from '../../types/element';
import { formatDimension } from '../../utils/units';

export default function DimensionsTable() {
  const { elements, selectElement, selectedElementIds, currentProject } = useProjectStore();
  const displayUnit = currentProject?.settings?.displayUnit;
  const lastSelectedIndexRef = useRef<number | null>(null);

  // יצירת שמות אוטומטיים
  const elementsWithNames = useMemo(() => {
    const typeCounts: Record<string, number> = { rectangle: 0, circle: 0, text: 0 };
    
    return elements.map((element) => {
      const typeLabel = element.type === 'rectangle' ? 'קיר' : element.type === 'circle' ? 'עיגול' : 'טקסט';
      typeCounts[element.type]++;
      const autoName = `${typeLabel} ${typeCounts[element.type]}`;
      
      return {
        ...element,
        displayName: element.name || autoName,
      };
    });
  }, [elements]);

  const getDimensions = (element: Element): string => {
    switch (element.type) {
      case 'rectangle':
        return `${formatDimension(element.width, element.unit, displayUnit)} × ${formatDimension(element.height, element.unit, displayUnit)}`;
      case 'circle':
        const diameter = element.radius * 2;
        return `Ø ${formatDimension(diameter, element.unit, displayUnit)}`;
      case 'text':
        return element.text || '-';
      default:
        return '-';
    }
  };

  const getTypeLabel = (type: Element['type']): string => {
    switch (type) {
      case 'rectangle':
        return 'קיר';
      case 'circle':
        return 'עיגול';
      case 'text':
        return 'טקסט';
      default:
        return '-';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-lg font-bold mb-4">טבלת מידות</h3>
      
      {elements.length === 0 ? (
        <p className="text-gray-500">אין אלמנטים</p>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-200 z-10">
              <tr>
                <th className="border border-gray-300 p-2 text-right">ID</th>
                <th className="border border-gray-300 p-2 text-right">שם</th>
                <th className="border border-gray-300 p-2 text-right">סוג</th>
                <th className="border border-gray-300 p-2 text-right">מידות</th>
                <th className="border border-gray-300 p-2 text-right">יחידה</th>
                <th className="border border-gray-300 p-2 text-right">
                  מיקום (X, Y)
                </th>
                <th className="border border-gray-300 p-2 text-right">זווית</th>
                <th className="border border-gray-300 p-2 text-right">צבע</th>
              </tr>
            </thead>
            <tbody>
              {elementsWithNames.map((element, index) => (
                <tr
                  key={element.id}
                  onClick={(e) => {
                    // Shift+Click = בחירת טווח
                    if (e.shiftKey && lastSelectedIndexRef.current !== null) {
                      const startIndex = Math.min(lastSelectedIndexRef.current, index);
                      const endIndex = Math.max(lastSelectedIndexRef.current, index);
                      
                      // בוחר את הראשון רגיל
                      selectElement(elementsWithNames[startIndex].id, false);
                      // מוסיף את השאר
                      for (let i = startIndex + 1; i <= endIndex; i++) {
                        selectElement(elementsWithNames[i].id, true);
                      }
                      
                      lastSelectedIndexRef.current = index;
                    } 
                    // Ctrl+Click או Cmd+Click (Mac) = multi-select
                    else if (e.ctrlKey || e.metaKey) {
                      selectElement(element.id, true);
                      lastSelectedIndexRef.current = index;
                    } 
                    // לחיצה רגילה
                    else {
                      selectElement(element.id, false);
                      lastSelectedIndexRef.current = index;
                    }
                  }}
                  className={`cursor-pointer hover:bg-gray-100 transition-colors ${
                    selectedElementIds.includes(element.id) ? 'bg-blue-100' : ''
                  }`}
                >
                  <td className="border border-gray-300 p-2 font-mono text-xs">
                    {element.id.substring(0, 8)}...
                  </td>
                  <td className="border border-gray-300 p-2">
                    {element.displayName}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {getTypeLabel(element.type)}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {getDimensions(element)}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {displayUnit ? (displayUnit === 'cm' ? 'ס"מ' : 'מ\'') : (element.unit === 'cm' ? 'ס"מ' : 'מ\'')}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {formatDimension(element.x, element.unit, displayUnit)}, {formatDimension(element.y, element.unit, displayUnit)}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {element.rotation ? `${Math.round(element.rotation)}°` : '0°'}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded border border-gray-400"
                        style={{ backgroundColor: element.color }}
                      />
                      <span className="text-xs font-mono">{element.color}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

