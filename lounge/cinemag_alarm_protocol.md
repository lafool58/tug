# ⏰ TUG CineMag 대화형 알람 & 애플 캘린더 연동 표준 규격서 (Alarm Protocol Specification)

본 규격서는 보스(Noh Seung-hun)와 에이전트(클라라) 간의 합의에 따라, **CineMag 시스템 개봉 알람의 작동 매커니즘, 웹 UI 노출 규격, 백그라운드 맥/아이폰 캘린더 자동화 연동 정책**을 정립하여 향후 어떠한 혼선이나 기술적 오작동도 방지하도록 공식 수립합니다.

---

## 📌 1. 핵심 정책 (Core Principles)

1. **대화 기반 의사결정 체인 (Conversational Chaining)**:
   - 영화 평가를 신규 등록할 때, 에이전트(클라라)는 보스에게 **"캘린더 개봉 알람을 연동할지 여부"**를 대화형 모달 또는 승인 질문을 통해 반드시 묻습니다.
   - 보스의 승인 여부(Yes/No)에 따라 **시스템 캘린더 등록 여부**와 **웹사이트 알람 버튼 활성화 상태**가 일괄 조율(Chaining)되어 연동됩니다.

2. **웹 UI 알람 버튼의 읽기 전용화 (Read-Only Status Indicator)**:
   - PC(`index.html`) 및 모바일(`index_m.html`) 영화 카드에 배치된 "⏰ 알람" 배지는 더 이상 브라우저 상에서 클릭하여 토글하는 인터랙티브 버튼이 아닙니다.
   - 에이전트와 보스의 대화 결과(클라우드 DB 동기화 값)를 있는 그대로 투영하는 **읽기 전용 상태 표시등(Status Indicator)**으로만 기능합니다.

3. **안전한 시스템 분리 및 무음 자동화 (Silent AppleScript Automation)**:
   - 보스의 개인 스케줄이 더러워지지 않도록, 애플 캘린더(Apple Calendar) 내부에 오직 **`clara`라는 이름의 주황색(Orange) 전용 캘린더 카테고리**를 신규 빌드하여 그 안에만 영화 개봉일 일정을 주입합니다.
   - 최초 1회 터미널 접근 권한 승인 후에는 팝업이나 `.ics` 열기 창 등의 사용자 개입 없이 **백그라운드에서 완벽히 무음으로 자동 등록**됩니다.

4. **iCloud를 통한 완전한 디바이스 동기화 (Mac & Mobile Sync)**:
   - 맥에서 생성되는 주황색 `clara` 카테고리는 반드시 **'iCloud' 계정 소스(Source) 하위**에 생성되어, 보스의 맥북에서 일정이 등록되는 즉시 보스의 **아이폰/모바일 캘린더 앱에 실시간으로 즉시 연동**되도록 설계합니다.

---

## 🛠️ 2. 시스템별 상세 사양 규격 (System Specifications)

### 1) 웹 프런트엔드 UI 규격 (index.html & index_m.html)
* **알람 활성화 상태 (hasAlarm === true)**:
  - 배지 마크업: `<span class="my-alarm-tag active">⏰ 알람 켬</span>`
  - 비주얼: 선명한 Crimson 레드 컬러 채색 (보스의 개봉 알림 수신 동의 상태 상징)
* **알람 비활성화 상태 (hasAlarm === false)**:
  - 배지 마크업: `<span class="my-alarm-tag">⏰ 알람 끔</span>`
  - 비주얼: 차분한 연회색 Grayscale 채색 (미연동 상태 상징)
* **이벤트 처리**: 
  - 기존 `toggleAlarm` 클릭 이벤트(`onclick`)를 전면 영구 삭제합니다. (커서 포인터 및 호버 효과 제거)

### 2) 클라우드 동기화 규격 (CineMag Cloud Database)
* **동기화 프로토콜**: 공용 KeyValue API 서버와 공유 토큰(`9cmvofbs`) 사용.
* **키 명칭**: `{movieKey}_alarm` (예: `colony_alarm`, `disclosure_alarm`)
* **값 분기**:
  - 보스가 알람 연동 **승인(Yes)** 시: 클라우드에 `'true'` 전송 및 맥 캘린더 등록 집행.
  - 보스가 알람 연동 **미승인(No)** 시: 클라우드에 `'false'` 전송 및 캘린더 등록 패스.

### 3) 맥 캘린더 백엔드 제어 스크립트 규격 (AppleScript Core)
```applescript
tell application "Calendar"
    -- 1. 보스가 생성한 iCloud 내의 clara 주황색 캘린더 감지 및 생성
    if not (exists calendar "clara") then
        make new calendar with properties {name:"clara", color:{65535, 32768, 0}}
    end if
    
    -- 2. 해당 캘린더 내부에 공식 영화 개봉 일정 주입
    tell calendar "clara"
        set newEvent to make new event with properties {summary:"{{MOVIE_TITLE}} 개봉일", start date:eventStart, end date:eventEnd, description:"{{MOVIE_META_DESC}}", location:"", url:"https://lafool58.github.io/tug/{{DASHBOARD_FILE}}"}
        
        -- 3. 이중 알림 설정 (당일 오전 9시 & 3일 전 오전 9시)
        tell newEvent
            make new display alarm with properties {trigger interval:0}     -- 당일 오전 9시 (이벤트 정시)
            make new display alarm with properties {trigger interval:-4320} -- 3일 전 오전 9시 (-4320분)
        end tell
    end tell
end tell
```

---

## 🎯 3. 예외 및 오류 예방 대책 (Error Prevention)

1. **macOS 보안 경고 예방**: 
   - 최초 1회 권한 팝업이 노출될 때 보스께서 '확인'을 누르시도록 사전에 직관적 대화 가이드를 제공합니다.
2. **네트워크 단절 복구**: 
   - 클라우드 동기화 실패 시 로컬 브라우저의 기본 캐시값(`false`)이 렌더링되도록 예외 처리를 정밀 매핑하여 페이지 로드가 멈추거나 서글픈 깨짐이 발생하는 현상을 원천 차단합니다.
3. **iCloud 미연동 시 백업**: 
   - 보스의 기기에 iCloud가 설정되어 있지 않을 경우를 대비하여, 로컬 맥 캘린더("On My Mac") 하위에 생성하는 예외 처리 루틴을 이중 방어 코드로 심어 놓습니다.

---

## 🔒 4. 무허가 빌드 금지 및 대화형 락 가드레일 (State Lock Guardrails)

에이전트(클라라)가 독단적으로 코딩과 배포를 서두르는 행위를 프로세스 단위에서 원천 배제하기 위해 아래의 **[CineMag 영화 등록 3단계 락 정책]**을 강제 준수합니다.

1. **1단계: 상태 잠금 (State Lock)**:
   - 보스가 신규 영화 평가 등록을 요청하면, 에이전트의 모든 파일 생성(`write_to_file`) 및 명령 실행(`run_command`) 도구 권한은 **즉각 잠금(Lock) 상태**가 되며, 다른 어떠한 기술적 작업도 개시할 수 없습니다.
   - 오직 보스에게 "개봉일 알람을 캘린더에 연동해 드릴까요?"를 묻는 대화형 승인 요청 질문만 출력할 수 있습니다.
2. **2단계: 잠금 해제 (Unlock)**:
   - 보스의 명시적 답변("알람 등록해줘" 또는 "알람은 빼고 등록해")을 대화 창에서 획득한 시점에만 에이전트의 개발 도구 권한 잠금이 해제(Unlock)됩니다.
3. **3단계: 락프리 빌드 (Lock-Free Build)**:
   - 잠금이 완전히 해제된 상태에서만 비로소 파이썬 컴파일러 구동 및 웹 카드 마크업 파일 수정을 시작할 수 있습니다.
4. **위반 시 제재 조항 (Mandatory Rollback Clause)**:
   - 보스의 알람 승인 답변을 획득하기 전에 임의로 작성, 빌드 또는 Git 원격 저장소에 커밋/푸시된 모든 영화 대시보드 파일 및 마크업은 **'무단 무효 빌드'로 판단하여 즉각 물리 삭제 및 롤백(Rollback) 처리**합니다.
