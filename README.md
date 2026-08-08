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
404.html
assets/css/style.css   Shared styles (palette + components)
assets/js/main.js      Nav toggle + scroll-reveal
assets/img/            Original SVG illustrations
```

Internal links are root-absolute and extensionless (`/lessons`, not `/lessons.html`) — `vercel.json`
sets `cleanUrls: true`, so linking with the extension would 404.

## Local preview

No Node/Python required. From the project root:

```
perl scratchpad/serve.pl . 8123
```

Then open `http://127.0.0.1:8123/`.

## Hero video

The homepage hero is built to show a background video (`assets/hero-video.mp4`, lazy-loaded,
same pattern as thetiesfoundation.org's hero), but no video file has been supplied yet — the
original SVG illustration (`assets/img/hero-sunrise.svg`) is used as the `poster` and displays
as a static fallback until a real clip is added. Drop a licensed/owned MP4 at that path and it
starts playing automatically; no other changes needed.

## License

Lesson content is [CC BY-SA 4.0](LICENSE.md) — free to use and adapt, including commercially, as
long as you credit and share alike.
