import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

/**
 * Web-only document wrapper (Expo Router `+html`). Runs on the server during static export to shape
 * the HTML shell for every page. This is where the PWA plumbing lives: the manifest link, theme
 * colour, viewport, and the service-worker registration that makes the web build installable and
 * offline-capable (see public/manifest.json + public/sw.js). Not used on native.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="nl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta name="description" content="Zie meteen welke cocktails je kunt maken met wat je in huis hebt." />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#16130f" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Barkast" />
        <link rel="apple-touch-icon" href="/icon-192.png" />

        {/* Disable body scrolling on web so ScrollView children behave like on native. */}
        <ScrollViewStyleReset />

        {/* Register the service worker for offline + install. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
              window.addEventListener('load', function () {
                navigator.serviceWorker.register('/sw.js').catch(function () {});
              });
            }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
