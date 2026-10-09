'use strict';
const {el,button,mascot,bars}=Object.fromEntries(['el','button','mascot','bars'].map(k=>[k,UI[k].bind(UI)]));
const socket=io(),app=document.querySelector('#app'),notice=document.querySelector('#notice');
let saved=UI.read('haebit.teacher'),state=null,selected=null,busy=false,paintKey='',sceneHandle=null,view='current',recordDialog=null,recordQuestion=null,recordOrganism=null;
const showError=err=>{notice.textContent=err.message||err;notice.hidden=false;};
const clearError=()=>{notice.hidden=true;};
function accept(s){
 if(!s)return;const changed=!state||state.roomCode!==s.roomCode||state.question!==s.question;
 state=s;if(changed){selected=null;view='current';}
 saved={...saved,roomCode:s.roomCode};UI.save('haebit.teacher',saved);
 render();if(recordDialog?.open)renderRecords();
}
function updateConnection(){
 document.querySelector('#connection').textContent=socket.connected?'● 연결됨':'○ 다시 연결 중...';
 document.querySelectorAll('[data-online]').forEach(b=>b.disabled=!socket.connected||busy);
}
socket.on('connect',async()=>{updateConnection();if(saved?.auth){try{const r=await UI.request(socket,'teacher_resume',saved);if(r.state)accept(r.state);else renderReady();}catch(e){saved=null;UI.remove('haebit.teacher');state=null;renderLogin();showError(e);}}});
socket.on('disconnect',updateConnection);socket.on('teacher_state',accept);socket.on('room_removed',()=>{});
async function action(event,payload={}){if(busy)return;busy=true;updateConnection();clearError();try{const r=await UI.request(socket,event,payload);if(r.state)accept(r.state);}catch(e){showError(e);}finally{busy=false;updateConnection();}}
function onlineButton(text,handler,cls='dispatch-primary'){const b=button(text,handler,cls);b.dataset.online='true';b.disabled=!socket.connected||busy;return b;}
function clearStage(){sceneHandle?.dispose();sceneHandle=null;paintKey='';app.className='teacher-app';app.replaceChildren();}
function renderLogin(){clearStage();const stage=el('div','stage login-stage'),p=el('section','panel login-panel');p.append(el('span','eyebrow','해빛 생태계 주식회사 인사과'),el('h1','','선생님, 오늘의 임무를 시작해요'),el('p','large-copy','교사 PIN을 입력해 주세요.'));const form=el('form','pin-form'),input=el('input','pin-input');input.type='password';input.autocomplete='current-password';input.placeholder='교사 PIN';input.required=true;input.maxLength=128;input.setAttribute('aria-label','교사 PIN');const submit=el('button','button','선생님 입장');submit.type='submit';submit.dataset.online='true';form.append(input,submit);form.addEventListener('submit',async e=>{e.preventDefault();clearError();submit.disabled=true;try{const r=await UI.request(socket,'teacher_login',{pin:input.value});saved={auth:r.auth};UI.save('haebit.teacher',saved);renderReady();}catch(err){showError(err);submit.disabled=false;}});p.append(form,el('p','muted','Render에 설정한 TEACHER_PIN을 사용합니다.'));stage.append(mascot(1,'선생님! 우리 반 탐구원들에게\n새로운 임무가 도착했어요.'),p);app.append(stage);updateConnection();}
function renderReady(){clearStage();const stage=el('div','stage'),p=el('section','panel waiting-panel');p.append(el('span','eyebrow','활동 1 · 해빛이의 생태계 인사발령'),el('h1','','오늘의 인사발령을 시작합니다'),el('p','large-copy','통지서를 읽고, 직원을 고르고,\n우리 반의 생각을 펼쳐 봐요.'),onlineButton('새 수업 시작하기',()=>action('create_room')));stage.append(mascot(1,'통지서를 보낼 준비가 되었나요?'),p);app.append(stage);updateConnection();}
function repaint(replay=false){
 const root=document.querySelector('#presentation');if(!root)return;
 sceneHandle?.dispose();sceneHandle=Dispatch.mount(root,{state,selected,onSelect:name=>{selected=name;repaint();},onReplay:()=>repaint(true)});
}
function makeShell(){
 sceneHandle?.dispose();app.className='dispatch-app';app.replaceChildren();
 const shelf=el('div','classroom-shelf'),room=el('div','classroom-room');room.append(el('span','','참여 코드'),el('strong','room-code-value',state.roomCode),el('span','room-divider'),el('span','classroom-presence',''));
 shelf.append(room,button('교사용 기록 · 설정',openRecords,'classroom-settings-button'));
 const root=el('div','presentation-root');root.id='presentation';const footer=el('footer','classroom-footer');footer.id='classroom-footer';app.append(shelf,root,footer);Dispatch.fit(app);
}
function render(){
 const key=[state.roomCode,state.question,state.presentationStage,state.ended,view].join(':');
 if(key!==paintKey){makeShell();paintKey=key;if(state.ended||view==='all')renderSummary();else repaint();}
 const roomCode=app.querySelector('.room-code-value');if(roomCode)roomCode.textContent=state.roomCode;
 const presence=app.querySelector('.classroom-presence');if(presence)presence.textContent='접속 '+state.connected+' / 27명';
 const footer=document.querySelector('#classroom-footer');footer.replaceChildren();
 const status=el('div','footer-status'),actions=el('div','footer-actions');
 const summary=state.results[state.question-1];
 if(state.ended||view==='all'){
   status.append(el('strong','',state.ended?'활동 1 완료':'전체 결과 확인'),el('span','','우리의 선택에서 다음 탐구로'));
   if(!state.ended)actions.append(button('현재 수업으로 돌아가기',()=>{view='current';render();},'dispatch-secondary'));
   else actions.append(onlineButton('새 수업 시작하기',resetClass));
 }else if(state.presentationStage==='LOBBY'){
   Dispatch.updateLobby(app,state);
   status.append(el('strong','','입장 '+state.connected+' / 27명'));
   actions.append(button('전체 화면',toggleFullScreen,'quiet-button'),onlineButton('입장 확인 · 다음 →',()=>action('intro_next',{stage:'LOBBY'})));
 }else if(state.presentationStage==='STORY'){
   status.append(el('strong','','해빛이의 긴급 요청'));
   actions.append(onlineButton('해빛이가 되어 인사발령 시작 →',()=>action('intro_next',{stage:'STORY'})));
 }else if(state.presentationStage==='NOTICE'){
   status.append(el('strong','response-total','응답 '+summary.submitted+' / 27명'));
   actions.append(button('전체 화면',toggleFullScreen,'quiet-button'),onlineButton('집계 마감하고 결과 보기 →',closePoll));
 }else if(state.presentationStage==='CHOICES'){
   status.append(el('strong','','선택 결과 공개'));
   actions.append(onlineButton('선택 이유 펼치기 →',()=>action('presentation_set',{question:state.question,stage:'REASONS'})));
 }else{
   status.append(el('strong','','생각을 나누는 시간'));
   actions.append(onlineButton('선택 결과로 돌아가기',()=>action('presentation_set',{question:state.question,stage:'CHOICES'}),'dispatch-secondary'));
   if(state.question<3)actions.append(onlineButton('다음 인사 요청으로 이동 →',()=>action('next_question',{question:state.question})));
   else actions.append(onlineButton('활동 종료 · 전체 결과 보기',endClass));
 }
 footer.append(status,actions);updateConnection();
}
async function toggleFullScreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{showError('브라우저 전체 화면은 F11로도 열 수 있습니다.');}}
async function closePoll(){const question=state.question,s=state.results[question-1];if(await UI.confirm('현재 '+s.submitted+'명이 제출했습니다.',s.missing+'명은 미제출로 처리됩니다. 집계를 마감하고 선택 결과를 공개할까요?','집계 마감'))action('close_poll',{question});}
async function endClass(){if(await UI.confirm('수업을 종료할까요?',state.question===3&&state.questionState==='CLOSED'?'세 요청의 결과를 모아서 보여 줍니다. 학생들은 칠판 보기 안내 화면으로 이동합니다.':'현재 응답 접수를 마감하고 활동을 끝냅니다. 시작하지 않은 요청은 미진행으로 표시됩니다.','수업 종료'))action('class_end');}
async function resetClass(){if(await UI.confirm('새 수업을 시작할까요?','현재 참여 코드와 모든 응답이 삭제됩니다. 학생들은 새 코드로 다시 입장해야 합니다.','초기화하고 새 수업'))action('reset_room');}
function renderSummary(){const root=document.querySelector('#presentation'),body=el('section','teacher-summary');if(state.ended)body.append(Dispatch.completion({final:true,compact:true}));body.append(el('h1','','오늘 우리 반의 인사발령'));const grid=el('div','summary-grid');state.results.forEach((s,i)=>{const box=el('section','panel');box.append(el('span','eyebrow','요청 '+(i+1)+' · '+(s.state==='PENDING'?'미진행':'집계 완료')),el('h2','',Content.QUESTIONS[i].title),bars(s),el('p','participation','참여 '+s.submitted+'명 / 미제출 '+s.missing+'명'));grid.append(box);});body.append(grid);const question=el('div','panel summary-prompt');question.append(el('h2','','상황마다 선택한 생물이 왜 달라졌을까요?'),el('h2','','우리는 생물을 고를 때 무엇을 기준으로 생각했나요?'),el('p','muted','이제 생물들이 실제로 어떻게 살아가는지 더 자세히 살펴봅시다.'));body.append(question);root.replaceChildren(body);}
function openRecords(){
 if(recordDialog?.open)return;recordQuestion=state.question-1;recordOrganism=null;
 recordDialog=el('dialog','record-dialog');recordDialog.setAttribute('aria-label','교사용 기록과 수업 설정');
 document.body.append(recordDialog);recordDialog.addEventListener('close',()=>{recordDialog.remove();recordDialog=null;});renderRecords();recordDialog.showModal();
}
function renderRecords(){
 if(!recordDialog)return;recordDialog.replaceChildren();
 const head=el('div','record-dialog-header');head.append(el('h2','','교사용 기록 · 설정'),button('닫기',()=>recordDialog.close(),'dispatch-secondary'));recordDialog.append(head,el('p','record-private-warning','이 화면에는 교사용 실시간 집계와 학생 의견이 표시됩니다.'));
 const tabs=el('div','history-nav');state.results.forEach((s,i)=>{if(s.state!=='PENDING')tabs.append(button('요청 '+(i+1)+' '+(s.state==='OPEN'?'(응답 중)':'결과'),()=>{recordQuestion=i;recordOrganism=null;renderRecords();},'nav-button'+(recordQuestion===i?' active':'')));});recordDialog.append(tabs);
 const s=state.results[recordQuestion],current=s.organisms.find(o=>o.name===recordOrganism)||s.organisms[0];recordOrganism=current.name;
 const columns=el('div','record-columns'),stats=el('section','record-box');stats.append(el('h3','','현재 선택 현황'),bars(s,name=>{recordOrganism=name;renderRecords();},recordOrganism),el('p','participation','참여 '+s.submitted+'명 / 미제출 '+s.missing+'명'),el('h3','',current.name+'를 선택한 이유'));
 current.reasons.forEach((r,i)=>{const row=el('div','reason-result');row.append(el('span','',String(i+1)+'. '+r.label),el('strong','',r.count+'명'));stats.append(row);});
 const comments=el('section','record-box comments');comments.append(el('h3','','친구들의 한마디 · 교사에게만 표시'));if(!s.comments.length)comments.append(el('p','muted','작성한 한마디가 없습니다.'));s.comments.forEach(c=>{const item=el('div','comment-item');item.append(el('strong','',c.studentNumber+'번 · '+c.organism),el('p','',c.comment));comments.append(item);});comments.append(el('p','muted','미제출 번호: '+(s.missingNumbers.join(', ')||'없음')));columns.append(stats,comments);recordDialog.append(columns);
 const tools=el('div','record-tools');tools.append(button('전체 결과 보기',()=>{recordDialog.close();view='all';render();},'dispatch-secondary'));
 tools.append(onlineButton('새 수업 초기화',async()=>{recordDialog.close();await resetClass();},'dispatch-secondary'));
 if(!state.ended)tools.append(onlineButton('수업 종료',async()=>{recordDialog.close();await endClass();},'dispatch-secondary'));recordDialog.append(tools);updateConnection();
}
window.addEventListener('resize',()=>Dispatch.fit(app));
renderLogin();
