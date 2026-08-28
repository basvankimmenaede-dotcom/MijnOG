# Mijn OG v3.1.27

- FOYS is nu een synchronisatiebron in plaats van een persoonlijke agendaweergave.
- Wedstrijden uit een gekoppelde FOYS-feed worden centraal opgeslagen in `public.events`.
- Teamkoppeling gebeurt via `teams.foys_match_text`.
- Iedere geïmporteerde wedstrijd krijgt `external_source='foys'` en een unieke `external_uid`, zodat opnieuw synchroniseren geen duplicaten maakt.
- Alle gebruikers lezen wedstrijden daarna uit dezelfde database en zien dus dezelfde competitieagenda.
- Gespeelde FOYS-wedstrijden krijgen status `played`; afgelaste wedstrijden `cancelled` als FOYS dit vermeldt.
- Een uitslag wordt automatisch opgeslagen als FOYS expliciet `Uitslag: X-Y` of `Score: X-Y` in de feed meegeeft.
- Ontbrekende historische uitslagen kunnen via de aangeleverde video in `home_score` / `away_score` worden aangevuld.
- Zichtbaar versienummer: 3.1.27.

## Eerst uitvoeren in Supabase
Voer `supabase_v3127_foys_database_sync.sql` uit voordat deze versie live gaat.
