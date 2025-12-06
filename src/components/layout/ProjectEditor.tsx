import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../store';
import { loadFromDatabase } from '../../utils/storage';
import { useKeyboard } from '../../hooks/useKeyboard';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import FrontView from '../views/FrontView';
import DimensionsTable from '../dimensions/DimensionsTable';
import { ZoomControls } from '../canvas/SVGCanvas';

export default function ProjectEditor() {
  // הפעלת קיצורי מקלדת
  useKeyboard();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { 
    currentProject, 
    showDimensionsTable, 
    newProject, 
    loadProject,
    loadProjectById,
    selectedElementId,
    selectedElementIds,
    copyElement,
    pasteElement,
    deleteElement,
    selectElement,
    setShowDimensionsTable,
    elements,
    createElement,
    serializeProject,
    saveProject,
    hasUnsavedChanges
  } = useProjectStore();

  // טיפול בקיצורי מקלדת - Copy, Paste, Cut, Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // בדיקה אם המשתמש מקליד בתוך input או textarea
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // אם זה input, לא נטפל בקיצורים
      if (isInput) return;
      
      const store = useProjectStore.getState();
      const currentSelectedId = store.selectedElementIds.length > 0 ? store.selectedElementIds[0] : null;
      
      // Ctrl+C - Copy (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC' && !e.shiftKey) {
        // מונעים את ההתנהגות הדיפולטיבית תמיד (גם אם אין אלמנט נבחר)
        // כדי למנוע העתקת טקסט מהדף
        e.preventDefault();
        e.stopPropagation();
        if (currentSelectedId) {
          store.copyElement(currentSelectedId);
        }
        return;
      }
      
      // Ctrl+V - Paste (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV' && !e.shiftKey) {
        // מונעים את ההתנהגות הדיפולטיבית תמיד
        e.preventDefault();
        e.stopPropagation();
        store.pasteElement();
        return;
      }
      
      // Delete או Backspace (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const selectedIds = store.selectedElementIds;
        if (selectedIds.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          // מוחק את כל האלמנטים הנבחרים
          selectedIds.forEach(id => store.deleteElement(id));
        }
        return;
      }
      
      // ESC - Deselect (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if (e.code === 'Escape') {
        if (currentSelectedId) {
          e.preventDefault();
          e.stopPropagation();
          store.selectElement(null);
        }
        return;
      }
      
      // Ctrl+D - Duplicate (שכפול מהיר)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyD' && !e.shiftKey) {
        if (currentSelectedId) {
          e.preventDefault();
          e.stopPropagation();
          const element = store.getElement(currentSelectedId);
          if (element) {
            const { id: _, ...elementCopy } = element;
            store.createElement({
              ...elementCopy,
              x: element.x + 20,
              y: element.y + 20,
              z: element.z !== undefined ? element.z + 20 : undefined,
            } as any);
          }
        }
        return;
      }
      
      // Ctrl+A - Select All
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyA' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const allElements = store.elements;
        if (allElements.length > 0) {
          // בוחר את כל האלמנטים
          allElements.forEach((el, index) => {
            if (index === 0) {
              // הראשון - בחירה רגילה
              store.selectElement(el.id, false);
            } else {
              // השאר - multi-select
              store.selectElement(el.id, true);
            }
          });
        }
        return;
      }
      
      // Ctrl+N - New Project
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyN' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (store.hasUnsavedChanges()) {
          if (confirm('יש שינויים לא שמורים. האם אתה בטוח שברצונך ליצור פרויקט חדש?')) {
            store.newProject();
            navigate('/project/new');
          }
        } else {
          store.newProject();
          navigate('/project/new');
        }
        return;
      }
      
      // Ctrl+S - Save Project (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        const project = store.serializeProject();
        if (project) {
          store.saveProject();
        }
        return;
      }
      
      // F - Toggle Front/Top View (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if (e.code === 'KeyF' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        store.setViewType(store.viewType === 'front' ? 'top' : 'front');
        return;
      }
      
      // H - Toggle Dimensions Table (שימוש ב-e.code כדי שיעבוד בכל שפה)
      if (e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        store.setShowDimensionsTable(!store.showDimensionsTable);
        return;
      }
    };

    // שימוש ב-capture phase כדי לתפוס את האירועים מוקדם יותר
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []); // ריק - לא תלוי ב-dependencies

  useEffect(() => {
    // נמנע מטעינות כפולות - בודקים אם הפרויקט כבר נטען
    if (projectId === 'new') {
      // יצירת פרויקט חדש
      if (!currentProject || currentProject.id !== 'new') {
        newProject();
      }
      return;
    }
    
    if (!projectId) {
      return;
    }

    // אם הפרויקט כבר נטען עם אותו ID, לא נטען שוב
    if (currentProject && currentProject.id === projectId) {
      return;
    }

    const loadProjectData = async () => {
      // טעינת פרויקט קיים
      try {
        await loadProjectById(projectId);
      } catch (error) {
        console.error('Error loading project:', error);
        // אם הפרויקט לא נמצא, מעבר לדף הבית
        navigate('/');
      }
    };

    loadProjectData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]); // רק projectId - נמנע מריצות כפולות

  // עדכון URL כשהפרויקט נשמר (במיוחד כשפרויקט חדש נשמר לראשונה)
  useEffect(() => {
    if (currentProject && currentProject.id) {
      // אם זה פרויקט חדש שנשמר, או אם ה-ID השתנה
      if (projectId === 'new' || (projectId && projectId !== currentProject.id)) {
        navigate(`/project/${currentProject.id}`, { replace: true });
      }
    }
  }, [currentProject, projectId, navigate]);

  // מניעת זום דיפולטיבי על הסיידבר והטולבאר
  const sidebarRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const zoomControlsRef = useRef<ZoomControls | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      
      // בודקים אם אנחנו בקנבס (SVG)
      const isInCanvas = target.closest('svg') !== null;
      
      // אם זה גלגלת עם Ctrl (זום דיפולטיבי של הדפדפן), נמנע אותו מחוץ לקנבס
      if (e.ctrlKey || e.metaKey) {
        if (!isInCanvas) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener('wheel', handleWheel, { capture: true } as any);
  }, []);

  return (
      <div className="flex flex-col h-screen bg-gray-50">
      <div ref={toolbarRef}>
        <Toolbar zoomControlsRef={zoomControlsRef} zoom={zoom} />
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className={`flex flex-col flex-1 overflow-hidden ${showDimensionsTable ? 'h-full' : ''}`}>
          <div ref={canvasContainerRef} className="flex-1 overflow-hidden">
            <FrontView zoomControlsRef={zoomControlsRef} onZoomChange={setZoom} />
          </div>
          {showDimensionsTable && (
            <div className="h-64 border-t border-gray-300 bg-white overflow-hidden">
              <div className="h-full p-4 overflow-auto">
                <DimensionsTable />
              </div>
            </div>
          )}
        </div>
        <div ref={sidebarRef}>
          <Sidebar />
        </div>
      </div>
    </div>
  );
}

