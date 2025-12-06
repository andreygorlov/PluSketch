import { create } from 'zustand';
import { Element, ElementType } from '../types/element';
import { Project, ProjectSettings } from '../types/project';
import { DEFAULT_PROJECT_SETTINGS, DEFAULT_COLOR, DEFAULT_UNIT } from '../constants/defaults';
import { useHistoryStore } from './useHistoryStore';
import { saveToDatabase, saveToFile as saveProjectToFile, loadFromFile, getAllProjects, loadFromDatabase } from '../utils/storage';
import { getElementBounds } from '../utils/geometry';

interface ProjectState {
  currentProject: Project | null;
  elements: Element[];
  selectedElementIds: string[]; // רשימת ID של אלמנטים נבחרים
  creatingElementType: ElementType | null;
  toolMode: 'select' | 'create' | null; // מצב הכלי: select = בחירה, create = יצירה
  viewType: 'front';
  showDimensionsTable: boolean;
  showDimensions: boolean;
  clipboard: Element | null; // אלמנט מועתק
  
  // Actions
  createElement: (element: Omit<Element, 'id'> | Element) => void;
  updateElement: (id: string, updates: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  selectElement: (id: string | null, multiSelect?: boolean) => void;
  toggleSelectElement: (id: string) => void;
  setCreatingElementType: (type: ElementType | null) => void;
  setToolMode: (mode: 'select' | 'create' | null) => void;
  loadProject: (project: Project) => void;
  newProject: () => void;
  getElement: (id: string) => Element | undefined;
  setViewType: (view: 'front') => void;
  setShowDimensionsTable: (show: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;
  undo: () => void;
  redo: () => void;
  copyElement: (id: string) => void;
  pasteElement: (offsetX?: number, offsetY?: number) => void;
  cutElement: (id: string) => void;
  
  // שמירה/טעינה
  serializeProject: () => Project | null;
  saveProject: (name?: string, saveAsFile?: boolean) => Promise<void>;
  openProjectFromFile: (file: File) => Promise<void>;
  updateProjectName: (name: string) => void;
  hasUnsavedChanges: () => boolean;
  loadProjectById: (id: string) => Promise<void>;
  
  // פונקציות יצירת קירות
  addWall: () => void;
  
  // פונקציות alignment
  alignLeft: () => void;
  alignCenter: () => void;
  alignRight: () => void;
  alignTop: () => void;
  alignBottom: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  currentProject: null,
  elements: [],
  selectedElementIds: [],
  creatingElementType: null,
  toolMode: 'select', // ברירת מחדל - מצב בחירה
  viewType: 'front',
  showDimensionsTable: false,
  showDimensions: true,
  clipboard: null,
  
  createElement: (element) => {
    const newElement: Element = {
      ...element,
      id: generateId(),
    } as Element;
    
    set((state) => {
      const newElements = [...state.elements, newElement];
      useHistoryStore.getState().saveState(newElements);
      return { elements: newElements, creatingElementType: null };
    });
  },
  
  updateElement: (id, updates) => {
    set((state) => {
      const updatedElements = state.elements.map((el) => {
        if (el.id === id) {
          return { ...el, ...updates } as Element;
        }
        return el;
      });
      useHistoryStore.getState().saveState(updatedElements);
      return { elements: updatedElements };
    });
  },
  
  deleteElement: (id) => {
    set((state) => {
      const newElements = state.elements.filter((el) => el.id !== id);
      const newSelectedIds = state.selectedElementIds.filter(selectedId => selectedId !== id);
      useHistoryStore.getState().saveState(newElements);
      return {
        elements: newElements,
        selectedElementIds: newSelectedIds,
      };
    });
  },
  
  selectElement: (id, multiSelect = false) => {
    set((state) => {
      if (id === null) {
        return { selectedElementIds: [], creatingElementType: null };
      }
      
      if (multiSelect) {
        // אם האלמנט כבר נבחר, נסיר אותו מהרשימה
        if (state.selectedElementIds.includes(id)) {
          return { 
            selectedElementIds: state.selectedElementIds.filter(selectedId => selectedId !== id),
            creatingElementType: null 
          };
        } else {
          // אחרת, נוסיף אותו לרשימה
          return { 
            selectedElementIds: [...state.selectedElementIds, id],
            creatingElementType: null 
          };
        }
      } else {
        // בחירה רגילה - מחליפה את כל הבחירות
        return { selectedElementIds: [id], creatingElementType: null };
      }
    });
  },
  
  toggleSelectElement: (id) => {
    set((state) => {
      if (state.selectedElementIds.includes(id)) {
        return { selectedElementIds: state.selectedElementIds.filter(selectedId => selectedId !== id) };
      } else {
        return { selectedElementIds: [...state.selectedElementIds, id] };
      }
    });
  },
  
  setCreatingElementType: (type) => {
    if (type) {
      set({ creatingElementType: type, toolMode: 'create', selectedElementIds: [] });
    } else {
      set({ creatingElementType: null, toolMode: 'select' });
    }
  },
  
  setToolMode: (mode) => {
    if (mode === 'select') {
      set({ toolMode: 'select', creatingElementType: null });
    } else if (mode === 'create') {
      // לא משנה את creatingElementType, רק את toolMode
      set({ toolMode: 'create' });
    } else {
      set({ toolMode: null, creatingElementType: null });
    }
  },
  
  getElement: (id) => {
    return get().elements.find((el) => el.id === id);
  },
  
  getSelectedElementId: () => {
    const ids = get().selectedElementIds;
    return ids.length > 0 ? ids[0] : null;
  },
  
  loadProject: (project) => {
    useHistoryStore.getState().clear();
    set({
      currentProject: project,
      elements: project.elements,
      selectedElementIds: [],
      creatingElementType: null,
    });
    useHistoryStore.getState().saveState(project.elements);
  },
  
  newProject: () => {
    const newProject: Project = {
      id: generateId(),
      name: `פרויקט חדש ${new Date().toLocaleDateString('he-IL')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      elements: [],
      settings: { ...DEFAULT_PROJECT_SETTINGS },
    };
    
    useHistoryStore.getState().clear();
    set({
      currentProject: newProject,
      elements: [],
      selectedElementIds: [],
      creatingElementType: null,
    });
    useHistoryStore.getState().saveState([]);
  },
  
  setViewType: (view) => {
    set({ viewType: view });
  },
  
  setShowDimensionsTable: (show) => {
    set({ showDimensionsTable: show });
  },
  
  setShowDimensions: (show) => {
    set({ showDimensions: show });
  },
  
  updateProjectSettings: (settings) => {
    set((state) => {
      if (!state.currentProject) return state;
      
      const updatedProject: Project = {
        ...state.currentProject,
        settings: {
          ...state.currentProject.settings,
          ...settings,
        },
        updatedAt: new Date().toISOString(),
      };
      
      return {
        currentProject: updatedProject,
      };
    });
  },

  undo: () => {
    const currentElements = get().elements;
    const previousState = useHistoryStore.getState().undo(currentElements);
    if (previousState) {
      set({ elements: previousState });
    }
  },

  redo: () => {
    const currentElements = get().elements;
    const nextState = useHistoryStore.getState().redo(currentElements);
    if (nextState) {
      set({ elements: nextState });
    }
  },

  copyElement: (id: string) => {
    const element = get().getElement(id);
    if (element) {
      // יצירת עותק של האלמנט ללא ID (ייווצר חדש בהדבקה)
      const { id: _, ...elementCopy } = element;
      set({ clipboard: elementCopy as Element });
    }
  },

  pasteElement: (offsetX = 20, offsetY = 20) => {
    const clipboard = get().clipboard;
    if (!clipboard) return;

    // יצירת אלמנט חדש עם ID חדש ומיקום מוזז
    const newElement: Element = {
      ...clipboard,
      id: generateId(),
      x: clipboard.x + offsetX,
      y: clipboard.y + offsetY,
      z: clipboard.z !== undefined ? clipboard.z + offsetX : undefined,
    } as Element;

    set((state) => {
      const newElements = [...state.elements, newElement];
      useHistoryStore.getState().saveState(newElements);
      return { 
        elements: newElements, 
        selectedElementId: newElement.id 
      };
    });
  },

  cutElement: (id: string) => {
    const element = get().getElement(id);
    if (element) {
      // העתקה ל-clipboard
      const { id: _, ...elementCopy } = element;
      set({ clipboard: elementCopy as Element });
      
      // מחיקת האלמנט
      get().deleteElement(id);
    }
  },

  serializeProject: () => {
    const state = get();
    if (!state.currentProject) return null;
    
    return {
      ...state.currentProject,
      elements: state.elements,
      updatedAt: new Date().toISOString(),
    };
  },

  saveProject: async (name?: string, saveAsFile = false) => {
    const state = get();
    let project = state.serializeProject();
    
    if (!project) {
      // יצירת פרויקט חדש אם אין
      project = {
        id: generateId(),
        name: name || `פרויקט חדש ${new Date().toLocaleDateString('he-IL')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        elements: state.elements,
        settings: state.currentProject?.settings || { ...DEFAULT_PROJECT_SETTINGS },
      };
    } else if (name) {
      // עדכון שם אם ניתן
      project.name = name;
    }
    
    // עדכון תאריך עדכון
    project.updatedAt = new Date().toISOString();
    
    // עדכון state
    set({ currentProject: project });
    
    if (saveAsFile) {
      // שמירה לקובץ
      await saveProjectToFile(project);
    } else {
      // שמירה ל-database
      await saveToDatabase(project);
    }
  },

  openProjectFromFile: async (file: File) => {
    try {
      const project = await loadFromFile(file);
      get().loadProject(project);
    } catch (error) {
      throw new Error('שגיאה בטעינת הקובץ: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
    }
  },

  updateProjectName: (name: string) => {
    set((state) => {
      if (!state.currentProject) return state;
      
      return {
        currentProject: {
          ...state.currentProject,
          name,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  },

  hasUnsavedChanges: () => {
    const state = get();
    if (!state.currentProject) return false;
    
    // בדיקה פשוטה - אם יש אלמנטים או אם הפרויקט שונה מהשמור
    // ניתן לשפר את זה עם השוואה מדויקת יותר
    return state.elements.length > 0;
  },

  loadProjectById: async (id: string) => {
    const project = await loadFromDatabase(id);
    if (project) {
      get().loadProject(project);
    } else {
      throw new Error('פרויקט לא נמצא בשרת וגם לא ב-localStorage');
    }
  },

  addWall: () => {
    // יוצר קיר פשוט (מלבן) במרכז הקנבס
    get().createElement({
      type: 'rectangle',
      x: 2500, // מרכז הקנבס (5000/2)
      y: 1500, // מרכז הקנבס (3000/2)
      width: 100,
      height: 200,
      color: DEFAULT_COLOR,
      unit: DEFAULT_UNIT,
    } as any);
    
    get().selectElement(null); // ביטול בחירה כדי לראות את הקיר החדש
  },

  alignLeft: () => {
    const state = get();
    if (state.selectedElementIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // מוצא את ה-X הקטן ביותר
    const minX = Math.min(...selectedElements.map(el => el.x));
    
    // מעדכן את כל האלמנטים לאותו X
    selectedElements.forEach(element => {
      if (element.x !== minX) {
        get().updateElement(element.id, { x: minX });
      }
    });
  },

  alignCenter: () => {
    const state = get();
    if (state.selectedElementIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // מחשב את המרכז של כל אלמנט
    const elementCenters = selectedElements.map(el => {
      const bounds = getElementBounds(el);
      return bounds.x + bounds.width / 2;
    });
    
    // מוצא את הממוצע של כל המרכזים
    const averageCenter = elementCenters.reduce((sum, center) => sum + center, 0) / elementCenters.length;
    
    // מעדכן את כל האלמנטים למרכז משותף
    selectedElements.forEach(element => {
      const bounds = getElementBounds(element);
      const currentCenter = bounds.x + bounds.width / 2;
      const newX = averageCenter - bounds.width / 2;
      
      if (Math.abs(element.x - newX) > 0.01) {
        get().updateElement(element.id, { x: newX });
      }
    });
  },

  alignRight: () => {
    const state = get();
    if (state.selectedElementIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // מוצא את ה-X הימני ביותר (x + width)
    const maxRight = Math.max(...selectedElements.map(el => {
      const bounds = getElementBounds(el);
      return bounds.x + bounds.width;
    }));
    
    // מעדכן את כל האלמנטים לאותו X ימני
    selectedElements.forEach(element => {
      const bounds = getElementBounds(element);
      const newX = maxRight - bounds.width;
      
      if (Math.abs(element.x - newX) > 0.01) {
        get().updateElement(element.id, { x: newX });
      }
    });
  },

  alignTop: () => {
    const state = get();
    if (state.selectedElementIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // מוצא את ה-Y הקטן ביותר
    const minY = Math.min(...selectedElements.map(el => el.y));
    
    // מעדכן את כל האלמנטים לאותו Y
    selectedElements.forEach(element => {
      if (element.y !== minY) {
        get().updateElement(element.id, { y: minY });
      }
    });
  },

  alignBottom: () => {
    const state = get();
    if (state.selectedElementIds.length < 2) return;
    
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length < 2) return;
    
    // מוצא את ה-Y התחתון ביותר (y + height)
    const maxBottom = Math.max(...selectedElements.map(el => {
      const bounds = getElementBounds(el);
      return bounds.y + bounds.height;
    }));
    
    // מעדכן את כל האלמנטים לאותו Y תחתון
    selectedElements.forEach(element => {
      const bounds = getElementBounds(element);
      const newY = maxBottom - bounds.height;
      
      if (Math.abs(element.y - newY) > 0.01) {
        get().updateElement(element.id, { y: newY });
      }
    });
  },
}));

