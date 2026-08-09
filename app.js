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
    if (!goal.createdAt) goal.createdAt = Date.now();
    if (goal.deadline === undefined) goal.deadline = null;
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

// ---- Хмарна синхронізація ----
let cloudConfig = JSON.parse(localStorage.getItem("cloudConfig") || "null");
let syncCode = localStorage.getItem("syncCode") || "";
let autoSync = localStorage.getItem("autoSync") === "1";
let cloudDb = null;
let syncDebounce = null;

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

        redrawChartsFor(tab.dataset.page);

    };

});

function redrawChartsFor(page){

    if(page==="achievements") drawAchievementChart();
    if(page==="stats") drawHistoryStatsChart();

}

function save(){

localStorage.setItem("habits",JSON.stringify(habits));
localStorage.setItem("goals",JSON.stringify(goals));
localStorage.setItem("history", JSON.stringify(history));

localStorage.setItem("xp",xp);
localStorage.setItem("level",level);

localStorage.setItem("streak",streak);
localStorage.setItem("lastOpen",lastOpen);

if(autoSync && cloudConfig && syncCode){

clearTimeout(syncDebounce);

syncDebounce = setTimeout(()=>pushToCloud(true), 1500);

}

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

const SWIPE_THRESHOLD = 90;
const SWIPE_MAX = 140;

function attachSwipe(li, onSwipeRight, onSwipeLeft){

const content = li.querySelector(".swipe-content");

if(!content) return;

let startX = 0, startY = 0, dx = 0;
let dragging = false, decided = false, horizontal = false;

content.addEventListener("touchstart", (e)=>{

const t = e.touches[0];

startX = t.clientX;
startY = t.clientY;
dx = 0;
dragging = true;
decided = false;
horizontal = false;

content.style.transition = "none";

}, {passive:true});

content.addEventListener("touchmove", (e)=>{

if(!dragging) return;

const t = e.touches[0];

const moveX = t.clientX - startX;
const moveY = t.clientY - startY;

if(!decided){

if(Math.abs(moveX) > 10 || Math.abs(moveY) > 10){

decided = true;
horizontal = Math.abs(moveX) > Math.abs(moveY);

}

}

if(decided && horizontal){

e.preventDefault();

dx = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, moveX));

content.style.transform = `translateX(${dx}px)`;

}

}, {passive:false});

content.addEventListener("touchend", ()=>{

if(!dragging) return;

dragging = false;

content.style.transition = "transform .25s ease";

if(dx > SWIPE_THRESHOLD){

content.style.transform = `translateX(${SWIPE_MAX}px)`;
setTimeout(onSwipeRight, 130);

}else if(dx < -SWIPE_THRESHOLD){

content.style.transform = `translateX(${-SWIPE_MAX}px)`;
setTimeout(onSwipeLeft, 130);

}else{

content.style.transform = "translateX(0)";

}

dx = 0;

});

content.addEventListener("touchcancel", ()=>{

dragging = false;
content.style.transition = "transform .25s ease";
content.style.transform = "translateX(0)";
dx = 0;

});

}

function renderHabits(){

const list=document.getElementById("habitList");

list.innerHTML="";

habits.sort((a, b) => Number(b.pinned) - Number(a.pinned));
habits.forEach((habit,index)=>{

const li=document.createElement("li");

li.classList.add("swipe-item");

if(habit.done)
li.classList.add("done");

li.innerHTML=`

<div class="swipe-bg swipe-bg-done">✔ Виконано</div>

<div class="swipe-bg swipe-bg-delete">🗑 Видалити</div>

<div class="swipe-content">

<div>

<b>${habit.name}</b><br>

<small>📅 ${habit.created}</small><br>

<small>✏️ ${habit.updated}</small>

</div>

<div>

<button onclick="toggleHabitPin(${index})">

${habit.pinned ? "📌" : "📍"}

</button>

<button onclick="editHabit(${index})">

✏️

</button>

</div>

</div>

`;

list.appendChild(li);

});

list.querySelectorAll("li").forEach((li,index)=>{

attachSwipe(li, ()=>toggleHabit(index), ()=>deleteHabit(index));

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

function searchGoals(){

const value=document
.getElementById("goalSearch")
.value
.toLowerCase();

document
.querySelectorAll("#goalList li")
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

function deleteHabit(index){

if(!confirm("Видалити звичку?")){

renderHabits();

return;

}

habits.splice(index,1);

save();
renderHabits();
updateStats();
updateDayProgress();

}

function editHabit(index){

const text=prompt(

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
    if (!goal.createdAt) goal.createdAt = Date.now();
    if (goal.deadline === undefined) goal.deadline = null;
});
goals.sort((a, b) => Number(b.pinned) - Number(a.pinned));
goals.forEach((goal,index)=>{

const li=document.createElement("li");

li.classList.add("swipe-item");

if(goal.done)
li.classList.add("done");

li.innerHTML=`

<div class="swipe-bg swipe-bg-done">✔ Виконано</div>

<div class="swipe-bg swipe-bg-delete">🗑 Видалити</div>

<div class="swipe-content">

<div>

<b>${goal.name}</b><br>

<small>📅 ${goal.created}</small><br>

<small>✏️ ${goal.updated}</small>

${deadlineMarkup(goal)}

</div>

<div>

<button onclick="togglePin(${index})">

${goal.pinned ? "📌" : "📍"}

</button>

<button onclick="editGoal(${index})">

✏️

</button>

</div>

</div>

`;

list.appendChild(li);

});

list.querySelectorAll("li").forEach((li,index)=>{

attachSwipe(li, ()=>toggleGoal(index), ()=>deleteGoal(index));

});

}

function deadlineMarkup(goal){

if(!goal.deadline) return "";

const deadlineTs = new Date(goal.deadline).getTime();

if(isNaN(deadlineTs)) return "";

const createdTs = goal.createdAt || deadlineTs;
const now = Date.now();

const totalSpan = deadlineTs - createdTs;
const elapsed = now - createdTs;

let percent = totalSpan > 0 ? Math.round(elapsed / totalSpan * 100) : 100;
percent = Math.max(0, Math.min(100, percent));

const daysLeft = Math.ceil((deadlineTs - now) / 86400000);
const overdue = daysLeft < 0 && !goal.done;

let label;

if(goal.done){
    label = "✅ Завершено";
}else if(overdue){
    label = `⛔ Прострочено на ${Math.abs(daysLeft)} дн.`;
}else if(daysLeft===0){
    label = "⏰ Дедлайн сьогодні";
}else{
    label = `⏳ Залишилось ${daysLeft} дн.`;
}

return `
<div class="goal-deadline">
<div class="deadline-bar"><div class="deadline-fill ${overdue ? "overdue" : ""}" style="width:${percent}%"></div></div>
<small>${label}</small>
</div>
`;

}

function addGoal(){

const input=document.getElementById("goalInput");
const deadlineInput=document.getElementById("goalDeadline");

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
    updated: new Date().toLocaleString(),
    createdAt: Date.now(),
    deadline: deadlineInput && deadlineInput.value ? deadlineInput.value : null
});

input.value="";
if(deadlineInput) deadlineInput.value="";

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

function deleteGoal(index){

if(!confirm("Видалити ціль?")){

renderGoals();

return;

}

goals.splice(index,1);

save();

renderGoals();
updateStats();
updateDayProgress();

}

function editGoal(index){

const text=prompt(

"Редагувати ціль",

goals[index].name

);

if(text===null) return;

if(text.trim()=="") return;

goals[index].name=text;

const deadlineText=prompt(

"Дедлайн (РРРР-ММ-ДД), залиште порожнім щоб прибрати",

goals[index].deadline || ""

);

if(deadlineText!==null){

goals[index].deadline = deadlineText.trim() || null;

}

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

setTimerBtnState();

xp+=20;

updateLevel();

showToast("🎉 Pomodoro завершено! +20 XP");

if(navigator.vibrate) navigator.vibrate([200,100,200]);

timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

drawTimer();

}

},1000);

setTimerBtnState();

}

function pauseTimer(){

clearInterval(interval);

interval=null;

setTimerBtnState();

}

function toggleTimer(){

if(interval){

pauseTimer();

}else{

startTimer();

}

}

function setTimerBtnState(){

const btn=document.getElementById("timerToggleBtn");

if(!btn) return;

btn.innerText = interval ? "⏸ Пауза" : "▶️ Старт";

}

function resetTimer(){

clearInterval(interval);

interval=null;

timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

drawTimer();

setTimerBtnState();

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

function showDailyQuote(retryCount){

retryCount = retryCount || 0;

const q=document.getElementById("quoteText");
const cat=document.getElementById("quoteCategory");

if(!q || !cat) return;

// quotes.js could still be loading (slow network, CDN hiccup) — retry a few times
if(typeof quotes === "undefined" || !Array.isArray(quotes) || quotes.length === 0){

if(retryCount < 10){

setTimeout(()=>showDailyQuote(retryCount+1), 300);

}else{

console.warn("quotes.js не завантажився — картка \"Думка дня\" залишиться порожньою");

q.innerText = "Не вдалося завантажити цитату дня 🙁";
cat.innerText = "";

}

return;

}

const days = Math.floor(Date.now()/86400000);

const quote = quotes[days % quotes.length];

q.style.opacity=0;

setTimeout(()=>{

q.innerText=quote.text;

q.style.opacity=1;

},250);

cat.innerText = quote.category;

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
        alert("Введіть від 1 до 180 хвилин");
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

document.getElementById("moreMenu").addEventListener("click", (e)=>{

    if(e.target.id==="moreMenu"){

        closeMoreMenu();

    }

});

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

    redrawChartsFor(page);

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

let achievementChartInstance = null;
let historyChartInstance = null;

function last14Days(){

    const days = [];

    for(let i=13;i>=0;i--){

        const d = new Date(Date.now() - i*86400000);
        const iso = d.toISOString().slice(0,10);

        const entry = history.find(h=>h.date===iso);

        days.push({

            label: d.toLocaleDateString("uk-UA",{day:"numeric",month:"short"}),
            percent: entry ? entry.percent : 0

        });

    }

    return days;

}

function drawHistoryChart(canvasId){

    const canvas = document.getElementById(canvasId);

    if(!canvas || typeof Chart==="undefined") return null;

    const days = last14Days();

    return new Chart(canvas, {

        type: "line",

        data: {

            labels: days.map(d=>d.label),

            datasets: [{

                label: "% виконано за день",
                data: days.map(d=>d.percent),
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,.25)",
                tension: .35,
                fill: true,
                pointRadius: 3,
                pointBackgroundColor: "#8b5cf6"

            }]

        },

        options: {

            responsive: true,

            plugins: {

                legend: { display: false }

            },

            scales: {

                y: {

                    min: 0,
                    max: 100,
                    ticks: { color: "#94a3b8" },
                    grid: { color: "rgba(148,163,184,.15)" }

                },

                x: {

                    ticks: { color: "#94a3b8", maxRotation: 0, autoSkip: true },
                    grid: { display: false }

                }

            }

        }

    });

}

function drawAchievementChart(){

    if(achievementChartInstance){

        achievementChartInstance.destroy();

    }

    achievementChartInstance = drawHistoryChart("achievementChart");

}

function drawHistoryStatsChart(){

    if(historyChartInstance){

        historyChartInstance.destroy();

    }

    historyChartInstance = drawHistoryChart("historyChart");

}

// ---- Хмарна синхронізація: функції ----

function loadScript(src){

return new Promise((resolve, reject)=>{

const s = document.createElement("script");

s.src = src;
s.onload = resolve;
s.onerror = reject;

document.head.appendChild(s);

});

}

async function initFirebase(){

if(cloudDb) return cloudDb;

if(!cloudConfig) return null;

if(!window.firebase){

await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
await loadScript("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js");

}

if(!firebase.apps.length){

firebase.initializeApp(cloudConfig);

}

cloudDb = firebase.firestore();

return cloudDb;

}

function toggleSyncSetup(){

const el = document.getElementById("syncSetup");

if(el) el.style.display = el.style.display === "none" ? "block" : "none";

}

function generateSyncCode(){

const code = Math.random().toString(36).slice(2, 8).toUpperCase();

const el = document.getElementById("syncCode");

if(el) el.value = code;

}

function updateSyncStatus(text){

const el = document.getElementById("syncStatus");

if(el) el.innerText = text;

}

async function connectCloud(){

const configText = document.getElementById("cloudConfigInput").value.trim();
const code = document.getElementById("syncCode").value.trim();

if(!configText || !code){

showToast("Вкажіть конфігурацію Firebase і код синхронізації");

return;

}

try{

cloudConfig = JSON.parse(configText);

}catch(e){

showToast("⚠️ Невірний формат конфігурації Firebase");

return;

}

syncCode = code;
cloudDb = null;

localStorage.setItem("cloudConfig", JSON.stringify(cloudConfig));
localStorage.setItem("syncCode", syncCode);

updateSyncStatus("Підключення...");

try{

await initFirebase();

showToast("☁️ Підключено");

updateSyncStatus("Підключено. Код: " + syncCode);

}catch(e){

console.error(e);

showToast("⚠️ Не вдалося підключитись");

updateSyncStatus("Помилка підключення");

}

}

async function pushToCloud(silent){

if(!cloudConfig || !syncCode){

if(!silent) showToast("Спочатку підключіть хмару");

return;

}

try{

const db = await initFirebase();

await db.collection("selfdev_sync").doc(syncCode).set({

habits,
goals,
xp,
level,
streak,
note: localStorage.getItem("note") || "",
updatedAt: Date.now()

});

if(!silent) showToast("⬆️ Дані збережено в хмару");

updateSyncStatus("Синхронізовано: " + new Date().toLocaleTimeString());

}catch(e){

console.error(e);

if(!silent) showToast("⚠️ Помилка синхронізації");

updateSyncStatus("Помилка синхронізації");

}

}

async function pullFromCloud(){

if(!cloudConfig || !syncCode){

showToast("Спочатку підключіть хмару");

return;

}

if(!confirm("Замінити дані на цьому пристрої даними з хмари?")) return;

try{

const db = await initFirebase();

const doc = await db.collection("selfdev_sync").doc(syncCode).get();

if(!doc.exists){

showToast("Немає даних у хмарі для цього коду");

return;

}

const data = doc.data();

habits = data.habits || [];
goals = data.goals || [];
xp = data.xp || 0;
level = data.level || 1;
streak = data.streak || 0;

localStorage.setItem("note", data.note || "");

save();

showToast("⬇️ Дані завантажено з хмари");

location.reload();

}catch(e){

console.error(e);

showToast("⚠️ Помилка завантаження");

updateSyncStatus("Помилка завантаження");

}

}

function toggleAutoSync(){

autoSync = document.getElementById("autoSyncCheckbox").checked;

localStorage.setItem("autoSync", autoSync ? "1" : "0");

if(autoSync){

showToast("☁️ Автосинхронізація увімкнена");

}

}

function initSyncUI(){

const cfgEl = document.getElementById("cloudConfigInput");
const codeEl = document.getElementById("syncCode");
const autoEl = document.getElementById("autoSyncCheckbox");

if(cfgEl && cloudConfig) cfgEl.value = JSON.stringify(cloudConfig);
if(codeEl && syncCode) codeEl.value = syncCode;
if(autoEl) autoEl.checked = autoSync;

if(cloudConfig && syncCode){

updateSyncStatus("Підключено. Код: " + syncCode);

}

}

window.addEventListener("load", () => {

    const steps = [
        renderHabits,
        renderGoals,
        updateStats,
        updateDayProgress,
        showDailyQuote,
        updateStreak,
        updateAchievements,
        checkAchievements,
        setTimerBtnState,
        initSyncUI
    ];

    steps.forEach(fn => {

        try{

            fn();

        }catch(e){

            console.error("Помилка ініціалізації ("+fn.name+"):", e);

        }

    });

});

if("serviceWorker" in navigator){

navigator.serviceWorker.register("sw.js");

}
