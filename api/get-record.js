// api/get-record.js
// Fetches records, vendor payments, expenses, or recent payments list from Zoho Books
const { apiRequest, getStoredTokens, getAccessToken, ORG_ID, createSession, isValidSession, validateAppKey } = require('../lib/zohoAuth');
const { numberToWords, formatDateDigits, formatAmount } = require('../lib/words');
const url = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Zoho-Refresh-Token, X-Mep-Session, X-Mep-Key, X-Mep-Pin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const query = req.query || url.parse(req.url, true).query || {};
  const customRefreshToken = req.headers['x-zoho-refresh-token'] || query.refresh_token;
  const sessionToken = req.headers['x-mep-session'] || query.session_token || query.session;
  const key = req.headers['x-mep-key'] || query.key;

  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const xForwardedFor = req.headers['x-forwarded-for'];
  const remoteIp = req.socket?.remoteAddress || req.connection?.remoteAddress || '';
  const referer = req.headers['referer'] || '';
  
  // Direct local requests from the user's laptop are always authorized
  const isLocal = !xForwardedFor && (host.includes('localhost') || host.includes('127.0.0.1') || host.includes(':8888'));

  // Session validation endpoint
  if (query.type === 'check_session' || query.check_session === 'true') {
    const valid = isLocal || isValidSession(sessionToken) || validateAppKey(key);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ valid, isLocal, orgId: ORG_ID }));
    return;
  }

  // Key login endpoint (exchanges button key for session token)
  if (query.type === 'key_login' || (query.key && query.type === 'session_init')) {
    if (validateAppKey(query.key)) {
      const token = createSession(ORG_ID);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, sessionToken: token, orgId: ORG_ID }));
      return;
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Invalid MEP Security Key' }));
      return;
    }
  }

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
      orgName: 'MEP Engineering & Trading Company (Pvt) Ltd',
      refreshToken: tokens ? tokens.refresh_token : null,
    }));
    return;
  }

  // Security gate:
  // 1. Local requests are always permitted
  // 2. Active session tokens are permitted
  // 3. Valid MEP security keys are permitted
  // 4. Requests referred directly from Zoho Books with a specific payment ID are permitted
  const isFromZoho = referer.includes('books.zoho.com') || referer.includes('zoho.com');
  const isAuthorized = isLocal || isValidSession(sessionToken) || validateAppKey(key) || (isFromZoho && !!(query.payment_id || query.id || query.record_id));
  if (!isAuthorized) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: false,
      error: 'UNAUTHORIZED',
      requiresLogin: true,
      message: 'Access Denied: MEP Engineering authorization key required for remote access.'
    }));
    return;
  }

  let type = query.type;
  if (!type) {
    if (query.purchaseorder_id || query.purchaseorderID || query.po_id || query.poId) type = 'purchaseorder';
    else if (query.bill_id || query.billId || query.billID) type = 'bill';
    else if (query.expense_id || query.expenseId || query.expenseID) type = 'expense';
    else type = 'vendorpayment';
  }

  const id = query.id || query.payment_id || query.paymentID || query.paymentId ||
             query.record_id || query.recordId || query.bill_payment_id ||
             query.purchaseorder_id || query.purchaseorderID || query.po_id || query.poId ||
             query.bill_id || query.billId || query.billID ||
             query.expense_id || query.expenseId || query.expenseID;
  let orgId = query.organization_id || query.organizationID || query.orgId || query.org_id || ORG_ID;
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

      const poNum = query.po_number || query.purchaseorder_number || query.po;
      const refNum = poNum ? `${p.reference_number || ''} (PO: ${poNum})`.trim() : (p.reference_number || '');

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
        referenceNumber: refNum,
        description: p.description || '',
      }));
      return;
    }

    // Purchase Order
    if (type === 'purchaseorder' || type === 'po') {
      const apiRes = await apiRequest('GET', `/purchaseorders/${id}`, null, orgId, customRefreshToken);
      if (apiRes.status >= 400) {
        throw new Error(JSON.stringify(apiRes.data));
      }
      const po = (apiRes.data && apiRes.data.purchaseorder) || {};
      const payeeName = po.vendor_name || '—';
      const amount = Number(po.total) || 0;
      const dateDigits = formatDateDigits(po.date);
      const amountInWords = numberToWords(amount);
      const amountFormatted = formatAmount(amount);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        type: 'purchaseorder',
        poId: po.purchaseorder_id,
        poNumber: po.purchaseorder_number,
        date: po.date,
        dateDigits,
        payeeName,
        amount,
        amountFormatted,
        amountInWords,
        bankName: 'Commercial Bank',
        currencySymbol: po.currency_symbol || 'Rs',
        referenceNumber: po.purchaseorder_number || po.reference_number || '',
        description: `PO #${po.purchaseorder_number || ''}`,
      }));
      return;
    }

    // Bill
    if (type === 'bill') {
      const apiRes = await apiRequest('GET', `/bills/${id}`, null, orgId, customRefreshToken);
      if (apiRes.status >= 400) {
        throw new Error(JSON.stringify(apiRes.data));
      }
      const b = (apiRes.data && apiRes.data.bill) || {};
      const payeeName = b.vendor_name || '—';
      const amount = Number(b.total) || 0;
      const dateDigits = formatDateDigits(b.date);
      const amountInWords = numberToWords(amount);
      const amountFormatted = formatAmount(amount);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        type: 'bill',
        billId: b.bill_id,
        billNumber: b.bill_number,
        date: b.date,
        dateDigits,
        payeeName,
        amount,
        amountFormatted,
        amountInWords,
        bankName: 'Commercial Bank',
        currencySymbol: b.currency_symbol || 'Rs',
        referenceNumber: b.bill_number || b.reference_number || '',
        description: `Bill #${b.bill_number || ''}`,
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

