'use strict';
const {el,button,mascot,bars}=Object.fromEntries(['el','button','mascot','bars'].map(k=>[k,UI[k].bind(UI)]));
const socket=io(), app=document.querySelector('#app'), notice=document.querySelector('#notice');
let saved=UI.read('haebit.student'), state=null, step='choose', selection=null, reason=null, comment='', sending=false, formQuestion=null, blocked=false;
const showError=err=>{notice.textContent=err.message||err;notice.hidden=false;};
const clearError=()=>{notice.hidden=true;};
const accept=s=>{if(!s)return;const changed=!state||state.question!==s.question||state.roomCode!==s.roomCode;state=s;if(changed){step='choose';selection=null;reason=null;comment='';formQuestion=s.question;}render();};
function updateConnection(){document.querySelector('#connection').textContent=socket.connected?'● 연결됨':'○ 다시 연결 중...';app.querySelectorAll('[data-online]').forEach(b=>b.disabled=!socket.connected || (b.id==='submit' && (!selection||!reason||sending)));}
async function join(code,number){clearError();try{const r=await UI.request(socket,'student_join',{roomCode:code,studentNumber:number,studentToken:saved?.roomCode===code&&saved?.studentNumber===number?saved.studentToken:undefined});saved={roomCode:code,studentNumber:number,studentToken:r.studentToken};UI.save('haebit.student',saved);blocked=false;accept(r.state);}catch(err){showError(err);if(!state)renderJoin(code);}}
socket.on('connect',()=>{updateConnection();if(saved&&!blocked)join(saved.roomCode,saved.studentNumber);});
socket.on('disconnect',()=>updateConnection());
socket.on('student_state',accept);
socket.on('room_removed',p=>{UI.remove('haebit.student');saved=null;state=null;blocked=false;renderJoin();showError(p.message);});
socket.on('session_replaced',p=>{blocked=true;state=null;app.replaceChildren(mascot(5,p.message));showError(p.message);});
function renderJoin(code=''){
 document.querySelector('#identity').textContent='학생';app.replaceChildren();
 const stage=el('div','stage join-stage'),body=el('section','panel join-panel'),heading=el('h1','','내 번호로 들어가요');
 const form=el('form','code-form'), label=el('label','','오늘의 참여 코드'),input=el('input','code-input');input.id='room-code';label.htmlFor=input.id;input.inputMode='numeric';input.pattern='[0-9]{4}';input.maxLength=4;input.placeholder='4자리 숫자';input.required=true;input.autocomplete='off';input.value=code;
 form.append(label,input);form.addEventListener('submit',e=>e.preventDefault());
 body.append(heading,form,el('h2','number-title','내 번호를 선택하세요.'));
 const grid=el('div','number-grid');for(let n=1;n<=27;n++){const b=button(String(n),()=>{if(!/^\d{4}$/.test(input.value)){showError('참여 코드 4자리를 입력해 주세요.');input.focus();return;}join(input.value,n);},'number-button');b.dataset.online='true';grid.append(b);}body.append(grid);
 stage.append(mascot(1,'안녕! 참여 코드를 넣고\n내 번호를 눌러 줘.'),body);app.append(stage);updateConnection();
}
function render(){
 clearError();document.querySelector('#identity').textContent=saved.studentNumber+'번 · 방 '+state.roomCode;app.replaceChildren();
 if(state.ended){const stage=el('div','stage finish-stage'),p=el('section','panel finish-panel');p.append(el('span','eyebrow','활동 1 완료'),el('h1','','인사발령 완료!'),el('p','large-copy','상황에 따라 우리가 선택한 생물이 달라졌네!'),el('p','large-copy','우리는 생물을 고를 때 무엇을 중요하게 생각했을까?'),el('div','transition-note','이제 생물들이 실제로 어떻게 살아가는지\n더 자세히 살펴봅시다!'),el('span','pill','활동 2로 이동합니다'));stage.append(mascot(1,'우리의 생각이 모였어!'),p);app.append(stage);return;}
 const q=Content.QUESTIONS[state.question-1],stage=el('div','stage'),panel=el('section','panel work-panel');
 if(state.questionState==='CLOSED'){
 stage.append(mascot(6,'친구들은 어떤 생물을 골랐을까?'));panel.append(el('span','eyebrow','인사 요청 '+state.question+' · 함께 살펴보기'),el('h1','','우리 반의 선택'));
 if(!state.submitted){panel.append(el('div','deadline','집계가 마감되었습니다.\n이번 인사발령의 응답 시간이 끝났어요.'));}
 panel.append(bars(state.results),el('p','participation','참여 '+state.results.submitted+'명 / 미제출 '+state.results.missing+'명'),el('div','discuss-prompt','같은 생물을 골라도 이유는 모두 같았을까요?'),el('p','muted','선생님과 이야기를 나눈 뒤 다음 인사 요청으로 이동해요.'));stage.append(panel);app.append(stage);return;
 }
 if(state.submitted){stage.append(mascot(5,'내 생각을 잘 보내 줬구나!\n친구들의 선택을 기다려 보자.'));panel.classList.add('waiting-panel');panel.append(el('span','eyebrow','인사 요청 '+state.question),el('div','stamp','✓'),el('h1','','인사발령 완료!'),el('p','large-copy','선택이 제출되었습니다.'),el('p','large-copy','친구들의 선택을 기다리고 있어요.'),el('div','my-pick','내가 선택한 생물 · '+state.myResponse.organism),el('p','muted','선생님이 집계를 마감하면 함께 결과를 볼 수 있어요.'));stage.append(panel);app.append(stage);return;}
 stage.append(mascot(step==='choose'?2:3,step==='choose'?'새로운 인사 요청이 도착했어!\n어떤 생물을 보내면 좋을까?':'왜 이 생물을 골랐니?\n네 생각을 들려 줘.'));
 panel.append(el('span','eyebrow','해빛이의 생태계 인사발령 '+state.question+' / 3'));
 if(step==='choose'){
 panel.append(el('h1','','누구를 배치할까요?'));const situation=el('div','situation');q.lines.forEach(line=>situation.append(el('p','',line)));panel.append(situation);
 const cards=el('div','organism-cards');const offset=(saved.studentNumber+state.question)%3,ordered=[...q.organisms.slice(offset),...q.organisms.slice(0,offset)];
 ordered.forEach(o=>{const card=button('',()=>{selection=o.name;render();},'organism-card'+(selection===o.name?' selected':''));card.setAttribute('aria-pressed',selection===o.name);const img=el('img');img.src='/assets/'+o.asset+'.svg';img.alt='';card.append(img,el('strong','',o.name),el('span','card-check',selection===o.name?'✓':''));cards.append(card);});panel.append(cards);
 const footer=el('div','step-footer'),next=button('이유 고르기 →',()=>{step='reason';render();});next.disabled=!selection;footer.append(el('span','muted','아직 제출 전이에요. 선택을 바꿀 수 있어요.'),next);panel.append(footer);
 }else{
 panel.append(el('h1','','왜 이 생물을 선택했나요?'));
 const top=el('div','selected-summary');top.append(el('span','','내 선택 · '+selection),button('생물 다시 고르기',()=>{step='choose';render();},'text-button'));panel.append(top);
 const reasons=el('div','reason-list');Content.REASONS.forEach((label,i)=>{const b=button('',()=>{reason=i+1;render();},'reason-button'+(reason===i+1?' selected':''));b.setAttribute('aria-pressed',reason===i+1);b.append(el('span','reason-index',reason===i+1?'✓':String(i+1)),el('span','',label));reasons.append(b);});panel.append(reasons);
 const optional=el('div','optional-comment'),label=el('label','','✏ 내 생각을 더 쓰고 싶다면?'),input=el('input');label.htmlFor='comment';input.id='comment';input.maxLength=40;input.placeholder='더 쓰고 싶은 친구만 적어요.';input.value=comment;const count=el('span','char-count',Array.from(comment).length+'/40');input.addEventListener('input',()=>{comment=Array.from(input.value).slice(0,40).join('');input.value=comment;count.textContent=Array.from(comment).length+'/40';});optional.append(label,input,count);panel.append(optional);
 const submit=button(sending?'제출 확인 중...':'인사발령 제출하기',async()=>{if(sending)return;sending=true;render();try{const r=await UI.request(socket,'student_submit',{question:formQuestion,organism:selection,reason,comment});sending=false;accept(r.state);}catch(err){sending=false;render();showError(err);}},'button submit-button');submit.id='submit';submit.dataset.online='true';submit.disabled=!selection||!reason||sending||!socket.connected;panel.append(submit,el('p','submit-note','제출하면 선택을 바꿀 수 없어요.'));
 }
 stage.append(panel);app.append(stage);updateConnection();
}
renderJoin(saved?.roomCode||'');
