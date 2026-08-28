# Mijn OG v3.1.32 - OB% partial batting fix

- OB% wordt niet langer volledig geblokkeerd wanneer een selectie historische `partial_batting`-regels bevat.
- Volledige wedstrijdregels gebruiken de officiele formule: `(H + BB + HBP) / (AB + BB + HBP + SF)`.
- Historische partial-regels uit de U21-import bevatten H, AB en BB. Voor die regels gebruikt Mijn OG de best beschikbare berekening: `(H + BB) / (AB + BB)`.
- Bij gemengde datasets worden de tellers en noemers per regel correct gecombineerd.
- BB blijft zichtbaar in Team stats, omdat walks wel aanwezig zijn in de historische bron.
- De persoonlijke statskaart toont nu `OB%` als percentage in plaats van een absoluut `OB`-aantal.
- Zichtbare versie bijgewerkt naar 3.1.32.
