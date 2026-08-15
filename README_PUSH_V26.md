# Mijn OG v2.6.5 - Pushmeldingen

## Wat werkt
- PWA/Web Push op ondersteunde telefoons.
- Push inschakelen/uitschakelen via **Meer > Meldingen**.
- Admin kan een testmelding naar zichzelf sturen.
- Automatische 24-uursherinnering voor spelers die bij een training nog op **Misschien** staan.

## Vercel Environment Variables
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `CRON_SECRET`
- bestaande Supabase-variabelen blijven nodig.

Verander de VAPID-keypair niet nadat gebruikers zich hebben geregistreerd voor push. Bij een nieuwe public key moeten bestaande push subscriptions opnieuw worden aangemaakt.

## Automatische herinnering
Vercel Hobby ondersteunt geen uurlijkse Vercel Cron. Daarom staat in deze repository:

`.github/workflows/push-reminders.yml`

Deze GitHub Action draait ieder uur en roept de beveiligde reminder-route aan.

### Eenmalig instellen in GitHub
Ga naar **Repository > Settings > Secrets and variables > Actions > New repository secret**.

Maak een secret:
- Name: `CRON_SECRET`
- Value: exact dezelfde waarde als `CRON_SECRET` in Vercel.

Optioneel kun je onder **Variables** instellen:
- Name: `MIJN_OG_APP_URL`
- Value: bijvoorbeeld `https://mijn-og-v2.vercel.app`

Zonder die variable gebruikt de workflow automatisch bovenstaande Vercel-URL.

De workflow kan ook handmatig getest worden via **GitHub > Actions > Mijn OG push reminders > Run workflow**.

## 24-uursregel
De route zoekt trainingen die ongeveer 23-25 uur in de toekomst beginnen. Alleen attendance met status `maybe` komt in aanmerking. `push_notification_log` voorkomt dat dezelfde 24-uursmelding voor dezelfde training meerdere keren wordt verstuurd.
