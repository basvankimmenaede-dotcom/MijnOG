# Mijn OG v3.2.6

## Positie-weergave definitief opgeschoond

- Positiecodes worden nu via één centrale sanitizer genormaliseerd.
- Alleen A-Z en 0-9 blijven over in een positiecode. Daardoor kunnen $, €, £, full-width tekens of andere verborgen prefix/suffix tekens niet meer in de UI verschijnen.
- De publieke teamdirectory wordt al bij het inladen opgeschoond.
- Secundaire posities in het spelersprofiel gebruiken dezelfde sanitizer.
- Versienummer bijgewerkt naar 3.2.6.
