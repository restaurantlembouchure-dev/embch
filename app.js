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

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <h2>${config.RESTAURANT_NAME}</h2>

    <select id="user">
      ${config.USERS.map(u => `<option>${u.name}</option>`).join("")}
    </select>

    <input id="pin" type="password" placeholder="PIN">
    <button id="loginBtn">Connexion</button>
  `;

  document.getElementById("loginBtn").onclick = login;
}

function login() {
  const name = document.getElementById("user").value;
  const pin = document.getElementById("pin").value;

  const found = config.USERS.find(u => u.name === name && u.pin === pin);

  if (!found) return alert("PIN incorrect");

  user = found;
  loadData();
}

function loadData() {
  document.getElementById("app").innerHTML = "Chargement...";

  Promise.all([
    fetch(config.APPS_SCRIPT_URL + "?action=getProduits").then(r => r.text()),
    fetch(config.APPS_SCRIPT_URL + "?action=getMEP").then(r => r.text())
  ])
  .then(([p, m]) => {
    produits = JSON.parse(p);
    checklist = JSON.parse(m); // ⚠️ ici checklist devient MEP
    renderApp();
  })
  .catch(() => {
    alert("Erreur connexion");
    renderApp();
  });
}

function renderApp() {
  const { jour, service } = getContext();

  document.getElementById("app").innerHTML = `
    <h2>${user.name}</h2>
    <p>${jour} - ${service}</p>

    ${renderChecklist(jour, service)}

    <h3>Rupture</h3>
    ${selectProduits("ruptureProduit")}
    <input id="ruptureQty" placeholder="Quantité">
    <button onclick="sendRupture()">Envoyer</button>

    <h3>Pertes</h3>
    ${selectProduits("perteProduit")}
    <input id="perteQty" placeholder="Quantité">
    <input id="pertePhoto" placeholder="Photo">
    <button onclick="sendPerte()">Envoyer</button>

    <br><br>
    <button onclick="renderLogin()">Déconnexion</button>
  `;
}

unction renderChecklist(jour, service) {

  const filtered = checklist.filter(item =>
    item.jour === jour &&
    item.service === service
  );

  if (filtered.length === 0) {
    return "<p>Aucune mise en place prévue</p>";
  }

  return `
    <h3>Mise en place</h3>
    ${filtered.map(item => `
      <label>
        <input type="checkbox">
        ${item.produit} : ${round(item.quantite)} ${item.unite}
      </label><br>
    `).join("")}
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

function selectProduits(id) {
  return `
    <select id="${id}">
      ${produits.map(p => `<option>${p}</option>`).join("")}
    </select>
  `;
}

async function postData(data) {
  try {
    const res = await fetch(config.APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(data)
    });
    return await res.text();
  } catch {
    return "ERREUR";
  }
}

async function sendRupture() {
  const res = await postData({
    action: "rupture",
    employe: user.name,
    produit: document.getElementById("ruptureProduit").value,
    quantite: document.getElementById("ruptureQty").value
  });

  alert(res);
}

async function sendPerte() {
  const res = await postData({
    action: "perte",
    employe: user.name,
    produit: document.getElementById("perteProduit").value,
    quantite: document.getElementById("perteQty").value,
    photo: document.getElementById("pertePhoto").value
  });

  alert(res);
}

window.onload = renderLogin;
