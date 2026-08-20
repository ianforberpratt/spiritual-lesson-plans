#!/usr/bin/perl
#
# Wraps each existing printable material SVG in assets/materials/<topic>/
# in a minimal print-ready HTML page, so it can be linked and downloaded
# as an HTML handout (rather than a bare .svg file with no chrome).
#
# Run: perl scripts/build-handout-wrappers.pl

use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use Cwd qw(abs_path);

binmode(STDOUT, ':encoding(UTF-8)');

my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $MATERIALS = "$ROOT/assets/materials";

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

# topic slug => [ [svg filename, title, back-link label], ... ]
my %ENTRIES = (
  'does-god-make-my-decisions' => [
    ['10-10-10-rule.svg', 'The 10-10-10 Rule'],
    ['whole-staircase.svg', "You Don't Need the Whole Staircase"],
  ],
  'finding-the-bigger-us' => [
    ['the-bigger-us.svg', 'The Bigger Us'],
    ['the-bridge-line.svg', 'The Bridge Line'],
  ],
  'is-regret-a-fair-teacher' => [
    ['six-stepping-stones.svg', 'Six Stepping Stones'],
  ],
  'learning-to-hear-the-nudge' => [
    ['static-or-signal.svg', 'Static, or Signal?'],
    ['nudge-log.svg', 'The Nudge Log'],
  ],
  'lgbtqia-youth-and-spiritual-learning' => [
    ['message-you-got-somewhere.svg', 'A Message You Got Somewhere'],
    ['what-this-looks-like-for-you.svg', 'What This Looks Like for You'],
  ],
  'lonely-in-a-crowded-room' => [
    ['write-it-down.svg', 'Write It Down'],
    ['three-steps-for-a-lonely-moment.svg', 'Three Steps for a Lonely Moment'],
  ],
  'off-days-are-allowed' => [
    ['both-things-are-true.svg', 'Both Things Are True'],
    ['permission-slip.svg', 'Permission Slip'],
  ],
  'talking-about-pornography-use' => [
    ['cloud-not-the-sun.svg', 'A Cloud, Not the Sun'],
    ['name-the-real-hunger.svg', 'Name the Real Hunger'],
  ],
  'trust-the-mover' => [
    ['main-character-energy.svg', 'Main Character Energy'],
    ['the-map-and-the-mover.svg', 'The Map and the Mover'],
  ],
  'when-someone-feels-like-the-enemy' => [
    ['two-dials.svg', 'Two Dials'],
  ],
  'words-that-open-doors' => [
    ['door-or-wall.svg', 'Door or Wall?'],
    ['translate-it.svg', 'Translate It'],
  ],
);

my $count = 0;
for my $topic (sort keys %ENTRIES) {
  for my $entry (@{ $ENTRIES{$topic} }) {
    my ($svg_file, $title) = @$entry;
    my $svg_path = "$MATERIALS/$topic/$svg_file";
    die "Missing $svg_path" unless -f $svg_path;
    my $svg = read_file($svg_path);
    $svg =~ s/^\s+|\s+$//g;

    my $slug = $svg_file;
    $slug =~ s/\.svg$//;
    my $out_path = "$MATERIALS/$topic/$slug.html";
    my $lesson_url = "/lessons/$topic";

    my $html = <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>$title \x{2014} Spiritual Lesson Plans</title>
<meta name="robots" content="noindex, follow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%23E8A94C%22/></svg>">
<style>
  :root{ --cream:#FBF5EA; --gold:#E8A94C; --ink:#362F4B; }
  *{ box-sizing:border-box; }
  html,body{ margin:0; }
  body{
    background:#EAE2D2;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
  }
  .toolbar{
    width:100%;
    background:var(--ink);
    color:var(--cream);
    padding:14px 20px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    gap:16px;
    flex-wrap:wrap;
  }
  .toolbar a{ color:var(--cream); text-decoration:none; font-size:14px; opacity:.85; }
  .toolbar a:hover{ opacity:1; text-decoration:underline; }
  .toolbar button{
    background:var(--gold);
    color:#3B2A0E;
    border:none;
    border-radius:4px;
    padding:9px 18px;
    font-weight:600;
    font-size:14px;
    cursor:pointer;
  }
  .toolbar button:hover{ filter:brightness(1.05); }
  .sheet-wrap{ padding:28px 16px 44px; width:100%; display:flex; justify-content:center; }
  .sheet{
    background:#fff;
    box-shadow:0 12px 40px rgba(0,0,0,.18);
    width:816px;
    max-width:100%;
  }
  .sheet svg{ display:block; width:100%; height:auto; }
  \@media print {
    .toolbar{ display:none; }
    body{ background:#fff; min-height:0; }
    .sheet-wrap{ padding:0; }
    .sheet{ box-shadow:none; width:auto; max-width:none; }
    \@page{ size:letter; margin:0; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <a href="$lesson_url">&larr; Back to the lesson</a>
  <button type="button" onclick="window.print()">Print this handout</button>
</div>
<div class="sheet-wrap">
  <div class="sheet">
$svg
  </div>
</div>
</body>
</html>
HTML

    write_file($out_path, $html);
    $count++;
    print "wrote $out_path\n";
  }
}

print "\nDone. $count handout page(s) built.\n";
