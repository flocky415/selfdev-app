/*
 * SelfDev — чат Джарвіза (Google Gemini)
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 */

// ----------------
// Джарвіз — чат через Google Gemini
// ----------------

const JARVIS_DEFAULT_MODEL = "gemini-3.6-flash";
const JARVIS_MAX_INPUT = 2000;
const JARVIS_MAX_HISTORY = 20;
const JARVIS_STORAGE_KEY = "jarvisChatHistory";
const JARVIS_STORED_MESSAGES = 40;

let jarvisChatHistory = loadJarvisHistory();
let jarvisBusy = false;
let jarvisCloseTimer = null;
let jarvisHistoryRendered = false;

// Розмова зберігається на пристрої, тож Джарвіз пам'ятає її після перезавантаження
function loadJarvisHistory(){

    try{

        const raw = JSON.parse(localStorage.getItem(JARVIS_STORAGE_KEY));

        if(!Array.isArray(raw)) return [];

        return raw
            .filter(m => m && (m.role === "user" || m.role === "bot") && typeof m.text === "string")
            .map(m => ({ role: m.role, text: m.text.slice(0, 4000) }))
            .slice(-JARVIS_STORED_MESSAGES);

    }catch(e){

        return [];

    }

}

function saveJarvisHistory(){

    try{

        localStorage.setItem(JARVIS_STORAGE_KEY, JSON.stringify(jarvisChatHistory.slice(-JARVIS_STORED_MESSAGES)));

    }catch(e){

        // переповнене сховище — не критично
    }

}

function clearJarvisChat(){

    jarvisChatHistory = [];

    saveJarvisHistory();

    const container = document.getElementById("jarvisChatMessages");

    if(container) container.textContent = "";

    addJarvisMessage("bot", jarvisGreeting());

}

// ----------------
// Що Джарвіз знає про користувача (дані лише з цього пристрою)
// ----------------

function jarvisSafe(fn, fallback){

    try{ return fn(); }catch(e){ return fallback; }

}

function jarvisSnapshot(){

    const hs = jarvisSafe(()=> habits, []);
    const gs = jarvisSafe(()=> goals, []);

    const total = hs.length + gs.length;
    const done = hs.filter(h=>h.done).length + gs.filter(g=>g.done).length;

    return {
        level: jarvisSafe(()=> level, 1),
        xp: jarvisSafe(()=> xp, 0),
        streak: jarvisSafe(()=> streak, 0),
        freezes: jarvisSafe(()=> streakFreezes, 0),
        pomodorosToday: jarvisSafe(()=> pomodorosCompletedToday, 0),
        habitsTodo: hs.filter(h=>!h.done).map(h=>h.name),
        habitsDone: hs.filter(h=>h.done).map(h=>h.name),
        goalsActive: gs.filter(g=>!g.done).map(g=>g.name),
        goalsDone: gs.filter(g=>g.done).length,
        percent: total === 0 ? 0 : Math.round(done/total*100),
        hour: new Date().getHours()
    };

}

function jarvisContextText(){

    const s = jarvisSnapshot();
    const list = (arr, max) => arr.length ? arr.slice(0, max).join("; ") + (arr.length > max ? " …" : "") : "немає";

    return [
        "Зараз: " + new Date().toLocaleString("uk-UA", { weekday:"long", hour:"2-digit", minute:"2-digit" }),
        "Рівень " + s.level + ", " + s.xp + "/100 XP до наступного",
        "Серія днів: " + s.streak + " (заморозок: " + s.freezes + ")",
        "Прогрес сьогодні: " + s.percent + "%, Pomodoro сьогодні: " + s.pomodorosToday,
        "Невиконані щоденні завдання: " + list(s.habitsTodo, 15),
        "Виконані сьогодні: " + list(s.habitsDone, 15),
        "Активні цілі: " + list(s.goalsActive, 10) + " (завершено цілей: " + s.goalsDone + ")"
    ].join("\n");

}

function jarvisGreeting(){

    const s = jarvisSnapshot();
    const hello = s.hour < 5 ? "Не спиться? 🌙" : s.hour < 12 ? "Доброго ранку! ☀️" : s.hour < 18 ? "Привіт! 👋" : "Доброго вечора! 🌆";

    if(s.habitsTodo.length === 0 && s.habitsDone.length === 0 && s.goalsActive.length === 0){

        return hello + " Я Джарвіз. Почнімо з першого завдання — напиши, наприклад: «додай звичку пити воду».";

    }

    if(s.habitsTodo.length === 0){

        return hello + " Усі завдання на сьогодні виконано — ти красень! 🔥 Хочеш поставити нову ціль?";

    }

    return hello + " Сьогодні лишилось " + s.habitsTodo.length + " " +
        (typeof pluralUk === "function" ? pluralUk(s.habitsTodo.length, "завдання", "завдання", "завдань") : "завдань") +
        ". Почнімо з «" + s.habitsTodo[0] + "»? Можу підказати, як не відкладати.";

}

// ----------------
// Команди: «додай звичку …», «додай ціль …» — працюють без інтернету
// ----------------

function jarvisGuessCategory(text){

    const t = text.toLowerCase();

    if(/спорт|біг|бігати|зарядк|вод[аиу]|сон|спати|трен|прогулян|йог|здоров|їж|овоч|віджим|присід/.test(t)) return "health";
    if(/робот|проєкт|проект|клієнт|кар'єр|карєр|резюме|звіт|офіс|бізнес|гроші|заробі/.test(t)) return "career";
    if(/чита|книг|вчи|курс|англ|мов[аиу]|урок|навча|код|програм|лекці|дз|домашн/.test(t)) return "learning";

    return "personal";

}

function jarvisTryCommand(text){

    const m = text.match(/^\s*(?:будь ласка[,\s]*)?(?:додай|добав|додати|створи|запиши)\s+(?:мені\s+)?(звичку|завдання|ціль|мету)\s*[:\-—]?\s*(.+)$/i);

    if(!m) return null;

    const kind = /ціль|мету/i.test(m[1]) ? "goal" : "habit";
    const name = m[2].trim().replace(/[.!]+$/, "").slice(0, 200);

    if(!name) return null;

    const input = document.getElementById(kind === "goal" ? "goalInput" : "habitInput");
    const category = document.getElementById(kind === "goal" ? "goalCategory" : "habitCategory");
    const list = jarvisSafe(()=> kind === "goal" ? goals : habits, null);
    const add = kind === "goal" ? (typeof addGoal === "function" ? addGoal : null) : (typeof addHabit === "function" ? addHabit : null);

    if(!input || !list || !add) return "Не зміг додати 😕 Спробуй на сторінці " + (kind === "goal" ? "«Цілі»" : "«Завдання»") + ".";

    if(list.some(x => x.name === name)) return "«" + name + "» у тебе вже є 🙂";

    const before = list.length;

    input.value = name;

    if(category) category.value = jarvisGuessCategory(name);

    add();

    const after = jarvisSafe(()=> (kind === "goal" ? goals : habits).length, before);

    if(after <= before) return "Не вийшло додати «" + name + "» 😕";

    return kind === "goal"
        ? "🎯 Додав ціль «" + name + "». Розбий її на маленькі щоденні кроки — хочеш, підкажу які?"
        : "✅ Додав завдання «" + name + "». За виконання — +10 XP!";

}

// ----------------
// Локальний «мозок»: відповідає без ключа й без інтернету, спираючись на твої дані
// ----------------

function jarvisPick(arr){

    return arr[Math.floor(Math.random()*arr.length)];

}

function jarvisLocalReply(text){

    const t = text.toLowerCase();
    const s = jarvisSnapshot();
    const days = n => n + " " + (typeof pluralUk === "function" ? pluralUk(n, "день", "дні", "днів") : "днів");

    if(/^(привіт|хай|здоров|добр(ий|ого)|вітаю|hello|hi)\b/.test(t)) return jarvisGreeting();

    if(/дяку|спасиб|thanks|thx/.test(t)) return jarvisPick(["Завжди радий допомогти 🤝", "Звертайся! Ти молодець 💪", "Для тебе — що завгодно 🙂"]);

    if(/хто ти|що ти вмієш|що вмієш|допомож/.test(t)){

        return "Я Джарвіз 🤖 Знаю твій прогрес, можу підказати, з чого почати, підбадьорити, а ще додати завдання чи ціль — напиши «додай звичку …» або «додай ціль …».";

    }

    if(/серія|стрік|streak|вогник/.test(t)){

        return s.streak > 0
            ? "🔥 Твоя серія — " + days(s.streak) + "." + (s.freezes ? " Є " + s.freezes + " ❄️ заморозок на випадок пропуску." : "") + " Виконай хоча б одне завдання сьогодні, щоб не обірвати її!"
            : "Серія поки на нулі — але вже сьогодні можна почати нову 🔥 Виконай одне завдання.";

    }

    if(/рівень|xp|досвід|очк/.test(t)){

        return "⭐ Рівень " + s.level + ", до наступного — " + (100 - s.xp) + " XP. Одне завдання дає +10 XP, ціль — +25, Pomodoro — до +20.";

    }

    if(/прогрес|статист|як (я|у мене)|підсум|результат/.test(t)){

        return "📊 Сьогодні: " + s.percent + "% виконано, " + s.habitsDone.length + " завдань готово, " + s.habitsTodo.length + " лишилось. Серія — " + days(s.streak) + ", рівень " + s.level + "." +
            (s.habitsTodo.length ? " Далі: «" + s.habitsTodo[0] + "»." : " Ідеальний день! 🏆");

    }

    // «що мені зробити» теж: раніше шаблон ловив лише «робити», і швидка кнопка «Що робити?» не спрацьовувала
    if(/що (мені )?(з)?робити|з чого почати|що далі|порад|план|наступн/.test(t)){

        if(s.habitsTodo.length){

            return "Почни з найпростішого: «" + s.habitsTodo[s.habitsTodo.length - 1] + "». Постав Pomodoro на 25 хв і не відволікайся — маленька перемога дасть розгін 🚀";

        }

        if(s.goalsActive.length){

            return "Завдання на сьогодні виконано ✅ Зроби один крок до цілі «" + s.goalsActive[0] + "» — хоча б 15 хвилин.";

        }

        return "Додай 2–3 завдання на завтра — наприклад: «додай звичку читати 10 сторінок» 📚";

    }

    if(/лін|не хочу|втом|нема сил|немає сил|не можу|важко|сумно|погано|вигор/.test(t)){

        return jarvisPick([
            "Розумію 🤗 Спробуй правило 2 хвилин: почни лише на 2 хвилини — далі зазвичай іде легше.",
            "Нормально бути втомленим. Зроби одне найменше завдання і дозволь собі відпочити — серія збережеться 🔥",
            "Глибокий вдих 🌬️ Склянка води, 5 хвилин прогулянки — і повертайся. Я поруч."
        ]);

    }

    if(/pomodoro|помодоро|фокус|зосеред|концентр|таймер/.test(t)){

        return "🍅 Техніка Pomodoro: 25 хв фокусу → 5 хв перерви, після 4 циклів — довга перерва. Сьогодні в тебе " + s.pomodorosToday + " сесій. Таймер — у меню «Ще».";

    }

    if(/мотив|надихни|підбадьор|цитат/.test(t)){

        return jarvisPick([
            "Ти вже на " + days(s.streak) + " серії — це не випадковість, це звичка 💪",
            "Кожне виконане завдання — це голос за людину, якою ти хочеш стати 🌟",
            "Не треба бути ідеальним. Треба просто не зупинятись 🚀"
        ]);

    }

    if(/ціл/.test(t)){

        return s.goalsActive.length
            ? "🎯 Активні цілі: " + s.goalsActive.slice(0, 3).join(", ") + ". Обери одну і зроби сьогодні маленький крок."
            : "Цілей поки немає. Напиши «додай ціль …» — і я її створю 🎯";

    }

    return jarvisPick([
        "Цікаве питання 🤔 Без підключення до ШІ я відповідаю простіше, але можу показати прогрес, підказати, з чого почати, або додати завдання.",
        "Я поки працюю в офлайн-режимі 📡 Спитай про прогрес, серію, що робити далі — або напиши «додай звичку …»."
    ]);

}

// ----------------
// Захист від мобільної клавіатури: position:fixed модалка не рухається
// разом з visual viewport, коли з'являється клавіатура — тож рахуємо
// перекриття вручну і піднімаємо модалку/поле вводу над клавіатурою.
// ----------------

function updateJarvisViewportOffset(){

    const modal = document.getElementById("jarvisChatModal");

    if(!modal) return;

    if(!window.visualViewport){

        return;

    }

    const vv = window.visualViewport;

    document.documentElement.style.setProperty("--jarvis-vvh", vv.height + "px");

    if(!modal.classList.contains("show")) return;

    const keyboardOverlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

    modal.style.paddingBottom = keyboardOverlap + "px";

}

function setupJarvisKeyboardFix(){

    if(!window.visualViewport) return;

    window.visualViewport.addEventListener("resize", updateJarvisViewportOffset);
    window.visualViewport.addEventListener("scroll", updateJarvisViewportOffset);

    updateJarvisViewportOffset();

}

// Закриття чату: клік по затемненому фону поза вікном чату або клавіша Esc
function setupJarvisChatClosing(){

    const modal = document.getElementById("jarvisChatModal");

    if(!modal) return;

    modal.addEventListener("click", e=>{

        if(e.target === modal) closeJarvisChat();

    });

    document.addEventListener("keydown", e=>{

        if(e.key === "Escape" && modal.classList.contains("show")) closeJarvisChat();

    });

}

try{

    setupJarvisKeyboardFix();
    setupJarvisChatClosing();

}catch(e){

    console.error("Jarvis keyboard fix init:", e);

}

function jarvisWidgetTap(el){

    // Утримання вже відкрило чат — звичайне натискання не обробляємо
    if(typeof jarvisConsumeLongPress === "function" && jarvisConsumeLongPress()) return;

    if(el){

        el.classList.add("tapped");

        setTimeout(()=> el.classList.remove("tapped"), 400);

    }

    // Робот: натискання відкриває/закриває маску (чат — утриманням або через бульбашку)
    if(typeof jarvisToggleVisor === "function" && jarvisToggleVisor()) return;

    if(typeof jarvisTapSpin === "function"){

        jarvisTapSpin();

    }

    openJarvisChat();

}

function openJarvisChat(){

    const modal = document.getElementById("jarvisChatModal");

    if(!modal) return;

    if(jarvisCloseTimer){

        clearTimeout(jarvisCloseTimer);

        jarvisCloseTimer = null;

    }

    modal.classList.remove("closing");
    modal.classList.add("show");

    updateJarvisViewportOffset();

    if(!jarvisHistoryRendered){

        jarvisHistoryRendered = true;

        jarvisChatHistory.forEach(m => addJarvisMessage(m.role, m.text, false));

    }

    if(jarvisChatHistory.length === 0){

        addJarvisMessage("bot", jarvisGreeting());

    }

    const input = document.getElementById("jarvisChatInput");

    if(input) setTimeout(()=> input.focus(), 200);

}

// Плавне закриття: CSS вже має анімацію для класу .closing, але його ніхто не додавав
function closeJarvisChat(){

    const modal = document.getElementById("jarvisChatModal");

    if(!modal) return;

    modal.classList.add("closing");

    if(jarvisCloseTimer) clearTimeout(jarvisCloseTimer);

    jarvisCloseTimer = setTimeout(()=>{

        modal.classList.remove("show");
        modal.classList.remove("closing");
        modal.style.paddingBottom = "";

        jarvisCloseTimer = null;

    }, 250);

}

// remember=false — для службових повідомлень (помилки, «думаю…»): їх не відправляємо в Gemini як історію
function addJarvisMessage(role, text, remember){

    if(remember !== false){

        jarvisChatHistory.push({ role, text });

        saveJarvisHistory();

    }

    const container = document.getElementById("jarvisChatMessages");

    if(!container) return;

    const bubble = document.createElement("div");

    bubble.className = "jarvis-bubble " + (role === "user" ? "user" : "bot");

    bubble.innerText = text;

    container.appendChild(bubble);

    container.scrollTop = container.scrollHeight;

    return bubble;

}

// Швидкі кнопки під чатом
function jarvisQuick(text){

    const input = document.getElementById("jarvisChatInput");

    if(!input || jarvisBusy) return;

    input.value = text;

    sendJarvisMessage();

}

async function sendJarvisMessage(){

    if(jarvisBusy) return;

    const input = document.getElementById("jarvisChatInput");

    if(!input) return;

    const userText = input.value.trim().slice(0, JARVIS_MAX_INPUT);

    if(userText === "") return;

    input.value = "";

    jarvisBusy = true;

    try{

        addJarvisMessage("user", userText);

        // Команди виконуємо одразу, без ШІ
        const commandReply = jarvisTryCommand(userText);

        if(commandReply){

            addJarvisMessage("bot", commandReply);

            return;

        }

        // Без ключа/проксі або без інтернету відповідає локальний «мозок»
        if(!jarvisIsConfigured() || navigator.onLine === false){

            addJarvisMessage("bot", jarvisLocalReply(userText));

            return;

        }

        const thinkingBubble = addJarvisMessage("bot", "…", false);

        const result = await askGemini();

        if(result.offline){

            if(thinkingBubble) thinkingBubble.remove();

            addJarvisMessage("bot", jarvisLocalReply(userText));

            return;

        }

        if(result.rateLimited){

            await handleJarvisRateLimit(thinkingBubble, result.waitSeconds);

            return;

        }

        if(thinkingBubble) thinkingBubble.remove();

        addJarvisMessage("bot", result.text, result.ok === true);

    }catch(e){

        console.error("sendJarvisMessage:", e);

        addJarvisMessage("bot", "Щось пішло не так 😕 Спробуй ще раз.", false);

    }finally{

        jarvisBusy = false;

    }

}

const jarvisRateLimitPhrases = [
    "Ого, не гони 😅 дай Джарвізу перевести подих",
    "Стоп-стоп 🛑 забагато питань підряд",
    "Тихіше, тигре 🐯 безкоштовний ліміт скінчився",
    "Ей, полегше 🙈 мені потрібна маленька перерва"
];

function formatJarvisWait(seconds){

    if(seconds < 60){

        return seconds+" сек";

    }

    const m = Math.floor(seconds/60);
    const s = seconds%60;

    return m+" хв"+(s>0 ? " "+s+" сек" : "");

}

async function handleJarvisRateLimit(bubble, waitSeconds){

    if(!bubble) return;

    let remaining = Math.min(Math.max(waitSeconds || 30, 3), 60);

    const phrase = jarvisRateLimitPhrases[Math.floor(Math.random()*jarvisRateLimitPhrases.length)];

    const container = document.getElementById("jarvisChatMessages");

    function render(){

        bubble.innerText = phrase+" — спробую сам ще раз через "+formatJarvisWait(remaining);

        if(container) container.scrollTop = container.scrollHeight;

    }

    render();

    await new Promise(resolve=>{

        const tick = setInterval(()=>{

            remaining--;

            if(remaining<=0){

                clearInterval(tick);

                resolve();

                return;

            }

            render();

        },1000);

    });

    bubble.innerText = "Пробую ще раз... 🤖";

    const retry = await askGemini();

    if(retry.rateLimited){

        bubble.innerText = "Все ще перевантажено 😩 спробуй, будь ласка, трохи згодом.";

        return;

    }

    bubble.innerText = retry.text;

    // До історії потрапляє лише справжня відповідь моделі, а не текст помилки
    if(retry.ok === true){

        jarvisChatHistory.push({ role:"bot", text: retry.text });

        saveJarvisHistory();

    }

}

function jarvisIsConfigured(){

    if(typeof geminiConfig === "undefined" || !geminiConfig) return false;

    if(geminiConfig.proxyUrl) return /^https:\/\//.test(geminiConfig.proxyUrl);

    return typeof geminiConfig.apiKey === "string"
        && geminiConfig.apiKey !== ""
        && !/^YOUR_/i.test(geminiConfig.apiKey);

}

// Gemini очікує, що розмова починається з реплік користувача і ролі чергуються.
// Привітання Джарвіза на початку історії і дві відповіді поспіль давали б помилку 400.
function buildJarvisContents(){

    const turns = [];

    jarvisChatHistory
        .filter(m => m && typeof m.text === "string" && m.text.trim() !== "" && m.text !== "…")
        .slice(-JARVIS_MAX_HISTORY)
        .forEach(m=>{

            const role = m.role === "user" ? "user" : "model";
            const last = turns[turns.length-1];

            if(last && last.role === role){

                last.parts[0].text += "\n" + m.text;

            }else{

                turns.push({ role, parts: [{ text: m.text }] });

            }

        });

    while(turns.length && turns[0].role !== "user") turns.shift();

    return turns;

}

async function askGemini(retryCount){

    retryCount = retryCount || 0;

    if(!jarvisIsConfigured()){

        return { text: "Я поки не підключений до розумної розмови 🔑 Додай ключ у gemini-config.js (інструкція всередині файлу)." };

    }

    const systemContext = [
        "Ти — Джарвіз, дружній і кмітливий компаньйон у застосунку SelfDev (звички, цілі, Pomodoro, XP і рівні).",
        "Говори українською, на «ти», тепло, з легким гумором і 1–2 емодзі. Зазвичай 2–4 речення; довше — лише якщо просять план чи пояснення.",
        "Спирайся на дані користувача нижче: згадуй конкретні завдання, цілі, серію. Давай один конкретний наступний крок замість загальних порад.",
        "Якщо користувач хоче додати завдання чи ціль, підкажи написати: «додай звичку …» або «додай ціль …» — застосунок виконає це сам.",
        "Не вигадуй дані, яких немає. Без markdown-заголовків і таблиць. На медичні/психологічні кризи — м'яко порадь звернутись до фахівця.",
        "",
        "Дані користувача:",
        jarvisContextText()
    ].join("\n");

    const contents = buildJarvisContents();

    if(contents.length === 0){

        return { text: "Напиши мені щось, і я відповім 🙂" };

    }

    const useProxy = !!geminiConfig.proxyUrl;

    const model = (typeof geminiConfig.model === "string" && /^[\w.\-]+$/.test(geminiConfig.model))
        ? geminiConfig.model
        : JARVIS_DEFAULT_MODEL;

    const url = useProxy
        ? geminiConfig.proxyUrl
        : "https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent";

    const headers = { "Content-Type": "application/json" };

    // З проксі ключ лежить на сервері і в браузер не потрапляє взагалі
    if(!useProxy) headers["x-goog-api-key"] = geminiConfig.apiKey;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timeout = controller ? setTimeout(()=> controller.abort(), 25000) : null;

    try{

        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemContext }] },
                contents: contents,
                generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
            }),
            signal: controller ? controller.signal : undefined
        });

        let data = null;

        try{

            data = await response.json();

        }catch(parseError){

            data = null;

        }

        if(!data){

            return { text: "Gemini відповів не так, як очікувалось (код "+response.status+") 🤔 Спробуй пізніше." };

        }

        const candidate = data.candidates && data.candidates[0];
        const parts = candidate && candidate.content && candidate.content.parts;

        if(Array.isArray(parts)){

            const text = parts
                .map(p => (p && typeof p.text === "string") ? p.text : "")
                .join("")
                .trim();

            if(text) return { ok: true, text: text };

        }

        if(data.error){

            const isOverloaded = data.error.code === 503 || data.error.status === "UNAVAILABLE";

            if(isOverloaded && retryCount < 2){

                await new Promise(resolve => setTimeout(resolve, 1500));

                return askGemini(retryCount + 1);

            }

            const isRateLimited = data.error.code === 429 || data.error.status === "RESOURCE_EXHAUSTED";

            if(isRateLimited){

                const match = (data.error.message || "").match(/retry in ([\d.]+)s/i);

                const waitSeconds = match ? Math.ceil(parseFloat(match[1])) : 30;

                return { rateLimited: true, waitSeconds: waitSeconds };

            }

            console.error("Gemini API error:", data.error);

            if(useProxy && data.error.code === 403){

                return { text: "Проксі Джарвіза не пускає цей сайт 🔒 Додай адресу сайту в ALLOWED_ORIGINS у налаштуваннях Cloudflare Worker." };

            }

            if(data.error.code === 400 || data.error.code === 401 || data.error.code === 403){

                return { text: "Gemini не прийняв запит (код "+data.error.code+"). Перевір ключ у gemini-config.js — можливо, його треба випустити заново 🔑" };

            }

            return { text: "Помилка від Gemini: "+data.error.message+" (код "+data.error.code+")" };

        }

        if((candidate && candidate.finishReason === "SAFETY") || (data.promptFeedback && data.promptFeedback.blockReason)){

            return { text: "Це питання відхилено фільтром безпеки Gemini. Спробуй перефразувати." };

        }

        console.error("Gemini response (unexpected format):", data);

        return { text: "Хм, отримав дивну відповідь від Gemini 🤔 Подробиці в консолі браузера (F12)." };

    }catch(e){

        if(e && e.name === "AbortError"){

            return { text: "Джарвіз надто довго думає ⏳ Спробуй ще раз." };

        }

        console.error("Gemini error:", e);

        // Мережа/проксі недоступні — відповість локальний «мозок»
        return { offline: true, text: "" };

    }finally{

        if(timeout) clearTimeout(timeout);

    }

}
