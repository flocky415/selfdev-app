// ----------------
// Джарвіз — 3D-компаньйон (Three.js)
// Оригінальний персонаж: жовтий капсуловидний помічник з великим оком та окулярами
// ----------------

let jarvisScene, jarvisCamera, jarvisRenderer;
let jarvisBody, jarvisEye, jarvisEyeWhite;
let jarvisArmL, jarvisArmR;
let jarvisLegL, jarvisLegR;
let jarvisEyeBaseScaleY = 1;
let jarvisEyeSizeFactor = 1;
let jarvisTailPivot = null;
let jarvisCostumeBlinkEyes = [];
let jarvisCostumeArmSwing = 1;
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

        const armSwing = Math.sin(jarvisClock*m.rotSpeed*1.6) * (0.18 + m.rotAmplitude*0.35) * jarvisCostumeArmSwing;

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

            jarvisEyeWhite.scale.y = jarvisEyeBaseScaleY * jarvisEyeSizeFactor * (1 - blinkScale*0.85);

        }else{

            jarvisEyeWhite.scale.y = jarvisEyeBaseScaleY * jarvisEyeSizeFactor;

        }

    }

    if(jarvisCostumeBlinkEyes.length){

        const bc = jarvisClock % 4.5;
        let blinkFactor = 1;

        if(bc > 4.3){

            blinkFactor = 1 - Math.abs(Math.sin(((bc-4.3)/0.2)*Math.PI))*0.85;

        }

        jarvisCostumeBlinkEyes.forEach(function(eye){

            eye.scale.y = jarvisEyeBaseScaleY * blinkFactor;

        });

    }

    if(jarvisTailPivot){

        const tailCfg = jarvisTailPivot.userData || {};
        const tailSpeed = tailCfg.speed || 12;
        const tailAmpZ = tailCfg.ampZ || 0.5;
        const tailAmpY = tailCfg.ampY || 0.35;

        const wag = Math.sin(jarvisClock*tailSpeed);

        jarvisTailPivot.rotation.z = wag*tailAmpZ;
        jarvisTailPivot.rotation.y = Math.sin(jarvisClock*tailSpeed+1.2)*tailAmpY;

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
    const earInnerMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.7 });
    const furMat = new THREE.MeshStandardMaterial({ color: 0xc2884f, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });

    // Великі стоячі трикутні вушка
    [-1, 1].forEach(function(side){

        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.68, 4), earMat);
        ear.position.set(side*0.4, 1.03, -0.02);
        ear.rotation.y = Math.PI/4;
        ear.rotation.z = -side*0.2;
        ear.scale.set(1, 1, 0.55);
        body.add(ear);

        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.46, 4), earInnerMat);
        inner.position.set(side*0.4, 0.99, 0.06);
        inner.rotation.y = Math.PI/4;
        inner.rotation.z = -side*0.2;
        inner.scale.set(1, 1, 0.4);
        body.add(inner);

    });

    // Два маленьких очка (не більші за ніс з язиком)
    const blinkEyes = [];

    [-1, 1].forEach(function(side){

        // Очі трохи заглиблені всередину, зіниці до центру, верхня повіка — спокійний погляд
        const eye = new THREE.Group();
        eye.position.set(side*0.17, 0.33, 0.572);
        eye.rotation.y = side*0.28;
        eye.scale.z = 0.55;

        const white = new THREE.Mesh(new THREE.SphereGeometry(0.078, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        eye.add(white);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 }));
        pupil.position.set(0, 0, 0.045);
        eye.add(pupil);

        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        shine.position.set(0.014, 0.016, 0.09);
        eye.add(shine);

        const lidMat = (typeof jarvisBody !== "undefined" && jarvisBody && jarvisBody.material) ? jarvisBody.material : new THREE.MeshStandardMaterial({ color: 0xc08a4a });
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.083, 12, 8, 0, Math.PI*2, 0, Math.PI*0.2), lidMat);
        lid.rotation.x = 0.15;
        eye.add(lid);

        body.add(eye);
        blinkEyes.push(eye);

    });

    // Комбінезон, що облягає тіло
    body.add(buildTorsoWrap(new THREE.MeshStandardMaterial({ color: 0x38bdf8 }), -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff7ed }));
    patch.scale.set(1, 1.1, 0.25);
    patch.position.set(0, -0.38, 0.65);
    body.add(patch);

    // Ошийник навколо шиї (видимий, зовні тіла) + жетон збоку
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.045, 8, 28), new THREE.MeshStandardMaterial({ color: 0xdc2626 }));
    collar.position.set(0, 0.0, 0);
    collar.rotation.x = Math.PI/2;
    body.add(collar);

    const tag = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 }));
    tag.position.set(0.24, -0.09, 0.66);
    tag.rotation.x = Math.PI/2;
    body.add(tag);

    // Світла морда
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), new THREE.MeshStandardMaterial({ color: 0xfde7c8, roughness: 0.8 }));
    muzzle.scale.set(1.15, 0.75, 0.6);
    muzzle.position.set(0, 0.03, 0.62);
    body.add(muzzle);

    // Собачий ніс
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), darkMat);
    nose.scale.set(1.3, 0.9, 1);
    nose.position.set(0, 0.1, 0.72);
    body.add(nose);

    const noseShine = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    noseShine.position.set(-0.035, 0.13, 0.8);
    body.add(noseShine);

    // Лінія рота
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 14, Math.PI), darkMat);
    mouth.position.set(0, 0.03, 0.71);
    mouth.rotation.z = Math.PI;
    body.add(mouth);

    // Язик
    const tongue = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf472b6 }));
    tongue.scale.set(0.9, 1.5, 0.35);
    tongue.position.set(0, -0.08, 0.7);
    tongue.rotation.x = -0.25;
    body.add(tongue);

    const tongueLine = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, 0.01), new THREE.MeshStandardMaterial({ color: 0xdb2777 }));
    tongueLine.position.set(0, -0.08, 0.735);
    body.add(tongueLine);

    // Хвіст на шарнірі — виляє (обертається навколо основи)
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.4, -0.52, -0.43);
    body.add(tailPivot);

    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.56, 10), furMat);
    tail.position.set(0.227, 0.153, -0.056);
    tail.rotation.z = -0.95;
    tail.rotation.x = -0.35;
    tailPivot.add(tail);

    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 10), new THREE.MeshStandardMaterial({ color: 0xfde7c8 }));
    tailTip.position.set(0.454, 0.305, -0.112);
    tailPivot.add(tailTip);

    // Кістка в лапі
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

    return { body: body, armR: armR, hideEye: true, blinkEyes: blinkEyes, tailPivot: tailPivot };

}

function buildCatCostume(){

    const body = new THREE.Group();

    // Шерсть = колір скіна Джарвіза, щоб вушка й хвіст збігалися з головою.
    // Тіло — капсула радіуса 0.62, тож передня поверхня обличчя на z≈0.6.
    const furMat = (typeof jarvisBody !== "undefined" && jarvisBody && jarvisBody.material)
        ? jarvisBody.material
        : new THREE.MeshStandardMaterial({ color: 0xffd93d });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.95 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.8 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });

    // Вушка: сплюснутий конус, рожева середина і пухнасті кремові пучки шерсті
    [-1, 1].forEach(function(side){

        const ear = new THREE.Group();
        ear.position.set(side*0.39, 0.8, 0);
        ear.rotation.z = -side*0.28;

        const outer = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.46, 4), furMat);
        outer.position.set(0, 0.23, 0);
        outer.scale.set(1, 1, 0.4);
        ear.add(outer);

        const inner = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), pinkMat);
        inner.position.set(0, 0.17, 0.04);
        inner.scale.set(1, 1, 0.5);
        ear.add(inner);

        [[-0.045, 0.05], [0.045, 0.05], [0, 0.1], [0, 0.17]].forEach(function(p){

            const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), creamMat);
            tuft.scale.set(1, 1.35, 0.8);
            tuft.position.set(p[0], p[1], 0.07);
            ear.add(tuft);

        });

        body.add(ear);

    });

    // Два ока: рознесені по боках, середнього розміру (не більші за решту обличчя)
    const blinkEyes = [];

    [-1, 1].forEach(function(side){

        const eye = new THREE.Group();
        eye.position.set(side*0.21, 0.38, 0.575);
        eye.rotation.y = side*0.34;
        eye.scale.z = 0.55;

        const white = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        eye.add(white);

        const iris = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), new THREE.MeshStandardMaterial({ color: 0x84cc16, roughness: 0.4 }));
        iris.position.set(0, 0, 0.06);
        eye.add(iris);

        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), darkMat);
        pupil.scale.set(0.38, 1.15, 0.6);
        pupil.position.set(0, 0, 0.115);
        eye.add(pupil);

        const shine = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        shine.position.set(0.035, 0.045, 0.138);
        eye.add(shine);

        body.add(eye);
        blinkEyes.push(eye);

    });

    // Носик — по центру між очима, нижче
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.4 }));
    nose.scale.set(1.2, 0.8, 0.7);
    nose.position.set(0, 0.23, 0.615);
    body.add(nose);

    // Ротик у формі "w": коротка лінія від носика і дві дужки
    const mouthLine = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.06, 6), darkMat);
    mouthLine.position.set(0, 0.16, 0.622);
    body.add(mouthLine);

    [-1, 1].forEach(function(side){

        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 6, 14, Math.PI), darkMat);
        arc.position.set(side*0.05, 0.13, 0.622);
        arc.rotation.z = Math.PI;
        body.add(arc);

    });

    // Вуса: по 3 з кожного боку, ростуть з щічок і відхиляються назад
    // уздовж кривизни тіла, тож не торкаються ні очей, ні ротика
    [-1, 1].forEach(function(side){

        [[0.23, 0.2], [0.19, 0], [0.15, -0.2]].forEach(function(cfg){

            const pivot = new THREE.Group();
            pivot.position.set(side*0.17, cfg[0], 0.6);
            pivot.rotation.set(0, side*0.35, side*cfg[1]);

            const w = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.32, 5), darkMat);
            w.rotation.z = Math.PI/2;
            w.position.set(side*0.16, 0, 0);
            pivot.add(w);

            body.add(pivot);

        });

    });

    body.add(buildTorsoWrap(new THREE.MeshStandardMaterial({ color: 0xfb923c }), -0.35, 0.68, 9, Math.PI*1.3, 0.6));

    const patch = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), new THREE.MeshStandardMaterial({ color: 0xfff7ed }));
    patch.scale.set(1, 1.1, 0.25);
    patch.position.set(0, -0.35, 0.62);
    body.add(patch);

    // Хвостик: плавна вигнута трубка на шарнірі, повільно погойдується збоку від тіла
    const tailPivot = new THREE.Group();
    tailPivot.position.set(0.26, -0.72, -0.28);
    tailPivot.userData = { speed: 2.4, ampZ: 0.35, ampY: 0.12 };
    body.add(tailPivot);

    const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.14, -0.04, -0.1),
        new THREE.Vector3(0.32, -0.02, -0.16),
        new THREE.Vector3(0.44, 0.12, -0.14),
        new THREE.Vector3(0.46, 0.3, -0.08)
    ]);

    tailPivot.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.05, 8, false), furMat));

    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 10), creamMat);
    tailTip.position.copy(tailCurve.getPoint(1));
    tailPivot.add(tailTip);

    const armR = new THREE.Group();

    const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fishBody.scale.set(1.6, 0.7, 0.7);
    fishBody.position.set(0.1, 0.15, 0);
    armR.add(fishBody);

    const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0x64748b }));
    fishTail.position.set(0.25, 0.15, 0);
    fishTail.rotation.z = -Math.PI/2;
    armR.add(fishTail);

    return { body: body, armR: armR, hideEye: true, blinkEyes: blinkEyes, tailPivot: tailPivot };

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

// Рог вікінга: ланцюжок усічених конусів уздовж кривої Без'є — плавно звужується до кінчика
function buildVikingHorn(side, hornMat, bandMat){

    const horn = new THREE.Group();

    const P0 = [0.47, 0.82], C1 = [0.93, 0.78], C2 = [1.02, 0.98], P3 = [0.92, 1.22];
    const steps = 14;
    const r0 = 0.085, r1 = 0.012;
    const pts = [];

    for(let i=0;i<=steps;i++){

        const t = i/steps, u = 1-t;
        const x = u*u*u*P0[0] + 3*u*u*t*C1[0] + 3*u*t*t*C2[0] + t*t*t*P3[0];
        const y = u*u*u*P0[1] + 3*u*u*t*C1[1] + 3*u*t*t*C2[1] + t*t*t*P3[1];
        pts.push(new THREE.Vector3(side*x, y, 0));

    }

    const up = new THREE.Vector3(0, 1, 0);

    for(let i=0;i<steps;i++){

        const a = pts[i], b = pts[i+1];
        const ra = r0 + (r1-r0)*(i/steps);
        const rb = r0 + (r1-r0)*((i+1)/steps);
        const dir = b.clone().sub(a);
        const len = dir.length();
        dir.normalize();

        const seg = new THREE.Mesh(new THREE.CylinderGeometry(rb, ra, len, 10), hornMat);
        seg.position.copy(a).add(b).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(up, dir);
        horn.add(seg);

        const joint = new THREE.Mesh(new THREE.SphereGeometry(ra, 10, 8), hornMat);
        joint.position.copy(a);
        horn.add(joint);

    }

    const tip = new THREE.Mesh(new THREE.SphereGeometry(r1, 8, 6), hornMat);
    tip.position.copy(pts[steps]);
    horn.add(tip);

    // золота обойма в основі рога
    const dir0 = pts[2].clone().sub(pts[1]).normalize();
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.022, 8, 20), bandMat);
    band.position.copy(pts[1]);
    band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir0);
    horn.add(band);

    return horn;

}

// Капсула між двома точками (для передпліччя, що тримає щит)
function buildVikingLimb(a, b, radius, mat){

    const dir = b.clone().sub(a);
    const len = dir.length();
    dir.normalize();

    const limb = new THREE.Mesh(new THREE.CapsuleGeometry(radius, Math.max(len - radius*2, 0.01), 6, 12), mat);
    limb.position.copy(a).add(b).multiplyScalar(0.5);
    limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

    return limb;

}

function buildVikingCostume(){

    const body = new THREE.Group();

    // Руки Джарвіза в спокої повернуті на ±REST. Піддерево "frame" гасить цей поворот,
    // тож координати щита й сокири нижче — звичайні, відносно плеча.
    const REST = Math.PI/2.3;

    const steelMat = new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.55, roughness: 0.4 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, metalness: 0.6, roughness: 0.45 });
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0xc3ccd6, metalness: 0.65, roughness: 0.3 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 0.6 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const darkLeatherMat = new THREE.MeshStandardMaterial({ color: 0x3f2410, roughness: 0.85 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.8 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.75 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.7 });
    const beardMat = new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.95 });
    const beardLightMat = new THREE.MeshStandardMaterial({ color: 0xa8713a, roughness: 0.95 });
    const skinMat = (typeof jarvisBody !== "undefined" && jarvisBody && jarvisBody.material)
        ? jarvisBody.material
        : new THREE.MeshStandardMaterial({ color: 0xffd93d });

    // ----- Шолом: купол над лобом, обідок і гребінь -----
    const helmet = new THREE.Group();
    helmet.name = "helmet";

    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.68, 28, 18, 0, Math.PI*2, 0, 1.08), steelMat);
    dome.position.set(0, 0.36, 0);
    helmet.add(dome);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 10, 44), goldMat);
    rim.position.set(0, 0.68, 0);
    rim.rotation.x = Math.PI/2;
    helmet.add(rim);

    const ridgeWrap = new THREE.Group();
    ridgeWrap.position.set(0, 0.36, 0);
    ridgeWrap.rotation.y = Math.PI/2;
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.025, 8, 36, Math.PI - 0.95), darkSteelMat);
    ridge.rotation.z = 0.475;
    ridgeWrap.add(ridge);
    helmet.add(ridgeWrap);

    body.add(helmet);

    // ----- Роги -----
    [-1, 1].forEach(function(side){

        const horn = buildVikingHorn(side, hornMat, goldMat);
        horn.name = side < 0 ? "hornL" : "hornR";
        body.add(horn);

    });

    // ----- Густа борода: основна маса, щоки, вуса і пасма донизу -----
    const beard = new THREE.Group();
    beard.name = "beard";

    const beardMain = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), beardMat);
    beardMain.scale.set(0.33, 0.3, 0.24);
    beardMain.position.set(0, -0.2, 0.53);
    beard.add(beardMain);

    const beardLow = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), beardMat);
    beardLow.scale.set(0.28, 0.13, 0.2);
    beardLow.position.set(0, -0.38, 0.52);
    beard.add(beardLow);

    [-1, 1].forEach(function(side){

        // щоки — зливаються з основною масою, а не стирчать окремими плямами
        const cheek = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), beardMat);
        cheek.scale.set(0.15, 0.2, 0.17);
        cheek.position.set(side*0.24, -0.1, 0.47);
        beard.add(cheek);

        const stache = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), beardLightMat);
        stache.scale.set(0.17, 0.06, 0.11);
        stache.position.set(side*0.13, -0.03, 0.7);
        stache.rotation.z = -side*0.3;
        beard.add(stache);

    });

    // пасма: [x, z, висота, радіус]
    [[-0.24, 0.55, 0.11, 0.065], [-0.16, 0.6, 0.14, 0.07], [-0.08, 0.64, 0.16, 0.075], [0, 0.66, 0.18, 0.08],
     [0.08, 0.64, 0.16, 0.075], [0.16, 0.6, 0.14, 0.07], [0.24, 0.55, 0.11, 0.065]].forEach(function(t, i){

        const tuft = new THREE.Mesh(new THREE.ConeGeometry(t[3], t[2], 10), i%2 ? beardLightMat : beardMat);
        tuft.rotation.x = Math.PI;
        tuft.position.set(t[0], -0.42 - t[2]/2, t[1]);
        beard.add(tuft);

    });

    body.add(beard);

    // ----- Пояс і шкіряна спідничка (нижче бороди, щоб не перетиналися) -----
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.575, 0.04, 8, 40), darkLeatherMat);
    belt.name = "belt";
    belt.position.set(0, -0.66, 0);
    belt.rotation.x = Math.PI/2;
    body.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.05), goldMat);
    buckle.name = "buckle";
    buckle.position.set(0, -0.66, 0.63);
    body.add(buckle);

    const skirt = buildTorsoWrap(leatherMat, -0.79, 0.22, 9, Math.PI*1.3, 0.58);
    skirt.name = "skirt";
    body.add(skirt);

    // ----- Ліва рука: великий круглий щит попереду, на передпліччі -----
    const armL = new THREE.Group();
    const frameL = new THREE.Group();
    frameL.name = "frameL";
    frameL.rotation.z = -REST;
    armL.add(frameL);

    frameL.add(buildVikingLimb(new THREE.Vector3(-0.2, 0.04, 0), new THREE.Vector3(-0.05, -0.45, 0.8), 0.09, skinMat));

    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), skinMat);
    elbow.position.set(-0.2, 0.04, 0);
    frameL.add(elbow);

    const shield = new THREE.Group();
    shield.name = "shield";
    shield.position.set(-0.06, -0.45, 0.84);

    const SR = 0.48;

    const shieldBase = new THREE.Mesh(new THREE.CylinderGeometry(SR, SR, 0.06, 40), woodMat);
    shieldBase.rotation.x = Math.PI/2;
    shield.add(shieldBase);

    const shieldPaint = new THREE.Mesh(new THREE.CylinderGeometry(SR*0.88, SR*0.88, 0.066, 40), redMat);
    shieldPaint.rotation.x = Math.PI/2;
    shield.add(shieldPaint);

    const shieldRim = new THREE.Mesh(new THREE.TorusGeometry(SR, 0.04, 10, 48), steelMat);
    shield.add(shieldRim);

    [0, Math.PI/4, Math.PI/2, Math.PI*0.75].forEach(function(a){

        const bar = new THREE.Mesh(new THREE.BoxGeometry(SR*1.6, 0.045, 0.02), creamMat);
        bar.position.z = 0.04;
        bar.rotation.z = a;
        shield.add(bar);

    });

    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), steelMat);
    boss.scale.set(1, 1, 0.6);
    boss.position.z = 0.06;
    shield.add(boss);

    frameL.add(shield);

    // ----- Права рука: велика сокира, тримає за держак збоку від тіла -----
    const armR = new THREE.Group();
    const frameR = new THREE.Group();
    frameR.name = "frameR";
    frameR.rotation.z = REST;
    armR.add(frameR);

    const axe = new THREE.Group();
    axe.name = "axe";
    axe.position.set(0.22, -0.05, 0);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.56, 10), leatherMat);
    axe.add(shaft);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.3, 10), darkLeatherMat);
    grip.position.y = 0.05;
    axe.add(grip);

    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), goldMat);
    pommel.position.y = -0.8;
    axe.add(pommel);

    [0.19, 0.78].forEach(function(y){

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 10), goldMat);
        collar.position.y = y;
        axe.add(collar);

    });

    // лезо — півмісяць: опукла дуга назовні, увігнута до держака (кінчики торкаються держака)
    const bladePts = [];
    const BSTEPS = 20;

    for(let i=0;i<=BSTEPS;i++){

        const a = Math.PI*i/BSTEPS;
        bladePts.push(new THREE.Vector2(0.52*Math.sin(a), 0.5 + 0.3*Math.cos(a)));

    }

    for(let i=BSTEPS-1;i>=1;i--){

        const a = Math.PI*i/BSTEPS;
        bladePts.push(new THREE.Vector2(0.27*Math.sin(a), 0.5 + 0.3*Math.cos(a)));

    }

    const bladeGroup = new THREE.Group();
    bladeGroup.position.set(0, 0, -0.025);

    const blade = new THREE.Mesh(new THREE.ExtrudeGeometry(new THREE.Shape(bladePts), { depth: 0.05, bevelEnabled: false }), edgeMat);
    bladeGroup.add(blade);

    [0.24, 0.76].forEach(function(y){

        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), goldMat);
        rivet.position.set(0.03, y, 0.05);
        bladeGroup.add(rivet);

    });

    axe.add(bladeGroup);
    frameR.add(axe);

    return { body: body, armL: armL, armR: armR, eyeScale: 0.5, eyeY: 0.38, armSwing: 0.25 };

}

// Золотий ланцюжок: тонкі циліндри між точками з кульками-вузликами в стиках
function buildTuxedoChain(points, radius, mat){

    const group = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);

    for(let i=0;i<points.length-1;i++){

        const a = points[i], b = points[i+1];
        const dir = b.clone().sub(a);
        const len = dir.length();
        dir.normalize();

        const seg = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 6), mat);
        seg.position.copy(a).add(b).multiplyScalar(0.5);
        seg.quaternion.setFromUnitVectors(up, dir);
        group.add(seg);

        const link = new THREE.Mesh(new THREE.SphereGeometry(radius*1.5, 8, 6), mat);
        link.position.copy(a);
        group.add(link);

    }

    return group;

}

// Оболонка, що точно повторює капсулу тіла Джарвіза (циліндр r=0.62 на y∈[-0.35, 0.35]
// і півсфери з центрами (0, ±0.35, 0)). Одяг із такої оболонки лягає по фігурі, а не
// стирчить пласкими дошками. Спереду (z+) можна залишити клин-розріз (gapHalf — пів-кут),
// а з gapOnly=true навпаки отримати лише цей клин (для сорочки в розрізі піджака).
// bandFrom/bandTo (рад) — вузька смуга біля краю розрізу (для лацканів).
function buildFittedShell(mat, R, yTop, yBottom, gapHalf, gapOnly, bandFrom, bandTo){

    const group = new THREE.Group();
    const SIDES = 48;
    const lowCyl = Math.max(yBottom, -0.35);

    // кути: [початок, довжина]
    let a0, aLen;

    if(bandFrom !== undefined){
        a0 = bandFrom; aLen = bandTo - bandFrom;
    }else if(gapOnly){
        a0 = -gapHalf; aLen = gapHalf*2;
    }else{
        a0 = gapHalf; aLen = Math.PI*2 - gapHalf*2;
    }

    if(yTop > -0.35){

        const h = yTop - lowCyl;
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(R, R, h, SIDES, 1, true, a0, aLen), mat);
        cyl.position.set(0, (yTop + lowCyl)/2, 0);
        group.add(cyl);

    }

    if(yBottom < -0.35){

        // у сфері фронт — phi = π/2, а в циліндрі — theta = 0; переводимо кути
        const thetaB = Math.acos(Math.max(-1, Math.min(1, (yBottom + 0.35)/R)));
        const sph = new THREE.Mesh(new THREE.SphereGeometry(R, SIDES, 20, Math.PI/2 + a0, aLen, Math.PI/2, thetaB - Math.PI/2), mat);
        sph.position.set(0, -0.35, 0);
        group.add(sph);

    }

    return group;

}

function buildTuxedoCostume(){

    const body = new THREE.Group();

    // Руки Джарвіза в спокої повернуті на ±REST. Піддерево "frame" гасить цей поворот,
    // тож координати тростини нижче — звичайні, відносно плеча.
    const REST = Math.PI/2.3;

    const blackMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const satinMat = new THREE.MeshStandardMaterial({ color: 0x273449, roughness: 0.3 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xfff7ed, roughness: 0.6 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.6, roughness: 0.3 });
    const burgundyMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.6 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2b1b12, roughness: 0.9 });
    const smileMat = new THREE.MeshStandardMaterial({ color: 0x4a1d1d, roughness: 0.6 });

    // ----- Циліндр: поля ширші за голову, щоб було видно -----
    const hat = new THREE.Group();
    hat.name = "hat";

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 36), blackMat);
    brim.position.set(0, 0.8, 0);
    hat.add(brim);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.45, 32), blackMat);
    crown.position.set(0, 1.05, 0);
    hat.add(crown);

    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.303, 0.305, 0.08, 32), burgundyMat);
    hatBand.position.set(0, 0.9, 0);
    hat.add(hatBand);

    body.add(hat);

    // ----- Піджак, сорочка, брюки: концентричні оболонки навколо тіла (не перетинаються) -----
    const TOP = -0.22, HEM = -0.81;
    const GAP = 0.3;
    const R_JACKET = 0.65, R_SHIRT = 0.645, R_LAPEL = 0.655, R_PANTS = 0.64;

    const jacket = buildFittedShell(blackMat, R_JACKET, TOP, HEM, GAP, false);
    jacket.name = "jacket";
    body.add(jacket);

    const shirt = buildFittedShell(whiteMat, R_SHIRT, TOP, HEM, GAP, true);
    shirt.name = "shirt";
    body.add(shirt);

    const lapels = new THREE.Group();
    lapels.name = "lapels";
    lapels.add(buildFittedShell(satinMat, R_LAPEL, TOP, HEM, GAP, false, GAP, GAP + 0.2));
    lapels.add(buildFittedShell(satinMat, R_LAPEL, TOP, HEM, GAP, false, Math.PI*2 - GAP - 0.2, Math.PI*2 - GAP));
    body.add(lapels);

    // низ тіла під піджаком — штани (верхній край ховається під подолом)
    const pelvis = new THREE.Mesh(new THREE.SphereGeometry(R_PANTS, 48, 20, 0, Math.PI*2, Math.acos((HEM + 0.01 + 0.35)/R_PANTS), Math.PI - Math.acos((HEM + 0.01 + 0.35)/R_PANTS)), blackMat);
    pelvis.name = "trousers";
    pelvis.position.set(0, -0.35, 0);
    body.add(pelvis);

    // висота поверхні сорочки на (x, y) — по ній кладемо ланцюжок, годинник, гудзики
    function shirtZ(x, y){

        const dy = y < -0.35 ? (y + 0.35) : 0;
        return Math.sqrt(Math.max(0.01, R_SHIRT*R_SHIRT - x*x - dy*dy));

    }

    // ----- Метелик -----
    const bow = new THREE.Group();
    bow.name = "bow";
    bow.position.set(0, -0.27, shirtZ(0, -0.27) + 0.03);

    [-1, 1].forEach(function(side){

        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.1, 4), blackMat);
        wing.rotation.z = side*Math.PI/2;
        wing.position.set(side*0.075, 0, 0);
        wing.scale.set(1, 1, 0.55);
        bow.add(wing);

    });

    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), blackMat);
    bow.add(knot);

    body.add(bow);

    // ----- Гудзики на сорочці -----
    const studs = new THREE.Group();
    studs.name = "studs";

    [-0.37, -0.62].forEach(function(y){

        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), blackMat);
        stud.position.set(0, y, shirtZ(0, y) + 0.012);
        studs.add(stud);

    });

    body.add(studs);

    // ----- Вуса (закручені догори), посмішка і маленька борідка -----
    const faceHair = new THREE.Group();
    faceHair.name = "facehair";

    [-1, 1].forEach(function(side){

        const stache = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), hairMat);
        stache.scale.set(0.11, 0.032, 0.055);
        stache.position.set(side*0.1, 0.12, 0.63);
        stache.rotation.z = side*0.35;
        faceHair.add(stache);

        const curl = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), hairMat);
        curl.position.set(side*0.2, 0.15, 0.62);
        faceHair.add(curl);

    });

    const goatee = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 10), hairMat);
    goatee.rotation.x = Math.PI;
    goatee.scale.set(1, 1, 0.8);
    goatee.position.set(0, -0.11, 0.6);
    faceHair.add(goatee);

    body.add(faceHair);

    // посмішка під вусами: дуга внизу кола, кінці трохи вгору
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.011, 8, 24, 1.8), smileMat);
    smile.name = "smile";
    smile.position.set(0, 0.09, 0.62);
    smile.rotation.z = Math.PI*1.5 - 0.9;
    body.add(smile);

    // ----- Кишеньковий годинник на ланцюжку -----
    const chainStart = new THREE.Vector3(-0.17, -0.4, 0);
    const chainEnd = new THREE.Vector3(0.12, -0.46, 0);
    const chainPts = [];
    const CH = 14;

    for(let i=0;i<=CH;i++){

        const t = i/CH;
        const x = chainStart.x + (chainEnd.x - chainStart.x)*t;
        const y = chainStart.y + (chainEnd.y - chainStart.y)*t - 0.06*4*t*(1-t);

        chainPts.push(new THREE.Vector3(x, y, shirtZ(x, y) + 0.025 + 0.015*t));

    }

    const chain = buildTuxedoChain(chainPts, 0.008, goldMat);
    chain.name = "chain";
    body.add(chain);

    const chainButton = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), goldMat);
    chainButton.name = "chainButton";
    chainButton.position.set(chainStart.x, chainStart.y, shirtZ(chainStart.x, chainStart.y) + 0.02);
    body.add(chainButton);

    const watch = new THREE.Group();
    watch.name = "watch";
    watch.position.set(0.12, -0.62, shirtZ(0.12, -0.5) + 0.08);

    const wCase = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 32), goldMat);
    wCase.rotation.x = Math.PI/2;
    watch.add(wCase);

    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.04, 32), creamMat);
    dial.rotation.x = Math.PI/2;
    watch.add(dial);

    [[0, 0.05], [0.05, 0], [0, -0.05], [-0.05, 0]].forEach(function(p){

        const tick = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.016, 0.004), blackMat);
        tick.position.set(p[0], p[1], 0.021);
        tick.rotation.z = p[0] ? Math.PI/2 : 0;
        watch.add(tick);

    });

    const minuteHand = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.05, 0.006), blackMat);
    minuteHand.position.set(0, 0.022, 0.024);
    watch.add(minuteHand);

    const hourHand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.034, 0.006), blackMat);
    hourHand.position.set(0.014, -0.006, 0.026);
    hourHand.rotation.z = Math.PI/2 + 0.5;
    watch.add(hourHand);

    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), goldMat);
    pin.position.z = 0.028;
    watch.add(pin);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), goldMat);
    stem.position.set(0, 0.088, 0);
    watch.add(stem);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 18), goldMat);
    ring.position.set(0, 0.125, 0);
    watch.add(ring);

    body.add(watch);

    // ----- Рукави з білими манжетами -----
    function buildSleeve(){

        const g = new THREE.Group();
        g.name = "sleeve";

        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.26, 20), blackMat);
        g.add(sleeve);

        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.045, 20), whiteMat);
        cuff.position.y = 0.152;
        g.add(cuff);

        return g;

    }

    const armL = new THREE.Group();
    armL.add(buildSleeve());

    // ----- Права рука: тростина з золотим гачком -----
    const armR = new THREE.Group();
    armR.add(buildSleeve());

    const frameR = new THREE.Group();
    frameR.name = "frameR";
    frameR.rotation.z = REST;
    armR.add(frameR);

    const cane = new THREE.Group();
    cane.name = "cane";
    cane.position.set(0.22, 0, 0);

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.275, 10), blackMat);
    shaft.position.y = -0.5375;
    cane.add(shaft);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 10), goldMat);
    ferrule.position.y = -1.15;
    cane.add(ferrule);

    const crook = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.02, 8, 20, Math.PI), goldMat);
    crook.position.set(0.07, 0.1, 0);
    cane.add(crook);

    const crookEnd = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), goldMat);
    crookEnd.position.set(0.14, 0.1, 0);
    cane.add(crookEnd);

    const caneRing = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.03, 10), goldMat);
    caneRing.position.y = 0.06;
    cane.add(caneRing);

    frameR.add(cane);

    // ----- Довші ноги: штанини й туфлі їдуть разом із ногою (ноги розмахують) -----
    // ноги масштабуються по Y; "legFix" повертає дочірнім деталям справжні розміри
    const LEG_SCALE = 1.3;

    function buildLeg(name, side){

        const leg = new THREE.Group();
        leg.name = name;

        const fix = new THREE.Group();
        fix.scale.set(1, 1/LEG_SCALE, 1);
        leg.add(fix);

        const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.112, 0.4, 20), blackMat);
        trouser.position.y = 0.01;
        fix.add(trouser);

        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.03), satinMat);
        stripe.position.set(side*0.108, 0.01, 0);
        fix.add(stripe);

        const shoe = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), blackMat);
        shoe.name = name + "Shoe";
        shoe.scale.set(0.115, 0.065, 0.165);
        shoe.position.set(0, -0.21, 0.045);
        fix.add(shoe);

        return leg;

    }

    return {
        body: body, armL: armL, armR: armR,
        legL: buildLeg("trouserL", -1), legR: buildLeg("trouserR", 1),
        legScale: LEG_SCALE, legY: -0.97,
        eyeScale: 0.5, eyeY: 0.4, armSwing: 0.5
    };

}

let jarvisCostumeArmL = null;
let jarvisCostumeArmR = null;
let jarvisCostumeLegL = null;
let jarvisCostumeLegR = null;

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

    if(jarvisCostumeLegL && jarvisLegL){

        jarvisLegL.remove(jarvisCostumeLegL);
        jarvisCostumeLegL = null;

    }

    if(jarvisCostumeLegR && jarvisLegR){

        jarvisLegR.remove(jarvisCostumeLegR);
        jarvisCostumeLegR = null;

    }

    // ноги повертаємо до стандартної довжини; костюм може їх подовжити (legScale/legY)
    if(jarvisLegL){ jarvisLegL.scale.set(1, 1, 1); jarvisLegL.position.y = -0.92; }
    if(jarvisLegR){ jarvisLegR.scale.set(1, 1, 1); jarvisLegR.position.y = -0.92; }

    if(jarvisEyeWhite){

        jarvisEyeWhite.visible = true;
        jarvisEyeWhite.scale.x = 1;
        jarvisEyeWhite.scale.z = 1;
        jarvisEyeWhite.position.y = 0.28;

    }

    jarvisEyeSizeFactor = 1;
    jarvisCostumeArmSwing = 1;
    jarvisTailPivot = null;
    jarvisCostumeBlinkEyes = [];

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

    if(parts.legL && jarvisLegL){

        jarvisCostumeLegL = parts.legL;
        jarvisLegL.add(jarvisCostumeLegL);

    }

    if(parts.legR && jarvisLegR){

        jarvisCostumeLegR = parts.legR;
        jarvisLegR.add(jarvisCostumeLegR);

    }

    if(parts.legScale && jarvisLegL && jarvisLegR){

        jarvisLegL.scale.y = parts.legScale;
        jarvisLegR.scale.y = parts.legScale;

        if(parts.legY !== undefined){

            jarvisLegL.position.y = parts.legY;
            jarvisLegR.position.y = parts.legY;

        }

    }

    if(parts.hideEye && jarvisEyeWhite) jarvisEyeWhite.visible = false;

    if(parts.armSwing !== undefined) jarvisCostumeArmSwing = parts.armSwing;

    if(parts.tailPivot) jarvisTailPivot = parts.tailPivot;
    if(parts.blinkEyes) jarvisCostumeBlinkEyes = parts.blinkEyes;

    if(parts.eyeScale && jarvisEyeWhite){

        jarvisEyeSizeFactor = parts.eyeScale;
        jarvisEyeWhite.scale.x = parts.eyeScale;
        jarvisEyeWhite.scale.z = parts.eyeScale;

    }

    if(parts.eyeY !== undefined && jarvisEyeWhite){

        jarvisEyeWhite.position.y = parts.eyeY;

    }

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
