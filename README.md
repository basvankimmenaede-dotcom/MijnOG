# Mijn OG v2.6 — Uitnodigen & registreren

Nieuw in deze versie:
- Alleen clubadmins kunnen vanuit Clubbeheer een nieuw lid uitnodigen.
- De uitnodiging bevat voornaam, achternaam, team en rol (speler/coach/staff).
- Supabase verstuurt de uitnodigingsmail.
- De genodigde kiest zelf een wachtwoord via Mijn OG.
- Profiel en teamkoppeling worden automatisch aangemaakt.
- Over Mijn OG toont versie 2.6.

## Extra Vercel environment variable
Voeg server-side toe: `SUPABASE_SERVICE_ROLE_KEY`. Deze sleutel mag nooit `NEXT_PUBLIC_` heten en nooit in GitHub worden gezet.

## Supabase
Voer `supabase_v254_invites.sql` eenmaal uit vóór gebruik.


## Pushmeldingen v2.6
Zie `README_PUSH_V26.md` en voer `supabase_v26_push.sql` uit.
