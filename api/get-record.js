// api/get-record.js
// Fetches records, vendor payments, expenses, or recent payments list from Zoho Books
const { apiRequest, getStoredTokens, getAccessToken, ORG_ID } = require('../lib/zohoAuth');
const { numberToWords, formatDateDigits, formatAmount } = require('../lib/words');
const url = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Zoho-Refresh-Token');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const query = req.query || url.parse(req.url, true).query || {};
  const customRefreshToken = req.headers['x-zoho-refresh-token'] || query.refresh_token;

  // Authorization check route
  if (query.check === '1' || query.check === 'true' || query.check_auth === 'true' || query.type === 'auth_status') {
    const tokens = getStoredTokens(customRefreshToken);
    let authorized = !!(tokens && tokens.refresh_token);
    let error = null;
    if (query.test === 'true' && authorized) {
      try {
        await getAccessToken(customRefreshToken);
      } catch (err) {
        authorized = false;
        error = err.message;
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      authorized,
      error,
      orgId: ORG_ID,
      refreshToken: tokens ? tokens.refresh_token : null,
    }));
    return;
  }

  const type = query.type || 'vendorpayment';
  const id = query.id || query.paymentID || query.expenseID;
  let orgId = query.organizationID || query.orgId || ORG_ID;
  if (!orgId || orgId === '933829154' || String(orgId).startsWith('935')) {
    orgId = ORG_ID;
  }

  try {
    // Organizations list
    if (type === 'organizations' || type === 'orgs') {
      const accessToken = await getAccessToken(customRefreshToken);
      const resOrg = await fetch('https://www.zohoapis.com/books/v3/organizations', {
        headers: { Authorization: `Zoho-oauthtoken ${accessToken}` }
      });
      const dataOrg = await resOrg.json();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(dataOrg));
      return;
    }

    // Recent payments list (for quick loader modal)
    if (type === 'list') {
      const apiRes = await apiRequest('GET', `/vendorpayments?per_page=50&sort_column=date&sort_order=D`, null, orgId, customRefreshToken);
      if (apiRes.status >= 400) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: apiRes.data?.message || JSON.stringify(apiRes.data) }));
        return;
      }
      const payments = (apiRes.data && apiRes.data.vendorpayments) || [];
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, payments }));
      return;
    }

    if (!id) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing Record ID (paymentID or expenseID)' }));
      return;
    }

    // Single vendorpayment / cheque / voucher
    if (type === 'vendorpayment' || type === 'cheque' || type === 'voucher') {
      const apiRes = await apiRequest('GET', `/vendorpayments/${id}`, null, orgId, customRefreshToken);
      if (apiRes.status >= 400) {
        throw new Error(JSON.stringify(apiRes.data));
      }
      const p = (apiRes.data && apiRes.data.vendorpayment) || {};

      const customFields = p.custom_fields || [];
      let printBank = '';
      for (const cf of customFields) {
        if (cf.label === 'Print Bank Name' || cf.api_name === 'cf_print_bank_name') {
          printBank = cf.value_formatted || cf.value || '';
        }
      }
      if (!printBank) {
        printBank = p.paid_through_account_name || '';
      }

      const payeeName = p.vendor_name || p.paid_to || '—';
      const amount = Number(p.amount) || 0;
      const dateDigits = formatDateDigits(p.date);
      const amountInWords = numberToWords(amount);
      const amountFormatted = formatAmount(amount);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        type: 'vendorpayment',
        paymentId: p.payment_id,
        paymentNumber: p.payment_number,
        date: p.date,
        dateDigits,
        payeeName,
        amount,
        amountFormatted,
        amountInWords,
        bankName: printBank,
        accountName: p.paid_through_account_name,
        currencySymbol: p.currency_symbol || 'Rs',
        referenceNumber: p.reference_number || '',
        description: p.description || '',
      }));
      return;
    }

    // Expense
    if (type === 'expense') {
      const apiRes = await apiRequest('GET', `/expenses/${id}`, null, orgId, customRefreshToken);
      if (apiRes.status >= 400) {
        throw new Error(JSON.stringify(apiRes.data));
      }
      const exp = (apiRes.data && apiRes.data.expense) || {};
      const payeeName = exp.vendor_name || exp.paid_to || '—';
      const amount = Number(exp.total || exp.amount) || 0;
      const dateDigits = formatDateDigits(exp.date);
      const amountInWords = numberToWords(amount);
      const amountFormatted = formatAmount(amount);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        type: 'expense',
        expenseId: exp.expense_id,
        expenseNumber: exp.expense_number || '',
        date: exp.date,
        dateDigits,
        payeeName,
        amount,
        amountFormatted,
        amountInWords,
        bankName: exp.paid_through_account_name || '',
        accountName: exp.paid_through_account_name,
        currencySymbol: exp.currency_symbol || 'Rs',
        referenceNumber: exp.reference_number || '',
        description: exp.description || '',
      }));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Unsupported type '${type}'. Use 'vendorpayment', 'expense', or 'list'.` }));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: err.message,
      isAuthError: err.code === 'NOT_AUTHORIZED' || err.message.includes('invalid_token'),
    }));
  }
};

