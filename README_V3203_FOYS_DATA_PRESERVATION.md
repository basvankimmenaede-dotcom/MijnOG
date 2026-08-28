# Mijn OG v3.2.3 - FOYS data preservation

FOYS sync overschrijft bestaande verrijkte wedstrijdinformatie niet langer met lege ICS-waarden. Bestaande uitslagen, locatie, omschrijving, URL, eindtijd en created_by blijven behouden wanneer FOYS die velden niet aanlevert.

Dit voorkomt dat handmatig/geimporteerde wedstrijdinformatie verdwijnt bij een volgende achtergrond-sync.
