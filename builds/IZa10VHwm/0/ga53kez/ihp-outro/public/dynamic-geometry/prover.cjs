DebugArray = [];

// ----- PROBABILISTIC PROVER STARTS HERE ----- \\

proverBackup(slot) := (
    forall(gslp, element, element:slot = element.coords);
    forall(gslp, element, 
        if(contains(movableAlgs, element.alg),
            element:(slot + "2") = element.radius,
        if(contains(pointOnAlgs, element.alg),
            element:(slot + "2") = element.ref,
        if(contains(intersectionAlgs, element.alg),
            element:(slot + "2") = element.tracing,
            element:(slot + "2") = element.slot))));
);

proverRestore(slot) := (
    forall(gslp, element, element.coords = element:slot);
    forall(gslp, element,
        if(contains(movableAlgs, element.alg),
            element.radius = element:(slot + "2"),
        if(contains(pointOnAlgs, element.alg),
            element.ref = element:(slot + "2"),
        if(contains(intersectionAlgs, element.alg),
            element.tracing = element:(slot + "2"),
            element.slot = element:(slot + "2")))));
    //delete backup
    //forall(gslp, element, element:slot = nø);
    //forall(gslp, element, element:(slot + "2") = nø);
);
//Idea:
//Do backup
//Move free elements randomly 
//Do recalcall
//Check if property in question is still satisfied
//Do this some number of times
//Restore Backup
//We are done!

//After an element is created, the probabilistic prover should check if any additional incidences should hold
//This function initializes the probabilistic prover given a created element and a certainness value, determining how many samples should be made
//i.e. if a point is created as a meet of two elemtns, it should be checked if it is incident to any other line/conic/cubic
//or if a line is created as a join of two points, it should be checked if it is incident to any other point
//or if a conic is createdas a "join" of 5 points, it should be checked if it is incident to any (other points)
//TODO: maybe even go a step further and check for incidences between lines and conics (tangentiality)
startProbabilisticProofFromElement(element, certainness) := (
    regional(possibleIncidences, left, right, top, bottom, disturbanceFactor);
    //the possbile incidences are a list with elements of the form [[element1, element2], boolean] with the boolean
    //being initialized as true and during wiggling of the free points might be turned to false
    possibleIncidences = {};
    //if we have created a point .... => Maybe the distinction is not even necessary later, i.e. just check all elements for incidences ....
    if(element.type == "P",
        //print("-> Element " + element.name + " is a point.");
        //iterate over all lines/conics/cubics...
        apply(gslp, nonPoint,
            if(nonPoint.type ∈ ["L", "C", "Cubic"],
                //...which are not incident to the point by definition or previous proving steps...
                if(nonPoint.name ∉ (element.definedIncidences ∪ element.parents),
                    //...and check if the point lies on it, if yes...
                    if(debugMode, print("checking " + nonPoint.name));
                    if(isIncident(element, nonPoint),
                        if(debugMode, print("incident " + nonPoint.name));
                        //...we have found a candidate for a potential incidence!
                        if(debugMode, print("-> Possible incidence found! " + element.name + " could be incident to " + nonPoint.name + "."));
                        possibleIncidences_("" + element.name + nonPoint.name) = [[element, nonPoint], true];
                    ,//else
                        if(debugMode, print("not incident " + nonPoint.name));
                    );
                );
            );
        );
    );
    //if we have created a line
    if(element.type == "L",
        if(debugMode, print("-> Element " + element.name + " is a line."));
        //iterate over all points/conics/cubics?
        apply(gslp, nonLine,
            if(nonLine.type ∈ ["P" /*, "C", "Cubic"*/], //For now only points
                //...which are not incident to the point by definition or previous proving steps...
                if(nonLine.name ∉ (element.definedIncidences ∪ element.parents),
                    //...and check if the point lies on it, if yes...
                    if(debugMode, print("checking " + nonLine.name));
                    if(isIncident(element, nonLine),
                        if(debugMode, print("incident " + nonLine.name));
                        //...we have found a candidate for a potential incidence!
                        if(debugMode, print("-> Possible incidence found! " + element.name + " could be incident to " + nonLine.name + "."));
                        possibleIncidences_("" + element.name + nonLine.name) = [[element, nonLine], true];
                    ,//else
                        if(debugMode, print("not incident " + nonLine.name));
                    );
                );
            );
        );
    );
    //if we have created a conic
    if(element.type == "C",
        if(debugMode, print("-> Element " + element.name + " is a conic."));
        //iterate over all points/lines?
        apply(gslp, nonConic,
            if(nonConic.type ∈ ["P" /*, "L"*/], //For now only points
                //...which are not incident to the point by definition or previous proving steps...
                if(nonConic.name ∉ (element.definedIncidences ∪ element.parents),
                    //...and check if the point lies on it, if yes...
                    if(debugMode, print("checking " + nonConic.name));
                    if(isIncident(element, nonConic), //TODO vielleicht effizienter if abfragen...
                        if(debugMode, print("incident " + nonConic.name));
                        //...we have found a candidate for a potential incidence!
                        if(debugMode, print("-> Possible incidence found! " + element.name + " could be incident to " + nonConic.name + "."));
                        possibleIncidences_("" + element.name + nonConic.name) = [[element, nonConic], true];
                    ,//else
                        if(debugMode, print("not incident " + nonConic.name));
                    );
                );
            );
        );
    );
    //if we have created a cubic
    if(element.type == "Cubic",
        //TODO: Cubics are weird, we will do them Later  
        //TODO: Check for Cayley-Bacharach-Point!!!!
    );

    //Now all potential incidences are determined. This means we can start the probabilistic proving!
    if(length(keys(possibleIncidences)) >= 1, //if atleast one potential incidence is found
        if(debugMode, print("-> Found " + length(keys(possibleIncidences)) + " possible incidence(s)."));
        //do gslp backup
        proverBackup("provingIncidencesOf" + element.name);
        //From now on we know that we will proove something
        //Now we need to find the right order of magnitude to disturb points. For this, very naively check the distance
        //between the leftmost and rightmost, aswell as the distance between the upmost and downmost point, add them,
        //and use this as a scaling factor for our random number.
        left = [];
        right = [];
        top = [];
        bottom = [];
        apply(gslp, freeElement,
            if(freeElement.alg == "Free",
                if(left == [],
                    //initialize
                    left = freeElement.coords_1;
                    right = freeElement.coords_1;
                    top = freeElement.coords_2;
                    bottom = freeElement.coords_2;
                ,//else, i.e. we are in step >= 2
                    //update leftmost, rightmost, etc. values of free points
                    if(freeElement.coords_1 < left,
                        left = freeElement.coords_1;
                    );
                    if(freeElement.coords_1 > right,
                        right = freeElement.coords_1;
                    );
                    if(freeElement.coords_2 < bottom,
                        bottom = freeElement.coords_2;
                    );
                    if(freeElement.coords_2 > top,
                        top = freeElement.coords_2;
                    );
                );
            );
        );
        //calculate disturbanceFactor
        disturbanceFactor = (right - left) + (top - bottom);
        if(debugMode, print("-> DiscturbanceFactor determined as: " + disturbanceFactor));

        //certainness defines how often we want to randomly disturb the points to check if they are still incident
        apply(1..certainness, ithIteration,
            //We will only wiggle the free elements
            apply(gslp, freeElement,
                if(freeElement.alg == "Free",
                    freeElement.slot = freeElement.slot + [(random() - 0.5) * disturbanceFactor / 10, (random() - 0.5) * disturbanceFactor / 10, 0];
                    freeElement.coords = freeElement.slot;
                );
            );
            //Every free point is wiggled, so we can recalc all
            recalcAll();
            //now check if the possibleIncidences still hold
            apply(possibleIncidences, possIncidence,
                //if it hasn't already been disproven
                if(possIncidence_2,
                    //if the new positions are not incident anymore
                    if(!isIncident(possIncidence_1_1, possIncidence_1_2),
                        //set possIncidence as disproven
                        possibleIncidences_("" + possIncidence_1_1.name + possIncidence_1_2.name)_2 = false;
                        if(debugMode, print("-> Incidence of " + possIncidence_1_1.name + " and " + possIncidence_1_2.name + " disproven."));
                    , //else
                        if(debugMode, print("-> Incidence of " + possIncidence_1_1.name + " and " + possIncidence_1_2.name + " validated."));
                    );
                    
                );
            );
        );
        //load gslp backup
        //comment Tim: made it a string without whitespace for easier JSON-compatibility
        proverRestore("provingIncidencesOf" + element.name);
        //Now the possible incidences that survived can be added to the deduced incidences
        apply(possibleIncidences, possIncidence,
            if(possIncidence_2,
                //add incident elements to each others deduced incidences
                if(debugMode, print("-> Adding deduced incidences!"));
                possIncidence_1_1.deducedIncidences = unique(possIncidence_1_1.deducedIncidences :> possIncidence_1_2.name); //unique because of undo/redo stuff
                possIncidence_1_2.deducedIncidences = unique(possIncidence_1_2.deducedIncidences :> possIncidence_1_1.name);
            );
        );
    );
);

// ----- ALGEBRAIC PROVER STARTS HERE ----- \\

//Given current selected elements a potential provable property is identified and then proved/contradicted
initializeAlgebraicProofFromSelection() := (
    //Check for amount of selected objects
    regional(tol, nonDegeneracies, collinearities, propertyToProve, incidentElement, dim, bracketToIndex, MatrixA, MatrixB, proofMatrix, proof, t);
    //inititalize emptsy property to prove
    propertyToProve = [];
    DebugArray = DebugArray :> "initialized" + length(selectiøn.pts);
    if(length(selectiøn.pts) == 3,
        DebugArray = DebugArray :> ("Points selected: " + selectiøn.pts_1.name + ", " + selectiøn.pts_2.name + ", " + selectiøn.pts_3.name);
        DebugArray = DebugArray :> detPTS(selectiøn.pts);
        //Check for potential collienarity --> Maybe use more sophisticated method like already a rendomized prover TODO
        if(detPTS(selectiøn.pts) ~= 0,
            //found a potential property to prove (Everything will be completely name-based, as other properties are not relevant for the prover)
            propertyToProve = apply(selectiøn.pts, pt, pt.name;);
        , //else
            if(debugMode, print("" + selectiøn.pts + " are not collinear!"));
        );
    , //else
        if(length(selectiøn.pts ++ selectiøn.lns ++ selectiøn.segs ++ selectiøn.cns ++ selectiøn.cubs) == 0,
            //if nothing is selected we check if any deduced incidences exist and prove one of those
            apply(gslp, element,
                //if it is a point
                if(element.type == "P",
                    //if it has deduced incidences
                    if(length(element.deducedIncidences) != 0,
                        //get the first deduced incidence
                        incidentElement = getEl(element.deducedIncidences_1);
                        //now we need to change the behaviour based on the type of the incidentElement
                    );
                );
            );
        );
        //We want some smart way to identify potential provable properties from the selected objects
        //Maybe check 3-element-subsets of selected objects for det ~= 0 if their collinearity/concurrency is not already known?
        //TODO for now, as getting the prover itself running is more important :D
    );

    if(propertyToProve != [],
        //generate list that contains lists with 3 elements, corresponding to collinearities of 3 points
        collinearities = generatePointCollinearities(); //These are our Hypotheses
        //if the property to prove is already in the collinearities, there is nothing to show
        if(propertyToProve ∈ collinearities, //"∈" checks containment in lists!
            if(debugMode, print("There is nothing to show, as " + propertyToProve + " is defined to be collinear."));
        ,//else
            if(debugMode, print("Collinearity of " + propertyToProve + " is unknown, however the determinant evaluates to 0, starting prover..."));
            t = seconds();
            //Here starts the actual prover we do the cool version, where a extra point collinear with no other 2 points is added to conviniently keep the dimension low
            nonDegeneracies = generateNonDegeneracies(collinearities, propertyToProve, true);
            dim = length(nonDegeneracies); //this is the dimension of our problem, i.e. the length of our vectors corresponding to GPR-equations
            if(debugMode, print("The number of nonDegenerate Brackets is " + dim + "."));
            bracketToIndex = generateBracketToIndexDict(nonDegeneracies);
            MatrixA = getBiquadraticEquationsFromHypotheses(collinearities, propertyToProve, dim, bracketToIndex); //returns a list of length equal to "the number of gprs of collinearities" of vectors of length searchDimension with  -1 / 1 entries for the brackets on the corresponding sides of the equation
            if(debugMode, print("The Hypothesis Matrix is of size " + length(MatrixA) + " times " + length(MatrixA_1) + "."));
            MatrixB = getBiquadraticEquationsFromConclusionAndNonDegeneracies(collinearities, propertyToProve, dim, bracketToIndex); //returns a list of length equal to "the number of gprs of the conclusion" of vectors of length searchDimension with -1 / 1 entries for the brackets on the corresponding sides of the equation
            if(debugMode, print("The Conclusion Matrix is of size " + length(MatrixB) + " times " + length(MatrixB_1) + "."));
            if(debugMode, print("Starting the Austauschverfahren..."));
            res = austauschverfahren(MatrixA, MatrixB);
            proofMatrix = extractProof(res, MatrixA, MatrixB, nonDegeneracies);
            if(length(proofMatrix) > 0,
                t = seconds() - t;
                if(debugMode, print("Proof of length " + length(proofMatrix) + " found in " + t + "seconds!"));
                if(debugMode, print(proofMatrix));
                proof = proofMatrixToBracketEQs(proofMatrix, nonDegeneracies);
                if(debugMode, print(proof));
            ,//else
                if(debugMode, print("No Proof found :("));
            );
        );
    );
);

//Function that generates a list containing lists with 3 elements that do not lie on a line, i.e.: ABC  not collinear => [ABD] in nonDegs
generateNonDegeneracies(colls, conc, withExtraPoint) := (
    regional(pointNameList, nonDegs, isNonDeg);
    //get all 3 element subsets of all points and remove all that that are collinear, "pivøt" corresponds to the "extra point" we get in the equations
    pointNameList = sort(getPointNameList());
    if(withExtraPoint,
        pointNameList = pointNameList :> "pivøt";
    );
    nonDegs = select(getAllSubsetsOfEqualLength(3, pointNameList), nonDeg, 
        isNonDeg = true;
        //iterate over all colls and conclusion
        apply(colls :> conc, coll,
            //check for containment of same elements
            if(setEq(nonDeg, coll),
                //found a collinearity with same elements so we cant be non-Degenerate
                isNonDeg = false;
            );
        );
        //"return" isNonDeg, select will select all elements where isNonDeg is true
        isNonDeg;
    );
    //return
    nonDegs;
);

//Function that generates a dict mapping brackets to their indices in nonDegeneracies
generateBracketToIndexDict(nonDegeneracies) := (
    regional(bracketToIndex);
    bracketToIndex = {};
    //put every nonDegeneracies index into the dict entry of the brackets string
    apply(1..length(nonDegeneracies), index, bracketToIndex:(bracketToString(sort(nonDegeneracies_index))) = index);
    bracketToIndex;
);

//Function that uses the list of nonDegeneracies to transform the proofMatrix into a Humanly readable Proof with actual Bracket equations that cancel each other out when multiplied
proofMatrixToBracketEQs(proofMatrix, nonDegeneracies) := (
    regional(stringProof, bracket, stringProofRow, conclusionRow);
    //iterate over rows of proofMatrix and trnasform them into Bracket-Equations that get saved in the stringProof array
    stringProof = apply(proofMatrix, proofRow,
        //iterate over indices, check if the proofRow has a nonzero entry there, and if yes check in nonDegeneracies, what the corresponding Bracket is
        stringProofRow = " = ";
        apply(1..length(proofRow), k,
            if(proofRow_k == 1,
                //add bracket to left side of equation
                stringProofRow = "" + nonDegeneracies_k + stringProofRow;
            );
            if(proofRow_k == -1,
                //add bracket to right side of equation
                stringProofRow = stringProofRow + nonDegeneracies_k;
            );
        );
        stringProofRow;
    );
    //now do conclusion, which is the sum of the rows of the proofMatrix
    stringProofRow = " = ";
    conclusionRow = sum(proofMatrix);
    apply(1..length(conclusionRow), k,
        if(conclusionRow_k == 1,
            //add bracket to left side of equation
            stringProofRow = "" + nonDegeneracies_k + stringProofRow;
        );
        if(conclusionRow_k == -1,
            //add bracket to right side of equation
            stringProofRow = stringProofRow + nonDegeneracies_k;
        );
    );
    stringProof = stringProof :> "implies";
    stringProof = stringProof :> stringProofRow;
    stringProof;
);

//Function that generates a GPR with 5 given points, dimension and zero brackets given
generateGPRVector(leadingPoint, collPoint1, collPoint2, addPoint1, addPoint2, dim, collinearities, conclusion, bracketToIndexDict) := (
    regional(b1, b2, b3, b4, vectorGPR, validGPR);
    //initialize vector
    vectorGPR = zerovector(dim); //mal schauen ob er das kann
    b1 = [leadingPoint, collPoint1, addPoint1];
    b2 = [leadingPoint, collPoint2, addPoint2];
    b3 = [leadingPoint, collPoint1, addPoint2];
    b4 = [leadingPoint, collPoint2, addPoint1];
    valid = true;
    //check if b1 to b4 are in the collinearities and if this is actually an equivalent gpr-equation, i.e. if [leadingPoint, addPoint1, addPoint2] is not collinear
    apply(collinearities :> conclusion, coll,
        if(setEq(coll, b1) % setEq(coll, b2) % setEq(coll, b3) % setEq(coll, b4) % setEq(coll, [leadingPoint, addPoint1, addPoint2]),
            valid = false
        );
    );

    //if no bi's were collinear, we can now start building the vector
    if(valid,
        b1 = sort(b1);
        b2 = sort(b2);
        b3 = sort(b3);
        b4 = sort(b4);
        //bracketToIndexDict gives us the correct index
        vectorGPR_(bracketToIndexDict:(bracketToString(b1))) = 1;
        vectorGPR_(bracketToIndexDict:(bracketToString(b2))) = 1;
        vectorGPR_(bracketToIndexDict:(bracketToString(b3))) = -1;
        vectorGPR_(bracketToIndexDict:(bracketToString(b4))) = -1;
    ,//else
        //if we are not valid, return an empty list
        vectorGPR = [];
    );
    //return result
    vectorGPR;
);

//Function that generates biquadratic equations from Hypotheses, i.e.: ABC collinear => [ABD][ACE] == [ABE][ACD]
//These biquadratic equations will be represented by nested arrays: [ABD][ACE] == [ABE][ACD] <=> [[[A,B,D],[A,C,E]], [[A,B,E],[A,C,D]]]
getBiquadraticEquationsFromHypotheses(collinearities, conclusion, dim, bracketToIndexDict) := (
    //Is there a "smart" way to do this? I dont want to create all...
    //Jürgens Diss?
    //Yes there is!!! TODO implement as in Andreas Umbachs Thesis
    //TODO look at the additional optimization possibility from page 26 of the Thesis
    regional(A, remainingPoints, pts, gpr);
    A = [];
    pts = getPointNameList();
    //iterate over all colls
    apply(collinearities, coll,
        remainingPoints = pts -- coll;
        //iterate over remaining points to create GPRs
        apply(remainingPoints, extraPoint,
            //create first gpr
            gpr = generateGPRVector(coll_1, coll_2, coll_3, "pivøt", extraPoint, dim, collinearities, conclusion, bracketToIndexDict);
            //if the result is a valid gpr append it to the rows of A
            if(length(gpr) > 0,
                A = A :> gpr;
            );
            //create second gpr, together they generate the third version with coll_3 in front
            gpr = generateGPRVector(coll_2, coll_3, coll_1, "pivøt", extraPoint, dim, collinearities, conclusion, bracketToIndexDict);
            //if the result is a valid gpr append it to the rows of A
            if(length(gpr) > 0,
                A = A :> gpr;
            );
        );
    );
    //return A
    A;
);

//Function that generates biquadratic equations from the Conclusion and Non-degeneracies, i.e.:
//[ABD][ACE] == [ABE][ACD] and ADE not collinear => ABC collinear
//These biquadratic equations will be represented by nested arrays: [ABD][ACE] == [ABE][ACD] <=> [[[A,B,D],[A,C,E]], [[A,B,E],[A,C,D]]]
getBiquadraticEquationsFromConclusionAndNonDegeneracies(collinearities, conclusion, dim, bracketToIndexDict) := (
    regional(B, remainingPoints, pts, gpr);
    B = [];
    pts = getPointNameList();
    //we only generate gprs from the conclusion here
    remainingPoints = pts -- conclusion;
    //iterate over remaining points to create GPRs
    apply(remainingPoints, extraPoint,
        //iterate again over the now remaning points (i.e. ld remainingPoints minus the extra Point we have already chosen), as for the conclusions we need to actually create all possible gpr-eqs :(
        apply(remainingPoints -- [extraPoint], extraPoint2,
            //create first gpr
            gpr = generateGPRVector(conclusion_1, conclusion_2, conclusion_3, extraPoint, extraPoint2, dim, collinearities, conclusion, bracketToIndexDict);
            //if the result is a valid gpr append it to the rows of B
            if(length(gpr) > 0,
                B = B :> gpr;
            );
            //create second gpr
            gpr = generateGPRVector(conclusion_2, conclusion_3, conclusion_1, extraPoint, extraPoint2, dim, collinearities, conclusion, bracketToIndexDict);
            //if the result is a valid gpr append it to the rows of B
            if(length(gpr) > 0,
                B = B :> gpr;
            );
            //create third gpr
            gpr = generateGPRVector(conclusion_3, conclusion_1, conclusion_2, extraPoint, extraPoint2, dim, collinearities, conclusion, bracketToIndexDict);
            //if the result is a valid gpr append it to the rows of B
            if(length(gpr) > 0,
                B = B :> gpr;
            );
        );   
    );
    //return B
    B;
);

DebugArray = [];
//Function that generates a list that contains lists with 3 elements, corresponding to collinearities of 3 points
generatePointCollinearities() := (
    regional(colls);
    colls = [];
    //check each line for its incidences; if a line is incident to 3 points, we can add them as a a collinear triple 
    //as our selectiøn consists only of points, our proof will also consist of only points.
    apply(gslp, element,
        //we only want to check lines for their incident points to create triples of collinear points
        if(element.type == "L",
            if(length(element.definedIncidences) == 3,
                //if the line is incident to exactly 3 points, they can be added directly to the list of collinearities
                colls = colls :> element.definedIncidences;
            ,//else
                if(length(element.definedIncidences) > 3,
                    //if we have more than 3 points incident to the line, generate all 3 element subsets of these points and add
                    //them to the collinearities
                    colls = colls ++ getAllSubsetsOfEqualLength(3, element.definedIncidences);
                );
            );
        );
    );
    //return collinearities
    DebugArray = DebugArray :> colls;
    colls;
);

//Function that computes a basis using elements in A and transforms all vectors in B into this Basis
austauschverfahren(A, B) := (
    //initialization...
    regional(piv, oldPivIs, oldPivJs, oldPivs, finished, counter);
    oldPivIs = [];
    oldPivJs = [];
    oldPivs = [];
    counter = 0;
    finished = false;
    //start the Austauschverfahren
    while(!finished,
        //in every iteration we need a Pivot-Element, this will be chosen by the choosePiv function
        piv = choosePivAustauschverfahren(A, oldPivIs, oldPivJs);
        counter = counter + 1;
        //if we get no new piv, we return -1 as piv, in this case the Austauschverfahren is finished
        if(piv_1 == -1,
            print("No new piv could be found, the solver terminates after " + counter + " steps.");
            finished = true;
        ,//else
            //we found a valid pivot element, so save it and do the elimination Step
            oldPivIs = oldPivIs :> piv_1;
            oldPivJs = oldPivJs :> piv_2;
            oldPivs = oldPivs :> piv; //i know this is not super beautiful... but it is the most convenient way
            res = doAustauschverfahrenEliminationStep(A, B, piv);
            A = res_1;
            B = res_2;
        );
    );
    //return A, B, and pivs
    res = {"A" : A, "B" : B, "piv" : oldPivs, "pivI" : oldPivIs, "pivJ" : oldPivJs};
    res;
);

//Function that chooses a new Pivot-Element for the Austauschverfahren that has a different column and row index as every other piv before
//and its corresponding entry must be equal to 1 or -1, otherwise our results get ugly!
choosePivAustauschverfahren(A, oldPivIs, oldPivJs) := (
    regional(iList, iLength, jList, jLength, piv, found, done, index1, index2, i, j);
    //iterate over matrix, but without old Piv entries
    iList = 1..length(A) -- oldPivIs;
    jList = 1..length(A_1) -- oldPivJs;
    iLength = length(iList);
    jLength = length(jList);
    // old code to find the piv
    //    apply(iList, i,
    //       apply(jList, j,
    //            //if our entry is indeed equal to -1 or 1 ...if we find our entry very fast this is very annoying TODO maybe do a while loop
    //            if(A_i_j == 1 % A_i_j == -1,
    //                piv = A_i_j;
    //            );
    //        );
    //    );
    //
    // --- New Code --- \\
    found = false;
    index1 = 0;
    while(!found,
        //we iterate over iList and jList but only as far as we must
        if(index1 < iLength,
            index1 = index1 + 1;
            i = iList_index1;
            done = false;
            index2 = 0;
            while(!done,
                if(index2 < jLength,
                    index2 = index2 + 1;
                    j = jList_index2;
                    //if our entry is indeed equal to -1 or 1 we are done with the inner loop and also with the outer loop
                    if(A_i_j == 1 % A_i_j == -1,
                        piv = [i,j];
                        found = true;
                        done = true;
                    );
                ,//else here index2 is out of bounds, so start in next row
                    done = true;
                );
            );
        ,//else index1 is already out of bounds
            piv = [-1,-1];
            found = true;
        );
    );
    //return piv
    piv;
);

//Function that does one step of the austauschverfahren and thus exchanges the piv_1-th row of A with the piv_2-th standard basis vector of R^n
//and modifies A and B accordingly
doAustauschverfahrenEliminationStep(A, B, piv) := (
    regional(i, j, k, jthCol, pivEntry);
    i = piv_1;
    j = piv_2;
    //first do B
    //save piv entry
    pivEntry = A_i_j;
    //we must save the j-th column of B, then the operations get much simpler....
    jthCol = apply(B, rowB, rowB_j); //this is actually quite elegant...
    //now edit B
    k = 0;
    B = apply(B, rowB,
        k = k + 1;
        rowB - A_i * jthCol_k * pivEntry; //We can actually do row operations!!
    );
    //now set the pivot column (jth column) of B 
    apply(1..length(B), k,
        B_k_j = jthCol_k * pivEntry;
    );
    //Now we can do A, again save the pivot column (j-th column)
    jthCol = apply(A, rowA, rowA_j);
    //edit A, but not the pivot row (i-th row)
    k = 0;
    A = apply(A, rowA,
        k = k + 1;
        if(k != i,
            rowA - A_i * jthCol_k * pivEntry; //We can actually do row operations!!
        ,//else
            //this is the pivot row case, here we do nothing for now, and later we edit it
            //so just return rowA as it is, this is necessary for how the apply function works
            rowA;
        );
    );
    //now set the pivot column (jth column) of A 
    apply(1..length(A), k,
        A_k_j = jthCol_k * pivEntry;
    );
    //now set the pivot row of A
    apply(1..length(A_i), l,
        A_i_l = - A_i_l * pivEntry;
    );
    //now reset the pivot element
    A_i_j = pivEntry;
    //and return the results
    res = [A,B];
    res;
);
    
//Function that takes the result of the austauschverfahren and the old MatrixA as input and uses them to actually find a linear combination of one of the vectors in B as rows of A
extractProof(res, oldA, oldB, nonDegeneracies) := (
    regional(newB, pivlist, pivJList, proof, numberOfNonZeroEntriesList, rowCounter, rowIndex, validProof, done, testlist, indices, index, newProof);
    newB = res.B;
    pivlist = res.piv;
    pivJList = res.pivJ;
    numberOfNonZeroEntriesList = zerovector(length(newB)); 
    //sort rows of newB by number of nonzero entries, for this coiunt the number of nonzero entries
    rowCounter = 0;
    apply(newB, row,
        rowCounter = rowCounter + 1;
        apply(row, entry,
            if(entry != 0,
                //for each row count number of nonzero entries
                numberOfNonZeroEntriesList_rowCounter = numberOfNonZeroEntriesList_rowCounter + 1;
            );
        );
    ); 
    //now sort the rows by their number of nonzero entries
    newB = argSort(newB, numberOfNonZeroEntriesList);
    done = false;
    //now iterate over the sorted Rows of newB and check if the nonzero entries correspond to hypotheses, and thus having found a proof
    apply(newB, potentialProof,
        if(!done,
            //initialize empty proof
            proof = [];
            validProof = true;
            //now iterate over the entries of potentialProof and check at which indices the 1's or -1's are
            apply(1..length(potentialProof), k,
                //now check the entries if they are nonzero
                if(potentialProof_k != 0,
                    //if they are nonzero check if the index k is one of the pivot columns, as this means, that this column standard basis vector was switched with one of the hypotheses
                    if(k ∈ pivJList,
                        //this is the good case, now find the correct piv row and append this row to the proof
                        apply(pivlist, piv,
                            if(piv_2 == k,
                                //we have found the piv element
                                //now append the row to the proof
                                proof = proof :> potentialProof_k * oldA_(piv_1);
                            );
                        );
                    ,//else so k is not in the pivJList, so this does not give us a proof :(
                        validProof = false;
                    );
                );
            );
            //if our proof is valid, we are done, else try again in the next loop
            if(validProof,
                done = true;
            );
        );
    );
    //if the last iteration did not give us a proof, we have to clear it again
    if(!validProof, newProof = [];);

    //Now simplify the proof, i.e. add entries together to remove brackets containing the "Pivøt" points, as they should not be needed
    //TODO this is still very dirty... i have no idea why it isnt done after the first try
    if(validProof,
        newProof = [];
        //define a set of indices of rows of our proof
        indices = 1..length(proof);
        //iterate over this set of indices until it is empty
        while(length(indices) != 0,
            //take first entry of indices, we want to remove all pivøt containing brackets from it.
            index = indices_1;
            //iterate over the index-th row of proof
            done = false;
            apply(1..length(proof_index), k,
                if(!done,
                    //if we have a 1 entry
                    if(proof_index_k == 1,
                        //if this entry actually corresponds to a bracket that contains pivøt
                        if("pivøt" ∈ nonDegeneracies_k, 
                            //iterate over rest of rows of proof to find a different row that has the opposite sign at this position
                            apply(indices -- [index], index2,
                                if(!done,
                                    //here we need the opposite sign, so they cancel out
                                    if(proof_index2_k == -1,
                                        done = true;
                                        //save index
                                        indices = indices -- [index, index2];
                                        //now newProof will contain the sum of these two columns instead
                                        newProof = newProof :> proof_index + proof_index2;
                                    );
                                );
                            );
                        );
                    );
                    //if we have a -1 entry
                    if(proof_index_k == -1,
                        //if this entry actually corresponds to a bracket that contains pivøt
                        if("pivøt" ∈ nonDegeneracies_k, 
                            //iterate over rest of rows of proof to find a different row that has the opposite sign at this position
                            apply(indices -- [index], index2,
                                if(!done,
                                    //here we need the opposite sign, so they cancel out
                                    if(proof_index2_k == 1,
                                        done = true;
                                        //save index
                                        indices = indices -- [index, index2];
                                        //now newProof will contain the sum of these two columns instead
                                        newProof = newProof :> proof_index + proof_index2;
                                    );
                                );
                            );
                        );
                    );
                );
            );
            //if done is still false here we either did not find a bracket containing piv or no other equation to cancel it, anyways we just add the index-th row and remove index from indeices in this case
            if(!done,
                indices = indices -- [index];
                newProof = newProof :> proof_index;
            );
        );

        //maybe again?
        proof = newProof;
        newProof = [];
        //define a set of indices of rows of our proof
        indices = 1..length(proof);
        //iterate over this set of indices until it is empty
        while(length(indices) != 0,
            //take first entry of indices, we want to remove all pivøt containing brackets from it.
            index = indices_1;
            //iterate over the index-th row of proof
            done = false;
            apply(1..length(proof_index), k,
                if(!done,
                    //if we have a 1 entry
                    if(proof_index_k == 1,
                        //if this entry actually corresponds to a bracket that contains pivøt
                        if("pivøt" ∈ nonDegeneracies_k, 
                            //iterate over rest of rows of proof to find a different row that has the opposite sign at this position
                            apply(indices -- [index], index2,
                                if(!done,
                                    //here we need the opposite sign, so they cancel out
                                    if(proof_index2_k == -1,
                                        done = true;
                                        //save index
                                        indices = indices -- [index, index2];
                                        //now newProof will contain the sum of these two columns instead
                                        newProof = newProof :> proof_index + proof_index2;
                                    );
                                );
                            );
                        );
                    );
                    //if we have a -1 entry
                    if(proof_index_k == -1,
                        //if this entry actually corresponds to a bracket that contains pivøt
                        if("pivøt" ∈ nonDegeneracies_k, 
                            //iterate over rest of rows of proof to find a different row that has the opposite sign at this position
                            apply(indices -- [index], index2,
                                if(!done,
                                    //here we need the opposite sign, so they cancel out
                                    if(proof_index2_k == 1,
                                        done = true;
                                        //save index
                                        indices = indices -- [index, index2];
                                        //now newProof will contain the sum of these two columns instead
                                        newProof = newProof :> proof_index + proof_index2;
                                    );
                                );
                            );
                        );
                    );
                );
            );
            //if done is still false here we either did not find a bracket containing piv or no other equation to cancel it, anyways we just add the index-th row and remove index from indeices in this case
            if(!done,
                indices = indices -- [index];
                newProof = newProof :> proof_index;
            );
        );
    );
    //return proof
    newProof;

    
);

//Function that checks if a proof generated by the algebraic prover holds TODO check if this is needed
holds(proof) := (
    //proof has a complicated Data Structure:
    //proof is a dict with the following entries:
    //    hypotheses:       - List containing lists of length 3 corresponding to collinear triples of points
    //                      - i.e. [[A,B,C],[D,E,F],...,[X,Y,Z]]
    //    nonDegeneracies:  - List containing lists of length 3 corresponding to non-collinear triples of points
    //                      - i.e. [[A,B,C],[D,E,F],...,[X,Y,Z]]
    //    GPRhyp:           - List with elements(!!!) of the form [hyp,[[nonDeg,nonDeg],[nonDeg,nonDeg]]]
    //                      - These elements describe Bracket equation of nonDeg brackets coming from a the Grassmann-Plücker-Relation 
    //                      - with the 3 points in hyp being collinear, i.e. hyp = [X,Y,Z] and nonDeg = [A,B,C]
    //    GPRcon:           - Contains one bracket equation, i.e. [[nonDeg,nonDeg],[nonDeg,nonDeg]]
    //    conclusion:       - List with 3 elements 
    regional(doesHold, existsHyp, existsNonDeg, leftBrackets, rightBrackets, boolFoundBracket, foundBracket, globalSign, localSign, antiConclusion);
    doesHold = true;
    //First of all check keys
    proofKeys = ["hypotheses", "nonDegeneracies", "GPRhyp", "GPRcon", "conclusion"];
    if(setEq(keys(proof), proofKeys),
        print("Keys of proof valid.");
        //continue checking here

        // --- DISJOINTNESS OF THE SETS --- \\

        //now check that hypotheses and non-Degeneracies are disjoint
        if(proof.hypotheses ∩ proof.nonDegeneracies == nil, //nil ist the builtin constant for the empty set
            print("Hypotheses and non-Degeneracies disjoint :)");
        ,//else
            doesHold = false;
            print("Hypotheses and non-Degeneracies not disjoint :(");
        );
        //now check if the conclusion is not in the non-Degeneracies or hypotheses
        apply(proof.nonDegeneracies ∪ proof.hypotheses, bracket,
            if(setEq(proof.conclusion, bracket),
                //we have found a hyp for our gpr
                doesHold = false;
                print("The conclusion is contained in the non-Degeneracies :(");
            );
        );

        // --- EXISTENCE AND LEGALITY OF BRACKETS --- \\

        //check if all GPRhyp elements have corresponding hypotheses
        apply(proof.GPRhyp, gpr,
            //first assume that we dont have a correspondig hyp
            existsHyp = false;
            //iterate over all hypotheses
            apply(proof.hypotheses, hyp,
                if(setEq(gpr_1, hyp),
                    //we have found a hyp for our gpr
                    existsHyp = true;
                );
            );
            //if a hyp is found we are happy, if not, the proof doesn't hold
            if(!existsHyp,
                doesHold = false;
            );
        );
        //now check, if all brackets appearing in GPRhyp are in fact "legal", i.e. contained in the non-Degeneracies
        apply(proof.GPRhyp, gpr,
            //iterate over all brackets in the gpr
            apply(1..2, index1,
                apply(1..2, index2,
                    //first assume that we dont have a correspondig nonDeg
                    existsNonDeg = false;
                    //iterate over all non-degeneracies
                    apply(proof.nonDegeneracies, nonDeg,
                        if(setEq(gpr_2_index1_index2, nonDeg),
                            //we have found a nonDeg for one of the 4 brackets of the gpr
                            existsNonDeg = true;
                        );
                    );
                    //if a nonDeg is found we are happy, if not, the proof doesn't hold
                    if(!existsNonDeg,
                        doesHold = false;
                        print("The bracket '" + gpr_2_index1_index2 + "' in the GPR '" + printGPR(gpr) + "' is not included in the non-Degeneracies."); 
                    );
                );
            );
        ); 
        //now check if the brackets appearing in GPRcon are legal
        apply(1..2, index1,
            apply(1..2, index2,
                //first assume that we dont have a correspondig nonDeg
                existsNonDeg = false;
                //iterate over all non-degeneracies
                apply(proof.nonDegeneracies, nonDeg,
                    if(setEq(proof.GPRcon_index1_index2, nonDeg),
                        //we have found a nonDeg for one of the 4 brackets of the gpr
                        existsNonDeg = true;
                    );
                );
                //if a nonDeg is found we are happy, if not, the proof doesn't hold
                if(!existsNonDeg,
                    doesHold = false;
                    print("The bracket '" + proof.GPRcon_index1_index2 + "' in the GPR '" + printGPR(proof.GPRcon) + "' is not included in the non-Degeneracies.");
                );
            );
        );

        // --- VALIDITY OF THE GPRS --- \\ now the interesting things happen

        //for each GPRhyp we need to check if it is in fact implied by its hyp
        apply(proof.GPRhyp, gpr,
            if(!validGPR(gpr),
                print("The GPR '" + printGPR(gpr) + "' is not a valid implication.");
                doesHold = false;
            );
        );
        //also for GPRcon
        if(!validGPR([proof.conclusion, proof.GPRcon]),
            print("The GPR '" + printGPR(gpr) + " => " + proof.conclusion_1 + "," + proof.conclusion_2 + "," + proof.conclusion_3 + "collinear' is not a valid implication.");
            doesHold = false;
        );

        //now the cancellation of brackets must be verified, each bracket must somehow be cancelled out
        //also we must assure the correct handling of twice occuring brackets (camn this happen? maybe...)
        //for this collect them in two arrays: leftBrackets and rightBrackets.
        //Then iterate over leftBrackets and search for a corresponding bracket in rightBrackets, detSignCompare() will be very useful here
        leftBrackets = [];
        rightBrackets = [];
        //handle conclusion
        leftBrackets = leftBrackets ∪ proof.GPRcon_1;
        rightBrackets = rightBrackets ∪ proof.GPRcon_2;
        //handle other GPRs
        apply(proof.GPRhyp, gpr,
            leftBrackets = leftBrackets ∪ gpr_2_1;
            rightBrackets = rightBrackets ∪ gpr_2_2; //this is somehow more elegant than i expected it to be
        );
        //initialize global sign; This should be one in the end
        //every switch multiplies it with -1
        globalSign = 1;
        //Now iterate over leftBrackets
        apply(leftBrackets, lBracket,
            boolFoundBracket = false;
            //iterate over rightBrackets
            apply(rightBrackets, rBracket,
                //also we want to stop if we already found a bracket
                if(!boolFoundBracket,
                    //compare the determinants
                    localSign = detSignCompare(lBracket, rBracket);
                    //if detSignCompare returned 0, the brackets were not comparable
                    if(localSign != 0,
                        boolFoundBracket = true;
                        foundBracket = rBracket;
                        globalSign = globalSign * localSign;
                    ),
                );
            );
            //remove the found bracket
            if(boolFoundBracket,
                rightBrackets = rightBrackets ∖ foundBracket;
            ,//else the proof doesnt hold
                doesHold = false;
            );
        );
        //just to be sure, check if no rightBrackets are left
        if(length(rightBrackets) > 0,
            doesHold = false;
        );
        //if the global sign is negative, the proof does not hold
        if(globalSign != 1,
            doesHold = false;
        );
        //the last thing to check is, if the backwards implication from the conclusion is correct, i.e.
        //if leading point + additional points are non-degenerate
        antiConclusion = (unique(proof.GPRcon_1_1 ∪ proof.GPRcon_1_2) ∖ proof.conclusion) ∪ (proof.GPRcon_1_1 ∩ proof.GPRcon_1_2);
        existsNonDeg = false;
        //iterate over all nondegs
        apply(proof.nonDegeneracies, nonDeg,
            if(setEq(nonDeg, antiConclusion),
                existsNonDeg = true;
            );
        );
        //if it is not non-degenerate, the proof does not hold :(
        if(!existsNonDeg,
            doesHold = false;
        );
        
        



        //TODO TODO TODO


    ,//else
        doesHold = false;
        if(debugMode, print("Keys of the proof are not valid."));
    );
    //return
    doesHold;
);

//TODO ----- ITERATIVE ALGEBRAIC PROVER STARTS HERE ----- (maybe not)\\ ignore for now

//Given current selected elements a potential provable property is identified and then proved iteratively or contradicted
initializeAlgebraicProofFromSelectionIter() := (
    //Check for amount of selected objects
    regional(tol, nonDegeneracies, collinearities, propertyToProve, pointList);
    DebugArray = DebugArray + ["initialized" + length(selectiøn.pts)];
    if(length(selectiøn.pts) == 3,
        DebugArray = DebugArray :> ("Points selected: " + selectiøn.pts_1.name + ", " + selectiøn.pts_2.name + ", " + selectiøn.pts_3.name);
        DebugArray = DebugArray :> detPTS(selectiøn.pts);
        //Check for potential collienarity --> Maybe use more sophisticated method like already a rendomized prover TODO
        if(detPTS(selectiøn.pts) ~= 0,
            //found a potential property to prove (Everything will be completely name-based, as other properties are not relevant for the prover)
            propertyToProve = apply(selectiøn.pts, pt, pt.name;);
            //generate list that contains lists with 3 elements, corresponding to collinearities of 3 points
            collinearities = generatePointCollinearities(); //These are our Hypotheses
            //if the property to prove is already in the collinearities, there is nothing to show
            if(propertyToProve ∈ collinearities, //"∈" checks containment in lists!
                if(debugMode, print("There is nothing to show, as " + propertyToProve + " is constructed to be collinear."));
            ,//else
                if(debugMode, print("Collinearity of " + propertyToProve + " is unknown, however the determinant evaluates to 0, starting prover..."));
                //What now? get list of all points

                pointList = getPointList();
            );
        );
    , //else
        //We want some smart way to identify potential provable properties from the selected objects
        //Maybe check 3-element-subsets of selected objects for det ~= 0 if their collinearity/concurrency is not already known?
        //TODO for now, as getting the prover itself running is more important :D
    );
);
