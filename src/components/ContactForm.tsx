'use client';

import { useState, useEffect, useRef } from 'react';
import type { Dictionary, Locale } from '@/i18n/types';
import { contactConfig } from '@/config/contact';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface ContactFormProps {
  locale: Locale | string;
  dict: Dictionary['contactForm'];
}

type FieldName = 'name' | 'email' | 'purpose' | 'message';

export default function ContactForm({ locale, dict }: ContactFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    purpose?: string;
    message?: string;
    turnstile?: string;
  }>({});

  const [turnstileRetryKey, setTurnstileRetryKey] = useState(0);
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const clearAndResetTurnstile = () => {
    // Clear React Turnstile token before reset on every attempted request result including exceptions
    setTurnstileToken('');
    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        // ignore reset errors
      }
    }
  };

  const handleRetryTurnstile = () => {
    setErrors((prev) => ({ ...prev, turnstile: undefined }));
    setTurnstileToken('');

    if (widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current);
        return;
      } catch {
        // If reset failed, remove widget and trigger re-render
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    }

    // Trigger effect re-run to re-attempt script loading or widget rendering
    setTurnstileRetryKey((k) => k + 1);
  };

  // Turnstile client-side integration (only loaded and rendered when contact is configured)
  useEffect(() => {
    if (!contactConfig.isConfigured || !contactConfig.turnstileSiteKey) {
      return;
    }

    let isCancelled = false;
    const scriptId = 'cf-turnstile-script';

    const doRender = () => {
      if (isCancelled || !turnstileContainerRef.current || !window.turnstile || widgetIdRef.current) {
        return;
      }
      try {
        const id = window.turnstile.render(turnstileContainerRef.current, {
          sitekey: contactConfig.turnstileSiteKey!,
          action: 'contact',
          callback: (token: string) => {
            if (isCancelled) return;
            setTurnstileToken(token);
            setErrors((prev) => ({ ...prev, turnstile: undefined }));
          },
          'expired-callback': () => {
            if (isCancelled) return;
            setTurnstileToken('');
            setErrors((prev) => ({ ...prev, turnstile: dict.errors.turnstileExpired }));
          },
          'error-callback': () => {
            if (isCancelled) return;
            setTurnstileToken('');
            setErrors((prev) => ({ ...prev, turnstile: dict.errors.turnstileError }));
          },
          theme: 'auto',
        });
        widgetIdRef.current = id;
      } catch {
        if (!isCancelled) {
          queueMicrotask(() => {
            setTurnstileToken('');
            setErrors((prev) => ({ ...prev, turnstile: dict.errors.turnstileError }));
          });
        }
      }
    };

    if (window.turnstile) {
      doRender();
    } else {
      window.onloadTurnstileCallback = () => {
        if (!isCancelled) {
          doRender();
        }
      };

      const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src =
        'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        if (!isCancelled) {
          queueMicrotask(() => {
            setTurnstileToken('');
            setErrors((prev) => ({ ...prev, turnstile: dict.errors.turnstileError }));
          });
        }
      };
      document.head.appendChild(script);
    }

    return () => {
      isCancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore cleanup errors
        }
        widgetIdRef.current = null;
      }
      if (window.onloadTurnstileCallback) {
        delete window.onloadTurnstileCallback;
      }
      const s = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (s) {
        s.onerror = null;
      }
    };
  }, [
    turnstileRetryKey,
    dict.errors.turnstileError,
    dict.errors.turnstileExpired,
  ]);

  const validateField = (field: FieldName, value: string): string | undefined => {
    switch (field) {
      case 'name': {
        const trimmed = value.trim();
        if (!trimmed) return dict.errors.nameRequired;
        if (/[\r\n\x00-\x1F\x7F]/.test(value)) return dict.errors.nameRequired;
        if (trimmed.length > contactConfig.fieldLimits.name.max) return dict.errors.nameRequired;
        return undefined;
      }
      case 'email': {
        const trimmed = value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!trimmed || /[\r\n\x00-\x1F\x7F]/.test(value) || !emailRegex.test(trimmed)) {
          return dict.errors.emailInvalid;
        }
        if (trimmed.length > contactConfig.fieldLimits.email.max) {
          return dict.errors.emailInvalid;
        }
        return undefined;
      }
      case 'purpose':
        if (!value || !contactConfig.purposes.some((p) => p.id === value)) {
          return dict.errors.purposeRequired;
        }
        return undefined;
      case 'message': {
        const trimmed = value.trim();
        if (
          !trimmed ||
          trimmed.length < contactConfig.fieldLimits.message.min ||
          trimmed.length > contactConfig.fieldLimits.message.max
        ) {
          return dict.errors.messageLength;
        }
        return undefined;
      }
    }
  };

  const handleBlur = (field: FieldName) => {
    let val = '';
    if (field === 'name') val = name;
    if (field === 'email') val = email;
    if (field === 'purpose') val = purpose;
    if (field === 'message') val = message;

    const error = validateField(field, val);
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent duplicate submission via synchronous lock check before any work
    if (isSubmittingRef.current) return;

    // If contact is not configured, preserve safe disabled behavior
    if (!contactConfig.isConfigured) {
      const newErrors = {
        name: validateField('name', name),
        email: validateField('email', email),
        purpose: validateField('purpose', purpose),
        message: validateField('message', message),
      };
      setErrors(newErrors);
      return;
    }

    const nameErr = validateField('name', name);
    const emailErr = validateField('email', email);
    const purposeErr = validateField('purpose', purpose);
    const messageErr = validateField('message', message);
    const turnstileErr = !turnstileToken ? dict.errors.turnstileRequired : undefined;

    const newErrors = {
      name: nameErr,
      email: emailErr,
      purpose: purposeErr,
      message: messageErr,
      turnstile: turnstileErr,
    };
    setErrors(newErrors);

    // Focus first invalid field
    const firstInvalidField = (['name', 'email', 'purpose', 'message'] as const).find(
      (f) => newErrors[f]
    );
    if (firstInvalidField) {
      const el = document.getElementById(`contact-${firstInvalidField}`);
      if (el) el.focus();
      return;
    }

    if (turnstileErr) {
      return;
    }

    // Synchronous submission lock set BEFORE any awaits
    isSubmittingRef.current = true;
    setSubmitting(true);
    setGeneralError(null);
    setSubmitSuccess(false);

    const CLIENT_TIMEOUT_MS = 25000; // 25s bounded timeout (exceeds server 5+8+4 = 17s timeout)

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort('timeout');
    }, CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch(contactConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          purpose,
          message: message.trim(),
          locale: locale === 'vi' ? 'vi' : 'en',
          honeypot,
          turnstileToken,
        }),
        signal: controller.signal,
      });

      // Clear React Turnstile token before reset on every attempted request result including exceptions
      clearAndResetTurnstile();

      const resData = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        message?: string;
      } | null;

      if (response.ok && resData?.ok === true) {
        setSubmitSuccess(true);
        setName('');
        setEmail('');
        setPurpose('');
        setMessage('');
      } else {
        // Map fixed API error codes/status to VI/EN dictionary strings, never display raw API resData.message
        let errorMsg = dict.errors.sendFailed;
        if (response.status === 503 || resData?.error === 'needs_configuration') {
          errorMsg = dict.errors.serviceUnavailable;
        } else if (
          response.status === 403 ||
          (typeof resData?.error === 'string' && resData.error.startsWith('turnstile_'))
        ) {
          errorMsg = dict.errors.turnstileError;
        } else if (
          response.status === 502 ||
          response.status === 504 ||
          resData?.error === 'delivery_failed' ||
          resData?.error === 'delivery_timeout' ||
          resData?.error === 'turnstile_verification_failed'
        ) {
          errorMsg = dict.errors.sendFailed;
        }
        setGeneralError(errorMsg);
      }
    } catch {
      // Clear React Turnstile token before reset on exceptions as well
      clearAndResetTurnstile();

      if (controller.signal.aborted) {
        setGeneralError(dict.errors.timeout);
      } else {
        setGeneralError(dict.errors.networkError);
      }
    } finally {
      clearTimeout(timeoutId);
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  const notice = locale === 'vi' ? contactConfig.noticeVi : contactConfig.noticeEn;
  const statusLabel =
    contactConfig.status === 'ready'
      ? dict.statusReadyLabel
      : dict.statusConfigLabel;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 sm:p-8 space-y-6 shadow-sm transition-colors">
      {/* Configuration Status Notice with localized badge and data-status */}
      <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-strong)] space-y-2">
        <div className="flex items-center gap-2">
          <span
            data-status={contactConfig.status}
            className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[var(--bg-surface)] text-[var(--accent-primary)] border border-[var(--border-strong)]"
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          {notice}
        </p>
      </div>

      {/* Submission Success Banner */}
      {submitSuccess && (
        <div
          id="contact-success-banner"
          role="status"
          aria-live="polite"
          className="p-4 rounded-xl bg-[var(--accent-subtle)] border border-[var(--border-strong)] text-[var(--text-primary)] text-sm space-y-1"
        >
          <p className="font-semibold text-[var(--accent-primary)]">
            {dict.successMessage}
          </p>
        </div>
      )}

      {/* Submission Error Banner */}
      {generalError && (
        <div
          id="contact-general-error"
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-red-950/20 border border-[var(--color-error)] text-[var(--color-error)] text-sm space-y-1"
        >
          <p className="font-semibold">{generalError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Honeypot field (hidden from visual visitors and screen readers) */}
        <div className="hidden" aria-hidden="true">
          <label htmlFor="contact-honeypot">Website</label>
          <input
            id="contact-honeypot"
            type="text"
            name="honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        {/* Name Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-name"
            className="block text-xs sm:text-sm font-medium text-[var(--text-primary)]"
          >
            {dict.nameLabel} <span className="text-[var(--accent-primary)]" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-name"
            type="text"
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'contact-name-error' : undefined}
            value={name}
            maxLength={100}
            autoComplete="name"
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) {
                setErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            onBlur={() => handleBlur('name')}
            placeholder={dict.namePlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm transition-colors"
          />
          {errors.name && (
            <p id="contact-name-error" className="text-xs text-[var(--color-error)] font-medium">
              {errors.name}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-email"
            className="block text-xs sm:text-sm font-medium text-[var(--text-primary)]"
          >
            {dict.emailLabel} <span className="text-[var(--accent-primary)]" aria-hidden="true">*</span>
          </label>
          <input
            id="contact-email"
            type="email"
            required
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'contact-email-error' : undefined}
            value={email}
            maxLength={254}
            autoComplete="email"
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) {
                setErrors((prev) => ({ ...prev, email: undefined }));
              }
            }}
            onBlur={() => handleBlur('email')}
            placeholder={dict.emailPlaceholder}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm transition-colors"
          />
          {errors.email && (
            <p id="contact-email-error" className="text-xs text-[var(--color-error)] font-medium">
              {errors.email}
            </p>
          )}
        </div>

        {/* Purpose Select Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-purpose"
            className="block text-xs sm:text-sm font-medium text-[var(--text-primary)]"
          >
            {dict.purposeLabel} <span className="text-[var(--accent-primary)]" aria-hidden="true">*</span>
          </label>
          <select
            id="contact-purpose"
            required
            aria-required="true"
            aria-invalid={!!errors.purpose}
            aria-describedby={errors.purpose ? 'contact-purpose-error' : undefined}
            value={purpose}
            autoComplete="off"
            onChange={(e) => {
              setPurpose(e.target.value);
              if (errors.purpose) {
                setErrors((prev) => ({ ...prev, purpose: undefined }));
              }
            }}
            onBlur={() => handleBlur('purpose')}
            className="w-full min-h-[44px] px-3.5 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm transition-colors cursor-pointer"
          >
            <option value="" disabled>
              {dict.purposePlaceholder}
            </option>
            {contactConfig.purposes.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                {locale === 'vi' ? p.labelVi : p.labelEn}
              </option>
            ))}
          </select>
          {errors.purpose && (
            <p id="contact-purpose-error" className="text-xs text-[var(--color-error)] font-medium">
              {errors.purpose}
            </p>
          )}
        </div>

        {/* Message Field */}
        <div className="space-y-1.5">
          <label
            htmlFor="contact-message"
            className="block text-xs sm:text-sm font-medium text-[var(--text-primary)]"
          >
            {dict.messageLabel} <span className="text-[var(--accent-primary)]" aria-hidden="true">*</span>
          </label>
          <textarea
            id="contact-message"
            rows={4}
            required
            aria-required="true"
            aria-invalid={!!errors.message}
            aria-describedby={errors.message ? 'contact-message-error' : undefined}
            value={message}
            maxLength={contactConfig.fieldLimits.message.max}
            onChange={(e) => {
              setMessage(e.target.value);
              if (errors.message) {
                setErrors((prev) => ({ ...prev, message: undefined }));
              }
            }}
            onBlur={() => handleBlur('message')}
            placeholder={dict.messagePlaceholder}
            className="w-full min-h-[100px] px-3.5 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] text-sm transition-colors resize-y"
          />
          {errors.message && (
            <p id="contact-message-error" className="text-xs text-[var(--color-error)] font-medium">
              {errors.message}
            </p>
          )}
        </div>

        {/* Cloudflare Turnstile explicit widget container (rendered only when configured) */}
        {contactConfig.isConfigured && (
          <div className="space-y-1.5 pt-1">
            <div
              id="cf-turnstile-container"
              ref={turnstileContainerRef}
              className="min-h-[65px] flex items-center justify-start"
            />
            {errors.turnstile && (
              <div id="contact-turnstile-feedback" className="flex items-center justify-between gap-2">
                <p id="contact-turnstile-error" role="alert" className="text-xs text-[var(--color-error)] font-medium">
                  {errors.turnstile}
                </p>
                <button
                  id="contact-turnstile-retry"
                  type="button"
                  onClick={handleRetryTurnstile}
                  className="text-xs text-[var(--accent-primary)] hover:underline focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded px-1.5 py-0.5 font-medium cursor-pointer"
                >
                  {dict.retryTurnstile}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 space-y-3">
          {contactConfig.isConfigured ? (
            <button
              type="submit"
              disabled={submitting}
              aria-disabled={submitting}
              className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[var(--accent-primary)] text-[var(--bg-primary)] font-semibold text-sm hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all cursor-pointer"
            >
              {submitting ? dict.submittingButton : dict.submitButton}
            </button>
          ) : (
            <>
              <button
                type="submit"
                disabled={true}
                aria-disabled={true}
                className="w-full min-h-[48px] px-6 py-3 rounded-lg bg-[var(--bg-subtle)] text-[var(--text-muted)] font-semibold text-sm border border-[var(--border-subtle)] cursor-not-allowed opacity-75 flex items-center justify-center transition-colors"
              >
                {dict.submitButton}
              </button>
              <p className="text-[11px] sm:text-xs text-[var(--text-muted)] text-center leading-relaxed">
                {dict.disabledNotice}
              </p>
            </>
          )}

          {/* Privacy Notice */}
          <p className="text-[11px] sm:text-xs text-[var(--text-muted)] text-center leading-relaxed">
            {dict.privacyNotice}
          </p>
        </div>
      </form>
    </div>
  );
}
