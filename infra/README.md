# jiwoo1st API

API Gateway(HTTP API) + Lambda(Node 22) + DynamoDB 로 구성된 참석 여부·방명록 백엔드.

## 배포
1. 저장소 루트 `.env` 에 AWS 자격 증명과 `ADMIN_KEY` 를 채운다.
2. `infra/deploy.sh` 실행. 마지막에 출력되는 API URL 을 `index.html` 의 `CONFIG.api.baseUrl` 에 넣는다.

## 엔드포인트
| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | /rsvp | 참석 여부 제출 `{name, attending, count, meal, note}` |
| GET | /rsvp | 관리용 명단·집계 (헤더 `x-admin-key` 필요) |
| POST | /guestbook | 방명록 작성 `{name, message}` |
| GET | /guestbook | 방명록 최근 100개 |
| DELETE | /guestbook/{id} | 관리용 삭제 (헤더 `x-admin-key` 필요) |

## 참석자 명단 보기
```bash
curl -H "x-admin-key: $ADMIN_KEY" https://<api-url>/rsvp | jq
```

## 삭제
```bash
sam delete --stack-name jiwoo1st-api --region ap-northeast-2
```
