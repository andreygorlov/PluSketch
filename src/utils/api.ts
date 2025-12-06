import { Project, ProjectSummary } from '../types/project';

// בפיתוח, Vite proxy מטפל ב-/api
// בייצור (Docker), Nginx מפרוקסי ל-/api
// ניתן גם להגדיר VITE_API_URL למקרה של הרצה נפרדת
function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL;
  
  // אם אין הגדרה, נשתמש ב-proxy של Vite
  if (!envUrl) {
    return '/api';
  }
  
  // אם יש כתובת עם hostname של Docker (api:3001), נמיר ל-localhost בדפדפן
  // זה קורה כשיש VITE_API_URL=http://api:3001 אבל הדפדפן רץ מחוץ ל-Docker
  if (envUrl.includes('api:') || envUrl.includes('://api')) {
    // נמיר ל-localhost:3001 או נשתמש ב-proxy של Vite
    // בדרך כלל Vite proxy יטפל ב-/api, אז נחזיר '/api'
    return '/api';
  }
  
  // אם זו כתובת רגילה (localhost, IP, וכו'), נשתמש בה
  return envUrl;
}

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT = 10000; // 10 שניות

// Cache בסיסי - נשמור את התוצאה האחרונה
let projectsCache: { data: ProjectSummary[]; timestamp: number } | null = null;
const CACHE_DURATION = 5000; // 5 שניות

// Cache לטעינת פרויקטים - למניעת בקשות כפולות
const projectLoadCache = new Map<string, Promise<Project | null>>();

// יצירת AbortController עם timeout
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const timeoutController = createTimeoutController(REQUEST_TIMEOUT);
  
  // אם יש signal קיים, נאזין גם לו - אם הוא מתבטל, נבטל את ה-timeout
  if (options?.signal) {
    options.signal.addEventListener('abort', () => {
      if (!timeoutController.signal.aborted) {
        timeoutController.abort();
      }
    });
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      signal: timeoutController.signal, // נשתמש ב-timeout signal
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'שגיאה לא ידועה' }));
      const errorMessage = error.error || `HTTP error! status: ${response.status}`;
      const apiError = new Error(errorMessage) as Error & { status?: number };
      apiError.status = response.status; // נשמור את קוד הסטטוס כדי שנוכל לזהות 404
      throw apiError;
    }

    return response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // בדיקה אם זה timeout או ביטול ידני
      if (timeoutController.signal.aborted && (!options?.signal || !options.signal.aborted)) {
        throw new Error('הבקשה ארכה יותר מדי זמן - השרת לא מגיב');
      }
      throw error;
    }
    throw error;
  }
}

export async function getAllProjects(forceRefresh = false): Promise<ProjectSummary[]> {
  // בדיקה אם יש cache תקף
  if (!forceRefresh && projectsCache) {
    const age = Date.now() - projectsCache.timestamp;
    if (age < CACHE_DURATION) {
      return projectsCache.data;
    }
  }

  try {
    const projects = await fetchAPI<ProjectSummary[]>('/projects');
    // עדכון cache
    projectsCache = { data: projects, timestamp: Date.now() };
    return projects;
  } catch (error) {
    console.error('Error fetching projects:', error);
    // אם יש cache ישן, נחזיר אותו
    if (projectsCache) {
      console.warn('Using cached projects due to server error');
      return projectsCache.data;
    }
    // Fallback ל-localStorage אם השרת לא זמין
    return getLocalStorageFallback();
  }
}

// פונקציה לאיפוס cache (למשל אחרי שמירה)
export function clearProjectsCache(): void {
  projectsCache = null;
}

export async function getProject(id: string): Promise<Project | null> {
  // אם יש כבר בקשה בטעינה, נחזיר את אותה Promise
  if (projectLoadCache.has(id)) {
    return projectLoadCache.get(id)!;
  }

  const loadPromise = (async () => {
    try {
      const project = await fetchAPI<Project>(`/projects/${id}`);
      projectLoadCache.delete(id); // נסיר מה-cache אחרי הטעינה
      return project;
    } catch (error: any) {
      projectLoadCache.delete(id); // נסיר מה-cache גם במקרה של שגיאה
      // אם זה 404, נחזיר null כדי שה-caller יוכל לטפל ב-fallback
      if (error?.status === 404 || error?.message?.includes('404') || error?.message?.includes('לא נמצא')) {
        // לא נדפיס שגיאה ל-console עבור 404 - זה נורמלי כשאין פרויקט בשרת
        return null; // נחזיר null כדי שה-caller יוכל לבדוק localStorage
      }
      console.error('Error fetching project:', error);
      // עבור שגיאות אחרות, ננסה localStorage כגיבוי
      const localProject = getLocalStorageProject(id);
      if (localProject) {
        console.log('Found project in localStorage as fallback');
        return localProject;
      }
      // אם גם localStorage לא עובד, נזרוק את השגיאה
      throw error;
    }
  })();

  projectLoadCache.set(id, loadPromise);
  return loadPromise;
}

export async function saveProject(project: Project): Promise<Project> {
  try {
    // ננסה קודם PUT (עדכון) - אם זה נכשל עם 404, ננסה POST (יצירה)
    try {
      return await fetchAPI<Project>(`/projects/${project.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: project.name,
          updatedAt: project.updatedAt,
          settings: project.settings,
          elements: project.elements,
        }),
      });
    } catch (updateError: any) {
      // אם זה 404, ננסה POST (יצירה)
      if (updateError.message?.includes('404') || updateError.message?.includes('לא נמצא')) {
        return await fetchAPI<Project>('/projects', {
          method: 'POST',
          body: JSON.stringify(project),
        });
      }
      // אם זה שגיאה אחרת, נזרוק אותה
      throw updateError;
    }
  } catch (error) {
    console.error('Error saving project to server:', error);
    // Fallback ל-localStorage
    try {
      saveToLocalStorageFallback(project);
      // נזרוק שגיאה מיוחדת כדי שהקוד הקורא יוכל להציג הודעה למשתמש
      const fallbackError = new Error('השרת לא זמין - הפרויקט נשמר ב-localStorage בלבד');
      (fallbackError as any).isFallback = true;
      throw fallbackError;
    } catch (localStorageError) {
      // גם localStorage נכשל - זריקת שגיאה אמיתית
      throw new Error('שגיאה בשמירת הפרויקט: השרת לא זמין וגם localStorage נכשל');
    }
  }
}

export async function deleteProject(id: string): Promise<void> {
  try {
    await fetchAPI(`/projects/${id}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    // Fallback ל-localStorage
    deleteFromLocalStorageFallback(id);
  }
}

// Fallback functions ל-localStorage
function getLocalStorageFallback(): ProjectSummary[] {
  try {
    const data = localStorage.getItem('plusketch_projects');
    const projects = data ? Object.values(JSON.parse(data)) as Project[] : [];
    // המרה מ-Project ל-ProjectSummary
    return projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      settings: p.settings,
      elementCount: p.elements.length
    }));
  } catch {
    return [];
  }
}

function getLocalStorageProject(id: string): Project | null {
  try {
    const data = localStorage.getItem('plusketch_projects');
    const projects = data ? JSON.parse(data) : {};
    return projects[id] || null;
  } catch {
    return null;
  }
}

function saveToLocalStorageFallback(project: Project): void {
  try {
    const existing = getLocalStorageFallback();
    const projectsObj: Record<string, Project> = {};
    existing.forEach(p => { projectsObj[p.id] = p; });
    projectsObj[project.id] = project;
    localStorage.setItem('plusketch_projects', JSON.stringify(projectsObj));
  } catch (error) {
    console.error('Failed to save to localStorage fallback:', error);
  }
}

function deleteFromLocalStorageFallback(id: string): void {
  try {
    const existing = getLocalStorageFallback();
    const filtered = existing.filter(p => p.id !== id);
    const projectsObj: Record<string, Project> = {};
    filtered.forEach(p => { projectsObj[p.id] = p; });
    localStorage.setItem('plusketch_projects', JSON.stringify(projectsObj));
  } catch (error) {
    console.error('Failed to delete from localStorage fallback:', error);
  }
}

