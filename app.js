
const cfg = window.APP_CONFIG || {};
const state = { user:null, today:null, mep:[], checklists:[], checklist:{}, admin:null };

function getTodayInfo(){
  const now = new Date();
  const h = now.getHours() * 60 + now.getMinutes();
  const service = (h >= 8*60 && h <= 15*60) ? 'Midi' : 'Soir';
  const date = now.toISOString().slice(0,10);
  const jour = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][now.getDay()];
  return {date, jour, service, datetime: now.toLocaleString('fr-FR')};
}
function persist(){ localStorage.setItem('restaurantOSStateV5', JSON.stringify(state)); }
function restore(){ try{ const s = JSON.parse(localStorage.getItem('restaurantOSStateV5')); if(s) Object.assign(state, s); }catch(e){} }
function q(sel){ return document.querySelector(sel); }
function esc(s){ return String(s||'').replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

async function bootstrapData(){
  state.today = getTodayInfo();
  if(!cfg.APPS_SCRIPT_URL){
    return {
      users: cfg.SAMPLE_USERS || [],
      checklists: [
        {employe:'Christelle', jour:'Lundi', service:'Midi', tache:'Vérifier stock froid'},
        {employe:'Christelle', jour:'Lundi', service:'Midi', tache:'Préparer accras et entrées froides'},
        {employe:'Ludovic', jour:'Lundi', service:'Midi', tache:'Contrôler viandes et poissons du jour'},
        {employe:'Lesli', jour:'Vendredi', service:'Soir', tache:'Renfort plonge et remise au propre'}
      ],
      mep: [
        {plat:'Accras', qty: 3, unite:'portion', assigne:'Christelle'},
        {plat:'Frites maison', qty: 16, unite:'portion', assigne:'Ludovic'},
        {plat:'Fondant chocolat', qty: 5, unite:'portion', assigne:'Christelle'}
      ],
      admin: {validations:2, ruptures:1, pertes:1, commandes:3}
    };
  }
  const url = cfg.APPS_SCRIPT_URL + '?action=bootstrap&date=' + encodeURIComponent(state.today.date) + '&service=' + encodeURIComponent(state.today.service) + '&jour=' + encodeURIComponent(state.today.jour);
  const res = await fetch(url);
  return await res.json();
}

function loginView(){
  const t = getTodayInfo();
  const options = (cfg.SAMPLE_USERS||[]).map(u => `<option value="${esc(u.name)}">${esc(u.name)}</option>`).join('');
  return `
    <div class="card">
      <h1>${esc(cfg.RESTAURANT_NAME || 'Restaurant OS')}</h1>
      <div class="small">${t.jour} ${t.date} - service détecté : <strong>${t.service}</strong></div>
      ${cfg.IOS_INSTALL_HINT ? `<div class="small" style="margin-top:8px">iPhone/iPad : ouvrir avec Safari puis Partager → Ajouter à l'écran d'accueil.</div>` : ``}
    </div>
    <div class="card">
      <h2>Connexion salarié</h2>
      <div class="row">
        <div><label>Employé</label><select id="userName">${options}</select></div>
        <div><label>PIN</label><input id="userPin" inputmode="numeric" type="password" placeholder="PIN 4 chiffres" /></div>
      </div>
      <div style="margin-top:12px"><button id="btnLogin">Se connecter</button></div>
    </div>`;
}

function adminPanel(){
  if(!state.user || state.user.role !== 'Admin') return '';
  const a = state.admin || {};
  return `
    <div class="card">
      <h2>Écran admin avancé</h2>
      <div class="row">
        <div class="kpi"><div class="small">Validations</div><strong>${esc(a.validations||0)}</strong></div>
        <div class="kpi"><div class="small">Ruptures</div><strong>${esc(a.ruptures||0)}</strong></div>
        <div class="kpi"><div class="small">Pertes</div><strong>${esc(a.pertes||0)}</strong></div>
        <div class="kpi"><div class="small">Produits à commander</div><strong>${esc(a.commandes||0)}</strong></div>
      </div>
      <div class="small" style="margin-top:10px">Les KPI réels sont servis par l'onglet ADMIN_DASHBOARD via Apps Script.</div>
    </div>`;
}

function dashboardView(){
  const filteredMEP = state.mep.filter(x => !x.assigne || x.assigne === state.user.name || state.user.role === 'Admin');
  const mepRows = filteredMEP.map((x, idx) => `
      <div class="task">
        <div class="left">
          <input type="checkbox" data-mep="${idx}" ${state.checklist['mep_'+idx] ? 'checked' : ''}/>
          <div><strong>${esc(x.plat)}</strong><div class="small">${esc(String(x.qty))} ${esc(x.unite||'')}</div></div>
        </div>
        <span class="badge">${esc(x.assigne || '')}</span>
      </div>`).join('');

  const myChecklist = state.checklists.filter(x =>
    (x.employe === state.user.name || state.user.role === 'Admin') &&
    x.jour === state.today.jour &&
    x.service === state.today.service
  );
  const taskRows = myChecklist.map((t, idx) => `
      <div class="task">
        <div class="left">
          <input type="checkbox" data-task="${idx}" ${state.checklist['task_'+idx] ? 'checked' : ''}/>
          <div>${esc(t.tache)} <div class="small">${esc(t.categorie||'')}</div></div>
        </div>
      </div>`).join('');

  const checkedCount = Object.values(state.checklist).filter(Boolean).length;
  return `
    <div class="card">
      <div class="row">
        <div class="kpi"><div class="small">Employé</div><strong>${esc(state.user.name)}</strong></div>
        <div class="kpi"><div class="small">Date</div><strong>${esc(state.today.date)}</strong></div>
        <div class="kpi"><div class="small">Jour</div><strong>${esc(state.today.jour)}</strong></div>
        <div class="kpi"><div class="small">Service</div><strong>${esc(state.today.service)}</strong></div>
        <div class="kpi"><div class="small">Points cochés</div><strong>${checkedCount}</strong></div>
      </div>
    </div>

    ${adminPanel()}

    <div class="card">
      <h2>Mise en place du service</h2>
      ${mepRows || `<div class="small">Aucune ligne de MEP pour ce service.</div>`}
    </div>

    <div class="card">
      <h2>Checklist personnalisée</h2>
      ${taskRows || `<div class="small">Aucune checklist spécifique pour ${esc(state.user.name)} aujourd'hui.</div>`}
    </div>

    <div class="card">
      <h2>Signaler une rupture</h2>
      <div class="row">
        <div><label>Produit</label><input id="ruptureProduit" placeholder="Ex : Crevettes"/></div>
        <div><label>Quantité manquante</label><input id="ruptureQty" inputmode="decimal" placeholder="Ex : 2"/></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div><label>Commentaire</label><input id="ruptureComment" placeholder="Détail de la rupture"></div>
        <div><label>Photo (nom ou lien)</label><input id="rupturePhoto" placeholder="photo.jpg ou lien"/></div>
      </div>
      <div style="margin-top:12px"><button id="btnRupture" class="danger">Envoyer la rupture</button></div>
    </div>

    <div class="card">
      <h2>Déclarer une perte de produit préparé</h2>
      <div class="row">
        <div><label>Produit préparé</label><input id="perteProduit" placeholder="Ex : Accras"/></div>
        <div><label>Quantité perdue</label><input id="perteQty" inputmode="decimal" placeholder="Ex : 1"/></div>
      </div>
      <div class="row" style="margin-top:10px">
        <div><label>Motif</label>
          <select id="perteMotif">
            <option>Invendu</option>
            <option>Surproduction</option>
            <option>DLU/DLC dépassée</option>
            <option>Erreur de préparation</option>
            <option>Incident produit</option>
          </select>
        </div>
        <div><label>Photo justificative (nom ou lien)</label><input id="pertePhoto" placeholder="photo.jpg ou lien"/></div>
      </div>
      <div style="margin-top:10px"><label>Commentaire</label><input id="perteComment" placeholder="Détail"/></div>
      <div style="margin-top:12px"><button id="btnPerte" class="secondary">Enregistrer la perte</button></div>
    </div>

    <div class="card">
      <h2>Validation de mise en place</h2>
      <div class="row">
        <div><label>Photo contrôle final (nom ou lien)</label><input id="validationPhoto" placeholder="photo.jpg ou lien" /></div>
        <div><label>Confirmer PIN</label><input id="confirmPin" type="password" inputmode="numeric" placeholder="PIN" /></div>
      </div>
      <div style="margin-top:10px"><label>Remarques</label><textarea id="validationRemarks" rows="3" placeholder="Remarques éventuelles"></textarea></div>
      <div style="margin-top:12px"><button id="btnValidate" class="success">Valider et envoyer le rapport</button></div>
    </div>

    <div class="nav">
      <div class="row">
        <button id="btnRefresh" class="secondary">Actualiser</button>
        <button id="btnLogout" class="secondary">Déconnexion</button>
      </div>
    </div>`;
}

function bindLogin(){
  q('#btnLogin').onclick = async () => {
    const name = q('#userName').value;
    const pin = q('#userPin').value.trim();
    const boot = await bootstrapData();
    const users = boot.users || cfg.SAMPLE_USERS || [];
    const user = users.find(u => u.name === name && String(u.pin) === pin);
    if(!user){ alert('PIN ou utilisateur incorrect'); return; }
    state.user = user;
    state.mep = boot.mep || [];
    state.checklists = boot.checklists || [];
    state.admin = boot.admin || {};
    state.checklist = {};
    persist();
    render();
  };
}
function bindApp(){
  document.querySelectorAll('[data-mep]').forEach(el => el.onchange = e => { state.checklist['mep_'+e.target.getAttribute('data-mep')] = e.target.checked; persist(); });
  document.querySelectorAll('[data-task]').forEach(el => el.onchange = e => { state.checklist['task_'+e.target.getAttribute('data-task')] = e.target.checked; persist(); });

  q('#btnLogout').onclick = ()=>{ state.user=null; persist(); render(); };
  q('#btnRefresh').onclick = async ()=>{ const boot = await bootstrapData(); state.mep = boot.mep || state.mep; state.checklists = boot.checklists || state.checklists; state.admin = boot.admin || state.admin; persist(); render(); };
  q('#btnRupture').onclick = async ()=> await postAction('rupture', {
    produit: q('#ruptureProduit').value,
    quantite: q('#ruptureQty').value,
    commentaire: q('#ruptureComment').value,
    photo: q('#rupturePhoto').value
  });
  q('#btnPerte').onclick = async ()=> await postAction('perte', {
    produit: q('#perteProduit').value,
    quantite: q('#perteQty').value,
    motif: q('#perteMotif').value,
    commentaire: q('#perteComment').value,
    photo: q('#pertePhoto').value
  });
  q('#btnValidate').onclick = async ()=> {
    const pin = q('#confirmPin').value.trim();
    if(String(pin) !== String(state.user.pin)){ alert('PIN de confirmation incorrect'); return; }
    await postAction('validation', {
      checklist: state.checklist,
      remarques: q('#validationRemarks').value,
      photo: q('#validationPhoto').value
    });
  };
}

async function postAction(action, payload){
  const body = Object.assign({
    action,
    date: state.today.date,
    service: state.today.service,
    employe: state.user.name,
    horodatage: new Date().toLocaleString('fr-FR')
  }, payload || {});
  if(!cfg.APPS_SCRIPT_URL){
    console.log('Mode démo', body);
    alert(action === 'validation' ? 'Validation enregistrée en mode test.' : 'Enregistré en mode test.');
    return;
  }
  const res = await fetch(cfg.APPS_SCRIPT_URL, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(body)
  });
  const txt = await res.text();
  alert(txt || 'Action envoyée');
}

restore();
render();
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=> navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
