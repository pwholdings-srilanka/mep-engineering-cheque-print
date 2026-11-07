// lib/words.js
// Number-to-words, text casing, and formatting utilities for PW Holdings Cheque Printer

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
      // Preserve initials like N.G.L or N.G.L. or single letters with dots (e.g. N.)
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

function formatDateDigits(dateStr) {
  if (!dateStr) return { d1: '', d2: '', m1: '', m2: '', y1: '', y2: '', y3: '', y4: '', formatted: '' };
  let day = '', month = '', year = '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) { // YYYY-MM-DD
      year = parts[0]; month = parts[1].padStart(2, '0'); day = parts[2].padStart(2, '0');
    } else { // DD-MM-YYYY
      day = parts[0].padStart(2, '0'); month = parts[1].padStart(2, '0'); year = parts[2];
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    day = parts[0].padStart(2, '0'); month = parts[1].padStart(2, '0'); year = parts[2];
  }

  return {
    d1: day[0] || '', d2: day[1] || '',
    m1: month[0] || '', m2: month[1] || '',
    y1: year[0] || '', y2: year[1] || '', y3: year[2] || '', y4: year[3] || '',
    formatted: `${day}/${month}/${year}`,
  };
}

function formatAmount(amt) {
  const n = Number(amt) || 0;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

module.exports = {
  numberToWords,
  applyTextCase,
  formatDateDigits,
  formatAmount
};

