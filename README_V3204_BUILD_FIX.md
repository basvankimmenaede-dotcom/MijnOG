# Mijn OG v3.2.4 - Build hotfix

- Herstelt ongeldige letterlijke `\n` tekens in `app/globals.css` uit de v3.2.1 iOS/Safari kleurfix.
- Deze tekens veroorzaakten de Turbopack/PostCSS parse error op regel 2984.
- FOYS data-preservation wijzigingen uit v3.2.3 blijven behouden.
- Geen SQL-migratie nodig.
