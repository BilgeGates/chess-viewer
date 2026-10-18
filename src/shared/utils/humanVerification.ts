import { invokeProtected } from './protectedFunctions';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          execution?: 'render' | 'execute';
          appearance?: 'always' | 'execute' | 'interaction-only';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        }
      ) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

// Constants
const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
const CONTAINER_ID = 'cv-turnstile-container';
const TOKEN_TIMEOUT_MS = 60_000;

// State
let scriptPromise: Promise<void> | null = null;
let widgetId: string | null = null;
let pendingResolve: ((token: string | null) => void) | null = null;
let inFlight: Promise<boolean> | null = null;
let verifiedLocally = false;

// Helpers
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    window.onloadTurnstileCallback = () => resolve();
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Failed to load Turnstile'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

function ensureContainer(): HTMLElement {
  let el = document.getElementById(CONTAINER_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = CONTAINER_ID;
    el.style.position = 'fixed';
    el.style.bottom = '12px';
    el.style.left = '12px';
    el.style.zIndex = '2147483647';
    document.body.appendChild(el);
  }
  return el;
}

async function ensureWidget(): Promise<string> {
  await loadScript();
  if (widgetId) return widgetId;

  const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  if (!sitekey) throw new Error('Turnstile site key is not configured');

  widgetId = window.turnstile!.render(ensureContainer(), {
    sitekey,
    execution: 'execute',
    appearance: 'interaction-only',
    callback: settle,
    'error-callback': () => settle(null),
    'expired-callback': () => settle(null)
  });
  return widgetId;
}

function settle(token: string | null) {
  pendingResolve?.(token);
  pendingResolve = null;
}

function requestToken(id: string): Promise<string | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => settle(null), TOKEN_TIMEOUT_MS);
    pendingResolve = (token) => {
      clearTimeout(timer);
      resolve(token);
    };
    window.turnstile!.reset(id);
    window.turnstile!.execute(id);
  });
}

async function runVerification(): Promise<boolean> {
  try {
    const token = await requestToken(await ensureWidget());
    if (!token) return false;

    const { data, error } = await invokeProtected<{ verified: boolean }>(
      'verify-human',
      { token }
    );

    const ok = !error && data?.verified === true;
    if (ok) verifiedLocally = true;
    return ok;
  } catch {
    return false;
  }
}

// Service
export function verifyHuman(): Promise<boolean> {
  if (verifiedLocally) return Promise.resolve(true);
  inFlight ??= runVerification().finally(() => {
    inFlight = null;
  });
  return inFlight;
}
