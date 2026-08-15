# Mijn OG v2.1

Mobile-first Mijn OG webapp voor Onze Gezellen Honk- & Softbal.

## v2.1 wijzigingen
- Volledige visuele redesign op basis van het goedgekeurde mobiele concept.
- Grote oranje kaart voor de eerstvolgende echte FOYS-wedstrijd.
- Komende wedstrijden in een visuele agenda/tijdlijn.
- Rustigere kaarten, meer witruimte en app-achtige navigatie.
- Profielnaam staat standaard alleen als tekst in beeld.
- Naamvelden verschijnen pas na **Aanpassen** en klappen na opslaan weer dicht.
- FOYS-koppeling is ingeklapt onder **Koppelingen**.
- Geen demo-data: ontbrekende stats, teamdata en highlights krijgen een nette lege status.
- Bestaande Supabase login, resetflow en FOYS serverroute blijven behouden.

## Uploaden naar GitHub
1. Pak de ZIP uit.
2. Vervang in je lokale GitHub Desktop repository de mappen/bestanden `app`, `lib`, `public`, `package.json`, `README.md`, `.env.example` en `.gitignore`.
3. Commit bijvoorbeeld als `Mijn OG v2.1 redesign`.
4. Klik **Push origin**.
5. Vercel bouwt de nieuwe versie automatisch.

## Vercel
Deze environment variables moeten blijven bestaan:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Gebruik als live/testdomein het Vercel-domein dat correct naar de nieuwste production deployment wijst.


## Nieuw in 2.2 - Adminbeheer

Gebruikers met `profiles.role = admin` zien onder **Meer** een blok **Clubbeheer**. Daar kunnen ze seizoenen toevoegen, het actieve seizoen kiezen, teams toevoegen en teams archiveren/activeren. De app gebruikt de bestaande RLS-policies en `public.is_admin()` helper in Supabase.
