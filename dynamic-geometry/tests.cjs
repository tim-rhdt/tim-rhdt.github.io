//This file contains functions that test the functionality of CindyInCindy

//testDictiønary is a dictionary that contains all the tests
//each test is a function that returns a boolean value that determines if the test has passed or not
testDictiønary = {};

//Function that runs all tests; will be executed if ALT + T is pressed.
//Each test is an extra function that will be called here.
executeTests() := (
    regional(testCounter, failCounter);
    testCounter = 0;
    failCounter = 0;

    print("Starting Tests...");

    //iterate over all tests in testDictiønary
    apply(testDictiønary, testCase, testName,
        testCounter = testCounter + 1;
        //if the test did not pass set allTestsPassed to false
        if(testCase,
            print("  -> The test " + testName + "passed :)");
        ,//else
            failCounter = failCounter + 1;
            print("  -> The test " + testName + "did not pass :(");
        );
    );

    print("...finished testing! Results:");
    print("  -> Total tests: " + testCounter);
    print("  -> Succesful tests: " + (testCounter - failCounter));
    print("  -> Failed tests: " + failCounter);
    if(failCounter == 0,
        print("All tests passed!");
    );
);

testDictiønary:"Testing detPTS                      " := (
    regional(p1, p2, p3, pts);
    p1 = {};
    p2 = {};
    p3 = {};
    p1:"pos" = [1,2,3];
    p2:"pos" = [5,6,7];
    p3:"pos" = [8,9,4];
    pts = [p1, p2, p3];
    detPTS(pts) == det([[1,2,3], [5,6,7], [8,9,4]]);
);

testDictiønary:"Testing isPointIncidentToLine       " := (
    regional(point1, point2, line);
    point1 = {};
    point2 = {};
    line = {};
    point1:"pos" = [1, 2, 3];
    point2:"pos" = [1, 2, 3.1];
    line:"pos" = [3, 1.5, -2];
    isPointIncidentToLine(point1, line) & !isPointIncidentToLine(point2, line);
);

//TODO this is not a conic!
testDictiønary:"Testing isPointIncidentToConic      " := (
    regional(point1, point2, conic);
    point1 = {};
    point2 = {};
    conic = {};
    point1:"pos" = [1, 2, 3];
    point2:"pos" = [1, 2, 3.1];
    conic:"pos" = [3, 1.5, -2];
    isPointIncidentToLine(point1, line) & !isPointIncidentToLine(point2, line);
);

testDictiønary:"Testing getPointNameList            " := (
    regional(gslpTestBackup, pointTestSet);
    //backup gslp
    gslpTestBackup = gslp;
    //create a minimal gslp containing a point and a line
    gslp = [{"type" : "P", "name" : "A"}, {"type" : "L", "name" : "l"}];
    //this should return ["A"]
    pointTestSet = getPointNameList();
    //load backup
    gslp = gslpTestBackup;
    pointTestSet == ["A"];
);

testDictiønary:"Testing printGPR                    " := (
    regional(bool1, bool2);
    bool1 = "A,B,C collinear => [A, B, D][A, C, E] = [A, B, E][A, C, D]" == printGPR([["A","B","C"],[[["A","B","D"],["A","C","E"]],[["A","B","E"],["A","C","D"]]]]);
    bool2 = "[A, B, D][A, C, E] = [A, B, E][A, C, D]" == printGPR([[["A","B","D"],["A","C","E"]],[["A","B","E"],["A","C","D"]]]);
    bool1 & bool2; //TODO: Can this be correctly highlighted?
);

testDictiønary:"Testing setEq                       " := (
    setEq([1,2,3],[2,3,1]) & setEq(["A","B","C"],["C","A","B"]) & !setEq(["A","B","C"],["D","A","B"]);
);

testDictiønary:"Testing detSignCompare              " := (
    regional(t1, t2, t3);
    t1 = detSignCompare([1,2,3],[2,3,4]);
    t2 = detSignCompare([1,2,3],[1,3,2]);
    t3 = detSignCompare([1,2,3],[3,1,2]);
    (t1 == 0) & (t2 == -1) & (t3 == 1);
);

testDictiønary:"Testing validGPR                    " := (
    regional(t1, t2, t3, t4, t5, t6, t7, t8);
    t1 = validGPR([[1,2,3] , [[[1,2,4] , [1,3,5]] , [[1,2,5] , [1,3,4]]]]); //should be true
    t2 = validGPR([[1,2,3] , [[[1,2,4] , [1,3,5]] , [[1,2,6] , [1,3,4]]]]); //should be false
    t3 = validGPR([[1,2,3] , [[[1,2,4] , [1,3,5]] , [[2,1,5] , [1,3,4]]]]); //should be false
    t4 = validGPR([[1,2,3] , [[[1,2,4] , [1,3,5]] , [[2,5,1] , [1,3,4]]]]); //should be true
    t5 = validGPR([[1,2,3] , [[[1,2,4] , [1,5,3]] , [[2,1,5] , [1,3,4]]]]); //should be true
    t6 = validGPR([[3,1,2] , [[[1,2,4] , [1,5,3]] , [[2,1,5] , [4,3,1]]]]); //should be false
    t7 = validGPR([[3,1,2] , [[[4,1,2] , [1,5,3]] , [[2,1,5] , [4,3,1]]]]); //should be false
    t8 = validGPR([[3,1,2] , [[[4,2,1] , [1,5,3]] , [[2,1,5] , [4,3,1]]]]); //should be true
    t9 = validGPR([[3,1,2] , [[[4,2,1] , [1,5,3]] , [[4,3,1] , [2,1,5]]]]); //should be true
    t10 = validGPR([[3,1,2] , [[[1,5,3] , [4,2,1]] , [[4,3,1] , [2,1,5]]]]); //should be true
    t1 & !t2 & !t3 & t4 & t5 & !t6 & !t7 & t8 & t9 & t10;
);

testDictiønary:"Testing bracketToString             " := (
    "ABC" == bracketToString(["A","B","C"]);
);

testDictiønary:"Testing generateBracketToIndexDict  " := (
    regional(testDict);
    testDict = generateBracketToIndexDict([["A","B","D"],["C","B","A"],["B","E","F"],["C","D","E"],["D","F","E"]]);
    testDict.ABC == 2 & testDict.ABD == 1 & keys(testDict) == ["ABD", "ABC", "BEF", "CDE", "DEF"];
);

testDictiønary:"Testing generatePointCollinearities " := (
    regional(gslpTestBackup, colls);
    //backup gslp
    gslpTestBackup = gslp;
    gslp = [{"type" : "P", "name" : "A"}, {"type" : "P", "name" : "B"}, {"type" : "P", "name" : "C"}, {"type" : "L", "name" : "l", "definedIncidences" : ["A","B","C"]},
            {"type" : "P", "name" : "D"}, {"type" : "P", "name" : "E"}, {"type" : "P", "name" : "F"}, {"type" : "L", "name" : "m", "definedIncidences" : ["A","D","E","F"]}];
    colls = generatePointCollinearities();
    gslp = gslpTestBackup;
    colls == [["A", "B", "C"], ["A", "D", "E"], ["A", "D", "F"], ["A", "E", "F"], ["D", "E", "F"]];
);

testDictiønary:"Testing generateNonDegeneracies     " := (
    regional(gslpTestBackup, colls, nonDegs, nonDegs2);
    //backup gslp
    gslpTestBackup = gslp;
    gslp = [{"type" : "P", "name" : "A"}, {"type" : "P", "name" : "B"}, {"type" : "P", "name" : "C"},
            {"type" : "P", "name" : "D"}, {"type" : "P", "name" : "E"}, {"type" : "P", "name" : "F"}, {"type" : "L", "name" : "m", "definedIncidences" : ["A","D","E","F"]}];
    colls = generatePointCollinearities();
    nonDegs = generateNonDegeneracies(colls, ["A","B","C"], false);
    nonDegs2 = generateNonDegeneracies(colls, ["A","B","C"], true);
    gslp = gslpTestBackup;
    nonDegs == [["A", "B", "D"], ["A", "B", "E"], ["A", "B", "F"], ["A", "C", "D"], ["A", "C", "E"], ["A", "C", "F"], ["B", "C", "D"], ["B", "C", "E"],
                ["B", "C", "F"], ["B", "D", "E"], ["B", "D", "F"], ["B", "E", "F"], ["C", "D", "E"], ["C", "D", "F"], ["C", "E", "F"]] & nonDegs2 == [["A", "B", "D"], ["A", "B", "E"], ["A", "B", "F"],
                ["A", "B", "ZZZ"], ["A", "C", "D"], ["A", "C", "E"], ["A", "C", "F"], ["A", "C", "ZZZ"], ["A", "D", "ZZZ"], ["A", "E", "ZZZ"], ["A", "F", "ZZZ"], ["B", "C", "D"], ["B", "C", "E"],
                ["B", "C", "F"], ["B", "C", "ZZZ"], ["B", "D", "E"], ["B", "D", "F"], ["B", "D", "ZZZ"], ["B", "E", "F"], ["B", "E", "ZZZ"], ["B", "F", "ZZZ"], ["C", "D", "E"], ["C", "D", "F"],
                ["C", "D", "ZZZ"], ["C", "E", "F"], ["C", "E", "ZZZ"], ["C", "F", "ZZZ"], ["D", "E", "ZZZ"], ["D", "F", "ZZZ"], ["E", "F", "ZZZ"]];
);

testDictiønary:"Testing generateGPRVector           " := (
    regional(gslpTestBackup, colls, nondegs, testDict, GPR);
    //backup gslp
    gslpTestBackup = gslp;
    gslp = [{"type" : "P", "name" : "A"}, {"type" : "P", "name" : "B"}, {"type" : "P", "name" : "C"},
            {"type" : "P", "name" : "D"}, {"type" : "P", "name" : "E"}, {"type" : "P", "name" : "F"}, {"type" : "L", "name" : "m", "definedIncidences" : ["A","D","E","F"]}];
    //generate collinearities, non-Degeneracies and the bracket-to-index-dict
    colls = generatePointCollinearities();
    nonDegs = generateNonDegeneracies(colls, ["A","B","C"], false);
    gslp = gslpTestBackup;
    testDict = generateBracketToIndexDict(nonDegs);
    //now generate a GPR for the collinearity ADE with extra points
    GPR = generateGPRVector("A", "D", "E", "B", "C", length(nonDegs), colls, ["A", "B", "C"], testDict);
    GPR == [1, -1, 0, -1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
);

testDictiønary:"Testing EliminationStep             " := (
    regional(A, B, piv, res);
    A = [[1,0,2],
         [3,1,1],
         [7,2,4]];
    B = [[1,2,3],
         [4,1,3]];
    piv = [1,1];
    res = doAustauschverfahrenEliminationStep(A, B, piv);
    A = res_1;
    B = res_2;
    piv = [2,2];
    res = doAustauschverfahrenEliminationStep(A, B, piv);
    res == [[[1, 0, -2], [-3, 1, 5], [1, 2, 0]], [[-5, 2, 11], [1, 1, 0]]];
);

testDictiønary:"Testing kthRow                      " := (
    M = [[1,2,3],
         [4,5,6],
         [7,8,9]];
    kthRow(M, 2) == [4,5,6];
);

testDictiønary:"Testing kthCol                      " := (
    M = [[1,2,3],
         [4,5,6],
         [7,8,9]];
    kthCol(M,2) == [2,5,8];
);

testDictiønary:"Testing argSort                     " := (
    regional(List1, List2);
    List1 = 1..10;
    List2 = [2,1,3,4,7,6,5,8,10,9];
    List1 = argSort(List1, List2);
    List1 == List2;
);

testDictiønary:"Testing holds(proof)                " := (true;);