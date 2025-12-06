# הוראות הפעלה מהירות

## הפעלה עם Docker

**הפרויקט רץ רק דרך Docker - אין צורך בהתקנת npm או Node.js מקומית!**

### דרישות

- Docker
- Docker Compose

## מצב פיתוח (מומלץ) - עם Hot Reload 🔥

**השינויים בקוד יופיעו אוטומטית ללא רסטרט או ניקוי קאש!**

```bash
# מהתיקייה הראשית
cd docker
docker-compose -f docker-compose.dev.yml up --build
```

האפליקציה תהיה זמינה ב: **http://localhost:5173**

זה כולל:
- ✅ Frontend (Vite dev server) על פורט 5173 עם **Hot Reload**
- ✅ Backend API (Express עם tsx watch) על פורט 3001 עם **Hot Reload**
- ✅ Database (SQLite ב-Docker volume `api_data`)

**כל שינוי בקוד יופיע אוטומטית בדפדפן!**

## מצב ייצור (Production)

```bash
# מהתיקייה הראשית
cd docker
docker-compose up --build
```

האפליקציה תהיה זמינה ב: **http://localhost**

זה כולל:
- ✅ Frontend (Nginx) על פורט 80
- ✅ Backend API (Express) על פורט 3001 (פנימי)
- ✅ Database (SQLite ב-Docker volume `api_data`)

### הפסקת השרת

לעצור את השרת, לחץ `Ctrl+C` בטרמינל.

לעצור ולהסיר את ה-containers:

```bash
docker-compose down
```

לעצור, להסיר containers ולהסיר volumes (מחיקת נתונים):

```bash
docker-compose down -v
```

## Database

הדאטאבייס נשמר ב-Docker volume (`api_data`) כך שהנתונים נשמרים גם אחרי עצירת ה-containers.

## הערות

- הפרויקטים נשמרים ב-Database (SQLite)
- אם השרת לא זמין, האפליקציה תשתמש ב-localStorage כ-fallback
- ניתן גם לשמור פרויקטים כקבצי JSON
- כל ה-builds והתהליכים מתבצעים בתוך Docker containers

