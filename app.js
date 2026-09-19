// ----------------
// SelfDev v1
// ----------------

let streak = Number(localStorage.getItem("streak")) || 0;
let streakFreezes = Number(localStorage.getItem("streakFreezes")) || 0;
let lastStreakDate = localStorage.getItem("lastStreakDate") || "";
let lastOpen = localStorage.getItem("lastOpen") || "";

let pomodoroTime = Number(localStorage.getItem("pomodoroTime")) || 1500;
let timer = pomodoroTime;

let habits = JSON.parse(localStorage.getItem("habits")) || [];
let goals = JSON.parse(localStorage.getItem("goals")) || [];
let history = JSON.parse(localStorage.getItem("history")) || [];
let notes = JSON.parse(localStorage.getItem("notes")) || [];
let activityLog = JSON.parse(localStorage.getItem("activityLog")) || [];

// Міграція старої єдиної нотатки в новий список нотаток
const legacyNote = localStorage.getItem("note");

if(legacyNote && legacyNote.trim() !== "" && notes.length === 0){

    notes.push({
        text: legacyNote,
        created: new Date().toLocaleString(),
        updated: new Date().toLocaleString()
    });

    localStorage.setItem("notes", JSON.stringify(notes));
    localStorage.removeItem("note");

}

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
let claimedAchievements = JSON.parse(localStorage.getItem("claimedAchievements")) || [];

const achievementDefs = [
    { name:"Перше виконане завдання", icon:"🎯", target:1, reward:20, progress: ()=> Math.min(habits.filter(h=>h.done).length,1), check: ()=> habits.filter(h=>h.done).length>=1 },
    { name:"10 виконаних завдань", icon:"🔥", target:10, reward:40, progress: ()=> Math.min(habits.filter(h=>h.done).length,10), check: ()=> habits.filter(h=>h.done).length>=10 },
    { name:"25 виконаних завдань", icon:"💪", target:25, reward:80, progress: ()=> Math.min(habits.filter(h=>h.done).length,25), check: ()=> habits.filter(h=>h.done).length>=25 },
    { name:"Перша виконана ціль", icon:"🚩", target:1, reward:20, progress: ()=> Math.min(goals.filter(g=>g.done).length,1), check: ()=> goals.filter(g=>g.done).length>=1 },
    { name:"5 виконаних цілей", icon:"🏆", target:5, reward:60, progress: ()=> Math.min(goals.filter(g=>g.done).length,5), check: ()=> goals.filter(g=>g.done).length>=5 },
    { name:"10 виконаних цілей", icon:"💎", target:10, reward:100, progress: ()=> Math.min(goals.filter(g=>g.done).length,10), check: ()=> goals.filter(g=>g.done).length>=10 },
    { name:"Серія 7 днів", icon:"📅", target:7, reward:50, freezeReward:1, progress: ()=> Math.min(streak,7), check: ()=> streak>=7 },
    { name:"Серія 30 днів", icon:"🌟", target:30, reward:150, freezeReward:3, progress: ()=> Math.min(streak,30), check: ()=> streak>=30 },
    { name:"100 XP (Рівень 2)", icon:"⭐", target:2, reward:60, progress: ()=> Math.min(level,2), check: ()=> level>=2 },
    { name:"500 XP (Рівень 6)", icon:"🏅", target:6, reward:100, progress: ()=> Math.min(level,6), check: ()=> level>=6 },
    { name:"1000 XP (Рівень 11)", icon:"👑", target:11, reward:200, progress: ()=> Math.min(level,11), check: ()=> level>=11 }
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

function logActivity(){

activityLog.push(Date.now());

const cutoff = Date.now() - 90*86400000;

activityLog = activityLog.filter(ts => ts > cutoff);

localStorage.setItem("activityLog", JSON.stringify(activityLog));

}

function save(){

localStorage.setItem("habits",JSON.stringify(habits));
localStorage.setItem("goals",JSON.stringify(goals));
localStorage.setItem("history", JSON.stringify(history));
localStorage.setItem("notes", JSON.stringify(notes));

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

const headerLevel = document.getElementById("headerXpLevel");

if(headerLevel){

animateNumber(headerLevel, level);

}

const homeAvatar = document.getElementById("homeAvatar");

if(homeAvatar){

homeAvatar.innerText = getAvatarForLevel(level);

}

const headerLevelText = document.getElementById("headerXpLevelText");

if(headerLevelText){

animateNumber(headerLevelText, level);

}

const percent=xp%100;

const circle=document.getElementById("xpCircle");

if(circle){

circle.style.strokeDashoffset=
440-(440*percent/100);

}

const headerRing=document.getElementById("headerXpRing");

if(headerRing){

headerRing.style.strokeDashoffset=
75-(75*percent/100);

}

const headerCurrent = document.getElementById("headerXpCurrent");

if(headerCurrent){

animateNumber(headerCurrent, xp);

}

const bar=document.getElementById("progressBar");

if(bar){

bar.style.width=percent+"%";

}

const xpFill = document.getElementById("xpScaleFill");
const xpBar = document.querySelector(".xp-scale-bar");

if(xpFill){

xpFill.style.width = percent+"%";

}

if(xpBar){

xpBar.classList.toggle("near-levelup", percent>=85);

}

const xpScaleCurrent = document.getElementById("xpScaleCurrent");

if(xpScaleCurrent){

animateNumber(xpScaleCurrent, xp);

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

text.innerHTML="🚀 Почни виконувати завдання";

}

}

if(next){

next.innerHTML=
"До нового рівня залишилось "+(100-xp)+" XP";

}

}

function checkAchievements(){

achievementDefs.forEach((def, i)=>{

    const unlocked = def.check();

    if(unlocked && !unlockedAchievements.includes(i)){

        unlockedAchievements.push(i);

        localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));

        showAchievementModal(def.name);

    }

});

renderAchievementList();

}

function renderAchievementList(){

const list = document.getElementById("achievementList");

if(!list) return;

list.innerHTML = "";

achievementDefs.forEach((def, i)=>{

    const unlocked = unlockedAchievements.includes(i);
    const claimed = claimedAchievements.includes(i);
    const claimable = unlocked && !claimed;

    const li = document.createElement("li");

    li.className = "achievement-item";
    if(claimed) li.classList.add("unlocked");
    if(claimable) li.classList.add("claimable");

    li.style.animationDelay = (i*0.06)+"s";

    const progressVal = def.progress ? def.progress() : 0;
    const progressText = (def.target && !unlocked) ? `${progressVal}/${def.target}` : "";

    let rightSide = "";

    if(claimed){
        rightSide = '<div class="achievement-badge">✓</div>';
    }else if(claimable){
        rightSide = `<div class="achievement-claim-btn">🎁 +${def.reward} XP</div>`;
        li.onclick = ()=> claimAchievement(i);
    }

    li.innerHTML = `
        <div class="achievement-icon">${unlocked ? def.icon : "🔒"}</div>
        <div class="achievement-info">
            <div class="achievement-name">${def.name}</div>
            ${progressText ? `<div class="achievement-progress-text">${progressText}</div>` : ""}
        </div>
        ${rightSide}
    `;

    list.appendChild(li);

});

renderBadgeGalleryPreview();

}

function renderBadgeGalleryPreview(){

const container = document.getElementById("badgeGalleryPreview");

if(!container) return;

container.innerHTML = "";

achievementDefs.forEach((def, i)=>{

    const claimed = claimedAchievements.includes(i);

    const badge = document.createElement("div");

    badge.className = "mini-badge " + (claimed ? "on" : "off");
    badge.innerText = claimed ? def.icon : "🔒";

    container.appendChild(badge);

});

}

function claimAchievement(i){

    if(!unlockedAchievements.includes(i)) return;
    if(claimedAchievements.includes(i)) return;

    const def = achievementDefs[i];

    claimedAchievements.push(i);

    localStorage.setItem("claimedAchievements", JSON.stringify(claimedAchievements));

    xp += def.reward;

    updateLevel();

    launchConfetti();

    if(def.freezeReward){

        streakFreezes += def.freezeReward;

        localStorage.setItem("streakFreezes", streakFreezes);

        showToast(`🎁 +${def.reward} XP та ❄️ +${def.freezeReward} заморозка за "${def.name}"`);

    }else{

        showToast(`🎁 +${def.reward} XP за "${def.name}"`);

    }

    updateStats();

    renderAchievementList();

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

<b>${getSphereIcon(habit.category)} ${habit.name}</b><br>

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

showToast("Таке завдання вже існує");

return;

}

habits.push({
    name: input.value.trim(),
    done: false,
    pinned: false,
    category: document.getElementById("habitCategory") ? document.getElementById("habitCategory").value : "personal",
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

registerStreakActivity();

logActivity();

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

if(!confirm("Видалити завдання?")) return;

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

"Редагувати завдання",

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

<b>${getSphereIcon(goal.category)} ${goal.name}</b><br>

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
    category: document.getElementById("goalCategory") ? document.getElementById("goalCategory").value : "personal",
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

registerStreakActivity();

logActivity();

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

const lifeSpheres = [
    { key:"health", name:"Здоров'я", icon:"💪", color:"#22c55e" },
    { key:"career", name:"Кар'єра", icon:"💼", color:"#6366f1" },
    { key:"learning", name:"Навчання", icon:"📚", color:"#f97316" },
    { key:"personal", name:"Особисте", icon:"🌟", color:"#ec4899" }
];

function getSphereIcon(categoryKey){

const sphere = lifeSpheres.find(s => s.key === (categoryKey || "personal"));

return sphere ? sphere.icon : "🌟";

}

function updateLifeSpheres(){

const container = document.getElementById("lifeSpheresList");

if(!container) return;

container.innerHTML = "";

lifeSpheres.forEach(sphere=>{

    const items = [...habits, ...goals].filter(i => (i.category || "personal") === sphere.key);
    const done = items.filter(i=>i.done).length;
    const total = items.length;
    const percent = total===0 ? 0 : Math.round(done/total*100);

    const div = document.createElement("div");

    div.className = "sphere";

    div.innerHTML =
        '<div class="sphere-icon" style="background:'+sphere.color+'33">'+sphere.icon+'</div>'+
        '<div class="sphere-info">'+
        '<div class="sphere-name"><span>'+sphere.name+'</span><span>'+done+'/'+total+'</span></div>'+
        '<div class="sphere-bar"><div class="sphere-fill" style="width:'+percent+'%;background:'+sphere.color+'"></div></div>'+
        '</div>';

    container.appendChild(div);

});

}

function getAvatarForLevel(lvl){

if(lvl>=11) return "👑";
if(lvl>=6) return "🦸";
if(lvl>=3) return "🧑";
return "🌱";

}

const companionName = "Джарвіз";

const companionPhrases = [
    "Ти можеш більше! 💪",
    "Ще один крок вперед! 🚀",
    "Пишаюсь тобою! 🌟",
    "Не зупиняйся, все чудово йде! 🔥",
    "Разом до мети! 🎯",
    "Сьогодні гарний день для завдань! ☀️",
    "Я тут, поруч з тобою! 🤝",
    "Маленькі кроки — великий результат! 📈",
    "Ти сильніший, ніж вчора! 💫"
];

function companionTap(el){

const phrase = companionPhrases[Math.floor(Math.random()*companionPhrases.length)];

showToast(getAvatarForLevel(level)+" "+companionName+": "+phrase);

if(typeof jarvisTapSpin === "function"){

    jarvisTapSpin();

}

if(el){

    el.classList.add("tapped");

    setTimeout(()=> el.classList.remove("tapped"), 400);

}

}

function getCompanionMoodClass(){

const total = habits.length + goals.length;
const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;

if(total===0) return "";

const percent = done/total;

if(percent>=1) return "mood-happy";
if(percent===0) return "mood-sleepy";

return "";

}

function updateJarvisWidget(){

if(typeof updateJarvis3DMood === "function"){

    updateJarvis3DMood();

}

if(typeof updateJarvis3DAccessory === "function"){

    updateJarvis3DAccessory();

}

}

function showCompanionGreeting(){

const today = new Date().toLocaleDateString();
const lastGreeting = localStorage.getItem("lastCompanionGreeting");

if(lastGreeting === today) return;

localStorage.setItem("lastCompanionGreeting", today);

const phrase = companionPhrases[Math.floor(Math.random()*companionPhrases.length)];

setTimeout(()=> showToast(getAvatarForLevel(level)+" "+companionName+": "+phrase), 900);

}

function renderStreakDisplay(elementId){

const el = document.getElementById(elementId);

if(!el) return;

let flameClass = "";

if(streak>=14) flameClass = "flame-hot";
else if(streak>=5) flameClass = "flame-medium";

const avatar = getAvatarForLevel(level);
const moodClass = getCompanionMoodClass();

const freezeBadge = streakFreezes > 0
    ? `<span class="freeze-badge">❄️ ${streakFreezes}</span>`
    : "";

el.innerHTML =
    streak+' <span class="flame-icon '+flameClass+'">🔥</span>'+
    '<span class="avatar-companion '+moodClass+'" onclick="companionTap(this)">'+avatar+'</span>'+
    freezeBadge;

}

function updateStats(){

const habitsDone=habits.filter(h=>h.done).length;
const goalsDone=goals.filter(g=>g.done).length;

const habit=document.getElementById("habitCount");
const goal=document.getElementById("goalCount");

animateNumber(habit, habitsDone);

animateNumber(goal, goalsDone);

renderStreakDisplay("streakCount");
renderStreakDisplay("homeStreakDisplay");

updateJarvisWidget();

updateLifeSpheres();

if(typeof syncMyProfileToCloud === "function"){

    syncMyProfileToCloud();

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

updateDailyBonusState();

}

let dailyBonusClaimedDate = localStorage.getItem("dailyBonusClaimedDate") || "";

function updateDailyBonusState(){

const total = habits.length + goals.length;
const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;

const allDone = total > 0 && done === total;

const btn = document.getElementById("dailyBonusBtn");
const text = document.getElementById("dailyBonusText");

if(!btn || !text) return;

const today = new Date().toLocaleDateString();

const alreadyClaimed = dailyBonusClaimedDate === today;

btn.classList.remove("ready","claimed");

if(alreadyClaimed){

    btn.disabled = true;
    btn.classList.add("claimed");
    btn.innerText = "✅ Отримано на сьогодні";
    text.innerText = "Повертайся завтра за новим бонусом!";

}else if(allDone){

    btn.disabled = false;
    btn.classList.add("ready");
    btn.innerText = "🎁 Забрати +50 XP";
    text.innerText = "Усі завдання виконано! Забирай нагороду 🔥";

}else{

    btn.disabled = true;
    btn.innerText = "🎁 Забрати +50 XP";
    text.innerText = total===0
        ? "Додай завдання чи цілі, щоб отримати бонус"
        : `Залишилось ${total-done} із ${total} завдань до бонусу`;

}

}

function claimDailyBonus(){

const today = new Date().toLocaleDateString();

if(dailyBonusClaimedDate === today) return;

dailyBonusClaimedDate = today;

localStorage.setItem("dailyBonusClaimedDate", today);

xp += 50;

updateLevel();

showBonusCelebration();

showToast("🎁 +50 XP щоденний бонус!");

updateDailyBonusState();

}

function showBonusCelebration(){

const overlay = document.getElementById("bonusOverlay");

if(!overlay) return;

overlay.classList.remove("show");

void overlay.offsetWidth;

overlay.classList.add("show");

launchConfetti();

setTimeout(()=> overlay.classList.remove("show"), 1900);

}

function updateStreak(){

const now = new Date();
const todayISO = now.toISOString().slice(0,10);

if(lastOpen !== todayISO){

if(lastOpen !== ""){

habits.forEach(h=>{

h.done=false;

});

}

lastOpen=todayISO;

save();

renderHabits();
updateStats();

}

}

function registerStreakActivity(){

const now = new Date();
const todayISO = now.toISOString().slice(0,10);

if(lastStreakDate === todayISO) return;

const isLegacyFormat = lastStreakDate !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(lastStreakDate);

if(lastStreakDate !== "" && !isLegacyFormat){

const lastDate = new Date(lastStreakDate+"T00:00:00");
const diffDays = Math.round((now - lastDate) / 86400000);

if(diffDays > 1){

const missedDays = diffDays - 1;

if(streakFreezes >= missedDays){

streakFreezes -= missedDays;
localStorage.setItem("streakFreezes", streakFreezes);
showToast(`❄️ Використано ${missedDays} заморозку(и) — стрік збережено!`);

}else{

streak = 0;

}

}

}

lastStreakDate = todayISO;
streak++;

localStorage.setItem("lastStreakDate", lastStreakDate);
localStorage.setItem("streak", streak);

setTimeout(()=>{

    showToast("🔥 Стрік: "+streak+" "+(streak===1?"день":"днів"));

}, 1600);

updateStats();

}

let timerEndAt = null;

function startTimer(){

if(interval) return;

if(timer<=0){

    timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

}

timerEndAt = Date.now() + timer*1000;

interval = setInterval(()=>{

const remaining = Math.round((timerEndAt - Date.now())/1000);

timer = Math.max(0, remaining);

drawTimer();

if(timer<=0){

clearInterval(interval);

interval=null;

timerEndAt=null;

xp+=20;

updateLevel();

showToast("🎉 Pomodoro завершено! +20 XP");

if(pomodoroNotify && "Notification" in window && Notification.permission === "granted"){

    playNotificationSound();

    const pomodoroText = "🍅 Pomodoro завершено! +20 XP";

    if("serviceWorker" in navigator){

        navigator.serviceWorker.ready.then(reg=>{

            reg.showNotification("SelfDev", {
                body: pomodoroText,
                icon: "icon-192.png"
            });

        });

    }else{

        new Notification("SelfDev", { body: pomodoroText });

    }

}

timer = Number(localStorage.getItem("pomodoroTime")) || 1500;

drawTimer();

}

},250);

}

function resetTimer(){

clearInterval(interval);

interval=null;

timerEndAt=null;

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
notes

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

notes=data.notes||[];

save();

location.reload();

};

reader.readAsText(file);

}

function renderNotes(){

const list = document.getElementById("notesList");

if(!list) return;

list.innerHTML = "";

notes.forEach((noteItem, index)=>{

    const li = document.createElement("li");

    li.dataset.index = index;
    li.style.animationDelay = (Math.min(index,10)*0.04)+"s";

    li.innerHTML = `

        <div>

        <div style="white-space:pre-wrap">${noteItem.text}</div><br>

        <small>📅 ${noteItem.created}</small><br>

        <small>✏️ ${noteItem.updated}</small>

        </div>

        <div>

        <button onclick="editNote(${index})">✏️</button>

        <button onclick="deleteNote(${index})">🗑</button>

        </div>

    `;

    list.appendChild(li);

});

}

function addNote(){

const input = document.getElementById("noteInput");

if(!input || input.value.trim()==="") return;

notes.push({
    text: input.value.trim(),
    created: new Date().toLocaleString(),
    updated: new Date().toLocaleString()
});

input.value = "";

save();
renderNotes();

showToast("📖 Нотатку додано");

}

function editNote(index){

const text = prompt("Редагувати нотатку", notes[index].text);

if(text===null) return;

if(text.trim()==="") return;

notes[index].text = text;
notes[index].updated = new Date().toLocaleString();

save();
renderNotes();

}

function deleteNote(index){

if(!confirm("Видалити нотатку?")) return;

const li = document.querySelector('#notesList [data-index="'+index+'"]');

function finalizeDelete(){

    notes.splice(index,1);

    save();
    renderNotes();

}

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

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

    if(interval){

        timerEndAt = Date.now() + timer*1000;

    }

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

    if(page === "friends" && typeof renderFriendsPage === "function"){

        renderFriendsPage();

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
    updateWeeklySummary();
    renderActivityHeatmap();

}

function renderActivityHeatmap(){

const container = document.getElementById("activityHeatmap");

if(!container) return;

container.innerHTML = "";

const days = 91;
const now = new Date();

for(let i=days-1;i>=0;i--){

    const d = new Date(now.getTime() - i*86400000);
    const iso = d.toISOString().slice(0,10);

    const entry = history.find(h=>h.date===iso);
    const percent = entry ? entry.percent : 0;

    let level = 0;

    if(percent>=75) level=3;
    else if(percent>=40) level=2;
    else if(percent>0) level=1;

    const div = document.createElement("div");

    if(level>0) div.className = "l"+level;

    div.title = iso+": "+percent+"%";

    container.appendChild(div);

}

}

function updateWeeklySummary(){

    const avgEl = document.getElementById("weekAvgPercent");
    const bestEl = document.getElementById("weekBestDay");
    const diffEl = document.getElementById("weekDiff");

    if(!avgEl || !bestEl || !diffEl) return;

    const now = new Date();
    const dayNames = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];

    function dateStr(offset){

        const d = new Date(now.getTime() - offset*86400000);

        return { iso: d.toISOString().slice(0,10), dayIndex: d.getDay() };

    }

    let thisWeekTotal = 0;
    let bestPercent = -1;
    let bestDayIndex = null;

    for(let i=0;i<7;i++){

        const { iso, dayIndex } = dateStr(i);
        const entry = history.find(h=>h.date===iso);
        const percent = entry ? entry.percent : 0;

        thisWeekTotal += percent;

        if(percent > bestPercent){
            bestPercent = percent;
            bestDayIndex = dayIndex;
        }

    }

    let lastWeekTotal = 0;

    for(let i=7;i<14;i++){

        const { iso } = dateStr(i);
        const entry = history.find(h=>h.date===iso);

        lastWeekTotal += entry ? entry.percent : 0;

    }

    const avgThis = Math.round(thisWeekTotal/7);
    const avgLast = Math.round(lastWeekTotal/7);
    const diff = avgThis - avgLast;

    animateNumber(avgEl, avgThis, "%");

    bestEl.innerText = bestPercent > 0 ? dayNames[bestDayIndex] : "—";

    diffEl.innerText = (diff>=0?"+":"")+diff+"%";
    diffEl.style.color = diff>=0 ? "#22c55e" : "#ef4444";

}

let chartPeriod = localStorage.getItem("chartPeriod") || "day";

function setChartPeriod(period){

    chartPeriod = period;

    localStorage.setItem("chartPeriod", period);

    if(window.achievementChartInstance){

        window.achievementChartInstance.destroy();
        window.achievementChartInstance = null;

    }

    drawAchievementChart();

}

function getChartData(){

    const monthNames = ["Січ","Лют","Бер","Кві","Тра","Чер","Лип","Сер","Вер","Жов","Лис","Гру"];

    if(chartPeriod === "4h"){

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const buckets = [0,0,0,0,0,0];
        const labels = ["00-04","04-08","08-12","12-16","16-20","20-24"];

        activityLog.forEach(ts=>{

            if(ts >= todayStart){

                const hoursSinceMidnight = (ts - todayStart)/3600000;
                const bucketIndex = Math.min(5, Math.floor(hoursSinceMidnight/4));

                buckets[bucketIndex]++;

            }

        });

        return { labels, data: buckets, label: "Виконано завдань", isCount: true };

    }

    if(chartPeriod === "day"){

        const now = new Date();
        const last14 = [];

        for(let i=13;i>=0;i--){

            const d = new Date(now.getTime() - i*86400000);
            const iso = d.toISOString().slice(0,10);

            const entry = history.find(h=>h.date===iso);

            last14.push({ date: iso, percent: entry ? entry.percent : 0 });

        }

        const labels = last14.map(d => {

            const parts = d.date.split("-");

            return parts.length === 3 ? `${parts[2]}.${parts[1]}` : d.date;

        });

        return { labels, data: last14.map(d=>d.percent), label: "% виконання за день", isCount: false };

    }

    if(chartPeriod === "week" || chartPeriod === "2weeks"){

        const daysPerBucket = chartPeriod === "week" ? 7 : 14;
        const bucketsCount = 8;

        const labels = [];
        const data = [];

        for(let i=bucketsCount-1;i>=0;i--){

            const end = new Date(Date.now() - i*daysPerBucket*86400000);
            const start = new Date(end.getTime() - (daysPerBucket-1)*86400000);

            const startISO = start.toISOString().slice(0,10);
            const endISO = end.toISOString().slice(0,10);

            const entries = history.filter(h=> h.date >= startISO && h.date <= endISO);
            const avg = entries.length ? Math.round(entries.reduce((a,b)=>a+b.percent,0)/entries.length) : 0;

            labels.push(`${start.getDate()}.${start.getMonth()+1}`);
            data.push(avg);

        }

        return { labels, data, label: chartPeriod==="week" ? "% виконання за тиждень" : "% виконання за 2 тижні", isCount: false };

    }

    if(chartPeriod === "month"){

        const grouped = {};

        history.forEach(h=>{

            const monthKey = h.date.slice(0,7);

            if(!grouped[monthKey]) grouped[monthKey] = [];

            grouped[monthKey].push(h.percent);

        });

        const monthKeys = Object.keys(grouped).sort().slice(-12);

        const labels = monthKeys.map(k=>{

            const parts = k.split("-");

            return monthNames[parseInt(parts[1])-1]+" "+parts[0].slice(2);

        });

        const data = monthKeys.map(k=>{

            const vals = grouped[k];

            return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);

        });

        return { labels, data, label: "% виконання за місяць", isCount: false };

    }

    if(chartPeriod === "year"){

        const grouped = {};

        history.forEach(h=>{

            const yearKey = h.date.slice(0,4);

            if(!grouped[yearKey]) grouped[yearKey] = [];

            grouped[yearKey].push(h.percent);

        });

        const yearKeys = Object.keys(grouped).sort();

        const data = yearKeys.map(k=>{

            const vals = grouped[k];

            return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);

        });

        return { labels: yearKeys, data, label: "% виконання за рік", isCount: false };

    }

    return { labels: [], data: [], label: "", isCount: false };

}

function drawAchievementChart(){

    const canvas = document.getElementById("achievementChart");

    if(!canvas) return;

    if(typeof Chart === "undefined") return;

    const { labels, data, label, isCount } = getChartData();

    if(window.achievementChartInstance){

        window.achievementChartInstance.data.labels = labels;
        window.achievementChartInstance.data.datasets[0].data = data;
        window.achievementChartInstance.data.datasets[0].label = label;
        window.achievementChartInstance.options.scales.y.max = isCount ? undefined : 100;
        window.achievementChartInstance.update();

        return;

    }

    window.achievementChartInstance = new Chart(canvas, {

        type: "line",

        data: {
            labels: labels,
            datasets: [{
                label: label,
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
                    max: isCount ? undefined : 100,
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
    try{ updateWeeklySummary(); }catch(e){ console.error("updateWeeklySummary:", e); }
    try{ updateLifeSpheres(); }catch(e){ console.error("updateLifeSpheres:", e); }
    try{ renderActivityHeatmap(); }catch(e){ console.error("renderActivityHeatmap:", e); }
    try{ renderNotes(); }catch(e){ console.error("renderNotes:", e); }

    try{

        const chartPeriodSelect = document.getElementById("chartPeriodSelect");

        if(chartPeriodSelect) chartPeriodSelect.value = chartPeriod;

    }catch(e){ console.error("chartPeriodSelect init:", e); }
    try{ showCompanionGreeting(); }catch(e){ console.error("showCompanionGreeting:", e); }

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
let notifyVolume = Number(localStorage.getItem("notifyVolume"));
if(isNaN(notifyVolume)) notifyVolume = 70;
let pomodoroNotify = localStorage.getItem("pomodoroNotify") !== "false";
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

function playNotificationSound(){

    try{

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if(!AudioContextClass) return;

        const volumeScale = notifyVolume/100;

        if(volumeScale <= 0) return;

        const ctx = new AudioContextClass();
        const now = ctx.currentTime;

        function tone(freq, start, duration, gain){

            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc.type = "sine";
            osc.frequency.value = freq;

            gainNode.gain.setValueAtTime(0, now+start);
            gainNode.gain.linearRampToValueAtTime(gain*volumeScale, now+start+0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.001, now+start+duration);

            osc.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc.start(now+start);
            osc.stop(now+start+duration+0.05);

        }

        tone(1046.5, 0, 0.15, 0.25);
        tone(1568, 0.1, 0.25, 0.2);

    }catch(e){

        console.error("Notification sound:", e);

    }

}

function saveNotifyVolume(value){

    notifyVolume = Number(value);

    localStorage.setItem("notifyVolume", notifyVolume);

}

function savePomodoroNotifyToggle(checked){

    pomodoroNotify = checked;

    localStorage.setItem("pomodoroNotify", checked);

}

function sendTestNotification(){

    if(!("Notification" in window)){

        showToast("🚫 Браузер не підтримує сповіщення");

        return;

    }

    if(Notification.permission !== "granted"){

        showToast("🚫 Спочатку натисни 'Увімкнути' і дай дозвіл браузеру");

        return;

    }

    playNotificationSound();

    const text = "Це тестове сповіщення 🧪 Якщо бачиш його — все працює!";

    if("serviceWorker" in navigator){

        navigator.serviceWorker.ready.then(reg=>{

            reg.showNotification("SelfDev", {
                body: text,
                icon: "icon-192.png"
            }).then(()=>{

                showToast("✅ Сповіщення відправлено — перевір область системних сповіщень");

            }).catch(e=>{

                console.error("showNotification error:", e);

                showToast("🚫 Помилка показу сповіщення: "+e.message);

            });

        });

    }else{

        try{

            new Notification("SelfDev", { body: text });

            showToast("✅ Сповіщення відправлено");

        }catch(e){

            console.error("Notification error:", e);

            showToast("🚫 Помилка: "+e.message);

        }

    }

}

function checkReminder(){

    if(!notifyEnabled) return;

    if(!("Notification" in window) || Notification.permission !== "granted") return;

    const now = new Date();

    const current =
        String(now.getHours()).padStart(2,"0") + ":" +
        String(now.getMinutes()).padStart(2,"0");

    const today = now.toLocaleDateString();

    if(current >= notifyTime && lastNotifiedDate !== today){

        const remaining =
            habits.filter(h=>!h.done).length +
            goals.filter(g=>!g.done).length;

        const text = remaining > 0
            ? `Сьогодні залишилось ${remaining} незавершених завдань 💪`
            : "Усі завдання на сьогодні виконано! 🎉";

        playNotificationSound();

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

    const notifyVolumeInput = document.getElementById("notifyVolume");

    if(notifyVolumeInput) notifyVolumeInput.value = notifyVolume;

    const pomodoroNotifyToggle = document.getElementById("pomodoroNotifyToggle");

    if(pomodoroNotifyToggle) pomodoroNotifyToggle.checked = pomodoroNotify;

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
