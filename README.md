# Mijn OG v2.3

Nieuwe release met clubbeheer als mobiele bottom sheet en volledige teamindeling.

## Nieuw in 2.3
- Clubbeheer staat niet meer permanent open onder Profiel.
- Admins openen Clubbeheer als popup/bottom sheet.
- Aparte beheerpagina's voor Seizoenen, Teams en Teamindeling.
- Teamindeling per seizoen en team.
- Bestaande Mijn OG-gebruikers toevoegen als speler of coach.
- Teamrol speler/coach wijzigen.
- Lid uit team verwijderen met bevestiging.
- Zoeken op naam of rugnummer.
- Over Mijn OG toont versie 2.3.

## Vereiste Supabase policies
Deze release verwacht dat de admin-policies voor `profiles` en `team_members` al zijn toegevoegd:
- admin mag alle profielen lezen
- admin mag team_members toevoegen, wijzigen en verwijderen

## Deploy
Vervang de huidige bestanden in de GitHub-repository door deze versie, commit naar `main` en push. Vercel bouwt daarna automatisch opnieuw.
