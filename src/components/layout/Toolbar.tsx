import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, useHistoryStore } from '../../store';
import SaveProjectDialog from '../dialogs/SaveProjectDialog';
import OpenProjectDialog from '../dialogs/OpenProjectDialog';
import { exportToPDF } from '../../utils/pdfExport';
import { loadFromDatabase } from '../../utils/storage';
import { Unit } from '../../types/element';
import { ZoomControls } from '../canvas/SVGCanvas';

interface ToolbarProps {
  zoomControlsRef?: React.MutableRefObject<ZoomControls | null>;
  zoom?: number;
}

export default function Toolbar({ zoomControlsRef, zoom = 1 }: ToolbarProps) {
  const navigate = useNavigate();
  const {
    newProject,
    undo,
    redo,
    showDimensionsTable,
    setShowDimensionsTable,
    showDimensions,
    setShowDimensions,
    currentProject,
    saveProject,
    serializeProject,
    loadProject,
    hasUnsavedChanges,
    setCreatingElementType,
    addWall,
    selectedElementIds,
    deleteElement,
    copyElement,
    pasteElement,
    getElement,
    createElement,
    clipboard,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignBottom,
    updateProjectSettings,
  } = useProjectStore();
  
  const { canUndo, canRedo } = useHistoryStore();
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);

  const handleNewProject = () => {
    if (hasUnsavedChanges()) {
      if (!confirm('יש שינויים לא שמורים. האם אתה בטוח שברצונך ליצור פרויקט חדש?')) {
        return;
      }
    }
    newProject();
    navigate('/project/new');
  };

  const handleOpen = () => {
    if (hasUnsavedChanges()) {
      if (!confirm('יש שינויים לא שמורים. האם אתה בטוח שברצונך לפתוח פרויקט אחר?')) {
        return;
      }
    }
    setShowOpenDialog(true);
  };

  const handleSave = async () => {
    const project = serializeProject();
    if (project && project.name) {
      // שמירה מהירה לפי שם קיים
      try {
        await saveProject();
        alert('הפרויקט נשמר בהצלחה!');
      } catch (error: any) {
        console.error('Error saving project:', error);
        if (error?.isFallback) {
          alert('השרת לא זמין - הפרויקט נשמר ב-localStorage בלבד.\nשים לב: הנתונים לא יישמרו אם תנקה את ה-cache של הדפדפן.');
        } else {
          alert('שגיאה בשמירת הפרויקט: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
        }
      }
    } else {
      // אין שם - פתיחת דיאלוג
      setShowSaveDialog(true);
    }
  };

  const handleSaveWithDialog = async (name: string, saveAsFile: boolean) => {
    try {
      await saveProject(name, saveAsFile);
      if (saveAsFile) {
        alert('הפרויקט נשמר כקובץ בהצלחה!');
      } else {
        alert('הפרויקט נשמר בהצלחה!');
      }
    } catch (error: any) {
      console.error('Error saving project:', error);
      if (error?.isFallback) {
        alert('השרת לא זמין - הפרויקט נשמר ב-localStorage בלבד.\nשים לב: הנתונים לא יישמרו אם תנקה את ה-cache של הדפדפן.');
      } else {
        alert('שגיאה בשמירת הפרויקט: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
      }
    }
  };

  const handleOpenFromStorage = async (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleExportPDF = async () => {
    const project = serializeProject();
    if (!project) {
      alert('אין פרויקט לייצוא');
      return;
    }
    
    try {
      await exportToPDF(project, 'front');
    } catch (error) {
      alert('שגיאה בייצוא PDF: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
    }
  };

  const handleDelete = () => {
    if (selectedElementIds.length > 0) {
      // מוחק את כל האלמנטים הנבחרים
      selectedElementIds.forEach(id => deleteElement(id));
    }
  };

  const handleCopy = () => {
    // מעתיק רק את האלמנט הראשון (כמו לפני)
    const firstSelectedId = selectedElementIds.length > 0 ? selectedElementIds[0] : null;
    if (firstSelectedId) {
      copyElement(firstSelectedId);
    }
  };

  const handlePaste = () => {
    pasteElement(20, 20);
  };

  const handleDuplicate = () => {
    const firstSelectedId = selectedElementIds.length > 0 ? selectedElementIds[0] : null;
    if (firstSelectedId) {
      const element = getElement(firstSelectedId);
      if (element) {
        const { id: _, ...elementCopy } = element;
        createElement({
          ...elementCopy,
          x: element.x + 20,
          y: element.y + 20,
          z: element.z !== undefined ? element.z + 20 : undefined,
        } as any);
      }
    }
  };

  return (
    <>
      {showSaveDialog && (
        <SaveProjectDialog
          onClose={() => setShowSaveDialog(false)}
          onSave={handleSaveWithDialog}
          currentName={currentProject?.name}
        />
      )}
      
      {showOpenDialog && (
        <OpenProjectDialog
          onClose={() => setShowOpenDialog(false)}
          onOpen={handleOpenFromStorage}
        />
      )}
      
      <div className="bg-gray-800 text-white p-2 flex items-center gap-2 shadow-lg">
      {/* כפתור חזרה לרשימה */}
      <button
        onClick={() => navigate('/')}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors flex items-center justify-center"
        title="חזרה לרשימת פרויקטים"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי פרויקט */}
      <button
        onClick={handleNewProject}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center"
        title="פרויקט חדש"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
      
      <button
        onClick={handleOpen}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors flex items-center justify-center"
        title="פתח"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </button>
      
      <button
        onClick={handleSave}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center justify-center"
        title="שמור"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          canUndo
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="Undo (Ctrl+Z)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      </button>
      
      <button
        onClick={redo}
        disabled={!canRedo}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          canRedo
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="Redo (Ctrl+Y)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי עריכה */}
      <button
        onClick={handleCopy}
        disabled={selectedElementIds.length === 0}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length > 0
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="העתק (Ctrl+C)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      
      <button
        onClick={handlePaste}
        disabled={!clipboard}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          clipboard
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="הדבק (Ctrl+V)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </button>
      
      <button
        onClick={handleDuplicate}
        disabled={selectedElementIds.length === 0}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length > 0
            ? 'bg-gray-700 hover:bg-gray-600'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="שכפל (Ctrl+D)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
      
      <button
        onClick={handleDelete}
        disabled={selectedElementIds.length === 0}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length > 0
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="מחק (Delete)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי Alignment - פעילים רק כשיש 2+ אלמנטים נבחרים */}
      <button
        onClick={alignLeft}
        disabled={selectedElementIds.length < 2}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length >= 2
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="יישר לשמאל"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8M4 18h16" />
        </svg>
      </button>
      
      <button
        onClick={alignCenter}
        disabled={selectedElementIds.length < 2}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length >= 2
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="יישר למרכז"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M8 12h8M4 18h16" />
        </svg>
      </button>
      
      <button
        onClick={alignRight}
        disabled={selectedElementIds.length < 2}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length >= 2
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="יישר לימין"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M12 12h8M4 18h16" />
        </svg>
      </button>
      
      <button
        onClick={alignTop}
        disabled={selectedElementIds.length < 2}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length >= 2
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="יישר למעלה"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 4v16M12 4v8M18 4v16" />
        </svg>
      </button>
      
      <button
        onClick={alignBottom}
        disabled={selectedElementIds.length < 2}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          selectedElementIds.length >= 2
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
        title="יישר למטה"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 20V4M12 20V12M18 20V4" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי יצירת אלמנטים */}
      <button
        onClick={() => setCreatingElementType('rectangle')}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center"
        title="הוסף קיר"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <rect x="4" y="4" width="16" height="16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>
      <button
        onClick={() => setCreatingElementType('circle')}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
        title="הוסף עיגול"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <circle cx="12" cy="12" r="10" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>
      <button
        onClick={() => setCreatingElementType('text')}
        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
        title="הוסף טקסט"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M12 6v14" />
        </svg>
      </button>
      
      <div className="h-6 w-px bg-gray-600 mx-2" />
      
      {/* כפתורי זום */}
      {zoomControlsRef && (
        <>
          <button
            onClick={() => zoomControlsRef.current?.zoomIn()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center"
            title="הגדל זום"
          >
            <span className="text-lg font-bold">+</span>
          </button>
          <button
            onClick={() => zoomControlsRef.current?.zoomOut()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center"
            title="הקטן זום"
          >
            <span className="text-lg font-bold">−</span>
          </button>
          <button
            onClick={() => zoomControlsRef.current?.zoomReset()}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors flex items-center justify-center"
            title="איפוס זום"
          >
            <span className="text-sm">⟲</span>
          </button>
          <button
            onClick={() => zoomControlsRef.current?.fitToView()}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors flex items-center justify-center"
            title="הצג את כל האלמנטים"
          >
            <span className="text-sm">📐</span>
          </button>
          <div className="px-4 py-2 bg-gray-700 rounded flex items-center justify-center text-white text-sm font-medium">
            {Math.round(zoom * 100)}%
          </div>
          <div className="h-6 w-px bg-gray-600 mx-2" />
        </>
      )}
      
      <div className="flex-1" />
      
      {/* כפתור החלפת יחידת תצוגה */}
      <button
        onClick={() => {
          const currentDisplayUnit = currentProject?.settings?.displayUnit || 'cm';
          const newUnit: Unit = currentDisplayUnit === 'm' ? 'cm' : 'm';
          updateProjectSettings({ displayUnit: newUnit });
        }}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors flex items-center justify-center text-white"
        title={`החלף יחידת תצוגה (${currentProject?.settings?.displayUnit === 'm' ? 'מטר' : 'ס"מ'} → ${currentProject?.settings?.displayUnit === 'm' ? 'ס"מ' : 'מטר'})`}
      >
        <span className="text-sm font-medium">
          {currentProject?.settings?.displayUnit === 'm' ? 'מ\'' : 'ס"מ'}
        </span>
      </button>
      
      {/* כפתור הצגת מידות */}
      <button
        onClick={() => setShowDimensions(!showDimensions)}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          showDimensions
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={showDimensions ? 'הסתר מידות' : 'הצג מידות'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
      
      {/* כפתור טבלת מידות */}
      <button
        onClick={() => setShowDimensionsTable(!showDimensionsTable)}
        className={`px-4 py-2 rounded transition-colors flex items-center justify-center ${
          showDimensionsTable
            ? 'bg-blue-500 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
        title={showDimensionsTable ? 'הסתר טבלת מידות' : 'הצג טבלת מידות'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>
      
      {/* כפתור ייצוא */}
      <button
        onClick={handleExportPDF}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors flex items-center justify-center"
        title="ייצא PDF"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
    </>
  );
}
