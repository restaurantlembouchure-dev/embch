const config = window.APP_CONFIG;

let user = null;
let produits = [];
let checklist = [];

const jours = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

function getContext() {
  const now = new Date();
  return {
    jour: jours[now.getDay()],
    service: now.getHours() < 15 ? "Midi" : "Soir"
  };
}

// ─── LOGIN ───────────────────────────────────────────────────────────────────

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
  document.getElementById("pin").addEventListener("keydown", e => {
    if (e.key === "Enter") login();
  });
}

function login() {
  const name = document.getElementById("userSelect").value;
  const pin  = document.getElementById("pin").value;

  // Vérification admin (PIN 9999)
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

// ─── CHARGEMENT DONNÉES ───────────────────────────────────────────────────────

function loadData() {
  document.getElementById("app").innerHTML = `
    <div style="text-align:center;padding:60px 0;color:var(--muted)">
      ⏳ Chargement…
    </div>
  `;

  Promise.all([
    fetch(config.APPS_SCRIPT_URL + "?action=getProduits").then(r => r.json()),
    fetch(config.APPS_SCRIPT_URL + "?action=getMEP").then(r => r.json())
  ])
  .then(([p, m]) => {
    produits  = Array.isArray(p) ? p : [];
    checklist = Array.isArray(m) ? m : [];
    renderApp();
  })
  .catch(err => {
    console.error("Erreur chargement :", err);
    // On continue avec des données vides plutôt que de bloquer
    produits  = [];
    checklist = [];
    renderApp();
  });
}

// ─── APP PRINCIPALE ───────────────────────────────────────────────────────────

function renderApp() {
  if (user.isAdmin) {
    renderAdmin();
    return;
  }

  const { jour, service } = getContext();

  document.getElementById("app").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <h2 style="margin:0">${user.name}</h2>
        <span class="small">${jour} — Service ${service}</span>
      </div>
      <button class="secondary" style="width:auto;padding:10px 16px" onclick="renderLogin()">Déconnexion</button>
    </div>

    ${renderChecklist(jour, service)}

    <div class="card">
      <h3>🚨 Signaler une rupture</h3>
      <label>Produit</label>
      ${selectProduits("ruptureProduit")}
      <br>
      <label>Quantité</label>
      <input id="ruptureQty" placeholder="Ex : 0" inputmode="decimal">
      <br><br>
      <button class="danger" onclick="sendRupture()">Envoyer la rupture</button>
    </div>

    <div class="card">
      <h3>📉 Déclarer une perte</h3>
      <label>Produit</label>
      ${selectProduits("perteProduit")}
      <br>
      <label>Quantité</label>
      <input id="perteQty" placeholder="Ex : 2" inputmode="decimal">
      <br>
      <label>Référence photo (optionnel)</label>
      <input id="pertePhoto" placeholder="Ex : perte_accras_2026-03-30.jpg">
      <br><br>
      <button class="danger" onclick="sendPerte()">Envoyer la perte</button>
    </div>
  `;
}

// ─── CHECKLIST (filtrée par employé + jour + service) ────────────────────────

function renderChecklist(jour, service) {
  // Filtre par employé, jour ET service
  const filtered = checklist.filter(item => {
    const matchEmploye = !item.employe || item.employe.trim() === "" || item.employe.trim() === user.name;
    const matchJour    = item.jour    && item.jour.trim()    === jour;
    const matchService = item.service && item.service.trim() === service;
    return matchEmploye && matchJour && matchService;
  });

  if (filtered.length === 0) {
    return `
      <div class="card">
        <h3>✅ Mise en place</h3>
        <p class="small">Aucune tâche prévue pour ce service.</p>
      </div>
    `;
  }

  return `
    <div class="card">
      <h3>✅ Mise en place — ${filtered.length} tâche(s)</h3>
      ${filtered.map((item, i) => `
        <div class="task" id="task-${i}">
          <div class="left">
            <input type="checkbox" id="chk-${i}" onchange="toggleTask(${i}, this.checked)" style="width:auto;margin:0">
            <span id="task-label-${i}">${item.tache || item.produit || "Tâche"}</span>
          </div>
          ${item.quantite ? `<span class="badge">${round(item.quantite)} ${item.unite || ""}</span>` : ""}
        </div>
      `).join("")}
    </div>
  `;
}

function toggleTask(i, checked) {
  const label = document.getElementById("task-label-" + i);
  const task  = document.getElementById("task-" + i);
  if (checked) {
    label.style.textDecoration = "line-through";
    label.style.color = "var(--muted)";
    task.style.opacity = "0.5";
  } else {
    label.style.textDecoration = "";
    label.style.color = "";
    task.style.opacity = "1";
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

function renderAdmin() {
  document.getElementById("app").innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">🛠 Admin</h2>
      <button class="secondary" style="width:auto;padding:10px 16px" onclick="renderLogin()">Déconnexion</button>
    </div>

    <div class="card">
      <h3>📊 Tableau de bord</h3>
      <div class="row">
        <div class="kpi">
          <div class="small">Produits chargés</div>
          <div style="font-size:28px;font-weight:700">${produits.length}</div>
        </div>
        <div class="kpi">
          <div class="small">Tâches MEP</div>
          <div style="font-size:28px;font-weight:700">${checklist.length}</div>
        </div>
        <div class="kpi">
          <div class="small">Employés</div>
          <div style="font-size:28px;font-weight:700">${config.USERS.length}</div>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>👥 Employés enregistrés</h3>
      ${config.USERS.map(u => `
        <div class="task">
          <div class="left"><span>${u.name}</span></div>
          <span class="badge">PIN : ${u.pin}</span>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h3>📋 Toutes les tâches MEP</h3>
      ${checklist.length === 0
        ? "<p class='small'>Aucune tâche chargée.</p>"
        : checklist.map(item => `
          <div class="task">
            <div class="left">
              <span>${item.employe || "Tous"} — ${item.jour || "?"} ${item.service || ""}</span>
            </div>
            <span class="badge">${item.tache || item.produit || "—"}</span>
          </div>
        `).join("")}
    </div>
  `;
}

// ─── UTILITAIRES ──────────────────────────────────────────────────────────────

function round(n) {
  const num = parseFloat(n);
  return isNaN(num) ? n : Math.round(num * 100) / 100;
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
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(data)
    });
    const text = await res.text();
    return text || "OK";
  } catch (err) {
    console.error("Erreur POST :", err);
    return "ERREUR réseau";
  }
}

async function sendRupture() {
  const produit  = document.getElementById("ruptureProduit").value;
  const quantite = document.getElementById("ruptureQty").value;

  if (!quantite) return alert("Indique une quantité");

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "Envoi…";

  const res = await postData({
    action: "rupture",
    employe: user.name,
    produit,
    quantite
  });

  btn.disabled = false;
  btn.textContent = "Envoyer la rupture";

  alert(res === "OK" ? "✅ Rupture enregistrée" : res);
  if (res === "OK") document.getElementById("ruptureQty").value = "";
}

async function sendPerte() {
  const produit  = document.getElementById("perteProduit").value;
  const quantite = document.getElementById("perteQty").value;
  const photo    = document.getElementById("pertePhoto").value;

  if (!quantite) return alert("Indique une quantité");

  const btn = event.target;
  btn.disabled = true;
  btn.textContent = "Envoi…";

  const res = await postData({
    action: "perte",
    employe: user.name,
    produit,
    quantite,
    photo
  });

  btn.disabled = false;
  btn.textContent = "Envoyer la perte";

  alert(res === "OK" ? "✅ Perte enregistrée" : res);
  if (res === "OK") {
    document.getElementById("perteQty").value = "";
    document.getElementById("pertePhoto").value = "";
  }
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

window.onload = renderLogin;
