# Honest Questions CS

A standalone, unlisted series page. Self-contained: its own stylesheet, script, and data. Nothing is
imported from, or linked to, the lesson plans site.

## Publish an installment (one simple edit, no rebuild)

1. Write the post body as plain HTML in `posts/1.html` (or `2`, `3`). Paragraphs, `<h3>`, `<blockquote>`,
   and `<figure>` (for charts/SVG/images) all have styles. See `style.css`, "Room for charts".
2. Put its title in `series.json` (`"title"`).
3. Done. It appears on its own at the scheduled `publishAt` time (6 PM Central). Before that time it
   stays "Coming soon," even if the file is already deployed. The "N of 4 live" bar updates itself.

Put chart images in `posts/` or an `assets/` folder inside this folder, so the page stays portable.

## Check the schedule without waiting

- `index.html?asof=2026-11-24T19:00:00-06:00` shows the page as of that moment.
- `index.html?asof=all` shows everything whose file exists.

## Settings in `series.json`

- `feedbackEndpoint`: where the anonymous feedback box posts. Now `/api/feedback`, the lesson plans site's email function, so the destination address stays on the server and is never on this page. Blank = box hidden. On its own domain that path will not exist: point this at a function on the new project, or an absolute URL (which would need CORS).
- `analytics.goatcounter`: your GoatCounter site code (free, no cookies, no personal data). Blank = no
  tracking. When set, you see page views plus a "read-preview / read-1 / read-2 / read-3" count per
  post (counted when ~60% of the post has been on screen) and "feedback-click".

## Unlisted

`noindex, nofollow` meta tag in `index.html`, `robots.txt` in this folder, an `X-Robots-Tag` header, and it
is not in any sitemap. To open it up later, remove those.

## Moving to its own domain (honestquestionscs.org)

Deploy this folder as the root of its own site (`vercel.json` here carries the noindex header).
Nothing needs rewriting; all paths are relative.
