//==================== COLORS ====================//

cølors = {
  "point": (201, 94, 134)/255,
  "line": (38, 88, 115)/255,
  "highlight": (255, 255, 255)/255,
  "cubic": (232, 168, 124)/255,
  "canvas": (232,238,247)/255,
  //not yet changed by theme change
  "grid": (0, 0, 0)/255,
  "axis": (0, 0, 0)/255,
  "selectionArea": (255, 255, 255)/255,
  "selectionAreaAlpha": 0.5
  // TODO: move alpha to stÿle?
};

chooseCølor() := ({
  "P": cølors.point,
  "L": cølors.line,
  "S": cølors.line,
  "C": cølors.line,
  "A": cølors.line,
  "Cubic": cølors.cubic,
  "Loc": cølors.cubic,
  "Set": (0,0,0)
});


//==================== GLOBAL DRAW SETTINGS ====================//

// globalize variables and routines using stÿle dict
pointBorder = false;
drawLabels = true;
darkenDependent = true;
dependentPoint = 0.7;
mathMode = false;
debugMode = false;
drawDual = false;


//==================== SIZES ====================//

// globalize variables and routines using stÿle dict
size() := if(type == "P", 8, 8);
lineSize(size) := size/4;
conicSize(size) := size/4;
cubicSize(size) := size/4;
dualOfPointSize(size) := size/6;
dualOfLineSize(size) := size/2;
dualOfConicSize(size) := size*2/3;
dualAlpha := 0.7;
lineHighlightSize = 6;
pointHighlightSize = 4;
outlineWidth = 5;
pointBorderCorrect() := if(pointBorder,1.3,1); //1.3 seems to be the border coefficient from CindyJS!
//labelOffset(pointSize) := (.1,.1) + pointSize * (.001,.001) - screenresolution() / 20 * (.01,.01);
labelOffset(pointSize) := 150/screenresolution() * ((.05,.05) + pointSize * (.003,.003));
//TODO: Look in CindyJS source code to determine the relation between screenresolution and the internal coordinate system?
gridSize = 0.4;
axisSize = 3;


println("===== Import to csinit successful =====");