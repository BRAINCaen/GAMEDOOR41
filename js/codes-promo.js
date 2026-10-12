// Codes promo & réductions : recherche dans la liste (sans accents, plusieurs mots) + bouton « Copier ».
// La liste elle-même est dans la page (générée par scripts/generer-codes-promo.mjs) : sans JavaScript, tout reste lisible.
(function () {
  var root = document.querySelector('[data-codes-promo]');
  if (!root) return;
  var champ = root.querySelector('.cp-q');
  var items = Array.prototype.slice.call(root.querySelectorAll('.cp-item'));
  var groupes = Array.prototype.slice.call(root.querySelectorAll('.cp-groupe'));
  var vide = root.querySelector('.cp-vide');
  var compte = root.querySelector('.cp-compte');

  function normaliser(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  items.forEach(function (it) { it._cherche = normaliser((it.getAttribute('data-cherche') || '') + ' ' + it.textContent); });

  function filtrer() {
    var mots = normaliser(champ.value).split(' ').filter(Boolean);
    var n = 0;
    items.forEach(function (it) {
      var ok = mots.every(function (m) { return it._cherche.indexOf(m) !== -1; });
      it.hidden = !ok;
      if (ok) n++;
    });
    groupes.forEach(function (g) {
      g.hidden = !Array.prototype.some.call(g.querySelectorAll('.cp-item'), function (i) { return !i.hidden; });
    });
    if (vide) {
      vide.hidden = n > 0 || !mots.length;
      var s = vide.querySelector('strong');
      if (s) s.textContent = champ.value.trim();
    }
    if (compte) compte.textContent = mots.length && n ? (n === 1 ? '1 résultat' : n + ' résultats') : '';
  }

  if (champ) {
    champ.addEventListener('input', filtrer);
    champ.addEventListener('search', filtrer);
    try {
      var q = new URL(window.location.href).searchParams.get('q');
      if (q) { champ.value = q; filtrer(); }
    } catch (e) {}
  }

  root.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.cp-copier') : null;
    if (!btn) return;
    var code = btn.getAttribute('data-code');
    var fini = function () {
      btn.textContent = 'Copié ✓'; btn.classList.add('is-copie');
      setTimeout(function () { btn.textContent = 'Copier'; btn.classList.remove('is-copie'); }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(fini, function () { selectionner(btn); });
    } else { selectionner(btn); }
  });
  function selectionner(btn) {
    var val = btn.parentElement && btn.parentElement.querySelector('.cp-code-val');
    if (!val || !window.getSelection) return;
    var r = document.createRange(); r.selectNodeContents(val);
    var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
  }
})();
