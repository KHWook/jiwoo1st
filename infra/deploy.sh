#!/usr/bin/env bash
# 사용법: infra/deploy.sh   (저장소 루트의 .env 를 읽습니다)
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ../.env; set +a
: "${ADMIN_KEY:?ADMIN_KEY 를 .env 에 설정하세요 (관리용 비밀 키)}"

sam build
sam deploy \
  --stack-name "${STACK_NAME:-jiwoo1st-api}" \
  --region "${AWS_DEFAULT_REGION:-ap-northeast-2}" \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset --no-fail-on-empty-changeset \
  --parameter-overrides "AllowedOrigin=${ALLOWED_ORIGIN:-https://khwook.github.io}" "AdminKey=${ADMIN_KEY}"

echo
echo "API URL:"
aws cloudformation describe-stacks --stack-name "${STACK_NAME:-jiwoo1st-api}" \
  --region "${AWS_DEFAULT_REGION:-ap-northeast-2}" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiUrl'].OutputValue" --output text
