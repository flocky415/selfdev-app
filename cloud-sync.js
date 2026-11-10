/*
 * SelfDev — синхронізація даних між пристроями (Firebase Auth + Firestore)
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 *
 * Як це працює:
 *  • Користувач входить через Google. Поточний анонімний акаунт «прив'язується»
 *    до Google, тож uid (і профіль у «Друзях») лишається тим самим.
 *  • Дані застосунку лежать у localStorage. Ми періодично знімаємо з них «зліпок»
 *    і, якщо він змінився, записуємо в документ userdata/{uid}.
 *  • Кожен запис має випадковий rev. Якщо rev у хмарі не той, що ми бачили
 *    востаннє, — дані змінив інший пристрій: тоді або тихо завантажуємо їх,
 *    або (якщо і тут є незбережені зміни) питаємо користувача, що лишити.
 *
 * Файл підключається ДО app.js: так ми бачимо стан сховища до того,
 * як app.js при старті щось у ньому оновить (нормалізація, новий день тощо).
 */

(function(){

"use strict";

// Ключі localStorage, які належать користувачу і мають бути однакові на всіх пристроях.
// Налаштування самого пристрою (тема, сповіщення, таймери, що зараз ідуть) не синхронізуємо.
const SYNC_KEYS = [
    "habits", "goals", "history", "notes", "activityLog",
    "xp", "level", "streak", "streakFreezes", "lastStreakDate", "lastOpen",
    "totalHabitCompletions", "totalGoalCompletions", "totalPomodoroCompletions",
    "unlockedAchievements", "claimedAchievements",
    "dailyStatsDate", "habitsCompletedToday", "goalsCompletedToday", "pomodorosCompletedToday",
    "dayProgressPeakPercent", "dailyBonusReady", "dailyBonusClaimedDate",
    "dailyChallengesDate", "dailyChallengesIds", "dailyChallengesClaimed",
    "habitSortMode", "goalSortMode",
    "myFriendCode", "myFriendName", "friendCodes",
    "jarvisSkin", "jarvisCostume", "jarvisMovement",
    "favoriteQuotes", "jarvisHints"
];

const FRIEND_KEYS = ["myFriendCode", "myFriendName", "friendCodes"];

const META_KEY = "cloudSyncMeta";
const FLASH_KEY = "cloudSyncFlash";
const COLLECTION = "userdata";

// Firestore дозволяє документ до 1 МіБ; лишаємо запас на службові поля
const MAX_BYTES = 900 * 1024;
const CHECK_INTERVAL_MS = 4000;

let currentUser = null;
let enabled = false;
let busy = false;
let conflictOpen = false;
let tooBigNotified = false;
let lastError = "";

// Хеш сховища в момент, коли цей файл виконався (до змін від app.js)
const earlyHash = hashSnapshot(readSnapshot());

// Хеш, який вважаємо «чистим»: збіг з ним означає, що користувач нічого не змінював.
// Поки app.js не завершив старт, він невідомий.
let cleanHash = null;
let bootResolve;
const bootReady = new Promise(r => { bootResolve = r; });

// ----------------
// Сховище
// ----------------

function readMeta(){

    try{

        const m = JSON.parse(localStorage.getItem(META_KEY));

        return (m && typeof m === "object") ? m : {};

    }catch(e){

        return {};

    }

}

function writeMeta(meta){

    try{

        localStorage.setItem(META_KEY, JSON.stringify(meta));

    }catch(e){

        console.warn("cloud-sync: не вдалося зберегти службові дані", e);

    }

}

function readSnapshot(){

    const data = {};

    SYNC_KEYS.forEach(key => {

        let value = null;

        try{ value = localStorage.getItem(key); }catch(e){ value = null; }

        data[key] = value;

    });

    return data;

}

// cyrb53 — швидкий некриптографічний хеш, щоб не тримати копію всіх даних удруге
function hashString(str){

    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;

    for(let i = 0; i < str.length; i++){

        const ch = str.charCodeAt(i);

        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);

    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);

}

function hashSnapshot(snapshot){

    return hashString(JSON.stringify(SYNC_KEYS.map(k => snapshot[k])));

}

function isLocalEmpty(snapshot){

    const list = key => {

        try{

            const v = JSON.parse(snapshot[key]);

            return Array.isArray(v) ? v.length : 0;

        }catch(e){

            return 0;

        }

    };

    return list("habits") === 0
        && list("goals") === 0
        && list("notes") === 0
        && !(Number(snapshot.xp) > 0)
        && !(Number(snapshot.level) > 1);

}

function applySnapshot(data){

    SYNC_KEYS.forEach(key => {

        const value = data ? data[key] : undefined;

        try{

            if(typeof value === "string") localStorage.setItem(key, value);
            else if(value === null || value === undefined) localStorage.removeItem(key);

        }catch(e){

            console.warn("cloud-sync: не вдалося записати ключ", key, e);

        }

    });

}

function newRev(){

    const bytes = new Uint8Array(8);

    if(window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for(let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);

    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");

}

function deviceLabel(){

    const ua = navigator.userAgent || "";

    if(/iPhone/.test(ua)) return "iPhone";
    if(/iPad/.test(ua)) return "iPad";
    if(/Android/.test(ua)) return "Android";
    if(/Windows/.test(ua)) return "Windows";
    if(/Mac OS X|Macintosh/.test(ua)) return "Mac";
    if(/Linux/.test(ua)) return "Linux";

    return "Пристрій";

}

function formatTime(ms){

    if(!Number.isFinite(ms) || ms <= 0) return "";

    const d = new Date(ms);
    const sameDay = d.toDateString() === new Date().toDateString();

    return sameDay
        ? d.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleString("uk-UA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

}

function toast(text){

    if(typeof showToast === "function") showToast(text);

}

// ----------------
// Firebase
// ----------------

function firebaseAvailable(){

    return typeof firebase !== "undefined"
        && firebase.apps && firebase.apps.length > 0;

}

function docRef(){

    return firebase.firestore().collection(COLLECTION).doc(currentUser.uid);

}

function hasLocalChanges(){

    return cleanHash === null || hashSnapshot(readSnapshot()) !== cleanHash;

}

function needsPush(){

    return hashSnapshot(readSnapshot()) !== readMeta().pushedHash;

}

function cloudDataValid(doc){

    return doc && doc.exists && doc.data()
        && typeof doc.data().rev === "string"
        && doc.data().data && typeof doc.data().data === "object";

}

// Записати дані цього пристрою в хмару.
// force=false: лише якщо в хмарі той rev, який ми бачили востаннє (інакше — конфлікт).
async function push(force){

    if(!enabled || !currentUser) return "off";

    const snapshot = readSnapshot();
    const hash = hashSnapshot(snapshot);
    const payloadSize = JSON.stringify(snapshot).length * 2;

    if(payloadSize > MAX_BYTES){

        if(!tooBigNotified){

            tooBigNotified = true;
            toast("⚠️ Даних забагато для синхронізації — видали старі нотатки");

        }

        lastError = "Даних забагато для хмари";
        renderUI();

        return "too-big";

    }

    const meta = readMeta();
    const rev = newRev();
    const now = Date.now();
    const ref = docRef();

    const result = await firebase.firestore().runTransaction(async tx => {

        const doc = await tx.get(ref);

        if(!force && doc.exists && doc.data() && doc.data().rev !== meta.rev){

            return { conflict: doc };

        }

        tx.set(ref, {
            v: 1,
            rev: rev,
            updatedAt: now,
            device: deviceLabel(),
            data: snapshot
        });

        return { ok: true };

    });

    if(result.conflict) return { conflict: result.conflict };

    writeMeta({ uid: currentUser.uid, rev: rev, pushedHash: hash, syncedAt: now });

    cleanHash = hash;
    lastError = "";
    renderUI();

    return "pushed";

}

function applyCloudAndReload(doc, message){

    const cloud = doc.data();

    applySnapshot(cloud.data);

    writeMeta({
        uid: currentUser.uid,
        rev: cloud.rev,
        pushedHash: hashSnapshot(readSnapshot()),
        syncedAt: Date.now()
    });

    try{ sessionStorage.setItem(FLASH_KEY, message || "☁️ Дані оновлено з хмари"); }catch(e){}

    location.reload();

}

// Головна перевірка: порівняти хмару з цим пристроєм і вирішити, що робити
async function reconcile(){

    if(!enabled || !currentUser || busy || conflictOpen) return;

    if(typeof navigator !== "undefined" && navigator.onLine === false){

        lastError = "Офлайн — синхронізую, коли з'явиться інтернет";
        renderUI();

        return;

    }

    busy = true;
    renderUI();

    try{

        const meta = readMeta();
        const firstTimeHere = meta.uid !== currentUser.uid;
        const doc = await docRef().get();

        if(!cloudDataValid(doc)){

            // Хмара порожня — це перший пристрій, просто зберігаємо
            await push(true);

        }else if(firstTimeHere){

            if(isLocalEmpty(readSnapshot())){

                applyCloudAndReload(doc, "☁️ Дані завантажено з хмари");

                return;

            }

            askConflict(doc, true);

        }else if(doc.data().rev !== meta.rev){

            // Хмару оновив інший пристрій
            if(hasLocalChanges()) askConflict(doc, false);
            else{

                applyCloudAndReload(doc);

                return;

            }

        }else if(needsPush()){

            const result = await push(false);

            if(result && result.conflict){

                if(hasLocalChanges()) askConflict(result.conflict, false);
                else{

                    applyCloudAndReload(result.conflict);

                    return;

                }

            }

        }

        lastError = "";

    }catch(e){

        console.error("cloud-sync:", e);

        lastError = (e && e.code === "permission-denied")
            ? "Немає доступу до бази — перевір правила Firestore"
            : (e && (e.code === "unavailable" || e.code === "failed-precondition"))
                ? "Немає зв'язку з сервером — спробую пізніше"
                : "Помилка синхронізації — спробую пізніше";

    }finally{

        busy = false;
        renderUI();

    }

}

// Користувач вирішив лишити дані цього пристрою.
// Профіль «Друзів» беремо з хмари: він прив'язаний до цього Google-акаунта,
// а код друга з цього пристрою міг належати старому анонімному акаунту.
async function keepLocal(doc){

    let needReload = false;
    const cloud = doc && doc.exists ? doc.data() : null;

    if(cloud && cloud.data && typeof cloud.data.myFriendCode === "string" && cloud.data.myFriendCode){

        let local = {};
        try{ local = readSnapshot(); }catch(e){}

        if(local.myFriendCode !== cloud.data.myFriendCode){

            FRIEND_KEYS.forEach(key => {

                const v = cloud.data[key];

                if(typeof v === "string") localStorage.setItem(key, v);

            });

            needReload = true;

        }

    }

    busy = true;

    try{

        await push(true);

        if(needReload){

            try{ sessionStorage.setItem(FLASH_KEY, "☁️ Дані цього пристрою збережено в хмару"); }catch(e){}

            location.reload();

            return;

        }

        toast("☁️ Дані цього пристрою збережено в хмару");

    }catch(e){

        console.error("cloud-sync:", e);
        toast("⚠️ Не вдалося зберегти в хмару");

    }finally{

        busy = false;
        renderUI();

    }

}

// ----------------
// Вхід / вихід
// ----------------

async function signIn(){

    if(!firebaseAvailable()){

        toast("⚠️ Firebase не підключено");

        return;

    }

    const auth = firebase.auth();
    const provider = new firebase.auth.GoogleAuthProvider();
    const user = auth.currentUser;

    try{

        if(user && user.isAnonymous) await user.linkWithPopup(provider);
        else await auth.signInWithPopup(provider);

        // Прив'язка не викликає onAuthStateChanged — повідомляємо самі
        handleAuth(auth.currentUser);

    }catch(e){

        await handleSignInError(e, provider);

    }

}

async function handleSignInError(e, provider){

    const auth = firebase.auth();
    const code = e && e.code;

    if(code === "auth/credential-already-in-use" || code === "auth/email-already-in-use"){

        // Цей Google-акаунт уже використовується на іншому пристрої — входимо в нього
        const credential = e.credential || (firebase.auth.GoogleAuthProvider.credentialFromError
            ? firebase.auth.GoogleAuthProvider.credentialFromError(e) : null);

        if(credential){

            try{

                await auth.signInWithCredential(credential);

                return;

            }catch(e2){

                console.error("cloud-sync sign-in:", e2);

            }

        }

        toast("⚠️ Не вдалося увійти — спробуй ще раз");

        return;

    }

    if(code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment"){

        // Встановлений PWA або браузер без спливаючих вікон — вхід через перенаправлення
        const user = auth.currentUser;

        if(provider){

            if(user && user.isAnonymous) await user.linkWithRedirect(provider);
            else await auth.signInWithRedirect(provider);

        }

        return;

    }

    if(code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;

    if(code === "auth/operation-not-allowed"){

        toast("⚠️ Увімкни вхід через Google у Firebase Console → Authentication");

        return;

    }

    if(code === "auth/unauthorized-domain"){

        toast("⚠️ Додай цей домен у Firebase → Authentication → Authorized domains");

        return;

    }

    console.error("cloud-sync sign-in:", e);
    toast("⚠️ Не вдалося увійти через Google");

}

async function signOut(){

    if(!firebaseAvailable() || !currentUser) return;

    // Системний confirm() блокують вбудовані браузери й частина PWA (одразу повертає «Скасувати»),
    // через що кнопка «Вийти» нічого не робила. Тому — власна нижня панель.
    const title = "Вийти з Google-акаунта?";
    const message = "Синхронізація на цьому пристрої вимкнеться. Дані лишаться тут і в хмарі. " +
        "Профіль у «Друзях» не оновлюватиметься, поки знову не увійдеш.";

    const ok = typeof uiConfirm === "function"
        ? await uiConfirm(title, message, "Вийти")
        : confirm(title + "\n\n" + message);

    if(!ok) return;

    busy = true;
    renderUI();

    try{

        if(needsPush()) await push(false);

    }catch(e){

        console.warn("cloud-sync: останнє збереження перед виходом не вдалося", e);

    }

    try{ localStorage.removeItem(META_KEY); }catch(e){}

    try{

        await firebase.auth().signOut();

    }catch(e){

        console.error("cloud-sync sign-out:", e);
        busy = false;
        renderUI();
        toast("⚠️ Не вдалося вийти — спробуй ще раз");

        return;

    }

    busy = false;

    // Одразу показуємо стан «не увійшов»; анонімний вхід для «Друзів» friends.js зробить сам
    handleAuth(null);

    toast("👋 Ти вийшов. Синхронізацію вимкнено");

}

// Викликається з friends.js при кожній зміні користувача Firebase
function handleAuth(user){

    const wasEnabled = enabled;
    const prevUid = currentUser && currentUser.uid;

    currentUser = user || null;
    enabled = !!(user && !user.isAnonymous);

    renderUI();

    if(enabled && (!wasEnabled || prevUid !== user.uid)){

        bootReady.then(reconcile);

    }

}

function syncNow(){

    if(!enabled){

        signIn();

        return;

    }

    reconcile().then(() => {

        if(!lastError && !conflictOpen) toast("☁️ Синхронізовано");

    });

}

// ----------------
// Інтерфейс
// ----------------

function renderUI(){

    const status = document.getElementById("syncStatus");
    const signInBtn = document.getElementById("syncSignInBtn");
    const nowBtn = document.getElementById("syncNowBtn");
    const outBtn = document.getElementById("syncSignOutBtn");

    if(!status) return;

    if(!firebaseAvailable()){

        status.textContent = "Синхронізація недоступна: Firebase не підключено або немає інтернету.";

        [signInBtn, nowBtn, outBtn].forEach(b => { if(b) b.style.display = "none"; });

        return;

    }

    if(!enabled){

        status.textContent = "Увійди через Google, щоб звички, цілі й прогрес були однакові на телефоні та комп'ютері.";

        if(signInBtn) signInBtn.style.display = "";
        if(nowBtn) nowBtn.style.display = "none";
        if(outBtn) outBtn.style.display = "none";

        return;

    }

    const meta = readMeta();
    const who = (currentUser && currentUser.email) || "Google-акаунт";
    let line;

    if(busy) line = "Синхронізую…";
    else if(lastError) line = lastError;
    else if(meta.syncedAt) line = "Остання синхронізація: " + formatTime(meta.syncedAt);
    else line = "Готую першу синхронізацію…";

    status.textContent = "✅ " + who + "\n" + line;

    if(signInBtn) signInBtn.style.display = "none";
    if(nowBtn){

        nowBtn.style.display = "";
        nowBtn.disabled = busy;

    }
    if(outBtn) outBtn.style.display = "";

}

function askConflict(doc, firstTime){

    if(conflictOpen) return;

    conflictOpen = true;

    const cloud = doc.data();
    const when = formatTime(Number(cloud.updatedAt));
    const where = typeof cloud.device === "string" ? cloud.device.slice(0, 20) : "";

    const modal = document.createElement("div");
    modal.className = "achievement-modal show sync-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");

    const box = document.createElement("div");
    box.className = "achievement-modal-content";

    const icon = document.createElement("div");
    icon.className = "sync-modal-icon";
    icon.textContent = "☁️";

    const title = document.createElement("h3");
    title.textContent = firstTime ? "У хмарі вже є дані" : "Дані змінено на іншому пристрої";

    const text = document.createElement("p");
    text.textContent = (firstTime
        ? "На цьому пристрої теж є прогрес. Які дані лишити?"
        : "Тут теж є несинхронізовані зміни. Які дані лишити?")
        + (when ? " Хмару оновлено " + when + (where ? " (" + where + ")" : "") + "." : "");

    const cloudBtn = document.createElement("button");
    cloudBtn.type = "button";
    cloudBtn.textContent = "☁️ Завантажити з хмари";

    const localBtn = document.createElement("button");
    localBtn.type = "button";
    localBtn.className = "sync-modal-secondary";
    localBtn.textContent = "📱 Лишити дані цього пристрою";

    const close = () => {

        modal.remove();
        conflictOpen = false;

    };

    cloudBtn.addEventListener("click", () => {

        close();
        applyCloudAndReload(doc, "☁️ Дані завантажено з хмари");

    });

    localBtn.addEventListener("click", async () => {

        const question = "Дані в хмарі буде замінено даними з цього пристрою.";

        const ok = typeof uiConfirm === "function"
            ? await uiConfirm("Замінити дані в хмарі?", question, "Замінити")
            : confirm(question + " Продовжити?");

        if(!ok) return;

        close();
        keepLocal(doc);

    });

    box.append(icon, title, text, cloudBtn, localBtn);
    modal.appendChild(box);
    document.body.appendChild(modal);

    cloudBtn.focus();

}

function bindUI(){

    const signInBtn = document.getElementById("syncSignInBtn");
    const nowBtn = document.getElementById("syncNowBtn");
    const outBtn = document.getElementById("syncSignOutBtn");

    if(signInBtn) signInBtn.addEventListener("click", signIn);
    if(nowBtn) nowBtn.addEventListener("click", syncNow);
    if(outBtn) outBtn.addEventListener("click", signOut);

    renderUI();

}

// ----------------
// Старт і фонові перевірки
// ----------------

window.addEventListener("load", () => {

    bindUI();

    // Даємо app.js завершити стартові оновлення сховища (новий день, нормалізація).
    // Якщо до запуску пристрій був синхронізований, ці зміни не вважаємо «змінами користувача».
    setTimeout(() => {

        cleanHash = earlyHash === readMeta().pushedHash
            ? hashSnapshot(readSnapshot())
            : earlyHash + "-unsynced";

        bootResolve();

    }, 800);

    let flash = "";

    try{

        flash = sessionStorage.getItem(FLASH_KEY) || "";
        sessionStorage.removeItem(FLASH_KEY);

    }catch(e){}

    if(flash) setTimeout(() => toast(flash), 600);

    // Результат входу через перенаправлення (для PWA на телефоні)
    if(firebaseAvailable()){

        firebase.auth().getRedirectResult()
            .then(res => { if(res && res.user) handleAuth(res.user); })
            .catch(e => handleSignInError(e, null));

    }

});

setInterval(() => {

    if(!enabled || busy || conflictOpen || cleanHash === null) return;

    if(needsPush()) reconcile();

}, CHECK_INTERVAL_MS);

// Закриваємо вкладку/згортаємо застосунок — зберігаємо одразу.
// Повертаємось — перевіряємо, чи не змінились дані на іншому пристрої.
document.addEventListener("visibilitychange", () => {

    if(!enabled || cleanHash === null) return;

    if(document.visibilityState === "hidden"){

        if(needsPush() && !busy && !conflictOpen) reconcile();

    }else{

        reconcile();

    }

});

window.addEventListener("online", () => {

    if(enabled && cleanHash !== null) reconcile();

});

window.cloudSync = {
    handleAuth: handleAuth,
    signIn: signIn,
    signOut: signOut,
    syncNow: syncNow
};

})();
