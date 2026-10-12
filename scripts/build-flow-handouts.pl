#!/usr/bin/perl
#
# Builds the one-page "yes/no flow" chart handouts for the rescue-or-faith
# lesson (assets/materials/rescue-or-faith/handout-<band>-full.html).
#
# Unlike build-text-handouts.pl, which skips the `body:` field because it is
# prose describing a diagram, this lesson's flow chart IS the handout, and
# its wording differs by age band (the logic is identical; see the "Age
# adaptations of the flow" section of content/lessons/rescue-or-faith/
# core-model.md). So the five questions and their outcomes live here as data,
# one block per band, and a single template renders them.
#
# 21-plus is the verbatim master record. 14-21 and 11-14 swap ACT NOW for
# "Tell a trusted adult right away" (11-14 also uses the softened wording the
# 11-14 lesson teaches). 8-11 is the kid-language version.
#
# Run: perl scripts/build-flow-handouts.pl
#
use strict;
use warnings;
use utf8;
use File::Basename qw(dirname);
use File::Path qw(make_path);
use Cwd qw(abs_path);

binmode(STDOUT, ':encoding(UTF-8)');

my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $OUT_DIR = "$ROOT/assets/materials/rescue-or-faith";
make_path($OUT_DIR);

sub esc { my ($s) = @_; $s =~ s/&/&amp;/g; $s =~ s/</&lt;/g; $s =~ s/>/&gt;/g; return $s; }
sub attr_esc { my ($s) = @_; $s = esc($s); $s =~ s/"/&quot;/g; return $s; }

# A branch is [ kind, heading, text ]: kind is 'go' (continue to the next
# question), 'stop' (an outcome that ends the flow), or 'loop' (an outcome
# that returns to the same question).
sub go   { return ['go',   $_[0], '']; }
sub stop { return ['stop', $_[0], $_[1]]; }
sub loop { return ['loop', $_[0], $_[1]]; }

my %BANDS = (

  '21-plus' => {
    label => 'Age 21+',
    lesson => '/lessons/21-plus/rescue-or-faith',
    title => 'The Yes/No Flow',
    frame => 'Five questions. Quality of thought comes first.',
    start => 'Someone I love is struggling — and I feel the pull to step in.',
    rows => [
      { n=>1, tag=>'SAFETY', q=>'Is anyone in danger right now?',
        yes=>stop('ACT NOW', 'Call, drive, get help — now. Their need is real, so act, and stay as calm as you can.'),
        no=>go('Go to question 2') },
      { n=>2, tag=>'MY GROUND', q=>'Am I grounded: God the only power, me able to listen?',
        yes=>go('Go to question 3'),
        no=>loop('PAUSE · GET GROUNDED', 'Breathe. Pray. Listen. A hurried decision isn’t wise yet. Come back when calm.') },
      { n=>3, tag=>'THEIR ABILITY', q=>'Do I see them as able — not needing me to survive?',
        yes=>go('Go to question 4'),
        no=>loop('LOOK AGAIN', 'God is their power, not me. Name one real strength in them. Then ask again.') },
      { n=>4, tag=>'THEIR CHOICE', q=>'Did they ask, or did I decide for them?', note=>'Yes = they asked. No = I decided.',
        yes=>go('Go to question 5'),
        no=>stop('OFFER, DON’T IMPOSE', '“I’m here. What would help?” Then listen, and let them decide.') },
      { n=>5, tag=>'THEIR WORK', q=>'Would I be doing what they can do themselves?',
        yes=>stop('WALK BESIDE', 'Ask questions. Name their strengths. Stay close without taking over.'),
        no=>stop('GIVE FREELY', 'They may truly need a ride, a meal, an ear. Give it — no strings, no scorekeeping.') },
    ],
    either => 'Stay close. God is the only power, already at work in them — I’m a friend, not the source.',
    pull => 'They may truly, humanly need your help. That was never the question — the question is the thought it comes from.',
  },

  '14-21' => {
    label => 'Teen',
    lesson => '/lessons/14-21/rescue-or-faith',
    title => 'The Yes/No Flow',
    frame => 'Five questions. Quality of thought comes first.',
    start => 'Someone I love is struggling — and I feel the pull to step in.',
    rows => [
      { n=>1, tag=>'SAFETY', q=>'Is anyone in danger right now?',
        yes=>stop('TELL A TRUSTED ADULT', 'Tell a trusted adult right away. Their need is real — you don’t have to hold it alone.'),
        no=>go('Go to question 2') },
      { n=>2, tag=>'MY GROUND', q=>'Am I grounded: God the only power, me able to listen?',
        yes=>go('Go to question 3'),
        no=>loop('PAUSE · GET GROUNDED', 'Breathe. Pray, or just listen. A hurried decision isn’t wise yet. Come back when calm.') },
      { n=>3, tag=>'THEIR ABILITY', q=>'Do I see them as able — not needing me to survive?',
        yes=>go('Go to question 4'),
        no=>loop('LOOK AGAIN', 'God is their power, not me. Name one real strength in them. Then ask again.') },
      { n=>4, tag=>'THEIR CHOICE', q=>'Did they ask, or did I decide for them?', note=>'Yes = they asked. No = I decided.',
        yes=>go('Go to question 5'),
        no=>stop('OFFER, DON’T IMPOSE', '“I’m here. What would help?” Then listen, and let them decide.') },
      { n=>5, tag=>'THEIR WORK', q=>'Would I be doing what they can do themselves?',
        yes=>stop('WALK BESIDE', 'Ask questions. Name their strengths. Stay close without taking over.'),
        no=>stop('GIVE FREELY', 'They may truly need a ride, a meal, an ear. Give it — no strings, no scorekeeping.') },
    ],
    either => 'Stay close. God is the only power, already at work in them — I’m a friend, not the source.',
    pull => 'They may truly, humanly need your help. That was never the question — the question is the thought it comes from.',
  },

  '11-14' => {
    label => 'Grade 6-8',
    lesson => '/lessons/11-14/rescue-or-faith',
    title => 'Five Questions Before You Help',
    frame => 'Hurried, panicked help isn’t wise help yet. Check the thought first.',
    start => 'Someone I care about is struggling — and I feel the pull to step in.',
    rows => [
      { n=>1, tag=>'SAFETY', q=>'Is anyone in danger right now?',
        yes=>stop('TELL A TRUSTED ADULT', 'Tell a trusted adult right away. Their need is real — you don’t have to hold it alone.'),
        no=>go('Go to question 2') },
      { n=>2, tag=>'MY GROUND', q=>'Am I calm enough to listen?',
        yes=>go('Go to question 3'),
        no=>loop('PAUSE', 'Breathe. Listen. Hurried help isn’t wise yet. Come back when calm.') },
      { n=>3, tag=>'THEIR ABILITY', q=>'Do I see them as able — not needing me to survive?',
        yes=>go('Go to question 4'),
        no=>loop('LOOK AGAIN', 'Something bigger than this problem is in charge, not me. Name one real strength in them. Then ask again.') },
      { n=>4, tag=>'THEIR CHOICE', q=>'Did they ask me?', note=>'Yes = they asked. No = I decided.',
        yes=>go('Go to question 5'),
        no=>stop('OFFER, DON’T IMPOSE', '“I’m here. What would help?” Then listen, and let them decide.') },
      { n=>5, tag=>'THEIR WORK', q=>'Would I be doing what they can do themselves?',
        yes=>stop('STAY BESIDE', 'Ask questions. Name their strengths. Stay close without taking over.'),
        no=>stop('GIVE FREELY', 'They may truly need a ride, a meal, an ear. Give it — no strings, no scorekeeping.') },
    ],
    either => 'Stay close. I’m a friend, not the source.',
    pull => 'They may truly need your help. That was never the question — the question is the thought it comes from.',
  },

  '8-11' => {
    label => 'Grade 3-5',
    lesson => '/lessons/8-11/rescue-or-faith',
    title => 'Five Questions for a Coach Hand',
    frame => 'Before you step in, ask yourself these. In order.',
    start => 'My friend is stuck, and I really want to help.',
    rows => [
      { n=>1, tag=>'HURT?', q=>'Is anyone hurt or in danger?',
        yes=>stop('GET A GROWN-UP NOW', 'Their need is real. Tell a trusted grown-up right away — you don’t have to hold it alone.'),
        no=>go('Go to question 2') },
      { n=>2, tag=>'CALM?', q=>'Am I calm, or am I panicking?', yesLabel=>'Calm', noLabel=>'Panicking',
        yes=>go('Go to question 3'),
        no=>loop('BREATHE', 'Take a breath. Wait a second. Come back when you’re calm.') },
      { n=>3, tag=>'CAN THEY?', q=>'Do I think my friend can do this?',
        yes=>go('Go to question 4'),
        no=>loop('LOOK AGAIN', 'Name one thing they’re good at. Then ask again.') },
      { n=>4, tag=>'DID THEY ASK?', q=>'Did they ask me?',
        yes=>go('Go to question 5'),
        no=>stop('ASK FIRST', '“Want help, or want me to listen?” Then do what they say.') },
      { n=>5, tag=>'THEIR JOB?', q=>'Is it something they can do themselves?',
        yes=>stop('COACH HAND', 'Ask questions. Point to what they’re good at. Stay next to them.'),
        no=>stop('HELP — NO STRINGS', 'Help, and don’t keep score.') },
    ],
    either => 'Either way: stay close. I’m a friend, not the battery.',
    pull => 'The power to do it is already in your friend.',
  },
);

my $CSS = <<'CSS';
:root{
  --cream:#FBF5EA; --gold:#E8A94C; --gold-text:#935F1A;
  --sage:#8CA37E; --sage-text:#3F5236; --sky:#A9C9D9; --sky-text:#4E7A93;
  --ink:#362F4B; --ink-soft:rgba(54,47,75,.72); --rule:rgba(54,47,75,.18);
}
*{ box-sizing:border-box; }
html,body{ margin:0; }
body{
  background:#EAE2D2;
  font-family:"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  min-height:100vh; display:flex; flex-direction:column; align-items:center;
}
.toolbar{
  width:100%; background:var(--ink); color:var(--cream);
  padding:14px 20px; display:flex; justify-content:space-between; align-items:center;
  gap:16px; flex-wrap:wrap;
}
.toolbar a{ color:var(--cream); text-decoration:none; font-size:14px; opacity:.85; }
.toolbar a:hover{ opacity:1; text-decoration:underline; }
.toolbar-actions{ display:flex; gap:10px; flex-wrap:wrap; }
.toolbar button{
  background:var(--gold); color:#3B2A0E; border:none; border-radius:4px;
  padding:9px 18px; font-weight:600; font-size:14px; cursor:pointer;
}
.toolbar .copy-btn{ background:transparent; color:var(--cream); border:1.5px solid rgba(251,245,234,.55); }
.sheet-wrap{ padding:36px 16px 48px; width:100%; display:flex; justify-content:center; }
.sheet{ background:#fff; box-shadow:0 12px 40px rgba(0,0,0,.18); width:816px; max-width:100%; padding:44px 52px 36px; }
.eyebrow{
  font-size:11px; font-weight:600; letter-spacing:.14em; text-transform:uppercase;
  color:var(--gold-text); text-align:center; margin:0 0 10px;
}
.sheet > h1{ font-family:"Fraunces",Georgia,serif; font-weight:600; color:var(--ink); margin:0 0 8px; text-align:center; font-size:30px; }
.rule{ width:56px; height:3px; background:var(--gold); margin:0 auto 14px; border-radius:2px; }
.frame{ font-family:"Fraunces",Georgia,serif; font-style:italic; line-height:1.5; color:var(--ink-soft); text-align:center; font-size:15px; margin:0 0 16px; }
.start{ background:var(--cream); border:1.5px solid var(--gold); border-radius:10px; padding:10px 16px; text-align:center; font-family:"Fraunces",Georgia,serif; font-size:15px; color:var(--ink); margin:0 0 10px; }
.start b{ font-family:"Inter",sans-serif; font-size:10px; letter-spacing:.14em; color:var(--gold-text); display:block; margin-bottom:2px; }
.arrow{ text-align:center; color:var(--ink-soft); font-size:14px; line-height:1; margin:2px 0; }
.row{ border:1.5px solid var(--rule); border-radius:10px; overflow:hidden; margin:0; }
.q{ display:flex; gap:10px; align-items:baseline; padding:8px 14px; background:var(--ink); color:var(--cream); }
.q .n{ font-family:"Fraunces",Georgia,serif; font-weight:600; font-size:18px; color:var(--gold); flex:0 0 auto; }
.q .tag{ font-size:9.5px; font-weight:600; letter-spacing:.14em; opacity:.8; flex:0 0 auto; }
.q .text{ font-family:"Fraunces",Georgia,serif; font-size:14.5px; line-height:1.35; }
.q .note{ display:block; font-family:"Inter",sans-serif; font-size:10.5px; opacity:.75; margin-top:2px; }
.branches{ display:grid; grid-template-columns:1fr 1fr; }
.br{ padding:8px 14px 9px; font-size:12px; line-height:1.4; color:var(--ink); }
.br + .br{ border-left:1.5px solid var(--rule); }
.br .lab{ font-size:9.5px; font-weight:700; letter-spacing:.14em; color:var(--ink-soft); display:block; margin-bottom:3px; }
.br .head{ font-weight:700; letter-spacing:.04em; font-size:12px; display:block; }
.br.go{ color:var(--ink-soft); }
.br.go .head{ font-weight:500; font-style:italic; letter-spacing:0; }
.br.stop{ background:rgba(140,163,126,.18); }
.br.stop .head{ color:var(--sage-text); }
.br.loop{ background:rgba(232,169,76,.16); }
.br.loop .head{ color:var(--gold-text); }
.br .ret{ display:block; font-size:10.5px; color:var(--ink-soft); font-style:italic; margin-top:2px; }
.either{ margin:10px 0 0; border-radius:10px; background:rgba(169,201,217,.35); padding:9px 16px; text-align:center; font-family:"Fraunces",Georgia,serif; font-size:14px; color:var(--ink); }
.either b{ font-family:"Inter",sans-serif; font-size:10px; letter-spacing:.14em; color:var(--sky-text); display:block; margin-bottom:2px; }
.pull{ font-family:"Fraunces",Georgia,serif; font-weight:600; color:var(--gold-text); text-align:center; line-height:1.4; font-size:14.5px; margin:14px 0 0; }
.foot{ font-family:"Fraunces",Georgia,serif; font-style:italic; color:var(--ink-soft); text-align:center; font-size:10.5px; margin:12px 0 0; }
@media (max-width:640px){ .sheet{ padding:28px 18px; } .branches{ grid-template-columns:1fr; } .br + .br{ border-left:none; border-top:1.5px solid var(--rule); } }
@media print {
  .toolbar{ display:none; }
  body{ background:#fff; min-height:0; }
  .sheet-wrap{ padding:0; }
  .sheet{ box-shadow:none; width:auto; max-width:none; padding:0; }
  .row, .start, .either{ break-inside:avoid; }
  .sheet > h1{ font-size:26px; margin-bottom:4px; }
  .rule{ margin-bottom:8px; }
  .frame{ margin-bottom:8px; font-size:13.5px; }
  .start{ padding:6px 14px; margin-bottom:4px; font-size:14px; }
  .arrow{ font-size:11px; margin:0; }
  .q{ padding:5px 12px; }
  .q .text{ font-size:13.5px; }
  .br{ padding:5px 12px 6px; font-size:11px; line-height:1.35; }
  .either{ margin-top:6px; padding:6px 14px; font-size:13px; }
  .pull{ margin-top:8px; font-size:13.5px; }
  .foot{ margin-top:6px; }
  @page{ size:letter; margin:0.45in; }
}
CSS

my $JS = <<'JS';
(function () {
  var btn = document.querySelector(".copy-btn");
  if (!btn) return;
  var original = btn.textContent;
  function done(ok) {
    btn.textContent = ok ? "Copied✓" : "Couldn't copy";
    window.setTimeout(function () { btn.textContent = original; }, 1800);
  }
  btn.addEventListener("click", function () {
    var text = btn.getAttribute("data-copy-text");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
      return;
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done(true);
    } catch (err) { done(false); }
  });
})();
JS

sub branch_html {
  my ($which, $b, $row) = @_;
  my ($kind, $head, $text) = @$b;
  my $lab = $which eq 'yes' ? ($row->{yesLabel} // 'Yes') : ($row->{noLabel} // 'No');
  my $html = qq{<div class="br $kind"><span class="lab">} . uc(esc($lab)) . qq{ &rarr;</span><span class="head">} . esc($head) . qq{</span>};
  $html .= ' ' . esc($text) if length $text;
  $html .= qq{<span class="ret">Then back to question $row->{n}.</span>} if $kind eq 'loop';
  $html .= '</div>';
  return $html;
}

sub plain_text {
  my ($d) = @_;
  my @l = ($d->{title}, '', $d->{frame}, '', 'START: ' . $d->{start});
  for my $r (@{ $d->{rows} }) {
    push @l, '', "$r->{n}. $r->{tag} — $r->{q}" . ($r->{note} ? " ($r->{note})" : '');
    for my $w (qw(yes no)) {
      my ($kind, $head, $text) = @{ $r->{$w} };
      my $lab = $w eq 'yes' ? ($r->{yesLabel} // 'Yes') : ($r->{noLabel} // 'No');
      my $line = "   $lab → $head" . (length $text ? ": $text" : '');
      $line .= " (then back to question $r->{n})" if $kind eq 'loop';
      push @l, $line;
    }
  }
  push @l, '', 'EITHER WAY: ' . $d->{either}, '', $d->{pull}, '', 'spirituallessonplans.org · a free, open resource';
  return join("\n", @l);
}

for my $band (sort keys %BANDS) {
  my $d = $BANDS{$band};
  my $body = '';
  $body .= qq{      <div class="start"><b>START</b>} . esc($d->{start}) . qq{</div>\n};
  for my $r (@{ $d->{rows} }) {
    my $note = $r->{note} ? qq{<span class="note">} . esc($r->{note}) . '</span>' : '';
    $body .= qq{      <div class="arrow" aria-hidden="true">&darr;</div>\n};
    $body .= qq{      <div class="row">\n};
    $body .= qq{        <div class="q"><span class="n">$r->{n}</span><span class="tag">} . esc($r->{tag}) . qq{</span><span class="text">} . esc($r->{q}) . qq{$note</span></div>\n};
    $body .= qq{        <div class="branches">} . branch_html('yes', $r->{yes}, $r) . branch_html('no', $r->{no}, $r) . qq{</div>\n};
    $body .= qq{      </div>\n};
  }
  my $html = <<"HTML";
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>@{[ esc($d->{title}) ]} ($d->{label} — full) — Spiritual Lesson Plans</title>
<meta name="robots" content="noindex, follow">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%23E8A94C%22/></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght\@9..144,300;9..144,400;9..144,500;9..144,600&family=Inter:wght\@400;500;600;700&display=swap" rel="stylesheet">
<style>
$CSS</style>
</head>
<body>
<div class="toolbar">
  <a href="$d->{lesson}">&larr; Back to the lesson</a>
  <div class="toolbar-actions">
    <button type="button" class="copy-btn" data-copy-text="@{[ attr_esc(plain_text($d)) ]}">Copy text</button>
    <button type="button" onclick="window.print()">Print this handout</button>
  </div>
</div>
<div class="sheet-wrap">
  <div class="sheet">
      <p class="eyebrow">A VISUAL &middot; THE YES/NO FLOW</p>
      <h1>@{[ esc($d->{title}) ]}</h1>
      <div class="rule"></div>
      <p class="frame">@{[ esc($d->{frame}) ]}</p>
$body      <div class="either"><b>EITHER WAY</b>@{[ esc($d->{either}) ]}</div>
      <p class="pull">@{[ esc($d->{pull}) ]}</p>
      <p class="foot">spirituallessonplans.org &middot; Free to use, adapt, and share &middot; CC BY-SA 4.0</p>
  </div>
</div>
<script>
$JS</script>
</body>
</html>
HTML
  my $path = "$OUT_DIR/handout-$band-full.html";
  open(my $fh, '>:encoding(UTF-8)', $path) or die "Can't write $path: $!";
  print $fh $html;
  close $fh;
  print "Wrote $path\n";
}
