// ----------------
// Джарвіз — 3D-компаньйон (Three.js)
// Оригінальний персонаж: жовтий капсуловидний помічник з великим оком та окулярами
// ----------------

let jarvisScene, jarvisCamera, jarvisRenderer;
let jarvisBody, jarvisEye, jarvisEyeWhite;
let jarvisArmL, jarvisArmR;
let jarvisLegL, jarvisLegR;
let jarvisEyeBaseScaleY = 1;
let jarvisAccessory = null;
let jarvisAccessoryType = null;
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
    const armGeo = new THREE.CapsuleGeometry(0.105, 0.34, 4, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0xffd93d });

    jarvisArmL = new THREE.Mesh(armGeo, armMat);
    jarvisArmL.position.set(-0.62, -0.05, 0);
    jarvisArmL.rotation.z = Math.PI/2.3;
    jarvisBody.add(jarvisArmL);

    jarvisArmR = new THREE.Mesh(armGeo, armMat.clone());
    jarvisArmR.position.set(0.62, -0.05, 0);
    jarvisArmR.rotation.z = -Math.PI/2.3;
    jarvisBody.add(jarvisArmR);

    // Маленькі ніжки
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.22, 4, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0xffd93d });

    jarvisLegL = new THREE.Mesh(legGeo, legMat);
    jarvisLegL.position.set(-0.22, -0.92, 0);
    jarvisBody.add(jarvisLegL);

    jarvisLegR = new THREE.Mesh(legGeo, legMat.clone());
    jarvisLegR.position.set(0.22, -0.92, 0);
    jarvisBody.add(jarvisLegR);

    updateJarvis3DMood();
    updateJarvis3DAccessory();
    applyJarvisSkin();
    applyJarvisCostume();

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

    const m = getCurrentMovement();

    if(jarvisBody){

        jarvisBody.rotation.y = Math.sin(jarvisClock*m.rotSpeed)*m.rotAmplitude + jarvisSpinBoost*10;
        jarvisBody.position.y = Math.sin(jarvisClock*m.bobSpeed)*m.bobAmplitude;

    }

    if(jarvisArmL && jarvisArmR){

        const armSwing = Math.sin(jarvisClock*m.rotSpeed*1.6) * (0.18 + m.rotAmplitude*0.35);

        jarvisArmL.rotation.z = Math.PI/2.3 + armSwing;
        jarvisArmR.rotation.z = -Math.PI/2.3 - armSwing;

    }

    if(jarvisLegL && jarvisLegR){

        const legSwing = Math.sin(jarvisClock*m.rotSpeed*1.6) * (0.1 + m.rotAmplitude*0.2);

        jarvisLegL.rotation.x = legSwing;
        jarvisLegR.rotation.x = -legSwing;

    }

    if(jarvisEyeWhite){

        const blinkCycle = jarvisClock % 4.5;

        if(blinkCycle > 4.3){

            const blinkProgress = (blinkCycle-4.3)/0.2;
            const blinkScale = Math.abs(Math.sin(blinkProgress*Math.PI));

            jarvisEyeWhite.scale.y = jarvisEyeBaseScaleY * (1 - blinkScale*0.85);

        }else{

            jarvisEyeWhite.scale.y = jarvisEyeBaseScaleY;

        }

    }

    if(jarvisAccessory){

        if(jarvisAccessoryType === "crown"){

            jarvisAccessory.rotation.y += 0.012;

        }else{

            jarvisAccessory.rotation.z += 0.01;

        }

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
        jarvisEyeBaseScaleY = 1;

    }else if(mood === "mood-sleepy"){

        jarvisEye.material.emissive.set(0x475569);
        jarvisEye.material.emissiveIntensity = 0.2;
        jarvisEyeBaseScaleY = 0.4;

    }else{

        jarvisEye.material.emissive.set(0x0f172a);
        jarvisEye.material.emissiveIntensity = 0.3;
        jarvisEyeBaseScaleY = 1;

    }

}

function updateJarvis3DAccessory(){

    if(!jarvisScene) return;

    if(jarvisAccessory){

        jarvisBody.remove(jarvisAccessory);
        jarvisAccessory = null;
        jarvisAccessoryType = null;

    }

    if(typeof jarvisCostumeId !== "undefined" && jarvisCostumeId !== "none") return;

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
        jarvisAccessoryType = "crown";
        jarvisBody.add(jarvisAccessory);

    }else if(lvl>=6){

        const ringGeo = new THREE.TorusGeometry(1.1, 0.05, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x8b5cf6, emissiveIntensity: 0.4 });
        jarvisAccessory = new THREE.Mesh(ringGeo, ringMat);
        jarvisAccessory.rotation.x = Math.PI/2.2;
        jarvisAccessoryType = "ring";
        jarvisBody.add(jarvisAccessory);

    }else if(lvl>=3){

        const ringGeo = new THREE.TorusGeometry(0.95, 0.04, 8, 32);
        const ringMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0.3 });
        jarvisAccessory = new THREE.Mesh(ringGeo, ringMat);
        jarvisAccessory.rotation.x = Math.PI/2.2;
        jarvisAccessoryType = "ring";
        jarvisBody.add(jarvisAccessory);

    }

}

function applyJarvisSkin(){

    if(!jarvisBody) return;

    const skin = jarvisSkins.find(s=>s.id===jarvisSkinId) || jarvisSkins[0];

    jarvisBody.material.color.setHex(skin.color);

    if(jarvisArmL) jarvisArmL.material.color.setHex(skin.color);
    if(jarvisArmR) jarvisArmR.material.color.setHex(skin.color);
    if(jarvisLegL) jarvisLegL.material.color.setHex(skin.color);
    if(jarvisLegR) jarvisLegR.material.color.setHex(skin.color);

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

// ----------------
// Костюми — окремо від кольорів
// ----------------

const jarvisCostumes = [
    { id:"none", name:"Без костюма", unlockLevel:1 },
    { id:"pirate", name:"🏴‍☠️ Пірат", unlockLevel:5 },
    { id:"dog", name:"🐶 Песик", unlockLevel:8 },
    { id:"cat", name:"🐱 Котик", unlockLevel:12 },
    { id:"robot", name:"🤖 Робот", unlockLevel:16 },
    { id:"viking", name:"🪓 Вікінг", unlockLevel:20 },
    { id:"tuxedo", name:"🎩 Смокінг", unlockLevel:25 }
];

let jarvisCostumeId = localStorage.getItem("jarvisCostume") || "none";
let jarvisCostumeGroup = null;

// Замість пласкої коробки, приліпленої до круглого тіла, збираю "одяг"
// з кількох вигнутих по колу панелей — так костюм реально облягає фігурку,
// а не висить спереду як дощечка.
function buildTorsoWrap(mat, yPos, height, segments, archRad, radius){

    const group = new THREE.Group();

    segments = segments || 9;
    archRad = archRad || Math.PI*1.3;
    radius = radius || 0.6;

    const segAngle = archRad/segments;
    const segWidth = 2*radius*Math.tan(segAngle/2)*1.18;
    const depth = 0.12;

    for(let i=0;i<segments;i++){

        const angle = -archRad/2 + segAngle*(i+0.5);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(segWidth, height, depth), mat);

        panel.position.set(Math.sin(angle)*radius, yPos, Math.cos(angle)*radius);
        panel.rotation.y = angle;

        group.add(panel);

    }

    return group;

}

function buildPirateCostume(){

    const body = new THREE.Group();

    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    const hatGroup = new THREE.Group();

    const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.7, 0.06, 20), hatMat);
    hatBrim.position.set(0, 0, 0);
    hatGroup.add(hatBrim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.46, 0.3, 16), hatMat);
    hatCrown.position.set(0, 0.17, -0.05);
    hatGroup.add(hatCrown);

    const hatTop = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8, 0, Math.PI*2, 0, Math.PI/2), hatMat);
    hatTop.position.set(0, 0.32, -0.05);
    hatGroup.add(hatTop);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0 }));
    skull.position.set(0, 0.1, 0.36);
    hatGroup.add(skull);

    hatGroup.position.set(0, 0.68, 0);
    hatGroup.rotation.z = -0.18;
    hatGroup.rotation.x = 0.1;

    body.add(hatGroup);

    const coatMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.6 });
    body.add(buildTorsoWrap(coatMat, -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const emblemMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });

    const skullMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });

    // Уся емблема в одній групі, чітко винесеній ПЕРЕД поверхнею камзола
    // (панелі камзола сягають z≈0.66 — група стоїть на z=0.8, з запасом).
    const emblemGroup = new THREE.Group();
    emblemGroup.position.set(0, -0.22, 0.8);
    body.add(emblemGroup);

    // Кістки навхрест — позаду черепа в межах групи, але все одно
    // попереду камзола
    const boneGeo = new THREE.CylinderGeometry(0.038, 0.038, 0.62, 6);
    const knobGeo = new THREE.SphereGeometry(0.06, 8, 8);

    [Math.PI/4, -Math.PI/4].forEach(function(rot){

        const bone = new THREE.Mesh(boneGeo, emblemMat);
        bone.position.set(0, 0, -0.08);
        bone.rotation.z = rot;
        emblemGroup.add(bone);

        [-0.31, 0.31].forEach(function(off){

            const knob = new THREE.Mesh(knobGeo, emblemMat);
            knob.position.set(Math.sin(rot)*off, Math.cos(rot)*off, -0.08);
            emblemGroup.add(knob);

        });

    });

    // Витягнута голово подібна форма черепа (не куля)
    const skullBadge = new THREE.Mesh(new THREE.SphereGeometry(0.21, 14, 12), skullMat);
    skullBadge.scale.set(1, 1.1, 0.6);
    emblemGroup.add(skullBadge);

    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), skullMat);
    jaw.position.set(0, -0.17, -0.03);
    jaw.scale.set(0.8, 0.45, 0.55);
    emblemGroup.add(jaw);

    // Великі очниці
    [-0.09, 0.09].forEach(function(x){

        const socket = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), darkMat);
        socket.position.set(x, 0.04, 0.09);
        socket.scale.set(1, 1, 0.5);
        emblemGroup.add(socket);

    });

    // Прорізаний (плаский, врізаний) ніс — трикутна щілина, не випинається
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 3), darkMat);
    nose.rotation.x = Math.PI/2;
    nose.rotation.z = Math.PI;
    nose.scale.set(1, 1, 0.3);
    nose.position.set(0, -0.05, 0.1);
    emblemGroup.add(nose);

    // Зуби — одна темна щілина-смужка замість окремих зубців
    const teeth = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.05), darkMat);
    teeth.position.set(0, -0.17, 0.08);
    emblemGroup.add(teeth);

    const buttonMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });

    [[-0.15,-0.15],[-0.15,-0.4],[0.15,-0.15],[0.15,-0.4]].forEach(function(p){

        const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), buttonMat);
        b.position.set(p[0], p[1], 0.58);
        body.add(b);

    });

    const armR = new THREE.Group();

    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.04, 1.12, 8), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.2 }));
    blade.position.set(0, 0.84, 0);
    armR.add(blade);

    const guard = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.4, 6), buttonMat);
    guard.position.set(0, 0.3, 0);
    guard.rotation.z = Math.PI/2;
    armR.add(guard);

    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.24, 0.11), new THREE.MeshStandardMaterial({ color: 0x78350f }));
    hilt.position.set(0, 0.16, 0);
    armR.add(hilt);

    const armL = new THREE.Group();

    const hookMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });

    const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    cuff.position.set(0, 0.09, 0);
    armL.add(cuff);

    const hookShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.24, 8), hookMat);
    hookShaft.position.set(0, 0.28, 0);
    armL.add(hookShaft);

    const hookCurve = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.04, 8, 14, Math.PI*1.2), hookMat);
    hookCurve.position.set(0, 0.46, 0);
    hookCurve.rotation.z = Math.PI*0.08;
    armL.add(hookCurve);

    return { body: body, armL: armL, armR: armR };

}

function buildDogCostume(){

    const body = new THREE.Group();

    const earMat = new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.7 });

    [-1, 1].forEach(function(side){

        const ear = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), earMat);
        ear.scale.set(0.5, 1.3, 0.4);
        ear.position.set(side*0.55, 0.55, 0.05);
        ear.rotation.z = side*0.4;
        body.add(ear);

    });

    const topknotMat = new THREE.MeshStandardMaterial({ color: 0xc2884f, roughness: 0.7 });

    [0, 1, 2].forEach(function(i){

        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.09-i*0.015, 8, 8), topknotMat);
        puff.position.set(i*0.03, 0.85+i*0.09, 0.05-i*0.05);
        body.add(puff);

    });

    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), new THREE.MeshStandardMaterial({ color: 0x84cc16 }));
    tie.position.set(0, 0.78, 0.1);
    tie.rotation.x = Math.PI/2;
    body.add(tie);

    body.add(buildTorsoWrap(new THREE.MeshStandardMaterial({ color: 0x38bdf8 }), -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff7ed }));
    patch.scale.set(1, 1.1, 0.25);
    patch.position.set(0, -0.35, 0.58);
    body.add(patch);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    collar.position.set(0, -0.02, 0);
    collar.rotation.x = Math.PI/2;
    body.add(collar);

    const tag = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 }));
    tag.position.set(0, -0.15, 0.42);
    body.add(tag);

    const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.03), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
    tongue.position.set(0, -0.15, 0.62);
    tongue.rotation.x = -0.3;
    body.add(tongue);

    const armR = new THREE.Group();

    [-0.06, 0.06].forEach(function(x){

        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
        knob.position.set(x, 0.15, 0);
        armR.add(knob);

    });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xfef3c7 }));
    shaft.position.set(0, 0.15, 0);
    shaft.rotation.z = Math.PI/2;
    armR.add(shaft);

    return { body: body, armR: armR };

}

function buildCatCostume(){

    const body = new THREE.Group();

    const earOuterMat = new THREE.MeshStandardMaterial({ color: 0xf5c518 });
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xfda4af });

    [-1, 1].forEach(function(side){

        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 4), earOuterMat);
        outer.position.set(side*0.32, 0.78, 0);
        outer.rotation.y = Math.PI/4;
        body.add(outer);

        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), earInnerMat);
        inner.position.set(side*0.32, 0.75, 0.08);
        inner.rotation.y = Math.PI/4;
        body.add(inner);

    });

    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.05, 4), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
    nose.position.set(0, 0.02, 0.6);
    nose.rotation.x = Math.PI/2;
    body.add(nose);

    const whiskerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });

    [-1, 1].forEach(function(side){

        for(let i=0;i<3;i++){

            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.28, 4), whiskerMat);
            w.position.set(side*0.55, 0.1-i*0.05, 0.45);
            w.rotation.z = Math.PI/2;
            body.add(w);

        }

    });

    body.add(buildTorsoWrap(new THREE.MeshStandardMaterial({ color: 0xfb923c }), -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff7ed }));
    patch.scale.set(1, 1.1, 0.25);
    patch.position.set(0, -0.35, 0.58);
    body.add(patch);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.55, 8), new THREE.MeshStandardMaterial({ color: 0xffd93d }));
    tail.position.set(0.55, -0.5, -0.3);
    tail.rotation.z = Math.PI/3;
    tail.rotation.x = -Math.PI/6;
    body.add(tail);

    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
    tailTip.position.set(0.8, -0.25, -0.5);
    body.add(tailTip);

    const armR = new THREE.Group();

    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fishBody.scale.set(1.6, 0.7, 0.7);
    fishBody.position.set(0.1, 0.15, 0);
    armR.add(fishBody);

    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fishTail.position.set(0.25, 0.15, 0);
    fishTail.rotation.z = -Math.PI/2;
    armR.add(fishTail);

    return { body: body, armR: armR };

}

function buildRobotCostume(){

    const body = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.7, roughness: 0.3 });
    const glowMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x22d3ee, emissiveIntensity: 0.8 });

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.66, 16, 16), metalMat);
    helmet.position.set(0, 0.3, 0);
    helmet.scale.set(1, 1.15, 1);
    body.add(helmet);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), glowMat);
    visor.position.set(0, 0.28, 0.63);
    body.add(visor);

    [-1, 1].forEach(function(side){

        const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.22), darkMetalMat);
        pauldron.position.set(side*0.68, 0.05, 0);
        body.add(pauldron);

    });

    body.add(buildTorsoWrap(metalMat, -0.35, 0.66, 9, Math.PI*1.3, 0.6));

    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 20), darkMetalMat);
    coreRing.position.set(0, -0.35, 0.58);
    body.add(coreRing);

    const coreGlow = new THREE.Mesh(new THREE.CircleGeometry(0.1, 16), glowMat);
    coreGlow.position.set(0, -0.35, 0.585);
    body.add(coreGlow);

    const armL = new THREE.Group();
    const gauntletL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), darkMetalMat);
    gauntletL.position.set(0, 0.15, 0);
    armL.add(gauntletL);

    const armR = new THREE.Group();
    const gauntletR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), darkMetalMat);
    gauntletR.position.set(0, 0.15, 0);
    armR.add(gauntletR);

    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), glowMat);
    orb.position.set(0, 0.3, 0);
    armR.add(orb);

    return { body: body, armL: armL, armR: armR, hideEye: true };

}

function buildVikingCostume(){

    const body = new THREE.Group();

    const metalMat = new THREE.MeshStandardMaterial({ color: 0x78716c, metalness: 0.5, roughness: 0.5 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 14, 0, Math.PI*2, 0, Math.PI*0.55), metalMat);
    helmet.position.set(0, 0.55, 0);
    body.add(helmet);

    [-1, 1].forEach(function(side){

        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.3, 8), hornMat);
        horn.position.set(side*0.38, 0.8, 0.04);
        horn.rotation.z = side*0.45;
        horn.rotation.x = -0.15;
        body.add(horn);

    });

    [-1, 1].forEach(function(side){

        const fur = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf5f5f4 }));
        fur.position.set(side*0.65, 0.08, 0);
        body.add(fur);

    });

    body.add(buildTorsoWrap(leatherMat, -0.35, 0.66, 9, Math.PI*1.3, 0.6));

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.04), goldMat);
    buckle.position.set(0, -0.35, 0.58);
    body.add(buckle);

    const beard = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), new THREE.MeshStandardMaterial({ color: 0x8a5a2b }));
    beard.scale.set(0.85, 1.1, 0.55);
    beard.position.set(0, -0.15, 0.4);
    body.add(beard);

    const armL = new THREE.Group();
    const shieldFace = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), leatherMat);
    shieldFace.position.set(0, 0.15, 0);
    shieldFace.rotation.x = Math.PI/2;
    armL.add(shieldFace);

    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), goldMat);
    boss.position.set(0, 0.15, 0.03);
    armL.add(boss);

    const armR = new THREE.Group();
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.3, 8), leatherMat);
    handle.position.set(0, 0.25, 0);
    armR.add(handle);

    const axeHead = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.15, 4), metalMat);
    axeHead.position.set(0.07, 0.38, 0);
    axeHead.rotation.z = Math.PI/2;
    axeHead.scale.set(1, 0.5, 1);
    armR.add(axeHead);

    return { body: body, armL: armL, armR: armR };

}

function buildTuxedoCostume(){

    const body = new THREE.Group();

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), blackMat);
    brim.position.set(0, 0.8, 0);
    body.add(brim);

    const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.45, 16), blackMat);
    hatCrown.position.set(0, 1.05, 0);
    body.add(hatCrown);

    body.add(buildTorsoWrap(blackMat, -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const shirt = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.24, 4), whiteMat);
    shirt.position.set(0, -0.05, 0.58);
    shirt.rotation.x = Math.PI;
    shirt.scale.set(1, 1, 0.3);
    body.add(shirt);

    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), blackMat);
    bow.position.set(0, -0.02, 0.6);
    body.add(bow);

    const armR = new THREE.Group();

    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 8), blackMat);
    cane.position.set(0, -0.15, 0);
    armR.add(cane);

    const handle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), goldMat);
    handle.position.set(0, 0.13, 0);
    armR.add(handle);

    return { body: body, armR: armR };

}

let jarvisCostumeArmL = null;
let jarvisCostumeArmR = null;

function applyJarvisCostume(){

    if(!jarvisBody) return;

    if(jarvisCostumeGroup){

        jarvisBody.remove(jarvisCostumeGroup);
        jarvisCostumeGroup = null;

    }

    if(jarvisCostumeArmL && jarvisArmL){

        jarvisArmL.remove(jarvisCostumeArmL);
        jarvisCostumeArmL = null;

    }

    if(jarvisCostumeArmR && jarvisArmR){

        jarvisArmR.remove(jarvisCostumeArmR);
        jarvisCostumeArmR = null;

    }

    if(jarvisEyeWhite) jarvisEyeWhite.visible = true;

    let parts = null;

    if(jarvisCostumeId === "pirate"){

        parts = buildPirateCostume();

    }else if(jarvisCostumeId === "dog"){

        parts = buildDogCostume();

    }else if(jarvisCostumeId === "cat"){

        parts = buildCatCostume();

    }else if(jarvisCostumeId === "robot"){

        parts = buildRobotCostume();

    }else if(jarvisCostumeId === "viking"){

        parts = buildVikingCostume();

    }else if(jarvisCostumeId === "tuxedo"){

        parts = buildTuxedoCostume();

    }

    if(!parts){

        updateJarvis3DAccessory();
        return;

    }

    if(parts.body){

        jarvisCostumeGroup = parts.body;
        jarvisBody.add(jarvisCostumeGroup);

    }

    if(parts.armL && jarvisArmL){

        jarvisCostumeArmL = parts.armL;
        jarvisArmL.add(jarvisCostumeArmL);

    }

    if(parts.armR && jarvisArmR){

        jarvisCostumeArmR = parts.armR;
        jarvisArmR.add(jarvisCostumeArmR);

    }

    if(parts.hideEye && jarvisEyeWhite) jarvisEyeWhite.visible = false;

    updateJarvis3DAccessory();

}

function selectJarvisCostume(id){

    const costume = jarvisCostumes.find(c=>c.id===id);

    if(!costume) return;

    const lvl = typeof level !== "undefined" ? level : 1;

    if(lvl < costume.unlockLevel){

        showToast("🔒 Розблокується на рівні "+costume.unlockLevel);

        return;

    }

    jarvisCostumeId = id;

    localStorage.setItem("jarvisCostume", id);

    applyJarvisCostume();

    renderJarvisCostumePicker();

    showToast("🎭 Костюм змінено: "+costume.name);

}

function renderJarvisCostumePicker(){

    const container = document.getElementById("jarvisCostumePicker");

    if(!container) return;

    container.innerHTML = "";

    const lvl = typeof level !== "undefined" ? level : 1;

    jarvisCostumes.forEach(costume=>{

        const unlocked = lvl >= costume.unlockLevel;

        const chip = document.createElement("div");

        chip.className = "movement-chip" + (costume.id===jarvisCostumeId ? " active" : "") + (unlocked ? "" : " locked");

        if(unlocked){

            chip.innerText = costume.name;
            chip.onclick = ()=> selectJarvisCostume(costume.id);

        }else{

            chip.innerText = "🔒 "+costume.name;
            chip.title = "Рівень "+costume.unlockLevel;

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

try{

    if(document.readyState === "loading"){

        document.addEventListener("DOMContentLoaded", renderJarvisCostumePicker);

    }else{

        renderJarvisCostumePicker();

    }

}catch(e){

    console.error("Jarvis costume picker init:", e);

}
