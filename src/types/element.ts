export type ElementType = 'rectangle' | 'circle' | 'text';

export type Unit = 'cm' | 'm';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number; // מיקום אופקי (משותף לשני המבטים)
  y: number; // מיקום אנכי (רק במבט חזית - גובה)
  z?: number; // מיקום עומק (לא בשימוש)
  color: string;
  unit: Unit;
  name?: string;
  rotation?: number; // degrees (לא בשימוש)
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize?: number;
}

export type Element = RectangleElement | CircleElement | TextElement;

