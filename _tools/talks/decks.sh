#!/bin/sh
# Builds the decks under talks/ from their sources in native/ (see README.md, section C).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
cd "$HERE/native"
for deck in dgs is mxi thesis; do
  node build.mjs "$deck.src.html" ../../..
done

# The sources of is, mxi and thesis were converted from copies of the Keynote files and then edited in
# extract/talks/*.deck.json. To convert them again (needs the PDF export and the kcap captures):
#   extract/convert.sh is     "Presentation IS copy.key"     is.pdf     <captures>/is     1-10       (11–21: backup slides)
#   extract/convert.sh mxi    "Presentation M×I v2 copy.key" mxi.pdf    <captures>/mxi    1-13       (14–20: backup slides)
#   extract/convert.sh thesis "Presentation Thesis copy.key" thesis.pdf <captures>/thesis 1-35,41    (36–40: Escher, backup)
# The DGS source (dgs.src.html) is written by hand; pages 10–15 of its PDF are trash slides.
