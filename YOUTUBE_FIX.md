# פתרון בעיית YouTube Bot Detection

## הבעיה
YouTube חוסם bots ודורש authentication עם "Sign in to confirm you're not a bot".

## הפתרון שיושם
החלפתי את play-dl ב-**@distube/ytdl-core** - fork מתקדם של ytdl-core שמיועד במיוחד לDiscord bots ועוקף את חסימות YouTube.

### למה @distube/ytdl-core?
- **מתוחזק באופן פעיל** - מתעדכן כל הזמן כדי לעקוף חסימות חדשות של YouTube
- **מיועד לDiscord bots** - חלק מהספרייה DisTube הפופולרית
- **עובד ללא cookies** - משתמש בטכניקות מתקדמות לעקיפת bot detection
- **תמיכה מלאה ב-seek** - אפשר לדלג לכל נקודה בשיר
- **איכות שמע גבוהה** - תמיכה ב-highestaudio format

### אם זה עדיין לא עובד
אם YouTube עדיין חוסם, יש שתי אפשרויות:

#### אפשרות 1: YouTube Data API v3 (מומלץ)
1. לך ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש
3. הפעל את YouTube Data API v3
4. צור API key
5. הוסף את ה-API key למשתני הסביבה: `YOUTUBE_API_KEY=your_key_here`

**יתרונות:**
- חינמי עד 10,000 requests ליום
- אמין ויציב
- לא נחסם על ידי YouTube

#### אפשרות 2: Proxy/VPN
הוסף proxy למשתני הסביבה:
\`\`\`
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
\`\`\`

### מה השתנה בקוד
- הוספתי headers מתקדמים שמחקים browser אמיתי
- שימוש ב-highestaudio quality
- highWaterMark גבוה לביצועים טובים יותר
- תמיכה מלאה ב-seek עם begin parameter
