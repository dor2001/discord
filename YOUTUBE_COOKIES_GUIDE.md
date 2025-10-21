# מדריך: איך לחלץ YouTube Cookies

YouTube חוסם bots ודורש authentication. הפתרון הכי פשוט הוא להשתמש ב-cookies מהדפדפן שלך.

## שיטה 1: דרך הדפדפן (30 שניות)

### Chrome / Edge / Brave

1. פתח את YouTube בדפדפן: https://youtube.com
2. התחבר לחשבון YouTube שלך (אם לא מחובר)
3. לחץ F12 לפתיחת Developer Tools
4. לך ל-tab "Application" (או "Storage" ב-Firefox)
5. בצד שמאל, לחץ על "Cookies" > "https://www.youtube.com"
6. חפש את ה-cookie בשם `CONSENT` או `VISITOR_INFO1_LIVE`
7. לחץ לחיצה ימנית על השורה > "Copy" > "Copy as cURL"
8. העתק את כל ה-cookies string

### Firefox

1. פתח את YouTube בדפדפן: https://youtube.com
2. התחבר לחשבון YouTube שלך (אם לא מחובר)
3. לחץ F12 לפתיחת Developer Tools
4. לך ל-tab "Storage"
5. בצד שמאל, לחץ על "Cookies" > "https://www.youtube.com"
6. לחץ לחיצה ימנית על כל cookie > "Copy Value"
7. הדבק בפורמט: `cookie_name=cookie_value; cookie_name2=cookie_value2`

## שיטה 2: דרך Extension (קל יותר)

1. התקן extension: [Get cookies.txt LOCALLY](https://chrome.google.com/webstore/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)
2. פתח את YouTube: https://youtube.com
3. התחבר לחשבון YouTube שלך
4. לחץ על ה-extension icon
5. לחץ "Export" > "Copy to clipboard"
6. העתק את כל התוכן

## איך להשתמש ב-Cookies

### אופציה 1: Environment Variable (מומלץ)

הוסף ל-Coolify או ל-`.env`:

\`\`\`env
YOUTUBE_COOKIES="CONSENT=YES+...; VISITOR_INFO1_LIVE=...; ..."
\`\`\`

### אופציה 2: קובץ Cookies

1. צור קובץ `data/cookies.txt`
2. הדבק את ה-cookies בפורמט Netscape:

\`\`\`
# Netscape HTTP Cookie File
.youtube.com	TRUE	/	TRUE	0	CONSENT	YES+...
.youtube.com	TRUE	/	TRUE	0	VISITOR_INFO1_LIVE	...
\`\`\`

## בדיקה

אחרי הוספת ה-cookies, הבוט אמור להציג:
\`\`\`
[v0] Using YouTube cookies for authentication
\`\`\`

אם אתה רואה:
\`\`\`
[v0] No YouTube cookies provided - playback may fail due to bot detection
\`\`\`

זה אומר שה-cookies לא הוגדרו נכון.

## שאלות נפוצות

**Q: האם זה בטוח?**
A: כן, ה-cookies נשמרים רק בשרת שלך ולא משותפים עם אף אחד.

**Q: כמה זמן ה-cookies תקפים?**
A: בדרך כלל כמה חודשים. אם הבוט מפסיק לעבוד, פשוט חלץ cookies חדשים.

**Q: האם אני צריך חשבון YouTube Premium?**
A: לא, חשבון רגיל מספיק.

**Q: מה אם אני לא רוצה להשתמש ב-cookies?**
A: אין פתרון אחר שעובד - YouTube חוסם את כל הניסיונות ללא authentication.
