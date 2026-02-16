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
    escape: '/img/escape/garde-a-vue-porte.jpg',
    quiz: '/img/quiz/salle-quiz.jpg',
    combo_escape: '/img/escape/garde-a-vue-porte.jpg',
    combo_quiz: '/img/quiz/salle-quiz.jpg'
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

  /* ========== PDF — CONFIRMATION DE DEMANDE (1 page) ========== */
  document.getElementById('download-pdf').addEventListener('click', generatePDF);

  /* --- Color palette --- */
  var ORANGE = [245, 130, 32];
  var DARK = [30, 30, 30];
  var WHITE = [255, 255, 255];
  var GREY = [100, 100, 100];
  var LGREY = [200, 200, 200];
  var TEXT = [50, 50, 50];

  /* --- Reusable PDF building blocks --- */
  function pdfHeader(doc) {
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, 30, 210, 1.5, 'F');

    // Brand: GAMEDOOR 41
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFontSize(17);
    doc.setFont('helvetica', 'bold');
    doc.text('GAMEDOOR 41', 20, 13);

    // Sub-brands
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.text('Escape : BRAIN  |  Quiz : BUZZ YOUR BRAIN', 20, 20);

    // Address right
    doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
    doc.setFontSize(7);
    doc.text('41B Rue Pasteur, ZAC de Calix, 14120 MONDEVILLE', 190, 11, { align: 'right' });
    doc.text('Tel. 06 44 64 71 07  -  contact@braincaen.com', 190, 16, { align: 'right' });
    doc.text('gamedoor41.fr', 190, 21, { align: 'right' });
  }

  function pdfFooter(doc) {
    doc.setFillColor(DARK[0], DARK[1], DARK[2]);
    doc.rect(0, 286, 210, 11, 'F');
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(0, 286, 210, 0.6, 'F');
    doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('GAMEDOOR 41  -  41B Rue Pasteur, ZAC de Calix, 14120 MONDEVILLE  -  06 44 64 71 07  -  contact@braincaen.com  -  gamedoor41.fr', 105, 291, { align: 'center' });
    doc.text('SARL au capital de 10 000 EUR  -  SIRET 82322711100023  -  TVA : FR41823227111', 105, 295, { align: 'center' });
  }

  function pdfSection(doc, title, y) {
    doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
    doc.rect(15, y, 180, 7.5, 'F');
    doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, y + 5.2);
    return y + 11;
  }

  function pdfRow(doc, label, value, y) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(GREY[0], GREY[1], GREY[2]);
    doc.setFontSize(8);
    doc.text(label, 22, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.text(String(value), 85, y);
    return y + 4.5;
  }

  function generatePDF() {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) { alert('PDF non disponible. Faites une capture d\'ecran du recapitulatif.'); return; }
    if (!savedData) { alert('Donnees non disponibles. Veuillez recharger la page et soumettre a nouveau.'); return; }

    try {
      var d = savedData;
      var doc = new jsPDF();

      pdfHeader(doc);
      pdfFooter(doc);

      /* --- Title --- */
      var y = 37;
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIRMATION DE DEMANDE DE DEVIS', 105, y, { align: 'center' });
      y += 5;
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Votre demande a bien ete recue par GAMEDOOR 41  -  Ref. ' + d.devisId + '  -  ' + new Date().toLocaleDateString('fr-FR'), 105, y, { align: 'center' });

      /* --- Info box --- */
      y += 5;
      doc.setFillColor(255, 248, 240);
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.4);
      doc.roundedRect(15, y, 180, 21, 2, 2, 'FD');
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Votre demande a bien ete transmise a notre equipe.', 22, y + 5);
      doc.text('Un devis officiel detaille vous sera envoye sous 48h ouvrees. Le delai de validite ainsi que la duree', 22, y + 9.5);
      doc.text('de blocage des creneaux seront precises dans ce devis.', 22, y + 13.5);
      doc.setFont('helvetica', 'bold');
      doc.text('La reservation ne sera effective qu\'apres validation du devis officiel.', 22, y + 18);
      y += 25;

      /* --- Recap de la demande --- */
      y = pdfSection(doc, 'RECAPITULATIF DE VOTRE DEMANDE', y);

      // Activity with image(s)
      if (d.activite === 'combo') {
        // Combo: two images side by side with labels
        var cImgW = 42;
        var cImgH = 28;
        var col1X = 15;
        var col2X = 110;

        // Escape image + label
        var escImg = pdfImages.combo_escape || pdfImages.escape;
        if (escImg) {
          try { doc.addImage(escImg, 'JPEG', col1X, y, cImgW, cImgH); } catch (e) { /* skip */ }
        } else {
          doc.setFillColor(40, 40, 40);
          doc.rect(col1X, y, cImgW, cImgH, 'F');
        }
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BRAIN', col1X + cImgW + 3, y + 10);
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(8);
        doc.text('Escape Game', col1X + cImgW + 3, y + 16);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('60 min', col1X + cImgW + 3, y + 21);

        // Quiz image + label
        var quizImg = pdfImages.combo_quiz || pdfImages.quiz;
        if (quizImg) {
          try { doc.addImage(quizImg, 'JPEG', col2X, y, cImgW, cImgH); } catch (e) { /* skip */ }
        } else {
          doc.setFillColor(40, 40, 40);
          doc.rect(col2X, y, cImgW, cImgH, 'F');
        }
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('BUZZ YOUR BRAIN', col2X + cImgW + 3, y + 10);
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(8);
        doc.text('Quiz Game', col2X + cImgW + 3, y + 16);
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('90 min', col2X + cImgW + 3, y + 21);

        y += cImgH + 4;
        // Participants line
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(d.nb + ' personnes  -  Demi-journee', 22, y);
        y += 4;
      } else {
        // Single activity: image + info beside
        var imgX = 15;
        var imgW = 40;
        var imgH = 28;
        var textX = imgX + imgW + 8;
        var actImg = pdfImages[d.activite];

        if (actImg) {
          try { doc.addImage(actImg, 'JPEG', imgX, y, imgW, imgH); } catch (e) { /* skip */ }
        } else {
          doc.setFillColor(40, 40, 40);
          doc.rect(imgX, y, imgW, imgH, 'F');
          doc.setTextColor(LGREY[0], LGREY[1], LGREY[2]);
          doc.setFontSize(8);
          doc.text(d.brand.name, imgX + imgW / 2, y + imgH / 2, { align: 'center' });
        }

        var iy = y + 1;
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(d.brand.brand, textX, iy + 4);
        iy += 7;
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(9);
        doc.text(d.brand.name, textX, iy + 4);
        iy += 6;
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Duree : ' + d.brand.duration + '  -  ' + d.nb + ' personnes', textX, iy + 4);

        y += imgH + 3;
      }

      if (d.privatisation) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.setFontSize(8);
        doc.text('+ Privatisation de l\'espace demandee', 22, y);
        y += 5;
      }

      // Details grid
      y += 1;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(15, y, 195, y);
      y += 4;

      if (d.societe) y = pdfRow(doc, 'Organisation :', d.societe, y);
      y = pdfRow(doc, 'Contact :', d.nom, y);
      y = pdfRow(doc, 'Telephone :', d.telephone, y);
      y = pdfRow(doc, 'Email :', d.email, y);
      y = pdfRow(doc, 'Date souhaitee :', d.dateFormatted, y);
      y = pdfRow(doc, 'Creneau :', d.creneau, y);
      y = pdfRow(doc, 'Participants :', d.nb + ' personnes', y);

      if (d.notes) {
        y += 1;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(GREY[0], GREY[1], GREY[2]);
        doc.setFontSize(8);
        doc.text('Notes :', 22, y);
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        var noteLines = doc.splitTextToSize(d.notes, 110);
        doc.text(noteLines, 88, y);
        y += noteLines.length * 4 + 2;
      }

      // Estimation indicative (light, not contractual)
      y += 2;
      doc.setDrawColor(230, 230, 230);
      doc.setLineWidth(0.2);
      doc.line(15, y, 195, y);
      y += 4;
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Estimation indicative (hors options) :', 22, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      if (d.isPro) {
        doc.text(d.est.ht.toFixed(2) + ' EUR HT  (' + d.est.ttc.toFixed(2) + ' EUR TTC)', 110, y);
      } else {
        doc.text(d.est.ttc.toFixed(2) + ' EUR TTC', 110, y);
      }
      y += 3.5;
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.text('Le tarif definitif sera confirme dans le devis officiel envoye par notre equipe.', 22, y);

      /* --- Blocage temporaire des creneaux --- */
      y += 8;
      doc.setFillColor(252, 251, 249);
      doc.setDrawColor(LGREY[0], LGREY[1], LGREY[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, 180, 28, 2, 2, 'FD');

      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Blocage temporaire des creneaux', 22, y + 6);

      doc.setDrawColor(LGREY[0], LGREY[1], LGREY[2]);
      doc.setLineWidth(0.15);
      doc.line(22, y + 8, 90, y + 8);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.text('Les creneaux demandes sont pre-bloques temporairement dans notre planning.', 22, y + 13);
      doc.text('En l\'absence de validation ecrite du devis officiel dans le delai communique par notre equipe,', 22, y + 17);
      doc.text('les creneaux seront automatiquement liberes et pourront etre attribues a un autre groupe.', 22, y + 21);
      doc.setFont('helvetica', 'bold');
      doc.text('Aucune activite ne pourra etre maintenue sans validation formelle du devis.', 22, y + 25.5);
      y += 32;

      /* --- Prochaines etapes --- */
      y += 4;
      y = pdfSection(doc, 'PROCHAINES ETAPES', y);

      var steps = [
        { num: '1', text: 'Analyse de votre demande par notre equipe' },
        { num: '2', text: 'Envoi du devis officiel detaille sous 48h ouvrees' },
        { num: '3', text: 'Validation du devis par vos soins' },
        { num: '4', text: 'Confirmation definitive par notre equipe' }
      ];

      steps.forEach(function (step) {
        doc.setFillColor(ORANGE[0], ORANGE[1], ORANGE[2]);
        doc.circle(24, y + 0.5, 2.8, 'F');
        doc.setTextColor(WHITE[0], WHITE[1], WHITE[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(step.num, 24, y + 1.5, { align: 'center' });
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(step.text, 31, y + 1.5);
        y += 6;
      });

      /* --- Closing message --- */
      y += 2;
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.3);
      doc.line(15, y, 195, y);
      y += 4;

      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Merci pour votre demande. Notre equipe revient vers vous dans les meilleurs delais.', 15, y);
      doc.setFont('helvetica', 'bold');
      doc.text('L\'equipe GAMEDOOR 41', 160, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(GREY[0], GREY[1], GREY[2]);
      doc.setFontSize(7);
      doc.text('Une question ? Contactez-nous : 06 44 64 71 07  -  contact@braincaen.com', 15, y);

      /* --- Urgency notice --- */
      y += 6;
      doc.setFillColor(255, 248, 240);
      doc.setDrawColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setLineWidth(0.3);
      doc.roundedRect(15, y, 180, 9, 1.5, 1.5, 'FD');
      doc.setTextColor(ORANGE[0], ORANGE[1], ORANGE[2]);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Evenement dans moins de 7 jours ?', 22, y + 3.8);
      doc.setFont('helvetica', 'normal');
      doc.text('Merci de nous contacter directement par telephone afin de securiser votre organisation : 06 44 64 71 07', 22, y + 7.3);

      /* --- Save --- */
      doc.save('GAMEDOOR41_Confirmation_' + d.devisId + '.pdf');
    } catch (err) {
      console.error('[DEVIS] PDF generation error:', err);
      alert('Erreur lors de la generation du PDF. Vous pouvez faire une capture d\'ecran du recapitulatif.');
    }
  }

  /* ========== INIT ========== */
  showStep(1);

})();
