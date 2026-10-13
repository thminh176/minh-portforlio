import { handleContactRequest, onRequest } from '../functions/api/contact.ts';

// Dedicated harness output stream to keep harness logging separate from handler logs
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
};

function harnessLog(...args) {
  originalConsole.log(...args);
}

function harnessError(...args) {
  originalConsole.error(...args);
}

harnessLog('[test:contact] Starting Cloudflare Pages Function contact endpoint mock integration tests...');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (!condition) {
    harnessError(`  [FAIL] ${message}`);
    process.exit(1);
  }
  testsPassed++;
  harnessLog(`  [PASS] ${message}`);
}

// Synthetic test configuration strictly using RFC 2606 reserved .test domain
const mockEnv = {
  TURNSTILE_SECRET_KEY: 'test_turnstile_secret_key_123',
  TURNSTILE_EXPECTED_HOSTNAME: 'damthienminh.id.vn',
  TURNSTILE_EXPECTED_ACTION: 'contact',
  RESEND_API_KEY: 'test_resend_api_key_456',
  CONTACT_TO_EMAIL: 'contact@example.test',
  CONTACT_FROM_EMAIL: 'Portfolio Contact <contact@example.test>',
  TELEGRAM_BOT_TOKEN: '123456:ABC-DEF_telegram_token',
  TELEGRAM_CHAT_ID: '987654321',
};

const validPayload = {
  name: 'Test Visitor',
  email: 'visitor@example.test',
  purpose: 'collaboration',
  message: 'Hello, this is a legitimate contact message for testing purposes.',
  locale: 'en',
  turnstileToken: 'test_turnstile_response_token_valid',
};

// Helper to create Request with Uint8Array or stream
function createRequest(options = {}) {
  const method = options.method || 'POST';
  const url = options.url || 'https://damthienminh.id.vn/api/contact';
  const headers = new Headers(options.headers || {
    'content-type': 'application/json',
    'origin': 'https://damthienminh.id.vn',
    'host': 'damthienminh.id.vn',
  });

  let body = options.body;
  if (body !== undefined && typeof body !== 'string' && !(body instanceof Uint8Array)) {
    body = JSON.stringify(body);
  }

  return new Request(url, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : body,
  });
}

// =========================================================================
// Global Fail-Closed Fetch Mock Architecture
// Installed BEFORE ALL tests so zero accidental real outbound requests occur
// =========================================================================
let fetchCalls = [];
let fetchMockHandler = null;
const originalFetch = globalThis.fetch;

function failClosedFetch(url) {
  fetchCalls.push({ url: String(url), failedClosed: true });
  throw new Error(`[FAIL-CLOSED] Unexpected unmocked outbound fetch call to "${url}"! Real network requests are strictly forbidden.`);
}

// Immediately install fail-closed mock before any test execution
globalThis.fetch = async (url, options) => {
  fetchCalls.push({ url: String(url), options });
  if (typeof fetchMockHandler === 'function') {
    return fetchMockHandler(String(url), options);
  }
  return failClosedFetch(url);
};

function setupFetchMock(handler) {
  fetchCalls = [];
  fetchMockHandler = handler;
}

function resetFetchMock() {
  fetchCalls = [];
  fetchMockHandler = null; // Reverts to failClosedFetch
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
  fetchMockHandler = null;
  fetchCalls = [];
}

// =========================================================================
// Logging Spy: Intercepts console.log, info, warn, error from handler
// Excludes harness messages by keeping harness output on originalConsole
// =========================================================================
let handlerLogs = [];
let spyActive = false;

function startLogSpy() {
  handlerLogs = [];
  spyActive = true;
  console.log = (...args) => {
    if (spyActive) handlerLogs.push(args.map(String).join(' '));
  };
  console.info = (...args) => {
    if (spyActive) handlerLogs.push(args.map(String).join(' '));
  };
  console.warn = (...args) => {
    if (spyActive) handlerLogs.push(args.map(String).join(' '));
  };
  console.error = (...args) => {
    if (spyActive) handlerLogs.push(args.map(String).join(' '));
  };
}

function stopLogSpy() {
  spyActive = false;
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
}

async function runTests() {
  startLogSpy();

  try {
    // ==========================================
    // 0. Single onRequest Entrypoint Validation
    // ==========================================
    harnessLog('\n--- 0. Entrypoint Validation ---');
    assert(typeof onRequest === 'function', 'onRequest is exported as the single official entrypoint function');

    const entryGetRes = await onRequest({ request: createRequest({ method: 'GET' }), env: mockEnv });
    assert(entryGetRes.status === 405, 'onRequest entrypoint correctly rejects GET with 405');

    // ==========================================
    // 1. HTTP Method Validation
    // ==========================================
    harnessLog('\n--- 1. HTTP Method Validation ---');
    const getRes = await handleContactRequest(createRequest({ method: 'GET' }), mockEnv);
    assert(getRes.status === 405, 'GET request rejected with 405 Method Not Allowed');
    assert(getRes.headers.get('Allow') === 'POST', '405 response includes Allow: POST header');

    const putRes = await handleContactRequest(createRequest({ method: 'PUT', body: '{}' }), mockEnv);
    assert(putRes.status === 405, 'PUT request rejected with 405 Method Not Allowed');

    // ==========================================
    // 2. Exact Media Type Validation
    // ==========================================
    harnessLog('\n--- 2. Content-Type Media Type Validation ---');
    const textRes = await handleContactRequest(
      createRequest({ headers: { 'content-type': 'text/plain' }, body: 'plain text' }),
      mockEnv
    );
    assert(textRes.status === 415, 'text/plain rejected with 415 Unsupported Media Type');

    const jsonpRes = await handleContactRequest(
      createRequest({ headers: { 'content-type': 'application/jsonp' }, body: '{}' }),
      mockEnv
    );
    assert(jsonpRes.status === 415, 'application/jsonp strictly rejected with 415 Unsupported Media Type');

    const noCtRes = await handleContactRequest(
      createRequest({ headers: {}, body: '{}' }),
      mockEnv
    );
    assert(noCtRes.status === 415, 'Missing content-type rejected with 415');

    // ==========================================
    // 3. Body Size Limits (Stream 16 KiB & Multibyte Lying Content-Length)
    // ==========================================
    harnessLog('\n--- 3. Body Size Validation (Stream 16 KiB & Multibyte Lying Content-Length) ---');
    const declaredTooLarge = createRequest({
      headers: {
        'content-type': 'application/json',
        'content-length': '20000',
        'origin': 'https://damthienminh.id.vn',
      },
      body: JSON.stringify(validPayload),
    });
    const declaredRes = await handleContactRequest(declaredTooLarge, mockEnv);
    assert(declaredRes.status === 413, 'Content-Length > 16 KiB rejected with 413 Payload Too Large');

    // Actual ASCII stream over 16384 bytes
    const hugeMessage = 'A'.repeat(17000);
    const hugeBody = JSON.stringify({ ...validPayload, message: hugeMessage });
    const streamTooLarge = createRequest({ body: hugeBody });
    const streamRes = await handleContactRequest(streamTooLarge, mockEnv);
    assert(streamRes.status === 413, 'Raw stream > 16 KiB rejected with 413 Payload Too Large');

    // Multibyte payload exceeding 16 KiB even with lying Content-Length
    const multibyteMsg = 'Đàm Thiên Minh — bảo mật kiểm thử '.repeat(500); // UTF-8 multibyte
    const multibyteBody = JSON.stringify({ ...validPayload, message: multibyteMsg });
    const multibyteBytes = new TextEncoder().encode(multibyteBody);
    assert(multibyteBytes.byteLength > 16384, 'Synthetic multibyte payload byte length strictly exceeds 16 KiB limit');

    const lyingMultibyteReq = createRequest({
      headers: {
        'content-type': 'application/json',
        'content-length': '100', // Lying Content-Length header
        'origin': 'https://damthienminh.id.vn',
      },
      body: multibyteBytes,
    });
    const lyingRes = await handleContactRequest(lyingMultibyteReq, mockEnv);
    assert(lyingRes.status === 413, 'Multibyte payload > 16 KiB with lying Content-Length (100) rejected with 413');
    const lyingBody = await lyingRes.json();
    assert(lyingBody.error === 'payload_too_large', 'Lying Content-Length response returns error: payload_too_large');
    assert(fetchCalls.length === 0, 'Payload exceeding limit triggers zero downstream fetch calls');

    // ==========================================
    // 4. Malformed JSON
    // ==========================================
    harnessLog('\n--- 4. Malformed JSON Handling ---');
    const malformedRes = await handleContactRequest(
      createRequest({ body: '{ "name": "Broken' }),
      mockEnv
    );
    assert(malformedRes.status === 400, 'Malformed JSON rejected with 400 Bad Request');

    // ==========================================
    // 5. Origin Validation (Scheme + Host + Port)
    // ==========================================
    harnessLog('\n--- 5. Origin Validation (Strict Matching) ---');
    const untrustedOrigin = createRequest({
      headers: {
        'content-type': 'application/json',
        'origin': 'https://malicious-phishing.test',
        'host': 'damthienminh.id.vn',
      },
      body: validPayload,
    });
    const originRes = await handleContactRequest(untrustedOrigin, mockEnv);
    assert(originRes.status === 403, 'Untrusted cross-origin request rejected with 403 Forbidden');

    const forgedLocalhostOrigin = createRequest({
      headers: {
        'content-type': 'application/json',
        'origin': 'http://localhost:3000',
        'host': 'damthienminh.id.vn',
      },
      body: validPayload,
    });
    const forgedRes = await handleContactRequest(forgedLocalhostOrigin, mockEnv);
    assert(forgedRes.status === 403, 'Forged localhost origin against production URL rejected with 403');

    // ==========================================
    // 6. Honeypot Rejection (No Delivery Claim)
    // ==========================================
    harnessLog('\n--- 6. Honeypot Rejection (Zero Fake Success) ---');
    let honeypotDownstreamCalled = false;
    setupFetchMock(() => {
      honeypotDownstreamCalled = true;
      return new Response(JSON.stringify({ ok: true }));
    });

    const honeypotReq = createRequest({
      body: { ...validPayload, honeypot: 'spam bot filled this' },
    });
    const honeypotRes = await handleContactRequest(honeypotReq, mockEnv);
    assert(honeypotRes.status === 400, 'Honeypot submission is rejected with 400 Bad Request');
    const honeypotBody = await honeypotRes.json();
    assert(honeypotBody.error === 'invalid_submission', 'Honeypot returns error: invalid_submission');
    assert(honeypotBody.ok !== true, 'Honeypot NEVER claims ok: true or message received');
    assert(!honeypotDownstreamCalled, 'Honeypot submission never triggered downstream verification or email calls');
    resetFetchMock();

    // ==========================================
    // 7. Field Validations & Raw Character Injection
    // ==========================================
    harnessLog('\n--- 7. Field Length & Raw Character Injection Validation ---');
    // Name missing / empty
    const noNameRes = await handleContactRequest(createRequest({ body: { ...validPayload, name: '   ' } }), mockEnv);
    assert(noNameRes.status === 400, 'Empty name rejected with 400');

    // Name control characters
    const controlNameRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, name: 'Attacker\x00Name' } }),
      mockEnv
    );
    assert(controlNameRes.status === 400, 'Name with null byte control character rejected with 400');

    // Name CRLF before trim
    const crlfNameRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, name: 'Name\r\nInjected' } }),
      mockEnv
    );
    assert(crlfNameRes.status === 400, 'Name with CR/LF rejected with 400');

    // Name > 100 chars
    const longNameRes = await handleContactRequest(createRequest({ body: { ...validPayload, name: 'N'.repeat(101) } }), mockEnv);
    assert(longNameRes.status === 400, 'Name > 100 chars rejected with 400');

    // Email invalid format
    const badEmailRes = await handleContactRequest(createRequest({ body: { ...validPayload, email: 'not-an-email' } }), mockEnv);
    assert(badEmailRes.status === 400, 'Malformed email rejected with 400');

    // Email Header Injection Rejection (CR/LF before trim)
    const crlfEmailRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, email: 'attacker@example.test\r\nBcc: victim@example.test' } }),
      mockEnv
    );
    assert(crlfEmailRes.status === 400, 'Email with CR/LF header injection attempt rejected with 400');

    // Email control characters
    const controlEmailRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, email: 'attacker\x07@example.test' } }),
      mockEnv
    );
    assert(controlEmailRes.status === 400, 'Email with control character rejected with 400');

    // Purpose allowlist enforcement
    const badPurposeRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, purpose: 'unauthorized_purpose' } }),
      mockEnv
    );
    assert(badPurposeRes.status === 400, 'Purpose not in allowlist rejected with 400');

    // Message too short (< 10 chars)
    const shortMsgRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, message: 'Too short' } }),
      mockEnv
    );
    assert(shortMsgRes.status === 400, 'Message < 10 chars rejected with 400');

    // Missing Turnstile token
    const noTokenRes = await handleContactRequest(
      createRequest({ body: { ...validPayload, turnstileToken: '' } }),
      mockEnv
    );
    assert(noTokenRes.status === 400, 'Missing Turnstile token rejected with 400');

    // ==========================================
    // 8. Strict Locale Validation (vi | en)
    // ==========================================
    harnessLog('\n--- 8. Strict Locale Validation (vi | en) ---');
    const invalidLocaleReq1 = createRequest({ body: { ...validPayload, locale: 'fr' } });
    const invLocaleRes1 = await handleContactRequest(invalidLocaleReq1, mockEnv);
    assert(invLocaleRes1.status === 400, 'Unsupported locale "fr" rejected with 400 Bad Request');
    const invLocaleBody1 = await invLocaleRes1.json();
    assert(invLocaleBody1.error === 'invalid_locale', 'Error code is invalid_locale');

    const invalidLocaleReq2 = createRequest({ body: { ...validPayload, locale: '' } });
    const invLocaleRes2 = await handleContactRequest(invalidLocaleReq2, mockEnv);
    assert(invLocaleRes2.status === 400, 'Empty string locale rejected with 400 Bad Request');

    const invalidLocaleReq3 = createRequest({ body: { ...validPayload, locale: 123 } });
    const invLocaleRes3 = await handleContactRequest(invalidLocaleReq3, mockEnv);
    assert(invLocaleRes3.status === 400, 'Numeric locale rejected with 400 Bad Request');

    const invalidLocaleReq4 = createRequest({ body: { ...validPayload, locale: undefined } });
    const invLocaleRes4 = await handleContactRequest(invalidLocaleReq4, mockEnv);
    assert(invLocaleRes4.status === 400, 'Missing/undefined locale rejected with 400 (no silent coercion)');

    // ==========================================
    // 9. Mandatory Server Configuration Gate (All 6 Required Bindings)
    // ==========================================
    harnessLog('\n--- 9. Unconfigured / Whitespace Backend Fails Closed (503) ---');
    const requiredBindings = [
      'TURNSTILE_SECRET_KEY',
      'TURNSTILE_EXPECTED_HOSTNAME',
      'TURNSTILE_EXPECTED_ACTION',
      'RESEND_API_KEY',
      'CONTACT_TO_EMAIL',
      'CONTACT_FROM_EMAIL',
    ];

    for (const binding of requiredBindings) {
      // Test missing / undefined binding
      const missingEnv = { ...mockEnv, [binding]: undefined };
      const missingRes = await handleContactRequest(createRequest({ body: validPayload }), missingEnv);
      assert(missingRes.status === 503, `Missing ${binding} fails closed with 503 Service Unavailable`);
      const missingBody = await missingRes.json();
      assert(missingBody.error === 'needs_configuration', `Missing ${binding} returns error: needs_configuration`);
      assert(fetchCalls.length === 0, `Missing ${binding} triggers zero downstream fetch calls`);

      // Test whitespace-only string binding
      const whitespaceEnv = { ...mockEnv, [binding]: '   \t  \n  ' };
      const wsRes = await handleContactRequest(createRequest({ body: validPayload }), whitespaceEnv);
      assert(wsRes.status === 503, `Whitespace ${binding} fails closed with 503 Service Unavailable`);
      const wsBody = await wsRes.json();
      assert(wsBody.error === 'needs_configuration', `Whitespace ${binding} returns error: needs_configuration`);
      assert(fetchCalls.length === 0, `Whitespace ${binding} triggers zero downstream fetch calls`);
    }

    // ==========================================
    // 10. Turnstile Siteverify Response Scenarios
    // ==========================================
    harnessLog('\n--- 10. Turnstile Siteverify Response Scenarios ---');
    // Siteverify rejects token (success: false)
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const turnstileFailRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(turnstileFailRes.status === 403, 'Turnstile success: false returns 403 Forbidden');
    const turnstileFailBody = await turnstileFailRes.json();
    assert(turnstileFailBody.error === 'turnstile_rejected', 'Turnstile error is turnstile_rejected');
    resetFetchMock();

    // String success ("true" instead of boolean true)
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: 'true', hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const stringSuccessRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(stringSuccessRes.status === 403, 'Turnstile string success ("true") strictly rejected with 403');
    const stringSuccessBody = await stringSuccessRes.json();
    assert(stringSuccessBody.error === 'turnstile_rejected', 'String success error is turnstile_rejected');
    resetFetchMock();

    // Null success (success: null)
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: null, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const nullSuccessRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(nullSuccessRes.status === 403, 'Turnstile null success strictly rejected with 403');
    const nullSuccessBody = await nullSuccessRes.json();
    assert(nullSuccessBody.error === 'turnstile_rejected', 'Null success error is turnstile_rejected');
    resetFetchMock();

    // Malformed JSON response body
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response('THIS IS NOT JSON', { status: 200, headers: { 'content-type': 'text/plain' } });
      }
      return failClosedFetch(url);
    });
    const malformedCaptchaRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(malformedCaptchaRes.status === 403, 'Malformed captcha JSON response safely rejected with 403');
    const malformedCaptchaBody = await malformedCaptchaRes.json();
    assert(malformedCaptchaBody.error === 'turnstile_rejected', 'Malformed captcha error is turnstile_rejected');
    resetFetchMock();

    // Hostname mismatch
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: 'phishing-domain.test', action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const wrongHostRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(wrongHostRes.status === 403, 'Turnstile hostname mismatch returns 403');
    const wrongHostBody = await wrongHostRes.json();
    assert(wrongHostBody.error === 'turnstile_hostname_mismatch', 'Error is turnstile_hostname_mismatch');
    resetFetchMock();

    // Action mismatch
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: 'login' }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const wrongActionRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(wrongActionRes.status === 403, 'Turnstile action mismatch returns 403');
    const wrongActionBody = await wrongActionRes.json();
    assert(wrongActionBody.error === 'turnstile_action_mismatch', 'Error is turnstile_action_mismatch');
    resetFetchMock();

    // Siteverify service down (HTTP 500)
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response('Internal Server Error', { status: 500 });
      }
      return failClosedFetch(url);
    });
    const siteverify500Res = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(siteverify500Res.status === 502, 'Turnstile service HTTP 500 returns 502 Bad Gateway');
    resetFetchMock();

    // ==========================================
    // 11. Provider Throw / Reject Scenarios
    // ==========================================
    harnessLog('\n--- 11. Provider Throw / Reject Handling ---');
    // Turnstile fetch throws / rejects
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return Promise.reject(new Error('Network connection dropped while calling Turnstile'));
      }
      return failClosedFetch(url);
    });
    const turnstileThrowRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(turnstileThrowRes.status === 504, 'Turnstile network throw/reject returns 504 Gateway Timeout');
    const turnstileThrowBody = await turnstileThrowRes.json();
    assert(turnstileThrowBody.error === 'turnstile_timeout', 'Error is turnstile_timeout');
    resetFetchMock();

    // Resend email fetch throws / rejects
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        return Promise.reject(new Error('Connection reset by peer calling Resend'));
      }
      return failClosedFetch(url);
    });
    const emailThrowRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(emailThrowRes.status === 504, 'Email provider network throw/reject returns 504 Gateway Timeout');
    const emailThrowBody = await emailThrowRes.json();
    assert(emailThrowBody.error === 'delivery_timeout', 'Error is delivery_timeout');
    resetFetchMock();

    // Telegram fetch throws / rejects
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        return new Response(JSON.stringify({ id: 'resend_email_id_throw_test' }), { status: 200 });
      }
      if (url.includes('api.telegram.org')) {
        return Promise.reject(new Error('Telegram service DNS failure'));
      }
      return failClosedFetch(url);
    });
    const tgThrowRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(tgThrowRes.status === 200, 'Telegram network throw does not fail request (email accepted)');
    const tgThrowBody = await tgThrowRes.json();
    assert(tgThrowBody.ok === true, 'Response remains ok: true');
    resetFetchMock();

    // ==========================================
    // 12. Email Provider Delivery Failure & Validation
    // ==========================================
    harnessLog('\n--- 12. Email Provider Delivery Failure & Validation ---');
    // Provider HTTP 500
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
      }
      return failClosedFetch(url);
    });
    const emailFailRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(emailFailRes.status === 502, 'Email provider HTTP 500 returns 502 Bad Gateway');
    resetFetchMock();

    // Provider returns HTTP 200 but MALFORMED / EMPTY BODY without accepted ID
    setupFetchMock((url) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        return new Response('{}', { status: 200 }); // Missing id
      }
      return failClosedFetch(url);
    });
    const malformedAcceptRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(malformedAcceptRes.status === 502, 'Email provider HTTP 200 without accepted ID returns 502 Bad Gateway');
    resetFetchMock();

    // ==========================================
    // 13. Successful Delivery (End-to-End Mock with English & Vietnamese)
    // ==========================================
    harnessLog('\n--- 13. Successful Delivery (End-to-End Mock) ---');
    let emailSentPayload = null;
    let telegramSentPayload = null;

    setupFetchMock((url, options) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        emailSentPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ id: 'resend_email_id_789' }), { status: 200 });
      }
      if (url.includes('api.telegram.org')) {
        telegramSentPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return failClosedFetch(url);
    });

    const payloadWithHtml = {
      ...validPayload,
      name: 'Test <Visitor>',
      message: 'Hello <b>world</b> & <script>alert(1)</script> testing message.',
    };
    const successRes = await handleContactRequest(createRequest({ body: payloadWithHtml }), mockEnv);
    assert(successRes.status === 200, 'Valid English submission returns 200 OK');
    const successBody = await successRes.json();
    assert(successBody.ok === true, 'Response body has ok: true');
    assert(successBody.message === 'Your message has been sent successfully.', 'English submission returns English message');

    // Verify email payload properties
    assert(emailSentPayload !== null, 'Resend API was called with email payload');
    assert(emailSentPayload.to.includes(mockEnv.CONTACT_TO_EMAIL), 'Email recipient matches CONTACT_TO_EMAIL');
    assert(emailSentPayload.from === mockEnv.CONTACT_FROM_EMAIL, 'Email sender strictly matches configured CONTACT_FROM_EMAIL');
    assert(emailSentPayload.reply_to === validPayload.email, 'Email reply_to matches sender email');
    assert(emailSentPayload.html.includes('&lt;script&gt;'), 'Email HTML properly escapes dangerous script tags to &lt;script&gt;');
    assert(!emailSentPayload.html.includes('<script>'), 'Email HTML never contains raw unescaped script tags');
    assert(emailSentPayload.html.includes('Test &lt;Visitor&gt;'), 'Email HTML properly escapes name entities');
    resetFetchMock();

    // Successful Vietnamese submission
    setupFetchMock((url, options) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        emailSentPayload = JSON.parse(options.body);
        return new Response(JSON.stringify({ id: 'resend_email_id_vi' }), { status: 200 });
      }
      if (url.includes('api.telegram.org')) {
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return failClosedFetch(url);
    });
    const viPayload = { ...validPayload, locale: 'vi' };
    const viRes = await handleContactRequest(createRequest({ body: viPayload }), mockEnv);
    assert(viRes.status === 200, 'Valid Vietnamese submission returns 200 OK');
    const viBody = await viRes.json();
    assert(viBody.ok === true, 'Vietnamese response body has ok: true');
    assert(viBody.message === 'Tin nhắn của bạn đã được gửi thành công.', 'Vietnamese submission returns Vietnamese message');
    assert(emailSentPayload.html.includes('<td>vi</td>'), 'Email payload contains vi locale');
    resetFetchMock();

    // ==========================================
    // 14. Telegram Failure Resilience & Constant Generic Non-PII Notification
    // ==========================================
    harnessLog('\n--- 14. Telegram Failure Resilience & Constant Generic Non-PII ---');
    let resendCallCount = 0;
    setupFetchMock((url, options) => {
      if (url.includes('siteverify')) {
        return new Response(JSON.stringify({ success: true, hostname: mockEnv.TURNSTILE_EXPECTED_HOSTNAME, action: mockEnv.TURNSTILE_EXPECTED_ACTION }), { status: 200 });
      }
      if (url.includes('api.resend.com')) {
        resendCallCount++;
        return new Response(JSON.stringify({ id: 'resend_email_id_abc' }), { status: 200 });
      }
      if (url.includes('api.telegram.org')) {
        telegramSentPayload = JSON.parse(options.body);
        return new Response('Telegram Service Unavailable', { status: 503 });
      }
      return failClosedFetch(url);
    });

    const tgFailRes = await handleContactRequest(createRequest({ body: validPayload }), mockEnv);
    assert(tgFailRes.status === 200, 'Telegram failure does not fail the request (email delivery accepted)');
    assert(resendCallCount === 1, 'Telegram failure does not trigger duplicate email send (exactly 1 Resend call)');
    assert(telegramSentPayload !== null, 'Telegram was called for notification');

    const tgText = telegramSentPayload.text;
    assert(!tgText.includes(validPayload.name), 'Telegram notification strictly omits visitor name');
    assert(!tgText.includes(validPayload.email), 'Telegram notification strictly omits visitor email');
    assert(!tgText.includes(validPayload.message), 'Telegram notification strictly omits message content');
    assert(!tgText.includes(validPayload.purpose), 'Telegram notification strictly omits purpose');
    assert(!/\ben\b/i.test(tgText), 'Telegram notification strictly omits locale');
    assert(tgText === 'Portfolio: Co lien he moi (New contact inquiry received).', 'Telegram notification matches exact constant generic alert text');
    resetFetchMock();

    // ==========================================
    // 15. Zero Secret & PII Logging Audit
    // ==========================================
    harnessLog('\n--- 15. Zero Secret & PII Logging Audit ---');
    const secretKeywords = [
      mockEnv.TURNSTILE_SECRET_KEY,
      mockEnv.RESEND_API_KEY,
      mockEnv.TELEGRAM_BOT_TOKEN,
      validPayload.name,
      validPayload.email,
      validPayload.message,
      validPayload.turnstileToken,
    ];

    for (const msg of handlerLogs) {
      for (const secret of secretKeywords) {
        if (msg.includes(secret)) {
          harnessError(`[test:contact] FAIL: Secret, token, or visitor PII leaked in handler logs: "${secret}"`);
          process.exit(1);
        }
      }
    }
    assert(true, 'Zero secrets, credentials, tokens, or visitor PII leaked in console logs during all test cases');

  } finally {
    stopLogSpy();
    restoreFetch();
  }

  harnessLog(`\n[test:contact] ALL TESTS PASSED (${testsPassed}/${testsTotal} assertions verified).`);
}

runTests().catch((err) => {
  stopLogSpy();
  restoreFetch();
  harnessError('[test:contact] Unexpected failure:', err);
  process.exit(1);
});
