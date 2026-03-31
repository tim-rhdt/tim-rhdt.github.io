//==================== THEMES ====================//

const TimThemeColors = {
  ModeBackgroundColor:  'rgb(240,209,221)',
  ModeHoverColor:       'rgba(224,163,187,0.80)',
  ModeCheckedColor:     'rgb(224,163,187)',
  InfoBackgroundColor:  'rgb(255,245,225)',
  InfoHoverColor:       'rgba(243,218,176,0.80)',
  InfoCheckedColor:     'rgb(243,218,176)',
  BorderColor:          'rgb(0,0,0)',
  TextColor:            'rgb(0,0,0)',
  InfoBorderColor:      'rgb(204,204,204)',
  pointColor:           'rgb(201,94,134)',
  lineColor:            'rgb(38,88,115)',
  highlightColor:       'rgb(255,255,255)',
  cubicColor:           'rgb(232,168,124)',
  canvasColor:          'rgb(232,238,247)'
};
const TimThemeSettings = {
  Border: false
};
const TimTheme = {
  Name: "Tim",
  Colors: TimThemeColors,
  Settings: TimThemeSettings
};

const CinderellaThemeColors = {
  ModeBackgroundColor:  'rgb(242,242,242)',
  ModeHoverColor:       'rgba(148,148,148,0.80)',
  ModeCheckedColor:     'rgb(148,148,148)',
  InfoBackgroundColor:  'rgb(230,230,250)',
  InfoHoverColor:       'rgba(176,176,210,0.80)',
  InfoCheckedColor:     'rgb(176,176,210)',
  BorderColor:          'rgb(0,0,0)',
  TextColor:            'rgb(0,0,0)',
  InfoBorderColor:      'rgb(192,192,192)',
  pointColor:           'rgb(255,0,0)',
  lineColor:            'rgb(0,0,245)',
  highlightColor:       'rgb(255,255,255)',
  cubicColor:           'rgb(204,204,255)',
  canvasColor:          'rgb(168,176,192)'
};
const CinderellaThemeSettings = {
  Border: true
};
const CinderellaTheme = {
  Name: "Cinderella",
  Colors: CinderellaThemeColors,
  Settings: CinderellaThemeSettings
};

const DarkThemeColors = {
  ModeBackgroundColor:  'rgb(20,20,20)',
  ModeHoverColor:       'rgba(50,50,50,0.8)',
  ModeCheckedColor:     'rgb(60,60,60)',
  InfoBackgroundColor:  'rgb(30,30,30)',
  InfoHoverColor:       'rgba(50,50,50,0.8)',
  InfoCheckedColor:     'rgb(60,60,60)',
  BorderColor:          'rgb(70,70,70)',
  TextColor:            'rgb(204,204,204)',
  InfoBorderColor:      'rgb(90,90,90)',
  pointColor:           'rgb(255,105,97)',
  lineColor:            'rgb(76,182,255)',
  highlightColor:       'rgb(255,255,160)',
  cubicColor:           'rgb(116,152,93)',
  canvasColor:          'rgb(50,50,50)'
};
const DarkThemeSettings = {
  Border: false
};
const DarkTheme = {
  Name: "Dark",
  Colors: DarkThemeColors,
  Settings: DarkThemeSettings
};

const SummerThemeColors = {
  ModeBackgroundColor:  'rgb(254,240,240)',
  ModeHoverColor:       'rgba(247,136,136,0.5)',
  ModeCheckedColor:     'rgb(247,136,136)',
  InfoBackgroundColor:  'rgb(255,250,235)',
  InfoHoverColor:       'rgba(243,210,80,0.5)',
  InfoCheckedColor:     'rgb(243,210,80)',
  BorderColor:          'rgb(220,190,190)',
  TextColor:            'rgb(40,40,40)',
  InfoBorderColor:      'rgb(230,210,160)',
  pointColor:           'rgb(243,210,80)',
  lineColor:            'rgb(93,162,213)',
  highlightColor:       'rgb(255,255,255)',
  cubicColor:           'rgb(247,136,136)',
  canvasColor:          'rgb(245,240,230)'
};
const SummerThemeSettings = {
  Border: true
};
const SummerTheme = {
  Name: "Summer",
  Colors: SummerThemeColors,
  Settings: SummerThemeSettings
};

const ArtDecoThemeColors = {
  ModeBackgroundColor:  'rgb(248,243,233)',
  ModeHoverColor:       'rgba(215,175,199,0.5)',
  ModeCheckedColor:     'rgb(215,175,199)',
  InfoBackgroundColor:  'rgb(255,245,225)',
  InfoHoverColor:       'rgba(240,88,8,0.4)',
  InfoCheckedColor:     'rgb(240,88,8)',
  BorderColor:          'rgb(210,180,170)',
  TextColor:            'rgb(30,30,30)',
  InfoBorderColor:      'rgb(220,150,100)',
  pointColor:           'rgb(228,76,129)',
  lineColor:            'rgb(180,99,9)',
  highlightColor:       'rgb(255,255,255)',
  cubicColor:           'rgb(243,210,80)',
  canvasColor:          'rgb(240,235,225)'
};
const ArtDecoThemeSettings = {
  Border: false
};
const ArtDecoTheme = {
  Name: "ArtDeco",
  Colors: ArtDecoThemeColors,
  Settings: ArtDecoThemeSettings
};

const GardenThemeColors = {
  ModeBackgroundColor:  'rgb(240,250,240)',
  ModeHoverColor:       'rgba(203,230,199,0.5)',
  ModeCheckedColor:     'rgb(143,183,143)',
  InfoBackgroundColor:  'rgb(245,248,250)',
  InfoHoverColor:       'rgba(243,165,188,0.5)',
  InfoCheckedColor:     'rgb(243,165,188)',
  BorderColor:          'rgb(200,230,200)',
  TextColor:            'rgb(30,30,30)',
  InfoBorderColor:      'rgb(210,220,240)',
  pointColor:           'rgb(255,196,155)',
  lineColor:            'rgb(40,83,107)',
  highlightColor:       'rgb(255,255,255)',
  cubicColor:           'rgb(228,76,129)',
  canvasColor:          'rgb(235,240,235)'
};
const GardenThemeSettings = {
  Border: true
};
const GardenTheme = {
  Name: "Garden",
  Colors: GardenThemeColors,
  Settings: GardenThemeSettings
};

const CyberpunkThemeColors = {
  ModeBackgroundColor:  'rgb(10,10,20)',               // Sehr dunkler Hintergrund
  ModeHoverColor:       'rgba(255,0,255,0.5)',         // Neon-Magenta halbtransparent
  ModeCheckedColor:     'rgb(255,0,255)',              // Neon-Magenta
  InfoBackgroundColor:  'rgb(20,20,30)',               // Etwas heller als ModeBackground
  InfoHoverColor:       'rgba(0,255,255,0.5)',         // Neon-Cyan halbtransparent
  InfoCheckedColor:     'rgb(0,255,255)',              // Neon-Cyan
  BorderColor:          'rgb(60,60,80)',               // Gedämpftes Blau für Linien
  TextColor:            'rgb(255,255,255)',            // Weißer Text für Kontrast
  InfoBorderColor:      'rgb(80,80,120)',              // Etwas hellere Linien
  pointColor:           'rgb(255,0,128)',              // Pink – als starker Punktindikator
  lineColor:            'rgb(0,255,180)',              // Leuchtend Türkis – futuristisch
  highlightColor:       'rgb(255,255,160)',            // Helles Gelb für Hervorhebungen
  cubicColor:           'rgb(255,128,0)',              // Leuchtendes Orange – lebendig
  canvasColor:          'rgb(15,15,25)'                // Noch dunkler als InfoBackground
};
const CyberpunkThemeSettings = {
  Border: false
};
const CyberpunkTheme = {
  Name: "Cyberpunk",
  Colors: CyberpunkThemeColors,
  Settings: CyberpunkThemeSettings
};



//==================== CHANGE THEMES ====================//

const pointBorder = document.getElementById('border-toggle');
var currentTheme = TimTheme;

function setTheme(theme) {
  const root = document.documentElement;
  for (let [name, value] of Object.entries(theme.Colors)) {
    root.style.setProperty(`--${name}`, value);
    cindy.evokeCS(`cølors.${name.replace(/Color?/, "")} = ${value.replace(/rgba?/, "")}/255;`);
  }
  cindy.evokeCS(`apply(pts, if(#.color == ${currentTheme.Colors.pointColor.replace(/rgba?/, "")}/255, #.color = ${theme.Colors.pointColor.replace(/rgba?/, "")}/255) );`);
  cindy.evokeCS(`apply(lns++segs++cns++arcs, if(#.color == ${currentTheme.Colors.lineColor.replace(/rgba?/, "")}/255, #.color = ${theme.Colors.lineColor.replace(/rgba?/, "")}/255) );`);
  cindy.evokeCS(`apply(cubs, if(#.color == ${currentTheme.Colors.cubicColor.replace(/rgba?/, "")}/255, #.color = ${theme.Colors.cubicColor.replace(/rgba?/, "")}/255) );`);
  pointBorder.checked = theme.Settings.Border;
  cindy.evokeCS(`pointBorder = ${theme.Settings.Border}`);
  currentTheme = theme;
};



//==================== HANDLE SVGs ====================//

const fillColorMap = {
  '#000000':          '--TextColor',
  '#C95E85':          '--pointColor',
  '#265873':          '--lineColor',
  '#FFFFFF':          '--highlightColor',
  'white':            '--highlightColor',
  'rgb(201,94,133)':  '--pointColor',
  'rgb(38,88,115)':   '--lineColor',
};
// build a lowercase, whitespace-stripped map for matching
const styleMap = Object.fromEntries(
  Object.entries(fillColorMap)
    .map(([k, v]) => [ k.toLowerCase().replace(/\s+/g,''), v ])
);

const clipList = [
  'singleline.svg',
  'parallel.svg',
  'perpendicular.svg'
  // add more if needed
];

document
  .querySelectorAll('.UI-container label img[src$=".svg"]')
  .forEach(img => {
    const filename   = img.src.split('/').pop();
    const shouldClip = clipList.includes(filename);

  fetch(img.src)
    .then(r => r.text())
    .then(xml => {
      const doc = new DOMParser().parseFromString(xml, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return;

      // 1) preserve/build viewBox
      let vb;
      if (svg.hasAttribute('viewBox')) {
        vb = svg.getAttribute('viewBox');
      } else {
        const rawW = svg.getAttribute('width');
        const rawH = svg.getAttribute('height');
        const w    = rawW ? parseFloat(rawW) : img.naturalWidth  || 24;
        const h    = rawH ? parseFloat(rawH) : img.naturalHeight || 24;
        vb = `0 0 ${w} ${h}`;
      }
      svg.setAttribute('viewBox', vb);

      // 2) drop fixed sizing
      svg.removeAttribute('width');
      svg.removeAttribute('height');

      // 3) center & scale
      svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

      // 4) default fill
      svg.setAttribute('fill', 'var(--TextColor)');

      // 5) remap fill attributes
      svg.querySelectorAll('[fill]').forEach(el => {
        const raw = el.getAttribute('fill').trim().toLowerCase().replace(/\s+/g,'');
        el.removeAttribute('fill');
        if (raw === 'none') {
          el.style.fill = 'none';
        } else {
          const cssVar = styleMap[raw] || '--TextColor';
          el.style.fill = `var(${cssVar})`;
        }
      });

      // 6) remap stroke attributes
      svg.querySelectorAll('[stroke]').forEach(el => {
        const raw = el.getAttribute('stroke').trim().toLowerCase().replace(/\s+/g,'');
        el.removeAttribute('stroke');
        if (raw === 'none') {
          el.style.stroke = 'none';
        } else {
          const cssVar = styleMap[raw] || '--TextColor';
          el.style.stroke = `var(${cssVar})`;
        }
      });

      // 7) remap inline style props
      svg.querySelectorAll('*').forEach(el => {
        if (el.style.fill) {
          const raw = el.style.fill.trim().toLowerCase().replace(/\s+/g,'');
          el.style.removeProperty('fill');
          el.style.fill = raw === 'none'
            ? 'none'
            : `var(${styleMap[raw] || '--TextColor'})`;
        }
        if (el.style.stroke) {
          const raw = el.style.stroke.trim().toLowerCase().replace(/\s+/g,'');
          el.style.removeProperty('stroke');
          el.style.stroke = raw === 'none'
            ? 'none'
            : `var(${styleMap[raw] || '--TextColor'})`;
        }
      });

      // 8) carry over id/class
      if (img.id)        svg.id        = img.id;
      if (img.className) svg.className = img.className;

      // 9) inline style + overflow/clip
      const origStyle = img.getAttribute('style') || '';
      const overflow  = shouldClip ? 'hidden' : 'visible';
      svg.setAttribute('style', `${origStyle};overflow:${overflow};`);

      img.replaceWith(svg);
    })
    .catch(console.error);
});
