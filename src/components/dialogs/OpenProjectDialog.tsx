import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '../../store';
import { getAllProjects } from '../../utils/storage';
import { ProjectSummary } from '../../types/project';

interface OpenProjectDialogProps {
  onClose: () => void;
  onOpen: (projectId: string) => void;
}

export default function OpenProjectDialog({
  onClose,
  onOpen,
}: OpenProjectDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [savedProjects, setSavedProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { openProjectFromFile } = useProjectStore();
  
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoading(true);
        const projects = await getAllProjects();
        setSavedProjects(projects);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await openProjectFromFile(file);
        onClose();
      } catch (error) {
        alert('שגיאה בטעינת הקובץ: ' + (error instanceof Error ? error.message : 'שגיאה לא ידועה'));
      }
    }
  };

  const handleOpenFromStorage = () => {
    if (selectedProjectId) {
      onOpen(selectedProjectId);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">פתיחת פרויקט</h2>
        
        <div className="space-y-4">
          {/* פתיחה מקובץ */}
          <div>
            <label className="block text-sm font-medium mb-2">פתח מקובץ JSON</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="h-px bg-gray-300 my-4" />
          
          {/* פתיחה מ-database */}
          <div>
            <label className="block text-sm font-medium mb-2">פרויקטים שמורים</label>
            {loading ? (
              <p className="text-gray-500 text-sm">טוען פרויקטים...</p>
            ) : savedProjects.length === 0 ? (
              <p className="text-gray-500 text-sm">אין פרויקטים שמורים</p>
            ) : (
              <div className="space-y-2">
                <select
                  value={selectedProjectId || ''}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">בחר פרויקט...</option>
                  {savedProjects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({new Date(project.updatedAt).toLocaleDateString('he-IL')})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleOpenFromStorage}
                  disabled={!selectedProjectId}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  פתח
                </button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

