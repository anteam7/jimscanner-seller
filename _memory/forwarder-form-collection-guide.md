# 배대지 배송신청서 HTML 수집 가이드 (사용자용)

> 큰 목표: 30+ 배대지의 배송신청서 폼을 확장으로 자동입력
> 사용자 작업: 각 배대지에 가입 + 배송신청서 페이지 방문 + 📋 버튼 클릭
> 자동 처리: 짐스캐너 팀이 selector 매핑 작성 → 자동입력 content script

## 미리 만들어둔 인프라 (2026-05-20)

| 자산 | 위치 | 역할 |
|---|---|---|
| DB 테이블 | `b2b_forwarder_form_snapshots` | HTML + 필드 메타데이터 저장 |
| API | `POST /api/extension/form-snapshot` | 확장 → 짐스캐너 업로드 |
| 확장 content script | `extension/forwarders/capture-shipping-form.js` | 폼 자동 감지 + 📋 버튼 + 메타 추출 |
| 확장 manifest | `extension/manifest.json` | 30+ 배대지 host_permissions + content_scripts 매처 |
| 어드민 페이지 | `/settings/forwarder-forms` | 수집된 스냅샷 목록 + 가이드 |

## 사용자 단계별 작업 (배대지 1곳당 ~5분)

### Step 1. 가입 (배대지별 1회만)
- 각 배대지에 별도 회원가입 (개인 메일로)
- 약관 동의 + 본인인증 + (필요시) 카카오 알림톡 연동
- 단순한 곳은 30초, SMS/카톡 인증 있는 곳은 2~3분

### Step 2. 배송신청서 페이지 진입
- 배대지 로그인
- 메뉴: "배송 신청", "발송 신청", "신청서 작성" 등 (배대지별 명칭 다름)
- 폼이 보이는 페이지로 이동 (수령자명 / 주소 / 통관코드 / 상품정보 등 입력 화면)

### Step 3. 📋 버튼 클릭
- 확장이 자동으로 페이지를 감지하면 우하단에 보라색 [📋 배송신청서 HTML 캡쳐] 버튼 표시
- 버튼 안 보이면: 페이지 새로고침 또는 다른 페이지/단계로 이동 후 다시
- 클릭 → 미리보기 패널 → [짐스캐너로 전송]
- 메모 (선택): "주소 입력 단계" 같은 짧은 라벨

### Step 4. 다음 단계도 캡쳐
- 한 배대지의 배송신청서는 보통 여러 단계 (주소 → 상품 → 결제)
- 각 단계마다 폼이 다르면 모두 캡쳐

## 셀프 체크

수집 진행 상황은 짐스캐너 사이드바 → 설정 → **[배송신청서 캡쳐]** (`/settings/forwarder-forms`) 에서 확인.

## 우선순위 (수집 효율)

본인이 자주 쓰는 배대지부터:
1. 짐패스 / 몰테일 / 이하넥스(훗타운) 같이 트래픽 많은 곳
2. 본인 마켓 주문 흐름에 자주 쓰는 1~2곳
3. 나머지는 시간 날 때 점진적으로

5곳만 캡쳐돼도 80% 셀러 워크플로우 커버 가능.

## 짐스캐너 팀 다음 작업 (수집 후)

수집된 스냅샷마다:
1. `fields[]` 메타데이터 보고 자동입력 매핑 작성 (예: `name="recipient_name"` ↔ `b2b_orders.buyer_name`)
2. `extension/forwarders/[slug]-shipping-form.js` content script 작성
3. manifest 의 content_scripts 매처에 등록
4. 확장 버전 업 (0.2 → 0.3)

## 추가 정보 필요한 시점

다음 정보는 **사용자가 수집 진행하면서** 알려주면 좋음:
- 배대지마다 배송신청서가 여러 단계인지 (1단계 폼인지 / 다단계 wizard 인지)
- 배송 종류 (항공/해운/EMS) 별로 폼이 분기되는지
- 본인 마켓 주문 데이터 (buyer_name 등) ↔ 배대지 폼 필드 매핑이 1:1 인지, 가공 필요한지 (예: 영문 변환)

## 단순 데이터 보강 (사용자 키 없이 가능)

- forwarder.slug 추가 매핑 필요 시: `extension/forwarders/capture-shipping-form.js` 의 `detectForwarderSlug()` 함수 안 `map` 배열에 도메인 추가
- 새 배대지가 활성화되면 forwarders 테이블 추가 + manifest 의 host_permissions + content_scripts matches 에 추가
