var WA = 'https://wa.me/919244558175?text=';

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
var order = ['home', 'services', 'cars', 'contact'];
var tabs = document.querySelectorAll('.tab');
var screens = document.querySelectorAll('.screen');
var current = 'home';

function show(id, updateHash) {
  if (order.indexOf(id) < 0) id = 'home';
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
