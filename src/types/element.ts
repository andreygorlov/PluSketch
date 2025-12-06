export type ElementType = 'rectangle' | 'circle' | 'text' | 'manualDimension';

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

export interface ManualDimensionElement extends BaseElement {
  type: 'manualDimension';
  x1: number; // נקודת התחלה X
  y1: number; // נקודת התחלה Y
  x2: number; // נקודת סיום X
  y2: number; // נקודת סיום Y
  value: number; // ערך המידה (ביחידות של האלמנט)
}

export type Element = RectangleElement | CircleElement | TextElement | ManualDimensionElement;

