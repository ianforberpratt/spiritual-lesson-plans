#!/bin/sh
# Static privacy check for /dimmer. The page promises nothing tapped or typed is saved or sent.
# Code search, not proof: pair it with scripts/test-dimmer.js (real browser).
#   sh scripts/check-dimmer-privacy.sh
cd "$(dirname "$0")/.." || exit 2
FILES="dimmer.html assets/js/dimmer.js assets/css/dimmer.css"
fail=0
bad() { echo "FAIL: $1"; fail=1; }
PAT='localStorage|sessionStorage|indexedDB|openDatabase|caches\.|document\.cookie|cookieStore|fetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.clipboard|<form|\.submit\(|FormData|gtag|dataLayer|analytics|cloudflareinsights|beacon|hotjar|fullstory|logrocket|clarity|mouseflow|posthog|mixpanel|segment|sentry|bugsnag|datadog|onerror|unhandledrejection|serviceWorker|history\.(push|replace)State|location\.(hash|search)\s*='
for f in $FILES; do
  if grep -n -i -E "$PAT" "$f"; then bad "$f uses a forbidden API or vendor (matches above)"; fi
  if grep -n -E '(^|[^.A-Za-z_])(alert|confirm|prompt)\(' "$f"; then bad "$f uses a browser dialog"; fi
done
if grep -n -E '<script[^>]*src=' dimmer.html | grep -v -E 'src="/assets/js/dimmer\.js"'; then bad "dimmer.html loads a script other than dimmer.js"; fi
if grep -n -E 'src="https?://|href="https?://' dimmer.html | grep -v -E 'fonts\.(googleapis|gstatic)\.com|creativecommons\.org|spirituallessonplans\.org'; then bad "dimmer.html references an unexpected third-party host"; fi
# Outbound URLs in the script: only the site itself and the two share links (WhatsApp, Facebook sharer).
# They are plain click-through links; nothing is requested until the visitor taps one.
if grep -n -o -E "https?://[^'\" )]+" assets/js/dimmer.js | grep -v -E 'https://www\.spirituallessonplans\.org/dimmer|https://wa\.me/\?text=|https://www\.facebook\.com/sharer/sharer\.php\?u='; then bad "dimmer.js references an unexpected URL"; fi
# navigator.share (the phone's own share sheet) is allowed; it is user-initiated and sends nothing through this site.
[ "$fail" -eq 0 ] && echo "OK: dimmer privacy code check passed"
exit $fail
