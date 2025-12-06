# PlusKetch - אפליקציית שרטוט חללים

אפליקציית ווב מקצועית ליצירה ועריכה של שרטוטי חללים וקירות, עם שתי תצוגות: מבט חזית ומבט על.

## תכונות עיקריות

- **מבט חזית**: יצירה ועריכה של אלמנטים (מלבנים, עיגולים, טקסט) דרך טופס
- **מבט על**: הזזה וסיבוב של אלמנטים, ללא אפשרות יצירה חדשה
- **מידות**: הצגת מידות ליד כל אלמנט, טבלת מידות מפורטת
- **יחידות מידה**: תמיכה בס"מ ומטר
- **רשת**: רשת נראית עם אפשרות Snap to Grid
- **שמירה וטעינה**: שמירה ב-Database (SQLite) עם API, עם fallback ל-localStorage
- **ייצוא PDF**: יצירת קובץ PDF של השרטוט עם טבלת מידות
- **Undo/Redo**: ביטול וביצוע מחדש עם קיצורי מקלדת (Ctrl+Z, Ctrl+Y)

## טכנולוגיות

### Frontend
- React 18 + TypeScript
- Zustand (State Management)
- Tailwind CSS
- SVG (Rendering)
- jsPDF (PDF Export)
- Vite (Build Tool)

### Backend
- Express.js
- SQLite (better-sqlite3)
- TypeScript

### Deployment
- Docker + Nginx

## התקנה והרצה

הפרויקט מוגדר לרוץ דרך Docker בלבד - **אין צורך בהתקנת npm או Node.js מקומית!**

### דרישות

- Docker
- Docker Compose

### מצב פיתוח (מומלץ לפיתוח) - עם Hot Reload

**השינויים בקוד יופיעו אוטומטית ללא רסטרט!**

```bash
# מהתיקייה הראשית של הפרויקט
cd docker
docker-compose -f docker-compose.dev.yml up --build
```

או מהתיקייה הראשית:

```bash
docker-compose -f docker/docker-compose.dev.yml up --build
```

זה יריץ:
- **Backend API** על פורט 3001 עם `tsx watch` (hot reload)
- **Frontend** על פורט 5173 עם Vite dev server (hot reload)
- **Database** נשמר ב-Docker volume (`api_data`)

האפליקציה תהיה זמינה ב: **http://localhost:5173**

**יתרונות:**
- ✅ שינויים בקוד מופיעים אוטומטית ללא רסטרט
- ✅ אין צורך לנקות קאש
- ✅ Hot reload מלא ל-frontend ו-backend
- ✅ הקוד המקומי מחובר ישירות ל-containers

### מצב ייצור (Production)

```bash
# מהתיקייה הראשית של הפרויקט
cd docker
docker-compose up --build
```

או מהתיקייה הראשית:

```bash
docker-compose -f docker/docker-compose.yml up --build
```

זה יריץ:
- **Backend API** על פורט 3001 (פנימי)
- **Frontend** על פורט 80 (נגיש דרך Nginx)
- **Database** נשמר ב-Docker volume (`api_data`)

האפליקציה תהיה זמינה ב: **http://localhost**

### הרצה עם Docker ישירות

אם אתה מעדיף להריץ את השירותים בנפרד:

```bash
# Build ו-run של Backend
docker build -f docker/Dockerfile.server -t plusketch-api .
docker run -p 3001:3001 -v plusketch_data:/app/data plusketch-api

# Build ו-run של Frontend (בטרמינל נפרד)
docker build -f docker/Dockerfile -t plusketch-web .
docker run -p 80:80 plusketch-web
```

### הערות

- ה-Database נשמר ב-Docker volume (`api_data`), כך שהנתונים לא יאבדו בעת הפעלה מחדש
- Nginx מפרוקסי את כל הבקשות ל-`/api` לשרת ה-backend (במצב ייצור)
- אין צורך בהגדרת משתני סביבה - הכל מוגדר אוטומטית ב-Docker
- כל ה-builds והתהליכים מתבצעים בתוך Docker containers
- **לפיתוח**: השתמש ב-`docker-compose.dev.yml` ל-hot reload
- **לייצור**: השתמש ב-`docker-compose.yml` ל-build מיטבי

## שימוש

1. **יצירת אלמנט חדש** (במבט חזית):
   - לחץ על משטח השרטוט
   - מלא את הטופס עם הפרטים
   - לחץ "צור"

2. **עריכת אלמנט**:
   - לחץ על אלמנט לבחירה
   - ערוך דרך ה-Sidebar

3. **הזזה וסיבוב** (במבט על):
   - לחץ וגרור אלמנט להזזה
   - לחץ על העיגול הכחול וגרור לסיבוב

4. **שמירה**:
   - לחץ "שמור" לשמירה אוטומטית
   - הפרויקט יישמר ב-Database (SQLite)
   - ניתן גם לשמור כקובץ JSON

5. **ייצוא PDF**:
   - לחץ "ייצא PDF"
   - הקובץ יכלול את השרטוט והמידות

## מבנה הפרויקט

```
src/                    # Frontend
├── components/
│   ├── layout/      # App, Toolbar, Sidebar
│   ├── views/       # FrontView, TopView
│   ├── canvas/      # SVGCanvas, Grid, ElementRenderer
│   ├── forms/       # ElementForm, ElementEditor
│   ├── dimensions/  # DimensionsTable, DimensionLabel
│   └── dialogs/     # SaveDialog, LoadDialog
├── store/           # Zustand stores
├── types/           # TypeScript types
├── utils/           # Helper functions (API, storage)
├── hooks/           # Custom hooks
└── constants/       # Default values

server/                # Backend
├── src/
│   ├── database.ts  # SQLite database setup
│   ├── routes/      # API routes
│   └── index.ts     # Express server
└── data/            # Database files (created automatically)
```

## רישיון

MIT

