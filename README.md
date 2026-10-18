# Spiritual Lesson Plans

Source for [spirituallessonplans.org](https://www.spirituallessonplans.org) — a free, open resource
of interactive spiritual lesson plans for anyone mentoring young people, rooted in Christian Science
and open to every faith background. No accounts, no donations, no organization behind it.

## Stack

Plain HTML/CSS/JS, no build step, no framework. Deployed to [Vercel](https://vercel.com) as a static
site with clean URLs (see `vercel.json`).

## Structure

```
index.html            Home
lessons.html           /lessons
for-mentors.html        /for-mentors
what-we-believe.html    /what-we-believe
about.html              /about
not-broken.html         /not-broken (standalone interactive, linked from /for-you)
put-it-to-work.html     /put-it-to-work (standalone interactive, linked from /for-you)
404.html
assets/css/style.css   Shared styles (palette + components)
assets/js/main.js      Nav toggle + scroll-reveal
assets/js/put-it-to-work.js   Engine for /put-it-to-work (loads a case file; stores nothing)
assets/css/put-it-to-work.css Page styles for /put-it-to-work (loaded after style.css; all classes are piw-*)
content/put-it-to-work/       Case files (JSON). Add a case = add a file, no rebuild
assets/materials/put-it-to-work/  Printable worksheet(s) linked from a case's "worksheet" field
assets/img/            Original SVG illustrations
```

Internal links are root-absolute and extensionless (`/lessons`, not `/lessons.html`) — `vercel.json`
sets `cleanUrls: true`, so linking with the extension would 404.

## Local preview

No Node/Python required. From the project root:

```
perl scripts/serve.pl . 8099
```

Then open `http://127.0.0.1:8099/`. (`scripts/serve.pl` is a tiny zero-dependency
static server that mirrors Vercel's clean URLs; it only ever reads files.)

## Hero video

The homepage hero is built to show a background video (`assets/hero-video.mp4`, lazy-loaded,
same pattern as thetiesfoundation.org's hero), but no video file has been supplied yet — the
original SVG illustration (`assets/img/hero-sunrise.svg`) is used as the `poster` and displays
as a static fallback until a real clip is added. Drop a licensed/owned MP4 at that path and it
starts playing automatically; no other changes needed.

## Put It to Work (privacy-critical)

`/put-it-to-work` promises visitors that nothing they type is saved or sent. It loads no site-wide
script (no `main.js`, no feedback widget, no language switcher) and no analytics beacon, on purpose. It does
use the site's look (nav, footer, `style.css`, fonts); only the behavior scripts are left out, and the page
carries its own tiny menu toggle. Keep it that way, and
run both checks after any change to `put-it-to-work.html`, `assets/js/put-it-to-work.js`, or a case file:

```
sh scripts/check-put-it-to-work-privacy.sh                       # code search
perl scripts/serve.pl . 8099 &                                    # then, with Playwright installed:
NODE_PATH=$(npm root -g) node scripts/test-put-it-to-work-privacy.js   # real browser: network, storage, cookies
```

A new case is a JSON file in `content/put-it-to-work/` (see `leo-and-mia.json` for the shape); the page
loads `?case=<id>`, defaulting to `leo-and-mia`. The page makes one plain GET for that file at load.

## Analytics

The site uses **Cloudflare Web Analytics**, not Google Analytics — on purpose.

Cloudflare's beacon is cookieless: no cookies, no fingerprinting, no IP storage, no cross-site
tracking, and therefore no consent banner needed. That keeps the promises the site makes on
every page true — the cookie notice says *"This site does not track you"* and `about.html` says
*"No data collected about you or the young people you mentor."* The audience skews young, which
also makes a cookie-setting tracker (GA4 and similar) a COPPA problem.

The beacon is one `<script>` per page: added by `scripts/build-lessons.pl` → `footer_html()` for
every generated lesson/topic page, and hand-placed before `</body>` on the six static pages
(`index`, `lessons`, `for-mentors`, `what-we-believe`, `about`, `404`). It is deliberately **not**
on the print-only handout pages under `assets/materials/`.

If Google Analytics (or any cookie-setting analytics) is ever genuinely needed, it has to ship
together with: a real Accept/Decline consent banner, the tag firing only after consent, and the
`about.html` "no data collected" line reworded first.

## License

Lesson content is [CC BY-SA 4.0](LICENSE.md) — free to use and adapt, including commercially, as
long as you credit and share alike.
