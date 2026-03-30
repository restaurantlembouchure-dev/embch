const config = window.APP_CONFIG;

let user      = null;
let produits  = [];
let checklist = [];

const jours = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

function getContext() {
  const now = new Date();
  return {
    jour:    jours[now.getDay()],
    service: now.getHours() < 15 ? "Midi" : "Soir"
  };
}

// ═══════════════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════════════

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <div class="card" style="margin-top:40px;max-width:400px;margin-left:auto;margin-right:auto">
      <h2 style="text-align:center;margin-bottom:20px">${config.RESTAURANT_NAME}</h2>
      <label>Employé</label>
      <select id="userSelect">
        ${config.USERS.map(u => `<option value="${u.name}">${u.name}</option>`).join("")}
      </select>
      <br><br>
      <label>PIN</label>
      <input id="pin" type="password" placeholder="••••" inputmode="numeric" maxlength="4">
      <br><br>
      <button id="loginBtn">Connexion</button>
    </div>
  `;
  document.getElementById("loginBtn").onclick = login;
  document.getElementById("pin").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
}

function login() {
  const name = document.getElementById("userSelect").value;
  const pin  = document.getElementById("pin").value;
  if (pin === "9999") {
    user = { name: "Admin", pin: "9999", isAdmin: true };
    loadData();
    return;
  }
  const found = config.USERS.find(u => u.name === name && u.pin === pin);
  if (!found) return alert("PIN incorrect");
  user = found;
  loadData();
}

// ═══════════════════════════════════════════════════════════════
//  CHARGEMENT
// ═══════════════════════════════════════════════════════════════

function loadData() {
  document.getElementById("app").innerHTML = `
    <div style="text-align:center;padding:60px 0;color:var(--muted)">⏳ Chargement…</div>
  `;
  Promise.all([
    fetch(config.APPS_SCRIPT_URL + "?action=getProduits").then(r => r.json()),
    fetch(config.APPS_SCRIPT_URL + "?action=getMEP").then(r => r.json())
  ])
  .then(([p, m]) => {
    produits  = Array.isArray(p) ? p : [];
    checklist = Array.isArray(m) ? m : [];
    renderShell();
  })
  .catch(err => {
    console.error(err);
    produits = []; checklist = [];
    renderShell();
  });
}

// ═══════════════════════════════════════════════════════════════
//  SHELL — navigation par onglets
// ═══════════════════════════════════════════════════════════════

function renderShell() {
  if (user.isAdmin) { renderAdmin(); return; }
  const { jour, service } = getContext();

  document.getElementById("app").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="margin:0">${user.name}</h2>
        <span class="small">${jour} — Service ${service}</span>
      </div>
      <button class="secondary" style="width:auto;padding:10px 16px" onclick="renderLogin()">Déco.</button>
    </div>
    <div id="tab-content"></div>
    <div class="nav">
      <div class="row">
        <button id="tab-mep"        class="secondary" onclick="switchTab('mep')">✅ MEP</button>
        <button id="tab-rupture"    class="secondary" onclick="switchTab('rupture')">🚨 Rupture</button>
        <button id="tab-perte"      class="secondary" onclick="switchTab('perte')">📉 Perte</button>
        <button id="tab-inventaire" class="secondary" onclick="switchTab('inventaire')">📦 Stock</button>
      </div>
    </div>
  `;
  switchTab("mep");
}

function switchTab(tab) {
  ["mep","rupture","perte","inventaire"].forEach(t => {
    const btn = document.getElementById("tab-" + t);
    if (!btn) return;
    btn.style.background = t === tab ? "var(--accent)" : "";
    btn.style.color      = t === tab ? "#082f49"       : "";
    btn.style.fontWeight = t === tab ? "700"            : "";
  });
  const content = document.getElementById("tab-content");
  if (!content) return;
  if (tab === "mep")        content.innerHTML = renderMEP();
  if (tab === "rupture")    content.innerHTML = renderRupture();
  if (tab === "perte")      content.innerHTML = renderPerte();
  if (tab === "inventaire") content.innerHTML = renderInventaire();
}

// ═══════════════════════════════════════════════════════════════
//  ONGLET MEP — cocher + saisir les parts disponibles
// ═══════════════════════════════════════════════════════════════

function renderMEP() {
  const { service } = getContext();

  const filtered = checklist.filter(item => {
    const matchEmploye = !item.employe || item.employe.trim() === "" || item.employe.trim() === user.name;
    const matchService = item.service  && item.service.trim() === service;
    return matchEmploye && matchService;
  });

  if (filtered.length === 0) {
    return `
      <div class="card">
        <h3>✅ Mise en place</h3>
        <p class="small">Aucune tâche prévue pour ce service.</p>
      </div>
    `;
  }

  // Stocker les données filtrées pour validerMEP()
  window._mepFiltered = filtered;

  const items = filtered.map((item, i) => `
    <div class="task" id="task-${i}" style="flex-direction:column;align-items:stretch;gap:8px">
      <div style="display:flex;align-items:center;gap:10px">
        <input type="checkbox" id="chk-${i}"
          onchange="toggleTask(${i}, this.checked)"
          style="width:22px;height:22px;min-width:22px;margin:0;cursor:pointer;accent-color:var(--ok)">
        <div style="flex:1">
          <div id="task-label-${i}" style="font-weight:600;font-size:15px">${item.tache || item.produit || "Tâche"}</div>
          <div class="small">Quantité cible : <strong>${round(item.quantite)} ${item.unite || ""}</strong></div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding-left:32px">
        <span class="small" style="color:var(--muted);white-space:nowrap">Parts disponibles :</span>
        <input
          type="number"
          id="parts-${i}"
          placeholder="0"
          inputmode="decimal"
          min="0"
          style="width:80px;padding:8px;font-size:15px;border-radius:10px;
                 border:1px solid var(--line);background:var(--panel2);
                 color:var(--text);text-align:center"
        >
        <span class="small">${item.unite || ""}</span>
      </div>
    </div>
  `).join("");

  return `
    <div class="card">
      <h3>✅ Mise en place — ${filtered.length} préparation(s)</h3>
      <p class="small" style="margin-bottom:14px">
        Cochez chaque produit présent et saisissez le nombre de parts disponibles.
      </p>
      ${items}
      <br>
      <button class="success" onclick="validerMEP()">✅ Valider la mise en place</button>
    </div>
  `;
}

function toggleTask(i, checked) {
  const label = document.getElementById("task-label-" + i);
  const task  = document.getElementById("task-" + i);
  if (checked) {
    label.style.textDecoration = "line-through";
    label.style.color          = "var(--muted)";
    task.style.background      = "rgba(22,163,74,0.08)";
    task.style.borderColor     = "var(--ok)";
  } else {
    label.style.textDecoration = "";
    label.style.color          = "";
    task.style.background      = "";
    task.style.borderColor     = "";
  }
}

async function validerMEP() {
  const { service } = getContext();
  const filtered = window._mepFiltered || [];

  const resultats = filtered.map((item, i) => {
    const chk   = document.getElementById("chk-"   + i);
    const parts = document.getElementById("parts-" + i);
    return {
      produit:    item.tache || item.produit || "",
      cible:      round(item.quantite),
      unite:      item.unite || "",
      present:    chk   && chk.checked ? "Oui" : "Non",
      disponible: parts ? parts.value : ""
    };
  });

  const nonCoches = resultats.filter(r => r.present === "Non");
  if (nonCoches.length > 0) {
    const ok = confirm(`⚠️ ${nonCoches.length} produit(s) non cochés.\nValider quand même ?`);
    if (!ok) return;
  }

  const btn = document.querySelector("#tab-content button.success");
  if (btn) { btn.disabled = true; btn.textContent = "Envoi…"; }

  const res = await postData({
    action:    "validation",
    employe:   user.name,
    service:   service,
    resultats: resultats
  });

  if (btn) { btn.disabled = false; btn.textContent = "✅ Valider la mise en place"; }
  alert(res === "OK" ? "✅ Mise en place validée !" : res);
}

// ═══════════════════════════════════════════════════════════════
//  ONGLET RUPTURE
// ═══════════════════════════════════════════════════════════════

function renderRupture() {
  return `
    <div class="card">
      <h3>🚨 Signaler une rupture</h3>
      <label>Produit</label>
      ${selectProduits("ruptureProduit")}
      <br>
      <label>Quantité manquante</label>
      <input id="ruptureQty" placeholder="Ex : 5" inputmode="decimal">
      <br><br>
      <button class="danger" onclick="sendRupture()">Envoyer la rupture</button>
    </div>
  `;
}

async function sendRupture() {
  const produit  = document.getElementById("ruptureProduit").value;
  const quantite = document.getElementById("ruptureQty").value;
  if (!quantite) return alert("Indique une quantité");
  const btn = event.target;
  btn.disabled = true; btn.textContent = "Envoi…";
  const res = await postData({ action: "rupture", employe: user.name, produit, quantite });
  btn.disabled = false; btn.textContent = "Envoyer la rupture";
  alert(res === "OK" ? "✅ Rupture enregistrée" : res);
  if (res === "OK") document.getElementById("ruptureQty").value = "";
}

// ═══════════════════════════════════════════════════════════════
//  ONGLET PERTE
// ═══════════════════════════════════════════════════════════════

function renderPerte() {
  return `
    <div class="card">
      <h3>📉 Déclarer une perte</h3>
      <label>Produit</label>
      ${selectProduits("perteProduit")}
      <br>
      <label>Quantité perdue</label>
      <input id="perteQty" placeholder="Ex : 2" inputmode="decimal">
      <br>
      <label>Motif</label>
      <input id="perteMotif" placeholder="Ex : DLC dépassée, chute…">
      <br>
      <label>Référence photo (optionnel)</label>
      <input id="pertePhoto" placeholder="Ex : perte_accras_2026-03-30.jpg">
      <br><br>
      <button class="danger" onclick="sendPerte()">Envoyer la perte</button>
    </div>
  `;
}

async function sendPerte() {
  const produit  = document.getElementById("perteProduit").value;
  const quantite = document.getElementById("perteQty").value;
  const motif    = document.getElementById("perteMotif")  ? document.getElementById("perteMotif").value  : "";
  const photo    = document.getElementById("pertePhoto")  ? document.getElementById("pertePhoto").value  : "";
  if (!produit)  return alert("Sélectionne un produit");
  if (!quantite) return alert("Indique une quantité");
  const btn = event.target;
  btn.disabled = true; btn.textContent = "Envoi…";
  const res = await postData({ action: "perte", employe: user.name, produit, quantite, motif, photo });
  btn.disabled = false; btn.textContent = "Envoyer la perte";
  alert(res === "OK" ? "✅ Perte enregistrée" : res);
  if (res === "OK") {
    document.getElementById("perteQty").value   = "";
    document.getElementById("perteMotif").value = "";
    document.getElementById("pertePhoto").value = "";
  }
}

// ═══════════════════════════════════════════════════════════════
//  ONGLET INVENTAIRE
// ═══════════════════════════════════════════════════════════════

function renderInventaire() {
  if (produits.length === 0) {
    return `
      <div class="card">
        <h3>📦 Inventaire</h3>
        <p class="small">Aucun produit chargé. Vérifie la feuille STOCK_PRODUITS.</p>
      </div>
    `;
  }

  const lignes = produits.map((p, i) => `
    <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 0;border-bottom:1px solid var(--line);gap:10px">
      <span style="font-size:15px;flex:1">${p}</span>
      <input
        type="number"
        id="inv-${i}"
        placeholder="Qté"
        inputmode="decimal"
        min="0"
        style="width:80px;padding:10px 8px;font-size:15px;border-radius:10px;
               border:1px solid var(--line);background:var(--panel2);
               color:var(--text);text-align:center"
      >
    </div>
  `).join("");

  return `
    <div class="card">
      <h3>📦 Inventaire</h3>
      <p class="small" style="margin-bottom:12px">
        Saisir les quantités en stock. Les produits sous seuil apparaîtront dans la liste de courses dans Google Sheets.
      </p>
      ${lignes}
      <br>
      <button class="success" onclick="sendInventaire()">📤 Envoyer l'inventaire</button>
    </div>
  `;
}

async function sendInventaire() {
  const lignes = produits
    .map((p, i) => {
      const el = document.getElementById("inv-" + i);
      return { produit: p, quantite: el ? el.value : "" };
    })
    .filter(l => l.quantite !== "");

  if (lignes.length === 0) return alert("Saisis au moins une quantité.");

  const btn = event.target;
  btn.disabled = true; btn.textContent = "Envoi…";

  const res = await postData({ action: "inventaire", employe: user.name, lignes });

  btn.disabled = false; btn.textContent = "📤 Envoyer l'inventaire";
  alert(res === "OK" ? "✅ Inventaire enregistré !" : res);

  if (res === "OK") {
    produits.forEach((p, i) => {
      const el = document.getElementById("inv-" + i);
      if (el) el.value = "";
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  ADMIN
// ═══════════════════════════════════════════════════════════════

function renderAdmin() {
  document.getElementById("app").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">🛠 Admin</h2>
      <button class="secondary" style="width:auto;padding:10px 16px" onclick="renderLogin()">Déconnexion</button>
    </div>
    <div class="card">
      <h3>📊 Tableau de bord</h3>
      <div class="row">
        <div class="kpi"><div class="small">Produits</div>
          <div style="font-size:28px;font-weight:700">${produits.length}</div></div>
        <div class="kpi"><div class="small">Tâches MEP</div>
          <div style="font-size:28px;font-weight:700">${checklist.length}</div></div>
        <div class="kpi"><div class="small">Employés</div>
          <div style="font-size:28px;font-weight:700">${config.USERS.length}</div></div>
      </div>
    </div>
    <div class="card">
      <h3>👥 Employés</h3>
      ${config.USERS.map(u => `
        <div class="task">
          <div class="left"><span>${u.name}</span></div>
          <span class="badge">PIN : ${u.pin}</span>
        </div>
      `).join("")}
    </div>
    <div class="card">
      <h3>📋 Tâches MEP du jour</h3>
      ${checklist.length === 0
        ? "<p class='small'>Aucune tâche chargée.</p>"
        : checklist.map(item => `
          <div class="task">
            <div class="left"><span>${item.employe || "Tous"} — ${item.service || ""}</span></div>
            <span class="badge">${item.tache || item.produit || "—"}</span>
          </div>
        `).join("")}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
//  UTILITAIRES
// ═══════════════════════════════════════════════════════════════

function round(n) {
  const num = parseFloat(n);
  return isNaN(num) ? (n || "0") : Math.round(num * 100) / 100;
}

function selectProduits(id) {
  if (produits.length === 0) {
    return `<input id="${id}" placeholder="Nom du produit">`;
  }
  return `
    <select id="${id}">
      ${produits.map(p => `<option value="${p}">${p}</option>`).join("")}
    </select>
  `;
}

async function postData(data) {
  try {
    const res = await fetch(config.APPS_SCRIPT_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(data)
    });
    const text = await res.text();
    try { return JSON.parse(text); } catch { return text || "OK"; }
  } catch (err) {
    console.error("Erreur POST :", err);
    return "ERREUR réseau";
  }
}

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

window.onload = renderLogin;
