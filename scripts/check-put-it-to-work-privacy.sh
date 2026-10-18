#!/bin/sh
# Static privacy check for the Put It to Work tab (/put-it-to-work).
#
# The page promises "Nothing is saved or sent anywhere." This fails the build if the
# tab's own files gain any way to persist or transmit what a visitor types.
# It is a code search, not a proof: pair it with scripts/test-put-it-to-work-privacy.js,
# which watches the real network and storage while typing in a browser.
#
#   sh scripts/check-put-it-to-work-privacy.sh        (run from anywhere)

cd "$(dirname "$0")/.." || exit 2
FILES="put-it-to-work.html assets/js/put-it-to-work.js assets/css/put-it-to-work.css"
CASES=$(ls content/put-it-to-work/*.json 2>/dev/null)
fail=0

bad() { echo "FAIL: $1"; fail=1; }

# 1. Persistence, network, analytics, error-reporting and session-replay APIs or vendors.
PAT='localStorage|sessionStorage|indexedDB|openDatabase|caches\.|document\.cookie|cookieStore|XMLHttpRequest|sendBeacon|WebSocket|EventSource|navigator\.share|<form|\.submit\(|FormData|gtag|dataLayer|analytics|cloudflareinsights|beacon|hotjar|fullstory|logrocket|clarity|mouseflow|posthog|mixpanel|segment|sentry|bugsnag|datadog|onerror|unhandledrejection|serviceWorker|history\.(push|replace)State|location\.(hash|search)\s*='
for f in $FILES $CASES; do
  if grep -n -i -E "$PAT" "$f"; then bad "$f uses a forbidden API or vendor (matches above)"; fi
done

# 2. Browser dialogs are not allowed (confirmation is inline).
for f in $FILES; do
  if grep -n -E '(^|[^.A-Za-z_])(alert|confirm|prompt)\(' "$f"; then bad "$f uses a browser dialog"; fi
done

# 3. Exactly one fetch(), and it is the plain GET for the static case file (no options, no body).
n=$(grep -c -E '\bfetch\(' assets/js/put-it-to-work.js)
[ "$n" -eq 2 ] || bad "expected exactly 2 fetch( calls (case file + its fallback), found $n"
if grep -E '\bfetch\(' assets/js/put-it-to-work.js | grep -v -E "fetch\('/content/put-it-to-work/[^']*'( \+ caseId \+ '\.json')?\)" ; then
  bad "a fetch( call has options or a non-case-file URL"
fi

# 4. The page loads no script except its own, and no third-party host except Google Fonts.
if grep -n -E '<script[^>]*src=' put-it-to-work.html | grep -v -E 'src="/assets/js/put-it-to-work\.js"'; then
  bad "put-it-to-work.html loads a script other than put-it-to-work.js"
fi
hosts=$(grep -o -h -E 'https?://[A-Za-z0-9.-]+' put-it-to-work.html assets/js/put-it-to-work.js assets/css/put-it-to-work.css | sort -u \
  | grep -v -E '^https?://(fonts\.googleapis\.com|fonts\.gstatic\.com|www\.spirituallessonplans\.org|www\.w3\.org|schema\.org|creativecommons\.org)$')
[ -z "$hosts" ] || bad "unexpected external hosts: $hosts"

# 5. Typed fields never get their value sent anywhere: only state assignment and clipboard.
if grep -n -E 'writeText' assets/js/put-it-to-work.js | wc -l | grep -q -v '^1$'; then
  bad "expected exactly one clipboard write"
fi

# 6. Story content: no faith names, condition names or place names in the story text.
#    (Passages and their references are excluded; they quote scripture on purpose.)
for f in $CASES; do
  if node -e '
    const c = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
    const text = [c.title, c.caseLabel, ...c.intro.story, ...c.groundRules, ...c.closingQuestions,
      ...c.steps.flatMap(s => [s.title, s.practice, s.quickLead || "", ...s.story, ...s.foot, ...s.lens, s.talk, s.leader])].join("\n");
    const re = /christian|muslim|islam|jewish|judaism|catholic|protestant|hindu|buddhis|sikh|mormon|church|mosque|synagogue|temple|allah|bible|scripture|cystic|sickle|marfan|huntington|fabry|alport|polycystic|tay-sachs|new york|london|boston|chicago|houston|toronto/i;
    const m = text.match(re); if (m) { console.log("matched: " + m[0]); process.exit(1); }
  ' "$f"; then :; else bad "$f story text mentions a faith, condition or place (see match above)"; fi
done

if [ "$fail" -eq 0 ]; then echo "OK: Put It to Work privacy check passed."; else exit 1; fi
