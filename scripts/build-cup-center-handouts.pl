#!/usr/bin/perl
#
# Builds the bespoke printable pieces for the lesson "The Cup and the Center":
#
#   handout-<band>-full.html   one designed full handout per age band
#   cards-<band>.html          cut-apart scenario / circumstance cards (4 bands)
#   luke-15-three-seats.html   Luke 15:11-32 in three scenes (14-21 and 21-plus)
#   the-wheel-poster.html      wall wheel, two versions
#
# The wallet cards are NOT built here: they are plain structured data
# (content/lessons/the-cup-and-the-center/handout-<band>-wallet.md) built by
#   perl scripts/build-text-handouts.pl the-cup-and-the-center
# Per the lesson spec, the full handouts are designed pieces, so their copy
# lives here as data instead of in handout-<band>-full.md (build-text-handouts
# would otherwise overwrite them with a plain text page).
#
# Run: perl scripts/build-cup-center-handouts.pl
#
# Print rules for every piece: letter size, nothing depends on colour alone,
# every diagram has a plain-text alternative, standard footer on every page,
# no tracking script, no external script, no stored data.

use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use Cwd qw(abs_path);

binmode(STDOUT, ':encoding(UTF-8)');

my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $SLUG = 'the-cup-and-the-center';
my $OUT  = "$ROOT/assets/materials/$SLUG";
my $LESSON_DIR = "$ROOT/content/lessons/$SLUG";

sub write_file {
  my ($path, $content) = @_;
  open(my $fh, '>:encoding(UTF-8)', $path) or die "Can't write $path: $!";
  print $fh $content; close $fh;
  print "wrote $path\n";
}
sub esc {
  my ($s) = @_; $s //= '';
  $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g;
  return $s;
}
# Smart quotes for print copy (same idea as smart() in build-text-handouts.pl).
sub smart {
  my ($s) = @_; $s = esc($s);
  $s =~ s/(\w)'(\w)/$1&rsquo;$2/g;
  $s =~ s/(^|[\s(\[])'(\w)/$1&lsquo;$2/g;
  $s =~ s/'/&rsquo;/g;
  $s =~ s/(^|[\s(\[])"(\S)/$1&ldquo;$2/g;
  $s =~ s/"/&rdquo;/g;
  $s =~ s/\.\.\./&hellip;/g;
  return $s;
}
sub r1 { my $n = shift; return sprintf('%.1f', $n); }

my %BAND_LABEL = ('5-8'=>'K-2', '8-11'=>'Grade 3-5', '11-14'=>'Grade 6-8', '14-21'=>'Teen', '21-plus'=>'Age 21+');

# ---------------------------------------------------------------------
# Shared page shell
# ---------------------------------------------------------------------
my $BASE_CSS = <<'CSS';
:root{
  --cream:#FBF5EA; --gold:#E8A94C; --gold-text:#935F1A;
  --sage:#8CA37E; --sage-text:#3F5236; --sky:#A9C9D9; --sky-text:#4E7A93;
  --ink:#362F4B; --ink-soft:rgba(54,47,75,.74); --rule:rgba(54,47,75,.22);
}
*{ box-sizing:border-box; }
html,body{ margin:0; }
body{
  background:#EAE2D2; color:var(--ink);
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  min-height:100vh; display:flex; flex-direction:column; align-items:center;
}
.toolbar{
  width:100%; background:var(--ink); color:var(--cream);
  padding:14px 20px; display:flex; justify-content:space-between; align-items:center;
  gap:16px; flex-wrap:wrap;
}
.toolbar a{ color:var(--cream); text-decoration:none; font-size:14px; opacity:.9; }
.toolbar a:hover, .toolbar a:focus{ opacity:1; text-decoration:underline; }
.toolbar button{
  background:var(--gold); color:#3B2A0E; border:none; border-radius:4px;
  padding:9px 18px; font-weight:600; font-size:14px; cursor:pointer;
}
.sheet-wrap{ padding:36px 16px 48px; width:100%; display:flex; justify-content:center; }
.sheet{ background:#fff; box-shadow:0 12px 40px rgba(0,0,0,.18); width:816px; max-width:100%; padding:48px; }
.page{ position:relative; height:9.9in; overflow:hidden; display:flex; flex-direction:column; }
.page + .page{ margin-top:44px; border-top:1px dashed var(--rule); padding-top:44px; height:calc(9.9in + 44px); }
.eyebrow{ font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase; color:var(--gold-text); text-align:center; margin:0 0 8px; }
h1{ font-family:"Fraunces",Georgia,serif; font-weight:600; color:var(--ink); margin:0 0 8px; text-align:center; font-size:30px; line-height:1.15; }
.rule{ width:56px; height:3px; background:var(--gold); margin:0 auto 12px; border-radius:2px; }
.frame{ font-family:"Fraunces",Georgia,serif; font-style:italic; line-height:1.5; color:var(--ink-soft); text-align:center; font-size:15px; margin:0 auto 14px; max-width:60ch; }
h2{ font-family:"Fraunces",Georgia,serif; font-weight:600; color:var(--ink); font-size:17px; margin:0 0 8px; }
.quote{ font-family:"Fraunces",Georgia,serif; font-style:italic; color:var(--ink-soft); text-align:center; font-size:13.5px; line-height:1.45; margin:0 auto 2px; max-width:62ch; }
.cite{ color:var(--ink-soft); text-align:center; font-size:11.5px; margin:0 0 12px; }
.pull{ font-family:"Fraunces",Georgia,serif; font-weight:600; color:var(--gold-text); text-align:center; font-size:17px; line-height:1.4; margin:10px 0 0; }
.pfoot{ position:absolute; left:0; right:0; bottom:0; display:flex; justify-content:space-between; gap:12px; font-size:10.5px; color:var(--ink-soft); border-top:1px solid var(--rule); padding-top:6px; }
.write{ border-bottom:1.5px solid var(--ink); height:26px; }
.sr{ position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap; }
svg text{ font-family:"Inter",sans-serif; }
svg .serif{ font-family:"Fraunces",Georgia,serif; }
@media print{
  .toolbar{ display:none; }
  body{ background:#fff; min-height:0; display:block; }
  .sheet-wrap{ padding:0; display:block; }
  .sheet{ box-shadow:none; width:auto; max-width:none; padding:0; }
  .page{ break-after:page; page-break-after:always; }
  .page:last-child{ break-after:auto; page-break-after:auto; }
  .page + .page{ margin-top:0; border-top:none; padding-top:0; height:9.9in; }
  @page{ size:letter; margin:0.5in; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
CSS

sub footer_html {
  return qq{<div class="pfoot"><span>Spiritual Lesson Plans &middot; spirituallessonplans.org</span><span>Free to use, adapt, and share &middot; CC BY-SA 4.0</span></div>};
}

# shell(title, back_url, pages_html (already wrapped in <div class="page">), extra_css)
sub shell {
  my ($title, $back, $pages, $css) = @_;
  $css //= '';
  return <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>@{[ esc($title) ]} &mdash; Spiritual Lesson Plans</title>
<meta name="robots" content="noindex, follow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%23E8A94C%22/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght\@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght\@400;500;600;700&display=swap" rel="stylesheet">
<style>
$BASE_CSS
$css
</style>
</head>
<body>
<div class="toolbar">
  <a href="$back">&larr; Back to the lesson</a>
  <button type="button" onclick="window.print()">Print this page</button>
</div>
<div class="sheet-wrap">
  <div class="sheet">
$pages
  </div>
</div>
</body>
</html>
HTML
}

sub head_block {
  my ($eyebrow, $title, $frame) = @_;
  my $o = '';
  $o .= qq{<p class="eyebrow">@{[ smart($eyebrow) ]}</p>\n} if $eyebrow;
  $o .= qq{<h1>@{[ smart($title) ]}</h1>\n<div class="rule"></div>\n};
  $o .= qq{<p class="frame">@{[ smart($frame) ]}</p>\n} if $frame;
  return $o;
}
sub quote_block {
  my ($q, $c) = @_;
  return qq{<p class="quote">&ldquo;@{[ smart($q) ]}&rdquo;</p>\n<p class="cite">&mdash; @{[ smart($c) ]}</p>\n};
}

# ---------------------------------------------------------------------
# Small SVG pieces (all drawn in the brand palette, readable in grayscale
# because every meaning is also carried by a word or a shape)
# ---------------------------------------------------------------------
my ($INK, $GOLD, $GOLDT, $SAGE, $SAGET, $SKY, $CREAM) = ('#362F4B', '#E8A94C', '#935F1A', '#8CA37E', '#3F5236', '#A9C9D9', '#FBF5EA');

# A heart path centered at (0,0), roughly 2*s wide.
sub heart_path {
  my ($cx, $cy, $s) = @_;
  my @p = map { r1($_) } ($cx, $cy + 0.9*$s,
    $cx - 1.15*$s, $cy - 0.1*$s, $cx - 0.55*$s, $cy - 0.95*$s, $cx, $cy - 0.35*$s,
    $cx + 0.55*$s, $cy - 0.95*$s, $cx + 1.15*$s, $cy - 0.1*$s, $cx, $cy + 0.9*$s);
  return "M$p[0],$p[1] C$p[2],$p[3] $p[4],$p[5] $p[6],$p[7] C$p[8],$p[9] $p[10],$p[11] $p[12],$p[13] Z";
}

# An open cup, centered on (x,y), size s (cup is about s wide). fill optional.
sub cup_svg {
  my ($x, $y, $s, $fill) = @_;
  $fill //= 'none';
  my $w = $s; my $h = $s * 0.95;
  my ($l, $t) = ($x - $w/2, $y - $h/2);
  my $path = sprintf('M%s,%s L%s,%s L%s,%s L%s,%s Z',
    r1($l), r1($t), r1($l + $w), r1($t), r1($l + $w*0.82), r1($t + $h), r1($l + $w*0.18), r1($t + $h));
  my $water = sprintf('M%s,%s L%s,%s', r1($l + $w*0.08), r1($t + $h*0.28), r1($l + $w*0.92), r1($t + $h*0.28));
  return qq{<path d="$path" fill="$fill" stroke="$INK" stroke-width="3" stroke-linejoin="round"/>} .
         qq{<path d="$water" stroke="$INK" stroke-width="2.5" stroke-dasharray="3 5" fill="none"/>};
}

# Round, friendly hand-motion icons for the four little moves (5-8, 8-11 labels).
# kind: wobble | peek | middle | cup. Drawn inside a circle radius r at (x,y).
sub move_icon {
  my ($kind, $x, $y, $r, $tint) = @_;
  $tint //= '#FBF5EA';
  my $o = qq{<circle cx="$x" cy="$y" r="$r" fill="$tint" stroke="$INK" stroke-width="3"/>};
  my $k = $r / 34;
  if ($kind eq 'wobble') {
    # a tummy circle with two wavy "wobble" lines and a hand
    $o .= sprintf('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="3"/>', r1($x), r1($y+4*$k), r1(9*$k), $INK);
    $o .= sprintf('<path d="M%s,%s q%s,%s %s,0 t%s,0 t%s,0 t%s,0" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>',
      r1($x-20*$k), r1($y-14*$k), r1(5*$k), r1(-6*$k), r1(10*$k), r1(10*$k), r1(10*$k), r1(10*$k), $INK);
    $o .= sprintf('<path d="M%s,%s q%s,%s %s,%s" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>',
      r1($x+18*$k), r1($y+18*$k), r1(-8*$k), r1(2*$k), r1(-8*$k), r1(-8*$k), $INK);
  } elsif ($kind eq 'breathe') {
    # three curling lines of breath coming out of a small puff
    for my $j (-1 .. 1) {
      $o .= sprintf('<path d="M%s,%s c%s,%s %s,%s %s,%s s%s,%s %s,%s" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>',
        r1($x-20*$k), r1($y + $j*10*$k), r1(8*$k), r1(-9*$k), r1(14*$k), r1(9*$k), r1(20*$k), r1(0), r1(10*$k), r1(-9*$k), r1(12*$k), r1(0), $INK);
    }
  } elsif ($kind eq 'peek') {
    # a little window made by fingers, with an eye looking through
    $o .= sprintf('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#fff" stroke="%s" stroke-width="3"/>',
      r1($x-17*$k), r1($y-13*$k), r1(34*$k), r1(26*$k), r1(4*$k), $INK);
    $o .= sprintf('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="none" stroke="%s" stroke-width="2.5"/>', r1($x), r1($y), r1(9*$k), r1(5.5*$k), $INK);
    $o .= sprintf('<circle cx="%s" cy="%s" r="%s" fill="%s"/>', r1($x), r1($y), r1(2.8*$k), $INK);
  } elsif ($kind eq 'middle') {
    # two flat palms with a heart between them
    $o .= sprintf('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#fff" stroke="%s" stroke-width="3"/>',
      r1($x-22*$k), r1($y-16*$k), r1(8*$k), r1(32*$k), r1(4*$k), $INK);
    $o .= sprintf('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#fff" stroke="%s" stroke-width="3"/>',
      r1($x+14*$k), r1($y-16*$k), r1(8*$k), r1(32*$k), r1(4*$k), $INK);
    $o .= sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="2.5" stroke-linejoin="round"/>', heart_path($x, $y, 9*$k), $GOLD, $INK);
  } else {
    # open hands holding a cup
    $o .= cup_svg($x, $y - 3*$k, 22*$k, '#fff');
    $o .= sprintf('<path d="M%s,%s q%s,%s %s,%s" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>',
      r1($x-22*$k), r1($y+8*$k), r1(6*$k), r1(14*$k), r1(20*$k), r1(8*$k), $INK);
    $o .= sprintf('<path d="M%s,%s q%s,%s %s,%s" fill="none" stroke="%s" stroke-width="3" stroke-linecap="round"/>',
      r1($x+22*$k), r1($y+8*$k), r1(-6*$k), r1(14*$k), r1(-20*$k), r1(8*$k), $INK);
  }
  return $o;
}

# The wheel: bumpy rim, spokes, calm hub. (cx,cy) center, R rim radius, hubR hub radius.
# bumps => small rocks/bumps drawn just outside the rim.
sub wheel_svg {
  my (%a) = @_;
  my ($cx, $cy, $R, $hubR) = ($a{cx}, $a{cy}, $a{R}, $a{hubR});
  my $spokes = $a{spokes} // 8;
  my $o = '';
  if ($a{bumps}) {
    my $n = 28;
    for my $i (0 .. $n-1) {
      my $ang = 2*3.14159265*$i/$n;
      my $rr = $R + 6 + (($i*7) % 3) * 4;
      my $bx = $cx + $rr*cos($ang); my $by = $cy + $rr*sin($ang);
      my $br = 5 + (($i*5) % 3) * 2;
      $o .= sprintf('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="2"/>', r1($bx), r1($by), $br, ($i % 2 ? '#fff' : $SKY), $INK);
    }
  }
  $o .= sprintf('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="%s" stroke-width="%s"/>', $cx, $cy, $R, $INK, $a{rimW} // 12);
  for my $i (0 .. $spokes-1) {
    my $ang = 2*3.14159265*$i/$spokes + 3.14159265/$spokes;
    $o .= sprintf('<line x1="%s" y1="%s" x2="%s" y2="%s" stroke="%s" stroke-width="5" stroke-linecap="round"/>',
      r1($cx + $hubR*cos($ang)), r1($cy + $hubR*sin($ang)), r1($cx + ($R-6)*cos($ang)), r1($cy + ($R-6)*sin($ang)), $INK);
  }
  $o .= sprintf('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="5"/>', $cx, $cy, $hubR, $a{hubFill} // '#fff', $INK);
  return $o;
}

# Wrap SVG in a role="img" figure with aria-label and a plain-text alternative.
sub figure {
  my ($svg, $label, $alt, $style) = @_;
  $style //= '';
  return qq{<figure style="margin:0; $style"><div role="img" aria-label="@{[ esc($label) ]}">$svg</div><figcaption class="sr">@{[ esc($alt) ]}</figcaption></figure>};
}

# Greedy word wrap on a character budget.
sub wrap_text {
  my ($t, $max) = @_;
  my @w = split /\s+/, $t; my @lines = ('');
  for my $w (@w) {
    if (length($lines[-1]) + length($w) + 1 > $max && length $lines[-1]) { push @lines, $w; }
    else { $lines[-1] .= (length $lines[-1] ? ' ' : '') . $w; }
  }
  return @lines;
}

# ---------------------------------------------------------------------
# 5-8  My Wheel and My Cup  (colour it, cut it out, spin it)
# ---------------------------------------------------------------------
sub build_5_8 {
  my $svg = '<svg viewBox="0 0 700 690" width="540" height="533" xmlns="http://www.w3.org/2000/svg">';
  $svg .= qq{<circle cx="350" cy="345" r="340" fill="none" stroke="$INK" stroke-width="3" stroke-dasharray="3 12" stroke-linecap="round"/>};
  $svg .= wheel_svg(cx => 350, cy => 345, R => 158, hubR => 70, bumps => 1, rimW => 14);
  $svg .= sprintf('<path d="%s" fill="#fff" stroke="%s" stroke-width="6" stroke-linejoin="round"/>', heart_path(350, 335, 40), $INK);
  $svg .= qq{<rect x="282" y="380" width="136" height="30" rx="8" fill="#fff"/>};
  $svg .= qq{<text x="350" y="402" text-anchor="middle" font-size="21" font-style="italic" class="serif" fill="$INK">Love is here.</text>};
  my @icons = (['wobble', 190, 185, 'WOBBLE', 'up', $SKY], ['peek', 510, 185, 'PEEK', 'up', $CREAM],
               ['middle', 510, 505, 'MIDDLE', 'down', $SKY], ['cup', 190, 505, 'CUP', 'down', $CREAM]);
  for my $i (@icons) {
    my ($kind, $x, $y, $word, $pos, $tint) = @$i;
    $svg .= move_icon($kind, $x, $y, 40, $tint);
    my $ty = $pos eq 'up' ? $y - 52 : $y + 74;
    $svg .= qq{<text x="$x" y="$ty" text-anchor="middle" font-size="24" font-weight="700" fill="$INK" letter-spacing="1">$word</text>};
  }
  $svg .= '<rect x="332" y="-4" width="36" height="24" fill="#fff"/><text x="350" y="14" text-anchor="middle" font-size="20" fill="' . $INK . '">&#9986;</text>';
  $svg .= '</svg>';

  my $alt = 'A big wheel to colour, with a bumpy rim and eight spokes. In the middle hub is an empty heart to colour with the words Love is here. Four small pictures sit around the outside: Wobble, a hand on the tummy; Peek, fingers making a little window; Middle, hands pressed flat at the heart; Cup, open hands like a cup. A dotted circle around the whole wheel shows where to cut.';

  my $page = qq{<div class="page">\n} .
    head_block('A VISUAL · THE WOBBLY WHEEL AND THE CUP', 'My Wheel and My Cup',
      'The outside of a wheel bumps over everything. The middle stays still. You have a still middle too.') .
    figure($svg, 'A wheel with a heart in the middle and four little moves around the edge', $alt, 'text-align:center;') .
    qq{<p class="cutnote">Cut me out! Push a pencil or a paper fastener through the heart and spin me. The outside goes around. The middle stays.</p>\n} .
    qq{<div class="boxes"><div class="box"><svg viewBox="0 0 160 110" width="150" height="103" aria-hidden="true">@{[ cup_svg(80, 56, 100, '#fff') ]}</svg><p>Draw one small kind thing in my cup.</p></div>} .
    qq{<div class="box"><p>Draw a time you felt wobbly.</p></div></div>\n} .
    footer_html() . "\n</div>\n";

  my $css = <<'CSS';
.cutnote{ font-size:19px; line-height:1.35; text-align:center; margin:2px auto 8px; max-width:34em; font-weight:500; }
.boxes{ display:flex; gap:20px; margin-top:4px; }
.box{ flex:1; border:2.5px solid var(--ink); border-radius:16px; height:150px; padding:10px 14px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; }
.box p{ margin:0; font-size:19px; font-weight:600; line-height:1.3; }
.page h1{ font-size:32px; }
.page .frame{ font-size:19px; margin-bottom:8px; }
CSS
  # 5-8 print rule: body text at least 14 pt (about 19px).
  write_file("$OUT/handout-5-8-full.html", shell('My Wheel and My Cup (K-2 — full)', '/lessons/5-8/' . $SLUG, $page, $css));
}

# ---------------------------------------------------------------------
# 8-11  The Cup Folder: a paper fortune-teller of eight small cups
#
# Geometry (printed face only; the blank face is never seen).
# Work in "table" coordinates: the paper lies blank side UP, so the printed
# face is underneath. A printed point at page coordinates (u,v) therefore sits
# at table position x = S - u, y = v. Folding (blank side up): corners to the
# centre; flip over; corners to the centre again; fold in half both ways.
# What ends up showing, all on the printed face:
#   * the outside pockets: the four original corner squares (S/4 square at each corner)
#   * the eight numbered flaps: the two triangles that sit beside each corner square
#   * under each flap: the central triangles, where the eight cups are printed
# Numbers and labels are rotated so they read upright on the folded toy.
# ---------------------------------------------------------------------
my $FS = 672;                      # the square, in svg units (7 in at 96 dpi)
sub pu { return $FS - $_[0]; }     # table x -> printed-page u

my @CUPS = (
  "Sit next to them. No advice.",
  "Ask: 'Do you want company or space?'",
  "Offer your water bottle or a snack.",
  "Tell them one kind, true thing you noticed.",
  "Leave a two-line note where they'll find it.",
  "Say 'me too,' if it's true.",
  "Ask: 'Remember when you...?' and tell a good memory together.",
  "Invite someone who's alone to join you.",
);
# Per cup: number centroid in table coords (orig flap position), rotation of the
# numeral, and the central triangle (right-angle vertex + leg directions).
my @FLAPS = (
  { n=>1, cx=>224, cy=>56,  rot=> 90, flap=>'TL', rv=>[336,168], hx=>-1, vy=> 1 },
  { n=>2, cx=>448, cy=>56,  rot=>-90, flap=>'TR', rv=>[336,168], hx=> 1, vy=> 1 },
  { n=>3, cx=>616, cy=>224, rot=> 90, flap=>'TR', rv=>[504,336], hx=>-1, vy=>-1 },
  { n=>4, cx=>616, cy=>448, rot=>-90, flap=>'BR', rv=>[504,336], hx=>-1, vy=> 1 },
  { n=>5, cx=>448, cy=>616, rot=> 90, flap=>'BR', rv=>[336,504], hx=> 1, vy=>-1 },
  { n=>6, cx=>224, cy=>616, rot=>-90, flap=>'BL', rv=>[336,504], hx=>-1, vy=>-1 },
  { n=>7, cx=> 56, cy=>448, rot=> 90, flap=>'BL', rv=>[168,336], hx=> 1, vy=> 1 },
  { n=>8, cx=> 56, cy=>224, rot=>-90, flap=>'TL', rv=>[168,336], hx=> 1, vy=>-1 },
);
# The number triangles themselves (table coords), same order as @FLAPS.
my @NUMTRI = (
  [[336,0],[168,168],[168,0]], [[336,0],[504,0],[504,168]],
  [[672,336],[504,168],[672,168]], [[672,336],[672,504],[504,504]],
  [[336,672],[504,672],[504,504]], [[336,672],[168,504],[168,672]],
  [[0,336],[0,504],[168,504]], [[0,336],[168,168],[0,168]],
);
# Outside pockets: table corner square origin, word, icon, rotation, tint.
my %FLAPTINT = (TL=>$SKY, TR=>'#C9D8BF', BR=>'#F4D79C', BL=>'#E9E2F0');

sub fortune_svg {
  my $svg = qq{<svg viewBox="-12 -12 696 696" width="696" height="696" xmlns="http://www.w3.org/2000/svg" style="max-width:100%; height:auto;">};
  # tinted original corner triangles (what shows on the outside), in printed coordinates
  my @corners = (
    ['TL', [[0,0],[336,0],[0,336]]], ['TR', [[672,0],[336,0],[672,336]]],
    ['BR', [[672,672],[672,336],[336,672]]], ['BL', [[0,672],[0,336],[336,672]]],
  );
  for my $c (@corners) {
    my ($name, $pts) = @$c;
    my $d = join(' ', map { pu($_->[0]) . ',' . $_->[1] } @$pts);
    $svg .= qq{<polygon points="$d" fill="$FLAPTINT{$name}" fill-opacity=".55" stroke="none"/>};
  }
  # outside-pocket squares
  my @pockets = (
    ['TL', 0,   0,   'BREATHE', 'breathe', -90],
    ['TR', 504, 0,   'PEEK',    'peek',     90],
    ['BR', 504, 504, 'MIDDLE',  'middle',  -90],
    ['BL', 0,   504, 'CUP',     'cup',      90],
  );
  for my $p (@pockets) {
    my ($name, $tx, $ty, $word, $kind, $rot) = @$p;
    my $u0 = pu($tx + 168); my $v0 = $ty;           # printed-page top-left of the square
    $svg .= qq{<rect x="$u0" y="$v0" width="168" height="168" fill="none" stroke="$INK" stroke-opacity=".35" stroke-width="1.5" stroke-dasharray="2 5"/>};
    my ($ix, $tx2);
    if ($rot < 0) { $ix = $u0 + 44;  $tx2 = $u0 + 118; }   # reads up: icon left of the word
    else          { $ix = $u0 + 124; $tx2 = $u0 + 50;  }   # reads down: icon right of the word
    my $cy = $v0 + 84;
    $svg .= move_icon($kind, $ix, $cy, 30, '#fff');
    $svg .= qq{<text x="$tx2" y="$cy" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="700" letter-spacing="1.2" fill="$INK" transform="rotate($rot $tx2 $cy)">$word</text>};
  }
  # number triangles and numerals
  for my $i (0..7) {
    my $f = $FLAPS[$i];
    my $d = join(' ', map { pu($_->[0]) . ',' . $_->[1] } @{ $NUMTRI[$i] });
    $svg .= qq{<polygon points="$d" fill="#fff" fill-opacity=".7" stroke="$INK" stroke-opacity=".45" stroke-width="1.5"/>};
    my ($ux, $uy) = (pu($f->{cx}), $f->{cy});
    $svg .= qq{<circle cx="$ux" cy="$uy" r="24" fill="#fff" stroke="$INK" stroke-width="3"/>};
    $svg .= qq{<text x="$ux" y="$uy" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="700" fill="$INK" transform="rotate($f->{rot} $ux $uy)">$f->{n}</text>};
  }
  # the eight cups, in the central triangles (these are the cups under the flaps)
  for my $i (0..7) {
    my $f = $FLAPS[$i];
    my @lines = wrap_text($CUPS[$i], 17);
    die "cup " . ($i+1) . " needs " . scalar(@lines) . " lines" if @lines > 5;
    my ($rvx, $rvy) = @{ $f->{rv} };
    my ($rux, $hx, $vy) = (pu($rvx), -$f->{hx}, $f->{vy});
    # triangle vertices (printed coords): right-angle vertex, along the horizontal leg, along the vertical leg
    my $v1 = [$rux + $hx*168, $rvy];
    my $v2 = [$rux, $rvy + $vy*168];
    $svg .= sprintf('<polygon points="%s,%s %s,%s %s,%s" fill="%s" fill-opacity=".5" stroke="%s" stroke-opacity=".45" stroke-width="1.5"/>',
      $rux, $rvy, $v1->[0], $v1->[1], $v2->[0], $v2->[1], $CREAM, $INK);
    my $n = scalar @lines; my $lh = 12.5;
    for my $j (0 .. $n-1) {
      my ($by, $depth);
      if ($vy > 0) { $depth = 16 + $j*$lh;                 $by = $rvy + $depth; }
      else         { $depth = 8 + ($n-1-$j)*$lh;            $by = $rvy - $depth; }
      my $chord = 168 - $depth;
      my $xc = $rux + $hx*($chord/2);
      $svg .= sprintf('<text x="%s" y="%s" text-anchor="middle" font-size="10.5" font-weight="600" fill="%s">%s</text>', r1($xc), r1($by), $INK, smart($lines[$j]));
    }
  }
  # fold guides (printed coords; the diamond and the inner square are symmetric)
  my $dia = join(' ', map { "$_->[0],$_->[1]" } ([336,0],[672,336],[336,672],[0,336]));
  $svg .= qq{<polygon points="$dia" fill="none" stroke="$INK" stroke-width="1.6" stroke-dasharray="7 6"/>};
  $svg .= qq{<rect x="168" y="168" width="336" height="336" fill="none" stroke="$INK" stroke-width="1.2" stroke-dasharray="3 6" stroke-opacity=".7"/>};
  $svg .= qq{<line x1="336" y1="0" x2="336" y2="672" stroke="$INK" stroke-width="1" stroke-dasharray="2 8" stroke-opacity=".5"/>};
  $svg .= qq{<line x1="0" y1="336" x2="672" y2="336" stroke="$INK" stroke-width="1" stroke-dasharray="2 8" stroke-opacity=".5"/>};
  # centre target, outside cut line
  $svg .= qq{<circle cx="336" cy="336" r="7" fill="#fff" stroke="$INK" stroke-width="3"/><circle cx="336" cy="336" r="2" fill="$INK"/>};
  $svg .= qq{<rect x="0" y="0" width="672" height="672" fill="none" stroke="$INK" stroke-width="3.5"/>};
  # scissors on the cut line
  $svg .= qq{<text x="-4" y="-2" font-size="16" fill="$INK">&#9986;</text>};
  $svg .= '</svg>';
  return $svg;
}

sub build_8_11 {
  my $alt = 'A seven-inch square to cut out and fold into a paper fortune-teller. The four corners are labelled Breathe, Peek, Middle and Cup. Eight numbered triangles, 1 to 8, sit beside the corners, and eight small cups of kind actions are printed in the triangles around the centre dot, one under each number. Dashed lines show where to fold; the solid line is where to cut.';
  my $sq = figure(fortune_svg(), 'A square to cut out and fold into a fortune-teller of eight small cups', $alt, 'text-align:center;');

  my $p1 = qq{<div class="page">\n} .
    head_block('A FOLD-UP · THE CUP FOLDER', 'The Cup Folder',
      'A paper fortune-teller of eight small cups. Say the middle first, then pick a number and see what your hand does.') .
    $sq .
    qq{<p class="small" style="text-align:center; margin:6px 0 0;">Cut on the solid line. Fold on the dotted lines. Printed side down to fold &mdash; see page 2.</p>\n} .
    footer_html() . "\n</div>\n";

  my @play = (
    "Say &ldquo;Love is in the middle&rdquo; out loud.",
    "Pick a move: BREATHE, PEEK, MIDDLE, or CUP, and open the folder that many times.",
    "Pick a number.",
    "Open the flap and read your cup.",
    "Do it, or do something close to it, this week.",
  );
  my @fold = (
    "Cut out the square on the solid line.",
    "Put it printed side <b>down</b>. Fold each corner to the center dot and press the creases.",
    "Flip it over. Fold the four corners to the center again.",
    "Fold it in half one way and open it, then in half the other way and open it.",
    "Turn it over so the four labeled pockets show. Slide a thumb and finger of each hand into the pockets and pinch the points together.",
  );
  my $play = join('', map { "<li>$_</li>" } @play);
  my $fold = join('', map { "<li>$_</li>" } @fold);
  my $wheel = '<svg viewBox="0 0 220 220" width="190" height="190" xmlns="http://www.w3.org/2000/svg">' .
    wheel_svg(cx=>110, cy=>110, R=>78, hubR=>30, bumps=>1, rimW=>8, spokes=>8) .
    sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>', heart_path(110, 107, 15), $GOLD, $INK) .
    '</svg>';
  my $flap = '<svg viewBox="0 0 200 120" width="200" height="120" aria-hidden="true"><polygon points="100,8 192,112 8,112" fill="none" stroke="' . $INK . '" stroke-width="2.5" stroke-dasharray="6 5"/></svg>';

  my $p2 = qq{<div class="page">\n} .
    head_block('', 'How to play, and the weather key', '') .
    qq{<div class="two"><div class="card"><h2>To fold it</h2><ol>$fold</ol></div><div class="card"><h2>How to play</h2><ol>$play</ol></div></div>\n} .
    qq{<h2 style="margin-top:14px;">The weather key</h2>\n} .
    qq{<div class="weather"><div class="w"><b>Wobbly weather</b><span>very upset</span><em>Cups 1, 2, 3</em></div><div class="w"><b>Working-at-it weather</b><span>calming down, trying</span><em>Cups 4, 5, 6</em></div><div class="w"><b>Got-it weather</b><span>steady already</span><em>Cups 7, 8</em></div></div>\n} .
    qq{<div class="two lower"><div>} .
    figure($wheel, 'A wheel: the outside wobbles, the middle holds', 'A small wheel with a bumpy rim, spokes, and a heart in the hub. The caption reads: the outside wobbles, the middle holds.', 'text-align:center;') .
    qq{<p class="wcap">The outside wobbles. The middle holds.</p></div>} .
    qq{<div style="text-align:center;">$flap<p class="wcap">Write your own cup.</p></div></div>\n} .
    qq{<p class="pull">Same middle every time. A different cup for different weather.</p>\n} .
    qq{<p class="small" style="margin:14px 0 0; font-size:14px;">A real cup I could try this week is&hellip;</p><div class="write"></div><p class="small" style="margin:10px 0 0; font-size:14px;">Who might need it?</p><div class="write"></div>\n} .
    footer_html() . "\n</div>\n";

  my $css = <<'CSS';
.small{ font-size:12px; color:var(--ink-soft); }
.two{ display:flex; gap:18px; align-items:flex-start; }
.two > * { flex:1; }
.card{ border:1.5px solid var(--rule); border-radius:12px; padding:12px 16px 8px; background:var(--cream); }
.card ol{ margin:0; padding-left:20px; font-size:13.5px; line-height:1.5; }
.card li{ margin-bottom:6px; }
.weather{ display:flex; gap:12px; }
.weather .w{ flex:1; border:1.5px solid var(--ink); border-radius:10px; padding:10px 12px; display:flex; flex-direction:column; gap:2px; }
.weather b{ font-family:"Fraunces",Georgia,serif; font-size:15px; }
.weather span{ font-size:12.5px; color:var(--ink-soft); }
.weather em{ font-style:normal; font-weight:700; color:var(--gold-text); font-size:14px; }
.lower{ margin-top:12px; align-items:center; }
.wcap{ font-family:"Fraunces",Georgia,serif; font-style:italic; font-size:14px; margin:2px 0 0; color:var(--ink-soft); }
.page h1{ font-size:28px; }
CSS
  write_file("$OUT/handout-8-11-full.html", shell('The Cup Folder (Grade 3-5 — full)', '/lessons/8-11/' . $SLUG, $p1 . $p2, $css));
}

# ---------------------------------------------------------------------
# 11-14  Cup or Scoreboard?  (four-step ladder + card sort)
# ---------------------------------------------------------------------
sub build_11_14 {
  my @rungs = (
    ['1', 'NAME THE FEAR',   'What am I afraid of, exactly? Say it plainly. Naming it isn\'t dwelling; it\'s meeting.'],
    ['2', 'SPOT THE STORY',  'What\'s the picture in my head? It\'s a picture, not the truth about anyone.'],
    ['3', 'FIND THE MIDDLE', 'What\'s true about both of them at once? Does it need a loser?'],
    ['4', 'DO THE CUP',      'One small kind thing, specific, possible, something I\'d do for either of them.'],
  );
  my $ladder = '';
  for my $r (@rungs) {
    $ladder .= qq{<div class="rung"><div class="rn">$r->[0]</div><div class="rb"><b>$r->[1]</b><p>@{[ smart($r->[2]) ]}</p><div class="write"></div></div></div>\n};
  }
  my $wheel = '<svg viewBox="0 0 240 260" width="210" height="228" xmlns="http://www.w3.org/2000/svg">' .
    wheel_svg(cx=>120, cy=>120, R=>84, hubR=>34, bumps=>1, rimW=>9) .
    sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>', heart_path(120, 117, 17), $GOLD, $INK) .
    qq{<text x="120" y="250" text-anchor="middle" font-size="14" font-weight="700" fill="$INK">rim = CUP &nbsp;&middot;&nbsp; hub = CENTER</text></svg>};
  my $tests = '<ul class="tests"><li>Present tense.</li><li>Plain words.</li><li>True of everyone at once.</li><li>Still true on the worst day.</li></ul>';

  my $p1 = qq{<div class="page">\n} .
    head_block('A CARD SORT · CUP OR SCOREBOARD?', 'Cup or Scoreboard?',
      'Same act, different thought behind it. This is how to tell, and what to do when you weren\'t even in the fight.') .
    quote_block('Be still, and know that I am God.', 'Psalm 46:10, NIV') .
    qq{<h2 style="text-align:center;">The Four Steps <span style="font-weight:400; font-size:14px;">(for when you weren&rsquo;t even in it)</span></h2>\n} .
    qq{<div class="ladderwrap"><div class="ladder">$ladder</div><aside><div style="text-align:center;">} .
    figure($wheel, 'A wheel: rim is the cup, hub is the center', 'A wheel with a bumpy rim and a heart in the hub. Caption: rim equals cup, hub equals center.') .
    qq{</div><h3>Four tests for a steady sentence</h3>$tests</aside></div>\n} .
    footer_html() . "\n</div>\n";

  my @acts = (
    "Texting someone \"thinking of you\" with no ask.",
    "Posting that you \"stand with\" someone so people see it.",
    "Sitting with a friend at lunch after a fight, not talking about it.",
    "Telling everyone what really happened so you look informed.",
    "Bringing someone a snack because they skipped lunch.",
    "Fixing a friend's problem before they asked, so you feel useful.",
    "Saying \"that sounded rough\" and nothing else.",
    "Apologizing so the awkwardness stops.",
    "Apologizing because you're actually sorry.",
    "Inviting the left-out kid in so people see you're nice.",
    "Inviting the left-out kid in because you remember that feeling.",
    "Praying quietly for both people and telling no one.",
  );
  my $grid = '';
  for my $i (0..$#acts) {
    $grid .= qq{<div class="act"><div class="at"><span class="an">@{[ $i+1 ]}</span><span>@{[ smart($acts[$i]) ]}</span></div>} .
             qq{<div class="opts"><span class="o"><i></i>Cup</span><span class="o"><i></i>Scoreboard</span><span class="o"><i></i>It depends</span></div></div>\n};
  }
  my $p2 = qq{<div class="page">\n} .
    qq{<h1 style="font-size:26px; margin-top:0;">Sort the acts: cup or scoreboard?</h1><div class="rule"></div>\n} .
    qq{<p class="frame" style="font-size:14px; margin-bottom:10px;">Mark one circle for each act. A <b>cup</b> is done <em>for</em> the person. A <b>scoreboard</b> is done to be thanked, to win, to look like the good one, or so nobody blames you.</p>\n} .
    qq{<div class="grid">$grid</div>\n} .
    qq{<div class="testbox"><b>THE TEST</b> Would I give this same cup, with the same warmth, to the person who&rsquo;s hardest for me to love?<div class="flip">Many of these are &ldquo;it depends.&rdquo; That&rsquo;s the answer. Check the thought first.</div></div>\n} .
    qq{<p class="pull" style="margin:8px 0 6px; font-size:16px;">Same act. Different thought. Check the thought first.</p>\n} .
    qq{<div class="refl"><p>A cup I could do this week, no names, that I&rsquo;d give anyone:</p><div class="write"></div><p>Which one on the sheet is hardest for me to be honest about?</p><div class="write"></div></div>\n} .
    footer_html() . "\n</div>\n";

  my $css = <<'CSS';
.ladderwrap{ display:flex; gap:20px; align-items:flex-start; margin-top:6px; }
.ladder{ flex:1.6; display:flex; flex-direction:column; gap:10px; }
.rung{ display:flex; border:2px solid var(--ink); border-radius:12px; overflow:hidden; }
.rn{ flex:0 0 44px; background:var(--ink); color:var(--gold); font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:26px; display:flex; align-items:center; justify-content:center; }
.rb{ padding:8px 14px 6px; flex:1; }
.rb b{ font-size:12px; letter-spacing:.12em; color:var(--gold-text); }
.rb p{ margin:2px 0 4px; font-size:15px; line-height:1.4; }
.rb .write{ height:42px; }
aside{ flex:1; border:1.5px solid var(--rule); background:var(--cream); border-radius:12px; padding:12px 14px; }
aside h3{ font-family:"Fraunces",Georgia,serif; font-size:14px; margin:6px 0 4px; }
.tests{ margin:0; padding-left:18px; font-size:13.5px; line-height:1.55; }
.grid{ display:grid; grid-template-columns:1fr 1fr; gap:8px 12px; }
.act{ border:1.5px solid var(--rule); border-radius:10px; padding:7px 10px; background:#fff; }
.at{ display:flex; gap:8px; font-size:13px; line-height:1.35; min-height:36px; }
.an{ font-weight:700; color:var(--gold-text); flex:0 0 auto; }
.opts{ display:flex; gap:14px; margin-top:6px; font-size:12px; font-weight:600; }
.o{ display:inline-flex; align-items:center; gap:5px; }
.o i{ width:15px; height:15px; border:2px solid var(--ink); border-radius:50%; display:inline-block; }
.testbox{ margin-top:10px; border:2px solid var(--gold); border-radius:12px; background:var(--cream); padding:10px 16px; font-size:14.5px; line-height:1.45; }
.testbox b{ font-size:11px; letter-spacing:.14em; color:var(--gold-text); margin-right:6px; }
.flip{ transform:rotate(180deg); font-size:10.5px; color:var(--ink-soft); text-align:center; margin-top:8px; }
.refl p{ margin:8px 0 0; font-size:13.5px; }
CSS
  write_file("$OUT/handout-11-14-full.html", shell('Cup or Scoreboard? (Grade 6-8 — full)', '/lessons/11-14/' . $SLUG, $p1 . $p2, $css));
}

# ---------------------------------------------------------------------
# 14-21  The Center Sentence and the Cup Menu
# ---------------------------------------------------------------------
sub strip_steps {
  my ($emph) = @_;     # which step (1-4) is emphasised
  my @s = ('ADDRESS THE FEAR', 'NOTICE WHAT APPEARS IN THOUGHT', 'TURN TO THE CENTER', 'CHOOSE THE CUP');
  my $o = '<div class="strip">';
  for my $i (0..3) {
    my $cls = ($i+1 == $emph) ? ' class="on"' : '';
    $o .= qq{<div$cls><span class="sn">@{[ $i+1 ]}</span><b>$s[$i]</b></div>};
  }
  return $o . '</div>';
}

sub build_14_21 {
  my $wheelicon = '<svg viewBox="0 0 60 60" width="40" height="40" aria-hidden="true">' .
    wheel_svg(cx=>30, cy=>30, R=>22, hubR=>9, rimW=>3, spokes=>6) . '</svg>';
  my $p1 = qq{<div class="page">\n} .
    head_block('A WORKSHOP · THE CENTER SENTENCE AND THE CUP MENU', 'Write Your Center',
      'Write one sentence you could say, quietly and without an opponent, to someone you love who\'s scared. Then choose a cup that fits what\'s actually showing up.') .
    quote_block('These clearer, higher views inspire the Godlike man to reach the absolute centre and circumference of his being.', 'Science and Health, Mary Baker Eddy, p. 262:14–16') .
    strip_steps(3) .
    qq{<div class="cols"><div class="left"><p class="stem">Whatever is happening, what is true is&hellip;</p>} .
    qq{<div class="draft"><span>Draft 1</span><div class="write"></div></div><div class="draft"><span>Draft 2</span><div class="write"></div></div><div class="draft"><span>Draft 3</span><div class="write"></div></div>} .
    qq{<p class="small">Fast, no editing. Then circle the one you&rsquo;d say to someone you love who&rsquo;s frightened.</p></div>} .
    qq{<div class="right"><div class="five"><h3>The five tests</h3><ol><li>True in a hospital waiting room.</li><li>In the present tense.</li><li>Not about anyone else; doesn&rsquo;t need an opponent.</li><li>In plain words.</li><li>Can stand up to the evening news.</li></ol></div>} .
    qq{<div class="ways"><h3>Three ways in</h3><p>God as All, each person as God&rsquo;s image.</p><p>Paul: nothing can separate us from the love of God (Romans 8:38&ndash;39).</p><p>Something I&rsquo;ve proved for myself.</p></div></div></div>\n} .
    qq{<div class="held"><div><b>It held when&hellip;</b><div class="write"></div><div class="write"></div><div class="write"></div></div><div><b>It wobbled when&hellip;</b><div class="write"></div><div class="write"></div><div class="write"></div></div></div>\n} .
    footer_html() . "\n</div>\n";

  my @cols = (
    ['FIRST DEGREE', 'when it\'s fear, hurt, anger', 'THE CUP IS SAFETY', [
      'Stay in the room. Say little.', 'Text: "I\'m here. No need to answer."', 'Sit in the car with them until they\'re ready.',
      'Bring food or water.', 'Say their name calmly and nothing else.', 'Stay steady yourself: breathe; don\'t match their volume.' ]],
    ['SECOND DEGREE', 'when they\'re trying, getting honest', 'THE CUP IS ENCOURAGEMENT', [
      '"That took guts to say."', 'Name one thing they did right this week.', 'Take one small task off their plate.',
      'Ask what they\'ve already tried.', 'Give a short, honest apology with no "but."', 'Remind them of a time they came through.' ]],
    ['THIRD DEGREE', 'when they\'re steady and wondering', 'THE CUP IS CLARITY', [
      'Say the plain true thing once, kindly, then stop.', 'Offer a passage with no pressure: "This helped me."', 'Ask "What do you think is true here?" and listen.',
      'Help them see the whole picture, not just the screenshot.', 'Say what you see in them: "You\'re not what happened."', 'Pray specifically and quietly. Tell no one.' ]],
  );
  my $menu = '';
  for my $c (@cols) {
    my ($deg, $when, $cup, $items) = @$c;
    $menu .= qq{<section class="mcol"><header><b>$deg</b><span>@{[ smart($when) ]}</span><em>$cup</em></header><ul>} .
             join('', map { '<li>' . smart($_) . '</li>' } @$items) . qq{</ul></section>\n};
  }
  my $p2 = qq{<div class="page">\n} .
    qq{<h1 style="font-size:28px; margin-top:0;">The Cup Menu by Degree</h1><div class="rule"></div>\n} .
    qq{<p class="frame" style="font-size:14px; margin-bottom:10px;">Step two names what appears in thought. The cup that fits depends on it.</p>\n} .
    qq{<div class="menu">$menu</div>\n} .
    qq{<div class="mapnote">The map describes what appears in thought. It does not rank persons. The center comes first. Then the cup.</div>\n} .
    qq{<div class="refl"><p>The degree I expect to see in my own thought this week:</p><div class="write"></div><p>One person I could offer a cup to, and what it would be:</p><div class="write"></div></div>\n} .
    qq{<p class="pull" style="font-size:15px; margin-top:8px;">A center you wrote yourself is a cup someone can actually drink.</p>\n} .
    footer_html() . "\n</div>\n";

  my $css = <<'CSS';
.strip{ display:flex; gap:8px; margin:6px 0 12px; }
.strip > div{ flex:1; border:1.5px solid var(--rule); border-radius:10px; padding:7px 8px; text-align:center; display:flex; flex-direction:column; align-items:center; gap:3px; }
.strip .sn{ font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:18px; color:var(--gold-text); }
.strip b{ font-size:10.5px; letter-spacing:.08em; line-height:1.25; }
.strip .on{ border:3px solid var(--ink); background:var(--cream); transform:scale(1.03); }
.cols{ display:flex; gap:20px; align-items:flex-start; }
.left{ flex:1.5; } .right{ flex:1; display:flex; flex-direction:column; gap:12px; }
.stem{ font-family:"Fraunces",Georgia,serif; font-size:19px; font-weight:600; margin:0 0 8px; }
.draft{ display:flex; align-items:flex-end; gap:8px; margin-bottom:6px; }
.draft span{ font-size:12px; font-weight:600; color:var(--gold-text); flex:0 0 52px; padding-bottom:3px; }
.draft .write{ flex:1; height:46px; }
.small{ font-size:12.5px; color:var(--ink-soft); margin:6px 0 0; }
.five, .ways{ border:1.5px solid var(--rule); background:var(--cream); border-radius:12px; padding:10px 14px; }
.five h3, .ways h3{ font-family:"Fraunces",Georgia,serif; font-size:14px; margin:0 0 4px; }
.five ol{ margin:0; padding-left:18px; font-size:13px; line-height:1.5; }
.ways p{ margin:3px 0; font-size:13px; line-height:1.4; }
.held{ display:flex; gap:20px; margin-top:14px; }
.held > div{ flex:1; border:1.5px solid var(--ink); border-radius:12px; padding:10px 14px 4px; }
.held b{ font-size:14px; }
.menu{ display:flex; gap:10px; }
.mcol{ flex:1; border:2px solid var(--ink); border-radius:12px; overflow:hidden; background:#fff; }
.mcol header{ background:var(--ink); color:var(--cream); padding:8px 10px; display:flex; flex-direction:column; gap:2px; }
.mcol header b{ font-size:12px; letter-spacing:.12em; color:var(--gold); }
.mcol header span{ font-size:12.5px; font-style:italic; }
.mcol header em{ font-style:normal; font-weight:700; font-size:12.5px; }
.mcol ul{ list-style:none; margin:0; padding:8px 10px; }
.mcol li{ font-size:13.5px; line-height:1.4; padding:10px 0; border-bottom:1px dotted var(--rule); }
.mcol li:last-child{ border-bottom:none; }
.mapnote{ margin-top:12px; border:2px solid var(--gold); background:var(--cream); border-radius:12px; padding:10px 14px; font-family:"Fraunces",Georgia,serif; font-size:15px; text-align:center; font-weight:600; }
.refl p{ margin:8px 0 0; font-size:13.5px; }
CSS
  write_file("$OUT/handout-14-21-full.html", shell('The Center Sentence and the Cup Menu (Teen — full)', '/lessons/14-21/' . $SLUG, $p1 . $p2, $css));
}

# ---------------------------------------------------------------------
# 21-plus  The Four-Step Card  (front: my card; back: wheel and three seats)
# ---------------------------------------------------------------------
sub build_21_plus {
  my @rows = (
    ['1', 'ADDRESS THE FEAR', 'The fear I\'ll meet first, in plain words:'],
    ['2', 'NOTICE WHAT APPEARS IN THOUGHT', 'The degree I expect to see in my own thought:'],
    ['3', 'TURN TO THE CENTER', 'My center, revised: "Whatever is happening, what is true is..."'],
    ['4', 'CHOOSE THE CUP', 'My cup this week, small, specific, something I could offer anyone:'],
  );
  my $rowshtml = '';
  for my $r (@rows) {
    $rowshtml .= qq{<div class="crow"><div class="cn">$r->[0]</div><div class="cb"><b>$r->[1]</b><p>@{[ smart($r->[2]) ]}</p><div class="write"></div>} .
                 ($r->[0] eq '3' ? '<div class="write"></div>' : '') . qq{</div></div>\n};
  }
  my $tests = '<div class="five"><h3>The five tests</h3><ol><li>True in a hospital waiting room.</li><li>Present tense.</li><li>Doesn&rsquo;t need an opponent.</li><li>Plain words.</li><li>Can stand up to the evening news.</li></ol></div>';
  my $p1 = qq{<div class="page">\n} .
    head_block('A CARD · THE FOUR-STEP CARD', 'Both in One Hand', 'What a treatment can look like. Not a formula. In your own words, in your own prayer.') .
    quote_block('Love is impartial and universal in its adaptation and bestowals. It is the open fount which cries, \'Ho, every one that thirsteth, come ye to the waters.\'', 'Science and Health, Mary Baker Eddy, p. 13:2–4') .
    qq{<h2 style="text-align:center; margin-top:2px;">My Card</h2>\n} .
    qq{<div class="cardwrap"><div class="crows">$rowshtml</div><div class="side">$tests</div></div>\n} .
    qq{<p class="optline">One person I&rsquo;ll tell, who will ask me about it next week:</p><div class="write"></div>\n} .
    qq{<p class="promise">No one will see this card unless you choose to share it. It is a promise to yourself that you can keep.</p>\n} .
    footer_html() . "\n</div>\n";

  # back: a wheel with three spokes out to three seats
  my $seat = sub {
    my ($x, $y, @title) = @_;
    my $o = qq{<rect x="$x" y="$y" width="220" height="64" rx="12" fill="$CREAM" stroke="$INK" stroke-width="3"/>};
    my $n = scalar @title;
    for my $i (0..$n-1) {
      my $ty = $y + 32 + ($i - ($n-1)/2)*19 + 5;
      $o .= qq{<text x="@{[ $x+110 ]}" y="$ty" text-anchor="middle" font-size="15" font-weight="700" letter-spacing=".5" fill="$INK">$title[$i]</text>};
    }
    return $o;
  };
  my $svg = '<svg viewBox="0 0 700 420" width="700" height="420" xmlns="http://www.w3.org/2000/svg">';
  $svg .= qq{<line x1="350" y1="140" x2="110" y2="290" stroke="$INK" stroke-width="4"/><line x1="350" y1="140" x2="350" y2="300" stroke="$INK" stroke-width="4"/><line x1="350" y1="140" x2="590" y2="290" stroke="$INK" stroke-width="4"/>};
  $svg .= wheel_svg(cx=>350, cy=>140, R=>104, hubR=>46, rimW=>12, spokes=>8, bumps=>1);
  $svg .= sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="3.5" stroke-linejoin="round"/>', heart_path(350, 130, 17), $GOLD, $INK);
  $svg .= qq{<text x="350" y="162" text-anchor="middle" font-size="11" font-weight="700" letter-spacing="1.2" fill="$INK">CENTER</text>};
  $svg .= qq{<line x1="456" y1="140" x2="486" y2="140" stroke="$GOLDT" stroke-width="2.5"/><text x="492" y="145" font-size="14" font-weight="700" letter-spacing="1.2" fill="$GOLDT">RIM = CUP</text>};
  $svg .= $seat->(0, 290, 'THE ONE WHO LEFT') . $seat->(240, 300, 'THE ONE WHO STAYED') . $seat->(480, 290, 'THE ONE WHO RUNS', 'OUT TO BOTH');
  $svg .= '</svg>';
  my $alt = 'A wheel with a bumpy rim labeled cup and a hub labeled center. Three spokes reach out from the hub to three seats at a table: the one who left, the one who stayed, and the one who runs out to both, the father.';

  my @prompts = ('What does this one believe?', 'What\'s actually true?', 'What would a cup from this seat look like?');
  my $pr = join('', map { "<li>$_</li>" } @prompts);
  my $p2 = qq{<div class="page">\n} .
    qq{<h1 style="font-size:28px; margin-top:0;">The Wheel and the Three Seats</h1><div class="rule"></div>\n} .
    figure($svg, 'A wheel with three seats at the table: the one who left, the one who stayed, the one who runs out to both', $alt, 'text-align:center;') .
    qq{<div class="seatprompts">} . join('', map { qq{<div><b>@{[ ('THE ONE WHO LEFT','THE ONE WHO STAYED','THE ONE WHO RUNS OUT TO BOTH')[$_] ]}</b><ul>$pr</ul></div>} } 0..2) . qq{</div>\n} .
    qq{<p class="optline" style="margin-top:12px;">Which seat am I in today? One word:</p><div class="write" style="max-width:260px;"></div>\n} .
    qq{<div class="quiet">Luke 15:11&ndash;32 is on the Luke 15 sheet.</div>\n} .
    qq{<div class="refl"><p>The seat I&rsquo;m in today, and the center I&rsquo;d hold over it:</p><div class="write"></div><p>One small cup I could offer someone this week:</p><div class="write"></div></div>\n} .
    qq{<p class="pull" style="font-size:16px; margin-top:8px;">A cup without a center runs out. A center without a cup is correctness nobody can feel.</p>\n} .
    footer_html() . "\n</div>\n";

  my $css = <<'CSS';
.cardwrap{ display:flex; gap:16px; align-items:flex-start; margin-top:4px; }
.crows{ flex:1.7; display:flex; flex-direction:column; gap:9px; }
.crow{ display:flex; border:2px solid var(--ink); border-radius:12px; overflow:hidden; }
.cn{ flex:0 0 42px; background:var(--ink); color:var(--gold); font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:24px; display:flex; align-items:center; justify-content:center; }
.cb{ flex:1; padding:7px 14px 4px; }
.cb b{ font-size:11.5px; letter-spacing:.12em; color:var(--gold-text); }
.cb p{ margin:2px 0 2px; font-size:13.5px; line-height:1.4; }
.cb .write{ height:30px; }
.side{ flex:1; } 
.five{ border:1.5px solid var(--rule); background:var(--cream); border-radius:12px; padding:10px 14px; }
.five h3{ font-family:"Fraunces",Georgia,serif; font-size:14px; margin:0 0 4px; }
.five ol{ margin:0; padding-left:18px; font-size:13px; line-height:1.5; }
.optline{ font-size:13.5px; margin:12px 0 0; }
.promise{ font-family:"Fraunces",Georgia,serif; font-style:italic; font-size:12.5px; color:var(--ink-soft); text-align:center; margin:10px auto 0; max-width:52ch; }
.seatprompts{ display:flex; gap:10px; margin-top:6px; }
.seatprompts > div{ flex:1; font-size:12.5px; } 
.seatprompts b{ font-size:11px; letter-spacing:.08em; color:var(--gold-text); }
.seatprompts ul{ margin:3px 0 0; padding-left:16px; line-height:1.4; }
.quiet{ border:1.5px dashed var(--rule); border-radius:10px; padding:8px 12px; margin-top:12px; font-size:13px; color:var(--ink-soft); text-align:center; }
.refl p{ margin:8px 0 0; font-size:13.5px; }
CSS
  write_file("$OUT/handout-21-plus-full.html", shell('The Four-Step Card (Age 21+ — full)', '/lessons/21-plus/' . $SLUG, $p1 . $p2, $css));
}

# ---------------------------------------------------------------------
# Scenario / circumstance cards (cut apart, six per sheet, quiet card back)
# ---------------------------------------------------------------------
my %CARDSETS = (
  '8-11' => {
    title => 'Scenario Cards', eyebrow => 'CARDS · STILL IN THE MIDDLE, CUP IN HAND',
    frame => 'One set per trio. Cut apart. Wobble, peek, middle, cup, on each one.',
    safety => 'Anyone may pass. If a real person is in danger, tell a grown-up right away.',
    cards => [
      'A teammate strikes out with the bases loaded and sits alone at the end of the bench.',
      'A kid eats lunch alone at a full table.',
      'Your sibling\'s tower of blocks, which took an hour to build, falls over.',
      'Someone said something mean to your friend, and your friend\'s face went red.',
      'A new kid doesn\'t know where to go at recess.',
      'A parent came home tired and snapped at everybody.',
    ],
  },
  '11-14' => {
    title => 'Case Cards', eyebrow => 'CARDS · THE GROUP CHAT BLEW UP',
    frame => 'Optional extra cases to swap into the four steps. Cut apart.',
    safety => 'Anyone may pass, trade, or choose another. No names. If anyone\'s safety is at risk, tell a trusted adult now.',
    cards => [
      'Two friends stop speaking after a joke. The group chat splits.',
      'You find out you were left out of a plan from someone\'s story.',
      'A teammate gets benched and is furious at the coach, and at you.',
      'Someone shares something private that was told to them, and the person finds out.',
      'A friend\'s family is going through something. They won\'t say, but they\'re off.',
      'You told the truth, and it made a friend angry.',
    ],
  },
  '14-21' => {
    title => 'Circumstance Cards', eyebrow => 'CARDS · FEAR SHOWS UP FIRST',
    frame => 'Draw one, read it, and say in your own words what is true about it. Cut apart.',
    safety => 'Anyone may pass, trade, or choose another. No names. If anyone\'s safety is at risk, tell a trusted adult now.',
    cards => [
      'A friend is really stressed and isn\'t answering your texts.',
      'A conversation you dread, with someone you love.',
      'The money doesn\'t work this month, and you\'re embarrassed to say.',
      'A headline frightens you.',
      'Someone you can\'t seem to forgive.',
      'You\'re tired, unnoticed, and the work isn\'t finished.',
    ],
  },
  '21-plus' => {
    title => 'Circumstance Cards', eyebrow => 'CARDS · BOTH IN ONE HAND',
    frame => 'Draw one, read it, and say in your own words what is true about it. Cut apart.',
    safety => 'Anyone may pass, trade, or choose another. No names. If anyone\'s safety is at risk, tell a trusted adult now.',
    cards => [
      'A diagnosis arrives for someone you love.',
      'A conversation you dread, with someone you love.',
      'Bills arrive, and the numbers don\'t work.',
      'A headline frightens you.',
      'Someone you can\'t seem to forgive.',
      'You are tired, unnoticed, and the work isn\'t finished.',
    ],
  },
);

sub card_back_svg {
  my $s = '<svg viewBox="0 0 200 160" width="170" height="136" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">';
  $s .= wheel_svg(cx=>70, cy=>80, R=>52, hubR=>20, rimW=>7, spokes=>8);
  $s .= sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="2.5" stroke-linejoin="round"/>', heart_path(70, 78, 10), $GOLD, $INK);
  $s .= cup_svg(150, 84, 52, '#fff');
  $s .= '</svg>';
  return $s;
}

sub build_cards {
  my ($band) = @_;
  my $set = $CARDSETS{$band};
  my $fronts = ''; my $n = 0;
  for my $c (@{ $set->{cards} }) {
    $n++;
    $fronts .= qq{<div class="cd"><span class="cnum">$n</span><p>@{[ smart($c) ]}</p></div>\n};
  }
  my $backs = join('', map { qq{<div class="cd back"><div role="img" aria-label="A wheel and a cup">} . card_back_svg() . qq{</div><b>The Cup and the Center</b></div>\n} } 1..6);
  my $safety = qq{<p class="safety">@{[ smart($set->{safety}) ]}</p>};
  my $p1 = qq{<div class="page">\n} . head_block($set->{eyebrow}, $set->{title}, $set->{frame}) .
    qq{<div class="cgrid">$fronts</div>\n$safety\n} . footer_html() . "\n</div>\n";
  my $p2 = qq{<div class="page">\n} .
    qq{<p class="eyebrow">Card backs &middot; print on the reverse of the cards (flip on the long edge), or skip this page</p>\n} .
    qq{<div class="cgrid">$backs</div>\n$safety\n} . footer_html() . "\n</div>\n";
  my $css = <<'CSS';
.cgrid{ display:grid; grid-template-columns:1fr 1fr; grid-auto-rows:248px; gap:0; border:1.5px dashed var(--rule); margin-top:4px; }
.cd{ border:1.5px dashed var(--rule); padding:26px 28px; display:flex; flex-direction:column; justify-content:center; position:relative; background:#fff; }
.cd p{ font-family:"Fraunces",Georgia,serif; font-size:21px; line-height:1.4; margin:0; }
.cnum{ position:absolute; top:12px; left:16px; font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:18px; color:var(--gold-text); }
.cd.back{ align-items:center; background:var(--cream); text-align:center; gap:8px; }
.cd.back b{ font-family:"Fraunces",Georgia,serif; font-size:14px; letter-spacing:.04em; color:var(--ink-soft); font-weight:500; }
.safety{ font-size:12.5px; color:var(--ink-soft); text-align:center; margin:8px 0 0; font-style:italic; }
.page h1{ font-size:26px; }
.page .frame{ font-size:14px; margin-bottom:8px; }
CSS
  write_file("$OUT/cards-$band.html", shell("$set->{title} ($BAND_LABEL{$band})", "/lessons/$band/$SLUG", $p1 . $p2, $css));
}

# ---------------------------------------------------------------------
# The wall wheel poster (two versions, scalable: letter or 11x17)
# ---------------------------------------------------------------------
sub poster_young {
  my $svg = '<svg viewBox="0 0 700 780" width="100%" xmlns="http://www.w3.org/2000/svg">';
  $svg .= wheel_svg(cx=>350, cy=>385, R=>190, hubR=>84, bumps=>1, rimW=>18);
  $svg .= sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="7" stroke-linejoin="round"/>', heart_path(350, 377, 42), $GOLD, $INK);
  my @w = (['WOBBLE','wobble',350,48],['PEEK','peek',650,340],['MIDDLE','middle',350,640],['CUP','cup',50,340]);
  # words sit just outside the rim at the four compass points, each with its icon
  $svg .= move_icon('wobble', 350, 62, 38, $SKY) . qq{<text x="350" y="128" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="2" fill="$INK">WOBBLE</text>};
  $svg .= move_icon('peek', 622, 385, 38, $CREAM) . qq{<text x="622" y="449" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="2" fill="$INK">PEEK</text>};
  $svg .= move_icon('middle', 350, 700, 38, $SKY) . qq{<text x="350" y="772" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="2" fill="$INK">MIDDLE</text>};
  $svg .= move_icon('cup', 78, 385, 38, $CREAM) . qq{<text x="78" y="449" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="2" fill="$INK">CUP</text>};
  $svg .= '</svg>';
  return qq{<div class="page poster">} .
    qq{<h1 style="font-size:44px;">Hold still. Hand out.</h1><div class="rule"></div>\n} .
    figure($svg, 'A wheel with four moves around it: wobble, peek, middle, cup', 'A large wheel with a bumpy rim and a gold heart in the hub. Four moves are labelled around it: Wobble, Peek, Middle, Cup. Under the title: Hold still. Hand out.') .
    qq{<p class="pcap">The outside wobbles. The middle stays.</p>\n} . footer_html() . "\n</div>\n";
}

sub poster_older {
  my $svg = '<svg viewBox="0 0 700 760" width="100%" xmlns="http://www.w3.org/2000/svg">';
  $svg .= qq{<defs><path id="arcTop" d="M 126,400 A 224,224 0 0 1 574,400"/></defs>};
  $svg .= wheel_svg(cx=>350, cy=>400, R=>190, hubR=>96, bumps=>1, rimW=>18);
  $svg .= qq{<text x="350" y="400" text-anchor="middle" font-size="30" font-weight="700" letter-spacing="3" fill="$INK">CENTER</text>};
  $svg .= qq{<text x="350" y="422" text-anchor="middle" font-size="15" font-weight="600" fill="$INK">What is true,</text><text x="350" y="441" text-anchor="middle" font-size="15" font-weight="600" fill="$INK">whatever appears.</text>};
  $svg .= sprintf('<path d="%s" fill="%s" stroke="%s" stroke-width="5" stroke-linejoin="round"/>', heart_path(350, 350, 17), $GOLD, $INK);
  # four step pills at the corners
  my @pills = ([4, 10, '1', 'Address the fear'], [362, 10, '2', 'Notice what appears in thought'], [362, 690, '3', 'Turn to the center'], [4, 690, '4', 'Choose the cup']);
  for my $p (@pills) {
    my ($x, $y, $num, $txt) = @$p;
    my @l = wrap_text($txt, 18);
    $svg .= qq{<rect x="$x" y="$y" width="334" height="62" rx="14" fill="$CREAM" stroke="$INK" stroke-width="4"/>};
    $svg .= qq{<circle cx="@{[ $x+30 ]}" cy="@{[ $y+31 ]}" r="20" fill="$INK"/><text x="@{[ $x+30 ]}" y="@{[ $y+32 ]}" text-anchor="middle" dominant-baseline="central" font-size="24" font-weight="700" fill="$GOLD">$num</text>};
    if (@l == 1) { $svg .= qq{<text x="@{[ $x+62 ]}" y="@{[ $y+39 ]}" font-size="25" font-weight="700" fill="$INK">$txt</text>}; }
    else { $svg .= qq{<text x="@{[ $x+62 ]}" y="@{[ $y+27 ]}" font-size="23" font-weight="700" fill="$INK">$l[0]</text><text x="@{[ $x+62 ]}" y="@{[ $y+52 ]}" font-size="23" font-weight="700" fill="$INK">$l[1]</text>}; }
  }
  # rim label
  $svg .= qq{<text font-size="17" font-weight="700" fill="$GOLDT" letter-spacing="1"><textPath href="#arcTop" startOffset="50%" text-anchor="middle">CUP &#183; one small, specific, warm act of love</textPath></text>};
  $svg .= '</svg>';
  return qq{<div class="page poster">} .
    qq{<h1 style="font-size:40px;">The Cup and the Center</h1><div class="rule"></div>\n} .
    figure($svg, 'A wheel: the hub is the center, the rim is the cup, with four steps around it', 'A large wheel. The hub is labelled Center: what is true, whatever appears. The rim is labelled Cup: one small, specific, warm act of love. Four steps sit around it: 1 Address the fear, 2 Notice what appears in thought, 3 Turn to the center, 4 Choose the cup.') .
    qq{<p class="pcap">A cup without a center runs out. A center without a cup is correctness nobody can feel.</p>\n} . footer_html() . "\n</div>\n";
}

sub build_poster {
  my $css = <<'CSS';
.page.poster{ height:auto; overflow:visible; }
.page.poster + .page.poster{ height:auto; }
.page.poster .pfoot{ position:static; margin-top:10px; }
.pcap{ font-family:"Fraunces",Georgia,serif; font-style:italic; font-size:20px; text-align:center; margin:4px 0 0; color:var(--ink-soft); }
@media print{ @page{ size:auto; margin:0.4in; } .page.poster{ height:auto; } }
CSS
  write_file("$OUT/the-wheel-poster.html", shell('The Wheel Poster', '/lessons/' . $SLUG, poster_young() . poster_older(), $css));
}


# ---------------------------------------------------------------------
# Luke 15:11-32, King James Version (public domain), in three scenes
# ---------------------------------------------------------------------
sub build_luke {
  my @scenes = (
    { range => '11–19', prompt => 'Mark one word that surprises you. Where does the turn happen?', verses => [
      [11, 'And he said, A certain man had two sons:'],
      [12, 'And the younger of them said to his father, Father, give me the portion of goods that falleth to me. And he divided unto them his living.'],
      [13, 'And not many days after the younger son gathered all together, and took his journey into a far country, and there wasted his substance with riotous living.'],
      [14, 'And when he had spent all, there arose a mighty famine in that land; and he began to be in want.'],
      [15, 'And he went and joined himself to a citizen of that country; and he sent him into his fields to feed swine.'],
      [16, 'And he would fain have filled his belly with the husks that the swine did eat: and no man gave unto him.'],
      [17, 'And when he came to himself, he said, How many hired servants of my father\'s have bread enough and to spare, and I perish with hunger!'],
      [18, 'I will arise and go to my father, and will say unto him, Father, I have sinned against heaven, and before thee,'],
      [19, 'And am no more worthy to be called thy son: make me as one of thy hired servants.'],
    ]},
    { range => '20–24', prompt => 'Watch the father. What changes in him? What doesn\'t?', verses => [
      [20, 'And he arose, and came to his father. But when he was yet a great way off, his father saw him, and had compassion, and ran, and fell on his neck, and kissed him.'],
      [21, 'And the son said unto him, Father, I have sinned against heaven, and in thy sight, and am no more worthy to be called thy son.'],
      [22, 'But the father said to his servants, Bring forth the best robe, and put it on him; and put a ring on his hand, and shoes on his feet:'],
      [23, 'And bring hither the fatted calf, and kill it; and let us eat, and be merry:'],
      [24, 'For this my son was dead, and is alive again; he was lost, and is found. And they began to be merry.'],
    ]},
    { range => '25–32', prompt => 'The elder son never left. Where is he standing?', verses => [
      [25, 'Now his elder son was in the field: and as he came and drew nigh to the house, he heard musick and dancing.'],
      [26, 'And he called one of the servants, and asked what these things meant.'],
      [27, 'And he said unto him, Thy brother is come; and thy father hath killed the fatted calf, because he hath received him safe and sound.'],
      [28, 'And he was angry, and would not go in: therefore came his father out, and intreated him.'],
      [29, 'And he answering said to his father, Lo, these many years do I serve thee, neither transgressed I at any time thy commandment: and yet thou never gavest me a kid, that I might make merry with my friends:'],
      [30, 'But as soon as this thy son was come, which hath devoured thy living with harlots, thou hast killed for him the fatted calf.'],
      [31, 'And he said unto him, Son, thou art ever with me, and all that I have is thine.'],
      [32, 'It is meet that we should be merry, and be glad: for this thy brother was dead, and is alive again; and was lost, and is found.'],
    ]},
  );
  my $n = 0; my $body = '';
  for my $sc (@scenes) {
    $n++;
    my $v = join(' ', map { qq{<sup>$_->[0]</sup>} . esc($_->[1]) } @{ $sc->{verses} });
    $body .= qq{<section class="scene"><div class="text"><h2>Scene $n <span>Luke 15:$sc->{range}</span></h2><p>$v</p></div><aside class="margin"><b>In the margin</b><p>@{[ smart($sc->{prompt}) ]}</p><div class="write"></div><div class="write"></div></aside></section>\n};
  }
  my $page = qq{<div class="page">\n} .
    head_block('A READING · THREE SEATS AT THE TABLE', 'The Father and Two Sons', 'Read it in three scenes. Mark what you notice in the margin.') .
    qq{<p class="cite" style="margin-top:-6px;">Luke 15:11&ndash;32, King James Version (public domain)</p>\n} .
    $body .
    qq{<div class="seatq"><b>Three seats, three questions</b><ul><li>What does this one believe?</li><li>What&rsquo;s actually true, in the one Mind?</li><li>What would a cup of cold water look like from this seat?</li></ul><p class="which">Which seat am I in today? One word: <span class="wl"></span></p></div>\n} .
    footer_html() . "\n</div>\n";
  my $css = <<'CSS';
.lp{ display:none; }
.scene{ display:flex; gap:18px; margin-bottom:6px; align-items:flex-start; }
.text{ flex:2.2; } .margin{ flex:1; border-left:2px solid var(--gold); padding-left:12px; }
.scene h2{ font-size:14px; margin:0 0 3px; } .scene h2 span{ font-weight:400; font-size:12px; color:var(--ink-soft); }
.scene p{ margin:0; font-family:"Fraunces",Georgia,serif; font-size:12.3px; line-height:1.4; }
.scene sup{ font-family:"Inter",sans-serif; font-size:9px; font-weight:700; color:var(--gold-text); margin-right:2px; }
.margin b{ font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:var(--gold-text); }
.margin p{ font-family:"Inter",sans-serif; font-size:12.5px; margin:3px 0 4px; }
.margin .write{ height:28px; }
.seatq{ border:2px solid var(--ink); border-radius:12px; padding:6px 16px; margin-bottom:34px; background:var(--cream); font-size:13px; }
.seatq ul{ margin:4px 0; padding-left:18px; line-height:1.5; }
.which{ margin:4px 0 0; font-weight:600; } .wl{ display:inline-block; width:200px; border-bottom:1.5px solid var(--ink); }
.big .scene p{ font-size:16px; line-height:1.55; } .big .margin p{ font-size:15px; } .big .seatq{ font-size:15px; }
.big .page{ height:auto; overflow:visible; } .big .pfoot{ position:static; margin-top:10px; }
.sizebtn{ background:transparent !important; color:var(--cream) !important; border:1.5px solid rgba(251,245,234,.55) !important; margin-right:8px; }
CSS
  my $html = shell('Luke 15: three seats (Teen and Age 21+)', '/lessons/14-21/' . $SLUG, $page, $css);
  $html =~ s{<button type="button" onclick="window.print\(\)">}{<span><button type="button" class="sizebtn" onclick="document.querySelector('.sheet').classList.toggle('big')">Large print</button><button type="button" onclick="window.print()">};
  $html =~ s{Print this page</button>}{Print this page</button></span>};
  write_file("$OUT/luke-15-three-seats.html", $html);
}

# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------
mkdir $OUT unless -d $OUT;
build_5_8(); build_8_11(); build_11_14(); build_14_21(); build_21_plus();
build_cards($_) for qw(8-11 11-14 14-21 21-plus);
build_poster();
build_luke();
print "\nDone.\n";
