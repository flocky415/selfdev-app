/*
 * SelfDev — сучасні елементи інтерфейсу
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 *
 * Bottom sheet замість prompt()/confirm(), свайпи у списках, вібрація,
 * фільтр за сферами, кнопка «+» і святкування нового рівня.
 * Підключається ДО app.js; дані app.js (habits, level…) читаються лише під час дій.
 */

const UI_SPHERES = [
    { key:"health",   name:"Здоров'я", icon:"💪", color:"#22c55e" },
    { key:"career",   name:"Кар'єра",  icon:"💼", color:"#3b82f6" },
    { key:"learning", name:"Навчання", icon:"📚", color:"#f97316" },
    { key:"personal", name:"Особисте", icon:"🌟", color:"#ec4899" }
];

function uiSphere(key){

    return UI_SPHERES.find(s => s.key === key) || UI_SPHERES[3];

}

// ----------------
// 6. Вібрація
// ----------------

function hapticsEnabled(){

    try{ return localStorage.getItem("hapticsEnabled") !== "false"; }catch(e){ return true; }

}

function haptic(pattern){

    if(!hapticsEnabled()) return;

    // Браузер дозволяє вібрацію лише після першого дотику до сторінки
    if(navigator.userActivation && !navigator.userActivation.hasBeenActive) return;

    try{ if(navigator.vibrate) navigator.vibrate(pattern || 15); }catch(e){}

}

function uiXpFloat(li, amount){

    if(!li || !amount) return;

    const el = document.createElement("span");

    el.className = "xp-float";
    el.textContent = "+" + amount + " XP";

    li.appendChild(el);

    li.classList.remove("just-done");
    void li.offsetWidth;
    li.classList.add("just-done");

    setTimeout(()=>{ el.remove(); li.classList.remove("just-done"); }, 1000);

}

// ----------------
// 8. Bottom sheet
// ----------------

let uiSheetEls = null;
let uiSheetResolve = null;

function uiSheetBuild(){

    if(uiSheetEls) return uiSheetEls;

    const root = document.createElement("div");

    root.className = "sheet-root";
    root.innerHTML =
        '<div class="sheet-backdrop"></div>' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheetTitle">' +
            '<div class="sheet-grab"></div>' +
            '<h3 id="sheetTitle"></h3>' +
            '<p class="sheet-msg"></p>' +
            '<input class="sheet-input" maxlength="200" autocomplete="off">' +
            '<textarea class="sheet-area" maxlength="5000"></textarea>' +
            '<div class="sheet-chips" role="radiogroup" aria-label="Сфера"></div>' +
            '<div class="sheet-actions">' +
                '<button type="button" class="sheet-cancel">Скасувати</button>' +
                '<button type="button" class="sheet-ok">OK</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(root);

    uiSheetEls = {
        root,
        backdrop: root.querySelector(".sheet-backdrop"),
        sheet: root.querySelector(".sheet"),
        title: root.querySelector("#sheetTitle"),
        msg: root.querySelector(".sheet-msg"),
        input: root.querySelector(".sheet-input"),
        area: root.querySelector(".sheet-area"),
        chips: root.querySelector(".sheet-chips"),
        cancel: root.querySelector(".sheet-cancel"),
        ok: root.querySelector(".sheet-ok")
    };

    uiSheetEls.backdrop.addEventListener("click", ()=> uiSheetClose(null));
    uiSheetEls.cancel.addEventListener("click", ()=> uiSheetClose(null));
    uiSheetEls.ok.addEventListener("click", ()=> uiSheetSubmit());

    uiSheetEls.input.addEventListener("keydown", e=>{

        if(e.key === "Enter"){ e.preventDefault(); uiSheetSubmit(); }

    });

    document.addEventListener("keydown", e=>{

        if(e.key === "Escape" && document.body.classList.contains("sheet-open")) uiSheetClose(null);

    });

    return uiSheetEls;

}

let uiSheetMode = null;
let uiSheetCategory = null;

function uiSheetSubmit(){

    const els = uiSheetEls;

    if(uiSheetMode === "confirm") return uiSheetClose(true);

    const value = (uiSheetMode === "area" ? els.area.value : els.input.value).trim();

    if(value === ""){

        (uiSheetMode === "area" ? els.area : els.input).focus();

        return;

    }

    uiSheetClose({ value, category: uiSheetCategory });

}

function uiSheetClose(result){

    document.body.classList.remove("sheet-open");

    const resolve = uiSheetResolve;

    uiSheetResolve = null;

    if(resolve) resolve(result);

}

// opts: { title, message, mode: "input"|"area"|"confirm", value, placeholder, okText, danger, category }
function uiSheet(opts){

    const els = uiSheetBuild();

    if(uiSheetResolve) uiSheetClose(null);

    uiSheetMode = opts.mode || "input";
    uiSheetCategory = opts.category || null;

    els.title.textContent = opts.title || "";
    els.msg.textContent = opts.message || "";
    els.msg.style.display = opts.message ? "" : "none";

    els.input.style.display = uiSheetMode === "input" ? "" : "none";
    els.area.style.display = uiSheetMode === "area" ? "" : "none";

    els.input.value = uiSheetMode === "input" ? (opts.value || "") : "";
    els.area.value = uiSheetMode === "area" ? (opts.value || "") : "";
    els.input.placeholder = opts.placeholder || "";
    els.area.placeholder = opts.placeholder || "";

    els.chips.textContent = "";
    els.chips.style.display = opts.category ? "" : "none";

    if(opts.category){

        UI_SPHERES.forEach(s=>{

            const b = document.createElement("button");

            b.type = "button";
            b.textContent = s.icon + " " + s.name;
            b.style.setProperty("--c", s.color);
            b.setAttribute("role", "radio");

            const on = s.key === uiSheetCategory;

            b.classList.toggle("on", on);
            b.setAttribute("aria-checked", on ? "true" : "false");

            b.addEventListener("click", ()=>{

                uiSheetCategory = s.key;

                els.chips.querySelectorAll("button").forEach(x=>{

                    const isOn = x === b;

                    x.classList.toggle("on", isOn);
                    x.setAttribute("aria-checked", isOn ? "true" : "false");

                });

                haptic(8);

            });

            els.chips.appendChild(b);

        });

    }

    els.ok.textContent = opts.okText || "Зберегти";
    els.ok.classList.toggle("sheet-danger", !!opts.danger);

    document.body.classList.add("sheet-open");

    setTimeout(()=>{

        if(uiSheetMode === "input") els.input.focus();
        else if(uiSheetMode === "area") els.area.focus();
        else els.ok.focus();

    }, 250);

    return new Promise(resolve => { uiSheetResolve = resolve; });

}

async function uiConfirm(title, message, okText){

    return (await uiSheet({ title, message, mode:"confirm", okText: okText || "Видалити", danger:true })) === true;

}

async function uiPrompt(title, value, opts){

    const r = await uiSheet(Object.assign({ title, value, mode:"input" }, opts || {}));

    return r ? r.value : null;

}

// ----------------
// 5. Свайпи
// ----------------

const SWIPE_THRESHOLD = 80;

function attachSwipe(li, handlers){

    const fg = li.querySelector(".swipe-fg");

    if(!fg) return;

    let x0 = null, y0 = 0, dx = 0, locked = null, pid = null;

    function reset(){

        li.classList.remove("dragging", "sw-left", "sw-right");
        fg.style.transform = "";
        x0 = null;
        locked = null;

    }

    fg.addEventListener("pointerdown", e=>{

        if(e.button !== 0 || e.target.closest("button")) return;

        x0 = e.clientX;
        y0 = e.clientY;
        dx = 0;
        locked = null;
        pid = e.pointerId;

    });

    fg.addEventListener("pointermove", e=>{

        if(x0 === null || e.pointerId !== pid) return;

        const mx = e.clientX - x0;
        const my = e.clientY - y0;

        if(locked === null){

            if(Math.abs(mx) < 8 && Math.abs(my) < 8) return;

            // Вертикальний рух — це прокрутка сторінки, не свайп
            locked = Math.abs(mx) > Math.abs(my) ? "x" : "y";

            if(locked === "x"){

                li.classList.add("dragging");

                try{ fg.setPointerCapture(pid); }catch(err){}

            }

        }

        if(locked !== "x") return;

        dx = Math.max(-160, Math.min(160, mx));

        fg.style.transform = "translateX(" + dx + "px)";

        const wasRight = li.classList.contains("sw-right");
        const wasLeft = li.classList.contains("sw-left");

        li.classList.toggle("sw-right", dx > SWIPE_THRESHOLD);
        li.classList.toggle("sw-left", dx < -SWIPE_THRESHOLD);

        if((!wasRight && dx > SWIPE_THRESHOLD) || (!wasLeft && dx < -SWIPE_THRESHOLD)) haptic(6);

    });

    function end(){

        if(x0 === null) return;

        const wasX = locked === "x";
        const d = dx;

        reset();

        if(!wasX) return;

        if(d > SWIPE_THRESHOLD && handlers.onRight) handlers.onRight();
        else if(d < -SWIPE_THRESHOLD && handlers.onLeft) handlers.onLeft();

    }

    fg.addEventListener("pointerup", end);
    fg.addEventListener("pointercancel", reset);

}

// ----------------
// 9. Фільтр за сферами
// ----------------

const uiSphereFilterState = { habit:"all", goal:"all" };

function renderSphereFilter(kind, items){

    const box = document.getElementById(kind + "SphereFilter");
    const list = document.getElementById(kind + "List");
    const page = document.getElementById(kind === "habit" ? "habits" : "goals");

    if(!box || !list) return;

    const counts = { all: items.length };

    UI_SPHERES.forEach(s => { counts[s.key] = items.filter(i => (i.category || "personal") === s.key).length; });

    // Якщо в обраній сфері нічого не лишилось — повертаємось до «Усі»
    if(uiSphereFilterState[kind] !== "all" && !counts[uiSphereFilterState[kind]]) uiSphereFilterState[kind] = "all";

    box.textContent = "";
    box.style.display = items.length ? "" : "none";

    const options = [{ key:"all", name:"Усі", icon:"✨", color:null }].concat(UI_SPHERES);

    options.forEach(s=>{

        if(s.key !== "all" && !counts[s.key]) return;

        const b = document.createElement("button");

        b.type = "button";
        b.className = uiSphereFilterState[kind] === s.key ? "on" : "";
        b.setAttribute("aria-pressed", uiSphereFilterState[kind] === s.key ? "true" : "false");
        b.append(s.icon + " " + s.name);

        const small = document.createElement("small");

        small.textContent = counts[s.key];
        b.appendChild(small);

        if(s.color) b.style.setProperty("--accent", s.color);

        b.addEventListener("click", ()=>{

            uiSphereFilterState[kind] = s.key;

            haptic(8);

            renderSphereFilter(kind, items);

        });

        box.appendChild(b);

    });

    const active = uiSphereFilterState[kind];

    list.querySelectorAll("li").forEach(li=>{

        li.classList.toggle("filtered-out", active !== "all" && li.dataset.category !== active);

    });

    // Акцент сторінки — колір обраної сфери
    if(page){

        if(active === "all") page.style.removeProperty("--accent");
        else page.style.setProperty("--accent", uiSphere(active).color);

    }

    const hint = document.getElementById(kind + "SwipeHint");

    if(hint) hint.classList.toggle("show", items.length > 0);

}

// ----------------
// Кнопка «+» і нижня панель додавання
// ----------------

function uiActiveTaskPage(){

    const h = document.getElementById("habits");
    const g = document.getElementById("goals");

    if(h && h.classList.contains("active")) return "habit";
    if(g && g.classList.contains("active")) return "goal";

    return null;

}

function uiUpdateFab(){

    const fab = document.getElementById("fab");

    if(!fab) return;

    const kind = uiActiveTaskPage();

    fab.classList.toggle("show", !!kind);
    fab.setAttribute("aria-label", kind === "goal" ? "Додати ціль" : "Додати завдання");

    const page = kind ? document.getElementById(kind === "habit" ? "habits" : "goals") : null;
    const accent = page ? page.style.getPropertyValue("--accent") : "";

    if(accent) fab.style.setProperty("--accent", accent);
    else fab.style.removeProperty("--accent");

}

async function uiAddFromSheet(){

    const kind = uiActiveTaskPage();

    if(!kind) return;

    const filter = uiSphereFilterState[kind];

    const r = await uiSheet({
        title: kind === "goal" ? "Нова ціль" : "Нове завдання",
        mode: "input",
        placeholder: kind === "goal" ? "Наприклад: пробігти півмарафон" : "Наприклад: пити 2 л води",
        category: filter !== "all" ? filter : "personal",
        okText: "Додати"
    });

    if(!r) return;

    const input = document.getElementById(kind + "Input");
    const cat = document.getElementById(kind + "Category");

    if(!input) return;

    input.value = r.value;

    if(cat && r.category) cat.value = r.category;

    if(kind === "goal" && typeof addGoal === "function") addGoal();
    if(kind === "habit" && typeof addHabit === "function") addHabit();

    haptic(12);

}

// ----------------
// 10. Святкування рівня
// ----------------

let uiLevelScene = null;
let uiLevelShown = 0;

function uiLevelStats(){

    const safe = (fn, d) => { try{ return fn(); }catch(e){ return d; } };

    return {
        streak: safe(()=> streak, 0),
        tasks: safe(()=> totalHabitCompletions, 0),
        goals: safe(()=> totalGoalCompletions, 0),
        avatar: safe(()=> getAvatarForLevel(level), "🌱"),
        name: safe(()=> (typeof myFriendName === "string" && myFriendName) ? myFriendName : "", "")
    };

}

function showLevelScene(newLevel){

    if(!uiLevelScene){

        uiLevelScene = document.createElement("div");
        uiLevelScene.className = "level-scene";
        uiLevelScene.setAttribute("role", "dialog");
        uiLevelScene.setAttribute("aria-modal", "true");
        uiLevelScene.setAttribute("aria-label", "Новий рівень");
        uiLevelScene.innerHTML =
            '<div class="level-rays"></div>' +
            '<div class="level-bot" aria-hidden="true">🤖</div>' +
            '<h3>НОВИЙ РІВЕНЬ</h3>' +
            '<div class="level-num"></div>' +
            '<div class="level-card"><div class="lv-av"></div><div><b class="lv-title"></b><br><small class="lv-sub"></small></div></div>' +
            '<div class="level-actions">' +
                '<button type="button" class="lv-close">Закрити</button>' +
                '<button type="button" class="lv-share">↗ Поділитися</button>' +
            '</div>';

        document.body.appendChild(uiLevelScene);

        uiLevelScene.querySelector(".lv-close").addEventListener("click", hideLevelScene);
        uiLevelScene.querySelector(".lv-share").addEventListener("click", ()=> shareLevelCard(uiLevelShown));

        document.addEventListener("keydown", e=>{

            if(e.key === "Escape" && uiLevelScene.classList.contains("show")) hideLevelScene();

        });

    }

    uiLevelShown = newLevel;

    const fill = ()=>{

        const s = uiLevelStats();

        uiLevelScene.querySelector(".level-num").textContent = newLevel;
        uiLevelScene.querySelector(".lv-av").textContent = s.avatar;
        uiLevelScene.querySelector(".lv-title").textContent = (s.name ? s.name + " · " : "") + "Рівень " + newLevel;
        uiLevelScene.querySelector(".lv-sub").textContent = s.streak + " 🔥 серія · " + s.tasks + " завдань · " + s.goals + " цілей";

    };

    fill();

    // Лічильники в app.js оновлюються одразу після нарахування XP — перечитуємо
    setTimeout(fill, 0);

    uiLevelScene.classList.add("show");

    // Перезапуск анімації числа
    const num = uiLevelScene.querySelector(".level-num");

    num.style.animation = "none";
    void num.offsetWidth;
    num.style.animation = "";

    haptic([30, 60, 30, 60, 80]);

    if(typeof launchConfetti === "function"){

        launchConfetti();
        setTimeout(launchConfetti, 700);

    }

    setTimeout(()=>{ try{ uiLevelScene.querySelector(".lv-close").focus(); }catch(e){} }, 300);

}

function hideLevelScene(){

    if(uiLevelScene) uiLevelScene.classList.remove("show");

}

// Картинка для сторіс 1080×1920
function drawLevelCard(newLevel){

    const s = uiLevelStats();
    const c = document.createElement("canvas");

    c.width = 1080;
    c.height = 1920;

    const g = c.getContext("2d");

    const bg = g.createRadialGradient(540, 700, 50, 540, 700, 1300);

    bg.addColorStop(0, "#5b21b6");
    bg.addColorStop(.45, "#1e1b4b");
    bg.addColorStop(1, "#05060d");

    g.fillStyle = bg;
    g.fillRect(0, 0, 1080, 1920);

    g.save();
    g.translate(540, 700);

    for(let i = 0; i < 18; i++){

        g.rotate(Math.PI / 9);
        g.fillStyle = "rgba(255,255,255,.05)";
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(-90, -1400);
        g.lineTo(90, -1400);
        g.fill();

    }

    g.restore();

    const font = (w, size) => w + " " + size + "px Manrope, 'Segoe UI', sans-serif";

    g.textAlign = "center";
    g.fillStyle = "#fff";
    g.font = "200px 'Segoe UI Emoji','Apple Color Emoji',sans-serif";
    g.fillText("🤖", 540, 520);

    g.fillStyle = "#c4b5fd";
    g.font = font(800, 44);
    g.fillText("Н О В И Й   Р І В Е Н Ь", 540, 660);

    const num = g.createLinearGradient(0, 700, 0, 1000);

    num.addColorStop(0, "#ffffff");
    num.addColorStop(1, "#a5b4fc");

    g.fillStyle = num;
    g.font = font(800, 340);
    g.fillText(String(newLevel), 540, 1000);

    g.fillStyle = "rgba(255,255,255,.1)";
    g.beginPath();

    if(g.roundRect) g.roundRect(140, 1150, 800, 260, 48);
    else g.rect(140, 1150, 800, 260);

    g.fill();

    g.fillStyle = "#fff";
    g.font = font(800, 56);
    g.fillText((s.name ? s.name + " · " : "") + "Рівень " + newLevel, 540, 1255);

    g.fillStyle = "rgba(255,255,255,.75)";
    g.font = font(600, 40);
    g.fillText(s.streak + " 🔥 серія · " + s.tasks + " завдань · " + s.goals + " цілей", 540, 1340);

    g.fillStyle = "rgba(255,255,255,.85)";
    g.font = font(800, 48);
    g.fillText("🚀 SelfDev", 540, 1760);

    return c;

}

function shareLevelCard(newLevel){

    const text = "Я досяг " + newLevel + " рівня в SelfDev! 🚀";

    let canvas;

    try{ canvas = drawLevelCard(newLevel); }catch(e){ canvas = null; }

    if(!canvas || !canvas.toBlob){

        if(navigator.share) navigator.share({ text }).catch(()=>{});

        return;

    }

    canvas.toBlob(blob=>{

        if(!blob) return;

        const file = new File([blob], "selfdev-level-" + newLevel + ".png", { type:"image/png" });

        if(navigator.canShare && navigator.canShare({ files:[file] })){

            navigator.share({ files:[file], text }).catch(()=>{});

            return;

        }

        // На комп'ютері — просто зберігаємо картинку
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");

        a.href = url;
        a.download = file.name;

        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(()=> URL.revokeObjectURL(url), 1500);

        if(typeof showToast === "function") showToast("🖼️ Картинку збережено");

    }, "image/png");

}

// ----------------
// Старт
// ----------------

function uiThemeColor(){

    const meta = document.querySelector('meta[name="theme-color"]');

    if(meta) meta.setAttribute("content", document.body.classList.contains("light") ? "#f4f6fb" : "#0b1020");

}

window.addEventListener("DOMContentLoaded", ()=>{

    const fab = document.getElementById("fab");

    if(fab) fab.addEventListener("click", uiAddFromSheet);

    // Кнопка «+» видима лише на сторінках завдань і цілей
    ["habits", "goals"].forEach(id=>{

        const el = document.getElementById(id);

        if(el) new MutationObserver(uiUpdateFab).observe(el, { attributes:true, attributeFilter:["class", "style"] });

    });

    const toggle = document.getElementById("hapticsToggle");

    if(toggle){

        toggle.checked = hapticsEnabled();

        toggle.addEventListener("change", ()=>{

            try{ localStorage.setItem("hapticsEnabled", toggle.checked ? "true" : "false"); }catch(e){}

            if(toggle.checked) haptic(20);

        });

    }

    new MutationObserver(uiThemeColor).observe(document.body, { attributes:true, attributeFilter:["class"] });

    uiThemeColor();
    uiUpdateFab();

});

// ----------------
// Плавна поява карток під час гортання
// ----------------
// Картка спершу прозора й трохи нижче свого місця; коли вона входить у екран,
// м'яко «випливає». Картки, що з'явилися одночасно, йдуть одна за одною.
// Класи ставить лише JS — без скриптів усе видно одразу.

function uiInitReveal(){

    if(!("IntersectionObserver" in window)) return;

    // Працює і тоді, коли в системі вимкнено анімації («менше руху»): це рішення власника
    // застосунку. У такому режимі поява спокійніша — див. .card.reveal у design.css.

    const cards = document.querySelectorAll("main .card");

    if(!cards.length) return;

    const finish = el => {

        el.classList.remove("reveal", "reveal-in");
        el.style.transitionDelay = "";

    };

    const observer = new IntersectionObserver(entries => {

        let order = 0;

        entries.forEach(entry => {

            const el = entry.target;

            if(entry.isIntersecting){

                observer.unobserve(el);

                const delay = Math.min(order++, 6) * 90;

                el.style.transitionDelay = delay + "ms";
                el.classList.add("reveal-in");

                // Після появи прибираємо класи, щоб не заважати власним анімаціям картки
                setTimeout(()=> finish(el), delay + 950);

            }else if(entry.boundingClientRect.bottom < 0){

                // Уже прогорнута вище екрана — показуємо без анімації
                observer.unobserve(el);
                finish(el);

            }

        });

    }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });

    cards.forEach(el => {

        el.classList.add("reveal");
        observer.observe(el);

    });

}

window.addEventListener("DOMContentLoaded", ()=>{

    try{ uiInitReveal(); }catch(e){ console.error("uiInitReveal:", e); }

});
