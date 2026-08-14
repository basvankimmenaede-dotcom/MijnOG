const views = {
  login: document.getElementById('loginView'),
  home: document.getElementById('homeView'),
  stats: document.getElementById('statsView'),
  agenda: document.getElementById('agendaView'),
  more: document.getElementById('moreView')
};
const nav = document.getElementById('bottomNav');

function showView(name){
  Object.values(views).forEach(v => v.classList.remove('active'));
  views[name].classList.add('active');
  nav.classList.toggle('hidden', name === 'login');
  document.querySelectorAll('.nav-item[data-nav]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.nav === name);
  });
  window.scrollTo({top:0, behavior:'smooth'});
}

document.getElementById('loginForm').addEventListener('submit', (e) => {
  e.preventDefault();
  showView('home');
});

document.querySelectorAll('[data-nav]').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.nav));
});

const status = document.getElementById('attendanceStatus');
document.getElementById('presentBtn').addEventListener('click', () => {
  status.textContent = '✓ Je bent aangemeld voor de training';
  status.classList.add('success');
});
document.getElementById('absentBtn').addEventListener('click', () => {
  status.textContent = 'Afmelding opgeslagen';
  status.classList.remove('success');
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}


// Persoonlijke KNBSB/FOYS-agendakoppeling (prototype: lokaal opgeslagen).
const knbsbInput = document.getElementById('knbsbIcsUrl');
const knbsbBadge = document.getElementById('knbsbBadge');
const knbsbMessage = document.getElementById('knbsbMessage');
const saveKnbsbBtn = document.getElementById('saveKnbsbBtn');
const removeKnbsbBtn = document.getElementById('removeKnbsbBtn');

function isValidKnbsbIcsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' &&
      url.hostname === 'api.foys.io' &&
      /\/competition\/public-api\/v1\/persons\/[^/]+\/ics\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

function updateKnbsbConnection(value) {
  const connected = Boolean(value);
  knbsbBadge.textContent = connected ? 'Gekoppeld' : 'Niet gekoppeld';
  knbsbBadge.classList.toggle('connected', connected);
  if (connected) knbsbInput.value = value;
}

const savedKnbsbUrl = localStorage.getItem('mijnOgKnbsbIcsUrl') || '';
updateKnbsbConnection(savedKnbsbUrl);

saveKnbsbBtn.addEventListener('click', () => {
  const value = knbsbInput.value.trim();
  if (!isValidKnbsbIcsUrl(value)) {
    knbsbMessage.textContent = 'Dit lijkt niet op een geldige persoonlijke KNBSB/FOYS agenda-link.';
    knbsbMessage.classList.add('error-text');
    return;
  }
  localStorage.setItem('mijnOgKnbsbIcsUrl', value);
  updateKnbsbConnection(value);
  knbsbMessage.textContent = '✓ KNBSB-agenda gekoppeld. In de echte versie bewaren we deze koppeling privé bij je account.';
  knbsbMessage.classList.remove('error-text');
});

removeKnbsbBtn.addEventListener('click', () => {
  localStorage.removeItem('mijnOgKnbsbIcsUrl');
  knbsbInput.value = '';
  updateKnbsbConnection('');
  knbsbMessage.textContent = 'KNBSB-koppeling verwijderd.';
  knbsbMessage.classList.remove('error-text');
});
