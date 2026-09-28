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

function buildPirateCostume(){

    const group = new THREE.Group();
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });

    const brimGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.06, 16);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, 1.02, 0);
    group.add(brim);

    const topGeo = new THREE.SphereGeometry(0.32, 16, 8, 0, Math.PI*2, 0, Math.PI/2);
    const top = new THREE.Mesh(topGeo, hatMat);
    top.position.set(0, 1.05, 0);
    group.add(top);

    const patchGeo = new THREE.CircleGeometry(0.15, 16);
    const patchMat = new THREE.MeshStandardMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const patch = new THREE.Mesh(patchGeo, patchMat);
    patch.position.set(-0.15, 0.28, 0.92);
    group.add(patch);

    return group;

}

function buildDogCostume(){

    const group = new THREE.Group();
    const earMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });

    const earGeo = new THREE.SphereGeometry(0.3, 16, 16);

    const earL = new THREE.Mesh(earGeo, earMat);
    earL.scale.set(0.5, 1.4, 0.45);
    earL.position.set(-0.72, 0.3, 0.1);
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, earMat.clone());
    earR.scale.set(0.5, 1.4, 0.45);
    earR.position.set(0.72, 0.3, 0.1);
    group.add(earR);

    const headbandGeo = new THREE.TorusGeometry(0.65, 0.04, 8, 24);
    const headbandMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.7 });
    const headband = new THREE.Mesh(headbandGeo, headbandMat);
    headband.rotation.x = Math.PI/2;
    headband.position.set(0, 0.85, 0);
    group.add(headband);

    const noseGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.1, 1.0);
    group.add(nose);

    return group;

}

function buildCatCostume(){

    const group = new THREE.Group();
    const earMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6 });

    const earGeo = new THREE.ConeGeometry(0.22, 0.38, 4);

    const earL = new THREE.Mesh(earGeo, earMat);
    earL.position.set(-0.42, 0.88, 0);
    earL.rotation.z = -0.25;
    group.add(earL);

    const earR = new THREE.Mesh(earGeo, earMat.clone());
    earR.position.set(0.42, 0.88, 0);
    earR.rotation.z = 0.25;
    group.add(earR);

    const noseGeo = new THREE.ConeGeometry(0.06, 0.09, 6);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0xf472b6 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, -0.1, 1.0);
    nose.rotation.x = Math.PI/2;
    group.add(nose);

    return group;

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
    visor.position.set(0, 0.28, 0.6);
    body.add(visor);

    [-1, 1].forEach(function(side){

        const pauldron = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.22), darkMetalMat);
        pauldron.position.set(side*0.68, 0.05, 0);
        body.add(pauldron);

    });

    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.3), metalMat);
    chest.position.set(0, -0.35, 0.4);
    body.add(chest);

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

        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 8), hornMat);
        horn.position.set(side*0.45, 0.85, 0);
        horn.rotation.z = side*0.7;
        body.add(horn);

    });

    [-1, 1].forEach(function(side){

        const fur = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 10), new THREE.MeshStandardMaterial({ color: 0xf5f5f4 }));
        fur.position.set(side*0.65, 0.08, 0);
        body.add(fur);

    });

    const vest = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.7, 0.3), leatherMat);
    vest.position.set(0, -0.35, 0.4);
    body.add(vest);

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
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), leatherMat);
    handle.position.set(0, 0.35, 0);
    armR.add(handle);

    const axeHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 4), metalMat);
    axeHead.position.set(0.1, 0.55, 0);
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

    const jacket = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.72, 0.35), blackMat);
    jacket.position.set(0, -0.35, 0.4);
    body.add(jacket);

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

        parts = { body: buildPirateCostume() };

    }else if(jarvisCostumeId === "dog"){

        parts = { body: buildDogCostume() };

    }else if(jarvisCostumeId === "cat"){

        parts = { body: buildCatCostume() };

    }else if(jarvisCostumeId === "robot"){

        parts = buildRobotCostume();

    }else if(jarvisCostumeId === "viking"){

        parts = buildVikingCostume();

    }else if(jarvisCostumeId === "tuxedo"){

        parts = buildTuxedoCostume();

    }

    if(!parts) return;

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
