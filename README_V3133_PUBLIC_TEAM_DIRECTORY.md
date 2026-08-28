# Mijn OG v3.1.33 - Teamindeling zichtbaar voor alle speelsters

## Gewijzigd

- Iedere ingelogde speelster kan bij **alle actieve OG-teams** de teamindeling bekijken.
- Zichtbaar: **naam, profielfoto, rugnummer, primaire positie en teamrol/functie**.
- Een speelster kan het profiel van een andere speelster uit een ander team **niet openen naar statistieken**.
- Bestaande coach/admin-rechten blijven intact.
- Gevoelige data wordt niet via een brede `profiles`-policy vrijgegeven. De nieuwe RPC geeft alleen de veilige directoryvelden terug.

## Supabase

Voer `supabase_v3133_public_team_directory.sql` eenmalig uit in de Supabase SQL Editor.
