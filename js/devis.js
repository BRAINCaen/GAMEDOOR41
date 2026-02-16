/* GAMEDOOR•41 — Devis en ligne */
(function () {
  'use strict';

  /* ========== PRICING (source: BRAIN internal) ========== */
  var PRO = { escape: { ht: 15.45, ttc: 17.00 }, quiz: { ht: 13.64, ttc: 15.00 } };
  var ESCAPE_ROOM_TTC = { 2: 74, 3: 84, 4: 100, 5: 120, 6: 144 };
  var QUIZ_TTC = { 4: 84, 5: 105, 6: 126, 7: 133, 8: 144, 9: 153, 10: 170, 11: 176, 12: 192, 13: 195, 14: 210, 15: 225, 16: 240 };
  var TVA_RATE = 0.10;

  /* ========== CAPACITY ========== */
  var CAP = { escape: { min: 2, max: 30 }, quiz: { min: 4, max: 16 }, combo: { min: 6, max: 46 } };

  /* ========== DOM ========== */
  var form = document.getElementById('devis-form');
  if (!form) return;

  var steps = Array.from(document.querySelectorAll('.devis-step'));
  var progressSteps = Array.from(document.querySelectorAll('.devis-progress-step'));
  var btnPrev = document.getElementById('devis-prev');
  var btnNext = document.getElementById('devis-next');
  var btnSubmit = document.getElementById('devis-submit');
  var confirmation = document.getElementById('devis-confirmation');
  var participantsInput = document.getElementById('participants');
  var dateInput = document.getElementById('date');
  var capacityHint = document.getElementById('capacity-hint');
  var liveEstimate = document.getElementById('live-estimate');
  var estimatePrice = document.getElementById('estimate-price');
  var societeWrap = document.getElementById('field-societe-wrap');

  var currentStep = 1;
  var totalSteps = 4;
  var devisId = '';
  var savedData = null; // stored at submit time for PDF generation

  /* ========== HELPERS ========== */
  function q(sel) { return form.querySelector(sel); }
  function qa(sel) { return form.querySelectorAll(sel); }
  function val(name) { var el = form.querySelector('[name="' + name + '"]:checked') || form.querySelector('[name="' + name + '"]'); return el ? el.value : ''; }
  function checked(name) { var el = form.querySelector('[name="' + name + '"]'); return el && el.checked; }

  function generateId() {
    var d = new Date();
    var date = d.getFullYear().toString() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    var rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return 'GD41-' + date + '-' + rand;
  }

  /* ========== STEP NAVIGATION ========== */
  function showStep(n) {
    steps.forEach(function (s, i) { s.classList.toggle('active', i === n - 1); });
    progressSteps.forEach(function (s, i) {
      s.classList.toggle('active', i === n - 1);
      s.classList.toggle('done', i < n - 1);
    });
    btnPrev.hidden = (n === 1);
    btnNext.hidden = (n === totalSteps);
    btnSubmit.hidden = (n !== totalSteps);
    currentStep = n;
    window.scrollTo({ top: document.querySelector('.devis-section').offsetTop - 80, behavior: 'smooth' });
    if (n === 2) updateStep2();
    if (n === 3) updateStep3();
    if (n === 4) buildRecap();
  }

  btnPrev.addEventListener('click', function () { if (currentStep > 1) showStep(currentStep - 1); });
  btnNext.addEventListener('click', function () { if (validateStep(currentStep)) showStep(currentStep + 1); });

  /* ========== VALIDATION ========== */
  function validateStep(n) {
    hideErrors();
    if (n === 1) {
      var type = val('type');
      var activite = val('activite');
      if (!type || !activite) { showError('error-step1'); return false; }
      return true;
    }
    if (n === 2) {
      var nb = parseInt(participantsInput.value, 10);
      var activite = val('activite');
      var cap = CAP[activite] || CAP.escape;
      if (isNaN(nb) || nb < cap.min || nb > cap.max) {
        showError('error-capacity', 'Le nombre de participants doit être entre ' + cap.min + ' et ' + cap.max + '.');
        return false;
      }
      if (!dateInput.value) { showError('error-step2', 'Veuillez choisir une date.'); return false; }
      if (!val('creneau')) { showError('error-step2', 'Veuillez choisir un créneau.'); return false; }
      return true;
    }
    if (n === 3) {
      var type = val('type');
      var isPro = (type === 'entreprise' || type === 'association');
      var societe = document.getElementById('societe').value.trim();
      var nom = document.getElementById('nom').value.trim();
      var tel = document.getElementById('telephone').value.trim();
      var email = document.getElementById('email').value.trim();
      if (isPro && !societe) { showError('error-step3', 'Veuillez indiquer votre société / organisation.'); return false; }
      if (!nom) { showError('error-step3', 'Veuillez indiquer votre nom.'); return false; }
      if (!tel || !isValidPhone(tel)) { showError('error-step3', 'Veuillez indiquer un numéro de téléphone valide (10 chiffres).'); return false; }
      if (!email || !isValidEmail(email)) { showError('error-step3', 'Veuillez indiquer un email valide.'); return false; }
      return true;
    }
    return true;
  }

  function isValidPhone(p) { return /^(?:0|\+33)\d{9}$/.test(p.replace(/[\s.\-]/g, '')); }
  function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

  function showError(id, msg) {
    var el = document.getElementById(id);
    if (el) { if (msg) el.textContent = msg; el.hidden = false; }
  }
  function hideErrors() { qa('.devis-error').forEach(function (e) { e.hidden = true; }); }

  /* ========== STEP 2: Dynamic updates ========== */
  function updateStep2() {
    var activite = val('activite');
    var cap = CAP[activite] || CAP.escape;
    participantsInput.min = cap.min;
    participantsInput.max = cap.max;
    var nb = parseInt(participantsInput.value, 10);
    if (nb < cap.min) participantsInput.value = cap.min;
    if (nb > cap.max) participantsInput.value = cap.max;

    var labels = { escape: '2 à 30 participants (répartition multi-salles)', quiz: '4 à 16 participants', combo: '6 à 46 participants (rotation escape + quiz)' };
    capacityHint.textContent = labels[activite] || labels.escape;

    // Set min date to tomorrow
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    dateInput.min = tomorrow.toISOString().split('T')[0];

    updateEstimate();
  }

  function updateEstimate() {
    var type = val('type');
    var activite = val('activite');
    var nb = parseInt(participantsInput.value, 10);
    if (isNaN(nb) || nb < 1) { liveEstimate.hidden = true; return; }

    var est = calculatePrice(type, activite, nb);
    var isPro = (type === 'entreprise' || type === 'association');
    if (isPro) {
      estimatePrice.innerHTML = est.ht.toFixed(2) + '&euro; HT <span style="font-size:0.8em;opacity:0.7;">(' + est.ttc.toFixed(2) + '&euro; TTC)</span>';
    } else {
      estimatePrice.innerHTML = est.ttc.toFixed(2) + '&euro; TTC';
    }
    liveEstimate.hidden = false;
  }

  // Counter buttons
  document.getElementById('btn-minus').addEventListener('click', function () {
    var v = parseInt(participantsInput.value, 10) || 2;
    var activite = val('activite');
    var cap = CAP[activite] || CAP.escape;
    participantsInput.value = Math.max(cap.min, v - 1);
    updateEstimate();
  });
  document.getElementById('btn-plus').addEventListener('click', function () {
    var v = parseInt(participantsInput.value, 10) || 2;
    var activite = val('activite');
    var cap = CAP[activite] || CAP.escape;
    participantsInput.value = Math.min(cap.max, v + 1);
    updateEstimate();
  });
  participantsInput.addEventListener('input', updateEstimate);

  /* ========== STEP 3: Dynamic show/hide société ========== */
  function updateStep3() {
    var type = val('type');
    var isPro = (type === 'entreprise' || type === 'association');
    societeWrap.style.display = isPro ? '' : 'none';
    document.getElementById('societe').required = isPro;
  }

  /* ========== PRICING ENGINE ========== */
  function calculatePrice(type, activite, nb) {
    var isPro = (type === 'entreprise' || type === 'association');
    if (isPro) return calculatePro(activite, nb);
    return calculateParticulier(activite, nb);
  }

  function calculatePro(activite, nb) {
    if (activite === 'escape') return { ht: nb * PRO.escape.ht, ttc: nb * PRO.escape.ttc };
    if (activite === 'quiz') return { ht: nb * PRO.quiz.ht, ttc: nb * PRO.quiz.ttc };
    // combo: both activities
    return { ht: nb * (PRO.escape.ht + PRO.quiz.ht), ttc: nb * (PRO.escape.ttc + PRO.quiz.ttc) };
  }

  function calculateParticulier(activite, nb) {
    if (activite === 'escape') return escapeParticulier(nb);
    if (activite === 'quiz') return quizParticulier(nb);
    // combo
    var e = escapeParticulier(nb);
    var q = quizParticulier(Math.min(16, nb));
    return { ttc: e.ttc + q.ttc, ht: e.ht + q.ht };
  }

  function escapeParticulier(nb) {
    var ttc = 0;
    var remaining = nb;
    while (remaining > 0) {
      var roomSize = Math.min(6, remaining);
      ttc += ESCAPE_ROOM_TTC[roomSize] || ESCAPE_ROOM_TTC[6];
      remaining -= roomSize;
    }
    return { ttc: ttc, ht: ttc / (1 + TVA_RATE) };
  }

  function quizParticulier(nb) {
    var capped = Math.min(16, Math.max(4, nb));
    var ttc = QUIZ_TTC[capped] || QUIZ_TTC[16];
    return { ttc: ttc, ht: ttc / (1 + TVA_RATE) };
  }

  /* ========== STEP 4: RECAP ========== */
  function buildRecap() {
    var type = val('type');
    var activite = val('activite');
    var nb = parseInt(participantsInput.value, 10);
    var isPro = (type === 'entreprise' || type === 'association');
    var est = calculatePrice(type, activite, nb);
    var typeLabels = { entreprise: 'Entreprise', association: 'Association', particulier: 'Particulier' };
    var actLabels = { escape: 'Escape Game', quiz: 'Quiz Game', combo: 'Combo Escape + Quiz' };

    devisId = generateId();
    document.getElementById('field-devis-id').value = devisId;
    document.getElementById('field-estimation-ht').value = est.ht.toFixed(2);
    document.getElementById('field-estimation-ttc').value = est.ttc.toFixed(2);

    var html = '<table class="devis-recap-table">';
    html += '<tr><td>Référence</td><td><strong>' + devisId + '</strong></td></tr>';
    html += '<tr><td>Type</td><td>' + (typeLabels[type] || type) + '</td></tr>';
    html += '<tr><td>Activité</td><td>' + (actLabels[activite] || activite) + '</td></tr>';
    html += '<tr><td>Participants</td><td>' + nb + ' personnes</td></tr>';
    html += '<tr><td>Date</td><td>' + formatDate(dateInput.value) + '</td></tr>';
    html += '<tr><td>Créneau</td><td>' + val('creneau') + '</td></tr>';
    if (checked('privatisation')) html += '<tr><td>Privatisation</td><td>Oui (sur devis)</td></tr>';

    var societe = document.getElementById('societe').value.trim();
    if (societe) html += '<tr><td>Société</td><td>' + escapeHtml(societe) + '</td></tr>';
    html += '<tr><td>Contact</td><td>' + escapeHtml(document.getElementById('nom').value) + '</td></tr>';
    html += '<tr><td>Téléphone</td><td>' + escapeHtml(document.getElementById('telephone').value) + '</td></tr>';
    html += '<tr><td>Email</td><td>' + escapeHtml(document.getElementById('email').value) + '</td></tr>';

    html += '</table>';

    // Price summary
    html += '<div class="devis-price-summary">';
    if (isPro) {
      html += '<div class="devis-price-row"><span>Total HT</span><span>' + est.ht.toFixed(2) + ' &euro;</span></div>';
      html += '<div class="devis-price-row"><span>TVA 10%</span><span>' + (est.ttc - est.ht).toFixed(2) + ' &euro;</span></div>';
      html += '<div class="devis-price-row devis-price-total"><span>Total TTC</span><span>' + est.ttc.toFixed(2) + ' &euro;</span></div>';
      html += '<div class="devis-price-row devis-price-pp"><span>Par personne</span><span>' + (est.ht / nb).toFixed(2) + ' &euro; HT</span></div>';
    } else {
      html += '<div class="devis-price-row devis-price-total"><span>Total TTC</span><span>' + est.ttc.toFixed(2) + ' &euro;</span></div>';
      html += '<div class="devis-price-row devis-price-pp"><span>Par personne</span><span>~' + (est.ttc / nb).toFixed(2) + ' &euro;</span></div>';
    }
    html += '<p class="devis-price-note">Estimation basée sur nos tarifs en vigueur. Le devis définitif sera ajusté selon la configuration retenue.</p>';
    html += '</div>';

    document.getElementById('recap-content').innerHTML = html;
  }

  function formatDate(d) {
    if (!d) return '';
    var parts = d.split('-');
    return parts[2] + '/' + parts[1] + '/' + parts[0];
  }

  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /* ========== IMAGE PRELOADING FOR PDF ========== */
  var pdfImages = {};
  var IMG_SOURCES = {
    escape: '/img/escape/garde-a-vue-bureau.jpg',
    quiz: '/img/quiz/salle-quiz.jpg',
    combo_escape: '/img/escape/psychiatric-main.jpg',
    combo_quiz: '/img/quiz/buzzer-action.jpg'
  };

  function preloadImage(key, src) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var MAX = 400;
      var ratio = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight);
      canvas.width = img.naturalWidth * ratio;
      canvas.height = img.naturalHeight * ratio;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      pdfImages[key] = canvas.toDataURL('image/jpeg', 0.75);
    };
    img.src = src;
  }

  Object.keys(IMG_SOURCES).forEach(function (k) { preloadImage(k, IMG_SOURCES[k]); });

  /* ========== BRAND LABELS ========== */
  var BRANDS = {
    escape: { brand: 'BRAIN', name: 'Escape Game', full: 'BRAIN - Escape Game', duration: '60 min' },
    quiz:   { brand: 'BUZZ YOUR BRAIN', name: 'Quiz Game - Emissions Au Choix !', full: 'BUZZ YOUR BRAIN - Quiz Game', duration: '90 min' },
    combo:  { brand: 'BRAIN + BUZZ YOUR BRAIN', name: 'Combo Escape + Quiz', full: 'BRAIN + BUZZ YOUR BRAIN - Combo', duration: 'Demi-journee' }
  };

  /* ========== SAVE DATA FOR PDF ========== */
  function saveFormData() {
    var type = val('type');
    var activite = val('activite');
    var nb = parseInt(participantsInput.value, 10);
    var isPro = (type === 'entreprise' || type === 'association');
    var est = calculatePrice(type, activite, nb);
    var typeLabels = { entreprise: 'Entreprise', association: 'Association', particulier: 'Particulier' };
    var brand = BRANDS[activite] || BRANDS.escape;

    savedData = {
      type: type,
      activite: activite,
      nb: nb,
      isPro: isPro,
      est: est,
      typeLabel: typeLabels[type] || type,
      brand: brand,
      date: dateInput.value,
      dateFormatted: formatDate(dateInput.value),
      creneau: val('creneau'),
      privatisation: checked('privatisation'),
      societe: document.getElementById('societe').value.trim(),
      nom: document.getElementById('nom').value.trim(),
      telephone: document.getElementById('telephone').value.trim(),
      email: document.getElementById('email').value.trim(),
      notes: document.getElementById('notes').value.trim(),
      rappel: checked('rappel'),
      devisId: devisId
    };
  }

  /* ========== FORM SUBMISSION ========== */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(4)) return;

    saveFormData();

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Envoi en cours\u2026';

    var formData = new FormData(form);
    var params = new URLSearchParams(formData);
    console.log('[DEVIS] Submitting:', Object.fromEntries(params));

    tryNetlify(params, ['/', '/devis/'], 0);
  });

  function tryNetlify(params, endpoints, attempt) {
    if (attempt >= endpoints.length) {
      console.warn('[DEVIS] Netlify Forms unavailable, using email fallback');
      sendViaEmail();
      return;
    }
    var url = endpoints[attempt];
    console.log('[DEVIS] Try', attempt + 1, '/', endpoints.length, 'POST', url);

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
    .then(function (res) {
      if (res.ok) {
        console.log('[DEVIS] OK via', url);
        showConfirmation('netlify');
      } else {
        console.warn('[DEVIS]', url, 'returned', res.status);
        tryNetlify(params, endpoints, attempt + 1);
      }
    })
    .catch(function () {
      tryNetlify(params, endpoints, attempt + 1);
    });
  }

  function sendViaEmail() {
    var type = val('type');
    var activite = val('activite');
    var nb = participantsInput.value;
    var isPro = (type === 'entreprise' || type === 'association');
    var est = calculatePrice(type, activite, parseInt(nb, 10));
    var brand = BRANDS[activite] || BRANDS.escape;
    var typeLabels = { entreprise: 'Entreprise', association: 'Association', particulier: 'Particulier' };

    var lines = [
      'DEMANDE DE DEVIS ' + devisId,
      '---',
      'Type : ' + (typeLabels[type] || type),
      'Activite : ' + brand.full,
      'Participants : ' + nb,
      'Date : ' + formatDate(document.getElementById('date').value),
      'Creneau : ' + val('creneau')
    ];
    if (checked('privatisation')) lines.push('Privatisation : Oui');
    var societe = document.getElementById('societe').value.trim();
    if (societe) lines.push('Societe : ' + societe);
    lines.push('Contact : ' + document.getElementById('nom').value);
    lines.push('Telephone : ' + document.getElementById('telephone').value);
    lines.push('Email : ' + document.getElementById('email').value);
    if (isPro) {
      lines.push('---');
      lines.push('Estimation HT : ' + est.ht.toFixed(2) + ' EUR');
      lines.push('Estimation TTC : ' + est.ttc.toFixed(2) + ' EUR');
    } else {
      lines.push('---');
      lines.push('Estimation TTC : ' + est.ttc.toFixed(2) + ' EUR');
    }
    var notes = document.getElementById('notes').value.trim();
    if (notes) { lines.push('---'); lines.push('Notes : ' + notes); }
    if (checked('rappel')) lines.push('Souhaite etre rappele(e)');

    var subject = encodeURIComponent('[GAMEDOOR41] Demande de devis ' + devisId);
    var body = encodeURIComponent(lines.join('\n'));
    var mailto = 'mailto:contact@gamedoor41.fr?subject=' + subject + '&body=' + body;

    showConfirmation('email', mailto);
  }

  function showConfirmation(mode, mailtoUrl) {
    form.hidden = true;
    document.getElementById('devis-progress').hidden = true;
    document.getElementById('confirm-id').textContent = devisId;
    document.getElementById('confirm-email').textContent = document.getElementById('email').value;
    document.getElementById('confirm-recap').innerHTML = document.getElementById('recap-content').innerHTML;

    var emailNote = document.getElementById('confirm-email-fallback');
    if (mode === 'email' && mailtoUrl && emailNote) {
      emailNote.hidden = false;
      emailNote.querySelector('a').href = mailtoUrl;
    }

    confirmation.hidden = false;
    window.scrollTo({ top: document.querySelector('.devis-section').offsetTop - 80, behavior: 'smooth' });
  }

  /* ========== PDF GENERATION (2 pages) ========== */
  document.getElementById('download-pdf').addEventListener('click', generatePDF);

  /* --- PDF helpers --- */
  var ORANGE = [245, 130, 32];
  var DARK = [30, 30, 30];
  var WHITE = [255, 255, 255];
  var GREY = [100, 100, 100];
  var LGREY = [200, 200, 200];
  var TEXT = [50, 50, 50];

  function pdfHeader(doc, pageNum, totalPages) {
    // Dark top bar
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 0, 210, 32, 'F');
    // Orange accent line
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, 32, 210, 1.5, 'F');

    // Company name
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BRAIN CAEN', 20, 13);

    // Company details right
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
    doc.text('41B Rue Pasteur, ZAC de Calix, 14120 MONDEVILLE', 190, 10, { align: 'right' });
    doc.text('Tel. 06 44 64 71 07  -  contact@braincaen.com', 190, 15, { align: 'right' });

    // Brands line
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('Escape Game : BRAIN  |  Quiz Game : BUZZ YOUR BRAIN', 20, 24);

    // Legal line
    doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('SARL au capital de 10 000 EUR - SIRET 82322711100023 - TVA : FR41823227111', 20, 29);
  }

  function pdfFooter(doc, pageNum, totalPages) {
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, 280, 210, 1, 'F');
    doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('BRAIN CAEN - 41B Rue Pasteur, ZAC de Calix, 14120 MONDEVILLE - Tel. 06 44 64 71 07 - contact@braincaen.com', 105, 287, { align: 'center' });
    doc.text('gamedoor41.fr', 105, 292, { align: 'center' });
    // Page number
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.setFontSize(7);
    doc.text(pageNum + '/' + totalPages, 195, 292);
  }

  function pdfSectionTitle(doc, title, y) {
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(15, y, 180, 8, 'F');
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y + 5.5);
    return y + 12;
  }

  function pdfLine(doc, label, value, y, opts) {
    var lx = (opts && opts.lx) || 20;
    var vx = (opts && opts.vx) || 90;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.setFontSize(9);
    doc.text(label, lx, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text(String(value), vx, y);
    return y + 6;
  }

  function generatePDF() {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) { alert('PDF non disponible. Faites une capture d\'ecran du recapitulatif.'); return; }
    if (!savedData) { alert('Donnees du devis non disponibles. Veuillez recharger la page et soumettre a nouveau.'); return; }

    try {
      var d = savedData;
      var doc = new jsPDF();
      var totalPages = 2;

      /* ============================================= */
      /* PAGE 1 — DEVIS                                */
      /* ============================================= */
      pdfHeader(doc, 1, totalPages);
      pdfFooter(doc, 1, totalPages);

      // --- Devis title ---
      var y = 42;
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DEVIS N\u00B0 ' + d.devisId, 15, y);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Date : ' + new Date().toLocaleDateString('fr-FR'), 190, y, { align: 'right' });

      // Thin separator
      y += 4;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.5);
      doc.line(15, y, 195, y);

      // --- Client block ---
      y += 8;
      y = pdfSectionTitle(doc, 'CLIENT', y);
      if (d.societe) y = pdfLine(doc, 'Societe :', d.societe, y);
      y = pdfLine(doc, 'Contact :', d.nom, y);
      y = pdfLine(doc, 'Telephone :', d.telephone, y);
      y = pdfLine(doc, 'Email :', d.email, y);
      y = pdfLine(doc, 'Type :', d.typeLabel, y);

      // --- Reservation block with activity image ---
      y += 4;
      y = pdfSectionTitle(doc, 'RESERVATION', y);

      var imgKey = d.activite;
      var actImg = pdfImages[imgKey];
      var imgX = 15;
      var imgW = 50;
      var imgH = 35;
      var textX = imgX + imgW + 8;

      // Activity image
      if (actImg) {
        try { doc.addImage(actImg, 'JPEG', imgX, y, imgW, imgH); } catch (e) { /* skip image */ }
      } else {
        // Placeholder rectangle
        doc.setFillColor(40, 40, 40);
        doc.rect(imgX, y, imgW, imgH, 'F');
        doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
        doc.setFontSize(8);
        doc.text(d.brand.name, imgX + imgW / 2, y + imgH / 2, { align: 'center' });
      }

      // Activity info next to image
      var iy = y + 2;
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(d.brand.brand, textX, iy + 4);
      iy += 9;
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(10);
      doc.text(d.brand.name, textX, iy + 4);
      iy += 8;
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(d.nb + ' personnes  -  Duree : ' + d.brand.duration, textX, iy + 4);
      iy += 7;
      doc.text('Date : ' + d.dateFormatted + '  -  Creneau : ' + d.creneau, textX, iy + 4);

      // For combo, show second image
      if (d.activite === 'combo') {
        var img2 = pdfImages.combo_quiz;
        if (img2) {
          try { doc.addImage(img2, 'JPEG', imgX, y + imgH + 3, imgW, imgH); } catch (e) { /* skip */ }
        }
        y += imgH + 3 + imgH + 6;
      } else {
        y += imgH + 6;
      }

      if (d.privatisation) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(9);
        doc.text('+ Privatisation de l\'espace (sur devis)', 20, y);
        y += 7;
      }

      if (d.notes) {
        y += 2;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.setFontSize(8);
        doc.text('Notes :', 20, y); y += 4;
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        var noteLines = doc.splitTextToSize(d.notes, 170);
        doc.text(noteLines, 20, y);
        y += noteLines.length * 4 + 2;
      }

      // --- Price table ---
      y += 4;
      y = pdfSectionTitle(doc, 'ESTIMATION TARIFAIRE', y);

      // Table header row
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y, 180, 7, 'F');
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 20, y + 5);
      doc.text('Qte', 115, y + 5, { align: 'center' });
      doc.text('P.U. HT', 145, y + 5, { align: 'right' });
      doc.text('Total HT', 190, y + 5, { align: 'right' });
      y += 9;

      // Activity line(s)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(9);

      if (d.activite === 'escape' || d.activite === 'quiz') {
        var pu = d.activite === 'escape' ? PRO.escape.ht : PRO.quiz.ht;
        doc.text(d.brand.full, 20, y + 4);
        doc.text(String(d.nb), 115, y + 4, { align: 'center' });
        doc.text(pu.toFixed(2) + ' EUR', 145, y + 4, { align: 'right' });
        doc.text(d.est.ht.toFixed(2) + ' EUR', 190, y + 4, { align: 'right' });
        y += 8;
      } else {
        // Combo: 2 lines
        doc.text('BRAIN - Escape Game', 20, y + 4);
        doc.text(String(d.nb), 115, y + 4, { align: 'center' });
        doc.text(PRO.escape.ht.toFixed(2) + ' EUR', 145, y + 4, { align: 'right' });
        doc.text((d.nb * PRO.escape.ht).toFixed(2) + ' EUR', 190, y + 4, { align: 'right' });
        y += 7;
        doc.text('BUZZ YOUR BRAIN - Quiz Game', 20, y + 4);
        doc.text(String(d.nb), 115, y + 4, { align: 'center' });
        doc.text(PRO.quiz.ht.toFixed(2) + ' EUR', 145, y + 4, { align: 'right' });
        doc.text((d.nb * PRO.quiz.ht).toFixed(2) + ' EUR', 190, y + 4, { align: 'right' });
        y += 8;
      }

      // Separator
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);
      y += 5;

      // Totals
      if (d.isPro) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(9);
        doc.text('Total HT', 145, y, { align: 'right' });
        doc.text(d.est.ht.toFixed(2) + ' EUR', 190, y, { align: 'right' });
        y += 6;
        doc.text('TVA 10%', 145, y, { align: 'right' });
        doc.text((d.est.ttc - d.est.ht).toFixed(2) + ' EUR', 190, y, { align: 'right' });
        y += 6;
      }

      // Total TTC highlighted
      doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.roundedRect(120, y - 3, 75, 10, 2, 2, 'F');
      doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('TOTAL TTC', 125, y + 4);
      doc.text(d.est.ttc.toFixed(2) + ' EUR', 190, y + 4, { align: 'right' });
      y += 13;

      // Per person
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      if (d.isPro) {
        doc.text('Soit ' + (d.est.ht / d.nb).toFixed(2) + ' EUR HT par personne (' + (d.est.ttc / d.nb).toFixed(2) + ' EUR TTC)', 20, y);
      } else {
        doc.text('Soit environ ' + (d.est.ttc / d.nb).toFixed(2) + ' EUR TTC par personne', 20, y);
      }
      y += 6;
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('Estimation basee sur nos tarifs en vigueur. Le devis definitif sera ajuste selon la configuration retenue.', 20, y);

      // --- Legal notice + Signature area ---
      y += 12;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);
      y += 6;

      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('Important : la reservation n\'est definitive qu\'apres validation du devis et confirmation ecrite de notre part.', 15, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(7.5);
      doc.text('Ce devis est sans engagement tant qu\'il n\'est pas valide.', 15, y);
      y += 4;
      doc.text('Pour confirmer ce devis sans modification, merci de nous le renvoyer signe "bon pour accord".', 15, y);
      y += 8;

      // Signature boxes
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.setFontSize(7.5);
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);

      // Left: "Bon pour accord"
      doc.rect(15, y, 85, 22);
      doc.text('Date et signature du client', 18, y + 4);
      doc.text('"Bon pour accord"', 18, y + 8);

      // Right: Brain
      doc.rect(110, y, 85, 22);
      doc.text('BRAIN CAEN', 113, y + 4);
      doc.text('Restant a votre disposition,', 113, y + 8);
      doc.text('Toute l\'equipe de Brain.', 113, y + 12);

      /* ============================================= */
      /* PAGE 2 — CONDITIONS GENERALES                 */
      /* ============================================= */
      doc.addPage();
      pdfHeader(doc, 2, totalPages);
      pdfFooter(doc, 2, totalPages);

      y = 42;
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDITIONS GENERALES DE VENTE', 105, y, { align: 'center' });
      y += 4;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.5);
      doc.line(60, y, 150, y);

      y += 10;
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');

      // CGV text content
      var cgvSections = [
        { title: 'ARTICLE I : VALIDATION DU DEVIS PAR L\'ENTREPRISE', items: [
          '1. L\'Entreprise envoie a BRAIN le devis signe par mail ou courrier postal.',
          '2. L\'envoi du devis signe constitue l\'acceptation du devis et formalise le contrat :',
          '   - Accepter le devis signifie consentir au prix, a la description des services et a leur date d\'execution ;',
          '   - Cela signifie egalement l\'acceptation sans reserve des conditions generales ;',
          '   - Enfin, cela engage l\'Entreprise a regler le montant total du.',
          '3. Annuler une reservation, ou en cas de non-presence ou retard des participants, n\'exonere pas',
          '   l\'Entreprise de son obligation de paiement du montant total du.'
        ]},
        { title: 'ARTICLE II : MODALITES DE PAIEMENT', items: [
          '1. Un acompte du montant des produits complementaires (repas) est exige apres la signature du devis,',
          '   conditionnant la commande au traiteur.',
          '2. Le reglement se fait en CB par voie electronique via un lien envoye par mail ou par CB sur place',
          '   en un seul reglement de la totalite du montant restant.',
          '3. Les services publics doivent transmettre leur bon de commande avant la prestation pour un',
          '   enregistrement sur Chorus.',
          '4. L\'acces aux salles est conditionne par le paiement complet.'
        ]},
        { title: 'ARTICLE III : EXCLUSION DU DROIT DE RETRACTATION', items: [
          '1. Les prestations BRAIN sont etablies selon les specifications de l\'Entreprise.',
          '2. Aucune retractation n\'est possible apres acceptation du devis.'
        ]},
        { title: 'ARTICLE IV : MODIFICATIONS DU DEVIS', items: [
          '',
          'A. Modification de la date de service',
          '1. Changement moins de sept jours avant interdit.',
          '2. Report possible avec frais de 20% du montant total du devis si moins de quinze jours avant,',
          '   gratuit si plus.',
          '',
          'B. Modification du nombre de participants',
          '1. Reduction possible plus de sept jours avant.',
          '2. Augmentation possible jusqu\'a un certain nombre de participants en fonction des capacites',
          '   des salles choisies et des disponibilites.'
        ]}
      ];

      cgvSections.forEach(function (section) {
        // Section title
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(8);
        doc.text(section.title, 15, y);
        y += 5;

        // Section items
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(7);
        section.items.forEach(function (item) {
          if (item === '') { y += 2; return; }
          doc.text(item, 18, y);
          y += 3.8;
        });
        y += 4;
      });

      // Closing
      y += 4;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(8);
      doc.text('Restant a votre disposition,', 15, y); y += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Toute l\'equipe de Brain l\'escape game de Caen', 15, y); y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(7.5);
      doc.text('Ce devis est sans engagement tant qu\'il n\'est pas valide.', 15, y); y += 4;
      doc.text('Pour confirmer ce devis sans faire de modification, merci de nous le renvoyer signe "bon pour accord" :', 15, y); y += 4;
      doc.text('vous serez engage a honorer la facture que vous recevrez par mail.', 15, y);

      // --- Save ---
      doc.save('BRAIN_Devis_' + d.devisId + '.pdf');
    } catch (err) {
      console.error('[DEVIS] PDF generation error:', err);
      alert('Erreur lors de la generation du PDF. Vous pouvez faire une capture d\'ecran du recapitulatif.');
    }
  }

  /* ========== INIT ========== */
  showStep(1);

})();
