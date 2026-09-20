// ----------------
// Джарвіз — 3D-компаньйон (Three.js)
// Оригінальний персонаж: жовтий капсуловидний помічник з великим оком та окулярами
// ----------------

let jarvisScene, jarvisCamera, jarvisRenderer;
let jarvisBody, jarvisEye, jarvisEyeWhite;
let jarvisArmL, jarvisArmR;
let jarvisAccessory = null;
let jarvisClock = 0;
let jarvisSpinBoost = 0;

const jarvisSkins = [
    { id:"classic", name:"Класичний", color:0xffd93d, unlockLevel:1 },
    { id:"blue", name:"Синій", color:0x38bdf8, unlockLevel:2 },
    { id:"green", name:"Зелений", color:0x4ade80, unlockLevel:4 },
    { id:"purple", name:"Фіолетовий", color:0xa78bfa, unlockLevel:7 },
    { id:"pink", name:"Рожевий", color:0xf472b6, unlockLevel:10 },
    { id:"midnight", name:"Опівнічний", color:0x475569, unlockLevel:14 }
];

let jarvisSkinId = localStorage.getItem("jarvisSkin") || "classic";

const jarvisMovements = [
    { id:"calm", name:"Спокійний", unlockLevel:1, bobSpeed:0.5, bobAmplitude:0.04, rotSpeed:0.3, rotAmplitude:0.2 },
    { id:"classic", name:"Класичний", unlockLevel:1, bobSpeed:1, bobAmplitude:0.08, rotSpeed:0.5, rotAmplitude:0.4 },
    { id:"energetic", name:"Енергійний", unlockLevel:3, bobSpeed:1.8, bobAmplitude:0.12, rotSpeed:1, rotAmplitude:0.6 },
    { id:"bouncy", name:"Стрибучий", unlockLevel:6, bobSpeed:2.5, bobAmplitude:0.18, rotSpeed:0.6, rotAmplitude:0.3 },
    { id:"dance", name:"Танцювальний", unlockLevel:9, bobSpeed:1.2, bobAmplitude:0.1, rotSpeed:1.5, rotAmplitude:0.8 },
    { id:"hyper", name:"Гіперактивний", unlockLevel:13, bobSpeed:3, bobAmplitude:0.15, rotSpeed:2.2, rotAmplitude:1.0 }
];

let jarvisMovementId = localStorage.getItem("jarvisMovement") || "classic";

function getCurrentMovement(){

    return jarvisMovements.find(m=>m.id===jarvisMovementId) || jarvisMovements[1];

}

function getJarvisSize(){

    return window.innerWidth >= 900 ? 88 : 52;

}

function initJarvis3D(){

    const canvas = document.getElementById("jarvis3dCanvas");

    if(!canvas || typeof THREE === "undefined") return;

    const size = getJarvisSize();

    jarvisRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    jarvisRenderer.setSize(size, size);
    jarvisRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    jarvisScene = new THREE.Scene();

    jarvisCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    jarvisCamera.position.set(0, 0, 5);

    const ambient = new THREE.AmbientLight(0xffffff, 0.8);
    jarvisScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 3, 4);
    jarvisScene.add(dirLight);

    // Тіло — жовта капсула
    const bodyGeo = new THREE.CapsuleGeometry(0.62, 0.7, 8, 16);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffd93d, metalness: 0.05, roughness: 0.55 });
    jarvisBody = new THREE.Mesh(bodyGeo, bodyMat);
    jarvisScene.add(jarvisBody);

    // Білок ока
    const eyeWhiteGeo = new THREE.SphereGeometry(0.4, 20, 20);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    jarvisEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyeWhiteMat);
    jarvisEyeWhite.position.set(0, 0.28, 0.55);
    jarvisBody.add(jarvisEyeWhite);

    // Зіниця (реагує на настрій)
    const pupilGeo = new THREE.SphereGeometry(0.17, 16, 16);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, emissive: 0x0f172a, emissiveIntensity: 0.3 });
    jarvisEye = new THREE.Mesh(pupilGeo, pupilMat);
    jarvisEye.position.set(0, 0, 0.32);
    jarvisEyeWhite.add(jarvisEye);

    // Блиск в оці для милоти
    const highlightGeo = new THREE.SphereGeometry(0.05, 8, 8);
    const highlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const highlight = new THREE.Mesh(highlightGeo, highlightMat);
    highlight.position.set(0.06, 0.08, 0.4);
    jarvisEyeWhite.add(highlight);

    // Окуляри — оправа навколо ока
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });

    const glassesRingGeo = new THREE.TorusGeometry(0.4, 0.045, 8, 24);
    const glassesRing = new THREE.Mesh(glassesRingGeo, glassesMat);
    glassesRing.position.set(0, 0, 0.08);
    jarvisEyeWhite.add(glassesRing);

    const templeGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 6);

    const templeL = new THREE.Mesh(templeGeo, glassesMat);
    templeL.position.set(-0.42, 0, -0.12);
    templeL.rotation.z = Math.PI/2;
    jarvisEyeWhite.add(templeL);

    const templeR = new THREE.Mesh(templeGeo, glassesMat);
    templeR.position.set(0.42, 0, -0.12);
    templeR.rotation.z = Math.PI/2;
    jarvisEyeWhite.add(templeR);

    // Усмішка
    const mouthGeo = new THREE.TorusGeometry(0.26, 0.035, 8, 16, Math.PI*0.75);
    const mouthMat = new THREE.MeshStandardMaterial({ color: 0x92400e });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, -0.28, 0.5);
    mouth.rotation.set(0.3, 0, Math.PI*1.12);
    jarvisBody.add(mouth);

    // Маленькі ручки
    const armGeo = new THREE.CapsuleGeometry(0.08, 0.3, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffd93d });

    jarvisArmL = new THREE.Mesh(armGeo, armMat);
    jarvisArmL.position.set(-0.62, -0.05, 0);
    jarvisArmL.rotation.z = Math.PI/2.3;
    jarvisBody.add(jarvisArmL);

    jarvisArmR = new THREE.Mesh(armGeo, armMat.clone());
    jarvisArmR.position.set(0.62, -0.05, 0);
    jarvisArmR.rotation.z = -Math.PI/2.3;
    jarvisBody.add(jarvisArmR);

    updateJarvis3DMood();
    updateJarvis3DAccessory();
    applyJarvisSkin();

    animateJarvis3D();

    window.addEventListener("resize", ()=>{

        if(!jarvisRenderer) return;

        const newSize = getJarvisSize();

        jarvisRenderer.setSize(newSize, newSize);

    });

}

function animateJarvis3D(){

    requestAnimationFrame(animateJarvis3D);

    if(!jarvisScene || !jarvisRenderer) return;

    jarvisClock += 0.02;

    if(jarvisSpinBoost > 0){

        jarvisSpinBoost -= 0.05;

    }

    if(jarvisBody){

        const m = getCurrentMovement();

        jarvisBody.rotation.y = Math.sin(jarvisClock*m.rotSpeed)*m.rotAmplitude + jarvisSpinBoost*10;
        jarvisBody.position.y = Math.sin(jarvisClock*m.bobSpeed)*m.bobAmplitude;

    }

    if(jarvisAccessory){

        jarvisAccessory.rotation.z += 0.01;

    }

    jarvisRenderer.render(jarvisScene, jarvisCamera);

}

function jarvisTapSpin(){

    jarvisSpinBoost = 1;

}

function updateJarvis3DMood(){

    if(!jarvisEye || !jarvisEyeWhite) return;

    const mood = typeof getCompanionMoodClass === "function" ? getCompanionMoodClass() : "";

    if(mood === "mood-happy"){

        jarvisEye.material.emissive.set(0xfacc15);
        jarvisEye.material.emissiveIntensity = 0.8;
        jarvisEyeWhite.scale.set(1,1,1);

    }else if(mood === "mood-sleepy"){

        jarvisEye.material.emissive.set(0x475569);
        jarvisEye.material.emissiveIntensity = 0.2;
        jarvisEyeWhite.scale.set(1,0.4,1);

    }else{

        jarvisEye.material.emissive.set(0x0f172a);
        jarvisEye.material.emissiveIntensity = 0.3;
        jarvisEyeWhite.scale.set(1,1,1);

    }

}

function updateJarvis3DAccessory(){

    if(!jarvisScene) return;

    if(jarvisAccessory){

        jarvisScene.remove(jarvisAccessory);
        jarvisAccessory = null;

    }

    const lvl = typeof level !== "undefined" ? level : 1;

    if(lvl>=11){

        const crownGroup = new THREE.Group();

        const crownMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.3 });

        const baseGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
        const base = new THREE.Mesh(baseGeo, crownMat);
        base.rotation.x = Math.PI/2;
        crownGroup.add(base);

        const spikeCount = 5;
        const spikeGeo = new THREE.ConeGeometry(0.08, 0.22, 6);

        for(let i=0;i<spikeCount;i++){

            const angle = (i/spikeCount)*Math.PI*2;
            const spike = new THREE.Mesh(spikeGeo, crownMat);

            spike.position.set(Math.cos(angle)*0.35, 0.11, Math.sin(angle)*0.35);

            crownGroup.add(spike);

        }

        crownGroup.position.set(0, 1.0, 0);

        jarvisAccessory = crownGroup;
        jarvisScene.add(jarvisAccessory);

    }else if(lvl>=6){

        const ringGeo = new THREE.TorusGeometry(1.1, 0.05, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.4 });
        jarvisAccessory = new THREE.Mesh(ringGeo, ringMat);
        jarvisAccessory.rotation.x = Math.PI/2.2;
        jarvisScene.add(jarvisAccessory);

    }else if(lvl>=3){

        const ringGeo = new THREE.TorusGeometry(0.95, 0.04, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.3 });
        jarvisAccessory = new THREE.Mesh(ringGeo, ringMat);
        jarvisAccessory.rotation.x = Math.PI/2.2;
        jarvisScene.add(jarvisAccessory);

    }

}

function applyJarvisSkin(){

    if(!jarvisBody) return;

    const skin = jarvisSkins.find(s=>s.id===jarvisSkinId) || jarvisSkins[0];

    jarvisBody.material.color.setHex(skin.color);

    if(jarvisArmL) jarvisArmL.material.color.setHex(skin.color);
    if(jarvisArmR) jarvisArmR.material.color.setHex(skin.color);

}

function selectJarvisSkin(id){

    const skin = jarvisSkins.find(s=>s.id===id);

    if(!skin) return;

    const lvl = typeof level !== "undefined" ? level : 1;

    if(lvl < skin.unlockLevel){

        showToast("🔒 Розблокується на рівні "+skin.unlockLevel);

        return;

    }

    jarvisSkinId = id;

    localStorage.setItem("jarvisSkin", id);

    applyJarvisSkin();

    renderJarvisSkinPicker();

    showToast("✨ Скін застосовано: "+skin.name);

}

function renderJarvisSkinPicker(){

    const container = document.getElementById("jarvisSkinPicker");

    if(!container) return;

    container.innerHTML = "";

    const lvl = typeof level !== "undefined" ? level : 1;

    jarvisSkins.forEach(skin=>{

        const unlocked = lvl >= skin.unlockLevel;

        const div = document.createElement("div");

        div.className = "skin-swatch" + (skin.id===jarvisSkinId ? " active" : "") + (unlocked ? "" : " locked");
        div.style.background = "#"+skin.color.toString(16).padStart(6,"0");

        if(unlocked){

            div.innerText = skin.id===jarvisSkinId ? "✓" : "";
            div.onclick = ()=> selectJarvisSkin(skin.id);
            div.title = skin.name;

        }else{

            div.innerText = "🔒";
            div.title = skin.name+" — рівень "+skin.unlockLevel;

        }

        container.appendChild(div);

    });

}

function selectJarvisMovement(id){

    const m = jarvisMovements.find(x=>x.id===id);

    if(!m) return;

    const lvl = typeof level !== "undefined" ? level : 1;

    if(lvl < m.unlockLevel){

        showToast("🔒 Розблокується на рівні "+m.unlockLevel);

        return;

    }

    jarvisMovementId = id;

    localStorage.setItem("jarvisMovement", id);

    renderJarvisMovementPicker();

    showToast("💃 Рух змінено: "+m.name);

}

function renderJarvisMovementPicker(){

    const container = document.getElementById("jarvisMovementPicker");

    if(!container) return;

    container.innerHTML = "";

    const lvl = typeof level !== "undefined" ? level : 1;

    jarvisMovements.forEach(m=>{

        const unlocked = lvl >= m.unlockLevel;

        const chip = document.createElement("div");

        chip.className = "movement-chip" + (m.id===jarvisMovementId ? " active" : "") + (unlocked ? "" : " locked");

        if(unlocked){

            chip.innerText = m.name;
            chip.onclick = ()=> selectJarvisMovement(m.id);

        }else{

            chip.innerText = "🔒 "+m.name;
            chip.title = "Рівень "+m.unlockLevel;

        }

        container.appendChild(chip);

    });

}

try{

    if(document.readyState === "loading"){

        document.addEventListener("DOMContentLoaded", initJarvis3D);

    }else{

        initJarvis3D();

    }

}catch(e){

    console.error("Jarvis 3D init:", e);

}

try{

    if(document.readyState === "loading"){

        document.addEventListener("DOMContentLoaded", renderJarvisSkinPicker);

    }else{

        renderJarvisSkinPicker();

    }

}catch(e){

    console.error("Jarvis skin picker init:", e);

}

try{

    if(document.readyState === "loading"){

        document.addEventListener("DOMContentLoaded", renderJarvisMovementPicker);

    }else{

        renderJarvisMovementPicker();

    }

}catch(e){

    console.error("Jarvis movement picker init:", e);

}
