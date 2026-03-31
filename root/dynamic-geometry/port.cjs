//==================== PORT ====================//

drawLocus(l) := (
  drawpolygon(l.coords, color->l.color, size->2*l.size, alpha->l.alpha);
);

drawCubicH(c) := (
  tinyHexagonH = apply(1..6, k, gauss(exp(i*(k/6)*2*pi))) * pørt.hexagonScale * (cubicSize(c.size) + lineHighlightSize); //0.16; // 0.04 * (c.size/1.5 + 2);
  colorplot(
    sum(apply(1..length(pørt.MooreNbh), k,
      px = (# - pørt.translation) + pørt.nbhScale * pørt.MooreNbh_k;
      pørt.gaussianBlur_k * if(
        min(apply(tinyHexagonH, delta, evaluateCubic(c.coords, [px_1 + delta_1, px_2 + delta_2, pørt.scale]))) < 0 &
        max(apply(tinyHexagonH, delta, evaluateCubic(c.coords, [px_1 + delta_1, px_2 + delta_2, pørt.scale]))) > 0,
        cølors.highlight++[1], [0,0,0,0])
    ));
  );
);

drawCubic(c) := (
  tinyHexagon = apply(1..6, k, gauss(exp(i*(k/6)*2*pi))) * pørt.hexagonScale * cubicSize(c.size);
  colorplot(
    sum(apply(1..length(pørt.MooreNbh), k,
      px = (# - pørt.translation)  + pørt.nbhScale * pørt.MooreNbh_k;
      pørt.gaussianBlur_k * if(
        min(apply(tinyHexagon, delta, evaluateCubic(c.coords, [px_1 + delta_1, px_2 + delta_2, pørt.scale]))) < 0 &
        max(apply(tinyHexagon, delta, evaluateCubic(c.coords, [px_1 + delta_1, px_2 + delta_2, pørt.scale]))) > 0,
        (c.color)++[c.alpha], [0,0,0,0])
    ));
  );
);


//Anders als Variablennamen sind Funkionsnamen in CindyJS nicht case-sensitive
drawConH(c) := (
  drawCon(c, cølors.highlight, (conicSize(c.size) + lineHighlightSize), 1);
);

drawCon(c) := (
  drawCon(c, c.color, conicSize(c.size), c.alpha);
);
/* // Does not work like that: we need to manipulate the coordinates of c!
drawDualOfConicH(c) := (
  drawCon(adjoint3(c), cølors.highlight, (dualOfConicSize(c.size) + lineHighlightSize), dualAlpha);
);
drawDualOfConic(c) := (
  drawCon(adjoint3(c), c.color, dualOfConicSize(c.size), dualAlpha);
);
*/

drawCon(c, col, si, alpha) := (
  if(c.existence & c.visibool,
    drawconic(transpose(pørt.adjTrafo) * c.coords * pørt.adjTrafo, color->col, size->si, alpha->alpha);
    if(drawDual, drawconic(transpose(pørt.adjTrafo) * adjoint3(c.coords) * pørt.adjTrafo, color->col, size->dualOfConicSize(si), alpha->dualAlpha));
    // IST DAS DIE KORREKTE DUALE TRANSFORMATION??  
    //TODO: c.coords/c.coords_2_2 bei JRG -> Warum?
  );
);

drawArcsH(a) := (
  drawArcs(a, cølors.highlight, (lineSize(a.size) + lineHighlightSize), 1);
);

drawArcs(a) := (
  drawArcs(a, a.color, lineSize(a.size), a.alpha);
);

drawArcs(a, col, si, alpha) := (
  regional(start, via, end);
  start = pørt.trafo * getCoords((a.parents)_1);
  via = pørt.trafo * getCoords((a.parents)_2);
  end = pørt.trafo * getCoords((a.parents)_3);
  if(a.existence & a.visibool,
    drawarc(start, via, end, color->col, size->si, alpha->alpha);
  );
);

drawLineH(l) := (
  drawLine(l, cølors.highlight, (lineSize(l.size) + lineHighlightSize), 1);
);

drawLine(l) := (
  drawLine(l, l.color, lineSize(l.size), l.alpha);
);

drawDualOfPointH(p) := (
  drawLine(p, cølors.highlight, (dualOfPointSize(p.size) + lineHighlightSize), dualAlpha);
);

drawDualOfPoint(p) := (
  drawLine(p, p.color, dualOfPointSize(p.size), dualAlpha);
);

drawLine(l, col, si, alpha) := (
  regional(in1, in2);
  if(l.existence & l.visibool,
    draw(line(transpose(pørt.adjTrafo) * normalize3(l.coords)), color->col, size->si, alpha->alpha);
    //if(drawDual,draw(point(transpose(pørt.adjTrafo) * normalize3(l.coords)), color->col, size->si*4, noborder->true, alpha->alpha/2));
  );
);

drawSegmentH(l) := (
  drawSegment(l, cølors.highlight, (lineSize(l.size) + lineHighlightSize), 1);
);

drawSegment(l) := (
  drawSegment(l, l.color, lineSize(l.size), l.alpha);
);

drawSegment(l, col, si, alpha) := (
  regional(in1, in2);
  if(l.existence & l.visibool,
    in1 = pørt.trafo * getCoords((l.parents)_1);
    in2 = pørt.trafo * getCoords((l.parents)_2);
    draw(in1, in2, color->col, size->si, alpha->alpha);
  );
);

drawPointH(p) := (
  drawPoint(p, cølors.highlight, (p.size + pointHighlightSize), 1);
);

drawDualOfLineH(l) := (
  drawPoint(l, cølors.highlight, (dualOfLineSize(l.size) + pointHighlightSize), dualAlpha);
);

drawDualOfLine(l) := (
  drawPoint(l, l.color, dualOfLineSize(l.size), dualAlpha);
);

drawPoint(p, color, size, alpha) := (
  regional(pp);
  pp = normalize3(pørt.trafo * p.coords);
  if(p.existence & p.visibool & |pp*conjugate(pp) - pp*pp| < 0.01,
    //TODO: ~= does not correctly identify almost real points for IntersectCC
    //Is there a better way? Make them real "by hand"??
    draw(pp, color->color, size->(size/pointBorderCorrect()), border->pointBorder, alpha->alpha);
    //if(drawDual,draw(line(pp), color->color, size->linesize(p.size), alpha->p.alpha/2));
  );
  /*
  if(p.existence & p.visibool & |pp*conjugate(pp) - pp*pp| > 0.01,
    //draw(pp + im(pp), color->(1,0,0), size->3, border->pointBorder, alpha->p.alpha);
  );
  */
);

drawPointTmp(p) := (
  regional(color);
  if(p.existence & p.visibool,
    color = p.color;
    if(!contains(movableAlgs, p.alg), color = color * if(darkenDependent, dependentPoint, 1));
    draw((pørt.trafo * p.coords), color->color, size->(p.size/pointBorderCorrect()), border->pointBorder);
  );
);
//TODO: Integrate into drawPoint?

drawLabel(p) := (
  regional(pp, color);
  pp = normalize3(pørt.trafo * p.coords);

  if(p.existence & p.visibool & |pp*conjugate(pp) - pp*pp| < 0.01,
    //TODO: ~= does not correctly identify almost real points for IntersectCC
    //Is there a better way? Make them real "by hand"??
    if(drawLabels,
      drawtext((pp).xy+labelOffset(p.size), if(mathMode, "$"+p.name+"$", p.name), color->cølors.Text, size->16, outlinecolor->cølors.canvas, outlinewidth->outlineWidth);
    );
  );
  if(p.existence & p.visibool & drawLabels & |pp*conjugate(pp) - pp*pp| > 0.01,
    //drawtext((pp+im(pp)).xy+labelOffset(p.size), if(mathMode, "$"+p.name+"$", p.name), color->cølors.Text, size->16, outlinecolor->cølors.canvas, outlinewidth->outlineWidth);
  );
);

drawGrid() := (
  regional(lowerLeft, upperRight);
  lowerLeft = (pørt.adjTrafo * screenbounds()_4).xy;
  upperRight = (pørt.adjTrafo * screenbounds()_2).xy;

  if(pørt.grid,
    apply(((floor(lowerLeft.x))..ceil(upperRight.x)),
      draw(line(transpose(pørt.adjTrafo) * (1,0,-#)), size->gridSize, color->cølors.grid);
    );
    apply((floor(lowerLeft.y)..ceil(upperRight.y)),
      draw(line(transpose(pørt.adjTrafo) * (0,1,-#)), size->gridSize, color->cølors.grid);
    );
  );
  if(pørt.axes,
    draw(line(transpose(pørt.adjTrafo) * (0,1,0)), size->axisSize, color->cølors.axis);
    draw(line(transpose(pørt.adjTrafo) * (1,0,0)), size->axisSize, color->cølors.axis);
  );
);

//////
tøric = {
  "drawPicture": false,
  "size": 1,
  "resolution": 500, //which resolution is best?
  "imageCount": 0,
  "curvePoints": 10000,
  "initPoints": 2000,
  "incrPoints": 500,
  "preimageBary": [],
  "preimageUI": [],
  "quadratic": false
};
updateToricRefPts() := (
  tøric.refPts = apply(
    [[0,0], [1,0], [.5,sqrt(3)/2]] * tøric.size,
    1.5 * # + screenbounds()_4.xy + [.2,.2]
  );
);
updateToricRefPts();

resetToricPicture() := (
  apply(gslp, x,
    clearimage(x.name);
    tøric_("count"+(x.name)) = 0;
    tøric_(x.name) = nø;
  );
  tøric.initPoints = tøric.curvePoints / 5;
  playanimation();
);

computeToricPicture() := (
  apply(gslp, x,
    if(contains(["L", "C", "Cubic"], x.type),
      // init procedure for new curve
      if(isundefined(tøric_(x.name)),
        tøric_(x.name) = []; //recompute control point for each curve
        tøric_("count"+(x.name)) = 0;
        createimage(x.name, tøric.resolution, 7/8 * tøric.resolution);
        tøric.imageCount = tøric.imageCount + 1;
      );

      // have curve coordinates changed?
      if(length(tøric_(x.name)) != 0,
      if(x.type == "L",
        if(|x.coords * tøric_(x.name)| > 0.0001,
          clearimage(x.name);
          tøric_("count"+(x.name)) = 0),
      if(x.type == "C",
        if(|tøric_(x.name) * x.coords * tøric_(x.name)| > 0.0001,
          clearimage(x.name);
          tøric_("count"+(x.name)) = 0),
      if(x.type == "Cubic",
        if(|evaluateCubic(x.coords, tøric_(x.name))| > 0.0001,
          clearimage(x.name);
          tøric_("count"+(x.name)) = 0;
      )))));

      // draw stepwise more points until maximum number is reached
      if( tøric_("count"+(x.name)) < tøric.curvePoints,
        regional(pts, spt, morePoints, exponent);
        morePoints = if(tøric_("count"+(x.name)) == 0, tøric.initPoints, tøric.incrPoints);
        exponent = if(tøric.quadratic, 2, 1);
        canvas(tøric.refPts_1, tøric.refPts_2, x.name,
          pts = if(x.type == "L", sampleLineCP2(morePoints, x.coords),
                if(x.type == "C", sampleConicCP2(morePoints, x.coords),
                if(x.type == "Cubic", sampleCubicCP2(morePoints, x.coords))));
          tøric_(x.name) = pts_1;
          tøric_("count"+(x.name)) = tøric_("count"+(x.name)) + morePoints;
          apply(pts, pt,
            spt = apply(pt, |#|^(exponent)) / sum(apply(pt, |#|^(exponent)));
            draw(spt_1*tøric.refPts_2 + spt_2*tøric.refPts_3 + spt_3*tøric.refPts_1,
              color->x.color, size->0.5, alpha->0.4, border->false
            );
          );
        );
      );
    );
  );
);

drawToricPicture() := (
  regional(bary, totalPointCount, exponent);
  totalPointCount = 0;
  exponent = if(tøric.quadratic, 2, 1);
  fillpolygon(tøric.refPts, color->cølors.canvas);
  drawpolygon(tøric.refPts, color->[0,0,0], size->4);
  apply(gslp, x,
    if(x.type == "P" & x.visibool,
      bary = apply(x.coords, |#|^(exponent)) / sum(apply(x.coords, |#|^(exponent)));
      draw(bary_1*tøric.refPts_2 + bary_2*tøric.refPts_3 + bary_3*tøric.refPts_1,
        color->x.color, size->x.size/2, border->pointBorder
      );
    );
    if(contains(["L", "C", "Cubic"], x.type),
      if(x.visibool, drawimage(tøric.refPts_1, tøric.refPts_2, x.name));
      totalPointCount = totalPointCount + tøric_("count"+(x.name));
    );
  );
  // adaptive pause/play depending on if all points for all curves are plotted
  if(totalPointCount < (tøric.imageCount * tøric.curvePoints),
    playanimation(),
    pauseanimation()
  );
);

drawToricPreimage() := (
  if(length(tøric.preimageBary) > 0,
    regional(coords, barycoords, exponent);
    exponent = if(tøric.quadratic, 2, 1);
    draw(tøric.preimageUI, color->[0,0,0], size->5, border->false);
    colorplot(
      coords = [(# - pørt.translation)_1, (# - pørt.translation)_2, pørt.scale];
      barycoords = apply(coords, coord, |coord|^(exponent)) / sum(apply(coords, coord, |coord|^(exponent)));
      if(|barycoords - tøric.preimageBary| < 0.01, [1,0,0,1], [0,0,0,0])
    );
  );
);

/*
drawToricPreimage() := (
  regional(px, barycoords);
  if(length(tøric.preimageBary) > 0,
    colorplot(
      px = #;
      barycoords = [px_1^2, px_2^2, 1] / (px_1^2 + px_2^2 + 1);
      if(|barycoords - tøric.preimageBary| < 0.01,
        [1,0,0,1],
        [0,0,0,0]
      )
    );
    draw(tøric.preimageUI, color->[0,0,0], size->5, border->false);
  );
);
*/
//////

redraw() := (
  //Draw Canvas -> TODO: noch nötig mit neuer html/CindyJS backgroundcolor?
  fillpolygon(screenbounds(), color->cølors.canvas);

  //Draw Selection Area
  fillpolygon(apply(selectiøn.area, pørt.trafo * #.homog), alpha->cølors.selectionAreaAlpha, color->cølors.selectionArea);

  //Draw Grid/Axes
  drawGrid();

  //Highlight Movers and Highlighted
  if(highlight != [],
    apply(highlight, x,
      if(x.type == "P", drawPointH(x); if(drawDual, drawDualOfPointH(x)));
      if(x.type == "L", drawLineH(x); if(drawDual, drawDualOfLineH(x)));
      if(x.type == "S", drawSegmentH(x));
      if(x.type == "C", drawConH(x));
      if(x.type == "A", drawArcsH(x));
      if(x.type == "Cubic", drawCubicH(x));
    );
  );

  //Highlight Selected Elements
  apply(selectiøn.pts, x, if(x.type == "P", drawPointH(x); if(drawDual, drawDualOfPointH(x))));
  apply(selectiøn.lns, x, if(x.type == "L", drawLineH(x); if(drawDual, drawDualOfLineH(x))));
  apply(selectiøn.segs, x, if(x.type == "S", drawSegmentH(x)));
  apply(selectiøn.cns, x, if(x.type == "C", drawConH(x)));
  apply(selectiøn.arcs, x, if(x.type == "A", drawArcsH(x)));
  apply(selectiøn.cubs, x, if(x.type == "Cubic", drawCubicH(x)));

  //Draw One-Dimensional Objects
  apply(gslp, x,
    if(drawDual & x.type == "P", drawDualOfPoint(x));
    if(x.type == "L", drawLine(x));
    if(x.type == "S", drawSegment(x));
    if(x.type == "C", drawCon(x));
    if(x.type == "A", drawArcs(x));
    if(x.type == "Loc", drawLocus(x));
    if(x.type == "Cubic", drawCubic(x));
  );

  //Draw Temporary One-Dimensional Objects
  apply(gslptmp, x,
    if(drawDual & x.type == "P", drawDualOfPoint(x));
    if(x.type == "L", drawLine(x));
    if(x.type == "S", drawSegment(x));
    if(x.type == "C", drawCon(x));
    if(x.type == "A", drawArcs(x));
  );

  //Draw Points
  apply(gslp, x,
    if(drawDual & x.type == "L", drawDualOfLine(x));
    if(x.type == "P",
      drawPoint(x, if(!contains(movableAlgs, x.alg) % !x.draggable, x.color * if(darkenDependent, dependentPoint, 1), x.color), x.size, x.alpha);
    );
  );

  //Draw Temporary Points
  apply(gslptmp, x,
    if(drawDual & x.type == "L", drawDualOfLine(x));
    if(x.type == "P", drawPointTmp(x));
  );

  //Draw Labels
  apply(gslp, x,
    if(x.type == "P", drawLabel(x));
  );

  //Draw Toric Picture
  if(tøric.drawPicture,
    updateToricRefPts();
    computeToricPicture();
    drawToricPicture();
    drawToricPreimage();
  );
);
