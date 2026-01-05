// Turbo Arcade — SIMPLE WORKING GAME (Practice only)
// ✅ 10 levels, 10 Q each
// ✅ 30s penalty per mistake
// ✅ Local PB per level
// ✅ Locked levels + unlock by time thresholds
// ✅ Results + feedback
//
// No Firebase. No modes. Just works on GitHub Pages.

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---- expected IDs (matches your existing arcade layout)
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
      alert("Missing elements in index.html:\n" + missing.join("\n"));
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

  // ---- levels + unlock thresholds (Turbo style)
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

  // ---- connectors pool per level
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

  // ---- 10 Q per level
  const SENTENCES = {
    1: [
      { text: "Quiero té ____ café.", a: "o" },
      { text: "Tengo un lápiz ____ un bolígrafo.", a: "y" },
      { text: "Estudio, ____ estoy cansado.", a: "pero" },
      { text: "Es simpático ____ divertido.", a: "y" },
      { text: "¿Quieres ir ____ quedarte en casa?", a: "o" },
      { text: "Me gusta el fútbol, ____ prefiero el baloncesto.", a: "pero" },
      { text: "Trabajo ____ estudio por las tardes.", a: "y" },
      { text: "Podemos caminar ____ tomar el bus.", a: "o" },
      { text: "Quiero salir, ____ está lloviendo.", a: "pero" },
      { text: "Compro pan ____ leche.", a: "y" },
    ],
    2: [
      { text: "No salgo ____ tengo deberes.", a: "porque" },
      { text: "Voy al cine; ____ voy a cenar.", a: "también" },
      { text: "Quiero estudiar; ____ quiero practicar.", a: "además" },
      { text: "Lo hago ____ prisa.", a: "sin" },
      { text: "Estoy feliz ____ es viernes.", a: "porque" },
      { text: "Ella canta; ____ baila.", a: "también" },
      { text: "Es caro; ____ es buenísimo.", a: "además" },
      { text: "Salimos ____ dinero.", a: "sin" },
      { text: "No lo compro ____ no lo necesito.", a: "porque" },
      { text: "Tengo hambre; ____ estoy cansado.", a: "además" },
    ],
    3: [
      { text: "Terminé la tarea; ____ puedo descansar.", a: "entonces" },
      { text: "Está nublado, ____ no vamos a la playa.", a: "así que" },
      { text: "Perdí el bus; ____ llegué tarde.", a: "por eso" },
      { text: "Comimos y ____ fuimos al parque.", a: "luego" },
      { text: "No estudió, ____ suspendió.", a: "por eso" },
      { text: "Estaba enfermo, ____ se quedó en casa.", a: "así que" },
      { text: "No tengo clase; ____ voy a entrenar.", a: "entonces" },
      { text: "Hicimos la compra y ____ cocinamos.", a: "luego" },
      { text: "No había sitio; ____ cambiamos de plan.", a: "entonces" },
      { text: "Quería dormir; ____ apagué el móvil.", a: "así que" },
    ],
    4: [
      { text: "Quiero ir; ____ está lloviendo.", a: "sin embargo" },
      { text: "Yo estudio; mi hermano, ____ , juega.", a: "en cambio" },
      { text: "No es caro, ____ barato.", a: "sino" },
      { text: "Voy, ____ no tengo tiempo.", a: "aunque" },
      { text: "Me gusta; ____ prefiero otro.", a: "sin embargo" },
      { text: "Yo voy en bus; tú, ____ , vas andando.", a: "en cambio" },
      { text: "No quiero té, ____ café.", a: "sino" },
      { text: "Salgo ____ esté cansado.", a: "aunque" },
      { text: "Es difícil; ____ lo intento.", a: "sin embargo" },
      { text: "No es feo, ____ raro.", a: "sino" },
    ],
    5: [
      { text: "Te llamo ____ llegue a casa.", a: "cuando" },
      { text: "Leo ____ como.", a: "mientras" },
      { text: "____ salir, termino la tarea.", a: "antes de" },
      { text: "____ cenar, vemos una serie.", a: "después de" },
      { text: "Me ducho ____ entrenar.", a: "después de" },
      { text: "____ dormir, apago la luz.", a: "antes de" },
      { text: "Voy al parque ____ hace sol.", a: "cuando" },
      { text: "Escucho música ____ estudio.", a: "mientras" },
      { text: "____ comer, lavo las manos.", a: "antes de" },
      { text: "____ clase, entrenamos.", a: "después de" },
    ],
    6: [
      { text: "No voy ____ estoy enfermo.", a: "ya que" },
      { text: "No salimos ____ llueve.", a: "puesto que" },
      { text: "Lo intento ____ el problema.", a: "a pesar de" },
      { text: "Estudio; ____ saco mejores notas.", a: "por lo tanto" },
      { text: "Me quedo en casa ____ no hay tiempo.", a: "ya que" },
      { text: "No lo hago ____ es peligroso.", a: "puesto que" },
      { text: "Voy ____ el cansancio.", a: "a pesar de" },
      { text: "Estoy preparado; ____ no tengo miedo.", a: "por lo tanto" },
      { text: "No me gusta; ____ lo respeto.", a: "a pesar de" },
      { text: "No estudió; ____ suspendió.", a: "por lo tanto" },
    ],
    7: [
      { text: "____ , el plan es bueno.", a: "sin duda" },
      { text: "____ , es útil; ____ , es caro.", a: "por un lado" },
      { text: "____ , es útil; ____ , es caro.", a: "por otro lado" },
      { text: "Quería ir; ____ no tenía tiempo.", a: "no obstante" },
      { text: "Está lejos; ____ lo hacemos.", a: "no obstante" },
      { text: "____ , vale la pena.", a: "sin duda" },
      { text: "____ , es divertido; ____ , es cansado.", a: "por un lado" },
      { text: "____ , es divertido; ____ , es cansado.", a: "por otro lado" },
      { text: "Me dolía la pierna; ____ seguí.", a: "no obstante" },
      { text: "____ , lo haré.", a: "sin duda" },
    ],
    8: [
      { text: "Voy contigo ____ me esperes.", a: "con tal de que" },
      { text: "Iré ____ termine pronto.", a: "siempre que" },
      { text: "No salgo ____ llueva.", a: "a menos que" },
      { text: "Estaba tranquilo y ____ empezó a gritar.", a: "de repente" },
      { text: "Te ayudo ____ tú también ayudes.", a: "con tal de que" },
      { text: "Salimos ____ no haya exámenes.", a: "siempre que" },
      { text: "No lo hago ____ sea obligatorio.", a: "a menos que" },
      { text: "Íbamos bien y ____ todo cambió.", a: "de repente" },
      { text: "Lo compro ____ sea barato.", a: "siempre que" },
      { text: "No voy ____ me llamen.", a: "a menos que" },
    ],
    9: [
      { text: "Hablo claro ____ entiendas.", a: "de modo que" },
      { text: "Lo repito ____ no haya dudas.", a: "de manera que" },
      { text: "Trabajo ____ ahorrar dinero.", a: "a fin de" },
      { text: "No estudió; ____ suspendió.", a: "consecuentemente" },
      { text: "Hice un resumen ____ fuera más fácil.", a: "de modo que" },
      { text: "Organicé el texto ____ se entendiera.", a: "de manera que" },
      { text: "Entreno ____ mejorar.", a: "a fin de" },
      { text: "Hubo retrasos; ____ llegamos tarde.", a: "consecuentemente" },
      { text: "Habla despacio ____ la sigan.", a: "de modo que" },
      { text: "Reduje el ruido ____ se oyera.", a: "de manera que" },
    ],
    10: [
      { text: "____ lo que dijiste, tienes razón.", a: "en cuanto" },
      { text: "No fui ____ estaba enfermo.", a: "dado que" },
      { text: "Es caro; ____ lo compro.", a: "aun así" },
      { text: "Mejoro ____ practico.", a: "a medida que" },
      { text: "____ el plan, me gusta.", a: "en cuanto" },
      { text: "No salgo ____ no tengo tiempo.", a: "dado que" },
      { text: "No está perfecto; ____ funciona.", a: "aun así" },
      { text: "Aprendo ____ leo más.", a: "a medida que" },
      { text: "____ el examen, estoy listo.", a: "en cuanto" },
      { text: "No vino ____ llovía.", a: "dado que" },
    ],
  };

  // ---- local keys
  const KEY = {
    unlockedMax: "TA_unlockMax_simple_v1",
    pb: (levelId) => `TA_PB_simple_v1_L${levelId}`,
  };

  function fmt(sec) {
    return `${(Math.round(sec * 10) / 10).toFixed(1)}s`;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function getUnlockedMax() {
    const n = Number(localStorage.getItem(KEY.unlockedMax));
    return Number.isFinite(n) ? n : 1;
  }
  function setUnlockedMax(n) {
    localStorage.setItem(KEY.unlockedMax, String(n));
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

  // ---- build arcade "mode" tiles: just one
  function buildModeTiles() {
    const wrap = $("#modeTiles");
    wrap.innerHTML = `
      <div class="tile" id="onlyPracticeTile">
        <div class="tile-title">
          <span>Connectors</span>
          <span class="tile-tag">Practice</span>
        </div>
        <div class="tile-desc">10 questions • +30s per mistake • unlock levels by time</div>
        <div class="tile-cta">Play →</div>
      </div>
    `;
    $("#onlyPracticeTile").addEventListener("click", () => {
      openSetup();
    });

    $("#pillMode").textContent = "Game: Connectors";
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
    $("#setupSub").textContent = "Enter your name (optional). Your score saves only after you finish.";
    $("#rowDuelNames").classList.add("hidden");
    $("#rowSoloName").classList.remove("hidden");

    // Build level picker
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
    const ok = (chosen.toLowerCase() === q.a.toLowerCase());
    if (!ok) state.penalty += 30;

    state.answers.push({ q: q.text, chosen, correct: q.a, ok });
    state.idx++;

    if (state.idx >= 10) finish();
    else renderQ();
  }

  function finish() {
    stopTimer();
    const raw = (performance.now() - state.t0) / 1000;
    const total = raw + state.penalty;
    const mistakes = state.answers.filter(a => !a.ok).length;

    $("#resultsTitle").textContent = `Level ${state.levelId} — Results`;
    $("#resultsSub").innerHTML = `Base: <b>${fmt(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b>`;
    $("#scoreBig").textContent = fmt(total);
    $("#scoreMeta").textContent = state.playerName ? `Player: ${state.playerName}` : "";

    // Save PB
    const prev = getPB(state.levelId);
    if (prev == null || total < prev) setPB(state.levelId, total);

    // Unlock next
    const nextLevel = state.levelId + 1;
    if (nextLevel <= 10) {
      const need = UNLOCK_BY_LEVEL[nextLevel];
      const unlockedMax = getUnlockedMax();
      if (nextLevel > unlockedMax && total <= need) setUnlockedMax(nextLevel);
    }

    // Feedback
    const fb = $("#feedback");
    fb.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "feeditem";
      div.innerHTML = `
        <div class="feedtop">
          <div class="feedq">Q${i + 1}</div>
          <div class="${a.ok ? "feedok" : "feedbad"}">${a.ok ? "✓" : "✗ +30s"}</div>
        </div>
        <div class="feedsub"><b>Sentence:</b> ${a.q.replace("____", "<b>____</b>")}</div>
        <div class="feedsub"><b>Your answer:</b> ${a.chosen} • <b>Correct:</b> ${a.correct}</div>
      `;
      fb.appendChild(div);
    });

    buildLevelGrid();
    showScreen("results");
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
      setUnlockedMax(1);
      buildLevelGrid();
      alert("Local progress reset on this device.");
    });
  }

  function init() {
    assertDOM();
    cacheScreens();
    buildModeTiles();

    // init unlock storage
    const n = Number(localStorage.getItem(KEY.unlockedMax));
    if (!Number.isFinite(n)) setUnlockedMax(1);

    $("#pillLevel").textContent = "Level: —";
    buildLevelGrid();
    wireButtons();
    showScreen("home");
  }

  window.addEventListener("DOMContentLoaded", init);
})();
