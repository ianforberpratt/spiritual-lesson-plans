#!/usr/bin/perl
# Minimal static file server for local preview of the spiritual-lesson-plans
# site. Mirrors Vercel's cleanUrls: true (/foo -> foo.html) and
# trailingSlash: false. No deps beyond core Perl + IO::Socket — this exists
# because the machine has no Node/Python to run a normal dev server.
#
#   perl scripts/serve.pl . 8099      # then open http://127.0.0.1:8099/
#
# It only reads and serves files under <docroot>; it never writes anything.
use strict;
use warnings;
use IO::Socket::INET;
use POSIX ();

my $ROOT = shift @ARGV or die "usage: perl serve.pl <docroot> [port]\n";
my $PORT = shift @ARGV || 8099;
$ROOT =~ s{[\\/]+$}{};

my %MIME = (
  html => 'text/html; charset=utf-8', css => 'text/css; charset=utf-8',
  js => 'text/javascript; charset=utf-8', json => 'application/json; charset=utf-8',
  svg => 'image/svg+xml', png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg',
  gif => 'image/gif', webp => 'image/webp', ico => 'image/x-icon', pdf => 'application/pdf',
  woff => 'font/woff', woff2 => 'font/woff2', txt => 'text/plain; charset=utf-8',
  xml => 'application/xml; charset=utf-8', map => 'application/json; charset=utf-8',
  mp4 => 'video/mp4', webm => 'video/webm',
);

my $srv = IO::Socket::INET->new(
  LocalAddr => '127.0.0.1', LocalPort => $PORT, Listen => 128, ReuseAddr => 1, Proto => 'tcp',
) or die "bind :$PORT failed: $!\n";
$| = 1;
print "serving $ROOT on http://127.0.0.1:$PORT/\n";

while (my $c = $srv->accept) {
  my $req = <$c>;
  unless (defined $req) { close $c; next; }
  while (defined(my $h = <$c>)) { last if $h =~ /^\r?\n$/; }   # drain headers
  my ($method, $uri) = $req =~ /^(\w+)\s+(\S+)/;
  $uri = '/' unless defined $uri;
  (my $path = $uri) =~ s/\?.*$//;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  $path =~ s{\.\.}{}g;

  my $fs = "$ROOT$path";
  my $file;
  if (-d $fs) {
    $file = "$fs/index.html" if -f "$fs/index.html";
  } elsif (-f $fs) {
    $file = $fs;
  } elsif ($path !~ /\.[a-z0-9]+$/i && -f "$fs.html") {
    $file = "$fs.html";                 # cleanUrls
  }

  if (!$file || !-f $file) {
    my $body = "404 Not Found: $path\n";
    print $c "HTTP/1.1 404 Not Found\r\nContent-Type: text/plain; charset=utf-8\r\n"
           . "Content-Length: " . length($body) . "\r\nConnection: close\r\n\r\n$body";
    close $c; next;
  }

  my ($ext) = $file =~ /\.([a-z0-9]+)$/i;
  my $type = $MIME{lc($ext // '')} || 'application/octet-stream';
  open my $fh, '<:raw', $file or do { close $c; next; };
  local $/; my $data = <$fh>; close $fh;
  print $c "HTTP/1.1 200 OK\r\nContent-Type: $type\r\n"
         . "Content-Length: " . length($data) . "\r\nCache-Control: no-cache\r\n"
         . "Connection: close\r\n\r\n";
  print $c $data;
  close $c;
}
