#!/usr/bin/env bash
# Seed baseline test data for manual validation.
# Idempotent-ish: re-running creates additional records with the same shape.
set -euo pipefail
ORG="${TARGET_ORG:-epic.out.e68d765f4115@orgfarm.salesforce.com}"
SF="${SF_CMD:-sf.cmd}"
TAG="${SEED_TAG:-$(date +%s)}"

echo "=== Seeding into $ORG ==="

# --- Contacts: 3 patients + 3 practitioners, one per region ---
declare -A PATIENT PRACT
for region in EMEA AMER APAC; do
  echo "-- Patient contact ($region)"
  out=$($SF data create record --sobject Contact \
    --values "FirstName='Test' LastName='Patient-$region-$TAG' Email='patient.$region.$TAG@example.test'" \
    --target-org "$ORG" --json | sed 's/\x1b\[[0-9;]*m//g')
  pid=$(echo "$out" | grep -oE '"id":[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([a-zA-Z0-9]+)"/\1/')
  PATIENT[$region]=$pid
  echo "   $pid"

  echo "-- Practitioner contact ($region)"
  out=$($SF data create record --sobject Contact \
    --values "FirstName='Test' LastName='Practitioner-$region-$TAG' Email='pract.$region.$TAG@example.test'" \
    --target-org "$ORG" --json | sed 's/\x1b\[[0-9;]*m//g')
  pid=$(echo "$out" | grep -oE '"id":[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([a-zA-Z0-9]+)"/\1/')
  PRACT[$region]=$pid
  echo "   $pid"
done

# --- Subsidy applications at various statuses ---
create_app() {
  local region=$1 status=$2 label=$3
  echo "-- Subsidy_Application__c $label ($region, $status)"
  $SF data create record --sobject Subsidy_Application__c \
    --values "Patient__c=${PATIENT[$region]} Status__c='$status' Region__c='$region'" \
    --target-org "$ORG" --json | sed 's/\x1b\[[0-9;]*m//g' \
    | grep -oE '"id":[[:space:]]*"[^"]+"' | head -1 | sed -E 's/.*"([a-zA-Z0-9]+)"/\1/'
}

create_app EMEA Draft "draft-emea"
create_app AMER Submitted "submitted-amer"
APP_AWAIT=$(create_app APAC Awaiting_Practitioner "awaiting-pract-apac")
echo "   APAC awaiting app id: $APP_AWAIT"
create_app EMEA Approved "approved-emea"

# --- Assignment for the awaiting-practitioner app ---
echo "-- Assignment__c (APAC, Assigned)"
$SF data create record --sobject Assignment__c \
  --values "Application__c=$APP_AWAIT Status__c='Assigned' Region__c='APAC'" \
  --target-org "$ORG" --json | sed 's/\x1b\[[0-9;]*m//g' | grep -oE '"id":[[:space:]]*"[^"]+"' | head -1

echo "=== Seed complete ==="
