#!/bin/sh
# Rebuilds the decks under talks/ from existing captures (see README.md for how to capture).
# CAP: folder with one capture per talk (is, mxi, thesis, dgs); REPO: the website repository.
set -e
CAP=${CAP:?set CAP to the capture folder}
REPO=${REPO:-$(cd "$(dirname "$0")/../.." && pwd)}
HERE=$(dirname "$0")
EXPORTS=${EXPORTS:-$HOME/Desktop}

python3 "$HERE/gen_deck.py" --cap "$CAP/is" --export "$EXPORTS/Presentation IS" --repo "$REPO" \
  --slug discrete-conformal-maps --title "Selected Convergence Results for Discrete Conformal Maps" \
  --event "Independent Studies" --date "April 2022" --remove-slides 11-21

python3 "$HERE/gen_deck.py" --cap "$CAP/mxi" --export "$EXPORTS/Presentation M×I v2" --repo "$REPO" \
  --slug simple-conformal-maps --title "Real-Time Computation of Simple Conformal Maps" \
  --event "Matrix × Imaginary" --date "31 August 2022" \
  --exclude-video "iO Clip" --use-frame 13=s12-03.png --remove-slides 14-20

# slide 4 shows M. C. Escher's Circle Limit III, slide 36 only that image: not published
python3 "$HERE/gen_deck.py" --cap "$CAP/thesis" --export "$EXPORTS/Presentation Thesis" --repo "$REPO" \
  --slug conformal-maps-gpu --title "Approximation of Conformal Mappings on the GPU" \
  --event "Master’s thesis" --date "2023" --remove-slides 36-40 \
  --blank "4:545,126,828,824" --note "4:545,515,828:Image not shown online for copyright reasons." \
  --insert-title "41:Appendix"

# capture: python3 pdf2cap.py "DGS slides.pdf" "$CAP/dgs" --pages 1-9  (pages 10-15 are trash slides)
python3 "$HERE/gen_deck.py" --cap "$CAP/dgs" --repo "$REPO" \
  --slug dynamic-geometry-system --title "How to Build a Dynamic Geometry System" \
  --event "Public talk, TUM" --date "23 June 2025"
