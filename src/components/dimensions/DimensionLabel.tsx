import { Element } from '../../types/element';
import DimensionLines from './DimensionLines';

interface DimensionLabelProps {
  element: Element;
  scale?: number;
  viewType?: 'front';
}

export default function DimensionLabel({ element, scale = 1, viewType = 'front' }: DimensionLabelProps) {
  // משתמשים ב-DimensionLines שמציג מידות כמו באילוסטרטור
  return <DimensionLines element={element} scale={scale} viewType={viewType} />;
}

