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

  /* ========== FORM SUBMISSION ========== */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validateStep(4)) return;

    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Envoi en cours\u2026';

    var formData = new FormData(form);

    // Debug: log all fields being sent
    var params = new URLSearchParams(formData);
    console.log('[DEVIS] Submitting to Netlify Forms:', Object.fromEntries(params));

    // Try primary endpoint, fallback to alternate
    submitToNetlify(params, 0);

    function submitToNetlify(params, attempt) {
      var endpoints = ['/', '/devis/'];
      var url = endpoints[attempt] || endpoints[0];
      console.log('[DEVIS] Attempt', attempt + 1, 'POST to', url);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      })
      .then(function (res) {
        if (res.ok) {
          console.log('[DEVIS] Submission OK, status:', res.status);
          showConfirmation();
        } else if (attempt < endpoints.length - 1) {
          console.warn('[DEVIS] Endpoint', url, 'returned', res.status, '- trying next');
          submitToNetlify(params, attempt + 1);
        } else {
          return res.text().then(function (body) {
            console.error('[DEVIS] All endpoints failed. Last:', res.status, body.substring(0, 300));
            throw new Error('Erreur serveur ' + res.status);
          });
        }
      })
      .catch(function (err) {
        if (attempt < endpoints.length - 1) {
          submitToNetlify(params, attempt + 1);
        } else {
          console.error('[DEVIS] Erreur envoi finale:', err);
          showError('error-step4', 'Erreur lors de l\u2019envoi. Réessayez ou appelez le 02 31 53 07 51.');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Recevoir mon devis';
        }
      });
    }
  });

  function showConfirmation() {
    form.hidden = true;
    document.getElementById('devis-progress').hidden = true;
    document.getElementById('confirm-id').textContent = devisId;
    document.getElementById('confirm-email').textContent = document.getElementById('email').value;
    document.getElementById('confirm-recap').innerHTML = document.getElementById('recap-content').innerHTML;
    confirmation.hidden = false;
    window.scrollTo({ top: document.querySelector('.devis-section').offsetTop - 80, behavior: 'smooth' });
  }

  /* ========== PDF GENERATION ========== */
  document.getElementById('download-pdf').addEventListener('click', generatePDF);

  function generatePDF() {
    var jsPDF = window.jspdf && window.jspdf.jsPDF;
    if (!jsPDF) { alert('PDF non disponible. Faites une capture d\u2019écran du récapitulatif.'); return; }

    var doc = new jsPDF();
    var type = val('type');
    var activite = val('activite');
    var nb = parseInt(participantsInput.value, 10);
    var isPro = (type === 'entreprise' || type === 'association');
    var est = calculatePrice(type, activite, nb);
    var actLabels = { escape: 'Escape Game', quiz: 'Quiz Game', combo: 'Combo Escape + Quiz' };
    var typeLabels = { entreprise: 'Entreprise', association: 'Association', particulier: 'Particulier' };

    // Header bar
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 0, 210, 28, 'F');
    doc.setFillColor(245, 130, 32); // orange
    doc.rect(0, 28, 210, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('GAMEDOOR\u202241', 105, 14, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Escape Game & Quiz Game \u2014 Caen', 105, 22, { align: 'center' });

    // Title
    doc.setTextColor(245, 130, 32);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('DEMANDE DE DEVIS', 105, 44, { align: 'center' });
    doc.setTextColor(130, 130, 130);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Ref. ' + devisId + '  \u2014  ' + new Date().toLocaleDateString('fr-FR'), 105, 51, { align: 'center' });

    // Client info
    var y = 64;
    doc.setTextColor(245, 130, 32);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMATIONS', 20, y); y += 8;
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Type : ' + (typeLabels[type] || type), 20, y);
    doc.text('Activite : ' + (actLabels[activite] || activite), 110, y); y += 6;
    doc.text('Participants : ' + nb, 20, y);
    doc.text('Date : ' + formatDate(dateInput.value), 110, y); y += 6;
    doc.text('Creneau : ' + val('creneau'), 20, y); y += 6;
    var societe = document.getElementById('societe').value.trim();
    if (societe) { doc.text('Societe : ' + societe, 20, y); y += 6; }
    doc.text('Contact : ' + document.getElementById('nom').value, 20, y);
    doc.text('Tel : ' + document.getElementById('telephone').value, 110, y); y += 6;
    doc.text('Email : ' + document.getElementById('email').value, 20, y); y += 6;
    if (checked('privatisation')) { doc.text('Privatisation : Oui (sur devis)', 20, y); y += 6; }
    var notes = document.getElementById('notes').value.trim();
    if (notes) {
      y += 4;
      doc.text('Notes :', 20, y); y += 5;
      var lines = doc.splitTextToSize(notes, 170);
      doc.text(lines, 20, y); y += lines.length * 5;
    }

    // Price table
    y += 10;
    doc.setFillColor(40, 40, 40);
    doc.rect(20, y, 170, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ESTIMATION TARIFAIRE', 25, y + 5.5);
    y += 12;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);

    if (isPro) {
      doc.text('Total HT :', 25, y); doc.text(est.ht.toFixed(2) + ' EUR', 170, y, { align: 'right' }); y += 7;
      doc.text('TVA 10% :', 25, y); doc.text((est.ttc - est.ht).toFixed(2) + ' EUR', 170, y, { align: 'right' }); y += 7;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 130, 32);
    doc.text('TOTAL TTC :', 25, y); doc.text(est.ttc.toFixed(2) + ' EUR', 170, y, { align: 'right' }); y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Soit ' + (isPro ? (est.ht / nb).toFixed(2) + ' EUR HT' : '~' + (est.ttc / nb).toFixed(2) + ' EUR') + ' par personne', 25, y); y += 10;
    doc.setFontSize(8);
    doc.text('Estimation indicative. Le devis definitif sera ajuste selon la configuration retenue.', 25, y);

    // Footer
    doc.setFillColor(30, 30, 30);
    doc.rect(0, 275, 210, 22, 'F');
    doc.setFillColor(245, 130, 32);
    doc.rect(0, 275, 210, 2, 'F');
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(8);
    doc.text('GAMEDOOR\u202241 \u2014 41 bis rue Pasteur, 14000 Caen', 105, 284, { align: 'center' });
    doc.text('02 31 53 07 51 \u2014 contact@gamedoor41.fr \u2014 gamedoor41.fr', 105, 290, { align: 'center' });

    doc.save('GAMEDOOR41_Devis_' + devisId + '.pdf');
  }

  /* ========== INIT ========== */
  showStep(1);

})();
