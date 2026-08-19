# Mijn OG v2.8.2

Agenda refresh met kaartweergave en team-aware FOYS filtering.

## Nieuw
- Agenda als compacte kaarten in de Mijn OG-stijl.
- Teamfilter op basis van alle actieve teamrollen van de gebruiker (speler/coach/staff).
- Typefilter Alles / Wedstrijden / Trainingen.
- FOYS-herkenning per team via `teams.foys_match_text`.
- Clubbeheer > Teams kan de FOYS-herkenning aanpassen.
- Over Mijn OG: versie 2.8.2.

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
