import { useState, useRef, useEffect } from 'react';
import { Element } from '../../types/element';
import { formatDimension, fromPixels } from '../../utils/units';
import { useProjectStore } from '../../store';

interface EditableDimensionTextProps {
  element: Element;
  x: number;
  y: number;
  value: number; // הערך ביחידות המקור (ס"מ)
  dimension: 'width' | 'height';
  scale: number;
  displayUnit?: 'cm' | 'm';
}

export default function EditableDimensionText({
  element,
  x,
  y,
  value,
  dimension,
  scale,
  displayUnit,
}: EditableDimensionTextProps) {
  const { updateElement } = useProjectStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isEditing) {
      // המרה ליחידת תצוגה אם צריך
      const displayValue = displayUnit === 'm' ? value / 100 : value;
      setEditValue(displayValue.toString());
      setIsEditing(true);
    }
  };

  const handleBlur = () => {
    saveValue();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveValue();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditValue('');
    }
  };

  const saveValue = () => {
    const numValue = parseFloat(editValue);
    if (!isNaN(numValue) && numValue > 0) {
      // המרה חזרה ליחידות המקור (ס"מ)
      const valueInCm = displayUnit === 'm' ? numValue * 100 : numValue;
      
      const updates: Partial<Element> = {};
      if (dimension === 'width') {
        updates.width = valueInCm;
      } else if (dimension === 'height') {
        updates.height = valueInCm;
      }
      
      updateElement(element.id, updates);
    }
    setIsEditing(false);
    setEditValue('');
  };

  const displayText = formatDimension(value, element.unit, displayUnit);

  if (isEditing) {
    // חישוב מיקום לפי מיקום הטקסט
    // רוחב שונה לפי המימד - רוחב צריך יותר מקום
    const textWidth = dimension === 'width' ? 80 : 50;
    const textHeight = 18;
    const foreignX = x - textWidth / 2;
    const foreignY = y - textHeight + 3; // התאמה למיקום הטקסט
    
    return (
      <foreignObject x={foreignX} y={foreignY} width={textWidth} height={textHeight}>
        <input
          ref={inputRef}
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid #3b82f6',
            borderRadius: '2px',
            padding: '0 4px',
            fontSize: '8px',
            textAlign: 'center',
            outline: 'none',
            fontFamily: 'inherit',
          }}
          step="0.1"
          min="0.1"
        />
      </foreignObject>
    );
  }

  return (
    <text
      x={x}
      y={y}
      fontSize={8}
      fill="#000"
      textAnchor="middle"
      fontWeight="bold"
      style={{ cursor: 'text', pointerEvents: 'all' }}
      onClick={handleClick}
    >
      {displayText}
    </text>
  );
}

