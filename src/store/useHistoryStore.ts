import { create } from 'zustand';
import { Element } from '../types/element';

interface HistoryState {
  past: Element[][];
  future: Element[][];
  canUndo: boolean;
  canRedo: boolean;
  
  saveState: (elements: Element[]) => void;
  undo: (currentElements: Element[]) => Element[] | null;
  redo: (currentElements: Element[]) => Element[] | null;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,
  
  saveState: (elements) => {
    const serialized = JSON.stringify(elements);
    const { past } = get();
    const lastState = past[past.length - 1];
    
    // בדיקה אם המצב השתנה
    if (lastState && JSON.stringify(lastState) === serialized) {
      return;
    }
    
    const newState = JSON.parse(serialized);
    set((state) => ({
      past: [...state.past, newState],
      future: [], // נקה את העתיד כשעושים פעולה חדשה
      canUndo: true,
      canRedo: false,
    }));
  },
  
  undo: (currentElements: Element[]) => {
    const { past } = get();
    if (past.length === 0) return null;
    
    // המצב הקודם הוא האחרון ב-past
    const previousState = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    // שמירת המצב הנוכחי ב-future
    set({
      past: newPast,
      future: [JSON.parse(JSON.stringify(currentElements)), ...get().future],
      canUndo: newPast.length > 0,
      canRedo: true,
    });
    
    return previousState;
  },
  
  redo: (currentElements: Element[]) => {
    const { future } = get();
    if (future.length === 0) return null;
    
    const nextState = future[0];
    const newFuture = future.slice(1);
    
    // שמירת המצב הנוכחי ב-past
    set((state) => ({
      past: [...state.past, JSON.parse(JSON.stringify(currentElements))],
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    }));
    
    return nextState;
  },
  
  clear: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },
}));

