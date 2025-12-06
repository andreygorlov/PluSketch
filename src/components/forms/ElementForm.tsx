import { useState } from 'react';
import { useProjectStore } from '../../store';
import { ElementType } from '../../types/element';
import { DEFAULT_COLOR } from '../../constants/defaults';

interface ElementFormProps {
  initialX?: number;
  initialY?: number;
  initialType?: ElementType;
  onClose?: () => void;
  onSave?: () => void;
}

export default function ElementForm({
  initialX = 2500, // מרכז הקנבס (5000/2)
  initialY = 1500, // מרכז הקנבס (3000/2)
  initialType,
  onClose,
  onSave,
}: ElementFormProps) {
  const { createElement, elements } = useProjectStore();
  const [type, setType] = useState<ElementType>(initialType || 'rectangle');
  const [x, setX] = useState(initialX);
  const [y, setY] = useState(initialY);
  const [z, setZ] = useState<number | undefined>(undefined);
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [name, setName] = useState('');
  
  // מידות לפי סוג
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [radius, setRadius] = useState(25);
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(16);
  const [rotation, setRotation] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const baseElementData: any = {
      type,
      x,
      color,
      unit: 'cm', // תמיד ס"מ
      name: name || undefined,
    };
    
    baseElementData.y = y;
    
    switch (type) {
      case 'rectangle': {
        // לוגיקה אוטומטית לחיבור קירות
        const walls = elements.filter(el => el.type === 'rectangle');
        let elementData: any = {
          ...baseElementData,
          width,
          height,
        };
        
        // קיר ראשון - משתמשים במיקום שהמשתמש הזין
        
        createElement(elementData);
        break;
      }
      case 'circle': {
        createElement({
          ...baseElementData,
          radius,
        });
        break;
      }
      case 'text': {
        createElement({
          ...baseElementData,
          text,
          fontSize,
        });
        break;
      }
    }
    
    onSave?.();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">עריכת אלמנט</h3>
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
      
      {type === 'rectangle' && (
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
      
      {type === 'circle' && (
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
      
      {type === 'text' && (
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
      
      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        הוסף
      </button>
    </form>
  );
}

