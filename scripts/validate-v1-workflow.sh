#!/usr/bin/env bash
# Validate V1 workflow by creating 5 sample matters and checking workspace/runtime
API=${API:-http://localhost:4000}
JQ=$(command -v jq || true)
if [ -z "$JQ" ]; then
  echo "This script requires 'jq' to parse JSON. Please install jq and re-run."
  exit 1
fi

set -u

cases=(
  "minjian-jieyue-纠纷:民间借贷纠纷"
  "maimai-hetong-纠纷:买卖合同纠纷"
  "laodong-zhengyi:劳动争议"
  "jianshe-hetong:建设工程合同纠纷"
  "lihun-纠纷:离婚纠纷"
)

total=0
passed=0
failed=0

timestamp=$(date +%s)

for c in "${cases[@]}"; do
  total=$((total+1))
  name=${c%%:*}
  type=${c#*:}
  matter_id="test-${name}-${timestamp}-${RANDOM}"
  title="${type} - 测试 ${timestamp}"
  payload=$(jq -n --arg m "$matter_id" --arg t "$title" --arg d "自动化创建" --arg mt "$type" '{matter_id:$m, title:$t, description:$d, matter_type:$mt}')

  echo "\n=== Creating matter: $matter_id ($type) ==="
  resp=$(curl -s -w "\n%{http_code}" -X POST "$API/matters" -H 'Content-Type: application/json' -d "$payload")
  http_code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')

  if [ "$http_code" = "201" ] || [ "$http_code" = "200" ]; then
    echo "POST /matters returned $http_code"
    # extract matter id from body (supports matter_id or matterId)
    mid=$(echo "$body" | jq -r '.matter_id // .matterId // empty')
    if [ -z "$mid" ] || [ "$mid" = "null" ]; then
      echo "Could not determine matter id from response"
      echo "Response body: $body"
      echo "FAIL"
      failed=$((failed+1))
      continue
    fi

    echo "Created: $mid"

    # GET workspace
    ws=$(curl -s -w "\n%{http_code}" "$API/matters/$mid/workspace")
    ws_code=$(echo "$ws" | tail -n1)
    ws_body=$(echo "$ws" | sed '$d')
    if [ "$ws_code" != "200" ]; then
      echo "GET /matters/$mid/workspace returned $ws_code"
      echo "FAIL"
      failed=$((failed+1))
      continue
    fi

    # GET runtime
    rt=$(curl -s -w "\n%{http_code}" "$API/matters/$mid/runtime")
    rt_code=$(echo "$rt" | tail -n1)
    rt_body=$(echo "$rt" | sed '$d')
    if [ "$rt_code" != "200" ]; then
      echo "GET /matters/$mid/runtime returned $rt_code"
      echo "FAIL"
      failed=$((failed+1))
      continue
    fi

    has_queue=$(echo "$rt_body" | jq '.today_queue? != null')
    if [ "$has_queue" = "true" ]; then
      echo "today_queue present"
      echo "PASS"
      passed=$((passed+1))
    else
      echo "today_queue missing"
      echo "Response runtime: $rt_body"
      echo "FAIL"
      failed=$((failed+1))
    fi
  else
    echo "POST /matters failed with code $http_code"
    echo "Response: $body"
    echo "FAIL"
    failed=$((failed+1))
  fi
done

echo "\n=== Summary ==="
echo "total: $total"
echo "passed: $passed"
echo "failed: $failed"

if [ $failed -gt 0 ]; then
  exit 2
fi
exit 0
