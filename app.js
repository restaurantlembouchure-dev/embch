const config = window.APP_CONFIG;

let user = null;

function renderLogin() {
  document.getElementById("app").innerHTML = `
    <h2>${config.RESTAURANT_NAME}</h2>
    <p>Connexion</p>
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
    <h2>Bienvenue ${user.name}</h2>

    <h3>Mise en place</h3>
    <label><input type="checkbox"> Vérifier stock</label><br>
    <label><input type="checkbox"> Préparer poste</label><br>

    <h3>Rupture</h3>
    <input id="rupture" placeholder="Produit">
    <button onclick="alert('Rupture enregistrée')">Envoyer</button>

    <h3>Pertes</h3>
    <input id="perte" placeholder="Produit">
    <button onclick="alert('Perte enregistrée')">Envoyer</button>

    <br><br>
    <button onclick="renderLogin()">Déconnexion</button>
  `;
}

window.onload = renderLogin;
