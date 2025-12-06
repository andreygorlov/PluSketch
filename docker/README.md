# Docker Setup

הפרויקט כולל הגדרת Docker מלאה עם Frontend ו-Backend.

## מצב פיתוח (Development) - עם Hot Reload 🔥

**מומלץ לפיתוח - השינויים בקוד יופיעו אוטומטית!**

```bash
docker-compose -f docker-compose.dev.yml up --build
```

זה יריץ:
- **Frontend** (Vite dev server) על פורט 5173 עם **Hot Reload**
- **Backend API** (Express עם tsx watch) על פורט 3001 עם **Hot Reload**
- **Database** (SQLite) ב-Docker volume

האפליקציה תהיה זמינה ב: **http://localhost:5173**

**כל שינוי בקוד יופיע אוטומטית ללא רסטרט!**

## מצב ייצור (Production)

```bash
docker-compose up --build
```

זה יריץ:
- **Frontend** (Nginx) על פורט 80
- **Backend API** (Express) על פורט 3001 (פנימי)
- **Database** (SQLite) ב-Docker volume

האפליקציה תהיה זמינה ב: **http://localhost**

## מבנה

### Production
- `Dockerfile` - Frontend build עם Nginx
- `Dockerfile.server` - Backend API server
- `docker-compose.yml` - הגדרת כל השירותים לייצור
- `nginx.conf` - הגדרת Nginx עם proxy ל-API

### Development
- `Dockerfile.dev` - Frontend עם Vite dev server
- `Dockerfile.server.dev` - Backend עם tsx watch
- `docker-compose.dev.yml` - הגדרת כל השירותים לפיתוח עם volumes

## Volumes

הדאטאבייס נשמר ב-Docker volume `api_data` כך שהנתונים לא יאבדו בעת הפעלה מחדש.

במצב פיתוח, הקוד המקומי מחובר דרך volumes כך שכל שינוי בקוד יופיע אוטומטית.

## API

- **Production**: ה-API זמין דרך Nginx proxy ב-`/api/*`
- **Development**: ה-API זמין ישירות על פורט 3001, ו-Vite proxy מטפל ב-`/api/*`

