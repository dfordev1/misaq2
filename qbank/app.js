(function () {
  "use strict";

  const state = {
    bank: null,
    queue: [],
    index: 0,
    answered: 0,
    correct: 0,
    results: {},
    mode: "all",
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    start: $("#screen-start"),
    quiz: $("#screen-quiz"),
    end: $("#screen-end"),
  };

  async function loadBank() {
    const res = await fetch("./questions.json");
    if (!res.ok) throw new Error("Failed to load questions.json");
    state.bank = await res.json();
    populateDomains();
    $("#total-count").textContent = state.bank.count;
  }

  function populateDomains() {
    const sel = $("#domain-select");
    sel.innerHTML = '<option value="">All domains</option>';
    (state.bank.domains || []).forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = d;
      sel.appendChild(opt);
    });
  }

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      el.classList.toggle("active", key === name);
    });
  }

  function shuffleArray(arr, seed) {
    const a = arr.slice();
    let h = seed;
    for (let i = a.length - 1; i > 0; i--) {
      h = (h * 1103515245 + 12345) & 0x7fffffff;
      const j = h % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function startSession(mode, domain) {
    let pool = state.bank.questions.slice();
    if (domain) {
      pool = pool.filter((q) => q.domain === domain);
    }
    if (mode === "random20") {
      pool = shuffleArray(pool, Date.now()).slice(0, 20);
    } else if (mode === "random50") {
      pool = shuffleArray(pool, Date.now() + 1).slice(0, 50);
    }
    if (!pool.length) {
      alert("No questions match this filter.");
      return;
    }
    state.queue = pool;
    state.index = 0;
    state.answered = 0;
    state.correct = 0;
    state.results = {};
    state.mode = mode;
    showScreen("quiz");
    renderQuestion();
  }

  function currentQuestion() {
    return state.queue[state.index];
  }

  function updateProgress() {
    const total = state.queue.length;
    const pct = total ? (state.index / total) * 100 : 0;
    $("#progress-fill").style.width = pct + "%";
    $("#progress-label").textContent = `Question ${Math.min(state.index + 1, total)} of ${total}`;
    $("#score-label").textContent = `Score: ${state.correct} / ${state.answered}`;
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) {
      finishSession();
      return;
    }
    updateProgress();
    $("#diagram-img").src = "./" + q.diagram;
    $("#diagram-img").alt = q.title;
    $("#stem-text").textContent = q.stem;
    $("#domain-tag").textContent = q.domain;
    $("#axis-tag").textContent = "Axis " + q.axis;
    $("#qid-tag").textContent = q.id;

    const container = $("#options");
    container.innerHTML = "";
    q.options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option";
      btn.dataset.key = opt.key;
      btn.innerHTML = `<span class="key">${opt.key}</span><span class="text">${escapeHtml(opt.text)}</span>`;
      btn.addEventListener("click", () => selectOption(opt.key));
      container.appendChild(btn);
    });

    const prev = state.results[q.id];
    $("#explain-panel").classList.remove("visible");
    $("#explain-panel").innerHTML = "";
    $("#btn-next").disabled = true;

    if (prev) {
      revealAnswer(prev.selected, true);
    } else {
      lockOptions(false);
    }
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function lockOptions(locked) {
    $$(".option").forEach((el) => {
      el.classList.toggle("locked", locked);
      el.disabled = locked;
    });
  }

  function selectOption(key) {
    const q = currentQuestion();
    if (!q || state.results[q.id]) return;

    const opt = q.options.find((o) => o.key === key);
    if (!opt) return;

    state.results[q.id] = { selected: key, correct: opt.correct };
    state.answered += 1;
    if (opt.correct) state.correct += 1;

    revealAnswer(key, false);
    updateProgress();
  }

  function revealAnswer(selectedKey, fromReview) {
    const q = currentQuestion();
    lockOptions(true);

    $$(".option").forEach((el) => {
      const key = el.dataset.key;
      const opt = q.options.find((o) => o.key === key);
      el.classList.remove("correct", "wrong", "missed-correct");
      if (opt.correct) {
        el.classList.add(key === selectedKey ? "correct" : "missed-correct");
      } else if (key === selectedKey) {
        el.classList.add("wrong");
      }
    });

    const panel = $("#explain-panel");
    panel.innerHTML =
      `<strong>Explanation</strong><br>${escapeHtml(q.explain)}` +
      (q.principle ? `<br><br><strong>Principle:</strong> ${escapeHtml(q.principle)}` : "") +
      (q.locus ? `<br><strong>Locus:</strong> ${escapeHtml(q.locus)}` : "");
    panel.classList.add("visible");
    $("#btn-next").disabled = false;

    if (!fromReview) {
      $("#score-label").textContent = `Score: ${state.correct} / ${state.answered}`;
    }
  }

  function nextQuestion() {
    state.index += 1;
    if (state.index >= state.queue.length) {
      finishSession();
    } else {
      renderQuestion();
    }
  }

  function skipQuestion() {
    const q = currentQuestion();
    if (q && !state.results[q.id]) {
      state.results[q.id] = { selected: null, correct: false, skipped: true };
      state.answered += 1;
    }
    nextQuestion();
  }

  function finishSession() {
    showScreen("end");
    const total = state.queue.length;
    const pct = total ? Math.round((state.correct / total) * 100) : 0;
    $("#end-score").textContent = `${state.correct} / ${total} (${pct}%)`;

    const missed = state.queue.filter((q) => {
      const r = state.results[q.id];
      return !r || !r.correct;
    });

    const list = $("#review-list");
    list.innerHTML = "";
    if (!missed.length) {
      const li = document.createElement("li");
      li.textContent = "No missed questions — well done.";
      list.appendChild(li);
    } else {
      missed.forEach((q) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "secondary";
        btn.textContent = `${q.id}: ${q.title}`;
        btn.addEventListener("click", () => reviewQuestion(q.id));
        li.appendChild(btn);
        list.appendChild(li);
      });
    }
  }

  function reviewQuestion(qid) {
    const idx = state.queue.findIndex((q) => q.id === qid);
    if (idx === -1) {
      const q = state.bank.questions.find((x) => x.id === qid);
      if (q) {
        state.queue = [q];
        state.index = 0;
      }
    } else {
      state.index = idx;
    }
    showScreen("quiz");
    renderQuestion();
    if (state.results[qid]) {
      revealAnswer(state.results[qid].selected, true);
    }
  }

  function bindEvents() {
    $("#btn-start-all").addEventListener("click", () => startSession("all", ""));
    $("#btn-random-20").addEventListener("click", () => startSession("random20", ""));
    $("#btn-random-50").addEventListener("click", () => startSession("random50", ""));
    $("#btn-pick-domain").addEventListener("click", () => {
      const domain = $("#domain-select").value;
      if (!domain) {
        alert("Choose a domain first.");
        return;
      }
      startSession("domain", domain);
    });
    $("#btn-next").addEventListener("click", nextQuestion);
    $("#btn-skip").addEventListener("click", skipQuestion);
    $("#btn-home").addEventListener("click", () => showScreen("start"));
    $("#btn-retry").addEventListener("click", () => startSession(state.mode, $("#domain-select").value));

    document.addEventListener("keydown", (e) => {
      if (!screens.quiz.classList.contains("active")) return;
      const q = currentQuestion();
      if (!q) return;

      const keyMap = { "1": "A", "2": "B", "3": "C", "4": "D", a: "A", b: "B", c: "C", d: "D" };
      const k = e.key.toLowerCase();
      if (keyMap[k] && !state.results[q.id]) {
        e.preventDefault();
        selectOption(keyMap[k]);
      }
      if ((k === "n" || k === "Enter") && !$("#btn-next").disabled) {
        e.preventDefault();
        nextQuestion();
      }
    });
  }

  loadBank()
    .then(() => {
      bindEvents();
      showScreen("start");
    })
    .catch((err) => {
      document.body.innerHTML =
        `<div class="app"><p style="color:#8b3a3a">Error: ${escapeHtml(err.message)}. Run python scripts/build_qbank.py first.</p></div>`;
    });
})();
