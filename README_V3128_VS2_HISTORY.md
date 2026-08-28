# Mijn OG v3.1.28

- 25 gespeelde competitiewedstrijden van Softbal VS-2 uit de aangeleverde FOYS-video toegevoegd als database-migratie.
- Eindstanden worden opgeslagen in `home_score` en `away_score`.
- Afgelaste wedstrijden uit de video worden bewust niet als gespeeld toegevoegd.
- FOYS-sync herkent voortaan een reeds bestaande wedstrijd op hetzelfde team + startmoment en koppelt die aan de echte FOYS-UID, zodat historische handmatige imports niet dubbel verschijnen.
- Zichtbaar versienummer: 3.1.28.
