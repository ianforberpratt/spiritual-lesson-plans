# Lesson Topic Taxonomy

Purpose: a second browsing lens alongside age band — "what's going on" rather than "who's in
the room." Lives on the /lessons page as a parallel filter/tab, and feeds the homepage
quick-suggest tool (see feature-spec-topic-browse-quick-suggest.md).

**Status: live.** This scheme replaced an earlier, unrelated 7-category system (`identity`,
`belonging`, `prayer`, `purpose`, `forgiveness`, `relationships`, `courage`) that every lesson's
`topic` frontmatter already carried, tagged during import for internal organization but never
surfaced in any UI. That system was too coarse for this feature's job (e.g. its `prayer` category
blended three different visitor concerns: prayer practice, hearing guidance, and a theology
question) and its `courage` category existed solely as a euphemism for one sensitive lesson. All
17 lessons were backfilled to this 8-category scheme in August 2026, verified against each band
file's actual hook and content — not just its title. Two corrections came out of that pass, worth
recording since they're not obvious from title alone:

- **seven-synonyms-and-three-degrees** is tagged `doubt-and-hard-questions-about-god` across all
  five of its bands (5-8 through 21-plus). An earlier draft of this doc scoped it to "14+" only,
  which was simply wrong — it didn't account for the 5-8 and 8-11 band files, which cover the same
  "God has more than one true name" material as the older bands.
- **soul-another-name-for-god** is the one lesson where topic genuinely varies by band, because
  its content does: 11-14 is about where identity comes from (`identity-and-worth`), 14-21 is
  theology/doctrine (`doubt-and-hard-questions-about-god`), and 21-plus is about mastering vices —
  hatred, lust, revenge, deceit — in adult life (`desire-and-self-control`). The frontmatter
  `topic` field is per-band-file already; this just uses that instead of assuming one value has to
  cover every band. Tag future lessons the same way if a band's content genuinely shifts theme
  from its siblings — it should be rare, not a default.

A lesson can carry more than one topic tag (comma-separated) if it genuinely spans two — pick the
one or two a teacher would actually search under, not every theme that's technically present.

## identity-and-worth
"Who you are when nothing you did today counts for or against it."
- is-god-keeping-score (all bands, primary tag)
- big-ego-little-ego (all bands)
- soul-another-name-for-god (11-14)

## belonging-and-loneliness
"The ache of feeling alone even when nothing on the outside looks wrong."
- lonely-in-a-crowded-room (all bands)
- finding-the-bigger-us (all bands, secondary tag)

## conflict-and-forgiveness
"What love actually asks of you when someone feels like the enemy."
- when-someone-feels-like-the-enemy (all bands)
- finding-the-bigger-us (all bands, primary tag)

## doubt-and-hard-questions-about-god
"Wrestling honestly with who God is, or whether the words you were handed still fit."
- words-that-open-doors (all bands)
- seven-synonyms-and-three-degrees (all bands)
- soul-another-name-for-god (14-21)
- is-god-keeping-score (secondary tag, all bands)

## decisions-and-guidance
"Facing a real choice and wanting more than a coin flip."
- does-god-make-my-decisions (all bands)
- learning-to-hear-the-nudge (all bands)

## disappointment-and-hard-days
"A plan fell through, a mistake won't stop replaying, or today is just off."
- trust-the-mover (all bands)
- off-days-are-allowed (all bands)
- not-the-struggle (11-14, 14-21, 21-plus)
- is-regret-a-fair-teacher (all bands)

## grief-and-loss
"When someone the group loves is gone, and no lesson can undo that — only walk alongside it."
- (added 2026-08-26, no lessons tagged yet — first lesson pending)

## desire-and-self-control
"A pull toward something that doesn't resolve with a simple resist-it-or-give-in."
- the-pull-you-feel (11-14, 14-21, 21-plus)
- soul-another-name-for-god (21-plus)

## sensitive-topics (14-21 / 21-plus only, never auto-surfaced — see safety rule below)
"Specific, harder conversations, built deliberately for older teens and adults."
- talking-about-pornography-use (14-21)
- lgbtqia-youth-and-spiritual-learning (14-21)

Note: this last category is structurally different from the other eight — it must never appear
as a card in the /lessons topic-browse grid, and never as a default option in the quick-suggest
flow's topic list (see feature spec). The rule that governs this is the `sensitive_topic`
frontmatter field (`none | requires-careful-adaptation | teen-adult-only`), not the `topic` tag
itself — any lesson with `sensitive_topic` set to anything other than `none` is excluded from
both the topic-browse grid and default quick-suggest results, regardless of which `topic` value
it also carries. It surfaces only as a secondary, explicitly-labeled option in quick-suggest, and
only after a 14-21 or 21-plus age is selected.
