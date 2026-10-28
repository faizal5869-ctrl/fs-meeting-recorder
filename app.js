const $ = id => document.getElementById(id);
const STORE = "fsMeetingRecorder.v1";
let meetings = [];
let recorder = null, chunks = [], currentAudioUrl = null;

try { meetings = JSON.parse(localStorage.getItem(STORE) || "[]"); } catch(e) { meetings = []; }
$("meetingDate").value = new Date().toISOString().slice(0,10);

function persist(){ localStorage.setItem(STORE, JSON.stringify(meetings)); render(); }
function formData(){
  return {title:$("meetingTitle").value.trim(), date:$("meetingDate").value,
    attendees:$("meetingAttendees").value.trim(), notes:$("meetingNotes").value.trim(),
    tasks:$("meetingTasks").value.split("\n").map(x=>x.trim()).filter(Boolean)};
}
$("startRec").onclick = async () => {
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder){
    $("recStatus").textContent = "Rakaman tidak disokong di sini. Buka aplikasi melalui laman HTTPS selepas dipasang.";
    return;
  }
  try{
    const stream = await navigator.mediaDevices.getUserMedia({audio:true});
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
    recorder.onstop = () => {
      const blob = new Blob(chunks,{type:recorder.mimeType || "audio/webm"});
      currentAudioUrl = URL.createObjectURL(blob);
      $("audioPreview").innerHTML = "";
      const audio = document.createElement("audio"); audio.controls = true; audio.src = currentAudioUrl;
      $("audioPreview").appendChild(audio);
      const dl = document.createElement("a"); dl.href = currentAudioUrl; dl.download = "rakaman-mesyuarat.webm"; dl.textContent = "Muat turun rakaman audio";
      dl.style.display="inline-block"; dl.style.marginTop="8px"; $("audioPreview").appendChild(dl);
      stream.getTracks().forEach(t=>t.stop());
      $("recStatus").textContent = "Rakaman selesai. Muat turun audio jika mahu simpan berasingan.";
    };
    recorder.start(); $("startRec").disabled=true; $("stopRec").disabled=false;
    $("recStatus").textContent = "Sedang merakam audio...";
  }catch(e){ $("recStatus").textContent = "Mikrofon tidak dapat diakses. Semak kebenaran mikrofon pada pelayar."; }
};
$("stopRec").onclick = () => { if(recorder && recorder.state!=="inactive") recorder.stop(); $("startRec").disabled=false; $("stopRec").disabled=true; };
$("saveMeeting").onclick = () => {
  const d=formData(); if(!d.title){alert("Sila isi tajuk mesyuarat dahulu.");return;}
  d.id = Date.now().toString(); d.created = new Date().toISOString();
  d.tasks = d.tasks.map((text,i)=>({id:i,text,done:false}));
  meetings.unshift(d); persist(); clearForm(); alert("Mesyuarat disimpan pada pelayar ini.");
};
function clearForm(){["meetingTitle","meetingAttendees","meetingNotes","meetingTasks"].forEach(id=>$(id).value="");$("meetingDate").value=new Date().toISOString().slice(0,10);$("audioPreview").innerHTML="";$("recStatus").textContent="Rakaman belum dimulakan.";currentAudioUrl=null;}
$("clearForm").onclick=clearForm;
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function render(){
  const q=$("search").value.toLowerCase();
  const list=meetings.filter(m=>(m.title+" "+m.notes+" "+m.attendees+" "+m.tasks.map(t=>t.text).join(" ")).toLowerCase().includes(q));
  $("archive").innerHTML="";
  if(!list.length){$("archive").innerHTML='<p class="muted">Belum ada mesyuarat yang disimpan.</p>';return;}
  list.forEach(m=>{
    const el=document.createElement("div");el.className="item";
    el.innerHTML=`<h3>${escapeHtml(m.title)}</h3><div class="muted">${escapeHtml(m.date||"Tiada tarikh")} • ${escapeHtml(m.attendees||"Tiada senarai kehadiran")}</div>
    ${m.notes?`<p><b>Nota/minit:</b><br>${escapeHtml(m.notes)}</p>`:""}
    <p><b>Tindakan susulan:</b></p><div class="tasks"></div>
    <button class="secondary export">Eksport mesyuarat</button><button class="danger delete">Padam</button>`;
    const tasks=el.querySelector(".tasks");
    if(!m.tasks.length) tasks.innerHTML='<p class="muted">Tiada tugasan.</p>';
    m.tasks.forEach(t=>{
      const lab=document.createElement("label");lab.className="task";
      const cb=document.createElement("input");cb.type="checkbox";cb.checked=t.done;
      cb.onchange=()=>{const orig=meetings.find(x=>x.id===m.id);const task=orig.tasks.find(x=>x.id===t.id);task.done=cb.checked;localStorage.setItem(STORE,JSON.stringify(meetings));};
      const span=document.createElement("span");span.textContent=t.text+(t.done?" (Selesai)":"");
      lab.append(cb,span);tasks.appendChild(lab);
    });
    el.querySelector(".export").onclick=()=>download(JSON.stringify(m,null,2),safeName(m.title)+".json","application/json");
    el.querySelector(".delete").onclick=()=>{if(confirm("Padam mesyuarat ini?")){meetings=meetings.filter(x=>x.id!==m.id);persist();}};
    $("archive").appendChild(el);
  });
}
function safeName(s){return (s||"mesyuarat").replace(/[^a-z0-9-_]/gi,"_").slice(0,60);}
function download(data,name,type){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
$("search").addEventListener("input",render);
$("exportAll").onclick=()=>download(JSON.stringify(meetings,null,2),"FS_Meeting_Recorder_backup.json","application/json");
if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(()=>{});
render();