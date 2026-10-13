#!/bin/sh
# Converts a Keynote talk into a native slide source (../<name>.src.html) and builds it.
#
#   convert.sh <name> <copy.key> <export.pdf> <capture dir> <slides, e.g. 1-35,41>
#
# Needs talks/<name>.deck.json and talks/<name>.config.json (see README, section C), the PDF export of a copy
# of the .key and the build captures of its HTML export (kcap.mjs). Work files go to $WORK (default /tmp/talk-<name>).
# CALIBRATE=0 skips the letter-spacing calibration (two extra builds).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
NATIVE=$(dirname "$HERE")
REPO=$(cd "$NATIVE/../../.." && pwd)
CHROME=${CHROME:-"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"}
NAME=$1; KEY=$2; PDF=$3; CAP=$4; SLIDES=$5
[ -n "$SLIDES" ] || { echo "usage: convert.sh <name> <copy.key> <export.pdf> <capture dir> <slides>"; exit 1; }
WORK=${WORK:-/tmp/talk-$NAME}
mkdir -p "$WORK/eq" "$WORK/ref" "$WORK/txt"

# formulas: the LaTeX source sits in the XMP packet of each Data/equation-*.pdf inside the .key
(cd "$WORK/eq" && unzip -o -q -j "$KEY" "Data/equation-*.pdf" 2>/dev/null || true)
python3 "$HERE/eqindex.py" "$WORK/eq" "$WORK/eq.json"
# reference renders and text layout of the PDF export
pdftoppm -r 72 -png "$PDF" "$WORK/ref/p"
gs -q -dNOPAUSE -dBATCH -sDEVICE=txtwrite -dTextFormat=0 -o "$WORK/txt/p%02d.xml" "$PDF"

python3 "$HERE/extract.py" "$WORK" "$PDF" "$CAP" "$SLIDES" "$HERE/talks/$NAME.config.json"

build() {
  [ -f "$HERE/talks/$NAME.calib.json" ] && cp "$HERE/talks/$NAME.calib.json" "$WORK/calib.json"
  python3 "$HERE/writesrc.py" "$WORK" "$HERE/talks/$NAME.deck.json" "$NATIVE/$NAME.src.html" "$REPO"
  (cd "$NATIVE" && node build.mjs "$NAME.src.html" ../../..)
}
build
if [ "${CALIBRATE:-1}" = 1 ]; then
  SLUG=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['slug'])" "$HERE/talks/$NAME.deck.json")
  for pass in 1 2; do
    node "$HERE/measure.mjs" "$CHROME" "$REPO/talks/$SLUG/index.html" "$WORK/native-w.json"
    cp "$HERE/talks/$NAME.calib.json" "$WORK/calib.json" 2>/dev/null || rm -f "$WORK/calib.json"
    python3 "$HERE/calibrate.py" "$WORK" "$WORK/native-w.json"
    cp "$WORK/calib.json" "$HERE/talks/$NAME.calib.json"
    build
  done
fi
