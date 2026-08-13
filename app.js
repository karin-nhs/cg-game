
const {supabaseUrl,supabaseKey}=window.CG_CONFIG;
const sb=supabase.createClient(supabaseUrl,supabaseKey);
const app=document.getElementById("app");

const ZONES=[
["Clinical Effectiveness","#65449a"],["Information Management","#d72b7b"],["Governance & Leadership","#5b636c"],["Education & Training","#25aaa7"],
["Patient Safety","#34327e"],["Patient-Centred Care","#f58218"],["Risk Management","#63ae3d"],["Performance & Monitoring","#299bd2"]
];
const QUESTIONS=[
["A patient receives the wrong medication dosage.",4,"Patient Safety","A medication dosage error directly creates a risk of patient harm."],
["The practice compares diabetes care against NICE guidance.",0,"Clinical Effectiveness","Comparing care with evidence-based guidance is part of ensuring clinically effective care."],
["Patients complete a satisfaction survey.",5,"Patient-Centred Care","Patient feedback helps services understand and improve people's experience of care."],
["The practice identifies a risk of vaccine fridge failure and develops a contingency plan.",6,"Risk Management","Identifying a foreseeable risk and planning how to manage it is risk management."],
["Staff complete safeguarding training.",3,"Education & Training","Training supports staff competence and safe, effective practice."],
["A clinical audit reveals only 70% of asthma patients have had their annual review.",7,"Performance & Monitoring","Audit data measures current performance and identifies where improvement is needed."],
["A staff member accidentally emails patient information to the wrong person.",1,"Information Management","A disclosure of patient information to the wrong recipient is an information-management issue."],
["A GP partner ensures all clinicians have current professional registration.",2,"Governance & Leadership","Leadership oversight includes ensuring appropriate professional and organisational governance."]
];

let mode=null, room=null, channel=null, myId=crypto.randomUUID(), myName="", phase="waiting", qIndex=0;
let answers={}, participants={}, timer=60, timerHandle=null, heartbeatHandle=null, connectionStatus="Connecting…", connectionDetail="";

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function initials(n){return n?n.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase():"?"}
function roomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";return Array.from({length:5},()=>chars[Math.floor(Math.random()*chars.length)]).join("")}

function home(){app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance</div><div class="card home">
<div class="small">LIVE LEARNING ACTIVITY</div><h1>Clinical Governance Game Room</h1>
<p class="sub">Move around the Clinical Governance wheel, compare where the room stands, and discuss the reasoning together.</p>
<div class="choices"><button class="bigbtn" onclick="hostSetup()">I'm facilitating</button><button class="bigbtn" onclick="joinSetup()">I'm participating</button></div></div></div></div>`}
window.hostSetup=()=>app.innerHTML=`<div class="shell"><div class="card home"><h1>Create a game room</h1><p class="sub">You'll control the questions, timer, locking and answer reveal.</p><button class="primary" onclick="createRoom()">Create room</button> <button class="secondary" onclick="home()">Back</button></div></div>`;
window.joinSetup=()=>app.innerHTML=`<div class="shell"><div class="card home"><h1>Join a game room</h1><div class="form"><input id="rc" maxlength="5" placeholder="Room code" style="text-transform:uppercase"><input id="nm" maxlength="40" placeholder="Display name (optional)"><div class="small">Use your first name, initials or a nickname. It is only used during the live session.</div><button class="primary" onclick="joinRoom()">Join room</button></div><button class="secondary" onclick="home()">Back</button></div></div>`;

function upsertParticipant(p){
 if(!p||p.role!=="participant"||!p.id)return;
 participants[p.id]={name:p.name||"Participant",role:"participant",lastSeen:Date.now()};
 renderSide();
}
function pruneParticipants(){
 const now=Date.now();let changed=false;
 Object.keys(participants).forEach(id=>{if(now-(participants[id].lastSeen||0)>16000){delete participants[id];delete answers[id];changed=true}});
 if(changed){renderSide();renderTokens()}
}
async function makeChannel(){
 const topic="cg-room-"+room.toLowerCase();
 channel=sb.channel(topic,{config:{presence:{key:myId},broadcast:{self:true}}});

 channel
 .on("presence",{event:"sync"},()=>{
   const st=channel.presenceState();
   Object.values(st).flat().forEach(p=>{ if(p?.role==="participant") upsertParticipant(p); });
   renderSide();
 })
 .on("broadcast",{event:"hello"},({payload})=>{
   if(mode==="host"){upsertParticipant(payload);broadcastState();}
 })
 .on("broadcast",{event:"heartbeat"},({payload})=>{
   if(mode==="host")upsertParticipant(payload);
 })
 .on("broadcast",{event:"state"},({payload})=>{
   if(mode==="participant")applyState(payload);
 })
 .on("broadcast",{event:"position"},({payload})=>{
   if(mode==="host"){
     upsertParticipant({id:payload.id,name:payload.name,role:"participant"});
     if(payload.zone===null) delete answers[payload.id];
     else answers[payload.id]={zone:payload.zone,name:payload.name};
     renderTokens();renderSide();
   }
 })
 .on("broadcast",{event:"state_request"},()=>{if(mode==="host")broadcastState()})
 .subscribe(async(status,err)=>{
   connectionStatus=status;
   connectionDetail=err ? (err.message || String(err)) : "";
   console.log("Realtime subscription:", {status, err, room, topic});
   if(status==="SUBSCRIBED"){
     connectionStatus="Connected";
     connectionDetail="";
     const trackResult = await channel.track({id:myId,name:myName||"Participant",role:mode,online_at:new Date().toISOString()});
     console.log("Presence track:", trackResult);
     if(mode==="participant"){
       sendHello();
       clearInterval(heartbeatHandle);
       heartbeatHandle=setInterval(sendHello,5000);
       channel.send({type:"broadcast",event:"state_request",payload:{id:myId}});
     } else {
       clearInterval(heartbeatHandle);
       heartbeatHandle=setInterval(pruneParticipants,5000);
     }
   } else if(status==="CHANNEL_ERROR"||status==="TIMED_OUT"||status==="CLOSED"){
     connectionStatus="Connection problem";
   }
   if(mode==="host")renderHost(); else if(mode==="participant")renderParticipant();
 });
}
function sendHello(){
 if(!channel)return;
 channel.send({type:"broadcast",event:"hello",payload:{id:myId,name:myName,role:"participant"}});
 channel.send({type:"broadcast",event:"heartbeat",payload:{id:myId,name:myName,role:"participant"}});
}

window.createRoom=async()=>{mode="host";room=roomCode();myName="Facilitator";renderHost();await makeChannel()}
window.joinRoom=async()=>{
 room=document.getElementById("rc").value.trim().toUpperCase();
 if(room.length!==5)return alert("Enter the 5-character room code.");
 myName=document.getElementById("nm").value.trim()||("Guest "+myId.slice(0,4));
 mode="participant";renderParticipant();await makeChannel();
}

function wheelHTML(isParticipant=false){
 let labs="",divs="";
 for(let i=0;i<8;i++){
   const angle=(i*45+22.5-90)*Math.PI/180,r=38.5,x=50+r*Math.cos(angle),y=50+r*Math.sin(angle);
   labs+=`<div class="label" style="left:${x}%;top:${y}%">${ZONES[i][0]}</div>`;
   divs+=`<div class="divider" style="transform:rotate(${i*45}deg)"></div>`;
 }
 let halo="";
 if(phase==="revealed"){
   const z=QUESTIONS[qIndex][1],a=z*45,b=(z+1)*45;
   halo=`<div class="correctHalo"><div class="arc" style="--a:${a}deg;--b:${b}deg"></div></div>`;
 }
 return `<div class="wheelwrap ${isParticipant?"participant":""}" id="wheelwrap">
 <div class="wheeldisc ${phase==="waiting"?"grey":""}"></div>${halo}${divs}<div class="labels">${labs}</div>
 <div class="ringcut"></div><div class="centertext">${phase==="waiting"?"Waiting for<br>next question":"CLINICAL<br>GOVERNANCE"}</div><div id="tokens"></div></div>`;
}
function connectionLine(){return `<div class="connection">${esc(connectionStatus)}</div>${connectionDetail?`<div class="debug">${esc(connectionDetail)}</div>`:""}`}

function renderHost(){
 if(mode!=="host")return;
 app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance Game Room</div>
 <div class="game"><section class="card main"><div class="question"><div class="small">SCENARIO ${qIndex+1} OF ${QUESTIONS.length}</div><h2>${phase==="waiting"?"Ready for the next scenario":esc(QUESTIONS[qIndex][0])}</h2></div>
 <div class="statusbar"><span class="timer" id="timer">${phase==="answering"?timer+"s":phase==="locked"?"Answers locked":phase==="revealed"?"Answer revealed":"Waiting"}</span></div>${connectionLine()}
 ${wheelHTML()}<div id="explanation"></div><div class="controls" id="controls"></div></section>
 <aside class="card side"><div class="small">ROOM CODE</div><div class="roomcode">${room||"-----"}</div><p class="small">Participants enter this code to join.</p><hr>
 <div class="count" id="positioned">0 / 0</div><div class="small">POSITIONED</div><h3>Connected</h3><ul class="people" id="people"></ul></aside></div></div></div>`;
 renderTokens();renderSide();renderControls();renderExplanation();
}
function renderParticipant(){
 if(mode!=="participant")return;
 app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance Game Room</div><div class="card main">
 <div class="question"><div class="small">ROOM ${room}</div><h2>${phase==="waiting"?"Waiting for the facilitator…":esc(QUESTIONS[qIndex][0])}</h2></div>
 <div class="statusbar"><span class="timer" id="timer">${phase==="answering"?timer+"s":phase==="locked"?"Answers locked":phase==="revealed"?"Answer revealed":"Waiting"}</span></div>${connectionLine()}
 ${wheelHTML(true)}<div id="explanation"></div><p class="small" style="text-align:center">${phase==="answering"?"Drag your token from the centre onto the segment you think fits best. You can change your mind until answers are locked.":""}</p></div></div></div>`;
 renderTokens();renderExplanation();if(phase==="answering")enableDrag();
}
function renderSide(){
 if(mode!=="host"||!document.getElementById("people"))return;
 const ps=Object.entries(participants);
 document.getElementById("people").innerHTML=ps.length?ps.map(([id,p])=>`<li>${esc(p.name)}</li>`).join(""):"<li class='small'>Waiting for participants…</li>";
 document.getElementById("positioned").textContent=`${Object.keys(answers).length} / ${ps.length}`;
}
function posFor(zone,idx=0,total=1){
 const angle=(zone*45+22.5-90)*Math.PI/180;
 const spread=(idx-(total-1)/2)*4*Math.PI/180,rr=30;
 return [50+rr*Math.cos(angle+spread),50+rr*Math.sin(angle+spread)];
}
function renderTokens(){
 const box=document.getElementById("tokens");if(!box)return;box.innerHTML="";
 if(mode==="participant"){
   const z=answers[myId]?.zone,p=z==null?[50,50]:posFor(z);
   box.innerHTML=`<div class="token" id="mytoken" style="left:${p[0]}%;top:${p[1]}%" title="${esc(myName)}">${phase==="locked"||phase==="revealed"?initials(myName):"ME"}</div>`;
 } else {
   const grouped={};Object.entries(answers).forEach(([id,a])=>(grouped[a.zone]??=[]).push([id,a]));
   Object.entries(grouped).forEach(([z,list])=>list.forEach(([id,a],i)=>{
     const p=posFor(+z,i,list.length),t=document.createElement("div");
     t.className="token "+(phase==="answering"?"anonymous":"");t.style.left=p[0]+"%";t.style.top=p[1]+"%";
     t.textContent=phase==="answering"?"":initials(a.name);if(phase!=="answering")t.title=a.name;box.appendChild(t);
   }));
 }
}
function enableDrag(){
 const token=document.getElementById("mytoken"),wrap=document.getElementById("wheelwrap");if(!token||!wrap)return;
 let active=false;
 const coords=e=>{const r=wrap.getBoundingClientRect(),pt=e.touches?e.touches[0]:e;return [(pt.clientX-r.left)/r.width*100,(pt.clientY-r.top)/r.height*100]};
 const move=e=>{if(!active)return;e.preventDefault();const [x,y]=coords(e);token.style.left=x+"%";token.style.top=y+"%"};
 const end=e=>{
   if(!active)return;active=false;document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);
   const x=parseFloat(token.style.left),y=parseFloat(token.style.top),dx=x-50,dy=y-50,dist=Math.hypot(dx,dy);
   if(dist<18||dist>49){
     token.style.left="50%";token.style.top="50%";delete answers[myId];
     channel.send({type:"broadcast",event:"position",payload:{id:myId,name:myName,zone:null}});return;
   }
   const deg=(Math.atan2(dy,dx)*180/Math.PI+90+360)%360,zone=Math.floor(deg/45)%8;
   answers[myId]={zone,name:myName};const p=posFor(zone);token.style.left=p[0]+"%";token.style.top=p[1]+"%";
   channel.send({type:"broadcast",event:"position",payload:{id:myId,name:myName,zone}});
 };
 token.onpointerdown=e=>{if(phase!=="answering")return;active=true;document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)};
}
function broadcastState(){if(channel)channel.send({type:"broadcast",event:"state",payload:{phase,qIndex,timer}})}
function applyState(s){
 const oldPhase=phase;phase=s.phase;qIndex=s.qIndex;timer=s.timer;
 if(phase==="waiting"&&oldPhase!=="waiting")answers={};
 renderParticipant();
}
window.launchQ=()=>{
 phase="answering";answers={};timer=60;broadcastState();renderHost();clearInterval(timerHandle);
 timerHandle=setInterval(()=>{timer--;const el=document.getElementById("timer");if(el)el.textContent=timer+"s";if(timer%5===0)broadcastState();if(timer<=0)lockAnswers()},1000)
}
window.lockAnswers=()=>{if(phase!=="answering")return;phase="locked";clearInterval(timerHandle);broadcastState();renderHost()}
window.reveal=()=>{phase="revealed";broadcastState();renderHost()}
window.nextQ=()=>{qIndex=(qIndex+1)%QUESTIONS.length;phase="waiting";answers={};timer=60;broadcastState();renderHost()}
function renderControls(){
 const c=document.getElementById("controls");if(!c||mode!=="host")return;
 if(phase==="waiting")c.innerHTML=`<button class="primary" onclick="launchQ()">Launch question</button>`;
 else if(phase==="answering")c.innerHTML=`<button class="primary" onclick="lockAnswers()">Lock answers</button>`;
 else if(phase==="locked")c.innerHTML=`<button class="primary" onclick="reveal()">Reveal answer</button>`;
 else c.innerHTML=`<button class="primary" onclick="nextQ()">Next question</button>`;
}
function renderExplanation(){
 const e=document.getElementById("explanation");if(!e)return;
 e.innerHTML=phase==="revealed"?`<div class="explain"><strong>${QUESTIONS[qIndex][2]}</strong><br>${QUESTIONS[qIndex][3]}</div>`:"";
}
home();
