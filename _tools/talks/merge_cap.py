"""Replaces the video slides of a full capture with their re-capture (which has the video positions).

python3 -I merge_cap.py <full capture dir> <video re-capture dir>
"""
import json
import os
import shutil
import sys

full, redo = sys.argv[1], sys.argv[2]
mf = json.load(open(os.path.join(full, "manifest.json")))
mr = json.load(open(os.path.join(redo, "manifest.json")))
redone = sorted({s["slide"] for s in mr["stops"]})
for n in redone:
    old = [s for s in mf["stops"] if s["slide"] == n]
    new = [s for s in mr["stops"] if s["slide"] == n]
    for s in old:
        os.remove(os.path.join(full, s["file"]))
    for s in new:
        shutil.copy(os.path.join(redo, s["file"]), os.path.join(full, s["file"]))
    print(f"slide {n}: {len(old)} -> {len(new)} stops, videos per stop {[len(s['videos']) for s in new]}")
keep = [s for s in mf["stops"] if s["slide"] not in redone]
mf["stops"] = sorted(keep + [s for s in mr["stops"]], key=lambda s: (s["slide"], s["stage"]))
mf["slides"] = mr["slides"]  # carries the movie frames from the JSON
mf["warnings"] += [f"(video re-capture) {w}" for w in mr["warnings"]]
json.dump(mf, open(os.path.join(full, "manifest.json"), "w"), indent=1)
print("warnings:", mf["warnings"])
