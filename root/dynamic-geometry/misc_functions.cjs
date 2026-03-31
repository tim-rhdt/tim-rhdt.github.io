//Contains miscellaneous functions that make life easier but dont fit into algorithms or kernel or something else...


//==================== BASIC LINALG OPERATIONS ====================//
pointInLineLikeBounds(pt, lineLike) := (
  regional(a, b, p);
  if(lineLike.type == "L",
    true,
    (a,b) = apply(lineLike.parents, (getCoords(#)).xy);
    p = (pt.coords).xy;
    ((a.x-p.x) * (p.x-b.x) >= -0.01) & ((a.y-p.y) * (p.y-b.y) >= -0.01);
  );
);
pointInSegmentBounds(ptPos, seg1, seg2) := (
  regional(p, s1, s2);
  p = ptPos.xy; s1 = seg1.xy; s2 = seg2.xy;
  ((s1.x-p.x) * (p.x-s2.x) >= -0.01) & ((s1.y-p.y) * (p.y-s2.y) >= -0.01);
);
lineEdgeIntersectionInSegmentBounds(l, a, b, c, d) := (
  pointInSegmentBounds(meet(l.coords, join(a.homog, b.homog)).xy, c, d)
);
//TODO: The -0.01-thing feels a bit dirty...
// -0.01 workaround for vertical and horizontal segments

normalizeAbs(x) := if(|x| == 0, x, x/|x|);
normalize3(x) := if(x_3 == 0, x, x/x_3);
adjoint3(m) := transpose([cross(m_2,m_3), cross(m_3,m_1), cross(m_1,m_2)]);
matop(p) := ( (0, p_3, -p_2), (-p_3, 0, p_1), (p_2, -p_1, 0) );


//Function that calculates the determinant of three points (for better code readability)
detPTS(PTS) := (
    det([PTS_1.coords, PTS_2.coords, PTS_3.coords]);
);

//Function that appends a column to a matrix
appendColumn(Matrix, column) := (
    //ist das zu langsam?
        //transpose(transpose(Matrix) :> column);
    //vielleicht stattdesssen folgendes
    apply(1..length(Matrix), k,
        //iterate over rows and append the corresponding column entry to each of them
        Matrix_k = Matrix_k :> column_k;
    );
    Matrix;
);

//Function that returns the k-th row of the given matrix
kthRow(Matrix, k) := (
    Matrix_k;
);

//Function that returns the k-th column of the given matrix
kthCol(Matrix, k) := (
    col = [];
    apply(Matrix, row,
        col = col :> row_k;
    );
    col;
);

//Function that returns a list of all point names
getPointNameList() := (
    //First select all element that are points, then take the name of them
    apply(select(gslp, element, element.type == "P"), element, element.name);
);

//Function that checks if two lists contain the same elements ignoring the order
setEq(set1, set2) := (
    sort(unique(set1)) == sort(unique(set2));
);

//Function that recursively generates a list containing all possible combinations of lists of length k from a given list (order is not relevant)
getAllSubsetsOfEqualLength(k, list) := (
    regional(listOfSublists, iterationLength, currentFirstElement, recursionList, recursiveSublistResults);
    listOfSublists = [];
    //if k == 0 there is obviously only 1 combination
    if(k == 0,
        listOfSublists = listOfSublists :> []; // --> Warum ist es immer so offensichtlich, wenn man es einmal geschafft hat... ?
    ,//else
        //now recursively fix the first entry and then find all subsets of length k-1 of the rest
        //the iterationLength is at most the size of the list - k + 1 (i.e. if we have 4 elements and k = 3, then only the first 2
        //entries can be used as first entry)
        iterationLength = length(list) - k + 1;
        apply(1..iterationLength, index,
            //get i-th element
            currentFirstElement = list_index;
            //create list starting from i+1-st element
            recursionList = list_(index+1..length(list));
            //do recursion with k-1 and smaller list
            recursiveSublistResults = getAllSubsetsOfEqualLength(k-1, recursionList);
            //attach i-th element to each sublist and add to list of sublists
            apply(1..length(recursiveSublistResults), j,
                listOfSublists = listOfSublists :> (currentFirstElement <: (recursiveSublistResults_j));
            );
        );
    );
    listOfSublists;
);

//function that takes a gpr of the form [[bracket, bracket], [bracket, bracket]],
//or [bracket, [[bracket, bracket], [bracket, bracket]]] as input
//and returns a string of the form [A,B,C]*[D,E,F] = [G,H,K]*[L,M,N]
printGPR(gpr) := (
    regional(outputString);
    //if the first element of the gpr has length 3, we are in the second case
    if(length(gpr_1) == 3,
        outputString = "" + gpr_1_1 + "," + gpr_1_2 + "," + gpr_1_3 + " collinear => " + gpr_2_1_1 + gpr_2_1_2 + " = " + gpr_2_2_1 + gpr_2_2_2;
    ,//else
        outputString = "" + gpr_1_1 + gpr_1_2 + " = " + gpr_2_1 + gpr_2_2;
    );
    outputString;
);

//Function that, given two lists of the same 3 points, returns the signum of the permutation or 0 if not valid
detSignCompare(matrix1, matrix2) := (
    regional(sign);
    if((length(matrix1) == 3) & (length(matrix2) == 3),
        //this is the valid case
        if(length(matrix1 ∩ matrix2) == 3,
            //this is the valid case
            //Now there are 6 different permutations
            if(matrix1_1 == matrix2_1,
                if(matrix1_2 == matrix2_2,
                    //identical -- 1,2,3
                    sign = 1;
                ,//else
                    //second and third entry switched -- 1,3,2
                    sign = -1;
                );
            ,//else
                if(matrix1_1 == matrix2_2,
                    if(matrix1_2 == matrix2_1,
                        //first and second entry switched -- 2,1,3
                        sign = -1;
                    ,//else
                        //shift to the left -- 2,3,1
                        sign = 1;
                    );
                ,//else
                    //so matrix1_1 == matrix2_3
                    if(matrix1_2 == matrix2_1,
                        //shift to the right -- 3,1,2
                        sign = 1;
                    ,//else
                        //first and last entry switched -- 3,2,1
                        sign = -1;
                    );
                );
            );
        ,//else
            sign = 0;
        );
    ,//else
        sign = 0;
    );
    sign;
);

//Function that return a string containing all elements of an array
bracketToString(bracket) := (
    "" + bracket_1 + bracket_2 + bracket_3;
);

//Function that sorts List1 with the same permutations that would be used to sort List2 (they must have the same length)
argSort(List1, List2) := (
    regional(sortedIndeces);
    sortedIndeces = sort(1..length(List1), k,
        List2_k;
    );
    List1_sortedIndeces;
);

//TODO: Maybe redo this function, it seems too complicated...
//function that checks the validity of an equation coming from a collinearity and a GPR
validGPR(gpr) := (
    regional(boolValid, leadingPoint, colPoints, additionalPoints, b1, b2, b3, b4, s1, s2, s3, s4, sign);
    boolValid = true;
    //add short names for the brackets
    b1 = gpr_2_1_1;
    b2 = gpr_2_1_2;
    b3 = gpr_2_2_1;
    b4 = gpr_2_2_2;
    //a gpr equation is valid if all brackets have a point in common, in total 5 points are involved
    if(length(gpr_1 ∩ b1 ∩ b2 ∩ b3 ∩ b4) == 1,
        //so all brackets have a point in common
        if(length(unique(gpr_1 ∪ b1 ∪ b2 ∪ b3 ∪ b4)) == 5,
            //so we have 5 points in total
            //now we check if all brackets from the GPR have exactly two points in common with the hypothesis
            if((length(gpr_1 ∩ b1) == 2) & (length(gpr_1 ∩ b2) == 2) & (length(gpr_1 ∩ b3) == 2) & (length(gpr_1 ∩ b4) == 2),
                //another thing we need to check is that the brackets on each side of the '=' have 5 points in total
                if((length(unique(b1 ∪ b2)) == 5) & (length(unique(b3 ∪ b4)) == 5),
                    //one thing left to check is that the brackets on the different sides are different
                    if(!setEq(b1, b3) & !setEq(b1, b4), //This is already enough to check i think
                        //Now we can focus on the actual algebraic meaning
                        //determine "leading" point first
                        leadingPoint = (gpr_1 ∩ b1 ∩ b2 ∩ b3 ∩ b4)_1;
                        //now determine the rest of the collinear points and additional points
                        colPoints = gpr_1 ∖ [leadingPoint];
                        additionalPoints = (b1 ∪ b2) ∖ gpr_1; //TODO coloring
                        //Now check the point distribution
                        if((length(b1 ∩ b3) == 2) & (length(b1 ∩ b4) == 2) & (length(b2 ∩ b3) == 2) & (length(b2 ∩ b4) == 2),
                            //Now check the signs, there are 8 different cases:
                            if(colPoints_1 ∈ b1,                                    //leadingPoint      := 'A'
                                if(additionalPoints_1 ∈ b1,                         //colPoints         := 'B', 'C'
                                    if(colPoints_1 ∈ b3,                            //additionalPoints  := 'D', 'E'
                                        //This is the [ABD][ACE] = [ABE][ACD] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        sign = s1 * s2 * s3 * s4;
                                    ,//else
                                        //This is the [ABD][ACE] = [ACD][ABE] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        sign = s1 * s2 * s3 * s4;
                                    );
                                ,//else
                                    if(colPoints_1 ∈ b3,
                                        //This is the [ABE][ACD] = [ABD][ACE] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        sign = s1 * s2 * s3 * s4;
                                    ,//else
                                        //This is the [ABE][ACD] = [ACE][ABD] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        sign = s1 * s2 * s3 * s4;
                                    );
                                );
                            ,//else
                                if(additionalPoints_1 ∈ b1,
                                    if(colPoints_1 ∈ b3,
                                        //This is the [ACD][ABE] = [ABD][ACE] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        sign = s1 * s2 * s3 * s4;
                                    ,//else
                                        //This is the [ACD][ABE] = [ACE][ABD] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        sign = s1 * s2 * s3 * s4;
                                    );
                                ,//else
                                    if(colPoints_1 ∈ b3,
                                        //This is the [ACE][ABD] = [ABE][ACD] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        sign = s1 * s2 * s3 * s4;
                                        
                                    ,//else
                                        //This is the [ACE][ABD] = [ACD][ABE] case
                                        s1 = detSignCompare(b1, [leadingPoint, colPoints_2, additionalPoints_2]);
                                        s2 = detSignCompare(b2, [leadingPoint, colPoints_1, additionalPoints_1]);
                                        s3 = detSignCompare(b3, [leadingPoint, colPoints_2, additionalPoints_1]);
                                        s4 = detSignCompare(b4, [leadingPoint, colPoints_1, additionalPoints_2]);
                                        sign = s1 * s2 * s3 * s4;
                                    );
                                );
                            );
                        );
                        //Now we have calculated a sign, if it is negative or 0 we are not valid
                        if(sign == -1,
                            //wrong sign
                            boolValid = false;
                        ,//else
                            if(sign == 0,
                                //invalid gpr (this case should never happen!!!)
                                boolValid = false;
                            )
                        )
                    ,//else
                        //the sides of the equation are not different
                        boolValid = false;
                    );
                ,//else
                    //the sides of the equation do not each contain all 5 points
                    boolValid = false;
                );
            ,//else
                //the brackets coming from the GPR do not have 2 points in common with the hypothesis
                boolValid = false;
            );
        ,//else
            //we do not have 5 points, so the gpr equation is not valid (or trivial)
            boolValid = false;
        );
    ,//else
        //all the brackets do not have a point in common, so the GPR equation is not a valid conclusion from the hypothesis
        boolValid = false;
    );
    boolValid;
);


/////////////////////////////
// E X P E R I M E N T A L //
/////////////////////////////

// Box–Muller
gaussComplex():=(
    regional(u1,u2,z0,z1);
    u1 = random();
    u2 = random();
    z0 = sqrt(-2*log(u1)) * cos(2*pi*u2);
    z1 = sqrt(-2*log(u1)) * sin(2*pi*u2);
    z0 + i*z1;
);

cabs2(z) := (re(z)^2 + im(z)^2);
// Euclidean norm, not FS!
cnorm(v) := sqrt( sum(apply(v, cabs2(#))) );
cnormalize(v):=(
    regional(n);
    n = cnorm(v);
    if(n==0, v, v / n)
);

// FS-uniform sampler on CP^1 -> is it?
// Return [z,w] with |[z,w]|=1 in C^2
sampleCP1FS() := (
    regional(z, w, norm);
    z = gaussComplex();
    w = gaussComplex();
    norm = sqrt(cabs2(z) + cabs2(w));
    if(norm==0, // extremely unlikely, resample
        sampleCP1FS(),
        [z, w]/norm
    );
);

sampleLineCP2(n, line) := (
    regional(pts, onb, z, w, pt);
    pts = [];
    onb = onb(line);
    repeat(n,
        [z,w] = sampleCP1FS();
        //println([cross(line, onb_1),onb_2,cross(line, onb_2),onb_1]);
        //pt = z * cross(line, onb_1) + w * cross(line, onb_2);
        pt = z * onb_1 + w * onb_2; //What was my thought? Which is correct?
        pts = append(pts, pt);
    );
  pts
);

sampleConicCP2(n, conic) := (
    regional(pts, line);
    pts = [];
    repeat(round(n/2),
        line = [gaussComplex(), gaussComplex(), gaussComplex()];
        //line = [round(gaussComplex()), round(gaussComplex()), round(gaussComplex())]; //starscapes?
        pts = pts ++ intersectCL(conic, line);
    );
);

sampleCubicCP2(n, cubic) := (
    regional(pts, line);
    pts = [];
    repeat(round(n/3),
        line = [gaussComplex(), gaussComplex(), gaussComplex()];
        pts = pts ++ complexIntersectCubicL(cubic, line);
    );
);

// Gram–Schmidt
onb(vector) := (
    regional(u1, u2, u3, e1, e2, e3);
    u1 = vector;
    e1 = u1 / sqrt(u1*conjugate(u1));
    u2 = [1,0,0] - ([1,0,0]*conjugate(u1)) / (u1*conjugate(u1)) * u1;
    e2 = u2 / sqrt(u2*conjugate(u2));
    u3 = [0,1,0] - ([0,1,0]*conjugate(u1)) / (u1*conjugate(u1)) * u1
                 - ([0,1,0]*conjugate(u2)) / (u2*conjugate(u2)) * u2;
    e3 = u3 / sqrt(u3*conjugate(u3));
    [e2, e3]
);
