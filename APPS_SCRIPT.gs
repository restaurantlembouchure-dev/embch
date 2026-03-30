
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'bootstrap';
  if (action === 'bootstrap') return bootstrap_(e);
  return json_({ok:true, message:'Web app active'});
}

function doPost(e) {
  var data = JSON.parse(e.postData.contents || '{}');
  var action = data.action || '';
  if (action === 'rupture') return handleRupture_(data);
  if (action === 'perte') return handlePerte_(data);
  if (action === 'validation') return handleValidation_(data);
  return json_({ok:false, message:'Action inconnue'});
}

function bootstrap_(e){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var date = e.parameter.date || '';
  var service = e.parameter.service || '';
  var jour = e.parameter.jour || '';

  var usersSheet = ss.getSheetByName('UTILISATEURS');
  var checklistsSheet = ss.getSheetByName('CHECKLISTS');
  var mepSheet = ss.getSheetByName('MISE_EN_PLACE');
  var adminSheet = ss.getSheetByName('ADMIN_DASHBOARD');

  var users = usersSheet.getDataRange().getValues().slice(1).filter(function(r){ return String(r[0]).toLowerCase() === 'oui'; }).map(function(r){
    return {name:r[1], role:r[2], pin:String(r[3])};
  });

  var checklists = checklistsSheet.getDataRange().getValues().slice(1).filter(function(r){
    return String(r[6]).toLowerCase() === 'oui';
  }).map(function(r){
    return {employe:r[0], jour:r[1], service:r[2], categorie:r[3], tache:r[4], critique:r[5]};
  });

  var mep = mepSheet.getDataRange().getValues().slice(1).filter(function(r){
    return String(r[0]) === String(date) && String(r[1]) === String(service);
  }).map(function(r){
    return {date:r[0], service:r[1], plat:r[2], ratio:r[3], qty:r[4], unite:r[5], assigne:r[6]};
  });

  var admin = {};
  if (adminSheet) {
    var rows = adminSheet.getDataRange().getValues();
    for (var i=1; i<rows.length; i++) {
      var key = rows[i][0], val = rows[i][1];
      if (key === 'Total validations') admin.validations = val;
      if (key === 'Total ruptures') admin.ruptures = val;
      if (key === 'Total pertes') admin.pertes = val;
      if (key === 'Produits à commander') admin.commandes = val;
    }
  }

  return json_({users:users, checklists:checklists, mep:mep, admin:admin});
}

function logPhoto_(type, data){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('PHOTOS');
  if (!sh) return;
  sh.appendRow([
    data.horodatage || new Date(),
    type,
    data.employe || '',
    data.date || '',
    data.service || '',
    data.produit || '',
    data.photo || '',
    data.commentaire || data.remarques || ''
  ]);
}

function handleRupture_(data){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('RUPTURES');
  sh.appendRow([
    data.horodatage || new Date(),
    data.date || '',
    data.service || '',
    data.employe || '',
    data.produit || '',
    Number(data.quantite || 0),
    data.commentaire || '',
    'À acheter',
    data.photo || ''
  ]);
  if (data.photo) logPhoto_('Rupture', data);
  return text_('Rupture enregistrée');
}

function handlePerte_(data){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('PERTES');
  sh.appendRow([
    data.horodatage || new Date(),
    data.date || '',
    data.service || '',
    data.employe || '',
    data.produit || '',
    Number(data.quantite || 0),
    data.motif || '',
    data.commentaire || '',
    data.photo || ''
  ]);
  if (data.photo) logPhoto_('Perte', data);
  return text_('Perte enregistrée');
}

function handleValidation_(data){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('VALIDATIONS');
  sh.appendRow([
    data.horodatage || new Date(),
    data.date || '',
    data.service || '',
    data.employe || '',
    JSON.stringify(data.checklist || {}),
    data.remarques || '',
    'Envoyé',
    data.photo || ''
  ]);
  if (data.photo) logPhoto_('Validation', data);

  var params = ss.getSheetByName('PARAMETRES').getDataRange().getValues();
  var managerEmail = '';
  params.forEach(function(r){ if (r[0] === 'Email_manager') managerEmail = r[1]; });

  if (managerEmail) {
    var subject = 'Validation MEP - ' + (data.date || '') + ' - ' + (data.service || '') + ' - ' + (data.employe || '');
    var body = 'Date : ' + (data.date || '') + '\n'
      + 'Service : ' + (data.service || '') + '\n'
      + 'Employé : ' + (data.employe || '') + '\n'
      + 'Horodatage : ' + (data.horodatage || '') + '\n\n'
      + 'Checklist :\n' + JSON.stringify(data.checklist || {}, null, 2) + '\n\n'
      + 'Remarques :\n' + (data.remarques || '') + '\n\n'
      + 'Photo contrôle : ' + (data.photo || '');
    MailApp.sendEmail(managerEmail, subject, body);
  }
  return text_('Validation enregistrée et email envoyé');
}

function json_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function text_(s){
  return ContentService.createTextOutput(String(s)).setMimeType(ContentService.MimeType.TEXT);
}
