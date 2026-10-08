# 해빛이의 생태계 인사발령

초등학교 4학년 과학 「생물과 환경」 활동 1에 사용하는 실시간 웹앱입니다.
**학생들의 선택과 근거를 모으며, 정답이나 생물의 역할 용어를 공개하지 않습니다.**

## 가장 먼저 할 일

1. ZIP 파일을 풀어 주세요.
2. GitHub에 이 폴더 안의 파일을 올려 주세요.
3. Render에서 **Web Service**로 연결해 주세요.
4. `TEACHER_PIN`을 설정하면 수업을 시작할 수 있습니다.

HTML 파일을 더블클릭해서는 실시간 수업을 사용할 수 없습니다. Render 또는 Node.js 서버를 실행해야 합니다.

## GitHub에 올리기 — 웹사이트에서 하기

1. GitHub에 로그인합니다.
2. 오른쪽 위 `+` → **New repository**를 누릅니다.
3. Repository name에 `haebit-ecosystem`을 입력합니다. Public 또는 Private 모두 가능합니다.
4. **Create repository**를 누릅니다.
5. 빈 저장소 안내의 **uploading an existing file**을 누릅니다. 기존 저장소는 **Add file → Upload files**입니다.
6. ZIP을 먼저 압축 해제합니다. `haebit-ecosystem` 폴더 **안의 내용 전체**를 업로드 영역으로 끌어 넣습니다.
7. 화면의 파일 목록에 `package.json`, `server.js`, `public/` 등이 있는지 확인합니다.
8. 아래 Commit changes에 `첫 수업 앱 올리기`를 입력하고 **Commit changes**를 누릅니다.

**ZIP 자체를 GitHub에 올리면 실행되지 않습니다.**
`package.json`이 저장소 첫 화면에 보여야 합니다. 폴더를 한 겹 더 올리지 않도록 주의하세요.
웹 업로드 제한에 맞추어 ZIP은 100개 미만의 파일로 구성했고 숨김 파일을 제외했습니다.
파일 수 경고가 뜨면 업로드 대기 목록을 비운 후 새 ZIP의 내용만 다시 올려 주세요.
`node_modules`는 올리지 않습니다. 실제 PIN이 들어 있는 `.env`도 올리지 않습니다.

## Render에 배포하기

1. [Render](https://render.com/)에 로그인합니다.
2. **New → Web Service**를 선택합니다. **Static Site가 아닙니다.**
3. GitHub를 연결하고 방금 만든 저장소를 선택합니다. 목록에 없으면 저장소 접근 권한을 허용합니다.
4. 아래와 같이 설정합니다.

| 항목 | 입력 값 |
| --- | --- |
| Name | `haebit-ecosystem` 등 원하는 이름 |
| Language / Runtime | Node |
| Branch | `main` |
| Root Directory | 비워 둠 (저장소 루트에 package.json이 있는 경우) |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

5. Environment Variables에서 **Add Environment Variable**을 눌러 다음을 입력합니다.

| Key | Value |
| --- | --- |
| `TEACHER_PIN` | 선생님만 아는 PIN (예: 직접 정한 6자리 이상) |

6. 플랜을 확인하고 **Create Web Service / Deploy Web Service**를 누릅니다.
7. 로그에 서버가 준비되었다는 안내가 뜨고 상태가 **Live**가 되면 위쪽 서비스 주소를 엽니다.
8. `https://서비스이름.onrender.com/teacher`에서 PIN으로 입장합니다.
9. 학생은 `https://서비스이름.onrender.com/student`를 사용합니다.

`PORT`는 Render가 지정합니다. 별도로 바꿀 필요가 없습니다. Socket.IO는 HTTP와 같은 포트를 사용합니다.
이 앱은 서버 메모리를 사용하므로 **인스턴스는 1개**로 운영하세요. 여러 인스턴스로 늘리면 수업 상태가 공유되지 않습니다.

## 수업에서 사용하기

### 선생님

1. `/teacher`에서 PIN을 입력합니다.
2. **새 수업 시작하기**를 누릅니다. 요청 ①이 열리면서 4자리 참여 코드가 표시됩니다.
3. 학생들에게 학생 주소와 참여 코드를 알려 줍니다.
4. 접속 인원과 응답 인원을 확인합니다. 접속은 현재 연결된 학생 번호의 수이며, 제출은 이미 연결을 끊은 학생의 응답도 포함합니다.
5. 생물 막대를 누르면 그 생물을 고른 학생들의 **이유별 인원**이 나옵니다. 자유 의견은 교사에게만 보입니다.
6. **집계 마감하고 결과 보기**를 누릅니다. 확인창에서 제출·미제출 인원을 확인하고 **집계 마감**을 누릅니다.
7. 학생과 교사 모두 결과를 봅니다. 충분히 이야기한 뒤 **다음 인사 요청으로 이동**을 누릅니다.
8. 세 번째 결과까지 본 뒤 **활동 종료 · 전체 결과 보기**를 누릅니다.

결과 공개와 다음 요청 이동은 별도입니다. 전원이 제출하지 않아도 마감할 수 있습니다.
이전 결과와 전체 결과를 열어도 현재 수업 단계는 바뀌지 않습니다.
`새 수업 초기화`는 확인 후 기존 방과 응답을 삭제하고 **새 코드**를 만듭니다.
중간에 `수업 종료`를 누르면 현재 요청을 마감하고 활동을 끝냅니다. 미진행 요청에는 “아직 시작하지 않은 요청”이 표시됩니다.

### 학생

1. 참여 코드 4자리를 입력합니다.
2. 1~27번 중 자기 번호를 누릅니다. 이름을 입력하지 않습니다.
3. 생물 카드를 고릅니다. **이유 고르기**를 누릅니다.
4. 이유 하나를 고릅니다. 원하는 친구만 40자 이내로 생각을 씁니다.
5. **인사발령 제출하기**를 누릅니다.
6. 제출 후에는 변경할 수 없습니다. 교사가 마감하면 결과 화면이 자동으로 나타납니다.

선택을 바꾸려면 제출 전에 `생물 다시 고르기`를 사용합니다.
자유 의견을 쓰지 않아도 제출할 수 있습니다.
응답 중 다른 친구의 선택 수, 이유, 자유 의견은 학생에게 전달되지 않습니다.
마감 후 학생에게는 생물별 인원, 참여·미제출 인원만 표시됩니다.

## 새로고침과 연결 복구

- 학생의 참여 코드·번호·무작위 복구 토큰을 해당 브라우저에 저장합니다.
- 학생이 새로고침하면 현재 요청과 제출 상태가 복원됩니다.
- 제출한 뒤 새로고침하거나 다른 탭에서 접속해도 서버가 재제출을 막습니다.
- 같은 브라우저의 다른 탭에서 연결하면 최신 탭이 연결을 이어받습니다. 이전 탭은 연결 이전 안내가 뜨고 제출 권한을 잃습니다.
- 다른 브라우저에서 이미 접속 중인 번호를 고르면 경고합니다. 끊긴 번호는 다시 접속할 수 있으며 기존 응답은 계속 잠겨 있습니다.
- 늦게 들어온 학생은 현재 열린 요청 또는 현재 결과로 바로 들어갑니다.
- 교사도 같은 브라우저에서 새로고침하면 인증과 방을 복원합니다. 인증은 12시간 유효합니다.
- 학생 번호 방식은 실제 신원 인증이 아니므로 학생들이 자기 번호를 선택하도록 안내해 주세요.

## 로컬 실행 — 선택 사항

Node.js 22 이상을 설치한 컴퓨터에서 프로젝트 폴더를 엽니다.

```bash
npm install
```

macOS / Linux:

```bash
TEACHER_PIN=내가정한PIN npm start
```

Windows PowerShell:

```powershell
$env:TEACHER_PIN="내가정한PIN"
npm start
```

Windows 명령 프롬프트:

```bat
set TEACHER_PIN=내가정한PIN
npm start
```

브라우저에서 `http://localhost:3000`을 엽니다.
이 앱은 `.env` 파일을 자동으로 읽지 않습니다. 위 명령 또는 Render 환경 변수로 지정하세요.

## 테스트

```bash
npm test
```

Socket.IO 실제 클라이언트로 27명 동시 접속, 중복 번호, 서버 권한, 제출 검증, 재제출 금지, 재접속, 마감, 다음 요청, 여러 방 분리, 초기화 등을 확인합니다.
웹 브라우저 화면도 1366×768 및 1280×720 크기에서 검증했습니다. 상세 내용은 `TEST-REPORT.md`를 참고하세요.

## 파일 구성

```text
package.json / package-lock.json  설치 정보
server.js                        Express + Socket.IO 서버
render.yaml                      Render 배포 설정 예시
public/index.html                첫 화면
public/student.html / student.js 학생 화면
public/teacher.html / teacher.js 교사 화면
public/style.css                 화면 디자인
public/content.js                세 요청과 공통 이유
public/common.js                 공통 UI 및 안전한 텍스트 표시
public/assets/haebit-01~06.png    기존 해빛이 원본에서 분리한 포즈
public/assets/*.svg              생물 카드 그림
public/fonts/                    통합 고딕 글꼴과 폰트 라이선스
test/realtime.test.js            실시간 서버 테스트
README.md / TEST-REPORT.md        사용 안내와 검증 기록
```

## 서버 메모리와 배포 확인

수업 상태는 데이터베이스 없이 서버 메모리에만 저장됩니다.
서버 재시작·배포 시 수업방과 응답이 사라집니다. 브라우저에 남은 오래된 코드로 접속하면 새 코드로 들어오도록 안내합니다.
서버를 수업 중 재배포하지 마세요. 교사 PIN은 서버 로그에 출력하지 않습니다.

Render에서 제공하는 WebSocket을 사용할 수 있게 구성했으며 로컬 WebSocket 연결은 검증했습니다.
실제 Render 서비스 주소는 아직 생성하지 않았으므로, 배포 후 다음 순서로 확인해 주세요.

1. 교사 방 생성 → 다른 기기에서 학생 두 명 입장
2. 학생 응답 → 교사 화면의 즉시 집계
3. 교사 마감 → 두 학생 화면의 결과 공개
4. 다음 요청 → 두 학생 화면의 동시 이동

플랜에 따라 유휴 서버가 쉬었다가 시작될 수 있으므로 수업 전에 주소를 열고 두 기기로 확인하세요. 현재 플랜의 조건은 Render 화면에서 확인합니다.

공식 참고: [Node/Express 배포](https://render.com/docs/deploy-node-express-app), [Web Service와 PORT](https://render.com/docs/web-services), [WebSocket](https://render.com/docs/websocket), [Socket.IO rooms](https://socket.io/docs/v4/rooms/).
