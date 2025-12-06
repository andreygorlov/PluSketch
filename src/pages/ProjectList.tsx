import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllProjects } from '../utils/storage';
import { ProjectSummary } from '../types/project';
import { useProjectStore } from '../store';

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { newProject } = useProjectStore();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const allProjects = await getAllProjects();
      setProjects(allProjects);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    newProject();
    navigate('/project/new');
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">הפרויקטים שלי</h1>
          <button
            onClick={handleCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            פרויקט חדש
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500">טוען פרויקטים...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">אין פרויקטים עדיין</p>
            <button
              onClick={handleCreateNew}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              צור פרויקט ראשון
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => handleOpenProject(project.id)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold mb-2">{project.name}</h2>
                <p className="text-sm text-gray-500 mb-4">
                  {project.elementCount} אלמנטים
                </p>
                <div className="text-xs text-gray-400">
                  עודכן: {new Date(project.updatedAt).toLocaleDateString('he-IL')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

