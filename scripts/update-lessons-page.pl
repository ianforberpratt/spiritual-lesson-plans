#!/usr/bin/perl
#
# Regenerates the age-band sections and the ItemList schema on lessons.html
# and index.html, from assets/data/lessons-manifest.json. MUST run after
# build-lessons.pl (which produces that manifest) any time a topic's band
# coverage changes — skipping this step is exactly how a new lesson ends
# up live and directly linkable, but silently missing from the /lessons
# browse grid and the homepage's ItemList. Both scripts are part of one
# build step now; run them together, always in this order:
#   perl scripts/build-lessons.pl && perl scripts/update-lessons-page.pl
#
# The band sections live between the BAND_SECTIONS_START/END HTML comment
# markers. The ItemList lives inside a <script type="application/ld+json">
# block, where HTML comments would corrupt the JSON — so that block is
# matched by its unique "All spiritual lesson plans" name instead.
#
# Run: perl scripts/update-lessons-page.pl
#
use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use Cwd qw(abs_path);
use JSON::PP qw(decode_json);

binmode(STDOUT, ':encoding(UTF-8)');
binmode(STDERR, ':encoding(UTF-8)');

my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $MANIFEST = "$ROOT/assets/data/lessons-manifest.json";
my $PAGE = "$ROOT/lessons.html";
my $SITE_ORIGIN = "https://www.spirituallessonplans.org";

my %BAND_ACCENT = (
  '5-8'    => 'gold',
  '8-11'   => 'sky',
  '11-14'  => 'sage',
  '14-21'  => 'dusk',
  '21-plus'=> 'gold-deep',
);

# A quiet word for the mentor themselves, shown once under each band's
# heading (not repeated per lesson card).
my %BAND_TIP = (
  '5-8'    => "You already have what this moment needs. This age learns through story and repetition, not explanation \x{2014} trust the story to do the work. You've got this, and the world needs you.",
  '8-11'   => "You already have what this moment needs. This age is just old enough to compare two ideas side by side \x{2014} let them do the comparing, not you. You've got this, and the world needs you.",
  '11-14'  => "You already have what this moment needs. This age can go deep, but often needs a quiet, private way in before they're ready to share. You've got this, and the world needs you.",
  '14-21'  => "You already have what this moment needs. This age can hold real, honest depth \x{2014} meet them there instead of softening it. You've got this, and the world needs you.",
  '21-plus'=> "You already have what this moment needs. This age brings real life experience \x{2014} invite them to apply the idea to something happening right now. You've got this, and the world needs you.",
);

sub read_file {
  my ($path) = @_;
  open(my $fh, '<:encoding(UTF-8)', $path) or die "Can't read $path: $!";
  local $/;
  my $c = <$fh>;
  close $fh;
  return $c;
}
sub write_file {
  my ($path, $content) = @_;
  open(my $fh, '>:encoding(UTF-8)', $path) or die "Can't write $path: $!";
  print $fh $content;
  close $fh;
}
sub esc {
  my ($s) = @_;
  $s //= '';
  $s =~ s/&/&amp;/g;
  $s =~ s/</&lt;/g;
  $s =~ s/>/&gt;/g;
  $s =~ s/"/&quot;/g;
  return $s;
}

# For text going inside a <script type="application/ld+json"> block:
# HTML-entity escaping is the wrong tool there (the browser doesn't parse
# script contents as HTML, so entities like &quot; would end up literally
# in the parsed JSON string) — this needs real JSON string escaping.
sub json_esc {
  my ($s) = @_;
  $s //= '';
  $s =~ s/\\/\\\\/g;
  $s =~ s/"/\\"/g;
  return $s;
}

sub read_bytes {
  my ($path) = @_;
  open(my $fh, '<:raw', $path) or die "Can't read $path: $!";
  local $/;
  my $c = <$fh>;
  close $fh;
  return $c;
}

# decode_json wants UTF-8 bytes, not Perl's internal decoded string.
my $manifest = decode_json(read_bytes($MANIFEST));
my @band_order = @{ $manifest->{bandOrder} };
my %band_labels = %{ $manifest->{bandLabels} };
my @topics = @{ $manifest->{topics} };

# The "by what's going on" browsing lens (see content/taxonomy/lesson-topics.md
# for the full definitions this is sourced from). Order here is the display
# order on the page, not alphabetical — chosen to read as a sensible flow.
# `sensitive-topics` is deliberately absent: that category never gets a card
# here, by design (see claude/feature-spec-topic-browse-quick-suggest.md).
my @CATEGORY_ORDER = qw(
  identity-and-worth
  belonging-and-loneliness
  conflict-and-forgiveness
  doubt-and-hard-questions-about-god
  decisions-and-guidance
  disappointment-and-hard-days
  grief-and-loss
  desire-and-self-control
);
my %CATEGORY_LABEL = (
  'identity-and-worth'                 => 'Identity & worth',
  'belonging-and-loneliness'           => 'Belonging & loneliness',
  'conflict-and-forgiveness'           => 'Conflict & forgiveness',
  'doubt-and-hard-questions-about-god' => 'Doubt & hard questions about God',
  'decisions-and-guidance'             => 'Decisions & guidance',
  'disappointment-and-hard-days'       => 'Disappointment & hard days',
  'grief-and-loss'                     => 'Grief & loss',
  'desire-and-self-control'            => 'Desire & self-control',
);
my %CATEGORY_BLURB = (
  'identity-and-worth'                 => "Who you are when nothing you did today counts for or against it.",
  'belonging-and-loneliness'           => "The ache of feeling alone even when nothing on the outside looks wrong.",
  'conflict-and-forgiveness'           => "What love actually asks of you when someone feels like the enemy.",
  'doubt-and-hard-questions-about-god' => "Wrestling honestly with who God is, or whether the words you were handed still fit.",
  'decisions-and-guidance'             => "Facing a real choice and wanting more than a coin flip.",
  'disappointment-and-hard-days'       => "A plan fell through, a mistake won't stop replaying, or today is just off.",
  'grief-and-loss'                     => "When someone the group loves is gone, and no lesson can undo that \x{2014} only walk alongside it.",
  'desire-and-self-control'            => "A pull toward something that doesn't resolve with a simple resist-it-or-give-in.",
);

# Lowercased, punctuation-flattened haystack the client-side Lessons search
# (assets/js/lessons-search.js) matches a query against: lesson title + hook
# + topic-tag slugs and their human-readable labels. The normalize() in that
# JS file must stay in lockstep with the transform here so a typed query and
# this blob tokenize identically. Topic-tag matching is the point — it's what
# lets "grief" find a lesson tagged grief-and-loss whose title never says it.
sub search_blob {
  my (@parts) = @_;
  my @cats;
  for my $p (@parts) {
    next unless defined $p;
    push @cats, grep { $CATEGORY_LABEL{$_} }
                map  { my $c = $_; $c =~ s/^\s+|\s+$//g; $c }
                split /,/, $p;
  }
  my $s = join(' ', (grep { defined && length } @parts),
                    map { $CATEGORY_LABEL{$_} } @cats);
  $s = lc $s;
  $s =~ s/&#?[a-z0-9]+;/ /g;   # strip HTML entities (&quot; &amp; &mdash; &#39;)
  $s =~ s/[^a-z0-9]+/ /g;      # everything else -> space (mirrors JS normalize)
  # De-dupe tokens (a lesson's per-band topic tags are mostly identical, so
  # the raw join repeats each category five times) while keeping word order.
  my %seen;
  my @toks = grep { length && !$seen{$_}++ } split /\s+/, $s;
  return esc(join ' ', @toks);
}

# ---------------------------------------------------------------------
# Band sections
# ---------------------------------------------------------------------

my $sections = '';
for my $band (@band_order) {
  my @cards;
  for my $t (@topics) {
    my ($match) = grep { $_->{band} eq $band } @{ $t->{bands} };
    next unless $match;
    push @cards, { topic => $t, band_info => $match };
  }

  $sections .= qq{<section id="band-$band" class="band-section" data-band="$band">\n};
  $sections .= qq{  <div class="wrap">\n};
  $sections .= qq{    <div class="band-section-head">\n};
  $sections .= qq{      <p class="eyebrow" style="margin:0;">@{[ esc($band_labels{$band}) ]}</p>\n};
  $sections .= qq{      <p class="band-section-tip">@{[ esc($BAND_TIP{$band}) ]}</p>\n} if $BAND_TIP{$band};
  $sections .= qq{    </div>\n};

  if (@cards) {
    $sections .= qq{    <div class="topic-grid">\n};
    for my $c (@cards) {
      my $t = $c->{topic};
      my $bi = $c->{band_info};
      my $blob = search_blob($bi->{title} // $t->{title}, $bi->{hook} || $t->{hook}, $bi->{topic});
      $sections .= qq{      <a href="$bi->{url}" class="topic-card reveal" data-search="$blob">\n};
      $sections .= qq{        <span class="age-badge age-badge-$BAND_ACCENT{$band}">@{[ esc($bi->{label}) ]}</span>\n};
      $sections .= qq{        <h3>@{[ esc($bi->{title} // $t->{title}) ]}</h3>\n};
      $sections .= qq{        <span class="tag">@{[ esc($bi->{hook} || $t->{hook}) ]}</span>\n};
      $sections .= qq{        <span class="meta">@{[ esc($bi->{timeDisplay}) ]}</span>\n};
      $sections .= qq{      </a>\n};
    }
    $sections .= qq{    </div>\n};
  } else {
    $sections .= qq{    <div class="band-empty">\n};
    $sections .= qq{      <p>We're still building out lessons for this age group &mdash; check back soon, or tell us what you need.</p>\n};
    $sections .= qq{      <p><button class="btn-outline-dark" type="button" data-open-feedback data-feedback-context="@{[ esc($band_labels{$band}) ]} &middot; requested a lesson" style="background:none;border:1px solid var(--rule-strong);border-radius:var(--radius);padding:10px 18px;color:var(--ink);cursor:pointer;font-family:var(--font-sans);">Tell us what you need</button></p>\n};
    $sections .= qq{    </div>\n};
  }

  $sections .= qq{  </div>\n};
  $sections .= qq{</section>\n\n};
}
chomp $sections; chomp $sections;

# ---------------------------------------------------------------------
# Category sections ("by what's going on" lens)
#
# Grouped per (lesson, band) pair rather than per lesson, because a
# lesson's topic tag is per band-file, not lesson-wide — most lessons use
# the same tag on every band, but a few (see soul-another-name-for-god)
# genuinely shift theme by band, and a lesson can carry two comma-separated
# tags. Only "teen-adult-only" bands are excluded here — that's the real
# audience gate (used by the pornography lesson, and one lgbtqia band that
# has no younger band at all). "requires-careful-adaptation" is a
# facilitator-guidance flag, not an audience gate — proof: the grief lesson
# carries it on every band including 5-8, which only exists because it was
# deliberately written for that age. Excluding it from browse too would
# empty out an entire topic category for a lesson built for every age.
# ---------------------------------------------------------------------

my %by_category; # category => [ { topic => $t, bands => [ band_info, ... ] }, ... ] keyed by topic slug
my %seen_in_category; # "category|slug" => index into $by_category{category}

for my $t (@topics) {
  for my $b (@{ $t->{bands} }) {
    next if ($b->{sensitiveTopic} // 'none') eq 'teen-adult-only';
    my @cats = grep { length } map { s/^\s+|\s+$//gr } split /,/, ($b->{topic} // '');
    for my $cat (@cats) {
      next unless $CATEGORY_LABEL{$cat}; # skip sensitive-topics or anything unrecognized
      my $key = "$cat|$t->{slug}";
      if (!exists $seen_in_category{$key}) {
        push @{ $by_category{$cat} }, { topic => $t, bands => [] };
        $seen_in_category{$key} = $#{ $by_category{$cat} };
      }
      push @{ $by_category{$cat}[ $seen_in_category{$key} ]{bands} }, $b;
    }
  }
}

my $category_sections = '';
for my $cat (@CATEGORY_ORDER) {
  my $entries = $by_category{$cat};
  next unless $entries && @$entries; # no empty cards

  $category_sections .= qq{<section id="category-$cat" class="category-section" data-category="$cat">\n};
  $category_sections .= qq{  <div class="wrap">\n};
  $category_sections .= qq{    <div class="category-section-head">\n};
  $category_sections .= qq{      <h2>@{[ esc($CATEGORY_LABEL{$cat}) ]}</h2>\n};
  $category_sections .= qq{    </div>\n};
  $category_sections .= qq{    <div class="category-lesson-list">\n};
  for my $entry (@$entries) {
    my $t = $entry->{topic};
    my $blob = search_blob($t->{title}, $t->{hook},
                           join(',', map { $_->{topic} // '' } @{ $entry->{bands} }), $cat);
    $category_sections .= qq{      <a href="$t->{landingUrl}" class="category-lesson-card reveal" data-search="$blob">\n};
    $category_sections .= qq{        <h3>@{[ esc($t->{title}) ]}</h3>\n};
    $category_sections .= qq{        <span class="tag">@{[ esc($t->{hook}) ]}</span>\n};
    $category_sections .= qq{        <span class="category-lesson-badges">\n};
    for my $band (@band_order) {
      my ($bi) = grep { $_->{band} eq $band } @{ $entry->{bands} };
      next unless $bi;
      $category_sections .= qq{          <span class="age-badge age-badge-$BAND_ACCENT{$band}">@{[ esc($bi->{label}) ]}</span>\n};
    }
    $category_sections .= qq{        </span>\n};
    $category_sections .= qq{      </a>\n};
  }
  $category_sections .= qq{    </div>\n};
  $category_sections .= qq{  </div>\n};
  $category_sections .= qq{</section>\n\n};
}
chomp $category_sections; chomp $category_sections;

my $page = read_file($PAGE);
my $count_before = () = $page =~ /BAND_SECTIONS_START/g;
die "BAND_SECTIONS_START marker not found in $PAGE\n" unless $count_before;

my $n = ($page =~ s/(<!-- BAND_SECTIONS_START:.*?-->).*?(<!-- BAND_SECTIONS_END -->)/$1\n$sections\n$2/s);
die "Marker substitution matched $n times (expected 1) in $PAGE\n" unless $n == 1;

my $count_before_cat = () = $page =~ /CATEGORY_SECTIONS_START/g;
die "CATEGORY_SECTIONS_START marker not found in $PAGE\n" unless $count_before_cat;

my $nc = ($page =~ s/(<!-- CATEGORY_SECTIONS_START:.*?-->).*?(<!-- CATEGORY_SECTIONS_END -->)/$1\n$category_sections\n$2/s);
die "CATEGORY_SECTIONS marker substitution matched $nc times (expected 1) in $PAGE\n" unless $nc == 1;

# ---------------------------------------------------------------------
# ItemList schema (matched by its unique name, not a comment marker,
# since HTML comments inside a <script type="application/ld+json">
# block are not stripped by the browser and would corrupt the JSON).
# ---------------------------------------------------------------------

my @items;
my $pos = 0;
for my $t (@topics) {
  $pos++;
  push @items, qq{        { "\@type": "ListItem", "position": $pos, "url": "$SITE_ORIGIN$t->{landingUrl}", "name": "@{[ json_esc($t->{title}) ]}" }};
}
my $items_json = join(",\n", @items);
my $count = scalar(@topics);

my $n2 = ($page =~ s/("name":\s*"All spiritual lesson plans",\s*"numberOfItems":\s*)\d+(,\s*"itemListElement":\s*\[)\s*.*?\s*(\]\s*\})/$1$count$2\n$items_json\n      $3/s);
die "ItemList substitution matched $n2 times (expected 1) in $PAGE\n" unless $n2 == 1;

write_file($PAGE, $page);

print "lessons.html updated: " . scalar(@topics) . " topics across " . scalar(@band_order) . " band sections and " . scalar(keys %by_category) . " category sections.\n";

# ---------------------------------------------------------------------
# index.html — same ItemList pattern, different unique name, ordered
# to keep "newest lessons" first (unchanged from prior manual ordering
# where present; new topics append at the end).
# ---------------------------------------------------------------------

my $INDEX = "$ROOT/index.html";
my $idx = read_file($INDEX);

my @idx_items;
$pos = 0;
for my $t (@topics) {
  $pos++;
  push @idx_items, qq{        { "\@type": "ListItem", "position": $pos, "url": "$SITE_ORIGIN$t->{landingUrl}", "name": "@{[ json_esc($t->{title}) ]}" }};
}
my $idx_items_json = join(",\n", @idx_items);

my $n3 = ($idx =~ s/("name":\s*"Spiritual lesson plans for every age",\s*"description":[^\n]*\n\s*"numberOfItems":\s*)\d+(,\s*"itemListOrder":[^\n]*\n\s*"itemListElement":\s*\[)\s*.*?\s*(\]\s*\})/$1$count$2\n$idx_items_json\n      $3/s);
die "index.html ItemList substitution matched $n3 times (expected 1)\n" unless $n3 == 1;

# "The newest lessons" preview grid (3 cards, most recently *published*
# topic first — datePublished is the earliest git commit across a
# topic's band files, i.e. when it was first added to the site) and the
# "See all N lessons" count. Both used to be hand-typed and both had
# already gone stale (a since-added topic wasn't in the 3, and the count
# still said 13 lessons ago) — regenerated here so that can't recur.

my @by_newest = sort { ($b->{datePublished} // '') cmp ($a->{datePublished} // '') } @topics;
my @newest3 = @by_newest[0 .. (scalar(@by_newest) >= 3 ? 2 : $#by_newest)];
my @PREF_BAND_ORDER = ('14-21', '21-plus', '11-14', '8-11', '5-8');

my @newest_cards;
for my $t (@newest3) {
  my $band_info;
  for my $pref (@PREF_BAND_ORDER) {
    ($band_info) = grep { $_->{band} eq $pref } @{ $t->{bands} };
    last if $band_info;
  }
  $band_info ||= $t->{bands}[0];
  push @newest_cards, qq{      <a href="$t->{landingUrl}" class="topic-card reveal">\n        <h3>@{[ esc($t->{title}) ]}</h3>\n        <span class="tag">@{[ esc($t->{hook}) ]}</span>\n        <span class="meta">@{[ esc($band_info->{timeDisplay}) ]}</span>\n      </a>};
}
my $newest_html = join("\n", @newest_cards);

my $n4 = ($idx =~ s/(<!-- NEWEST_LESSONS_START:.*?-->).*?(\s*<!-- NEWEST_LESSONS_END -->)/$1\n$newest_html\n      $2/s);
die "index.html NEWEST_LESSONS substitution matched $n4 times (expected 1)\n" unless $n4 == 1;

my $n5 = ($idx =~ s/(<!-- SEE_ALL_COUNT_START -->)See all \d+ lessons(<!-- SEE_ALL_COUNT_END -->)/$1See all $count lessons$2/);
die "index.html SEE_ALL_COUNT substitution matched $n5 times (expected 1)\n" unless $n5 == 1;

write_file($INDEX, $idx);
print "index.html ItemList + newest-lessons grid updated: $count topics.\n";

# Note: sitemap.xml is no longer touched here. build-lessons.pl now
# regenerates it fully on every run (with real per-page lastmod dates
# from git history), so there's only one place that owns it. This
# script still must run *after* build-lessons.pl, same as before —
# it reads assets/data/lessons-manifest.json, which build-lessons.pl
# is what produces it.
