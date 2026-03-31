//==================== MAKE VALID JSON ====================//

function makeValidJson(input) {
  let s = input;

  // 1) Quote every unquoted key:  foo:  →  "foo":
  //    Look for word characters (letter/number/underscore/dollar),
  //    possibly followed by more word chars, immediately before a colon.
  s = s.replace(
    /([A-Za-z_$][\w$]*)\s*:/g,
    (_, key) => `"${key}":`
  );

  // 2) Quote bare identifiers as string‐values.
  //    We want to catch things like { "alg":Free,  "type":P,  … }
  //    but NOT numbers, booleans (true/false), or array brackets.
  //    So we look for :"SomeIdentifier" patterns where “SomeIdentifier”
  //    is a sequence of letters or underscores, not starting with a digit.
  s = s.replace(
    /:\s*([A-Za-z_$][\w$]*)/g,
    (_, id) => {
      // if it’s "true" or "false" or "null", leave it unquoted.
      if (id === "true" || id === "false" || id === "null") {
        return `:${id}`;
      }
      // if it looks like a number literal (e.g. "1.23" or "42"), leave as-is:
      if (!isNaN(Number(id))) {
        return `:${id}`;
      }
      // otherwise, treat it as a string:
      return `:"${id}"`;
    }
  );

  // 3) Fix arrays of identifiers:  ["A","B"] is okay, but [A,B] is not.
  //    We look for bracket‐enclosed, comma-separated identifiers (no quotes)
  //    and wrap each item in quotes.
  //
  //    The regex below finds “[“ … “]” where inside there is one or more
  //    identifiers separated by commas and optional spaces.
  s = s.replace(
    /\[\s*([A-Za-z_$][\w$]*(?:\s*,\s*[A-Za-z_$][\w$]*)*)\s*\]/g,
    (_, group) => {
      // split the group by commas → identifiers array
      const ids = group.split(/\s*,\s*/);
      // quote each and rejoin
      const quoted = ids.map(id => `"${id}"`).join(",");
      return `[${quoted}]`;
    }
  );

  // TODO: Do this properly!
  // Quick fix for imaginary numbers:
  // wrap any “expr” that isn’t plain JSON in quotes
  s = s.replace(
    /([0-9.+-]+\s*[-+*\/]\s*[A-Za-z_$][\w$]*\s*\*\s*[0-9.+-]+)/g,
    (_, expr) => `"${expr}"`
  );

  // At this point, s should be valid JSON text. Return it.
  return s;
}




//==================== CLIPBOARD ====================//
//https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript

function copyTextToClipboard(text) {
  console.log(text);
  var textArea = document.createElement("textarea");
  textArea.style.cssText = 'position: fixed; top: 0; left: 0; width: 2em; height: 2em; padding: 0; border: none; outline: none; box-shadow: none; background: transparent;';
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  document.body.removeChild(textArea);
}


//==================== IMPORT ====================//

function dropHandler(event) {
  //console.log('Drop Detected');
  event.preventDefault();
  const items = event.dataTransfer.items;
  [...items].forEach((item) => {
    if (item.kind !== 'file') return;
    const file = item.getAsFile();
    if (!file) return;
    console.log(`Processing file: ${file.name}`);

    if (file.name.endsWith('.cjs')) {
      const reader = new FileReader();
      reader.onload = (ev) => {cindy.evokeCS(ev.target.result);};
      reader.readAsText(file);
    } 
    else if (file.name.endsWith('.cindy')) {
      const jsZip = new JSZip();
      jsZip.loadAsync(file).then((zip) => {
        Object.keys(zip.files).forEach((filename) => {
          if(filename.endsWith('.cindy')) {
            zip.files[filename].async('string').then((fileData) => {
              //console.log(`Extracted ${filename}:`, fileData);
              importToCindy(fileData);
            });
          }
        });
      });
    }
    else {
      console.log(`Ignored file: ${file.name}`);
    }
  });
}

function evokeCSAndRefresh(csCode) {
  cindy.evokeCS(`${csCode}; updateLists(); recalcAll(); cømmunicateJS();`);
}

var importToCindy = function(data) {
  console.log('Preparing Import to Cindy');
  data = data.split('Geometry:=Euclidean;')[1];
  data = data.split(/(?=^.*:=)/m).slice(1);
  data.forEach((element) => {
    var algorithm = element.match(/:=([^()]+)/)[1];
    algorithm = algorithm.replaceAll('FreePoint','Free').replaceAll('Orthogonal','Perpendicular').replaceAll('CircleByRadius','CircleMR');
    algorithm = algorithm.replaceAll('PointOnCircle','PointOnConic').replaceAll('IntersectionCircleCircle','IntersectionConicConic');
    var name = element.match(/([^:=]+):=/)[1].replace(/[()]/g, '');
    var info = element.match(/:=.*\(([^()]+)\)/)[1]
    if (algorithm === 'Free') {
      info = info.replaceAll('*-','*(-1)*');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [], ${info})]; getEl(${name}).backup = ${info}; getEl(${name}).draggable = true`);
    }
    else if (algorithm === 'Join' || algorithm === 'Meet' || algorithm === 'Segment' || algorithm === 'Mid' || algorithm === 'CircleMP') {
      info = info.split(',');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}, ${info[1]}])]`);
    }
    else if (algorithm === 'Parallel' || algorithm === 'Perpendicular' || algorithm === 'PolarPoint' || algorithm === 'PolarLine') {
      info = info.split(',');
      algorithm = algorithm.replaceAll('PolarPoint','TEMP').replaceAll('PolarLine','PolarPoint').replaceAll('TEMP','PolarLine');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[1]}, ${info[0]}])]`);
    }
    else if (algorithm === 'CircleMR') {
      info = info.replaceAll('*-','*(-1)*');
      info = info.split(',');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}])]; getEl(${name}).radius = sqrt(${info[1]})`);
    }
    else if (algorithm === 'CircleBy3') {
      info = info.split(',');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}, ${info[1]}, ${info[2]}])]`);
    }
    else if (algorithm === 'ConicBy5') {
      info = info.split(',');
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}, ${info[1]}, ${info[2]}, ${info[3]}, ${info[4]}])]`);
    }
    else if (algorithm === 'PointOnLine') {
      info = info.replaceAll('*-','*(-1)*');
      info = info.split(/,(.+)/);
      name = name.match(/"([^"]*)"/)[0];
      //TODO: Support PointOnSegment
      evokeCSAndRefresh(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}])]; getEl(${name}).ref = ${info[1]}; getEl(${name}).draggable = true`);
    }
    else if (algorithm === 'PointOnConic') {
      //console.log(name);
      info = info.replaceAll('*-','*(-1)*');
      info = info.split(/,(.+)/);
      name = name.match(/"([^"]*)"/)[0];
      //TODO: How do the parameters of PointOnCircle =^= PointOnConic work in Cinderella?
      //--> Point on l_inf that determines (together with the projective center) a line. It seems that IntersectionConicLine is applied
      //w.r.t. that line and the "PointOn" gets the corresponding index
      //console.log(name, algorithm, info);
      //TODO: Change index = 1 to correct index
      //cindy.evokeCS(`gslp = gslp ++ [createElement(${name}, "${algorithm}", [${info[0]}], [], pointOnConicImpørtHelper(${info[0]}, ${info[1]}, 1))]; updaterecalc(getEl(${name})); update();`);
    }
    else if (algorithm === 'IntersectionConicLine') {
      name = name.replaceAll('{','').split(',');
      info = info.split(',');
      if (name[0] !== 'null') {
        evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[0]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCL(getCoords(${info[0]}), getCoords(${info[1]})), 2)]`);
      }
      if (name[1] !== 'null') {
        evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[1]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCL(getCoords(${info[0]}), getCoords(${info[1]})), 1)]`);
      }
    }
    else if (algorithm === 'IntersectionConicConic') {
      console.log(name, info);
      name = name.replaceAll('{','').split(',');
      info = info.split(',');
      console.log(name, info);
      if (name.length === 5) {
        if (name[0] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[0]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCirCir(getCoords(${info[0]}), getCoords(${info[1]})), 2)]`);
        }
        if (name[1] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[1]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCirCir(getCoords(${info[0]}), getCoords(${info[1]})), 1)]`);
        }
      }
      if (name.length === 7) {
        if (name[0] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[0]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCC(getCoords(${info[0]}), getCoords(${info[1]})), 4)]`);
        }
        if (name[1] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[1]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCC(getCoords(${info[0]}), getCoords(${info[1]})), 1)]`);
        }
        if (name[2] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[2]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCC(getCoords(${info[0]}), getCoords(${info[1]})), 3)]`);
        }
        if (name[3] !== 'null') {
          evokeCSAndRefresh(`gslp = gslp ++ [createImpørtElement(${name[3]}, "${algorithm}", [${info[0]}, ${info[1]}], [], intersectCC(getCoords(${info[0]}), getCoords(${info[1]})), 2)]`);
        }
      }
    }
    
    //TODO: OtherIntersectionCC
    //TODO: OtherIntersectionCL
    //TODO: Make indices correct!!
    //TODO: Arc
    //TODO: Locus
    
    //Differences:
    //IntersectionCircleCircle =/= IntersectionConicConic
    //PointOnCircle =^= PointOnConic
    //IntersectionAlgos contain all respective points
    //PointOnLine contains PointOnSegment
    //Also need to handle .recalc and .incidences!!
  });
  evokeCSAndRefresh("apply(gslp, element, element.recalc = unique(element.recalc));");
}


//==================== EXPORT ====================//

function setfilename() {
  filename = document.getElementById("filename").value;
  filename = filename.trim();
  console.log(filename);
  cindy.evokeCS('filename="'+filename+'";');
}

function setfilenameinput() {
  filename = document.getElementById("filenameinput").value;
  filename = filename.trim();
  console.log(filename);
  cindy.evokeCS('filename="'+filename+'";');
}

function download(content, mimeType, filename) {
  var a = document.createElement('a')
  var blob = new Blob([content], {type: mimeType})
  var url = URL.createObjectURL(blob)
  a.setAttribute('href', url)
  a.setAttribute('download', filename)
  a.click()
}

var exportdownload = function(data, name) {
  download(makeExportable(data),'text/plain',name+".cjs");
};

function makeExportable(gslp) {
  var str = gslp.replace(/\b[a-zA-Z]+[0-9]*\b|\b[0-9]+|true|false/g, function(match) {
    if (match === 'true' || match === 'false') {
        return match;
    }
    if (/[a-zA-Z]/.test(match)) {
        return `"${match}"`;
    }
    return match;
  });
  str = str.replaceAll('[{','[\n {').replaceAll('}]','}\n]').replaceAll('},','},\n');
  str = 'deselect(); reset();\n\ngslp = ' + str + ';\n\nupdateLists();\nrecalcAll();\ncømmunicateJS();';
  return str
}

var exportdata = function(a) {
  str = a.split(' ').join('');
  str = str.replaceAll('[','(');
  str = str.replaceAll(']',')');
  str = str.replaceAll('=','_');
  //var str='file:///Users/richter/01_Projects/GrooveBox/Groove.html?data='+str;
  doexport(a); //Why are the string operations necessary if a is given to doexport?

  var str='http://localhost/CindyInCindy/CiC7?data='+str;
  //copyTextToClipboard(str);
  //alert("URL-link for calling your piece has been copied to Clipboard!\n\nPaste it into the browser address line!");
}

var doexport = function(a) {
  document.getElementById('post_data').value = a;
  var fd = new FormData(document.forms["form1"]);
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'upload_data.php', true);

  xhr.upload.onprogress = function(e) {
    if (e.lengthComputable) {
        var percentComplete = (e.loaded / e.total) * 100;
        console.log(percentComplete + '% uploaded');
        //cindy.evokeCS("percent("+percentComplete+")");
        //alert('Succesfully uploaded');
    }
  };

  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      console.log("Response status:", xhr.status); 
      console.log("Server response:", xhr.responseText);
    // TODO CHANGE URL HERE
    // cindy.evokeCS("uploaded();");
    var str = xhr.responseText;
    str = str.replace("upload/","");
    str = str.replace(".cjs","");
    //var str = 'https://groove-lab.com/Groove.html?groove='+str;
    var str = 'http://localhost/CindyInCindy/CiC7?cjs='+str;
    //copyTextToClipboard(str);
    cindy.evokeCS('uploadfinished(0,"'+str+'");');
    loadDoc();
    /* qrcode.makeCode("http://science-to-touch.com/boothH_Full/p.html?p="+str);
    document.getElementById("qrcode").style.display="block";*/
    }
  }

  xhr.onload = function() {};

  xhr.send(fd);
};
