// ── Auth ──
// 저장된 비밀번호가 ASCII 범위를 벗어나면(깨진 경우) 초기화
(function() {
  const stored = localStorage.getItem('lr_pw');
  if (stored && !/^[\x20-\x7E]+$/.test(stored)) {
    localStorage.removeItem('lr_pw');
  }
})();
function getPw() { return localStorage.getItem('lr_pw') || 'larosee1234'; }
function savePwStore(p) { localStorage.setItem('lr_pw', p); }
function isLoggedIn() { return sessionStorage.getItem('admin_auth') === '1'; }

function doLogin() {
  const pw = document.getElementById('login-pw').value;
  const err = document.getElementById('login-err');
  if (pw === getPw()) {
    sessionStorage.setItem('admin_auth','1');
    err.style.display = 'none';
    showApp();
  } else {
    err.style.display = 'block';
    document.getElementById('login-pw').value = '';
    document.getElementById('login-pw').focus();
  }
}
function doLogout() {
  sessionStorage.removeItem('admin_auth');
  location.reload();
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  loadAllData();
  initChart([],[]);
}
