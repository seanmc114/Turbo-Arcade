// Turbo Arcade — Connectors (WORKING) + Feedback + Fixed Unlock + Optional Online Class Best
// - Works offline immediately (GitHub Pages)
// - If you add Firebase config + rules, Class Best becomes online across devices

(() => {
  "use strict";

  // ============================================================
  //rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /turbo_arcade_simple_v1/{docId} {
      allow read: if true;
      allow write: if request.resource.data.name is string
                   && request.resource.data.name.size() <= 24
                   && request.resource.data.score is number
                   && request.resource.data.score > 0
                   && request.resource.data.score < 2000;
    }
  }
}
OPTIONAL ONLINE (Firebase Firestore)
  // If you leave this empty, game runs OFFLINE and shows "online off".
  // ============================================================
  const FIREBASE_CONFIG = {
    // apiKey: "PASTE",
    // authDomain: "PASTE",
    // projectId: "PASTE",
    // storageBucket: "PASTE",
    // messagingSenderId: "PASTE",
    // appId: "PASTE"
  };

  const FS_NAMESPACE = "turbo_arcade_simple_v1";
  let fb = { enabled: false, db: null, doc: null, getDoc: null, setDoc: null, onSnapshot: null, serverTimestamp: null };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const REQUIRED_IDS = [
    "#screenHome", "#screenSetup", "#screenGame", "#screenResults",
    "#modeTiles", "#levelGrid", "#btnResetAll",
    "#setupTitle", "#setupSub", "#rowSoloName", "#soloName",
    "#rowDuelNames", "#setupLevelPicker",
    "#btnStart", "#btnBackHome1",
    "#badgeStage", "#badgePlayer", "#timer", "#penalty", "#qcount", "#qdiff",
    "#prompt", "#options", "#btnNext", "#btnQuit", "#microHint",
    "#resultsTitle", "#resultsSub", "#scoreBig", "#scoreMeta",
    "#btnPlayAgain", "#btnBackHome2", "#feedback",
    "#pillMode", "#pillLevel"
  ];

  function assertDOM() {
    const missing = REQUIRED_IDS.filter(id => !$(id));
    if (missing.length) {
      alert("Turbo Arcade: index.html IDs don't match.\nMissing:\n" + missing.join("\n"));
      throw new Error("DOM mismatch");
    }
  }

  // ---- screens
  const screens = {};
  function cacheScreens() {
    screens.home = $("#screenHome");
    screens.setup = $("#screenSetup");
    screens.game = $("#screenGame");
    screens.results = $("#screenResults");
  }
  function showScreen(which) {
    Object.entries(screens).forEach(([k, el]) => el.classList.toggle("hidden", k !== which));
  }

  // ---- time formatting
  const fmt = (sec) => `${(Math.round(sec * 10) / 10).toFixed(1)}s`;

  // ---- levels + unlock thresholds
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

  // Unlock Level N by beating Level N-1 within this time
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

  // ---- content
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

  const SENTENCES = {
    1: [
      { text: "Quiero té ____ café.", a: "o", why: "Choice → <b>o</b>." },
      { text: "Tengo un lápiz ____ un bolígrafo.", a: "y", why: "Addition → <b>y</b>." },
      { text: "Estudio, ____ estoy cansado.", a: "pero", why: "Contrast → <b>pero</b>." },
      { text: "Es simpático ____ divertido.", a: "y", why: "Adding → <b>y</b>." },
      { text: "¿Quieres ir ____ quedarte en casa?", a: "o", why: "Alternative → <b>o</b>." },
      { text: "Me gusta el fútbol, ____ prefiero el baloncesto.", a: "pero", why: "Contrast → <b>pero</b>." },
      { text: "Trabajo ____ estudio por las tardes.", a: "y", why: "Two actions → <b>y</b>." },
      { text: "Podemos caminar ____ tomar el bus.", a: "o", why: "Either/or → <b>o</b>." },
      { text: "Quiero salir, ____ está lloviendo.", a: "pero", why: "But → <b>pero</b>." },
      { text: "Compro pan ____ leche.", a: "y", why: "List → <b>y</b>." },
    ],
    2: [
      { text: "No salgo ____ tengo deberes.", a: "porque", why: "Reason → <b>porque</b>." },
      { text: "Voy al cine; ____ voy a cenar.", a: "también", why: "Also → <b>también</b>." },
      { text: "Quiero estudiar; ____ quiero practicar.", a: "además", why: "In addition → <b>además</b>." },
      { text: "Lo hago ____ prisa.", a: "sin", why: "Without → <b>sin</b>." },
      { text: "Estoy feliz ____ es viernes.", a: "porque", why: "Cause → <b>porque</b>." },
      { text: "Ella canta; ____ baila.", a: "también", why: "Also → <b>también</b>." },
      { text: "Es caro; ____ es buenísimo.", a: "además", why: "Plus → <b>además</b>." },
      { text: "Salimos ____ dinero.", a: "sin", why: "Without → <b>sin</b>." },
      { text: "No lo compro ____ no lo necesito.", a: "porque", why: "Reason → <b>porque</b>." },
      { text: "Tengo hambre; ____ estoy cansado.", a: "además", why: "Another point → <b>además</b>." },
    ],
    3: [
      { text: "Terminé la tarea; ____ puedo descansar.", a: "entonces", why: "So → <b>entonces</b>." },
      { text: "Está nublado, ____ no vamos a la playa.", a: "así que", why: "Result → <b>así que</b>." },
      { text: "Perdí el bus; ____ llegué tarde.", a: "por eso", why: "That’s why → <b>por eso</b>." },
      { text: "Comimos y ____ fuimos al parque.", a: "luego", why: "Afterwards → <b>luego</b>." },
      { text: "No estudió, ____ suspendió.", a: "por eso", why: "Reason→result → <b>por eso</b>." },
      { text: "Estaba enfermo, ____ se quedó en casa.", a: "así que", why: "So → <b>así que</b>." },
      { text: "No tengo clase; ____ voy a entrenar.", a: "entonces", why: "So → <b>entonces</b>." },
      { text: "Hicimos la compra y ____ cocinamos.", a: "luego", why: "Then → <b>luego</b>." },
      { text: "No había sitio; ____ cambiamos de plan.", a: "entonces", why: "So → <b>entonces</b>." },
      { text: "Quería dormir; ____ apagué el móvil.", a: "así que", why: "So → <b>así que</b>." },
    ],
    4: [
      { text: "Quiero ir; ____ está lloviendo.", a: "sin embargo", why: "However → <b>sin embargo</b>." },
      { text: "Yo estudio; mi hermano, ____ , juega.", a: "en cambio", why: "In contrast → <b>en cambio</b>." },
      { text: "No es caro, ____ barato.", a: "sino", why: "Not X but Y → <b>sino</b>." },
      { text: "Voy, ____ no tengo tiempo.", a: "aunque", why: "Even though → <b>aunque</b>." },
      { text: "Me gusta; ____ prefiero otro.", a: "sin embargo", why: "However → <b>sin embargo</b>." },
      { text: "Yo voy en bus; tú, ____ , vas andando.", a: "en cambio", why: "Contrast → <b>en cambio</b>." },
      { text: "No quiero té, ____ café.", a: "sino", why: "Correction → <b>sino</b>." },
      { text: "Salgo ____ esté cansado.", a: "aunque", why: "Even if/though → <b>aunque</b>." },
      { text: "Es difícil; ____ lo intento.", a: "sin embargo", why: "However → <b>sin embargo</b>." },
      { text: "No es feo, ____ raro.", a: "sino", why: "Not X but Y → <b>sino</b>." },
    ],
    5: [
      { text: "Te llamo ____ llegue a casa.", a: "cuando", why: "When → <b>cuando</b>." },
      { text: "Leo ____ como.", a: "mientras", why: "While → <b>mientras</b>." },
      { text: "____ salir, termino la tarea.", a: "antes de", why: "Before → <b>antes de</b>." },
      { text: "____ cenar, vemos una serie.", a: "después de", why: "After → <b>después de</b>." },
      { text: "Me ducho ____ entrenar.", a: "después de", why: "After → <b>después de</b>." },
      { text: "____ dormir, apago la luz.", a: "antes de", why: "Before → <b>antes de</b>." },
      { text: "Voy al parque ____ hace sol.", a: "cuando", why: "When → <b>cuando</b>." },
      { text: "Escucho música ____ estudio.", a: "mientras", why: "While → <b>mientras</b>." },
      { text: "____ comer, lavo las manos.", a: "antes de", why: "Before → <b>antes de</b>." },
      { text: "____ clase, entrenamos.", a: "después de", why: "After → <b>después de</b>." },
    ],
    6: [
      { text: "No voy ____ estoy enfermo.", a: "ya que", why: "Since → <b>ya que</b>." },
      { text: "No salimos ____ llueve.", a: "puesto que", why: "Since → <b>puesto que</b>." },
      { text: "Lo intento ____ el problema.", a: "a pesar de", why: "Despite → <b>a pesar de</b>." },
      { text: "Estudio; ____ saco mejores notas.", a: "por lo tanto", why: "Therefore → <b>por lo tanto</b>." },
      { text: "Me quedo en casa ____ no hay tiempo.", a: "ya que", why: "Reason → <b>ya que</b>." },
      { text: "No lo hago ____ es peligroso.", a: "puesto que", why: "Reason → <b>puesto que</b>." },
      { text: "Voy ____ el cansancio.", a: "a pesar de", why: "Despite → <b>a pesar de</b>." },
      { text: "Estoy preparado; ____ no tengo miedo.", a: "por lo tanto", why: "Therefore → <b>por lo tanto</b>." },
      { text: "No me gusta; ____ lo respeto.", a: "a pesar de", why: "Despite → <b>a pesar de</b>." },
      { text: "No estudió; ____ suspendió.", a: "por lo tanto", why: "Therefore → <b>por lo tanto</b>." },
    ],
    7: [
      { text: "____ , el plan es bueno.", a: "sin duda", why: "Emphasis → <b>sin duda</b>." },
      { text: "____ , es útil; ____ , es caro.", a: "por un lado", why: "First side → <b>por un lado</b>." },
      { text: "____ , es útil; ____ , es caro.", a: "por otro lado", why: "Second side → <b>por otro lado</b>." },
      { text: "Quería ir; ____ no tenía tiempo.", a: "no obstante", why: "Nevertheless → <b>no obstante</b>." },
      { text: "Está lejos; ____ lo hacemos.", a: "no obstante", why: "Nevertheless → <b>no obstante</b>." },
      { text: "____ , vale la pena.", a: "sin duda", why: "No doubt → <b>sin duda</b>." },
      { text: "____ , es divertido; ____ , es cansado.", a: "por un lado", why: "First side → <b>por un lado</b>." },
      { text: "____ , es divertido; ____ , es cansado.", a: "por otro lado", why: "Second side → <b>por otro lado</b>." },
      { text: "Me dolía la pierna; ____ seguí.", a: "no obstante", why: "Nevertheless → <b>no obstante</b>." },
      { text: "____ , lo haré.", a: "sin duda", why: "Emphasis → <b>sin duda</b>." },
    ],
    8: [
      { text: "Voy contigo ____ me esperes.", a: "con tal de que", why: "Condition → <b>con tal de que</b>." },
      { text: "Iré ____ termine pronto.", a: "siempre que", why: "Provided → <b>siempre que</b>." },
      { text: "No salgo ____ llueva.", a: "a menos que", why: "Unless → <b>a menos que</b>." },
      { text: "Estaba tranquilo y ____ empezó a gritar.", a: "de repente", why: "Suddenly → <b>de repente</b>." },
      { text: "Te ayudo ____ tú también ayudes.", a: "con tal de que", why: "Condition → <b>con tal de que</b>." },
      { text: "Salimos ____ no haya exámenes.", a: "siempre que", why: "Condition → <b>siempre que</b>." },
      { text: "No lo hago ____ sea obligatorio.", a: "a menos que", why: "Unless → <b>a menos que</b>." },
      { text: "Íbamos bien y ____ todo cambió.", a: "de repente", why: "Suddenly → <b>de repente</b>." },
      { text: "Lo compro ____ sea barato.", a: "siempre que", why: "Provided → <b>siempre que</b>." },
      { text: "No voy ____ me llamen.", a: "a menos que", why: "Unless → <b>a menos que</b>." },
    ],
    9: [
      { text: "Hablo claro ____ entiendas.", a: "de modo que", why: "So that → <b>de modo que</b>." },
      { text: "Lo repito ____ no haya dudas.", a: "de manera que", why: "So that → <b>de manera que</b>." },
      { text: "Trabajo ____ ahorrar dinero.", a: "a fin de", why: "In order → <b>a fin de</b>." },
      { text: "No estudió; ____ suspendió.", a: "consecuentemente", why: "Consequently → <b>consecuentemente</b>." },
      { text: "Hice un resumen ____ fuera más fácil.", a: "de modo que", why: "So that → <b>de modo que</b>." },
      { text: "Organicé el texto ____ se entendiera.", a: "de manera que", why: "So that → <b>de manera que</b>." },
      { text: "Entreno ____ mejorar.", a: "a fin de", why: "In order → <b>a fin de</b>." },
      { text: "Hubo retrasos; ____ llegamos tarde.", a: "consecuentemente", why: "Consequently → <b>consecuentemente</b>." },
      { text: "Habla despacio ____ la sigan.", a: "de modo que", why: "So that → <b>de modo que</b>." },
      { text: "Reduje el ruido ____ se oyera.", a: "de manera que", why: "So that → <b>de manera que</b>." },
    ],
    10: [
      { text: "____ lo que dijiste, tienes razón.", a: "en cuanto", why: "Regarding → <b>en cuanto</b>." },
      { text: "No fui ____ estaba enfermo.", a: "dado que", why: "Given that → <b>dado que</b>." },
      { text: "Es caro; ____ lo compro.", a: "aun así", why: "Even so → <b>aun así</b>." },
      { text: "Mejoro ____ practico.", a: "a medida que", why: "As → <b>a medida que</b>." },
      { text: "____ el plan, me gusta.", a: "en cuanto", why: "As for → <b>en cuanto</b>." },
      { text: "No salgo ____ no tengo tiempo.", a: "dado que", why: "Given that → <b>dado que</b>." },
      { text: "No está perfecto; ____ funciona.", a: "aun así", why: "Even so → <b>aun así</b>." },
      { text: "Aprendo ____ leo más.", a: "a medida que", why: "As → <b>a medida que</b>." },
      { text: "____ el examen, estoy listo.", a: "en cuanto", why: "As for → <b>en cuanto</b>." },
      { text: "No vino ____ llovía.", a: "dado que", why: "Given that → <b>dado que</b>." },
    ],
  };

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---- local storage keys
  const KEY = {
    unlockedMax: "TA_unlockMax_online_v2",
    pb: (levelId) => `TA_PB_online_v2_L${levelId}`,
  };

  function getUnlockedMax() {
    const n = Number(localStorage.getItem(KEY.unlockedMax));
    return Number.isFinite(n) ? n : 1;
  }
  function setUnlockedMax(n) {
    const cur = getUnlockedMax();
    const next = Math.max(cur, n);
    localStorage.setItem(KEY.unlockedMax, String(next));
  }
  function getPB(levelId) {
    const n = Number(localStorage.getItem(KEY.pb(levelId)));
    return Number.isFinite(n) ? n : null;
  }
  function setPB(levelId, val) {
    localStorage.setItem(KEY.pb(levelId), String(val));
  }

  // ---- state
  const state = {
    levelId: 1,
    items: [],
    idx: 0,
    selected: null,
    penalty: 0,
    answers: [],
    t0: 0,
    raf: null,
    playerName: "",
    onlineBest: {}, // levelId -> {name, score}
  };

  function stopTimer() {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }
  function tickTimer() {
    const t = (performance.now() - state.t0) / 1000;
    $("#timer").textContent = fmt(t);
    $("#penalty").textContent = `+${state.penalty}s`;
    state.raf = requestAnimationFrame(tickTimer);
  }

  // ============================================================
  // ONLINE (optional)
  // ============================================================
  function hasFirebaseConfig() {
    return FIREBASE_CONFIG && FIREBASE_CONFIG.projectId && FIREBASE_CONFIG.apiKey;
  }

  function fsDocId(levelId) {
    return `classBest__connectors__L${levelId}`;
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

  function fsDoc(refId) {
    return fb.doc(fb.db, FS_NAMESPACE, refId);
  }

  async function maybeWriteLowerScore(levelId, name, score) {
    const ref = fsDoc(fsDocId(levelId));
    const snap = await fb.getDoc(ref);
    const cur = snap.exists() ? snap.data() : null;
    if (!cur || typeof cur.score !== "number" || score < cur.score) {
      await fb.setDoc(ref, { name, score, updatedAt: fb.serverTimestamp() }, { merge: true });
      return true;
    }
    return false;
  }

  function attachOnlineListeners() {
    if (!fb.enabled) return;

    LEVELS.forEach(lvl => {
      fb.onSnapshot(fsDoc(fsDocId(lvl.id)), (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        if (d && typeof d.name === "string" && typeof d.score === "number") {
          state.onlineBest[lvl.id] = { name: d.name, score: d.score };
          buildLevelGrid();
        }
      });
    });
  }

  // ============================================================
  // UI build
  // ============================================================
  function buildModeTiles() {
    const wrap = $("#modeTiles");
    wrap.innerHTML = `
      <div class="tile" id="onlyPracticeTile">
        <div class="tile-title">
          <span>Connectors</span>
          <span class="tile-tag">Practice</span>
        </div>
        <div class="tile-desc">10 questions • +30s per mistake • unlock by time</div>
        <div class="tile-cta">Play →</div>
      </div>
    `;
    $("#onlyPracticeTile").addEventListener("click", openSetup);

    $("#pillMode").textContent = "Game: Connectors";
  }

  function onlineLine(levelId) {
    const b = state.onlineBest[levelId];
    if (!b) return fb.enabled ? "—" : "<i>(online off)</i>";
    return `<b>${escapeHTML(b.name)}</b> — ${fmt(b.score)}`;
  }

  function buildLevelGrid() {
    const grid = $("#levelGrid");
    grid.innerHTML = "";
    const unlockedMax = getUnlockedMax();

    LEVELS.forEach(lvl => {
      const locked = lvl.id > unlockedMax;
      const threshold = UNLOCK_BY_LEVEL[lvl.id];
      const pb = getPB(lvl.id);

      const btn = document.createElement("button");
      btn.className = "levelbtn" + (locked ? " locked" : "");
      btn.innerHTML = `
        <div class="level-top">
          <div class="level-name">Level ${lvl.id}</div>
          <div class="level-diff">${lvl.diff}</div>
        </div>

        <div class="level-best publicbest">
          Class Best: ${onlineLine(lvl.id)}
        </div>

        <div class="level-best">Your best: ${pb == null ? "—" : fmt(pb)}</div>

        <div class="lockline">
          ${locked ? `Locked • unlock: ≤ ${threshold}s (prev level)` : "Unlocked"}
        </div>
      `;

      btn.addEventListener("click", () => {
        if (locked) {
          alert(`Level ${lvl.id} is locked.\nUnlock it by beating Level ${lvl.id - 1} in ≤ ${threshold}s.`);
          return;
        }
        state.levelId = lvl.id;
        openSetup();
      });

      grid.appendChild(btn);
    });
  }

  function openSetup() {
    $("#setupTitle").textContent = `Connectors — Level ${state.levelId}`;
    $("#setupSub").textContent = "Enter your name (optional). Score saves only after you finish.";
    $("#rowDuelNames").classList.add("hidden");
    $("#rowSoloName").classList.remove("hidden");

    const picker = $("#setupLevelPicker");
    picker.innerHTML = "";
    const unlockedMax = getUnlockedMax();

    LEVELS.forEach(l => {
      const locked = l.id > unlockedMax;
      const b = document.createElement("button");
      b.className = "segbtn" + (l.id === state.levelId ? " active" : "");
      b.textContent = `L${l.id}`;
      if (locked) b.classList.add("lockedseg");
      b.addEventListener("click", () => {
        if (locked) {
          const t = UNLOCK_BY_LEVEL[l.id];
          alert(`Level ${l.id} is locked.\nUnlock: beat Level ${l.id - 1} in ≤ ${t}s.`);
          return;
        }
        state.levelId = l.id;
        $$(".segbtn").forEach(x => x.classList.toggle("active", x === b));
        $("#setupTitle").textContent = `Connectors — Level ${state.levelId}`;
      });
      picker.appendChild(b);
    });

    showScreen("setup");
  }

  // ============================================================
  // GAME
  // ============================================================
  function startGame() {
    state.playerName = ($("#soloName").value || "").trim().slice(0, 24);
    state.items = shuffle(SENTENCES[state.levelId].slice());
    state.idx = 0;
    state.selected = null;
    state.penalty = 0;
    state.answers = [];

    $("#badgePlayer").textContent = state.playerName ? `Player: ${state.playerName}` : "Player: —";
    $("#badgeStage").textContent = "Stage: Practice";
    $("#microHint").textContent = "Pick the best connector.";
    $("#qdiff").textContent = LEVELS.find(x => x.id === state.levelId).diff;

    state.t0 = performance.now();
    stopTimer();
    tickTimer();

    renderQ();
    showScreen("game");
    $("#pillLevel").textContent = `Level: ${state.levelId}`;
  }

  function renderQ() {
    const q = state.items[state.idx];
    $("#qcount").textContent = `Q ${state.idx + 1} / 10`;

    $("#prompt").innerHTML = q.text.replace(
      "____",
      "<span style=\"background:rgba(255,255,0,.25);padding:0 6px;border-radius:10px\">____</span>"
    );

    const pool = CONNECTORS[state.levelId];
    const opts = new Set([q.a]);
    while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
    const arr = shuffle(Array.from(opts));

    const wrap = $("#options");
    wrap.innerHTML = "";
    state.selected = null;

    arr.forEach(opt => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => {
        state.selected = opt;
        $$(".opt").forEach(x => x.classList.toggle("selected", x === b));
      });
      wrap.appendChild(b);
    });

    $("#btnNext").textContent = (state.idx === 9) ? "Finish" : "Next";
  }

  function next() {
    const q = state.items[state.idx];
    const chosen = state.selected || "—";
    const ok = chosen.toLowerCase() === q.a.toLowerCase();
    if (!ok) state.penalty += 30;

    state.answers.push({ q: q.text, chosen, correct: q.a, ok, why: q.why });
    state.idx++;

    if (state.idx >= 10) finish();
    else renderQ();
  }

  async function finish() {
    stopTimer();
    const raw = (performance.now() - state.t0) / 1000;
    const total = raw + state.penalty;
    const mistakes = state.answers.filter(a => !a.ok).length;

    // Save PB
    const prev = getPB(state.levelId);
    const newPB = (prev == null || total < prev);
    if (newPB) setPB(state.levelId, total);

    // Unlock next (FIXED + FORCED)
    const nextLevel = state.levelId + 1;
    let unlockedMsg = "";
    if (nextLevel <= 10) {
      const need = UNLOCK_BY_LEVEL[nextLevel];
      if (total <= need) {
        setUnlockedMax(nextLevel); // this now always increases correctly
        unlockedMsg = `✅ <b>Unlocked Level ${nextLevel}!</b> (≤ ${need}s)`;
      } else {
        unlockedMsg = `🔒 Next unlock: Level ${nextLevel} requires ≤ <b>${need}s</b>`;
      }
    } else {
      unlockedMsg = "🏁 Final level completed!";
    }

    // Online class best (optional)
    let onlineMsg = "";
    if (fb.enabled && state.playerName) {
      const improved = await maybeWriteLowerScore(state.levelId, state.playerName, total);
      onlineMsg = improved ? "🌍 <b>New Class Best!</b>" : "";
    } else if (!fb.enabled) {
      onlineMsg = "<i>(Online off — add Firebase config to enable class best across devices.)</i>";
    }

    // RESULTS (feedback guaranteed)
    $("#resultsTitle").textContent = `Level ${state.levelId} — Results`;
    $("#resultsSub").innerHTML =
      `Base: <b>${fmt(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b><br>${unlockedMsg}<br>${onlineMsg}`;

    $("#scoreBig").textContent = fmt(total);
    $("#scoreMeta").textContent = state.playerName ? `Player: ${escapeHTML(state.playerName)} ${newPB ? "• 🏅 New PB!" : ""}` : "";

    // Detailed feedback list
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
        <div class="feedsub">${a.why || ""}</div>
      `;
      fbWrap.appendChild(div);
    });

    // Ensure results are visible and positioned
    showScreen("results");
    requestAnimationFrame(() => {
      $("#screenResults").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // Refresh grids
    buildLevelGrid();
  }

  // ============================================================
  // Misc + helpers
  // ============================================================
  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  function wireButtons() {
    $("#btnBackHome1").textContent = "Back";
    $("#btnBackHome2").textContent = "Back";
    $("#btnQuit").textContent = "Quit";
    $("#btnStart").textContent = "Start";
    $("#btnPlayAgain").textContent = "Play again";

    $("#btnBackHome1").addEventListener("click", () => showScreen("home"));
    $("#btnBackHome2").addEventListener("click", () => showScreen("home"));
    $("#btnQuit").addEventListener("click", () => { stopTimer(); showScreen("home"); });

    $("#btnStart").addEventListener("click", startGame);
    $("#btnNext").addEventListener("click", next);
    $("#btnPlayAgain").addEventListener("click", () => openSetup());

    $("#btnResetAll").addEventListener("click", () => {
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith("TA_")) localStorage.removeItem(k);
      });
      localStorage.removeItem(KEY.unlockedMax);
      setUnlockedMax(1);
      buildLevelGrid();
      alert("Local progress reset on this device.");
    });
  }

  function buildHomeHeader() {
    $("#pillMode").textContent = "Game: Connectors";
    $("#pillLevel").textContent = "Level: —";
  }

  async function init() {
    assertDOM();
    cacheScreens();
    buildHomeHeader();
    buildModeTiles();

    // init unlock storage
    const n = Number(localStorage.getItem(KEY.unlockedMax));
    if (!Number.isFinite(n)) setUnlockedMax(1);

    // online (optional)
    await initFirebaseIfConfigured();
    if (fb.enabled) attachOnlineListeners();

    buildLevelGrid();
    wireButtons();
    showScreen("home");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
