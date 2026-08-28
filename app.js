// ----------------
// SelfDev v1
// ----------------

let streak = Number(localStorage.getItem("streak")) || 0;
let lastOpen = localStorage.getItem("lastOpen") || "";

let pomodoroTime = Number(localStorage.getItem("pomodoroTime")) || 1500;
let timer = pomodoroTime;

let habits = JSON.parse(localStorage.getItem("habits")) || [];
let goals = JSON.parse(localStorage.getItem("goals")) || [];
let history = JSON.parse(localStorage.getItem("history")) || [];

// Оновлення старих даних
goals.forEach(goal => {
    if (goal.pinned === undefined) goal.pinned = false;
    if (!goal.created) goal.created = new Date().toLocaleString();
    if (!goal.updated) goal.updated = goal.created;
});

habits.forEach(habit => {
    if (habit.pinned === undefined) habit.pinned = false;
    if (!habit.created) habit.created = new Date().toLocaleString();
    if (!habit.updated) habit.updated = habit.created;
});

localStorage.setItem("goals", JSON.stringify(goals));
localStorage.setItem("habits", JSON.stringify(habits));

let xp = Number(localStorage.getItem("xp")) || 0;
let level = Number(localStorage.getItem("level")) || 1;
let theme =
localStorage.getItem("theme") || "dark";

const tabs = document.querySelectorAll(".tab");
const pages = document.querySelectorAll(".page");

tabs.forEach(tab => {

    tab.onclick = () => {

        tabs.forEach(t => t.classList.remove("active"));
        pages.forEach(p => p.classList.remove("active"));

        tab.classList.add("active");

        const page = document.getElementById(tab.dataset.page);

        if (page) {
            page.classList.add("active");
        }

    };

});

function save(){

localStorage.setItem("habits",JSON.stringify(habits));
localStorage.setItem("goals",JSON.stringify(goals));
localStorage.setItem("history", JSON.stringify(history));

localStorage.setItem("xp",xp);
localStorage.setItem("level",level);

localStorage.setItem("streak",streak);
localStorage.setItem("lastOpen",lastOpen);

}

function updateLevel(){

while(xp>=100){

xp-=100;
level++;
showToast("🎊 Новий рівень: "+level);

}

const xpText = document.getElementById("xp");

if(xpText){

xpText.innerText = xp;

}
document.getElementById("level").innerText=level;

const percent=xp%100;

const circle=document.getElementById("xpCircle");

if(circle){

circle.style.strokeDashoffset=
440-(440*percent/100);

}

const bar=document.getElementById("progressBar");

if(bar){

bar.style.width=percent+"%";

}

save();
updateAchievements();
checkAchievements();

}

updateLevel();


let interval = null;

function drawTimer(){

    const timerText = document.getElementById("timerText");

    if(!timerText) return;

    const m = Math.floor(timer / 60);
    const s = timer % 60;

    timerText.innerText =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

}

drawTimer();

document.getElementById("today").innerHTML=
new Date().toLocaleDateString("uk-UA",{

weekday:"long",
day:"numeric",
month:"long"

});

function updateAchievements(){

const text=document.getElementById("achievementText");

const next=document.getElementById("nextLevelText");

if(text){

if(xp>=80){

text.innerHTML="🏅 Майже новий рівень!";

}else if(xp>=50){

text.innerHTML="💪 Гарний прогрес!";

}else if(xp>=20){

text.innerHTML="🔥 Продовжуй!";

}else{

text.innerHTML="🚀 Почни виконувати звички";

}

}

if(next){

next.innerHTML=
"До нового рівня залишилось "+(100-xp)+" XP";

}

}

function checkAchievements(){

const list=document.querySelectorAll("#achievementList li");

if(!list.length) return;

const doneHabits=habits.filter(h=>h.done).length;

if(doneHabits>=1)
list[0].classList.add("unlocked");

if(doneHabits>=10)
list[1].classList.add("unlocked");

if(level>=2)
list[2].classList.add("unlocked");

if(level>=6)
list[3].classList.add("unlocked");

if(level>=11)
list[4].classList.add("unlocked");

}

function renderHabits(){

const list=document.getElementById("habitList");

list.innerHTML="";

habits.sort((a, b) => Number(b.pinned) - Number(a.pinned));
habits.forEach((habit,index)=>{

const li=document.createElement("li");

if(habit.done)
li.classList.add("done");

li.innerHTML=`

<div>

<b>${habit.name}</b><br>

<small>📅 ${habit.created}</small><br>

<small>✏️ ${habit.updated}</small>

</div>

<div>

<button onclick="toggleHabitPin(${index})">

${habit.pinned ? "📌" : "📍"}

</button>

<button onclick="toggleHabit(${index})">

${habit.done ? "↩" : "✔"}

</button>

<button onclick="editHabit(${index})">

✏️

</button>

<button onclick="deleteHabit(${index})">

🗑

</button>

</div>

`;

list.appendChild(li);

});

document.getElementById("habitCount").innerText=
habits.filter(h=>h.done).length;

}

function searchHabits(){

const value=document
.getElementById("habitSearch")
.value
.toLowerCase();

document
.querySelectorAll("#habitList li")
.forEach(li=>{

li.style.display=

li.innerText
.toLowerCase()
.includes(value)

?

"flex"

:

"none";

});

}

function addHabit(){

const input=document.getElementById("habitInput");

if(input.value=="")
return;

if(habits.some(h=>h.name===input.value.trim())){

showToast("Така звичка вже існує");

return;

}

habits.push({
    name: input.value.trim(),
    done: false,
    pinned: false,
    created: new Date().toLocaleString(),
    updated: new Date().toLocaleString()
});

input.value="";

save();
updateHistory();
renderHabits();
updateStats();
updateDayProgress();

}

function toggleHabit(index){

habits[index].done=!habits[index].done;

if(habits[index].done){

xp+=10;
showToast("+10 XP 🎉");

updateLevel();

updateStats();

checkAchievements();

}

save();
renderHabits();
updateDayProgress();

}

async function deleteHabit(index){

if(!(await customConfirm("Видалити звичку?"))) return;

habits.splice(index,1);

save();
renderHabits();
updateStats();
updateDayProgress();

}

async function editHabit(index){

const text = await customPrompt(

"Редагувати звичку",

habits[index].name

);

if(text===null) return;

if(text.trim()=="") return;

habits[index].name=text;
habits[index].updated = new Date().toLocaleString();


save();

renderHabits();

}

function renderGoals(){

const list=document.getElementById("goalList");

list.innerHTML="";

goals.forEach(goal => {
    if (goal.pinned === undefined) goal.pinned = false;
    if (!goal.created) goal.created = new Date().toLocaleString();
    if (!goal.updated) goal.updated = goal.created;
});
goals.sort((a, b) => Number(b.pinned) - Number(a.pinned));
goals.forEach((goal,index)=>{

const li=document.createElement("li");

if(goal.done)
li.classList.add("done");

li.innerHTML=`

<div>

<b>${goal.name}</b><br>

<small>📅 ${goal.created}</small><br>

<small>✏️ ${goal.updated}</small>

</div>

<div>

<button onclick="togglePin(${index})">

${goal.pinned ? "📌" : "📍"}

</button>

<button onclick="toggleGoal(${index})">

${goal.done ? "↩" : "✔"}

</button>

<button onclick="editGoal(${index})">

✏️

</button>

<button onclick="deleteGoal(${index})">

🗑

</button>

</div>

`;

list.appendChild(li);

});

}

function addGoal(){

const input=document.getElementById("goalInput");

if(input.value.trim()=="") return;

if(goals.some(g=>g.name===input.value.trim())){

showToast("Така ціль вже існує");

return;

}

goals.push({
    name: input.value.trim(),
    done: false,
    pinned: false,
    created: new Date().toLocaleString(),
    updated: new Date().toLocaleString()
});

input.value="";

save();

renderGoals();
updateStats();
checkAchievements();
updateDayProgress();


}

function toggleGoal(index){

goals[index].done=!goals[index].done;

if(goals[index].done){

xp+=25;
showToast("+25 XP 🏆");

updateLevel();

}

save();
updateHistory();


renderGoals();
updateStats();
checkAchievements();
updateDayProgress();

}

async function deleteGoal(index){

if(!(await customConfirm("Видалити ціль?"))) return;

goals.splice(index,1);

save();

renderGoals();
updateStats();
updateDayProgress();

}

async function editGoal(index){

const text = await customPrompt(

"Редагувати ціль",

goals[index].name

);

if(text===null) return;

if(text.trim()=="") return;

goals[index].name=text;
goals[index].updated = new Date().toLocaleString();

save();

renderGoals();

}

function updateStats(){

const habitsDone=habits.filter(h=>h.done).length;
const goalsDone=goals.filter(g=>g.done).length;

const habit=document.getElementById("habitCount");
const goal=document.getElementById("goalCount");
const streakText=document.getElementById("streakCount");

if(habit) habit.innerText=habitsDone;

if(goal) goal.innerText=goalsDone;

if(streakText) streakText.innerText=streak+" 🔥";

}

function updateDayProgress(){

const total = habits.length + goals.length;

const done =
habits.filter(h=>h.done).length +
goals.filter(g=>g.done).length;

const percent =
total===0 ? 0 : Math.round(done/total*100);

const bar=document.getElementById("dayProgress");

if(bar){

bar.style.width=percent+"%";

}

const text=document.getElementById("dayProgressText");

if(text){

text.innerText=percent+"% виконано";

}

syncWidgetData();

}

function updateStreak(){

const today = new Date().toLocaleDateString();

if(lastOpen != today){

if(lastOpen != ""){

habits.forEach(h=>{

h.done=false;

});

}

lastOpen=today;

streak++;

save();

renderHabits();
updateStats();

}

}

function startTimer(){

if(interval) return;

interval = setInterval(()=>{

timer--;

drawTimer();

if(timer<=0){

clearInterval(interval);

interval=null;

xp+=20;

updateLevel();

customAlert("🎉 Pomodoro завершено!");

timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

drawTimer();

}

},1000);

}

function resetTimer(){

clearInterval(interval);

interval=null;

timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

drawTimer();

}

function toggleTheme(){

if(theme=="dark"){

theme="light";

document.body.classList.add("light");

}else{

theme="dark";

document.body.classList.remove("light");

}

localStorage.setItem("theme",theme);

}

if(theme=="light"){

document.body.classList.add("light");

}

const note = document.getElementById("note");

if(note){

note.value = localStorage.getItem("note") || "";

}

function showDailyQuote(){

const days =
Math.floor(Date.now()/86400000);

const quote =
quotes[days % quotes.length];

const q=document.getElementById("quoteText");

q.style.opacity=0;

setTimeout(()=>{

q.innerText=quote.text;

q.style.opacity=1;

},250);

document.getElementById("quoteCategory").innerText =
quote.category;

}

function showToast(text){

const toast=document.getElementById("toast");

toast.innerText=text;

toast.classList.add("show");

setTimeout(()=>{

toast.classList.remove("show");

},2500);

}

function exportData(){

const data={

habits,
goals,
xp,
level,
streak,
note:localStorage.getItem("note")||""

};

const blob=new Blob(

[JSON.stringify(data)],

{type:"application/json"}

);

const a=document.createElement("a");

a.href=URL.createObjectURL(blob);

a.download="SelfDev_Backup.json";

a.click();

showToast("💾 Дані експортовано");

}

function importData(event){

const file=event.target.files[0];

if(!file) return;

const reader=new FileReader();

reader.onload=function(){

const data=JSON.parse(reader.result);

habits=data.habits||[];

goals=data.goals||[];

xp=data.xp||0;

level=data.level||1;

streak=data.streak||0;

localStorage.setItem("note",data.note||"");

save();

location.reload();

};

reader.readAsText(file);

}

function saveNote(){

const note = document.getElementById("note").value;

localStorage.setItem("note", note);

showToast("📖 Нотатку збережено");

}

function togglePin(index){

    goals[index].pinned = !goals[index].pinned;

    save();

    renderGoals();

}

function toggleHabitPin(index){

    habits[index].pinned = !habits[index].pinned;

    save();

    renderHabits();

}

function savePomodoroTime(){

    const minutes = Number(document.getElementById("pomodoroMinutes").value);

    if(minutes < 1 || minutes > 180){
        customAlert("Введіть від 1 до 180 хвилин");
        return;
    }

    pomodoroTime = minutes * 60;
    timer = pomodoroTime;

    localStorage.setItem("pomodoroTime", pomodoroTime);

    drawTimer();

    showToast("🍅 Час Pomodoro збережено");

}

function changePomodoro(step){

    const input = document.getElementById("pomodoroMinutes");

    let value = Number(input.value);

    value += step;

    if(value < 1) value = 1;
    if(value > 180) value = 180;

    input.value = value;

}

function openMoreMenu() {

    document.getElementById("moreMenu").classList.add("show");

}

function closeMoreMenu() {

    document.getElementById("moreMenu").classList.remove("show");

}

document.getElementById("moreBtn").onclick = openMoreMenu;

// ----------------
// Власне модальне вікно замість confirm()/prompt()/alert()
// (у встановлених PWA нативні діалоги браузера часто блокуються або
// миттєво повертають "скасовано", тому видалення/редагування не спрацьовувало)
// ----------------

function showModal({message, showInput = false, inputValue = "", showCancel = true, okText = "OK", cancelText = "Скасувати"}){

    return new Promise(resolve => {

        const overlay = document.getElementById("customModal");
        const msgEl = document.getElementById("modalMessage");
        const inputEl = document.getElementById("modalInput");
        const okBtn = document.getElementById("modalOkBtn");
        const cancelBtn = document.getElementById("modalCancelBtn");

        msgEl.innerText = message;

        if(showInput){
            inputEl.style.display = "block";
            inputEl.value = inputValue;
        }else{
            inputEl.style.display = "none";
        }

        cancelBtn.style.display = showCancel ? "inline-block" : "none";

        okBtn.innerText = okText;
        cancelBtn.innerText = cancelText;

        overlay.classList.add("show");

        function cleanup(){
            overlay.classList.remove("show");
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            overlay.onclick = null;
        }

        okBtn.onclick = () => {
            const value = showInput ? inputEl.value : true;
            cleanup();
            resolve(value);
        };

        cancelBtn.onclick = () => {
            cleanup();
            resolve(showInput ? null : false);
        };

        overlay.onclick = (e) => {
            if(e.target === overlay){
                cleanup();
                resolve(showInput ? null : false);
            }
        };

        if(showInput){

            setTimeout(() => {
                inputEl.focus();
                inputEl.select();
            }, 50);

            inputEl.onkeydown = (e) => {
                if(e.key === "Enter") okBtn.onclick();
            };

        }

    });

}

function customConfirm(message){
    return showModal({ message, showInput: false });
}

function customPrompt(message, defaultValue = ""){
    return showModal({ message, showInput: true, inputValue: defaultValue });
}

function customAlert(message){
    return showModal({ message, showInput: false, showCancel: false, okText: "Гаразд" });
}

function openPage(page){

    closeMoreMenu();

    tabs.forEach(t => t.classList.remove("active"));
    pages.forEach(p => p.classList.remove("active"));

    const pageElement = document.getElementById(page);

    if(pageElement){
        pageElement.classList.add("active");
    }

    const tab = document.querySelector(`.tab[data-page="${page}"]`);

    if(tab){
        tab.classList.add("active");
    }

}

function updateHistory(){

    const today = new Date().toISOString().slice(0,10);

    const doneHabits = habits.filter(h => h.done).length;
    const doneGoals = goals.filter(g => g.done).length;

    const total = habits.length + goals.length;
    const done = doneHabits + doneGoals;

    const percent = total === 0
        ? 0
        : Math.round(done / total * 100);

    let day = history.find(d => d.date === today);

    if(!day){

        day = {
            date: today,
            percent: percent
        };

        history.push(day);

    }else{

        day.percent = percent;

    }

    save();

}

function drawAchievementChart(){

    const canvas = document.getElementById("achievementChart");

    if(!canvas) return;

    const ctx = canvas.getContext("2d");

    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0,0,w,h);

    // фон
    ctx.fillStyle="#111827";
    ctx.fillRect(0,0,w,h);

    // сітка

    ctx.strokeStyle="#2d3748";

    for(let i=0;i<=5;i++){

        const y = 20 + i*40;

        ctx.beginPath();

        ctx.moveTo(0,y);

        ctx.lineTo(w,y);

        ctx.stroke();

    }

}

window.addEventListener("load", () => {

    renderHabits();
    renderGoals();
    updateStats();
    updateDayProgress();
    showDailyQuote();
    updateStreak();
    updateAchievements();
    checkAchievements();
    drawAchievementChart();

});

if("serviceWorker" in navigator){

navigator.serviceWorker.register("sw.js");

}

// ----------------
// Встановлення застосунку (Android / Desktop Chrome, Edge)
// ----------------

let deferredInstallPrompt = null;

function isStandalone(){

    return window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;

}

window.addEventListener("beforeinstallprompt", (event) => {

    event.preventDefault();

    deferredInstallPrompt = event;

    const btn = document.getElementById("installBtn");

    if(btn && !isStandalone()){
        btn.style.display = "inline-block";
    }

});

function installApp(){

    const btn = document.getElementById("installBtn");

    if(!deferredInstallPrompt){
        showToast("Застосунок вже встановлено або недоступно тут");
        return;
    }

    deferredInstallPrompt.prompt();

    deferredInstallPrompt.userChoice.then(choice => {

        if(choice.outcome === "accepted"){
            showToast("✅ SelfDev встановлено");
        }

        deferredInstallPrompt = null;

        if(btn) btn.style.display = "none";

    });

}

window.addEventListener("appinstalled", () => {

    const btn = document.getElementById("installBtn");

    if(btn) btn.style.display = "none";

    showToast("✅ SelfDev встановлено на пристрій");

});

// ----------------
// Підказка для iOS (Safari не підтримує beforeinstallprompt)
// ----------------

function checkIosInstallHint(){

    const isIos = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

    const hint = document.getElementById("iosInstallHint");

    if(hint && isIos && !isStandalone()){
        hint.style.display = "block";
    }

}

// ----------------
// Відкриття сторінки за посиланням-ярликом (наприклад ?page=habits)
// ----------------

function openPageFromQuery(){

    const params = new URLSearchParams(window.location.search);

    const page = params.get("page");

    if(page && document.getElementById(page)){
        openPage(page);
    }

}

window.addEventListener("load", () => {

    checkIosInstallHint();
    openPageFromQuery();

});

// ----------------
// Сповіщення-нагадування (Думка дня + цілі на сьогодні)
// ----------------

const NOTIF_KEY = "notifEnabled";
const NOTIF_LAST_SHOWN_KEY = "notifLastShown";

function notificationsEnabled(){

    return localStorage.getItem(NOTIF_KEY) === "1";

}

function updateNotifButton(){

    const btn = document.getElementById("notifBtn");

    if(!btn) return;

    if(!("Notification" in window)){
        btn.style.display = "none";
        return;
    }

    if(Notification.permission === "denied"){
        btn.innerText = "🔕 Сповіщення заблоковано в браузері";
        btn.disabled = true;
        return;
    }

    btn.innerText = notificationsEnabled()
        ? "🔔 Нагадування увімкнено (вимкнути)"
        : "🔕 Увімкнути нагадування";

}

async function toggleNotifications(){

    if(!("Notification" in window)){
        showToast("Сповіщення не підтримуються цим браузером");
        return;
    }

    if(notificationsEnabled()){

        localStorage.setItem(NOTIF_KEY,"0");
        updateNotifButton();
        showToast("🔕 Нагадування вимкнено");
        return;

    }

    const permission = await Notification.requestPermission();

    if(permission !== "granted"){

        showToast("Дозвіл на сповіщення не надано");
        updateNotifButton();
        return;

    }

    localStorage.setItem(NOTIF_KEY,"1");

    updateNotifButton();

    showToast("🔔 Нагадування увімкнено");

    tryRegisterPeriodicSync();

    maybeShowDailyReminder();

}

function buildReminderText(){

    const days = Math.floor(Date.now()/86400000);

    const quote = quotes[days % quotes.length];

    const openGoals = goals.filter(g=>!g.done).length;

    let body = quote.text;

    if(openGoals > 0){
        body += `\n🎯 Сьогодні ще не виконано цілей: ${openGoals}`;
    }else if(goals.length > 0){
        body += `\n✅ Усі цілі на сьогодні виконано!`;
    }

    return body;

}

async function maybeShowDailyReminder(){

    if(!notificationsEnabled()) return;

    if(!("Notification" in window) || Notification.permission !== "granted") return;

    const today = new Date().toLocaleDateString();

    if(localStorage.getItem(NOTIF_LAST_SHOWN_KEY) === today) return;

    const body = buildReminderText();

    try{

        if("serviceWorker" in navigator){

            const reg = await navigator.serviceWorker.ready;

            await reg.showNotification("🚀 SelfDev — Думка дня", {
                body: body,
                icon: "icon-192.png",
                badge: "icon-192.png",
                tag: "selfdev-daily"
            });

        }else{

            new Notification("🚀 SelfDev — Думка дня", { body: body, icon: "icon-192.png" });

        }

        localStorage.setItem(NOTIF_LAST_SHOWN_KEY, today);

    }catch(e){

        console.error("Notification error", e);

    }

}

async function tryRegisterPeriodicSync(){

    if(!("serviceWorker" in navigator)) return;

    try{

        const reg = await navigator.serviceWorker.ready;

        if("periodicSync" in reg){

            const status = await navigator.permissions.query({ name: "periodic-background-sync" });

            if(status.state === "granted"){

                await reg.periodicSync.register("selfdev-daily-reminder", {
                    minInterval: 12 * 60 * 60 * 1000
                });

            }

        }

    }catch(e){

        // Periodic Background Sync недоступний у цьому браузері (наприклад Safari/Firefox) — це нормально

    }

}

document.addEventListener("visibilitychange", () => {

    if(document.visibilityState === "visible"){
        maybeShowDailyReminder();
    }

});

window.addEventListener("load", () => {

    updateNotifButton();

    if(notificationsEnabled() && "Notification" in window && Notification.permission === "granted"){

        tryRegisterPeriodicSync();
        maybeShowDailyReminder();

    }

});

// ----------------
// Windows Widgets Board — надсилаємо актуальні дані у service worker,
// щоб він міг оновити плитку у Widgets Board (лише Edge / Windows 11)
// ----------------

function syncWidgetData(){

    if(!("serviceWorker" in navigator) || !navigator.serviceWorker.controller) return;

    const days = Math.floor(Date.now()/86400000);

    const quote = quotes[days % quotes.length];

    const openGoals = goals.filter(g=>!g.done).length;

    let goalsSummary;

    if(goals.length === 0){
        goalsSummary = "Ще немає цілей — додай першу в застосунку";
    }else if(openGoals === 0){
        goalsSummary = "✅ Усі цілі на сьогодні виконано!";
    }else{
        goalsSummary = `🎯 Ще не виконано: ${openGoals} із ${goals.length}`;
    }

    navigator.serviceWorker.controller.postMessage({
        type: "update-widget",
        payload: {
            quoteText: quote.text,
            goalsSummary: goalsSummary
        }
    });

}

// Відповідаємо, коли ОС щойно встановила віджет і просить свіжі дані
if("serviceWorker" in navigator){

    navigator.serviceWorker.addEventListener("message", event => {

        if(event.data && event.data.type === "widget-installed"){
            syncWidgetData();
        }

    });

}

window.addEventListener("load", () => {

    if("serviceWorker" in navigator){

        navigator.serviceWorker.ready.then(() => syncWidgetData());

    }

});
