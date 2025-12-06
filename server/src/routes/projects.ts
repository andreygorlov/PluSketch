import { Router } from 'express';
import db from '../database.js';

const router = Router();

// קבלת כל הפרויקטים
router.get('/', (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT 
        p.id,
        p.name,
        p.created_at,
        p.updated_at,
        p.settings,
        COUNT(e.id) as element_count
      FROM projects p
      LEFT JOIN elements e ON p.id = e.project_id
      GROUP BY p.id
      ORDER BY p.updated_at DESC
    `).all() as Array<{
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
      settings: string;
      element_count: number;
    }>;

    res.json(projects.map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      settings: JSON.parse(p.settings),
      elementCount: p.element_count
    })));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הפרויקטים' });
  }
});

// קבלת פרויקט ספציפי
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as {
      id: string;
      name: string;
      created_at: string;
      updated_at: string;
      settings: string;
    } | undefined;
    
    if (!project) {
      return res.status(404).json({ error: 'פרויקט לא נמצא' });
    }

    const elements = db.prepare('SELECT element_data FROM elements WHERE project_id = ?')
      .all(id) as Array<{ element_data: string }>;

    res.json({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
      settings: JSON.parse(project.settings),
      elements: elements.map(row => JSON.parse(row.element_data))
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הפרויקט' });
  }
});

// יצירת פרויקט חדש
router.post('/', (req, res) => {
  try {
    const { id, name, createdAt, updatedAt, settings, elements } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: 'id ו-name נדרשים' });
    }

    const insertProject = db.prepare(`
      INSERT INTO projects (id, name, created_at, updated_at, settings)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertElement = db.prepare(`
      INSERT INTO elements (id, project_id, element_data)
      VALUES (?, ?, ?)
    `);

    const insertMany = db.transaction((projectData, elementsData) => {
      insertProject.run(
        projectData.id,
        projectData.name,
        projectData.createdAt,
        projectData.updatedAt,
        JSON.stringify(projectData.settings)
      );

      if (elementsData && Array.isArray(elementsData)) {
        for (const element of elementsData) {
          insertElement.run(
            element.id,
            projectData.id,
            JSON.stringify(element)
          );
        }
      }
    });

    insertMany(
      { id, name, createdAt, updatedAt, settings: settings || {} },
      elements || []
    );

    res.status(201).json({ id, name, createdAt, updatedAt, settings, elements: elements || [] });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'שגיאה ביצירת הפרויקט' });
  }
});

// עדכון פרויקט
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, updatedAt, settings, elements } = req.body;

    // בדיקה אם הפרויקט קיים
    const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id) as { id: string } | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'פרויקט לא נמצא' });
    }

    const updateProject = db.prepare(`
      UPDATE projects 
      SET name = ?, updated_at = ?, settings = ?
      WHERE id = ?
    `);

    const deleteElements = db.prepare('DELETE FROM elements WHERE project_id = ?');
    const insertElement = db.prepare(`
      INSERT INTO elements (id, project_id, element_data)
      VALUES (?, ?, ?)
    `);

    const updateTransaction = db.transaction((projectData, elementsData) => {
      updateProject.run(
        projectData.name,
        projectData.updatedAt,
        JSON.stringify(projectData.settings),
        id
      );

      // מחיקת אלמנטים קיימים והוספת חדשים
      deleteElements.run(id);

      if (elementsData && Array.isArray(elementsData)) {
        for (const element of elementsData) {
          insertElement.run(
            element.id,
            id,
            JSON.stringify(element)
          );
        }
      }
    });

    updateTransaction(
      { name, updatedAt, settings },
      elements || []
    );

    res.json({ id, name, updatedAt, settings, elements: elements || [] });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'שגיאה בעדכון הפרויקט' });
  }
});

// מחיקת פרויקט
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const deleteProject = db.prepare('DELETE FROM projects WHERE id = ?');
    const result = deleteProject.run(id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'פרויקט לא נמצא' });
    }

    res.json({ message: 'פרויקט נמחק בהצלחה' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הפרויקט' });
  }
});

export default router;

