'use strict';
const express = require('express');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const { Server } = require('socket.io');
const { QUESTIONS } = require('./public/content');
const TOTAL = 27;
const token = () => crypto.randomBytes(32).toString('hex');

function createApp({ teacherPin = process.env.TEACHER_PIN, sessionTtlMs = 12 * 3600 * 1000 } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' ws: wss:; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
    next();
  });
  app.get('/health', (req, res) => res.json({ ok: true }));
  app.get('/student', (req, res) => res.sendFile(path.join(__dirname, 'public/student.html')));
  app.get('/teacher', (req, res) => res.sendFile(path.join(__dirname, 'public/teacher.html')));
  app.use(express.static(path.join(__dirname, 'public')));
  const server = http.createServer(app);
  const io = new Server(server, { maxHttpBufferSize: 8192, pingInterval: 10000, pingTimeout: 15000 });
  io.engine.on('headers', headers => { headers['X-Content-Type-Options'] = 'nosniff'; });
  const rooms = new Map(), sessions = new Map(), attempts = new Map();
  const fail = (message) => { throw new Error(message); };
  const reply = (socket, event, handler) => socket.on(event, (payload, ack) => {
    if (typeof ack !== 'function') return;
    try { ack({ ok: true, ...handler(payload || {}) }); }
    catch (err) { ack({ ok: false, message: err.message }); }
  });
  const validSession = (value) => {
    const s = sessions.get(value);
    if (!s || s.expires < Date.now()) fail('교사 인증이 만료되었습니다. PIN으로 다시 들어와 주세요.');
    return value;
  };
  const authTeacher = socket => {
    const owner = validSession(socket.data.auth);
    const room = rooms.get(socket.data.roomCode);
    if (socket.data.role !== 'teacher' || !room || room.teacherToken !== owner) fail('교사만 수업을 진행할 수 있습니다.');
    room.touchedAt = Date.now();
    return room;
  };
  const authStudent = socket => {
    const room = rooms.get(socket.data.roomCode);
    const p = room?.participants.get(socket.data.number);
    if (socket.data.role !== 'student' || !p || p.socketId !== socket.id || p.session !== socket.data.studentToken) fail('학생 연결을 다시 확인해 주세요.');
    room.touchedAt = Date.now();
    return [room, p];
  };
  function summary(room, index) {
    const responses = [...room.responses[index].values()];
    return {
      question: index + 1, state: room.questionStates[index], submitted: responses.length, missing: TOTAL - responses.length,
      organisms: QUESTIONS[index].organisms.map(o => ({ name: o.name, count: responses.filter(r => r.organism === o.name).length,
        reasons: QUESTIONS[index].reasons.map((label, reason) => ({ label, count: responses.filter(r => r.organism === o.name && r.reason === reason + 1).length })) })),
      // Response maps retain the order in which submissions were accepted, even within the same millisecond.
      comments: responses.filter(r => r.comment).map(r => ({ studentNumber:r.studentNumber, organism:r.organism, comment:r.comment })),
      missingNumbers: Array.from({length:TOTAL}, (_,i) => i+1).filter(n => !room.responses[index].has(n))
    };
  }
  function studentView(room, n) {
    const view = { roomCode:room.roomCode, total:TOTAL, question:room.currentQuestion + 1, questionState:room.questionStates[room.currentQuestion], lessonPhase:['LOBBY','STORY'].includes(room.presentationStage)?room.presentationStage:'ACTIVE', ended:room.ended,
      submitted:room.responses[room.currentQuestion].has(n), myResponse:room.responses[room.currentQuestion].get(n) || null };
    // Whitelist the public aggregate: reasons/comments/other students never reach students.
    if (view.questionState === 'CLOSED') {
      const s = summary(room, room.currentQuestion);
      view.results = { submitted:s.submitted, missing:s.missing, organisms:s.organisms.map(o => ({name:o.name, count:o.count})) };
    }
    return view;
  }
  const teacherView = room => ({roomCode:room.roomCode, total:TOTAL, question:room.currentQuestion+1, questionState:room.questionStates[room.currentQuestion], presentationStage:room.presentationStage, ended:room.ended,
    connected:[...room.participants.values()].filter(p => io.sockets.sockets.has(p.socketId)).length,
    connectedNumbers:[...room.participants.values()].filter(p=>io.sockets.sockets.has(p.socketId)).map(p=>p.number), results:QUESTIONS.map((q,i)=>summary(room,i))});
  function publish(room, students = true) {
    io.to('teacher:'+room.roomCode).emit('teacher_state', teacherView(room));
    if (students) for (const p of room.participants.values()) {
      const s = io.sockets.sockets.get(p.socketId);
      if (s && s.data.roomCode === room.roomCode && s.data.role === 'student') s.emit('student_state', studentView(room,p.number));
    }
  }
  function detach(socket) {
    const old = rooms.get(socket.data.roomCode);
    if (socket.data.role === 'teacher') socket.leave('teacher:'+socket.data.roomCode);
    else if (old) {
      const p=old.participants.get(socket.data.number);
      if (p?.socketId===socket.id) p.socketId=null;
      publish(old,false);
    }
    socket.data.role = null; socket.data.roomCode=null;
  }
  function newRoom(owner) {
    if (rooms.size >= 500) fail('수업방이 가득 찼습니다. 잠시 후 다시 시도해 주세요.');
    let code; do { code = String(crypto.randomInt(1000,10000)); } while (rooms.has(code));
    const room = {roomCode:code, teacherToken:owner, currentQuestion:0, questionStates:['PENDING','PENDING','PENDING'], presentationStage:'LOBBY', participants:new Map(), responses:[new Map(),new Map(),new Map()], ended:false, touchedAt:Date.now()};
    rooms.set(code,room); return room;
  }
  function attachTeacher(socket, room, auth) {
    detach(socket); Object.assign(socket.data, {role:'teacher',roomCode:room.roomCode,auth}); socket.join('teacher:'+room.roomCode);
  }
  io.on('connection', socket => {
    reply(socket,'teacher_login',({pin}) => {
      if (!teacherPin) fail('서버에 TEACHER_PIN이 설정되지 않았습니다. Render 환경 변수를 확인해 주세요.');
      const ip=socket.handshake.headers['x-forwarded-for']?.split(',')[0].trim() || socket.handshake.address;
      const now=Date.now(); let a=attempts.get(ip);
      if(!a || now-a.since>60000) {a={since:now,count:0}; attempts.set(ip,a);}
      if(++a.count>10) fail('잠시 후 다시 시도해 주세요. (1분에 10회까지)');
      const supplied=typeof pin==='string'?pin:'';
      const x=crypto.createHash('sha256').update(supplied).digest(), y=crypto.createHash('sha256').update(String(teacherPin)).digest();
      if(!crypto.timingSafeEqual(x,y)) fail('PIN이 맞지 않습니다.');
      const auth=token(); sessions.set(auth,{expires:now+sessionTtlMs}); socket.data.auth=auth;
      return {auth};
    });
    reply(socket,'teacher_resume',({auth,roomCode}) => {
      validSession(auth); socket.data.auth=auth;
      if(!roomCode) return {};
      const room=rooms.get(roomCode);
      if(!room) fail('수업방이 없습니다. 서버가 다시 시작되었을 수 있습니다. 새 수업을 만들어 주세요.');
      if(room.teacherToken!==auth) fail('이 수업방의 교사 인증이 필요합니다.');
      attachTeacher(socket,room,auth); return {state:teacherView(room)};
    });
    reply(socket,'create_room',() => {
      const owner=validSession(socket.data.auth); const room=newRoom(owner); attachTeacher(socket,room,owner); return {state:teacherView(room)};
    });
    reply(socket,'intro_next',({stage}) => {
      const room=authTeacher(socket);
      if(room.ended || room.presentationStage!==stage || !['LOBBY','STORY'].includes(stage)) fail('현재 입장 안내 단계를 확인해 주세요.');
      if(stage==='LOBBY') room.presentationStage='STORY';
      else {room.presentationStage='NOTICE';room.questionStates[0]='OPEN';}
      publish(room);return {state:teacherView(room)};
    });
    reply(socket,'student_join',({roomCode,studentNumber,studentToken}) => {
      const room=rooms.get(roomCode);
      if(!room) fail('참여 코드를 확인해 주세요. 수업방이 없거나 초기화되었습니다.');
      if(!Number.isInteger(studentNumber) || studentNumber<1 || studentNumber>TOTAL) fail('1~27번 중 내 번호를 골라 주세요.');
      let p=room.participants.get(studentNumber);
      const recovery=p && typeof studentToken==='string' && p.session===studentToken;
      if(p?.socketId && io.sockets.sockets.has(p.socketId) && p.socketId!==socket.id && !recovery) fail(studentNumber+'번은 이미 수업에 참여하고 있습니다. 번호를 다시 확인해 주세요.');
      if(p?.socketId===socket.id) return {studentToken:p.session,state:studentView(room,studentNumber)};
      // Same saved session may replace a stale connection after refresh. Old socket loses privileges.
      if(recovery && p.socketId) {
        const old=io.sockets.sockets.get(p.socketId);
        if(old) {detach(old); old.emit('session_replaced',{message:'같은 브라우저의 다른 창에서 연결되었습니다. 이 창은 닫아 주세요.'});}
      }
      detach(socket);
      if(!p) {p={number:studentNumber};room.participants.set(studentNumber,p);}
      p.session=recovery?p.session:token(); p.socketId=socket.id;
      Object.assign(socket.data,{role:'student',roomCode,number:studentNumber,studentToken:p.session});
      publish(room,false); return {studentToken:p.session,state:studentView(room,studentNumber)};
    });
    reply(socket,'student_submit',({question,organism,reason,comment=''}) => {
      const [room,p]=authStudent(socket), i=room.currentQuestion;
      if(room.ended || question!==i+1 || room.questionStates[i]!=='OPEN') fail('집계가 마감되었습니다. 친구들의 선택을 함께 살펴봅시다.');
      if(room.responses[i].has(p.number)) fail('이미 제출했습니다. 제출한 선택은 바꿀 수 없습니다.');
      if(!QUESTIONS[i].organisms.some(o=>o.name===organism) || !Number.isInteger(reason) || reason<1 || reason>QUESTIONS[i].reasons.length) fail('생물과 이유를 각각 하나씩 골라 주세요.');
      if(typeof comment!=='string' || Array.from(comment).length>40) fail('내 생각은 40자까지 쓸 수 있어요.');
      const response={studentNumber:p.number,question,organism,reason,comment:comment.trim(),submitted:true,submittedAt:new Date().toISOString()};
      room.responses[i].set(p.number,response); publish(room,false);
      const state=studentView(room,p.number); socket.emit('student_state',state); return {state};
    });
    const checkQuestion=(room,question)=>{if(question!==room.currentQuestion+1) fail('수업 단계가 바뀌었습니다. 현재 화면을 확인해 주세요.');};
    reply(socket,'close_poll',({question})=>{
      const room=authTeacher(socket); checkQuestion(room,question);
      if(room.ended || room.questionStates[room.currentQuestion]!=='OPEN') fail('이미 마감된 요청입니다.');
      room.questionStates[room.currentQuestion]='CLOSED'; room.presentationStage='CHOICES'; publish(room); return {state:teacherView(room)};
    });
    reply(socket,'presentation_set',({question,stage})=>{
      const room=authTeacher(socket); checkQuestion(room,question);
      if(room.ended || room.questionStates[room.currentQuestion]!=='CLOSED') fail('집계를 마감한 뒤 결과를 공개해 주세요.');
      if(!['CHOICES','REASONS','COMMENTS'].includes(stage)) fail('공개 화면을 다시 확인해 주세요.');
      room.presentationStage=stage; publish(room,false); return {state:teacherView(room)};
    });
    reply(socket,'next_question',({question})=>{
      const room=authTeacher(socket); checkQuestion(room,question);
      if(room.ended || room.questionStates[room.currentQuestion]!=='CLOSED' || room.currentQuestion>=2) fail('결과를 확인한 뒤 다음 요청으로 이동해 주세요.');
      if(!['REASONS','COMMENTS'].includes(room.presentationStage)) fail('선택 이유와 의견을 함께 확인한 뒤 다음 요청으로 이동해 주세요.');
      room.currentQuestion++; room.questionStates[room.currentQuestion]='OPEN'; room.presentationStage='NOTICE'; publish(room); return {state:teacherView(room)};
    });
    reply(socket,'class_end',()=>{
      const room=authTeacher(socket);
      if(room.ended) fail('이미 종료된 수업입니다.');
      // Early ending closes all currently open responses, preserves previous outcomes.
      if(room.questionStates[room.currentQuestion]==='OPEN') room.questionStates[room.currentQuestion]='CLOSED';
      room.ended=true; publish(room); return {state:teacherView(room)};
    });
    reply(socket,'reset_room',()=>{
      const room=authTeacher(socket), owner=room.teacherToken;
      const replacement=newRoom(owner); // Allocate before deletion so failure cannot lose the existing class.
      for(const s of io.sockets.sockets.values()) if(s.data.roomCode===room.roomCode) {
        s.emit('room_removed',{message:'선생님이 새 수업을 시작했습니다. 새 참여 코드로 들어와 주세요.'}); detach(s);
      }
      rooms.delete(room.roomCode); attachTeacher(socket,replacement,owner); return {state:teacherView(replacement)};
    });
    socket.on('disconnect',()=>detach(socket));
  });
  const cleanup=setInterval(()=>{
    const now=Date.now();
    for(const [key,s] of sessions) if(s.expires<now) sessions.delete(key);
    for(const [key,a] of attempts) if(now-a.since>60000) attempts.delete(key);
    for(const [code,r] of rooms) if(now-r.touchedAt>24*3600000 && ![...io.sockets.sockets.values()].some(s=>s.data.roomCode===code)) rooms.delete(code);
  },60000); cleanup.unref();
  server.on('close',()=>clearInterval(cleanup));
  return {app,server,io};
}
if(require.main===module) {
  const {server}=createApp();
  server.listen(process.env.PORT || 3000,'0.0.0.0',()=>console.log('해빛이 수업 서버가 준비되었습니다.'));
}
module.exports={createApp};
