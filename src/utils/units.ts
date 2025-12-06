import { Unit } from '../types/element';

export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  if (from === 'cm' && to === 'm') return value / 100;
  if (from === 'm' && to === 'cm') return value * 100;
  return value;
}

export function formatDimension(value: number, unit: Unit, displayUnit?: Unit): string {
  // אם יש displayUnit, נמיר את הערך ליחידת התצוגה
  let displayValue = value;
  let finalUnit = unit;
  
  if (displayUnit && displayUnit !== unit) {
    displayValue = convert(value, unit, displayUnit);
    finalUnit = displayUnit;
  }
  
  if (finalUnit === 'm') {
    return `${displayValue.toFixed(2)} מ'`;
  }
  return `${displayValue.toFixed(1)} ס"מ`;
}

export function toPixels(value: number, unit: Unit, scale: number = 1): number {
  // 1 ס"מ = 0.377953 pixels ב-96 DPI
  // scale מגדיל את הייצוג
  const pixelsPerCm = 0.377953;
  const valueInCm = unit === 'cm' ? value : value * 100;
  return valueInCm * pixelsPerCm * scale;
}

export function fromPixels(pixels: number, unit: Unit, scale: number = 1): number {
  const pixelsPerCm = 0.377953;
  const cm = pixels / (pixelsPerCm * scale);
  return unit === 'cm' ? cm : cm / 100;
}

