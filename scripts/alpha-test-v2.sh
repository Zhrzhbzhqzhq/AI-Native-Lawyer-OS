#!/usr/bin/env bash
set -uo pipefail
MATTER_ID=alpha-$(date +%s)
BASE=${BASE:-http://localhost:4000}
OUT=/tmp/alpha_test_v2
rm -rf $OUT && mkdir -p $OUT
report=$OUT/report.md
log=$OUT/log.txt
exec > >(tee -a $log) 2>&1

echo "Starting alpha test against $BASE"

# helper to curl but never fail the script
cpost() {
  curl -s -w '\n%{http_code}' -X POST "$1" -H 'Content-Type: application/json' -d "$2" || echo "\n000"
}
cpatch() {
  curl -s -w '\n%{http_code}' -X PATCH "$1" -H 'Content-Type: application/json' -d "$2" || echo "\n000"
}

# 1. Create matter
echo "\n== Create Matter =="
MATTER_ARG=$(jq -n --arg id "$MATTER_ID" --arg title "民间借贷纠纷 - 张三 v 李四" --arg desc "Alpha 测试案件" '{matter_id:$id,title:$title,description:$desc}')
create_matter_resp=$(cpost "$BASE/matters" "$MATTER_ARG" && true || true "$MATTER_ARG")
create_matter_body=$(echo "$create_matter_resp" | sed '$d')
create_matter_code=$(echo "$create_matter_resp" | tail -n1)
echo "HTTP $create_matter_code" > $OUT/matter_status.txt
echo "$create_matter_body" > $OUT/matter_body.json

matter_ok=0
if [[ "$create_matter_code" =~ ^2 ]]; then matter_ok=1; fi

# 2. Create materials
echo "\n== Create Materials =="
materials=("借条" "银行转账记录" "微信聊天记录" "催款聊天记录" "身份证")
material_ids=()
for i in "${!materials[@]}"; do
  title=${materials[$i]}
  mid="$MATTER_ID-mat-$(($i+1))"
  payload=$(jq -n --arg id "$mid" --arg title "$title" '{material_id:$id, title:$title, material_type:"document"}')
  resp=$(cpost "$BASE/matters/$MATTER_ID/materials" "$payload")
  body=$(echo "$resp" | sed '$d')
  code=$(echo "$resp" | tail -n1)
  echo "Create material $mid -> HTTP $code"
  echo "$body" > $OUT/material_$mid.json
  if [[ "$code" =~ ^2 ]]; then material_ids+=($mid); fi
done

# 3. Create evidence for each material
echo "\n== Create Evidence =="
evidence_ids=()
for mid in "${material_ids[@]}"; do
  title="$mid 转为证据"
  payload=$(jq -n --arg title "$title" --arg material_id "$mid" '{title:$title, material_id:$material_id, evidence_type:"document"}')
  resp=$(cpost "$BASE/matters/$MATTER_ID/evidence" "$payload")
  body=$(echo "$resp" | sed '$d')
  code=$(echo "$resp" | tail -n1)
  echo "Create evidence from $mid -> HTTP $code"
  echo "$body" > $OUT/evidence_${mid}.json
  if [[ "$code" =~ ^2 ]]; then
    eid=$(echo "$body" | python3 -c 'import sys, json; j=json.load(sys.stdin); print(j.get("evidence_id") or j.get("id") or j.get("evidenceId") or "")' 2>/dev/null || true)
    if [[ -z "$eid" ]]; then
      eid="ev-${mid}"
    fi
    evidence_ids+=($eid)
  fi
done

# 4. Create a Fact
echo "\n== Create Fact =="
fact_payload='{"title":"借款事实：张三借给李四10万元","description":"借款事实描述"}'
resp=$(cpost "$BASE/matters/$MATTER_ID/facts" "$fact_payload")
fact_body=$(echo "$resp" | sed '$d')
fact_code=$(echo "$resp" | tail -n1)
echo "Create fact -> HTTP $fact_code"
echo "$fact_body" > $OUT/fact_body.json
fact_id=$(echo "$fact_body" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("fact_id") or j.get("id") or "")' 2>/dev/null || true)

# 5. Attach first evidence to fact
attach_ok=0
if [[ -n "$fact_id" && ${#evidence_ids[@]} -gt 0 ]]; then
  eid=${evidence_ids[0]}
  payload=$(jq -n --arg evidence_id "$eid" '{evidence_id:$evidence_id}')
  resp=$(cpost "$BASE/matters/$MATTER_ID/facts/$fact_id/evidence" "$payload")
  body=$(echo "$resp" | sed '$d')
  code=$(echo "$resp" | tail -n1)
  echo "Attach evidence $eid to fact $fact_id -> HTTP $code"
  echo "$body" > $OUT/attach_fact.json
  if [[ "$code" =~ ^2 ]]; then attach_ok=1; fi
else
  echo "Skipping attach evidence — missing fact_id or evidence_ids"
fi

# 6. Create Issue
echo "\n== Create Issue =="
issue_payload='{"title":"是否构成借款关系","description":"争议焦点：是否存在借贷合同/借款"}'
resp=$(cpost "$BASE/matters/$MATTER_ID/issues" "$issue_payload")
issue_body=$(echo "$resp" | sed '$d')
issue_code=$(echo "$resp" | tail -n1)
echo "Create issue -> HTTP $issue_code"
echo "$issue_body" > $OUT/issue_body.json
issue_id=$(echo "$issue_body" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("issue_id") or j.get("id") or "")' 2>/dev/null || true)

# Attach fact to issue
attach_fact_issue_ok=0
if [[ -n "$issue_id" && -n "$fact_id" ]]; then
  payload=$(jq -n --arg fact_id "$fact_id" '{fact_id:$fact_id}')
  resp=$(cpost "$BASE/matters/$MATTER_ID/issues/$issue_id/facts" "$payload")
  code=$(echo "$resp" | tail -n1)
  echo "Attach fact $fact_id to issue $issue_id -> HTTP $code"
  if [[ "$code" =~ ^2 ]]; then attach_fact_issue_ok=1; fi
else
  echo "Skipping attach fact->issue"
fi

# 7. Create Law
echo "\n== Create Law =="
law_payload='{"title":"合同法相关条款 - 借款合同","citation":"合同法 第XX条","description":"适用法律说明","issue_id":"'${issue_id:-}'"}'
if [[ -z "$issue_id" ]]; then law_payload='{"title":"合同法相关条款 - 借款合同","citation":"合同法 第XX条","description":"适用法律说明"}'; fi
resp=$(cpost "$BASE/matters/$MATTER_ID/laws" "$law_payload")
law_body=$(echo "$resp" | sed '$d')
law_code=$(echo "$resp" | tail -n1)
echo "Create law -> HTTP $law_code"
echo "$law_body" > $OUT/law_body.json
law_id=$(echo "$law_body" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("law_id") or j.get("id") or "")' 2>/dev/null || true)

# 8. Create Argument linked to issue
echo "\n== Create Argument =="
arg_payload='{"title":"主张：存在借款关系","description":"论证借款成立","conclusion":"被告应返还借款及利息","status":"draft"}'
if [[ -n "$issue_id" ]]; then arg_payload=$(jq -n --arg title "主张：存在借款关系" --arg description "论证借款成立" --arg conclusion "被告应返还借款及利息" --arg issue_id "$issue_id" '{title:$title,description:$description,conclusion:$conclusion,status:"draft",issue_id:$issue_id}'); fi
resp=$(cpost "$BASE/matters/$MATTER_ID/arguments" "$arg_payload")
arg_body=$(echo "$resp" | sed '$d')
arg_code=$(echo "$resp" | tail -n1)
echo "Create argument -> HTTP $arg_code"
echo "$arg_body" > $OUT/arg_body.json
arg_id=$(echo "$arg_body" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("argument_id") or j.get("id") or "")' 2>/dev/null || true)

# 9. Create Document linked to argument
echo "\n== Create Document =="
doc_payload='{"title":"催收函","document_type":"催告函","content":"请于10日内还款","status":"draft"}'
if [[ -n "$arg_id" ]]; then doc_payload=$(jq -n --arg title "催收函" --arg document_type "催告函" --arg content "请于10日内还款" --arg status "draft" --arg argument_id "$arg_id" '{title:$title,document_type:$document_type,content:$content,status:$status,argument_id:$argument_id}'); fi
resp=$(cpost "$BASE/matters/$MATTER_ID/documents" "$doc_payload")
doc_body=$(echo "$resp" | sed '$d')
doc_code=$(echo "$resp" | tail -n1)
echo "Create document -> HTTP $doc_code"
echo "$doc_body" > $OUT/doc_body.json
doc_id=$(echo "$doc_body" | python3 -c 'import sys,json; j=json.load(sys.stdin); print(j.get("document_id") or j.get("id") or "")' 2>/dev/null || true)

# 10. Perform simple edits and deletes to verify CRUD
echo "\n== Verify CRUD operations =="
# edit fact
if [[ -n "$fact_id" ]]; then
  resp=$(cpatch "$BASE/matters/$MATTER_ID/facts/$fact_id" '{"description":"已补充事实说明"}')
  code=$(echo "$resp" | tail -n1)
  echo "PATCH fact -> HTTP $code"
fi
# patch evidence
if [[ ${#evidence_ids[@]} -gt 0 ]]; then
  eid=${evidence_ids[0]}
  resp=$(cpatch "$BASE/matters/$MATTER_ID/evidence/$eid" '{"description":"律师备注：核实银行记录"}')
  code=$(echo "$resp" | tail -n1)
  echo "PATCH evidence -> HTTP $code"
fi
# update document
if [[ -n "$doc_id" ]]; then
  resp=$(cpatch "$BASE/matters/$MATTER_ID/documents/$doc_id" '{"status":"completed","title":"催收函（已发送）"}')
  code=$(echo "$resp" | tail -n1)
  echo "PATCH document -> HTTP $code"
fi
# delete created argument
if [[ -n "$arg_id" ]]; then
  resp=$(curl -s -w '\n%{http_code}' -X DELETE "$BASE/matters/$MATTER_ID/arguments/$arg_id" || echo "\n000")
  code=$(echo "$resp" | tail -n1)
  echo "DELETE argument -> HTTP $code"
fi

# 11. Build and run checks
echo "\n== Run build/checks =="
./scripts/check.sh > $OUT/check_output.txt || true

# 12. Generate report
echo "\n# Alpha Test V2" > $report

echo "\nMatter" >> $report
if [[ $matter_ok -eq 1 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nMaterial" >> $report
if [[ ${#material_ids[@]} -ge 5 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nEvidence" >> $report
if [[ ${#evidence_ids[@]} -ge 1 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nFact" >> $report
if [[ -n "$fact_id" ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nIssue" >> $report
if [[ -n "$issue_id" ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nLaw" >> $report
if [[ -n "$law_id" ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nArgument" >> $report
if [[ -n "$arg_id" ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

echo "\nDocument" >> $report
if [[ -n "$doc_id" ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi


echo "\n\nAI\n\nEvidence AI" >> $report
# quick checks for AI analysis endpoints
resp=$(cpost "$BASE/matters/$MATTER_ID/evidence/analyze" '{}') || true
code=$(echo "$resp" | tail -n1)
if [[ "$code" =~ ^2 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

resp=$(cpost "$BASE/matters/$MATTER_ID/facts/analyze" '{}') || true
code=$(echo "$resp" | tail -n1)
if [[ "$code" =~ ^2 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi

resp=$(cpost "$BASE/matters/$MATTER_ID/issues/analyze" '{}') || true
code=$(echo "$resp" | tail -n1)
if [[ "$code" =~ ^2 ]]; then echo "✅" >> $report; else echo "❌" >> $report; fi


# Problems
echo "\n发现的问题：" >> $report
awk '/HTTP [0-9][0-9][0-9]/{print $0}' $log | grep -v "HTTP 2" | sed 's/^/ - /' >> $report || true

# save outputs to repo docs
mkdir -p docs/testing
cp $report docs/testing/alpha-test-report-v2.md || true

# commit
git add docs/testing/alpha-test-report-v2.md || true
# do not fail if no changes
git commit -m "test: alpha v2" || true

echo "Done. Report at docs/testing/alpha-test-report-v2.md"
cat $report
