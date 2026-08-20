#!/usr/bin/perl
#
# Regenerates the age-band sections and the ItemList schema on lessons.html
# from assets/data/lessons-manifest.json. Run this after build-lessons.pl
# any time a topic's band coverage changes.
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
  $sections .= qq{    </div>\n};

  if (@cards) {
    $sections .= qq{    <div class="topic-grid">\n};
    for my $c (@cards) {
      my $t = $c->{topic};
      my $bi = $c->{band_info};
      $sections .= qq{      <a href="$bi->{url}" class="topic-card reveal">\n};
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

my $page = read_file($PAGE);
my $count_before = () = $page =~ /BAND_SECTIONS_START/g;
die "BAND_SECTIONS_START marker not found in $PAGE\n" unless $count_before;

my $n = ($page =~ s/(<!-- BAND_SECTIONS_START:.*?-->).*?(<!-- BAND_SECTIONS_END -->)/$1\n$sections\n$2/s);
die "Marker substitution matched $n times (expected 1) in $PAGE\n" unless $n == 1;

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

print "lessons.html updated: " . scalar(@topics) . " topics across " . scalar(@band_order) . " band sections.\n";

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

my $n3 = ($idx =~ s/("name":\s*"Spiritual lesson plans for teenagers",\s*"description":[^\n]*\n\s*"numberOfItems":\s*)\d+(,\s*"itemListOrder":[^\n]*\n\s*"itemListElement":\s*\[)\s*.*?\s*(\]\s*\})/$1$count$2\n$idx_items_json\n      $3/s);
die "index.html ItemList substitution matched $n3 times (expected 1)\n" unless $n3 == 1;

write_file($INDEX, $idx);
print "index.html ItemList updated: $count topics.\n";

# ---------------------------------------------------------------------
# sitemap.xml — every topic landing page + every age-band page, plus
# the site's non-lesson pages (kept as they already are in the file).
# ---------------------------------------------------------------------

my $SITEMAP = "$ROOT/sitemap.xml";
my $sitemap = read_file($SITEMAP);
my $today = `date +%Y-%m-%d`;
chomp $today;
$today ||= '2026-08-19';

my @lesson_urls;
for my $t (@topics) {
  push @lesson_urls, qq{  <url><loc>$SITE_ORIGIN$t->{landingUrl}</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>};
  for my $b (@{ $t->{bands} }) {
    push @lesson_urls, qq{  <url><loc>$SITE_ORIGIN$b->{url}</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>};
  }
}
my $lesson_urls_xml = join("\n", @lesson_urls);

if ($sitemap =~ s{(<url><loc>\Q$SITE_ORIGIN\E/lessons</loc>.*?</url>).*?(\n\s*<url><loc>\Q$SITE_ORIGIN\E/for-mentors</loc>)}{$1\n$lesson_urls_xml$2}s) {
  write_file($SITEMAP, $sitemap);
  print "sitemap.xml updated: " . scalar(@lesson_urls) . " lesson URLs.\n";
} else {
  warn "sitemap.xml: anchor pattern not found, left unchanged — check it by hand.\n";
}
