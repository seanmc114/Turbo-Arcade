/* Turbo Arcade — WORKING STANDALONE CONNECTORS GAME
   - Injects its own UI (doesn't rely on existing HTML IDs)
   - 10 levels, 10 questions
   - +30s per mistake
   - Feedback after each level
   - Locked levels + unlock thresholds
   - Local PB per level
*/

(() => {
  "use strict";

  // ---------- CONFIG ----------
  const CREST_URL = "crest.png"; // put crest.png in repo root (recommended)
  const STORAGE_UNLOCK = "TA_UNLOCK_V3";
  const STORAGE_PB_PREFIX = "TA_PB_V3_L";
  const PENALTY_SECONDS = 30;

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

  // ---------- HELPERS ----------
  const fmt = (sec) => `${(Math.round(sec * 10) / 10).toFixed(1)}s`;
  const esc = (s) => (s || "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  const shuffle = (a) => { for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };

  const getUnlockedMax = () => {
    const n = Number(localStorage.getItem(STORAGE_UNLOCK));
    return Number.isFinite(n) ? n : 1;
  };
  const setUnlockedMax = (n) => {
    const cur = getUnlockedMax();
    localStorage.setItem(STORAGE_UNLOCK, String(Math.max(cur, n)));
  };
  const getPB = (lvl) => {
    const n = Number(localStorage.getItem(STORAGE_PB_PREFIX + lvl));
    return Number.isFinite(n) ? n : null;
  };
  const setPB = (lvl, val) => localStorage.setItem(STORAGE_PB_PREFIX + lvl, String(val));

  // ---------- STATE ----------
  const state = {
    level: 1,
    name: "",
    items: [],
    idx: 0,
    selected: null,
    penalty: 0,
    answers: [],
    t0: 0,
    raf: null,
  };

  // ---------- UI INJECTION ----------
  function injectUI() {
    // keep your existing page, but add our own app overlay
    const host = document.createElement("div");
    host.id = "taApp";
    host.innerHTML = `
      <style>
        #taApp{position:relative;max-width:980px;margin:18px auto;padding:16px 16px 28px;border-radius:18px;
          background:rgba(255,255,255,.78);backdrop-filter: blur(6px);box-shadow:0 10px 30px rgba(0,0,0,.15);
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;}
        #taApp h1{margin:0 0 6px;font-size:28px}
        #taApp .sub{opacity:.75;margin:0 0 12px}
        #taApp .bar{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0 12px}
        #taApp .pill{padding:6px 10px;border-radius:999px;background:rgba(0,0,0,.06);font-weight:700}
        #taApp .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}
        #taApp button{cursor:pointer;border:0;border-radius:14px;padding:12px 12px;font-weight:800}
        #taApp .lvl{background:linear-gradient(135deg, rgba(255,0,150,.15), rgba(0,200,255,.15));}
        #taApp .lvl.locked{opacity:.45;filter:grayscale(1)}
        #taApp .lvl small{display:block;opacity:.75;font-weight:700;margin-top:6px}
        #taApp .row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
        #taApp input{padding:10px 12px;border-radius:12px;border:2px solid rgba(0,0,0,.12);font-weight:700}
        #taApp .card{padding:14px;border-radius:16px;background:rgba(255,255,255,.85);box-shadow:0 8px 20px rgba(0,0,0,.10)}
        #taApp .prompt{font-size:22px;font-weight:900;margin:10px 0 10px}
        #taApp .opt{background:rgba(0,0,0,.06)}
        #taApp .opt.sel{outline:3px solid rgba(0,120,255,.5)}
        #taApp .actions{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
        #taApp .primary{background:linear-gradient(135deg, rgba(0,255,170,.25), rgba(255,230,0,.25))}
        #taApp .danger{background:rgba(255,0,0,.12)}
        #taApp .feed{display:grid;gap:10px;margin-top:12px}
        #taApp .fi{padding:12px;border-radius:14px;background:rgba(0,0,0,.04)}
        #taApp .ok{color:#0a7b2f}
        #taApp .bad{color:#b00020}
        body{
          background-image:url("${CREST_URL}");
          background-repeat:no-repeat;
          background-position:center;
          background-size: min(70vw, 520px);
          background-attachment:fixed;
        }
      </style>

      <h1>Turbo Arcade — Connectors</h1>
      <p class="sub">10 levels • 10 questions • +${PENALTY_SECONDS}s per mistake • feedback every level</p>

      <div class="bar">
        <div class="pill" id="pillLevel">Level: —</div>
        <div class="pill" id="pillDiff">Difficulty: —</div>
        <div class="pill" id="pillTime">Time: 0.0s</div>
        <div class="pill" id="pillPenalty">Penalty: +0s</div>
      </div>

      <div id="screenHome" class="card">
        <div class="row" style="justify-content:space-between;">
          <div><b>Choose a level</b></div>
          <button id="resetBtn" class="danger">Reset progress (this device)</button>
        </div>
        <div style="margin:10px 0 0" class="grid" id="levelGrid"></div>
      </div>

      <div id="screenSetup" class="card" style="display:none;">
        <div class="row" style="justify-content:space-between;">
          <div><b id="setupTitle">Setup</b></div>
          <button id="backHome1">Back</button>
        </div>
        <p class="sub" id="setupSub">Enter a name (optional) and start.</p>
        <div class="row">
          <input id="playerName" placeholder="Name (optional)" maxlength="24" />
          <button id="startBtn" class="primary">Start</button>
        </div>
      </div>

      <div id="screenGame" class="card" style="display:none;">
        <div class="row" style="justify-content:space-between;">
          <div><b id="qcount">Q 1 / 10</b></div>
          <button id="quitBtn" class="danger">Quit</button>
        </div>
        <div class="prompt" id="prompt"></div>
        <div class="grid" id="options"></div>
        <div class="actions">
          <button id="nextBtn" class="primary">Next</button>
        </div>
      </div>

      <div id="screenResults" class="card" style="display:none;">
        <div class="row" style="justify-content:space-between;">
          <div><b id="resultsTitle">Results</b></div>
          <button id="backHome2">Back to Levels</button>
        </div>
        <p id="resultsSub" class="sub"></p>
        <div style="font-size:34px;font-weight:1000;margin:6px 0 10px" id="scoreBig">—</div>
        <div class="actions">
          <button id="againBtn" class="primary">Play again</button>
        </div>
        <div class="feed" id="feedback"></div>
      </div>
    `;
    document.body.prepend(host);
  }

  // ---------- SCREEN SWITCH ----------
  function show(which) {
    const ids = ["screenHome", "screenSetup", "screenGame", "screenResults"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      el.style.display = (id === which) ? "block" : "none";
    });
  }

  // ---------- TIMER ----------
  function stopTimer() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = null;
  }
  function tick() {
    const t = (performance.now() - state.t0) / 1000;
    document.getElementById("pillTime").textContent = `Time: ${fmt(t)}`;
    document.getElementById("pillPenalty").textContent = `Penalty: +${state.penalty}s`;
    state.raf = requestAnimationFrame(tick);
  }

  // ---------- BUILD LEVELS ----------
  function buildLevels() {
    const grid = document.getElementById("levelGrid");
    grid.innerHTML = "";
    const unlockedMax = getUnlockedMax();

    LEVELS.forEach(l => {
      const locked = l.id > unlockedMax;
      const pb = getPB(l.id);
      const need = UNLOCK_BY_LEVEL[l.id];

      const btn = document.createElement("button");
      btn.className = "lvl" + (locked ? " locked" : "");
      btn.innerHTML = `
        <div style="font-size:18px;">Level ${l.id}</div>
        <small>${l.diff}</small>
        <small>Your PB: ${pb == null ? "—" : fmt(pb)}</small>
        <small>${locked ? `Locked • unlock: ≤ ${need}s` : "Unlocked"}</small>
      `;

      btn.onclick = () => {
        if (locked) {
          alert(`Locked.\nUnlock Level ${l.id} by beating Level ${l.id - 1} in ≤ ${need}s.`);
          return;
        }
        state.level = l.id;
        const lvl = LEVELS.find(x => x.id === state.level);
        document.getElementById("pillLevel").textContent = `Level: ${state.level}`;
        document.getElementById("pillDiff").textContent = `Difficulty: ${lvl.diff}`;
        document.getElementById("setupTitle").textContent = `Level ${state.level} — ${lvl.diff}`;
        show("screenSetup");
      };

      grid.appendChild(btn);
    });
  }

  // ---------- GAME PLAY ----------
  function buildQuestion() {
    const q = state.items[state.idx];
    document.getElementById("qcount").textContent = `Q ${state.idx + 1} / 10`;
    document.getElementById("prompt").innerHTML =
      esc(q.t).replace("____", `<span style="background:rgba(255,255,0,.25);padding:0 8px;border-radius:12px;">____</span>`);

    const pool = CONNECTORS[state.level].slice();
    const opts = new Set([q.a]);
    while (opts.size < 4) opts.add(pool[Math.floor(Math.random() * pool.length)]);
    const arr = shuffle([...opts]);

    const wrap = document.getElementById("options");
    wrap.innerHTML = "";
    state.selected = null;

    arr.forEach(opt => {
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

  function startGame() {
    state.name = (document.getElementById("playerName").value || "").trim().slice(0, 24);

    state.items = shuffle(SENTENCES[state.level].slice()); // exactly 10
    state.idx = 0;
    state.selected = null;
    state.penalty = 0;
    state.answers = [];

    state.t0 = performance.now();
    stopTimer();
    tick();

    show("screenGame");
    buildQuestion();
  }

  function next() {
    const q = state.items[state.idx];
    const chosen = state.selected || "—";
    const ok = chosen.toLowerCase() === q.a.toLowerCase();
    if (!ok) state.penalty += PENALTY_SECONDS;

    state.answers.push({ q: q.t, chosen, correct: q.a, ok, why: q.w });
    state.idx++;

    if (state.idx >= 10) finish();
    else buildQuestion();
  }

  function finish() {
    stopTimer();
    const raw = (performance.now() - state.t0) / 1000;
    const total = raw + state.penalty;
    const mistakes = state.answers.filter(x => !x.ok).length;

    // PB
    const prev = getPB(state.level);
    const isPB = (prev == null || total < prev);
    if (isPB) setPB(state.level, total);

    // Unlock next
    const nextLevel = state.level + 1;
    let unlockMsg = "";
    if (nextLevel <= 10) {
      const need = UNLOCK_BY_LEVEL[nextLevel];
      if (total <= need) {
        setUnlockedMax(nextLevel);
        unlockMsg = `✅ UNLOCKED Level ${nextLevel} (≤ ${need}s)`;
      } else {
        unlockMsg = `🔒 To unlock Level ${nextLevel}: beat ≤ ${need}s`;
      }
    } else {
      unlockMsg = "🏁 Completed Level 10!";
    }

    // Results header
    document.getElementById("resultsTitle").textContent = `Level ${state.level} — Results`;
    document.getElementById("resultsSub").innerHTML =
      `Base: <b>${fmt(raw)}</b> • Mistakes: <b>${mistakes}</b> • Penalty: <b>${state.penalty}s</b><br>${unlockMsg}${isPB ? "<br>🏅 <b>New PB!</b>" : ""}`;
    document.getElementById("scoreBig").textContent = fmt(total);

    // Feedback list (ESSENTIAL)
    const fb = document.getElementById("feedback");
    fb.innerHTML = "";
    state.answers.forEach((a, i) => {
      const div = document.createElement("div");
      div.className = "fi";
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:10px;">
          <b>Q${i + 1}</b>
          <b class="${a.ok ? "ok" : "bad"}">${a.ok ? "✓ Correct" : `✗ +${PENALTY_SECONDS}s`}</b>
        </div>
        <div style="margin-top:6px;"><b>Sentence:</b> ${esc(a.q).replace("____", "<b>____</b>")}</div>
        <div><b>Your answer:</b> ${esc(a.chosen)} • <b>Correct:</b> ${esc(a.correct)}</div>
        <div style="opacity:.8;margin-top:4px;">${a.why || ""}</div>
      `;
      fb.appendChild(div);
    });

    buildLevels();
    show("screenResults");
    document.getElementById("screenResults").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- WIRING ----------
  function wire() {
    document.getElementById("backHome1").onclick = () => show("screenHome");
    document.getElementById("backHome2").onclick = () => show("screenHome");
    document.getElementById("quitBtn").onclick = () => { stopTimer(); show("screenHome"); };
    document.getElementById("startBtn").onclick = startGame;
    document.getElementById("nextBtn").onclick = next;
    document.getElementById("againBtn").onclick = () => show("screenSetup");
    document.getElementById("resetBtn").onclick = () => {
      if (!confirm("Reset progress + PBs on THIS device?")) return;
      Object.keys(localStorage).forEach(k => {
        if (k === STORAGE_UNLOCK || k.startsWith(STORAGE_PB_PREFIX)) localStorage.removeItem(k);
      });
      setUnlockedMax(1);
      buildLevels();
      alert("Reset done.");
    };
  }

  // ---------- INIT ----------
  function init() {
    try {
      injectUI();

      // initialise unlock
      const u = getUnlockedMax();
      if (!Number.isFinite(u) || u < 1) setUnlockedMax(1);

      // default level display
      const lvl = LEVELS.find(x => x.id === state.level);
      document.getElementById("pillLevel").textContent = `Level: ${state.level}`;
      document.getElementById("pillDiff").textContent = `Difficulty: ${lvl.diff}`;

      buildLevels();
      wire();
      show("screenHome");
    } catch (e) {
      alert("Turbo Arcade error: " + (e?.message || e));
      console.error(e);
    }
  }

  window.addEventListener("DOMContentLoaded", init);
})();
