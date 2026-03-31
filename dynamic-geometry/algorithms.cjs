//====================================================//
//==================== ALGORITHMS ====================//
//====================================================//


//==================== GLOBAL ALGORITHM COLLETION ====================//

calcAlgs = {}; //calls geometric element algorithms on input "el"
moveAlgs = {}; //calls geometric element algorithms on inputs "el" and "pos"
updateAlgs = {}; //calls geometric element algorithms on input "el"



//==================== SOLVING LINEAR SYSTEMS ====================//

//TODO This is probably not needed anymore

//solves Ax + b = 0 for some b in B 
//and returns x
//We actually solve (A, b) /X\ = 0
// 
/*                        \1/
Austauschverfahren(A, b) := (
    AustauschverfahrenA(appendColumn(A, b));
);

//Solves Ax = 0
AustauschverfahrenA(A) := (
);

//Does one pivot step at A_p_q and thus solves equation p for variable x_q
pivotStep(A, B, p, q) := (
    //remember pivcol and pivrow entries, as we need them maybe...
    //this is more complicated than i thought, for now TODO...
    pivCol = kthCol()

    pivRow = A_p;
    //Start with pivot step for A
    apply(1..length(A), k,
        apply(1..length(A_1), l,
            //check for outside pivot row
            if(k != p, 
                //check for outside pivot column
                if(l != q,
                    //base case
                    A_k_l = A_k_l - (A_k_q * A_p_l) / A_p_q;
                );
            );
        );       
    );
    //pivot column (we do this seperately, because we need the original values of these entries in the apply loop above)
    apply(1..length(A), k,
        //check for outside pivot row
        if(k != p,
            A_k_q = A_k_q / A_p_q;
        );
    );
    //pivot row
    apply(1..length(A_1), l,
        //check for outside pivot column
        if(l != q,
            A_p_l = - A_p_l / A_p_q;
        );
    );
    //pivot element
    A_p_q = 1 / A_p_q;

    //Now look at the b's, they are disjoint from the pivot columns, but they obviously have pivot row elements
    apply(1..length(B), k,
        apply(1..length(B_1), l,
            //check for outside pivot row
            if(k != p, 
                //no need to check for outside pivot column
                B_k_l = B_k_l - (A_k_q * A_p_l) / A_p_q;
            );
        );       
    );
);

//maybe index lists?
*/

//==================== INCIDENCES ====================//

//Function that determines for 2 elements if they are incident
//For now only incidences of points with other elements are considered, TODO later: tangentiality
isIncidentOld(element1, element2) := (
    regional(boolIncidence);
    //initialize as false, so if we have a case that is not covered yet we always return false
    boolIncidence = false;
    //Case disctinction....
    if(element1.type == "P",
        if(element2.type == "L",
            //incidence of point and line must be checked
            boolIncidence = isPointIncidentToLine(element1, element2);
        ,//else, i.e. element2.type != "L"; We check for Conic/Cubic here
            if(element2.type == "C",
                //incidence of point and conic must be checked
                boolIncidence = isPointIncidentToConic(element1, element2);
            );
            //This is not the nicest way to write this, but i dont want to put that many if statements into eachother...
            if(element2.type == "Cubic",
                //incidence of point and conic must be checked
                boolIncidence = isPointIncidentToCubic(element1, element2);
            );
        );
    ,//else, i.e. element1.type != "P", so we check if element2 is a point instead
        if(element2.type == "P",
            if(element1.type == "L",
                //incidence of line and point must be checked
                boolIncidence = isPointIncidentToLine(element2, element1);
            ,//else, i.e. element1.type != "L"; We check for Conic/Cubic here
                if(element1.type == "C",
                    //incidence of conic and point must be checked
                    boolIncidence = isPointIncidentToConic(element2, element1);
                );
                //This is not the nicest way to write this, but i dont want to put that many if statements into eachother...
                if(element1.type == "Cubic",
                    //incidence of point and conic must be checked
                    boolIncidence = isPointIncidentToCubic(element2, element1);
                );
            );
        ,//else: neither of the elements is a point, now we look at tangents
        );
    );
    boolIncidence;
);

isIncident(element1, element2) := (
    regional(boolIncidence);
    //initialize as false, so if we have a case that is not covered yet we always return false
    boolIncidence = false;
    //Case disctinction....
    if(element1.type == "P",
        //Second case disctinction....
        if(element2.type == "P",
            //is this necessary? There is a problem when joining a point incident to a,b,c with the intersection of b and c
            //Mit Tim besprochen: Wird vorher abgefangen
        ,//else
            if(element2.type == "L",
                //incidence of point and line must be checked
                boolIncidence = isPointIncidentToLine(element1, element2);
            ,//else, i.e. element2.type != "L"; We check for Conic/Cubic here
                if(element2.type == "C",
                    //incidence of point and conic must be checked
                    boolIncidence = isPointIncidentToConic(element1, element2);
                ,//else
                    if(element2.type == "Cubic",
                        //incidence of point and cubic must be checked
                        boolIncidence = isPointIncidentToCubic(element1, element2);
                    );
                );
            );
        );   
    ,//else, i.e. element1.type != "P"
        if(element1.type == "L",
            //Second case disctinction....
            if(element2.type == "P",
                //incidence of line and point must be checked
                boolIncidence = isPointIncidentToLine(element2, element1);
            ,//else
                if(element2.type == "L",
                    //incidence of line and line must be checked
                    //is this necessary? => boolIncidence = isLineIncidentToLine(element1, element2);
                    //probably not, the problem only occurs for 2 points...
                    //Mit Tim besprochen: Wird vorher abgefangen
                ,//else, i.e. element2.type != "L"; We check for Conic/Cubic here
                    if(element2.type == "C",
                        //incidence of line and conic must be checked
                        boolIncidence = isLineIncidentToConic(element1, element2); //Tangentiality
                    ,//else
                        if(element2.type == "Cubic",
                            //incidence of line and cubic must be checked
                            boolIncidence = isLineIncidentToCubic(element1, element2); //Tangentiality
                        );
                    );
                );
            ); 
        ,//else, i.e. element1.type != "P", "L"
            if(element1.type == "C",
                //Second case disctinction....
                if(element2.type == "P",
                    //incidence of conic and point must be checked
                    boolIncidence = isPointIncidentToConic(element2, element1);
                ,//else
                    if(element2.type == "L",
                        //incidence of conic and line must be checked
                        boolIncidence = isLineIncidentToConic(element2, element1); //Tangentiality
                    ,//else, i.e. element2.type != "L"; We check for Conic/Cubic here
                        if(element2.type == "C",
                            //incidence of conic and conic must be checked
                            //This is very important to not get multiple equal conics!! however maybe not here?
                            //boolIncidence = isConicIncidentToConic(element1, element2); //Essentially equality of Conics
                            //Mit Tim besprochen: Wird vorher abgefangen
                            //This is possible if 2 of the 4 intersection points are equal!
                        ,//else
                            if(element2.type == "Cubic",
                                //incidence of conic and cubic must be checked
                                boolIncidence = isConicIncidentToCubic(element1, element2); //Best Degree 2 approximation
                            );
                        );
                    );
                ); 
            ,//else, i.e. element1.type != "P", "L", "C"
                if(element1.type == "Cubic",
                    //Second case disctinction....
                    if(element2.type == "P",
                        //incidence of cubic and point must be checked
                        boolIncidence = isPointIncidentToCubic(element2, element1);
                    ,//else
                        if(element2.type == "L",
                            //incidence of cubic and line must be checked
                            boolIncidence = isLineIncidentToCubic(element2, element1); //Tangentiality
                        ,//else, i.e. element2.type != "L"; We check for Conic/Cubic here
                            if(element2.type == "C",
                                //incidence of cubic and conic must be checked
                                boolIncidence = isConicIncidentToCubic(element2, element1); //Best Degree 2 approximation
                            ,//else
                                if(element2.type == "Cubic",
                                    //incidence of cubic and cubic must be checked
                                    //This is not as important, as one usually does not have to many cubics, but still bad things can happen
                                    //boolIncidence = isCubicIncidentToCubic(element1, element2); //Essentially equality of cubics
                                    //Mit Tim besprochen: Wird vorher abgefangen
                                );
                            );
                        );
                    ); 
                );
            );
        );
    );
    boolIncidence;
);

// --- Point incidences --- 

//This function checks if a point lies on a line
isPointIncidentToLine(point, line) := (
    //calculate scalar product and check if it is ~= zero
    (point.coords * line.coords) ~= 0;
);

//This function checks if a point lies on a conic
isPointIncidentToConic(point, conic) := (
    //calculate point^T * conic * point product and check if it is ~= zero
    //|((point.coords * conic.coords) * point.coords)| < tøl;
    ((point.coords * conic.coords) * point.coords) ~= 0;
);

//This function checks if a point lies on a cubic
isPointIncidentToCubic(point, cubic) := (
    //calculate the tensor product of three times the point to the cubic tensor and check if it is ~= zero
    vectorVectorVectorTensorProd(point.coords, point.coords, point.coords, cubic.coords) ~= 0;
);

// --- other incidences ---

isLineIncidentToConic(point, line) := (
    //calculate scalar product and check if it is ~= zero
    (point.coords * line.coords) ~= 0;
);

isLineIncidentToCubic(point, line) := (
    //this is actually very hard...
    false;
);

isConicIncidentToCubic(point, line) := (
    //this is actually very very hard...
    false;
);

// --- Tensor functions ---

//This function calculates three vectors multiplied to a 3D tensor from all directions, resulting in a single number
vectorVectorVectorTensorProd(v1, v2, v3, tensor3D) := (
    [(v1 * tensor3D_1) * v2, (v1 * tensor3D_2) * v2, (v1 * tensor3D_3) * v2] * v3;
);

//This function calculates one vector multiplied to any symmetric tensor, resulting in a tensor that has one dimension less
vectorTensorProd(v1, Tensor) := (

);


//==================== CONIC SUBROUTINES ====================//

evaluateConic(c, p) := (
  p * c * p;
);

conicBy5(a, b, c, d, e) := (
  regional(m1, m2, m);
  m1 = transpose([cross(a, b)]) * [cross(c, d)];
  m2 = transpose([cross(a, c)]) * [cross(b, d)];
  m = det(a,c,e) * det(b,d,e) * m1 - det(a,b,e) * det(c,d,e) * m2;
  (m + transpose(m));
);

splitConic(c) := (
  regional(adj, i1, pt, mat, i2);
  adj = adjoint3(c);
  if(|adj| == 0,
    i2 = select(1..9, flatten(c)_# ~!= 0)_1;
    [(c_((i2-mod(i2-1,3)+2)/3)), (transpose(c)_(mod(i2-1,3)+1))],
    i1 = sort(1..3, abs(adj_#_#))_3;
    pt = adj_i1 / sqrt(-adj_i1_i1);
    mat = c + matop(pt);
    i2 = select(1..9, flatten(mat)_# ~!= 0)_1;
    [(mat_((i2-mod(i2-1,3)+2)/3)), (transpose(mat)_(mod(i2-1,3)+1))];
  );
);

intersectCL(c, l) := (
  l = l / |l|;
  splitConic(matop(l) * c * transpose(matop(l)));
);

intersectCirCir(c1, c2) := (
  regional(mat, l);
  mat = c1*(c2_1_1) - c2*(c1_1_1);
  l = (mat_1_3, mat_2_3, mat_3_3/2);
  intersectCL(c1, l);
);

// This is really ugly. Achieve something like splitcubic?
intersectCubicL(cub,l) := (
  regional(roots,a,b,c,d,e,f,g,h,k,m);
  a = cub_1_1_1;
  b = cub_1_1_2;
  c = cub_1_1_3;
  d = cub_1_2_2;
  e = cub_1_2_3;
  f = cub_1_3_3;
  g = cub_2_2_2;
  h = cub_2_2_3;
  k = cub_2_3_3;
  m = cub_3_3_3;
  roots = roots([ m*l_2^3 - 3*k*l_2^2*l_3 + 3*h*l_2*l_3^2 - g*l_3^3,
                  - 3*k*l_1*l_2^2 + 3*f*l_2^3 + 6*h*l_1*l_2*l_3 - 6*e*l_2^2*l_3 - 3*g*l_1*l_3^2 + 3*d*l_2*l_3^2,
                  3*h*l_1^2*l_2 - 6*e*l_1*l_2^2 + 3*c*l_2^3 - 3*g*l_1^2*l_3 + 6*d*l_1*l_2*l_3 - 3*b*l_2^2*l_3,
                  - g*l_1^3 + 3*d*l_1^2*l_2 - 3*b*l_1*l_2^2 + a*l_2^3
                ]);
  roots = select(roots, isreal(#));
  apply(roots, [#, -(l_1*#+l_3)/l_2, 1]);
);

complexIntersectCubicL(cub,l) := (
  regional(roots,a,b,c,d,e,f,g,h,k,m);
  a = cub_1_1_1;
  b = cub_1_1_2;
  c = cub_1_1_3;
  d = cub_1_2_2;
  e = cub_1_2_3;
  f = cub_1_3_3;
  g = cub_2_2_2;
  h = cub_2_2_3;
  k = cub_2_3_3;
  m = cub_3_3_3;
  roots = roots([ m*l_2^3 - 3*k*l_2^2*l_3 + 3*h*l_2*l_3^2 - g*l_3^3,
                  - 3*k*l_1*l_2^2 + 3*f*l_2^3 + 6*h*l_1*l_2*l_3 - 6*e*l_2^2*l_3 - 3*g*l_1*l_3^2 + 3*d*l_2*l_3^2,
                  3*h*l_1^2*l_2 - 6*e*l_1*l_2^2 + 3*c*l_2^3 - 3*g*l_1^2*l_3 + 6*d*l_1*l_2*l_3 - 3*b*l_2^2*l_3,
                  - g*l_1^3 + 3*d*l_1^2*l_2 - 3*b*l_1*l_2^2 + a*l_2^3
                ]);
  //roots = select(roots, isreal(#));
  apply(roots, [#, -(l_1*#+l_3)/l_2, 1]);
);

sgn(x) := if(x >= 0, 1, -1);
solveCubicJB(aa, bb, cc, dd) := ( //DOES NOT RETURN CORRECT RESULTS! (maybe now after ang:*->pi?)
  regional(a, b, c, d, del1, del2, del3, Del, A, C, D, T0, T1, p, q, x1, th, x1a, x3a);
  a = aa; b = bb/3; c = cc/3; d = dd;
  del1 = a*c - b^2;
  del2 = a*d - b*c;
  del3 = b*d - c^2;
  Del = 4*del1*del3 - del2^2;
  if(Del <= 0, //one real root and complex conjugate pair or degenerate
    if(b^3 * d >= a * c^3,
      A = a; C = del1; D = -2*b*del1 + a*del2,
      A = d; C = del3; D = -d*del2 + 2*c*del3;
    );
    T0 = - sgn(D) * |A| * sqrt(-Del);
    T1 = -D + T0;
    p = (T1/2)^(1/3);
    if(T1 == T0,
      q = -p,
      q = - C/p;
    );
    if(C <= 0,
      x1 = p + q,
      x1 = -D / (p^2 + q^2 + C);
    );
    if(b^3 * d >= a * c^3,
      [x1-b, a],
      [-d, x1+c];
    );
    , //three real roots
    C = del1; D = -2*b*del1 + a*del2;
    th = |arctan2(a*sqrt(Del), -D)|/3;
    x1a = 2*sqrt(-C)*cos(th);
    x3a = 2*sqrt(-C)*(-cos(th)/2 - sqrt(3)*sin(th)/2);
    if(x1a + x3a > 2*b,
      [x1a-b, a],
      [x3a-b, a]
    );
  );
); //DOES NOT RETURN CORRECT RESULTS! (maybe now after ang:*->pi?)

solveCubicJS(a, b, c, d) := (
  regional(D, W, w, t, sol, r);
  D = 27 * (-b^2*c^2 + 4*a*c^3 + 4*b^3*d - 18*a*b*c*d + 27*a^2*d^2);
  W = 9*a*b*c - 2*b^3 - 27*d*a^2;
  w = (W + a*sqrt(D))^(1/3); //exp(log(W + a*sqrt(D))/3);
  t = 3*2^(1/3)*a*conjugate(w);
  sol = [(2*b^2 - 6*a*c) * t/(|t|^2), (-2^(2/3)*b*w) * t/(|t|^2), (2^(1/3)*w^2) * t/(|t|^2)];
  r = -0.5 + i*sqrt(3)/2;
  [sol*(1,1,1), sol*(r,1,conjugate(r)), sol*(conjugate(r),1,r)];
);

solveCubic(a, b, c, d) := (
  regional(w0, w1, w2, W, D, Q, K);
  w0 = 1;
  w1 = -0.5 + i * sqrt(3) / 2;
  w2 = -0.5 - i * sqrt(3) / 2;
  W = -2*b^3 + 9*a*b*c - 27*a^2*d;
  D = -b^2*c^2 + 4*a*c^3 + 4*b^3*d - 18*a*b*c*d + 27*a^2*d^2;
  Q = roots([-4*(W+a*sqrt(27 * D)), 0, 0, 1])_1; //choice of root irrelevant?
  //println(roots([-4*(W+a*sqrt(D)), 0, 0, 1]));
  //TODO: Why does (...)^(1/3) not work?
  K = 2*b^2 - 6*a*c;
  [
    [-b*(Q*w0)+K+((Q*w0)^2)/2, 3*a*(Q*w0)],
    [-b*(Q*w1)+K+((Q*w1)^2)/2, 3*a*(Q*w1)],
    [-b*(Q*w2)+K+((Q*w2)^2)/2, 3*a*(Q*w2)]
  ];
);

intersectCC(cc1, cc2) := (
  regional(a, b, c, d, l11, l12, l21, l22, coeff, deg, lines);
  c1 = 1000 * cc1/|cc1|; //TODO: Influence of normalization?
  c2 = 1000 * cc2/|cc2|; //TODO: Especially in case of tracing on root level
  //That 1000-thing feels criminal but it gets rid of a lot of bad numerics
  a = det(c1); //println(format(a,10));
  if(|a| ~!= 0,
    b = det(c1_1, c1_2, c2_3) + det(c1_1, c2_2, c1_3) + det(c2_1, c1_2, c1_3);
    c = det(c2_1, c2_2, c1_3) + det(c2_1, c1_2, c2_3) + det(c1_1, c2_2, c2_3);
    d = det(c2);
    coeff = solveCubic(a, b, c, d)_3; //Why _3?
    //println(format(coeff,10));
    deg = coeff_1 * c1 + coeff_2 * c2;
    lines = splitConic(deg);
    //println(format(lines,10));
    intersectCL(c1, lines_1) ++ intersectCL(c1, lines_2);
    ,
    [c1, c2] = [c2, c1];
    a = det(c1);
    if(|a| ~= 0,
      [l11, l12, l21, l22] = splitConic(c1) ++ splitConic(c2);
      [cross(l11, l21), cross(l12, l21), cross(l11, l22), cross(l12, l22)];
      ,    
      intersectCL(c1, splitConic(c2)_1) ++ intersectCL(c1, splitConic(c2)_2);
    );
  );
);


//==================== TRACED FUNCTIONS ====================//

//Global dict that saves the last evaluation value of a tracedLog-Call of a specific operation of a specific element
//For example, each tracedSqrt operation of each element (corresponding to an algorithm) has its own entry
//Not quite sure what Marc intended with "singularity", "complexoutput", and "argumentjump"
//Singularity should be updated to decide which points of a path should be captured
activeState = {
  "singularity" : false,
  "complexOutput" : [],
  "argumentJump" : false
};
roundToTwoPi(value) := (
  regional(remainder);
  remainder = mod(value, 2*pi);
  if(remainder <= pi, value - remainder, value + (2*pi - remainder));
);

//It would be best to make these values adaptive and to prove that they have the desired effects with these choices
distToSingularity = 0.00001;
bufferZone = 0.1;

tracedLog(value, elementName) := (
  regional(lastResult, principal, diff, offset, smallDiff, result);
  //We load the last state of the specific operation to continue on the respective sheet
  //The name "elementName" is not perfect as a single element may need multiple (different) instances of tracedLog with different names
  lastResult = activeState_(elementName);
  if(isundefined(lastResult), lastResult = log(value));

  //Calculate principal value and relation to lastResult
  principal = log(value);
  diff = im(principal) - im(lastResult);
  offset = roundToTwoPi(diff);
  smallDiff = diff - offset;
  result = re(principal) + i*(im(lastResult)+smallDiff);

  //Check singularity criteria
  if(abs(value) <= distToSingularity, //too close to zero
    println("tracedLog: singulariy");
    println(format(abs(value),10));
    activeState.singularity = true;
  );
  // if(re(value) < 0, //logarithm is going to be complex
  //   activeState.complexoutput = activeState.complexoutput :> elementName;
  // );
  if(abs(smallDiff) > bufferZone, //too big jump in argument
    println("tracedLog: argument jump");
    activeState.argumentjump = true;
  );
  activeState_(elementName) = result; //save for next calculation
  result;
);

tracedSqrt(value, elementName) := (
  exp(tracedLog(value, elementName) * 1/2);
);

tracedCubrt(value, elementName) := (
  exp(tracedLog(value, elementName) * 1/3);
);

tracedSolveCubic(a, b, c, d, elementName) := (
  regional(w0, w1, w2, W, D, Q, R, K);
  w0 = 1;
  w1 = -0.5 + i * tracedSqrt(3, elementName+"SqrtW1") / 2;
  w2 = -0.5 - i * tracedSqrt(3, elementName+"SqrtW2") / 2;
  W = -2*b^3 + 9*a*b*c - 27*a^2*d;
  D = -b^2*c^2 + 4*a*c^3 + 4*b^3*d - 18*a*b*c*d + 27*a^2*d^2;
  Q = W-a*tracedSqrt(27*D, elementName+"SqrtQ");
  R = tracedCubrt(4*Q, elementName+"Cubrt");
  K = 2*b^2 - 6*a*c;
  [
    [-b*(R*w0)+K+((R*w0)^2)/2, 3*a*(R*w0)],
    [-b*(R*w1)+K+((R*w1)^2)/2, 3*a*(R*w1)],
    [-b*(R*w2)+K+((R*w2)^2)/2, 3*a*(R*w2)]
  ];
);

signBookkeeping = {};

hasSignChanged(input, elementName) := (
  regional(result, lastResult);
  result = input;
  lastResult = signBookkeeping_elementName;
  if(isundefined(lastResult), lastResult = input);
  signBookkeeping_elementName = result;
  if(re(input) * re(lastResult) + im(input) * im(lastResult) < 0,
    lastResult = -result; //This does not do anything, right??
    println("sign of "+elementName+" has changed");
    true;
    ,
    lastResult = result;
    false;
  );
);

// tracedSplitConic() := ();
// splitConic(c) := (
//   regional(adj, i1, pt, mat, i2);
//   adj = adjoint3(c);
//   if(|adj| == 0,
//     i2 = select(1..9, flatten(c)_# ~!= 0)_1;
//     [(c_((i2-mod(i2-1,3)+2)/3)), (transpose(c)_(mod(i2-1,3)+1))],
//     i1 = sort(1..3, abs(adj_#_#))_3;
//     pt = adj_i1 / sqrt(-adj_i1_i1);
//     mat = c + matop(pt);
//     i2 = select(1..9, flatten(mat)_# ~!= 0)_1;
//     [(mat_((i2-mod(i2-1,3)+2)/3)), (transpose(mat)_(mod(i2-1,3)+1))];
//   );
// );

tracedIntersectCL(conic, line, elementName) := (
  regional(adjoint, index1, index2, point, matrix);
  line = line / |line|; //problematic operation?
  if(hasSignChanged(conic, conic.name+"Test"),
    conic = -conic;
  );
  if(hasSignChanged(line, line.name+"Test"),
    line = -line;
  );
  adjoint = adjoint3(matop(line) * conic * transpose(matop(line)));
  if(|adjoint| == 0,
    println("|adjoint| == 0");
    ,
    index1 = sort(1..3, abs(adjoint_#_#))_3;
    point = adjoint_index1 / tracedSqrt(-adjoint_index1_index1, elementName);
    println(point);
    if(hasSignChanged(point, "testpoint"),
      point = -point;
    );
    matrix = matop(line) * conic * transpose(matop(line)) + matop(point);
    index2 = select(1..9, flatten(matrix)_# ~!= 0)_1;
    [(matrix_((index2 - mod(index2-1, 3) + 2)/3)), (transpose(matrix)_(mod(index2-1,3)+1))];
  );
);



//==================== CUBIC SUBROUTINES ====================//

evaluateCubic(c, p) := (
  regional(sum);
  sum = 0;
  apply(1..3, i,
  apply(1..3, j,
  apply(1..3, k,
    sum = sum + ((c_i)_j)_k * p_i * p_j * p_k;
  );););
  sum;
); //TODO: replace by Michaels routine

det9x9minor(matrix, index) := (
  det(apply(1..10--[index], transpose(matrix)_#));
);

cubicTensor(v) := (
  [
    [ [v_1, (v_2)/3, (v_3)/3],
      [(v_2)/3, (v_4)/3, (v_5)/6],
      [(v_3)/3, (v_5)/6, (v_6)/3] ],
    [ [(v_2)/3, (v_4)/3, (v_5)/6],
      [(v_4)/3, v_7, (v_8)/3],
      [(v_5)/6, (v_8)/3, (v_9)/3] ],
    [ [(v_3)/3, (v_5)/6, (v_6)/3],
      [(v_5)/6, (v_8)/3, (v_9)/3],
      [(v_6)/3, (v_9)/3, v_10] ]
  ];
);

epsTensor = (
  [
    [ [0,0,0],
      [0,0,1],
      [0,-1,0] ],
    [ [0,0,-1],
      [0,0,0],
      [1,0,0] ],
    [ [0,1,0],
      [-1,0,0],
      [0,0,0] ]
  ];
);

cubicPolarLine(c, p) := (
  normalizeAbs(
    apply(1..3, p * c_# * p)
  );
);

cubicPolarConic(c, p) := (
  normalizeAbs(
    apply(1..3, c_# * p)
  );
);


evaluateDualCubic(c, l) := (
  //regional(L, mat);
  //L = apply(1..3, i, epsTensor_i *l_i);
  //println(L);
  regional(sum, mat);
  sum = 0;
  mat = epsTensor_1 * l_1 + epsTensor_2 * l_2 + epsTensor_3 * l_3; //antisymmetric;
  apply(1..3, i,
  apply(1..3, k,
  apply(1..3, b,
  apply(1..3, d,
  apply(1..3, o,
  apply(1..3, q,
  apply(1..3, r,
  apply(1..3, t,
  apply(1..3, v,
  apply(1..3, w,
  apply(1..3, x,
  apply(1..3, z,
    sum = sum + (c_b_k_o * c_d_q_r * c_t_w_z * c_i_x_v) * (mat_i_k * mat_b_d * mat_o_q * mat_r_t * mat_v_w * mat_x_z);
  ););););););););););););
  sum;
);


cubicBy9(P) := (
  regional(mat, sol);
  mat = apply(P, [(#_1)^3, (#_1)^2*(#_2), (#_1)^2*(#_3), (#_1)*(#_2)^2, (#_1)*(#_2)*(#_3), (#_1)*(#_3)^2, (#_2)^3, (#_2)^2*(#_3), (#_2)*(#_3)^2, (#_3)^3]);
  sol = apply(1..10, (-1)^(#+1) * det9x9minor(mat, #));
  sol = 1000*normalizeAbs(sol); //Is this criminal? 
  cubicTensor(sol);
);

cubicBy1Point4Lines(input) := (
  regional(v, l, a, b, c, C, D, lambda, mu);
  (v, l, a, b, c) = input;
  C = [
        [ [(l_1)^3, (l_1)^2*(l_2), (l_1)^2*(l_3)],
          [(l_1)^2*(l_2), (l_1)*(l_2)^2, (l_1)*(l_2)*(l_3)],
          [(l_1)^2*(l_3), (l_1)*(l_2)*(l_3), (l_1)*(l_3)^2] ],
        [ [(l_1)^2*(l_2), (l_1)*(l_2)^2, (l_1)*(l_2)*(l_3)],
          [(l_1)*(l_2)^2, (l_2)^3, (l_2)^2*(l_3)],
          [(l_1)*(l_2)*(l_3), (l_2)^2*(l_3), (l_2)*(l_3)^2] ],
        [ [(l_1)^2*(l_3), (l_1)*(l_2)*(l_3), (l_1)*(l_3)^2],
          [(l_1)*(l_2)*(l_3), (l_2)^2*(l_3), (l_2)*(l_3)^2],
          [(l_1)*(l_3)^2, (l_2)*(l_3)^2, (l_3)^3] ]
      ];
  D = [
        [ [(a_1)*(b_1)*(c_1), (a_1)*(b_1)*(c_2), (a_1)*(b_1)*(c_3)],
          [(a_1)*(b_2)*(c_1), (a_1)*(b_2)*(c_2), (a_1)*(b_2)*(c_3)],
          [(a_1)*(b_3)*(c_1), (a_1)*(b_3)*(c_2), (a_1)*(b_3)*(c_3)] ],
        [ [(a_2)*(b_1)*(c_1), (a_2)*(b_1)*(c_2), (a_2)*(b_1)*(c_3)],
          [(a_2)*(b_2)*(c_1), (a_2)*(b_2)*(c_2), (a_2)*(b_2)*(c_3)],
          [(a_2)*(b_3)*(c_1), (a_2)*(b_3)*(c_2), (a_2)*(b_3)*(c_3)] ],
        [ [(a_3)*(b_1)*(c_1), (a_3)*(b_1)*(c_2), (a_3)*(b_1)*(c_3)],
          [(a_3)*(b_2)*(c_1), (a_3)*(b_2)*(c_2), (a_3)*(b_2)*(c_3)],
          [(a_3)*(b_3)*(c_1), (a_3)*(b_3)*(c_2), (a_3)*(b_3)*(c_3)] ]
      ];
  lambda = evaluateCubic(C, v);
  mu = evaluateCubic(D, v);
  lambda * D - mu * C;
);

cbHelper(mat, p) := (
  mat = mat ++ [
    [3*(p_1)^2, 2*(p_1)*(p_2), 2*(p_1)*(p_3), (p_2)^2, (p_2)*(p_3), (p_3)^2, 0, 0, 0, 0],
    [0, (p_1)^2, 0, 2*(p_1)*(p_2), (p_1)*(p_3), 0, 3*(p_2)^2, 2*(p_2)*(p_3), (p_3)^2, 0],
    [0, 0, (p_1)^2, 0, (p_1)*(p_2), 2*(p_1)*(p_3), 0, (p_2)^2, 2*(p_2)*(p_3), 3*(p_3)^2]
  ];
  det(mat);
);

cayleyBacharach(P) := (
  regional(Cx, Cy, Cz, Dx, Dy, Dz);
  Cx = det(apply([P_1, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^2, (#_1)*(#_2), (#_1)*(#_3), (#_2)^2, (#_2)*(#_3), (#_3)^2]
  ));
  Cy = det(apply([P_2, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^2, (#_1)*(#_2), (#_1)*(#_3), (#_2)^2, (#_2)*(#_3), (#_3)^2]
  ));
  Cz = det(apply([P_3, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^2, (#_1)*(#_2), (#_1)*(#_3), (#_2)^2, (#_2)*(#_3), (#_3)^2]
  ));
  Dx = apply([P_2, P_3, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^3, (#_1)^2*(#_2), (#_1)^2*(#_3), (#_1)*(#_2)^2, (#_1)*(#_2)*(#_3), (#_1)*(#_3)^2, (#_2)^3, (#_2)^2*(#_3), (#_2)*(#_3)^2, (#_3)^3]
  );
  Dx = cbHelper(Dx, P_1);
  Dy = apply([P_3, P_1, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^3, (#_1)^2*(#_2), (#_1)^2*(#_3), (#_1)*(#_2)^2, (#_1)*(#_2)*(#_3), (#_1)*(#_3)^2, (#_2)^3, (#_2)^2*(#_3), (#_2)*(#_3)^2, (#_3)^3]
  );
  Dy = cbHelper(Dy, P_2);
  Dz = apply([P_1, P_2, P_4, P_5, P_6, P_7, P_8],
    [(#_1)^3, (#_1)^2*(#_2), (#_1)^2*(#_3), (#_1)*(#_2)^2, (#_1)*(#_2)*(#_3), (#_1)*(#_3)^2, (#_2)^3, (#_2)^2*(#_3), (#_2)*(#_3)^2, (#_3)^3]
  );
  Dz = cbHelper(Dz, P_3);
  normalizeAbs(Cx*Dy*Dz*(P_1).homog + Dx*Cy*Dz*(P_2).homog + Dx*Dy*Cz*(P_3).homog);
);


//==================== TRACING SUBROUTINES ====================//

projDistMinScal(a, b) := (
  regional(p);
  p = a * conjugate(b);
  p = if(p ~= 0, 1, p/|p|);
  a = normalizeAbs(a); b = normalizeAbs(b);
  min([|a + b*p|, |a - b*p|]);
);

tracing2(p, q, a, b) := (
  regional(sec, pq, pa pb, qa, qb, ab, care, close, case1, case2, res, aa, bb);
  sec = 3;
  pq = projDistMinScal(p, q);
  pa = projDistMinScal(p, a);
  pb = projDistMinScal(p, b);
  qa = projDistMinScal(q, a);
  qb = projDistMinScal(q, b);
  ab = projDistMinScal(a, b);

  care = (pq > .000001); //.000001 in Cinderella
  close = (ab < .00001); //.00001 in Cinderella
  case1 = (pq/sec > pa + qb) & (ab/sec > pa + qb);
  case2 = (pq/sec > pb + qa) & (ab/sec > pb + qa);
  // 0 = Give Up, 1 = OK, 2 = Dont Care, 3 = Refine

  //Have a look at DECREASE_STEP in Cinderella

  res = [a, b, 2];
  [aa, bb] = if(pa + qb < pb + qa, [a, b], [b, a]);
  if(case1, res = [a, b, 1]);
  if(case2, res = [b, a, 1]);
  if(!case1 & !case2,
    if(care, res = if(close, [aa, bb, 0], [aa, bb, 3]));
    if(!care, res = if(close, [aa, bb, 2], [aa, bb, 1]));
  );
  if(res_3 == 3, refine = true);
  if(res_3 == 0, println("t2: Give Up"));
  if(res_3 == 2, println("t2: Don't Care"));
  if(res_3 == 3, println("t2: Refine"));
  res;
);

tracing4(p, q, r, s, a, b, c, d) := (
  regional(sec, check, out, perm, dsum, res, mes, dist, lastDist);
  regional(pq, pr, ps, qr, qs, rs, ab, ac, ad, bc, bd, cd, d1, d2, d3, d4);
  sec = 3;
  check = [p, q, r, s];
  out = [a, b, c, d];
  perm = [1, 2, 3, 4];
  pq = projDistMinScal(p, q);
  pr = projDistMinScal(p, r);
  ps = projDistMinScal(p, s);
  qr = projDistMinScal(q, r);
  qs = projDistMinScal(q, s);
  rs = projDistMinScal(r, s);
  
  d1 = projDistMinScal(p, a);
  d2 = projDistMinScal(p, b);
  d3 = projDistMinScal(p, c);
  d4 = projDistMinScal(p, d);
  if(d2 <= d1 & d2 <= d3 & d2 <= d4,
    perm = [perm_2, perm_1, perm_3, perm_4];
    dsum = d2,
    if(d3 <= d1 & d3 <= d2 & d3 <= d4,
      perm = [perm_3, perm_2, perm_1, perm_4];
      dsum = d3,
      if(d4 <= d1 & d4 <= d2 & d4 <= d3,
      perm = [perm_4, perm_2, perm_3, perm_1];
      dsum = d4,
      dsum = d1;
      );
    );
  );

  d2 = projDistMinScal(q, out_(perm_2));
  d3 = projDistMinScal(q, out_(perm_3));
  d4 = projDistMinScal(q, out_(perm_4));
  if(d3 <= d2 & d3 <= d4,
    perm = [perm_1, perm_3, perm_2, perm_4];
    dsum = dsum + d3,
    if(d4 <= d2 & d4 <= d3,
      perm = [perm_1, perm_4, perm_3, perm_2];
      dsum = dsum + d4,
      dsum = dsum + d2;
    );
  );

  d3 = projDistMinScal(r, out_(perm_3));
  d4 = projDistMinScal(r, out_(perm_4));
  if(d4 <= d3,
    perm = [perm_1, perm_2, perm_4, perm_3];
    dsum = dsum + d4,
    dsum = dsum + d3;
  );

  d4 = projDistMinScal(s, out_(perm_4));
  dsum = dsum + d4;

  res = [out_(perm_1), out_(perm_2), out_(perm_3), out_(perm_4), 1];
  ab = projDistMinScal(res_1, res_2);
  ac = projDistMinScal(res_1, res_3);
  ad = projDistMinScal(res_1, res_4);
  bc = projDistMinScal(res_2, res_3);
  bd = projDistMinScal(res_2, res_4);
  cd = projDistMinScal(res_3, res_4);

  lastDist = 1000;
  mes = 1;
  if(pq > 0.001 & ab > 0.001,
    dist = ab;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );
  if(pr > 0.001 & ac > 0.001,
    dist = ac;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );
  if(ps > 0.001 & ad > 0.001,
    dist = ad;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );
  if(qr > 0.001 & bc > 0.001,
    dist = bc;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );
  if(qs > 0.001 & bd > 0.001,
    dist = bd;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );
  if(rs > 0.001 & cd > 0.001,
    dist = cd;
    lastDist = if(lastDist < dist, lastDist, dist),
    mes = 0; refine = true;
  );

  //if(lastDist / sec > dsum,
  //  res_(-1) = mes;
  //);
  if(res_5 == 0, println("t4: Give Up"));
  if(res_5 == 2, println("t4: Don't Care"));
  if(res_5 == 3, println("t4: Refine"));
  res;

  //care = min(apply(pairs([p, q, r, s]), projDistMinScal(#_1, #_2))) > .000001;
  //close = max(apply(pairs([a, b, c, d]), projDistMinScal(#_1, #_2))) < .000001;
  //clp = sort([a, b, c, d], projDistMinScal(#, p))_1;
  //clq = sort([a, b, c, d] -- [clp], projDistMinScal(#, q))_1;
  //clr = sort([a, b, c, d] -- [clp, clq], projDistMinScal(#, r))_1;
  //cls = ([a, b, c, d] -- [clp, clq, clr])_1;
  //Less efficient than if-cases?
  //[clp, clq, clr, cls];
);


//==================== ACTUAL ALGORITHMS ====================//

//==================== ALGORITHM HELPER FUNCTIONS ====================//


getParentElements(count) := (
  apply(1..count, i, getEl((gløbal.calc.parents)_i));
);

getParentCoords(count) := (
  apply(1..count, i, getCoords((gløbal.calc.parents)_i));
);

computeExistenceFromParents(parents) := (
  regional(result);
  result = true;
  apply(parents, parent,
    result = result & parent.existence;
  );
  result;
);

carrierLineCoords(element) := (
  element.coords;
);

//==================== ALGORITHMS ====================//

calcAlgs:"Old" := ();

calcAlgs:"Free" := (
  if(((gløbal.calc).draggable) & gløbal.snapToGrid,
    if(|gløbal.calc.ref, round(gløbal.calc.ref)| < .2,
      gløbal.calc.ref = round(gløbal.calc.ref);
    );
  );
  //TODO: This is of course not nice but works -> move it to moveAlgs:"Free"?
  //Attention: Potential troublemaker for tracing!
  (gløbal.calc).coords = (gløbal.calc).ref;
);

moveAlgs:"Free" := (
  if(((gløbal.move).draggable),
    gløbal.move.target = gløbal.pos,
    gløbal.move.target = gløbal.move.coords;
  );
);
updateAlgs:"Free" := ();

calcAlgs:"Join" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = join(in1, in2);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Segment" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = join(in1, in2);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Arc" := (
  regional(in1, in2, in3, arg1, arg2, arg3);
  [arg1, arg2, arg3] = getParentElements(3);
  [in1, in2, in3] = getParentCoords(3);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2, arg3]);
  gløbal.calc.coords = conicBy5(in1, in2, in3, [-i,1,0], [i,1,0]);
  if(gløbal.calc.coords_3_3 != 0, gløbal.calc.coords = gløbal.calc.coords / gløbal.calc.coords_3_3);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Mid" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = ((in1.xy+in2.xy)/2)++[1];
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Parallel" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = [arg1.coords, carrierLineCoords(arg2)];
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = join(in1, meet(in2, (0,0,1)));
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Perpendicular" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = [arg1.coords, carrierLineCoords(arg2)];
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = perp(in1, in2);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"Meet" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = [carrierLineCoords(arg1), carrierLineCoords(arg2)];
  gløbal.calc.coords = meet(in1, in2);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]) &
                          pointInLineLikeBounds(gløbal.calc, arg1) &
                          pointInLineLikeBounds(gløbal.calc, arg2);
);

calcAlgs:"CircleMP" := (
  regional(in1, in2, arg1, arg2, x, y, z, mat, LR);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  [x, y, z] = in1;
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  mat = [[-z, 0, x],[0, -z, y],[x, y, 0]];
  LR = [[0,0,0],[0,0,0],[0,0,1]];
  gløbal.calc.coords = (in2*LR*in2) * mat - (in2*mat*in2) * LR;
  if(gløbal.calc.coords_3_3 != 0, gløbal.calc.coords = gløbal.calc.coords / gløbal.calc.coords_3_3);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"CircleMR" := (
  regional(in1, in2, arg1, x, y, z, mat, LR);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  [x, y, z] = in1;
  if(gløbal.snapToGrid & |gløbal.calc.radius, round(gløbal.calc.radius)| < .2,
    in2 = in1/in1_3 + [round(gløbal.calc.radius), 0 ,0],
    in2 = in1/in1_3 + [gløbal.calc.radius, 0, 0];
  );
  gløbal.calc.existence = computeExistenceFromParents([arg1]);
  mat = [[-z, 0, x],[0, -z, y],[x, y, 0]];
  LR = [[0,0,0],[0,0,0],[0,0,1]];
  gløbal.calc.coords = (in2*LR*in2) * mat - (in2*mat*in2) * LR;
  if(gløbal.calc.coords_3_3 != 0, gløbal.calc.coords = gløbal.calc.coords / gløbal.calc.coords_3_3);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);
moveAlgs:"CircleMR" := (
  regional(in1);
  in1 = getCoords((gløbal.move.parents)_1);
  gløbal.move.target = |in1.xy, gløbal.pos.xy|;
);
updateAlgs:"CircleMR" := ();

calcAlgs:"CircleBy3" := (
  regional(in1, in2, in3, arg1, arg2, arg3);
  [arg1, arg2, arg3] = getParentElements(3);
  [in1, in2, in3] = getParentCoords(3);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2, arg3]);
  gløbal.calc.coords = conicBy5(in1, in2, in3, [-i,1,0], [i,1,0]);
  if(gløbal.calc.coords_3_3 != 0, gløbal.calc.coords = gløbal.calc.coords / gløbal.calc.coords_3_3);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"ConicBy5" := (
  regional(in1, in2, in3, in4, in5, arg1, arg2, arg3, arg4, arg5);
  [arg1, arg2, arg3, arg4, arg5] = getParentElements(5);
  [in1, in2, in3, in4, in5] = getParentCoords(5);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2, arg3, arg4, arg5]);
  gløbal.calc.coords = conicBy5(in1, in2, in3, in4, in5);
  if(gløbal.calc.coords_3_3 != 0, gløbal.calc.coords = gløbal.calc.coords / gløbal.calc.coords_3_3);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"CubicBy9" := (
  gløbal.calc.existence = true; //arg1.existence & arg2.existence & arg3.existence & arg4.existence & arg5.existence;
  gløbal.calc.coords = cubicBy9(apply(1..9, getCoords((gløbal.calc.parents)_#)));
);

calcAlgs:"CubicBy4" := (
  gløbal.calc.existence = true; //arg1.existence & arg2.existence & arg3.existence & arg4.existence & arg5.existence;
  gløbal.calc.coords = cubicBy1Point4Lines(apply(1..5, getCoords((gløbal.calc.parents)_#)));
);

calcAlgs:"CayleyBacharach" := (
  gløbal.calc.existence = true; //arg1.existence & arg2.existence & arg3.existence & arg4.existence & arg5.existence;
  gløbal.calc.coords = cayleyBacharach(apply(1..8, getCoords((gløbal.calc.parents)_#)));
);

calcAlgs:"CubicPolarLine" := (
  gløbal.calc.existence = true; //arg1.existence & arg2.existence
  gløbal.calc.coords = cubicPolarLine(getCoords((gløbal.calc.parents)_2), getCoords((gløbal.calc.parents)_1));
);

calcAlgs:"CubicPolarConic" := (
  gløbal.calc.existence = true; //arg1.existence & arg2.existence
  gløbal.calc.coords = cubicPolarConic(getCoords((gløbal.calc.parents)_2), getCoords((gløbal.calc.parents)_1));
);

calcAlgs:"PolarPoint" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = adjoint3(in1) * in2;
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"PolarLine" := (
  regional(in1, in2, arg1, arg2);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
  gløbal.calc.coords = in1 * in2;
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"PointOnLine" := (
  regional(in1, arg1);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  gløbal.calc.existence = computeExistenceFromParents([arg1]);
  gløbal.calc.coords = meet(perp(gløbal.calc.ref, in1), in1);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);
MovePointOnLine(element, position) := (
  regional(in1);
  in1 = getCoords((element.parents)_1);
  element.target = meet(in1, perp(position, in1));
  element.target = normalizeAbs(element.target);
);
moveAlgs:"PointOnLine" := MovePointOnLine(gløbal.move, gløbal.pos);
updateAlgs:"PointOnLine" := (gløbal.update.ref = gløbal.update.coords);

calcAlgs:"PointOnSegment" := (
  regional(in1, arg1, pt1, pt2);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  [pt1, pt2] = apply(arg1.parents, getCoords(#).xy);
  gløbal.calc.existence = computeExistenceFromParents([arg1]);
  gløbal.calc.coords = (transpose([pt1, pt2]) * gløbal.calc.ref)++[1];
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);
MovePointOnSegment(element, position) := (
  regional(in1, arg1, pt1, pt2);
  in1 = getCoords((element.parents)_1);
  arg1 = getEl((element.parents)_1);
  [pt1, pt2] = apply(arg1.parents, getCoords(#).xy);
  element.coords = meet(in1, perp(position, in1));
  element.coords = normalizeAbs(element.coords);
  element.target = linearsolve(transpose([pt1, pt2]), (element.coords).xy);
  element.target = if(element.target_1 < 0, [0,1], if(element.target_2 < 0, [1,0], (element.target)));
);
moveAlgs:"PointOnSegment" := MovePointOnSegment(gløbal.move, gløbal.pos);
updateAlgs:"PointOnSegment" := ();

//We use the generalized center here – why not via a perpendicular to the polar?
//TODO: This needs tracing!!
calcAlgs:"PointOnConic" := (
  regional(in1, arg1, mid, ref, pts);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  mid = adjoint3(in1)_3;
  ref = mid.xy + (gløbal.calc.ref).xy;
  pts = sort(intersectCL(in1, join(ref, mid)), |#.xy, ref|);
  gløbal.calc.coords = pts_1;
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
  gløbal.calc.existence = computeExistenceFromParents([arg1]);
);
//JRG: not yet nicely implemented – how to do better?
MovePointOnConic(element, position) := (
  regional(in1, mid, pts);
  in1 = getCoords((element.parents)_1);
  mid = adjoint3(in1)_3;
  pts = sort(intersectCL(in1, join(position, mid)), |#.xy, position.xy|);
  element.target = ((pts_1).xy - mid.xy) ++ [1];
  element.target = normalizeAbs(element.target);
);
moveAlgs:"PointOnConic" := MovePointOnConic(gløbal.move, gløbal.pos);
updateAlgs:"PointOnConic" := ();

//Using the polar approach – good idea?
//TODO: This needs tracing!!
calcAlgs:"PointOnCubic" := (
  regional(in1, arg1, ref, polar, far);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  ref = (gløbal.calc.ref);
  polar = cubicPolarLine(in1, gløbal.calc.ref);
  far = meet(polar, [0,0,1]);
  println("PointOnCubic:"+[polar, far]);
  gløbal.calc.coords = sort(intersectCubicL(in1, join((gløbal.calc.ref), [-far_2,far_1,0])), |#.xy, ref.xy|)_1;
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
  gløbal.calc.existence = computeExistenceFromParents((arg1));
); //TODO: somewhere here lies a problem for complex ".ref"-inputs from complex detours (modeMove)
//TODO: LOTS of improvement possible here
MovePointOnCubic(element, position) := (
  regional(in1, polar, far);
  in1 = getCoords((element.parents)_1);
  polar = cubicPolarLine(in1, position);
  far = meet(polar, [0,0,1]);
  element.target = sort(intersectCubicL(in1, join(position, [-far_2,far_1,0])), |#.xy, position.xy|)_1;
  element.target = normalizeAbs(element.target);
);
moveAlgs:"PointOnCubic" := MovePointOnCubic(gløbal.move, gløbal.pos);
updateAlgs:"PointOnCubic" := (gløbal.update.ref = gløbal.update.coords);

calcAlgs:"IntersectionPoint" := (
  regional(in1, arg1, p1, p2, segmentTest);
  [arg1] = getParentElements(1);
  [in1] = getParentCoords(1);
  segmentTest = true;
  if(getEl(arg1.parents_2).type == "S",
    [p1, p2] = apply(getEl(arg1.parents_2).parents, getCoords(#).xy);
    segmentTest = pointInSegmentBounds((in1)_(gløbal.calc.index), p1, p2);
  );
  gløbal.calc.existence = computeExistenceFromParents([arg1]) & segmentTest;
  gløbal.calc.coords = (in1)_(gløbal.calc.index);
  gløbal.calc.coords = normalizeAbs(gløbal.calc.coords);
);

calcAlgs:"IntersectionConicLine" := (
  regional(in1, in2, arg1, arg2, pts, tracing);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = [arg1.coords, carrierLineCoords(arg2)];
  pts = intersectCL(in1, in2);
  pts = apply(pts, normalizeAbs(#));
  tracing = gløbal.calc.tracing;
  if(length(tracing) == 2, pts = tracing2(tracing_1, tracing_2, pts_1, pts_2)_[1,2]);
  gløbal.calc.tracing = [pts_1, pts_2];
  //gløbal.calc.coords = pts_(gløbal.calc.index);
  gløbal.calc.coords = [pts_1, pts_2]; //TODO: is that right?
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
);

calcAlgs:"IntersectionCircleCircle" := (
  regional(in1, in2, arg1, arg2, pts, tracing);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  pts = intersectCirCir(in1, in2);
  pts = apply(pts, normalizeAbs(#));
  tracing = gløbal.calc.tracing;
  if(length(tracing) == 2, pts = tracing2(tracing_1, tracing_2, pts_1, pts_2)_[1,2]);
  gløbal.calc.tracing = [pts_1, pts_2];
  gløbal.calc.coords = [pts_1, pts_2];// = pts_(gløbal.calc.index);
);

calcAlgs:"IntersectionConicConic" := (
  regional(in1, in2, arg1, arg2, pts, tracing);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = getParentCoords(2);
  pts = intersectCC(in1, in2);
  pts = apply(pts, normalizeAbs(#));
  tracing = gløbal.calc.tracing;
  if(length(tracing) == 4, pts = tracing4(tracing_1, tracing_2, tracing_3, tracing_4, pts_1, pts_2, pts_3, pts_4)_(1..4));
  gløbal.calc.tracing = [pts_1, pts_2, pts_3, pts_4];
  gløbal.calc.coords = [pts_1, pts_2, pts_3, pts_4];// = pts_(gløbal.calc.index);
  gløbal.calc.existence = computeExistenceFromParents((arg1, arg2));
);

calcAlgs:"IntersectionCubicLine" := (
  regional(in1, in2, arg1, arg2, pts, tracing);
  [arg1, arg2] = getParentElements(2);
  [in1, in2] = [arg1.coords, carrierLineCoords(arg2)];
  pts = intersectCubicL(in1, in2);
  pts = apply(pts, normalizeAbs(#));
  tracing = gløbal.calc.tracing;
  //if(length(tracing) == 2, pts = tracing2(tracing_1, tracing_2, pts_1, pts_2)_[1,2]);
  //gløbal.calc.tracing = [pts_1, pts_2];
  gløbal.calc.coords = pts;//_(gløbal.calc.index);
  gløbal.calc.existence = computeExistenceFromParents([arg1, arg2]);
);



nextpoint() := ();

calcAlgs:"Locus" := (
  regional(conic, movingpt, tracedpt, mid, diff, rad);
  backup("init");
  conic = getCoords((gløbal.calc.parents)_3);
  movingpt = getEl((gløbal.calc.parents)_1);
  tracedpt = getEl((gløbal.calc.parents)_2);
  mid = adjoint3(conic)_3;
  diff = (movingpt.coords).xy - mid.xy;
  rad = |diff|;
  regional(phi, erg, start, end, steps, max, done, lambda, pp, invalid, direction, delta, finished, cumul);
  phi = arctan2(diff);
  erg = [(tracedpt.coords).xy];
  invalid = false;
  direction = 1;
  delta = 1/60;
  finished = false;
  cumul = 0;

  /*while(!finished,
    backup("locusstep");
    phi = phi + direction*delta*2*pi;
    start = getParameterAttribute(movingpt);
    end = (rad * (cos(phi), sin(phi)))++[1];
    steps = 3;
    max = 1; //4
    repeat(max, j,
    if(!done,
      refine = false;
      apply(1..steps, par,
        lambda = (1 - exp(pi * i * par/steps)) / 2;
        setParameterAttribute(movingpt, (1-lambda) * start + lambda * end);
        recalcdepnoloc(movingpt);
      );
      done = !refine;
      if(!done,
        steps = 2 * steps;
        if(j != max,
          restore("locusstep");
        );
      );
    );
    );
    pp = normalize3(getCoords((gløbal.calc.parents)_2));
    invalid = |pp*conjugate(pp) - pp*pp| > 0.01;
    if(invalid, direction = -direction, erg = erg ++ [(tracedpt.coords).xy]);
    cumul = cumul + 1;
    finished = cumul > 10 & projDistMinScal(tracedpt.init, tracedpt.coords) < 0.000001 & projDistMinScal(movingpt.init, movingpt.coords) < 0.000001;
    //easier to just check one of these and direction==1? Count iterations and eventually stop?
  );*/

  apply(1..60, notused,
    if(invalid, direction = -direction);
    phi = phi + direction*2*pi/60;
    start = getParameterAttribute(movingpt);
    end = (rad*(cos(phi), sin(phi)))++[1];
    steps = 3;
    max = 1; //4
    done = false;
    backup("locusstep");

    repeat(max, j,
    if(!done,
      refine = false;
      apply(1..steps, par,
        lambda = (1 - exp(pi * i * par/steps)) / 2;
        setParameterAttribute(movingpt, (1-lambda) * start + lambda * end);
        recalcdepnoloc(movingpt);
      );
      done = !refine;
      if(!done,
        steps = 2 * steps;
        if(j != max,
          restore("locusstep");
        );
      );
      pp = normalize3(getCoords((gløbal.calc.parents)_2));
      invalid = |pp*conjugate(pp) - pp*pp| > 0.01;
      if(!invalid, erg = erg ++ [(tracedpt.coords).xy]);
    );
    );
  );
  gløbal.calc.coords = erg;
  restore("init");
);
//Locus.java: 180--210, 383--430
//LocusConic.java
//PGLocus.java: 250--267, interesting for later: 205--248
