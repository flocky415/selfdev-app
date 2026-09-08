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

let habitSortMode = localStorage.getItem("habitSortMode") || "pinned";
let goalSortMode = localStorage.getItem("goalSortMode") || "pinned";

let xp = Number(localStorage.getItem("xp")) || 0;
let level = Number(localStorage.getItem("level")) || 1;

let unlockedAchievements = JSON.parse(localStorage.getItem("unlockedAchievements")) || [];

const achievementDefs = [
    { name:"Перше виконане завдання", check: ()=> habits.filter(h=>h.done).length>=1 },
    { name:"10 виконаних звичок", check: ()=> habits.filter(h=>h.done).length>=10 },
    { name:"100 XP", check: ()=> level>=2 },
    { name:"500 XP", check: ()=> level>=6 },
    { name:"1000 XP", check: ()=> level>=11 }
];
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

function animateNumber(el, to, suffix){

    if(!el) return;

    suffix = suffix || "";

    const from = Number(el.dataset.value) || 0;

    if(from === to){
        el.innerText = to + suffix;
        el.dataset.value = to;
        return;
    }

    const duration = 600;
    const start = performance.now();

    function step(now){

        const progress = Math.min((now-start)/duration, 1);
        const eased = 1 - Math.pow(1-progress, 3);
        const value = Math.round(from + (to-from)*eased);

        el.innerText = value + suffix;

        if(progress < 1){
            requestAnimationFrame(step);
        }else{
            el.innerText = to + suffix;
            el.dataset.value = to;
        }

    }

    requestAnimationFrame(step);

}

function playCheckAnimation(li){

    if(!li) return;

    const mark = document.createElement("span");

    mark.className = "check-pop";
    mark.innerText = "✓";

    li.appendChild(mark);

    setTimeout(()=> mark.remove(), 700);

}

function showLevelUpCelebration(newLevel){

    const overlay = document.getElementById("levelUpOverlay");
    const numberEl = document.getElementById("levelUpNumber");

    if(!overlay) return;

    if(numberEl) numberEl.innerText = newLevel;

    overlay.classList.remove("show");

    void overlay.offsetWidth;

    overlay.classList.add("show");

    launchConfetti();

    setTimeout(()=> overlay.classList.remove("show"), 1900);

}

function updateLevel(){

let leveledUp=false;

while(xp>=100){

xp-=100;
level++;
leveledUp=true;
showToast("🎊 Новий рівень: "+level);

}

const xpText = document.getElementById("xp");

if(xpText){

xpText.innerText = xp;

}
animateNumber(document.getElementById("level"), level);

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

if(leveledUp){

showLevelUpCelebration(level);

}

save();
updateAchievements();
checkAchievements();

}

try{
    updateLevel();
}catch(e){
    console.error("updateLevel init:", e);
}

let interval = null;

function drawTimer(){

    const timerText = document.getElementById("timerText");

    if(!timerText) return;

    const m = Math.floor(timer / 60);
    const s = timer % 60;

    timerText.innerText =
    `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

}

try{
    drawTimer();
}catch(e){
    console.error("drawTimer init:", e);
}

try{
    document.getElementById("today").innerHTML=
    new Date().toLocaleDateString("uk-UA",{

    weekday:"long",
    day:"numeric",
    month:"long"

    });
}catch(e){
    console.error("today date init:", e);
}

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

achievementDefs.forEach((def, i)=>{

    if(!list[i]) return;

    const unlocked = def.check();

    if(unlocked){

        list[i].classList.add("unlocked");

        if(!unlockedAchievements.includes(i)){

            unlockedAchievements.push(i);

            localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));

            showAchievementModal(def.name);

        }

    }

});

}

function showAchievementModal(name){

    const modal = document.getElementById("achievementModal");
    const title = document.getElementById("achievementModalTitle");

    if(!modal || !title) return;

    title.innerText = "🏆 " + name;

    modal.classList.add("show");

    launchConfetti();

}

function closeAchievementModal(){

    const modal = document.getElementById("achievementModal");

    if(modal) modal.classList.remove("show");

}

function setHabitSort(value){

    habitSortMode = value;

    localStorage.setItem("habitSortMode", value);

    renderHabits();

}

function getHabitOrder(){

    const indices = habits.map((_, i) => i);

    indices.sort((a, b) => {

        const ha = habits[a], hb = habits[b];

        switch(habitSortMode){

            case "newest":
                return b - a;

            case "oldest":
                return a - b;

            case "done":
                return Number(hb.done) - Number(ha.done);

            case "active":
                return Number(ha.done) - Number(hb.done);

            case "pinned":
            default:
                return Number(hb.pinned) - Number(ha.pinned);

        }

    });

    return indices;

}

function renderHabits(){

const list=document.getElementById("habitList");

list.innerHTML="";

const order = getHabitOrder();

order.forEach((index, pos)=>{

const habit = habits[index];

const li=document.createElement("li");

li.dataset.index = index;
li.style.animationDelay = (Math.min(pos,10)*0.04)+"s";

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

const willBeDone = !habits[index].done;

habits[index].done = willBeDone;

if(willBeDone){

xp+=10;
showToast("+10 XP 🎉");

updateLevel();

updateStats();

checkAchievements();

}

save();
updateHistory();
renderHabits();
updateDayProgress();

if(willBeDone){

const li = document.querySelector('#habitList [data-index="'+index+'"]');
playCheckAnimation(li);

}

}

function deleteHabit(index){

if(!confirm("Видалити звичку?")) return;

const li = document.querySelector('#habitList [data-index="'+index+'"]');

function finalizeDelete(){

    habits.splice(index,1);

    save();
    updateHistory();
    renderHabits();
    updateStats();
    updateDayProgress();

}

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

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

function setGoalSort(value){

    goalSortMode = value;

    localStorage.setItem("goalSortMode", value);

    renderGoals();

}

function getGoalOrder(){

    const indices = goals.map((_, i) => i);

    indices.sort((a, b) => {

        const ga = goals[a], gb = goals[b];

        switch(goalSortMode){

            case "newest":
                return b - a;

            case "oldest":
                return a - b;

            case "done":
                return Number(gb.done) - Number(ga.done);

            case "active":
                return Number(ga.done) - Number(gb.done);

            case "pinned":
            default:
                return Number(gb.pinned) - Number(ga.pinned);

        }

    });

    return indices;

}

function renderGoals(){

const list=document.getElementById("goalList");

list.innerHTML="";

goals.forEach(goal => {
    if (goal.pinned === undefined) goal.pinned = false;
    if (!goal.created) goal.created = new Date().toLocaleString();
    if (!goal.updated) goal.updated = goal.created;
});

const order = getGoalOrder();

order.forEach((index, pos)=>{

const goal = goals[index];

const li=document.createElement("li");

li.dataset.index = index;
li.style.animationDelay = (Math.min(pos,10)*0.04)+"s";

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

updateHistory();
renderGoals();
updateStats();
checkAchievements();
updateDayProgress();


}

function toggleGoal(index){

const willBeDone = !goals[index].done;

goals[index].done = willBeDone;

if(willBeDone){

xp+=25;
showToast("+25 XP 🏆");

updateLevel();
launchConfetti();

}

save();
updateHistory();


renderGoals();
updateStats();
checkAchievements();
updateDayProgress();

if(willBeDone){

const li = document.querySelector('#goalList [data-index="'+index+'"]');
playCheckAnimation(li);

}

}

function deleteGoal(index){

if(!confirm("Видалити ціль?")) return;

const li = document.querySelector('#goalList [data-index="'+index+'"]');

function finalizeDelete(){

    goals.splice(index,1);

    save();

    updateHistory();
    renderGoals();
    updateStats();
    updateDayProgress();

}

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

}

function editGoal(index){

const text=prompt(

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

animateNumber(habit, habitsDone);

animateNumber(goal, goalsDone);

if(streakText){

    let flameClass = "";

    if(streak>=14) flameClass = "flame-hot";
    else if(streak>=5) flameClass = "flame-medium";

    streakText.innerHTML = streak+' <span class="flame-icon '+flameClass+'">🔥</span>';

}

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

const numberEl=document.getElementById("dayProgressNumber");

if(numberEl){

animateNumber(numberEl, percent);

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

xp+=20;

updateLevel();

alert("🎉 Pomodoro завершено!");

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

document.getElementById("quoteCategory").innerText =
quote.category;

q.style.opacity=1;
q.innerText="";
q.classList.add("typing");

let i=0;
const text=quote.text;

function typeChar(){

    if(i<=text.length){

        q.innerText=text.slice(0,i);
        i++;

        setTimeout(typeChar,22);

    }else{

        q.classList.remove("typing");

    }

}

typeChar();

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

try{
    document.getElementById("moreBtn").onclick = openMoreMenu;
}catch(e){
    console.error("moreBtn init:", e);
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

    drawAchievementChart();

}

function drawAchievementChart(){

    const canvas = document.getElementById("achievementChart");

    if(!canvas) return;

    if(typeof Chart === "undefined") return;

    const last14 = history.slice(-14);

    const labels = last14.map(d => {

        const parts = d.date.split("-");

        return parts.length === 3 ? `${parts[2]}.${parts[1]}` : d.date;

    });

    const data = last14.map(d => d.percent);

    if(window.achievementChartInstance){

        window.achievementChartInstance.data.labels = labels;
        window.achievementChartInstance.data.datasets[0].data = data;
        window.achievementChartInstance.update();

        return;

    }

    window.achievementChartInstance = new Chart(canvas, {

        type: "line",

        data: {
            labels: labels,
            datasets: [{
                label: "% виконання за день",
                data: data,
                borderColor: "#6366f1",
                backgroundColor: "rgba(99,102,241,0.2)",
                fill: true,
                tension: 0.35,
                pointBackgroundColor: "#8b5cf6",
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },

        options: {

            responsive: true,
            maintainAspectRatio: false,

            scales: {

                y: {
                    min: 0,
                    max: 100,
                    ticks: { color: "#94a3b8" },
                    grid: { color: "rgba(148,163,184,0.15)" }
                },

                x: {
                    ticks: { color: "#94a3b8" },
                    grid: { color: "rgba(148,163,184,0.05)" }
                }

            },

            plugins: {

                legend: {
                    labels: { color: "#e2e8f0" }
                }

            }

        }

    });

}

window.addEventListener("load", () => {

    try{
        const habitSortSelect = document.getElementById("habitSort");
        if(habitSortSelect) habitSortSelect.value = habitSortMode;

        const goalSortSelect = document.getElementById("goalSort");
        if(goalSortSelect) goalSortSelect.value = goalSortMode;
    }catch(e){ console.error("sort select init:", e); }

    try{ renderHabits(); }catch(e){ console.error("renderHabits:", e); }
    try{ renderGoals(); }catch(e){ console.error("renderGoals:", e); }
    try{ updateStats(); }catch(e){ console.error("updateStats:", e); }
    try{ updateDayProgress(); }catch(e){ console.error("updateDayProgress:", e); }
    try{ showDailyQuote(); }catch(e){ console.error("showDailyQuote:", e); }
    try{ updateStreak(); }catch(e){ console.error("updateStreak:", e); }
    try{ updateAchievements(); }catch(e){ console.error("updateAchievements:", e); }
    try{ checkAchievements(); }catch(e){ console.error("checkAchievements:", e); }
    try{ drawAchievementChart(); }catch(e){ console.error("drawAchievementChart:", e); }

});

if("serviceWorker" in navigator){

try{
navigator.serviceWorker.register("sw.js");
}catch(e){ console.error("service worker register:", e); }

}

// ----------------
// Сповіщення
// ----------------

let notifyEnabled = localStorage.getItem("notifyEnabled") === "true";
let notifyTime = localStorage.getItem("notifyTime") || "09:00";
let lastNotifiedDate = localStorage.getItem("lastNotifiedDate") || "";

function updateNotifyStatus(){

    const statusEl = document.getElementById("notifyStatus");

    if(!statusEl) return;

    if(!("Notification" in window)){

        statusEl.innerText = "🚫 Браузер не підтримує сповіщення";

    }else if(Notification.permission === "denied"){

        statusEl.innerText = "🚫 Сповіщення заблоковано в браузері";

    }else if(notifyEnabled && Notification.permission === "granted"){

        statusEl.innerText = "✅ Увімкнено щодня о " + notifyTime;

    }else{

        statusEl.innerText = "Сповіщення вимкнено";

    }

}

function enableNotifications(){

    if(!("Notification" in window)){

        alert("Ваш браузер не підтримує сповіщення");

        return;

    }

    const timeInput = document.getElementById("notifyTime");

    notifyTime = timeInput ? timeInput.value : "09:00";

    Notification.requestPermission().then(permission=>{

        if(permission === "granted"){

            notifyEnabled = true;

            localStorage.setItem("notifyEnabled","true");
            localStorage.setItem("notifyTime", notifyTime);

            showToast("🔔 Сповіщення увімкнено");

        }else{

            notifyEnabled = false;

            localStorage.setItem("notifyEnabled","false");

            showToast("🚫 Дозвіл не надано");

        }

        updateNotifyStatus();

    });

}

function disableNotifications(){

    notifyEnabled = false;

    localStorage.setItem("notifyEnabled","false");

    updateNotifyStatus();

    showToast("🔕 Сповіщення вимкнено");

}

function checkReminder(){

    if(!notifyEnabled) return;

    if(!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();

    const current =
        String(now.getHours()).padStart(2,"0") + ":" +
        String(now.getMinutes()).padStart(2,"0");

    const today = now.toLocaleDateString();

    if(current === notifyTime && lastNotifiedDate !== today){

        const remaining =
            habits.filter(h=>!h.done).length +
            goals.filter(g=>!g.done).length;

        const text = remaining > 0
            ? `Сьогодні залишилось ${remaining} незавершених завдань 💪`
            : "Усі завдання на сьогодні виконано! 🎉";

        if("serviceWorker" in navigator){

            navigator.serviceWorker.ready.then(reg=>{

                reg.showNotification("SelfDev", {
                    body: text,
                    icon: "icon-192.png"
                });

            });

        }else{

            new Notification("SelfDev", { body: text });

        }

        lastNotifiedDate = today;

        localStorage.setItem("lastNotifiedDate", today);

    }

}

setInterval(checkReminder, 30000);

window.addEventListener("load", () => {

    const notifyTimeInput = document.getElementById("notifyTime");

    if(notifyTimeInput) notifyTimeInput.value = notifyTime;

    updateNotifyStatus();

});

// ----------------
// Ефекти: ripple, конфеті
// ----------------

document.addEventListener("click", function(e){

    const btn = e.target.closest("button");

    if(!btn) return;

    const circle = document.createElement("span");

    const rect = btn.getBoundingClientRect();

    const size = Math.max(rect.width, rect.height);

    circle.className = "ripple";

    circle.style.width = size + "px";
    circle.style.height = size + "px";

    circle.style.left = (e.clientX - rect.left - size/2) + "px";
    circle.style.top = (e.clientY - rect.top - size/2) + "px";

    btn.appendChild(circle);

    setTimeout(()=> circle.remove(), 600);

});

function launchConfetti(){

    const colors = ["#6366f1","#8b5cf6","#f97316","#22c55e","#38bdf8","#ec4899"];

    const container = document.createElement("div");

    container.className = "confetti-container";

    document.body.appendChild(container);

    for(let i=0;i<40;i++){

        const piece = document.createElement("div");

        piece.className = "confetti-piece";

        piece.style.left = Math.random()*100 + "vw";
        piece.style.background = colors[Math.floor(Math.random()*colors.length)];

        piece.style.setProperty("--rot", (Math.random()*360)+"deg");
        piece.style.setProperty("--drift", (Math.random()*200-100)+"px");

        piece.style.animationDelay = (Math.random()*0.3)+"s";
        piece.style.animationDuration = (1.8+Math.random()*1.2)+"s";

        container.appendChild(piece);

    }

    setTimeout(()=> container.remove(), 3200);

}
