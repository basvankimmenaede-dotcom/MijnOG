# Mijn OG v3.1.34 – Performance Diagnostics + Lazy Loading

Deze update maakt de eerste app-load bewust klein. Bij het opstarten worden alleen sessie/profiel, eigen teams, FOYS-koppeling en recente/toekomstige activiteiten geladen. Zware datasets zoals teamleden, statistieken, metingen, aanwezigheidshistorie en coachdata worden pas opgehaald wanneer de betreffende tab wordt geopend.

Daarnaast logt de browserconsole iedere Supabase-call met `[MIJN OG PERF]`, inclusief duur en aantal records. Hierdoor is direct zichtbaar welke query nog traag is. FOYS blijft op de achtergrond controleren en zit niet in het kritieke laadpad.

Geen SQL-migratie nodig.
