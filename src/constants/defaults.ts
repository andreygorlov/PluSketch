import { Unit } from '../types/element';
import { ProjectSettings } from '../types/project';

export const DEFAULT_UNIT: Unit = 'cm';
export const DEFAULT_GRID_SPACING = 10; // ס"מ
export const DEFAULT_COLOR = '#3b82f6'; // blue-500
export const DEFAULT_SCALE = 1; // 1:1
export const DEFAULT_PDF_SCALE = 20; // 1:20

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  gridSpacing: DEFAULT_GRID_SPACING,
  snapToGrid: true,
  showGrid: true,
  scale: DEFAULT_SCALE,
};

export const GRID_SPACING_OPTIONS = [5, 10, 25]; // ס"מ

