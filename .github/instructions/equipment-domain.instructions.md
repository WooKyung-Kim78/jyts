---
description: JYTS 장비, 정기점검, A/S 및 Excel 이관 업무 규칙
applyTo: "src/features/{equipment,inspections,service-requests,organizations}/**,backend/**"
---

# JYTS 업무 규칙

## 장비 종류

- `PRECISION_AIR_CONDITIONER`: 항온항습기
- `UPS`: 무정전 전원장치
- `FIRE_SUPPRESSION`: 자동소화기
- `VOICE_ALARM`: 음성통보기

장비 카테고리는 위 네 종류만 허용한다. 카테고리별 입력 항목은 ADMIN이 장비 마스터에서 관리하며, 장비 생성 시 항목 정의와 값은 장비 레코드에 snapshot으로 저장한다.

장비별 특이사항은 마스터 항목이 아닌 장비 기본 자유 입력 필드로 저장한다.

새 장비 종류를 추가하거나 특정 장비 종류의 업무 기능을 확장할 때는 이 문서의 카테고리·사양 규칙과 관련 도메인 지침을 같은 변경에서 갱신한다. 정기점검 항목을 추가하는 경우 `.github/instructions/inspection.instructions.md`에도 해당 카테고리의 확인된 점검사항, 기준치, 입력 규칙을 기록한다. 업무 기준을 확인하지 못했으면 임의로 만들지 말고 `확인 필요`로 남긴다.

## 장비 상태

- `ACTIVE`
- `INSPECTION_REQUIRED`
- `OUT_OF_SERVICE`
- `DISPOSED`

장비 코드는 활성 장비에서 고유해야 한다.

## 정기점검 주기

- `equipment.inspection_cycle`: `MONTHLY`(월), `QUARTERLY`(분기), `YEARLY`(년), `ON_REQUEST`(요청) 중 하나.
- 장비 등록·수정 시 필수 선택이다. 컬럼 추가 전 기존 장비는 `null`(미지정)이며 수정 화면에서 주기를 고르기 전에는 저장할 수 없다. 복제 시 원본 주기를 복사한다.
- 분기·연간 기간은 달력 기준(1~3월 분기, 1~12월)으로 판단한다(가정). 장비별 기준월(예: 설치월 기준 분기)은 `확인 필요`.

장비 담당자는 고객사 담당자와 별도로 장비마다 한 명 지정한다. 신규 지정은 활성 직원만 허용한다. 담당 직원이 퇴사해도 기존 장비의 담당자 연결과 이력은 보존하며, 퇴사 직원을 새 담당자로 지정하지 않는다.

주소와 담당자 연락처는 고객사에 직접 저장한다. 별도 사업장 기능은 사용하지 않는다.

폐기된 장비의 기존 점검 및 A/S 이력을 삭제하지 않는다.

QR token에 개인정보나 예측 가능한 순차 ID를 넣지 않는다.

QR 코드로 인증을 우회할 수 없어야 한다.

## 항온항습기 사양

다음을 지원한다.

- 제조사	
- 제조년월	
- 모델명실내기
- 모델명실외기
- 사용전압	
- 냉매	
- 장비위치-실내기
- 장비위치-실외기
- 마이콤-제조사
- 마이콤-모델명
- 콘트롤러-제조사
- 콘트롤러-모델명
- 송풍기모터	
- Compressor	
- 실외기-팬모터
- 실외기-팬날개
- 송풍방식	
- 가습기-모델명
- 가습기-형식
- Reheater	
- 온습도센서	
- 풍량	
- 압력스위치		
- 드라이어	
- 팽창변-제조사
- 팽창변-모델명
- 배수펌
- 프필터사이즈	
- SolenoidV/V	
- 차단기-Main
- 차단기-Blower
- 차단기-Comp
- 차단기-Heater
- 차단기-Humi
- 마그네트-Blower
- 마그네트-Comp
- 마그네트-Fan
- 마그네트-Heater
- 마그네트-Humi
- EOCR-Blower
- EOCR-Comp
- EOCR-Fan

반복 가능한 부품은 `equipment_components`로 관리한다.

## UPS 사양

다음을 지원한다.

- 용량
- 제조사
- 모델명
- 제조년월
- 베터리모델
- 배터리수량
- 배터리 제조일

배터리별 교체 이력이 필요하면 `equipment_components`로 관리한다.

## 자동소화기 사양

다음을 지원한다.

- 종별
- 형식
- 형식승인번호
- 제조년월
- 제조번호
- 제조사
- 약제 용량
- 예비전원
- 휴즈 용량

확인되지 않은 법적 기준이나 사용기한을 임의로 구현하지 않는다.

## 음성통보기 사양

다음을 지원한다.

- 모델명
- 경보연동

## 점검

점검 마스터와 점검 기록의 상세 규칙은 `.github/instructions/inspection.instructions.md`를 따른다. 새 장비 카테고리를 점검 대상에 포함할 때는 해당 문서에 마스터와 입력 규칙을 먼저 추가한다.

종합 결과:

- `NORMAL`
- `CAUTION`
- `REPAIR_REQUIRED`
- `OUT_OF_SERVICE`

점검 상태:

- `DRAFT`
- `COMPLETED`
- `CANCELLED`

완료된 점검에는 당시 template version과 checklist 내용을 보존한다.

완료 기록은 담당자에게 이메일을 보내기 전까지 작성자와 ADMIN만 수정할 수 있다(`inspection` 지침).

## A/S

상태:

- `RECEIVED`
- `ASSIGNED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

허용되는 기본 상태 전환:

```text
RECEIVED -> ASSIGNED
RECEIVED -> CANCELLED
ASSIGNED -> IN_PROGRESS
ASSIGNED -> CANCELLED
IN_PROGRESS -> COMPLETED
IN_PROGRESS -> CANCELLED
```

규칙:

- 완료 시 완료일과 조치 내용이 필요하다.
- 완료일은 접수일보다 빠를 수 없다.
- 비용은 음수가 될 수 없다.
- 접수번호는 고유해야 한다.
- 허용되지 않은 상태 전환은 거부한다.
- 완료된 A/S를 다시 여는 권한은 기본적으로 ADMIN에게만 부여한다.

## Excel 이관

다음 순서를 따른다.

1. 파일 형식과 크기 검증
2. sheet 및 column 분석
3. database field mapping
4. 개인정보 포함 여부 표시
5. 저장 전 preview
6. 필수값 및 형식 오류 표시
7. 중복 고객사 및 장비 후보 탐지
8. 불확실한 값은 확인 필요로 분류
9. 사용자가 선택한 정상 데이터만 등록
10. 행별 성공 및 실패 결과 제공
11. 가져오기 결과를 감사 로그에 기록

중복 후보를 자동 병합하거나 덮어쓰지 않는다.