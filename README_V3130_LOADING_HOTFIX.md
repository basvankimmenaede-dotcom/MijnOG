# Mijn OG v3.1.30 – loading hotfix

- Automatische FOYS-sync bij het openen van de app volledig uitgeschakeld.
- De app leest wedstrijden uitsluitend uit `public.events` tijdens normaal gebruik.
- FOYS synchroniseren gebeurt alleen nog expliciet via Meer > Koppelingen > Wedstrijden nu synchroniseren.
- Dit voorkomt dat een trage FOYS-feed of de database-upserts de app tijdens het openen belasten.
- Geen SQL-migratie nodig.
