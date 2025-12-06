import { useEffect } from 'react';
import { useHistoryStore, useProjectStore } from '../store';

export function useKeyboard() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // בדיקה אם המשתמש מקליד בתוך input או textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // אם זה input, לא נטפל בקיצורים
      if (isInput) return;
      
      const projectStore = useProjectStore.getState();
      
      // Ctrl+Z או Cmd+Z (Mac) - Undo (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        projectStore.undo();
        return;
      }
      
      // Ctrl+Y או Ctrl+Shift+Z - Redo (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if (
        ((e.ctrlKey || e.metaKey) && e.code === 'KeyY') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
      ) {
        e.preventDefault();
        e.stopPropagation();
        projectStore.redo();
        return;
      }
    };

    // שימוש ב-capture כדי לתפוס את האירועים מוקדם יותר
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // ריק - לא תלוי ב-dependencies
}

