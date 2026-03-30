const config = window.APP_CONFIG;

let user = null;

const today = new Date();
const jour = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"][today.getDay()];
const heure = today.getHours();
const service = (heure < 15) ? "Midi" : "Soir";

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <h2>${config.RESTAURANT_NAME}</h2>
    <p>${jour} - Service ${service}</p>

    <select id="user">
      ${config.SAMPLE_USERS.map(u => `<option value="${u.name}">${u.name}</option>`).join("")}
    </select>

    <input id="pin" placeholder="PIN" type="password"/>

    <button onclick="login()">Se connecter</button>
  `;
}

function login() {
  const name = document.getElementById("user").value;
  const pin = document.getElementById("pin").value;

  const found = config.SAMPLE_USERS.find(u => u.name === name && u.pin === pin);

  if (!found) {
    alert("PIN incorrect");
    return;
  }

  user = found;
  renderApp();
}

function renderApp() {
  document.getElementById("app").innerHTML = `
    <h2>${user.name}</h2>
    <p>${jour} - ${service}</p>

    ${renderChecklist()}
    ${renderRupture()}
    ${renderPerte()}
    ${renderValidation()}

    <br><br>
    <button onclick="renderLogin()">Déconnexion</button>
  `;
}

function renderChecklist() {
  return `
    <h3>Checklist</h3>
    <label><input type="checkbox"> Vérifier stock</label><br>
    <label><input type="checkbox"> Préparer poste</label><br>
  `;
}

function renderRupture() {
  return `
    <h3>Rupture</h3>
    <input id="ruptureProduit" placeholder="Produit">
    <input id="ruptureQty" placeholder="Quantité">
    <button onclick="sendRupture()">Envoyer</button>
  `;
}

function renderPerte() {
  return `
    <h3>Pertes</h3>
    <input id="perteProduit" placeholder="Produit">
    <input id="perteQty" placeholder="Quantité">
    <input id="pertePhoto" placeholder="Photo (nom)">
    <button onclick="sendPerte()">Envoyer</button>
  `;
}

function renderValidation() {
  return `
    <h3>Validation</h3>
    <input id="confirmPin" placeholder="PIN" type="password">
    <button onclick="validate()">Valider</button>
  `;
}

function sendRupture() {
  alert("Rupture enregistrée");
}

function sendPerte() {
  alert("Perte enregistrée");
}

function validate() {
  const pin = document.getElementById("confirmPin").value;

  if (pin !== user.pin) {
    alert("PIN incorrect");
    return;
  }

  alert("Validation envoyée");
}

window.onload = renderLogin;
