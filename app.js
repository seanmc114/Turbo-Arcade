/* Turbo Arcade — STANDALONE CONNECTORS (LEGIBLE) + MODES RESTORED
   - Injects its own UI (won’t die if your HTML changes)
   - Modes: Practice / Duel / Tower / Pressure / Heist
   - +30s per mistake (Practice/Duel/Tower/Heist)
   - Feedback after each run
   - Practice unlocks levels by time thresholds
   - Local PB per level (per device)
   - Crest watermark behind everything
*/

(() => {
  "use strict";

  // =========================
  // CONFIG
  // =========================
  const CREST_URL = "crest.png"; // change if needed: "assets/crest.png"
  const PENALTY_SECONDS = 30;

  const STORAGE = {
    unlockedMax: "TA_UNLOCK_V4",
    pb: (modeId, levelId) => `TA_PB_V4_${modeId}_L${levelId}`,
    towerChamp: (levelId) => `TA_TOWER_CHAMP_V4_L${levelId}` // {name, score}
  };

  const MODES = [
    { id: "practice", name: "Practice", tag: "Unlock levels", desc: "Classic timed. +30s per mistake. Unlock next levels here." },
    { id: "duel", name: "Turbo Duel", tag: "Head-to-head", desc: "Two players, same questions. Fastest wins." },
    { id: "tower", name: "Champion Tower", tag: "Dethrone", desc: "Beat the champion time to take the crown (this device)." },
    { id: "pressure", name: "Pressure Cooker", tag: "Survival", desc: "90s start. Correct +3s. Wrong -30s. Score = correct." },
    { id: "heist", name: "Language Heist", tag: "3 stages", desc: "Same scoring, but stages get harder through the run." },
  ];

  const LEVELS = [
    { id: 1, diff: "Very easy" },
    { id: 2, diff: "Easy" },
    { id: 3, diff: "Easy+" },
    { id: 4, diff: "Medium" },
    { id: 5, diff: "Medium+" },
    { id: 6, diff: "Hard-ish" },
    { id: 7, diff: "Hard" },
    { id: 8, diff: "Hard+" },
    { id: 9, diff: "Quite hard" },
    { id: 10, diff: "Quite difficult" },
  ];

  // Unlock Level N by beating Level N-1 within this time (Practice only)
  const UNLOCK_BY_LEVEL = {
    1: null,
    2: 90,
    3: 85,
    4: 80,
    5: 75,
    6: 70,
    7: 65,
    8: 60,
    9: 55,
    10: 50,
  };

  const CONNECTORS = {
    1: ["y", "o", "pero"],
    2: ["porque", "también", "además", "sin"],
    3: ["entonces", "así que", "por eso", "luego"],
    4: ["aunque", "sin embargo", "en cambio", "sino"],
    5: ["cuando", "mientras", "antes de", "después de"],
    6: ["ya que", "puesto que", "a pesar de", "por lo tanto"],
    7: ["no obstante", "sin duda", "por un lado", "por otro lado"],
    8: ["siempre que", "con tal de que", "a menos que", "de repente"],
    9: ["de modo que", "de manera que", "a fin de", "consecuentemente"],
    10: ["en cuanto", "dado que", "aun así", "a medida que"],
  };

  // 10 questions per level (exactly)
  const SENTENCES = {
    1: [
      { t: "Quiero té ____ café.", a: "o", w: "Choice → <b>o</b>." },
      { t: "Tengo un lápiz ____ un bolígrafo.", a: "y", w: "Addition → <b>y</b>." },
      { t: "Estudio, ____ estoy cansado.", a: "pero", w: "Contrast → <b>pero</b>." },
      { t: "Es simpático ____ divertido.", a: "y", w: "Adding → <b>y</b>." },
      { t: "¿Quieres ir ____ quedarte en casa?", a: "o", w: "Alternative → <b>o</b>." },
      { t: "Me gusta el fútbol, ____ prefiero el baloncesto.", a: "pero", w: "Contrast → <b>pero</b>." },
      { t: "Trabajo ____ estudio por las tardes.", a: "y", w: "Two actions → <b>y</b>." },
      { t: "Podemos caminar ____ tomar el bus.", a: "o", w: "Either/or → <b>o</b>." },
      { t: "Quiero salir, ____ está lloviendo.", a: "pero", w: "But → <b>pero</b>." },
      { t: "Compro pan ____ leche.", a: "y", w: "List → <b>y</b>." },
    ],
    2: [
      { t: "No salgo ____ tengo deberes.", a: "porque", w: "Reason → <b>porque</b>." },
      { t: "Voy al cine; ____ voy a cenar.", a: "también", w: "Also → <b>también</b>." },
      { t: "Quiero estudiar; ____ quiero practicar.", a: "además", w: "In addition → <b>además</b>." },
      { t: "Lo hago ____ prisa.", a: "sin", w: "Without → <b>sin</b>." },
      { t: "Estoy feliz ____ es viernes.", a: "porque", w: "Cause → <b>porque</b>." },
      { t: "Ella canta; ____ baila.", a: "también", w: "Also → <b>también</b>." },
      { t: "Es caro; ____ es buenísimo.", a: "además", w: "Plus → <b>además</b>." },
      { t: "Salimos ____ dinero.", a: "sin", w: "Without → <b>sin</b>." },
      { t: "No lo compro ____ no lo necesito.", a: "porque", w: "Reason → <b>porque</b>." },
      { t: "Tengo hambre; ____ estoy cansado.", a: "además", w: "Another point → <b>además</b>." },
    ],
    3: [
      { t: "Terminé la tarea; ____ puedo descansar.", a: "entonces", w: "So → <b>entonces</b>." },
      { t: "Está nublado, ____ no vamos a la playa.", a: "así que", w: "Result → <b>así que</b>." },
      { t: "Perdí el bus; ____ llegué tarde.", a: "por eso", w: "That’s why → <b>por eso</b>." },
      { t: "Comimos y ____ fuimos al parque.", a: "luego", w: "Afterwards → <b>luego</b>." },
      { t: "No estudió, ____ suspendió.", a: "por eso", w: "Reason→result → <b>por eso</b>." },
      { t: "Estaba enfermo, ____ se quedó en casa.", a: "así que", w: "So → <b>así que</b>." },
      { t: "No tengo clase; ____ voy a entrenar.", a: "entonces", w: "So → <b>entonces</b>." },
      { t: "Hicimos la compra y ____ cocinamos.", a: "luego", w: "Then → <b>luego</b>." },
      { t: "No había sitio; ____ cambiamos de plan.", a: "entonces", w: "So → <b>entonces</b>." },
      { t: "Quería dormir; ____ apagué el móvil.", a: "así que", w: "So → <b>así que</b>." },
    ],
    4: [
      { t: "Quiero ir; ____ está lloviendo.", a: "sin embargo", w: "However → <b>sin embargo</b>." },
      { t: "Yo estudio; mi hermano, ____ , juega.", a: "en cambio", w: "In contrast → <b>en cambio</b>." },
      { t: "No es caro, ____ barato.", a: "sino", w: "Not X but Y → <b>sino</b>." },
      { t: "Voy, ____ no tengo tiempo.", a: "aunque", w: "Even though → <b>aunque</b>." },
      { t: "Me gusta; ____ prefiero otro.", a: "sin embargo", w: "However → <b>sin embargo</b>." },
      { t: "Yo voy en bus; tú, ____ , vas andando.", a: "en cambio", w: "Contrast → <b>en cambio</b>." },
      { t: "No quiero té, ____ café.", a: "sino", w: "Correction → <b>sino</b>." },
      { t: "Salgo ____ esté cansado.", a: "aunque", w: "Even if/though → <b>aunque</b>." },
      { t: "Es difícil; ____ lo intento.", a: "sin embargo", w: "However → <b>sin embargo</b>." },
      { t: "No es feo, ____ raro.", a: "sino", w: "Not X but Y → <b>sino</b>." },
    ],
    5: [
      { t: "Te llamo ____ llegue a casa.", a: "cuando", w: "When → <b>cuando</b>." },
      { t: "Leo ____ como.", a: "mientras", w: "While → <b>mientras</b>." },
      { t: "____ salir, termino la tarea.", a: "antes de", w: "Before → <b>antes de</b>." },
      { t: "____ cenar, vemos una serie.", a: "después de", w: "After → <b>después de</b>." },
      { t: "Me ducho ____ entrenar.", a: "después de", w: "After → <b>después de</b>." },
      { t: "____ dormir, apago la luz.", a: "antes de", w: "Before → <b>antes de</b>." },
      { t: "Voy al parque ____ hace sol.", a: "cuando", w: "When → <b>cuando</b>." },
      { t: "Escucho música ____ estudio.", a: "mientras", w: "While → <b>mientras</b>." },
      { t: "____ comer, lavo las manos.", a: "antes de", w: "Before → <b>antes de</b>." },
      { t: "____ clase, entrenamos.", a: "después de", w: "After → <b>después de</b>." },
    ],
    6: [
      { t: "No voy ____ estoy enfermo.", a: "ya que", w: "Since → <b>ya que</b>." },
      { t: "No salimos ____ llueve.", a: "puesto que", w: "Since → <b>puesto que</b>." },
      { t: "Lo intento ____ el problema.", a: "a pesar de", w: "Despite → <b>a pesar de</b>." },
      { t: "Estudio; ____ saco mejores notas.", a: "por lo tanto", w: "Therefore → <b>por lo tanto</b>." },
      { t: "Me quedo en casa ____ no hay tiempo.", a: "ya que", w: "Reason → <b>ya que</b>." },
      { t: "No lo hago ____ es peligroso.", a: "puesto que", w: "Reason → <b>puesto que</b>." },
      { t: "Voy ____ el cansancio.", a: "a pesar de", w: "Despite → <b>a pesar de</b>." },
      { t: "Estoy preparado; ____ no tengo miedo.", a: "por lo tanto", w: "Therefore → <b>por lo tanto</b>." },
      { t: "No me gusta; ____ lo respeto.", a: "a pesar de", w: "Despite → <b>a pesar de</b>." },
      { t: "No estudió; ____ suspendió.", a: "por lo tanto", w: "Therefore → <b>por lo tanto</b>." },
    ],
    7: [
      { t: "____ , el plan es bueno.", a: "sin duda", w: "Emphasis → <b>sin duda</b>." },
      { t: "____ , es útil; ____ , es caro.", a: "por un lado", w: "First side → <b>por un lado</b>." },
      { t: "____ , es útil; ____ , es caro.", a: "por otro lado", w: "Second side → <b>por otro lado</b>." },
      { t: "Quería ir; ____ no tenía tiempo.", a: "no obstante", w: "Nevertheless → <b>no obstante</b>." },
      { t: "Está lejos; ____ lo hacemos.", a: "no obstante", w: "Nevertheless → <b>no obstante</b>." },
      { t: "____ , vale la pena.", a: "sin duda", w: "No doubt → <b>sin duda</b>." },
      { t: "____ , es divertido; ____ , es cansado.", a: "por un lado", w: "First side → <b>por un lado</b>." },
      { t: "____ , es divertido; ____ , es cansado.", a: "por otro lado", w: "Second side → <b>por otro lado</b>." },
      { t: "Me dolía la pierna; ____ seguí.", a: "no obstante", w: "Nevertheless → <b>no obstante</b>." },
      { t: "____ , lo haré.", a: "sin duda", w: "Emphasis → <b>sin duda</b>." },
    ],
    8: [
      { t: "Voy contigo ____ me esperes.", a: "con tal de que", w: "Condition → <b>con tal de que</b>." },
      { t: "Iré ____ termine pronto.", a: "siempre que", w: "Provided → <b>siempre que</b>." },
      { t: "No salgo ____ llueva.", a: "a menos que", w: "Unless → <b>a menos que</b>." },
      { t: "Estaba tranquilo y ____ empezó a gritar.", a: "de repente", w: "Suddenly → <b>de repente</b>." },
      { t: "Te ayudo ____ tú también ayudes.", a: "con tal de que", w: "Condition → <b>con tal de que</b>." },
      { t: "Salimos ____ no haya exámenes.", a: "siempre que", w: "Condition → <b>siempre que</b>." },
      { t: "No lo hago ____ sea obligatorio.", a: "a menos que", w: "Unless → <b>a menos que</b>." },
      { t: "Íbamos bien y ____ todo cambió.", a: "de repente", w: "Suddenly → <b>de repente</b>." },
      { t: "Lo compro ____ sea barato.", a: "siempre que", w: "Provided → <b>siempre que</b>." },
      { t: "No voy ____ me llamen.", a: "a menos que", w: "Unless → <b>a menos que</b>." },
    ],
    9: [
      { t: "Hablo claro ____ entiendas.", a: "de modo que", w: "So that → <b>de modo que</b>." },
      { t: "Lo repito ____ no haya dudas.", a: "de manera que", w: "So that → <b>de manera que</b>." },
      { t: "Trabajo ____ ahorrar dinero.", a: "a fin de", w: "In order → <b>a fin de</b>." },
      { t: "No estudió; ____ suspendió.", a: "consecuentemente", w: "Consequently → <b>consecuentemente</b>." },
      { t: "Hice un resumen ____ fuera más fácil.", a: "de modo que", w: "So that → <b>de modo que</b>." },
      { t: "Organicé el texto ____ se entendiera.", a: "de manera que", w: "So that → <b>de manera que</b>." },
      { t: "Entreno ____ mejorar.", a: "a fin de", w: "In order → <b>a fin de</b>." },
      { t: "Hubo retrasos; ____ llegamos tarde.", a: "consecuentemente", w: "Consequently → <b>consecuentemente</b>." },
      { t: "Habla despacio ____ la sigan.", a: "de modo que", w: "So that → <b>de modo que</b>." },
      { t: "Reduje el ruido ____ se oyera.", a: "de manera que", w: "So that → <b>de manera que</b>." },
    ],
    10: [
      { t: "____ lo que dijiste, tienes razón.", a: "en cuanto", w: "Regarding → <b>en cuanto</b>." },
      { t: "No fui ____ estaba enfermo.", a: "dado que", w: "Given that → <b>dado que</b>." },
      { t: "Es caro; ____ lo compro.", a: "aun así", w: "Even so → <b>aun así</b>." },
      { t: "Mejoro ____ practico.", a: "a medida que", w: "As → <b>a medida que</b>." },
      { t: "____ el plan, me gusta.", a: "en cuanto", w: "As for → <b>en cuanto</b>." },
      { t: "No salgo ____ no tengo tiempo.", a: "dado que", w: "Given that → <b>dado que</b>." },
      { t: "No está perfecto; ____ funciona.", a: "aun así", w: "Even so → <b>aun así</b>." },
      { t: "Aprendo ____ leo más.", a: "a medida que", w: "As → <b>a medida que</b>." },
      { t: "____ el examen, estoy listo.", a: "en cuanto", w: "As for → <b>en cuanto</b>." },
      { t: "No vino ____ llovía.", a: "dado que", w: "Given that → <b>dado que</b>." },
    ],
  };

  // =========================
  // HELPERS
  // =========================
  const fmt = (sec) => `${(Math.round(sec * 10) / 10).toFixed(1)}s`;
  const esc = (s) => (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  const shuffle = (a) => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  function getUnlockedMax() {
    const n = Number(localStorage.getItem(STORAGE.unlockedMax));
    return Number.isFinite(n) ? n : 1;
  }
  function setUnlockedMax(n) {
    const cur = getUnlockedMax();
    localStorage.setItem(STORAGE.unlockedMax, String(Math.max(cur, n)));
  }
  function getPB(modeId, levelId) {
    const n = Number(localStorage.getItem(STORAGE.pb(modeId, levelId)));
    return Number.isFinite(n) ? n : null;
  }
  function setPB(modeId, levelId, score) {
    localStorage.setItem(STORAGE.pb(modeId, levelId), String(score));
  }
  function getTowerChamp(levelId) {
    try {
      const raw = localStorage.getItem(STORAGE.towerChamp(levelId));
      if (!raw) return null;
      const d = JSON.parse(raw);
      if (!d || typeof d.name !== "string" || typeof d.score !== "number") return null;
      return d;
    } catch { return null; }
  }
  function setTowerChamp(levelId, champ) {
    localStorage.setItem(STORAGE.towerChamp(levelId), JSON.stringify(champ));
  }

  // =========================
  // STATE
  // =========================
  const state = {
    modeId: "practice",
    levelId: 1,
    aName: "",
    bName: "",
    playingWho: "A",     // for duel
    duelSeed: 0,
    items: [],
    idx: 0,
    selected: null,
    penalty: 0,
    answers: [],
    t0: 0,
    raf: null,
    // pressure
    pressureLeft: 90,
    pressureCorrect: 0,
    pressureAsked: 0,
    pressurePrev: 0,
  };

  // =========================
  // UI INJECTION (HIGH CONTRAST)
  // =========================
  function injectUI() {
    const host = document.createElement("div");
    host.id = "taApp";
    host.innerHTML = `
      <style>
        :root{
          --ink:#0b1220;
          --card: rgba(255,255,255,.90);
          --stroke: rgba(0,0,0,.12);
          --shadow: 0 14px 40px rgba(0,0,0,.18);
        }
        body{
          background-image:url("${CREST_URL}");
          background-repeat:no-repeat;
          background-position:center;
          background-size: min(72vw, 560px);
          background-attachment:fixed;
        }
        #taApp{
          position:relative;
          max-width:1000px;
          margin:18px auto;
          padding:16px 16px 28px;
          border-radius:22px;
          background: var(--card);
          box-shadow: var(--shadow);
          font-family: system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;
          color: var(--ink);
        }
        #taApp h1{margin:0 0 6px;font-size:30px;letter-spacing:.2px}
        #taApp .sub{margin:0 0 14px;opacity:.85;font-weight:700}
        #taApp .bar{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 14px}
        #taApp .pill{
          padding:8px 12px;border-radius:999px;
          background: rgba(0,0,0,.06);
          border:1px solid var(--stroke);
          font-weight:900;
        }

        #taApp .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between}
        #taApp .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}

        #taApp button{
          cursor:pointer;border:1px solid var(--stroke);
          border-radius:16px;padding:12px 12px;font-weight:1000;
          color: var(--ink);
          background: rgba(255,255,255,.92);
          box-shadow: 0 10px 20px rgba(0,0,0,.10);
          transition: transform .06s ease, box-shadow .12s ease;
        }
        #taApp button:hover{transform: translateY(-1px); box-shadow: 0 14px 28px rgba(0,0,0,.14);}
        #taApp button:active{transform: translateY(0px);}

        #taApp .tile{
          background: linear-gradient(135deg, rgba(0,180,255,.22), rgba(255,0,160,.18));
          border: 1px solid rgba(0,0,0,.10);
          text-align:left;
        }
        #taApp .tile .tTop{display:flex;justify-content:space-between;gap:10px;align-items:center}
        #taApp .tile .tName{font-size:18px}
        #taApp .tile .tTag{
          font-size:12px;padding:6px 10px;border-radius:999px;
          background: rgba(0,0,0,.10);
          border:1px solid rgba(0,0,0,.10);
          font-weight:1000;
        }
        #taApp .tile .tDesc{opacity:.9;margin-top:8px;font-weight:800}

        #taApp .lvl{
          background: linear-gradient(135deg, rgba(255,230,0,.22), rgba(0,255,170,.18));
          text-align:left;
        }
        #taApp .lvl.locked{
          opacity:.55;
        }
        #taApp .lvl .small{display:block;margin-top:6px;opacity:.92;font-weight:900}

        #taApp input{
          padding:10px 12px;border-radius:14px;border:2px solid rgba(0,0,0,.16);
          font-weight:900;color:var(--ink); background: rgba(255,255,255,.95);
        }

        #taApp .card{
          padding:14px;border-radius:18px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(0,0,0,.10);
          box-shadow: 0 10px 24px rgba(0,0,0,.10);
        }

        #taApp .primary{
          background: linear-gradient(135deg, rgba(0,255,170,.35), rgba(255,230,0,.30));
        }
        #taApp .danger{
          background: rgba(255,0,0,.14);
        }

        #taApp .prompt{font-size:24px;font-weight:1100;margin:10px 0 10px}
        #taApp .opt{
          background: rgba(0,0,0,.06);
          text-align:center;
        }
        #taApp .opt.sel{
          outline: 4px solid rgba(0,140,255,.55);
          background: rgba(0,140,255,.10);
        }

        #taApp .feed{display:grid;gap:10px;margin-top:14px}
        #taApp .fi{padding:12px;border-radius:16px;background: rgba(0,0,0,.05);border:1px solid rgba(0,0,0,.08)}
        #taApp .ok{color:#0a7b2f}
        #taApp .bad{color:#b00020}

        #taApp .banner{
          margin-top:10px;
          padding:10px 12px;
          border-radius:14px;
          background: rgba(0,0,0,.06);
          border:1px solid rgba(0,0,0,.10);
          font-weight:1000;
        }
      </style>

      <h1>Turbo Arcade — Connectors</h1>
      <p class="sub">Pick the best joining word. <span style="font-weight:1000">Feedback after every level</span>.</p>

      <div class="bar">
        <div class="pill" id="pillMode">Mode: —</div>
        <div class="pill" id="pillLevel">Level: —</div>
        <div class="pill" id="pillDiff">Difficulty: —</div>
        <div class="pill" id="pillTime">Time: 0.0s</div>
        <div class="pill" id="pillPenalty">Penalty: +0s</div>
      </div>

      <div id="screenHome" class="card">
        <div class="row">
          <div><b style="font-size:18px">Choose a mode</b></div>
          <button id="resetBtn" class="danger">Reset progress</button>
        </div>
        <div class="grid" id="modeGrid" style="margin-top:12px"></div>

        <div class="banner" style="margin-top:14px">
          <span style="opacity:.9">Then choose a level:</span>
        </div>
        <div class="grid" id="levelGrid" style="margin-top:12px"></div>
      </div>

      <div id="screenSetup" class="card" style="display:none;">
        <div class="row">
          <div><b id="setupTitle">Setup</b></div>
          <button id="backHome1">Back</button>
        </div>
        <p class="sub" id="setupSub">Enter name(s) and start.</p>

        <div id="setupSolo">
          <div class="row" style="justify-content:flex-start">
            <input id="nameSolo" placeholder="Name (optional)" maxlength="24" />
            <button id="startBtn" class="primary">Start</button>
          </div>
        </div>

        <div id="setupDuel" style="display:none;">
          <div class="row" style="justify-content:flex-start">
            <input id="nameA" placeholder="Player A" maxlength="24" />
            <input id="nameB" placeholder="Player B" maxlength="24" />
            <button id="startDuelBtn" class="primary">Start Duel</button>
          </div>
        </div>

        <div class="banner" id="towerBanner" style="display:none;"></div>
      </div>

      <div id="screenGame" class="card" style="display:none;">
        <div class="row">
          <div><b id="qcount">Q 1 / 10</b></div>
          <button id="quitBtn" class="danger">Quit</button>
        </div>
        <div class="banner" id="whoBanner" style="margin-top:10px; display:none;"></div>
        <div class="prompt" id="prompt"></div>
        <div class="grid" id="options"></div>
        <div class="row" style="justify-content:flex-start; margin-top:10px">
          <button id="nextBtn" class="primary">Next</button>
        </div>
      </div>

      <div id="screenResults" class="card" style="display:none;">
        <div class="row">
          <div><b id="resultsTitle">Results</b></div>
          <button id="backHome2">Back to Home</button>
        </div>
        <p id="resultsSub" class="sub"></p>
        <div style="font-size:36px;font-weight:1100;margin:6px 0 10px" id="scoreBig">—</div>
        <div class="row" style="justify-content:flex-start">
          <button id="againBtn" class="primary">Play again</button>
        </div>
        <div class="feed" id="feedback"></div>
      </div>
    `;

    document.body.prepend(host);
  }

  function show(which) {
    const ids = ["screenHome", "screenSetup", "screenGame", "screenResults"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      el.style.display = (id === which) ? "block" : "none";
    });
  }

  function setPills() {
    const lvl = LEVELS.find(x => x.id === state.levelId) || LEVELS[0];
    const mode = MODES.find(x => x.id === state.modeId) || MODES[0];
    document.getElementById("pillMode").textContent = `Mode: ${mode.name}`;
    document.getElementById("pillLevel").textContent = `Level: ${state.levelId}`;
    document.getElementById("pillDiff").textContent = `Difficulty: ${lvl.diff}`;
  }

  // =========================
  // TIMER (classic)
  // =========================
  function stopTimer() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
  }
  function tickClassic() {
    const t = (performance.now() - state.t0) / 1000;
    document.getElementById("pillTime").textContent = `Time: ${fmt(t)}`;
    document.getElementById("pillPenalty").textContent = `Penalty: +${state.penalty}s`;
    state.raf = requestAnimationFrame(tickClassic);
  }

  // =========================
  // PRESSURE TIMER
  // =========================
  function tickPressure() {
    const now = performance.now();
    const dt = (now - state.pressurePrev) / 1000;
    state.pressurePrev = now;

    state.pressureLeft -= dt;
    if (state.pressureLeft <= 0) {
      state.pressureLeft = 0;
      document.getElementById("pillTime").textContent = `Time: ${fmt(state.pressureLeft)}`;
      document.getElementById("pillPenalty").textContent = `Score: ${state.pressureCorrect}`;
      stopTimer();
      finishPressure();
      return;
    }

    document.getElementById("pillTime").textContent = `Time: ${fmt(state.pressureLeft)}`;
    document.getElementById("pillPenalty").textContent = `Score: ${state.pressureCorrect}`;
    state.raf = requestAnimationFrame(tickPressure);
  }

  // =========================
  // BUILD MODE + LEVEL UI
  // =========================
  function buildModes() {
    const grid = document.getElementById("modeGrid");
    grid.innerHTML = "";

    MODES.forEach(m => {
      const btn = document.createElement("button");
      btn.className = "tile";
      btn.innerHTML = `
        <div class="tTop">
          <div class="tName">${m.name}</div>
          <div class="tTag">${m.tag}</div>
        </div>
        <div class="tDesc">${m.desc}</div>
      `;
      btn.onclick = () => {
        state.modeId = m.id;
        setPills();
        buildLevels();
      };
      grid.appendChild(btn);
    });
  }

  function buildLevels() {
    const grid = document.getElementById("levelGrid");
    grid.innerHTML = "";
    const unlockedMax = getUnlockedMax();

    LEVELS.forEach(l => {
      const locked = (state.modeId === "practice") ? (l.id > unlockedMax) : false; // only practice locks
      const pb = getPB(state.modeId, l.id);
      const need = UNLOCK_BY_LEVEL[l.id];

      const champ = (state.modeId === "tower") ? getTowerChamp(l.id) : null;

      const btn = document.createElement("button");
      btn.className = "lvl" + (locked ? " locked" : "");
      btn.innerHTML = `
        <div style="font-size:18px;">Level ${l.id}</div>
        <span class="small">${l.diff}</span>
        ${state.modeId === "tower"
          ? `<span class="small">Champion: ${champ ? `<b>${esc(champ.name)}</b> — ${fmt(champ.score)}` : "—"}</span>`
          : ""}
        <span class="small">Your PB: ${pb == null ? "—" : fmt(pb)}</span>
        ${state.modeId === "practice"
          ? `<span class="small">${locked ? `Locked • unlock: ≤ ${need}s` : "Unlocked"}</span>`
          : `<span class="small">Tap to play</span>`
        }
      `;

      btn.onclick = () => {
        if (locked) {
          alert(`Locked.\nUnlock Level ${l.id} by beating Level ${l.id - 1} in ≤ ${need}s (Practice).`);
          return;
        }
        state.levelId = l.id;
        setPills();
        openSetup();
      };

      grid.appendChild(btn);
    });
  }

  // =========================
  // SETUP SCREEN
  // =========================
  function openSetup() {
    const lvl = LEVELS.find(x => x.id === state.levelId);
    const mode = MODES.find(x => x.id === state.modeId);

    document.getElementById("setupTitle").textContent = `${mode.name} — Level ${state.levelId} (${lvl.diff})`;

    // tower banner
    const towerBanner = document.getElementById("towerBanner");
    if (state.modeId === "tower") {
      const champ = getTowerChamp(state.levelId);
      towerBanner.style.display = "block";
      towerBanner.innerHTML = champ
        ? `Champion to beat: <b>${esc(champ.name)}</b> — <b>${fmt(champ.score)}</b>`
        : `No champion yet. Set the first crown!`;
    } else {
      towerBanner.style.display = "none";
      towerBanner.innerHTML = "";
    }

    // duel vs solo
    const solo = document.getElementById("setupSolo");
    const duel = document.getElementById("setupDuel");

    if (state.modeId === "duel") {
      solo.style.display = "none";
      duel.style.display = "block";
      document.getElementById("setupSub").textContent = "Enter two names. Player A plays first, then Player B plays the same questions.";
    } else {
      solo.style.display = "block";
      duel.style.display = "none";
      document.getElementById("setupSub").textContent = state.modeId === "pressure"
        ? "Enter your name. 90s survival: correct +3s, wrong -30s."
        : "Enter your name (optional). Score saves after you finish.";
    }

    show("screenSetup");
  }

  // =========================
  // QUESTION BUILDING
  // =========================
  function makeOptions(correct, levelId) {
    const pool = CONNECTORS[levelId];
    const opts = new Set([correct]);
    while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
    return shuffle([...opts]);
  }

  function renderClassicQuestion() {
    const q = state.items[state.idx];
    document.getElementById("qcount").textContent = `Q ${state.idx + 1} / 10`;

    // stage label for heist
    const whoBanner = document.getElementById("whoBanner");
    if (state.modeId === "duel") {
      whoBanner.style.display = "block";
      whoBanner.textContent = `Duel: Player ${state.playingWho} — ${state.playingWho === "A" ? state.aName : state.bName}`;
    } else if (state.modeId === "heist") {
      whoBanner.style.display = "block";
      const stage = state.idx <= 2 ? 1 : (state.idx <= 6 ? 2 : 3);
      whoBanner.textContent = `Heist Stage ${stage}/3`;
    } else {
      whoBanner.style.display = "none";
      whoBanner.textContent = "";
    }

    document.getElementById("prompt").innerHTML =
      esc(q.t).replace("____", `<span style="background:rgba(255,255,0,.35);padding:0 8px;border-radius:12px;">____</span>`);

    const wrap = document.getElementById("options");
    wrap.innerHTML = "";
    state.selected = null;

    q.opts.forEach(opt => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.onclick = () => {
        state.selected = opt;
        [...wrap.children].forEach(x => x.classList.remove("sel"));
        b.classList.add("sel");
      };
      wrap.appendChild(b);
    });

    document.getElementById("nextBtn").textContent = (state.idx === 9) ? "Finish" : "Next";
  }

  function startClassicRun(name, seed = null) {
    // build fixed 10 items
    const base = SENTENCES[state.levelId].slice();
    if (seed != null) {
      // deterministic shuffle for duel
      const rnd = mulberry32(seed);
      for (let i = base.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
      }
    } else {
      shuffle(base);
    }

    state.items = base.map(q => ({
      ...q,
      opts: makeOptions(q.a, state.levelId),
    }));

    state.idx = 0;
    state.penalty = 0;
    state.answers = [];
    state.selected = null;

    // timer
    state.t0 = performance.now();
    stopTimer();
    tickClassic();

    // reset pills
    document.getElementById("pillTime").textContent = "Time: 0.0s";
    document.getElementById("pillPenalty").textContent = "Penalty: +0s";

    // game screen
    show("screenGame");
    renderClassicQuestion();
  }

  function submitClassicAnswer() {
    const q = state.items[state.idx];
    const chosen = state.selected || "—";
    const ok = chosen.toLowerCase() === q.a.toLowerCase();
    if (!ok) state.penalty += PENALTY_SECONDS;

    state.answers.push({ q: q.t, chosen, correct: q.a, ok, why: q.w });

    state.idx++;
    if (state.idx >= 10) finishClassic();
    else renderClassicQuestion();
  }

  function finishClassic() {
    stopTimer();
    const raw = (performance.now() - state.t0) / 1000;
    const total = raw + state.penalty;
    const mistakes = state.answers.filter(a => !a.ok).length;

    // PB save
    const pbKeyMode = state.modeId; // separate PBs per mode
    const prev = getPB(pbKeyMode, state.levelId);
    const isPB = (prev == null || total < prev);
    if (isPB) setPB(pbKeyMode, state.levelId, total);

    // Unlock (practice only)
    let unlockMsg = "";
    if (state.modeId === "practice") {
      const next = state.levelId + 1;
      if (next <= 10) {
        const need = UNLOCK_BY_LEVEL[next];
        if (total <= need) {
          setUnlockedMax(next);
          unlockMsg = `✅ <b>Unlocked Level ${next}</b> (≤ ${need}s)`;
        } else {
          unlockMsg = `🔒 Next unlock: Level ${next} requires ≤ <b>${need}s</b>`;
        }
      } else {
        unlockMsg = "🏁 Completed Level 10!";
      }
    }

    // Tower champion logic (local)
    let towerMsg = "";
    if (state.modeId === "tower") {
      const champ = getTowerChamp(state.levelId);
      if (!champ || total < champ.score) {
        const name = (state.aName || "").trim() || "Champion";
        setTowerChamp(state.levelId, { name, score: total });
        towerMsg = `👑 <b>New Champion!</b> (${esc(name)} — ${fmt(total)})`;
      } else {
        towerMsg = `👑 Champion still holds: <b>${esc(champ.name)}</b> — ${fmt(champ.score)}`;
      }
    }

    // Duel flow
    if (state.modeId === "duel") {
      if (state.playingWho === "A") {
        // store A result, then switch to B
        state.duelA = { total, raw, pen: state.penalty, mistakes, answers: state.answers };
        state.playingWho = "B";
        // start B with same seed + same items order
        startClassicRun(state.bName, state.duelSeed);
        return;
      } else {
        // finish duel, compare
        state.duelB = { total, raw, pen: state.penalty, mistakes, answers: state.answers };
        showDuelResults();
        return;
      }
    }

    // Normal results
    showResults({
      title: `${modeName()} — Level ${state.levelId} Results`,
      sub: `Base: <b>${fmt(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b>${isPB ? " • 🏅 <b>New PB!</b>" : ""}`
        + (unlockMsg ? `<br>${unlockMsg}` : "")
        + (towerMsg ? `<br>${towerMsg}` : ""),
      big: fmt(total),
      answers: state.answers,
    });

    buildLevels();
  }

  function showDuelResults() {
    const a = state.duelA.total;
    const b = state.duelB.total;
    let winner = "Tie";
    if (a < b) winner = `Winner: ${esc(state.aName)} (A)`;
    else if (b < a) winner = `Winner: ${esc(state.bName)} (B)`;

    const title = `Turbo Duel — Level ${state.levelId}`;
    const sub = `${winner}<br>
      A: <b>${fmt(a)}</b> (pen ${state.duelA.pen}s) • B: <b>${fmt(b)}</b> (pen ${state.duelB.pen}s)`;

    // Merge feedback: show A then B
    const merged = [
      ...state.duelA.answers.map((x, i) => ({ ...x, label: `A • Q${i+1}` })),
      ...state.duelB.answers.map((x, i) => ({ ...x, label: `B • Q${i+1}` })),
    ];

    showResults({
      title,
      sub,
      big: `A ${fmt(a)}  |  B ${fmt(b)}`,
      answers: merged,
      labelMode: true
    });

    // reset duel state
    state.playingWho = "A";
    buildLevels();
  }

  function showResults({ title, sub, big, answers, labelMode=false }) {
    document.getElementById("resultsTitle").textContent = title;
    document.getElementById("resultsSub").innerHTML = sub;
    document.getElementById("scoreBig").textContent = big;

    const fb = document.getElementById("feedback");
    fb.innerHTML = "";

    answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "fi";
      const leftLabel = labelMode ? `<b>${a.label || `Q${i+1}`}</b>` : `<b>Q${i+1}</b>`;
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;">
          ${leftLabel}
          <b class="${a.ok ? "ok" : "bad"}">${a.ok ? "✓ Correct" : `✗ +${PENALTY_SECONDS}s`}</b>
        </div>
        <div style="margin-top:6px;"><b>Sentence:</b> ${esc(a.q).replace("____","<b>____</b>")}</div>
        <div><b>Your answer:</b> ${esc(a.chosen)} • <b>Correct:</b> ${esc(a.correct)}</div>
        <div style="opacity:.85;margin-top:4px;">${a.why || ""}</div>
      `;
      fb.appendChild(div);
    });

    show("screenResults");
    document.getElementById("screenResults").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // =========================
  // PRESSURE MODE
  // =========================
  function startPressure(name) {
    const base = SENTENCES[state.levelId].slice();
    shuffle(base);
    state.items = base.map(q => ({ ...q, opts: makeOptions(q.a, state.levelId) }));

    state.idx = 0;
    state.selected = null;
    state.answers = [];
    state.pressureLeft = 90;
    state.pressureCorrect = 0;
    state.pressureAsked = 0;

    stopTimer();
    state.pressurePrev = performance.now();
    tickPressure();

    // pills show score in "Penalty" slot
    document.getElementById("pillTime").textContent = `Time: ${fmt(state.pressureLeft)}`;
    document.getElementById("pillPenalty").textContent = `Score: 0`;

    show("screenGame");
    renderPressureQuestion();
  }

  function renderPressureQuestion() {
    const q = state.items[state.idx % state.items.length];
    document.getElementById("qcount").textContent = `Survival • Correct: ${state.pressureCorrect}`;
    document.getElementById("whoBanner").style.display = "block";
    document.getElementById("whoBanner").textContent = `Correct +3s • Wrong -30s`;

    document.getElementById("prompt").innerHTML =
      esc(q.t).replace("____", `<span style="background:rgba(255,255,0,.35);padding:0 8px;border-radius:12px;">____</span>`);

    const wrap = document.getElementById("options");
    wrap.innerHTML = "";
    state.selected = null;

    q.opts.forEach(opt => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.onclick = () => {
        state.selected = opt;
        [...wrap.children].forEach(x => x.classList.remove("sel"));
        b.classList.add("sel");
      };
      wrap.appendChild(b);
    });

    document.getElementById("nextBtn").textContent = "Answer";
  }

  function submitPressureAnswer() {
    const q = state.items[state.idx % state.items.length];
    const chosen = state.selected || "—";
    const ok = chosen.toLowerCase() === q.a.toLowerCase();

    state.pressureAsked++;
    if (ok) {
      state.pressureCorrect++;
      state.pressureLeft += 3;
    } else {
      state.pressureLeft -= 30;
    }
    if (state.pressureLeft < 0) state.pressureLeft = 0;

    document.getElementById("pillPenalty").textContent = `Score: ${state.pressureCorrect}`;

    state.answers.push({ q: q.t, chosen, correct: q.a, ok, why: q.w });
    state.idx++;
    renderPressureQuestion();
  }

  function finishPressure() {
    const title = `Pressure Cooker — Level ${state.levelId}`;
    const sub = `Correct: <b>${state.pressureCorrect}</b> • Answered: <b>${state.pressureAsked}</b>`;
    const big = `${state.pressureCorrect} correct`;

    // show last 10 for feedback
    const recent = state.answers.slice(-10);

    showResults({ title, sub, big, answers: recent });
    buildLevels();
  }

  // =========================
  // MODE START
  // =========================
  function modeName() {
    return (MODES.find(m => m.id === state.modeId)?.name) || "Game";
  }

  function startFromSetup() {
    const mode = state.modeId;

    if (mode === "duel") {
      state.aName = (document.getElementById("nameA").value || "").trim().slice(0, 24) || "Player A";
      state.bName = (document.getElementById("nameB").value || "").trim().slice(0, 24) || "Player B";
      state.playingWho = "A";
      state.duelSeed = Math.floor(Math.random() * 1e9);
      startClassicRun(state.aName, state.duelSeed);
      return;
    }

    state.aName = (document.getElementById("nameSolo").value || "").trim().slice(0, 24) || "Player";

    if (mode === "pressure") {
      startPressure(state.aName);
      return;
    }

    // practice / tower / heist are classic timed
    startClassicRun(state.aName, null);
  }

  // deterministic RNG for duel shuffle
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  // =========================
  // WIRE BUTTONS
  // =========================
  function wire() {
    document.getElementById("backHome1").onclick = () => show("screenHome");
    document.getElementById("backHome2").onclick = () => show("screenHome");
    document.getElementById("quitBtn").onclick = () => { stopTimer(); show("screenHome"); };

    document.getElementById("startBtn").onclick = startFromSetup;
    document.getElementById("startDuelBtn").onclick = startFromSetup;

    document.getElementById("nextBtn").onclick = () => {
      if (state.modeId === "pressure") return submitPressureAnswer();
      return submitClassicAnswer();
    };

    document.getElementById("againBtn").onclick = () => openSetup();

    document.getElementById("resetBtn").onclick = () => {
      if (!confirm("Reset progress + PBs + tower champions on THIS device?")) return;

      Object.keys(localStorage).forEach(k => {
        if (k === STORAGE.unlockedMax) localStorage.removeItem(k);
        if (k.startsWith("TA_PB_V4_")) localStorage.removeItem(k);
        if (k.startsWith("TA_TOWER_CHAMP_V4_")) localStorage.removeItem(k);
      });

      setUnlockedMax(1);
      buildLevels();
      alert("Reset done.");
    };
  }

  // =========================
  // INIT
  // =========================
  function init() {
    injectUI();

    // ensure unlock exists
    const u = getUnlockedMax();
    if (!Number.isFinite(u) || u < 1) setUnlockedMax(1);

    setPills();
    buildModes();
    buildLevels();
    wire();
    show("screenHome");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
