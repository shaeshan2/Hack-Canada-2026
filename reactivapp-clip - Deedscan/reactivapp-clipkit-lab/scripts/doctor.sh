#!/bin/bash
#
# Quick preflight checks for first-time participants.
#
# Usage:
#   bash scripts/doctor.sh
#

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ok() {
    echo "OK   - $1"
}

warn() {
    echo "WARN - $1"
}

fail() {
    echo "FAIL - $1"
}

has_failure=0

if command -v xcodebuild >/dev/null 2>&1; then
    XCODE_VERSION="$(xcodebuild -version | awk 'NR==1 {print $2}')"
    ok "Xcode detected (version $XCODE_VERSION)"
else
    fail "Xcode not found. Install Xcode 26+ and run 'xcode-select -s /Applications/Xcode.app'."
    has_failure=1
fi

if [ -d "$ROOT_DIR/.git" ]; then
    ok "Git repository detected"
else
    fail "Not in repository root. Run this script from the repo root."
    has_failure=1
fi

if [ -f "$ROOT_DIR/ReactivChallengeKit/ReactivChallengeKit.xcodeproj/project.pbxproj" ]; then
    ok "Xcode project found"
else
    fail "Xcode project missing at ReactivChallengeKit/ReactivChallengeKit.xcodeproj"
    has_failure=1
fi

if [ -d "$ROOT_DIR/Submissions/_template" ]; then
    ok "Submission template found"
else
    fail "Template missing at Submissions/_template"
    has_failure=1
fi

if [ -x "$ROOT_DIR/scripts/create-submission.sh" ] || [ -f "$ROOT_DIR/scripts/create-submission.sh" ]; then
    ok "Scaffold script found: scripts/create-submission.sh"
else
    fail "Scaffold script missing: scripts/create-submission.sh"
    has_failure=1
fi

if [ -f "$ROOT_DIR/scripts/generate-registry.sh" ]; then
    ok "Registry generator found: scripts/generate-registry.sh"
else
    fail "Registry generator missing: scripts/generate-registry.sh"
    has_failure=1
fi

if [ -d "$ROOT_DIR/Submissions" ]; then
    TEAM_COUNT="$(find "$ROOT_DIR/Submissions" -mindepth 1 -maxdepth 1 -type d ! -name "_*" | wc -l | tr -d ' ')"
    if [ "$TEAM_COUNT" -gt 0 ]; then
        warn "$TEAM_COUNT team submission folder(s) already exist. This is fine, but use a unique team name."
    else
        ok "No existing team submissions detected yet"
    fi
fi

echo ""
if [ "$has_failure" -eq 0 ]; then
    echo "Preflight passed."
    echo "Next: bash scripts/create-submission.sh \"Your Team Name\""
    exit 0
else
    echo "Preflight failed. Fix FAIL items above and re-run."
    exit 1
fi
