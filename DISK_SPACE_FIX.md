# פתרון בעיית מקום דיסק ב-Coolify

## הבעיה
השרת אזל לו המקום בדיסק, מה שגורם ל-Docker builds להיכשל עם השגיאה:
\`\`\`
ENOSPC: no space left on device
\`\`\`

## פתרונות מיידיים

### 1. בדוק כמה מקום יש בפועל
\`\`\`bash
df -h
\`\`\`

### 2. נקה Docker (זה ישחרר הרבה מקום!)
\`\`\`bash
# נקה הכל - images, containers, volumes, cache
docker system prune -a --volumes -f

# אם זה לא מספיק, נקה גם build cache
docker builder prune -a -f
\`\`\`

### 3. בדוק איפה Docker שומר קבצים
\`\`\`bash
docker info | grep "Docker Root Dir"
\`\`\`

### 4. נקה logs ישנים
\`\`\`bash
# מצא logs גדולים
find /var/lib/docker/containers/ -name "*.log" -exec ls -lh {} \; | sort -k 5 -h -r | head -20

# נקה logs ישנים
truncate -s 0 /var/lib/docker/containers/*/*-json.log
\`\`\`

### 5. בדוק מה תופס הכי הרבה מקום
\`\`\`bash
du -sh /var/lib/docker/* | sort -h
\`\`\`

## אם עדיין אין מקום

אם אחרי כל הניקויים עדיין אין מקום, צריך:
1. להגדיל את ה-VPS (יותר דיסק)
2. או להעביר את Docker לפרטיציה אחרת עם יותר מקום

## הערות חשובות

- ה-40GB שהוספת - ודא שהם נוספו לפרטיציה הנכונה (איפה ש-Docker נמצא)
- Coolify שומר הרבה Docker images ישנים - חשוב לנקות אותם באופן קבוע
- כל build יוצר layers חדשים שתופסים מקום
