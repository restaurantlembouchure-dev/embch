const config = window.APP_CONFIG;

let user = null;
let produits = [];

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
  loadProduits();
}

function loadProduits() {
  document.getElementById("app").innerHTML = "<p>Chargement produits...</p>";

  fetch(config.APPS_SCRIPT_URL)
    .then(res => res.json())
    .then(data => {
      produits = data;
      renderApp();
    })
    .catch(err => {
      console.error(err);
      alert("Erreur connexion Google Sheets");
      renderApp(); // fallback
    });
}

function renderApp() {
  document.getElementById("app").innerHTML = `
    <h2>${user.name}</h2>

    <h3>Rupture</h3>

    <select id="ruptureProduit">
      ${produits.length > 0 
        ? produits.map(p => `<option>${p}</option>`).join("") 
        : `<option>Produit manuel</option>`}
    </select>

    <input id="ruptureQty" placeholder="Quantité">

    <button id="ruptureBtn">Envoyer</button>

    <br><br>
    <button id="logoutBtn">Déconnexion</button>
  `;

  document.getElementById("ruptureBtn").addEventListener("click", sendRupture);
  document.getElementById("logoutBtn").addEventListener("click", renderLogin);
}

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

window.onload = renderLogin;
