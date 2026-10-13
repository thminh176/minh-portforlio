/**
 * Cloudflare Pages Function: /api/contact
 * Handles contact inquiry submissions with multi-layer security:
 * - Single onRequest entrypoint
 * - Strict Method enforcement (POST only)
 * - Exact Content-Type enforcement (media type must be exact application/json)
 * - Raw stream body size limit (maximum 16 KiB measured during stream consumption)
 * - Strict same-origin verification (full scheme + host + port matching)
 * - Raw character validation before trim (rejection of CR, LF, and control chars in name/email)
 * - Purpose allowlist enforcement
 * - Honeypot rejection (generic rejected response, no delivery claim)
 * - Mandatory server configuration (fails closed with 503 needs_configuration)
 * - Server-side Cloudflare Turnstile Siteverify (requires success===true and expected hostname/action)
 * - Fixed-URL HTTPS email delivery (Resend API) requiring parsed non-empty message ID
 * - Constant generic non-PII Telegram notification (failure never undoes accepted email delivery)
 * - Zero PII and zero credentials in logs
 */

export interface ContactEnv {
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_EXPECTED_HOSTNAME?: string;
  TURNSTILE_EXPECTED_ACTION?: string;
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
}

export interface PagesContext<Env = ContactEnv> {
  request: Request;
  env: Env;
  params?: Record<string, string | string[]>;
  waitUntil?: (promise: Promise<unknown>) => void;
  next?: (input?: Request | string, init?: RequestInit) => Promise<Response>;
  data?: Record<string, unknown>;
}

const MAX_BODY_BYTES = 16 * 1024; // 16 KiB = 16384 bytes
const ALLOWED_PURPOSES = ['freelance', 'job_opportunity', 'collaboration', 'other'] as const;
type Purpose = typeof ALLOWED_PURPOSES[number];

function jsonResponse(data: Record<string, unknown>, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function handleContactRequest(request: Request, env: ContactEnv): Promise<Response> {
  // 1. HTTP Method validation
  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'method_not_allowed', message: 'Only POST method is allowed' },
      405,
      { Allow: 'POST' }
    );
  }

  // 2. Exact Content-Type media-type validation
  const rawContentType = request.headers.get('content-type') || '';
  const mediaType = rawContentType.split(';')[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    return jsonResponse(
      { error: 'unsupported_media_type', message: 'Content-Type must be application/json' },
      415
    );
  }

  // 3. Early Content-Length header check
  const contentLengthHeader = request.headers.get('content-length');
  if (contentLengthHeader) {
    const declaredLength = parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return jsonResponse(
        { error: 'payload_too_large', message: 'Request payload exceeds 16 KiB limit' },
        413
      );
    }
  }

  // 4. Stream consumption with strictly measured byte limit
  if (!request.body) {
    return jsonResponse({ error: 'bad_request', message: 'Missing request body' }, 400);
  }

  let rawText = '';
  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        totalBytes += value.byteLength;
        if (totalBytes > MAX_BODY_BYTES) {
          await reader.cancel();
          return jsonResponse(
            { error: 'payload_too_large', message: 'Request payload exceeds 16 KiB limit' },
            413
          );
        }
        chunks.push(value);
      }
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    rawText = new TextDecoder('utf-8', { fatal: true }).decode(merged);
  } catch {
    return jsonResponse({ error: 'bad_request', message: 'Failed to read request body stream' }, 400);
  }

  // 5. JSON parsing
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawText);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ error: 'bad_request', message: 'JSON payload must be an object' }, 400);
    }
  } catch {
    return jsonResponse({ error: 'bad_request', message: 'Malformed JSON payload' }, 400);
  }

  // 6. Strict same-origin verification (scheme + host + port)
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    try {
      const requestOrigin = new URL(request.url).origin;
      const clientOrigin = new URL(originHeader).origin;
      if (clientOrigin !== requestOrigin) {
        return jsonResponse({ error: 'forbidden_origin', message: 'Cross-origin submission rejected' }, 403);
      }
    } catch {
      return jsonResponse({ error: 'forbidden_origin', message: 'Invalid origin header' }, 403);
    }
  }

  // 7. Honeypot check: generic rejected response, never a claim of delivery
  const honeypot = body.honeypot;
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    return jsonResponse({ error: 'invalid_submission', message: 'Submission rejected' }, 400);
  }

  // 8. Raw validation before trim: Control characters & CRLF injection check
  // 8a. Name: must be string, no CR/LF/control characters
  if (typeof body.name !== 'string' || /[\r\n\x00-\x1F\x7F]/.test(body.name)) {
    return jsonResponse({ error: 'invalid_name', message: 'Name contains invalid control characters' }, 400);
  }
  const name = body.name.trim();
  if (name.length < 1 || name.length > 100) {
    return jsonResponse({ error: 'invalid_name', message: 'Name must be between 1 and 100 characters' }, 400);
  }

  // 8b. Email: must be string, no CR/LF/control characters
  if (typeof body.email !== 'string' || /[\r\n\x00-\x1F\x7F]/.test(body.email)) {
    return jsonResponse({ error: 'invalid_email', message: 'Email contains invalid control characters' }, 400);
  }
  const email = body.email.trim();
  if (email.length === 0 || email.length > 254) {
    return jsonResponse({ error: 'invalid_email', message: 'Invalid email address length' }, 400);
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return jsonResponse({ error: 'invalid_email', message: 'Invalid email address format' }, 400);
  }

  // 8c. Purpose: strictly allowlisted
  const purpose = body.purpose as Purpose;
  if (!ALLOWED_PURPOSES.includes(purpose)) {
    return jsonResponse(
      { error: 'invalid_purpose', message: 'Inquiry purpose must be one of: freelance, job_opportunity, collaboration, other' },
      400
    );
  }

  // 8d. Message: 10 - 5000 characters
  if (typeof body.message !== 'string') {
    return jsonResponse({ error: 'invalid_message', message: 'Message must be a string' }, 400);
  }
  const message = body.message.trim();
  if (message.length < 10 || message.length > 5000) {
    return jsonResponse({ error: 'invalid_message', message: 'Message must be between 10 and 5000 characters' }, 400);
  }

  // 8e. Locale: strict vi | en validation (never silently coerce invalid input)
  if (body.locale !== 'vi' && body.locale !== 'en') {
    return jsonResponse(
      { error: 'invalid_locale', message: 'Locale must be either "vi" or "en"' },
      400
    );
  }
  const locale = body.locale;

  // 8f. Turnstile token: max 2048 chars, required
  const rawToken = body.turnstileToken || body['cf-turnstile-response'];
  if (typeof rawToken !== 'string') {
    return jsonResponse({ error: 'invalid_turnstile', message: 'Missing Turnstile verification token' }, 400);
  }
  const turnstileToken = rawToken.trim();
  if (turnstileToken.length === 0 || turnstileToken.length > 2048) {
    return jsonResponse({ error: 'invalid_turnstile', message: 'Valid Turnstile verification token is required' }, 400);
  }

  // 9. Mandatory Server configuration check (fails closed without network calls)
  // Requires non-empty trimmed TURNSTILE_SECRET_KEY, TURNSTILE_EXPECTED_HOSTNAME, TURNSTILE_EXPECTED_ACTION,
  // RESEND_API_KEY, CONTACT_TO_EMAIL, and CONTACT_FROM_EMAIL.
  const turnstileSecret = typeof env.TURNSTILE_SECRET_KEY === 'string' ? env.TURNSTILE_SECRET_KEY.trim() : '';
  const expectedHostname = typeof env.TURNSTILE_EXPECTED_HOSTNAME === 'string' ? env.TURNSTILE_EXPECTED_HOSTNAME.trim() : '';
  const expectedAction = typeof env.TURNSTILE_EXPECTED_ACTION === 'string' ? env.TURNSTILE_EXPECTED_ACTION.trim() : '';
  const resendApiKey = typeof env.RESEND_API_KEY === 'string' ? env.RESEND_API_KEY.trim() : '';
  const toEmail = typeof env.CONTACT_TO_EMAIL === 'string' ? env.CONTACT_TO_EMAIL.trim() : '';
  const fromEmail = typeof env.CONTACT_FROM_EMAIL === 'string' ? env.CONTACT_FROM_EMAIL.trim() : '';

  const isConfigured = Boolean(
    turnstileSecret &&
    expectedHostname &&
    expectedAction &&
    resendApiKey &&
    toEmail &&
    fromEmail
  );

  if (!isConfigured) {
    return jsonResponse(
      {
        error: 'needs_configuration',
        message: 'The contact submission service is not currently configured for live delivery.',
      },
      503
    );
  }

  // 10. Server-side Cloudflare Turnstile Siteverify
  try {
    const siteverifyParams = new URLSearchParams();
    siteverifyParams.append('secret', turnstileSecret);
    siteverifyParams.append('response', turnstileToken);

    const clientIp = request.headers.get('CF-Connecting-IP');
    if (clientIp) {
      siteverifyParams.append('remoteip', clientIp);
    }

    const siteverifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: siteverifyParams.toString(),
      signal: AbortSignal.timeout(5000),
    });

    if (!siteverifyRes.ok) {
      return jsonResponse(
        { error: 'turnstile_verification_failed', message: 'Captcha verification service error' },
        502
      );
    }

    const siteverifyData = (await siteverifyRes.json().catch(() => null)) as {
      success?: unknown;
      hostname?: unknown;
      action?: unknown;
    } | null;

    if (!siteverifyData || typeof siteverifyData !== 'object' || Array.isArray(siteverifyData) || siteverifyData.success !== true) {
      return jsonResponse(
        { error: 'turnstile_rejected', message: 'Turnstile verification challenge failed' },
        403
      );
    }

    // Verify exact expected hostname
    if (siteverifyData.hostname !== expectedHostname) {
      return jsonResponse(
        { error: 'turnstile_hostname_mismatch', message: 'Turnstile verification hostname mismatch' },
        403
      );
    }

    // Verify exact expected action
    if (siteverifyData.action !== expectedAction) {
      return jsonResponse(
        { error: 'turnstile_action_mismatch', message: 'Turnstile verification action mismatch' },
        403
      );
    }
  } catch {
    return jsonResponse(
      { error: 'turnstile_timeout', message: 'Turnstile verification service timed out' },
      504
    );
  }

  // 11. HTTPS Email Delivery via Resend API
  const emailSubject = `[Portfolio Contact] New inquiry: ${purpose}`;

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px;">
  <h2 style="color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">New Contact Inquiry — damthienminh.id.vn</h2>
  <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
    <tr><td style="padding: 6px 0; font-weight: bold; width: 120px;">Name:</td><td>${escapeHtml(name)}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Email:</td><td>${escapeHtml(email)}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Purpose:</td><td>${escapeHtml(purpose)}</td></tr>
    <tr><td style="padding: 6px 0; font-weight: bold;">Locale:</td><td>${escapeHtml(locale)}</td></tr>
  </table>
  <h3 style="margin-top: 24px; color: #0f172a;">Message:</h3>
  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; white-space: pre-wrap; font-family: inherit;">
${escapeHtml(message)}
  </div>
</body>
</html>
  `.trim();

  const emailText = `
New Contact Inquiry — damthienminh.id.vn
---------------------------------------
Name: ${name}
Email: ${email}
Purpose: ${purpose}
Locale: ${locale}

Message:
${message}
  `.trim();

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: emailSubject,
        html: emailHtml,
        text: emailText,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resendRes.ok) {
      return jsonResponse(
        { error: 'delivery_failed', message: 'Failed to deliver message through email service' },
        502
      );
    }

    const resendData = (await resendRes.json().catch(() => null)) as { id?: unknown } | null;
    const resendId = resendData?.id;
    if (typeof resendId !== 'string' || resendId.trim().length === 0) {
      return jsonResponse(
        { error: 'delivery_failed', message: 'Email provider did not return an accepted message ID' },
        502
      );
    }
  } catch {
    return jsonResponse(
      { error: 'delivery_timeout', message: 'Email delivery service timed out' },
      504
    );
  }

  // 12. Constant Generic Non-PII Telegram Notification (Optional)
  // CRITICAL: Telegram failure must NEVER undo email acceptance or trigger duplicate sends!
  // CRITICAL: Text is strictly constant generic text with zero visitor data or PII!
  const telegramBotToken = typeof env.TELEGRAM_BOT_TOKEN === 'string' ? env.TELEGRAM_BOT_TOKEN.trim() : '';
  const telegramChatId = typeof env.TELEGRAM_CHAT_ID === 'string' ? env.TELEGRAM_CHAT_ID.trim() : '';
  if (telegramBotToken && telegramChatId) {
    try {
      const genericTelegramText = 'Portfolio: Co lien he moi (New contact inquiry received).';
      const tgRes = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: genericTelegramText,
        }),
        signal: AbortSignal.timeout(4000),
      });

      if (!tgRes.ok) {
        // Log fixed status only, zero URL, zero token, zero body, zero PII
        console.warn('[contact] Secondary notification dispatch failed with HTTP status:', tgRes.status);
      } else {
        const tgData = (await tgRes.json().catch(() => null)) as { ok?: boolean } | null;
        if (!tgData || tgData.ok !== true) {
          console.warn('[contact] Secondary notification API reported non-ok response.');
        }
      }
    } catch {
      console.warn('[contact] Secondary notification dispatch encountered network error.');
    }
  }

  // 13. Successful response
  return jsonResponse(
    {
      ok: true,
      message: locale === 'vi'
        ? 'Tin nhắn của bạn đã được gửi thành công.'
        : 'Your message has been sent successfully.',
    },
    200
  );
}

// Single Cloudflare Pages Function entrypoint
export const onRequest = async (context: PagesContext): Promise<Response> => {
  return handleContactRequest(context.request, context.env);
};
