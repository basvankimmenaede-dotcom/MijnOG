# Mijn OG – Supabase Next.js prototype

Deze versie praat echt met het Supabase-project via `NEXT_PUBLIC_SUPABASE_URL` en `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

## Wat werkt
- Inloggen met Supabase Auth
- Eigen profiel ophalen uit `profiles`
- Teamkoppelingen ophalen via `team_members -> teams`
- Persoonlijke KNBSB/FOYS ICS-link opslaan in `calendar_connections`
- Uitloggen
- Lege staten voor stats/highlights in plaats van demo-data

## Starten
1. Installeer Node.js (LTS).
2. Open deze map in Terminal.
3. Voer uit: `npm install`
4. Voer uit: `npm run dev`
5. Open `http://localhost:3000`

## Belangrijk
`.env.local` bevat alleen de publieke Supabase project-URL en publishable key. Gebruik NOOIT een service-role/secret key in de browser.

## Nog te bouwen
- FOYS ICS daadwerkelijk server-side ophalen en parseren
- Teambeheer / admin
- Google Calendar trainingen
- Stats import
- Leaderboards en highlights
- PWA manifest + installatie op beginscherm
