var WA = 'https://wa.me/919244558175?text=';

// Auth flag (set on successful OTP login, removed on logout)
var PUBLIC_TABS = ['home', 'profile'];
function authed() {
  try { return localStorage.getItem('isLoggedIn') === 'true'; } catch (e) { return false; }
}

var services = [
  ['🚘', 'Self-Drive', 'Drive on your terms'],
  ['🚕', 'Local & Outstation Taxi', 'City and long trips'],
  ['⏰', 'Hourly Rental', 'Pay per hour'],
  ['📅', 'Daily / Weekly / Monthly', 'Flexible plans'],
  ['➡️', 'One-Way Trips', 'No return fare'],
  ['🏢', 'Corporate Services', 'Teams and events'],
  ['🔗', 'Attachment', 'Long-term cars'],
  ['🧑‍✈️', 'With-Driver Trips', 'Sit back, relax'],
  ['🎓', 'Driving Lessons', 'Learn with care']
];

var cars = [
  ['Ertiga', '7-seater MPV', '🚐'],
  ['Dzire', 'Comfort sedan', '🚗'],
  ['Baleno', 'Premium hatchback', '🚙'],
  ['Thar', 'Off-road SUV', '🛻'],
  ['Grand Vitara', 'Stylish SUV', '🚙'],
  ['Fronx', 'Compact crossover', '🚗'],
  ['Scorpio', 'Powerful SUV', '🚙']
];

// Build services
document.getElementById('svcGrid').innerHTML = services.map(function (s) {
  var n = s[1].replace(/&/g, '&amp;');
  return '<div class="svc"><i>' + s[0] + '</i><b>' + n + '</b><small>' + s[2] + '</small></div>';
}).join('');


// Build cars: tap a card to select, then tap Book
var carList = document.getElementById('carList');
carList.innerHTML = cars.map(function (c, i) {
  return '<div class="car" data-i="' + i + '" role="button" tabindex="0">' +
    '<div class="ic">' + c[2] + '</div>' +
    '<div class="nm"><b>' + c[0] + '</b><small>' + c[1] + '</small></div>' +
    '<a class="book" target="_blank" rel="noopener" href="' + WA + encodeURIComponent('Hi GoCars, I want to book ' + c[0]) + '">Book</a></div>';
}).join('');

carList.addEventListener('click', function (e) {
  var card = e.target.closest('.car');
  if (!card || e.target.closest('.book')) return;
  carList.querySelectorAll('.car').forEach(function (el) { el.classList.toggle('sel', el === card && !el.classList.contains('sel')); });
});

// Tab navigation
var order = ['home', 'services', 'cars', 'contact', 'profile'];
var tabs = document.querySelectorAll('.tab');
var screens = document.querySelectorAll('.screen');
var current = 'home';

function show(id, updateHash) {
  if (order.indexOf(id) < 0) id = 'home';
  if (PUBLIC_TABS.indexOf(id) < 0 && !authed()) {
    if (window.GoCarsAuth) { window.GoCarsAuth.deny(); return; }
    id = 'profile';
  }
  var idx = order.indexOf(id), cur = order.indexOf(current);
  screens.forEach(function (s) {
    s.classList.remove('active');
    s.classList.toggle('left', order.indexOf(s.id) < idx);
  });
  var target = document.getElementById(id);
  target.classList.add('active');
  target.scrollTop = 0;
  tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === id); });
  current = id;
  if (updateHash) { try { history.replaceState(null, '', '#' + id); } catch (err) { location.hash = id; } }
}

tabs.forEach(function (t) {
  t.addEventListener('click', function () { show(t.dataset.tab, true); });
});

window.addEventListener('hashchange', function () { show(location.hash.slice(1), false); });
show(location.hash.slice(1) || 'home', false);

// Call / WhatsApp modal (only toggles visibility; the links inside are plain <a> tags)
var modal = document.getElementById('modal');
var lastFocus = null;

function openModal(mode) {
  var id = mode === 'wa' ? 'sheet-wa' : 'sheet-call';
  document.querySelectorAll('.sheet').forEach(function (s) { s.classList.toggle('show', s.id === id); });
  lastFocus = document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

document.querySelectorAll('[data-open]').forEach(function (b) {
  b.addEventListener('click', function () { openModal(b.dataset.open); });
});
document.querySelectorAll('[data-close]').forEach(function (b) {
  b.addEventListener('click', closeModal);
});
modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

// ===== Supabase Email OTP authentication + global auth guard =====
(function () {
  var SUPABASE_URL = 'https://iqnglyycpshxwpynhdro.supabase.co';
  var SUPABASE_ANON_KEY = 'sb_publishable_0r0e18IK_og3nFb5bPZifw_fq-MPpy3';
  var USERS_KEY = 'gocars_users';      // used only in demo mode (no Supabase)
  var SESSION_KEY = 'gocars_session';
  var MSG = 'Please Sign Up or Log In first to access GoCars services!';

  // 1) Initialise Supabase (if the CDN library loaded and keys are present)
  var sb = null;
  try {
    if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (e) { sb = null; }

  var mode = 'signup', pending = null, demoCode = '';
  var $ = function (id) { return document.getElementById(id); };

  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
  }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function notify(text, ok) {
    var box = $('authMsg');
    box.textContent = text;
    box.className = 'msg' + (ok ? ' ok' : '');
    box.hidden = false;
    if (!ok) { try { window.alert(text); } catch (e) {} }
  }
  function clearMsg() { $('authMsg').hidden = true; }

  function setMode(m) {
    mode = m;
    document.querySelectorAll('.seg-btn').forEach(function (b) { b.classList.toggle('active', b.dataset.auth === m); });
    $('nameWrap').hidden = (m === 'login');
    showStep('email');
    clearMsg();
  }
  function showStep(step) {
    $('stepEmail').hidden = (step !== 'email');
    $('stepOtp').hidden = (step !== 'otp');
  }

  // 2) Keep real URLs out of links for guests (restored after login)
  function syncLinks() {
    var ok = authed();
    document.querySelectorAll('a[href], a[data-href]').forEach(function (a) {
      if (a.closest('#profile')) return;
      if (!ok && a.hasAttribute('href')) {
        a.setAttribute('data-href', a.getAttribute('href'));
        a.removeAttribute('href');
      } else if (ok && a.hasAttribute('data-href')) {
        a.setAttribute('href', a.getAttribute('data-href'));
        a.removeAttribute('data-href');
      }
    });
  }

  function render() {
    var s = load(SESSION_KEY, null);
    var loggedIn = !!(s && s.email) && authed();
    $('authBox').hidden = loggedIn;
    $('profileBox').hidden = !loggedIn;
    if (loggedIn) {
      $('pName').textContent = s.name || 'GoCars User';
      $('pEmail').textContent = s.email;
      $('pAvatar').textContent = (s.name || s.email).charAt(0).toUpperCase();
    }
    syncLinks();
  }

  function startSession(name, email) {
    try { localStorage.setItem('isLoggedIn', 'true'); } catch (e) {}
    save(SESSION_KEY, { name: name, email: email, status: 'Verified', loggedInAt: new Date().toISOString() });
  }
  function endSession() {
    try { localStorage.removeItem('isLoggedIn'); localStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  function randomBytesString(n) {
    var a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function randomCode() {
    var a = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return String(100000 + (a[0] % 900000));
  }

  function goToOtp(email) {
    $('otpInfo').textContent = 'Enter the code sent to ' + email;
    $('aOtp').value = '';
    showStep('otp');
    $('aOtp').focus();
  }
  function resetSendBtn() { var b = $('sendBtn'); b.disabled = false; b.textContent = 'Send OTP'; }

  // 3) Send OTP (Sign Up / Log In)
  $('stepEmail').addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    var name = $('aName').value.trim();
    var email = $('aEmail').value.trim().toLowerCase();
    if (mode === 'signup' && name.length < 2) { notify('Please enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { notify('Please enter a valid email ID.'); return; }

    var btn = $('sendBtn'); btn.disabled = true; btn.textContent = 'Sending…';

    if (!sb) {
      // Demo mode (no Supabase available): OTP shown on screen, accounts kept in localStorage
      var users = load(USERS_KEY, {});
      if (mode === 'signup' && users[email]) { resetSendBtn(); notify('Account already exists, please Log In instead'); return; }
      if (mode === 'login' && !users[email]) { resetSendBtn(); notify('Account not found. Please Sign Up first'); return; }
      pending = { name: mode === 'signup' ? name : users[email].name, email: email };
      demoCode = randomCode();
      $('demoNote').innerHTML = 'Demo mode: no email is sent here.<br>Your OTP is <b>' + demoCode + '</b>';
      $('demoNote').hidden = false;
      resetSendBtn();
      goToOtp(email);
      return;
    }

    pending = { name: name, email: email };
    $('demoNote').hidden = true;

    var req;
    if (mode === 'signup') {
      // A random password is generated because signUp needs one; the user logs in with OTP only
      req = sb.auth.signUp({ email: email, password: randomBytesString(16) + 'Aa1!', options: { data: { full_name: name } } });
    } else {
      req = sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: false } });
    }

    req.then(function (res) {
      resetSendBtn();
      if (res.error) {
        var m = (res.error.message || '').toLowerCase();
        if (mode === 'login' && (m.indexOf('signups not allowed') > -1 || m.indexOf('not found') > -1)) {
          notify('Account not found. Please Sign Up first');
        } else if (mode === 'signup' && m.indexOf('already') > -1) {
          notify('Account already exists, please Log In instead');
        } else {
          notify(res.error.message || 'Could not send OTP. Please try again.');
        }
        return;
      }
      var u = res.data && res.data.user;
      if (mode === 'signup' && u && u.identities && u.identities.length === 0) {
        notify('Account already exists, please Log In instead');
        return;
      }
      goToOtp(email);
      notify('OTP sent. Check your inbox (and spam folder).', true);
    }).catch(function () { resetSendBtn(); notify('Network error. Please try again.'); });
  });

  // 4) Verify OTP
  function finish(name) {
    if (!sb) {
      var users = load(USERS_KEY, {});
      if (mode === 'signup') { users[pending.email] = { name: pending.name, createdAt: new Date().toISOString() }; save(USERS_KEY, users); }
    }
    startSession(name || pending.name, pending.email);
    pending = null; demoCode = '';
    $('aName').value = ''; $('aEmail').value = '';
    setMode('signup');
    render();
  }

  $('stepOtp').addEventListener('submit', function (e) {
    e.preventDefault();
    clearMsg();
    var code = $('aOtp').value.trim();
    if (!/^\d{6,8}$/.test(code)) { notify('Enter the OTP code from your email.'); return; }
    if (!pending) { setMode(mode); return; }

    if (!sb) {
      if (code === demoCode) finish(); else notify('Invalid OTP. Please try again.');
      return;
    }

    function verify(type) { return sb.auth.verifyOtp({ email: pending.email, token: code, type: type }); }
    verify(mode === 'signup' ? 'signup' : 'magiclink')
      .then(function (res) { return (res.error && mode === 'login') ? verify('email') : res; })
      .then(function (res) {
        if (res.error || !res.data || !res.data.user) { notify('Invalid or expired OTP. Please try again.'); return; }
        var meta = res.data.user.user_metadata || {};
        finish(meta.full_name);
      })
      .catch(function () { notify('Network error. Please try again.'); });
  });

  $('otpBack').addEventListener('click', function () { clearMsg(); showStep('email'); });
  document.querySelectorAll('.seg-btn').forEach(function (b) {
    b.addEventListener('click', function () { setMode(b.dataset.auth); });
  });

  // 5) Logout
  $('logoutBtn').addEventListener('click', function () {
    if (sb) { try { sb.auth.signOut(); } catch (e) {} }
    endSession();
    setMode('login');
    render();
  });

  // 6) Global auth guard (capture phase = runs before every other click handler)
  var GUARDED = 'a[href], a[data-href], [data-open], .car, .book, .svc, .tab';
  var ALLOWED = '#profile, .x, [data-close], .tab[data-tab="home"], .tab[data-tab="profile"]';

  function isLoggedIn() { return authed(); }
  function deny() {
    show('profile', true);
    setMode('signup');
    notify(MSG);
  }
  window.GoCarsAuth = { isLoggedIn: isLoggedIn, deny: deny };

  document.addEventListener('click', function (e) {
    if (isLoggedIn()) return;
    var t = e.target;
    if (!t.closest || t.closest(ALLOWED) || !t.closest(GUARDED)) return;
    e.preventDefault();
    e.stopPropagation();
    deny();
  }, true);

  // 7) Restore / sync an active Supabase session without reloading
  if (sb) {
    sb.auth.getSession().then(function (r) {
      var sess = r && r.data && r.data.session;
      if (sess && sess.user) {
        var meta = sess.user.user_metadata || {};
        if (!authed()) startSession(meta.full_name || '', sess.user.email);
      } else if (authed()) {
        endSession();
      }
      render();
    }).catch(function () {});
    sb.auth.onAuthStateChange(function (event) {
      if (event === 'SIGNED_OUT') { endSession(); render(); }
    });
  }

  render();
})();
