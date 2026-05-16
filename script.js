const welcomePage     = document.getElementById('welcome-page');
const authPage        = document.getElementById('auth-page');
const mainDashboard   = document.getElementById('main-dashboard');
const startBtn        = document.getElementById('start-btn');
const formTitle       = document.getElementById('form-title');
const formDesc        = document.getElementById('form-desc');
const usernameInput   = document.getElementById('username');
const passwordInput   = document.getElementById('password');
const submitBtn       = document.getElementById('submit-btn');
const switchText      = document.getElementById('switch-text');
const userGreeting    = document.getElementById('user-greeting');
const displayDistance = document.getElementById('display-distance');
const displayTime     = document.getElementById('display-time');
const startRunBtn     = document.getElementById('start-run-btn');
const findMeBtn       = document.getElementById('find-me-btn');
const totalLibDisplay = document.getElementById('total-library-distance');

// Burger menu elementlari
const menuToggleBtn   = document.getElementById('menu-toggle-btn');
const sideMenu        = document.getElementById('side-menu');
const closeMenuBtn    = document.getElementById('close-menu-btn');

let isLoginMode    = false;
let currentUser    = null;
let map            = null;
let marker         = null;
let polyline       = null;
let watchId        = null;
let timerInterval  = null;
let startTime      = null;
let elapsedSeconds = 0;
let totalDistance  = 0;
let pathCoords     = [];
let lastCoord      = null;
let isRunning      = false;

function getUsers() { return JSON.parse(localStorage.getItem('challenge_run_users') || '{}'); }
function saveUsers(users) { localStorage.setItem('challenge_run_users', JSON.stringify(users)); }
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash << 5) - hash + str.charCodeAt(i); hash |= 0; }
  return hash.toString(16);
}

function showPage(pageId) {
  [welcomePage, authPage, mainDashboard].forEach(p => p && p.classList.add('hidden'));
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.remove('hidden');
}

function setAuthMode(loginMode) {
  isLoginMode = loginMode;
  if (loginMode) {
    if(formTitle) formTitle.textContent  = 'TIZIMGA KIRISH';
    if(formDesc) formDesc.textContent   = 'Profilingizga kirish';
    if(submitBtn) submitBtn.textContent  = 'KIRISH';
    if(switchText) switchText.textContent = "Profil yo'q mi? Ro'yxatdan o'ting";
  } else {
    if(formTitle) formTitle.textContent  = "RO'YXATDAN O'TISH";
    if(formDesc) formDesc.textContent   = 'Ilova uchun yangi profil yarating';
    if(submitBtn) submitBtn.textContent  = 'YUBORISH';
    if(switchText) switchText.textContent = 'Sizda profil bormi? Tizimga kirish';
  }
}

if(startBtn) startBtn.addEventListener('click', () => { setAuthMode(false); showPage('auth-page'); });
if(switchText) switchText.addEventListener('click', () => setAuthMode(!isLoginMode));

if(submitBtn) {
  submitBtn.addEventListener('click', () => {
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!username || !password) { showToast("Barcha maydonlarni to'ldiring!", 'error'); return; }
    const users = getUsers();

    if (!isLoginMode) {
      if (users[username]) { showToast('Bu login band!', 'error'); return; }
      users[username] = simpleHash(password);
      saveUsers(users);
      showToast('Profil yaratildi! Endi kiring.', 'success');
      setAuthMode(true);
    } else {
      if (!users[username] || users[username] !== simpleHash(password)) { showToast("Login yoki parol noto'g'ri!", 'error'); return; }
      currentUser = username;
      localStorage.setItem('challenge_run_session', username);
      enterDashboard();
    }
  });
}

function enterDashboard() {
  if(userGreeting) userGreeting.textContent = `Salom, ${currentUser}! 👋`;
  showPage('main-dashboard');
  resetStats();
  updateLibraryDistance();
  updateLeaderboard(); // Reytingni yuklash
  setTimeout(initMap, 100);
}

function updateLibraryDistance() {
  if (!currentUser) return;
  const historyKey = `run_history_${currentUser}`;
  const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
  let jami = 0;
  currentHistory.forEach(run => { jami += parseFloat(run.distance || 0); });
  if (totalLibDisplay) totalLibDisplay.textContent = jami.toFixed(2) + ' km';
}

// JONLI REYTING FUNKSIYASI (JS ORQALI DINAMIK QO'SHILADI)
function updateLeaderboard() {
  const menuBody = document.querySelector('.menu-body');
  if (!menuBody) return;

  // Agar reyting bloki oldindan bo'lmasa, uni yaratamiz
  let ratingSection = document.getElementById('menu-rating-section');
  if (!ratingSection) {
    ratingSection = document.createElement('div');
    ratingSection.id = 'menu-rating-section';
    ratingSection.className = 'menu-rating-section';
    ratingSection.innerHTML = `
      <div class="menu-stat-label" style="margin-bottom: 10px; color: var(--green);">🏆 TOP REYTING:</div>
      <div id="leaderboard-list" class="leaderboard-container"></div>
    `;
    menuBody.appendChild(ratingSection);
  }

  const leaderboardList = document.getElementById('leaderboard-list');
  if (!leaderboardList) return;
  leaderboardList.innerHTML = '';

  const users = getUsers();
  const leaderboardData = [];

  Object.keys(users).forEach(username => {
    const historyKey = `run_history_${username}`;
    const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
    let jamiMasofa = 0;
    currentHistory.forEach(run => { jamiMasofa += parseFloat(run.distance || 0); });
    leaderboardData.push({ username: username, totalDistance: jamiMasofa });
  });

  // Kattadan kichikka saralash
  leaderboardData.sort((a, b) => b.totalDistance - a.totalDistance);

  leaderboardData.forEach((user, index) => {
    const rank = index + 1;
    let rankClass = ''; let medal = '';
    if (rank === 1) { rankClass = 'rank-1'; medal = '🥇 '; }
    else if (rank === 2) { rankClass = 'rank-2'; medal = '🥈 '; }
    else if (rank === 3) { rankClass = 'rank-3'; medal = '🥉 '; }

    const item = document.createElement('div');
    item.className = `leaderboard-item ${rankClass}`;
    item.innerHTML = `
      <div>
        <span class="rank-number">${medal || rank + '.'}</span>
        <span class="rank-name">${user.username} ${user.username === currentUser ? '(Siz)' : ''}</span>
      </div>
      <span class="rank-distance">${user.totalDistance.toFixed(2)} km</span>
    `;
    leaderboardList.appendChild(item);
  });
}

function renderHistoryLines() {
  if (!map) return;

  const users = getUsers(); // Barcha foydalanuvchilarni olamiz

  // Har bitta foydalanuvchining yugurgan yo'llarini bittalab aylanib chiqamiz
  Object.keys(users).forEach(username => {
    const historyKey = `run_history_${username}`;
    const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');

    currentHistory.forEach(run => {
      if (run.coords && run.coords.length > 1) {
        
        // Agar yo'l joriy foydalanuvchiga (Sizga) tegishli bo'lsa - och ko'k rangda chizadi
        // Agar boshqa foydalanuvchilarga tegishli bo'lsa - neon pushti (magenta) rangda chizadi
        const lineColor = (username === currentUser) ? '#00bfff' : '#ff00ff';
        
        L.polyline(run.coords, { 
          color: lineColor, 
          weight: 4, 
          opacity: 0.5,       // Orqada xalaqit bermasligi uchun biroz xira (transparent) qildik
          dashArray: '5, 10'  // Nuqtali chiziq effektida ko'rinadi
        }).addTo(map);
      }
    });
  });
}


function toRad(deg) { return deg * (Math.PI / 180); }
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1); const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function initMap() {
  if (map) { map.invalidateSize(); return; }
  map = L.map('map-zone', { zoomControl: true, attributionControl: false }).setView([39.0225, 68.1969], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  const greenIcon = L.divIcon({
    className: '',
    html: `<div style="position:relative;width:22px;height:22px;"><div style="position:absolute;inset:0;background:rgba(0,255,136,0.35);border-radius:50%;animation:pulse 1.5s infinite;"></div><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;background:#00ff88;border:2px solid #fff;border-radius:50%;box-shadow:0 0 8px #00ff88;"></div></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
  marker = L.marker([39.0225, 68.1969], { icon: greenIcon }).addTo(map);
  polyline = L.polyline([], { color: '#ff4444', weight: 4, opacity: 0.9 }).addTo(map);

  renderHistoryLines();
}

if(startRunBtn) startRunBtn.addEventListener('click', () => { if (!isRunning) beginRun(); else endRun(); });

function beginRun() {
  if (!navigator.geolocation) { showToast("Qurilmangiz GPS ni qo'llab-quvvatlamaydi!", 'error'); return; }
  isRunning = true; totalDistance = 0; elapsedSeconds = 0; pathCoords = []; lastCoord = null; startTime = Date.now();
  if(displayDistance) displayDistance.textContent = '0.00 km'; 
  if(displayTime) displayTime.textContent = '00:00:00';
  if (polyline) polyline.setLatLngs([]);
  startRunBtn.textContent = "TO'XTATISH ⏹"; startRunBtn.classList.add('btn-danger');

  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    if(displayTime) displayTime.textContent = formatTime(elapsedSeconds);
  }, 1000);

  watchId = navigator.geolocation.watchPosition(onPositionUpdate, onPositionError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 });
  showToast('Yugurish boshlandi! GPS qidirilmoqda... 🏃', 'success');
}

function onPositionUpdate(position) {
  const lat = position.coords.latitude; const lng = position.coords.longitude;
  pathCoords.push([lat, lng]);
  if (marker) marker.setLatLng([lat, lng]);
  if (map) map.setView([lat, lng], map.getZoom(), { animate: true });
  if (polyline) polyline.setLatLngs(pathCoords);
  if (lastCoord) { 
    totalDistance += haversineDistance(lastCoord.lat, lastCoord.lng, lat, lng); 
    if(displayDistance) displayDistance.textContent = totalDistance.toFixed(2) + ' km'; 
  }
  lastCoord = { lat, lng };
}

function onPositionError(error) { console.log('GPS kutilmoqda...'); }

function endRun() {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
  if (timerInterval !== null) { clearInterval(timerInterval); timerInterval = null; }
  isRunning = false; startRunBtn.textContent = 'YUGURISHNI BOSHLASH'; startRunBtn.classList.remove('btn-danger');

  const runData = { date: new Date().toLocaleDateString(), distance: totalDistance.toFixed(2), time: formatTime(elapsedSeconds), coords: pathCoords };
  const historyKey = `run_history_${currentUser}`;
  const currentHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
  currentHistory.push(runData);
  localStorage.setItem(historyKey, JSON.stringify(currentHistory));

  updateLibraryDistance();
  updateLeaderboard(); // Tugatganda ham reyting yangilanadi

  if (pathCoords.length > 1) { L.polyline(pathCoords, { color: '#00bfff', weight: 4, opacity: 0.6, dashArray: '5, 10' }).addTo(map); }
  showRunSummary();
}

function showRunSummary() {
  const hours = elapsedSeconds / 3600 || 0.0001; const speed = (totalDistance / hours).toFixed(2);
  const paceMin = totalDistance > 0 ? Math.floor(elapsedSeconds / 60 / totalDistance) : 0;
  const paceSec = totalDistance > 0 ? Math.floor((elapsedSeconds / totalDistance) % 60) : 0;
  const overlay = document.createElement('div');
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(10px);padding:16px;`;
  overlay.innerHTML = `
    <div style="background:#0d0d1a;border:1px solid #00ff88;border-radius:20px;padding:32px 24px;text-align:center;max-width:340px;width:100%;box-shadow:0 0 60px rgba(0,255,136,0.2);">
      <div style="font-size:52px;margin-bottom:8px;">🏁</div>
      <h2 style="font-family:'Orbitron',monospace;color:#00ff88;margin:0 0 24px;font-size:1.1rem;letter-spacing:4px;">NATIJALAR</h2>
      <div style="display:grid;gap:10px;">
        ${[['MASOFA', `${totalDistance.toFixed(2)} <span style="font-size:13px;color:#555">km</span>`],['VAQT', formatTime(elapsedSeconds)],["O'RTACHA TEZLIK", `${speed} <span style="font-size:13px;color:#555">km/h</span>`],['TEMP', `${paceMin}:${String(paceSec).padStart(2,'0')} <span style="font-size:13px;color:#555">min/km</span>`]].map(([label, val]) => `<div style="background:#111122;border-radius:10px;padding:14px;"><div style="color:#444;font-size:10px;letter-spacing:2px;margin-bottom:6px;">${label}</div><div style="color:#fff;font-size:1.5rem;font-family:'Orbitron',monospace;font-weight:700;">${val}</div></div>`).join('')}
      </div>
      <button id="close-summary" style="margin-top:20px;padding:15px 0;width:100%;background:#00ff88;border:none;border-radius:10px;color:#000;font-family:'Orbitron',monospace;font-weight:700;font-size:0.85rem;cursor:pointer;letter-spacing:3px;">YOPISH</button>
    </div>`;
  document.body.appendChild(overlay);
  document.getElementById('close-summary').addEventListener('click', () => { document.body.removeChild(overlay); resetStats(); });
}

if (findMeBtn) {
  findMeBtn.addEventListener('click', () => {
    if (!navigator.geolocation) { showToast("Qurilmangiz GPS ni qo'llab-quvvatlamaydi!", 'error'); return; }
    findMeBtn.textContent = "QIDIRILMOQDA... 🔄";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude; const lng = position.coords.longitude;
        if (!map) initMap();
        if (map) map.setView([lat, lng], 17, { animate: true });
        if (marker) marker.setLatLng([lat, lng]);
        showToast("Joylashuvingiz topildi! 📍", "success");
        findMeBtn.textContent = "🎯 MEN QAYERDAMAN?";
      },
      (error) => {
        showToast("GPS aniqlanmadi.", "error");
        findMeBtn.textContent = "🎯 MEN QAYERDAMAN?";
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// MENU KLIK LOGIKASI
if (menuToggleBtn && sideMenu) { menuToggleBtn.addEventListener('click', () => sideMenu.classList.add('open')); }
if (closeMenuBtn && sideMenu) { closeMenuBtn.addEventListener('click', () => sideMenu.classList.remove('open')); }
document.addEventListener('click', (e) => {
  if (sideMenu && sideMenu.classList.contains('open')) {
    if (!sideMenu.contains(e.target) && !menuToggleBtn.contains(e.target)) sideMenu.classList.remove('open');
  }
});

function formatTime(totalSec) {
  const h = Math.floor(totalSec / 3600); const m = Math.floor((totalSec % 3600) / 60); const s = totalSec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}
function resetStats() { totalDistance = 0; elapsedSeconds = 0; pathCoords = []; lastCoord = null; if(displayDistance) displayDistance.textContent = '0.00 km'; if(displayTime) displayTime.textContent = '00:00:00'; if (polyline) polyline.setLatLngs([]); }
function showToast(message, type = 'success') {
  const color = type === 'success' ? '#00ff88' : '#ff4444';
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#0d0d1a;border:1px solid ${color};color:${color};padding:12px 24px;border-radius:8px;font-size:13px;font-weight:700;z-index:10000;box-shadow:0 4px 24px rgba(0,0,0,0.7);letter-spacing:1px;white-space:nowrap;`;
  toast.textContent = message; document.body.appendChild(toast);
  setTimeout(() => { toast.style.transition = 'opacity 0.3s'; toast.style.opacity = '0'; setTimeout(() => document.body.removeChild(toast), 300); }, 3000);
}

(function init() { const saved = localStorage.getItem('challenge_run_session'); if (saved) { currentUser = saved; enterDashboard(); } })();