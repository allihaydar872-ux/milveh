// كل شيء داخل IIFE للتنظيم + تنفيذ بعد تحميل DOM (بسبب defer)
(function () {
  'use strict';

  /* ====== QR بسيط بالرسم على Canvas (بديل خفيف) ====== */
  function SimpleQRFactory(canvas) {
    function drawer(text, opt) {
      var c = canvas.getContext ? canvas : canvas.querySelector('canvas');
      if (!c) return;
      var ctx = c.getContext('2d');
      var s = c.width;
      ctx.clearRect(0, 0, s, s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, s - 4, s - 4);
      ctx.fillStyle = '#000';
      ctx.font = '12px monospace';
      var lines = (text.match(/.{1,24}/g) || [text]).slice(0, 14);
      var y = 20;
      lines.forEach(function (t) { ctx.fillText(t, 8, y); y += 14; });
    }
    return { makeCode: function (txt) { drawer(txt || '', {}); } };
  }
  window.SimpleQR = SimpleQRFactory;

  /* ====== الأعمدة والعناوين ====== */
  const columns = ["select","num","maker","name","carType","chassis","model","color","radio","owner","rank","position","unit","phone","driver1","rank1","phone1","lic1","driver2","rank2","phone2","lic2","gear","vehlic","cyl","fuel","mission","doc","docnum","docdate","status","note"];
  const colTitles = ["—","رقم المركبة","اسم الشركة المصنعة","اسم السيارة","نوع السيارة","رقم الشاصي","الموديل","اللون","رقم/كود اللاسلكي","اسم صاحب المركبة","الرتبة","المنصب","الوحدة","رقم الهاتف","اسم السائق الأول","رتبة السائق الأول","هاتف السائق الأول","رخصة السائق الأول","اسم السائق الثاني","رتبة السائق الثاني","هاتف السائق الثاني","رخصة السائق الثاني","نوع الناقل الحركة","رخصة القيادة","حجم السلندر","نوع الوقود","مهمة السيارة","مستند","رقم المستند","تاريخ المستند","حالة السيارة","ملاحظات"];

  /* ====== Helpers ====== */
  function genId(){ return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,9); }
  function getCss(name){ return getComputedStyle(document.documentElement).getPropertyValue(name); }

  /* ====== بيانات ====== */
  function seedData(){ return [
    {_id:genId(),num:"1001",maker:"تويوتا",name:"لاندكروزر",carType:"جيب",chassis:"CH-001",model:"2021",color:"أسود",radio:"R-12",owner:"—",rank:"—",position:"—",unit:"الوحدة 1",phone:"0770...",driver1:"أحمد",rank1:"ر.ع",phone1:"0771...",lic1:"خفيفة",driver2:"—",rank2:"—",phone2:"",lic2:"",gear:"أوتوماتيك",vehlic:"سارية",cyl:"6",fuel:"بنزين",mission:"خدمة",doc:"نعم",docnum:"D-1",docdate:"2025-06-01",status:"جاهزة",note:""},
    {_id:genId(),num:"1002",maker:"نيسان",name:"بيك أب",carType:"بيك أب",chassis:"CH-002",model:"2019",color:"أبيض",radio:"R-18",owner:"—",rank:"—",position:"—",unit:"الوحدة 2",phone:"0772...",driver1:"حسن",rank1:"عريف",phone1:"0773...",lic1:"ثقيلة",driver2:"—",rank2:"—",phone2:"",lic2:"",gear:"عادي",vehlic:"سارية",cyl:"4",fuel:"ديزل",mission:"خصوصي",doc:"لا",docnum:"",docdate:"",status:"صيانة",note:""},
    {_id:genId(),num:"1003",maker:"هيونداي",name:"اكسنت",carType:"صالون",chassis:"CH-003",model:"2020",color:"أزرق",radio:"R-19",owner:"—",rank:"—",position:"—",unit:"الوحدة 3",phone:"0774...",driver1:"سامي",rank1:"جندي",phone1:"0775...",lic1:"خفيفة",driver2:"—",rank2:"—",phone2:"",lic2:"",gear:"أوتوماتيك",vehlic:"سارية",cyl:"4",fuel:"بنزين",mission:"خدمة",doc:"نعم",docnum:"D-3",docdate:"2025-03-11",status:"منتشرة",note:""},
    {_id:genId(),num:"1004",maker:"فورد",name:"ترانزيت",carType:"فان",chassis:"CH-004",model:"2018",color:"رمادي",radio:"R-22",owner:"—",rank:"—",position:"—",unit:"الوحدة 4",phone:"0776...",driver1:"مروان",rank1:"رقيب",phone1:"0777...",lic1:"ثقيلة",driver2:"—",rank2:"—",phone2:"",lic2:"",gear:"عادي",vehlic:"منتهية",cyl:"6",fuel:"ديزل",mission:"خدمة",doc:"لا",docnum:"",docdate:"",status:"خارج الخدمة",note:""}
  ];}

  let vehicles = JSON.parse(localStorage.getItem("milveh.v1")||"null")||seedData();
  let fixed=false;
  vehicles = vehicles.map(v=>{ if(!v._id){ v._id = genId(); fixed=true; } return v; });
  if(fixed) localStorage.setItem("milveh.v1", JSON.stringify(vehicles));

  let selectedCols=JSON.parse(localStorage.getItem("milveh.cols")||"null")||[...columns];
  if(!selectedCols.includes('select')) selectedCols.unshift('select');

  const tbody=document.getElementById("vehTbody");
  const tableViewport=document.getElementById("tableViewport");

  /* ====== أدوار ====== */
  const AUTH_KEY='milveh.auth';
  const auth=JSON.parse(localStorage.getItem(AUTH_KEY)||'null')||{pins:{admin:'0000',editor:'1111'},role:'viewer'};
  saveAuth();

  function saveAuth(){ localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); updateAuthUI(); }
  function role(){ return auth.role||'viewer'; }
  function isViewer(){ return role()==='viewer'; }
  function canEdit(){ return role()==='editor' || role()==='admin'; }
  function isAdmin(){ return role()==='admin'; }

  function normalizePIN(s){
    const map={'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
    return (s||'').toString().trim().split('').map(ch=> map[ch] ?? ch).join('');
  }

  function updateAuthUI(){
    const viewer = auth.role==='viewer';
    const admin  = auth.role==='admin';
    document.getElementById('loginBtn').classList.toggle('hidden', !viewer);
    document.getElementById('logoutBtn').classList.toggle('hidden',  viewer);
    document.getElementById('acctBtn').classList.toggle('hidden',   !admin);
    document.querySelectorAll('[data-edit-only]').forEach(el => el.disabled = viewer);
    document.getElementById('bulkBar').classList.remove('show');
  }

  document.getElementById('loginBtn').onclick=()=> document.getElementById('loginModal').classList.add('open');
  document.getElementById('closeLogin').onclick=()=> document.getElementById('loginModal').classList.remove('open');
  document.getElementById('loginSubmit').onclick=()=>{
    const r=document.getElementById('roleSelect').value;
    const pin=normalizePIN(document.getElementById('pinInput').value);
    if(r==='viewer'){ auth.role='viewer'; saveAuth(); document.getElementById('loginModal').classList.remove('open'); return; }
    if(r==='editor' && pin===normalizePIN(auth.pins.editor)){ auth.role='editor'; saveAuth(); document.getElementById('loginModal').classList.remove('open'); return; }
    if(r==='admin'  && pin===normalizePIN(auth.pins.admin)){  auth.role='admin';  saveAuth(); document.getElementById('loginModal').classList.remove('open'); return; }
    alert('رمز PIN غير صحيح');
  };
  document.getElementById('logoutBtn').onclick=()=>{ auth.role='viewer'; saveAuth(); };

  document.getElementById('acctBtn').onclick=()=> document.getElementById('acctModal').classList.add('open');
  document.getElementById('closeAcct').onclick=()=> document.getElementById('acctModal').classList.remove('open');
  document.getElementById('saveAcct').onclick=()=>{
    const pa=normalizePIN(document.getElementById('pinAdmin').value);
    const pe=normalizePIN(document.getElementById('pinEditor').value);
    if(pa) auth.pins.admin=pa; if(pe) auth.pins.editor=pe;
    saveAuth();
    alert('تم التحديث');
    document.getElementById('acctModal').classList.remove('open');
  };
  document.getElementById('resetPIN').onclick=()=>{
    auth.pins.admin="0000"; auth.pins.editor="1111";
    saveAuth();
    alert("✅ تمت إعادة تعيين PIN (مدير: 0000، محرر: 1111)");
    document.getElementById('acctModal').classList.remove('open');
  };

  /* ====== لوحة المعلومات ====== */
  function renderDashboard(){
    const total=vehicles.length, ready=vehicles.filter(v=>v.status==="جاهزة").length,
          repair=vehicles.filter(v=>v.status==="صيانة").length, out=vehicles.filter(v=>v.status==="خارج الخدمة").length,
          deployed=vehicles.filter(v=>v.status==="منتشرة").length;
    document.getElementById("dashboardStats").innerHTML=
      `<div class="card"><h3>🚘 إجمالي</h3><div class="num">${total}</div></div>
       <div class="card" style="background:#14532d"><h3>✅ جاهزة</h3><div class="num">${ready}</div></div>
       <div class="card" style="background:#78350f"><h3>🛠️ صيانة</h3><div class="num">${repair}</div></div>
       <div class="card" style="background:#1e3a8a"><h3>🚚 منتشرة</h3><div class="num">${deployed}</div></div>
       <div class="card" style="background:#7f1d1d"><h3>⛔ خارج الخدمة</h3><div class="num">${out}</div></div>`;
  }

  /* ====== فلترة/افتراضية صفوف ====== */
  let filteredData=[]; let rowHeight=44; const overscan=20; let statusFilter="";
  function computeFiltered(){
    const q=document.getElementById("q").value.toLowerCase();
    filteredData=vehicles.filter(v=>{
      const matchQ=!q||columns.some(k=>k!=='select'&&(v[k]||"").toString().toLowerCase().includes(q));
      const matchS=!statusFilter||v.status===statusFilter;
      return matchQ&&matchS;
    });
    const res=document.getElementById('resCount'); if(res) res.textContent=`نتيجة: ${filteredData.length} / ${vehicles.length}`;
  }

  let sortState={key:null,dir:1};
  function sortBy(key){
    if(key==='select') return;
    if(sortState.key===key) sortState.dir*=-1; else {sortState.key=key;sortState.dir=1;}
    pushHistory();
    vehicles.sort((a,b)=>{
      const va=(a[key]??"").toString(), vb=(b[key]??"").toString();
      const na=Number(va), nb=Number(vb);
      if(!isNaN(na)&&!isNaN(nb)) return (na-nb)*sortState.dir;
      return va.localeCompare(vb,'ar',{numeric:true})*sortState.dir;
    });
    save();
  }

  function renderHeader(){
    const headerRow=document.getElementById("headerRow");
    headerRow.innerHTML=selectedCols.map(c=>{
      const label=colTitles[columns.indexOf(c)];
      const arrow=(sortState.key===c?(sortState.dir===1?" ▲":" ▼"):"");
      const cur=c==='select'?'':' style="cursor:pointer"';
      return `<th data-sort="${c}"${cur}>${label}${arrow}</th>`;
    }).join("") + "<th>إجراءات</th>";
    headerRow.querySelectorAll("th[data-sort]").forEach(th=> th.addEventListener("click",()=>sortBy(th.dataset.sort)));
  }

  let bulkMode=false; const selected=new Set();
  function toggleBulk(){ bulkMode=!bulkMode; document.getElementById('bulkBar').classList.toggle('show', bulkMode); renderAll(); }
  document.getElementById('bulkBtn').onclick=toggleBulk;
  function bulkTd(id){ if(!bulkMode) return ''; const checked=selected.has(id)?'checked':''; return `<input type="checkbox" data-id="${id}" ${checked}/>`; }

  function getIndexById(id){ return vehicles.findIndex(v=>v._id===id); }
  let rowHeightMeasured=false;

  function rowHTML(v){
    const i = v._id;
    const tds=selectedCols.map(c=>{
      if(c==='select') return `<td style="text-align:center">${bulkTd(i)}</td>`;
      if(c==="status"){
        let color="#374151",emoji="";
        switch(v[c]){case"جاهزة":color=getCss('--ok')||"#16a34a";emoji="✅";break;case"صيانة":color=getCss('--warn')||"#d97706";emoji="🛠️";break;case"منتشرة":color=getCss('--info')||"#2563eb";emoji="🚚";break;case"خارج الخدمة":color=getCss('--danger')||"#dc2626";emoji="⛔";break;}
        return `<td><span class="badge" style="background:${color.trim()}">${emoji} ${v[c]||""}</span></td>`;
      }
      return `<td>${(v[c]??"")}</td>`;
    }).join("");
    return `<tr data-id="${i}">${tds}
      <td>
        <button class="secondary" onclick="editVeh('${i}')" ${isViewer()?'disabled':''}>✏️ تعديل</button>
        <button class="secondary" onclick="openCard('${i}')">🪪 بطاقة</button>
        <button class="danger" onclick="delVeh('${i}')" ${isViewer()?'disabled':''}>🗑️ حذف</button>
      </td>
    </tr>`;
  }

  function renderVirtual(){
    const vpH=tableViewport.clientHeight||400, scrollTop=tableViewport.scrollTop||0, total=filteredData.length;
    const startIndex=Math.max(0,Math.floor(scrollTop/rowHeight)-overscan);
    const endIndex=Math.min(total,Math.ceil((scrollTop+vpH)/rowHeight)+overscan);
    if(total && !rowHeightMeasured){
      tbody.innerHTML = rowHTML(filteredData[0]);
      requestAnimationFrame(()=>{
        const tr = tbody.querySelector('tr');
        if(tr){
          rowHeight = tr.getBoundingClientRect().height || 44;
          rowHeightMeasured = true;
        }
        renderVirtual();
      });
      return;
    }
    const topPad=startIndex*rowHeight, bottomPad=(total-endIndex)*rowHeight;
    let html=`<tr style="height:${topPad}px"><td colspan="${selectedCols.length+1}"></td></tr>`;
    for(let i=startIndex;i<endIndex;i++){ const v=filteredData[i]; html+=rowHTML(v); }
    html+=`<tr style="height:${bottomPad}px"><td colspan="${selectedCols.length+1}"></td></tr>`;
    tbody.innerHTML=html;

    if(bulkMode){
      tbody.querySelectorAll('input[type=checkbox][data-id]').forEach(cb=>{
        cb.onchange=(e)=>{ const id=e.target.dataset.id; if(e.target.checked) selected.add(id); else selected.delete(id); updateBulkCount(); };
      });
    }
    renderDashboard();
  }

  function updateBulkCount(){ document.getElementById('bulkCount').textContent=`${selected.size} محدد`; }
  function renderAll(){ renderHeader(); computeFiltered(); renderVirtual(); updateBulkCount(); }

  /* ====== تاريخ التعديلات ====== */
  const backStack=[]; const fwdStack=[]; const MAX_HIST=20;
  function snapshot(){ return JSON.parse(JSON.stringify(vehicles)); }
  function pushHistory(){ backStack.push(snapshot()); while(backStack.length>MAX_HIST) backStack.shift(); fwdStack.length=0; }
  function undo(){ if(!backStack.length) return; fwdStack.push(snapshot()); vehicles=backStack.pop(); save(false); }
  function redo(){ if(!fwdStack.length) return; backStack.push(snapshot()); vehicles=fwdStack.pop(); save(false); }
  document.getElementById('undoBtn').onclick=()=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); undo(); };
  document.getElementById('redoBtn').onclick=()=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); redo(); };

  /* ====== حفظ + نسخ احتياطية ====== */
  const BK_KEY="milveh.backups.v1";
  function listBackups(){ return JSON.parse(localStorage.getItem(BK_KEY)||"[]"); }
  function saveBackups(arr){ localStorage.setItem(BK_KEY, JSON.stringify(arr)); }
  function save(push=true){ localStorage.setItem("milveh.v1", JSON.stringify(vehicles)); if(push){ const arr=listBackups(); arr.push({ts:Date.now(),data:vehicles}); while(arr.length>10) arr.shift(); saveBackups(arr); } renderAll(); }

  /* ====== تحقق + نموذج ====== */
  const REQUIRED_KEYS=["num","maker","name","carType"]; const PHONE_KEYS=["phone","phone1","phone2"]; const RE={ phone:/^[0-9+\-\s()]{7,}$/, chassis:/^[A-Za-z0-9\-]{5,}$/ };
  function showErr(input,msg){ clearErr(input); input.classList.add("invalid"); const p=document.createElement("div"); p.className="err"; p.textContent=msg; input.closest(".field").appendChild(p) }
  function clearErr(input){ input.classList.remove("invalid"); const e=input.closest(".field").querySelector(".err"); if(e) e.remove() }
  function validateForm(editId){
    let firstBad=null;
    REQUIRED_KEYS.forEach(k=>{ const el=document.getElementById(k); if(!el) return; const v=(el.value||"").trim(); if(!v){ showErr(el,"هذا الحقل مطلوب"); if(!firstBad) firstBad=el } else clearErr(el) });
    const numEl=document.getElementById("num");
    if(numEl && (numEl.value||"").trim()){
      const exists=vehicles.find(v=> v.num===numEl.value.trim() && v._id!==editId);
      if(exists){ showErr(numEl,"رقم المركبة مُسجّل مسبقًا"); if(!firstBad) firstBad=numEl }
    }
    const chEl=document.getElementById("chassis");
    if(chEl && (chEl.value||"").trim()){
      const vch=chEl.value.trim();
      const exists=vehicles.find(v=> (v.chassis||"").trim()===vch && v._id!==editId);
      if(exists){ showErr(chEl,"رقم الشاصي مُسجّل مسبقًا"); if(!firstBad) firstBad=chEl } else clearErr(chEl)
    }
    PHONE_KEYS.forEach(k=>{ const el=document.getElementById(k); if(!el) return; const v=(el.value||"").trim(); if(v && !RE.phone.test(v)){ showErr(el,"صيغة الهاتف غير صحيحة"); if(!firstBad) firstBad=el } else clearErr(el) });
    const dd=document.getElementById("docdate");
    if(dd && dd.value){ try{ const d=new Date(dd.value); const now=new Date(); if(d.getTime()>now.getTime()+86400000){ showErr(dd,"تاريخ المستند يبدو مستقبليًا"); if(!firstBad) firstBad=dd } else clearErr(dd) }catch{} }
    return { ok:!firstBad, first:firstBad };
  }

  /* ====== عمليات CRUD ====== */
  window.editVeh=(id)=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); const idx=getIndexById(id); if(idx<0) return alert('السجل غير موجود'); openForm(vehicles[idx], id); };
  window.delVeh=(id)=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); if(!confirm("حذف المركبة؟")) return; const idx=getIndexById(id); if(idx<0) return; pushHistory(); vehicles.splice(idx,1); selected.delete(id); save(); };
  window.openCard=(id)=>{ const idx=getIndexById(id); if(idx<0) return; openCardModal(vehicles[idx]); };

  let modalKeyHandler=null;
  function openForm(v, id){
    const RO=isViewer();
    const hidden = document.getElementById("vehId");
    if(hidden) hidden.value = id||"";
    else {
      const h=document.createElement('input'); h.type='hidden'; h.id='vehId'; h.value = id||""; document.querySelector('#formModal .body').prepend(h);
    }

    const fieldHtml=(c,label)=>{
      const isRequired=REQUIRED_KEYS.includes(c)?' required aria-required="true"':'';
      const telAttr=PHONE_KEYS.includes(c)?' inputmode="tel" placeholder="مثال: 0770 123 4567" ':'';
      const chAttr=(c==="chassis")?' placeholder="أحرف/أرقام (اختياري)" ':'';
      const val=v?(v[c]||""):"";
      const dis=RO?' disabled ':'';
      if(c==="status"){
        return `<div class="field"><label>${label}${isRequired?" *":""}</label><select id="status"${isRequired}${dis}><option ${val==="جاهزة"?"selected":""}>جاهزة</option><option ${val==="صيانة"?"selected":""}>صيانة</option><option ${val==="منتشرة"?"selected":""}>منتشرة</option><option ${val==="خارج الخدمة"?"selected":""}>خارج الخدمة</option></select></div>`;
      }
      if(c==="docdate"){
        return `<div class="field"><label>${label}</label><input id="docdate" type="date" value="${v?(v.docdate||""):""}" ${dis}></div>`;
      }
      return `<div class="field"><label>${label}${isRequired?" *":""}</label><input id="${c}" value='${(val+"").replace(/'/g,"&#39;")}'${isRequired}${telAttr}${chAttr}${dis}></div>`;
    };

    const vehCore=["num","maker","name","carType","chassis","model","color","radio","unit","owner","rank","position","phone","gear","vehlic","cyl","fuel","mission","note"];
    const drivers=["driver1","rank1","phone1","lic1","driver2","rank2","phone2","lic2"];
    const docsState=["doc","docnum","docdate","status"];
    const T=(k)=> colTitles[columns.indexOf(k)]||k;

    const formFields=document.getElementById("formFields");
    formFields.innerHTML=`
      <div class="progress"><span id="formProgress"></span></div>
      <p class="progress-text" id="progressText">اكتمال: 0%</p>
      <div class="tabs">
        <button class="tab-btn active" data-tab="veh">🚙 بيانات المركبة</button>
        <button class="tab-btn" data-tab="drv">🧍‍♂️ السائقون</button>
        <button class="tab-btn" data-tab="doc">📎 المستندات والحالة</button>
      </div>
      <div class="tab-panel active" id="tab-veh">
        <div class="section-title"><span class="dot"></span> تفاصيل أساسية</div>
        <div class="form-grid two-cols">${vehCore.map(k=> fieldHtml(k, T(k))).join("")}</div>
        <p class="hint">املأ الحقول المطلوبة (*) أولاً ثم أكمل باقي التفاصيل.</p>
      </div>
      <div class="tab-panel" id="tab-drv">
        <div class="section-title"><span class="dot"></span> بيانات السائقين</div>
        <div class="form-grid two-cols">${drivers.map(k=> fieldHtml(k, T(k))).join("")}</div>
      </div>
      <div class="tab-panel" id="tab-doc">
        <div class="section-title"><span class="dot"></span> المستندات والحالة</div>
        <div class="form-grid two-cols">${docsState.map(k=> fieldHtml(k, T(k))).join("")}</div>
        <p class="hint">تاريخ المستند يجب ألا يكون مستقبليًا بشكل غير منطقي.</p>
      </div>`;

    const tabs=[...formFields.querySelectorAll(".tab-btn")];
    const panels=[...formFields.querySelectorAll(".tab-panel")];
    const prevBtn=document.getElementById("prevTab");
    const nextBtn=document.getElementById("nextTab");
    const saveBtn=document.getElementById("saveVeh");
    let tabIndex=0;
    function updateFooter(){ saveBtn.classList.toggle('hidden', tabIndex!==tabs.length-1 || RO); }
    function setTab(i){ tabIndex=Math.max(0,Math.min(i,tabs.length-1)); tabs.forEach((b,x)=>b.classList.toggle("active",x===tabIndex)); panels.forEach((p,x)=>p.classList.toggle("active",x===tabIndex)); prevBtn.disabled=(tabIndex===0); nextBtn.disabled=(tabIndex===tabs.length-1); updateFooter(); }
    tabs.forEach((b,i)=> b.addEventListener("click",()=>setTab(i)));
    prevBtn.onclick=()=>setTab(tabIndex-1);
    nextBtn.onclick=()=>setTab(tabIndex+1);
    setTab(0);

    formFields.querySelectorAll("input,select").forEach(el=>{
      el.addEventListener("input", ()=>{ clearErr(el); updateProgress(); });
      el.addEventListener("change", ()=>{ clearErr(el); updateProgress(); });
    });

    function suggestNum(){
      const unitEl=document.getElementById('unit'); const numEl=document.getElementById('num'); if(!unitEl||!numEl) return; if((numEl.value||'').trim()) return;
      const m=(unitEl.value||'').match(/\d+/); const code=m?`U${m[0]}-`:'U-';
      const taken=vehicles.map(v=>v.num).filter(n=>typeof n==='string'&&n.startsWith(code)).map(n=>parseInt(n.replace(code,''),10)).filter(x=>!isNaN(x));
      const next=(taken.length?Math.max(...taken)+1:1);
      numEl.placeholder=`${code}${String(next).padStart(3,'0')}`;
    }
    document.getElementById('unit')?.addEventListener('input',suggestNum); suggestNum();

    const ch=document.getElementById('chassis'); if(ch){ ch.addEventListener('input',()=> ch.value=ch.value.toUpperCase()); }

    function updateProgress(){
      const req=formFields.querySelectorAll('[required]');
      const filled=[...req].filter(el=>(el.value||'').trim().length>0).length;
      const pct=Math.round((filled/(req.length||1))*100);
      const bar=document.getElementById('formProgress'); const txt=document.getElementById('progressText');
      if(bar) bar.style.width=pct+'%'; if(txt) txt.textContent=`اكتمال: ${pct}% (${filled}/${req.length})`;
    }
    updateProgress();

    modalKeyHandler=function(e){
      if((e.ctrlKey||e.metaKey)&&(e.key==='s'||e.key==='S')){ e.preventDefault(); if(tabIndex!==tabs.length-1) setTab(tabs.length-1); if(!RO) triggerSave(); return; }
      if(e.key==='Enter'){ e.preventDefault(); if(e.shiftKey){ setTab(tabIndex-1) } else { if(tabIndex<tabs.length-1) setTab(tabIndex+1); else if(!RO) triggerSave(); } }
    };
    document.addEventListener('keydown',modalKeyHandler);

    function triggerSave(){
      const editId=document.getElementById("vehId").value||"";
      const {ok,first}=validateForm(editId||null); if(!ok){ first?.focus(); first?.scrollIntoView({behavior:"smooth",block:"center"}); return; }
      pushHistory();
      const data={}; columns.forEach(c=>{ if(c==='select') return; const el=document.getElementById(c); data[c]=el?(el.value||""):""; });
      if(editId){
        const idx=getIndexById(editId);
        if(idx>=0){ data._id = editId; vehicles[idx]=data; }
      } else {
        data._id = genId();
        vehicles.push(data);
      }
      save();
      closeFormModal();
    }
    document.getElementById("saveVeh").onclick=triggerSave;

    function closeFormModal(){
      document.getElementById("formModal").classList.remove("open");
      if(modalKeyHandler){ document.removeEventListener('keydown',modalKeyHandler); modalKeyHandler=null; }
    }
    document.getElementById("closeForm").onclick=closeFormModal;
    document.getElementById("resetForm").onclick=()=> formFields.querySelectorAll("input,select").forEach(el=>{ el.value=""; clearErr(el); updateProgress(); });
    document.getElementById("formModal").classList.add("open");
    formFields.querySelector("[required]")?.focus();
  }

  /* ====== بطاقة + QR ====== */
  function openCardModal(v) {
  const area = document.getElementById('vehCardInfo');
  area.innerHTML = `
    <h4>بيانات المركبة</h4>
    <div><strong>رقم المركبة:</strong> ${v.num || '-'}</div>
    <div><strong>الشركة:</strong> ${v.maker || '-'}</div>
    <div><strong>الاسم:</strong> ${v.name || '-'}</div>
    <div><strong>النوع:</strong> ${v.carType || '-'}</div>
    <div><strong>الموديل:</strong> ${v.model || '-'}</div>
    <div><strong>اللون:</strong> ${v.color || '-'}</div>
    <div><strong>الوحدة:</strong> ${v.unit || '-'}</div>
    <div><strong>الحالة:</strong> ${v.status || '-'}</div>
  `;

  // 🔗 استبدل الرابط برابط Netlify الجديد
  const url = `https://magical-kulfi-4b01c1.netlify.app/?q=${encodeURIComponent(v.num || '')}`;

  document.getElementById('qrcode').innerHTML = "";
  new QRCode(document.getElementById("qrcode"), {
    text: url,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });

  document.getElementById('cardModal').classList.add('open');
}



document.getElementById('closeCard').onclick=()=> document.getElementById('cardModal').classList.remove('open');
document.getElementById('printCard').onclick=()=>{
  const content=document.querySelector('.veh-card-pro').outerHTML;
  const w=window.open('','_blank');
  w.document.write('<html dir="rtl" lang="ar"><head><title>بطاقة مركبة</title></head><body>'+content+'</body></html>');
  w.document.close(); w.print();
};


  /* ====== رابط q ====== */
  (function initQuery(){ const u=new URL(location.href); const q=u.searchParams.get('q'); if(q){ document.getElementById('q').value=q; } })();

  /* ====== أزرار عامة ====== */
  document.getElementById("addBtn").onclick=()=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); openForm(); };
  document.getElementById("q").addEventListener("input", ()=>{ computeFiltered(); tableViewport.scrollTop=0; renderVirtual(); });
  (function initQuickFilters(){ const qf=document.getElementById('quickFilters'); if(!qf) return; qf.querySelectorAll('button[data-status]').forEach(btn=>{ btn.addEventListener('click', ()=>{ statusFilter=btn.dataset.status; qf.querySelectorAll('button[data-status]').forEach(b=> b.classList.remove('add')); btn.classList.add('add'); tableViewport.scrollTop=0; computeFiltered(); renderVirtual(); }); }); })();

  document.getElementById("exportBtn").onclick=()=>{ const blob=new Blob([JSON.stringify(vehicles,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vehicles.json"; a.click(); URL.revokeObjectURL(a.href); };
  document.getElementById("xlsxExportBtn").onclick=()=>{ if(!vehicles.length){ alert("لا توجد بيانات"); return; } const ws=XLSX.utils.json_to_sheet(vehicles); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Vehicles"); XLSX.writeFile(wb, "vehicles.xlsx"); };
  document.getElementById('csvExportBtn')?.addEventListener('click', ()=>{ if(!vehicles.length){ alert("لا توجد بيانات"); return; } const keys=selectedCols.filter(k=>k!=='select'); const rows=[keys.join(',')].concat( vehicles.map(v=> keys.map(k=>`"${(v[k]??"").toString().replace(/"/g,'""')}"`).join(',') ) ).join('\n'); const blob=new Blob([rows],{type:"text/csv;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="vehicles.csv"; a.click(); URL.revokeObjectURL(a.href); });

  /* ====== استيراد Excel ====== */
  const importModal=document.getElementById('importModal'); const mapperDiv=document.getElementById('mapper'); const importSummary=document.getElementById('importSummary'); const importReport=document.getElementById('importReport'); let importRows=[], headerRow=[], map={}, fileBuffer=null;
  document.getElementById("xlsxImportBtn").onclick=()=>{ if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); document.getElementById("xlsxFile").click(); };
  document.getElementById("xlsxFile").addEventListener("change", async (e)=>{
    const f=e.target.files[0]; if(!f) return; fileBuffer=await f.arrayBuffer();
    const wb=XLSX.read(fileBuffer,{type:"array"}); const name=wb.SheetNames[0]; const sheet=wb.Sheets[name];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1});
    headerRow=(rows[0]||[]).map(h=>(h||"").toString().trim());
    importRows=rows.slice(1).filter(r=> r.some(cell=> cell!==null && cell!==undefined && cell!==""));
    buildMapperUI(); e.target.value="";
  });

  function buildMapperUI(){
    map={};
    columns.forEach((key,i)=>{
      if(key==='select') return;
      const ar=colTitles[i], en=(key||'').toLowerCase();
      let idx=headerRow.findIndex(h=>{
        const H=h.toString().toLowerCase().trim();
        return H===ar.toLowerCase() || H===en || H.includes(en) || H.includes(ar.toLowerCase());
      });
      if(idx<0) idx=headerRow.findIndex(h=> h.toString().toLowerCase().includes(en));
      map[key]=idx>=0? idx : -1;
    });
    importSummary.innerHTML=`الملف يحتوي على <strong>${importRows.length}</strong> صفًا و <strong>${headerRow.length}</strong> عمودًا. قم بمطابقة الأعمدة:`;
    mapperDiv.innerHTML=columns.filter(k=>k!=='select').map((key,i)=>{
      const realIdx=columns.indexOf(key);
      const sel=`<select data-key="${key}" style="width:100%;background:var(--panel2);border:1px solid var(--border);color:var(--text);border-radius:8px;padding:8px">
        <option value="-1">— تجاهل —</option>${headerRow.map((h,idx)=> `<option value="${idx}" ${map[key]===idx?'selected':''}>${h||('عمود '+(idx+1))}</option>`).join('')}
      </select>`;
      return `<div class="map-row"><div>${colTitles[realIdx]}</div><div>${sel}</div></div>`;
    }).join('');
    mapperDiv.querySelectorAll('select').forEach(s=> s.onchange=(e)=>{ map[e.target.dataset.key]=Number(e.target.value); });
    importReport.innerHTML=''; importModal.classList.add('open');
  }
  document.getElementById('closeImport').onclick=()=> importModal.classList.remove('open');

  document.getElementById('applyImport').onclick=()=>{
    if(isViewer()) return alert('يتطلب صلاحية محرر/مدير');
    const newItems=[]; let emptyNums=0, dupNums=0;
    const numsSet=new Set(vehicles.map(v=>(v.num||"").trim()).filter(Boolean));
    importRows.forEach(r=>{
      const obj={}; columns.forEach(k=>{ if(k==='select') return; const idx=map[k]; obj[k]=(idx>=0 && r[idx]!=null)? String(r[idx]) : ""; });
      if(!obj.num){ emptyNums++; return; }
      if(numsSet.has(obj.num)){ dupNums++; return; }
      obj._id = genId();
      numsSet.add(obj.num); newItems.push(obj);
    });
    pushHistory(); vehicles=vehicles.concat(newItems); save();
    importReport.innerHTML=`<div class="ok">تم دمج ${newItems.length} سجلًا بنجاح.</div>${emptyNums?`<div class="warn">تم تجاهل ${emptyNums} صفًا بدون "رقم المركبة".</div>`:''}${dupNums?`<div class="warn">تم تجاهل ${dupNums} صفًا بسبب تكرار "رقم المركبة".</div>`:''}`;
    setTimeout(()=> importModal.classList.remove('open'), 900);
  };

  /* ====== طباعة / PDF ====== */
  document.getElementById("printBtn").onclick=()=>{
    const html=`<html dir="rtl" lang="ar"><head><title>طباعة</title><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:6px;white-space:nowrap;text-align:right}thead th{background:#eee}</style></head><body><table>${document.getElementById("vehTable").innerHTML}</table></body></html>`;
    const win=window.open("","_blank"); win.document.write(html); win.document.close(); win.print();
  };
  document.getElementById("pdfBtn").onclick=()=>{
    const { jsPDF }=window.jspdf; const doc=new jsPDF("p","pt","a4");
    doc.setFontSize(18); doc.setTextColor(0,100,0); doc.text("📑 تقرير المركبات العسكرية",160,40);
    const total=vehicles.length, ready=vehicles.filter(v=>v.status==="جاهزة").length, repair=vehicles.filter(v=>v.status==="صيانة").length, out=vehicles.filter(v=>v.status==="خارج الخدمة").length, deployed=vehicles.filter(v=>v.status==="منتشرة").length;
    doc.setFontSize(12); doc.setTextColor(50); doc.text(`إجمالي: ${total} | جاهزة: ${ready} | صيانة: ${repair} | منتشرة: ${deployed} | خارج الخدمة: ${out}`,40,70);
    const rows=vehicles.slice(-10).map(v=>[v.num,v.maker,v.name,v.carType,v.status,v.unit]);
    doc.autoTable({head:[["رقم المركبة","الشركة المصنعة","اسم السيارة","النوع","الحالة","الوحدة"]], body:rows, startY:100, styles:{fillColor:[34,45,34],textColor:[255,255,255],halign:"center"}, headStyles:{fillColor:[0,100,0],textColor:[255,255,255]}, alternateRowStyles:{fillColor:[240,240,240],textColor:[0,0,0]}});
    doc.save("military_vehicles_report.pdf");
  };

  /* ====== تخصيص الأعمدة + الثيم ====== */
  document.getElementById("colsBtn").onclick=()=>{
    const form=document.getElementById("colsForm");
    form.innerHTML=columns.map((c,i)=>`<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" value="${c}" ${selectedCols.includes(c)?"checked":""}/> ${colTitles[i]}</label>`).join("");
    const updateColsCount=()=>{ const total=columns.length; const checked=form.querySelectorAll("input:checked").length; document.getElementById("colsCount").textContent=`✅ ${checked} من أصل ${total} عمود`; };
    form.querySelectorAll("input").forEach(chk=> chk.onchange=updateColsCount); updateColsCount();
    document.getElementById("toggleAll").onclick=()=>{ const checks=form.querySelectorAll("input[type=checkbox]"); const allChecked=[...checks].every(c=>c.checked); checks.forEach(c=> c.checked=!allChecked); updateColsCount(); };
    document.getElementById("saveCols").onclick=()=>{
      selectedCols=[...form.querySelectorAll("input:checked")].map(c=>c.value);
      if(!selectedCols.length){ alert("يجب اختيار عمود واحد على الأقل"); return; }
      if(!selectedCols.includes('select') && bulkMode){ selectedCols.unshift('select'); }
      localStorage.setItem("milveh.cols", JSON.stringify(selectedCols));
      document.getElementById("colsModal").classList.remove("open"); rowHeightMeasured=false; renderAll();
    };
    document.getElementById("closeCols").onclick=()=> document.getElementById("colsModal").classList.remove('open');
    document.getElementById("colsModal").classList.add("open");
  };

  const themeBtn=document.getElementById("themeBtn");
  if(themeBtn){
    const themes=["military","desert","navy","light","glass"]; let current=localStorage.getItem("milveh.theme")||"desert";
    applyTheme(current);
    themeBtn.onclick=()=>{ let idx=themes.indexOf(current); current=themes[(idx+1)%themes.length]; applyTheme(current); localStorage.setItem("milveh.theme",current); };
    function applyTheme(name){ if(name==="military") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme",name); }
  }

  /* ====== نسخ احتياطي ====== */
  document.getElementById('backupBtn')?.addEventListener('click', ()=>{ const arr=listBackups(); arr.push({ts:Date.now(),data:vehicles}); saveBackups(arr); alert("✅ تم إنشاء نسخة احتياطية محليًا."); });
  document.getElementById('restoreBtn')?.addEventListener('click', ()=>{
    const arr=listBackups().slice().reverse(); if(!arr.length){ alert("لا توجد نسخ احتياطية."); return; }
    const msg=arr.slice(0,5).map((b,i)=>{ const d=new Date(b.ts); return `${i+1}) ${d.toLocaleString()} - ${b.data.length} سجل`; }).join('\n');
    const pick=prompt("اختر رقم النسخة للاسترجاع:\n"+msg); const idx=Number(pick)-1; if(isNaN(idx)||idx<0||idx>=arr.slice(0,5).length) return;
    pushHistory(); vehicles=JSON.parse(JSON.stringify(arr[idx].data)); localStorage.setItem("milveh.v1", JSON.stringify(vehicles)); renderAll(); alert("↩️ تم الاسترجاع.");
  });

  /* ====== زر تعبئة بيانات افتراضية ====== */
  document.getElementById("seedBtn").onclick = () => {
    let n = prompt("كم سجل تجريبي تريد إضافته؟", "5");
    n = parseInt(n);
    if (isNaN(n) || n <= 0) return;

    const existingNums = new Set(vehicles.map(v => v.num));
    let seq = 1;
    const nextNum = () => {
      while (existingNums.has("T-" + seq)) seq++;
      const val = "T-" + seq;
      existingNums.add(val);
      return val;
    };

    const startIndex = vehicles.length;
    for (let i = 0; i < n; i++) {
      const idx = startIndex + i + 1;
      vehicles.push({
        _id: genId(),
        num: nextNum(),
        maker: "شركة " + ((i % 3) + 1),
        name: "مركبة تجريبية " + idx,
        carType: ["جيب", "بيك أب", "صالون", "فان"][i % 4],
        chassis: "CH-T" + idx,
        model: "20" + (18 + (i % 7)),
        color: ["أبيض", "أسود", "أزرق", "رمادي"][i % 4],
        unit: "الوحدة " + ((i % 5) + 1),
        status: ["جاهزة", "صيانة", "منتشرة", "خارج الخدمة"][i % 4],
        note: "سجل افتراضي للتجربة"
      });
    }
    pushHistory();
    save();
    alert("✅ تمت إضافة " + n + " سجلات تجريبية بدون حذف بياناتك الحالية.");
  };

  /* ====== تمرير ====== */
  tableViewport.addEventListener('scroll', renderVirtual);

  /* ====== اختصارات ====== */
  document.addEventListener('keydown',(e)=>{
    const tag=(e.target||{}).tagName||""; if(/input|select|textarea/i.test(tag)) return;
    if(e.key === '/'){ e.preventDefault(); document.getElementById('q')?.focus(); }
    if(e.key && e.key.toLowerCase()==='n'){ e.preventDefault(); document.getElementById('addBtn')?.click(); }
    if(e.key === '?'){ e.preventDefault(); document.getElementById('helpModal')?.classList.add('open'); }
  });
  document.getElementById('helpBtn')?.addEventListener('click', ()=> document.getElementById('helpModal')?.classList.add('open'));

  /* ====== شريط الإجراءات الجماعية ====== */
  function updateSelectedStatus(val){ if(!selected.size) return; if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); pushHistory(); selected.forEach(id=>{ const idx=getIndexById(id); if(idx>=0) vehicles[idx].status=val; }); save(); }
  document.getElementById('bulkDelete').onclick=()=>{ if(!selected.size) return; if(isViewer()) return alert('يتطلب صلاحية محرر/مدير'); if(!confirm(`حذف ${selected.size} سجل؟`)) return; pushHistory(); vehicles=vehicles.filter(v=>!selected.has(v._id)); selected.clear(); save(); };
  document.getElementById('bulkStatusReady').onclick=()=> updateSelectedStatus('جاهزة');
  document.getElementById('bulkStatusMaint').onclick=()=> updateSelectedStatus('صيانة');
  document.getElementById('bulkStatusDeploy').onclick=()=> updateSelectedStatus('منتشرة');
  document.getElementById('bulkStatusOut').onclick=()=> updateSelectedStatus('خارج الخدمة');
  document.getElementById('bulkExportCSV').onclick=()=>{ if(!selected.size) return; const keys=selectedCols.filter(k=>k!=='select'); const rows=[keys.join(',')]; vehicles.forEach((v)=>{ if(selected.has(v._id)) rows.push(keys.map(k=>`"${(v[k]??"").toString().replace(/"/g,'""')}"`).join(',')); }); const blob=new Blob([rows.join('\n')],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='vehicles_selected.csv'; a.click(); URL.revokeObjectURL(a.href); };
  document.getElementById('bulkExportXLSX').onclick=()=>{ if(!selected.size) return; const arr=[]; vehicles.forEach((v)=>{ if(selected.has(v._id)) arr.push(v); }); const ws=XLSX.utils.json_to_sheet(arr); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Selected'); XLSX.writeFile(wb, 'vehicles_selected.xlsx'); };

  /* ====== INIT ====== */
  renderAll();

  /* ====== PWA: Service Worker حقيقي ====== */
  if('serviceWorker' in navigator){
    window.addEventListener('load', function(){
      navigator.serviceWorker.register('./sw.js').catch(function(){ /* ignore */ });
    });
  }

})();
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");

  if (q) {
    // 🔹 اخفي الواجهة الأساسية
    document.querySelector("header").style.display = "none";
    document.querySelector("main").style.display = "none";

    // 🔹 ابحث المركبة المطلوبة (بدل المثال ببياناتك الحقيقية)
    const vehicle = vehicles.find(v => v.num === q);

    if (vehicle) {
      openCardModal(vehicle);  // اعرض البطاقة
    } else {
      document.body.innerHTML = `<h2 style="text-align:center">❌ المركبة برقم ${q} غير موجودة</h2>`;
    }
  }
});
