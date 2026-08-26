# Feature Spec: Topic Browsing + "Tell Us What's Going On" Quick Suggest

**Status: Feature 1 (topic-browse tab on /lessons) built 2026-08-25 — a "By age" / "By what's
going on" tab switcher, the latter grouping lessons into the 7 browsable categories with
age-band badges per lesson. Verified locally, not yet deployed. Feature 2 (homepage quick-suggest)
not started.**

Written 2026-08-26, from a brainstorming conversation with Ian about site UX. Two features,
scoped together because the second reuses the first's data. Both are additive — nothing existing
gets removed, restructured, or made mandatory. A visitor who wants to scroll all 17 lessons by
age, exactly like today, still can, in exactly as few clicks as now.

## Why

The /lessons page currently has one lens: browse by age band, in five long sequential sections,
with no search or filter. That's fine at 17 lessons. It gets harder to use as the library grows,
and it assumes a visitor already knows which age band they need — but a lot of real visits start
from the opposite direction: a teacher who knows *why* they're looking (a hard question came up
in class, the group's been distracted and low, someone's dealing with a falling-out) before they
consciously frame it as "I need an 11-14 lesson." Both features below meet that visitor where they
actually are, without taking anything away from the visitor who already knows exactly what they
want.

## Feature 1 — Browse by topic (parallel lens on /lessons)

Add a second way to filter the existing lesson list, alongside (not replacing) the current
age-band sections. Suggested treatment: two tabs or a toggle at the top of /lessons — "By age"
(today's default view, unchanged) and "By what's going on" (new).

The "by what's going on" view groups the same lessons under the eight topics in
`content/taxonomy/lesson-topics.md`, each topic shown as a short card: the topic's one-line
framing (from the taxonomy file), then the lessons under it listed with their existing age-band
badges so a visitor can immediately see which ages a given topic is available for.

The `sensitive-topics` category from the taxonomy does not appear as a topic card on this page at
all — that content stays reachable exactly as it is today (through its own lesson page and normal
search), just not surfaced as a browsable "topic" tile next to identity and belonging. Section 4-5
of the lesson-adaptation instructions already treats this content as oldest-band-only by design;
this feature shouldn't undo that carefulness by making it one tap away from a homepage aimed at
Sunday School teachers of all ages.

Implementation note: gate on the `sensitive_topic` frontmatter field, not on the `topic` value —
but only its `teen-adult-only` value, which is the real audience gate. Its other non-`none` value,
`requires-careful-adaptation`, is a facilitator-guidance flag, not an audience gate (confirmed
2026-08-27: the grief-doesnt-need-fixing lesson carries it on every band including 5-8, which only
exists because that band was deliberately written for K-2 — excluding it from browse would've
silently emptied its entire topic category). Filtering on the category name alone would still be
wrong long-term — it'd let a future double-tagged lesson (sensitive content that also genuinely
fits `belonging-and-loneliness`, say) leak into a public card if someone forgot to also gate by
name — `sensitive_topic: teen-adult-only` is the field actually designed to prevent that.

Internal linking bonus (ties into the SEO doc, section 3): this view gives every lesson a second
path to be reached by a crawler and a human, and gives natural anchor text ("lessons about
belonging and loneliness") that the current age-only structure doesn't produce.

## Feature 2 — "Tell us what's going on" quick-suggest opener

An optional module on the homepage, positioned near the existing "Explore the lessons" CTA — not
replacing it, sitting beside it as a second, equally-weighted door. Something like:

> **Not sure where to start?**
> Browse all the lessons, or tell us what's going on and we'll point you toward a few that fit.
>
> [ Browse all lessons ]     [ Tell us what's going on → ]

The second button opens a short two-question flow — not a quiz, not an account, no page
navigation required if it can be done as an in-place expand:

**Question 1 — "Who's this for?"**
Single select: Early Elementary (5-8) · Upper Elementary (8-11) · Middle School (11-14) · Teen &
Early College (14-21) · Adult (21+) · Just me, no specific age

**Question 2 — "What's actually going on?"**
Single select, plain-language versions of the seven public taxonomy topics, framed as real
moments rather than category labels, e.g.:
- Just a regular week — nothing specific
- Someone's feeling not good enough, or stuck comparing themselves to others
- Someone's lonely, or feels like they don't belong
- There's real tension or a falling-out in the group
- A hard question came up about who God actually is
- A real decision or change is happening
- Someone's dealing with a rough patch or a mistake they can't put down
- A pull toward something they know isn't good for them

If — and only if — Question 1's answer is Teen & Early College (14-21) or Adult (21+), add one
more line beneath the list, visually set apart and softer in tone, not presented as equal to the
other options: *"Something more specific — pornography, questions about identity or
orientation — see our teen/adult-only lessons on this."* This is the only path into the
sensitive-topics category, and it never appears at all for 5-8, 8-11, or 11-14. This mirrors the
existing site rule (section 4 of the lesson-adaptation instructions) that this material defaults
to the oldest band it clearly fits and is never one accidental click away from a younger
selection.

**Result**: 2-3 lesson cards (title, one-line hook, time estimate, age badge, link) matching the
age + topic combination. Below the results: "See all lessons for [age band]" and "Start over"
links, so this is always a door, never a dead end.

**Fallback logic, in order:**
1. Exact age + topic match exists → show up to 3, best guess if more than 3 fit.
2. No lesson at that exact age for that topic, but the topic exists at a nearby band → show the
   nearest band's version with a plain, honest note: *"We don't have this one built yet for that
   exact age — here's the closest version."* Never silently show adult content to a child-age
   selection to fill the gap; if the nearest available version is older-only sensitive content,
   don't show it — fall through to rule 3 instead.
3. No topic match at all (including "just a regular week") → show that age band's 2-3 most
   broadly-applicable lessons (is-god-keeping-score and big-ego-little-ego are reasonable
   defaults here since they're built across the most bands) with a note: *"Here are a few that
   work well for almost any week."*

## What this explicitly does not do

- No login, no saved profile, no tracking beyond whatever the site already does for analytics.
- Doesn't gate or replace the existing full browse — a returning visitor who wants the old
  experience gets it, unchanged, in the same number of clicks as today.
- Doesn't invent new lesson content — this only routes to what already exists. If the fallback
  logic in Feature 2 turns up thin for a given age/topic pairing, that's a signal for Ian's next
  lesson-writing pass, not something to paper over with a forced match.

## Open for Claude Code to resolve against the actual stack

This spec deliberately doesn't prescribe component structure, state management, or exact markup —
same division of labor as the rest of this project: content and logic are specified precisely
here, the real implementation (whether this is a client-side filter, a small bit of JS, or a
server-rendered variant) is Claude Code's call given the actual framework and build script. Visual
treatment should match the site's existing card and button system (the age-band cards already
live on /lessons and the individual lesson pages) rather than introducing a new visual language.

## Decisions (resolved 2026-08-25, with Ian)

1. **Taxonomy scheme**: the 8-category scheme above is live, not the older 7-category system
   (`identity`/`belonging`/`prayer`/`purpose`/`forgiveness`/`relationships`/`courage`) that
   predated this feature. All 17 lessons were backfilled and verified against actual lesson
   content — see `content/taxonomy/lesson-topics.md` for the final mapping and the two corrections
   that came out of that verification pass. Chosen over keeping the old scheme because Ian is
   publishing a new lesson every 1-2 weeks going forward — a scheme too coarse to route precisely
   today only gets more wrong as the library grows, and every already-published lesson would need
   retagging if fixed later instead of now.
2. **Topic-browse grid card count**: 7 cards (all 8 categories minus `sensitive-topics`, which
   never appears as a card — by design, see Feature 1 above). No orphan "courage" bucket to worry
   about either — under the new scheme, the one lesson that used to sit alone in that bucket
   (talking-about-pornography-use) is tagged `sensitive-topics` directly, so it was never a
   candidate for its own public card in the first place.
3. **Question 2 select type**: single-select, to keep the flow fast. Matches the "not a quiz"
   framing above.
4. **Question 2 wording**: maps 1:1 to the 7 browsable categories, plus the gated sensitive-topics
   line for 14-21/21-plus, rather than more granular moment-based phrasing that would cut across
   category boundaries — keeps the routing an honest tag lookup instead of one-off logic, and the
   options already drafted above satisfy this without changes.
5. **Module placement**: homepage only, to start. Revisit adding it to the top of /lessons once
   the homepage version is live and it's clear whether direct /lessons landers actually need it
   too.
