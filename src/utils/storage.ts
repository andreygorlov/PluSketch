import { Project, ProjectSummary } from '../types/project';
import { getAllProjects as getAllProjectsAPI, getProject as getProjectAPI, saveProject as saveProjectAPI, deleteProject as deleteProjectAPI, clearProjectsCache } from './api';

const STORAGE_KEY = 'plusketch_projects';
const RECENT_KEY = 'plusketch_recent';

// פונקציות API - משתמשות ב-database
export async function saveToDatabase(project: Project): Promise<void> {
  try {
    await saveProjectAPI(project);
    
    // איפוס cache אחרי שמירה
    clearProjectsCache();
    
    // עדכון רשימת פרויקטים אחרונים
    const recent = getRecentProjects();
    const filtered = recent.filter(id => id !== project.id);
    filtered.unshift(project.id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10)));
  } catch (error: any) {
    console.error('Failed to save to database:', error);
    // אם זה fallback ל-localStorage, נזרוק את השגיאה כדי שהקוד הקורא יוכל להציג הודעה
    if (error?.isFallback) {
      // עדכון רשימת פרויקטים אחרונים גם ב-localStorage
      const recent = getRecentProjects();
      const filtered = recent.filter(id => id !== project.id);
      filtered.unshift(project.id);
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10)));
      throw error; // נזרוק את השגיאה כדי שהקוד הקורא יוכל להציג הודעה
    }
    // שגיאה אחרת - ננסה localStorage כגיבוי
    console.warn('Falling back to localStorage');
    try {
      saveToLocalStorage(project);
      // עדכון רשימת פרויקטים אחרונים
      const recent = getRecentProjects();
      const filtered = recent.filter(id => id !== project.id);
      filtered.unshift(project.id);
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10)));
      // נזרוק שגיאה עם הודעה שהשמירה נעשתה ב-localStorage
      const fallbackError = new Error('השרת לא זמין - הפרויקט נשמר ב-localStorage בלבד');
      (fallbackError as any).isFallback = true;
      throw fallbackError;
    } catch (localStorageError) {
      // גם localStorage נכשל - זריקת שגיאה אמיתית
      throw new Error('שגיאה בשמירת הפרויקט: השרת לא זמין וגם localStorage נכשל');
    }
  }
}

export async function loadFromDatabase(id: string): Promise<Project | null> {
  // ננסה לטעון מהשרת קודם
  try {
    const project = await getProjectAPI(id);
    if (project) {
      return project;
    }
    // אם הפרויקט null (לא נמצא בשרת), נבדוק localStorage
  } catch (error: any) {
    // אם זה 404, זה בסדר - נמשיך ל-localStorage
    // עבור שגיאות אחרות, נרשום לוג אבל נמשיך
    if (error?.status !== 404 && error?.message && !error.message.includes('404')) {
      console.error('Failed to load from database:', error);
    }
  }
  
  // נבדוק localStorage אם הפרויקט לא נמצא בשרת
  const localProject = loadFromLocalStorage(id);
  if (localProject) {
    console.log(`Loaded project ${id} from localStorage (not found on server)`);
    return localProject;
  }
  
  return null;
}

export async function getAllProjects(): Promise<ProjectSummary[]> {
  try {
    return await getAllProjectsAPI();
  } catch (error) {
    console.error('Failed to load projects from database:', error);
    // Fallback ל-localStorage
    const projects = getLocalStorageProjects();
    return Object.values(projects).map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      settings: p.settings,
      elementCount: p.elements.length
    }));
  }
}

export async function deleteFromDatabase(id: string): Promise<void> {
  try {
    await deleteProjectAPI(id);
    
    // איפוס cache אחרי מחיקה
    clearProjectsCache();
    
    const recent = getRecentProjects();
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.filter(pid => pid !== id)));
  } catch (error) {
    console.error('Failed to delete from database:', error);
    throw error;
  }
}

// פונקציות fallback ל-localStorage (למקרה שהשרת לא זמין)
export function saveToLocalStorage(project: Project): void {
  try {
    const existing = getLocalStorageProjects();
    existing[project.id] = project;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    
    // עדכון רשימת פרויקטים אחרונים
    const recent = getRecentProjects();
    const filtered = recent.filter(id => id !== project.id);
    filtered.unshift(project.id);
    localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 10)));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function loadFromLocalStorage(id: string): Project | null {
  try {
    const projects = getLocalStorageProjects();
    return projects[id] || null;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

export function getLocalStorageProjects(): Record<string, Project> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to parse localStorage:', error);
    return {};
  }
}

export function deleteFromLocalStorage(id: string): void {
  try {
    const projects = getLocalStorageProjects();
    delete projects[id];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    
    const recent = getRecentProjects();
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.filter(pid => pid !== id)));
  } catch (error) {
    console.error('Failed to delete from localStorage:', error);
  }
}

export async function saveToFile(project: Project): Promise<void> {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name || 'project'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadFromFile(file: File): Promise<Project> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string) as Project;
        resolve(project);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

export function getRecentProjects(): string[] {
  try {
    const data = localStorage.getItem(RECENT_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Failed to parse recent projects:', error);
    return [];
  }
}

