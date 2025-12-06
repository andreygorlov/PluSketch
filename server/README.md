# Plusketch Server

Backend server עם SQLite database לניהול פרויקטים.

## התקנה

```bash
cd server
npm install
```

## הרצה

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

השרת ירוץ על פורט 3001 (או לפי משתנה הסביבה PORT).

## Database

הדאטאבייס נשמר ב-`data/plusketch.db` (נוצר אוטומטית).

## API Endpoints

- `GET /api/projects` - קבלת כל הפרויקטים
- `GET /api/projects/:id` - קבלת פרויקט ספציפי
- `POST /api/projects` - יצירת פרויקט חדש
- `PUT /api/projects/:id` - עדכון פרויקט
- `DELETE /api/projects/:id` - מחיקת פרויקט
- `GET /api/health` - בדיקת תקינות השרת


