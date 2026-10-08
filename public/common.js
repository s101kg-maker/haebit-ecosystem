'use strict';
window.UI = {
 el(tag, className, text) { const e=document.createElement(tag); if(className)e.className=className; if(text!==undefined)e.textContent=text; return e; },
 save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}},
 read(key){try{return JSON.parse(localStorage.getItem(key));}catch{return null;}},
 remove(key){try{localStorage.removeItem(key);}catch{}},
 request(socket,event,payload={}) {return new Promise((resolve,reject)=>{if(!socket.connected)return reject(new Error('연결을 다시 확인하고 잠시 후 눌러 주세요.'));socket.timeout(8000).emit(event,payload,(err,r)=>{if(err)return reject(new Error('응답 확인이 늦어지고 있어요. 연결되면 화면이 자동으로 복구됩니다.')); if(!r?.ok)return reject(new Error(r?.message||'잠시 후 다시 시도해 주세요.'));resolve(r);});});},
 button(text,handler,className='button'){const b=this.el('button',className,text);b.type='button';b.addEventListener('click',handler);return b;},
 mascot(pose,words){const wrap=this.el('aside','mascot');const bubble=this.el('div','speech',words);const img=this.el('img','haebit');img.src='/assets/haebit-'+String(pose).padStart(2,'0')+'.png';img.alt='해빛이';wrap.append(bubble,img);return wrap;},
 bars(results,handler,selected){const box=this.el('div','bars');results.organisms.forEach(o=>{const row=this.el(handler?'button':'div','bar-row'+(o.name===selected?' active':''));if(handler){row.type='button';row.addEventListener('click',()=>handler(o.name));}const name=this.el('span','bar-name',o.name),track=this.el('span','bar-track'),fill=this.el('span','bar-fill');fill.style.width=(o.count/27*100)+'%';track.append(fill);row.append(name,track,this.el('strong','bar-count',o.count+'명'));box.append(row);});return box;},
 async confirm(title,message,confirmText='확인'){return new Promise(resolve=>{const dialog=this.el('dialog','confirm-dialog');const heading=this.el('h2','',title),desc=this.el('p','',message),actions=this.el('div','dialog-actions');const finish=v=>{dialog.close();dialog.remove();resolve(v);};actions.append(this.button('취소',()=>finish(false),'button secondary'),this.button(confirmText,()=>finish(true),'button'));dialog.append(heading,desc,actions);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false);});document.body.append(dialog);dialog.showModal();actions.firstChild.focus();});}
};
