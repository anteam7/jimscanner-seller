# 짐스캐너 SELLER 확장 (US MVP)

해외 매입처 주문 페이지에서 영수증을 짐스캐너로 한 번에 보내는 Chrome 확장.

현재 지원: **아마존 US (`amazon.com`) Order Details 페이지**.
다음 단계: 아마존 JP, 라쿠텐, 야후 — 같은 패턴으로 `scrapers/` 에 모듈 추가.

## 로컬 설치 (Chrome / Edge)

1. 짐스캐너 웹의 `/settings/extension` 에서 **API 토큰** 발급 (1회만 표시 — 복사해 두기).
2. `chrome://extensions` 접속 → 우측 상단 **개발자 모드** 활성화.
3. **압축해제된 확장 프로그램 로드** → 이 `extension/` 폴더 선택.
4. 확장 popup 클릭 → API URL (기본 `https://seller.jimscanner.co.kr`) + 토큰 입력 → **저장**.
5. **연결 확인** 버튼으로 토큰 유효성 검증.

## 사용

1. `https://www.amazon.com/your-orders` 에서 가져올 주문의 **Order details** 클릭.
2. 페이지 우측 하단 **📦 짐스캐너로 가져오기** 버튼 클릭.
3. 짐스캐너 `/imports` 페이지에서 수집 결과 확인.

## 파일 구조

```
extension/
├── manifest.json              MV3 매니페스트
├── popup.html / popup.js      토큰 저장 UI
├── background.js              service worker — API 호출 중계
├── scrapers/
│   └── amazon-us.js           amazon.com order-details 스크래퍼 + floating 버튼
└── icons/                     16/48/128 PNG (TODO)
```

## 다음 추가 예정

| 사이트 | 매처 | 비고 |
|---|---|---|
| amazon.co.jp | `https://www.amazon.co.jp/*` | 주문 라벨이 일본어. selector 는 유사. |
| rakuten.co.jp | `https://order.my.rakuten.co.jp/*` | "購入履歴詳細" 페이지. |
| shopping.yahoo.co.jp | `https://order.store.yahoo.co.jp/*` | "ご注文履歴". |

## 알려진 한계

- Amazon 페이지 셀렉터는 종종 바뀝니다. 인식 실패 시 panel 에 메시지 표시 → 운영팀이 셀렉터 갱신.
- 멱등: 같은 주문번호 재전송하면 짐스캐너 측에서 `status: "existing"` 반환 (덮어쓰지 않음).
- 인증: long-lived API 토큰 1개. revoke 는 `/settings/extension`.
