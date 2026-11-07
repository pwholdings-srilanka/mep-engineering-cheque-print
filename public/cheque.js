// public/cheque.js
// Client logic, live reactive rendering, calibration, and Zoho Books integration

let currentRecord = {
  payeeName: 'N.G.L Hashan',
  dateDigits: { d1: '3', d2: '0', m1: '1', m2: '0', y1: '2', y2: '0', y3: '2', y4: '6' },
  date: '2026-10-30',
  amount: 135000.00,
  amountFormatted: '135,000.00',
  amountInWords: 'One Hundred And Thirty Five Thousand And Cents Zero Only',
  paymentNumber: '1001',
  bankName: 'Nations Trust Bank',
};

let currentRotation = 270; // Default: 270° Canon Rear Tray Feed

// Toast Notification
function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Casing Utility
function applyTextCase(text, caseType) {
  if (!text) return '';
  const t = String(text).trim();
  if (caseType === 'as_is') {
    return t;
  } else if (caseType === 'upper') {
    return t.toUpperCase();
  } else if (caseType === 'title') {
    return t.split(/\s+/).map(w => {
      if (!w) return '';
      if (/^([A-Za-z]\.)+([A-Za-z]\.?)?$/.test(w) || /^[A-Za-z]\.$/.test(w)) {
        return w.toUpperCase();
      }
      if (w.startsWith('(') && w.endsWith(')')) {
        const inner = w.slice(1, -1);
        return '(' + inner.charAt(0).toUpperCase() + inner.slice(1).toLowerCase() + ')';
      }
      if (w.includes('-')) {
        return w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join('-');
      }
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(' ');
  } else if (caseType === 'sentence') {
    const words = t.split(/\s+/).map((w, idx) => {
      if (!w) return '';
      if (/^([A-Za-z]\.)+([A-Za-z]\.?)?$/.test(w) || /^[A-Za-z]\.$/.test(w)) {
        return w.toUpperCase();
      }
      if (idx === 0) {
        return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
      }
      return w.toLowerCase();
    });
    return words.join(' ');
  }
  return t;
}

// Number to Words in International Format with Title Case
function numberToWords(num) {
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function inWords(n) {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' And ' + inWords(n % 100) : '');
    if (n < 1000000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 1000000000) return inWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + inWords(n % 1000000) : '');
    return inWords(Math.floor(n / 1000000000)) + ' Billion' + (n % 1000000000 !== 0 ? ' ' + inWords(n % 1000000000) : '');
  }

  const val = Number(num) || 0;
  const wholeCents = Math.round(val * 100);
  const intPart = Math.floor(wholeCents / 100);
  const cents = wholeCents % 100;

  const wordsPart = intPart === 0 ? 'Zero' : inWords(intPart);
  const centsPart = cents === 0 ? 'Zero' : inWords(cents);

  return `${wordsPart} And Cents ${centsPart} Only`;
}

// Update live cheque canvas
function updateLiveCheque() {
  // Bold Mode Toggle
  const isBold = document.getElementById('chkBold')?.checked;
  const assembly = document.getElementById('chequeAssembly');
  if (assembly) {
    assembly.classList.toggle('bold-mode', !!isBold);
  }

  // Payee
  const showPayee = document.getElementById('chkPayee')?.checked ?? true;
  const rawPayee = document.getElementById('cqPayeeInput')?.value || '';
  const payeeCase = document.getElementById('cqPayeeCase')?.value || 'as_is';
  const payeeVal = applyTextCase(rawPayee, payeeCase);
  const payeeEl = document.getElementById('cqPayee');
  if (payeeEl) {
    payeeEl.style.display = showPayee ? 'block' : 'none';
    payeeEl.textContent = payeeVal;
  }
  const cfPayee = document.getElementById('cfPayee');
  if (cfPayee) cfPayee.textContent = payeeVal;

  // Date
  const showDate = document.getElementById('chkDate')?.checked ?? true;
  const d = currentRecord.dateDigits || { d1: '3', d2: '0', m1: '1', m2: '0', y1: '2', y2: '0', y3: '2', y4: '6' };
  const dateEl = document.getElementById('cqDateBox');
  const dFormat = document.getElementById('cqDateFormat')?.value || 'skip_20';
  if (dateEl) {
    dateEl.style.display = showDate ? 'flex' : 'none';
    dateEl.classList.remove('skip-20', 'compact-6');
    if (dFormat === 'skip_20') {
      dateEl.classList.add('skip-20');
    } else if (dFormat === 'compact_6') {
      dateEl.classList.add('compact-6');
    }

    const d1 = document.getElementById('d1'); if (d1) d1.textContent = d.d1;
    const d2 = document.getElementById('d2'); if (d2) d2.textContent = d.d2;
    const m1 = document.getElementById('m1'); if (m1) m1.textContent = d.m1;
    const m2 = document.getElementById('m2'); if (m2) m2.textContent = d.m2;
    const y1 = document.getElementById('y1'); if (y1) y1.textContent = d.y1;
    const y2 = document.getElementById('y2'); if (y2) y2.textContent = d.y2;
    const y3 = document.getElementById('y3'); if (y3) y3.textContent = d.y3;
    const y4 = document.getElementById('y4'); if (y4) y4.textContent = d.y4;
  }
  const cfDate = document.getElementById('cfDate');
  if (cfDate) cfDate.textContent = `${d.d1}${d.d2}/${d.m1}${d.m2}/${d.y1}${d.y2}${d.y3}${d.y4}`;

  // Amount in Words
  const showWords = document.getElementById('chkWords')?.checked ?? true;
  const rawWords = document.getElementById('cqWordsInput')?.value || '';
  const wordsCase = document.getElementById('cqWordsCase')?.value || 'title';
  const wordsVal = applyTextCase(rawWords, wordsCase);
  const wordsEl = document.getElementById('cqWords');
  if (wordsEl) {
    wordsEl.style.display = showWords ? 'block' : 'none';
    wordsEl.textContent = wordsVal;
  }

  // Amount in Numbers
  const showAmt = document.getElementById('chkAmount')?.checked ?? true;
  const amtVal = parseFloat(document.getElementById('cqAmountInput')?.value) || 0;
  const amtFmt = amtVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const amtEl = document.getElementById('cqAmountNum');
  if (amtEl) {
    amtEl.style.display = showAmt ? 'block' : 'none';
    amtEl.textContent = amtFmt;
  }
  const cfAmt = document.getElementById('cfAmt');
  if (cfAmt) cfAmt.textContent = amtFmt;

  // Crossing Lines ("ACCOUNT PAYEE ONLY")
  const showCross = document.getElementById('chkCross')?.checked ?? true;
  const crossEl = document.getElementById('cqCrossingLines');
  if (crossEl) crossEl.style.display = showCross ? 'flex' : 'none';

  // Bearer Strike
  const showBearer = document.getElementById('chkBearer')?.checked ?? true;
  const bearerEl = document.getElementById('cqBearerStrike');
  if (bearerEl) bearerEl.style.display = showBearer ? 'block' : 'none';

  // Signatures Line
  const showSig = document.getElementById('chkSignatures')?.checked ?? false;
  const sigEl = document.getElementById('cqSignatures');
  if (sigEl) sigEl.style.display = showSig ? 'flex' : 'none';

  // Company Header
  const showCompany = document.getElementById('chkCompany')?.checked ?? true;
  const companyText = document.getElementById('cqCompanyInput')?.value || 'MEP Engineering & Trading Company (Pvt) Ltd';
  const companyEl = document.getElementById('cqCompanyHeader');
  if (companyEl) {
    companyEl.style.display = showCompany ? 'block' : 'none';
    companyEl.textContent = companyText;
  }

  // Counterfoil / Stub
  const showStub = document.getElementById('chkStub')?.checked ?? false;
  const stubEl = document.getElementById('chequeStub');
  if (stubEl) stubEl.style.display = showStub ? 'flex' : 'none';

  const cfDocNum = document.getElementById('cfDocNum');
  if (cfDocNum) cfDocNum.textContent = currentRecord.paymentNumber || '—';
}

function onAmountChange() {
  const amt = parseFloat(document.getElementById('cqAmountInput')?.value) || 0;
  currentRecord.amount = amt;
  currentRecord.amountFormatted = amt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rawWords = numberToWords(amt);
  const wordsCase = document.getElementById('cqWordsCase')?.value || 'title';
  currentRecord.amountInWords = applyTextCase(rawWords, wordsCase);
  const wordsInput = document.getElementById('cqWordsInput');
  if (wordsInput) wordsInput.value = currentRecord.amountInWords;
  updateLiveCheque();
}

function onDateChange() {
  const dateVal = document.getElementById('cqDateInput')?.value;
  if (!dateVal) return;
  const parts = dateVal.split('-');
  currentRecord.date = dateVal;
  currentRecord.dateDigits = {
    d1: parts[2][0] || '0', d2: parts[2][1] || '1',
    m1: parts[1][0] || '0', m2: parts[1][1] || '1',
    y1: parts[0][0] || '2', y2: parts[0][1] || '0', y3: parts[0][2] || '2', y4: parts[0][3] || '6'
  };
  updateLiveCheque();
}

// Orientation and Feed Modes
function setChequeRotation(deg) {
  currentRotation = deg;
  const badgeRot = document.getElementById('badgeRotation');
  const btnLabel = document.getElementById('btnRotateLabel');

  document.body.classList.remove('feed-vert-canon', 'feed-vert-90', 'feed-horizontal', 'feed-inverted');

  let shortLabel = '0° (Horizontal)';
  let badgeText = 'Landscape Feed (0°)';

  let printStyle = document.getElementById('dynamicPrintStyle');
  if (!printStyle) {
    printStyle = document.createElement('style');
    printStyle.id = 'dynamicPrintStyle';
    document.head.appendChild(printStyle);
  }

  if (deg === 270) {
    shortLabel = '270° Canon Tray';
    badgeText = '⬇️ 270° Canon Tray Feed';
    document.body.classList.add('feed-vert-canon');
    printStyle.textContent = '@page { size: portrait; margin: 0mm !important; }';
    const curLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);
    if (curLeft === 0) {
      if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = 60.5;
    }
  } else if (deg === 90) {
    shortLabel = '90° Vertical';
    badgeText = '⬆️ 90° Vertical Feed';
    document.body.classList.add('feed-vert-90');
    printStyle.textContent = '@page { size: portrait; margin: 0mm !important; }';
    const curLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);
    if (curLeft === 0) {
      if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = 60.5;
    }
  } else if (deg === 180) {
    shortLabel = '180° Inverted';
    badgeText = '🔄 180° Inverted';
    document.body.classList.add('feed-horizontal');
    printStyle.textContent = '@page { size: landscape; margin: 0mm !important; }';
    const curLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);
    if (curLeft === 60.5) {
      if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = 0;
    }
  } else {
    shortLabel = '0° Horizontal';
    badgeText = '➡️ 0° Horizontal Feed';
    document.body.classList.add('feed-horizontal');
    printStyle.textContent = '@page { size: landscape; margin: 0mm !important; }';
    const curLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);
    if (curLeft === 60.5) {
      if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = 0;
    }
  }

  if (btnLabel) btnLabel.textContent = `Rotate (${shortLabel})`;
  if (badgeRot) badgeRot.textContent = badgeText;

  localStorage.setItem('pw_cheque_rotation', String(deg));
  updateCalib();
}

function cycleChequeRotation() {
  const order = [270, 0, 90, 180];
  const idx = order.indexOf(currentRotation);
  const nextDeg = order[(idx + 1) % order.length];
  setChequeRotation(nextDeg);
  toast(`Printer orientation: ${nextDeg}°`);
}

function setMasterOffset(top, left) {
  if (document.getElementById('calMasterTop')) document.getElementById('calMasterTop').value = top;
  if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = left;
  updateCalib();
  toast(`Shifted: Top ${top}mm, Left ${left}mm`);
}

function nudgeMaster(dTop, dLeft) {
  const curTop = parseFloat(document.getElementById('calMasterTop')?.value || 0);
  const curLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);
  const newTop = Math.max(0, Math.round((curTop + dTop) * 10) / 10);
  const newLeft = Math.max(0, Math.round((curLeft + dLeft) * 10) / 10);
  setMasterOffset(newTop, newLeft);
}

function updateCalib() {
  const mTop = parseFloat(document.getElementById('calMasterTop')?.value || 0);
  const mLeft = parseFloat(document.getElementById('calMasterLeft')?.value || 0);

  document.documentElement.style.setProperty('--master-top', mTop + 'mm');
  document.documentElement.style.setProperty('--master-left', mLeft + 'mm');

  const dTop = document.getElementById('calDateTop')?.value || 5.0;
  const dLeft = document.getElementById('calDateLeft')?.value || 132;
  const dSpacing = parseFloat(document.getElementById('calDateSpacing')?.value || 0.8);
  const dBoxWidth = parseFloat(document.getElementById('calDateBoxWidth')?.value || 4.8);
  const dFontSize = parseFloat(document.getElementById('calDateFontSize')?.value || 13.5);

  const cTop = document.getElementById('calCrossTop')?.value || 4;
  const cLeft = document.getElementById('calCrossLeft')?.value || 6;
  const cWidth = document.getElementById('calCrossWidth')?.value || 45;

  const pTop = document.getElementById('calPayeeTop')?.value || 20;
  const pLeft = document.getElementById('calPayeeLeft')?.value || 22;
  const wTop = document.getElementById('calWordsTop')?.value || 30;
  const wLeft = document.getElementById('calWordsLeft')?.value || 22;
  const aTop = document.getElementById('calAmtTop')?.value || 42;
  const aRight = document.getElementById('calAmtRight')?.value || 24;

  const dateEl = document.getElementById('cqDateBox');
  if (dateEl) {
    dateEl.style.top = dTop + 'mm';
    dateEl.style.left = dLeft + 'mm';
    dateEl.style.gap = dSpacing + 'mm';
    dateEl.querySelectorAll('.d-cell').forEach(cell => {
      cell.style.width = dBoxWidth + 'mm';
      cell.style.fontSize = dFontSize + 'px';
    });
  }

  const linesEl = document.getElementById('cqCrossingLines');
  if (linesEl) {
    linesEl.style.top = cTop + 'mm';
    linesEl.style.left = cLeft + 'mm';
    linesEl.style.width = cWidth + 'mm';
  }

  const payeeEl = document.getElementById('cqPayee');
  if (payeeEl) {
    payeeEl.style.top = pTop + 'mm';
    payeeEl.style.left = pLeft + 'mm';
  }

  const wordsEl = document.getElementById('cqWords');
  if (wordsEl) {
    wordsEl.style.top = wTop + 'mm';
    wordsEl.style.left = wLeft + 'mm';
  }

  const amtEl = document.getElementById('cqAmountNum');
  if (amtEl) {
    amtEl.style.top = aTop + 'mm';
    amtEl.style.right = aRight + 'mm';
    amtEl.style.fontSize = dFontSize + 'px';
  }
}

function applyBankPreset(presetKey) {
  const saved = localStorage.getItem('pw_calib_' + presetKey);
  let p = BANK_PRESETS[presetKey] || BANK_PRESETS.ntb;
  if (saved) {
    try { p = { ...p, ...JSON.parse(saved) }; } catch (_) {}
  }

  if (document.getElementById('calMasterTop')) document.getElementById('calMasterTop').value = p.masterTop || 0;
  if (document.getElementById('calMasterLeft')) document.getElementById('calMasterLeft').value = p.masterLeft || 60.5;
  if (document.getElementById('calDateTop')) document.getElementById('calDateTop').value = p.dateTop;
  if (document.getElementById('calDateLeft')) document.getElementById('calDateLeft').value = p.dateLeft;
  if (document.getElementById('calDateSpacing')) document.getElementById('calDateSpacing').value = p.dateSpacing || 0.8;
  if (document.getElementById('calDateBoxWidth')) document.getElementById('calDateBoxWidth').value = p.dateBoxWidth || 4.8;
  if (document.getElementById('calDateFontSize')) document.getElementById('calDateFontSize').value = p.dateFontSize || 13.5;
  if (document.getElementById('cqDateFormat') && p.dateFormat) document.getElementById('cqDateFormat').value = p.dateFormat;
  if (document.getElementById('calCrossTop')) document.getElementById('calCrossTop').value = p.crossTop || 4;
  if (document.getElementById('calCrossLeft')) document.getElementById('calCrossLeft').value = p.crossLeft || 6;
  if (document.getElementById('calCrossWidth')) document.getElementById('calCrossWidth').value = p.crossWidth || 45;
  if (document.getElementById('calPayeeTop')) document.getElementById('calPayeeTop').value = p.payeeTop;
  if (document.getElementById('calPayeeLeft')) document.getElementById('calPayeeLeft').value = p.payeeLeft;
  if (document.getElementById('calWordsTop')) document.getElementById('calWordsTop').value = p.wordsTop;
  if (document.getElementById('calWordsLeft')) document.getElementById('calWordsLeft').value = p.wordsLeft;
  if (document.getElementById('calAmtTop')) document.getElementById('calAmtTop').value = p.amtTop;
  if (document.getElementById('calAmtRight')) document.getElementById('calAmtRight').value = p.amtRight;

  updateLiveCheque();
  updateCalib();
}

function saveBankProfile() {
  const bank = document.getElementById('bankPreset')?.value || 'ntb';
  const cfg = {
    masterTop: parseFloat(document.getElementById('calMasterTop')?.value || 0),
    masterLeft: parseFloat(document.getElementById('calMasterLeft')?.value || 0),
    dateTop: parseFloat(document.getElementById('calDateTop')?.value || 5),
    dateLeft: parseFloat(document.getElementById('calDateLeft')?.value || 132),
    dateSpacing: parseFloat(document.getElementById('calDateSpacing')?.value || 0.8),
    dateBoxWidth: parseFloat(document.getElementById('calDateBoxWidth')?.value || 4.8),
    dateFontSize: parseFloat(document.getElementById('calDateFontSize')?.value || 13.5),
    dateFormat: document.getElementById('cqDateFormat')?.value || 'skip_20',
    crossTop: parseFloat(document.getElementById('calCrossTop')?.value || 4),
    crossLeft: parseFloat(document.getElementById('calCrossLeft')?.value || 6),
    crossWidth: parseFloat(document.getElementById('calCrossWidth')?.value || 45),
    payeeTop: parseFloat(document.getElementById('calPayeeTop')?.value || 20),
    payeeLeft: parseFloat(document.getElementById('calPayeeLeft')?.value || 22),
    wordsTop: parseFloat(document.getElementById('calWordsTop')?.value || 30),
    wordsLeft: parseFloat(document.getElementById('calWordsLeft')?.value || 22),
    amtTop: parseFloat(document.getElementById('calAmtTop')?.value || 42),
    amtRight: parseFloat(document.getElementById('calAmtRight')?.value || 24),
  };
  localStorage.setItem('pw_calib_' + bank, JSON.stringify(cfg));
  toast('Saved calibration for ' + (BANK_PRESETS[bank]?.name || bank));
}

function resetCalibration() {
  const bank = document.getElementById('bankPreset')?.value || 'ntb';
  localStorage.removeItem('pw_calib_' + bank);
  applyBankPreset(bank);
  toast('Reset to default calibration');
}

function toggleGrid() {
  const canvas = document.querySelector('.canvas-viewport');
  if (canvas) {
    canvas.classList.toggle('show-grid');
    const on = canvas.classList.contains('show-grid');
    toast(on ? 'Ruler alignment grid ON' : 'Alignment grid OFF');
  }
}

// Zoho Connection & Records
function getSavedRefreshToken() {
  return localStorage.getItem('zoho_refresh_token') || '';
}

function getOrgId() {
  return localStorage.getItem('zoho_org_id') || '940082326';
}

function connectZoho() {
  window.open('/api/oauthStart', '_blank', 'width=650,height=650');
}

async function checkConnectionStatus() {
  const statusEl = document.getElementById('connectionStatus');
  try {
    const rt = getSavedRefreshToken();
    const url = rt ? `/api/get-record?check_auth=true&refresh_token=${encodeURIComponent(rt)}` : `/api/get-record?check_auth=true`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.authorized) {
      if (statusEl) {
        statusEl.className = 'status-badge';
        statusEl.innerHTML = '● Zoho Connected';
        statusEl.title = 'Zoho Books Connected (Click to Re-authorize)';
      }
    } else {
      if (statusEl) {
        statusEl.className = 'status-badge offline';
        statusEl.innerHTML = '○ Zoho Offline (Click to Connect)';
        statusEl.title = 'Click to Connect Zoho Books';
      }
    }
  } catch (_) {
    if (statusEl) {
      statusEl.className = 'status-badge offline';
      statusEl.innerHTML = '○ Zoho Offline (Click to Connect)';
      statusEl.title = 'Click to Connect Zoho Books';
    }
  }
}

window.addEventListener('focus', checkConnectionStatus);
window.addEventListener('storage', (e) => {
  if (e.key === 'zoho_refresh_token') checkConnectionStatus();
});

// Modal Quick Payments
let allFetchedPayments = [];

async function openQuickPaymentsModal() {
  const modal = document.getElementById('paymentsModal');
  if (modal) modal.classList.add('open');
  await loadQuickPayments();
}

function closeQuickPaymentsModal() {
  const modal = document.getElementById('paymentsModal');
  if (modal) modal.classList.remove('open');
}

async function loadQuickPayments() {
  const tbody = document.getElementById('paymentsTableBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">Loading recent vendor payments from Zoho Books...</td></tr>';

  try {
    const rt = getSavedRefreshToken();
    const orgId = getOrgId();
    const res = await fetch(`/api/get-record?type=list&organizationID=${orgId}&refresh_token=${encodeURIComponent(rt)}`);
    const data = await res.json();

    if (data.success && data.payments && data.payments.length > 0) {
      allFetchedPayments = data.payments;
      renderPaymentsTable(allFetchedPayments);
    } else {
      const errMsg = (data && data.error) ? data.error : 'No payments found or Zoho account not connected.';
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px; color:#ef4444;">
          <div style="font-weight:600; margin-bottom:8px;">⚠️ ${errMsg}</div>
          <button type="button" class="btn-secondary" onclick="connectZoho()" style="padding:6px 16px; cursor:pointer;">🔗 Connect Zoho Books</button>
        </td></tr>`;
      }
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:25px; color:#ef4444;">
        <div style="font-weight:600; margin-bottom:8px;">⚠️ Error: ${err.message}</div>
        <button type="button" class="btn-secondary" onclick="connectZoho()" style="padding:6px 16px; cursor:pointer;">🔗 Connect Zoho Books</button>
      </td></tr>`;
    }
  }
}

function renderPaymentsTable(payments) {
  const tbody = document.getElementById('paymentsTableBody');
  if (!tbody) return;

  if (payments.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:#64748b;">No matching payments.</td></tr>';
    return;
  }

  tbody.innerHTML = payments.map(p => {
    const amt = Number(p.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `
      <tr>
        <td style="font-weight:700; font-family:'Space Mono',monospace;">${escapeHtml(p.payment_number || '—')}</td>
        <td style="font-weight:600; color:#0f172a;">${escapeHtml(p.vendor_name || '—')}</td>
        <td style="color:#64748b;">${escapeHtml(p.date || '—')}</td>
        <td style="font-weight:700; font-family:'Space Mono',monospace;">Rs ${amt}</td>
        <td style="color:#64748b; font-size:11px;">${escapeHtml(p.paid_through_account_name || '—')}</td>
        <td style="text-align:right;">
          <button class="btn-autofill" onclick="selectPayment('${p.payment_id}')">Auto-Fill & Print</button>
        </td>
      </tr>
    `;
  }).join('');
}

function filterPayments() {
  const term = document.getElementById('paymentSearchInput')?.value.toLowerCase().trim() || '';
  if (!term) {
    renderPaymentsTable(allFetchedPayments);
    return;
  }
  const filtered = allFetchedPayments.filter(p => {
    return (
      (p.vendor_name && p.vendor_name.toLowerCase().includes(term)) ||
      (p.payment_number && p.payment_number.toLowerCase().includes(term)) ||
      (p.date && p.date.includes(term)) ||
      (p.paid_through_account_name && p.paid_through_account_name.toLowerCase().includes(term))
    );
  });
  renderPaymentsTable(filtered);
}

async function selectPayment(paymentId) {
  closeQuickPaymentsModal();
  toast('Loading payment #' + paymentId + ' from Zoho...');

  try {
    const rt = getSavedRefreshToken();
    const orgId = getOrgId();
    const res = await fetch(`/api/get-record?type=vendorpayment&id=${paymentId}&organizationID=${orgId}&refresh_token=${encodeURIComponent(rt)}`);
    const data = await res.json();

    if (data.success) {
      currentRecord = data;

      // Populate input controls
      const payeeInput = document.getElementById('cqPayeeInput');
      if (payeeInput) payeeInput.value = data.payeeName || '';

      const amtInput = document.getElementById('cqAmountInput');
      if (amtInput) amtInput.value = data.amount || 0;

      const wordsCase = document.getElementById('cqWordsCase')?.value || 'title';
      const autoWords = numberToWords(data.amount || 0);
      currentRecord.amountInWords = applyTextCase(autoWords, wordsCase);

      const wordsInput = document.getElementById('cqWordsInput');
      if (wordsInput) wordsInput.value = currentRecord.amountInWords;

      if (data.date) {
        const dateInput = document.getElementById('cqDateInput');
        if (dateInput) dateInput.value = data.date;
        onDateChange();
      }

      // Auto-detect bank preset
      if (data.bankName) {
        const b = data.bankName.toLowerCase();
        let targetPreset = 'ntb';
        if (b.includes('sampath')) targetPreset = 'sampath';
        else if (b.includes('commercial')) targetPreset = 'commercial';
        else if (b.includes('nations') || b.includes('ntb')) targetPreset = 'ntb';
        else if (b.includes('hatton') || b.includes('hnb')) targetPreset = 'hnb';
        else if (b.includes('ceylon') || b.includes('boc')) targetPreset = 'boc';
        else if (b.includes('seylan')) targetPreset = 'seylan';

        const bankSel = document.getElementById('bankPreset');
        if (bankSel) bankSel.value = targetPreset;
        applyBankPreset(targetPreset);
      }

      updateLiveCheque();
      toast(`Loaded: ${data.payeeName} (Rs ${data.amountFormatted})`);
    } else {
      toast('Error loading payment: ' + (data.error || 'Unknown'));
    }
  } catch (err) {
    toast('Error: ' + err.message);
  }
}

// URL Params loader (e.g. ?paymentID=12345 or ?id=12345)
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const paymentId = params.get('paymentID') || params.get('id');
  const orgId = params.get('organizationID') || params.get('orgId');
  if (orgId) {
    localStorage.setItem('zoho_org_id', orgId);
  }
  if (paymentId) {
    selectPayment(paymentId);
  }
}

// Initialization on DOM Ready
window.addEventListener('DOMContentLoaded', () => {
  // Set today's date in input
  const dateInput = document.getElementById('cqDateInput');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
    onDateChange();
  }

  // Restore saved rotation or default to 270
  const savedRot = parseInt(localStorage.getItem('pw_cheque_rotation') || '270', 10);
  setChequeRotation(savedRot);

  // Apply default bank preset (NTB)
  applyBankPreset('ntb');

  // Initial render
  updateLiveCheque();

  // Check URL params
  checkUrlParams();

  // Check connection status
  checkConnectionStatus();
});

