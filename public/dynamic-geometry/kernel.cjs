//==================== GLOBAL OBJECTS AND VARIABLES ====================//

reset() := (
  gslptmp = [];
  gslp = [];
  hash = {};
  gløbal = {
    "newel": {},
    "move": {},
    "calc": {},
    "update": {},
    "pos": [0,0],
    "downpos": [0,0],
    "inAction": false,
    "shiftDown": false,
    "snapToGrid": false
  };
  //calc, move and update are global variable names for geometric elements in the respective algorithms

  //TODO: encapsule these global variables into a global object
  highlight = [];
  movers = [];
  movable = [];
  parameterEls = [];
  erasedElements = [];
  pts = [];
  lns = [];
  segs = [];
  cns = [];
  arcs = [];
  cubs = [];
  locs = [];
  sets = [];
  visibøøls = [];
);
reset();

pørt = {
  "hexagonScale": 0.003,
  "nbhScale": 0.001,
  "axes": false,
  "grid": false,
  "scale": 1,
  "translation": [0,0],
  "previousTrafo": [[1,0,0],[0,1,0],[0,0,1]],
  "adjPreviousTrafo": [[1,0,0],[0,1,0],[0,0,1]],
  "trafo": [[1,0,0],[0,1,0],[0,0,1]],
  "adjTrafo": [[1,0,0],[0,1,0],[0,0,1]]
};
pørt.MooreNbh = flatten(apply([-2,-1,0,-1,2], k, apply([-2,-1,0,1,2], l, [k,l])));
pørt.gaussianBlur = flatten([[1,4,7,4,1],[4,16,26,16,4],[7,26,41,26,7],[4,16,26,16,4],[1,4,7,4,1]]/273);

updatePørt() := (
  //pørt.trafo = normalizeAbs(pørt.trafo); //necessary?
  pørt.adjTrafo = adjoint3(pørt.trafo);
  pørt.scale = pørt.trafo_1_1 / pørt.trafo_3_3;
  pørt.translation = [pørt.trafo_1_3, pørt.trafo_2_3] / pørt.trafo_3_3;
);


//==================== KERNEL ====================//

recalc(element) := (
  gløbal.calc = element; //no reassignment necessary afterwards b/c dicts are reference types
  calcAlgs:(element.alg);
);

recalcAll() := (
  apply(gslp, element, recalc(element));
);

recalcDependent(element) := (
  recalc(element); //maybe not necessary?
  apply(element.recalc, recalc(getEl(#)));
);

recalcDepNoLoc(element) := (
  if(element.type != "Loc", recalc(element));
  apply(element.recalc,
    if(getEl(#).type != "Loc", recalc(getEl(#)));
  );
);

unique(list) := (
  regional(newList);
  newList = [];
  apply(list, entry,
    if(!contains(newList, entry), newList = newList ++ [entry])
  );
  newList
);

pointOnAlgs = [
  "PointOnLine",
  "PointOnSegment",
  "PointOnConic",
  "PointOnCubic"
];

movableAlgs = pointOnAlgs ++ ["Free","CircleMR"];

intersectionAlgs = [
  "IntersectionConicLine",
  "IntersectionCircleCircle",
  "IntersectionConicConic",
  "IntersectionCubicLine",
  "IntersectionPoint"
];

parameterAlgs = movableAlgs ++ intersectionAlgs;

//conjectures = [];

histøry = [];
histøryActions = [];
histøryTime = 0;
updateHistøry = true;
updateHistøry() := (
  if(select(gslptmp, #.alg != "Old") != [],
    histøry = (histøry)_(1..histøryTime) ++ [select(gslptmp, #.alg != "Old")];
    histøryActions = (histøryActions)_(1..histøryTime) ++ ["Add"];
    histøryTime = histøryTime + 1;
  );
  if(erasedElements != [],
    histøry = (histøry)_(1..histøryTime) ++ [erasedElements];
    histøryActions = (histøryActions)_(1..histøryTime) ++ ["Erase"];
    histøryTime = histøryTime + 1;
  );
);

updateLists() := (
  movable = select(gslp, contains(movableAlgs, #.alg));
  parameterEls = select(gslp, contains(parameterAlgs, #.alg));
  hash = {}; //hash needs to be rewritten every time because there is no clean way of removing temporary entries
  apply(1..length(gslp),
    hash_((gslp_#).name) = gslp_#;
  );
  pts = select(gslp, #.type == "P");
  lns = select(gslp, #.type == "L");
  segs = select(gslp, #.type == "S");
  cns = select(gslp, #.type == "C");
  arcs = select(gslp, #.type == "A");
  cubs = select(gslp, #.type == "Cubic");
  locs = select(gslp, #.type == "Loc");
  sets = select(gslp, #.type == "Set");
  cømmunicateJS();
);

computeRecalc(element, visited) := (
  regional(deps, indirect);
  if( contains(visited, element.name)
  , //then
  []
  , //else
  newVisited = visited ++ [element.name];
  deps = element.recalc;
  indirect = flatten(
    apply(deps, d,
      computeRecalc(getEl(d), newVisited)
    );
  );
  unique(deps ++ indirect);
  );
);

//TODO: Fully support ".definedIncidences", ".recalc" via undo and redo.
//TODO: Undo and redo for "Erase" and "Move" events
undo() := (
  if(histøryTime > 0,
    if(histøryActions_histøryTime == "Add",
      updateHistøry = false;
      erase(histøry_histøryTime);
      updateHistøry = true;
    );
    if(histøryActions_histøryTime == "Erase",
      gslptmp = histøry_histøryTime;
      updateHistøry = false;
      finalizeTmp();
      updateHistøry = true;
    );
    histøryTime = max([0, histøryTime - 1]);
    deselect();
    highlight = [];
    updateLists();
    recalcAll();
  );
);
redo() := (
  if(histøryTime + 1 <= length(histøry),
    histøryTime = histøryTime + 1;
    if(histøryActions_histøryTime == "Add",
      gslptmp = histøry_histøryTime;
      updateHistøry = false;
      finalizeTmp();
      updateHistøry = true;
    );
    if(histøryActions_histøryTime == "Erase",
      updateHistøry = false;
      erase(histøry_histøryTime);
      updateHistøry = true;
    );
    deselect();
    highlight = [];
    updateLists();
    recalcAll();
  );
);

erase(input) := (
  regional(done, erased);
  done = false;
  erased = input;
  erasedElements = erased;
  gslp = gslp -- erased;
  apply(gslp, element,
    element.recalc = element.recalc -- apply(erased, #.name);
    element.definedIncidences = element.definedIncidences -- apply(erased, #.name);
    element.deducedIncidences = element.deducedIncidences -- apply(erased, #.name);
  );
  while(!done,
    erased = apply(erased, element, element.name);
    erased = select(gslp, element, length(element.parents ~~ erased) > 0);
    erasedElements = erasedElements ++ erased;
    gslp = gslp -- erased;
    apply(gslp, element,
      element.recalc = element.recalc -- apply(erased, #.name);
      element.definedIncidences = element.definedIncidences -- apply(erased, #.name);
      element.deducedIncidences = element.deducedIncidences -- apply(erased, #.name);
    );
    if(length(erased) == 0, done = true);
  );

  if(updateHistøry, updateHistøry());
  erasedElements = [];
  deselect();
  highlight = [];
  updateLists();
);

getEl(name) := (hash_name);
getCoords(name) := (hash_name).coords;

//TODO: Diese Pipeline nochmal in Ruhe durchgehen: macht sie überhaupt etwas? Das richtige?
getParameterAttribute(element) := (
  if(element.alg == "CircleMR", element.radius,
  if(contains(movableAlgs, element.alg), element.ref,
  if(contains(intersectionAlgs, element.alg), element.tracing
  )));
);

setParameterAttribute(element, value) := (
  if(element.alg == "CircleMR", element.radius = value,
  if(contains(movableAlgs, element.alg), element.ref = value,
  if(contains(intersectionAlgs, element.alg), element.tracing = value
  )));
);


backup(saveName) := forall(parameterEls, element, element_saveName = getParameterAttribute(element));
restore(saveName) := forall(parameterEls, element, setParameterAttribute(element, element_saveName));


//==================== LABELS ====================//

letters = "ABCDEFGHKLMNOPQRSTUVWXYZ";
pointLetters = apply(1..length(letters), letters_#);
letters = "abcdefghklmnopqrstuvwxyz";
lineLetters = apply(1..length(letters), letters_#);

nextLabel(type) := (
  regional(labs, lab, avail, ct);
  lab = "";
  labs = apply(gslp, #.name);

  if(type == "P",
    avail = pointLetters--labs;
    if(avail != [],
      lab = avail_1,
      ct = 0;
      while(contains(labs, "P"+ct), ct = ct+1);
      lab = "P"+ct;
    );
  );

  if(type == "C",
    ct = 0;
    while(contains(labs, "C"+ct), ct = ct+1);
    lab = "C"+ct;
  );

  if(type == "A",
    ct = 0;
    while(contains(labs, "A"+ct), ct = ct+1);
    lab = "A"+ct;
  );

  if(type == "Loc",
    ct = 0;
    while(contains(labs, "Loc"+ct), ct = ct+1);
    lab = "Loc"+ct;
  );

  if(type == "Cubic",
    ct = 0;
    while(contains(labs, "Cubic"+ct), ct = ct+1);
    lab = "Cubic"+ct;
  );

  if(type == "Set",
    ct = 0;
    while(contains(labs, "Set"+ct), ct = ct+1);
    lab = "Set"+ct;
  );

  if(linelike(type),
    avail = lineLetters--labs;
    if(avail != [],
      lab = avail_1,
      ct = 0;
      while(contains(labs, "L"+ct), ct = ct+1);
      lab = "L"+ct;
    );
  );

  lab;
);


//==================== TMP ELEMENTS ====================//


easyIncidences = ["Meet", "IntersectionConicLine", "IntersectionConicConic", "IntersectionCubicLine", "IntersectionCubicConic",
                  "IntersectionCubicCubic", "PointOnLine", "PointOnSegment", "PointOnConic", "PointOnCubic", "Join", "Segment",
                  "CircleBy3", "ConicBy5", "CubicBy9", "Arc", "IntersectionPoint"];
otherIncidences = ["Parallel", "Perpendicular", "CircleMP", "CubicBy4", "CayleyBacharach"];

finalizeTmp() := (
  regional(subst, oldname, newname);
  subst = {};
  // Collect temporary names which need to be updated
  apply(gslptmp, element,
    if(element.alg != "Old",
      oldname = element.name;
      newname = nextLabel(element.type);
      element.name = newname;
      element.parents = apply(element.parents, if(isstring(subst_#), subst_#, #));
      subst_oldname = newname;
      gslp = gslp++[element];
      ,
      oldname = element.name;
      newname = (element.parents)_1;
      element.name = newname;
      subst_oldname = newname;
      selectiøn.pts = selectiøn.pts -- [element];
    );
  );
  updateLists();

  apply(gslptmp, element,
    if(contains(easyIncidences, element.alg),
      element.definedIncidences = element.definedIncidences ++ element.parents;
      apply(element.parents, arg,
        getEl(arg).definedIncidences = getEl(arg).definedIncidences ++ [element.name];
      ),
      if(element.alg == "Parallel" % element.alg == "Perpendicular",
        element.definedIncidences = element.definedIncidences ++ [element.parents_1];
        getEl(element.parents_1).definedIncidences = getEl(element.parents_1).definedIncidences ++ [element.name];
      );
      if(element.alg == "CircleMP",
        element.definedIncidences = element.definedIncidences ++ [element.parents_2];
        getEl(element.parents_2).definedIncidences = getEl(element.parents_2).definedIncidences ++ [element.name];
      );
    );
  );

  //Call probabilistic prover on elements from gslptmp, which tries to deduce additional incidences from the given ones
  //must be called after the above apply loop so that all defined incidences are already updated
  //startProbabilistproofFromElement will also update the incidences of the old elements, so it only needs to be called on the new ones.
  apply(gslptmp, element,
    //certainness is for now 10, but can be adjustet depending on impact on performance/correctness
    if(element.alg != "Old",
      if(debugMode, print("Starting probabilistic prover for element " + element.name));
      startProbabilisticProofFromElement(element, 10);
    );
  );

  //Recalc Structure
  //Phase 1: Direct dependencies
  apply(gslp, element,
    apply(element.parents, arg,
      getEl(arg).recalc = getEl(arg).recalc ++ [element.name];
    );
  );
  //Phase 2: Transitive dependencies
  apply(gslp, element,
    element.recalc = computeRecalc(element, []);
  );

  if(updateHistøry, updateHistøry());
  gslptmp = [];
  gløbal.newel = {};
  updateLists();
);

//TODO: Add which algorithm has additional parameters!!
types = {
  "Free":"P",
  "Mid":"P",
  "Old":"P",
  "Meet":"P",
  "PolarPoint":"P",
  "CayleyBacharach":"P",
  "IntersectionPoint":"P",
  "IntersectionConicLine":"Set",
  "IntersectionConicConic":"Set",
  "IntersectionCubicLine":"Set",
  "IntersectionCubicConic":"Set",
  "IntersectionCubicCubic":"Set",
  "PointOnLine":"P",
  "PointOnSegment":"P",
  "PointOnConic":"P",
  "PointOnCubic":"P",
  "Join":"L",
  "Parallel":"L",
  "Perpendicular":"L",
  "PolarLine":"L",
  "CubicPolarLine":"L",
  "Segment":"S",
  "CircleMR":"C",
  "CircleMP":"C",
  "CircleBy3":"C",
  "ConicBy5":"C",
  "CubicPolarConic":"C",
  "CubicBy9":"Cubic",
  "CubicBy4":"Cubic",
  "Arc":"A",
  "Locus":"Loc"
};

linelike(type) := (type == "L") % (type == "S");
lineLikes() := (lns ++ segs);
isCircle(element) := (element.alg == "CircleMR") % (element.alg == "CircleMP") % (element.alg == "CircleBy3");

createElement(name, alg, parents) := (
  createElement(name, alg, parents, []);
);

  //Dirty: include incidences which hold by definition depending on algorithms ~> vielleicht garnicht so dirty :)
  //Potential bottleneck! Do this for each element individually only if something in the configuration changes!!
  // exception = pts ++ select(gslp, #.alg == "CircleMR" % #.alg == "CircleMP" % #.alg == "PolarLine" % #.alg == "CubicPolarLine" % #.alg == "CubicPolarConic" % #.alg == "CubicBy4" % #.alg == "Locus");
  // apply(pts--movable, pt, pt.definedIncidences = apply(select(gslp--exception, contains(#.parents, pt.name)), elem, elem.name));
  // apply(select(cns, #.alg == "CircleMP"), elem, getEl(elem.parents_2).definedIncidences = getEl(elem.parents_2).definedIncidences ++ [elem.name]);


createElement(name, alg, parents, coords) := (
  regional(type, element);
  type = types_alg;
  element = {
    "type":type,
    "alg":alg,
    "name":name,
    "color":chooseCølor()_type,
    "size":size(),
    "parents":parents,
    "coords":coords,
    "recalc":[],
    "existence":true,
    "visibool":true,
    "alpha":1,
    "definedIncidences":[]
    //"deducedIncidences":[]
  };

  //Set default values for parameter algorithms
  if(alg == "CircleMR", element.radius = 0,
  if(contains(movableAlgs, alg), element.ref = []));
  if(alg == "IntersectionPoint", element.index = 0);
  if(type == "Set", element.tracing = []; element.fallback = []);

  recalc(element);
  hash_name = element;

  if(alg == "Join",
    if(select(lns, line, |normalize3(element.coords) - normalize3(line.coords)| < 0.0001) != [],
      element.alg = "Old";
      element.parents = [select(lns, line, |normalize3(element.coords) - normalize3(line.coords)| < 0.0001)_1.name];
    );
  ); //does only "work" for coinciding joins (in particular not segments, circle by 2 etc.)
  //TODO: generalize this

  /*
  if(select(lns, line, |normalizeAbs(element.coords) - normalizeAbs(line.coords)| < 0.1
    & |normalizeAbs(element.coords) + normalizeAbs(line.coords)| < 0.1) != [],
    conjectures = conjectures ++ [element];
  );
  */
  element;
);


//==================== POINTS ON FLY ====================//

manifest(element) := (
  if(element.alg == "CircleMR",
    element.radius = element.target,
  if(contains(movableAlgs, element.alg),
    element.ref = element.target
  ))
);

createPoint(coords, name) := (
  regional(done, setCreated, slineLikes);
  (spts, slns, ssegs, scns, scubs) = elementsAtPos(coords)_[1,2,3,4,5];
  slineLikes = slns ++ ssegs;
  tmppt = createElement(name, "Free", [], [coords.x,coords.y,1]);
  tmppt.draggable = false;
  done = false;
  setCreated = false;

  //Operations in Order of Priority
  //1P *L *C *Cubic ==> OLD Point
  if(length(spts) == 1,
    done = true;
    tmppt.alg = "Old";
    tmppt.coords = (spts_1).coords;
    tmppt.parents = [(spts_1).name];
  );

  //0P 2+L *C *Cubic ==> Meet
  if(!done & length(slineLikes) >= 2,
    done = true;
    tmppt.alg = "Meet";
    tmppt.parents = [(slineLikes_1).name, (slineLikes_2).name];
  );

  //0P 1L 1+C *Cubic ==> IntersectionConicLine
  if(!done & length(slineLikes) == 1 & length(scns) >= 1,
    done = true;
    setCreated = true;
    //tmppt.alg = if(length((scns_1).definedIncidences ~~ (slineLikes_1).definedIncidences) != 0, "OtherIntersectionConicLine", "IntersectionConicLine");
    tmpset = createElement("SET", "IntersectionConicLine", [(scns_1).name, (slineLikes_1).name]);
    tmpset.tracing = intersectCL((scns_1).coords, (slineLikes_1).coords);
    tmppt.alg = "IntersectionPoint";
    tmppt.parents = [tmpset.name];
    tmppt.index = sort([1,2], |((tmpset.tracing)_#).xy, coords.xy|)_1; //TODO: Is that optimal like that?
  );

  //TODO: 0P 1L 0C 1+Cubic ==> IntersectionCubicLine
  if(!done & length(slineLikes) == 1 & length(scubs) >= 1,
    done = true;
    setCreated = true;
    tmpset = createElement("SET", "IntersectionCubicLine", [(scubs_1).name, (slineLikes_1).name]);
    tmpset.tracing = intersectCubicL((scubs_1).coords, (slineLikes_1).coords);
    tmppt.alg = "IntersectionPoint";
    tmppt.parents = [tmpset.name];
    tmppt.index = sort([1,2,3], |((tmpset.tracing)_#).xy, coords.xy|)_1; //TODO: Is that optimal like that?
  );

  //0P 1L 0C 0Cubic ==> Point on Line or Segment
  if(!done & length(slineLikes) == 1,
    done = true;
    tmppt.draggable = true;
    if((slineLikes_1).type == "L",
      tmppt.alg = "PointOnLine";
      tmppt.parents = [(slineLikes_1).name];
      tmppt.ref = [coords.x,coords.y,1];
    );
    if((slineLikes_1).type == "S",
      tmppt.alg = "PointOnSegment";
      tmppt.parents = [(slineLikes_1).name];
      MovePointOnSegment(tmppt, coords);
      manifest(tmppt);
    );
  );

  //0P 0L 2+Circles 0Cubic==> IntersectionCircleCircle
  if(!done & length(select(scns, isCircle(#))) >= 2,
    done = true;
    setCreated = true;
    tmpset = createElement("SET", "IntersectionCircleCircle", [(scns_1).name, (scns_2).name]);
    tmpset.tracing = intersectCirCir((scns_1).coords, (scns_2).coords);
    //tmppt.index = sort([1,2], |((tmpset.tracing)_#).xy, coords.xy|)_1
    tmppt.alg = "IntersectionPoint";
    tmppt.parents = [tmpset.name];
    tmppt.index = sort([1,2], |((tmpset.tracing)_#).xy, coords.xy|)_1; //TODO: Is that optimal like that?
  );

  //0P 0L 2+C 0Cubic ==> IntersectionConicConic
  if(!done & length(scns) >= 2,
    done = true;
    setCreated = true;
    tmpset = createElement("SET", "IntersectionConicConic", [(scns_1).name, (scns_2).name]);
    tmppt.alg = "IntersectionPoint";
    tmppt.parents = [tmpset.name];
    tmpset.tracing = intersectCC((scns_1).coords, (scns_2).coords);
    tmppt.index = sort(1..4, |((tmpset.tracing)_#).xy, coords.xy|)_1; //TODO: Is that optimal like that?
  );

  //TODO: 0P 0L 1C 1+Cubic ==> IntersectionCubicConic


  //0P 0L 1C 0Cubic ==> Point on Conic
  if(!done & length(scns) == 1,
    done = true;
    tmppt.draggable = true;
    tmppt.alg = "PointOnConic";
    tmppt.parents = [(scns_1).name];
    MovePointOnConic(tmppt, coords);
    manifest(tmppt);
  );

  //TODO: 0P 0L 0C 2+Cubic ==> IntersectionCubicCubic

  //TODO: 0P 0L 0C 1Cubic ==> Point on Cubic
  if(!done & length(scubs) == 1,
    done = true;
    tmppt.draggable = true;
    tmppt.alg = "PointOnCubic";
    tmppt.parents = [(scubs_1).name];
    MovePointOnCubic(tmppt, coords++[1]);
    manifest(tmppt);
    //tmppt.ref = coords;
  );

  //ELSE: 0P 0L 0C 0Cubic ==> (Point remains) Free
  if(!done,
    tmppt.draggable = true;
    tmppt.ref = [coords.x,coords.y,1];
  );

  hash_name = tmppt;
  if(setCreated,
    hash_(tmpset.name) = tmpset;
    recalc(tmpset);
    recalc(tmppt);
    [tmpset, tmppt]
  , //ELSE
    recalc(tmppt);
    [tmppt]
  );
);
