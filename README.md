# Discord Music Bot Dashboard (Fixed)

גרסה זו מתקנת את קריסות `EADDRINUSE: 3000` ע״י:
- שרת Web שהוא singleton עם טיפול ב־EADDRINUSE.
- Healthcheck שנשען על `/healthz` ומכבד `PORT`/`PANEL_PORT`.
- ללא סודות baked-in — מעבירים ENV בזמן ריצה בלבד.

## הרצה מקומית
```bash
cp .env.example .env  # מלאו את הערכים
npm install
npm start
```

## Docker
```bash
cp .env.example .env  # מלאו את הערכים
docker compose up --build
```

אם פורט 3000 תפוס בהוסט, החליפו ל־3001:
- בקובץ compose: `PORT=3001` ו־`"3001:3001"`
- אין צורך לשנות קוד — הוא קורא את `PORT`.

> שימו לב: אם טוקן הבוט נחשף בעבר, צרו חדש ב־Discord Developer Portal והחליפו בקובץ `.env`.
