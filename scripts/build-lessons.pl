#!/usr/bin/perl
#
# Static site generator for age-banded lesson pages.
#
# Reads content/lessons/<topic>/<band>.md (markdown + frontmatter — the
# data layer described in BUILD-BRIEF.md section 6.5) and generates:
#   - lessons/<band>/<slug>.html      one page per age-band version
#   - lessons/<slug>.html             a topic landing page listing the
#                                      age versions that actually exist
#   - assets/data/lessons-manifest.json   enumeration used by client JS
#     (the age chooser, the Lessons grid, the nav switcher)
#   - sitemap.xml and llms.txt, regenerated fresh every run
#
# Then automatically runs update-lessons-page.pl, which regenerates the
# static /lessons browse grid and the homepage's ItemList schema from
# that same manifest — see that script's header for why this step can't
# be optional. This one command is the whole build; nothing else to run.
#
# core-model.md is reference scaffolding for lesson authors and is never
# rendered. A topic only gets pages for the bands that have a file — see
# BUILD-BRIEF.md section 4.1, "enumerate what actually exists."
#
# Run: perl scripts/build-lessons.pl
#
use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use File::Path qw(make_path);
use Cwd qw(abs_path);
use POSIX qw(strftime);

binmode(STDOUT, ':encoding(UTF-8)');
binmode(STDERR, ':encoding(UTF-8)');

my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $CONTENT_DIR = "$ROOT/content/lessons";
my $LESSONS_OUT = "$ROOT/lessons";
my $DATA_OUT    = "$ROOT/assets/data";
my $SITE_ORIGIN = "https://www.spirituallessonplans.org";

my @BAND_ORDER = ('5-8', '8-11', '11-14', '14-21', '21-plus');

my %BAND_LABEL = (
  '5-8'    => "Early Elementary (K\x{2013}2)",
  '8-11'   => "Upper Elementary (Grades 3\x{2013}5)",
  '11-14'  => "Middle School (Grades 6\x{2013}8)",
  '14-21'  => "Teen & Early College",
  '21-plus'=> "College Student & Adult (21+)",
);

my %BAND_SHORT = (
  '5-8'    => "5\x{2013}8",
  '8-11'   => "8\x{2013}11",
  '11-14'  => "11\x{2013}14",
  '14-21'  => "14\x{2013}21",
  '21-plus'=> "21+",
);

# One of the palette accents per band (all already defined as CSS custom
# properties in assets/css/style.css) — used for the corner-ribbon badge.
my %BAND_ACCENT = (
  '5-8'    => 'gold',
  '8-11'   => 'sky',
  '11-14'  => 'sage',
  '14-21'  => 'dusk',
  '21-plus'=> 'gold-deep',
);

my @MONTH_NAMES = qw(January February March April May June July August September October November December);

my %BAND_TYPICAL_AGE = (
  '5-8'    => '5-8',
  '8-11'   => '8-11',
  '11-14'  => '11-14',
  '14-21'  => '14-21',
  '21-plus'=> '21-',
);

# ---------------------------------------------------------------------
# File helpers
# ---------------------------------------------------------------------

sub read_file {
  my ($path) = @_;
  open(my $fh, '<:encoding(UTF-8)', $path) or die "Can't read $path: $!";
  local $/;
  my $content = <$fh>;
  close $fh;
  return $content;
}

sub write_file {
  my ($path, $content) = @_;
  make_path(dirname($path));
  open(my $fh, '>:encoding(UTF-8)', $path) or die "Can't write $path: $!";
  print $fh $content;
  close $fh;
}

# (published, modified) ISO dates for a file, from its git history — real
# freshness signal that can never go stale by hand. A brand-new file with no
# commit yet (mid-authoring, before the first commit) falls back to today
# for both; it picks up real history automatically on the next build after
# it's committed.
sub git_dates {
  my ($path) = @_;
  my $rel = $path;
  $rel =~ s/^\Q$ROOT\E\///;
  my $today = strftime('%Y-%m-%d', localtime);
  my $log = `cd "$ROOT" && git log --follow --format=%aI -- "$rel" 2>/dev/null`;
  my @dates = grep { length } split /\n/, $log;
  return ($today, $today) unless @dates;
  my $modified  = substr($dates[0], 0, 10);
  my $published = substr($dates[-1], 0, 10);
  return ($published, $modified);
}

# ---------------------------------------------------------------------
# Frontmatter + markdown parsing
# ---------------------------------------------------------------------

sub parse_frontmatter {
  my ($raw) = @_;
  die "Missing frontmatter" unless $raw =~ /\A---\s*\n(.*?)\n---\s*\n(.*)\z/s;
  my ($fm_text, $body) = ($1, $2);
  my %meta;
  for my $line (split /\n/, $fm_text) {
    next unless $line =~ /^([A-Za-z0-9_]+):\s*(.*)$/;
    my ($key, $val) = ($1, $2);
    $val =~ s/^\s+|\s+$//g;
    $meta{$key} = $val;
  }
  return (\%meta, $body);
}

# Smart typography: straight quotes/apostrophes -> curly. Lookahead on the
# next character (word char = opening, anything else = closing) rather than
# lookbehind, since quotes in this content are often immediately followed
# by markup (</em>, a closing paren) rather than plain prose.
sub smarten {
  my ($s) = @_;
  $s =~ s/(\w)'(\w)/$1\x{2019}$2/g;      # contraction: don't -> don’t
  $s =~ s/'(?=\w)/\x{2018}/g;             # opening single
  $s =~ s/'/\x{2019}/g;                   # closing single / trailing
  $s =~ s/"(?=\w)/\x{201C}/g;             # opening double
  $s =~ s/"/\x{201D}/g;                   # closing double
  return $s;
}

sub escape_html {
  my ($s) = @_;
  $s =~ s/&/&amp;/g;
  $s =~ s/</&lt;/g;
  $s =~ s/>/&gt;/g;
  return $s;
}

# Inline formatting: escape and smarten quotes on the plain text FIRST,
# then convert **bold**, *italic*, [text](url) — in that order, so the
# straight quotes inside a generated href="..." attribute never get
# smartened along with the prose.
sub inline_html {
  my ($s) = @_;
  $s = escape_html($s);
  $s = smarten($s);
  $s =~ s/\[([^\]]+)\]\(([^)]+)\)/<a href="$2">$1<\/a>/g;
  $s =~ s/\*\*(.+?)\*\*/<strong>$1<\/strong>/g;
  $s =~ s/\*(.+?)\*/<em>$1<\/em>/g;
  return $s;
}

# Convert a markdown block (paragraphs / lists / blockquotes, blank-line
# separated) to HTML. Used for section and beat bodies.
sub markdown_block_to_html {
  my ($text) = @_;
  $text =~ s/^\s+|\s+$//g;
  return '' unless length $text;

  my @blocks = split /\n\s*\n/, $text;
  my @out;

  for my $block (@blocks) {
    my @lines = split /\n/, $block;
    @lines = grep { length($_) } map { my $l = $_; $l =~ s/\s+$//; $l } @lines;
    next unless @lines;

    if (@lines >= 2 && $lines[0] =~ /^\|.*\|\s*$/ && $lines[1] =~ /^\|(?:[\s:-]+\|)+\s*$/) {
      # GFM-style pipe table: header row, separator row, then data rows.
      my @rows = @lines;
      my $header = shift @rows;
      shift @rows; # separator row
      my @head_cells = map { inline_html($_) } split_table_row($header);
      my $thead = '<thead><tr>' . join('', map { "<th>$_</th>" } @head_cells) . '</tr></thead>';
      my @body_html;
      for my $row (@rows) {
        my @cells = map { inline_html($_) } split_table_row($row);
        push @body_html, '<tr>' . join('', map { "<td>$_</td>" } @cells) . '</tr>';
      }
      my $tbody = '<tbody>' . join('', @body_html) . '</tbody>';
      push @out, qq{<div class="table-wrap"><table class="content-table">$thead$tbody</table></div>};
      next;
    }

    if (@lines == grep { /^>\s?/ } @lines) {
      # Blockquote: strip '>', join, split off trailing "— Citation".
      my $joined = join(' ', map { my $l = $_; $l =~ s/^>\s?//; $l } @lines);
      my ($quote, $cite) = ($joined, '');
      if ($joined =~ /^(.*\S)\s+\x{2014}\s+(.+)$/ || $joined =~ /^(.*\S)\s+--\s+(.+)$/) {
        ($quote, $cite) = ($1, $2);
      }
      push @out, '<p><em>' . inline_html($quote) . '</em></p>';
      push @out, '<p class="citation">' . inline_html($cite) . '</p>' if length $cite;
      next;
    }

    if (@lines == grep { /^-\s+/ } @lines) {
      my @items = map { my $l = $_; $l =~ s/^-\s+//; inline_html($l) } @lines;
      push @out, '<ul class="list-clean">' . join('', map { "<li>$_</li>" } @items) . '</ul>';
      next;
    }

    if (@lines == grep { /^\d+\.\s+/ } @lines) {
      my @items = map { my $l = $_; $l =~ s/^\d+\.\s+//; inline_html($l) } @lines;
      push @out, '<ol class="list-clean list-numbered">' . join('', map { "<li>$_</li>" } @items) . '</ol>';
      next;
    }

    # Plain paragraph (may itself be multi-line prose).
    my $para = join(' ', @lines);
    push @out, '<p>' . inline_html($para) . '</p>';
  }

  return join("\n", @out);
}

# Split one GFM pipe-table row ("| a | b |") into trimmed cell strings.
sub split_table_row {
  my ($line) = @_;
  $line =~ s/^\s*\|//;
  $line =~ s/\|\s*$//;
  return map { my $c = $_; $c =~ s/^\s+|\s+$//g; $c } split /\|/, $line;
}

# Split a lesson body into its ## sections, keyed by heading text.
sub split_sections {
  my ($body) = @_;
  my %sections;
  my @order;
  my @parts = split /^##\s+(.+?)\s*$/m, $body;
  shift @parts if defined $parts[0] && $parts[0] !~ /\S/; # leading empty chunk before first heading
  while (@parts >= 2) {
    my ($heading, $content) = (shift @parts, shift @parts);
    $sections{$heading} = $content;
    push @order, $heading;
  }
  return (\%sections, \@order);
}

# Split "The lesson flow" section into beats on ### headings.
sub split_beats {
  my ($content) = @_;
  my @beats;
  my @parts = split /^###\s+(.+?)\s*$/m, $content;
  shift @parts if defined $parts[0] && $parts[0] !~ /\S/;
  while (@parts >= 2) {
    my ($heading, $body) = (shift @parts, shift @parts);
    my ($num, $time, $title);
    if ($heading =~ /^Beat\s+(\d+)\s*\(~([^)]+)\)\s*\x{2014}\s*(.+)$/) {
      ($num, $time, $title) = ($1, $2, $3);
    } elsif ($heading =~ /^Beat\s+(\d+)\s*\(~([^)]+)\)\s*--\s*(.+)$/) {
      ($num, $time, $title) = ($1, $2, $3);
    } else {
      ($num, $time, $title) = ('', '', $heading);
    }
    push @beats, { num => $num, time => $time, title => $title, html => markdown_block_to_html($body) };
  }
  return \@beats;
}

# ---------------------------------------------------------------------
# Load all topics/bands
# ---------------------------------------------------------------------

opendir(my $dh, $CONTENT_DIR) or die "Can't open $CONTENT_DIR: $!";
my @topic_dirs = sort grep { -d "$CONTENT_DIR/$_" && $_ !~ /^\./ } readdir($dh);
closedir($dh);

my @manifest_topics;

for my $topic (@topic_dirs) {
  my $topic_dir = "$CONTENT_DIR/$topic";
  my @bands;

  for my $band (@BAND_ORDER) {
    my $file = "$topic_dir/$band.md";
    next unless -f $file;
    my ($meta, $body) = parse_frontmatter(read_file($file));
    my ($sections) = split_sections($body);
    my ($published, $modified) = git_dates($file);
    push @bands, { band => $band, meta => $meta, sections => $sections,
                    dates => { published => $published, modified => $modified } };
  }

  unless (@bands) {
    print "skip $topic (no age-band files found)\n";
    next;
  }

  for my $b (@bands) {
    render_lesson_page($topic, $b, \@bands);
  }
  render_topic_landing($topic, \@bands);

  my $preferred = preferred_band_meta(\@bands);
  my @modified_dates  = map { $_->{dates}{modified} } @bands;
  my @published_dates = map { $_->{dates}{published} } @bands;
  my ($topic_modified)  = sort { $b cmp $a } @modified_dates;   # max (most recent)
  my ($topic_published) = sort { $a cmp $b } @published_dates;  # min (earliest)
  push @manifest_topics, {
    slug => $topic,
    title => $preferred->{title},
    hook => $preferred->{hook},
    topic_category => $preferred->{topic},
    dates => { published => $topic_published, modified => $topic_modified },
    bands => [ map { {
      band => $_->{band},
      label => $BAND_LABEL{$_->{band}},
      short => $BAND_SHORT{$_->{band}},
      time_display => $_->{meta}{time_display},
      title => $_->{meta}{title},
      hook => $_->{meta}{hook},
      url => "/lessons/$_->{band}/$topic",
      dates => $_->{dates},
    } } @bands ],
    landing_url => "/lessons/$topic",
  };

  print "built $topic: " . join(', ', map { $_->{band} } @bands) . "\n";
}

write_manifest(\@manifest_topics);
write_sitemap(\@manifest_topics);
write_llms_txt(\@manifest_topics);

print "\nDone. " . scalar(@manifest_topics) . " topic(s) built.\n";

# ---------------------------------------------------------------------
# Chain straight into update-lessons-page.pl. This used to be a separate
# manual step, and forgetting it is exactly how a new lesson went live —
# directly linkable, in the manifest, in the sitemap — while staying
# invisible on the /lessons browse grid and out of the homepage's
# ItemList, because those are pre-rendered HTML, not client-rendered
# from the manifest. Running it automatically here means a plain
# `perl scripts/build-lessons.pl` can never again leave that step undone.
# ---------------------------------------------------------------------

my $update_script = "$ROOT/scripts/update-lessons-page.pl";
print "\nRunning update-lessons-page.pl...\n";
system($^X, $update_script);
if ($? != 0) {
  die "update-lessons-page.pl failed (exit code @{[ $? >> 8 ]}) — lessons.html and index.html " .
      "may not reflect the topics just built. Fix the error above and re-run this script.\n";
}

# ---------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------

sub nav_html {
  my ($current) = @_;
  my %labels = (home => 'Home', lessons => 'Lessons', mentors => 'For Mentors', believe => 'What We Believe', about => 'About');
  my %hrefs  = (home => '/', lessons => '/lessons', mentors => '/for-mentors', believe => '/what-we-believe', about => '/about');
  my @order = qw(home lessons mentors believe about);
  my $links = '';
  for my $key (@order) {
    my $current_attr = ($key eq $current) ? ' aria-current="page"' : '';
    $links .= qq{      <li><a href="$hrefs{$key}"$current_attr>$labels{$key}</a></li>\n};
  }
  return <<"NAV";
<nav class="site-nav" aria-label="Main">
  <div class="wrap">
    <a href="/" class="brand">Spiritual <strong>Lesson Plans</strong></a>
    <button class="age-switcher" type="button" data-age-switcher hidden>
      <span class="age-switcher-label">Teaching</span>
      <span class="age-switcher-value" data-age-switcher-value>&mdash;</span>
    </button>
    <button class="lang-switcher" type="button" data-lang-switcher aria-haspopup="true" aria-expanded="false">
      <span class="lang-switcher-icon" aria-hidden="true">&#127760;</span>
      <span class="lang-switcher-label">Language</span>
    </button>
    <button class="nav-toggle" aria-label="Toggle navigation" aria-expanded="false" aria-controls="primary-nav">&#9776;</button>
    <ul class="nav-links" id="primary-nav">
$links      <li class="nav-age-item"><a href="/lessons" data-mobile-age-link><span class="nav-age-label">Teaching</span><span data-mobile-age-value>Choose your age group</span></a></li>
      <li class="nav-lang-item"><button type="button" class="nav-lang-trigger" data-lang-switcher><span class="nav-lang-label">Language</span><span>Pick yours &mdash; all are welcome</span></button></li>
    </ul>
  </div>
</nav>
NAV
}

sub footer_html {
  return <<'FOOTER';
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <p class="footer-note"><strong>A free, open resource.</strong>No account, no cost, no organization behind it.</p>
      <ul class="footer-links">
        <li><a href="/lessons">Lessons</a></li>
        <li><a href="/for-mentors">For Mentors</a></li>
        <li><a href="/what-we-believe">What We Believe</a></li>
        <li><a href="/about">About</a></li>
      </ul>
    </div>
    <div class="footer-bottom">
      <p>This website and all lesson plans are offered in a spirit of love and growth for all. They are independently created and are not affiliated with or endorsed by any Christian Science branch church or The First Church of Christ, Scientist, in Boston, MA, and are shared under a Creative Commons CC BY-SA 4.0.</p>
      <div class="footer-utility">
        <a class="cc-badge" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="license noopener">CC BY-SA 4.0</a>
      </div>
    </div>
  </div>
</footer>

<button class="feedback-btn" type="button">Feedback</button>
<div class="feedback-overlay" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
  <div class="feedback-modal">
    <button class="feedback-close" type="button" aria-label="Close">&times;</button>
    <h3 id="feedback-title">Got a question, or something's off?</h3>
    <p class="lead">Tell us anything &mdash; confused by a lesson, found a bug, or just want to say hi. We read every one of these.</p>
    <form class="feedback-form">
      <div class="feedback-field">
        <label for="fb-kind">What's this about?</label>
        <select id="fb-kind" name="kind">
          <option value="Question">I have a question</option>
          <option value="Confused">Something confused me</option>
          <option value="Not happy">I'm not happy about something</option>
          <option value="Idea">I have an idea</option>
          <option value="Just saying hi">Just saying hi</option>
        </select>
      </div>
      <div class="feedback-field">
        <label for="fb-message">Your message</label>
        <textarea id="fb-message" name="message" required placeholder="Say as much or as little as you'd like."></textarea>
      </div>
      <div class="feedback-field">
        <label for="fb-from">Your email (optional, if you want a reply)</label>
        <input id="fb-from" name="from" type="email" placeholder="you@example.com">
      </div>
      <button type="submit" class="btn btn-gold" style="width:100%; justify-content:center;">Send it</button>
    </form>
  </div>
</div>

<div class="cookie-banner" id="cookie-banner">
  <p>This site does not track you. If you use the language switcher in the header, Google powers it and may set its own cookies to do so.</p>
  <button class="btn btn-gold" id="cookie-accept" type="button">Got it</button>
</div>

<script src="/assets/js/main.js"></script>
<script src="/assets/js/age-context.js"></script>
FOOTER
}

sub head_common {
  my (%a) = @_; # title, description, canonical, extra_schema
  return <<"HEAD";
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$a{title}</title>
<meta name="description" content="$a{description}">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1">
<meta name="msvalidate.01" content="986E29A0E95491E5807A1C79248D0406" />
<link rel="canonical" href="$a{canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Spiritual Lesson Plans">
<meta property="og:url" content="$a{canonical}">
<meta property="og:title" content="$a{title}">
<meta property="og:description" content="$a{description}">
<meta property="og:image" content="$SITE_ORIGIN/assets/img/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Spiritual Lesson Plans">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="$a{title}">
<meta name="twitter:description" content="$a{description}">
<meta name="twitter:image" content="$SITE_ORIGIN/assets/img/og-image.png">
<meta name="twitter:image:alt" content="Spiritual Lesson Plans">
<meta name="theme-color" content="#FFFFFF">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%23E8A94C%22/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght\@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght\@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/style.css">
<script>document.documentElement.className += ' js';</script>
$a{extra_schema}
HEAD
}

sub render_lesson_page {
  my ($topic, $b, $all_bands) = @_;
  my $band = $b->{band};
  my $m = $b->{meta};
  my $s = $b->{sections};

  my $title_tag = "$m->{title} \x{2014} Spiritual Lesson Plans";
  my $desc = inline_strip($m->{hook} // '');
  my $canonical = "$SITE_ORIGIN/lessons/$band/$topic";
  my $band_label = $BAND_LABEL{$band};

  my $assumptions_know = markdown_block_to_html($s->{'What you should know'} // '');
  my $assumptions_assume = markdown_block_to_html($s->{"What we're assuming"} // '');
  my $goals_html = markdown_block_to_html($s->{'Learning goals'} // '');
  my $hold_room_html = markdown_block_to_html($s->{'How to hold the room'} // '');
  my $needs_html = markdown_block_to_html($s->{"What you'll need"} // '');
  my $safety_html = markdown_block_to_html($s->{"If it's not going well"} // '');
  my $beats = split_beats($s->{'The lesson flow'} // '');

  my $beats_html = '';
  my $step_n = 0;
  for my $beat (@$beats) {
    $step_n++;
    my $num_display = length($beat->{num}) ? $beat->{num} : $step_n;
    my $time_html = length($beat->{time}) ? qq{<span class="flow-step-time">~$beat->{time}</span>} : '';
    $beats_html .= <<"STEP";
    <div class="flow-step reveal">
      <div class="flow-step-num">$num_display</div>
      <div class="flow-step-body">
        $time_html
        <h3>@{[ inline_html($beat->{title}) ]}</h3>
        $beat->{html}
      </div>
    </div>
STEP
  }

  # Other bands available for this same topic, for the on-page switcher.
  my $switcher_items = '';
  for my $other (@$all_bands) {
    next if $other->{band} eq $band;
    my $ob = $other->{band};
    $switcher_items .= qq{<a href="/lessons/$ob/$topic" class="band-pill" data-band="$ob">@{[ $BAND_SHORT{$ob} ]} &middot; @{[ $BAND_LABEL{$ob} ]}</a>};
  }
  my $switcher_html = length($switcher_items)
    ? qq{<div class="lesson-band-switcher reveal"><span class="lesson-band-switcher-label">Also built for:</span>$switcher_items</div>}
    : '';

  my $schema = build_lesson_schema($topic, $band, $m, $desc, $canonical, $b->{dates});

  my $head = head_common(
    title => $title_tag,
    description => $desc,
    canonical => $canonical,
    extra_schema => $schema,
  );
  my $nav = nav_html('lessons');
  my $footer = footer_html();

  my $html = <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
$head</head>
<body data-age-band="$band">
<a class="skip-link" href="#main">Skip to main content</a>

$nav
<main id="main" tabindex="-1">

<header class="page-hero lesson-hero">
  <div class="wrap">
    <p class="eyebrow">A lesson &middot; <a href="/lessons/$topic">@{[ inline_html($m->{title}) ]}</a></p>
    <span class="age-badge age-badge-@{[ $BAND_ACCENT{$band} ]}">$band_label</span>
    <h1>@{[ inline_html($m->{title}) ]}</h1>
    <p>@{[ inline_html($m->{hook} // '') ]}</p>
    <div class="lesson-meta">
      <div class="lesson-meta-item"><span class="label">Time</span><span class="value">$m->{time_display}</span></div>
      <div class="lesson-meta-item"><span class="label">Group</span><span class="value">$m->{group_display}</span></div>
      <div class="lesson-meta-item"><span class="label">Age</span><span class="value">$band_label</span></div>
      <div class="lesson-meta-item"><span class="label">Format</span><span class="value">$m->{format_display}</span></div>
      <div class="lesson-meta-item"><span class="label">Updated</span><span class="value">@{[ format_date_human($b->{dates}{modified}) ]}</span></div>
    </div>
    $switcher_html
  </div>
</header>

<section class="lesson-section">
  <div class="wrap">
    <div class="callout-assumptions reveal">
      <p class="eyebrow">Assumptions &amp; Caveats</p>
      <h2 class="mt-0">Before you begin</h2>
      <div class="assumptions-grid">
        <div class="assumptions-block">
          <h3>What you should know</h3>
          $assumptions_know
        </div>
        <div class="assumptions-block">
          <h3>What we're assuming</h3>
          $assumptions_assume
        </div>
      </div>
    </div>
  </div>
</section>

<section class="lesson-section">
  <div class="wrap">
    <p class="eyebrow">Learning goals</p>
    <h2>What they walk away with</h2>
    $goals_html
  </div>
</section>

<section class="lesson-section">
  <div class="wrap">
    <p class="eyebrow">How to hold the room</p>
    <h2>Before you start talking</h2>
    $hold_room_html
  </div>
</section>

<section class="lesson-section">
  <div class="wrap">
    <p class="eyebrow">The lesson flow</p>
    <h2 style="margin-bottom: 8px;">Step by step</h2>
    <p class="text-muted" style="max-width: 640px; margin-bottom: 8px;">Each beat alternates a little input, a little doing, and a little reflecting. Skip, slow down, or stretch any of these to fit your group.</p>
$beats_html  </div>
</section>

<section class="lesson-section">
  <div class="wrap">
    <p class="eyebrow">What you'll need</p>
    <h2>The materials</h2>
    $needs_html
  </div>
</section>

<section class="lesson-section">
  <div class="wrap">
    <p class="eyebrow">If it's not going well</p>
    <h2>When this one gets heavy</h2>
    <div class="safety-note reveal">
      $safety_html
      <p>For the fuller tiered guidance &mdash; including what to do if someone discloses something serious &mdash; see <a href="/for-mentors">For Mentors</a>.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="callout reveal">
      <p class="eyebrow">Help this get better</p>
      <h2>Teaching this to a group we haven't planned for?</h2>
      <p>Tell us &mdash; this only gets better with your eyes on it. We read every one of these.</p>
      <button class="btn btn-outline feedback-btn-inline" type="button" data-open-feedback data-feedback-context="$m->{title} &middot; $band_label">Give feedback on this lesson</button>
    </div>
  </div>
</section>

</main>

$footer</body>
</html>
HTML

  write_file("$LESSONS_OUT/$band/$topic.html", $html);
}

sub preferred_band_meta {
  my ($bands) = @_;
  my %by_band = map { $_->{band} => $_->{meta} } @$bands;
  # A few lessons use a different, more concrete title for the youngest
  # bands (e.g. "The Toy We Both Want" at 5-8 vs. "Finding the Bigger
  # 'Us'" at 11-14+) — prefer a band whose title reads naturally as the
  # topic's general-audience name for anything landing-page-level.
  for my $band ('14-21', '21-plus', '11-14', '8-11', '5-8') {
    return $by_band{$band} if $by_band{$band};
  }
  return $bands->[0]{meta};
}

sub render_topic_landing {
  my ($topic, $bands) = @_;
  my $m0 = preferred_band_meta($bands);
  my $title_tag = "$m0->{title} \x{2014} Spiritual Lesson Plans";
  my $desc = inline_strip($m0->{hook} // '');
  my $canonical = "$SITE_ORIGIN/lessons/$topic";

  my $cards = '';
  for my $b (@$bands) {
    my $band = $b->{band};
    $cards .= <<"CARD";
      <a href="/lessons/$band/$topic" class="topic-card reveal" data-band="$band">
        <span class="age-badge age-badge-@{[ $BAND_ACCENT{$band} ]}">@{[ $BAND_LABEL{$band} ]}</span>
        <h3>@{[ inline_html($b->{meta}{title}) ]}</h3>
        <span class="tag">@{[ inline_html($b->{meta}{hook} // '') ]}</span>
        <span class="meta">$b->{meta}{time_display}</span>
      </a>
CARD
  }

  my $schema = build_topic_schema($topic, $m0, $desc, $canonical, $bands);
  my $head = head_common(title => $title_tag, description => $desc, canonical => $canonical, extra_schema => $schema);
  my $nav = nav_html('lessons');
  my $footer = footer_html();

  my $html = <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
$head</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>

$nav
<main id="main" tabindex="-1">

<header class="page-hero">
  <div class="wrap">
    <p class="eyebrow">A lesson, built for @{[ scalar(@$bands) ]} age @{[ scalar(@$bands) == 1 ? 'group' : 'groups' ]}</p>
    <h1>@{[ inline_html($m0->{title}) ]}</h1>
    <p>@{[ inline_html($m0->{hook} // '') ]} Pick the age you're teaching &mdash; each version is written from the ground up for how that age actually thinks, not just simplified from another one.</p>
  </div>
</header>

<section>
  <div class="wrap">
    <div class="topic-grid" data-topic-band-picker>
$cards    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="callout reveal">
      <p class="eyebrow">More on the way</p>
      <h2>Keep exploring</h2>
      <p>New lessons and new age versions get added over time &mdash; not sorted into fixed categories, just built and shared as they're ready.</p>
      <a href="/lessons" class="btn btn-outline">See all lessons</a>
    </div>
  </div>
</section>

</main>

$footer</body>
</html>
HTML

  write_file("$LESSONS_OUT/$topic.html", $html);
}

sub build_lesson_schema {
  my ($topic, $band, $m, $desc, $canonical, $dates) = @_;
  my $time_iso = 'PT' . ($m->{time_minutes} || 45) . 'M';
  my $typical_age = $BAND_TYPICAL_AGE{$band};
  $dates //= {};
  my $published = $dates->{published} || strftime('%Y-%m-%d', localtime);
  my $modified  = $dates->{modified}  || $published;
  return <<"SCHEMA";
<script type="application/ld+json">
{
  "\@context": "https://schema.org",
  "\@type": "LearningResource",
  "name": "@{[ json_escape($m->{title}) ]}",
  "description": "@{[ json_escape($desc) ]}",
  "url": "$canonical",
  "educationalUse": ["Sunday School", "youth group", "mentoring session", "small group discussion"],
  "typicalAgeRange": "$typical_age",
  "isFamilyFriendly": true,
  "interactivityType": "active",
  "learningResourceType": "Lesson Plan",
  "audience": { "\@type": "EducationalAudience", "educationalRole": "mentor" },
  "timeRequired": "$time_iso",
  "datePublished": "$published",
  "dateModified": "$modified",
  "inLanguage": "en",
  "isAccessibleForFree": true,
  "license": "https://creativecommons.org/licenses/by-sa/4.0/",
  "provider": { "\@type": "EducationalOrganization", "name": "Spiritual Lesson Plans", "url": "$SITE_ORIGIN/" }
}
</script>
<script type="application/ld+json">
{
  "\@context": "https://schema.org",
  "\@type": "BreadcrumbList",
  "itemListElement": [
    { "\@type": "ListItem", "position": 1, "name": "Home", "item": "$SITE_ORIGIN/" },
    { "\@type": "ListItem", "position": 2, "name": "Lessons", "item": "$SITE_ORIGIN/lessons" },
    { "\@type": "ListItem", "position": 3, "name": "@{[ json_escape($m->{title}) ]}", "item": "$SITE_ORIGIN/lessons/$topic" },
    { "\@type": "ListItem", "position": 4, "name": "@{[ json_escape($BAND_LABEL{$band}) ]}", "item": "$canonical" }
  ]
}
</script>
SCHEMA
}

sub build_topic_schema {
  my ($topic, $m0, $desc, $canonical, $bands) = @_;
  my $items = join(",\n", map {
    my $b = $_->{band};
    qq{    { "\@type": "ListItem", "url": "$SITE_ORIGIN/lessons/$b/$topic", "name": "@{[ json_escape($BAND_LABEL{$b}) ]}" }}
  } @$bands);
  return <<"SCHEMA";
<script type="application/ld+json">
{
  "\@context": "https://schema.org",
  "\@graph": [
    {
      "\@type": "CollectionPage",
      "url": "$canonical",
      "name": "@{[ json_escape($m0->{title}) ]}",
      "description": "@{[ json_escape($desc) ]}",
      "inLanguage": "en",
      "isAccessibleForFree": true,
      "license": "https://creativecommons.org/licenses/by-sa/4.0/"
    },
    {
      "\@type": "BreadcrumbList",
      "itemListElement": [
        { "\@type": "ListItem", "position": 1, "name": "Home", "item": "$SITE_ORIGIN/" },
        { "\@type": "ListItem", "position": 2, "name": "Lessons", "item": "$SITE_ORIGIN/lessons" },
        { "\@type": "ListItem", "position": 3, "name": "@{[ json_escape($m0->{title}) ]}", "item": "$canonical" }
      ]
    },
    {
      "\@type": "ItemList",
      "name": "Age versions of @{[ json_escape($m0->{title}) ]}",
      "itemListElement": [
$items
      ]
    }
  ]
}
</script>
SCHEMA
}

sub write_manifest {
  my ($topics) = @_;
  my @lines;
  push @lines, '{';
  push @lines, '  "bandOrder": [' . join(', ', map { qq{"$_"} } @BAND_ORDER) . '],';
  push @lines, '  "bandLabels": {';
  push @lines, join(",\n", map { qq{    "$_": "@{[ json_escape($BAND_LABEL{$_}) ]}"} } @BAND_ORDER);
  push @lines, '  },';
  push @lines, '  "topics": [';
  my @topic_json;
  for my $t (@$topics) {
    my @band_json;
    for my $b (@{ $t->{bands} }) {
      push @band_json, "      { \"band\": \"$b->{band}\", \"label\": \"@{[ json_escape($b->{label}) ]}\", \"short\": \"@{[ json_escape($b->{short}) ]}\", \"timeDisplay\": \"@{[ json_escape($b->{time_display} // '') ]}\", \"title\": \"@{[ json_escape($b->{title}) ]}\", \"hook\": \"@{[ json_escape($b->{hook} // '') ]}\", \"url\": \"$b->{url}\" }";
    }
    push @topic_json, "    {\n      \"slug\": \"$t->{slug}\",\n      \"title\": \"@{[ json_escape($t->{title}) ]}\",\n      \"hook\": \"@{[ json_escape($t->{hook} // '') ]}\",\n      \"topicCategory\": \"@{[ json_escape($t->{topic_category} // '') ]}\",\n      \"landingUrl\": \"$t->{landing_url}\",\n      \"datePublished\": \"@{[ $t->{dates}{published} // '' ]}\",\n      \"dateModified\": \"@{[ $t->{dates}{modified} // '' ]}\",\n      \"bands\": [\n" . join(",\n", @band_json) . "\n      ]\n    }";
  }
  push @lines, join(",\n", @topic_json);
  push @lines, '  ]';
  push @lines, '}';
  write_file("$DATA_OUT/lessons-manifest.json", join("\n", @lines) . "\n");
}

# Static top-level pages not produced by this script — hand-authored, but
# their lastmod is still pulled from real git history rather than typed in.
my @STATIC_PAGES = (
  { path => "$ROOT/index.html",           url => '/',              changefreq => 'weekly',  priority => '1.0' },
  { path => "$ROOT/lessons.html",         url => '/lessons',       changefreq => 'weekly',  priority => '0.9' },
  { path => "$ROOT/for-mentors.html",     url => '/for-mentors',   changefreq => 'monthly', priority => '0.6' },
  { path => "$ROOT/what-we-believe.html",url => '/what-we-believe',changefreq => 'monthly', priority => '0.6' },
  { path => "$ROOT/about.html",           url => '/about',         changefreq => 'monthly', priority => '0.5' },
);

sub xml_escape {
  my ($s) = @_;
  $s //= '';
  $s =~ s/&/&amp;/g;
  $s =~ s/</&lt;/g;
  $s =~ s/>/&gt;/g;
  return $s;
}

# sitemap.xml — regenerated on every build so <lastmod> reflects real git
# history and new lessons never require a manual edit here again.
sub write_sitemap {
  my ($topics) = @_;
  my @urls;

  for my $p (@STATIC_PAGES) {
    my (undef, $modified) = git_dates($p->{path});
    push @urls, { loc => "$SITE_ORIGIN$p->{url}", lastmod => $modified,
                  changefreq => $p->{changefreq}, priority => $p->{priority} };
  }

  for my $t (@$topics) {
    push @urls, { loc => "$SITE_ORIGIN$t->{landing_url}", lastmod => $t->{dates}{modified},
                  changefreq => 'monthly', priority => '0.8' };
    for my $b (@{ $t->{bands} }) {
      push @urls, { loc => "$SITE_ORIGIN$b->{url}", lastmod => $b->{dates}{modified},
                    changefreq => 'monthly', priority => '0.7' };
    }
  }

  my @lines = ('<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for my $u (@urls) {
    push @lines, "  <url><loc>@{[ xml_escape($u->{loc}) ]}</loc><lastmod>$u->{lastmod}</lastmod><changefreq>$u->{changefreq}</changefreq><priority>$u->{priority}</priority></url>";
  }
  push @lines, '</urlset>';
  write_file("$ROOT/sitemap.xml", join("\n", @lines) . "\n");
  print "wrote sitemap.xml (" . scalar(@urls) . " urls)\n";
}

# llms.txt — a small curated map of the site for AI agents/answer engines,
# per the llms.txt convention (https://llmstxt.org/). Regenerated every
# build from the same manifest data as everything else, so it can never
# drift out of date as lessons are added.
sub write_llms_txt {
  my ($topics) = @_;
  my @lines;
  push @lines, '# Spiritual Lesson Plans';
  push @lines, '';
  push @lines, '> Free, Creative Commons (CC BY-SA 4.0) Sunday school and youth-group lesson plans rooted in';
  push @lines, '> Christian Science and the Bible, explicitly open to every faith background. Each lesson is';
  push @lines, '> written independently for the age it\'s delivered to — not simplified down from one script —';
  push @lines, '> across five age bands from early elementary through adult, plus a printable handout per lesson.';
  push @lines, '';
  push @lines, 'Written for Christian Science Sunday school teachers and other Christian educators looking for';
  push @lines, 'free, spiritually grounded, developmentally appropriate discussion and activity lessons. No';
  push @lines, 'account, no cost, no organization — every lesson starts from the premise that a young person is';
  push @lines, 'already whole and already loved. All content is free to use, adapt, and share under CC BY-SA 4.0.';
  push @lines, '';
  push @lines, '## Lessons';
  push @lines, '';
  for my $t (sort { $a->{title} cmp $b->{title} } @$topics) {
    my $desc = inline_strip($t->{hook} // '');
    my @band_labels = map { $BAND_SHORT{$_->{band}} } @{ $t->{bands} };
    push @lines, "- [@{[ $t->{title} ]}]($SITE_ORIGIN$t->{landing_url}): $desc (" . join(', ', @band_labels) . ")";
  }
  push @lines, '';
  push @lines, '## Optional';
  push @lines, '';
  push @lines, "- [For Mentors]($SITE_ORIGIN/for-mentors): facilitator safety guidelines and how the age-band system works";
  push @lines, "- [What We Believe]($SITE_ORIGIN/what-we-believe): plain-language explainer on Christian Science, including how it differs from the doctrine of original sin";
  push @lines, "- [About]($SITE_ORIGIN/about): what this project is and its licensing";
  write_file("$ROOT/llms.txt", join("\n", @lines) . "\n");
  print "wrote llms.txt (" . scalar(@$topics) . " lessons)\n";
}

sub json_escape {
  my ($s) = @_;
  $s //= '';
  $s =~ s/\\/\\\\/g;
  $s =~ s/"/\\"/g;
  $s =~ s/\n/\\n/g;
  return $s;
}

# Strip markdown emphasis markers for plain-text contexts (meta description).
sub inline_strip {
  my ($s) = @_;
  $s //= '';
  $s =~ s/\*\*(.+?)\*\*/$1/g;
  $s =~ s/\*(.+?)\*/$1/g;
  $s = smarten($s);
  $s =~ s/"/&quot;/g;
  return $s;
}

# "2026-08-21" -> "August 21, 2026", for the human-visible "Updated" line.
sub format_date_human {
  my ($iso) = @_;
  return '' unless $iso && $iso =~ /^(\d{4})-(\d{2})-(\d{2})/;
  my ($y, $mo, $d) = ($1, $2, $3);
  $d =~ s/^0//;
  return "$MONTH_NAMES[$mo - 1] $d, $y";
}
