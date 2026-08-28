# Mijn OG v3.1.20 - competities, FOYS en historische stats

## Eerst uitvoeren
Voer **`supabase_v3120_competities.sql`** eenmalig uit in de Supabase SQL Editor voordat deze appversie wordt gedeployed.

De migratie voegt competitiecontext toe aan wedstrijden, slagstats en pitchingstats en maakt automatisch `KNBSB Seizoen [jaar]` aan voor FOYS-wedstrijden.

## Wat is aangepast

- FOYS-sync verwerkt de volledige wedstrijdlijst die de FOYS ICS-feed teruggeeft; Mijn OG filtert gespeelde wedstrijden niet meer weg.
- FOYS-wedstrijden krijgen automatisch `KNBSB Seizoen [jaar]` als competitiecontext.
- Handmatig aangemaakte wedstrijden vereisen een competitie/toernooi. Coaches kunnen vanuit het wedstrijdformulier een nieuwe competitie aanmaken.
- Stats blijven geregistreerd vanuit de gespeelde wedstrijd. De rechtstreekse knop om los een wedstrijdstat in te voeren is uit het coach-statsscherm gehaald.
- Slag- en pitchingstats bewaren `competition_id` van de wedstrijd.
- Speelsterstats hebben filters `Seizoen` en `Competitie`; `Totaal` is standaard en telt alle competities in dat seizoen samen.
- Een competitie verschijnt automatisch bij een speelster zodra zij daar stats heeft, ook als invaller bij een ander team.
- Persoonlijke stats tellen invalbeurten over teams heen mee, maar blijven door de competitie van de wedstrijd gescheiden.
- Aanwezigheid/absentie wordt op het gekozen seizoen gefilterd.
- Bij wijziging van de competitie van een handmatige wedstrijd verhuizen bestaande slag- en pitchingstats automatisch mee via een database-trigger.
- Bestaande FOYS-statregels worden bij de migratie per kalenderjaar teruggekoppeld aan `KNBSB Seizoen [jaar]`.

## Belangrijk over historische FOYS-wedstrijden

Mijn OG vraagt nu de volledige ICS-feed op en houdt geen eigen 370-dagenfilter meer aan. Als FOYS zelf oude wedstrijden uit de ICS-feed weglaat, kan Mijn OG die wedstrijden niet via deze feed reconstrueren. In dat geval moeten die wedstrijden eenmalig via een andere bron/import worden toegevoegd.

## Historische U21 2026-slagstats

De app is voorbereid om oude wedstrijdstats onder `KNBSB Seizoen 2026` op te slaan. De historische U21-data is niet automatisch naar de productie-Supabase geschreven door deze codewijziging; importeer de bestaande per-wedstrijddata vanuit de betreffende gespeelde wedstrijden nadat v3.1.20 en de migratie actief zijn.

## Controle na deployment

1. Open een FOYS-wedstrijd uit 2026 onder `Agenda -> Gespeeld` en controleer de badge `KNBSB Seizoen 2026`.
2. Open een toekomstige FOYS-wedstrijd en controleer dezelfde competitiecontext voor het juiste jaar.
3. Maak een handmatige oefenwedstrijd aan en voeg vanuit het formulier een nieuwe competitie toe.
4. Registreer stats bij die gespeelde wedstrijd en controleer `Stats -> Seizoen -> Competitie`.
5. Controleer bij een invaller dat dezelfde speelster op haar profiel zowel `Totaal` als de extra competitie kan selecteren.
6. Controleer dat `Totaal` alle competities van hetzelfde seizoen combineert, maar geen ander seizoen meeneemt.
