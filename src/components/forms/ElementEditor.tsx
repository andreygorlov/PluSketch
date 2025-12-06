import { useEffect, useState, useRef } from 'react';
import { useProjectStore } from '../../store';
import { Element, ElementType } from '../../types/element';

export default function ElementEditor() {
  const { selectedElementIds, getElement, updateElement, deleteElement, selectElement } = useProjectStore();
  const selectedElementId = selectedElementIds.length > 0 ? selectedElementIds[0] : null;
  const element = selectedElementId ? getElement(selectedElementId) : null;
  const isInitializing = useRef(false);
  
  const [type, setType] = useState<ElementType>('rectangle');
  const [x, setX] = useState(0);
  const [y, setY] = useState(0);
  const [z, setZ] = useState<number | undefined>(undefined);
  const [color, setColor] = useState('#3b82f6');
  const [name, setName] = useState('');
  
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [radius, setRadius] = useState(25);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [rotation, setRotation] = useState(0);

  // עדכון state מהאלמנט
  useEffect(() => {
    if (element) {
      isInitializing.current = true;
      setType(element.type);
      setX(element.x);
      setY(element.y);
      setZ(element.z);
      setColor(element.color);
      setName(element.name || '');
      
      if (element.type === 'rectangle') {
        setWidth(element.width);
        setHeight(element.height);
      } else if (element.type === 'circle') {
        setRadius(element.radius);
      } else if (element.type === 'text') {
        setText(element.text);
        setFontSize(element.fontSize || 16);
      }
      
      setRotation(element.rotation || 0);
      setTimeout(() => {
        isInitializing.current = false;
      }, 0);
    }
  }, [element]);

  // עדכון אוטומטי של האלמנט כשהערכים משתנים (עם debounce)
  useEffect(() => {
    if (!element || isInitializing.current) return;
    
    const timeoutId = setTimeout(() => {
      const updates: Partial<Element> = {
        x,
        y,
        unit: 'cm', // תמיד ס"מ
        color,
        name: name || undefined,
        rotation: rotation || undefined,
      };
      
      if (element.type === 'rectangle') {
        updates.width = width;
        updates.height = height;
      } else if (element.type === 'circle') {
        (updates as any).radius = radius;
      } else if (element.type === 'text') {
        (updates as any).text = text;
        (updates as any).fontSize = fontSize;
      }
      
      updateElement(element.id, updates);
    }, 50); // debounce של 50ms לעדכון מהיר
    
    return () => clearTimeout(timeoutId);
  }, [x, y, color, name, rotation, width, height, radius, text, fontSize, element, updateElement]);

  if (!element) {
    return <div className="text-gray-500">לא נבחר אלמנט לעריכה</div>;
  }

  const handleDelete = () => {
    if (confirm('האם אתה בטוח שברצונך למחוק את האלמנט?')) {
      deleteElement(element.id);
      selectElement(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">עריכת אלמנט</h3>
        <button
          type="button"
          onClick={handleDelete}
          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
        >
          מחק
        </button>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">סוג: {type === 'rectangle' ? 'קיר' : type === 'circle' ? 'עיגול' : 'טקסט'}</label>
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-1">שם</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-sm font-medium mb-1">X</label>
          <input
            type="number"
            value={x}
            onChange={(e) => setX(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border border-gray-300 rounded"
            step="0.1"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Y (גובה)</label>
          <input
            type="number"
            value={y}
            onChange={(e) => setY(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border border-gray-300 rounded"
            step="0.1"
          />
        </div>
      </div>
      
      {element.type === 'rectangle' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">רוחב</label>
            <input
              type="number"
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">גובה</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-gray-300 rounded"
              step="0.1"
            />
          </div>
        </>
      )}
      
      {element.type === 'circle' && (
        <div>
          <label className="block text-sm font-medium mb-1">רדיוס</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border border-gray-300 rounded"
            step="0.1"
          />
        </div>
      )}
      
      {element.type === 'text' && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">טקסט</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">גודל פונט</label>
            <input
              type="number"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value) || 16)}
              className="w-full p-2 border border-gray-300 rounded"
              min="8"
              max="200"
            />
          </div>
        </>
      )}
      
      
      <div>
        <label className="block text-sm font-medium mb-1">צבע</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-20 border border-gray-300 rounded cursor-pointer"
          />
          <div className="flex-1 flex flex-col gap-2">
            <div
              className="w-full h-16 border-2 border-gray-300 rounded-lg shadow-sm"
              style={{ backgroundColor: color }}
            />
            <div className="text-xs text-gray-600 font-mono text-center">{color}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

