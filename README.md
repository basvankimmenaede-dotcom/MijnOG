# Mijn OG - prototype 0.1

Eerste mobile-first PWA-prototype voor Onze Gezellen.

## In deze versie
- Demo-login
- Dashboard
- Volgende training
- Aan-/afmelden (lokale demo-state)
- Persoonlijke positieve stats
- Clubbrede highlight
- Agenda
- Persoonlijke KNBSB/FOYS ICS-koppeling via Meer
- PWA manifest + service worker
- Eerste Supabase SQL-schema

## Nog niet gekoppeld
- Supabase authenticatie/database
- Google Calendar
- Server-side ophalen/parsen van KNBSB ICS-feed (UI + privé opslagmodel staan al klaar)
- Echte spelers/statistieken
- Teamoverzicht
- Clubleaderboard
- Events/pushmeldingen

## Lokaal starten
Vanuit deze map:

python3 -m http.server 8080

Open daarna http://localhost:8080

## Volgende technische stap
1. Supabase-project aanmaken.
2. `supabase_schema.sql` uitvoeren.
3. Demo-login vervangen door Supabase Auth.
4. Dashboarddata uit Supabase laden.
5. Google Calendar sync toevoegen.
