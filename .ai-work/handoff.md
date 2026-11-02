# Handoff — 생일 롤링페이퍼

## 바뀐 파일
- `index.html` (신규, 단일 파일 앱)
- `.ai-work/task.md`, `.ai-work/handoff.md`

## Claude 자체 점검 (Codex 독립 검증 아님)
| 검사 | 결과 |
|---|---|
| `node --check` (classic script + module script 추출) | 둘 다 exit 0 |
| headless Chrome 375px iframe 스크린샷 | 헤더·카드 2열·FAB 정상, 가로 스크롤 없음 |
| CDP 자동 흐름 (미리보기 모드) | 초기 3개 / 빈 입력 검증 / 작성→4개·mint·pop / 비번 숫자만 남김 / HTML 주입 미실행(textContent) / 상세 모달 / 틀린 비번 거부 / 맞는 비번 삭제→3 / 새로고침 후 유지 / 더미 0000 삭제 / 콘솔 에러 0 — 전부 통과, exit 0 |

## 미검증
- Firebase 실시간 모드: 실제 firebaseConfig가 없어 미실행 (gstatic 10.12.2 모듈 import, onSnapshot/addDoc/deleteDoc 경로)
- iOS Safari / 카카오톡 인앱 브라우저 실기기
- Codex 독립 검증: 사용자 허용 전이라 미실행

## 알려진 한계
- 삭제 비밀번호는 브라우저에서 해시 비교. Firestore 규칙에서 delete를 열어 두므로 개발자 도구를 쓰는 사람은 우회 가능 (친구끼리 쓰는 용도 전제).

## 수정 2 (사용자 요청)
- 예시 카드 3개(seed) 제거 → 빈 상태 안내만 표시
- `축하 남기기` 버튼 우하단 → 가운데 하단 (`:active` 눌림 효과도 가운데 기준 유지)
- 메시지 입력칸 placeholder "윤수야 생일 축하해! 🎉" 제거
- 점검: module script `node --check` OK, 남은 demo/seed/placeholder 문자열 0건, 새 프로필 375px 스크린샷에서 카운트 0·빈 상태·버튼 가운데 확인
- Codex 독립 검증: 사용자 요청으로 보류 (CLI 미설치)
