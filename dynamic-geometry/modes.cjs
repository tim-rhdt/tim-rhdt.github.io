//===============================================//
//==================== MODES ====================//
//===============================================//

//=============== GLOBAL MODE COLLECTION ===============//

møde = "move";
modeSwitchFrom = {}; //calls mode algorithms without input
modeSwitchTo = {}; //calls mode algorithms without input
modeDown = {}; //calls mode algorithms on input "pos"
modeDrag = {}; //calls mode algorithms on input "pos"
modeUp = {}; //calls mode algorithms on input "pos"
modeMove = {}; //calls mode algorithms on input "pos"
//REASON for these dictionaries: Something like
//forall(movablealgs, alg, parse("moveAlgs:("+alg+") := Move"+alg+"(el, pos);"); );
//did not work as alg is always made an undefined variable by parsing.
//(There are no nested strings like "moveAlgs:('"+alg+"')" in CindyJS.)
//Therefore I gave up the separate function names and directly wrote them into the dicts.

setMode(m) := (
  modeSwitchFrom:møde;
  møde = m;
  modeSwitchTo:møde;
);

//=============== TRANSLATE VIEW ===============//
modeDown:"translateView" := (
  gløbal.downpos = møuse().xy;
  pørt.previousTrafo = pørt.trafo;
  pørt.adjPreviousTrafo = pørt.adjTrafo;
);
modeDrag:"translateView" := (
  regional(translation);
  translation = pørt.scale * ((pørt.adjPreviousTrafo * mouse().homog).xy - gløbal.downpos);
  pørt.trafo = [[1,0,translation.x], [0,1,translation.y], [0,0,1]] * pørt.previousTrafo;
  updatepørt();
);
modeUp:"translateView" := (
  regional(translation);
  translation = pørt.scale * ((pørt.adjPreviousTrafo * mouse().homog).xy - gløbal.downpos);
  pørt.trafo = [[1,0,translation.x], [0,1,translation.y], [0,0,1]] * pørt.previousTrafo;
  updatepørt();
  pørt.previousTrafo = pørt.trafo;
  pørt.adjPreviousTrafo = pørt.adjTrafo;
);
modeMove:"translateView" := ();

modeSwitchTo:"translateView" := (finalizeTmp(); deselect(););
modeSwitchFrom:"translateView" := ();
//========================================//


//=============== MOVE ===============//
modeDown:"move" := (
  movers = highlightHotmovables(gløbal.pos);
  clickDetected = true;
  gløbal.downpos = møuse().xy;
  if(movers != [],
    gløbal.move = movers_(-1);
    if(gløbal.move.type == "P",
      moverDiff = (gløbal.move.coords).xy - gløbal.pos,
      moverDiff = (0,0);
    );
  );
);

modeUp:"move" := (
  if(|møuse().xy, gløbal.downpos| > .1, clickDetected = false);
  if(clickDetected,
    (spts, slns, ssegs, scns, scubs) = elementsAtPos(gløbal.pos)_[1,2,3,4,5];
    if(!gløbal.shiftDown, (selectiøn.pts, selectiøn.lns, selectiøn.segs, selectiøn.cns, selectiøn.cubs) = (spts, slns, ssegs, scns, scubs),
      selectiøn.pts = toggleSet(spts, selectiøn.pts);
      selectiøn.lns = toggleSet(slns, selectiøn.lns);
      selectiøn.segs = toggleSet(ssegs, selectiøn.segs);
      selectiøn.cns = toggleSet(scns, selectiøn.cns);
      selectiøn.cubs = toggleSet(scubs, selectiøn.cubs);
    );
    //TODO: Else-case with move history
  );
  selectiøn.area = [];
  recalcAll();
  cømmunicateJS();
);

modeDrag:"move" := (
  if(movers != [],
    regional(regionalMover, start, end, steps, max, done, lambda);
    //gløbal.move = movers_(-1); //global mover not needed anymore
    regionalMover = movers_(-1);
    gløbal.pos = (gløbal.pos + moverDiff)++[1];
    moveAlgs:(regionalMover.alg);

    moverDiff = moverDiff * .99;

    start = getParameterAttribute(regionalMover);
    end = regionalMover.target;
    steps = 2;
    max = 2; //4
    done = false;
    backup("init");

    repeat(max, j,
      if(!done,
        refine = false; //Rename it into gløbal.refine? Also used in algorithms.
        apply(1..steps, par,
          lambda = (1 - exp(pi * i * par/steps)) / 2;
          setParameterAttribute(regionalMover, (1-lambda) * start + lambda * end);
          recalcDepNoLoc(regionalMover);
        );
        done = !refine;
        if(!done,
          steps = 2 * steps;
          if(j != max,
            restore("init");
          );
        );
      );
    );
    apply(movable, element,
      gløbal.update = element;
      updateAlgs:(element.alg);
    );
    ,//ELSE: no mover detected -> draw selection area
    selectiøn.area = [gløbal.downpos, (gløbal.downpos.x, gløbal.pos.y), gløbal.pos.xy, (gløbal.pos.x, gløbal.downpos.y)];
    deselect();
    (selectiøn.pts, selectiøn.lns, selectiøn.segs, selectiøn.cns) = selarea()_[1,2,3,4];
    cømmunicateJS();
  );
);

modeMove:"move" := (
  movers = highlightHotmovables(gløbal.pos);
);

modeSwitchTo:"move" := (finalizeTmp(); deselect(););
modeSwitchFrom:"move" := ();
//========================================//


//=============== ERASE ===============//
modeDown:"erase" := (
  (spts, slns, ssegs, scns, scubs) = elementsAtPos(gløbal.pos)_[1,2,3,4,5];
  selectiøn.pts = (spts ++ selectiøn.pts);
  selectiøn.lns = (slns ++ selectiøn.lns);
  selectiøn.segs = (ssegs ++ selectiøn.segs);
  selectiøn.cns = (scns ++ selectiøn.cns);
  selectiøn.cubs = (scubs ++ selectiøn.cubs);
  gløbal.downpos = møuse().xy;
);
modeDrag:"erase" := (
  selectiøn.area = [gløbal.downpos, (gløbal.downpos.x, (gløbal.pos).y), (gløbal.pos).xy, ((gløbal.pos).x, gløbal.downpos.y)];
  (selectiøn.pts, selectiøn.lns, selectiøn.segs, selectiøn.cns) = selarea()_[1,2,3,4];
);
modeUp:"erase" := (selectiøn.area = []; erase(allSelectedElements()););
modeMove:"erase" := highlightHot(gløbal.pos);
modeSwitchTo:"erase" := erase(allSelectedElements());
modeSwitchFrom:"erase" := ();
//========================================//


//=============== ADD POINT ===============//
modeDown:"singlePoint" := (
  deselect();
  gslptmp = createPoint(gløbal.pos, "TMP");
  highlightHot(gløbal.pos);
);

modeDrag:"singlePoint" := (
  gslptmp = createPoint(gløbal.pos, "TMP");
  highlightHot(gløbal.pos);
);

modeUp:"singlePoint" := (
  selectiøn.pts = select(gslptmp, #.type == "P");
  finalizeTmp();
);

modeMove:"singlePoint" := ();
modeSwitchTo:"singlePoint" := (deselect());
modeSwitchFrom:"singlePoint" := ();
//========================================//


//=============== ADD PARALLEL ===============//
modeDown:"parallel" := (
  regional(slineLikes);
  deselect();
  parallelLine = "";
  (spts, slns, ssegs, scns) = elementsAtPos(gløbal.pos)_[1,2,3,4];
  slineLikes = slns ++ ssegs;
  if(length(slineLikes) == 1,
    parallelLine = (slineLikes_1).name;
    gslptmp = createPoint(gløbal.pos, "TMP");
  );
);

modeDrag:"parallel" := (
  if(parallelLine != "",
    gslptmp = createPoint(gløbal.pos, "TMP") ++
              [createElement("LN", "Parallel", ["TMP", parallelLine])];
    highlightHot(gløbal.pos);
  );
);

modeUp:"parallel" := (
  if(parallelLine != "",
    selectiøn.lns = [gslptmp_2];
    finalizeTmp();
  );
);

modeMove:"parallel" := (
  highlight = elementsAtPos(gløbal.pos)_2 ++ elementsAtPos(gløbal.pos)_3;
);

modeSwitchTo:"parallel" := (
  selectiøn.cns = [];
  selectiøn.cubs = [];
  cømmunicateJS();
  if(length(selectiøn.pts) == 1 & length(selectedLinelikes()) == 1,
    gslptmp = [createElement("LN", "Parallel", [(selectiøn.pts_1).name, (selectedLinelikes()_1).name])];
    deselect();
    selectiøn.lns = gslptmp;
    finalizeTmp();
  );
);
modeSwitchFrom:"parallel" := ();
//========================================//


//=============== ADD PERPENDICULAR ===============//
modeDown:"perpendicular" := (
  regional(slineLikes);
  deselect();
  perpLine = "";
  (spts, slns, ssegs, scns) = elementsAtPos(gløbal.pos)_[1,2,3,4];
  slineLikes = slns ++ ssegs;
  if(length(slineLikes) == 1,
    perpLine = (slineLikes_1).name;
    gslptmp = createPoint(gløbal.pos, "TMP") ++
              [createElement("LN", "Perpendicular", ["TMP", perpLine])];
    highlightHot(gløbal.pos);
  );
);

modeDrag:"perpendicular" := (
  if(perpLine != "",
    gslptmp = createPoint(gløbal.pos, "TMP") ++
              [createElement("LN", "Perpendicular", ["TMP", perpLine])];
    highlightHot(gløbal.pos);
  );
);

modeUp:"perpendicular" := (
  if(perpLine != "",
    selectiøn.lns = [gslptmp_2];
    finalizeTmp();
  );
);

modeMove:"perpendicular" := (
  highlight = elementsAtPos(gløbal.pos)_2 ++ elementsAtPos(gløbal.pos)_3;
);

modeSwitchTo:"perpendicular" := (
  selectiøn.cns = [];
  selectiøn.cubs = [];
  cømmunicateJS();
  if(length(selectiøn.pts) == 1 & length(selectedLinelikes()) == 1,
    gslptmp = [createElement("LN", "Perpendicular", [(selectiøn.pts_1).name, (selectedLinelikes()_1).name])];
    deselect();
    selectiøn.lns = gslptmp;
    finalizeTmp();
  );
);
modeSwitchFrom:"perpendicular" := ();
//========================================//


//=============== MULTIADD ===============//
multiAddDown(position) := (
  deselect();
  pt1 = createPoint(position, "TMP1");
  gslptmp = pt1;
  clickDetected = true;
  gløbal.downpos = møuse().xy;
);

multiAddUp(position) := (
  if(|møuse().xy, gløbal.downpos| > .1, clickDetected = false);
  if(clickDetected,
    gslptmp = [];
    clickDetected = false,
    if(gløbal.newel.type == "P",
      selectiøn.pts = [gslptmp_(-1)],
      if(gløbal.newel.type == "L",
        selectiøn.lns = [gslptmp_(-1)],
        if(gløbal.newel.type == "S",
          selectiøn.segs = [gslptmp_(-1)],
          selectiøn.cns = [gslptmp_(-1)]
        );
      );
    );
  );
  if(getCoords("TMP2") ~= getCoords("TMP1"), //exclude the join of a point with itself (or similar situations)
    gslptmp = []; gløbal.newel = {},
    finalizeTmp();
  );
);

multiAddDrag(position) := (
  pt2 = createPoint(position, "TMP2");
  //TODO: it is possible to join a point through two lines with the meet of these lines (same pos as the point) -> prevent that!!
  multiAddFunc("TMP1", "TMP2");
  gslptmp = pt1 ++ pt2 ++ [gløbal.newel];
  highlightHot(position);
);

multiAddMove(position) := (highlightHot(position));

multiAddSwitchTo() := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  if(length(selectiøn.pts) == 2,
    multiAddFunc((selectiøn.pts_1).name, (selectiøn.pts_2).name);
    gslptmp = [gløbal.newel];
    deselect();
    if(gløbal.newel.type == "P",
      selectiøn.pts = gslptmp,
      if(gløbal.newel.type == "L",
        selectiøn.lns = gslptmp,
        if(gløbal.newel.type == "S", selectiøn.segs = gslptmp);
      );
    );
    finalizeTmp();
  );
);
multiAddSwitchFrom() := ();
//========================================//


//=============== LINE ===============//
modeDown:"singleLine" := multiAddDown(gløbal.pos);
modeDrag:"singleLine" := multiAddDrag(gløbal.pos);
modeUp:"singleLine" := multiAddUp(gløbal.pos);
modeMove:"singleLine" := multiAddMove(gløbal.pos);
modeSwitchTo:"singleLine" := (
  multiAddFunc(name1, name2) := (
    gløbal.newel = createElement("LN", "Join", [name1, name2], [0,0,1]);
  );
  multiAddSwitchTo();
);
modeSwitchFrom:"singleLine" := multiAddSwitchFrom();
//========================================//


//=============== SEGMENT ===============//
modeDown:"singleSegment" := multiAddDown(gløbal.pos);
modeDrag:"singleSegment" := multiAddDrag(gløbal.pos);
modeUp:"singleSegment" := multiAddUp(gløbal.pos);
modeMove:"singleSegment" := multiAddMove(gløbal.pos);
modeSwitchTo:"singleSegment" := (
  multiAddFunc(name1, name2) := (
    gløbal.newel = createElement("SG", "Segment", [name1, name2], [0,0,1]);
  );
  multiAddSwitchTo();
);
modeSwitchFrom:"singleSegment" := multiAddSwitchFrom();
//========================================//


//=============== MID ===============//
modeDown:"middle" := multiAddDown(gløbal.pos);
modeDrag:"middle" := multiAddDrag(gløbal.pos);
modeUp:"middle" := multiAddUp(gløbal.pos);
modeMove:"middle" := multiAddMove(gløbal.pos);
modeSwitchTo:"middle" := (
  multiAddFunc(name1, name2) := (
    gløbal.newel = createElement("MP", "Mid", [name1, name2], [0,0,1]);
  );
  multiAddSwitchTo();
);
modeSwitchFrom:"middle" := multiAddSwitchFrom();
//========================================//


//=============== CIRCLEMP ===============//
modeDown:"circleMP" := multiAddDown(gløbal.pos);
modeDrag:"circleMP" := multiAddDrag(gløbal.pos);
modeUp:"circleMP" := multiAddUp(gløbal.pos);
modeMove:"circleMP" := multiAddMove(gløbal.pos);
modeSwitchTo:"circleMP" := (
  multiAddFunc(name1, name2) := (
    gløbal.newel = createElement("CC", "CircleMP", [name1, name2]);
  );
  multiAddSwitchTo();
);
modeSwitchFrom:"circleMP" := multiAddSwitchFrom();
//========================================//


//=============== CIRCLEMR ===============//
modeDown:"circleMR" := multiAddDown(gløbal.pos);
modeDrag:"circleMR" := (
  multiAddDrag(gløbal.pos);
  regional(center, border);
  gløbal.newel = gslptmp_(-1);
  center = select(gslptmp, #.name == "TMP1")_1;
  border = select(gslptmp, #.name == "TMP2")_1;
  if(border.alg != "Old",
    gløbal.newel.radius = |(gløbal.pos).xy, (center.coords).xy|;
    gslptmp = pt1 ++ [gløbal.newel],
    gløbal.newel = createElement("CC", "CircleMP", ["TMP1", "TMP2"]);
    gslptmp = pt1 ++ pt2 ++ [gløbal.newel];
  );
  recalc(gløbal.newel);
);
////THIS IS A BIT DIFFERENT -> LOOK AGAIN AT GLOBAL.EL-HANDLING

modeUp:"circleMR" := multiAddUp(gløbal.pos);
modeMove:"circleMR" := multiAddMove(gløbal.pos);
modeSwitchTo:"circleMR" := (
  deselect();
  multiAddFunc(name1, name2) := (
    gløbal.newel = createElement("CC", "CircleMR", [name1], []);
  );
);
modeSwitchFrom:"circleMR" := multiAddSwitchFrom();
//========================================//


//=============== SELECTADD ===============//
selectAddDown(position) := (
  clickDetected = true;
  spts = elementsAtPos(position)_1;
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  cømmunicateJS();
  selectAddFunc();
  gløbal.downpos = møuse().xy;
);

selectAddDrag(position) := (
  if(|position.xy, gløbal.downpos.xy| > 0.5 / pørt.scale,
    clickDetected = false;
    gslptmp = [];
    if(spts == [],
      selectiøn.area = [gløbal.downpos, (gløbal.downpos.x, position.y), position.xy, (position.x, gløbal.downpos.y)];
      deselect();
      selectiøn.pts = selarea()_1;
      cømmunicateJS();
    );
  );
);

selectAddUp(position) := (
  if(clickDetected,
    gslptmp = createPoint(gløbal.pos, "TMP");
    selectiøn.pts = selectiøn.pts ++ gslptmp;
    finalizeTmp();
  );
  selectiøn.area = [];
  selectAddFunc();
  cømmunicateJS();
);

selectAddMove(position) := (highlight = elementsAtPos(position)_1);
selectAddSwitchTo() := (
  selectAddFunc();
);
selectAddSwitchFrom() := ();
//========================================//


//=============== CIRCLEBY3 ===============//
modeDown:"circleBy3" := selectAddDown(gløbal.pos);
modeDrag:"circleBy3" := selectAddDrag(gløbal.pos);
modeUp:"circleBy3" := selectAddUp(gløbal.pos);
modeMove:"circleBy3" := selectAddMove(gløbal.pos);

modeSwitchTo:"circleBy3" := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  selectAddFunc() := (
    if(length(selectiøn.pts) == 3,
      gslptmp = [createElement("CC", "CircleBy3", apply(selectiøn.pts, #.name))];
      deselect();
      selectiøn.cns = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"circleBy3" := selectAddSwitchFrom();
//========================================//


//=============== ARC ===============//
modeDown:"singleArc" := selectAddDown(gløbal.pos);
modeDrag:"singleArc" := selectAddDrag(gløbal.pos);
modeUp:"singleArc" := selectAddUp(gløbal.pos);
modeMove:"singleArc" := selectAddMove(gløbal.pos);

modeSwitchTo:"singleArc" := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  selectAddFunc() := (
    if(length(selectiøn.pts) == 3,
      gslptmp = [createElement("Arc", "Arc", apply(selectiøn.pts, #.name))];
      deselect();
      selectiøn.arcs = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"singleArc" := selectAddSwitchFrom();
//========================================//


//=============== CONICBY5 ===============//
modeDown:"conicBy5" := selectAddDown(gløbal.pos);
modeDrag:"conicBy5" := selectAddDrag(gløbal.pos);
modeUp:"conicBy5" := selectAddUp(gløbal.pos);
modeMove:"conicBy5" := selectAddMove(gløbal.pos);

modeSwitchTo:"conicBy5" := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  selectAddFunc() := (
    if(length(selectiøn.pts) == 5,
      gslptmp = [createElement("CC", "ConicBy5", apply(selectiøn.pts, #.name))];
      deselect();
      selectiøn.cns = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"conicBy5" := selectAddSwitchFrom();
//========================================//


//=============== POLAR ===============//
modeDown:"polar" := (
  (spts, slns, ssegs, scns) = elementsAtPos(gløbal.pos)_[1,2,3,4];
  if(length(spts ++ slns ++ ssegs ++ scns) == 0, deselect());
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  selectiøn.lns = toggleSet(slns, selectiøn.lns);
  selectiøn.segs = toggleSet(ssegs, selectiøn.segs);
  selectiøn.cns = toggleSet(scns, selectiøn.cns);
  selectAddFunc();
  cømmunicateJS();
);
modeDrag:"polar" := ();
modeUp:"polar" := ();
modeMove:"polar" := highlightHot(gløbal.pos);

modeSwitchTo:"polar" := (
  selectAddFunc() := (
    if(length(selectiøn.cns) == 1 & (length(selectiøn.pts) + length(selectedLinelikes()) == 1),
      gslptmp = apply(selectiøn.pts, createElement("TML"+#.name, "PolarLine", [(selectiøn.cns_1).name, #.name]));
      gslptmp = gslptmp ++ (apply(selectedLinelikes(), createElement("TMP"+#.name, "PolarPoint", [(selectiøn.cns_1).name, #.name])));
      deselect();
      selectiøn.pts = select(gslptmp, #.type == "P");
      selectiøn.lns = select(gslptmp, #.type == "L");
      selectiøn.segs = select(gslptmp, #.type == "S");
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"polar" := selectAddSwitchFrom();
//========================================//


//=============== CUBICBY9 ===============//
modeDown:"cubicBy9" := selectAddDown(gløbal.pos);
modeDrag:"cubicBy9" := selectAddDrag(gløbal.pos);
modeUp:"cubicBy9" := selectAddUp(gløbal.pos);
modeMove:"cubicBy9" := selectAddMove(gløbal.pos);

modeSwitchTo:"cubicBy9" := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  selectAddFunc() := (
    if(length(selectiøn.pts) == 9,
      gslptmp = [createElement("CC", "CubicBy9", apply(selectiøn.pts, #.name))];
      deselect();
      selectiøn.cubs = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"cubicBy9" := selectAddSwitchFrom();
//========================================//


//=============== CAYLEY-BACHARACH ===============//
modeDown:"cayleyBacharach" := selectAddDown(gløbal.pos);
modeDrag:"cayleyBacharach" := selectAddDrag(gløbal.pos);
modeUp:"cayleyBacharach" := selectAddUp(gløbal.pos);
modeMove:"cayleyBacharach" := selectAddMove(gløbal.pos);

modeSwitchTo:"cayleyBacharach" := (
  selectiøn.lns = []; selectiøn.segs = []; selectiøn.cns = [];
  cømmunicateJS();
  selectAddFunc() := (
    if(length(selectiøn.pts) == 8,
      gslptmp = [createElement("CC", "CayleyBacharach", apply(selectiøn.pts, #.name))];
      deselect();
      selectiøn.pts = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"cayleyBacharach" := selectAddSwitchFrom();
//========================================//


//=============== CUBICBY1P4L ===============//
modeDown:"cubicBy4" := (
  (spts, slns, ssegs, scns) = elementsAtPos(gløbal.pos)_[1,2,3,4];
  if(length(spts ++ slns ++ ssegs ++ scns) == 0, deselect());
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  selectiøn.lns = toggleSet(slns, selectiøn.lns);
  selectiøn.segs = toggleSet(ssegs, selectiøn.segs);
  selectAddFunc();
  gløbal.downpos = møuse().xy;
  cømmunicateJS();
);
modeDrag:"cubicBy4" := selectAddDrag(gløbal.pos);
modeUp:"cubicBy4" := selectAddUp(gløbal.pos);
modeMove:"cubicBy4" := (highlight = elementsAtPos(gløbal.pos)_1 ++ elementsAtPos(gløbal.pos)_2 ++ elementsAtPos(gløbal.pos)_3);

modeSwitchTo:"cubicBy4" := (
  selectiøn.cns = [];
  selectAddFunc() := (
    if(length(selectiøn.pts) == 1 & length(selectedLinelikes()) == 4,
      gslptmp = [createElement("CC", "CubicBy4", apply(selectiøn.pts, #.name)++apply(selectedLinelikes(), #.name))];
      deselect();
      selectiøn.cubs = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"cubicBy4" := selectAddSwitchFrom();
//========================================//


//=============== CUBICPOLARLINE ===============//
modeDown:"cubicPolarLine" := (
  (spts, slns, ssegs, scns, scubs) = elementsAtPos(gløbal.pos)_[1,2,3,4,5];
  if(length(spts ++ slns ++ ssegs ++ scns ++ scubs) == 0, deselect());
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  selectiøn.cubs = toggleSet(scubs, selectiøn.cubs);
  selectAddFunc();
  gløbal.downpos = møuse().xy;
  cømmunicateJS();
);
modeDrag:"cubicPolarLine" := selectAddDrag(gløbal.pos);
modeUp:"cubicPolarLine" := selectAddUp(gløbal.pos);
modeMove:"cubicPolarLine" := (highlight = elementsAtPos(gløbal.pos)_1 ++ elementsAtPos(gløbal.pos)_5);

modeSwitchTo:"cubicPolarLine" := (
  selectiøn.cns = [];
  selectAddFunc() := (
    if(length(selectiøn.pts) == 1 & length(selectiøn.cubs) == 1,
      gslptmp = [createElement("LN", "CubicPolarLine", apply(selectiøn.pts, #.name)++apply(selectiøn.cubs, #.name))];
      deselect();
      selectiøn.lns = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"cubicPolarLine" := selectAddSwitchFrom();
//========================================//


//=============== CUBICPOLARCONIC ===============//
modeDown:"cubicPolarConic" := (
  (spts, slns, ssegs, scns, scubs) = elementsAtPos(gløbal.pos)_[1,2,3,4,5];
  if(length(spts ++ slns ++ ssegs ++ scns ++ scubs) == 0, deselect());
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  selectiøn.cubs = toggleSet(scubs, selectiøn.cubs);
  selectAddFunc();
  gløbal.downpos = møuse().xy;
  cømmunicateJS();
);
modeDrag:"cubicPolarConic" := selectAddDrag(gløbal.pos);
modeUp:"cubicPolarConic" := selectAddUp(gløbal.pos);
modeMove:"cubicPolarConic" := (highlight = elementsAtPos(gløbal.pos)_1 ++ elementsAtPos(gløbal.pos)_5);

modeSwitchTo:"cubicPolarConic" := (
  selectiøn.cns = [];
  selectAddFunc() := (
    if(length(selectiøn.pts) == 1 & length(selectiøn.cubs) == 1,
      gslptmp = [createElement("CC", "CubicPolarConic", apply(selectiøn.pts, #.name)++apply(selectiøn.cubs, #.name))];
      deselect();
      selectiøn.cns = gslptmp;
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"cubicPolarConic" := selectAddSwitchFrom();
//========================================//


//=============== LOCUS ===============//
modeDown:"locus" := (
  (spts, slns, ssegs, scns) = elementsAtPos(gløbal.pos)_[1,2,3,4];
  if(length(spts ++ slns ++ ssegs ++ scns) == 0, deselect());
  selectiøn.pts = toggleSet(spts, selectiøn.pts);
  selectiøn.lns = toggleSet(slns, selectiøn.lns);
  selectiøn.segs = toggleSet(ssegs, selectiøn.segs);
  selectiøn.cns = toggleSet(scns, selectiøn.cns);
  selectAddFunc();
  cømmunicateJS();
);
modeDrag:"locus" := (); //selectAddDrag(pos);
modeUp:"locus" := (); //selectAddUp(pos);
modeMove:"locus" := highlightHot(gløbal.pos); //selectAddMove(pos);

modeSwitchTo:"locus" := (
  selectAddFunc() := (
    if(length(selectiøn.pts) == 2 & length(selectiøn.cns) == 1,
      if(!contains((selectiøn.pts_1).parents, (selectiøn.cns_1).name), selectiøn.pts = [selectiøn.pts_2, selectiøn.pts_1]);
      gslptmp = [createElement("Loc", "Locus", [(selectiøn.pts_1).name, (selectiøn.pts_2).name, (selectiøn.cns_1).name])];
      deselect();
      finalizeTmp();
    );
    if(length(selectiøn.pts) == 2 & length(selectedLinelikes()) == 1,
      if(!contains((selectiøn.pts_1).parents, (selectedLinelikes()_1).name), selectiøn.pts = [selectiøn.pts_2, selectiøn.pts_1]);
      gslptmp = [createElement("Loc", "Locus", [(selectiøn.pts_1).name, (selectiøn.pts_2).name, (selectedLinelikes()_1).name])];
      deselect();
      finalizeTmp();
    );
  );
  selectAddSwitchTo();
);
modeSwitchFrom:"locus" := ();
//========================================//
