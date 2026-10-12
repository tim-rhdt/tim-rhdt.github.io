# Talks → reveal.js

Werkzeuge, mit denen die Folien unter `talks/` entstanden sind. Der Ordner beginnt mit `_`, deshalb veröffentlicht GitHub Pages ihn nicht.

Jede Folie wird als Bild übernommen (2560×1440, WebP), jeder Build-Schritt als weiteres Bild, das in reveal.js als Fragment erscheint. Videos laufen als echte Videos an ihrer Keynote-Position. Die Originale (`.key`, Exporte) werden nie verändert.

Benötigt: Google Chrome, Node ≥ 22, Python 3, `ffmpeg`, `cwebp` (libwebp), `pdftoppm`/`pdfinfo` (poppler), `gs` (Ghostscript).

## A. Keynote-Talk mit Builds und Videos

1. In Keynote: *Ablage → Exportieren → HTML*.
2. Aufnehmen (headless Chrome spielt den Export ab und fotografiert jeden Schritt):

   ```
   node kcap.mjs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" /tmp/chrome-kcap \
     "<Export-Ordner>" <capture-ordner> 1.3333333 9351
   ```

   - `KCAP_EXCLUDE="iO Clip"`: Videos, die nicht online sollen (ihr Standbild bleibt im Bild).
   - Warnungen am Ende („after the jump …“) betreffen meist Folien mit Videos oder automatischen Builds: diese Folien einzeln neu aufnehmen (letztes Argument z. B. `"12,13"`, eigener Capture-Ordner) und mit `python3 merge_cap.py <capture-ordner> <neuer-ordner>` übernehmen.
3. Deck bauen:

   ```
   python3 gen_deck.py --cap <capture-ordner> --export "<Export-Ordner>" --repo <repo> \
     --slug <ordnername> --title "…" --event "…" --date "…"
   ```

## B. Talk als PDF (ohne Builds)

```
python3 pdf2cap.py "<Folien>.pdf" <capture-ordner> --pages 1-9
python3 gen_deck.py --cap <capture-ordner> --repo <repo> --slug … --title "…" --event "…" --date "…"
```

## Nützliche Optionen von gen_deck.py

| Option | Zweck |
| --- | --- |
| `--remove-slides 11-21` | Backup-/Anhangsfolien weglassen |
| `--blank "4:x,y,w,h"` | Bereich auf Folie 4 weiß abdecken (Koordinaten in 1920×1080), z. B. für Bilder ohne Rechte |
| `--note "4:x,y,w:Text"` | kleine graue Notiz auf Folie 4 |
| `--insert-title "41:Appendix"` | Zwischentitel vor Folie 41 einfügen |
| `--use-frame 13=s12-03.png` | Folie als ein Standbild zeigen (für Folien, die in Keynote automatisch weiterschalten) |
| `--drop s01-01.png` | einzelnen Aufnahmeschritt weglassen |
| `--exclude-video "iO Clip"` | Video nicht einbinden |

Danach den Talk in `index.html` unter `#talks` eintragen (Titel mit `<a class="text-link" href="talks/<slug>/">`).

## Eigenheiten des Keynote-Players

- Das letzte Event jeder Folie ist der Übergang; die Folie enthält dafür ein flaches Bild der nächsten Folie. Es taucht als letzter Schritt mit genau einer Textur auf und wird automatisch entfernt.
- Solange Videos oder automatische Builds laufen, ignoriert der Player die Sprungeingabe (Foliennummer + Return).
- Folien, die automatisch weiterschalten, lassen sich nicht anhalten: dafür `--use-frame` mit dem Übergangsbild der vorherigen Folie.
- Schritte, die sich nur durch das Standbild eines Videos unterscheiden, erkennt `gen_deck.py` per Bildvergleich und lässt sie weg.

Die Befehle für die aktuellen Decks stehen in `decks.sh`.
