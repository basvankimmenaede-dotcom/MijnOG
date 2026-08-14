# Mijn OG v2

Mobile-first Mijn OG webapp voor Onze Gezellen Honk- & Softbal.

## v2 bevat
- Echte Supabase login.
- Wachtwoord vergeten / reset via Supabase Auth.
- Voor- en achternaam wijzigen vanuit Instellingen.
- Persoonlijke FOYS/KNBSB ICS-link opslaan in Supabase.
- FOYS-agenda server-side ophalen via `/api/calendar` en echte komende wedstrijden tonen.
- Eerstvolgende echte FOYS-wedstrijd op Home.
- Geen demo-data: ontbrekende stats/highlights tonen een lege status.
- Visuele stijl gebaseerd op de bestaande Onze Gezellen website: wit, zwart en OG-oranje.
- Officieel OG-logo als headerlogo, favicon en PWA/iPhone homescreen-icoon.

## Vercel environment variables
Deze moeten in Vercel blijven staan:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

## Supabase reset URL
Ga in Supabase naar Authentication > URL Configuration.
- Site URL: `https://mijn-og.vercel.app`
- Redirect URL: voeg `https://mijn-og.vercel.app/**` toe

Als later een eigen domein wordt gebruikt, voeg dat domein hier ook toe.

## Deployen
1. Vervang de bestanden in de GitHub repository met deze versie.
2. Commit en Push via GitHub Desktop.
3. Vercel maakt automatisch een nieuwe deployment.
