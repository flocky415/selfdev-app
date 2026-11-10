/*
 * SelfDev — друзі та змагання (Firebase)
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 */

// ----------------
// Друзі — змагання через Firebase
// ----------------

const FRIEND_CODE_RE = /^[A-HJ-NP-Z2-9]{6,10}$/;
const FRIEND_CODE_LENGTH = 8;
const MAX_FRIENDS = 50;
const KNOWN_AVATARS = ["🌱","🧑","🦸","👑"];

function readFriendCodes(){

    try{

        const raw = JSON.parse(localStorage.getItem("friendCodes"));

        if(!Array.isArray(raw)) return [];

        return raw
            .map(c => String(c).toUpperCase())
            .filter(c => FRIEND_CODE_RE.test(c))
            .slice(0, MAX_FRIENDS);

    }catch(e){

        return [];

    }

}

let myFriendCode = (localStorage.getItem("myFriendCode") || "").toUpperCase();
let myFriendName = (localStorage.getItem("myFriendName") || "").slice(0,30);
let friendCodes = readFriendCodes();

if(!FRIEND_CODE_RE.test(myFriendCode)) myFriendCode = "";

let firebaseReady = false;
let db = null;
let myUid = "";

let lastSyncedPayload = "";
let syncTimer = null;
let syncBlockedNotified = false;
let friendsRenderToken = 0;

function friendsToday(){

    return typeof localISODate === "function"
        ? localISODate()
        : new Date().toLocaleDateString("sv-SE");

}

function friendsYesterday(){

    return typeof isoDaysAgo === "function"
        ? isoDaysAgo(1)
        : new Date(Date.now() - 86400000).toLocaleDateString("sv-SE");

}

function isFirebaseConfigured(){

    return typeof firebaseConfig !== "undefined"
        && firebaseConfig
        && firebaseConfig.apiKey
        && firebaseConfig.apiKey !== "YOUR_API_KEY";

}

function initFirebase(){

    if(!isFirebaseConfigured()){

        console.warn("Firebase не налаштований — заповніть firebase-config.js");

        return;

    }

    if(typeof firebase === "undefined"){

        console.warn("Firebase SDK не завантажився (немає інтернету?)");

        return;

    }

    try{

        firebase.initializeApp(firebaseConfig);

        db = firebase.firestore();

        // Спершу чекаємо, чи вже є збережений вхід (зокрема через Google для синхронізації).
        // Анонімно входимо лише якщо нікого немає — інакше signInAnonymously «викинув» би Google-акаунт.
        firebase.auth().onAuthStateChanged(user=>{

            if(!user){

                firebaseReady = false;

                firebase.auth().signInAnonymously().catch(e=> console.error("Firebase auth:", e));

                return;

            }

            const uidChanged = myUid !== user.uid;

            myUid = user.uid;

            firebaseReady = true;

            if(uidChanged) lastSyncedPayload = "";

            renderFriendsPage();
            syncMyProfileToCloud();

            if(window.cloudSync) window.cloudSync.handleAuth(user);

        });

    }catch(e){

        console.error("Firebase init:", e);

    }

}

// Код друга — це «пароль» до його профілю, тому генеруємо його криптостійко
// (Math.random передбачуваний) і довшим: 8 символів з 32 = 40 біт.
function generateFriendCode(){

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const bytes = new Uint8Array(FRIEND_CODE_LENGTH);

    if(window.crypto && window.crypto.getRandomValues){

        window.crypto.getRandomValues(bytes);

    }else{

        for(let i=0;i<bytes.length;i++) bytes[i] = Math.floor(Math.random()*256);

    }

    let code = "";

    for(let i=0;i<bytes.length;i++){

        // 256 ділиться на 32 націло, тож зміщення розподілу немає
        code += chars[bytes[i] % chars.length];

    }

    return code;

}

async function createFriendProfile(){

    if(myFriendCode) return;

    const input = document.getElementById("friendNameInput");

    if(!input) return;

    const name = input.value.trim().slice(0,30);

    if(name === "") return;

    let code = generateFriendCode();

    // Якщо хмара доступна — переконуємось, що такий код ще не зайнятий
    if(firebaseReady && db){

        try{

            for(let attempt=0; attempt<5; attempt++){

                const doc = await db.collection("users").doc(code).get();

                if(!doc.exists) break;

                code = generateFriendCode();

            }

        }catch(e){

            console.error("Перевірка коду:", e);

        }

    }

    myFriendName = name;
    myFriendCode = code;

    localStorage.setItem("myFriendName", myFriendName);
    localStorage.setItem("myFriendCode", myFriendCode);

    lastSyncedPayload = "";

    syncMyProfileToCloud();

    renderFriendsPage();

    showToast("🎉 Профіль створено! Твій код: "+myFriendCode);

}

function getMyTodayPercent(){

    const total = habits.length + goals.length;
    const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;

    return total===0 ? 0 : Math.round(done/total*100);

}

async function getOrUpdateJointStreak(friendCode, friendTodayPercent){

    if(!db || !firebaseReady || !myFriendCode) return 0;

    const pairKey = [myFriendCode, friendCode].sort().join("_");
    const todayISO = friendsToday();
    const yesterdayISO = friendsYesterday();

    const myTodayPercent = getMyTodayPercent();
    const bothActiveToday = myTodayPercent > 0 && friendTodayPercent > 0;

    try{

        const docRef = db.collection("pairs").doc(pairKey);
        const doc = await docRef.get();

        let jointStreak = 0;
        let lastJointDate = "";

        if(doc.exists){

            const data = doc.data();

            jointStreak = Math.max(0, Math.floor(Number(data.jointStreak) || 0));
            lastJointDate = String(data.lastJointDate || "");

        }

        // Серія жива, лише якщо востаннє її продовжували сьогодні або вчора.
        // Раніше тут повертався старий лічильник навіть після пропущених днів.
        const alive = lastJointDate === todayISO || lastJointDate === yesterdayISO;

        if(!bothActiveToday || lastJointDate === todayISO){

            return alive ? jointStreak : 0;

        }

        jointStreak = (lastJointDate === yesterdayISO) ? jointStreak+1 : 1;

        await docRef.set({ jointStreak, lastJointDate: todayISO });

        return jointStreak;

    }catch(e){

        console.error("Joint streak:", e);

        return 0;

    }

}

function buildProfilePayload(){

    const avatar = typeof getAvatarForLevel === "function" ? getAvatarForLevel(level) : "🌱";

    return {
        name: myFriendName.slice(0,30),
        level: Math.max(1, Math.floor(Number(level) || 1)),
        streak: Math.max(0, Math.floor(Number(streak) || 0)),
        xp: Math.max(0, Math.floor(Number(xp) || 0)),
        todayPercent: getMyTodayPercent(),
        todayDate: friendsToday(),
        avatar: KNOWN_AVATARS.includes(avatar) ? avatar : "🌱",
        ownerUid: myUid
    };

}

// Профіль записується не частіше за раз на кілька секунд і лише якщо щось змінилось:
// updateStats() викликається при кожній дії, і раніше кожна з них була записом у Firestore.
function syncMyProfileToCloud(){

    if(!firebaseReady || !db || !myFriendCode || !myUid) return;

    if(syncTimer) return;

    syncTimer = setTimeout(()=>{

        syncTimer = null;

        pushProfileNow();

    }, 3000);

}

function pushProfileNow(){

    if(!firebaseReady || !db || !myFriendCode || !myUid) return;

    const payload = buildProfilePayload();

    const serialized = JSON.stringify(payload);

    if(serialized === lastSyncedPayload) return;

    db.collection("users").doc(myFriendCode).set(
        Object.assign({}, payload, { updatedAt: Date.now() })
    ).then(()=>{

        lastSyncedPayload = serialized;

    }).catch(e=>{

        console.error("Firestore sync:", e);

        if(e && e.code === "permission-denied" && !syncBlockedNotified){

            syncBlockedNotified = true;

            showToast("⚠️ Профіль у хмарі не оновився — можливо, цей код створено старою версією. Створи профіль заново.");

        }

    });

}

function copyFriendCode(){

    if(!myFriendCode) return;

    const fallback = ()=> showToast("Твій код: "+myFriendCode);

    if(!navigator.clipboard || !navigator.clipboard.writeText){

        fallback();

        return;

    }

    navigator.clipboard.writeText(myFriendCode).then(()=>{

        showToast("📋 Код скопійовано: "+myFriendCode);

    }).catch(fallback);

}

function addFriend(){

    const input = document.getElementById("friendCodeInput");

    if(!input || input.value.trim()==="") return;

    const code = input.value.trim().toUpperCase();

    if(!FRIEND_CODE_RE.test(code)){

        showToast("Код має складатися з 6–10 великих літер і цифр");

        return;

    }

    if(code === myFriendCode){

        showToast("Це твій власний код 🙂");

        return;

    }

    if(friendCodes.includes(code)){

        showToast("Цей друг вже доданий");

        return;

    }

    if(friendCodes.length >= MAX_FRIENDS){

        showToast("Забагато друзів у списку (максимум "+MAX_FRIENDS+")");

        return;

    }

    friendCodes.push(code);

    localStorage.setItem("friendCodes", JSON.stringify(friendCodes));

    input.value = "";

    renderFriendsList();

}

function removeFriend(code){

    friendCodes = friendCodes.filter(c=>c!==code);

    localStorage.setItem("friendCodes", JSON.stringify(friendCodes));

    renderFriendsList();

}

function friendsMessage(list, text){

    list.textContent = "";

    const p = document.createElement("p");

    p.style.cssText = "opacity:.6;text-align:center;padding:10px";
    p.textContent = text;

    list.appendChild(p);

}

function cleanFriend(code, data){

    const num = (v, min, max)=>{

        const n = Math.floor(Number(v));

        return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;

    };

    const avatar = String(data.avatar || "");

    return {
        code,
        name: String(data.name || "Без імені").slice(0,30),
        level: num(data.level, 1, 10000),
        streak: num(data.streak, 0, 100000),
        xp: num(data.xp, 0, 1000000),
        // Відсоток друга враховуємо лише якщо він оновлений сьогодні, інакше це вчорашнє число
        todayPercent: data.todayDate === friendsToday() ? num(data.todayPercent, 0, 100) : 0,
        avatar: KNOWN_AVATARS.includes(avatar) ? avatar : "🌱"
    };

}

async function renderFriendsList(){

    const list = document.getElementById("friendsList");

    if(!list) return;

    const token = ++friendsRenderToken;

    if(!firebaseReady || !db){

        friendsMessage(list, "Firebase ще не підключено. Заповни firebase-config.js");

        return;

    }

    if(friendCodes.length === 0){

        friendsMessage(list, "Додай першого друга за кодом вище");

        return;

    }

    friendsMessage(list, "Завантаження...");

    // Усі профілі читаємо паралельно, а не по одному
    const fetched = await Promise.all(friendCodes.map(async code=>{

        try{

            const doc = await db.collection("users").doc(code).get();

            return doc.exists ? cleanFriend(code, doc.data() || {}) : null;

        }catch(e){

            console.error("Fetch friend:", e);

            return null;

        }

    }));

    if(token !== friendsRenderToken) return;

    const results = fetched.filter(Boolean);

    results.sort((a,b)=> (b.xp + b.level*100) - (a.xp + a.level*100));

    if(results.length === 0){

        friendsMessage(list, "Жодного профілю не знайдено — перевір коди");

        return;

    }

    const myTodayPercent = getMyTodayPercent();

    await Promise.all(results.map(async f=>{

        f.jointStreak = await getOrUpdateJointStreak(f.code, f.todayPercent);

    }));

    if(token !== friendsRenderToken) return;

    list.textContent = "";

    results.forEach((f, i)=>{

        const card = document.createElement("div");

        card.className = "friend-card";

        const rank = document.createElement("div");

        rank.className = "friend-rank";
        rank.textContent = String(i+1);

        const avatar = document.createElement("div");

        avatar.className = "friend-avatar";
        avatar.textContent = f.avatar;

        const info = document.createElement("div");

        info.className = "friend-info";

        const nameEl = document.createElement("b");

        nameEl.textContent = f.name;

        const details = document.createElement("small");

        details.textContent = "Рівень "+f.level+" · "+f.streak+" 🔥 · сьогодні "+f.todayPercent+"%";

        info.appendChild(nameEl);
        info.appendChild(details);

        card.appendChild(rank);
        card.appendChild(avatar);
        card.appendChild(info);

        if(f.jointStreak > 0){

            const bothActiveToday = myTodayPercent > 0 && f.todayPercent > 0;

            const flame = document.createElement("div");

            flame.className = "shared-flame"+(bothActiveToday ? "" : " dim");
            flame.title = "Спільний вогник з "+f.name;
            flame.appendChild(document.createTextNode("🔥🤝"));

            const count = document.createElement("small");

            count.textContent = String(f.jointStreak);

            flame.appendChild(count);

            card.appendChild(flame);

        }

        const removeBtn = document.createElement("button");

        removeBtn.type = "button";
        removeBtn.textContent = "🗑";
        removeBtn.setAttribute("aria-label", "Видалити друга "+f.name);
        removeBtn.addEventListener("click", ()=> removeFriend(f.code));

        card.appendChild(removeBtn);

        list.appendChild(card);

    });

}

function renderFriendsPage(){

    const noProfile = document.getElementById("friendNoProfile");
    const hasProfile = document.getElementById("friendHasProfile");
    const myCodeText = document.getElementById("myFriendCodeText");
    const notConfigured = document.getElementById("friendNotConfigured");

    if(!isFirebaseConfigured()){

        if(notConfigured) notConfigured.style.display = "block";
        if(noProfile) noProfile.style.display = "none";
        if(hasProfile) hasProfile.style.display = "none";

        return;

    }

    if(notConfigured) notConfigured.style.display = "none";

    if(!noProfile || !hasProfile) return;

    if(myFriendCode){

        noProfile.style.display = "none";
        hasProfile.style.display = "block";

        if(myCodeText) myCodeText.innerText = myFriendCode;

        renderFriendsList();

    }else{

        noProfile.style.display = "block";
        hasProfile.style.display = "none";

    }

}

try{

    initFirebase();
    renderFriendsPage();

}catch(e){

    console.error("friends.js init:", e);

}
