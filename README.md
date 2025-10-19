# בוט מוזיקה לדיסקורד - Discord Music Bot Dashboard

מערכת מלאה לניהול בוט מוזיקה בדיסקורד עם דשבורד ניהול מתקדם.

## תכונות

- 🎵 נגן מוזיקה מלא עם תמיכה ב-YouTube דרך Piped
- 🔐 מערכת אימות מאובטחת
- 🎛️ ממשק ניהול בעברית עם RTL
- 🔄 עדכונים בזמן אמת דרך Server-Sent Events
- 📋 ניהול תור השמעה עם loop ו-shuffle
- 🔊 שליטה בווליום ובמצבי השמעה
- 🔒 נעילת ערוצי קול
- 🐳 Docker ready לפריסה קלה ב-Coolify

## דרישות מקדימות

- Node.js 20+
- Docker & Docker Compose (לפריסה)
- Discord Bot Token
- ffmpeg
- yt-dlp

## התקנה מקומית

1. שכפל את הפרויקט:
\`\`\`bash
git clone <repository-url>
cd music-bot-dashboard
\`\`\`

2. התקן תלויות:
\`\`\`bash
npm install
\`\`\`

3. צור קובץ \`.env\`:
\`\`\`bash
cp .env.example .env
\`\`\`

4. ערוך את \`.env\` והוסף את ה-Discord Bot Token שלך:
\`\`\`env
DISCORD_BOT_TOKEN=your_bot_token_here
SESSION_SECRET=your_random_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
\`\`\`

5. הרץ את הפרויקט:
\`\`\`bash
npm run dev
\`\`\`

6. פתח דפדפן בכתובת: http://localhost:3000

## פריסה עם Docker

### שימוש ב-Docker Compose

1. צור קובץ \`.env\` עם המשתנים הנדרשים
2. הרץ:
\`\`\`bash
docker-compose up -d
\`\`\`

### פריסה ב-Coolify

1. צור פרויקט חדש ב-Coolify
2. חבר את ה-Git repository
3. הגדר את משתני הסביבה:
   - \`DISCORD_BOT_TOKEN\`
   - \`SESSION_SECRET\`
   - \`ADMIN_USERNAME\`
   - \`ADMIN_PASSWORD\`
4. Coolify יבנה וידפלוי אוטומטית

## משתני סביבה

| משתנה | תיאור | ברירת מחדל |
|-------|-------|------------|
| \`DISCORD_BOT_TOKEN\` | Discord Bot Token (חובה) | - |
| \`SESSION_SECRET\` | Secret לניהול sessions | - |
| \`ADMIN_USERNAME\` | שם משתמש למערכת | admin |
| \`ADMIN_PASSWORD\` | סיסמה למערכת | - |
| \`PIPED_INSTANCE\` | כתובת Piped instance | https://pipedapi.kavin.rocks |
| \`COOKIES_PATH\` | נתיב לקובץ cookies.txt | ./data/cookies.txt |
| \`DATA_PATH\` | נתיב לתיקיית data | ./data |
| \`PORT\` | פורט השרת | 3000 |

## שימוש

1. התחבר עם שם המשתמש והסיסמה שהגדרת
2. בחר שרת דיסקורד מהרשימה
3. הזן Voice Channel ID והתחבר לערוץ
4. חפש שירים והוסף לתור
5. שלוט בנגן עם הכפתורים

## ארכיטקטורה

- **Frontend**: Next.js 15 + React 19 + Tailwind CSS
- **Backend**: Next.js API Routes + Discord.js
- **Audio**: yt-dlp + ffmpeg + @discordjs/voice
- **Real-time**: Server-Sent Events (SSE)
- **Search**: Piped API (YouTube mirror)

## רישיון

MIT

## תמיכה

לבעיות ושאלות, פתח issue ב-GitHub.
