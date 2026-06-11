// ==============================
// 🔷 CORE STATE (your database in memory)
// ==============================
const SUPABASE_URL = window.__SUPABASE_URL__;
const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__;

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

const store = {
  entries: JSON.parse(localStorage.getItem("entries") || "[]"),
  witnesses: JSON.parse(localStorage.getItem("witnesses") || "[]"),
  view: "timeline",
  case: "work",
  master: "client"
};

// ==============================
// 💾 SAVE (local backend)
// ==============================
function save() {
  localStorage.setItem("entries", JSON.stringify(store.entries));
  localStorage.setItem("witnesses", JSON.stringify(store.witnesses));
}

// ==============================
// 🔷 VIEW CONTROL
// ==============================
function setMaster(v) {
  store.master = v;
  render();
}

function setView(v) {
  store.view = v;
  render();
}

function setCase(v) {
  store.case = v;
  render();
}

// ==============================
// ➕ ADD ENTRY
// ==============================
function addEntry() {
  const input = document.getElementById("input");
  const text = input.value.trim();
  if (!text) return;

  store.entries.push({
    id: Date.now(),
    text,
    case: store.case,
    created: new Date().toISOString()
  });

  input.value = "";
  save();
  syncAnimation();
  render();
}

// ==============================
// 👤 WITNESS SYSTEM
// ==============================
function addWitness() {
  const name = document.getElementById("wName").value;
  const statement = document.getElementById("wStatement").value;

  if (!name || !statement) return;

  store.witnesses.push({
    id: Date.now(),
    name,
    statement,
    verified: false
  });

  save();
  render();
}

// ==============================
// ⚖️ SCORING SYSTEM
// ==============================
function scoreEntry(e) {
  let score = 0;

  if (e.text.length > 30) score += 30;
  if (/\d{4}/.test(e.text)) score += 40;
  if (e.case) score += 30;

  return score;
}

// ==============================
// 🧠 AI SUMMARY (REAL LOGIC)
// ==============================
function generateSummary(entries) {
  if (!entries.length) return "No data";

  let work = entries.filter(e => e.case === "work").length;
  let injury = entries.filter(e => e.case === "injury").length;

  return `
${entries.length} total events.
Work events: ${work}.
Injury events: ${injury}.
${work && injury ? "Possible Work → Injury relationship detected." : ""}
`;
}

// ==============================
// 🔍 INVESTIGATION LOGIC (REAL)
// ==============================
function investigate(entries) {
  let insights = [];

  if (entries.length > 3) {
    insights.push("Multiple events detected");
  }

  const hasWork = entries.some(e => e.case === "work");
  const hasInjury = entries.some(e => e.case === "injury");

  if (hasWork && hasInjury) {
    insights.push("Work → Injury pattern detected");
  }

  return insights;
}

// ==============================
// 🧪 LATIN TRANSLATOR
// ==============================
function translateLatin() {
  const text = store.entries.at(-1)?.text || "";

  const translated = text
    .replace(/the/gi, "ille")
    .replace(/and/gi, "et")
    .replace(/is/gi, "est");

  alert("Latin:\n" + translated);
}

// ==============================
// 📊 GRAPH (LIVE SYNC)
// ==============================
function drawGraph() {
  const canvas = document.getElementById("graph");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  store.entries.forEach((e, i) => {
    const x = 80 + i * 140;
    const y = 200;

    ctx.fillStyle = "#14b8a6";
    ctx.fillRect(x, y, 120, 50);

    ctx.fillStyle = "#fff";
    ctx.fillText(e.case, x + 10, y + 20);
  });
}

// ==============================
// 🔄 SYNC ANIMATION
// ==============================
function syncAnimation() {
  const el = document.getElementById("sync");
  if (!el) return;

  el.classList.add("show");
  el.classList.remove("synced");

  setTimeout(() => {
    el.classList.add("synced");
  }, 1000);

  setTimeout(() => {
    el.classList.remove("show");
  }, 2000);
}

// ==============================
// 🖥️ RENDER
// ==============================
function render() {
  const container = document.getElementById("view");
  if (!container) return;

  let data = store.entries;

  // filter case
  if (store.case !== "all") {
    data = data.filter(e => e.case === store.case);
  }

  // LOGIN
  if (store.master === "login") {
    container.innerHTML = `
      <input placeholder="Email"><br>
      <input type="password" placeholder="Password"><br>
      <button>Login</button>
    `;
    return;
  }

  // FIRM VIEW
  if (store.master === "firm") {
    container.innerHTML = data.map(e => {
      const s = scoreEntry(e);
      return `
        <div class="entry">
          ${e.text}<br>
          <span class="${s >= 70 ? "good" : "bad"}">
            ${s >= 70 ? "Good" : "Grey"} ${s}
          </span>
        </div>
      `;
    }).join("");
    return;
  }

  // CLIENT VIEWS
  if (store.view === "timeline") {
    container.innerHTML = data.map(e =>
      `<div class="entry">${e.text}</div>`
    ).join("");
  }

  if (store.view === "investigation") {
    const insights = investigate(data);

    container.innerHTML =
      data.map(e => `<div class="entry">${e.text}</div>`).join("") +
      insights.map(i => `<div class="entry good">Insight: ${i}</div>`).join("");
  }

  if (store.view === "graph") {
    drawGraph();
  }

  // AI SUMMARY
  container.innerHTML += `
    <div class="entry">
      <strong>Summary:</strong><br>
      ${generateSummary(data)}
    </div>
  `;

  // WITNESSES
  container.innerHTML += store.witnesses.map(w => `
    <div class="entry">
      Witness: ${w.name}<br>
      ${w.statement}
    </div>
  `).join("");
}

// ==============================
// 🚀 INIT
// ==============================
render();
