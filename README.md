# Mijn OG v2.5.3.1 — Profiel- & teamfoto's

## Nieuw
- Gebruikers kunnen hun eigen profielfoto uploaden of verwijderen.
- Profielfoto's worden in de browser verkleind naar maximaal 512×512 en circa 100 KB WebP.
- Admins kunnen in de team-popup de profielfoto van ieder teamlid aanpassen.
- Klik op een team om een popup met teamfoto, spelers en staff te openen.
- Coaches van het team en admins kunnen de teamfoto aanpassen.
- Teamfoto's worden gecomprimeerd naar maximaal 1400×900 en circa 300 KB WebP.
- Nieuwe teamrol `staff` naast `player` en `coach`.
- `Over Mijn OG` toont versie 2.5.3.1.

## Supabase
Voer vóór gebruik één keer `supabase_v252_photos_staff.sql` uit in de Supabase SQL Editor.
Het script maakt/bijwerkt zelf de publieke Storage buckets `avatars` en `team-images` en zet de benodigde policies/RPC's klaar.

## Deploy
Vervang de huidige projectbestanden door deze map, commit naar `main` en push naar GitHub. Vercel bouwt daarna automatisch.


Hotfix: Team-pagina crash opgelost door cropRequest-state in het juiste Team-component te plaatsen.
