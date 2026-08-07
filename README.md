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

## License

Lesson content is [CC BY-SA 4.0](LICENSE.md) — free to use and adapt, including commercially, as
long as you credit and share alike.
