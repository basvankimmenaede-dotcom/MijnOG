# Mijn OG v2.8.2

Agenda refresh met kaartweergave en team-aware FOYS filtering.

## Nieuw
- Agenda als compacte kaarten in de Mijn OG-stijl.
- Teamfilter op basis van alle actieve teamrollen van de gebruiker (speler/coach/staff).
- Typefilter Alles / Wedstrijden / Trainingen.
- FOYS-herkenning per team via `teams.foys_match_text`.
- Clubbeheer > Teams kan de FOYS-herkenning aanpassen.
- Over Mijn OG: versie 2.9.9.5.

## v2.9.9.5 - Activiteiten & complete invallerverzoeken

- Coaches kunnen trainingen en wedstrijden aanmaken voor hun eigen coachteam(s).
- Admins kunnen activiteiten voor alle actieve teams beheren.
- De knop Training toevoegen heet nu Activiteit toevoegen, met keuze voor Training of Wedstrijd.
- Invallerverzoeken bewaren en tonen datum, speeltijd, verzameltijd, locatie en adres.
- De ontvangende coach krijgt bij ieder nieuw invallerverzoek automatisch een pushmelding wanneer push op het apparaat actief is.
- Voer `supabase_v2995_activities_requests.sql` uit voordat deze versie wordt gebruikt.

## v2.9.9.4 - Spelersprofiel via Team stats

- Team stats opent per speelster direct het samengevoegde spelersprofiel met wedstrijd-, pitching- en meetstats.
- Het losse dubbele venster voor persoonlijke statistieken is verwijderd.
- Feedback na het verwijderen van een teambericht staat onder de knop Bericht versturen.

## v2.9.9.3 - Uniforme statistiekbronnen

- Coachmetingen gebruiken voortaan de centrale tabel `player_measurements`.
- Meetpunten hebben vaste statistiekcodes, zodat dezelfde waarde overal terugkomt.
- Bestaande kaartmetingen worden door de migratie veilig overgezet.
- Wedstrijdstats accepteren handmatige invoer en iScore via dezelfde wedstrijdsleutel.
- De basis voor pitchingstats is toegevoegd met dezelfde handmatig/iScore-bronlogica.
- Pitchers krijgen in het spelersprofiel automatisch een Pitchingstats-kaart.
- Voer `supabase_v2993_unified_stats.sql` uit na de eerdere spelerskaartmigratie.

## v2.9.9.2 - Persoonlijke stats samengevoegd

- Wedstrijdstats en flexibele meetkaarten staan nu samen onder Persoonlijke stats.
- Het losse dubbele statistiekenblok is verwijderd.
- Aanwezigheid blijft als apart onderdeel zichtbaar.

## v2.9.9.1 - Kleine verbeteringen

- Strakke vaste teamfoto's en uitlijning in Mijn team.
- Teamberichten en eigen invallerverzoeken kunnen door coaches worden verwijderd.
- Verlopen trainingen blijven beschikbaar onder Agenda → Gespeeld.
- Datum- en tijdvelden staan op mobiel onder elkaar en vullen de beschikbare breedte.
- Popups veroorzaken op mobiel geen automatische paginazoom meer.
- Verwijderen van spelerskaarten heeft nu een duidelijke rode actieknop.

## v2.9.9.0 - Spelerskaarten

- Coaches en admins kunnen per speelster flexibele kaarten toevoegen.
- Templates voor Catching, Honklopen, Slagkracht en Gooien.
- Eigen meetpunten, eenheden en PR-richting (hoger of lager is beter).
- Meetgeschiedenis met datum, coachnotitie en verwijderen van metingen.
- Speelsters zien uitsluitend hun eigen spelerskaarten en resultaten.
- Voer voor ingebruikname `supabase_v299_player_cards.sql` uit in Supabase.

## Supabase
Voer de SQL uit die bij deze release in de ChatGPT-conversatie is meegeleverd voordat je de code deployt.

## v2.9.5.0 - Swing Analyzer V1
- Nieuwe afgeschermde Swing Analyzer in de coachomgeving.
- Analyzer Admin kan coachrechten en speelstertoewijzingen beheren.
- Analyzer Coach ziet alleen toegewezen speelsters.
- Mobiel opnemen of video kiezen; video blijft lokaal en wordt niet opgeslagen.
- Coach-assisted beoordeling op 8 technische onderdelen met focuspunten en drills.
- Analysehistorie per speelster en optionele exit velo.
- Voer `supabase_v295_swing_analyzer.sql` uit in Supabase voordat de module wordt gebruikt.
