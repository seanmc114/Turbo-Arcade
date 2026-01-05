// Turbo Arcade — single-file app (engine + modes)
// Mechanics kept consistent: 10 questions/level, time score, +30s penalty per mistake, feedback screen.
// Practice mode always available and records local best.
// After first Practice, default tile switches to Duel for novelty.
//
// NOTE: All storage is localStorage (device-based).

(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // -----------------------------
  // Data: 10 levels of Spanish connecting words (conjunctions/connectors)
  // Difficulty ramps from very easy to quite difficult
  // Prompts are "fill the blank" with 4 options (MCQ).
  // -----------------------------

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

  // Connector pools per level (used to generate MCQ options + relevant sentences)
  // Keep accents (además, también, aún/aunque not used; no obstante, etc.)
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

  // Sentence templates per level: each item = { text, answer, explain }
  // The blank is shown as "____".
  const SENTENCES = {
    1: [
      { text: "Quiero té ____ café.", answer: "o", explain: "Use <b>o</b> for 'or' (choice)." },
      { text: "Tengo un lápiz ____ un bolígrafo.", answer: "y", explain: "Use <b>y</b> for 'and' (adding)." },
      { text: "Estudio, ____ estoy cansado.", answer: "pero", explain: "Use <b>pero</b> for 'but' (contrast)." },
      { text: "Es simpático ____ divertido.", answer: "y", explain: "Adding another idea → <b>y</b>." },
      { text: "¿Quieres ir ____ quedarte en casa?", answer: "o", explain: "Choice between two options → <b>o</b>." },
      { text: "Me gusta el fútbol, ____ prefiero el baloncesto.", answer: "pero", explain: "Contrast preference → <b>pero</b>." },
      { text: "Trabajo ____ estudio por las tardes.", answer: "y", explain: "Two actions → <b>y</b>." },
      { text: "Podemos caminar ____ tomar el bus.", answer: "o", explain: "Alternative options → <b>o</b>." },
      { text: "Quiero salir, ____ está lloviendo.", answer: "pero", explain: "Contrast with situation → <b>pero</b>." },
      { text: "Compro pan ____ leche.", answer: "y", explain: "List items → <b>y</b>." },
    ],
    2: [
      { text: "No salgo ____ tengo deberes.", answer: "porque", explain: "Reason/cause → <b>porque</b>." },
      { text: "Voy al cine; ____ voy a cenar.", answer: "también", explain: "Adding 'also' → <b>también</b>." },
      { text: "Quiero estudiar; ____ quiero practicar.", answer: "además", explain: "Adding extra point → <b>además</b>." },
      { text: "Lo hago ____ prisa.", answer: "sin", explain: "Without something → <b>sin</b>." },
      { text: "Estoy feliz ____ es viernes.", answer: "porque", explain: "Cause → <b>porque</b>." },
      { text: "Ella canta y baila; ____ actúa.", answer: "también", explain: "She does another thing too → <b>también</b>." },
      { text: "Es caro; ____ es buenísimo.", answer: "además", explain: "Extra emphasis → <b>además</b>." },
      { text: "Salimos ____ dinero.", answer: "sin", explain: "Without money → <b>sin</b>." },
      { text: "No lo compro ____ no lo necesito.", answer: "porque", explain: "Reason → <b>porque</b>." },
      { text: "Tengo hambre y sed; ____ estoy cansado.", answer: "además", explain: "Plus one more thing → <b>además</b>." },
    ],
    3: [
      { text: "Terminé la tarea; ____ puedo descansar.", answer: "entonces", explain: "Result/next step → <b>entonces</b>." },
      { text: "Está nublado, ____ no vamos a la playa.", answer: "así que", explain: "So / result → <b>así que</b>." },
      { text: "Perdí el bus; ____ llegué tarde.", answer: "por eso", explain: "That's why → <b>por eso</b>." },
      { text: "Comimos y ____ fuimos al parque.", answer: "luego", explain: "Then / afterwards → <b>luego</b>." },
      { text: "No estudió, ____ suspendió.", answer: "por eso", explain: "Cause→effect chain → <b>por eso</b>." },
      { text: "Estaba enfermo, ____ se quedó en casa.", answer: "así que", explain: "Result → <b>así que</b>." },
      { text: "No tengo clase; ____ voy a entrenar.", answer: "entonces", explain: "So, next action → <b>entonces</b>." },
      { text: "Hicimos la compra y ____ cocinamos.", answer: "luego", explain: "After that → <b>luego</b>." },
      { text: "No había sitio; ____ cambiamos de plan.", answer: "entonces", explain: "So we changed plans → <b>entonces</b>." },
      { text: "Quería dormir; ____ apagué el móvil.", answer: "así que", explain: "So I turned it off → <b>así que</b>." },
    ],
    4: [
      { text: "Quiero ir; ____ está lloviendo.", answer: "sin embargo", explain: "However → <b>sin embargo</b>." },
      { text: "Estudia mucho; ____ saca buenas notas.", answer: "en cambio", explain: "Contrast between people/things → <b>en cambio</b>." },
      { text: "No es caro, ____ barato.", answer: "sino", explain: "Not X but rather Y → <b>sino</b>." },
      { text: "Voy, ____ no tengo tiempo.", answer: "aunque", explain: "Even though → <b>aunque</b>." },
      { text: "Me gusta; ____ prefiero otro.", answer: "sin embargo", explain: "Contrast preference with 'however' → <b>sin embargo</b>." },
      { text: "Yo estudio; mi hermano, ____ , juega.", answer: "en cambio", explain: "In contrast → <b>en cambio</b>." },
      { text: "No quiero té, ____ café.", answer: "sino", explain: "Correcting the negative choice → <b>sino</b>." },
      { text: "Salgo ____ esté cansado.", answer: "aunque", explain: "Even though I'm tired → <b>aunque</b>." },
      { text: "Es difícil; ____ lo intento.", answer: "sin embargo", explain: "However, I try → <b>sin embargo</b>." },
      { text: "Yo voy en bus; tú, ____ , vas andando.", answer: "en cambio", explain: "Contrast methods → <b>en cambio</b>." },
    ],
    5: [
      { text: "Te llamo ____ llegue a casa.", answer: "cuando", explain: "Time clause: when → <b>cuando</b>." },
      { text: "Leo ____ como.", answer: "mientras", explain: "Simultaneous actions → <b>mientras</b>." },
      { text: "____ salir, termino la tarea.", answer: "antes de", explain: "Before doing → <b>antes de</b>." },
      { text: "____ cenar, vemos una serie.", answer: "después de", explain: "After doing → <b>después de</b>." },
      { text: "Me ducho ____ entrenar.", answer: "después de", explain: "After training → <b>después de</b>." },
      { text: "____ dormir, apago la luz.", answer: "antes de", explain: "Before sleeping → <b>antes de</b>." },
      { text: "Voy al parque ____ hace sol.", answer: "cuando", explain: "When it's sunny → <b>cuando</b>." },
      { text: "Escucho música ____ estudio.", answer: "mientras", explain: "While I study → <b>mientras</b>." },
      { text: "____ comer, lavo las manos.", answer: "antes de", explain: "Before eating → <b>antes de</b>." },
      { text: "____ clase, entrenamos.", answer: "después de", explain: "After class → <b>después de</b>." },
    ],
    6: [
      { text: "No voy ____ estoy enfermo.", answer: "ya que", explain: "Since / because → <b>ya que</b>." },
      { text: "No salimos ____ llueve.", answer: "puesto que", explain: "Since / given that → <b>puesto que</b>." },
      { text: "Lo intento ____ el problema.", answer: "a pesar de", explain: "Despite → <b>a pesar de</b>." },
      { text: "Estudio; ____ saco mejores notas.", answer: "por lo tanto", explain: "Therefore → <b>por lo tanto</b>." },
      { text: "Me quedo en casa, ____ no hay tiempo.", answer: "ya que", explain: "Reason → <b>ya que</b>." },
      { text: "No lo hago ____ es peligroso.", answer: "puesto que", explain: "Reason framing → <b>puesto que</b>." },
      { text: "Voy ____ el cansancio.", answer: "a pesar de", explain: "Despite tiredness → <b>a pesar de</b>." },
      { text: "Estoy preparado; ____ no tengo miedo.", answer: "por lo tanto", explain: "Therefore → <b>por lo tanto</b>." },
      { text: "No me gusta, ____ lo respeto.", answer: "a pesar de", explain: "Despite that → <b>a pesar de</b>." },
      { text: "No estudió; ____ suspendió.", answer: "por lo tanto", explain: "Logical conclusion → <b>por lo tanto</b>." },
    ],
    7: [
      { text: "Es tarde; ____ , vamos.", answer: "sin duda", explain: "Emphasis: without doubt → <b>sin duda</b>." },
      { text: "____ , es útil; ____ , es caro.", answer: "por un lado", explain: "Two-sided argument → <b>por un lado</b> / por otro lado." },
      { text: "____ , es útil; ____ , es caro.", answer: "por otro lado", explain: "Second part of the contrast → <b>por otro lado</b>." },
      { text: "Quería ir; ____ no tenía tiempo.", answer: "no obstante", explain: "Nevertheless → <b>no obstante</b>." },
      { text: "Está lejos; ____ lo hacemos.", answer: "no obstante", explain: "Nevertheless we do it → <b>no obstante</b>." },
      { text: "____ , el plan es bueno.", answer: "sin duda", explain: "No doubt, the plan is good → <b>sin duda</b>." },
      { text: "____ , es divertido; ____ , es cansado.", answer: "por un lado", explain: "First side → <b>por un lado</b>." },
      { text: "____ , es divertido; ____ , es cansado.", answer: "por otro lado", explain: "Second side → <b>por otro lado</b>." },
      { text: "Me dolía la pierna; ____ seguí.", answer: "no obstante", explain: "Nevertheless I continued → <b>no obstante</b>." },
      { text: "____ , vale la pena.", answer: "sin duda", explain: "Emphasis → <b>sin duda</b>." },
    ],
    8: [
      { text: "Voy contigo ____ me esperes.", answer: "con tal de que", explain: "On condition that → <b>con tal de que</b>." },
      { text: "Iré ____ termine pronto.", answer: "siempre que", explain: "Provided that → <b>siempre que</b>." },
      { text: "No salgo ____ llueva.", answer: "a menos que", explain: "Unless → <b>a menos que</b>." },
      { text: "Estaba tranquilo y ____ empezó a gritar.", answer: "de repente", explain: "Suddenly → <b>de repente</b>." },
      { text: "Te ayudo ____ tú también ayudes.", answer: "con tal de que", explain: "Condition → <b>con tal de que</b>." },
      { text: "Salimos ____ no haya exámenes.", answer: "siempre que", explain: "Condition → <b>siempre que</b>." },
      { text: "No lo hago ____ sea obligatorio.", answer: "a menos que", explain: "Unless it's mandatory → <b>a menos que</b>." },
      { text: "Íbamos bien y ____ todo cambió.", answer: "de repente", explain: "Suddenly → <b>de repente</b>." },
      { text: "Lo compro ____ sea barato.", answer: "siempre que", explain: "Provided it’s cheap → <b>siempre que</b>." },
      { text: "No voy ____ me llamen.", answer: "a menos que", explain: "Unless they call me → <b>a menos que</b>." },
    ],
    9: [
      { text: "Hablo claro ____ entiendas.", answer: "de modo que", explain: "So that / in such a way that → <b>de modo que</b>." },
      { text: "Lo repito ____ no haya dudas.", answer: "de manera que", explain: "So that (slightly formal) → <b>de manera que</b>." },
      { text: "Trabajo ____ ahorrar dinero.", answer: "a fin de", explain: "In order to → <b>a fin de</b>." },
      { text: "No estudió; ____ suspendió.", answer: "consecuentemente", explain: "Consequently → <b>consecuentemente</b>." },
      { text: "Hice un resumen ____ fuera más fácil.", answer: "de modo que", explain: "So that it was easier → <b>de modo que</b>." },
      { text: "Organicé el texto ____ se entendiera.", answer: "de manera que", explain: "So that it would be understood → <b>de manera que</b>." },
      { text: "Entreno ____ mejorar.", answer: "a fin de", explain: "In order to improve → <b>a fin de</b>." },
      { text: "Hubo retrasos; ____ llegamos tarde.", answer: "consecuentemente", explain: "Consequently → <b>consecuentemente</b>." },
      { text: "Habla despacio ____ la sigan.", answer: "de modo que", explain: "So that they follow her → <b>de modo que</b>." },
      { text: "Reduje el ruido ____ se oyera.", answer: "de manera que", explain: "So that it could be heard → <b>de manera que</b>." },
    ],
    10: [
      { text: "____ lo que dijiste, tienes razón.", answer: "en cuanto", explain: "Regarding / as for → <b>en cuanto</b>." },
      { text: "No fui ____ estaba enfermo.", answer: "dado que", explain: "Given that → <b>dado que</b>." },
      { text: "Es caro; ____ lo compro.", answer: "aun así", explain: "Even so → <b>aun así</b>." },
      { text: "Mejoro ____ practico.", answer: "a medida que", explain: "As / as I practice → <b>a medida que</b>." },
      { text: "____ el plan, me gusta.", answer: "en cuanto", explain: "As for the plan → <b>en cuanto</b>." },
      { text: "No salgo ____ no tengo tiempo.", answer: "dado que", explain: "Given that I don’t have time → <b>dado que</b>." },
      { text: "No está perfecto; ____ funciona.", answer: "aun así", explain: "Even so, it works → <b>aun así</b>." },
      { text: "Aprendo ____ leo más.", answer: "a medida que", explain: "As I read more → <b>a medida que</b>." },
      { text: "____ el examen, estoy listo.", answer: "en cuanto", explain: "As for the exam → <b>en cuanto</b>." },
      { text: "No vino ____ llovía.", answer: "dado que", explain: "Given that it was raining → <b>dado que</b>." },
    ]
  };

  // -----------------------------
  // Modes
  // -----------------------------
  const MODES = [
    {
      id: "practice",
      title: "Practice",
      tag: "PB saver",
      desc: "The classic Turbo format. 10 questions. Records your personal best per level.",
      kind: "classic",
      usesChampion: false,
      usesDuel: false
    },
    {
      id: "duel",
      title: "Turbo Duel",
      tag: "Head-to-head",
      desc: "Player A vs Player B. Same questions. Winner can become the level champion.",
      kind: "duel",
      usesChampion: true,
      usesDuel: true
    },
    {
      id: "pressure",
      title: "Pressure Cooker",
      tag: "Survival",
      desc: "Timer is your life. Correct = +3s. Wrong = −30s. How many can you survive?",
      kind: "pressure",
      usesChampion: false,
      usesDuel: false
    },
    {
      id: "tower",
      title: "Champion Tower",
      tag: "Dethrone",
      desc: "Beat the champion time to take the crown. Buttons show the reigning champ.",
      kind: "tower",
      usesChampion: true,
      usesDuel: false
    },
    {
      id: "heist",
      title: "Language Heist",
      tag: "Mission",
      desc: "Same scoring, but staged like a mission for variety. Great for a 'new feel'.",
      kind: "heist",
      usesChampion: false,
      usesDuel: false
    },
  ];

  // -----------------------------
  // Storage keys
  // -----------------------------
  const K = {
    practicedOnce: "ta_practiced_once_v1",
    best: (modeId, levelId, player) => `ta_best_v1::${modeId}::L${levelId}::${player}`,
    champ: (modeId, levelId) => `ta_champ_v1::${modeId}::L${levelId}`,
    lastMode: "ta_last_mode_v1",
    lastLevel: "ta_last_level_v1",
  };

  // Helpers
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => performance.now();

  const normName = (s) => (s || "").trim().replace(/\s+/g, " ").slice(0, 24);
  const normAnswer = (s) => (s || "").trim().toLowerCase(); // case-insensitive; accents preserved

  const fmtSeconds = (sec) => {
    const v = Math.round(sec * 10) / 10;
    return `${v.toFixed(1)}s`;
  };

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  // -----------------------------
  // UI State
  // -----------------------------
  const state = {
    modeId: null,
    levelId: 1,

    // session state
    player: null,
    playerA: null,
    playerB: null,
    duelStep: null, // "A" | "B" | "SUMMARY"

    seed: null,
    items: [],
    idx: 0,
    selected: null,
    answers: [],
    penalty: 0,

    // timing
    t0: null,
    raf: null,

    // pressure mode
    pressureTimeLeft: 90,
    pressureCorrect: 0,
    pressureTotalAsked: 0,
  };

  // -----------------------------
  // Screens
  // -----------------------------
  const screens = {
    home: $("#screenHome"),
    setup: $("#screenSetup"),
    game: $("#screenGame"),
    results: $("#screenResults"),
    duel: $("#screenDuel"),
  };

  function showScreen(which) {
    Object.entries(screens).forEach(([k, el]) => {
      el.classList.toggle("hidden", k !== which);
    });
  }

  // Status pills
  function updatePills() {
    const mode = MODES.find(m => m.id === state.modeId);
    $("#pillMode").textContent = `Mode: ${mode ? mode.title : "—"}`;
    const lvl = LEVELS.find(l => l.id === state.levelId);
    $("#pillLevel").textContent = `Level: ${lvl ? `${lvl.id} (${lvl.diff})` : "—"}`;
  }

  // -----------------------------
  // Arcade UI build
  // -----------------------------
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
        $$(".tile").forEach(t => t.classList.toggle("active", t.dataset.mode === m.id));
      });
      wrap.appendChild(div);
    }
  }

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

  function getBest(modeId, levelId, player) {
    const raw = localStorage.getItem(K.best(modeId, levelId, player));
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function setBest(modeId, levelId, player, score) {
    localStorage.setItem(K.best(modeId, levelId, player), String(score));
  }

  function buildLevelGrid() {
    const grid = $("#levelGrid");
    grid.innerHTML = "";

    for (const lvl of LEVELS) {
      const btn = document.createElement("button");
      btn.className = "levelbtn";
      btn.dataset.level = String(lvl.id);

      const mode = MODES.find(m => m.id === state.modeId) || MODES[0];
      const champ = mode.usesChampion ? getChampion(state.modeId, lvl.id) : null;

      // We don't know the player name yet; show best for last used player only after playing.
      const bestNote = "Your best: —";

      btn.innerHTML = `
        <div class="level-top">
          <div class="level-name">${lvl.name}</div>
          <div class="level-diff">${lvl.diff}</div>
        </div>
        <div class="level-champ">${mode.usesChampion ? (champ ? `Champion: <b>${escapeHTML(champ.name)}</b> — ${fmtSeconds(champ.score)}` : `Champion: <b>—</b>`) : `Champion: <b>—</b>`}</div>
        <div class="level-best" id="bestLine-${lvl.id}">${bestNote}</div>
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

  function refreshBestLinesForPlayer(player) {
    const modeId = state.modeId;
    for (const lvl of LEVELS) {
      const best = player ? getBest(modeId, lvl.id, player) : null;
      const el = $(`#bestLine-${lvl.id}`);
      if (el) el.textContent = `Your best: ${best == null ? "—" : fmtSeconds(best)}`;
    }
  }

  function refreshChampionLines() {
    // Rebuild grid to update champions per level
    buildLevelGrid();
  }

  function escapeHTML(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  // -----------------------------
  // Defaults
  // -----------------------------
  function pickDefaultMode() {
    // If they haven't practiced yet, default to Practice.
    const practiced = localStorage.getItem(K.practicedOnce) === "1";
    if (!practiced) return "practice";
    // After practice, default to Duel (novel).
    return "duel";
  }

  function setMode(modeId) {
    state.modeId = modeId;
    localStorage.setItem(K.lastMode, modeId);
    updatePills();
    buildLevelGrid();
  }

  function restoreDefaults() {
    const lastMode = localStorage.getItem(K.lastMode);
    const lastLevel = Number(localStorage.getItem(K.lastLevel));
    const mode = lastMode && MODES.some(m => m.id === lastMode) ? lastMode : pickDefaultMode();
    const level = Number.isFinite(lastLevel) && lastLevel >= 1 && lastLevel <= 10 ? lastLevel : 1;
    state.levelId = level;
    setMode(mode);

    // highlight tile
    $$(".tile").forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
    updatePills();
  }

  // -----------------------------
  // Setup screen
  // -----------------------------
  function openSetup() {
    const mode = MODES.find(m => m.id === state.modeId);
    const lvl = LEVELS.find(l => l.id === state.levelId);

    $("#setupTitle").textContent = `${mode.title} — ${lvl.name}`;
    $("#setupSub").textContent = mode.usesDuel
      ? "Enter two names. Player A goes first, then Player B plays the exact same 10 questions."
      : "Enter your name (so your best score is saved) and start.";

    $("#rowDuelNames").classList.toggle("hidden", !mode.usesDuel);
    $("#rowSoloName").classList.toggle("hidden", mode.usesDuel);

    // Level picker (chips)
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

    // Setup notes
    let note = "";
    if (mode.kind === "pressure") note = "Pressure Cooker: starts at 90s. Correct +3s. Wrong −30s. Ends at 0.";
    if (mode.kind === "tower") note = "Champion Tower: beat the champion time (lower is better) to take the crown.";
    if (mode.kind === "heist") note = "Language Heist: staged presentation. Same scoring. Feels like a mission.";
    if (mode.kind === "classic") note = "Practice: focus on improvement — your best is saved per level.";
    if (mode.kind === "duel") note = "Turbo Duel: same question set for both players, then instant winner + champion update.";
    $("#setupNote").textContent = note;

    showScreen("setup");
  }

  // -----------------------------
  // Question generation (seeded)
  // -----------------------------
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
    const pool = SENTENCES[levelId] || [];
    const rnd = mulberry32(seed);
    const idxs = pool.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    const chosen = idxs.slice(0, 10).map(i => pool[i]);
    return chosen;
  }

  function makeOptions(levelId, correct, rnd) {
    const pool = Array.from(new Set([
      ...CONNECTORS[levelId],
      ...Object.values(CONNECTORS).flat()
    ]));

    // Ensure correct included
    const opts = new Set([correct]);
    while (opts.size < 4) {
      const pick = pool[Math.floor(rnd() * pool.length)];
      if (pick && pick !== correct) opts.add(pick);
    }
    const arr = Array.from(opts);
    // shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // -----------------------------
  // Game runner
  // -----------------------------
  function startSessionClassic({ playerName, levelId, modeId, seedOverride = null, staged = false }) {
    state.player = playerName;
    state.levelId = levelId;
    state.modeId = modeId;

    state.seed = seedOverride ?? Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(state.seed);

    state.items = pick10Items(levelId, state.seed).map((it) => ({
      text: it.text,
      answer: it.answer,
      explain: it.explain,
      options: makeOptions(levelId, it.answer, rnd),
    }));

    state.idx = 0;
    state.answers = [];
    state.penalty = 0;
    state.selected = null;

    state.t0 = now();
    cancelAnimationFrame(state.raf);
    tickTimerClassic();

    $("#badgePlayer").textContent = `Player: ${playerName || "—"}`;
    $("#badgeStage").textContent = staged ? "Stage: 1/3" : "Stage: Classic";
    $("#microHint").innerHTML = staged ? "Mission mode: stay sharp. Same scoring." : "Pick the best connector.";

    renderQuestion(staged);
    showScreen("game");
    updatePills();
  }

  function tickTimerClassic() {
    const t = (now() - state.t0) / 1000;
    $("#timer").textContent = fmtSeconds(t);
    $("#penalty").textContent = `+${state.penalty}s`;
    state.raf = requestAnimationFrame(tickTimerClassic);
  }

  function stopTimer() {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }

  function renderQuestion(staged) {
    const lvl = LEVELS.find(l => l.id === state.levelId);
    const q = state.items[state.idx];

    $("#qcount").textContent = `Q ${state.idx + 1} / 10`;
    $("#qdiff").textContent = lvl ? lvl.diff : "";

    if (staged) {
      const stage = state.idx <= 2 ? 1 : (state.idx <= 6 ? 2 : 3);
      $("#badgeStage").textContent = `Stage: ${stage}/3`;
    }

    $("#prompt").innerHTML = q.text.replace("____", "<span style=\"background:rgba(255,255,0,.25);padding:0 6px;border-radius:10px\">____</span>");

    const optsWrap = $("#options");
    optsWrap.innerHTML = "";
    state.selected = null;

    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => {
        state.selected = opt;
        $$(".opt").forEach(x => x.classList.toggle("selected", x === b));
      });
      optsWrap.appendChild(b);
    });

    $("#btnNext").textContent = state.idx === 9 ? "Finish" : "Next";
  }

  function submitAnswerClassic(staged) {
    const q = state.items[state.idx];
    const chosen = state.selected;

    const correct = normAnswer(chosen) === normAnswer(q.answer);
    if (!correct) state.penalty += 30;

    state.answers.push({
      q: q.text,
      chosen: chosen || "—",
      correct: q.answer,
      ok: correct,
      explain: q.explain,
    });

    state.idx += 1;
    if (state.idx >= 10) {
      finishClassic(staged);
      return;
    }
    renderQuestion(staged);
  }

  function finishClassic(staged) {
    stopTimer();
    const raw = (now() - state.t0) / 1000;
    const total = raw + state.penalty;

    // Mark practiced once if Practice mode
    if (state.modeId === "practice") localStorage.setItem(K.practicedOnce, "1");

    // Save best for this player
    if (state.player) {
      const prev = getBest(state.modeId, state.levelId, state.player);
      if (prev == null || total < prev) setBest(state.modeId, state.levelId, state.player, total);
    }

    // Champion update (for tower or duel, handled elsewhere; but if mode itself uses champion and is not duel summary)
    if (["tower"].includes(MODES.find(m => m.id === state.modeId)?.kind)) {
      const champ = getChampion(state.modeId, state.levelId);
      if (!champ || total < champ.score) {
        if (state.player) setChampion(state.modeId, state.levelId, state.player, total);
      }
    }

    // Results screen
    showResultsClassic(total, raw, staged);
  }

  function showResultsClassic(total, raw, staged, headerOverride = null) {
    const mistakes = state.answers.filter(a => !a.ok).length;
    const title = headerOverride ?? "Results";
    $("#resultsTitle").textContent = title;
    $("#resultsSub").innerHTML = `Base time: <b>${fmtSeconds(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b>`;

    $("#scoreBig").textContent = fmtSeconds(total);
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    // feedback list
    const fb = $("#feedback");
    fb.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "feeditem";
      div.innerHTML = `
        <div class="feedtop">
          <div class="feedq">Q${i+1}</div>
          <div class="${a.ok ? "feedok" : "feedbad"}">${a.ok ? "✓ Correct" : "✗ +30s"}</div>
        </div>
        <div class="feedsub"><b>Sentence:</b> ${escapeHTML(a.q).replace("____", "<b>____</b>")}</div>
        <div class="feedsub"><b>Your answer:</b> ${escapeHTML(a.chosen)} • <b>Correct:</b> ${escapeHTML(a.correct)}</div>
        <div class="feedsub">${a.explain}</div>
      `;
      fb.appendChild(div);
    });

    // Update best lines
    if (state.player) refreshBestLinesForPlayer(state.player);
    refreshChampionLines();

    showScreen("results");

    // Stash last session for Play Again
    state._lastRun = { kind: "classic", staged };
  }

  // -----------------------------
  // Pressure mode
  // -----------------------------
  function startPressure({ playerName, levelId }) {
    state.player = playerName;
    state.levelId = levelId;

    // generate a repeating shuffled pool, but only ask until time runs out
    state.seed = Math.floor(Math.random() * 1e9);
    const rnd = mulberry32(state.seed);

    // Create a larger list by shuffling the whole level sentence list
    const pool = (SENTENCES[levelId] || []).slice();
    const idxs = pool.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    state.items = idxs.map(i => pool[i]).map((it) => ({
      text: it.text,
      answer: it.answer,
      explain: it.explain,
      options: makeOptions(levelId, it.answer, rnd),
    }));

    state.idx = 0;
    state.answers = [];
    state.penalty = 0;
    state.selected = null;

    state.pressureTimeLeft = 90;
    state.pressureCorrect = 0;
    state.pressureTotalAsked = 0;

    $("#badgePlayer").textContent = `Player: ${playerName || "—"}`;
    $("#badgeStage").textContent = "Stage: Survival";
    $("#microHint").textContent = "Correct +3s • Wrong −30s • Survive as long as you can.";

    cancelAnimationFrame(state.raf);
    state.t0 = now();
    tickPressure();

    renderPressureQuestion();
    showScreen("game");
    updatePills();
  }

  function tickPressure() {
    // dt since last frame
    const tNow = now();
    const dt = (tNow - state.t0) / 1000;
    state.t0 = tNow;

    state.pressureTimeLeft -= dt;
    if (state.pressureTimeLeft <= 0) {
      state.pressureTimeLeft = 0;
      $("#timer").textContent = fmtSeconds(state.pressureTimeLeft);
      $("#penalty").textContent = `Score: ${state.pressureCorrect}`;
      cancelAnimationFrame(state.raf);
      finishPressure();
      return;
    }
    $("#timer").textContent = fmtSeconds(state.pressureTimeLeft);
    $("#penalty").textContent = `Score: ${state.pressureCorrect}`;
    state.raf = requestAnimationFrame(tickPressure);
  }

  function renderPressureQuestion() {
    const lvl = LEVELS.find(l => l.id === state.levelId);
    const q = state.items[state.idx % state.items.length];
    $("#qcount").textContent = `Survival • ${state.pressureCorrect} correct`;
    $("#qdiff").textContent = lvl ? lvl.diff : "";

    $("#prompt").innerHTML = q.text.replace("____", "<span style=\"background:rgba(255,255,0,.25);padding:0 6px;border-radius:10px\">____</span>");

    const optsWrap = $("#options");
    optsWrap.innerHTML = "";
    state.selected = null;

    q.options.forEach((opt) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = opt;
      b.addEventListener("click", () => {
        state.selected = opt;
        $$(".opt").forEach(x => x.classList.toggle("selected", x === b));
      });
      optsWrap.appendChild(b);
    });

    $("#btnNext").textContent = "Answer";
  }

  function submitPressure() {
    const q = state.items[state.idx % state.items.length];
    const chosen = state.selected;

    const correct = normAnswer(chosen) === normAnswer(q.answer);
    state.pressureTotalAsked += 1;

    if (correct) {
      state.pressureCorrect += 1;
      state.pressureTimeLeft += 3;
    } else {
      state.pressureTimeLeft -= 30;
    }
    state.pressureTimeLeft = clamp(state.pressureTimeLeft, 0, 999);

    state.answers.push({
      q: q.text,
      chosen: chosen || "—",
      correct: q.answer,
      ok: correct,
      explain: q.explain,
      pressure: true
    });

    state.idx += 1;
    renderPressureQuestion();
  }

  function finishPressure() {
    // Best score stored as highest correct; tie-break by total asked (more asked is better) then fewer mistakes
    if (state.player) {
      const key = K.best("pressure", state.levelId, state.player);
      const prev = safeJSONParse(localStorage.getItem(key), null);
      const cur = { correct: state.pressureCorrect, asked: state.pressureTotalAsked };
      const better =
        !prev ||
        cur.correct > prev.correct ||
        (cur.correct === prev.correct && cur.asked > prev.asked);

      if (better) localStorage.setItem(key, JSON.stringify(cur));
    }

    // results presentation
    $("#resultsTitle").textContent = "Pressure Cooker — Results";
    $("#resultsSub").innerHTML = `Correct: <b>${state.pressureCorrect}</b> • Total answered: <b>${state.pressureTotalAsked}</b>`;

    $("#scoreBig").textContent = `${state.pressureCorrect} correct`;
    $("#scoreMeta").textContent = state.player ? `Player: ${state.player}` : "";

    const fb = $("#feedback");
    fb.innerHTML = "";
    state.answers.slice(-10).forEach((a, i) => {
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

    // refresh best lines: pressure stores JSON, so show custom text
    refreshBestLinesPressure();
    showScreen("results");
    state._lastRun = { kind: "pressure" };
  }

  function refreshBestLinesPressure() {
    for (const lvl of LEVELS) {
      const el = $(`#bestLine-${lvl.id}`);
      if (!el) continue;
      el.textContent = `Your best: —`;
    }
  }

  // -----------------------------
  // Duel flow
  // -----------------------------
  const duel = {
    a: null,
    b: null,
    aScore: null,
    bScore: null,
    aRaw: null,
    bRaw: null,
    aPenalty: null,
    bPenalty: null,
    seed: null
  };

  function startDuel({ nameA, nameB, levelId }) {
    duel.a = nameA;
    duel.b = nameB;
    duel.aScore = duel.bScore = null;
    duel.aRaw = duel.bRaw = null;
    duel.aPenalty = duel.bPenalty = null;
    duel.seed = Math.floor(Math.random() * 1e9);

    state.duelStep = "A";
    startSessionClassic({
      playerName: duel.a,
      levelId,
      modeId: "duel",
      seedOverride: duel.seed,
      staged: false
    });
    $("#badgePlayer").textContent = `Player A: ${duel.a}`;
  }

  function finishDuelLeg(total, raw) {
    if (state.duelStep === "A") {
      duel.aScore = total; duel.aRaw = raw; duel.aPenalty = state.penalty;
      // run B
      state.duelStep = "B";
      startSessionClassic({
        playerName: duel.b,
        levelId: state.levelId,
        modeId: "duel",
        seedOverride: duel.seed,
        staged: false
      });
      $("#badgePlayer").textContent = `Player B: ${duel.b}`;
      return;
    }
    if (state.duelStep === "B") {
      duel.bScore = total; duel.bRaw = raw; duel.bPenalty = state.penalty;
      state.duelStep = "SUMMARY";
      showDuelSummary();
    }
  }

  function showDuelSummary() {
    // Determine winner (lower time wins)
    const a = duel.aScore, b = duel.bScore;
    let winner = null;
    if (a < b) winner = duel.a;
    else if (b < a) winner = duel.b;
    else winner = "Tie";

    // Update champion for this level if someone beat it
    const champ = getChampion("duel", state.levelId);
    if (winner !== "Tie") {
      const wScore = winner === duel.a ? duel.aScore : duel.bScore;
      if (!champ || wScore < champ.score) setChampion("duel", state.levelId, winner, wScore);
    }

    // Save each player's best for duel mode
    if (duel.a) {
      const prevA = getBest("duel", state.levelId, duel.a);
      if (prevA == null || duel.aScore < prevA) setBest("duel", state.levelId, duel.a, duel.aScore);
    }
    if (duel.b) {
      const prevB = getBest("duel", state.levelId, duel.b);
      if (prevB == null || duel.bScore < prevB) setBest("duel", state.levelId, duel.b, duel.bScore);
    }

    $("#duelTitle").textContent = winner === "Tie" ? "Duel — Tie!" : `Duel winner: ${winner}`;
    $("#duelSub").textContent = "Fastest total time wins (penalties included).";

    const grid = $("#duelGrid");
    grid.innerHTML = "";
    grid.appendChild(duelCard("Player A", duel.a, duel.aScore, duel.aRaw, duel.aPenalty));
    grid.appendChild(duelCard("Player B", duel.b, duel.bScore, duel.bRaw, duel.bPenalty));

    refreshChampionLines();
    showScreen("duel");

    state._lastRun = { kind: "duel" };
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

  // -----------------------------
  // Tower mode = classic + champ update (already in finishClassic)
  // Heist mode = classic but staged presentation
  // -----------------------------

  // Hook classic finish to duel when in duel mode
  const _finishClassic = finishClassic;
  finishClassic = function(staged) {
    stopTimer();
    const raw = (now() - state.t0) / 1000;
    const total = raw + state.penalty;

    if (state.modeId === "duel") {
      // Save feedback for each leg? We'll just show each leg's results quickly with a banner, then auto-continue.
      // Show results for 1.3s, then continue.
      showResultsClassic(total, raw, staged, state.duelStep === "A" ? "Player A — Leg complete" : "Player B — Leg complete");
      const a = state.answers.slice(); // keep
      const p = state.penalty;
      setTimeout(() => {
        // restore state for duel continuation
        state.answers = a;
        state.penalty = p;
        finishDuelLeg(total, raw);
      }, 1100);
      return;
    }

    // Normal modes:
    if (state.modeId === "practice") localStorage.setItem(K.practicedOnce, "1");

    if (state.player) {
      const prev = getBest(state.modeId, state.levelId, state.player);
      if (prev == null || total < prev) setBest(state.modeId, state.levelId, state.player, total);
    }

    if (MODES.find(m => m.id === state.modeId)?.kind === "tower") {
      const champ = getChampion(state.modeId, state.levelId);
      if (!champ || total < champ.score) {
        if (state.player) setChampion(state.modeId, state.levelId, state.player, total);
      }
    }

    showResultsClassic(total, raw, staged);
  };

  // -----------------------------
  // Buttons
  // -----------------------------
  $("#btnBackHome1").addEventListener("click", () => showScreen("home"));
  $("#btnBackHome2").addEventListener("click", () => showScreen("home"));
  $("#btnBackHome3").addEventListener("click", () => showScreen("home"));

  $("#btnQuit").addEventListener("click", () => {
    stopTimer();
    showScreen("home");
  });

  $("#btnNext").addEventListener("click", () => {
    const mode = MODES.find(m => m.id === state.modeId);
    if (!mode) return;

    if (mode.kind === "pressure") {
      submitPressure();
      return;
    }
    submitAnswerClassic(mode.kind === "heist");
  });

  $("#btnPlayAgain").addEventListener("click", () => {
    const mode = MODES.find(m => m.id === state.modeId);
    if (!mode) { showScreen("home"); return; }

    // replay current mode/level with same names if possible
    if (mode.kind === "pressure") {
      startPressure({ playerName: state.player, levelId: state.levelId });
      return;
    }
    if (mode.kind === "duel") {
      // Restart duel setup for same level
      openSetup();
      return;
    }
    startSessionClassic({
      playerName: state.player,
      levelId: state.levelId,
      modeId: state.modeId,
      staged: mode.kind === "heist"
    });
  });

  $("#btnDuelNext").addEventListener("click", () => {
    // Return to arcade
    showScreen("home");
  });

  $("#btnStart").addEventListener("click", () => {
    const mode = MODES.find(m => m.id === state.modeId);
    if (!mode) return;

    if (mode.usesDuel) {
      const a = normName($("#duelNameA").value) || "Player A";
      const b = normName($("#duelNameB").value) || "Player B";
      state.playerA = a; state.playerB = b;
      startDuel({ nameA: a, nameB: b, levelId: state.levelId });
      return;
    }

    const name = normName($("#soloName").value) || "Player";
    state.player = name;

    // update best lines for this player immediately
    refreshBestLinesForPlayer(name);

    if (mode.kind === "pressure") {
      startPressure({ playerName: name, levelId: state.levelId });
      return;
    }

    startSessionClassic({
      playerName: name,
      levelId: state.levelId,
      modeId: state.modeId,
      staged: mode.kind === "heist"
    });
  });

  $("#btnResetAll").addEventListener("click", () => {
    // Remove all our keys
    const keys = Object.keys(localStorage);
    keys.forEach(k => {
      if (k.startsWith("ta_") || k.startsWith("ta_best_v1::") || k.startsWith("ta_champ_v1::")) {
        localStorage.removeItem(k);
      }
    });
    // also remove explicit prefixes
    keys.forEach(k => {
      if (k.startsWith("ta_best_v1::") || k.startsWith("ta_champ_v1::")) localStorage.removeItem(k);
    });
    buildLevelGrid();
    alert("Local Turbo Arcade scores cleared on this device.");
  });

  // -----------------------------
  // Init
  // -----------------------------
  function init() {
    buildModeTiles();
    restoreDefaults();
    buildLevelGrid();
    showScreen("home");

    // If we have a last mode, set tiles active; else default tile already set
    const practiced = localStorage.getItem(K.practicedOnce) === "1";
    if (!practiced) {
      // Nudge: highlight Practice if not done yet
      $$(".tile").forEach(t => t.classList.toggle("active", t.dataset.mode === "practice"));
      setMode("practice");
    }

    // When selecting a mode, best lines depend on player; show dashes until name entered
    updatePills();
  }

  init();
})();
