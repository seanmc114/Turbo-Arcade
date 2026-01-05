// Turbo Arcade — FULL app.js (Connectors / Joining Words)
// Full Arcade modes: Practice, Duel, Pressure, Tower, Heist
// Core mechanics:
// - 10 levels, 10 questions per level
// - time score (lower is better) + 30s penalty per mistake
// - results + feedback
// - local PB per level (after finishing only)
// - champions shown on level buttons for Duel & Tower (after finishing only)
//
// UX goals:
// - Mode tile click is instantly responsive (opens Setup)
// - Level click opens Setup
// - Nothing is saved by typing a name; only saved after a run finishes

(() => {
  "use strict";

  // -------- DOM helpers
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // -------- Required element IDs (from the ZIP build)
  const REQUIRED_IDS = [
    "#screenHome", "#screenSetup", "#screenGame", "#screenResults", "#screenDuel",
    "#modeTiles", "#levelGrid", "#btnResetAll",
    "#setupTitle", "#setupSub", "#rowSoloName", "#soloName", "#rowDuelNames", "#duelNameA", "#duelNameB",
    "#setupLevelPicker", "#btnStart", "#btnBackHome1",
    "#badgeStage", "#badgePlayer", "#timer", "#penalty", "#qcount", "#qdiff", "#prompt", "#options", "#btnNext", "#btnQuit", "#microHint",
    "#resultsTitle", "#resultsSub", "#scoreBig", "#scoreMeta", "#btnPlayAgain", "#btnBackHome2", "#feedback",
    "#duelTitle", "#duelSub", "#duelGrid", "#btnDuelNext", "#btnBackHome3",
    "#pillMode", "#pillLevel"
  ];

  function assertDOM() {
    const missing = REQUIRED_IDS.filter(id => !$(id));
    if (missing.length) {
      alert(
        "Turbo Arcade error: your index.html doesn't match this app.js.\n\nMissing:\n" +
        missing.join("\n") +
        "\n\nFix: upload the matching index.html from the Turbo Arcade ZIP (same version)."
      );
      throw new Error("Missing required DOM elements.");
    }
  }

  // -------- Levels
  const LEVELS = [
    { id: 1, name: "Level 1", diff: "Very easy" },
    { id: 2, name: "Level 2", diff: "Easy" },
    { id: 3, name: "Level 3", diff: "Easy+" },
    { id: 4, name: "Level 4", diff: "Medium" },
    { id: 5, name: "Level 5", diff: "Medium+" },
    { id: 6, name: "Level 6", diff: "Hard-ish" },
    { id: 7, name: "Level 7", diff: "Hard" },
    { id: 8, name: "Level 8", diff: "Hard+" },
    { id: 9, name: "Level 9", diff: "Quite hard" },
    { id: 10, name: "Level 10", diff: "Quite difficult" },
  ];

  // -------- Modes
  const MODES = [
    {
      id: "practice",
      title: "Practice",
      tag: "PB saver",
      desc: "Classic Turbo. 10 questions. PB saved per level (only after finishing).",
      kind: "classic",
      usesChampion: false,
      usesDuel: false,
    },
    {
      id: "duel",
      title: "Turbo Duel",
      tag: "Head-to-head",
      desc: "Player A vs Player B. SAME questions. Winner can become champion (after both finish).",
      kind: "duel",
      usesChampion: true,
      usesDuel: true,
    },
    {
      id: "pressure",
      title: "Pressure Cooker",
      tag: "Survival",
      desc: "Start 90s. Correct +3s. Wrong −30s. Score = correct survived (PB saved after it ends).",
      kind: "pressure",
      usesChampion: false,
      usesDuel: false,
    },
    {
      id: "tower",
      title: "Champion Tower",
      tag: "Dethrone",
      desc: "Beat the champion time to take the crown (after finishing).",
      kind: "tower",
      usesChampion: true,
      usesDuel: false,
    },
    {
      id: "heist",
      title: "Language Heist",
      tag: "Mission",
      desc: "Same scoring, staged delivery for novelty. PB saved after finishing.",
      kind: "heist",
      usesChampion: false,
      usesDuel: false,
    },
  ];

  // -------- Connector pools for MCQ options
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
    10:["en cuanto", "dado que", "aun así", "a medida que"],
  };

  // -------- 10 sentences per level
  const SENTENCES = {
    1: [
      { text: "Quiero té ____ café.", answer: "o", explain: "Choice → <b>o</b>." },
      { text: "Tengo un lápiz ____ un bolígrafo.", answer: "y", explain: "Addition → <b>y</b>." },
      { text: "Estudio, ____ estoy cansado.", answer: "pero", explain: "Contrast → <b>pero</b>." },
      { text: "Es simpático ____ divertido.", answer: "y", explain: "Adding → <b>y</b>." },
      { text: "¿Quieres ir ____ quedarte en casa?", answer: "o", explain: "Alternative → <b>o</b>." },
      { text: "Me gusta el fútbol, ____ prefiero el baloncesto.", answer: "pero", explain: "Contrast → <b>pero</b>." },
      { text: "Trabajo ____ estudio por las tardes.", answer: "y", explain: "Two actions → <b>y</b>." },
      { text: "Podemos caminar ____ tomar el bus.", answer: "o", explain: "Either/or → <b>o</b>." },
      { text: "Quiero salir, ____ está lloviendo.", answer: "pero", explain: "But/however → <b>pero</b>." },
      { text: "Compro pan ____ leche.", answer: "y", explain: "List items → <b>y</b>." },
    ],
    2: [
      { text: "No salgo ____ tengo deberes.", answer: "porque", explain: "Reason → <b>porque</b>." },
      { text: "Voy al cine; ____ voy a cenar.", answer: "también", explain: "Also → <b>también</b>." },
      { text: "Quiero estudiar; ____ quiero practicar.", answer: "además", explain: "In addition → <b>además</b>." },
      { text: "Lo hago ____ prisa.", answer: "sin", explain: "Without → <b>sin</b>." },
      { text: "Estoy feliz ____ es viernes.", answer: "porque", explain: "Cause → <b>porque</b>." },
      { text: "Ella canta; ____ baila.", answer: "también", explain: "Also → <b>también</b>." },
      { text: "Es caro; ____ es buenísimo.", answer: "además", explain: "Plus → <b>además</b>." },
      { text: "Salimos ____ dinero.", answer: "sin", explain: "Without → <b>sin</b>." },
      { text: "No lo compro ____ no lo necesito.", answer: "porque", explain: "Reason → <b>porque</b>." },
      { text: "Tengo hambre; ____ estoy cansado.", answer: "además", explain: "Another point → <b>además</b>." },
    ],
    3: [
      { text: "Terminé la tarea; ____ puedo descansar.", answer: "entonces", explain: "Then/so → <b>entonces</b>." },
      { text: "Está nublado, ____ no vamos a la playa.", answer: "así que", explain: "So/result → <b>así que</b>." },
      { text: "Perdí el bus; ____ llegué tarde.", answer: "por eso", explain: "That’s why → <b>por eso</b>." },
      { text: "Comimos y ____ fuimos al parque.", answer: "luego", explain: "Afterwards → <b>luego</b>." },
      { text: "No estudió, ____ suspendió.", answer: "por eso", explain: "Reason→result → <b>por eso</b>." },
      { text: "Estaba enfermo, ____ se quedó en casa.", answer: "así que", explain: "So → <b>así que</b>." },
      { text: "No tengo clase; ____ voy a entrenar.", answer: "entonces", explain: "So → <b>entonces</b>." },
      { text: "Hicimos la compra y ____ cocinamos.", answer: "luego", explain: "Then → <b>luego</b>." },
      { text: "No había sitio; ____ cambiamos de plan.", answer: "entonces", explain: "So → <b>entonces</b>." },
      { text: "Quería dormir; ____ apagué el móvil.", answer: "así que", explain: "So → <b>así que</b>." },
    ],
    4: [
      { text: "Quiero ir; ____ está lloviendo.", answer: "sin embargo", explain: "However → <b>sin embargo</b>." },
      { text: "Yo estudio; mi hermano, ____ , juega.", answer: "en cambio", explain: "In contrast → <b>en cambio</b>." },
      { text: "No es caro, ____ barato.", answer: "sino", explain: "Not X but Y → <b>sino</b>." },
      { text: "Voy, ____ no tengo tiempo.", answer: "aunque", explain: "Even though → <b>aunque</b>." },
      { text: "Me gusta; ____ prefiero otro.", answer: "sin embargo", explain: "However → <b>sin embargo</b>." },
      { text: "Yo voy en bus; tú, ____ , vas andando.", answer: "en cambio", explain: "Contrast → <b>en cambio</b>." },
      { text: "No quiero té, ____ café.", answer: "sino", explain: "Correction → <b>sino</b>." },
      { text: "Salgo ____ esté cansado.", answer: "aunque", explain: "Even if/though → <b>aunque</b>." },
      { text: "Es difícil; ____ lo intento.", answer: "sin embargo", explain: "However → <b>sin embargo</b>." },
      { text: "No es feo, ____ raro.", answer: "sino", explain: "Not X but Y → <b>sino</b>." },
    ],
    5: [
      { text: "Te llamo ____ llegue a casa.", answer: "cuando", explain: "When → <b>cuando</b>." },
      { text: "Leo ____ como.", answer: "mientras", explain: "While → <b>mientras</b>." },
      { text: "____ salir, termino la tarea.", answer: "antes de", explain: "Before → <b>antes de</b>." },
      { text: "____ cenar, vemos una serie.", answer: "después de", explain: "After → <b>después de</b>." },
      { text: "Me ducho ____ entrenar.", answer: "después de", explain: "After → <b>después de</b>." },
      { text: "____ dormir, apago la luz.", answer: "antes de", explain: "Before → <b>antes de</b>." },
      { text: "Voy al parque ____ hace sol.", answer: "cuando", explain: "When → <b>cuando</b>." },
      { text: "Escucho música ____ estudio.", answer: "mientras", explain: "While → <b>mientras</b>." },
      { text: "____ comer, lavo las manos.", answer: "antes de", explain: "Before → <b>antes de</b>." },
      { text: "____ clase, entrenamos.", answer: "después de", explain: "After → <b>después de</b>." },
    ],
    6: [
      { text: "No voy ____ estoy enfermo.", answer: "ya que", explain: "Since/because → <b>ya que</b>." },
      { text: "No salimos ____ llueve.", answer: "puesto que", explain: "Since → <b>puesto que</b>." },
      { text: "Lo intento ____ el problema.", answer: "a pesar de", explain: "Despite → <b>a pesar de</b>." },
      { text: "Estudio; ____ saco mejores notas.", answer: "por lo tanto", explain: "Therefore → <b>por lo tanto</b>." },
      { text: "Me quedo en casa ____ no hay tiempo.", answer: "ya que", explain: "Reason → <b>ya que</b>." },
      { text: "No lo hago ____ es peligroso.", answer: "puesto que", explain: "Reason → <b>puesto que</b>." },
      { text: "Voy ____ el cansancio.", answer: "a pesar de", explain: "Despite → <b>a pesar de</b>." },
      { text: "Estoy preparado; ____ no tengo miedo.", answer: "por lo tanto", explain: "Therefore → <b>por lo tanto</b>." },
      { text: "No me gusta; ____ lo respeto.", answer: "a pesar de", explain: "Despite → <b>a pesar de</b>." },
      { text: "No estudió; ____ suspendió.", answer: "por lo tanto", explain: "Therefore → <b>por lo tanto</b>." },
    ],
    7: [
      { text: "____ , el plan es bueno.", answer: "sin duda", explain: "Emphasis → <b>sin duda</b>." },
      { text: "____ , es útil; ____ , es caro.", answer: "por un lado", explain: "First side → <b>por un lado</b>." },
      { text: "____ , es útil; ____ , es caro.", answer: "por otro lado", explain: "Second side → <b>por otro lado</b>." },
      { text: "Quería ir; ____ no tenía tiempo.", answer: "no obstante", explain: "Nevertheless → <b>no obstante</b>." },
      { text: "Está lejos; ____ lo hacemos.", answer: "no obstante", explain: "Nevertheless → <b>no obstante</b>." },
      { text: "____ , vale la pena.", answer: "sin duda", explain: "No doubt → <b>sin duda</b>." },
      { text: "____ , es divertido; ____ , es cansado.", answer: "por un lado", explain: "First side → <b>por un lado</b>." },
      { text: "____ , es divertido; ____ , es cansado.", answer: "por otro lado", explain: "Second side → <b>por otro lado</b>." },
      { text: "Me dolía la pierna; ____ seguí.", answer: "no obstante", explain: "Nevertheless → <b>no obstante</b>." },
      { text: "____ , lo haré.", answer: "sin duda", explain: "Emphasis → <b>sin duda</b>." },
    ],
    8: [
      { text: "Voy contigo ____ me esperes.", answer: "con tal de que", explain: "On condition that → <b>con tal de que</b>." },
      { text: "Iré ____ termine pronto.", answer: "siempre que", explain: "Provided that → <b>siempre que</b>." },
      { text: "No salgo ____ llueva.", answer: "a menos que", explain: "Unless → <b>a menos que</b>." },
      { text: "Estaba tranquilo y ____ empezó a gritar.", answer: "de repente", explain: "Suddenly → <b>de repente</b>." },
      { text: "Te ayudo ____ tú también ayudes.", answer: "con tal de que", explain: "Condition → <b>con tal de que</b>." },
      { text: "Salimos ____ no haya exámenes.", answer: "siempre que", explain: "Condition → <b>siempre que</b>." },
      { text: "No lo hago ____ sea obligatorio.", answer: "a menos que", explain: "Unless → <b>a menos que</b>." },
      { text: "Íbamos bien y ____ todo cambió.", answer: "de repente", explain: "Suddenly → <b>de repente</b>." },
      { text: "Lo compro ____ sea barato.", answer: "siempre que", explain: "Provided → <b>siempre que</b>." },
      { text: "No voy ____ me llamen.", answer: "a menos que", explain: "Unless → <b>a menos que</b>." },
    ],
    9: [
      { text: "Hablo claro ____ entiendas.", answer: "de modo que", explain: "So that → <b>de modo que</b>." },
      { text: "Lo repito ____ no haya dudas.", answer: "de manera que", explain: "So that → <b>de manera que</b>." },
      { text: "Trabajo ____ ahorrar dinero.", answer: "a fin de", explain: "In order to → <b>a fin de</b>." },
      { text: "No estudió; ____ suspendió.", answer: "consecuentemente", explain: "Consequently → <b>consecuentemente</b>." },
      { text: "Hice un resumen ____ fuera más fácil.", answer: "de modo que", explain: "So that → <b>de modo que</b>." },
      { text: "Organicé el texto ____ se entendiera.", answer: "de manera que", explain: "So that → <b>de manera que</b>." },
      { text: "Entreno ____ mejorar.", answer: "a fin de", explain: "In order to → <b>a fin de</b>." },
      { text: "Hubo retrasos; ____ llegamos tarde.", answer: "consecuentemente", explain: "Consequently → <b>consecuentemente</b>." },
      { text: "Habla despacio ____ la sigan.", answer: "de modo que", explain: "So that → <b>de modo que</b>." },
      { text: "Reduje el ruido ____ se oyera.", answer: "de manera que", explain: "So that → <b>de manera que</b>." },
    ],
    10: [
      { text: "____ lo que dijiste, tienes razón.", answer: "en cuanto", explain: "Regarding → <b>en cuanto</b>." },
      { text: "No fui ____ estaba enfermo.", answer: "dado que", explain: "Given that → <b>dado que</b>." },
      { text: "Es caro; ____ lo compro.", answer: "aun así", explain: "Even so → <b>aun así</b>." },
      { text: "Mejoro ____ practico.", answer: "a medida que", explain: "As → <b>a medida que</b>." },
      { text: "____ el plan, me gusta.", answer: "en cuanto", explain: "As for → <b>en cuanto</b>." },
      { text: "No salgo ____ no tengo tiempo.", answer: "dado que", explain: "Given that → <b>dado que</b>." },
      { text: "No está perfecto; ____ funciona.", answer: "aun así", explain: "Even so → <b>aun así</b>." },
      { text: "Aprendo ____ leo más.", answer: "a medida que", explain: "As → <b>a medida que</b>." },
      { text: "____ el examen, estoy listo.", answer: "en cuanto", explain: "As for → <b>en cuanto</b>." },
      { text: "No vino ____ llovía.", answer: "dado que", explain: "Given that → <b>dado que</b>." },
    ],
  };

  // -------- Storage keys (versioned)
  const K = {
    practicedOnce: "ta_practiced_once_v3",
    lastMode: "ta_last_mode_v3",
    lastLevel: "ta_last_level_v3",
    best: (modeId, levelId, player) => `ta_best_v3::${modeId}::L${levelId}::${player}`,
    champ: (modeId, levelId) => `ta_champ_v3::${modeId}::L${levelId}`, // JSON {name,score}
    pressureBest: (levelId, player) => `ta_pressure_best_v3::L${levelId}::${player}`, // JSON {correct, asked}
  };

  // -------- Helpers
  const now = () => performance.now();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const normName = (s) => (s || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const normAnswer = (s) => (s || "").trim().toLowerCase();
  const fmtSeconds = (sec) => `${(Math.round(sec * 10) / 10).toFixed(1)}s`;

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }
  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function() {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick10Items(levelId, seed) {
    const pool = (SENTENCES[levelId] || []).slice();
    const rnd = mulberry32(seed);
    const idxs = pool.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return idxs.slice(0, 10).map(i => pool[i]);
  }

  function makeOptions(levelId, correct, rnd) {
    const pool = Array.from(new Set([
      ...(CONNECTORS[levelId] || []),
      ...Object.values(CONNECTORS).flat(),
    ]));
    const opts = new Set([correct]);
    while (opts.size < 4) {
      const pick = pool[Math.floor(rnd() * pool.length)];
      if (pick && pick !== correct) opts.add(pick);
    }
    const arr = Array.from(opts);
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // -------- Storage helpers (no saving until finish)
  function getChampion(modeId, levelId) {
    const raw = localStorage.getItem(K.champ(modeId, levelId));
    if (!raw) return null;
    const obj = safeJSONParse(raw, null);
    if (!obj || typeof obj.name !== "string" || typeof obj.score !== "number") return null;
    return obj;
  }
  function setChampion(modeId, levelId, name, score) {
    localStorage.setItem(K.champ(modeId, levelId), JSON.stringify({ name, score }));
  }
  function getBestTime(modeId, levelId, player) {
    const raw = localStorage.getItem(K.best(modeId, levelId, player));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function setBestTime(modeId, levelId, player, score) {
    localStorage.setItem(K.best(modeId, levelId, player), String(score));
  }
  function getPressureBest(levelId, player) {
    const raw = localStorage.getItem(K.pressureBest(levelId, player));
    return raw ? safeJSONParse(raw, null) : null;
  }
  function setPressureBest(levelId, player, obj) {
    localStorage.setItem(K.pressureBest(levelId, player), JSON.stringify(obj));
  }

  // -------- Screens
  const screens = {};
  function cacheScreens() {
    screens.home = $("#screenHome");
    screens.setup = $("#screenSetup");
    screens.game = $("#screenGame");
    screens.results = $("#screenResults");
    screens.duel = $("#screenDuel");
  }
  function showScreen(which) {
    Object.entries(screens).forEach(([k, el]) => {
      el.classList.toggle("hidden", k !== which);
    });
  }

  // -------- State
  const state = {
    modeId: null,
    levelId: 1,

    // classic-like runs
    player: null,
    seed: null,
    items: [],
    idx: 0,
    selected: null,
    answers: [],
    penalty: 0,
    t0: null,
    raf: null,

    // pressure
    pressure: { timeLeft: 90, correct: 0, asked: 0, tPrev: null },

    // duel
    duel: { a: null, b: null, seed: null, step: null, aScore: null, bScore: null, aRaw: null, bRaw: null, aPen: null, bPen: null }
  };

  // -------- UI pills
  function updatePills() {
    const mode = MODES.find(m => m.id === state.modeId);
    const lvl = LEVELS.find(l => l.id === state.levelId);
    $("#pillMode").textContent = `Mode: ${mode ? mode.title : "—"}`;
    $("#pillLevel").textContent = `Level: ${lvl ? `${lvl.id} (${lvl.diff})` : "—"}`;
  }

  // -------- Build mode tiles
  function buildModeTiles() {
    const wrap = $("#modeTiles");
    wrap.innerHTML = "";
    for (const m of MODES) {
      const div = document.createElement("div");
      div.className = "tile";
      div.dataset.mode = m.id;
      div.innerHTML = `
        <div class="tile-title">
          <span>${m.title}</span>
          <span class="tile-tag">${m.tag}</span>
        </div>
        <div class="tile-desc">${m.desc}</div>
        <div class="tile-cta">Select →</div>
      `;
      div.addEventListener("click", () => {
        setMode(m.id);
        // Full Arcade UX: always open setup (instant response)
        openSetup();
      });
      wrap.appendChild(div);
    }
    highlightModeTile();
  }

  function highlightModeTile() {
    $$(".tile").forEach(t => t.classList.toggle("active", t.dataset.mode === state.modeId));
  }

  // -------- Build levels grid (champion shown when relevant)
  function buildLevelGrid() {
    const grid = $("#levelGrid");
    grid.innerHTML = "";
    const mode = MODES.find(m => m.id === state.modeId) || MODES[0];

    for (const lvl of LEVELS) {
      const champ = mode.usesChampion ? getChampion(state.modeId, lvl.id) : null;

      const btn = document.createElement("button");
      btn.className = "levelbtn";
      btn.dataset.level = String(lvl.id);

      btn.innerHTML = `
        <div class="level-top">
          <div class="level-name">${lvl.name}</div>
          <div class="level-diff">${lvl.diff}</div>
        </div>
        <div class="level-champ">
          ${mode.usesChampion
            ? (champ ? `Champion: <b>${escapeHTML(champ.name)}</b> — ${fmtSeconds(champ.score)}` : `Champion: <b>—</b>`)
            : `Champion: <b>—</b>`}
        </div>
        <div class="level-best" id="bestLine-${lvl.id}">Your best: —</div>
      `;

      btn.addEventListener("click", () => {
        state.levelId = lvl.id;
        localStorage.setItem(K.lastLevel, String(state.levelId));
        updatePills();
        openSetup();
      });

      grid.appendChild(btn);
    }
  }

  // -------- Refresh best lines (only for a given player name; does NOT save anything)
  function refreshBestLinesForPlayer(player) {
    const mode = MODES.find(m => m.id === state.modeId) || MODES[0];

    for (const lvl of LEVELS) {
      const el = $(`#bestLine-${lvl.id}`);
      if (!el) continue;

      if (mode.kind === "pressure") {
        const pb = getPressureBest(lvl.id, player);
        el.textContent = pb ? `Your best: ${pb.correct} correct` : `Your best: —`;
        continue;
      }

      const best = getBestTime(state.modeId, lvl.id, player);
      el.textContent = `Your best: ${best == null ? "—" : fmtSeconds(best)}`;
    }
  }

  // -------- Defaults
  function pickDefaultMode() {
    const practiced = localStorage.getItem(K.practicedOnce) === "1";
    return practiced ? "duel" : "practice";
  }

  function setMode(modeId) {
    state.modeId = modeId;
    localStorage.setItem(K.lastMode, modeId);
    highlightModeTile();
    buildLevelGrid();
    updatePills();
  }

  function restoreDefaults() {
    const lastMode = localStorage.getItem(K.lastMode);
    const lastLevel = Number(localStorage.getItem(K.lastLevel));

    const mode = (lastMode && MODES.some(m => m.id === lastMode)) ? lastMode : pickDefaultMode();
    const level = (Number.isFinite(lastLevel) && lastLevel >= 1 && lastLevel <= 10) ? lastLevel : 1;

    state.levelId = level;
    setMode(mode);
  }

  // -------- Setup screen
  function openSetup() {
    const mode = MODES.find(m => m.id === state.modeId) || MODES[0];
    const lvl = LEVELS.find(l => l.id === state.levelId) || LEVELS[0];

    $("#setupTitle").textContent = `${mode.title} — ${lvl.name}`;
    $("#setupSub").textContent = mode.usesDuel
      ? "Enter two names. Player A goes first, then Player B plays the exact same 10 questions."
      : "Enter your name (PB is saved only after you finish).";

    $("#rowDuelNames").classList.toggle("hidden", !mode.usesDuel);
    $("#rowSoloName").classList.toggle("hidden", mode.usesDuel);

    // level picker chips
    const picker = $("#setupLevelPicker");
    picker.innerHTML = "";
    for (const l of LEVELS) {
      const b = document.createElement("button");
      b.className = "segbtn" + (l.id === state.levelId ? " active" : "");
      b.textContent = `L${l.id}`;
      b.addEventListener("click", () => {
        state.levelId = l.id;
        localStorage.setItem(K.lastLevel, String(state.levelId));
        $$(".segbtn").forEach(x => x.classList.toggle("active", x === b));
        updatePills();
        const lvl2 = LEVELS.find(z => z.id === state.levelId);
        $("#setupTitle").textContent = `${mode.title} — ${lvl2.name}`;
      });
      picker.appendChild(b);
    }

    // live PB preview WITHOUT saving
    const soloInput = $("#soloName");
    const updatePreview = () => {
      const name = normName(soloInput.value);
      if (name) refreshBestLinesForPlayer(name);
    };
    soloInput.removeEventListener("input", updatePreview);
    soloInput.addEventListener("input", updatePreview);

    showScreen("setup");
  }

  // -------- Timer helpers
  function stopTimer() {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  // ============================================================
  // CLASSIC ENGINE (Practice / Tower / Heist) + Duel legs
  // ============================================================
  function startClassicRun({ playerName, modeId, levelId, seedOverride = null, staged = false }) {
    state.player = playerName;
    state.modeId = modeId;
    state.levelId = levelId;

    state.seed = seedOverride ?? Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(state.seed);

    state.items = pick10Items(levelId, state.seed).map(it => ({
      text: it.text,
      answer: it.answer,
      explain: it.explain,
      options: makeOptions(levelId, it.answer, rnd),
    }));

    state.idx = 0;
    state.selected = null;
    state.answers = [];
    state.penalty = 0;

    state.t0 = now();
    stopTimer();
    tickClassicTimer();

    $("#badgePlayer").textContent = `Player: ${playerName || "—"}`;
    $("#badgeStage").textContent = staged ? "Stage: 1/3" : "Stage: Classic";
    $("#microHint").innerHTML = staged ? "Mission mode: same scoring. Stay sharp." : "Pick the best connector.";

    renderClassicQ(staged);
    showScreen("game");
    updatePills();
  }

  function tickClassicTimer() {
    const t = (now() - state.t0) / 1000;
    $("#timer").textContent = fmtSeconds(t);
    $("#penalty").textContent = `+${state.penalty}s`;
    state.raf = requestAnimationFrame(tickClassicTimer);
  }

  function renderClassicQ(staged) {
    const lvl = LEVELS.find(l => l.id === state.levelId);
    const q = state.items[state.idx];

    $("#qcount").textContent = `Q ${state.idx + 1} / 10`;
    $("#qdiff").textContent = lvl ? lvl.diff : "";

    if (staged) {
      const stage = state.idx <= 2 ? 1 : (state.idx <= 6 ? 2 : 3);
      $("#badgeStage").textContent = `Stage: ${stage}/3`;
    }

    $("#prompt").innerHTML = q.text.replace(
      "____",
      "<span style=\"background:rgba(255,255,0,.25);padding:0 6px;border-radius:10px\">____</span>"
    );

    const wrap = $("#options");
    wrap.innerHTML = "";
    state.selected = null;

    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => {
        state.selected = opt;
        $$(".opt").forEach(x => x.classList.toggle("selected", x === b));
      });
      wrap.appendChild(b);
    });

    $("#btnNext").textContent = state.idx === 9 ? "Finish" : "Next";
  }

  function submitClassicAnswer(staged) {
    const q = state.items[state.idx];
    const chosen = state.selected;

    const ok = normAnswer(chosen) === normAnswer(q.answer);
    if (!ok) state.penalty += 30;

    state.answers.push({
      q: q.text,
      chosen: chosen || "—",
      correct: q.answer,
      ok,
      explain: q.explain,
    });

    state.idx++;
    if (state.idx >= 10) finishClassicRun(staged);
    else renderClassicQ(staged);
  }

  function showResultsClassic(total, raw, titleOverride = null) {
    const mistakes = state.answers.filter(a => !a.ok).length;

    $("#resultsTitle").textContent = titleOverride || "Results";
    $("#resultsSub").innerHTML =
      `Base time: <b>${fmtSeconds(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b>`;

    $("#scoreBig").textContent = fmtSeconds(total);
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    const fb = $("#feedback");
    fb.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "feeditem";
      div.innerHTML = `
        <div class="feedtop">
          <div class="feedq">Q${i + 1}</div>
          <div class="${a.ok ? "feedok" : "feedbad"}">${a.ok ? "✓ Correct" : "✗ +30s"}</div>
        </div>
        <div class="feedsub"><b>Sentence:</b> ${escapeHTML(a.q).replace("____", "<b>____</b>")}</div>
        <div class="feedsub"><b>Your answer:</b> ${escapeHTML(a.chosen)} • <b>Correct:</b> ${escapeHTML(a.correct)}</div>
        <div class="feedsub">${a.explain}</div>
      `;
      fb.appendChild(div);
    });

    showScreen("results");
  }

  function finishClassicRun(staged) {
    stopTimer();
    const raw = (now() - state.t0) / 1000;
    const total = raw + state.penalty;

    // Duel legs are handled elsewhere
    if (state.modeId === "duel") return;

    // ✅ Save ONLY after finish
    if (state.modeId === "practice") localStorage.setItem(K.practicedOnce, "1");

    if (state.player) {
      const prev = getBestTime(state.modeId, state.levelId, state.player);
      if (prev == null || total < prev) setBestTime(state.modeId, state.levelId, state.player, total);
    }

    // Tower champion update ONLY after finish
    if (MODES.find(m => m.id === state.modeId)?.kind === "tower") {
      const champ = getChampion(state.modeId, state.levelId);
      if (!champ || total < champ.score) {
        if (state.player) setChampion(state.modeId, state.levelId, state.player, total);
      }
    }

    // Update home button displays
    if (state.player) refreshBestLinesForPlayer(state.player);
    buildLevelGrid();

    showResultsClassic(total, raw);
  }

  // ============================================================
  // PRESSURE COOKER
  // ============================================================
  function startPressure({ playerName, levelId }) {
    state.player = playerName;
    state.levelId = levelId;

    state.seed = Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(state.seed);

    // shuffle level pool and reuse cyclically
    const pool = (SENTENCES[levelId] || []).slice();
    const idxs = pool.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    state.items = idxs.map(i => {
      const it = pool[i];
      return {
        text: it.text,
        answer: it.answer,
        explain: it.explain,
        options: makeOptions(levelId, it.answer, rnd),
      };
    });

    state.idx = 0;
    state.answers = [];
    state.selected = null;

    state.pressure.timeLeft = 90;
    state.pressure.correct = 0;
    state.pressure.asked = 0;
    state.pressure.tPrev = now();

    $("#badgePlayer").textContent = `Player: ${playerName || "—"}`;
    $("#badgeStage").textContent = "Stage: Survival";
    $("#microHint").textContent = "Correct +3s • Wrong −30s • Survive as long as you can.";

    stopTimer();
    tickPressureTimer();

    renderPressureQ();
    showScreen("game");
    updatePills();
  }

  function tickPressureTimer() {
    const tNow = now();
    const dt = (tNow - state.pressure.tPrev) / 1000;
    state.pressure.tPrev = tNow;

    state.pressure.timeLeft -= dt;
    if (state.pressure.timeLeft <= 0) {
      state.pressure.timeLeft = 0;
      $("#timer").textContent = fmtSeconds(state.pressure.timeLeft);
      $("#penalty").textContent = `Score: ${state.pressure.correct}`;
      stopTimer();
      finishPressure();
      return;
    }

    $("#timer").textContent = fmtSeconds(state.pressure.timeLeft);
    $("#penalty").textContent = `Score: ${state.pressure.correct}`;
    state.raf = requestAnimationFrame(tickPressureTimer);
  }

  function renderPressureQ() {
    const lvl = LEVELS.find(l => l.id === state.levelId);
    const q = state.items[state.idx % state.items.length];

    $("#qcount").textContent = `Survival • ${state.pressure.correct} correct`;
    $("#qdiff").textContent = lvl ? lvl.diff : "";

    $("#prompt").innerHTML = q.text.replace(
      "____",
      "<span style=\"background:rgba(255,255,0,.25);padding:0 6px;border-radius:10px\">____</span>"
    );

    const wrap = $("#options");
    wrap.innerHTML = "";
    state.selected = null;

    q.options.forEach(opt => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => {
        state.selected = opt;
        $$(".opt").forEach(x => x.classList.toggle("selected", x === b));
      });
      wrap.appendChild(b);
    });

    $("#btnNext").textContent = "Answer";
  }

  function submitPressure() {
    const q = state.items[state.idx % state.items.length];
    const chosen = state.selected;

    const ok = normAnswer(chosen) === normAnswer(q.answer);
    state.pressure.asked++;

    if (ok) {
      state.pressure.correct++;
      state.pressure.timeLeft += 3;
    } else {
      state.pressure.timeLeft -= 30;
    }
    state.pressure.timeLeft = clamp(state.pressure.timeLeft, 0, 999);

    state.answers.push({
      q: q.text,
      chosen: chosen || "—",
      correct: q.answer,
      ok,
      explain: q.explain,
      pressure: true,
    });

    state.idx++;
    renderPressureQ();
  }

  function finishPressure() {
    // ✅ Save PB only after it ends
    if (state.player) {
      const prev = getPressureBest(state.levelId, state.player);
      const cur = { correct: state.pressure.correct, asked: state.pressure.asked };
      const better = !prev || cur.correct > prev.correct || (cur.correct === prev.correct && cur.asked > prev.asked);
      if (better) setPressureBest(state.levelId, state.player, cur);
    }

    if (state.player) refreshBestLinesForPlayer(state.player);

    $("#resultsTitle").textContent = "Pressure Cooker — Results";
    $("#resultsSub").innerHTML = `Correct: <b>${state.pressure.correct}</b> • Total answered: <b>${state.pressure.asked}</b>`;
    $("#scoreBig").textContent = `${state.pressure.correct} correct`;
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    const fb = $("#feedback");
    fb.innerHTML = "";
    state.answers.slice(-10).forEach((a) => {
      const div = document.createElement("div");
      div.className = "feeditem";
      div.innerHTML = `
        <div class="feedtop">
          <div class="feedq">Recent</div>
          <div class="${a.ok ? "feedok" : "feedbad"}">${a.ok ? "✓ +3s" : "✗ −30s"}</div>
        </div>
        <div class="feedsub"><b>Sentence:</b> ${escapeHTML(a.q).replace("____", "<b>____</b>")}</div>
        <div class="feedsub"><b>Your answer:</b> ${escapeHTML(a.chosen)} • <b>Correct:</b> ${escapeHTML(a.correct)}</div>
        <div class="feedsub">${a.explain}</div>
      `;
      fb.appendChild(div);
    });

    showScreen("results");
  }

  // ============================================================
  // DUEL (A then B, same seed + same 10 questions)
  // ============================================================
  function startDuel({ nameA, nameB, levelId }) {
    state.duel.a = nameA;
    state.duel.b = nameB;
    state.duel.seed = Math.floor(Math.random() * 1e9);
    state.duel.step = "A";

    state.duel.aScore = state.duel.bScore = null;
    state.duel.aRaw = state.duel.bRaw = null;
    state.duel.aPen = state.duel.bPen = null;

    // start A
    startClassicRun({
      playerName: nameA,
      modeId: "duel",
      levelId,
      seedOverride: state.duel.seed,
      staged: false
    });
    $("#badgePlayer").textContent = `Player A: ${nameA}`;
  }

  function finishDuelLeg(total, raw, pen) {
    if (state.duel.step === "A") {
      state.duel.aScore = total;
      state.duel.aRaw = raw;
      state.duel.aPen = pen;

      state.duel.step = "B";
      startClassicRun({
        playerName: state.duel.b,
        modeId: "duel",
        levelId: state.levelId,
        seedOverride: state.duel.seed,
        staged: false
      });
      $("#badgePlayer").textContent = `Player B: ${state.duel.b}`;
      return;
    }

    if (state.duel.step === "B") {
      state.duel.bScore = total;
      state.duel.bRaw = raw;
      state.duel.bPen = pen;
      state.duel.step = "SUMMARY";
      showDuelSummary();
    }
  }

  function duelCard(label, name, total, raw, pen) {
    const div = document.createElement("div");
    div.className = "duelcard";
    div.innerHTML = `
      <div class="duelname">${label}: ${escapeHTML(name)}</div>
      <div class="duelscore">${fmtSeconds(total)}</div>
      <div class="duelsmall">Base: ${fmtSeconds(raw)} • Penalty: ${pen}s</div>
    `;
    return div;
  }

  function showDuelSummary() {
    const a = state.duel.aScore;
    const b = state.duel.bScore;
    let winner = "Tie";
    if (a < b) winner = state.duel.a;
    else if (b < a) winner = state.duel.b;

    // ✅ Champion update ONLY after BOTH finish and there is a winner
    if (winner !== "Tie") {
      const wScore = winner === state.duel.a ? a : b;
      const champ = getChampion("duel", state.levelId);
      if (!champ || wScore < champ.score) setChampion("duel", state.levelId, winner, wScore);
    }

    // ✅ Save each player's Duel PB only after both legs done
    if (state.duel.a) {
      const prevA = getBestTime("duel", state.levelId, state.duel.a);
      if (prevA == null || a < prevA) setBestTime("duel", state.levelId, state.duel.a, a);
    }
    if (state.duel.b) {
      const prevB = getBestTime("duel", state.levelId, state.duel.b);
      if (prevB == null || b < prevB) setBestTime("duel", state.levelId, state.duel.b, b);
    }

    $("#duelTitle").textContent = winner === "Tie" ? "Duel — Tie!" : `Duel winner: ${winner}`;
    $("#duelSub").textContent = "Fastest total time wins (penalties included).";

    const grid = $("#duelGrid");
    grid.innerHTML = "";
    grid.appendChild(duelCard("Player A", state.duel.a, a, state.duel.aRaw, state.duel.aPen));
    grid.appendChild(duelCard("Player B", state.duel.b, b, state.duel.bRaw, state.duel.bPen));

    // refresh home grid champion lines
    buildLevelGrid();

    showScreen("duel");
  }

  // ============================================================
  // Button wiring
  // ============================================================
  function wireButtons() {
    $("#btnBackHome1").addEventListener("click", () => showScreen("home"));
    $("#btnBackHome2").addEventListener("click", () => showScreen("home"));
    $("#btnBackHome3").addEventListener("click", () => showScreen("home"));
    $("#btnDuelNext").addEventListener("click", () => showScreen("home"));

    $("#btnQuit").addEventListener("click", () => {
      stopTimer();
      showScreen("home");
    });

    $("#btnNext").addEventListener("click", () => {
      const mode = MODES.find(m => m.id === state.modeId) || MODES[0];
      if (mode.kind === "pressure") {
        submitPressure();
        return;
      }
      submitClassicAnswer(mode.kind === "heist");
    });

    $("#btnPlayAgain").addEventListener("click", () => {
      const mode = MODES.find(m => m.id === state.modeId) || MODES[0];

      if (mode.kind === "pressure") {
        startPressure({ playerName: state.player || "Player", levelId: state.levelId });
        return;
      }

      if (mode.kind === "duel") {
        openSetup();
        return;
      }

      startClassicRun({
        playerName: state.player || "Player",
        modeId: state.modeId,
        levelId: state.levelId,
        staged: mode.kind === "heist"
      });
    });

    $("#btnStart").addEventListener("click", () => {
      const mode = MODES.find(m => m.id === state.modeId) || MODES[0];

      if (mode.usesDuel) {
        const a = normName($("#duelNameA").value) || "Player A";
        const b = normName($("#duelNameB").value) || "Player B";
        startDuel({ nameA: a, nameB: b, levelId: state.levelId });
        return;
      }

      const name = normName($("#soloName").value) || "Player";
      state.player = name;

      // PB preview on home (read-only) — still no saving until finish
      refreshBestLinesForPlayer(name);

      if (mode.kind === "pressure") {
        startPressure({ playerName: name, levelId: state.levelId });
        return;
      }

      startClassicRun({
        playerName: name,
        modeId: state.modeId,
        levelId: state.levelId,
        staged: mode.kind === "heist"
      });
    });

    $("#btnResetAll").addEventListener("click", () => {
      const keys = Object.keys(localStorage);
      keys.forEach(k => {
        if (k.startsWith("ta_best_v3::") || k.startsWith("ta_champ_v3::") || k.startsWith("ta_pressure_best_v3::") || k.startsWith("ta_")) {
          localStorage.removeItem(k);
        }
      });
      buildLevelGrid();
      alert("Local Turbo Arcade scores cleared on this device.");
    });
  }

  // ============================================================
  // Duel finish override: after each leg, show a quick results splash then continue
  // ============================================================
  function finishClassicRunForDuel(staged) {
    stopTimer();
    const raw = (now() - state.t0) / 1000;
    const total = raw + state.penalty;

    // show brief feedback then continue duel
    const title = state.duel.step === "A" ? "Player A — leg complete" : "Player B — leg complete";
    showResultsClassic(total, raw, title);

    const pen = state.penalty;
    setTimeout(() => {
      finishDuelLeg(total, raw, pen);
    }, 800);
  }

  // Hook finishClassicRun when in duel mode
  const _origFinishClassicRun = finishClassicRun;
  finishClassicRun = function(staged) {
    if (state.modeId === "duel") {
      finishClassicRunForDuel(staged);
      return;
    }
    _origFinishClassicRun(staged);
  };

  // -------- Init
  function init() {
    assertDOM();
    cacheScreens();
    buildModeTiles();
    restoreDefaults();
    buildLevelGrid();
    updatePills();
    wireButtons();
    showScreen("home");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
