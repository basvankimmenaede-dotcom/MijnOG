# Mijn OG v2.5

## Nieuw in 2.5
- Een training kan aan meerdere teams gekoppeld worden.
- Individuele gastspelers kunnen aan een training worden toegevoegd.
- Aanwezigheidsoverzicht heeft filters per team en voor gasten.
- Trainingdetails hebben een eigen nette modal.
- Clubbeheer opent gecentreerd in plaats van als vaste bottom sheet.
- Wisselen via de onderste navigatie scrollt de nieuwe pagina altijd naar boven.
- Over Mijn OG toont versie 2.5.

## Eenmalig nog uitvoeren in Supabase
De hoofd-migratie voor v2.5 is al uitgevoerd. Voer daarnaast `supabase_v25_guest_profiles.sql` uit zodat coaches in de gastspelerzoeker clubleden op naam kunnen vinden.

## Uploaden
Vervang de bestaande projectbestanden door deze versie, commit naar `main` en push naar GitHub. Vercel bouwt daarna automatisch opnieuw.
