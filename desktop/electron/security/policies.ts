/**
 * Security Policies
 *
 * Content Security Policy, permission management, session security.
 */

import { session, app } from 'electron';

export function setupSecurity(): void {
  // CSP
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:* https://api.* wss://*",
        ],
        'X-Content-Type-Options': ['nosniff'],
        'X-Frame-Options': ['DENY'],
        'X-XSS-Protection': ['0'],
        'Referrer-Policy': ['strict-origin-when-cross-origin'],
      },
    });
  });

  // Block new window creation — open in browser instead
  app.on('web-contents-created', (_, contents) => {
    contents.on('will-navigate', (event, url) => {
      const allowed = ['localhost', '127.0.0.1'];
      try {
        const parsed = new URL(url);
        if (!allowed.includes(parsed.hostname) && parsed.protocol !== 'file:') {
          event.preventDefault();
        }
      } catch {
        event.preventDefault();
      }
    });

    // Prevent attaching webview
    contents.on('will-attach-webview', (event) => {
      event.preventDefault();
    });
  });

  // Permission handler
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  session.defaultSession.setPermissionCheckHandler(() => false);
}
