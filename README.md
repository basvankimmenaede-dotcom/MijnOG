# Mijn OG v2.4

## Nieuw
- Trainingen toevoegen, wijzigen en verwijderen voor admins en teamcoaches.
- Trainingvelden: team, datum, starttijd, eindtijd, verzameltijd, locatie, adres en omschrijving.
- Trainingen en FOYS-wedstrijden gecombineerd in Home en Agenda.
- Aanwezigheidsstatus: Aanwezig, Misschien en Afwezig.
- Afwezig vereist een reden en een expliciete bevestiging in een popup.
- Coaches/admins zien per training een aanwezigheidsdashboard met reacties en redenen.
- Agenda heeft filters voor alles, wedstrijden en trainingen.
- Uitlijning, spacing en centrering verder aangescherpt.
- Over Mijn OG toont versie 2.4.

## Extra Supabase-policy
Voer `supabase_v24_coach_profiles.sql` eenmalig uit in Supabase SQL Editor. Hierdoor kunnen coaches de namen van spelers uit hun eigen team zien in het aanwezigheidsoverzicht. Admins hadden dit recht al.

## Deploy
1. Pak de ZIP uit.
2. Vervang de bestaande bestanden in je lokale GitHub repository.
3. Commit naar `main` en Push origin.
4. Vercel deployt automatisch.

Bestaande Vercel environment variables blijven ongewijzigd.
