//==================== MOUSE ====================//

møuse() := (
  pørt.adjTrafo * mouse().homog;
);

doDown() := (
  if(tøric.drawPicture & insideToricTriangle(mouse().homog, tøric.refPts, false),
    // draw induced real pts
    tøric.preimageUI = mouse().homog;
    tøric.preimageBary = insideToricTriangle(mouse().homog, tøric.refPts, true);
  ,
    gløbal.pos = møuse().xy;
    gløbal.inAction = true;
    modeDown:møde;
  );
);

doDrag() := (
  if(gløbal.inAction,
    gløbal.pos = møuse().xy;
    modeDrag:møde;
  );
);

doUp() := (
  if(gløbal.inAction,
    gløbal.pos = møuse().xy;
    modeUp:møde;
    gløbal.inAction = false;
  );
);

doMove() := (
  gløbal.pos = møuse().xy;
  modeMove:møde;
  gløbal.inAction = false;
);

// containtment test for toric picture here as it is called here
// flag for true/false output or coordinates
insideToricTriangle(p, vertices, flag) := (
  regional(a, b, c, val1, val2, val3);
  [a, b, c] = apply(vertices, #++[1]);
  val1 = det(a,b,p);
  val2 = det(b,c,p);
  val3 = det(c,a,p);
  if(flag,
  [val3, val1, val2] / (val1+val2+val3),
  val1>=0 & val2>=0 & val3>=0
  );
);