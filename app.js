const config = window.APP_CONFIG;

let user = null;
let produits = [];
let checklist = [];

const jours = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

function getJourService() {
  const now = new Date();
  const jour = jours[now.getDay()];
  const service = now.getHours() < 15 ? "Midi" : "Soir";
  return { jour, service };
}

/* ================= LOGIN ================= */

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <h2>${config.RESTAURANT_NAME}</h2>

    <select id="userSelect">
      ${config.SAMPLE_USERS.map(u => `<option value="${u.name}">${u.name}</option>`).join("")}
    </select>

    <input id="pinInput" placeholder="PIN" type="password"/>

    <button id="loginBtn">Se connecter</button>
  `;

  document.getElementById("loginBtn").addEventListener("click", login);
}

function login() {
  const name = document.getElementById("userSelect").value;
  const pin = document.getElementById("pinInput").value;

  const found = config.SAMPLE_USERS.find(u => u.name === name && u.pin === pin);

  if (!found) {
    alert("PIN incorrect");
    return;
  }

  user = found;
  loadData();
}

/* ================= LOAD DATA ================= */

function loadData() {
  document.getElementById("app").innerHTML = "<p>Chargement...</p>";

  Promise.all([
    fetch(config.APPS_SCRIPT_URL + "?action=getProduits").then(r => r.text()),
    fetch(config.APPS_SCRIPT_URL + "?action=getChecklist").then(r => r.text())
  ])
  .then(([prodText, checklistText]) => {

    try {
      produits = JSON.parse(prodText);
      checklist = JSON.parse(checklistText);
    } catch (e) {
      console.error("Erreur JSON:", e);
      alert("Erreur parsing données");
      produits = [];
      checklist = [];
    }

    renderApp();
  })
  .catch(err => {
    console.error(err);
    alert("Erreur connexion Google Sheets");
    renderApp();
  });
}

/* ================= APP ================= */

function renderApp() {

  const { jour, service } = getJourService();

  document.getElementById("app").innerHTML = `
    <h2>${user.name}</h2>
    <p>${jour} - ${service}</p>

    ${renderChecklist(jour, service)}

    <h3>Rupture</h3>
    <select id="ruptureProduit">
      ${produits.map(p => `<option>${p}</option>`).join("")}
    </select>

    <input id="ruptureQty" placeholder="Quantité">
    <button id="ruptureBtn">Envoyer</button>

    <br><br>
    <button id="logoutBtn">Déconnexion</button>
  `;

  document.getElementById("ruptureBtn").addEventListener("click", sendRupture);
  document.getElementById("logoutBtn").addEventListener("click", renderLogin);
}

/* ================= CHECKLIST ================= */

function renderChecklist(jour, service) {

  const filtered = checklist.filter(item =>
    item.employe === user.name &&
    item.jour === jour &&
    item.service === service
  );

  if (filtered.length === 0) {
    return "<p>Aucune tâche prévue</p>";
  }

  return `
    <h3>Checklist</h3>
    ${filtered.map(t => `
      <label>
        <input type="checkbox"> ${t.tache}
      </label><br>
    `).join("")}
  `;
}

/* ================= RUPTURE ================= */

async function sendRupture() {

  const data = {
    action: "rupture",
    employe: user.name,
    produit: document.getElementById("ruptureProduit").value,
    quantite: document.getElementById("ruptureQty").value
  };

  try {
    const res = await fetch(config.APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data)
    });

    const txt = await res.text();
    alert("OK : " + txt);

  } catch (e) {
    alert("Erreur envoi");
  }
}

/* ================= INIT ================= */

window.onload = renderLogin;
