#!/usr/bin/perl
#
# One-time importer: normalizes Ian's authored lesson content (v1-style
# markdown, no frontmatter, several header/quick-ref formatting variants
# across sessions) into this site's canonical content-layer format (real
# YAML frontmatter, consistent H2/H3 headers) at content/lessons/<slug>/.
#
# Source and target both use markdown + a shared section grammar, but the
# source varies file-to-file: bold pseudo-headers vs real H3s, Title Case
# vs sentence case, two different Quick-ref layouts, two different Beat-
# header orderings. This script normalizes all of that. It also prints a
# validation report per file — check it, since a silent parse mismatch on
# hand-written content is worse than a loud one.
#
# Run: perl scripts/import-content.pl <source-lessons-dir>
#   e.g. perl scripts/import-content.pl \
#     "/c/Users/ian/Downloads/spirituallessonplans-full-handoff/final-package/content/lessons"
#
use strict;
use warnings;
use utf8;
use File::Basename qw(basename dirname);
use File::Path qw(make_path);
use Cwd qw(abs_path);

binmode(STDOUT, ':encoding(UTF-8)');
binmode(STDERR, ':encoding(UTF-8)');

my $SRC = shift @ARGV or die "usage: perl import-content.pl <source-lessons-dir>\n";
$SRC =~ s{/+$}{};
my $ROOT = abs_path(dirname(__FILE__) . '/..');
my $DEST = "$ROOT/content/lessons";

# Topics to skip entirely (already hand-built, or handled separately).
my %SKIP_TOPIC = ( 'is-god-keeping-score' => 1 );

my %BAND_LABEL = (
  '5-8'    => "Early Elementary (K\x{2013}2)",
  '8-11'   => "Upper Elementary (Grades 3\x{2013}5)",
  '11-14'  => "Middle School (Grades 6\x{2013}8)",
  '14-21'  => "Teen & Early College",
  '21-plus'=> "College Student & Adult (21+)",
);

# Best-fit topic category per lesson (see content/taxonomy/lesson-topics.md
# for the current 8-category scheme and definitions). Feeds the /lessons
# topic-browse view and homepage quick-suggest tool.
my %TOPIC_CATEGORY = (
  'not-the-struggle'                    => 'disappointment-and-hard-days',
  'off-days-are-allowed'                => 'disappointment-and-hard-days',
  'trust-the-mover'                     => 'disappointment-and-hard-days',
  'finding-the-bigger-us'               => 'conflict-and-forgiveness, belonging-and-loneliness',
  'when-someone-feels-like-the-enemy'   => 'conflict-and-forgiveness',
  'lonely-in-a-crowded-room'            => 'belonging-and-loneliness',
  'learning-to-hear-the-nudge'          => 'decisions-and-guidance',
  'is-regret-a-fair-teacher'            => 'disappointment-and-hard-days',
  'does-god-make-my-decisions'          => 'decisions-and-guidance',
  'words-that-open-doors'               => 'doubt-and-hard-questions-about-god',
  'lgbtqia-youth-and-spiritual-learning'=> 'sensitive-topics',
  'talking-about-pornography-use'       => 'sensitive-topics',
);

# Topics/bands needing the stronger safeguarding flags, beyond the
# blanket "11-14 gets requires_adult_facilitation_notes" default below.
my %SENSITIVE_TOPIC = (
  'talking-about-pornography-use'        => 'teen-adult-only',
  'lgbtqia-youth-and-spiritual-learning' => 'requires-careful-adaptation',
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
  make_path(dirname($path));
  open(my $fh, '>:encoding(UTF-8)', $path) or die "Can't write $path: $!";
  print $fh $content;
  close $fh;
}

# ---------------------------------------------------------------------
# Header parsing: title, hook, quick-ref
# ---------------------------------------------------------------------

sub parse_head {
  my ($text) = @_;
  my %h;

  $text =~ /^#\s+(.+?)\s*$/m or die "No H1 title found";
  my $title = $1;
  $title =~ s/\s*\([^)]*\)\s*$//; # strip a trailing "(Ages 5-8)"-style suffix
  $h{title} = $title;

  if ($text =~ /^\*([^*\n]+)\*\s*$/m) {
    $h{hook} = $1;
  } elsif ($text =~ /^\*\*Subtitle:\*\*\s*(.+?)\s*$/mi) {
    $h{hook} = $1;
  } else {
    $h{hook} = '';
  }

  my $qr;
  if ($text =~ /^\*\*Quick\s*Ref(?:erence)?:\*\*\s*(.+?)\s*$/mi) {
    $qr = $1;
  } elsif ($text =~ /^\*\*Time:\*\*.*\*\*Format:\*\*\s*.+$/mi) {
    # "**Time:** X | **Group:** Y | **Age:** Z | **Format:** W" — each
    # field individually bolded, no wrapping "Quick ref:" label at all.
    ($qr) = $text =~ /^(\*\*Time:\*\*.*)$/mi;
    $qr =~ s/\*\*//g;
  }

  if (defined $qr) {
    my %f;
    if ($qr =~ /\|/) {
      # "Time: X | Group: Y | Age: Z | Format: W"
      for my $part (split /\|/, $qr) {
        if ($part =~ /^\s*Time:\s*(.+?)\s*$/i) { $f{time} = $1; }
        elsif ($part =~ /^\s*Group:\s*(.+?)\s*$/i) { $f{group} = $1; }
        elsif ($part =~ /^\s*Age:\s*(.+?)\s*$/i) { $f{age} = $1; }
        elsif ($part =~ /^\s*Format:\s*(.+?)\s*$/i) { $f{format} = $1; }
      }
    } else {
      # "Time X \x{b7} Group Y \x{b7} Age Z \x{b7} Format W"
      for my $part (split /\x{b7}|·/, $qr) {
        if ($part =~ /^\s*Time\s+(.+?)\s*$/i) { $f{time} = $1; }
        elsif ($part =~ /^\s*Group\s+(.+?)\s*$/i) { $f{group} = $1; }
        elsif ($part =~ /^\s*Age\s+(.+?)\s*$/i) { $f{age} = $1; }
        elsif ($part =~ /^\s*Format\s+(.+?)\s*$/i) { $f{format} = $1; }
      }
    }
    $h{time_display} = $f{time} // '';
    $h{group_display} = $f{group} // '';
    $h{format_display} = $f{format} // '';
  } else {
    warn "  ! no Quick ref line found\n";
    @h{qw(time_display group_display format_display)} = ('', '', '');
  }

  return \%h;
}

sub time_minutes_from_display {
  my ($s) = @_;
  my @nums = ($s =~ /(\d+)/g);
  return @nums ? $nums[-1] : 45;
}

sub group_format_from_display {
  my ($s) = @_;
  $s = lc($s // '');
  return 'circle-time' if $s =~ /circle/;
  return '1:1-or-group' if $s =~ /1:1/;
  return 'small-group' if $s =~ /small.group|pairs|full class/;
  return 'discussion';
}

# ---------------------------------------------------------------------
# Body normalization: bring every variant to this site's canonical
# section grammar (see build-lessons.pl's split_sections/split_beats).
# ---------------------------------------------------------------------

sub normalize_body {
  my ($text) = @_;

  # Drop everything up through the Quick-ref line (either format) — head
  # fields are already captured; only the body remains.
  $text =~ s/\A.*?^\*\*Quick\s*Ref(?:erence)?:\*\*.*?$//msi;
  $text =~ s/\A.*?^\*\*Time:\*\*.*\*\*Format:\*\*.*?$//msi;
  $text =~ s/\A\s+//;

  # Drop a "Before You Begin" wrapper heading — its two subsections
  # become top-level H2s below.
  $text =~ s/^##\s*Before You Begin\s*$//mi;

  # A rare extra preamble ("**Introductory note**" + a paragraph) that
  # sits before "**What you should know**" in one source file. Fold it
  # into the same section rather than letting it dangle before the first
  # H2, which split_sections() would silently drop.
  $text =~ s/^\*\*Introductory note\*\*\s*\n\n(.*?)\n\n\*\*What you should know\*\*\s*\n/## What you should know\n\n$1\n\n/msi;

  # Bold pseudo-headers -> canonical H2s (handles trailing text like
  # "What We're Assuming: The Starting Point").
  $text =~ s/^\*\*What you should know\*\*:?\s*$/## What you should know/mi;
  # Covers both "**What we're assuming**: The starting point" (suffix
  # outside the bold) and "**What we're assuming: The starting point**"
  # (suffix inside it).
  $text =~ s/^\*\*What we.re assuming:?\s*[^\n*]*\*\*:?[^\n]*$/## What we're assuming/mi;
  # Already-H3 variant, any case -> canonical H2.
  $text =~ s/^###\s*What you should know\s*$/## What you should know/mi;
  $text =~ s/^###\s*What we.re assuming[^\n]*$/## What we're assuming/mi;
  # "### The starting point" is a from-scratch alias for the same
  # subsection in a couple of the original, pre-project lesson files.
  $text =~ s/^###\s*The starting point\s*$/## What we're assuming/mi;

  # Canonicalize case on the other top-level sections regardless of
  # source case, and promote to ## if the source used a different level.
  my %canon = (
    'learning goals' => 'Learning goals',
    'how to hold the room' => 'How to hold the room',
    'the lesson flow' => 'The lesson flow',
    "what you.ll need" => "What you'll need",
    "if it.s not going well" => "If it's not going well",
  );
  for my $pat (keys %canon) {
    $text =~ s/^#{1,3}\s*\Q$canon{$pat}\E\s*$/## $canon{$pat}/mig if 0; # placeholder, real sub below
  }
  $text =~ s/^#{1,3}\s*Learning Goals\s*$/## Learning goals/mig;
  $text =~ s/^#{1,3}\s*How to Hold the Room\s*$/## How to hold the room/mig;
  $text =~ s/^#{1,3}\s*The Lesson Flow\s*$/## The lesson flow/mig;
  $text =~ s/^#{1,3}\s*What You.ll Need\s*$/## What you'll need/mig;
  $text =~ s/^#{1,3}\s*If It.s Not Going Well\s*$/## If it's not going well/mig;

  # Strip a redundant "What a ___ walks away with:" lead-in line under
  # Learning goals — the page template already supplies that framing.
  $text =~ s/^What a[^\n]*walks away with:\s*$//mig;

  # Beats: "**Beat N (~Xmin) — Title**" (already-canonical order) and
  # "### Beat N: Title (~Xmin)" (title-before-time order) both -> a real
  # H3 in canonical "### Beat N (~time) — Title" order.
  $text =~ s/^\*\*Beat\s+(\d+)\s*\(~([^)]+)\)\s*[\x{2014}-]+\s*(.+?)\*\*\s*$/### Beat $1 (~$2) \x{2014} $3/mig;
  $text =~ s/^###\s*Beat\s+(\d+):\s*(.+?)\s*\(~([^)]+)\)\s*$/### Beat $1 (~$3) \x{2014} $2/mig;
  # "### N \x{2014} ~Xmin: Title" (bare number, time then title).
  $text =~ s/^###\s*(\d+)\s*[\x{2014}-]+\s*~([^:]+):\s*(.+?)\s*$/### Beat $1 (~$2) \x{2014} $3/mig;
  # "### N \x{2014} Title (~Xmin)" (bare number, title then paren-time).
  $text =~ s/^###\s*(\d+)\s*[\x{2014}-]+\s*(.+?)\s*\(~([^)]+)\)\s*$/### Beat $1 (~$3) \x{2014} $2/mig;
  # "### Beat N: ~Xmin \x{2014} Title" (colon after number, bare tilde-time
  # before the title, no parens anywhere).
  $text =~ s/^###\s*Beat\s+(\d+):\s*~([^\x{2014}-]+?)\s*[\x{2014}-]+\s*(.+?)\s*$/### Beat $1 (~$2) \x{2014} $3/mig;
  $text =~ s/^\*\*Closing[^\n*]*\*\*\s*$/### Closing/mig;
  $text =~ s/^###\s*Closing[^\n]*$/### Closing/mig; # already-canonical, case/suffix only

  return $text;
}

# ---------------------------------------------------------------------
# Validation: does the normalized body actually have every section?
# ---------------------------------------------------------------------

sub validate {
  my ($topic, $band, $body) = @_;
  my @missing;

  # Content before the first "## " heading is silently dropped by
  # build-lessons.pl's split_sections() — catch it here instead.
  if ($body =~ /\A(.*?)^##\s/ms) {
    my $preamble = $1;
    $preamble =~ s/^\s+|\s+$//g;
    print "  [$topic/$band] WARNING: non-empty content before first H2, will be dropped: \"" .
      substr($preamble, 0, 80) . "\"\n" if length $preamble;
  }

  for my $h ('## What you should know', "## What we're assuming", '## Learning goals',
             '## How to hold the room', '## The lesson flow', "## What you'll need",
             "## If it's not going well") {
    push @missing, $h unless $body =~ /^\Q$h\E\s*$/m;
  }
  my $beat_count = () = $body =~ /^### Beat \d+/mg;
  print "  [$topic/$band] missing: " . join('; ', @missing) . "\n" if @missing;
  print "  [$topic/$band] WARNING: zero beats parsed in The lesson flow\n" if $beat_count == 0;
  return !@missing && $beat_count > 0;
}

# ---------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------

opendir(my $dh, $SRC) or die "Can't open $SRC: $!";
my @topics = sort grep { -d "$SRC/$_" && $_ !~ /^\./ } readdir($dh);
closedir($dh);

my $ok_count = 0;
my $total = 0;

for my $topic (@topics) {
  next if $SKIP_TOPIC{$topic};
  my $topic_dir = "$SRC/$topic";

  opendir(my $tdh, $topic_dir) or next;
  my @band_files = sort grep { /^ages-(5-8|8-11|11-14|14-21|21-plus)\.md$/ } readdir($tdh);
  closedir($tdh);
  next unless @band_files;

  print "=== $topic ===\n";

  # Copy core-model.md as-is (reference only, never rendered).
  if (-f "$topic_dir/core-model.md") {
    write_file("$DEST/$topic/core-model.md", read_file("$topic_dir/core-model.md"));
  }

  for my $bf (@band_files) {
    $bf =~ /^ages-(5-8|8-11|11-14|14-21|21-plus)\.md$/;
    my $band = $1;
    $total++;

    my $raw = read_file("$topic_dir/$bf");
    my $head = parse_head($raw);
    my $body = normalize_body($raw);

    my $ok = validate($topic, $band, $body);
    $ok_count++ if $ok;

    my $sensitive = $SENSITIVE_TOPIC{$topic} // 'none';
    my $needs_facilitation = ($sensitive ne 'none' || $band eq '11-14') ? 'true' : 'false';

    my $frontmatter = <<"FM";
---
lesson_id: $topic
topic: @{[ $TOPIC_CATEGORY{$topic} // 'identity' ]}
age_band: $band
age_label: $BAND_LABEL{$band}
title: $head->{title}
hook: $head->{hook}
time_minutes: @{[ time_minutes_from_display($head->{time_display}) ]}
time_display: $head->{time_display}
group_format: @{[ group_format_from_display($head->{group_display}) ]}
group_display: $head->{group_display}
format_display: $head->{format_display}
sensitive_topic: $sensitive
requires_adult_facilitation_notes: $needs_facilitation
core_model_ref: $topic/core-model.md
---

FM

    write_file("$DEST/$topic/$band.md", $frontmatter . $body);
  }
}

print "\n$ok_count / $total band files fully validated (all sections + at least one beat).\n";
print "Review any warnings above before running build-lessons.pl.\n";
