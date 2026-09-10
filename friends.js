// ----------------
// Друзі — змагання через Firebase
// ----------------

let myFriendCode = localStorage.getItem("myFriendCode") || "";
let myFriendName = localStorage.getItem("myFriendName") || "";
let friendCodes = JSON.parse(localStorage.getItem("friendCodes")) || [];

let firebaseReady = false;
let db = null;

function initFirebase(){

    if(typeof firebaseConfig === "undefined" || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY"){

        console.warn("Firebase не налаштований — заповніть firebase-config.js");

        return;

    }

    try{

        firebase.initializeApp(firebaseConfig);

        db = firebase.firestore();

        firebase.auth().signInAnonymously().then(()=>{

            firebaseReady = true;

            renderFriendsPage();
            syncMyProfileToCloud();

        }).catch(e=> console.error("Firebase auth:", e));

    }catch(e){

        console.error("Firebase init:", e);

    }

}

function generateFriendCode(){

    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for(let i=0;i<6;i++){

        code += chars[Math.floor(Math.random()*chars.length)];

    }

    return code;

}

function createFriendProfile(){

    const input = document.getElementById("friendNameInput");

    if(!input || input.value.trim()==="") return;

    myFriendName = input.value.trim();
    myFriendCode = generateFriendCode();

    localStorage.setItem("myFriendName", myFriendName);
    localStorage.setItem("myFriendCode", myFriendCode);

    syncMyProfileToCloud();

    renderFriendsPage();

    showToast("🎉 Профіль створено! Твій код: "+myFriendCode);

}

function syncMyProfileToCloud(){

    if(!firebaseReady || !db || !myFriendCode) return;

    const total = habits.length + goals.length;
    const done = habits.filter(h=>h.done).length + goals.filter(g=>g.done).length;
    const todayPercent = total===0 ? 0 : Math.round(done/total*100);

    db.collection("users").doc(myFriendCode).set({
        name: myFriendName,
        level: level,
        streak: streak,
        xp: xp,
        todayPercent: todayPercent,
        avatar: getAvatarForLevel(level),
        updatedAt: Date.now()
    }).catch(e=> console.error("Firestore sync:", e));

}

function copyFriendCode(){

    if(!myFriendCode) return;

    navigator.clipboard.writeText(myFriendCode).then(()=>{

        showToast("📋 Код скопійовано: "+myFriendCode);

    }).catch(()=>{

        showToast("Твій код: "+myFriendCode);

    });

}

function addFriend(){

    const input = document.getElementById("friendCodeInput");

    if(!input || input.value.trim()==="") return;

    const code = input.value.trim().toUpperCase();

    if(code === myFriendCode){

        showToast("Це твій власний код 🙂");

        return;

    }

    if(friendCodes.includes(code)){

        showToast("Цей друг вже доданий");

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

async function renderFriendsList(){

    const list = document.getElementById("friendsList");

    if(!list) return;

    if(!firebaseReady || !db){

        list.innerHTML = '<p style="opacity:.6;text-align:center;padding:10px">Firebase ще не підключено. Заповни firebase-config.js</p>';

        return;

    }

    if(friendCodes.length === 0){

        list.innerHTML = '<p style="opacity:.6;text-align:center;padding:10px">Додай першого друга за кодом вище</p>';

        return;

    }

    list.innerHTML = '<p style="opacity:.6;text-align:center;padding:10px">Завантаження...</p>';

    const results = [];

    for(const code of friendCodes){

        try{

            const doc = await db.collection("users").doc(code).get();

            if(doc.exists){

                results.push({ code, ...doc.data() });

            }

        }catch(e){

            console.error("Fetch friend:", e);

        }

    }

    results.sort((a,b)=> (b.xp + b.level*100) - (a.xp + a.level*100));

    list.innerHTML = "";

    if(results.length === 0){

        list.innerHTML = '<p style="opacity:.6;text-align:center;padding:10px">Жодного профілю не знайдено — перевір коди</p>';

        return;

    }

    results.forEach((f, i)=>{

        const div = document.createElement("div");

        div.className = "friend-card";

        div.innerHTML =
            '<div class="friend-rank">'+(i+1)+'</div>'+
            '<div class="friend-avatar">'+(f.avatar || "🌱")+'</div>'+
            '<div class="friend-info">'+
            '<b>'+f.name+'</b>'+
            '<small>Рівень '+f.level+' · '+f.streak+' 🔥 · сьогодні '+f.todayPercent+'%</small>'+
            '</div>'+
            '<button onclick="removeFriend(\''+f.code+'\')">🗑</button>';

        list.appendChild(div);

    });

}

function renderFriendsPage(){

    const noProfile = document.getElementById("friendNoProfile");
    const hasProfile = document.getElementById("friendHasProfile");
    const myCodeText = document.getElementById("myFriendCodeText");
    const notConfigured = document.getElementById("friendNotConfigured");

    if(typeof firebaseConfig === "undefined" || !firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_API_KEY"){

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
