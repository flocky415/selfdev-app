// © 2026 Roman Chelyk. Усі права захищено.
//
// Воронка повернення — чотири шари поверх XP, серії та досягнень:
//   1. Сезонна стежка: 30 кроків за 35 днів, нагороди на 3/7/14/21/30 кроці,
//      незабрані нагороди згорають разом із сезоном.
//   2. Скриня дня: відкривається, коли забрано всі три щоденні квести.
//   3. Ритуал: зранку — до 3 головних завдань, увечері — підсумок і план на завтра.
//   4. Енергія Джарвіза: росте від виконаних завдань, падає за пропущені дні.
//
// Файл підключається після app.js і користується його глобальними змінними
// (xp, level, habits, goals, лічильники дня). Нічого не нараховує «з повітря»:
// усе рахується з лічильників дня, тому повторне відкриття нічого не дублює.

"use strict";

const SEASON_STEPS = 30;
const SEASON_DAYS = 35;

const SEASON_THEMES = [
    { name:"Космос", icon:"🚀", skin:"s-nebula", skinName:"Туманність" },
    { name:"Океан", icon:"🌊", skin:"s-abyss", skinName:"Глибина" },
    { name:"Ліс", icon:"🌲", skin:"s-moss", skinName:"Мох" },
    { name:"Вулкан", icon:"🌋", skin:"s-magma", skinName:"Магма" }
];

const SEASON_MILESTONES = [
    { step:3, icon:"🎁", xp:30, freeze:0 },
    { step:7, icon:"❄️", xp:60, freeze:1 },
    { step:14, icon:"💰", xp:100, freeze:0 },
    { step:21, icon:"❄️", xp:150, freeze:2 },
    { step:30, icon:"👑", xp:300, freeze:0, final:true }
];

const PET_BONDS = [
    { days:100, name:"Легенда" },
    { days:30, name:"Найкращий друг" },
    { days:10, name:"Друг" },
    { days:3, name:"Приятель" },
    { days:0, name:"Знайомий" }
];

function fnLoad(key, fallback){

    try{

        const v = JSON.parse(localStorage.getItem(key));

        return v && typeof v === "object" ? v : fallback;

    }catch(e){

        return fallback;

    }

}

function fnStore(key, value){

    try{ localStorage.setItem(key, JSON.stringify(value)); }catch(e){ console.error("funnel save:", key, e); }

}

function fnInt(v, min, max, d){

    const n = Math.floor(Number(v));

    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;

}

function fnIso(v){

    return typeof v === "string" && ISO_DATE_RE.test(v) ? v : "";

}

function fnKeys(v){

    return Array.isArray(v) ? v.filter(k => typeof k === "string" && /^[hg]:/.test(k)).slice(0, 3) : [];

}

// ---------- Стан ----------

let seasonState = (function(){

    const s = fnLoad("seasonState", {});

    return {
        n: fnInt(s.n, 1, 100000, 1),
        start: fnIso(s.start),
        steps: fnInt(s.steps, 0, SEASON_STEPS, 0),
        lastStep: fnIso(s.lastStep),
        claimed: Array.isArray(s.claimed) ? s.claimed.map(Number).filter(x => SEASON_MILESTONES.some(m => m.step === x)) : []
    };

})();

let seasonSkins = safeArray("seasonSkins").filter(x => typeof x === "string").slice(0, 50);
let seasonTrophies = safeArray("seasonTrophies").filter(x => x && typeof x === "object").slice(-50);

let chestOpenedDate = fnIso(localStorage.getItem("chestOpenedDate"));
let chestLastReward = String(localStorage.getItem("chestLastReward") || "").slice(0, 80);

let dayPlan = (function(){

    const p = fnLoad("dayPlan", {});

    return { date: fnIso(p.date), keys: fnKeys(p.keys), bonus: p.bonus === true };

})();

let nextPlan = (function(){

    const p = fnLoad("nextPlan", {});

    return { date: fnIso(p.date), keys: fnKeys(p.keys) };

})();

let eveningDate = fnIso(localStorage.getItem("eveningDate"));

let dayXpStart = (function(){

    const p = fnLoad("dayXpStart", {});

    return { date: fnIso(p.date), total: fnInt(p.total, 0, 100000000, 0) };

})();

let jarvisPet = (function(){

    const p = fnLoad("jarvisPet", {});

    return {
        energy: fnInt(p.energy, 0, 100, 60),
        day: fnIso(p.day),
        credited: fnInt(p.credited, 0, 100000, 0),
        fedDays: fnInt(p.fedDays, 0, 1000000, 0),
        away: 0
    };

})();

let fnBusy = false;

function fnSaveSeason(){ fnStore("seasonState", seasonState); }
function fnSavePet(){ fnStore("jarvisPet", { energy:jarvisPet.energy, day:jarvisPet.day, credited:jarvisPet.credited, fedDays:jarvisPet.fedDays }); }

function fnTotalXp(){ return (level - 1) * 100 + xp; }

function fnActivityToday(){ return habitsCompletedToday + goalsCompletedToday + pomodorosCompletedToday; }

function fnGrantXp(amount){

    xp += amount;

    updateLevel();

}

function fnGrantFreeze(count){

    streakFreezes = Math.min(1000, streakFreezes + count);

    localStorage.setItem("streakFreezes", streakFreezes);

}

function fnSay(text, action, seconds){

    if(typeof jarvisSay !== "function") return;
    if(typeof jarvisHintsEnabled === "function" && !jarvisHintsEnabled()) return;
    if(typeof jarvisBusyElsewhere === "function" && jarvisBusyElsewhere()) return;

    try{ jarvisSay(text, action, seconds); }catch(e){ console.error("jarvisSay:", e); }

}

// ---------- 1. Сезонна стежка ----------

function seasonTheme(n){

    return SEASON_THEMES[((n || seasonState.n) - 1) % SEASON_THEMES.length];

}

function seasonDaysLeft(){

    if(!seasonState.start) return SEASON_DAYS;

    return Math.max(0, SEASON_DAYS - daysBetweenISO(seasonState.start, localISODate()));

}

function seasonReadyMilestones(){

    return SEASON_MILESTONES.filter(m => seasonState.steps >= m.step && !seasonState.claimed.includes(m.step));

}

function seasonTick(){

    const today = localISODate();

    if(!seasonState.start){

        seasonState.start = today;
        fnSaveSeason();

    }

    const age = daysBetweenISO(seasonState.start, today);

    // Сезон скінчився: незабрані нагороди згорають, починається наступний
    if(age >= SEASON_DAYS){

        const old = seasonTheme();
        const burned = seasonReadyMilestones().length;

        seasonState = { n: seasonState.n + 1, start: today, steps: 0, lastStep: "", claimed: [] };
        fnSaveSeason();

        const fresh = seasonTheme();

        setTimeout(()=>{

            showToast(fresh.icon + " Новий сезон «" + fresh.name + "»!" + (burned ? " Незабрані нагороди «" + old.name + "» згоріли" : ""));

        }, 1200);

    }

    if(fnActivityToday() > 0 && seasonState.lastStep !== today && age >= 0){

        seasonState.lastStep = today;

        seasonAddStep(true);

    }

}

function seasonAddStep(announce){

    if(seasonState.steps >= SEASON_STEPS){

        fnSaveSeason();

        return false;

    }

    seasonState.steps++;
    fnSaveSeason();

    const hit = SEASON_MILESTONES.find(m => m.step === seasonState.steps);

    if(announce){

        setTimeout(()=>{

            showToast(hit
                ? "🗺️ Крок " + seasonState.steps + " — нагорода сезону чекає на головній!"
                : "🗺️ Крок " + seasonState.steps + " із " + SEASON_STEPS + " на стежці сезону");

        }, 2600);

    }

    return true;

}

function seasonRewardText(m){

    const parts = ["+" + m.xp + " XP"];

    if(m.freeze) parts.push("❄️×" + m.freeze);
    if(m.final) parts.push("скін «" + seasonTheme().skinName + "»");

    return parts.join(" · ");

}

function claimSeasonReward(step){

    const m = SEASON_MILESTONES.find(x => x.step === step);

    if(!m || seasonState.steps < m.step || seasonState.claimed.includes(m.step)) return;

    seasonState.claimed.push(m.step);
    fnSaveSeason();

    if(m.freeze) fnGrantFreeze(m.freeze);

    const theme = seasonTheme();
    let extra = "";

    if(m.final){

        if(!seasonSkins.includes(theme.skin)){

            seasonSkins.push(theme.skin);
            localStorage.setItem("seasonSkins", JSON.stringify(seasonSkins));

            extra = "Ексклюзивний скін «" + theme.skinName + "» відкрито — обери його в налаштуваннях Джарвіза";

        }

        seasonTrophies.push({ n: seasonState.n, name: theme.name, icon: theme.icon, date: localISODate() });
        localStorage.setItem("seasonTrophies", JSON.stringify(seasonTrophies));

    }

    fnGrantXp(m.xp);

    fnReveal(
        m.final ? theme.icon : m.icon,
        m.final ? "Сезон «" + theme.name + "» пройдено!" : "Нагорода за крок " + m.step,
        "+" + m.xp + " XP" + (m.freeze ? " · ❄️ +" + m.freeze + " " + pluralUk(m.freeze, "заморозка", "заморозки", "заморозок") : ""),
        extra
    );

    if(typeof renderJarvisSkinPicker === "function") renderJarvisSkinPicker();

    updateStats();

}

function seasonNodeXY(i){

    const row = Math.floor(i / 6);
    const col = i % 6;
    const x = 28 + (row % 2 === 0 ? col : 5 - col) * 56;
    const y = 28 + row * 56;

    return [x, y];

}

function renderSeasonCard(){

    const card = document.getElementById("seasonCard");

    if(!card) return;

    const theme = seasonTheme();
    const steps = seasonState.steps;
    const left = seasonDaysLeft();
    const ready = seasonReadyMilestones();
    const next = SEASON_MILESTONES.find(m => steps < m.step);
    const doneToday = seasonState.lastStep === localISODate();

    const pts = [];

    for(let i = 0; i < SEASON_STEPS; i++) pts.push(seasonNodeXY(i));

    const line = arr => arr.map(p => p.join(",")).join(" ");

    let nodes = "";

    pts.forEach((p, i)=>{

        const n = i + 1;
        const m = SEASON_MILESTONES.find(x => x.step === n);
        const cls = ["sn"];

        if(n <= steps) cls.push("done");
        if(n === steps + 1) cls.push("next");
        if(m) cls.push("gift");
        if(m && n <= steps && !seasonState.claimed.includes(n)) cls.push("ready");

        nodes +=
            '<g class="' + cls.join(" ") + '"' + (m ? ' onclick="seasonNodeTap(' + n + ')"' : "") + '>' +
            '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="' + (m ? 19 : 14) + '"/>' +
            '<text x="' + p[0] + '" y="' + (p[1] + (m ? 6 : 4)) + '" text-anchor="middle">' +
            (m ? (seasonState.claimed.includes(n) ? "✓" : m.icon) : n) + '</text>' +
            '</g>';

    });

    let status;

    if(steps >= SEASON_STEPS){

        status = "Стежку пройдено! Новий сезон через " + left + " " + pluralUk(left, "день", "дні", "днів");

    }else if(doneToday){

        status = "Крок на сьогодні зроблено ✅ Повертайся завтра";

    }else{

        status = "Виконай будь-яке завдання сьогодні — і зробиш крок";

    }

    const need = SEASON_STEPS - steps;
    const tight = steps < SEASON_STEPS && left <= need + 2;

    card.innerHTML =
        '<div class="season-head">' +
            '<div><h3>' + theme.icon + ' Сезон ' + seasonState.n + ' · «' + theme.name + '»</h3>' +
            '<p class="season-status">' + status + '</p></div>' +
            '<div class="season-timer' + (tight ? " tight" : "") + '"><b>' + left + '</b><span>' + pluralUk(left, "день", "дні", "днів") + '</span></div>' +
        '</div>' +
        '<div class="season-body">' +
        '<svg class="season-map" viewBox="0 0 336 280" role="img" aria-label="Стежка сезону: крок ' + steps + ' із ' + SEASON_STEPS + '">' +
            '<polyline class="sp-track" points="' + line(pts) + '"/>' +
            (steps > 1 ? '<polyline class="sp-done" points="' + line(pts.slice(0, steps)) + '"/>' : "") +
            nodes +
        '</svg>' +
        '<div class="season-side">' +
            '<div class="season-progress"><b>' + steps + '</b> / ' + SEASON_STEPS + ' кроків</div>' +
            '<div class="season-bar"><div style="width:' + Math.round(steps / SEASON_STEPS * 100) + '%"></div></div>' +
            '<div class="season-rewards">' +
            SEASON_MILESTONES.map(m=>{

                const claimed = seasonState.claimed.includes(m.step);
                const isReady = !claimed && steps >= m.step;

                return '<div class="season-reward' + (claimed ? " claimed" : isReady ? " ready" : "") + '">' +
                    '<span class="sr-step">' + m.step + '</span>' +
                    '<span class="sr-text">' + seasonRewardText(m) + '</span>' +
                    (claimed ? '<span class="sr-state">✅</span>'
                        : isReady ? '<button type="button" onclick="claimSeasonReward(' + m.step + ')">Забрати</button>'
                        : '<span class="sr-state">🔒</span>') +
                    '</div>';

            }).join("") +
            '</div>' +
            (ready.length
                ? '<p class="season-note warn">Незабрані нагороди згорять наприкінці сезону</p>'
                : next ? '<p class="season-note">До наступної нагороди: ' + (next.step - steps) + ' ' + pluralUk(next.step - steps, "крок", "кроки", "кроків") + '</p>' : "") +
            (seasonTrophies.length
                ? '<p class="season-trophies" title="Пройдені сезони">' + seasonTrophies.slice(-8).map(t => escapeHtml(String(t.icon || "🏆"))).join(" ") + '</p>'
                : "") +
        '</div>' +
        '</div>';

}

function seasonNodeTap(step){

    const m = SEASON_MILESTONES.find(x => x.step === step);

    if(!m) return;

    if(seasonState.steps >= step && !seasonState.claimed.includes(step)){

        claimSeasonReward(step);

        return;

    }

    showToast((seasonState.claimed.includes(step) ? "✅ Отримано: " : "🔒 Крок " + step + ": ") + seasonRewardText(m));

}

// ---------- 2. Скриня дня ----------

function chestReady(){

    return dailyChallengesIds.length > 0
        && dailyChallengesIds.every(id => dailyChallengesClaimed.includes(id))
        && chestOpenedDate !== localISODate();

}

function openDailyChest(){

    if(!chestReady()) return;

    chestOpenedDate = localISODate();
    localStorage.setItem("chestOpenedDate", chestOpenedDate);

    const roll = Math.random();
    let icon, title, text;
    let grantXp = 0;

    if(roll < 0.06){

        icon = "💎"; title = "Джекпот!"; text = "+150 XP"; grantXp = 150;

    }else if(roll < 0.18 && seasonState.steps < SEASON_STEPS){

        seasonAddStep(false);

        icon = "🗺️"; title = "Бонусний крок!"; text = "+1 крок на стежці сезону";

    }else if(roll < 0.30){

        fnGrantFreeze(1);

        icon = "❄️"; title = "Заморозка серії"; text = "+1 заморозка — пропущений день не обірве серію";

    }else if(roll < 0.55){

        icon = "💰"; title = "Гарний улов"; text = "+50 XP"; grantXp = 50;

    }else{

        icon = "✨"; title = "Скриня дня"; text = "+25 XP"; grantXp = 25;

    }

    chestLastReward = icon + " " + text;
    localStorage.setItem("chestLastReward", chestLastReward);

    if(grantXp) fnGrantXp(grantXp);

    fnReveal(icon, title, text, "Завтра — нові квести й нова скриня");

    updateStats();

}

function renderChest(){

    const box = document.getElementById("dailyChest");

    if(!box) return;

    const total = dailyChallengesIds.length;
    const claimed = dailyChallengesIds.filter(id => dailyChallengesClaimed.includes(id)).length;
    const opened = chestOpenedDate === localISODate();
    const ready = chestReady();

    box.className = "chest-row" + (ready ? " ready" : opened ? " opened" : "");

    box.innerHTML =
        '<div class="chest-icon" aria-hidden="true">' + (opened ? "📭" : "🎁") + '</div>' +
        '<div class="chest-info"><b>Скриня дня</b>' +
        '<small>' + (opened
            ? "Сьогодні випало: " + escapeHtml(chestLastReward)
            : ready ? "Усі квести забрано — відкривай!"
            : "Забери всі квести: " + claimed + "/" + total + " · усередині сюрприз") + '</small></div>' +
        (ready ? '<button type="button" onclick="openDailyChest()">Відкрити</button>' : '<span class="chest-state">' + (opened ? "✅" : "🔒") + '</span>');

}

// ---------- 3. Ритуал: ранковий план і вечірній підсумок ----------

function planFind(key){

    const kind = key.charAt(0);
    const name = key.slice(2);
    const list = kind === "g" ? goals : habits;
    const index = list.findIndex(t => t.name === name);

    return index === -1 ? null : { kind, name, index, item: list[index] };

}

function planCandidates(forTomorrow){

    const out = [];

    habits.forEach(h => { if(forTomorrow || !h.done) out.push("h:" + h.name); });
    goals.forEach(g => { if(!g.done) out.push("g:" + g.name); });

    return Array.from(new Set(out));

}

function planTick(){

    const today = localISODate();

    if(dayXpStart.date !== today){

        dayXpStart = { date: today, total: fnTotalXp() };
        fnStore("dayXpStart", dayXpStart);

    }

    if(dayPlan.date !== today){

        // План, складений учора ввечері, стає сьогоднішнім
        const carried = nextPlan.date === today ? nextPlan.keys.filter(k => planFind(k)) : [];

        dayPlan = { date: carried.length ? today : "", keys: carried, bonus: false };
        fnStore("dayPlan", dayPlan);

    }

    if(dayPlan.date === today && dayPlan.keys.length){

        const alive = dayPlan.keys.filter(k => planFind(k));

        if(alive.length !== dayPlan.keys.length){

            dayPlan.keys = alive;
            fnStore("dayPlan", dayPlan);

        }

        if(alive.length && !dayPlan.bonus && alive.every(k => planFind(k).item.done)){

            dayPlan.bonus = true;
            fnStore("dayPlan", dayPlan);

            const bonus = alive.length >= 3 ? 20 : 10;

            setTimeout(()=> showToast("🎯 Фокус дня виконано! +" + bonus + " XP"), 900);

            fnGrantXp(bonus);

        }

    }

}

function renderRitualCard(){

    const card = document.getElementById("ritualCard");

    if(!card) return;

    const today = localISODate();
    const hour = new Date().getHours();
    const hasPlan = dayPlan.date === today && dayPlan.keys.length > 0;
    const evening = hour >= 19 || hour < 4;
    const eveningDone = eveningDate === today;

    let html = '<h3>' + (evening ? "🌙 Вечір" : "☀️ План на сьогодні") + '</h3>';

    if(hasPlan){

        const items = dayPlan.keys.map(planFind).filter(Boolean);
        const done = items.filter(x => x.item.done).length;

        html += '<p class="ritual-sub">' + (dayPlan.bonus ? "Фокус дня виконано ✅" : "Головне на сьогодні: " + done + " з " + items.length) + '</p>';

        html += '<div class="plan-list">' + items.map((x, i)=>
            '<button type="button" class="plan-item' + (x.item.done ? " done" : "") + '" onclick="funnelPlanToggle(' + i + ')">' +
            '<span class="plan-check">' + (x.item.done ? "✓" : "") + '</span>' +
            '<span class="plan-name">' + escapeHtml(x.name) + '</span>' +
            '<span class="plan-kind">' + (x.kind === "g" ? "ціль" : "") + '</span>' +
            '</button>').join("") + '</div>';

    }else if(planCandidates(false).length === 0){

        html += '<p class="ritual-sub">' + (habits.length + goals.length === 0
            ? "Додай перші завдання — і зранку обереш головні"
            : "Усе виконано. Чудовий день! 🎉") + '</p>';

    }else{

        html += '<p class="ritual-sub">Обери до 3 головних завдань — за всі разом бонус +20 XP</p>' +
            '<button type="button" class="ritual-btn" onclick="openPlanPicker()">☀️ Скласти план</button>';

    }

    if(evening){

        html += eveningDone
            ? '<p class="ritual-done">День завершено. До завтра! 🌙</p>'
            : '<button type="button" class="ritual-btn evening" onclick="openEveningSummary()">🌙 Підсумок дня · +10 XP</button>';

    }else if(hasPlan && !dayPlan.bonus){

        html += '<button type="button" class="ritual-link" onclick="openPlanPicker()">Змінити план</button>';

    }

    card.innerHTML = html;

}

function funnelPlanToggle(i){

    const x = planFind(dayPlan.keys[i] || "");

    if(!x) return;

    if(x.kind === "g") toggleGoal(x.index);
    else toggleHabit(x.index);

}

// Спільне модальне вікно воронки (вибір завдань, підсумок дня, нагорода)
let fnModalEl = null;
let fnPick = null;

function fnModal(){

    if(fnModalEl) return fnModalEl;

    const el = document.createElement("div");

    el.className = "fn-modal";
    el.innerHTML = '<div class="fn-modal-box" role="dialog" aria-modal="true"></div>';

    el.addEventListener("click", e => { if(e.target === el) fnModalClose(); });

    document.addEventListener("keydown", e => { if(e.key === "Escape" && el.classList.contains("show")) fnModalClose(); });

    document.body.appendChild(el);

    fnModalEl = el;

    return el;

}

function fnModalOpen(html){

    const el = fnModal();

    el.firstElementChild.innerHTML = html;
    el.classList.add("show");

}

function fnModalClose(){

    if(fnModalEl) fnModalEl.classList.remove("show");

    fnPick = null;

}

function fnReveal(icon, title, text, note){

    fnModalOpen(
        '<div class="fn-reveal">' +
        '<div class="fn-reveal-icon">' + icon + '</div>' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<p class="fn-reveal-text">' + escapeHtml(text) + '</p>' +
        (note ? '<p class="fn-reveal-note">' + escapeHtml(note) + '</p>' : "") +
        '<button type="button" class="fn-ok" onclick="fnModalClose()">Чудово!</button>' +
        '</div>'
    );

    launchConfetti();

    if(typeof haptic === "function") haptic([20, 40, 30]);
    if(typeof jarvisDo === "function"){ try{ jarvisDo("celebrate"); }catch(e){} }

}

function fnPickListHtml(){

    return fnPick.options.map((key, i)=>{

        const on = fnPick.selected.includes(key);

        return '<button type="button" class="pick-item' + (on ? " on" : "") + '" onclick="fnPickToggle(' + i + ')">' +
            '<span class="plan-check">' + (on ? "✓" : "") + '</span>' +
            '<span class="plan-name">' + escapeHtml(key.slice(2)) + '</span>' +
            '<span class="plan-kind">' + (key.charAt(0) === "g" ? "ціль" : "") + '</span>' +
            '</button>';

    }).join("");

}

function fnPickToggle(i){

    if(!fnPick) return;

    const key = fnPick.options[i];
    const at = fnPick.selected.indexOf(key);

    if(at !== -1){

        fnPick.selected.splice(at, 1);

    }else if(fnPick.selected.length >= 3){

        showToast("Не більше трьох — це ж головні 🙂");

        return;

    }else{

        fnPick.selected.push(key);

    }

    if(typeof haptic === "function") haptic(8);

    const list = fnModalEl.querySelector(".pick-list");
    const count = fnModalEl.querySelector(".pick-count");

    if(list) list.innerHTML = fnPickListHtml();
    if(count) count.textContent = fnPick.selected.length + "/3";

}

function openPlanPicker(){

    const options = planCandidates(false);

    if(!options.length){

        showToast("Немає невиконаних завдань для плану");

        return;

    }

    const today = localISODate();

    fnPick = {
        options,
        selected: dayPlan.date === today ? dayPlan.keys.filter(k => options.includes(k)) : []
    };

    fnModalOpen(
        '<h3>☀️ Головне на сьогодні <span class="pick-count">' + fnPick.selected.length + '/3</span></h3>' +
        '<p class="fn-sub">Обери до трьох завдань, які зроблять день вдалим</p>' +
        '<div class="pick-list">' + fnPickListHtml() + '</div>' +
        '<div class="fn-actions">' +
        '<button type="button" class="fn-cancel" onclick="fnModalClose()">Пізніше</button>' +
        '<button type="button" class="fn-ok" onclick="savePlanPicker()">Зберегти план</button>' +
        '</div>'
    );

}

function savePlanPicker(){

    if(!fnPick) return;

    if(!fnPick.selected.length){

        showToast("Обери хоча б одне завдання");

        return;

    }

    dayPlan = { date: localISODate(), keys: fnPick.selected.slice(0, 3), bonus: dayPlan.date === localISODate() && dayPlan.bonus };
    fnStore("dayPlan", dayPlan);

    fnModalClose();

    showToast("☀️ План на день готовий");

    funnelRefresh();

}

function openEveningSummary(){

    const today = localISODate();
    const total = habits.length + goals.length;
    const done = habits.filter(h => h.done).length + goals.filter(g => g.done).length;
    const gained = Math.max(0, fnTotalXp() - (dayXpStart.date === today ? dayXpStart.total : fnTotalXp()));
    const quests = dailyChallengesIds.filter(id => dailyChallengesClaimed.includes(id)).length;
    const stepped = seasonState.lastStep === today;
    const options = planCandidates(true);

    fnPick = { options, selected: nextPlan.keys.filter(k => options.includes(k)) };

    const stat = (value, label) => '<div class="sum-stat"><b>' + value + '</b><span>' + label + '</span></div>';

    fnModalOpen(
        '<h3>🌙 Підсумок дня</h3>' +
        '<div class="sum-grid">' +
        stat(done + "/" + total, "завдань виконано") +
        stat("+" + gained, "XP за сьогодні") +
        stat(streak + " 🔥", lastStreakDate === today ? "серія збережена" : "серія під загрозою") +
        stat(seasonState.steps + "/" + SEASON_STEPS, stepped ? "крок сезону зроблено" : "кроку сьогодні не було") +
        stat(quests + "/" + dailyChallengesIds.length, "квестів забрано") +
        stat(jarvisPet.energy + "%", "енергія Джарвіза") +
        '</div>' +
        (options.length
            ? '<h4>План на завтра <span class="pick-count">' + fnPick.selected.length + '/3</span></h4>' +
              '<p class="fn-sub">Обери головне зараз — зранку воно вже чекатиме на тебе</p>' +
              '<div class="pick-list">' + fnPickListHtml() + '</div>'
            : "") +
        '<div class="fn-actions">' +
        '<button type="button" class="fn-cancel" onclick="fnModalClose()">Закрити</button>' +
        '<button type="button" class="fn-ok" onclick="finishEvening()">' + (eveningDate === today ? "Зберегти" : "Завершити день · +10 XP") + '</button>' +
        '</div>'
    );

}

function finishEvening(){

    const today = localISODate();
    const tomorrow = new Date();

    // Після опівночі «вечір» належить уже новому дню — план лишаємо на нього ж
    if(tomorrow.getHours() >= 4) tomorrow.setDate(tomorrow.getDate() + 1);

    const selected = fnPick ? fnPick.selected.slice(0, 3) : [];

    nextPlan = { date: localISODate(tomorrow), keys: selected };
    fnStore("nextPlan", nextPlan);

    const first = eveningDate !== today;

    eveningDate = today;
    localStorage.setItem("eveningDate", eveningDate);

    fnModalClose();

    if(first){

        fnGrantXp(10);

        showToast("🌙 День завершено! +10 XP" + (selected.length ? " · план на завтра збережено" : ""));

    }else{

        showToast("🌙 План на завтра оновлено");

    }

    funnelRefresh();

}

// ---------- 4. Енергія Джарвіза ----------

function petTick(){

    const today = localISODate();

    if(!jarvisPet.day){

        jarvisPet.day = today;
        jarvisPet.credited = 0;

    }else if(jarvisPet.day !== today){

        const gap = daysBetweenISO(jarvisPet.day, today);

        if(gap > 0){

            // Порожні дні: усі пропущені, плюс останній відкритий, якщо в ньому нічого не зроблено
            const idle = (gap - 1) + (jarvisPet.credited === 0 ? 1 : 0);

            jarvisPet.energy = Math.max(0, jarvisPet.energy - idle * 20);
            jarvisPet.away = gap - 1;

        }

        jarvisPet.day = today;
        jarvisPet.credited = 0;

    }

    const count = fnActivityToday();

    if(count > jarvisPet.credited){

        let add = 0;

        for(let i = jarvisPet.credited; i < count; i++) add += i === 0 ? 25 : 8;

        if(jarvisPet.credited === 0) jarvisPet.fedDays++;

        jarvisPet.energy = Math.min(100, jarvisPet.energy + add);
        jarvisPet.credited = count;

    }

    fnSavePet();

}

function petMood(){

    const e = jarvisPet.energy;

    if(e >= 75) return { id:"happy", icon:"😄", name:"Щасливий", line:"Я заряджений на всі сто! Так тримати 💚" };
    if(e >= 45) return { id:"ok", icon:"🙂", name:"Бадьорий", line:"Усе гаразд. Ще одне завдання — і буде ще краще" };
    if(e >= 20) return { id:"sad", icon:"😕", name:"Сумує", line:"Мені трохи самотньо… Виконай завдання — підзарядиш мене" };

    return { id:"sleepy", icon:"😴", name:"Засинає", line:"Енергії майже немає… Одне завдання мене розбудить" };

}

function petBond(){

    return PET_BONDS.find(b => jarvisPet.fedDays >= b.days) || PET_BONDS[PET_BONDS.length - 1];

}

// Використовує getCompanionMoodClass() в app.js: настрій 3D-Джарвіза
function funnelPetMoodId(){

    return petMood().id;

}

function renderPetCard(){

    const card = document.getElementById("petCard");

    if(!card) return;

    const mood = petMood();
    const bond = petBond();
    const nextBond = PET_BONDS.slice().reverse().find(b => b.days > jarvisPet.fedDays);

    // classList, а не className: інакше зітреться клас плавної появи (ui.js)
    card.classList.remove("pet-happy", "pet-ok", "pet-sad", "pet-sleepy");
    card.classList.add("pet-" + mood.id);

    card.innerHTML =
        '<h3>🤖 Джарвіз</h3>' +
        '<div class="pet-row" onclick="petTap()">' +
        '<div class="pet-face" aria-hidden="true">' + mood.icon + '</div>' +
        '<div class="pet-info">' +
        '<b>' + mood.name + ' · ' + jarvisPet.energy + '%</b>' +
        '<div class="pet-bar"><div style="width:' + jarvisPet.energy + '%"></div></div>' +
        '<small>' + mood.line + '</small>' +
        '</div>' +
        '</div>' +
        '<p class="pet-bond">🤝 ' + bond.name + ' · разом ' + jarvisPet.fedDays + ' ' + pluralUk(jarvisPet.fedDays, "день", "дні", "днів") +
        (nextBond ? ' · до «' + nextBond.name + '» ще ' + (nextBond.days - jarvisPet.fedDays) : "") + '</p>';

}

function petTap(){

    const mood = petMood();

    if(typeof jarvisSay === "function"){

        try{ jarvisSay(mood.line, mood.id === "happy" ? "celebrate" : mood.id === "sleepy" ? "yawn" : "nod", 5); return; }catch(e){}

    }

    showToast(mood.icon + " " + mood.line);

}

// ---------- Підказки Джарвіза (jarvisHintCandidates у jarvis3d.js) ----------

function funnelHints(){

    const out = [];
    const today = localISODate();
    const hour = new Date().getHours();

    if(seasonReadyMilestones().length){

        out.push({ text:"На стежці сезону чекає нагорода — забери, поки не згоріла 🗺️", action:"celebrate", w:8 });

    }

    if(chestReady()){

        out.push({ text:"Усі квести забрано — скриня дня чекає 🎁", action:"celebrate", w:8 });

    }

    if(seasonState.steps < SEASON_STEPS && seasonState.lastStep !== today && hour >= 16){

        out.push({ text:"Сьогодні ще немає кроку на стежці сезону. Одне завдання — і він твій 🗺️", action:"point", w:5 });

    }

    const left = seasonDaysLeft();

    if(seasonState.steps < SEASON_STEPS && left <= 5){

        out.push({ text:"До кінця сезону " + left + " " + pluralUk(left, "день", "дні", "днів") + " — встигни забрати нагороди ⏳", action:"wave", w:5 });

    }

    if(dayPlan.date !== today && hour >= 5 && hour < 15 && planCandidates(false).length){

        out.push({ text:"Обери 3 головні завдання на сьогодні — картка «План» на головній ☀️", action:"point", w:6 });

    }

    if((hour >= 19 || hour < 4) && eveningDate !== today){

        out.push({ text:"Підбиймо підсумок дня? Це хвилина і +10 XP 🌙", action:"nod", w:6 });

    }

    if(jarvisPet.energy < 25){

        out.push({ text:"Енергії майже немає… Виконай одне завдання — підзаряди мене 🔋", action:"yawn", w:6 });

    }

    return out;

}

// ---------- Оновлення ----------

function funnelRefresh(){

    if(fnBusy) return;

    fnBusy = true;

    try{

        seasonTick();
        petTick();
        planTick();

    }catch(e){

        console.error("funnel tick:", e);

    }finally{

        fnBusy = false;

    }

    try{

        renderSeasonCard();
        renderChest();
        renderRitualCard();
        renderPetCard();

    }catch(e){

        console.error("funnel render:", e);

    }

}

window.addEventListener("load", ()=>{

    try{ funnelRefresh(); }catch(e){ console.error("funnelRefresh:", e); }

    // Після перерви Джарвіз зустрічає першим — до звичайних підказок
    setTimeout(()=>{

        if(jarvisPet.away >= 2){

            fnSay("Я сумував! Тебе не було " + jarvisPet.away + " " + pluralUk(jarvisPet.away, "день", "дні", "днів") + " 🥺 Виконай одне завдання — і я знову в строю", "wave", 8);

        }else if(seasonReadyMilestones().length){

            fnSay("На стежці сезону чекає нагорода 🗺️", "celebrate", 6);

        }

    }, 9500);

});

// Картка ритуалу залежить від години — оновлюємо без перезавантаження
setInterval(()=>{

    try{ if(!document.hidden) renderRitualCard(); }catch(e){}

}, 300000);
