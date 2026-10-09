/* Shared by the real classroom and the local design preview. */
'use strict';
window.Dispatch = (() => {
  const e=(tag,cls,text)=>UI.el(tag,cls,text);
  const img=(src,cls,alt='')=>{const node=e('img',cls);node.src=src;node.alt=alt;return node;};
  const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function header(label,title,subtitle){const box=e('header','scene-heading');if(label)box.append(e('p','scene-kicker',label));box.append(e('h1','scene-title',title));if(subtitle)box.append(e('p','scene-subtitle',subtitle));return box;}
  function mount(root,{state,stage=state.presentationStage,index=state.question-1,selected,commentPage=0,onCommentPage=()=>{},onSelect=()=>{},onReplay=()=>{}}){
    const q=Content.QUESTIONS[index],summary=state.results[index];
    const scene=e('section','dispatch-scene scene-'+stage.toLowerCase());scene.dataset.stage=stage;
    root.replaceChildren(scene);const timers=[];let stopped=false,finishTyping=()=>{};
    const later=(fn,ms)=>{const id=setTimeout(()=>{if(!stopped)fn();},ms);timers.push(id);};
    if(stage==='LOBBY'){
      scene.append(header('','해빛 생태계 주식회사','탐구원 여러분, 회사로 입장해 주세요.'));
      const reception=e('div','reception-layout'),ticket=e('article','entry-ticket');ticket.append(e('p','entry-label','오늘의 입장 코드'),e('strong','entry-code',state.roomCode),e('p','entry-how','학생 화면에서 코드를 입력하고\n자기 번호를 눌러 주세요.'));
      const actor=e('aside','reception-actor');actor.append(img('/assets/haebit-02.png','dispatch-haebit','회사 입장을 안내하는 해빛이'),e('p','','우리 반 탐구원들,\n모두 들어왔나요?'));reception.append(ticket,actor);scene.append(reception);
      const attendance=e('section','entry-attendance');attendance.setAttribute('aria-label','학생 입장 현황');const total=e('p','entry-total');total.append(e('strong','',String(state.connected)),e('span','',' / 27명 입장'));attendance.append(total);
      const grid=e('div','entry-number-grid');for(let n=1;n<=27;n++){const active=state.connectedNumbers?.includes(n);const item=e('span','entry-number'+(active?' is-entered':''),String(n));item.setAttribute('aria-label',n+'번 '+(active?'입장 완료':'입장 대기'));grid.append(item);}attendance.append(grid,e('p','entry-legend','초록색 번호는 입장 완료 · 옅은 번호는 입장 대기'));scene.append(attendance);
    }else if(stage==='STORY'){
      const layout=e('div','story-layout'),story=e('article','story-copy');story.append(e('span','story-alert','긴급 알림!'),e('h1','story-title','첫날부터 사건 발생!'));
      const lines=['큰일이야!\n직원들의 이름표와 부서표가 모두 뒤섞였어.','누가 어떤 일을 맡아야 하는지 알 수가 없어!','우리 반이 해빛이가 되어,\n상황에 알맞은 직원을 새롭게 인사발령해 볼까?'];
      const rows=lines.map((line,i)=>{const p=e('p','story-line'+(i===2?' story-invitation':''));p.setAttribute('aria-label',line);const visual=e('span','typed-text');visual.setAttribute('aria-hidden','true');p.append(visual);story.append(p);return {p,visual,line};});
      const tags=e('div','mixed-name-tags');tags.setAttribute('aria-hidden','true');tags.append(e('span','name-tag','이름표  ?'),e('span','name-tag','부서표  ?'));story.append(tags);
      const actor=e('aside','story-actor');actor.append(e('p','story-bubble','이름표가 뒤섞였어!\n누가 어떤 일을 맡을지\n함께 정해 줄래?'),img('/assets/haebit-02.png','dispatch-haebit','도움을 부탁하는 해빛이'));layout.append(story,actor);scene.append(layout);
      let rowIndex=0,charIndex=0;finishTyping=()=>{stopped=true;timers.forEach(clearTimeout);rows.forEach(({p,visual,line})=>{visual.textContent=line;p.classList.remove('is-typing');});};
      function tickStory(){const row=rows[rowIndex];if(!row)return;row.p.classList.add('is-typing');const chars=Array.from(row.line);row.visual.textContent=chars.slice(0,++charIndex).join('');if(charIndex>=chars.length){row.p.classList.remove('is-typing');rowIndex++;charIndex=0;later(tickStory,450);}else later(tickStory,32);}
      const controls=e('div','typing-controls');controls.append(UI.button('설명 바로 보기',()=>finishTyping(),'quiet-button'),UI.button('이야기 다시 듣기',()=>onReplay(),'quiet-button'));scene.append(controls);if(reduced())finishTyping();else later(tickStory,450);
    }else if(stage==='NOTICE'){
      const layout=e('div','letter-layout');const letter=e('article','dispatch-letter');
      const meta=e('div','letter-meta');meta.append(e('span','','해빛 생태계 주식회사 인사과'),e('span','','발령 요청 제 '+String(index+1).padStart(2,'0')+' 호'));letter.append(meta);
      const letterhead=e('div','letter-heading');letterhead.append(e('h1','','인사발령 통지서'));letter.append(letterhead);
      const recipient=e('div','letter-recipient');recipient.append(e('span','recipient-label','수신'),e('strong','','해빛초 4학년 3반 탐구원'));letter.append(recipient);
      const text=e('div','letter-content');text.setAttribute('aria-label',q.lines.join(' '));text.setAttribute('aria-live','off');
      const paragraphs=q.lines.map(line=>{const p=e('p','typed-line');p.dataset.fullText=line;const visual=e('span','typed-text');visual.setAttribute('aria-hidden','true');p.append(visual);text.append(p);return {p,visual,line};});letter.append(text);
      const signature=e('div','letter-signature');signature.append(e('span','','생태계의 상황을 살펴보고, 알맞은 직원을 보내 주세요.'),e('strong','','생태계 인사 담당 · 해빛이'));
      const seal=e('div','letter-seal');seal.append(e('span','','생태계'),e('strong','','인사과'),e('span','','발령 요청'));signature.append(seal);letter.append(signature);
      const actor=e('aside','dispatch-actor');actor.append(e('div','actor-caption','우리 반 탐구원들,\n이 임무를 부탁해!'),img('/assets/haebit-02.png','dispatch-haebit','새 인사 요청을 안내하는 해빛이'));layout.append(letter,actor);scene.append(layout);
      const animationControls=e('div','typing-controls');
      animationControls.append(UI.button('문장 바로 보기',()=>finishTyping(),'quiet-button'),UI.button('통지서 다시 읽기',()=>onReplay(),'quiet-button'));scene.append(animationControls);
      let lineIndex=0,charIndex=0;
      finishTyping=()=>{stopped=true;timers.forEach(clearTimeout);paragraphs.forEach(({p,visual,line})=>{visual.textContent=line;p.classList.remove('is-typing');});scene.classList.add('typing-complete');};
      function tick(){
        const row=paragraphs[lineIndex];if(!row){scene.classList.add('typing-complete');return;}
        row.p.classList.add('is-typing');const chars=Array.from(row.line);row.visual.textContent=chars.slice(0,++charIndex).join('');
        if(charIndex>=chars.length){row.p.classList.remove('is-typing');lineIndex++;charIndex=0;later(tick,340);}else later(tick,38);
      }
      if(reduced())finishTyping();else later(tick,720);
    }else if(stage==='CHOICES'){
      scene.append(header('인사 요청 '+String(index+1).padStart(2,'0')+' · 집계 완료','우리 반은 누구를 골랐을까요?'));
      const body=e('div','choice-stage-body'),chart=e('div','dispatch-chart');chart.setAttribute('role','img');chart.setAttribute('aria-label',summary.organisms.map(o=>o.name+' '+o.count+'명').join(', '));
      const grid=e('div','chart-guides');[27,18,9,0].forEach(n=>{const line=e('div','chart-guide');line.append(e('span','',String(n)));grid.append(line);});chart.append(grid);
      const columns=e('div','chart-columns');summary.organisms.forEach((o,i)=>{
        const col=e('div','chart-column');const shaft=e('div','chart-shaft'),fill=e('div','chart-pillar');fill.style.height=o.count/27*100+'%';fill.style.animationDelay=i*100+'ms';
        const count=e('strong','chart-value',String(o.count));count.append(e('span','','명'));fill.append(count);shaft.append(fill);col.append(shaft);
        const organism=q.organisms.find(x=>x.name===o.name);const name=e('div','chart-organism');name.append(img('/assets/'+organism.asset+'.svg','chart-organism-image'),e('strong','',o.name));col.append(name);columns.append(col);
      });chart.append(columns,e('span','chart-unit','명'));body.append(chart);scene.append(body);
      scene.append(e('p','dispatch-participation','참여 '+summary.submitted+'명 · 미제출 '+summary.missing+'명'));
    }else if(stage==='REASONS'){
      let current=summary.organisms.find(o=>o.name===selected)||summary.organisms.reduce((a,b)=>b.count>a.count?b:a);
      scene.append(header('인사 요청 '+String(index+1).padStart(2,'0')+' · 생각 펼치기','같은 선택, 같은 이유일까요?'));
      const tabs=e('div','reason-organism-tabs');tabs.setAttribute('aria-label','이유를 살펴볼 생물');summary.organisms.forEach(o=>{const b=UI.button(o.name+' · '+o.count+'명',()=>onSelect(o.name),'reason-organism-tab'+(current.name===o.name?' is-selected':''));b.setAttribute('aria-pressed',String(current.name===o.name));tabs.append(b);});scene.append(tabs);
      const subtitle=e('p','reason-context',current.name+'를 선택한 친구들의 생각');scene.append(subtitle);
      const cards=e('div','dispatch-reason-cards');current.reasons.forEach((r,i)=>{
        const card=e('article','dispatch-reason-card');card.style.animationDelay=i*140+'ms';
        const number=e('span','reason-card-index',String(i+1).padStart(2,'0')),phrase=e('p','reason-card-text',r.label),count=e('div','reason-card-count');count.append(e('strong','',String(r.count)),e('span','','명'));card.append(number,phrase,count);cards.append(card);
      });scene.append(cards,e('p','reason-discussion','“이렇게 생각한 까닭을 이야기해 줄 친구가 있나요?”'));
    }else if(stage==='COMMENTS'){
      const comments=summary.comments||[],pageCount=Math.max(1,Math.ceil(comments.length/6)),page=Math.max(0,Math.min(commentPage,pageCount-1));
      scene.append(header('인사 요청 '+String(index+1).padStart(2,'0')+' · 한마디 나누기','친구들이 직접 쓴 의견'));
      if(comments.length){
        const grid=e('div','dispatch-comment-grid');grid.setAttribute('aria-label','친구들의 의견');grid.setAttribute('aria-live','polite');
        comments.slice(page*6,page*6+6).forEach(c=>{
          const card=e('article','dispatch-comment-card'),meta=e('div','comment-card-meta');
          meta.append(e('strong','comment-student',c.studentNumber+'번'),e('span','comment-organism',c.organism+' 선택'));
          card.append(meta,e('p','comment-card-text',c.comment));grid.append(card);
        });scene.append(grid);
        const pager=e('nav','comment-pager');pager.setAttribute('aria-label','의견 페이지');
        const previous=UI.button('← 이전 의견',()=>onCommentPage(page-1),'dispatch-secondary'),next=UI.button('다음 의견 →',()=>onCommentPage(page+1),'dispatch-secondary');
        previous.disabled=page===0;next.disabled=page===pageCount-1;
        const count=e('p','comment-page-count');count.append(e('strong','',String(page+1)+' / '+pageCount),e('span','','제출 순서 · '+comments.length+'개 의견'));
        pager.append(previous,count,next);scene.append(pager);
      }else{
        const empty=e('div','comment-empty');empty.append(e('h2','','이번 요청에는 직접 쓴 의견이 없어요.'),e('p','','선택한 이유를 말로 함께 나눠 볼까요?'));scene.append(empty);
      }
    }
    return {finishTyping,dispose(){stopped=true;timers.forEach(clearTimeout);}};
  }
  function completion({question,organism,final=false,compact=false,minimal=false}={}){
    const sheet=e('section','completion-sheet'+(compact?' is-compact':''));
    const meta=e('div','completion-meta');meta.append(e('span','','해빛 생태계 주식회사 인사과'),e('span','',final?'활동 1 · 탐구 기록':('인사 요청 '+String(question).padStart(2,'0')+' · 접수 확인')));sheet.append(meta);
    sheet.append(e('p','completion-kicker',final?'우리의 생각이 모였습니다':'나의 생각이 도착했습니다'));
    const zone=e('div','completion-impact');const seal=e('div','completion-seal');seal.setAttribute('aria-hidden','true');seal.append(e('span','seal-office','해빛 생태계 주식회사'),e('strong','seal-title','인사발령'),e('strong','seal-done','완료'),e('span','seal-foot',final?'탐구 기록 접수':'의견 접수 완료'));zone.append(seal);sheet.append(zone);
    const heading=e('h1','completion-title','인사발령 완료!');sheet.append(heading);if(!minimal)sheet.append(e('p','completion-copy',final?'우리의 선택이 다음 탐구로 이어집니다.':'네 생각을 안전하게 접수했어.'));
    if(organism){const pick=e('div','completion-pick');pick.append(e('span','','내가 보낸 직원'),e('strong','',organism));sheet.append(pick);}
    if(!compact)sheet.append(e('p','completion-next',minimal?'고개를 들고 칠판을 봐 주세요.':final?'이제 생물들이 실제로 어떻게 살아가는지\n더 자세히 살펴봅시다!':'선생님이 집계를 마감하면\n친구들의 선택을 함께 볼 수 있어요.'));
    return sheet;
  }
  function updateLobby(root,state){
    const total=root.querySelector('.entry-total strong');if(total)total.textContent=state.connected;
    root.querySelectorAll('.entry-number').forEach((item,i)=>{const active=state.connectedNumbers?.includes(i+1);item.classList.toggle('is-entered',Boolean(active));item.setAttribute('aria-label',(i+1)+'번 '+(active?'입장 완료':'입장 대기'));});
  }
  function fit(app,{preview=false}={}){
    const width=app.getBoundingClientRect().width;
    const scale=width<950?1:Math.max(.6,Math.min(2.8,width/1280,(preview?app.getBoundingClientRect().height:window.innerHeight-56)/664));
    app.style.setProperty('--board-scale',String(scale));
  }
  return {mount,completion,updateLobby,fit};
})();
