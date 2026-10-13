# Talks → reveal.js

Werkzeuge, mit denen die Folien unter `talks/` entstanden sind. Der Ordner beginnt mit `_`, deshalb veröffentlicht GitHub Pages ihn nicht.

Alle vier Talks sind **native Nachbauten** (C): Text bleibt Text (scharf in jeder Größe, durchsuchbar), Formeln werden zu Vektorgrafik, Abbildungen zu SVG-Ebenen, Builds zu Fragmenten. Dazu kommen Web-Elemente: interaktive Figuren und Live-Applets statt Bildschirmaufnahmen. Die **Bild-Decks** (A, B) sind der schnellere Weg, wenn es nur um eine Online-Kopie geht: Jede Folie und jeder Build-Schritt wird dabei ein Bild. Die Originale (`.key`, Exporte) werden nie verändert, alle Exporte entstehen aus einer Kopie.

Benötigt: Google Chrome, Node ≥ 22, Python 3 mit `pikepdf`, `numpy` und `Pillow`, `ffmpeg`, `cwebp` (libwebp), poppler (`pdftoppm`, `pdftocairo`, `pdfinfo`), Ghostscript (`gs`).

## A. Keynote-Aufnahme (für Bild-Decks und für C)

1. In Keynote (mit einer Kopie der Datei): *Ablage → Exportieren → HTML*.
2. Aufnehmen: headless Chrome spielt den Export ab und fotografiert jeden Build-Schritt.

   ```
   node kcap.mjs "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" /tmp/chrome-kcap \
     "<Export-Ordner>" <capture-ordner> 1.3333333 9351
   ```

   - `KCAP_EXCLUDE="iO Clip"`: Videos, die nicht online sollen (ihr Standbild bleibt im Bild).
   - Warnungen am Ende („after the jump …“) betreffen meist Folien mit Videos oder automatischen Builds. Diese Folien einzeln neu aufnehmen (letztes Argument z. B. `"12,13"`, eigener Capture-Ordner) und mit `python3 merge_cap.py <capture-ordner> <neuer-ordner>` übernehmen.
3. Bild-Deck bauen:

   ```
   python3 gen_deck.py --cap <capture-ordner> --export "<Export-Ordner>" --repo <repo> \
     --slug <ordnername> --title "…" --event "…" --date "…"
   ```

## B. Talk als PDF (Bild-Deck ohne Builds)

```
python3 pdf2cap.py "<Folien>.pdf" <capture-ordner> --pages 1-9
python3 gen_deck.py --cap <capture-ordner> --repo <repo> --slug … --title "…" --event "…" --date "…"
```

## C. Nativer Nachbau

Quelle jedes Talks ist `native/<name>.src.html`. `native/build.mjs` macht daraus `talks/<slug>/index.html`:

```
cd native && npm install          # einmalig: MathJax 4 + STIX-Two-Formelschrift (node_modules wird nicht eingecheckt)
node build.mjs is.src.html ../../..
```

MathJax setzt die Formeln beim Bauen als SVG. Die fertige Seite lädt deshalb weder eine Mathe-Bibliothek noch Formelschriften.

### Aufbau der Quelle

- Eine `<section>` pro Folie, darin `<div class="stage">` (1920×1080, Keynote-Koordinaten).
- Jede Textzeile ist ein Element mit Stilklasse und `data-x`/`data-y`: linker Rand und Grundlinie. Die Stile stehen im JSON-Kopf der Datei (`"styles": {"b85t20": ["hn", 85, 700, false, -0.02]}` = Familie, Größe, Gewicht, kursiv, Laufweite in em); ohne Kopfangabe gelten die Klassen des DGS-Talks.
- `data-m` ist die Formelgröße der Zeile, TeX steht in `\( … \)`.
- `<img class="layer" data-src="fig/…svg">` ist eine Grafikebene: alles, was in Keynote an dieser Stelle der Zeichenreihenfolge und im selben Build-Schritt erscheint.
- Builds: `class="fragment" data-fragment-index="k"` erscheint mit Schritt k, `fragment fade-out` verschwindet.
- `<iframe class="clip applet" data-applet="../applets/…">` ist ein Live-Applet. Es wird nur geladen, solange seine Folie zu sehen ist.
- `<script>`-Blöcke laufen nach dem Start von reveal.js (z. B. die verschiebbare Figur im DGS-Talk).

### Automatisch aus Keynote (Talks `is`, `mxi`, `thesis`)

1. Eine Kopie der `.key` als PDF exportieren (Keynote, *Exportieren → PDF*, oder per AppleScript `export document … as PDF`), außerdem den HTML-Export aufnehmen (A, Schritte 1–2).
2. Konvertieren:

   ```
   extract/convert.sh is <kopie.key> <export.pdf> <capture-ordner> 1-10
   ```

   Das Skript holt sich:
   - die Formeln mit ihrem LaTeX-Quelltext (Keynote legt ihn in jeder `Data/equation-*.pdf` der `.key` ab),
   - Text mit Position, Schrift, Farbe und Laufweite aus dem PDF,
   - die Abbildungen als SVG (Text und Formeln herausgenommen),
   - Build-Schritte und Ausblendungen aus den Aufnahmen.

   Danach misst es die Zeilenlängen in Chrome und gleicht die Laufweiten an.
3. Die Einstellungen pro Talk liegen in `extract/talks/<name>.*.json`:
   - `config.json`, pro Folie:
     - `drop`: Bereiche (Video-Standbilder, Bilder ohne Rechte), die nicht übernommen werden.
     - `force`: Build-Schritte von Hand für Objekte, die sich aus den Aufnahmen nicht ablesen lassen.
     - `raster`: Bereiche, deren Striche Keynote zeigt, der PDF-Export aber nicht. Sie werden aus der Aufnahme übernommen, ohne den Text.
     - `static`: Folie ohne verwertbare Aufnahme (schaltet in Keynote selbst weiter).
   - `deck.json`: Titel, Termin, Schriften, Videos und Applets pro Folie, zusätzliche Stilklassen (`styles`) und `edits`. Das sind Ersetzungen im erzeugten Quelltext, z. B. der Hinweis statt des Escher-Bildes oder die Appendix-Folie; sie bleiben bei jeder neuen Konvertierung erhalten.

### Von Hand (DGS-Talk, `native/dgs.src.html`)

Die Koordinaten kommen aus `gs -q -sDEVICE=txtwrite -dTextFormat=0 -o p%d.xml "<Folien>.pdf"`. `data-dot="99"` setzt dort einen Aufzählungspunkt.

### Schriften

| Original | Ersatz |
| --- | --- |
| Helvetica Neue (IS, M×I, Thesis) | die installierte Helvetica Neue (Mac, iPhone, iPad); sonst Inter, per `size-adjust` auf dieselben Zeilenlängen und Grundlinien gebracht |
| Courier New | die installierte Courier New; sonst IBM Plex Mono |
| Produkt (DGS-Titel) | Roboto Slab |
| Graphik (DGS-Text) | Inter, mit `cv11` für das einstöckige a |
| Andale Mono (DGS-Code) | IBM Plex Mono |
| STIX General (Formeln) | STIX Two (MathJax) |

Produkt und Graphik gehören Commercial Type, Helvetica Neue gehört Monotype: Sie dürfen nicht als Webfont verteilt werden, installierte Schriften des Geräts darf eine Seite aber benutzen. Alle mitgelieferten Schriften stehen unter OFL bzw. Apache 2.0 und liegen in `assets/fonts/`. STIX Two zeichnet seine Zeichen bei gleicher Schriftgröße etwa 6 % größer als STIX General. Deshalb setzt `build.mjs` alle Formeln um diesen Faktor kleiner (`mathScale` im Kopf der Quelle, Standard 0,94). TeX setzt außerdem großzügigere Abstände als Keynote: Freistehende Formeln (Beschriftungen in Abbildungen) werden darum bis zu 12 % kleiner gesetzt, damit sie so breit sind wie in Keynote. Formeln im Fließtext machen ihre Zeile weiterhin um etwa 1–3 % länger.

### Applets (`talks/applets/`)

- **CindyJS**: Build aus `~/Sites/deploy-snapshot`, Apache-2.0-Lizenz in `cindyjs/LICENSE`.
- **`heptagon.html`, `disk-to-quad.html`, `averaging.html`**: aus den Averaging-Applets in `~/Sites/Conformal/Uniformization_git` abgeleitet. Der sichtbare Ausschnitt kann im Link stehen: `disk-to-quad.html#x0,y0,x1,y1`.
- **`mxi-logo.html`**: die Logo-Animation von matrix.imaginary.org mit den Texturen `logos.png` und `colors.png`.
- **Tasten**: Pfeiltasten und Leertaste gehen auch dann an die Folien weiter, wenn man ins Applet geklickt hat.

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

## Eigenheiten von Keynote

- **Übergang**: Das letzte Event jeder Folie ist der Übergang zur nächsten. Die Folie enthält dafür ein flaches Bild der nächsten Folie. Es taucht als letzter Aufnahmeschritt mit genau einer Textur auf und wird automatisch entfernt.
- **Videos**: Solange Videos oder automatische Builds laufen, ignoriert der Player die Sprungeingabe (Foliennummer + Return).
- **Automatisches Weiterschalten**: Solche Folien lassen sich nicht anhalten. Dafür gibt es `--use-frame` mit dem Übergangsbild der vorherigen Folie.
- **Video-Standbilder**: Schritte, die sich nur durch das Standbild eines Videos unterscheiden, erkennt `gen_deck.py` per Bildvergleich und lässt sie weg.
- **Der PDF-Export zeigt alle Objekte zugleich**, auch weiße Formeln und Texte (Platzhalter), Objekte unter weißen Abdeckflächen und Objekte, die später wieder ausgeblendet werden. `extract.py` gleicht das mit den Aufnahmen ab. Es erkennt dabei auch weiße Abdeckungen, die in einem Build verschwinden, und Bilder, die abgedunkelt werden (Deckkraft-Builds).
- **Manches fehlt im PDF-Export ganz** (im M×I- und im Thesis-Talk ein Kreis mit Radius). Ob etwas fehlt, zeigt ein Vergleich der letzten Aufnahme jeder Folie mit dem PDF. Solche Stellen werden per `raster` aus der Aufnahme übernommen.
- **Formeln aus mehreren Teilen**: Keynote setzt farbige Formeln oft aus mehreren Gleichungen zusammen, z. B. „y = refl_A(“ + rotes „x“ + „)“. `extract.py` fügt sie zu einer Formel mit `\color{…}` zusammen; mit den breiteren Zeichen von STIX Two würden die Einzelteile sonst übereinanderlaufen.

Die Befehle für die aktuellen Decks stehen in `decks.sh`.
