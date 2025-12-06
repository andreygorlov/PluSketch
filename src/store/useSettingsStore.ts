import { create } from 'zustand';
import { AppSettings } from '../types/settings';
import { DEFAULT_UNIT, DEFAULT_GRID_SPACING } from '../constants/defaults';

interface SettingsState extends AppSettings {
  setDefaultUnit: (unit: AppSettings['defaultUnit']) => void;
  setDefaultGridSpacing: (spacing: number) => void;
  setRecentProjects: (projects: string[]) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultUnit: DEFAULT_UNIT,
  defaultGridSpacing: DEFAULT_GRID_SPACING,
  recentProjects: [],
  
  setDefaultUnit: (unit) => set({ defaultUnit: unit }),
  setDefaultGridSpacing: (spacing) => set({ defaultGridSpacing: spacing }),
  setRecentProjects: (projects) => set({ recentProjects: projects }),
}));


