# Put It to Work: feature spec for spirituallessonplans.org

## What this is

A new tab on spirituallessonplans.org called **Put It to Work**. It is a 10 or 20 minute interactive case-consult exercise. A visitor follows one composite family's story a step at a time. At each step they type two things: **human footsteps** (practical actions) and a **spiritual lens** (what is true of the person beyond the situation). Then they can open "one way to see it," which shows sample responses and full passages, and add a text from their own tradition.

It is built for two audiences: a visitor working alone, and a teacher leading a group of young people. Anyone of any faith should be able to use it.

## Source files (read these first)

- `claude/put-it-to-work-reference-implementation.html`: a working, single-file prototype. It is the source of truth for **all copy, story text, passages, layout behavior, and visual design**. Do not rewrite or paraphrase its text.
- This spec: the requirements around it.

The prototype is vanilla HTML, CSS, and JS in one file. Port it into the site's own stack and conventions. Inspect the repo first and match how existing tabs (including Not Broken) are structured, routed, styled, and deployed. Keep the prototype's behavior and look.

## Non-negotiable requirement: nothing typed is saved or sent

This is the promise the page makes to visitors ("Private by design"). Treat it as a hard requirement, not a nice-to-have.

- No `localStorage`, `sessionStorage`, IndexedDB, or cookies for anything the visitor types.
- No network request of any kind that includes typed text. No form posts, no fetch or XHR, no analytics events carrying text, no error reporting that captures input values, no session-replay tools on this tab.
- Typed text lives only in in-memory JS state and disappears when the page closes or reloads.
- If the site has global analytics or session recording, exclude this tab from input capture, or confirm the tools do not record form fields.
- Add an automated test or checklist item that verifies the above (search the code for storage and network calls on this tab; check the network panel while typing).
- The only way text leaves the page is the visitor pressing **Copy my thoughts**, which writes to their clipboard.

## Placement and naming

- New tab titled **Put It to Work**, alongside the other interactive features.
- Suggested invitation line for the tab card: "Take a real family's story one step at a time. Write what love could actually do, and what is true of the person beyond the situation. Ten or twenty minutes. Nothing you type is saved."
- Keep the page title and tab label exactly "Put It to Work".

## Experience (screens)

1. **Intro.** Eyebrow with duration, title, lede, a "Private by design" card, "The story" card, "How it works" (a true ordered list), "Ground rules," two choice groups, and a Begin button.
   - Choice 1: **Just me** or **I'm leading a group**.
   - Choice 2: **About 10 minutes** (quick, 3 steps) or **About 20 minutes** (full, 6 steps). Default: solo, full.
   - Leader mode adds a "For the leader" block on the intro explaining how to run it, including the instruction to match their own texts to these thoughts.
2. **Step screens.** For each step: step counter, dotted progress trail, title, a "Practice:" line, the situation card, two textareas (Human footsteps in teal, Spiritual lens in amber), and a button "Show one way to see it" with the note "Write yours first, then open this. It works better that way."
   - Reveal panel: sample responses in two columns, "Passages one teacher might choose" shown in full with references, an optional textarea for the visitor's own text, a "Talk it over" prompt, and in leader mode a "For the leader" note.
   - The reveal is never gated. Previous and Next buttons are always available.
3. **Closing ("Put it together").** Two textareas (where love showed up as action; one sentence to carry into any hospital, classroom, or hard conversation), a read-only summary of everything typed, a **Copy my thoughts** button, a "Nothing was saved" notice, and a two-step **Start over** (inline confirmation, no browser dialogs). Leader mode adds four group discussion questions.

### Paths

- Full path: steps s1 to s6.
- Quick path: s1 (Care team), s5 (Clinic), s6 (Road ahead). Step s5 shows its `quickLead` recap paragraph first in quick mode only.

### Copy output format

Plain text:

```
PUT IT TO WORK
Case: Leo and Mia (names and details changed)

Step N: <title>
Human footsteps: <text or (left blank)>
Spiritual lens: <text or (left blank)>
My own text: <only if filled>

Where love showed up as action: <text or (left blank)>
My sentence to carry: <text or (left blank)>
```

Sample responses are never included in the copied text, only what the visitor wrote. If the clipboard call fails, show a read-only textarea with the text selected and the message "Your browser blocked copying. Select the text below and copy it."

On the real site, an optional "Print my thoughts" button is fine if the site allows printing. The prototype omits it only because its preview frame cannot open the print dialog.

## Content architecture

Do not hard-code the story into components. Extract it into a case file (JSON or the site's content format), for example `content/put-it-to-work/leo-and-mia.json`, so more cases can be added later without rebuilding.

Each case has: id, title, characters, intro story paragraphs, ground rules, a list of steps, and closing discussion questions.

Each step has: `id`, `short` (trail label), `quick` (boolean), `title`, `practice`, optional `quickLead`, `story` (array of paragraphs), `foot` (sample human footsteps), `lens` (sample spiritual lens), `passages` (array of `{ref, text}`), `talk`, and `leader`.

Extract the data exactly from the reference file's `STEPS` array. The six steps are: Building a care team (s1), A name arrives (s2), Where it came from (s3), Research across a language gap (s4), The clinic (s5), The road ahead (s6).

## Story and privacy decisions already made (do not reverse)

- The family is a composite with changed names and details: **Leo** (father-in-law) and **Mia** (his daughter-in-law, a social worker). Names were chosen to be globally universal.
- **No faith is named.** The faith difference stays: they "pray in different traditions" and treasure that.
- The condition is "a rare genetic condition." Do not name it. The list of affected body systems was removed on purpose.
- The family-history detail is "traces the condition back through the family's history." Do not add specifics about relatives.
- Location is "another city." Do not add a real city.
- Children "may carry the same gene change." Do not state they definitely do.
- Do not add real names, photos, or identifying details anywhere on the tab, in metadata, or in page titles.

## Passages

Passages are shown in full, from the Bible (King James Version) and Science and Health with Key to the Scriptures by Mary Baker Eddy. They are one set of choices. The intro and leader notes tell teachers to match their own texts to these thoughts, and each step has an optional box for a visitor's or student's own text. Keep the credit line at the bottom of every screen. Before launch, verify every passage word for word against a source.

## Visual design

Match the prototype. In summary:

- Fonts from Google Fonts: Bricolage Grotesque (display), Atkinson Hyperlegible (body), IBM Plex Mono (labels). Keep real fallback stacks.
- Color tokens: bg, surface, surface-2, ink, muted, line, foot (teal), foot-bg, lens (amber), lens-bg, button, focus. Light and dark palettes are both defined in the prototype. Support the site's light and dark theme behavior.
- Two-column footsteps and lens layout stacks to one column below about 640px. Choices stack below 520px. The progress trail shows only dots (no labels) below 520px.
- If the site already has a design system, apply it where it conflicts, but keep the teal and amber column coding, because color carries meaning here.

## Accessibility

- Every textarea has a real label. Choice buttons use `aria-pressed`. The reveal button uses `aria-expanded`. The trail marks the current step with `aria-current="step"`.
- Move focus to the screen heading on every navigation, and return focus to the reveal button after toggling it.
- Visible focus states. Respect `prefers-reduced-motion`.
- Fully usable with keyboard only and at phone width. No horizontal page scroll.
- Never use browser `alert`, `confirm`, or `prompt`. Confirmations are inline.

## Out of scope for v1

- No AI feedback on what people type (it would send their words somewhere and break the privacy promise).
- No accounts, saving, sharing, or progress tracking.
- No analytics on typed content. Page-level analytics (views, path chosen) are acceptable only if they do not include text.

## Acceptance checklist

- [ ] Tab appears on the site and is reachable from navigation.
- [ ] All story text and passages match the reference file exactly.
- [ ] Solo and leader modes, quick and full paths all work, including the quick recap on step s5.
- [ ] Typing, navigating back and forward, and toggling the reveal never lose typed text within a session.
- [ ] Copy works, and the fallback appears when the clipboard is blocked.
- [ ] Start over clears everything after the inline confirmation.
- [ ] No storage, cookies, or network calls involving typed text (verified, not assumed).
- [ ] Light and dark themes both read well. Phone width works.
- [ ] Keyboard and screen reader pass on all three screens.
- [ ] No faith, condition name, city, or real names appear anywhere on the tab.

## Open items for Ian to confirm

- Names Leo and Mia (easy to swap in the case file).
- Wording of the children's carrier status.
- Whether the doctor's advice should keep "to thank God" or be faith-neutral.
- Whether to add "Print my thoughts" on the live site.
