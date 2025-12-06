import { Element, Unit } from './element';

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  elements: Element[];
  settings: ProjectSettings;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: ProjectSettings;
  elementCount: number;
}

export interface ProjectSettings {
  gridSpacing: number; // ס"מ
  snapToGrid: boolean;
  showGrid?: boolean; // הצגת רשת
  scale?: number; // למידות במבט
  displayUnit?: Unit; // יחידת תצוגה (ס"מ או מטר)
}

