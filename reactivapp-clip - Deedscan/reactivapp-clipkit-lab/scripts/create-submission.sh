#!/bin/bash
#
# Creates a new team submission folder from Submissions/_template
# and personalizes the starter files.
#
# Usage:
#   bash scripts/create-submission.sh "Team Name"
#   bash scripts/create-submission.sh "Team Name" "CustomExperienceName"
#   bash scripts/create-submission.sh --help
#

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SUBMISSIONS_DIR="$ROOT_DIR/Submissions"
TEMPLATE_DIR="$SUBMISSIONS_DIR/_template"

print_help() {
    cat <<'EOF'
Create a new ClipKit submission scaffold.

Usage:
  bash scripts/create-submission.sh "Team Name"
  bash scripts/create-submission.sh "Team Name" "CustomExperienceName"

Examples:
  bash scripts/create-submission.sh "Waterloo Wizards"
  bash scripts/create-submission.sh "Team 42" "Team42CampusCheckinExperience"

What this does:
  - Copies Submissions/_template -> Submissions/<team-slug>
  - Renames MyClipExperience.swift to your experience type file
  - Replaces struct name, teamName, and starter URL pattern
  - Prefills Team/Clip/URL fields in SUBMISSION.md
EOF
}

if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
    print_help
    exit 0
fi

if [ $# -lt 1 ]; then
    print_help
    exit 1
fi

TEAM_NAME_RAW="$1"
EXPERIENCE_NAME_RAW="${2:-}"

if [ ! -d "$TEMPLATE_DIR" ]; then
    echo "Error: template folder not found at $TEMPLATE_DIR"
    echo "Run from repo root or verify Submissions/_template exists."
    exit 1
fi

TEAM_SLUG="$(echo "$TEAM_NAME_RAW" \
    | tr '[:upper:]' '[:lower:]' \
    | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//')"

if [ -z "$TEAM_SLUG" ]; then
    echo "Error: Team name '$TEAM_NAME_RAW' produced an empty folder slug."
    echo "Use at least one letter or number."
    exit 1
fi

TEAM_DIR="$SUBMISSIONS_DIR/$TEAM_SLUG"
SWIFT_TEMPLATE_FILE="$TEAM_DIR/MyClipExperience.swift"
SUBMISSION_FILE="$TEAM_DIR/SUBMISSION.md"

if [ -d "$TEAM_DIR" ]; then
    echo "Error: '$TEAM_DIR' already exists."
    echo "Choose a different team name or remove that folder first."
    exit 1
fi

pascal_case() {
    echo "$1" \
        | sed -E 's/[^A-Za-z0-9]+/ /g' \
        | awk '{
            for (i = 1; i <= NF; i++) {
                $i = toupper(substr($i, 1, 1)) tolower(substr($i, 2))
            }
            gsub(/[[:space:]]+/, "", $0)
            print $0
        }'
}

TEAM_PASCAL="$(pascal_case "$TEAM_NAME_RAW")"

if [ -n "$EXPERIENCE_NAME_RAW" ]; then
    EXPERIENCE_NAME="$EXPERIENCE_NAME_RAW"
else
    EXPERIENCE_NAME="${TEAM_PASCAL}ClipExperience"
fi

EXPERIENCE_NAME="$(echo "$EXPERIENCE_NAME" | sed -E 's/[^A-Za-z0-9_]//g')"
if [ -z "$EXPERIENCE_NAME" ]; then
    echo "Error: Experience name is empty after sanitization."
    exit 1
fi

# Swift type names must start with a letter/underscore.
if ! echo "$EXPERIENCE_NAME" | sed -nE '/^[A-Za-z_][A-Za-z0-9_]*$/p' >/dev/null; then
    echo "Error: Experience name '$EXPERIENCE_NAME' is not a valid Swift type name."
    exit 1
fi

TARGET_SWIFT_FILE="$TEAM_DIR/$EXPERIENCE_NAME.swift"

if grep -R --include="*.swift" -n "struct[[:space:]]\+$EXPERIENCE_NAME[[:space:]]*:" "$ROOT_DIR/Submissions" "$ROOT_DIR/ReactivChallengeKit" >/dev/null 2>&1; then
    echo "Error: struct '$EXPERIENCE_NAME' already exists in this repository."
    echo "Use a unique experience name to avoid compile collisions."
    exit 1
fi

cp -R "$TEMPLATE_DIR" "$TEAM_DIR"
mv "$SWIFT_TEMPLATE_FILE" "$TARGET_SWIFT_FILE"

sed -i.bak "s/struct MyClipExperience:/struct ${EXPERIENCE_NAME}:/" "$TARGET_SWIFT_FILE"
sed -i.bak "s/static let teamName = \"Your Team Name\"/static let teamName = \"${TEAM_NAME_RAW}\"/" "$TARGET_SWIFT_FILE"
sed -i.bak "s|static let urlPattern = \"example.com/your-path/:param\"|static let urlPattern = \"example.com/${TEAM_SLUG}/:param\"|" "$TARGET_SWIFT_FILE"
rm -f "${TARGET_SWIFT_FILE}.bak"

if [ -f "$SUBMISSION_FILE" ]; then
    sed -i.bak "s/## Team Name: ___/## Team Name: ${TEAM_NAME_RAW}/" "$SUBMISSION_FILE"
    sed -i.bak "s/## Clip Name: ___/## Clip Name: ${EXPERIENCE_NAME}/" "$SUBMISSION_FILE"
    sed -i.bak "s|## Invocation URL Pattern: ___|## Invocation URL Pattern: example.com/${TEAM_SLUG}/:param|" "$SUBMISSION_FILE"
    rm -f "${SUBMISSION_FILE}.bak"
fi

echo "Created submission scaffold:"
echo "  Team:   $TEAM_NAME_RAW"
echo "  Slug:   $TEAM_SLUG"
echo "  Folder: $TEAM_DIR"
echo "  Swift:  $TARGET_SWIFT_FILE"
echo ""
echo "Next steps:"
echo "  1) Open: $TARGET_SWIFT_FILE"
echo "  2) Build in Xcode (Cmd+R) or run: bash scripts/generate-registry.sh"
echo "     (Target Membership checkbox may appear off for Submissions files; this is expected.)"
echo "     The build script compiles submissions via GeneratedSubmissions.swift automatically."
echo "  3) Test URL: example.com/${TEAM_SLUG}/:param"
