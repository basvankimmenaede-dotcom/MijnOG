# Mijn OG v3.2.7

## Positie/rugnummer
- Rugnummer en positie worden in Team/Team stats als afzonderlijke UI-elementen gerenderd.
- Posities lopen altijd door `cleanPosition`, die alleen A-Z en 0-9 toestaat.
- Daardoor kan een `$`-teken niet uit de rugnummer-template of positie-opmaak komen.

## FOYS
- FOYS is uitsluitend databron; Mijn OG leest de kalender altijd uit `public.events`.
- Automatische sync blokkeert de app niet.
- Een mislukte sync blokkeert geen nieuwe poging voor twee uur meer: retry na 10 minuten, succesvolle sync maximaal eens per uur per apparaat.
- Centrale sync selecteert feeds met dekking per actief team in plaats van alleen de 20 laatst gekoppelde feeds.
- Teamherkenning kiest de meest specifieke/lange `foys_match_text` als meerdere aliassen matchen.
- Bestaande Mijn OG-data wordt niet met lege FOYS-velden overschreven.
- Koppelingsteksten zijn aangepast van 'agenda' naar 'databron'.
