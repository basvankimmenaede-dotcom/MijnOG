# Mijn OG v2.8.2

Agenda refresh met kaartweergave en team-aware FOYS filtering.

## v3.0.0.8 - Starting Line-up Maker + WhatsApp delen
- Line-up maken is alleen beschikbaar bij wedstrijden (handmatig of FOYS) en alleen zichtbaar voor coaches van het betreffende team.
- Starting lineup met veld, slagvolgorde en DP/FLEX/OPO; spelers kunnen worden toegevoegd, vervangen en verwijderd.
- Bevestigde invallers uit het bestaande invallerssysteem worden meegenomen.
- Aanwezigheidsstatus wordt meegenomen; afwezige/geblessseerde speelsters geven eerst een waarschuwing.
- Deel via WhatsApp toegevoegd aan wedstrijden en trainingen.
- Voer `supabase_v30008_lineup_maker.sql` uit in Supabase voordat je de Line-up Maker gebruikt.


## Nieuw
- Agenda als compacte kaarten in de Mijn OG-stijl.
- Teamfilter op basis van alle actieve teamrollen van de gebruiker (speler/coach/staff).
- Typefilter Alles / Wedstrijden / Trainingen.
- FOYS-herkenning per team via `teams.foys_match_text`.
- Clubbeheer > Teams kan de FOYS-herkenning aanpassen.
- Over Mijn OG: versie 3.0.0.8.

## v2.9.9.9 - Coachbeheer speelsters & invallers

- Het detailoverzicht per activiteit opent vanuit één compacte knop in Team stats.
- Zowel de aanvragende als ontvangende coach kan een invaller bevestigen, ook wanneer dit mondeling is afgesproken.
- Coaches kunnen rugnummer, primaire/secundaire posities, werphand en slagzijde aanpassen voor speelsters van het eigen team.
- Voer `supabase_v2999_coach_player_management.sql` uit voordat deze versie wordt gebruikt.

## v2.9.9.8 - Aanwezigheidsoverzicht

- Team stats bevat een totaaloverzicht per speelster met aanwezig, afgemeld, te laat en aanwezigheidspercentage.
- Een horizontaal scrollbare matrix toont de status per afgelopen training en wedstrijd.
- Speelsters kunnen hun aanwezigheid na afloop niet meer aanpassen; coaches en admins wel.
- Coaches kunnen zowel vóór als na afloop de status Te laat registreren.
- Voer `supabase_v2998_attendance_lock.sql` uit voordat deze versie wordt gebruikt.

## v2.9.9.7 - Teamvolgorde & bewuste teamkeuze

- Teams staan eerst per sport: softbal vóór honkbal.
- Binnen iedere sport is de volgorde Senioren, U21, U15 en U12; teams binnen dezelfde categorie staan op naam.
- Bij het aanmaken van een training of wedstrijd is standaard geen team geselecteerd.
- Een activiteit kan pas worden opgeslagen nadat de coach of admin bewust minimaal één team heeft gekozen.
- Trainingen kunnen voor het hele team, pitchers, catchers, pitchers en catchers samen of een handmatige spelersselectie worden aangemaakt.
- Positie is bij invallersverzoeken optioneel.
- Interne opmerkingen bij invallersverzoeken zijn uitsluitend zichtbaar voor betrokken coaches en admins.
- Pushmeldingen staan prominent op Home, met een eenmalige introductie en duidelijke status/uitleg in de instellingen.
- Voer `supabase_v2997_team_groups_requests.sql` uit voordat deze versie wordt gebruikt.

## v2.9.9.6 - Alle OG-teams

- Team toont eerst de eigen gekoppelde teams.
- Daaronder staan alle andere actieve OG-teams uit het huidige seizoen.
- Andere teams zijn te bekijken zonder coachrechten of persoonlijke spelersstatistieken te openen.
- Het oude lege blok Teamgegevens is verwijderd; teamstats blijven in de coachomgeving.

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
