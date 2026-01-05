// Turbo Arcade — app.js v6.1 (FULL DROP-IN)
// Fixes:
// ✅ Cross-device Class Best + Champion via Firebase Firestore (live updates)
// ✅ Modes actually differ (Practice / Duel / Pressure / Tower / Heist)
// ✅ Locked levels by default + Turbo unlock thresholds
// ✅ Saves only after finishing (no "record without playing")
// ✅ Back button labels forced visible
//
// REQUIREMENT for cross-device:
// - Create Firebase project + enable Firestore
// - Paste config into FIREBASE_CONFIG below
// - Set Firestore rules (see bottom of this message)

(() => {
  "use strict";

  // ============================================================
  // 0) FIREBASE CONFIG — PASTE YOUR CONFIG HERE
  // ============================================================
  const FIREBASE_CONFIG = {
    // apiKey: "…",
    // authDomain: "…",
    // projectId: "…",
    // storageBucket: "…",
    // messagingSenderId: "…",
    // appId: "…"
  };

  const FS_NAMESPACE = "turbo_arcade_v1";

  // ============================================================
  // 1) DOM helpers
  // ============================================================
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const REQUIRED_IDS = [
    "#screenHome", "#screenSetup", "#screenGame", "#screenResults", "#screenDuel",
    "#modeTiles", "#levelGrid", "#btnResetAll",
    "#setupTitle", "#setupSub", "#rowSoloName", "#soloName", "#rowDuelNames", "#duelNameA", "#duelNameB",
    "#setupLevelPicker", "#btnStart", "#btnBackHome1",
    "#badgeStage", "#badgePlayer", "#timer", "#penalty", "#qcount", "#qdiff", "#prompt", "#options",
    "#btnNext", "#btnQuit", "#microHint",
    "#resultsTitle", "#resultsSub", "#scoreBig", "#scoreMeta", "#btnPlayAgain", "#btnBackHome2", "#feedback",
    "#duelTitle", "#duelSub", "#duelGrid", "#btnDuelNext", "#btnBackHome3",
    "#pillMode", "#pillLevel"
  ];

  function assertDOM() {
    const missing = REQUIRED_IDS.filter(id => !$(id));
    if (missing.length) {
      alert("Turbo Arcade: index.html IDs don't match app.js.\nMissing:\n" + missing.join("\n"));
      throw new Error("Missing DOM elements.");
    }
  }

  function forceButtonLabels() {
    $("#btnBackHome1").textContent = "Back";
    $("#btnBackHome2").textContent = "Back";
    $("#btnBackHome3").textContent = "Back";
    $("#btnQuit").textContent = "Quit";
    $("#btnDuelNext").textContent = "Back to Arcade";
    $("#btnStart").textContent = "Start";
    $("#btnPlayAgain").textContent = "Play again";
  }

  // ============================================================
  // 2) Levels + unlock thresholds
  // ============================================================
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

  // ============================================================
  // 3) Modes — genuinely different
  // ============================================================
  const MODES = [
    { id: "practice", title: "Practice", tag: "PB saver", kind: "classic", usesDuel: false, usesChampion: false },
    { id: "duel", title: "Turbo Duel", tag: "Head-to-head", kind: "duel", usesDuel: true, usesChampion: true },
    { id: "pressure", title: "Pressure Cooker", tag: "Survival", kind: "pressure", usesDuel: false, usesChampion: false },
    { id: "tower", title: "Champion Tower", tag: "Dethrone", kind: "tower", usesDuel: false, usesChampion: true },
    { id: "heist", title: "Language Heist", tag: "Mission", kind: "heist", usesDuel: false, usesChampion: false },
  ];

  // ============================================================
  // 4) Content — Connectors
  // ============================================================
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

  // 10 questions per level
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
      { text: "Quiero salir, ____ está lloviendo.", answer: "pero", explain: "But → <b>pero</b>." },
      { text: "Compro pan ____ leche.", answer: "y", explain: "List → <b>y</b>." },
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
      { text: "Terminé la tarea; ____ puedo descansar.", answer: "entonces", explain: "So → <b>entonces</b>." },
      { text: "Está nublado, ____ no vamos a la playa.", answer: "así que", explain: "Result → <b>así que</b>." },
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
      { text: "No voy ____ estoy enfermo.", answer: "ya que", explain: "Since → <b>ya que</b>." },
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
      { text: "Voy contigo ____ me esperes.", answer: "con tal de que", explain: "Condition → <b>con tal de que</b>." },
      { text: "Iré ____ termine pronto.", answer: "siempre que", explain: "Provided → <b>siempre que</b>." },
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
      { text: "Trabajo ____ ahorrar dinero.", answer: "a fin de", explain: "In order → <b>a fin de</b>." },
      { text: "No estudió; ____ suspendió.", answer: "consecuentemente", explain: "Consequently → <b>consecuentemente</b>." },
      { text: "Hice un resumen ____ fuera más fácil.", answer: "de modo que", explain: "So that → <b>de modo que</b>." },
      { text: "Organicé el texto ____ se entendiera.", answer: "de manera que", explain: "So that → <b>de manera que</b>." },
      { text: "Entreno ____ mejorar.", answer: "a fin de", explain: "In order → <b>a fin de</b>." },
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

  // ============================================================
  // 5) Utilities
  // ============================================================
  const now = () => performance.now();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const normName = (s) => (s || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const normAnswer = (s) => (s || "").trim().toLowerCase();
  const fmtSeconds = (sec) => `${(Math.round(sec * 10) / 10).toFixed(1)}s`;
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
    const pool = Array.from(new Set([...(CONNECTORS[levelId] || []), ...Object.values(CONNECTORS).flat()]));
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

  // ============================================================
  // 6) Local storage (unlock + personal PB)
  // ============================================================
  const K = {
    lastMode: "ta_last_mode_v6",
    lastLevel: "ta_last_level_v6",
    unlockedMax: "ta_unlocked_max_v6",
    best: (modeId, levelId, player) => `ta_best_v6::${modeId}::L${levelId}::${player}`,
  };

  function getUnlockedMax() {
    const n = Number(localStorage.getItem(K.unlockedMax));
    return Number.isFinite(n) ? n : 1;
  }
  function setUnlockedMax(n) { localStorage.setItem(K.unlockedMax, String(n)); }
  function maybeUnlockNextLevel(currentLevel, scoreSeconds) {
    const next = currentLevel + 1;
    if (next > 10) return;
    const threshold = UNLOCK_BY_LEVEL[next];
    if (threshold == null) return;
    const unlockedMax = getUnlockedMax();
    if (next <= unlockedMax) return;
    if (scoreSeconds <= threshold) setUnlockedMax(next);
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

  // ============================================================
  // 7) Firebase Firestore (cross-device)
  // ============================================================
  let fb = { enabled: false, db: null, doc: null, getDoc: null, setDoc: null, onSnapshot: null, serverTimestamp: null };

  function hasFirebaseConfig() {
    return FIREBASE_CONFIG && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey;
  }

  async function initFirebaseIfConfigured() {
    if (!hasFirebaseConfig()) return false;

    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    const { getFirestore, doc, getDoc, setDoc, onSnapshot, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");

    const app = initializeApp(FIREBASE_CONFIG);
    const db = getFirestore(app);

    fb = { enabled: true, db, doc, getDoc, setDoc, onSnapshot, serverTimestamp };
    return true;
  }

  function fsDoc(id) { return fb.doc(fb.db, FS_NAMESPACE, id); }
  function fsClassBestId(modeId, levelId) { return `classBest__${modeId}__L${levelId}`; }
  function fsChampionId(modeId, levelId) { return `champion__${modeId}__L${levelId}`; }

  async function maybeWriteLowerScore(docRef, name, score) {
    const snap = await fb.getDoc(docRef);
    const cur = snap.exists() ? snap.data() : null;
    if (!cur || typeof cur.score !== "number" || score < cur.score) {
      await fb.setDoc(docRef, { name, score, updatedAt: fb.serverTimestamp() }, { merge: true });
      return true;
    }
    return false;
  }

  // ============================================================
  // 8) Screens + state
  // ============================================================
  const screens = {};
  function cacheScreens() {
    screens.home = $("#screenHome");
    screens.setup = $("#screenSetup");
    screens.game = $("#screenGame");
    screens.results = $("#screenResults");
    screens.duel = $("#screenDuel");
  }
  function showScreen(which) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== which));
  }

  const state = {
    modeId: "practice",
    levelId: 1,

    player: null,
    seed: null,
    items: [],
    idx: 0,
    selected: null,
    answers: [],
    penalty: 0,
    t0: null,
    raf: null,

    pressure: { timeLeft: 90, correct: 0, asked: 0, tPrev: null },

    duel: { a: null, b: null, seed: null, step: null, aScore: null, bScore: null, aRaw: null, bRaw: null, aPen: null, bPen: null },

    remoteClassBest: {},
    remoteChampion: {},
  };

  const keyML = (modeId, levelId) => `${modeId}|${levelId}`;
  function modeObj() { return MODES.find(m => m.id === state.modeId) || MODES[0]; }
  function levelObj() { return LEVELS.find(l => l.id === state.levelId) || LEVELS[0]; }

  function updatePills() {
    $("#pillMode").textContent = `Mode: ${modeObj().title}`;
    $("#pillLevel").textContent = `Level: ${state.levelId} (${levelObj().diff})`;
  }

  // ============================================================
  // 9) UI build
  // ============================================================
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
        <div class="tile-desc">
          ${m.kind === "classic" ? "Classic timed run. Unlocks happen here."
            : m.kind === "duel" ? "A vs B, same questions. Winner can be champion."
            : m.kind === "pressure" ? "Survival timer. Correct +3s, wrong −30s."
            : m.kind === "tower" ? "Beat the Champion time to dethrone."
            : "Staged mission vibe (same scoring)."}
        </div>
        <div class="tile-cta">Select →</div>
      `;
      div.addEventListener("click", () => {
        state.modeId = m.id;
        localStorage.setItem(K.lastMode, state.modeId);
        updatePills();
        buildLevelGrid();
        openSetup();
      });
      wrap.appendChild(div);
    }
  }

  function remoteClassBestLine(modeId, levelId) {
    const cb = state.remoteClassBest[keyML(modeId, levelId)];
    if (!cb) return "—";
    return `<b>${escapeHTML(cb.name)}</b> — ${fmtSeconds(cb.score)}`;
  }
  function remoteChampionLine(modeId, levelId) {
    const ch = state.remoteChampion[keyML(modeId, levelId)];
    if (!ch) return "—";
    return `<b>${escapeHTML(ch.name)}</b> — ${fmtSeconds(ch.score)}`;
  }

  function buildLevelGrid() {
    const grid = $("#levelGrid");
    grid.innerHTML = "";

    const unlockedMax = getUnlockedMax();
    const m = modeObj();

    for (const lvl of LEVELS) {
      const locked = lvl.id > unlockedMax;
      const threshold = UNLOCK_BY_LEVEL[lvl.id];

      const btn = document.createElement("button");
      btn.className = "levelbtn";
      if (locked) btn.classList.add("locked");
      btn.dataset.level = String(lvl.id);

      btn.innerHTML = `
        <div class="level-top">
          <div class="level-name">${lvl.name}</div>
          <div class="level-diff">${lvl.diff}</div>
        </div>

        <div class="level-champ">
          ${m.usesChampion
            ? `Champion: ${fb.enabled ? remoteChampionLine(state.modeId, lvl.id) : "<i>(online off)</i>"}`
            : `Champion: <b>—</b>`}
        </div>

        <div class="level-best publicbest">
          Class Best: ${fb.enabled ? remoteClassBestLine(state.modeId, lvl.id) : "<i>(online off)</i>"}
        </div>

        <div class="level-best" id="bestLine-${lvl.id}">Your best: —</div>
        <div class="lockline">
          ${locked ? `Locked • unlock: ≤ ${threshold}s (prev level in Practice)` : "Unlocked"}
        </div>
      `;

      btn.addEventListener("click", () => {
        if (locked) {
          alert(`Level ${lvl.id} is locked.\nUnlock it by beating Level ${lvl.id - 1} in ≤ ${threshold}s in Practice.`);
          return;
        }
        state.levelId = lvl.id;
        localStorage.setItem(K.lastLevel, String(state.levelId));
        updatePills();
        openSetup();
      });

      grid.appendChild(btn);
    }
  }

  function refreshBestLinesForPlayer(player) {
    for (const lvl of LEVELS) {
      const el = $(`#bestLine-${lvl.id}`);
      if (!el) continue;

      if (modeObj().kind === "pressure") {
        el.textContent = "Your best: —";
        continue;
      }

      const best = getBestTime(state.modeId, lvl.id, player);
      el.textContent = `Your best: ${best == null ? "—" : fmtSeconds(best)}`;
    }
  }

  function openSetup() {
    forceButtonLabels();

    const m = modeObj();
    const lvl = levelObj();

    $("#setupTitle").textContent = `${m.title} — ${lvl.name}`;
    $("#setupSub").textContent = m.usesDuel
      ? "Enter two names. Player A goes first, then Player B plays the exact same 10 questions."
      : "Enter your name (scores save only after you finish).";

    $("#rowDuelNames").classList.toggle("hidden", !m.usesDuel);
    $("#rowSoloName").classList.toggle("hidden", m.usesDuel);

    // Level picker
    const picker = $("#setupLevelPicker");
    picker.innerHTML = "";
    const unlockedMax = getUnlockedMax();

    for (const l of LEVELS) {
      const locked = l.id > unlockedMax;
      const b = document.createElement("button");
      b.className = "segbtn" + (l.id === state.levelId ? " active" : "");
      b.textContent = `L${l.id}`;
      if (locked) b.classList.add("lockedseg");

      b.addEventListener("click", () => {
        if (locked) {
          const t = UNLOCK_BY_LEVEL[l.id];
          alert(`Level ${l.id} is locked.\nUnlock: beat Level ${l.id - 1} in ≤ ${t}s in Practice.`);
          return;
        }
        state.levelId = l.id;
        localStorage.setItem(K.lastLevel, String(state.levelId));
        $$(".segbtn").forEach(x => x.classList.toggle("active", x === b));
        updatePills();
        $("#setupTitle").textContent = `${m.title} — ${LEVELS.find(z => z.id === state.levelId).name}`;
      });

      picker.appendChild(b);
    }

    // PB preview only (no saving here)
    $("#soloName").oninput = () => {
      const name = normName($("#soloName").value);
      if (name) refreshBestLinesForPlayer(name);
    };

    showScreen("setup");
  }

  // ============================================================
  // 10) Game engines
  // ============================================================
  function stopTimer() {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  // ----- Classic-like modes (Practice / Tower / Heist) + Duel legs
  function startClassicRun({ playerName, modeId, levelId, seedOverride = null, staged = false, badge = "Stage: Classic" }) {
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
    $("#badgeStage").textContent = badge;
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
    const q = state.items[state.idx];

    $("#qcount").textContent = `Q ${state.idx + 1} / 10`;
    $("#qdiff").textContent = levelObj().diff;

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

    state.answers.push({ q: q.text, chosen: chosen || "—", correct: q.answer, ok, explain: q.explain });

    state.idx++;
    if (state.idx >= 10) finishClassicRun(staged);
    else renderClassicQ(staged);
  }

  function showResultsClassic(total, raw, titleOverride = "Results") {
    const mistakes = state.answers.filter(a => !a.ok).length;

    $("#resultsTitle").textContent = titleOverride;
    $("#resultsSub").innerHTML =
      `Base time: <b>${fmtSeconds(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b>`;

    $("#scoreBig").textContent = fmtSeconds(total);
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    const fbWrap = $("#feedback");
    fbWrap.innerHTML = "";
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
      fbWrap.appendChild(div);
    });

    showScreen("results");
  }

  async function finishClassicRun(staged) {
    stopTimer();
    const raw = (now() - state.t0) / 1000;
    const total = raw + state.penalty;

    // Duel legs are handled separately
    if (state.modeId === "duel") return finishDuelLeg(total, raw, state.penalty);

    // Save PB only AFTER finishing
    if (state.player) {
      const prev = getBestTime(state.modeId, state.levelId, state.player);
      if (prev == null || total < prev) setBestTime(state.modeId, state.levelId, state.player, total);
      refreshBestLinesForPlayer(state.player);
    }

    // Unlock progression based on PRACTICE ONLY
    if (state.modeId === "practice") {
      maybeUnlockNextLevel(state.levelId, total);
    }

    // Online: update class best always; champion if Tower
    if (fb.enabled && state.player) {
      await maybeWriteLowerScore(fsDoc(fsClassBestId(state.modeId, state.levelId)), state.player, total);
      if (modeObj().kind === "tower") {
        await maybeWriteLowerScore(fsDoc(fsChampionId(state.modeId, state.levelId)), state.player, total);
      }
    }

    buildLevelGrid();

    // Tower messaging
    if (modeObj().kind === "tower" && fb.enabled) {
      const ch = state.remoteChampion[keyML(state.modeId, state.levelId)];
      const title = (ch && total < ch.score) ? "NEW CHAMPION!" : "Champion Tower — Results";
      showResultsClassic(total, raw, title);
      return;
    }

    showResultsClassic(total, raw, "Results");
  }

  // ----- Pressure mode
  function startPressure({ playerName, levelId }) {
    state.player = playerName;
    state.levelId = levelId;

    state.seed = Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(state.seed);

    const pool = (SENTENCES[levelId] || []).slice();
    const idxs = pool.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }

    state.items = idxs.map(i => {
      const it = pool[i];
      return { text: it.text, answer: it.answer, explain: it.explain, options: makeOptions(levelId, it.answer, rnd) };
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
    const q = state.items[state.idx % state.items.length];

    $("#qcount").textContent = `Survival • ${state.pressure.correct} correct`;
    $("#qdiff").textContent = levelObj().diff;

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

    state.answers.push({ q: q.text, chosen: chosen || "—", correct: q.answer, ok, explain: q.explain });
    state.idx++;
    renderPressureQ();
  }

  function finishPressure() {
    $("#resultsTitle").textContent = "Pressure Cooker — Results";
    $("#resultsSub").innerHTML = `Correct: <b>${state.pressure.correct}</b> • Answered: <b>${state.pressure.asked}</b>`;
    $("#scoreBig").textContent = `${state.pressure.correct} correct`;
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    const fbWrap = $("#feedback");
    fbWrap.innerHTML = "";
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
      fbWrap.appendChild(div);
    });

    showScreen("results");
  }

  // ----- Duel: A then B, same seed
  function startDuel({ nameA, nameB, levelId }) {
    state.duel.a = nameA;
    state.duel.b = nameB;
    state.duel.seed = Math.floor(Math.random() * 1e9);
    state.duel.step = "A";

    state.duel.aScore = state.duel.bScore = null;
    state.duel.aRaw = state.duel.bRaw = null;
    state.duel.aPen = state.duel.bPen = null;

    startClassicRun({ playerName: nameA, modeId: "duel", levelId, seedOverride: state.duel.seed, staged: false, badge: "Duel: Player A" });
  }

  async function finishDuelLeg(total, raw, pen) {
    showResultsClassic(total, raw, state.duel.step === "A" ? "Player A — leg complete" : "Player B — leg complete");

    if (state.duel.step === "A") {
      state.duel.aScore = total;
      state.duel.aRaw = raw;
      state.duel.aPen = pen;
      state.duel.step = "B";

      setTimeout(() => {
        startClassicRun({ playerName: state.duel.b, modeId: "duel", levelId: state.levelId, seedOverride: state.duel.seed, staged: false, badge: "Duel: Player B" });
      }, 650);
      return;
    }

    state.duel.bScore = total;
    state.duel.bRaw = raw;
    state.duel.bPen = pen;

    const a = state.duel.aScore;
    const b = state.duel.bScore;

    let winner = "Tie";
    let winScore = null;
    if (a < b) { winner = state.duel.a; winScore = a; }
    else if (b < a) { winner = state.duel.b; winScore = b; }

    // Local PB updates after duel ends
    if (state.duel.a) {
      const prevA = getBestTime("duel", state.levelId, state.duel.a);
      if (prevA == null || a < prevA) setBestTime("duel", state.levelId, state.duel.a, a);
    }
    if (state.duel.b) {
      const prevB = getBestTime("duel", state.levelId, state.duel.b);
      if (prevB == null || b < prevB) setBestTime("duel", state.levelId, state.duel.b, b);
    }

    // Online: winner may update champion + class best for duel
    if (fb.enabled && winner !== "Tie") {
      await maybeWriteLowerScore(fsDoc(fsChampionId("duel", state.levelId)), winner, winScore);
      await maybeWriteLowerScore(fsDoc(fsClassBestId("duel", state.levelId)), winner, winScore);
    }

    $("#duelTitle").textContent = winner === "Tie" ? "Duel — Tie!" : `Duel winner: ${winner}`;
    $("#duelSub").textContent = "Fastest total time wins (penalties included).";

    const grid = $("#duelGrid");
    grid.innerHTML = "";

    const card = (label, name, totalS, rawS, penS) => {
      const div = document.createElement("div");
      div.className = "duelcard";
      div.innerHTML = `
        <div class="duelname">${label}: ${escapeHTML(name)}</div>
        <div class="duelscore">${fmtSeconds(totalS)}</div>
        <div class="duelsmall">Base: ${fmtSeconds(rawS)} • Penalty: ${penS}s</div>
      `;
      return div;
    };

    grid.appendChild(card("Player A", state.duel.a, a, state.duel.aRaw, state.duel.aPen));
    grid.appendChild(card("Player B", state.duel.b, b, state.duel.bRaw, state.duel.bPen));

    buildLevelGrid();
    showScreen("duel");
  }

  // ============================================================
  // 12) Buttons
  // ============================================================
  function wireButtons() {
    $("#btnBackHome1").addEventListener("click", () => showScreen("home"));
    $("#btnBackHome2").addEventListener("click", () => showScreen("home"));
    $("#btnBackHome3").addEventListener("click", () => showScreen("home"));
    $("#btnDuelNext").addEventListener("click", () => showScreen("home"));

    $("#btnQuit").addEventListener("click", () => { stopTimer(); showScreen("home"); });

    $("#btnNext").addEventListener("click", () => {
      if (modeObj().kind === "pressure") return submitPressure();
      return submitClassicAnswer(modeObj().kind === "heist");
    });

    $("#btnPlayAgain").addEventListener("click", () => {
      const kind = modeObj().kind;
      if (kind === "pressure") return startPressure({ playerName: state.player || "Player", levelId: state.levelId });
      if (kind === "duel") return openSetup();
      return startClassicRun({ playerName: state.player || "Player", modeId: state.modeId, levelId: state.levelId, staged: (kind === "heist"), badge: kind === "tower" ? "Stage: Tower" : "Stage: Classic" });
    });

    $("#btnStart").addEventListener("click", () => {
      const m = modeObj();
      if (m.usesDuel) {
        const a = normName($("#duelNameA").value) || "Player A";
        const b = normName($("#duelNameB").value) || "Player B";
        return startDuel({ nameA: a, nameB: b, levelId: state.levelId });
      }

      const name = normName($("#soloName").value) || "Player";
      state.player = name;
      refreshBestLinesForPlayer(name);

      if (m.kind === "pressure") return startPressure({ playerName: name, levelId: state.levelId });

      return startClassicRun({
        playerName: name,
        modeId: state.modeId,
        levelId: state.levelId,
        staged: (m.kind === "heist"),
        badge: m.kind === "tower" ? "Stage: Tower" : (m.kind === "heist" ? "Stage: 1/3" : "Stage: Classic")
      });
    });

    $("#btnResetAll").addEventListener("click", () => {
      Object.keys(localStorage).forEach(k => { if (k.startsWith("ta_best_v6::") || k.startsWith("ta_")) localStorage.removeItem(k); });
      setUnlockedMax(1);
      buildLevelGrid();
      alert("Local PBs + unlocks cleared on this device.\nOnline Class Best/Champion remains.");
    });
  }

  // ============================================================
  // 13) Firestore listeners (live updates)
  // ============================================================
  function attachFirestoreListeners() {
    if (!fb.enabled) return;

    for (const m of MODES) {
      for (const lvl of LEVELS) {
        fb.onSnapshot(fsDoc(fsClassBestId(m.id, lvl.id)), (snap) => {
          if (!snap.exists()) return;
          const d = snap.data();
          if (d && typeof d.name === "string" && typeof d.score === "number") {
            state.remoteClassBest[keyML(m.id, lvl.id)] = { name: d.name, score: d.score };
            buildLevelGrid();
          }
        });

        if (m.usesChampion) {
          fb.onSnapshot(fsDoc(fsChampionId(m.id, lvl.id)), (snap) => {
            if (!snap.exists()) return;
            const d = snap.data();
            if (d && typeof d.name === "string" && typeof d.score === "number") {
              state.remoteChampion[keyML(m.id, lvl.id)] = { name: d.name, score: d.score };
              buildLevelGrid();
            }
          });
        }
      }
    }
  }

  // ============================================================
  // 14) Init
  // ============================================================
  function restoreDefaults() {
    const lastMode = localStorage.getItem(K.lastMode);
    const lastLevel = Number(localStorage.getItem(K.lastLevel));

    state.modeId = (lastMode && MODES.some(m => m.id === lastMode)) ? lastMode : "practice";
    state.levelId = (Number.isFinite(lastLevel) && lastLevel >= 1 && lastLevel <= 10) ? lastLevel : 1;

    const unlocked = Number(localStorage.getItem(K.unlockedMax));
    if (!Number.isFinite(unlocked)) setUnlockedMax(1);
  }

  async function init() {
    assertDOM();
    cacheScreens();
    forceButtonLabels();
    restoreDefaults();

    buildModeTiles();
    updatePills();

    await initFirebaseIfConfigured();
    if (fb.enabled) attachFirestoreListeners();
    else console.warn("Firebase not configured — cross-device scores will show 'online off'.");

    buildLevelGrid();
    wireButtons();
    showScreen("home");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
