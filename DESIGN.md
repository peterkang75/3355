web application/stitch/projects/1158634624521437125/screens/e17e9ef60ff948d186d5063b0bc09a6c
# 디자인 시스템 명세서: 3355 골프모임 (Azure Modern)

## 1. 디자인 원칙 & 브랜드 아이덴티티
본 디자인 시스템은 **"Azure Modern"**이라는 컨셉 아래, 명문 골프 클럽의 품격과 현대적인 모바일 사용성을 결합하는 것을 목표로 합니다.

*   **Premium & Clean**: 화이트 배경을 기조로 하여 깨끗한 첫인상을 주며, 깊이감 있는 블루 컬러를 포인트로 사용하여 신뢰감과 고급스러움을 전달합니다.
*   **Intuitive Clarity**: 복잡한 데이터(스코어, 회비)를 명확한 카드 위계와 쉐이딩 효과를 통해 사용자가 직관적으로 파악할 수 있도록 설계했습니다.
*   **Refined Typography**: 'Pretendard' 폰트를 사용하여 한글과 숫자의 가독성을 극대화하고, 세련된 느낌을 유지합니다.

## 2. 컬러 팔레트 (Color Palette)
*   **Primary (Point)**: `#0047AB` (Azure Blue) - 주요 액션 버튼, 활성 탭, 강조 텍스트.
*   **Surface (Background)**: `#FFFFFF` (White) / `#F8FAFC` (Light Gray) - 깔끔한 배경 및 구역 구분.
*   **Neutral (Text)**: `#1E293B` (Slate 800) - 주요 텍스트.
*   **Neutral (Sub-text)**: `#64748B` (Slate 500) - 보조 안내 문구.

## 3. 타이포그래피 (Typography)
*   **Font Family**: `Pretendard`, `Inter`, sans-serif.
*   **Headlines**: Bold, Tracking Tight - 주요 제목 및 섹션 타이틀.
*   **Body**: Regular/Medium - 일반 정보 및 상세 내역.
*   **Labels**: Semibold, Uppercase (for EN) - 탭 바 및 버튼 텍스트.

## 3-1. 조편성 멤버 칩 컬러 (Team Formation Member Colors)

| 구분 | 배경 | 텍스트 | 테두리 |
|------|------|--------|--------|
| 남성 | `#E1EBF9` (Sky Blue — Azure 계열 고명도) | `#0047AB` | `#BFDBFE` |
| 여성 | `#FEE2E2` (Muted Rose — 프리미엄 뮤트 톤) | `#BE185D` | `#FECACA` |
| 게스트 | `#F0FDF4` | `#15803D` | `#86EFAC` |
| 번호대여 | `#FFF7ED` | `#C2410C` | `#FED7AA` |

> **컬러 선택 근거**
> - **남성 `#E1EBF9`**: 기존 쨍한 하늘색(#EBF2FF) 대신 메인 블루(#0047AB) 계열 명도를 높인 스카이 블루. 시각적 일체감 강화.
> - **여성 `#FEE2E2`**: 강렬한 핫핑크 계열에서 부드러운 뮤트 로즈 톤으로 변경. Azure Modern 프리미엄 컨셉에 부합.

## 4. 박스 스타일 (Card / Box Standard)

새로 만드는 **모든 카드·박스**에 아래 값을 기본 적용한다.

```js
background: '#FFFFFF'
border: '1px solid #E8ECF0'
borderRadius: 14          // 일반 카드 (작은 아이템)
borderRadius: 16          // 섹션 컨테이너 카드
boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
```

| 속성 | 값 |
|------|----|
| 배경 | `#FFFFFF` (흰색) |
| 테두리 | `1px solid #E8ECF0` |
| 모서리(일반) | `14px` |
| 모서리(섹션) | `16px` |
| 섀도우 | `0 2px 12px rgba(0,0,0,0.08)` |

## 5. 컴포넌트 스타일 (Component Styles)
*   **Cards**: 흰 배경, `#E8ECF0` 테두리, `border-radius 14~16px`, 섀도우 `0 2px 12px rgba(0,0,0,0.08)` 기본 적용.
*   **Buttons**: 명확한 라운드 처리와 컬러 대비를 통해 클릭 가능성 인지.
*   **Navigation**: 하단 바(Bottom Navigation)는 블러 처리된 화이트 배경을 사용하여 상단 콘텐츠와 부드럽게 겹치는 플로팅 효과 적용.

## 5. 주요 화면 가이드
*   **대시보드**: 상단에 사용자 인사말과 주요 지표(핸디캡, 회비)를 배치하여 요약된 정보 제공.
*   **라운딩 라운지**: 일정 정보를 카드 형태로 배열, 참여 가능 여부를 컬러 배지로 표시.
*   **회비 관리**: 전체 잔액을 강조하고, 하단에 상세 거래 내역을 타임라인 형식으로 노출.
*   **마이페이지**: 개인 프로필과 핸디캡 인덱스를 중심에 배치하여 개인화된 경험 강조.