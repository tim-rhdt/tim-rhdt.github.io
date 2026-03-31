//==================== EXPORT ====================//

function showExport() {
  document.getElementById('export-container').classList.remove('hidden');
}

function hideExport() {
  document.getElementById('export-container').classList.add('hidden');
  document.getElementById('export').checked = false;
}

function showHideExport() {
  if (document.getElementById('export').checked) {
    showExport();
  } else {
    hideExport();
  }
}

const filenameInput = document.getElementById('filenameinput');
filenameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    setfilenameinput();
    hideExport();
    cindy.evokeCS('export();');
  }
});

const startBtn = document.getElementById('startExport');
startBtn.addEventListener('click', () => {
  filenameInput.focus();
  // create a real KeyboardEvent for “Enter”
  const enterEvent = new KeyboardEvent('keydown', {
    bubbles: true, cancelable: true, key: 'Enter', code: 'Enter', keyCode: 13, which: 13
  });
  // fire it on the input
  filenameInput.dispatchEvent(enterEvent);
});

//==================== INFORMATION MENU ====================//

const info = document.getElementById('info');
const infoMenu = document.getElementById('property-menu');
const sett = document.getElementById('sett');
const settingsMenu = document.getElementById('settings');

function updatePropertyOffset() {
  if (settingsMenu.style.display !== 'none') {
    // get the *rendered* width of the settings‐panel
    const w = settingsMenu.getBoundingClientRect().width;
    infoMenu.style.right = `${w}px`;
  }
  else {
    infoMenu.style.right = '0';
  }
}

function toggleInfo() {
  if (info.checked) {
    infoMenu.style.display = "inline-grid"
  } else {
    infoMenu.style.display = "none";
    info.checked = false;
  }
}
function toggleSettings() {
  if (sett.checked) {
    settingsMenu.style.display = "inline-grid"
  } else {
    settingsMenu.style.display = "none";
    sett.checked = false;
  }
  updatePropertyOffset();
}

// Sliders
function updateGradient(slider) {
  const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
  slider.style.setProperty('--percent', pct + '%');
}

const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach(slider => {
  slider.addEventListener('input', () => updateGradient(slider));
  updateGradient(slider); //init
});

const sizeSlider = document.getElementById("size-slider");
sizeSlider.addEventListener("input", (e) => {
  cindy.evokeCS(`apply(allSelectedElements(), #.size=${sizeSlider.value});`);
});
const opacitySlider = document.getElementById("opacity-slider");
opacitySlider.addEventListener("input", (e) => {
  cindy.evokeCS(`apply(allSelectedElements(), #.alpha=${opacitySlider.value});`);
});
const toricSizeSlider = document.getElementById("toric-size-slider");
toricSizeSlider.addEventListener("input", () => {
  cindy.evokeCS(`tøric.size=${toricSizeSlider.value};`);
});
const toricResolutionSlider = document.getElementById("toric-resolution-slider");
toricResolutionSlider.addEventListener("input", () => {
  cindy.evokeCS(`tøric.resolution=${toricResolutionSlider.value}; resetToricPicture();`);
});
const toricPointsSlider = document.getElementById("toric-points-slider");
toricPointsSlider.addEventListener("input", () => {
  cindy.evokeCS(`tøric.curvePoints=${toricPointsSlider.value}; resetToricPicture();`);
});

// Color Picker
const swatches = document.querySelectorAll(".color-swatch");
let currentlySelectedSwatch = null;

// only works on "old" swatches
swatches.forEach((swatch) => {
  swatch.addEventListener("click", (e) => {
    // Remove “selected” outline from any previously clicked swatch:
    if (currentlySelectedSwatch) {
      currentlySelectedSwatch.classList.remove("active");
    }
    swatch.classList.add("active");
    currentlySelectedSwatch = swatch;
    cindy.evokeCS(`apply(allSelectedElements(), #.color =
      ${getComputedStyle(currentlySelectedSwatch).getPropertyValue('background-color').trim().replace(/rgba?/, "")}/255);`);
  });
});

document.querySelectorAll('.color-picker').forEach(picker => {
  picker.addEventListener('click', async e => {
    // only handle clicks on “add” swatches
    const sw = e.target;
    if (!sw.classList.contains('color-swatch-add')) return;
    // 1) Pick a color via EyeDropper if available
    let picked;
    if (window.EyeDropper) {
      try {
        const { sRGBHex } = await new EyeDropper().open();
        picked = sRGBHex;
      } catch (_) {
        // user cancelled or no permission
      }
    }
    // 2) Fallback to <input type="color">
    if (!picked) {
      // make sure this swatch stays an “add” button
      sw.style.removeProperty('--ownColor');
      sw.classList.add('color-swatch-add');
      return;
    }
    // 3) Transform this swatch into a filled one
    sw.style.setProperty('--ownColor', picked);
    sw.classList.remove('color-swatch-add');
    // 4) Append a fresh “add” swatch at the end
    const newSw = document.createElement('div');
    newSw.className = 'color-swatch color-swatch-add';
    newSw.addEventListener("click", (e) => {
      // Remove “selected” outline from any previously clicked swatch:
      if (currentlySelectedSwatch) {
        currentlySelectedSwatch.classList.remove("active");
      }
      newSw.classList.add("active");
      currentlySelectedSwatch = newSw;
    });
    picker.appendChild(newSw);
  });
});

//==================== INFORMATION MENU UPDATE ====================//
function updateInformationMenu() {
  const selection = communicationCS.selection || [];
  const infoSec = document.getElementById("info-section");
  const settingsSec = document.getElementById("element-section");

  // Toggle Element Info section: only show when exactly one is selected
  if (selection.length === 1) {
    populateInfo(selection[0]);
  } else {
    clearInfoFields();
  }

  // Element Settings section: always visible, but enable/disable based on selection
  settingsSec.style.display = "grid";
  if (selection.length > 0) {
    populateSettings(selection);
    setSettingsEnabled(true);
  } else {
    clearSettingsFields();
    setSettingsEnabled(false);
  }
}

function populateInfo(element) {
  document.getElementById("info-name").textContent = element.name;
  document.getElementById("info-type").textContent = element.type;
  document.getElementById("info-alg").textContent = element.alg;
  document.getElementById("info-parents").textContent = element.parents.length ? element.parents.join(", ") : "—";
  //document.getElementById("info-pos").textContent = 
  //  Array.isArray(element.coords[0])
  //    ? element.coords.map(pt => pt.slice(0,2).join(", ")).join(" | ")
  //    : element.coords.slice(0,2).join(", ");
  document.getElementById("info-inc").textContent = (element.definedIncidences.concat(element.deducedIncidences)).join(", ");
}

function clearInfoFields() {
  //"info-pos",
  ["info-name","info-type","info-alg","info-parents","info-inc"].forEach(id => {
    document.getElementById(id).textContent = "";
  });
}

// helper to compare two RGB‐arrays
function arrayEquals(a,b){
  if (!a||!b||a.length!==b.length) return false;
  return a.every((v,i)=>Math.abs(v-b[i])<1e-6);
}

// Convert [r,g,b] array (0-1 floats) to CSS "rgb(r,g,b)" string
function rgbArrayToCss([r, g, b]) {
  const to255 = x => Math.round(255 * x);
  return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
}

function populateSettings(selection) {
  const first = selection[0];
  let commonColor   = first.color;
  let commonOpacity = first.alpha;
  let commonSize    = first.size;
  let commonVisible = first.visibool;
  let commonDraggable = first.draggable;

  // Determine common properties
  for (let el of selection.slice(1)) {
    if (!arrayEquals(el.color, commonColor))   commonColor   = null;
    if (el.alpha !== commonOpacity)            commonOpacity = null;
    if (el.size !== commonSize)                commonSize    = null;
    if (el.visibool !== commonVisible)         commonVisible = null;
    if (el.draggable !== commonDraggable)      commonDraggable = null;
  }

  // Color swatch: match using rgb CSS
  document.querySelectorAll(".color-swatch.selected").forEach(s => s.classList.remove("selected"));
  if (commonColor) {
    const rgb = rgbArrayToCss(commonColor);
    const sw  = document.querySelector(`.color-swatch[style*="${rgb}"]`);
    if (sw) sw.classList.add("selected");
  }

  // Opacity slider
  const opacitySlider = document.getElementById("opacity-slider");
  opacitySlider.value = commonOpacity !== null ? commonOpacity : opacitySlider.min;
  updateGradient(opacitySlider);

  // Visibility toggle
  const visToggle = document.getElementById("visibility-toggle");
  visToggle.checked = commonVisible !== null ? commonVisible : false;
  visToggle.indeterminate = commonVisible === null;

  // Draggable toggle
  const draggableToggle = document.getElementById("draggable-toggle");
  draggableToggle.checked = commonDraggable !== null ? commonDraggable : false;
  draggableToggle.indeterminate = commonDraggable === null;

  // Size slider
  const sizeSlider = document.getElementById("size-slider");
  sizeSlider.value = commonSize !== null ? commonSize : sizeSlider.min;
  updateGradient(sizeSlider);
}

function clearSettingsFields() {
  // Clear color swatches
  document.querySelectorAll(".color-swatch.selected").forEach(s => s.classList.remove("selected"));
  // Reset sliders to default values
  [["opacity-slider",1],["size-slider",8]].forEach(([id,defaultValue]) => {
    const el = document.getElementById(id);
    el.value = el.defaultValue;
    updateGradient(el);
  });
  // Reset toggles
  document.getElementById("visibility-toggle").indeterminate = false;
  [["draggable-toggle",true],["visibility-toggle",true]].forEach(([id,defaultValue]) => {
    document.getElementById(id).checked = defaultValue;
  });
}

function setSettingsEnabled(enabled) {
  document
    .querySelectorAll(
      "#element-section input:not(#visibility-button), #element-section .color-swatch"
    )
    .forEach(el => {
      el.disabled = !enabled;
    });
  document.getElementById("visibility-button").disabled = ((communicationCS.invisibles || []).length === 0);
}


//==================== MODES ====================//

function showHideModes() {
  const selCategory = document.querySelector('input[name="mode-category"]:checked');
  const cat = selCategory.value;
  const modes = document.querySelectorAll('.cat');
  modes.forEach(mode => {
    if (mode.classList.contains(cat)) {
      mode.classList.remove('hidden');
    } else {
      mode.classList.add('hidden');
    }
  });
}
showHideModes(); // For initialization

const modeCats = document.querySelectorAll('input[name="mode-category"]');
modeCats.forEach(cat => {
  cat.addEventListener('change', showHideModes);
});


//==================== CONTEXT MENU ====================//

const contextMenu = document.getElementById("context-menu");
const canvas = document.getElementById("CindyCanvas");
var communicationCS = {};

// Canvas switches
const axesContext = document.getElementById('context-axes');
const gridContext = document.getElementById('context-grid');
const snapContext = document.getElementById('context-snap');
const canvasContext = [axesContext, gridContext, snapContext];
// Element specific contents
const nameContext = document.getElementById('context-name');
const infoContext = document.getElementById('context-info');
const deleteContext = document.getElementById('context-delete');
const elementContext = [nameContext, infoContext, deleteContext];
const nameContextLabel = document.getElementById('context-name-label');
// Synchronization of checkboxes
const drawAxes = document.getElementById('DrawAxes');
const axesToggle = document.getElementById('axes-toggle');
const drawGrid = document.getElementById('DrawGrid');
const gridToggle = document.getElementById('grid-toggle');
const snap = document.getElementById('Snap');
const snapToggle = document.getElementById('snap-toggle');

// Prevent right clicks
document.addEventListener('contextmenu', function(e) {e.preventDefault();}, false);
// Change mode if right click detected before CindyJS is informed
canvas.addEventListener("pointerdown", function(e) {
  if (e.button === 2) {
    setm("move");
    document.getElementById("move").checked = true;
  }
}, true);
// Prevent dragging on everything except range inputs
document.addEventListener("dragstart", function (e) {e.preventDefault();});

// Show context menu: content depends on the found objects
function showMenu(event) {
  cindy.evokeCS('cømmunicateJS();');
  if (communicationCS.elementsFound === true) {
    canvasContext.forEach(element => {element.style.display = "none"});
    elementContext.forEach(element => {element.style.display = "contents"});
    nameContextLabel.textContent = communicationCS.elementsAtPos[0][1].concat(" ", communicationCS.elementsAtPos[0][0])
  } else {
    elementContext.forEach(element => {element.style.display = "none"});
    canvasContext.forEach(element => {element.style.display = "contents"});
  };
  contextMenu.style.display = "grid";
  contextMenu.style.left = `${event.pageX}px`;
  contextMenu.style.top = `${event.pageY}px`;
}

// Hide the menu on any left click elsewhere or on Shift/Esc
window.addEventListener("click", (event) => {
  if (event.button !== 0) {
    return
  }
  // Include the switches which are refered to  by checkboxes living in the context menu
  if (contextMenu.contains(event.target) || drawAxes.contains(event.target) || drawGrid.contains(event.target) || snap.contains(event.target)) {
    return
  }
  contextMenu.style.display = 'none';
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" || event.key === "Shift") {
    contextMenu.style.display ='none';
  }
});

// Synchronization of checkboxes
// axes sync
drawAxes.addEventListener('change', () => {
  axesToggle.checked = drawAxes.checked;
  cindy.evokeCS('pørt.axes=!pørt.axes;');
});
axesToggle.addEventListener('change', () => {
  drawAxes.checked = axesToggle.checked;
  cindy.evokeCS('pørt.axes=!pørt.axes;');
});

// grid sync + snap regulation
drawGrid.addEventListener('change', () => {
  gridToggle.checked = drawGrid.checked;
  cindy.evokeCS('pørt.grid=!pørt.grid; snapToGrid=false;');
  snap.disabled = !drawGrid.checked;
  snapToggle.disabled = snap.disabled;
  if (!drawGrid.checked) {
    snap.checked = false;
    snapToggle.checked = false;
  }
});
gridToggle.addEventListener('change', () => {
  drawGrid.checked = gridToggle.checked;
  cindy.evokeCS('pørt.grid=!pørt.grid; snapToGrid=false;');
  snap.disabled = !gridToggle.checked;
  snapToggle.disabled = snap.disabled;
  if (!gridToggle.checked) {
    snap.checked = false;
    snapToggle.checked = false;
  }
});

// snap sync
snap.addEventListener('change', () => {
  snapToggle.checked = snap.checked;
  cindy.evokeCS('if(pørt.grid, snapToGrid=!snapToGrid;);');
});
snapToggle.addEventListener('change', () => {
  snap.checked = snapToggle.checked;
  cindy.evokeCS('if(pørt.grid, snapToGrid=!snapToGrid;);');
});
