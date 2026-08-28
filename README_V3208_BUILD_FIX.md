# Mijn OG v3.2.8

Buildfix voor de FOYS team-alias parser. De regex in app/api/calendar/route.js bevatte per ongeluk een echte regeleinde binnen een regex-literal. Deze is vervangen door een geldige `[,;|\r\n]+` separator.
