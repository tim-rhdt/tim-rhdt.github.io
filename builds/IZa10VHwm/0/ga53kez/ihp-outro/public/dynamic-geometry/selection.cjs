//==================== SELECTION LOGIC ====================//

selectiøn = {
  "pts": [],
  "lns": [],
  "segs": [],
  "cns": [],
  "cubs": [],
  "arcs": [],
  "locs": [],
  "area": []
};

selectedLinelikes() := selectiøn.lns ++ selectiøn.segs;

allSelectedElements() := selectiøn.pts ++ selectiøn.lns ++ selectiøn.segs ++ selectiøn.cns ++ selectiøn.cubs ++ selectiøn.arcs ++ selectiøn.locs;

deselect() := (
  selectiøn.pts = [];
  selectiøn.lns = [];
  selectiøn.segs = [];
  selectiøn.cns = [];
  selectiøn.cubs = [];
  selectiøn.arcs = [];
  selectiøn.locs = [];
  cømmunicateJS();
);

selectInvisibles() := (
  selectiøn.pts = select(gslp, #.type == "P" & #.visibool == false);
  selectiøn.lns = select(gslp, #.type == "L" & #.visibool == false);
  selectiøn.segs = select(gslp, #.type == "S" & #.visibool == false);
  selectiøn.cns = select(gslp, #.type == "C" & #.visibool == false);
  selectiøn.cubs = select(gslp, #.type == "Cubic" & #.visibool == false);
  selectiøn.arcs = select(gslp, #.type == "A" & #.visibool == false);
  selectiøn.locs = select(gslp, #.type == "Loc" & #.visibool == false);
  cømmunicateJS();
);

selArea() := (
  [
  select(gslp, #.type == "P" & pointInSegmentBounds(#.coords, selectiøn.area_1, selectiøn.area_3)),
  select(gslp, #.type == "L" & lineCheck(#)),
  select(gslp, #.type == "S" & segCheck(#)),
  select(gslp, #.type == "C" & conCheck(#)),
  []
  //TODO: arcs, cubs, loci
  ]
);

lineCheck(l) := (
  regional(a, b, c, d);
  (a, b, c, d) = selectiøn.area;
  if((l.coords)_1 == 0,
    lineEdgeIntersectionInSegmentBounds(l, a, b, a, c) % lineEdgeIntersectionInSegmentBounds(l, c, d, a, c),
    if((l.coords)_2 == 0,
      lineEdgeIntersectionInSegmentBounds(l, b, c, a, c) % lineEdgeIntersectionInSegmentBounds(l, d, a, a, c),
      lineEdgeIntersectionInSegmentBounds(l, a, b, a, c) % lineEdgeIntersectionInSegmentBounds(l, b, c, a, c) %
      lineEdgeIntersectionInSegmentBounds(l, c, d, a, c) % lineEdgeIntersectionInSegmentBounds(l, d, a, a, c);
    );
  );
); //not very nice but whatever...

segCheck(seg) := (
  regional(a, b, c, d, p1, p2, edgeHits);
  (a, b, c, d) = selectiøn.area;
  [p1, p2] = apply(seg.parents, (getCoords(#)).xy);
  if(pointInSegmentBounds(p1, a, c) % pointInSegmentBounds(p2, a, c),
    true,
    edgeHits = [
      lineEdgeIntersectionInSegmentBounds(seg, a, b, p1, p2) & lineEdgeIntersectionInSegmentBounds(seg, p1, p2, a, b),
      lineEdgeIntersectionInSegmentBounds(seg, b, c, p1, p2) & lineEdgeIntersectionInSegmentBounds(seg, p1, p2, b, c),
      lineEdgeIntersectionInSegmentBounds(seg, c, d, p1, p2) & lineEdgeIntersectionInSegmentBounds(seg, p1, p2, c, d),
      lineEdgeIntersectionInSegmentBounds(seg, d, a, p1, p2) & lineEdgeIntersectionInSegmentBounds(seg, p1, p2, d, a)
    ];
    contains(edgeHits, true);
  );
);

conCheck(con) := (
  regional(a, b, c, d, l1, l2, l3, l4, pts, v);
  (a, b, c, d) = selectiøn.area;
  if((con.type != "C") % (a.x == c.x) % (a.y == c.y), false,
    if(contains(apply(con.parents, pointInSegmentBounds(getCoords(#), a, c)), true), true,
      (l1, l2) = (join(a.homog,b.homog), join(b.homog,c.homog));
      (l3, l4) =  (join(c.homog,d.homog), join(d.homog,a.homog));
      pts = intersectCL(con.coords, l1) ++ intersectCL(con.coords, l2)
            ++ intersectCL(con.coords, l3) ++ intersectCL(con.coords, l4);
      v = apply(apply(pts, pointInSegmentBounds(#, a, c)), if(isundefined(#), false, #));
      contains(v, true);
    );
  );
);

toggleSet(a,b) := (a--b)++(b--a);

isHotPoint(position, element) := |(element.coords).xy, position.xy| < (.04 + 0.005*element.size) / pørt.scale;

isHotL(position, element) := (
  regional(p, l);
  l = element.coords;
  p = meet(l, perp(line(l), position));
  |p.xy, position.xy| < .04 / pørt.scale;
);

isHotSeg(position, element) := (
  regional(p, l, a, b, test1, test2);
  l = element.coords;
  p = meet(l, perp(line(l), position));
  test1 = |p.xy, position.xy| < .04 / pørt.scale;
  (a,b) = apply(element.parents, (getCoords(#)).xy);
  test2 = pointInSegmentBounds(p, a, b);
  test1 & test2;
);

isHotLine(position, element) := (
  if(element.alg == "Segment", isHotSeg(position, element), isHotL(position, element));
);

smallQuad = [(.04,0), (-.04,0), (0,.04), (0,-.04)];
isHotConic(position, element) := (
  regional(values);
  values = apply(smallQuad, delta, evaluateConic(element.coords, (position.xy + delta / pørt.scale)++[1]));
  min(values) < 0 & max(values) > 0;
);

isHotCubic(position, element) := (
  regional(values);
  values = apply(smallQuad, delta, evaluateCubic(element.coords, (position.xy + delta / pørt.scale)++[1]));
  min(values) < 0 & max(values) > 0;
);

isHotArc(position, element) := (); //TODO

//isHotLoc(position, element) := (); //TODO

//TODO: tweak catching radius depending on screenresolution()
elementsAtPos(position) := (
  regional(sPoints, sLines, sSegments, sConics, sCubics, nearPoints, nearLines, nearSegments, nearConics, nearArcs, nearCubics);
  nearPoints = select(pts, (#.visibool == true) & isHotPoint(position, #));
  nearLines = select(lns, (#.visibool == true) & isHotL(position, #));
  nearSegments = select(segs, (#.visibool == true) & isHotSeg(position, #));
  nearConics = select(cns, (#.visibool == true) & isHotConic(position, #));
  nearArcs = select(arcs, (#.visibool == true) & isHotArc(position, #));
  nearCubics = select(cubs, (#.visibool == true) & isHotCubic(position, #));
  //nearLoci

  if(nearPoints == [], sPoints = [], sPoints = nearPoints_[-1]);
  sLines = if(sPoints == [], nearLines, []);
  sSegments = if(sPoints == [], nearSegments, []);
  sConics = if(sPoints == [], nearConics, []);
  sArcs = if(sPoints == [], nearArcs, []);
  sCubics = if(sPoints == [], nearCubics, []);
  //sLoci

  // Contract: (points, lines, segments, conics, cubics)
  (sPoints, sLines, sSegments, sConics, sCubics); //TODO
);

highlightHotMovables(position) := (
  regional(els);
  els = (elementsAtPos(position));
  highlight = movable~~(els_1++els_2++els_3++els_4++els_5);
  if(highlight != [], highlight = highlight_[-1]);
  highlight;
);

highlightHot(position) := (
  regional(els);
  els = (elementsAtPos(position));
  highlight = (els_1++els_2++els_3++els_4++els_5);
  highlight;
);
