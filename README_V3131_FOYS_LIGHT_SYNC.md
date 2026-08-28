# Mijn OG v3.1.31 – lichte centrale FOYS-sync

- De app laadt altijd eerst volledig uit de eigen database.
- Circa 1,2 seconde na de eerste render wordt FOYS op de achtergrond gecontroleerd.
- De automatische controle draait maximaal eens per 2 uur per apparaat/browser.
- De browser breekt de achtergrondcontrole na 8 seconden af; dit blokkeert de UI nooit.
- De server synchroniseert centraal vanaf actieve FOYS-koppelingen, zodat een team niet afhankelijk is van wie ingelogd is.
- Dubbele persoonlijke feeds worden gededupliceerd.
- FOYS-feeds worden parallel opgehaald met een timeout van 6 seconden.
- Database-upserts en event-team-koppelingen gebeuren in batches in plaats van per wedstrijd.
- Na een succesvolle sync worden alleen events/event-links opnieuw opgehaald, niet de volledige appdata.
- Handmatig synchroniseren onder Meer > Koppelingen blijft beschikbaar.
- Geen nieuwe SQL-migratie nodig.
