# מדריך פריסה - Deployment Guide

## פריסה ב-Coolify

### שלב 1: הכנת הפרויקט

1. העלה את הקוד ל-Git repository (GitHub, GitLab, וכו')
2. ודא שכל הקבצים הבאים קיימים:
   - \`Dockerfile\`
   - \`docker-compose.yml\`
   - \`.dockerignore\`
   - \`next.config.mjs\`

### שלב 2: יצירת פרויקט ב-Coolify

1. התחבר ל-Coolify dashboard
2. לחץ על "New Resource" → "Application"
3. בחר את ה-Git repository שלך
4. בחר branch (בדרך כלל \`main\` או \`master\`)

### שלב 3: הגדרת משתני סביבה

הוסף את משתני הסביבה הבאים ב-Coolify:

**חובה:**
- \`DISCORD_BOT_TOKEN\`: ה-token של הבוט מ-Discord Developer Portal
- \`SESSION_SECRET\`: מחרוזת אקראית ארוכה (לפחות 32 תווים)
- \`ADMIN_PASSWORD\`: סיסמה חזקה למערכת

**אופציונלי:**
- \`ADMIN_USERNAME\`: שם משתמש (ברירת מחדל: admin)
- \`PIPED_INSTANCE\`: כתובת Piped instance חלופית
- \`PORT\`: פורט (ברירת מחדל: 3000)

### שלב 4: הגדרות נוספות

1. **Port Mapping**: ודא ש-port 3000 ממופה
2. **Health Check**: Coolify ישתמש ב-health check המוגדר ב-Dockerfile
3. **Persistent Storage**: אם אתה רוצה לשמור cookies, הוסף volume:
   - Source: \`/app/data\`
   - Destination: נתיב במערכת הקבצים של Coolify

### שלב 5: Deploy

1. לחץ על "Deploy"
2. Coolify יבנה את ה-Docker image
3. לאחר Build מוצלח, האפליקציה תעלה אוטומטית
4. בדוק את ה-logs לוודא שהבוט התחבר בהצלחה

### שלב 6: בדיקה

1. גש לכתובת שהוקצתה על ידי Coolify
2. התחבר עם שם המשתמש והסיסמה
3. ודא שהבוט מופיע ברשימת השרתים

## פתרון בעיות נפוצות

### הבוט לא מתחבר

- ודא שה-\`DISCORD_BOT_TOKEN\` נכון
- בדוק שהבוט הוזמן לשרת הדיסקורד
- בדוק את ה-logs: \`docker logs <container-name>\`

### שגיאות audio

- ודא ש-ffmpeg מותקן (כלול ב-Dockerfile)
- בדוק שה-yt-dlp מותקן (כלול ב-Dockerfile)
- אם יש בעיות עם YouTube, נסה Piped instance אחר

### בעיות performance

- הגדל את ה-memory limit ב-Coolify
- בדוק שיש מספיק CPU resources
- שקול להשתמש ב-Redis לניהול sessions (במקום in-memory)

## עדכון הפרויקט

1. Push שינויים ל-Git repository
2. Coolify יזהה אוטומטית ויבנה מחדש
3. או: לחץ ידנית על "Redeploy" ב-Coolify

## Monitoring

- **Health Check**: \`/api/bot/health\`
- **Logs**: צפה ב-logs דרך Coolify dashboard
- **Metrics**: Coolify מספק metrics בסיסיים

## Security Best Practices

1. השתמש בסיסמאות חזקות
2. שמור את ה-\`SESSION_SECRET\` בסוד
3. עדכן את התלויות באופן קבוע
4. השתמש ב-HTTPS (Coolify מספק אוטומטית)
5. הגבל גישה לדשבורד רק למשתמשים מורשים

## Backup

לגיבוי המערכת:
1. גבה את משתני הסביבה
2. גבה את תיקיית \`/app/data\` (אם משתמש ב-persistent storage)
3. גבה את ה-Git repository

## Scale

לשיפור ביצועים:
1. הגדל resources ב-Coolify
2. שקול להפריד את הבוט מה-dashboard לשני containers
3. השתמש ב-Redis לניהול sessions
4. הוסף load balancer אם יש הרבה שרתים
