#!/usr/bin/env bash
# Builds the Attempt 2 ZIP: the committed repository (source, README, report PDF,
# designs, evidence) plus the walkthrough video, even if the video is too large to
# commit. Usage: scripts/package-submission.sh [output.zip]
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-../Baho-Final-Submission.zip}"
video="demo/Baho-Walkthrough.mp4"

[ -f docs/Baho-Technical-Report.pdf ] || { echo "Missing docs/Baho-Technical-Report.pdf"; exit 1; }
[ -f "$video" ] || echo "Warning: $video not found; the ZIP will not contain the walkthrough video."

rm -f "$out"
git archive --format=zip --prefix=baho/ -o "$out" HEAD
# Add the video if it exists but is not committed (e.g. larger than GitHub allows).
if [ -f "$video" ] && ! git ls-files --error-unmatch "$video" >/dev/null 2>&1; then
  mkdir -p /tmp/baho-package/baho/demo && cp "$video" /tmp/baho-package/baho/demo/
  (cd /tmp/baho-package && zip -q -r "$OLDPWD/$out" baho/demo)
  rm -rf /tmp/baho-package
fi
echo "Created $out ($(du -h "$out" | cut -f1))"
