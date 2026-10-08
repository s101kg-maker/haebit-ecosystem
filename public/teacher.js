'use strict';
const {el,button,mascot,bars}=Object.fromEntries(['el','button','mascot','bars'].map(k=>[k,UI[k].bind(UI)]));
const socket=io(),app=document.querySelector('#app'),notice=document.querySelector('#notice');
let saved=UI.read('haebit.teacher'),state=null,view='current',selected=null,busy=false;
const showError=err=>{notice.textContent=err.message||err;notice.hidden=false;};
const clearError=()=>{notice.hidden=true;};
function accept(s){if(!s)return;const changed=!state||state.roomCode!==s.roomCode||state.question!==s.question;state=s;if(changed){view='current';selected=null;}saved={...saved,roomCode:s.roomCode};UI.save('haebit.teacher',saved);render();}
function updateConnection(){document.querySelector('#connection').textContent=socket.connected?'● 연결됨':'○ 다시 연결 중...';app.querySelectorAll('[data-online]').forEach(b=>b.disabled=!socket.connected||busy);}
socket.on('connect',async()=>{updateConnection();if(saved?.auth){try{const r=await UI.request(socket,'teacher_resume',saved);if(r.state)accept(r.state);else renderReady();}catch(e){saved=null;UI.remove('haebit.teacher');state=null;renderLogin();showError(e);}}});
socket.on('disconnect',updateConnection);
socket.on('teacher_state',accept);
socket.on('room_removed',()=>{});
async function action(event,payload={}){if(busy)return;busy=true;updateConnection();clearError();try{const r=await UI.request(socket,event,payload);if(r.state)accept(r.state);}catch(e){showError(e);}finally{busy=false;updateConnection();}}
function onlineButton(text,handler,cls='button'){const b=button(text,handler,cls);b.dataset.online='true';b.disabled=!socket.connected||busy;return b;}
function renderLogin(){app.replaceChildren();const stage=el('div','stage login-stage'),p=el('section','panel login-panel');p.append(el('span','eyebrow','선생님, 반가워요'),el('h1','','우리 반 탐구를 시작해요'),el('p','large-copy','교사 PIN을 입력해 주세요.'));const form=el('form','pin-form'),input=el('input','pin-input');input.type='password';input.autocomplete='current-password';input.placeholder='교사 PIN';input.required=true;input.maxLength=128;input.setAttribute('aria-label','교사 PIN');const submit=el('button','button','선생님 입장');submit.type='submit';submit.dataset.online='true';form.append(input,submit);form.addEventListener('submit',async e=>{e.preventDefault();clearError();submit.disabled=true;try{const r=await UI.request(socket,'teacher_login',{pin:input.value});saved={auth:r.auth};UI.save('haebit.teacher',saved);renderReady();}catch(err){showError(err);submit.disabled=false;}});p.append(form,el('p','muted','Render에 설정한 TEACHER_PIN을 사용합니다.'));stage.append(mascot(1,'선생님! 오늘도 우리 반의\n생각을 모아 볼까요?'),p);app.append(stage);updateConnection();}
function renderReady(){app.replaceChildren();const stage=el('div','stage'),p=el('section','panel waiting-panel');p.append(el('span','eyebrow','활동 1 · 생태계 인사발령'),el('h1','','우리 반의 생각을 모아요'),el('p','large-copy','생물을 고르고, 이유를 말하고,\n친구들의 생각을 살펴봐요.'),onlineButton('새 수업 시작하기',()=>action('create_room')));stage.append(mascot(1,'수업을 만들면\n참여 코드가 나타나요.'),p);app.append(stage);updateConnection();}
function resultPanel(summary,index,interactive=true){
 const panel=el('section','panel result-panel');panel.append(el('span','eyebrow','인사 요청 '+(index+1)+' · '+(summary.state==='OPEN'?'선생님만 보는 실시간 집계':summary.state==='PENDING'?'아직 시작하지 않은 요청':'집계 완료')),el('h2','',Content.QUESTIONS[index].title));
 panel.append(bars(summary,interactive?name=>{selected=name;render();}:null,selected),el('p','participation','참여 '+summary.submitted+'명 / 미제출 '+summary.missing+'명'));
 if(interactive){const current=summary.organisms.find(o=>o.name===selected)||summary.organisms[0];selected=current.name;const analysis=el('div','reason-analysis');analysis.append(el('h3','',current.name+'를 선택한 친구들의 이유'));current.reasons.forEach((r,i)=>{const row=el('div','reason-result');row.append(el('span','',String(i+1)+'. '+r.label),el('strong','',r.count+'명'));analysis.append(row);});panel.append(analysis);
 const comments=el('div','comments');comments.append(el('h3','','친구들의 한마디 · 교사에게만 표시'));if(!summary.comments.length)comments.append(el('p','muted','한마디를 쓴 친구가 아직 없어요.'));summary.comments.forEach(c=>{const item=el('div','comment-item');item.append(el('strong','',c.studentNumber+'번 · '+c.organism),el('p','',c.comment));comments.append(item);});panel.append(comments);
 const missing=el('details','missing-details');missing.append(el('summary','','미제출 번호 확인 ('+summary.missing+'명)'),el('p','',summary.missingNumbers.join(', ')||'모두 제출했습니다.'));panel.append(missing);}
 return panel;
}
function summaryView(){const container=el('div','summary-grid');state.results.forEach((s,i)=>container.append(resultPanel(s,i,false)));const finish=el('section','panel summary-prompt');finish.append(el('h2','','상황마다 선택한 생물이 왜 달라졌을까요?'),el('h2','','우리는 생물을 고를 때 무엇을 기준으로 생각했나요?'),el('p','muted','활동 2에서 생물들이 실제로 어떻게 살아가는지 살펴봅시다.'));return [container,finish];}
function render(){
 app.replaceChildren();
 const toolbar=el('div','teacher-toolbar'),code=el('div','room-code');code.append(el('span','','오늘의 참여 코드'),el('strong','',state.roomCode));
 const presence=el('div','presence');presence.append(el('strong','','접속 '+state.connected+' / '+state.total+'명'),el('span','muted','학생 주소: '+location.origin+'/student'));
 const tools=el('div','toolbar-actions');tools.append(onlineButton('새 수업 초기화',async()=>{if(await UI.confirm('새 수업을 시작할까요?','현재 참여 코드와 모든 응답이 삭제됩니다. 학생들은 새 코드로 다시 입장해야 합니다.','초기화하고 새 수업'))action('reset_room');},'button secondary small'));
 if(!state.ended)tools.append(onlineButton('수업 종료',endClass,'text-button'));
 toolbar.append(code,presence,tools);app.append(toolbar);
 const nav=el('nav','history-nav');nav.setAttribute('aria-label','결과 보기');nav.append(button('현재 수업',()=>{view='current';selected=null;render();},'nav-button'+(view==='current'?' active':'')));
 state.results.forEach((s,i)=>{if(s.state==='CLOSED')nav.append(button('요청 '+(i+1)+' 결과',()=>{view=i;selected=null;render();},'nav-button'+(view===i?' active':'')));});nav.append(button('전체 결과',()=>{view='all';selected=null;render();},'nav-button'+(view==='all'?' active':'')));app.append(nav);
 if(state.ended||view==='all'){app.append(el('h1','summary-heading','오늘 우리 반의 인사발령'),...summaryView());return;}
 const index=typeof view==='number'?view:state.question-1,summary=state.results[index];
 const layout=el('div','teacher-layout'),left=el('div','teacher-guide');
 if(view==='current'){
 const scenario=el('section','panel teacher-scenario');scenario.append(el('span','eyebrow','해빛이의 생태계 인사발령 '+state.question+' / 3'),el('h1','','인사 요청 '+state.question));Content.QUESTIONS[index].lines.forEach(line=>scenario.append(el('p','',line)));
 const count=el('div','response-count');count.append(el('span','','응답'),el('strong','',summary.submitted+' / 27명'));scenario.append(count);
 if(state.questionState==='OPEN')scenario.append(onlineButton('집계 마감하고 결과 보기',async()=>{const question=state.question,s=state.results[question-1];if(await UI.confirm('현재 '+s.submitted+'명이 제출했습니다.',s.missing+'명은 미제출로 처리됩니다. 지금 집계를 마감하고 모두에게 결과를 보여 줄까요?','집계 마감'))action('close_poll',{question});}));
 else{scenario.append(el('div','closed-label','집계 마감 · 결과 함께 보기'));const questions=el('div','discussion');['왜 이 생물을 선택한 친구가 많았을까요?','다른 생물을 고른 친구는 어떤 생각이었을까요?','같은 생물을 골라도 이유는 모두 같았나요?'].forEach(t=>questions.append(el('p','',t)));scenario.append(questions);
 if(state.question<3)scenario.append(onlineButton('다음 인사 요청으로 이동 →',()=>action('next_question',{question:state.question})));
 else scenario.append(onlineButton('활동 종료 · 전체 결과 보기',endClass));}
 left.append(scenario,mascot(state.questionState==='OPEN'?3:6,state.questionState==='OPEN'?'응답 중에는 선생님만\n집계를 볼 수 있어요.':'결과에 담긴 생각을\n함께 이야기해 주세요.'));
 }else{const history=el('section','panel teacher-scenario');history.append(el('span','eyebrow','이전 결과'),el('h1','','인사 요청 '+(index+1)));Content.QUESTIONS[index].lines.forEach(t=>history.append(el('p','',t)));history.append(button('현재 수업으로 돌아가기',()=>{view='current';selected=null;render();},'button secondary'));left.append(history,mascot(6,'지난 선택의 이유도\n살펴볼 수 있어요.'));}
 layout.append(left,resultPanel(summary,index));app.append(layout);updateConnection();
}
async function endClass(){if(await UI.confirm('수업을 종료할까요?',state.question===3&&state.questionState==='CLOSED'?'세 요청의 결과를 모아서 보여 줍니다. 학생들은 활동 2 안내 화면으로 이동합니다.':'현재 응답 접수를 마감하고 활동을 끝냅니다. 시작하지 않은 요청은 미진행으로 표시됩니다.','수업 종료'))action('class_end');}
renderLogin();
