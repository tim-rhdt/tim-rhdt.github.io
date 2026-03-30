//==================== COMMUNICATION WHILE RUNNING ====================//

cømmunication = {
  "elementsFound": false,
  "elementsAtPos": [],
  "selection": [],
  "invisibles": []
};

fullType = {
  "P": "Point",
  "L": "Line",
  "S": "Segment",
  "A": "Arc",
  "C": "Conic",
  "Cubic": "Cubic",
  "Loc": "Locus",
  "Set": "Intersection Set"
};

cømmunicateJS() := (
  cømmunication.elementsFound = (flatten(elementsAtPos(møuse().xy)) != []);
  cømmunication.elementsAtPos = apply(flatten(elementsAtPos(møuse().xy)), [#.name, fullType_(#.type)]);
  cømmunication.selection = allSelectedElements();
  cømmunication.invisibles = select(gslp, #.visibool == false);
  javascript("communicationCS = JSON.parse(makeValidJson('"+cømmunication+"'))");
  javascript("updateInformationMenu();");
);



//==================== IMPORT ====================//

// Drag & Drop Input of .cjs files: handled via cindy.evokeCS() on JavaScript level
// Drag & Drop Input of .cdy files: extracted and mostly handled via cindy.evokeCS() on JavaScript level
// But some tweaks are necessary: handled on Cindy level

impørt = {
  "data": [],
  "index": 1,
  "conic": []
};

pointOnConicImpørtHelper(c, x, index) := (
  regional(conic, mid, line);
  conic = getCoords(c);
  mid = adjoint3(conic)_3;
  line = cross(mid, x);
  intersectCL(conic, line)_index;
);

createImpørtElement(name, alg, parents, coords, pars, index) := (
  regional(type, element);
  type = types_alg;
  element = {
    "type":type,
    "alg":alg,
    "name":name,
    "color":cølors_type,
    "size":if(type == "P", 8, 2), 
    "parents":parents,
    "coords":coords,
    "pars":pars,
    "visibool":true,
    "alpha":1,
    "index":index
  };

  recalc(element);
  hash_name = element;

  if(alg == "Join",
    if(select(lns, line, |normalize3(element.coords) - normalize3(line.coords)| < 0.0001) != [],
      element.alg = "Old";
      element.parents = [select(lns, line, |normalize3(element.coords) - normalize3(line.coords)| < 0.0001)_1.name];
    );
  ); //does only "work" for coinciding joins (in particular not segments, circle by 2 etc.)
  //TODO: replace by some kind of prover

  /*
  if(select(lns, line, |normalizeAbs(element.coords) - normalizeAbs(line.coords)| < 0.1
    & |normalizeAbs(element.coords) + normalizeAbs(line.coords)| < 0.1) != [],
    conjectures = conjectures ++ [element];
  );
  */
  element;
);


//==================== EXPORT ====================//

export() := (
  timestamp = seconds() * 1000;

  javascript("setfilenameinput();");
  if(filename != "", exportname = filename, exportname = timestamp);
  
  javascript("exportdownload('"+gslp+"','"+exportname+"');");
  
  /*
  if(exptype == 2, //Modify this later
    javascript("setfilename();");
    str = filebank + timestamp + "$" + str;
    javascript("exportdata('"+str+"');");
    url="http://localhost/CindyInCindy/CiC7?cjs="+filebank+timestamp;
    javascript("copyTextToClipboard('"+url+"')");
  );
  */
);