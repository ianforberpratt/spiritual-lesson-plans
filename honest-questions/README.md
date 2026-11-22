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


## Nothing is counted

This page loads no analytics, no cookies and no third-party scripts, by design: the site promises it does not
track readers, and this page keeps that promise. Reach is measured by replies, shares and the feedback box.

## Unlisted

`noindex, nofollow` meta tag in `index.html`, `robots.txt` in this folder, an `X-Robots-Tag` header, and it
is not in any sitemap. To open it up later, remove those.

## Moving to its own domain (honestquestionscs.org)

Deploy this folder as the root of its own site (`vercel.json` here carries the noindex header).
Nothing needs rewriting; all paths are relative.

## Reader tools (added Nov 22)

- **Per-post pages with their own link card:** `p/preview.html`, `p/1.html`, `p/2.html`, `p/3.html` and
  matching `og-*.png` cards. Sharing a post uses `/p/<id>` so Facebook shows that post's own title and card,
  then sends readers to the series page. If you change a title in `series.json`, the matching `p/*.html` and
  `og-*.png` need regenerating (ask Claude). They carry the full address of the current host in their tags.
- **Add to calendar** (on Coming soon cards): builds an `.ics` file on the reader's device, 6 PM Central.
- **Share, Listen (read aloud), reading-time, jump links, reading-progress line.**
- **Publishing a post** is still one file: add `posts/N.html` (it appears at its scheduled time).
