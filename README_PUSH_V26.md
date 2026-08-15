# Mijn OG v2.6 - Push setup

## 1. Supabase
Voer `supabase_v26_push.sql` eenmalig uit in de SQL Editor.

## 2. VAPID keys genereren
Op een computer met Node.js:

```bash
npx web-push generate-vapid-keys
```

Bewaar Public Key en Private Key.

## 3. Vercel Environment Variables
Voeg toe:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = public key
- `VAPID_PRIVATE_KEY` = private key
- `VAPID_SUBJECT` = bijvoorbeeld `mailto:info@onzegezellen.nl`
- `CRON_SECRET` = zelfgekozen lange willekeurige geheime tekst (voor de reminder-route)

Bestaande variabelen zoals Supabase URL, publishable key, service-role key en app URL blijven staan.

## 4. Deploy
Push naar GitHub en laat Vercel opnieuw deployen.

## 5. iPhone
Web Push op iPhone werkt in een geïnstalleerde webapp:
Safari -> Deel -> Zet op beginscherm -> open Mijn OG via dat icoon -> Meer -> Meldingen -> Meldingen inschakelen.

## 6. Test
Een admin ziet onder Meldingen de knop `Stuur testmelding naar mij`.

## 7. 24-uursherinnering bij Misschien
De route `/api/push/reminders` verwerkt de herinneringen en dedupliceert ze via `push_notification_log`.
Deze route moet eenmaal per uur worden aangeroepen met:

`Authorization: Bearer <CRON_SECRET>`

De app-code is hiervoor klaar. Je kunt later Vercel Cron of een andere scheduler koppelen.


## v2.6.3 diagnostics
- Lokale notificatietest zonder pushserver.
- Server-side controle of VAPID public/private keys echt bij elkaar horen.
- Toont of er een actieve subscription en geldig subject aanwezig zijn.
