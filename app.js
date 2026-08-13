
const {supabaseUrl,supabaseKey}=window.CG_CONFIG;
const sb=supabase.createClient(supabaseUrl,supabaseKey);
const app=document.getElementById("app");
const ZONES=[
["Performance & Monitoring","#279bd3"],["Clinical Effectiveness","#65449a"],["Information Management","#d72b7b"],
["Governance & Leadership","#59616a"],["Education & Training","#21aaa8"],["Patient Safety","#34327e"],
["Patient-Centred Care","#f58218"],["Risk Management","#65ae3f"]];
const QUESTIONS=[
["A patient receives the wrong medication dosage.",5,"Patient Safety","A medication dosage error directly creates a risk of patient harm."],
["The practice compares diabetes care against NICE guidance.",1,"Clinical Effectiveness","Comparing care with evidence-based guidance is part of ensuring clinically effective care."],
["Patients complete a satisfaction survey.",6,"Patient-Centred Care","Patient feedback helps services understand and improve people's experience of care."],
["The practice identifies a risk of vaccine fridge failure and develops a contingency plan.",7,"Risk Management","Identifying a foreseeable risk and planning how to manage it is risk management."],
["Staff complete safeguarding training.",4,"Education & Training","Training supports staff competence and safe, effective practice."],
["A clinical audit reveals only 70% of asthma patients have had their annual review.",0,"Performance & Monitoring","Audit data measures current performance and identifies where improvement is needed."],
["A staff member accidentally emails patient information to the wrong person.",2,"Information Management","A disclosure of patient information to the wrong recipient is an information-management issue."],
["A GP partner ensures all clinicians have current professional registration.",3,"Governance & Leadership","Leadership oversight includes ensuring appropriate professional and organisational governance."]
];
let mode=null, room=null, channel=null, myId=crypto.randomUUID(), myName="", phase="waiting", qIndex=0, answers={}, participants={}, timer=60, timerHandle=null;

function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function initials(n){return n? n.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase():"?"}
function code(){return Array.from({length:5},()=> "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*32)]).join("")}
function home(){
 app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance</div><div class="card home">
 <div class="small">LIVE LEARNING ACTIVITY</div><h1>Clinical Governance Game Room</h1>
 <p class="sub">Move around the Clinical Governance wheel, compare where the room stands, and discuss the reasoning together.</p>
 <div class="choices"><button class="bigbtn" onclick="hostSetup()">I'm facilitating</button><button class="bigbtn" onclick="joinSetup()">I'm participating</button></div>
 </div></div></div>`}
window.hostSetup=()=>{app.innerHTML=`<div class="shell"><div class="card home"><h1>Create a game room</h1><p class="sub">You'll control the questions, timer, locking and answer reveal.</p><button class="primary" onclick="createRoom()">Create room</button><button class="secondary" onclick="home()">Back</button></div></div>`}
window.joinSetup=()=>{app.innerHTML=`<div class="shell"><div class="card home"><h1>Join a game room</h1><div class="form"><input id="rc" maxlength="5" placeholder="Room code" style="text-transform:uppercase"><input id="nm" maxlength="40" placeholder="Display name (optional)"><div class="small">Use your first name, initials or a nickname. It is only used during the live session.</div><button class="primary" onclick="joinRoom()">Join room</button></div><button class="secondary" onclick="home()">Back</button></div></div>`}

async function makeChannel(){
 channel=sb.channel("cg-room-"+room,{config:{presence:{key:myId},broadcast:{self:false}}});
 channel.on("presence",{event:"sync"},()=>{participants={};const st=channel.presenceState();Object.entries(st).forEach(([id,arr])=>{if(arr[0])participants[id]=arr[0]});renderSide()})
 .on("broadcast",{event:"state"},({payload})=>{if(mode==="participant")applyState(payload)})
 .on("broadcast",{event:"position"},({payload})=>{if(mode==="host"){answers[payload.id]={zone:payload.zone,name:payload.name};renderTokens();renderSide()}})
 .on("broadcast",{event:"state_request"},()=>{if(mode==="host")broadcastState()})
 .subscribe(async status=>{
   if(status==="SUBSCRIBED"){await channel.track({name:myName||"Participant",role:mode}); if(mode==="participant")channel.send({type:"broadcast",event:"state_request",payload:{id:myId}})}
 });
}
window.createRoom=async()=>{mode="host";room=code();myName="Facilitator";await makeChannel();renderHost()}
window.joinRoom=async()=>{room=document.getElementById("rc").value.trim().toUpperCase();if(room.length<4)return alert("Enter the room code.");myName=document.getElementById("nm").value.trim()||("Guest "+myId.slice(0,4));mode="participant";await makeChannel();renderParticipant()}

function wheelHTML(isParticipant=false){
 let segs="",labs="";
 ZONES.forEach((z,i)=>{
  const angle=i*45;segs+=`<div class="seg ${phase==="revealed"&&QUESTIONS[qIndex][1]===i?"reveal":""}" data-zone="${i}" style="background:${z[1]};transform:rotate(${angle}deg) skewY(-45deg)"></div>`;
  const a=(i*45+22.5-90)*Math.PI/180,r=39,x=50+r*Math.cos(a),y=50+r*Math.sin(a);
  labs+=`<div class="label" style="left:${x}%;top:${y}%">${z[0]}</div>`;
 });
 return `<div class="wheelwrap ${isParticipant?"participant":""}" id="wheelwrap"><div class="wheel ${phase==="waiting"?"grey":""}">${segs}</div><div class="labels">${labs}</div><div class="center">${phase==="waiting"?"Waiting for<br>next question":"CLINICAL<br>GOVERNANCE"}</div><div id="tokens"></div></div>`;
}
function renderHost(){
 app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance Game Room</div>
 <div class="game"><section class="card main"><div class="question"><div class="small">SCENARIO ${qIndex+1} OF ${QUESTIONS.length}</div><h2>${phase==="waiting"?"Ready for the next scenario":esc(QUESTIONS[qIndex][0])}</h2></div>
 <div class="statusbar"><span class="timer" id="timer">${phase==="answering"?timer+"s":phase==="locked"?"Answers locked":phase==="revealed"?"Answer revealed":"Waiting"}</span></div>
 ${wheelHTML()}<div id="explanation"></div><div class="controls" id="controls"></div></section>
 <aside class="card side"><div class="small">ROOM CODE</div><div class="roomcode">${room}</div><p class="small">Participants enter this code to join.</p><hr><div class="count" id="positioned">0</div><div class="small">POSITIONED</div><h3>Connected</h3><ul class="people" id="people"></ul></aside></div></div></div>`;
 renderTokens();renderSide();renderControls();renderExplanation();
}
function renderParticipant(){
 app.innerHTML=`<div class="shell"><div class="top"><div class="brand">Clinical Governance Game Room</div><div class="card main">
 <div class="question"><div class="small">ROOM ${room}</div><h2>${phase==="waiting"?"Waiting for the facilitator…":esc(QUESTIONS[qIndex][0])}</h2></div>
 <div class="statusbar"><span class="timer" id="timer">${phase==="answering"?timer+"s":phase==="locked"?"Answers locked":phase==="revealed"?"Answer revealed":"Waiting"}</span></div>
 ${wheelHTML(true)}<div id="explanation"></div><p class="small" style="text-align:center">${phase==="answering"?"Drag your token from the centre onto the segment you think fits best. You can change your mind until answers are locked.":""}</p></div></div></div>`;
 renderTokens();renderExplanation(); if(phase==="answering")enableDrag();
}
function renderSide(){
 if(mode!=="host"||!document.getElementById("people"))return;
 const ps=Object.entries(participants).filter(([id,p])=>p.role==="participant");
 document.getElementById("people").innerHTML=ps.length?ps.map(([id,p])=>`<li>${esc(p.name||"Participant")}</li>`).join(""):"<li class='small'>Waiting for participants…</li>";
 document.getElementById("positioned").textContent=`${Object.keys(answers).length} / ${ps.length}`;
}
function posFor(zone,idx=0,total=1){
 const a=(zone*45+22.5-90)*Math.PI/180;
 const ring=total>5?34:31; const spread=(idx-(total-1)/2)*4;
 const aa=a+spread*Math.PI/180;return [50+ring*Math.cos(aa),50+ring*Math.sin(aa)]
}
function renderTokens(){
 const box=document.getElementById("tokens");if(!box)return;box.innerHTML="";
 if(mode==="participant"){
   let zone=answers[myId]?.zone; let p=zone==null?[50,50]:posFor(zone);
   box.innerHTML=`<div class="token" id="mytoken" style="left:${p[0]}%;top:${p[1]}%" title="${esc(myName)}">${phase==="locked"||phase==="revealed"?initials(myName):"ME"}</div>`;
 } else {
   let grouped={};Object.entries(answers).forEach(([id,a])=>{(grouped[a.zone]??=[]).push([id,a])});
   Object.entries(grouped).forEach(([z,list])=>list.forEach(([id,a],i)=>{let p=posFor(+z,i,list.length);let t=document.createElement("div");t.className="token "+(phase==="answering"?"anonymous":"");t.style.left=p[0]+"%";t.style.top=p[1]+"%";t.textContent=phase==="answering"?"":initials(a.name);if(phase!=="answering")t.title=a.name;box.appendChild(t)}))
 }
}
function enableDrag(){
 const token=document.getElementById("mytoken"),wrap=document.getElementById("wheelwrap");if(!token||!wrap)return;
 const move=e=>{e.preventDefault();let pt=e.touches?e.touches[0]:e,r=wrap.getBoundingClientRect(),x=(pt.clientX-r.left)/r.width*100,y=(pt.clientY-r.top)/r.height*100;token.style.left=x+"%";token.style.top=y+"%"};
 const end=e=>{document.removeEventListener("pointermove",move);document.removeEventListener("pointerup",end);let r=wrap.getBoundingClientRect(),x=parseFloat(token.style.left),y=parseFloat(token.style.top),dx=x-50,dy=y-50,dist=Math.hypot(dx,dy);if(dist<18||dist>50){token.style.left="50%";token.style.top="50%";delete answers[myId];return}
   let deg=(Math.atan2(dy,dx)*180/Math.PI+90+360)%360,zone=Math.floor((deg+22.5)%360/45);answers[myId]={zone,name:myName};let p=posFor(zone);token.style.left=p[0]+"%";token.style.top=p[1]+"%";channel.send({type:"broadcast",event:"position",payload:{id:myId,name:myName,zone}});
 };
 token.onpointerdown=e=>{if(phase!=="answering")return;token.setPointerCapture?.(e.pointerId);document.addEventListener("pointermove",move);document.addEventListener("pointerup",end)};
}
function broadcastState(){channel.send({type:"broadcast",event:"state",payload:{phase,qIndex,timer}})}
function applyState(s){phase=s.phase;qIndex=s.qIndex;timer=s.timer;if(phase==="waiting")answers={};renderParticipant()}
window.launchQ=()=>{phase="answering";answers={};timer=60;broadcastState();renderHost();clearInterval(timerHandle);timerHandle=setInterval(()=>{timer--;let el=document.getElementById("timer");if(el)el.textContent=timer+"s";if(timer%5===0)broadcastState();if(timer<=0)lockAnswers()},1000)}
window.lockAnswers=()=>{if(phase!=="answering")return;phase="locked";clearInterval(timerHandle);broadcastState();renderHost()}
window.reveal=()=>{phase="revealed";broadcastState();renderHost()}
window.nextQ=()=>{qIndex=(qIndex+1)%QUESTIONS.length;phase="waiting";answers={};timer=60;broadcastState();renderHost()}
function renderControls(){
 const c=document.getElementById("controls");if(!c||mode!=="host")return;
 if(phase==="waiting")c.innerHTML=`<button class="primary" onclick="launchQ()">Launch question</button>`;
 if(phase==="answering")c.innerHTML=`<button class="primary" onclick="lockAnswers()">Lock answers</button>`;
 if(phase==="locked")c.innerHTML=`<button class="primary" onclick="reveal()">Reveal answer</button>`;
 if(phase==="revealed")c.innerHTML=`<button class="primary" onclick="nextQ()">Next question</button>`;
}
function renderExplanation(){
 const e=document.getElementById("explanation");if(!e)return;
 e.innerHTML=phase==="revealed"?`<div class="explain"><strong>${QUESTIONS[qIndex][2]}</strong><br>${QUESTIONS[qIndex][3]}</div>`:"";
}
home();
