/*
 * SelfDev
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 *
 * Цей вихідний код є власністю автора. Копіювання, розповсюдження, зміна,
 * публікація та будь-яке інше використання без письмового дозволу автора
 * заборонені. Докладніше — у файлі LICENSE.
 */

// ----------------
// Службові функції: безпечне читання сховища, екранування, локальні дати
// ----------------

const TASK_CATEGORIES = ["health","career","learning","personal"];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

let deletePending = false;

function safeJSON(key, fallback){

    try{

        const raw = localStorage.getItem(key);

        if(raw === null) return fallback;

        const value = JSON.parse(raw);

        return (value === null || value === undefined) ? fallback : value;

    }catch(e){

        console.warn("Пошкоджені дані в localStorage, ключ:", key, e);

        return fallback;

    }

}

function safeArray(key){

    const value = safeJSON(key, []);

    return Array.isArray(value) ? value : [];

}

function safeNumber(key, fallback){

    const raw = localStorage.getItem(key);

    // Number(null) і Number("") дають 0, а не fallback
    if(raw === null || raw.trim() === "") return fallback;

    const n = Number(raw);

    return Number.isFinite(n) ? n : fallback;

}

function clampInt(value, min, max, fallback){

    const n = Math.floor(Number(value));

    if(!Number.isFinite(n)) return fallback;

    return Math.min(max, Math.max(min, n));

}

// Екранування тексту перед вставкою в innerHTML — назви завдань, нотатки
// та назви таймерів вводить користувач (або вони приходять з імпорту).
function escapeHtml(value){

    return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}

function pad2(n){

    return String(n).padStart(2, "0");

}

// Локальна дата у форматі РРРР-ММ-ДД. toISOString() дає UTC-дату, через що
// «день» перемикався не опівночі за місцевим часом (наприклад, о 01:00 чи 03:00).
function localISODate(d){

    d = d || new Date();

    return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate());

}

// Дата n днів тому — через setDate, тож перехід на літній/зимовий час не збиває день.
function isoDaysAgo(n){

    const d = new Date();

    d.setDate(d.getDate() - n);

    return localISODate(d);

}

function isoToUTCms(iso){

    const p = iso.split("-").map(Number);

    return Date.UTC(p[0], p[1]-1, p[2]);

}

// Кількість календарних днів між двома датами РРРР-ММ-ДД (без впливу часових поясів/DST).
function daysBetweenISO(a, b){

    return Math.round((isoToUTCms(b) - isoToUTCms(a)) / 86400000);

}

function normalizeTask(t){

    if(!t || typeof t !== "object") return null;

    const name = String(t.name === null || t.name === undefined ? "" : t.name).trim().slice(0,200);

    if(name === "") return null;

    const created = String(t.created || new Date().toLocaleString()).slice(0,60);

    return {
        name: name,
        done: t.done === true,
        pinned: t.pinned === true,
        category: TASK_CATEGORIES.includes(t.category) ? t.category : "personal",
        created: created,
        updated: String(t.updated || created).slice(0,60),
        xpDay: ISO_DATE_RE.test(String(t.xpDay)) ? String(t.xpDay) : "",
        xpAwarded: t.xpAwarded === true
    };

}

function normalizeNote(n){

    if(typeof n === "string") n = { text: n };

    if(!n || typeof n !== "object") return null;

    const text = String(n.text === null || n.text === undefined ? "" : n.text).slice(0,5000);

    if(text.trim() === "") return null;

    const created = String(n.created || new Date().toLocaleString()).slice(0,60);

    return {
        text: text,
        created: created,
        updated: String(n.updated || created).slice(0,60)
    };

}

function normalizeHistory(arr){

    if(!Array.isArray(arr)) return [];

    return arr.slice(-800)
        .filter(h => h && ISO_DATE_RE.test(String(h.date)) && Number.isFinite(Number(h.percent)))
        .map(h => ({
            date: String(h.date),
            percent: Math.min(100, Math.max(0, Math.round(Number(h.percent))))
        }));

}

function normalizeActivityLog(arr){

    if(!Array.isArray(arr)) return [];

    const cutoff = Date.now() - 730*86400000;
    const limit = Date.now() + 86400000;

    return arr.slice(-20000)
        .map(Number)
        .filter(ts => Number.isFinite(ts) && ts > cutoff && ts <= limit);

}

// ----------------
// SelfDev v1
// ----------------

let streak = Number(localStorage.getItem("streak")) || 0;
let streakFreezes = Number(localStorage.getItem("streakFreezes")) || 0;
let lastStreakDate = localStorage.getItem("lastStreakDate") || "";
let lastOpen = localStorage.getItem("lastOpen") || "";


let habits = safeArray("habits");
let goals = safeArray("goals");
let history = safeArray("history");
let notes = safeArray("notes");
let activityLog = safeArray("activityLog");

// Накопичувальна кількість виконань за весь час — рахує кожне виконання,
// в тому числі повторне (наступного дня після скидання), а не лише
// поточний стан чекбоксів (який щодня скидається на 0)
let totalHabitCompletions = Number(localStorage.getItem("totalHabitCompletions")) || 0;
let totalGoalCompletions = Number(localStorage.getItem("totalGoalCompletions")) || 0;

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

// Оновлення старих даних, нормалізація і захист від пошкоджених/підкинутих даних
habits = habits.map(normalizeTask).filter(Boolean);
goals = goals.map(normalizeTask).filter(Boolean);
notes = notes.map(normalizeNote).filter(Boolean);
history = normalizeHistory(history);
activityLog = normalizeActivityLog(activityLog);

// Прапорці «XP вже нараховано»: завдання, виконане до оновлення, вдруге XP не дасть
habits.forEach(habit => {
    if (habit.done && !habit.xpDay) habit.xpDay = ISO_DATE_RE.test(lastOpen) ? lastOpen : localISODate();
});

goals.forEach(goal => {
    if (goal.done) goal.xpAwarded = true;
});

localStorage.setItem("goals", JSON.stringify(goals));
localStorage.setItem("habits", JSON.stringify(habits));
localStorage.setItem("notes", JSON.stringify(notes));

let habitSortMode = localStorage.getItem("habitSortMode") || "pinned";
let goalSortMode = localStorage.getItem("goalSortMode") || "pinned";

// Межі потрібні, щоб зіпсоване значення в сховищі (1e15 тощо) не давало мільярди «рівнів»
const MAX_LEVEL = 10000;
let xp = Math.min(1000000, Math.max(0, Math.floor(safeNumber("xp", 0))));
let level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(safeNumber("level", 1))));

let unlockedAchievements = safeArray("unlockedAchievements");
let claimedAchievements = safeArray("claimedAchievements");

// Лічильники дня оголошені тут, до achievementDefs і першого виклику updateLevel():
// раніше вони були нижче, і перевірка досягнень «Pomodoro» падала з помилкою
// «Cannot access before initialization».
let dailyStatsDate = localStorage.getItem("dailyStatsDate") || "";
let habitsCompletedToday = Number(localStorage.getItem("habitsCompletedToday")) || 0;
let goalsCompletedToday = Number(localStorage.getItem("goalsCompletedToday")) || 0;
let pomodorosCompletedToday = Number(localStorage.getItem("pomodorosCompletedToday")) || 0;
let totalPomodoroCompletions = Number(localStorage.getItem("totalPomodoroCompletions")) || 0;

// "Липкий" пік денного прогресу і разова готовність бонусу — щоб видалення
// вже виконаного завдання не відміняло зарахований прогрес дня
let dayProgressPeakPercent = Number(localStorage.getItem("dayProgressPeakPercent")) || 0;
let dailyBonusReady = localStorage.getItem("dailyBonusReady") === "true";


const achievementDefs = [
    { name:"Перше виконане завдання", icon:"🎯", target:1, reward:20, progress: ()=> Math.min(totalHabitCompletions,1), check: ()=> totalHabitCompletions>=1 },
    { name:"10 виконаних завдань", icon:"🔥", target:10, reward:40, progress: ()=> Math.min(totalHabitCompletions,10), check: ()=> totalHabitCompletions>=10 },
    { name:"25 виконаних завдань", icon:"💪", target:25, reward:80, progress: ()=> Math.min(totalHabitCompletions,25), check: ()=> totalHabitCompletions>=25 },
    { name:"50 виконаних завдань", icon:"🥉", target:50, reward:120, progress: ()=> Math.min(totalHabitCompletions,50), check: ()=> totalHabitCompletions>=50 },
    { name:"100 виконаних завдань", icon:"🥈", target:100, reward:200, progress: ()=> Math.min(totalHabitCompletions,100), check: ()=> totalHabitCompletions>=100 },
    { name:"250 виконаних завдань", icon:"🥇", target:250, reward:350, progress: ()=> Math.min(totalHabitCompletions,250), check: ()=> totalHabitCompletions>=250 },
    { name:"500 виконаних завдань", icon:"🏵️", target:500, reward:500, progress: ()=> Math.min(totalHabitCompletions,500), check: ()=> totalHabitCompletions>=500 },
    { name:"1000 виконаних завдань", icon:"🌌", target:1000, reward:1000, progress: ()=> Math.min(totalHabitCompletions,1000), check: ()=> totalHabitCompletions>=1000 },

    { name:"Перша виконана ціль", icon:"🚩", target:1, reward:20, progress: ()=> Math.min(totalGoalCompletions,1), check: ()=> totalGoalCompletions>=1 },
    { name:"5 виконаних цілей", icon:"🏆", target:5, reward:60, progress: ()=> Math.min(totalGoalCompletions,5), check: ()=> totalGoalCompletions>=5 },
    { name:"10 виконаних цілей", icon:"💎", target:10, reward:100, progress: ()=> Math.min(totalGoalCompletions,10), check: ()=> totalGoalCompletions>=10 },
    { name:"25 виконаних цілей", icon:"👑", target:25, reward:200, progress: ()=> Math.min(totalGoalCompletions,25), check: ()=> totalGoalCompletions>=25 },
    { name:"50 виконаних цілей", icon:"🎖️", target:50, reward:350, progress: ()=> Math.min(totalGoalCompletions,50), check: ()=> totalGoalCompletions>=50 },
    { name:"100 виконаних цілей", icon:"🛡️", target:100, reward:600, progress: ()=> Math.min(totalGoalCompletions,100), check: ()=> totalGoalCompletions>=100 },

    { name:"Серія 3 дні", icon:"🔥", target:3, reward:30, progress: ()=> Math.min(streak,3), check: ()=> streak>=3 },
    { name:"Серія 7 днів", icon:"📅", target:7, reward:50, freezeReward:1, progress: ()=> Math.min(streak,7), check: ()=> streak>=7 },
    { name:"Серія 14 днів", icon:"🌙", target:14, reward:90, progress: ()=> Math.min(streak,14), check: ()=> streak>=14 },
    { name:"Серія 30 днів", icon:"🌟", target:30, reward:150, freezeReward:3, progress: ()=> Math.min(streak,30), check: ()=> streak>=30 },
    { name:"Серія 60 днів", icon:"☄️", target:60, reward:250, progress: ()=> Math.min(streak,60), check: ()=> streak>=60 },
    { name:"Серія 100 днів", icon:"🪐", target:100, reward:400, progress: ()=> Math.min(streak,100), check: ()=> streak>=100 },
    { name:"Серія 365 днів", icon:"🌍", target:365, reward:1000, progress: ()=> Math.min(streak,365), check: ()=> streak>=365 },

    { name:"Перший Pomodoro", icon:"🍅", target:1, reward:20, progress: ()=> Math.min(totalPomodoroCompletions,1), check: ()=> totalPomodoroCompletions>=1 },
    { name:"10 Pomodoro-сесій", icon:"⏱️", target:10, reward:70, progress: ()=> Math.min(totalPomodoroCompletions,10), check: ()=> totalPomodoroCompletions>=10 },
    { name:"50 Pomodoro-сесій", icon:"⏳", target:50, reward:250, progress: ()=> Math.min(totalPomodoroCompletions,50), check: ()=> totalPomodoroCompletions>=50 },
    { name:"100 Pomodoro-сесій", icon:"🧠", target:100, reward:450, progress: ()=> Math.min(totalPomodoroCompletions,100), check: ()=> totalPomodoroCompletions>=100 },

    { name:"100 XP (Рівень 2)", icon:"⭐", target:2, reward:60, progress: ()=> Math.min(level,2), check: ()=> level>=2 },
    { name:"Рівень 5", icon:"✨", target:5, reward:80, progress: ()=> Math.min(level,5), check: ()=> level>=5 },
    { name:"500 XP (Рівень 6)", icon:"🏅", target:6, reward:100, progress: ()=> Math.min(level,6), check: ()=> level>=6 },
    { name:"1000 XP (Рівень 11)", icon:"👑", target:11, reward:200, progress: ()=> Math.min(level,11), check: ()=> level>=11 },
    { name:"Рівень 15", icon:"💫", target:15, reward:280, progress: ()=> Math.min(level,15), check: ()=> level>=15 },
    { name:"Рівень 20", icon:"🔮", target:20, reward:400, progress: ()=> Math.min(level,20), check: ()=> level>=20 },
    { name:"Рівень 30", icon:"🧙", target:30, reward:600, progress: ()=> Math.min(level,30), check: ()=> level>=30 },
    { name:"Рівень 50", icon:"🐉", target:50, reward:1000, progress: ()=> Math.min(level,50), check: ()=> level>=50 }
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

        if (typeof jarvisReact === "function") jarvisReact("page");

    };

});

function logActivity(){

activityLog.push(Date.now());

const cutoff = Date.now() - 730*86400000;

activityLog = activityLog.filter(ts => ts > cutoff);

localStorage.setItem("activityLog", JSON.stringify(activityLog));

}

function save(){

try{

    localStorage.setItem("habits",JSON.stringify(habits));
    localStorage.setItem("goals",JSON.stringify(goals));
    localStorage.setItem("history", JSON.stringify(history));
    localStorage.setItem("notes", JSON.stringify(notes));

    localStorage.setItem("xp",xp);
    localStorage.setItem("level",level);

    localStorage.setItem("streak",streak);
    localStorage.setItem("lastOpen",lastOpen);

}catch(e){

    console.error("Не вдалося зберегти дані (сховище переповнене або заблоковане):", e);

}

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

function playCheckAnimation(li, xpAmount){

    if(!li) return;

    if(typeof haptic === "function") haptic(18);
    if(typeof uiXpFloat === "function") uiXpFloat(li, xpAmount);

    // Джарвіз радіє разом з тобою
    if(typeof jarvisReact === "function") jarvisReact(xpAmount >= 25 ? "goal" : "done");

    const mark = document.createElement("span");

    mark.className = "check-pop";
    mark.innerText = "✓";

    li.appendChild(mark);

    setTimeout(()=> mark.remove(), 700);

}

function showLevelUpCelebration(newLevel){

    if(typeof jarvisReact === "function") jarvisReact("levelup");

    // Нова повноекранна сцена з ui.js; стара плашка — запасний варіант
    if(typeof showLevelScene === "function"){

        try{

            showLevelScene(newLevel);

            return;

        }catch(e){

            console.error("showLevelScene:", e);

        }

    }

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

if(!Number.isFinite(xp) || xp < 0) xp = 0;
if(!Number.isFinite(level) || level < 1) level = 1;
if(level > MAX_LEVEL) level = MAX_LEVEL;

if(xp >= 100){

    const gained = Math.floor(xp/100);

    xp = xp % 100;
    level = Math.min(MAX_LEVEL, level + gained);
    leveledUp = true;

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

// ----------------
// Щоденні виклики — окремий, живий шар над постійними досягненнями.
// Щодня опівночі набір скидається і формується новий (детерміновано
// за датою, тож не перетасовується при кожному відкритті того самого дня).
// ----------------

function ensureDailyStatsFresh(){

    const today = localISODate();

    if(dailyStatsDate === today) return;

    dailyStatsDate = today;
    habitsCompletedToday = 0;
    goalsCompletedToday = 0;
    pomodorosCompletedToday = 0;
    dayProgressPeakPercent = 0;
    dailyBonusReady = false;

    localStorage.setItem("dailyStatsDate", today);
    localStorage.setItem("habitsCompletedToday", "0");
    localStorage.setItem("goalsCompletedToday", "0");
    localStorage.setItem("pomodorosCompletedToday", "0");
    localStorage.setItem("dayProgressPeakPercent", "0");
    localStorage.setItem("dailyBonusReady", "false");

}

const dailyChallengePool = [
    { id:"habits1", icon:"✅", name:"Виконай 1 завдання", reward:15, target:1, get: ()=> habitsCompletedToday },
    { id:"habits3", icon:"🔥", name:"Виконай 3 завдання", reward:30, target:3, get: ()=> habitsCompletedToday },
    { id:"habits5", icon:"💪", name:"Виконай 5 завдань", reward:45, target:5, get: ()=> habitsCompletedToday },
    { id:"goal1", icon:"🚩", name:"Заверши 1 ціль", reward:25, target:1, get: ()=> goalsCompletedToday },
    { id:"goal2", icon:"🏆", name:"Заверши 2 цілі", reward:45, target:2, get: ()=> goalsCompletedToday },
    { id:"pomodoro1", icon:"🍅", name:"Заверши 1 Pomodoro", reward:20, target:1, get: ()=> pomodorosCompletedToday },
    { id:"pomodoro2", icon:"🍅", name:"Заверши 2 Pomodoro", reward:35, target:2, get: ()=> pomodorosCompletedToday },
];

let dailyChallengesDate = localStorage.getItem("dailyChallengesDate") || "";
let dailyChallengesIds = safeArray("dailyChallengesIds").filter(id => typeof id === "string");
let dailyChallengesClaimed = safeArray("dailyChallengesClaimed").filter(id => typeof id === "string");

function pickDailyChallenges(){

    const today = localISODate();

    let seed = 0;

    for(let i=0;i<today.length;i++) seed += today.charCodeAt(i)*(i+1);

    const pool = dailyChallengePool.slice();
    const picked = [];

    for(let i=0;i<3 && pool.length;i++){

        seed = (seed*9301+49297) % 233280;

        const idx = Math.floor((seed/233280)*pool.length);

        picked.push(pool.splice(idx,1)[0]);

    }

    return picked.map(c=>c.id);

}

function ensureDailyChallengesFresh(){

    const today = localISODate();

    if(dailyChallengesDate === today) return;

    dailyChallengesDate = today;
    dailyChallengesIds = pickDailyChallenges();
    dailyChallengesClaimed = [];

    localStorage.setItem("dailyChallengesDate", today);
    localStorage.setItem("dailyChallengesIds", JSON.stringify(dailyChallengesIds));
    localStorage.setItem("dailyChallengesClaimed", JSON.stringify(dailyChallengesClaimed));

}

function renderDailyChallenges(){

    ensureDailyStatsFresh();
    ensureDailyChallengesFresh();

    // Сезон, скриня, план дня й енергія Джарвіза рахуються з тих самих лічильників дня
    if(typeof funnelRefresh === "function") funnelRefresh();

    const container = document.getElementById("dailyChallengesList");

    if(!container) return;

    const items = dailyChallengesIds
        .map(id => dailyChallengePool.find(c=>c.id===id))
        .filter(Boolean);

    container.innerHTML = "";

    items.forEach(c=>{

        const progress = Math.min(c.get(), c.target);
        const done = progress >= c.target;
        const claimed = dailyChallengesClaimed.includes(c.id);

        const div = document.createElement("div");

        div.className = "challenge-card"+(claimed ? " claimed" : done ? " ready" : "");

        div.innerHTML =
            '<div class="challenge-icon">'+c.icon+'</div>'+
            '<div class="challenge-info">'+
            '<b>'+c.name+'</b>'+
            '<small>'+progress+'/'+c.target+' · +'+c.reward+' XP</small>'+
            '</div>'+
            (claimed
                ? '<span class="challenge-done">✅</span>'
                : done
                    ? '<button onclick="claimDailyChallenge(\''+c.id+'\')">Забрати</button>'
                    : '<span class="challenge-lock">🔒</span>');

        container.appendChild(div);

    });

}

function claimDailyChallenge(id){

    ensureDailyChallengesFresh();

    if(dailyChallengesClaimed.includes(id)) return;

    const c = dailyChallengePool.find(x=>x.id===id);

    if(!c || c.get() < c.target) return;

    dailyChallengesClaimed.push(id);

    localStorage.setItem("dailyChallengesClaimed", JSON.stringify(dailyChallengesClaimed));

    xp += c.reward;

    updateLevel();

    showToast("🎲 "+c.name+" виконано! +"+c.reward+" XP");

    renderDailyChallenges();

}

// ----------------
// Pomodoro — кілька незалежних таймерів одночасно, з паузою.
// pomodoroRuntime тримає setInterval-хендли (не зберігається),
// pomodoroTimers — стан кожного таймера (зберігається в localStorage).
// ----------------

// Довжина кола таймера (r = 52) для SVG-кільця
const POMO_RING = 2 * Math.PI * 52;

let pomodoroTimers = safeArray("pomodoroTimers").map(normalizePomodoroTimer).filter(Boolean);
const pomodoroRuntime = {};

function savePomodoroTimers(){

    localStorage.setItem("pomodoroTimers", JSON.stringify(pomodoroTimers));

}

function findPomodoroTimer(id){

    return pomodoroTimers.find(t=>t.id===id);

}

function formatPomodoroTime(seconds){

    const m = Math.floor(seconds/60);
    const s = seconds%60;

    return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

}

function normalizePomodoroTimer(t){

    if(!t || typeof t !== "object") return null;

    const duration = clampInt(t.duration, 60, 180*60, 25*60);
    const running = t.running === true && Number(t.endAt) > 0;
    const remaining = clampInt(t.remaining, 0, duration, duration);

    // id потрапляє в атрибути onclick, тому приймаємо лише "pt" + цифри
    const id = /^pt\d+$/.test(String(t.id))
        ? String(t.id)
        : "pt"+Date.now()+Math.floor(Math.random()*1000000);

    return {
        id: id,
        label: String(t.label || "Pomodoro").slice(0,60),
        duration: duration,
        remaining: remaining,
        running: running,
        endAt: running ? Number(t.endAt) : null
    };

}

// XP за Pomodoro пропорційний тривалості (25 хв = 20 XP, не більше 20), сесії
// коротші за 5 хв XP не дають, і не більше 12 винагороджених сесій на день —
// інакше таймер на 1 хвилину можна було крутити заради XP.
const POMODORO_MIN_REWARD_SECONDS = 5*60;
const POMODORO_MAX_REWARDED_PER_DAY = 12;

function pomodoroReward(durationSeconds){

    if(durationSeconds < POMODORO_MIN_REWARD_SECONDS) return 0;

    return Math.min(20, Math.max(1, Math.round(durationSeconds/60/25*20)));

}

function addPomodoroTimer(){

    const minutesInput = document.getElementById("pomodoroMinutes");
    const labelInput = document.getElementById("pomodoroLabel");

    let minutes = Math.floor(Number(minutesInput ? minutesInput.value : 25));

    if(!minutes || minutes<1) minutes = 1;
    if(minutes>180) minutes = 180;

    const label = ((labelInput && labelInput.value.trim()) || "Pomodoro").slice(0,60);

    const t = {
        id: "pt"+Date.now()+Math.floor(Math.random()*1000000),
        label: label,
        duration: minutes*60,
        remaining: minutes*60,
        running: false,
        endAt: null
    };

    pomodoroTimers.push(t);

    savePomodoroTimers();
    renderPomodoroTimers();

    if(labelInput) labelInput.value = "";

}

function stopPomodoroInterval(id){

    if(pomodoroRuntime[id]){

        clearInterval(pomodoroRuntime[id]);

        delete pomodoroRuntime[id];

    }

}

function runPomodoroInterval(t){

    stopPomodoroInterval(t.id);

    pomodoroRuntime[t.id] = setInterval(()=>{

        const current = findPomodoroTimer(t.id);

        if(!current || !current.running){

            stopPomodoroInterval(t.id);
            return;

        }

        const remaining = Math.round((current.endAt - Date.now())/1000);

        current.remaining = Math.max(0, remaining);

        updatePomodoroTimerDisplay(current);

        if(current.remaining<=0){

            stopPomodoroInterval(current.id);

            current.running = false;
            current.endAt = null;
            current.remaining = current.duration;

            ensureDailyStatsFresh();

            let reward = pomodoroReward(current.duration);

            if(reward > 0 && pomodorosCompletedToday >= POMODORO_MAX_REWARDED_PER_DAY){

                reward = 0;

            }

            if(reward > 0){

                xp += reward;
                updateLevel();

                pomodorosCompletedToday++;
                localStorage.setItem("pomodorosCompletedToday", pomodorosCompletedToday);

                totalPomodoroCompletions++;
                localStorage.setItem("totalPomodoroCompletions", totalPomodoroCompletions);

            }

            const doneText = reward > 0
                ? (current.label||"Pomodoro")+" завершено! +"+reward+" XP"
                : (current.label||"Pomodoro")+" завершено! (XP не нараховується: сесія коротша за 5 хв або вичерпано ліміт дня)";

            showToast("🎉 "+doneText);

            if(typeof pomodoroNotify !== "undefined" && pomodoroNotify && "Notification" in window && Notification.permission === "granted"){

                if(typeof playNotificationSound === "function") playNotificationSound();

                const pomodoroText = "🍅 "+doneText;

                if("serviceWorker" in navigator){

                    navigator.serviceWorker.ready.then(reg=>{

                        reg.showNotification("SelfDev", { body: pomodoroText, icon: "icon-192.png" });

                    }).catch(e=> console.error("Pomodoro notification:", e));

                }else{

                    new Notification("SelfDev", { body: pomodoroText });

                }

            }

            savePomodoroTimers();
            renderPomodoroTimers();
            updateStats();

        }

    },1000);

}

function togglePomodoroTimer(id){

    const t = findPomodoroTimer(id);

    if(!t) return;

    if(t.running){

        stopPomodoroInterval(id);

        t.remaining = Math.max(0, Math.round((t.endAt - Date.now())/1000));
        t.running = false;
        t.endAt = null;

    }else{

        if(t.remaining<=0) t.remaining = t.duration;

        t.running = true;
        t.endAt = Date.now() + t.remaining*1000;

        runPomodoroInterval(t);

    }

    savePomodoroTimers();
    renderPomodoroTimers();

}

function resetPomodoroTimer(id){

    const t = findPomodoroTimer(id);

    if(!t) return;

    stopPomodoroInterval(id);

    t.remaining = t.duration;
    t.running = false;
    t.endAt = null;

    savePomodoroTimers();
    renderPomodoroTimers();

}

function removePomodoroTimer(id){

    stopPomodoroInterval(id);

    pomodoroTimers = pomodoroTimers.filter(t=>t.id!==id);

    savePomodoroTimers();
    renderPomodoroTimers();

}

function updatePomodoroTimerDisplay(t){

    const el = document.getElementById("pt-time-"+t.id);

    if(el) el.innerText = formatPomodoroTime(t.remaining);

    const pct = t.duration>0 ? Math.max(0, Math.min(100, (1-t.remaining/t.duration)*100)) : 0;

    const fill = document.getElementById("pt-fill-"+t.id);

    if(fill) fill.style.width = pct+"%";

    const ring = document.getElementById("pt-ring-"+t.id);

    if(ring) ring.style.strokeDashoffset = (POMO_RING*(1-pct/100)).toFixed(2);

}

function renderPomodoroTimers(){

    const container = document.getElementById("pomodoroList");

    if(!container) return;

    if(pomodoroTimers.length===0){

        container.innerHTML = '<p style="opacity:.6;text-align:center;padding:16px">Додай перший таймер вище 🍅</p>';

        return;

    }

    container.innerHTML = "";

    pomodoroTimers.forEach(t=>{

        const div = document.createElement("div");

        const paused = !t.running && t.remaining < t.duration;

        div.className = "pomodoro-card"+(t.running ? " running" : "")+(paused ? " paused" : "");

        const pct = t.duration>0 ? Math.max(0, Math.min(100, (1-t.remaining/t.duration)*100)) : 0;
        const status = t.running ? "Фокус" : paused ? "Пауза" : Math.round(t.duration/60)+" хв";

        // id таймера — лише "pt"+цифри (див. normalizePomodoroTimer), тож безпечно в атрибутах
        div.innerHTML =
            '<div class="pomodoro-card-top">'+
            '<b>'+escapeHtml(t.label)+'</b>'+
            '<button type="button" class="pomodoro-remove" onclick="removePomodoroTimer(\''+t.id+'\')" aria-label="Видалити таймер">✕</button>'+
            '</div>'+
            '<div class="pomo-ring">'+
            '<svg viewBox="0 0 120 120" aria-hidden="true"><circle class="track" cx="60" cy="60" r="52"/>'+
            '<circle class="fill" id="pt-ring-'+t.id+'" cx="60" cy="60" r="52" stroke-dasharray="'+POMO_RING+'" stroke-dashoffset="'+(POMO_RING*(1-pct/100)).toFixed(2)+'"/></svg>'+
            '<div class="pomo-ring-text">'+
            '<div class="pomodoro-card-time" id="pt-time-'+t.id+'">'+formatPomodoroTime(t.remaining)+'</div>'+
            '<small>'+status+'</small>'+
            '</div>'+
            '</div>'+
            '<div class="pomodoro-card-actions">'+
            '<button type="button" class="pomo-main" onclick="togglePomodoroTimer(\''+t.id+'\')">'+(t.running ? "⏸ Пауза" : paused ? "▶ Продовжити" : "▶ Старт")+'</button>'+
            '<button type="button" class="pomo-reset" onclick="resetPomodoroTimer(\''+t.id+'\')" aria-label="Скинути таймер">↺</button>'+
            '</div>';

        container.appendChild(div);

    });

}

function initPomodoroTimers(){

    pomodoroTimers.forEach(t=>{

        if(t.running && t.endAt){

            const remaining = Math.round((t.endAt - Date.now())/1000);

            if(remaining>0){

                t.remaining = remaining;

                runPomodoroInterval(t);

            }else{

                t.running = false;
                t.endAt = null;
                t.remaining = t.duration;

            }

        }

    });

    savePomodoroTimers();
    renderPomodoroTimers();

}

try{

    initPomodoroTimers();

    window.addEventListener("load", ()=>{ try{ highlightPomodoroPreset(); }catch(e){} });

}catch(e){

    console.error("Pomodoro init:", e);

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

const claimableIdx = [];
const upcomingIdx = [];

achievementDefs.forEach((def, i)=>{

    const unlocked = unlockedAchievements.includes(i);
    const claimed = claimedAchievements.includes(i);

    if(claimed) return;

    if(unlocked){

        claimableIdx.push(i);

    }else{

        upcomingIdx.push(i);

    }

});

upcomingIdx.sort((a,b)=>{

    const defA = achievementDefs[a];
    const defB = achievementDefs[b];

    const pctA = (defA.target && defA.progress) ? defA.progress()/defA.target : 0;
    const pctB = (defB.target && defB.progress) ? defB.progress()/defB.target : 0;

    return pctB - pctA;

});

const visibleIdx = claimableIdx.concat(upcomingIdx).slice(0,4);

if(visibleIdx.length === 0){

    list.innerHTML = '<p style="opacity:.6;text-align:center;padding:10px">Усі досягнення забрано! 🏆 Перевір щоденні виклики на сторінці Досягнення</p>';

}

visibleIdx.forEach((i, order)=>{

    const def = achievementDefs[i];

    const unlocked = unlockedAchievements.includes(i);
    const claimable = unlocked;

    const li = document.createElement("li");

    li.className = "achievement-item";
    if(claimable) li.classList.add("claimable");

    li.style.animationDelay = (order*0.06)+"s";

    const progressVal = def.progress ? def.progress() : 0;
    const progressText = (def.target && !unlocked) ? `${progressVal}/${def.target}` : "";

    let rightSide = "";

    if(claimable){
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

// Черга: якщо за раз відкрилось кілька досягнень, раніше показувалось лише останнє
// Досягнення можуть відкритись під час старту, ще до цього рядка, тож не перезаписуємо чергу
var achievementModalQueue = achievementModalQueue || [];

function showAchievementModal(name){

    const modal = document.getElementById("achievementModal");
    const title = document.getElementById("achievementModalTitle");

    if(!modal || !title) return;

    if(modal.classList.contains("show")){

        if(!achievementModalQueue) achievementModalQueue = [];

        achievementModalQueue.push(name);

        return;

    }

    title.innerText = "🏆 " + name;

    modal.classList.add("show");

    launchConfetti();

}

function closeAchievementModal(){

    const modal = document.getElementById("achievementModal");

    if(modal) modal.classList.remove("show");

    if(achievementModalQueue && achievementModalQueue.length){

        const next = achievementModalQueue.shift();

        setTimeout(()=> showAchievementModal(next), 250);

    }

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

if(!list) return;

list.innerHTML="";

const order = getHabitOrder();

order.forEach((index, pos)=>{

const habit = habits[index];

const li=document.createElement("li");

li.dataset.index = index;
li.style.animationDelay = (Math.min(pos,10)*0.04)+"s";

if(habit.done)
li.classList.add("done");

li.innerHTML = taskRowHTML(habit, index, "Habit");

li.dataset.category = habit.category || "personal";
li.style.setProperty("--c", getSphereColor(habit.category));

list.appendChild(li);

if(typeof attachSwipe === "function"){

    attachSwipe(li, {
        onRight: ()=> toggleHabit(index),
        onLeft: ()=> deleteHabit(index)
    });

}

});

if(typeof renderSphereFilter === "function") renderSphereFilter("habit", habits);

const habitCountEl = document.getElementById("habitCount");

if(habitCountEl) habitCountEl.innerText = totalHabitCompletions;

// Після перемальовування фільтр пошуку злітав і показувались усі завдання
const habitSearchEl = document.getElementById("habitSearch");

if(habitSearchEl && habitSearchEl.value) searchHabits();

}

function searchHabits(){

const value=document
.getElementById("habitSearch")
.value
.toLowerCase();

document
.querySelectorAll("#habitList li")
.forEach(li=>{

// Шукаємо лише в назві, а не в підписах свайпу («Виконано», «Видалити»)
const textEl = li.querySelector(".task-text") || li;

li.style.display=

textEl.innerText
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

if(!input) return;

const name = input.value.trim().slice(0,200);

if(name === "")
return;

if(habits.some(h=>h.name===name)){

showToast("Таке завдання вже існує");

return;

}

const categoryEl = document.getElementById("habitCategory");
const category = categoryEl && TASK_CATEGORIES.includes(categoryEl.value) ? categoryEl.value : "personal";
const stamp = new Date().toLocaleString();

habits.push({
    name: name,
    done: false,
    pinned: false,
    category: category,
    created: stamp,
    updated: stamp,
    xpDay: "",
    xpAwarded: false
});

input.value="";

save();
updateHistory();
renderHabits();
updateStats();
updateDayProgress();

}

function toggleHabit(index){

const habit = habits[index];

if(!habit) return;

const today = localISODate();
const willBeDone = !habit.done;

habit.done = willBeDone;

let rewarded = false;

if(willBeDone){

    // XP за одне завдання нараховується лише раз на день — інакше можна було
    // нескінченно знімати й ставити галочку заради XP, серії та досягнень
    if(habit.xpDay !== today){

        habit.xpDay = today;
        rewarded = true;

        xp+=10;
        showToast("+10 XP 🎉");

        updateLevel();

        totalHabitCompletions++;
        localStorage.setItem("totalHabitCompletions", totalHabitCompletions);

        ensureDailyStatsFresh();
        habitsCompletedToday++;
        localStorage.setItem("habitsCompletedToday", habitsCompletedToday);

        registerStreakActivity();

        logActivity();

    }else{

        showToast("✔ XP за це завдання вже нараховано сьогодні");

    }

}

save();
updateHistory();
renderHabits();
updateStats();
checkAchievements();
updateDayProgress();

if(rewarded){

const li = document.querySelector('#habitList [data-index="'+index+'"]');
playCheckAnimation(li, 10);

}

}

// Підтвердження: нижня панель (ui.js), а якщо її немає — системний confirm
async function askConfirm(title, message){

if(typeof uiConfirm === "function") return uiConfirm(title, message);

return confirm(title);

}

async function deleteHabit(index){

if(deletePending || !habits[index]) return;

const target = habits[index];

if(!(await askConfirm("Видалити завдання?", "«" + target.name + "» зникне зі списку."))) return;

// Поки панель була відкрита, список міг змінитись
if(deletePending || habits[index] !== target) return;

const li = document.querySelector('#habitList [data-index="'+index+'"]');

function finalizeDelete(){

    habits.splice(index,1);

    deletePending = false;

    save();
    updateHistory();
    renderHabits();
    updateStats();
    updateDayProgress();

}

// Поки триває анімація видалення, індекси інших записів не можна чіпати
deletePending = true;

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

}

async function editHabit(index){

const item = habits[index];

if(!item) return;

let name = null;
let category = item.category || "personal";

if(typeof uiSheet === "function"){

    const r = await uiSheet({ title:"Редагувати завдання", mode:"input", value:item.name, category:category, okText:"Зберегти" });

    if(!r) return;

    name = r.value;
    category = r.category || category;

}else{

    name = prompt("Редагувати завдання", item.name);

    if(name === null) return;

}

// Поки панель була відкрита, список міг змінитись
if(habits[index] !== item) return;

const clean = String(name).trim().slice(0,200);

if(clean==="") return;

if(habits.some((x, i) => i !== index && x.name === clean)){

showToast("Таке завдання вже існує");

return;

}

const changed = clean !== item.name || category !== item.category;

if(!changed) return;

item.name = clean;
item.category = TASK_CATEGORIES.includes(category) ? category : "personal";
item.updated = new Date().toLocaleString();

save();

renderHabits();

updateLifeSpheres();

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

if(!list) return;

list.innerHTML="";

const order = getGoalOrder();

order.forEach((index, pos)=>{

const goal = goals[index];

const li=document.createElement("li");

li.dataset.index = index;
li.style.animationDelay = (Math.min(pos,10)*0.04)+"s";

if(goal.done)
li.classList.add("done");

li.innerHTML = taskRowHTML(goal, index, "Goal");

li.dataset.category = goal.category || "personal";
li.style.setProperty("--c", getSphereColor(goal.category));

list.appendChild(li);

if(typeof attachSwipe === "function"){

    attachSwipe(li, {
        onRight: ()=> toggleGoal(index),
        onLeft: ()=> deleteGoal(index)
    });

}

});

if(typeof renderSphereFilter === "function") renderSphereFilter("goal", goals);

const goalSearchEl = document.getElementById("goalSearch");

if(goalSearchEl && goalSearchEl.value) searchGoals();

}

function searchGoals(){

const value=document
.getElementById("goalSearch")
.value
.toLowerCase();

document
.querySelectorAll("#goalList li")
.forEach(li=>{

// Шукаємо лише в назві, а не в підписах свайпу («Виконано», «Видалити»)
const textEl = li.querySelector(".task-text") || li;

li.style.display=

textEl.innerText
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

if(!input) return;

const name = input.value.trim().slice(0,200);

if(name==="") return;

if(goals.some(g=>g.name===name)){

showToast("Така ціль вже існує");

return;

}

const categoryEl = document.getElementById("goalCategory");
const category = categoryEl && TASK_CATEGORIES.includes(categoryEl.value) ? categoryEl.value : "personal";
const stamp = new Date().toLocaleString();

goals.push({
    name: name,
    done: false,
    pinned: false,
    category: category,
    created: stamp,
    updated: stamp,
    xpDay: "",
    xpAwarded: false
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

const goal = goals[index];

if(!goal) return;

const willBeDone = !goal.done;

goal.done = willBeDone;

let rewarded = false;

if(willBeDone){

    // Нагорода за ціль — один раз за все життя цілі (прапорець xpAwarded)
    if(!goal.xpAwarded){

        goal.xpAwarded = true;
        rewarded = true;

        xp+=25;
        showToast("+25 XP 🏆");

        updateLevel();
        launchConfetti();

        totalGoalCompletions++;
        localStorage.setItem("totalGoalCompletions", totalGoalCompletions);

        ensureDailyStatsFresh();
        goalsCompletedToday++;
        localStorage.setItem("goalsCompletedToday", goalsCompletedToday);

        registerStreakActivity();

        logActivity();

    }else{

        showToast("🏆 XP за цю ціль уже нараховано");

    }

}

save();
updateHistory();


renderGoals();
updateStats();
checkAchievements();
updateDayProgress();

if(rewarded){

const li = document.querySelector('#goalList [data-index="'+index+'"]');
playCheckAnimation(li, 25);

}

}

async function deleteGoal(index){

if(deletePending || !goals[index]) return;

const target = goals[index];

if(!(await askConfirm("Видалити ціль?", "«" + target.name + "» зникне зі списку."))) return;

if(deletePending || goals[index] !== target) return;

const li = document.querySelector('#goalList [data-index="'+index+'"]');

function finalizeDelete(){

    goals.splice(index,1);

    deletePending = false;

    save();

    updateHistory();
    renderGoals();
    updateStats();
    updateDayProgress();

}

deletePending = true;

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

}

async function editGoal(index){

const item = goals[index];

if(!item) return;

let name = null;
let category = item.category || "personal";

if(typeof uiSheet === "function"){

    const r = await uiSheet({ title:"Редагувати ціль", mode:"input", value:item.name, category:category, okText:"Зберегти" });

    if(!r) return;

    name = r.value;
    category = r.category || category;

}else{

    name = prompt("Редагувати ціль", item.name);

    if(name === null) return;

}

// Поки панель була відкрита, список міг змінитись
if(goals[index] !== item) return;

const clean = String(name).trim().slice(0,200);

if(clean==="") return;

if(goals.some((x, i) => i !== index && x.name === clean)){

showToast("Така ціль вже існує");

return;

}

const changed = clean !== item.name || category !== item.category;

if(!changed) return;

item.name = clean;
item.category = TASK_CATEGORIES.includes(category) ? category : "personal";
item.updated = new Date().toLocaleString();

save();

renderGoals();

updateLifeSpheres();

}

const lifeSpheres = [
    { key:"health", name:"Здоров'я", icon:"💪", color:"#22c55e" },
    { key:"career", name:"Кар'єра", icon:"💼", color:"#3b82f6" },
    { key:"learning", name:"Навчання", icon:"📚", color:"#f97316" },
    { key:"personal", name:"Особисте", icon:"🌟", color:"#ec4899" }
];

function getSphereIcon(categoryKey){

const sphere = lifeSpheres.find(s => s.key === (categoryKey || "personal"));

return sphere ? sphere.icon : "🌟";

}

function getSphereColor(categoryKey){

const sphere = lifeSpheres.find(s => s.key === (categoryKey || "personal"));

return sphere ? sphere.color : "#6366f1";

}

// Рядок завдання/цілі: фон для свайпу + картка з кольором сфери.
// kind = "Habit" | "Goal" — від нього залежать назви функцій у кнопках.
function taskRowHTML(item, index, kind){

const isGoal = kind === "Goal";
const pinFn = isGoal ? "togglePin" : "toggleHabitPin";
const edited = item.updated && item.updated !== item.created;

return `
<div class="swipe-bg" aria-hidden="true">
<span class="sw-done">${item.done ? "↩ Повернути" : "✔ Виконано"}</span>
<span class="sw-del">Видалити 🗑</span>
</div>
<div class="swipe-fg">
<div class="task-main">
<span class="sphere-chip" aria-hidden="true">${getSphereIcon(item.category)}</span>
<div class="task-text">
<b>${escapeHtml(item.name)}</b>
<small>${edited ? "✏️ " + escapeHtml(item.updated) : "📅 " + escapeHtml(item.created)}</small>
</div>
</div>
<div class="task-actions">
<button type="button" class="act-pin" onclick="${pinFn}(${index})" aria-label="${item.pinned ? "Відкріпити" : "Закріпити"}">${item.pinned ? "📌" : "📍"}</button>
<button type="button" class="act-done" onclick="toggle${kind}(${index})" aria-label="${item.done ? "Повернути" : "Виконати"}">${item.done ? "↩" : "✔"}</button>
<button type="button" class="act-edit" onclick="edit${kind}(${index})" aria-label="Редагувати">✏️</button>
<button type="button" class="act-del" onclick="delete${kind}(${index})" aria-label="Видалити">🗑</button>
</div>
</div>`;

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

// Енергія Джарвіза (funnel.js): без уваги він засинає, заряджений — радіє
const petMoodId = typeof funnelPetMoodId === "function" ? funnelPetMoodId() : "";

if(petMoodId === "sleepy") return "mood-sleepy";

if(total===0) return "";

const percent = done/total;

if(percent>=1) return "mood-happy";
if(percent===0) return "mood-sleepy";

if(petMoodId === "happy") return "mood-happy";

return "";

}

function updateJarvisWidget(){

if(typeof updateJarvis3DMood === "function"){

    updateJarvis3DMood();

}

if(typeof updateJarvis3DAccessory === "function"){

    updateJarvis3DAccessory();

}

if(typeof renderJarvisSkinPicker === "function"){

    renderJarvisSkinPicker();

}

if(typeof renderJarvisMovementPicker === "function"){

    renderJarvisMovementPicker();

}

if(typeof renderJarvisCostumePicker === "function"){

    renderJarvisCostumePicker();

}

}

function showCompanionGreeting(){

const today = localISODate();
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

// Плитки сторінки «Статистика» і стовпчики за 7 днів
function updateStatsPage(){

const set = (id, value) => { const el = document.getElementById(id); if(el) animateNumber(el, value); };

set("statPomodoros", totalPomodoroCompletions);
set("statLevel", level);
set("statFreezes", streakFreezes);

const xpEl = document.getElementById("statXp");

if(xpEl) xpEl.innerText = xp + "/100 XP";

const bars = document.getElementById("statWeekBars");

if(!bars) return;

const dayNames = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
const byDate = new Map(history.map(h => [h.date, h.percent]));

bars.textContent = "";

for(let i = 6; i >= 0; i--){

    const d = new Date();

    d.setDate(d.getDate() - i);

    const iso = localISODate(d);
    const percent = byDate.get(iso) || 0;

    const col = document.createElement("div");

    col.className = "week-bar" + (i === 0 ? " today" : "");
    col.title = iso + ": " + percent + "%";

    const track = document.createElement("div");

    track.className = "week-bar-track";

    const fill = document.createElement("div");

    fill.className = "week-bar-fill";
    fill.style.height = Math.max(4, percent) + "%";

    track.appendChild(fill);

    const label = document.createElement("small");

    label.textContent = dayNames[d.getDay()];

    const value = document.createElement("b");

    value.textContent = percent + "%";

    col.append(value, track, label);
    bars.appendChild(col);

}

}

function updateStats(){

const habit=document.getElementById("habitCount");
const goal=document.getElementById("goalCount");

animateNumber(habit, totalHabitCompletions);

animateNumber(goal, totalGoalCompletions);

renderStreakDisplay("streakCount");
renderStreakDisplay("homeStreakDisplay");

updateJarvisWidget();

updateLifeSpheres();

renderDailyChallenges();

updateStatsPage();

if(typeof syncMyProfileToCloud === "function"){

    syncMyProfileToCloud();

}

}

function updateDayProgress(){

ensureDailyStatsFresh();

const total = habits.length + goals.length;

const done =
habits.filter(h=>h.done).length +
goals.filter(g=>g.done).length;

const currentPercent =
total===0 ? 0 : Math.round(done/total*100);

if(currentPercent > dayProgressPeakPercent){

    dayProgressPeakPercent = currentPercent;
    localStorage.setItem("dayProgressPeakPercent", dayProgressPeakPercent);

}

const percent = dayProgressPeakPercent;

const bar=document.getElementById("dayProgress");

if(bar){

bar.style.width=percent+"%";

}

const numberEl=document.getElementById("dayProgressNumber");

if(numberEl){

animateNumber(numberEl, percent);

}

// Кільце прогресу на головній (bento)
const ring = document.getElementById("dayRingFill");

if(ring){

    const circumference = 238.76;

    ring.style.strokeDashoffset = String(circumference * (1 - percent/100));

}

const dayText = document.getElementById("dayProgressText");

if(dayText && document.getElementById("dayRingFill")){

    dayText.innerText = total === 0
        ? "Додай перші завдання"
        : done + " з " + total + " виконано";

}

updateDailyBonusState();

publishWidgetSummary();

}

// Короткий підсумок дня для віджета (Windows/Edge): сервіс-воркер не має доступу
// до localStorage, тому застосунок кладе підсумок у кеш, звідки його читає sw.js.
function publishWidgetSummary(){

try{

    if(!("caches" in window)) return;

    const total = habits.length + goals.length;
    const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;

    const goalsSummary = total===0
        ? "Додай перші завдання та цілі 🎯"
        : "Сьогодні виконано "+done+" із "+total+" 🎯";

    const body = JSON.stringify({ goalsSummary: goalsSummary, date: localISODate() });

    caches.open("selfdev-widget")
        .then(cache => cache.put("widgets/summary.json", new Response(body, { headers: { "Content-Type": "application/json" } })))
        .then(()=>{

            if("serviceWorker" in navigator && navigator.serviceWorker.controller){

                navigator.serviceWorker.controller.postMessage({ type: "widget-refresh" });

            }

        })
        .catch(()=>{});

}catch(e){

    console.warn("Widget summary:", e);

}

}

let dailyBonusClaimedDate = localStorage.getItem("dailyBonusClaimedDate") || "";

// Порівнюємо і зі старим форматом дати (toLocaleDateString), щоб у день оновлення
// бонус не можна було забрати вдруге.
function isDailyBonusClaimedToday(){

return dailyBonusClaimedDate === localISODate() || dailyBonusClaimedDate === new Date().toLocaleDateString();

}

function updateDailyBonusState(){

ensureDailyStatsFresh();

const total = habits.length + goals.length;
const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;

const allDone = total > 0 && done === total;

if(allDone && !dailyBonusReady){

    dailyBonusReady = true;
    localStorage.setItem("dailyBonusReady", "true");

}

const btn = document.getElementById("dailyBonusBtn");
const text = document.getElementById("dailyBonusText");

if(!btn || !text) return;

const alreadyClaimed = isDailyBonusClaimedToday();

btn.classList.remove("ready","claimed");

if(alreadyClaimed){

    btn.disabled = true;
    btn.classList.add("claimed");
    btn.innerText = "✅ Отримано на сьогодні";
    text.innerText = "Повертайся завтра за новим бонусом!";

}else if(dailyBonusReady){

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

ensureDailyStatsFresh();

if(!dailyBonusReady || isDailyBonusClaimedToday()) return;

dailyBonusClaimedDate = localISODate();

localStorage.setItem("dailyBonusClaimedDate", dailyBonusClaimedDate);

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

const todayISO = localISODate();

if(lastOpen !== todayISO){

if(lastOpen !== ""){

habits.forEach(h=>{

h.done=false;

});

}

lastOpen=todayISO;

// Якщо пропущено більше днів, ніж є заморозок, серія обривається одразу,
// а не висить «живою» на екрані до наступного виконання завдання
if(ISO_DATE_RE.test(lastStreakDate) && streak > 0){

const missedDays = daysBetweenISO(lastStreakDate, todayISO) - 1;

if(missedDays > 0 && streakFreezes < missedDays){

streak = 0;

localStorage.setItem("streak", streak);

}

}

save();

renderHabits();
updateStats();
updateHistory();
updateDayProgress();

}

}

function registerStreakActivity(){

const todayISO = localISODate();

if(lastStreakDate === todayISO) return;

const isLegacyFormat = lastStreakDate !== "" && !ISO_DATE_RE.test(lastStreakDate);

if(lastStreakDate !== "" && !isLegacyFormat){

// Різниця у календарних днях (а не в мілісекундах від UTC-півночі)
const diffDays = daysBetweenISO(lastStreakDate, todayISO);

// Дата «з минулого» (змінили годинник назад) — серію не чіпаємо
if(diffDays < 0) return;

if(diffDays > 1){

const missedDays = diffDays - 1;

if(streakFreezes >= missedDays){

streakFreezes -= missedDays;
localStorage.setItem("streakFreezes", streakFreezes);
showToast(`❄️ Використано ${missedDays} ${pluralUk(missedDays, "заморозку", "заморозки", "заморозок")} — стрік збережено!`);

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

    showToast("🔥 Стрік: "+streak+" "+pluralUk(streak, "день", "дні", "днів"));

}, 1600);

updateStats();

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

// Підписи графіка мають бути видні і на світлій темі
if(window.achievementChartInstance){

window.achievementChartInstance.destroy();
window.achievementChartInstance = null;

}

drawAchievementChart();

}

if(theme=="light"){

document.body.classList.add("light");

}

// ----------------
// Думка дня: показ, «Зберегти», «Поділитися», «Ще одна»
// ----------------

var currentQuote = null;
var quoteTypingTimer = null;

function readFavoriteQuotes(){

    const list = safeArray("favoriteQuotes");

    return list.filter(t => typeof t === "string").slice(-200);

}

function renderQuote(quote, animate){

const q = document.getElementById("quoteText");
const cat = document.getElementById("quoteCategory");

if(!q || !quote) return;

currentQuote = quote;

if(cat) cat.innerText = quote.category || "";

updateQuoteLikeButton();

if(quoteTypingTimer){

    clearTimeout(quoteTypingTimer);
    quoteTypingTimer = null;

}

const text = quote.text;
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if(!animate || reduceMotion){

    q.classList.remove("typing");
    q.innerText = text;

    return;

}

q.innerText = "";
q.classList.add("typing");

let i = 0;

function typeChar(){

    if(i <= text.length){

        q.innerText = text.slice(0, i);
        i++;

        quoteTypingTimer = setTimeout(typeChar, 22);

    }else{

        q.classList.remove("typing");
        quoteTypingTimer = null;

    }

}

typeChar();

}

function showDailyQuote(){

if(typeof quotes === "undefined" || !quotes.length) return;

// Раніше брався UTC-день, і цитата змінювалась о 02:00–03:00 за Києвом, а не опівночі
renderQuote(quotes[localDayNumber() % quotes.length], true);

}

function showAnotherQuote(){

if(typeof quotes === "undefined" || quotes.length < 2) return;

let next = currentQuote;

while(next === currentQuote) next = quotes[Math.floor(Math.random() * quotes.length)];

renderQuote(next, true);

}

function updateQuoteLikeButton(){

const btn = document.getElementById("quoteLikeBtn");

if(!btn || !currentQuote) return;

const liked = readFavoriteQuotes().includes(currentQuote.text);

btn.setAttribute("aria-pressed", liked ? "true" : "false");
btn.innerText = liked ? "♥ Збережено" : "♡ Зберегти";

}

function toggleQuoteFavorite(){

if(!currentQuote) return;

let list = readFavoriteQuotes();

if(list.includes(currentQuote.text)){

    list = list.filter(t => t !== currentQuote.text);
    showToast("Прибрано з улюблених");

}else{

    list.push(currentQuote.text);
    showToast("♥ Цитату збережено в улюблені");

}

try{ localStorage.setItem("favoriteQuotes", JSON.stringify(list)); }catch(e){}

updateQuoteLikeButton();

}

function shareQuote(){

if(!currentQuote) return;

const text = "«" + currentQuote.text + "» — SelfDev";

if(navigator.share){

    navigator.share({ text: text }).catch(()=>{});

    return;

}

if(navigator.clipboard && navigator.clipboard.writeText){

    navigator.clipboard.writeText(text)
        .then(()=> showToast("📋 Цитату скопійовано"))
        .catch(()=> showToast(text));

    return;

}

showToast(text);

}

// var, а не let: showToast може викликатись під час старту, ще до цього рядка
var toastTimer = null;

function showToast(text){

const toast=document.getElementById("toast");

if(!toast) return;

toast.innerText=text;

toast.classList.add("show");

// Таймер попереднього тосту інакше ховав новий раніше часу
if(toastTimer) clearTimeout(toastTimer);

toastTimer = setTimeout(()=>{

toast.classList.remove("show");
toastTimer = null;

},2500);

}

// Українські відмінки: 1 день, 2 дні, 5 днів, 21 день
function pluralUk(n, one, few, many){

const mod10 = n % 10;
const mod100 = n % 100;

if(mod10 === 1 && mod100 !== 11) return one;
if(mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;

return many;

}

// Номер дня за місцевим часом — однаковий з sw.js (цитата для віджета)
function localDayNumber(){

return Math.floor(isoToUTCms(localISODate()) / 86400000);

}

function exportData(){

const data={

app: "SelfDev",
version: 2,
exportedAt: new Date().toISOString(),

habits,
goals,
notes,
history,
activityLog,

xp,
level,
streak,
streakFreezes,
lastStreakDate,

totalHabitCompletions,
totalGoalCompletions,
totalPomodoroCompletions,

unlockedAchievements,
claimedAchievements

};

const blob=new Blob(

[JSON.stringify(data)],

{type:"application/json"}

);

const url = URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="SelfDev_Backup.json";

document.body.appendChild(a);

a.click();

a.remove();

setTimeout(()=> URL.revokeObjectURL(url), 1000);

showToast("💾 Дані експортовано");

}

function importData(event){

const input = event.target;
const file = input.files && input.files[0];

if(!file) return;

if(file.size > 5*1024*1024){

showToast("🚫 Файл завеликий для резервної копії SelfDev");

input.value = "";

return;

}

const reader=new FileReader();

reader.onerror=function(){

showToast("🚫 Не вдалося прочитати файл");

input.value = "";

};

reader.onload=function(){

let data = null;

try{

data = JSON.parse(reader.result);

}catch(e){

data = null;

}

if(!data || typeof data !== "object" || Array.isArray(data) || (!Array.isArray(data.habits) && !Array.isArray(data.goals))){

showToast("🚫 Це не схоже на резервну копію SelfDev");

input.value = "";

return;

}

// Підтвердження асинхронне (нижня панель), тому решта імпорту — у колбеку нижче
askConfirm("Замінити всі дані?", "Імпорт замінить усі поточні дані даними з файлу.").then(ok=>{

if(!ok){

input.value = "";

return;

}

applyImportedData(data);

});

};

reader.readAsText(file);

}

function applyImportedData(data){

{

const list = v => Array.isArray(v) ? v.slice(0,2000) : [];
const achievementIds = v => list(v).map(Number).filter(i => Number.isInteger(i) && i >= 0 && i < achievementDefs.length);

habits = list(data.habits).map(normalizeTask).filter(Boolean);
goals = list(data.goals).map(normalizeTask).filter(Boolean);
notes = list(data.notes).map(normalizeNote).filter(Boolean);

// Поля, яких немає в старих резервних копіях (v1), лишаємо як є
if(Array.isArray(data.history)) history = normalizeHistory(data.history);
if(Array.isArray(data.activityLog)) activityLog = normalizeActivityLog(data.activityLog);

xp = clampInt(data.xp, 0, 1000000, 0);
level = clampInt(data.level, 1, MAX_LEVEL, 1);
streak = clampInt(data.streak, 0, 100000, 0);

if(data.streakFreezes !== undefined){

streakFreezes = clampInt(data.streakFreezes, 0, 1000, 0);
localStorage.setItem("streakFreezes", streakFreezes);

}

if(typeof data.lastStreakDate === "string" && ISO_DATE_RE.test(data.lastStreakDate) && data.lastStreakDate <= localISODate()){

lastStreakDate = data.lastStreakDate;
localStorage.setItem("lastStreakDate", lastStreakDate);

}

if(data.totalHabitCompletions !== undefined){

totalHabitCompletions = clampInt(data.totalHabitCompletions, 0, 10000000, 0);
localStorage.setItem("totalHabitCompletions", totalHabitCompletions);

}

if(data.totalGoalCompletions !== undefined){

totalGoalCompletions = clampInt(data.totalGoalCompletions, 0, 10000000, 0);
localStorage.setItem("totalGoalCompletions", totalGoalCompletions);

}

if(data.totalPomodoroCompletions !== undefined){

totalPomodoroCompletions = clampInt(data.totalPomodoroCompletions, 0, 10000000, 0);
localStorage.setItem("totalPomodoroCompletions", totalPomodoroCompletions);

}

if(Array.isArray(data.unlockedAchievements)){

unlockedAchievements = achievementIds(data.unlockedAchievements);
localStorage.setItem("unlockedAchievements", JSON.stringify(unlockedAchievements));

}

if(Array.isArray(data.claimedAchievements)){

claimedAchievements = achievementIds(data.claimedAchievements);
localStorage.setItem("claimedAchievements", JSON.stringify(claimedAchievements));

}

localStorage.setItem("activityLog", JSON.stringify(activityLog));

save();

location.reload();

}

}

function renderNotes(){

const list = document.getElementById("notesList");

if(!list) return;

list.innerHTML = "";

if(notes.length === 0){

    list.innerHTML = '<p class="empty-state">📖 Тут з\'являться твої записи. Почни з одного речення про сьогоднішній день.</p>';

    return;

}

// Нові записи — зверху; індекс у кнопках лишається справжнім індексом у масиві
notes.map((n, i) => i).reverse().forEach((index, pos)=>{

    const noteItem = notes[index];
    const edited = noteItem.updated && noteItem.updated !== noteItem.created;

    const li = document.createElement("li");

    li.className = "note-card";
    li.dataset.index = index;
    li.style.animationDelay = (Math.min(pos,10)*0.04)+"s";

    li.innerHTML = `
        <div class="note-body">${escapeHtml(noteItem.text)}</div>
        <div class="note-foot">
        <small>${edited ? "✏️ " + escapeHtml(noteItem.updated) : "📅 " + escapeHtml(noteItem.created)}</small>
        <div class="task-actions">
        <button type="button" onclick="editNote(${index})" aria-label="Редагувати запис">✏️</button>
        <button type="button" class="act-note-del" onclick="deleteNote(${index})" aria-label="Видалити запис">🗑</button>
        </div>
        </div>
    `;

    list.appendChild(li);

});

}

function updateNoteCounter(){

const input = document.getElementById("noteInput");
const counter = document.getElementById("noteCounter");

if(input && counter) counter.innerText = input.value.length + " / 5000";

}

function addNote(){

const input = document.getElementById("noteInput");

if(!input || input.value.trim()==="") return;

const stamp = new Date().toLocaleString();

notes.push({
    text: input.value.trim().slice(0,5000),
    created: stamp,
    updated: stamp
});

input.value = "";

updateNoteCounter();

save();
renderNotes();

showToast("📖 Нотатку додано");

}

async function editNote(index){

const note = notes[index];

if(!note) return;

let text = null;

if(typeof uiSheet === "function"){

    const r = await uiSheet({ title:"Редагувати нотатку", mode:"area", value:note.text, okText:"Зберегти" });

    text = r ? r.value : null;

}else{

    text = prompt("Редагувати нотатку", note.text);

}

if(text===null || notes[index] !== note) return;

if(text.trim()==="") return;

note.text = text.slice(0,5000);
note.updated = new Date().toLocaleString();

save();
renderNotes();

}

async function deleteNote(index){

if(deletePending || !notes[index]) return;

const target = notes[index];

if(!(await askConfirm("Видалити нотатку?", "Її не можна буде відновити."))) return;

if(deletePending || notes[index] !== target) return;

const li = document.querySelector('#notesList [data-index="'+index+'"]');

function finalizeDelete(){

    notes.splice(index,1);

    deletePending = false;

    save();
    renderNotes();

}

deletePending = true;

if(li){

    li.classList.add("removing");

    setTimeout(finalizeDelete, 300);

}else{

    finalizeDelete();

}

}

function togglePin(index){

    if(!goals[index]) return;

    goals[index].pinned = !goals[index].pinned;

    save();

    renderGoals();

}

function toggleHabitPin(index){

    if(!habits[index]) return;

    habits[index].pinned = !habits[index].pinned;

    save();

    renderHabits();

}

function changePomodoro(step){

    const input = document.getElementById("pomodoroMinutes");

    if(!input) return;

    let value = Number(input.value) || 0;

    value += step;

    if(value < 1) value = 1;
    if(value > 180) value = 180;

    input.value = value;

    highlightPomodoroPreset();

}

function setPomodoroPreset(minutes){

    const input = document.getElementById("pomodoroMinutes");

    if(!input) return;

    input.value = clampInt(minutes, 1, 180, 25);

    highlightPomodoroPreset();

}

function highlightPomodoroPreset(){

    const input = document.getElementById("pomodoroMinutes");
    const value = input ? Number(input.value) : 0;

    document.querySelectorAll(".preset-row button").forEach(b=>{

        const on = Number(b.dataset.min) === value;

        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");

    });

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

    if(typeof jarvisReact === "function") jarvisReact("page");

}

function updateHistory(){

    const today = localISODate();

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

const percentByDate = new Map();

history.forEach(h => percentByDate.set(h.date, h.percent));

for(let i=days-1;i>=0;i--){

    const iso = isoDaysAgo(i);

    const percent = percentByDate.has(iso) ? percentByDate.get(iso) : 0;

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

        const d = new Date();

        d.setDate(d.getDate() - offset);

        return { iso: localISODate(d), dayIndex: d.getDay() };

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

    if(chartPeriod === "1h"){

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

        const buckets = new Array(24).fill(0);
        const labels = buckets.map((_, i) => String(i).padStart(2,"0")+"-"+String((i+1)%24).padStart(2,"0"));

        activityLog.forEach(ts=>{

            if(ts >= todayStart){

                const hoursSinceMidnight = (ts - todayStart)/3600000;
                const bucketIndex = Math.min(23, Math.floor(hoursSinceMidnight));

                buckets[bucketIndex]++;

            }

        });

        return { labels, data: buckets, label: "Виконано завдань", isCount: true };

    }

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

            last14.push({ date: isoDaysAgo(i), count: 0 });

        }

        activityLog.forEach(ts=>{

            const iso = localISODate(new Date(ts));
            const day = last14.find(d=>d.date===iso);

            if(day) day.count++;

        });

        const labels = last14.map(d => {

            const parts = d.date.split("-");

            return parts.length === 3 ? `${parts[2]}.${parts[1]}` : d.date;

        });

        return { labels, data: last14.map(d=>d.count), label: "Виконано завдань за день", isCount: true };

    }

    if(chartPeriod === "week" || chartPeriod === "2weeks"){

        const daysPerBucket = chartPeriod === "week" ? 7 : 14;
        const bucketsCount = 8;

        const labels = [];
        const data = [];

        const todayMid = new Date();

        todayMid.setHours(0,0,0,0);

        for(let i=bucketsCount-1;i>=0;i--){

            const endDay = new Date(todayMid);
            endDay.setDate(endDay.getDate() - i*daysPerBucket);

            const startDay = new Date(endDay);
            startDay.setDate(startDay.getDate() - (daysPerBucket-1));

            const nextDay = new Date(endDay);
            nextDay.setDate(nextDay.getDate() + 1);

            const startTs = startDay.getTime();
            const endTs = nextDay.getTime();

            const count = activityLog.filter(ts => ts >= startTs && ts < endTs).length;

            labels.push(`${startDay.getDate()}.${startDay.getMonth()+1}`);
            data.push(count);

        }

        return { labels, data, label: chartPeriod==="week" ? "Виконано завдань за тиждень" : "Виконано завдань за 2 тижні", isCount: true };

    }

    if(chartPeriod === "month"){

        const grouped = {};

        activityLog.forEach(ts=>{

            const d = new Date(ts);
            const monthKey = d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");

            grouped[monthKey] = (grouped[monthKey] || 0) + 1;

        });

        const monthKeys = Object.keys(grouped).sort().slice(-12);

        const labels = monthKeys.map(k=>{

            const parts = k.split("-");

            return monthNames[parseInt(parts[1])-1]+" "+parts[0].slice(2);

        });

        const data = monthKeys.map(k=> grouped[k]);

        return { labels, data, label: "Виконано завдань за місяць", isCount: true };

    }

    if(chartPeriod === "year"){

        const grouped = {};

        activityLog.forEach(ts=>{

            const yearKey = String(new Date(ts).getFullYear());

            grouped[yearKey] = (grouped[yearKey] || 0) + 1;

        });

        const yearKeys = Object.keys(grouped).sort();

        const data = yearKeys.map(k=> grouped[k]);

        return { labels: yearKeys, data, label: "Виконано завдань за рік", isCount: true };

    }

    return { labels: [], data: [], label: "", isCount: false };

}

function drawAchievementChart(){

    const canvas = document.getElementById("achievementChart");

    if(!canvas) return;

    if(typeof Chart === "undefined") return;

    const { labels, data, label, isCount } = getChartData();

    const isLight = document.body.classList.contains("light");
    const tickColor = isLight ? "#475569" : "#94a3b8";
    const legendColor = isLight ? "#1e293b" : "#e2e8f0";

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
                    // Кількість завдань — ціле число, без «0,1 завдання» на осі
                    ticks: { color: tickColor, precision: 0 },
                    grid: { color: "rgba(148,163,184,0.15)" }
                },

                x: {
                    ticks: { color: tickColor },
                    grid: { color: "rgba(148,163,184,0.05)" }
                }

            },

            plugins: {

                legend: {
                    labels: { color: legendColor }
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

    // Новий день обробляємо ПЕРШИМ: інакше updateDayProgress бачив вчорашні виконані
    // звички, ставив сьогоднішній прогрес 100% і відкривав щоденний бонус «задарма».
    try{ updateStreak(); }catch(e){ console.error("updateStreak:", e); }
    try{ renderHabits(); }catch(e){ console.error("renderHabits:", e); }
    try{ renderGoals(); }catch(e){ console.error("renderGoals:", e); }
    try{ updateStats(); }catch(e){ console.error("updateStats:", e); }
    try{ updateDayProgress(); }catch(e){ console.error("updateDayProgress:", e); }
    try{ showDailyQuote(); }catch(e){ console.error("showDailyQuote:", e); }
    try{ updateAchievements(); }catch(e){ console.error("updateAchievements:", e); }
    try{ checkAchievements(); }catch(e){ console.error("checkAchievements:", e); }
    try{ drawAchievementChart(); }catch(e){ console.error("drawAchievementChart:", e); }
    try{ updateWeeklySummary(); }catch(e){ console.error("updateWeeklySummary:", e); }
    try{ updateLifeSpheres(); }catch(e){ console.error("updateLifeSpheres:", e); }
    try{ renderActivityHeatmap(); }catch(e){ console.error("renderActivityHeatmap:", e); }
    try{ renderNotes(); }catch(e){ console.error("renderNotes:", e); }

    // Ярлики з manifest.json (?page=habits / goals / timer) раніше нічого не робили
    try{

        const requestedPage = new URLSearchParams(location.search).get("page");

        if(requestedPage && /^[a-z]+$/.test(requestedPage)){

            const pageEl = document.getElementById(requestedPage);

            if(pageEl && pageEl.classList.contains("page")) openPage(requestedPage);

        }

    }catch(e){ console.error("page shortcut:", e); }

    try{ publishWidgetSummary(); }catch(e){ console.error("publishWidgetSummary:", e); }

    try{

        const chartPeriodSelect = document.getElementById("chartPeriodSelect");

        if(chartPeriodSelect) chartPeriodSelect.value = chartPeriod;

    }catch(e){ console.error("chartPeriodSelect init:", e); }
    try{ showCompanionGreeting(); }catch(e){ console.error("showCompanionGreeting:", e); }

});

if("serviceWorker" in navigator){

try{
navigator.serviceWorker.register("sw.js").catch(e=> console.error("service worker register:", e));
}catch(e){ console.error("service worker register:", e); }

}

// ----------------
// Сповіщення
// ----------------

let notifyEnabled = localStorage.getItem("notifyEnabled") === "true";
// Раніше Number(null) давав 0, тож за замовчуванням звук сповіщень був вимкнений
let notifyVolume = clampInt(safeNumber("notifyVolume", 70), 0, 100, 70);
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

        statusEl.innerText = "✅ Щодня о " + notifyTime;

    }else{

        statusEl.innerText = "Вимкнено";

    }

    statusEl.classList.toggle("on", notifyEnabled && "Notification" in window && Notification.permission === "granted");

}

function enableNotifications(){

    if(!("Notification" in window)){

        showToast("🚫 Браузер не підтримує сповіщення");

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

    const today = localISODate(now);

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

// Якщо застосунок лишився відкритим після опівночі (або вкладку розбудили зі сну),
// скидаємо щоденні речі: звички, лічильники дня, виклики, серію.
function checkDayRollover(){

    try{

        if(lastOpen && lastOpen !== localISODate()){

            updateStreak();
            renderDailyChallenges();

        }

    }catch(e){

        console.error("checkDayRollover:", e);

    }

}

setInterval(checkDayRollover, 60000);

document.addEventListener("visibilitychange", ()=>{

    if(!document.hidden) checkDayRollover();

});

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
