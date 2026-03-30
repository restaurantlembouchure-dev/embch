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

  fetch(config.APPS_SCRIPT_URL)
    .then(res => res.json())
    .then(produits => {

      document.getElementById("app").innerHTML = `
        <h2>${user.name}</h2>

        <h3>Rupture</h3>

        <select id="ruptureProduit">
          ${produits.map(p => `<option>${p}</option>`).join("")}
        </select>

        <input id="ruptureQty" placeholder="Quantité">

        <button onclick="sendRupture()">Envoyer</button>

        <br><br>
        <button onclick="renderLogin()">Déconnexion</button>
      `;
    });
}

async function sendRupture() {
  const data = {
    action: "rupture",
    date: new Date().toISOString(),
    service,
    employe: user.name,
    produit: document.getElementById("ruptureProduit").value,
    quantite: document.getElementById("ruptureQty").value
  };

  await fetch(config.APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  alert("Rupture envoyée");
}

async function sendPerte() {
  const data = {
    action: "perte",
    date: new Date().toISOString(),
    service,
    employe: user.name,
    produit: document.getElementById("perteProduit").value,
    quantite: document.getElementById("perteQty").value,
    photo: document.getElementById("pertePhoto").value
  };

  await fetch(config.APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  alert("Perte envoyée");
}

async function validate() {
  const pin = document.getElementById("confirmPin").value;

  if (pin !== user.pin) {
    alert("PIN incorrect");
    return;
  }

  const data = {
    action: "validation",
    date: new Date().toISOString(),
    service,
    employe: user.name
  };

  await fetch(config.APPS_SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(data)
  });

  alert("Validation envoyée");
}

window.onload = renderLogin;
