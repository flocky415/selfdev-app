/*
 * SelfDev — 3D-компаньйон Джарвіз (Three.js)
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 */

// ----------------
// Джарвіз — 3D-компаньйон (Three.js)
// Оригінальний персонаж: капсуловидний помічник з великим круглим оком та окулярами,
// стоїть на підставці, стежить поглядом, кліпає, жестикулює і підказує.
// ----------------

let jarvisScene, jarvisCamera, jarvisRenderer;
let jarvisRig, jarvisBody, jarvisEye, jarvisEyeWhite;
let jarvisIris, jarvisLidTop, jarvisLidBottom, jarvisMouth;
let jarvisArmL, jarvisArmR;
let jarvisLegL, jarvisLegR;
let jarvisPlatform, jarvisPlatformGlow, jarvisShadow;
let jarvisEyeBaseScaleY = 1;
let jarvisEyeSizeFactor = 1;
let jarvisTailPivot = null;
let jarvisCostumeBlinkEyes = [];
let jarvisCostumeArmSwing = 1;
let jarvisAccessory = null;
let jarvisAccessoryType = null;
let jarvisClock = 0;
let jarvisSpinBoost = 0;

// Висота, на якій ноги торкаються підставки
const JARVIS_GROUND_Y = 0;

// Руки опущені: невеликий кут від тіла (додатний — кисть відходить у бік +x)
const JARVIS_ARM_REST = 0.2;

// Око (менше, ніж було) і рот
const JARVIS_EYE_R = 0.31;
const JARVIS_EYE_Y = 0.3;
const JARVIS_MOUTH_Y = -0.24;

// Кисть у системі координат шарніра плеча
const JARVIS_HAND_Y = -0.42;

let jarvisArmMeshL = null, jarvisArmMeshR = null;
let jarvisCostumeWiggles = [];
let jarvisCostumePulses = [];

// Забрало шолома (костюм робота): { pivot, open, closed, cur }
let jarvisCostumeVisor = null;

// Мультяшний носик (у котика й песика — свій, тому базовий ховається)
let jarvisNose = null;

// Костюм може збільшити руки й відвести їх від тіла (вікінг зі щитом і сокирою)
let jarvisArmRest = 0.2;

const jarvisSkins = [
    { id:"classic", name:"Класичний", color:0xffd93d, unlockLevel:1 },
    { id:"blue", name:"Синій", color:0x38bdf8, unlockLevel:2 },
    { id:"green", name:"Зелений", color:0x4ade80, unlockLevel:4 },
    { id:"purple", name:"Фіолетовий", color:0xa78bfa, unlockLevel:7 },
    { id:"pink", name:"Рожевий", color:0xf472b6, unlockLevel:10 },
    { id:"midnight", name:"Опівнічний", color:0x475569, unlockLevel:14 },
    // Нагороди сезонної стежки (funnel.js): відкриваються не рівнем, а пройденим сезоном
    { id:"s-nebula", name:"Туманність", color:0x5b21b6, season:"Космос" },
    { id:"s-abyss", name:"Глибина", color:0x0e7490, season:"Океан" },
    { id:"s-moss", name:"Мох", color:0x4d7c0f, season:"Ліс" },
    { id:"s-magma", name:"Магма", color:0xdc2626, season:"Вулкан" }
];

function jarvisSkinUnlocked(skin){

    if(skin.season){

        return typeof seasonSkins !== "undefined" && seasonSkins.includes(skin.id);

    }

    return (typeof level !== "undefined" ? level : 1) >= skin.unlockLevel;

}

let jarvisSkinId = localStorage.getItem("jarvisSkin") || "classic";

// bob* — підстрибування на підставці, rot* — погойдування корпусом
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

// Віджет тепер вертикальний — щоб уміщалась підставка
function getJarvisSize(){

    const el = document.getElementById("jarvisWidget");

    if(el && el.clientWidth && el.clientHeight) return { w: el.clientWidth, h: el.clientHeight };

    return window.innerWidth >= 900 ? { w:130, h:150 } : { w:84, h:100 };

}

function jarvisPrefersReducedMotion(){

    return !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

}

// М'яка кругла тінь (текстура з canvas, без зовнішніх файлів)
function makeJarvisShadowTexture(){

    const c = document.createElement("canvas");

    c.width = c.height = 128;

    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);

    grad.addColorStop(0, "rgba(0,0,0,.55)");
    grad.addColorStop(.6, "rgba(0,0,0,.18)");
    grad.addColorStop(1, "rgba(0,0,0,0)");

    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(c);

}

// ----------------
// Рот: шари-«наліпки», вигнуті точно по поверхні тіла.
//  • губи (контур) — у закритому стані це звична усмішка-дуга;
//  • порожнина рота — темна, форма «D»: верх — усмішка, низ — глибока дуга;
//  • язичок унизу і рядок верхніх зубів.
// update(open, wide): open 0…1 — наскільки відкритий, wide — ширина усмішки.
// ----------------

function buildJarvisMouth(){

    const group = new THREE.Group();

    const TOP_Y = -0.34;      // центр верхнього краю
    const HALF_W = 0.2;       // пів-ширини
    const CURVE = 0.085;      // наскільки підняті куточки
    const DEPTH = 0.13;       // глибина повністю відкритого рота
    const NU = 36, NV = 8;    // сітка кожного шару

    const radiusAt = (y)=>{

        const over = Math.abs(y) - 0.35;

        return over <= 0 ? 0.62 : Math.sqrt(Math.max(0, 0.3844 - over*over));

    };

    // шар — сітка NU×NV, позиції якої перераховуються щокадру
    const makeLayer = (mat, nu, nv)=>{

        const count = (nu + 1) * (nv + 1);
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        const nor = new Float32Array(count * 3);
        const idx = [];

        for(let i = 0; i < nu; i++){

            for(let j = 0; j < nv; j++){

                const a = i*(nv+1) + j, b = (i+1)*(nv+1) + j;

                // порядок вершин — лицем до глядача (інакше шар освітлювався б з виворітного боку й темнів)
                idx.push(a, a+1, b, b, a+1, b+1);

            }

        }

        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setIndex(idx);

        const mesh = new THREE.Mesh(geo, mat);

        mesh.frustumCulled = false;
        group.add(mesh);

        return { mesh, geo, pos, nor, nu, nv };

    };

    // записати точку (x, y) на поверхню тіла з відступом lift
    const put = (L, k, x, y, lift)=>{

        const r = radiusAt(y);
        const z = Math.sqrt(Math.max(0.0001, r*r - x*x)) + lift;
        const cy = Math.max(-0.35, Math.min(0.35, y));
        const nx = x, ny = y - cy, nz = z - lift;
        const len = Math.hypot(nx, ny, nz) || 1;

        L.pos[k*3] = x; L.pos[k*3+1] = y; L.pos[k*3+2] = z;
        L.nor[k*3] = nx/len; L.nor[k*3+1] = ny/len; L.nor[k*3+2] = nz/len;

    };

    const done = (L)=>{

        L.geo.attributes.position.needsUpdate = true;
        L.geo.attributes.normal.needsUpdate = true;

    };

    const lipMat = new THREE.MeshPhysicalMaterial({ color: 0x92400e, roughness: 0.45, clearcoat: 0.5, side: THREE.DoubleSide });
    const cavityMat = new THREE.MeshStandardMaterial({ color: 0x3f0d12, roughness: 0.8, side: THREE.DoubleSide });
    const tongueMat = new THREE.MeshPhysicalMaterial({ color: 0xf472b6, roughness: 0.35, clearcoat: 0.8, side: THREE.DoubleSide });
    const teethMat = new THREE.MeshPhysicalMaterial({ color: 0xfffdf7, roughness: 0.25, clearcoat: 1, side: THREE.DoubleSide });

    const lip = makeLayer(lipMat, NU, NV);
    const cavity = makeLayer(cavityMat, NU, NV);
    const tongue = makeLayer(tongueMat, 28, 6);
    const teeth = makeLayer(teethMat, 24, 2);

    // форма «D»: верхній край — усмішка, нижній — дуга глибиною depth
    const fillD = (L, halfW, topLift, depth, lift)=>{

        let k = 0;

        for(let i = 0; i <= L.nu; i++){

            const u = i / L.nu * 2 - 1;
            const x = u * halfW;
            const top = TOP_Y + CURVE * u*u + topLift;
            const bottom = top - depth * Math.sqrt(Math.max(0, 1 - u*u));

            for(let j = 0; j <= L.nv; j++){

                put(L, k++, x, top + (bottom - top) * (j / L.nv), lift);

            }

        }

        done(L);

    };

    const update = (open, wide)=>{

        const o = Math.max(0, Math.min(1, open));
        const w = HALF_W * (wide || 1);
        const depth = DEPTH * o;

        // губи: трохи ширші й вищі за порожнину — у закритому стані з них лишається дуга-усмішка
        fillD(lip, w + 0.022, 0.018, depth + 0.036, 0.003);

        cavity.mesh.visible = o > 0.03;

        if(cavity.mesh.visible) fillD(cavity, w, 0, depth, 0.006);

        // язичок: овал, що лежить на дні рота
        tongue.mesh.visible = o > 0.12;

        if(tongue.mesh.visible){

            const rx = w * 0.58, ry = depth * 0.42;
            const cy = TOP_Y - depth + ry * 0.95;
            let k = 0;

            for(let i = 0; i <= tongue.nu; i++){

                const a = Math.PI + (i / tongue.nu) * Math.PI;   // нижня половина овалу + опукла верхівка

                for(let j = 0; j <= tongue.nv; j++){

                    const v = j / tongue.nv;
                    const x = Math.cos(a) * rx * v;
                    const y = cy + Math.sin(a) * ry * v * (Math.sin(a) < 0 ? 1 : 0.6) + ry * 0.35 * (1 - v);

                    put(tongue, k++, x, y, 0.009);

                }

            }

            done(tongue);

        }

        // верхні зуби: смужка під верхнім краєм рота
        teeth.mesh.visible = o > 0.2;

        if(teeth.mesh.visible){

            const tw = w * 0.62;
            const th = Math.min(0.034, depth * 0.3);
            let k = 0;

            for(let i = 0; i <= teeth.nu; i++){

                const u = i / teeth.nu * 2 - 1;
                const x = u * tw;
                const top = TOP_Y + CURVE * (x/w)*(x/w) - 0.006;

                for(let j = 0; j <= teeth.nv; j++){

                    put(teeth, k++, x, top - th * (j / teeth.nv) * (1 - 0.35*u*u), 0.01);

                }

            }

            done(teeth);

        }

    };

    group.userData = { open: 0, wide: 1, update };

    update(0, 1);

    return group;

}

function initJarvis3D(){

    const canvas = document.getElementById("jarvis3dCanvas");

    if(!canvas || typeof THREE === "undefined" || jarvisRenderer) return;

    const size = getJarvisSize();

    jarvisRenderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    jarvisRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    jarvisRenderer.setSize(size.w, size.h, false);

    if("outputColorSpace" in jarvisRenderer && THREE.SRGBColorSpace) jarvisRenderer.outputColorSpace = THREE.SRGBColorSpace;

    jarvisScene = new THREE.Scene();

    jarvisCamera = new THREE.PerspectiveCamera(32, size.w/size.h, 0.1, 100);
    jarvisCamera.position.set(0, 0.45, 6.3);
    jarvisCamera.lookAt(0, -0.15, 0);

    // Світло: м'яке небо/земля, основне спереду-збоку і контурне ззаду — фігурка «відділяється» від фону
    jarvisScene.add(new THREE.HemisphereLight(0xffffff, 0x8a6a3a, 1.25));

    // м'яке заповнююче світло спереду — без темних «гірчичних» тіней
    const fill = new THREE.DirectionalLight(0xffffff, 0.45);
    fill.position.set(0, 0.5, 5);
    jarvisScene.add(fill);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
    keyLight.position.set(2.5, 3.5, 4);
    jarvisScene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.9);
    rimLight.position.set(-3, 2, -3);
    jarvisScene.add(rimLight);

    jarvisRig = new THREE.Group();
    jarvisRig.position.y = -0.15;
    jarvisScene.add(jarvisRig);

    // ----- Підставка -----
    jarvisPlatform = new THREE.Group();
    jarvisPlatform.position.y = -1.12;
    jarvisRig.add(jarvisPlatform);

    const baseMat = new THREE.MeshPhysicalMaterial({ color: 0x1e293b, metalness: 0.35, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.98, 0.16, 48), baseMat);
    base.position.y = -0.08;
    jarvisPlatform.add(base);

    const padMat = new THREE.MeshPhysicalMaterial({ color: 0x334155, metalness: 0.2, roughness: 0.5, clearcoat: 0.5 });
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.02, 48), padMat);
    pad.position.y = 0.0;
    jarvisPlatform.add(pad);

    // Світний обідок «дихає» — підставка теж виглядає живою
    jarvisPlatformGlow = new THREE.Mesh(
        new THREE.TorusGeometry(0.88, 0.028, 10, 64),
        new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.9 })
    );
    jarvisPlatformGlow.rotation.x = Math.PI/2;
    jarvisPlatformGlow.position.y = -0.005;
    jarvisPlatform.add(jarvisPlatformGlow);

    jarvisShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(1.2, 1.2),
        new THREE.MeshBasicMaterial({ map: makeJarvisShadowTexture(), transparent: true, depthWrite: false })
    );
    jarvisShadow.rotation.x = -Math.PI/2;
    jarvisShadow.position.y = 0.015;
    jarvisPlatform.add(jarvisShadow);

    // ----- Тіло -----
    const skinColor = 0xffd93d;
    const skinMat = () => new THREE.MeshPhysicalMaterial({ color: skinColor, metalness: 0.02, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 });

    jarvisBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.7, 10, 24), skinMat());
    jarvisRig.add(jarvisBody);

    // ----- Око: завжди кругле (форма не сплющується), настрій і моргання — повіками -----
    const eyeR = JARVIS_EYE_R;
    const eyeDepth = 0.55;

    const eyeWhiteGeo = new THREE.SphereGeometry(eyeR, 32, 24);
    eyeWhiteGeo.scale(1, 1, eyeDepth);

    jarvisEyeWhite = new THREE.Mesh(eyeWhiteGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 }));
    jarvisEyeWhite.position.set(0, JARVIS_EYE_Y, 0.52);
    jarvisBody.add(jarvisEyeWhite);

    // Райдужка + зіниця рухаються разом (погляд)
    jarvisIris = new THREE.Group();
    jarvisEyeWhite.add(jarvisIris);

    const irisGeo = new THREE.SphereGeometry(eyeR*0.5, 32, 16);
    irisGeo.scale(1, 1, 0.3);

    const iris = new THREE.Mesh(irisGeo, new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.35, roughness: 0.3 }));
    jarvisIris.add(iris);

    const irisRingGeo = new THREE.TorusGeometry(eyeR*0.475, 0.015, 8, 40);
    const irisRing = new THREE.Mesh(irisRingGeo, new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 }));
    irisRing.position.z = 0.012;
    jarvisIris.add(irisRing);

    const pupilGeo = new THREE.SphereGeometry(eyeR*0.24, 24, 16);
    pupilGeo.scale(1, 1, 0.3);

    jarvisEye = new THREE.Mesh(pupilGeo, new THREE.MeshStandardMaterial({ color: 0x0b1020, emissive: 0x0f172a, emissiveIntensity: 0.3, roughness: 0.2 }));
    jarvisEye.position.z = 0.03;
    jarvisIris.add(jarvisEye);

    // Блиски закріплені на оці, а не на зіниці — вони не їздять за поглядом, тож око виглядає вологим
    const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const glint = new THREE.Mesh(new THREE.SphereGeometry(eyeR*0.14, 12, 12), glintMat);
    glint.position.set(-eyeR*0.28, eyeR*0.3, eyeR*eyeDepth + 0.015);
    jarvisEyeWhite.add(glint);

    const glintSmall = new THREE.Mesh(new THREE.SphereGeometry(eyeR*0.065, 10, 10), glintMat);
    glintSmall.position.set(eyeR*0.25, -eyeR*0.15, eyeR*eyeDepth + 0.012);
    jarvisEyeWhite.add(glintSmall);

    // Повіки кольору шкіри: верхня опускається згори, нижня піднімається знизу (щаслива усмішка очима)
    const lidR = eyeR*1.06;

    const topGeo = new THREE.SphereGeometry(lidR, 32, 12, 0, Math.PI*2, 0, Math.PI/2);
    topGeo.scale(1, 1, 0.62);
    topGeo.translate(0, -lidR, 0);

    jarvisLidTop = new THREE.Mesh(topGeo, skinMat());
    jarvisLidTop.position.y = lidR;
    jarvisLidTop.scale.y = 0.001;
    jarvisEyeWhite.add(jarvisLidTop);

    const bottomGeo = new THREE.SphereGeometry(lidR, 32, 12, 0, Math.PI*2, Math.PI/2, Math.PI/2);
    bottomGeo.scale(1, 1, 0.62);
    bottomGeo.translate(0, lidR, 0);

    jarvisLidBottom = new THREE.Mesh(bottomGeo, skinMat());
    jarvisLidBottom.position.y = -lidR;
    jarvisLidBottom.scale.y = 0.001;
    jarvisEyeWhite.add(jarvisLidBottom);

    // Окуляри — кругла оправа підкреслює, що око кругле
    const glassesMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6, roughness: 0.3 });

    const glassesRing = new THREE.Mesh(new THREE.TorusGeometry(eyeR + 0.028, 0.04, 12, 48), glassesMat);
    glassesRing.position.set(0, 0, 0.02);
    jarvisEyeWhite.add(glassesRing);

    const templeGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.3, 10);

    const templeL = new THREE.Mesh(templeGeo, glassesMat);
    templeL.position.set(-(eyeR + 0.08), 0, -0.1);
    templeL.rotation.z = Math.PI/2;
    jarvisEyeWhite.add(templeL);

    const templeR = new THREE.Mesh(templeGeo, glassesMat);
    templeR.position.set(eyeR + 0.08, 0, -0.1);
    templeR.rotation.z = Math.PI/2;
    jarvisEyeWhite.add(templeR);

    // Рот: справжній мультяшний рот, що відкривається (губи, порожнина, язичок, зуби)
    jarvisMouth = buildJarvisMouth();
    jarvisBody.add(jarvisMouth);

    // Носик-«картоплинка» між оком і ротом, трохи темніший за шкіру, з відблиском
    jarvisNose = new THREE.Group();
    jarvisNose.position.set(0, -0.15, 0.645);
    jarvisBody.add(jarvisNose);

    const noseMat = new THREE.MeshPhysicalMaterial({ color: 0xf2c230, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3 });
    const noseBall = new THREE.Mesh(new THREE.SphereGeometry(0.072, 32, 24), noseMat);

    noseBall.scale.set(1.15, 0.9, 0.9);
    jarvisNose.add(noseBall);
    jarvisNose.userData.mat = noseMat;

    const noseGlint = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));

    noseGlint.position.set(-0.025, 0.025, 0.058);
    jarvisNose.add(noseGlint);

    // Ручки: шарнір у плечі, рука звисає вздовж тіла, на кінці — кругла «рукавичка».
    // jarvisArmL/R — шарніри (до них кріпляться речі костюмів), jarvisArmMeshL/R — сама рука.
    const armGeo = new THREE.CapsuleGeometry(0.095, 0.28, 10, 20);
    const handGeo = new THREE.SphereGeometry(0.12, 28, 20);

    const buildArm = (side)=>{

        const pivot = new THREE.Group();

        pivot.position.set(side*0.58, 0.1, 0);
        pivot.rotation.z = side*JARVIS_ARM_REST;
        jarvisBody.add(pivot);

        const mat = skinMat();
        const arm = new THREE.Group();

        const upper = new THREE.Mesh(armGeo, mat);

        upper.position.y = -0.2;
        arm.add(upper);

        const hand = new THREE.Mesh(handGeo, mat);

        hand.position.set(0, JARVIS_HAND_Y, 0.01);
        hand.scale.set(1, 0.95, 1.05);
        arm.add(hand);

        arm.userData.mat = mat;
        pivot.add(arm);

        return { pivot, arm };

    };

    const armL = buildArm(-1);
    const armR = buildArm(1);

    jarvisArmL = armL.pivot;
    jarvisArmR = armR.pivot;
    jarvisArmMeshL = armL.arm;
    jarvisArmMeshR = armR.arm;

    // Ніжки
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.22, 6, 12);

    jarvisLegL = new THREE.Mesh(legGeo, skinMat());
    jarvisLegL.position.set(-0.22, -0.92, 0);
    jarvisBody.add(jarvisLegL);

    jarvisLegR = new THREE.Mesh(legGeo, skinMat());
    jarvisLegR.position.set(0.22, -0.92, 0);
    jarvisBody.add(jarvisLegR);

    updateJarvis3DMood();
    updateJarvis3DAccessory();
    applyJarvisSkin();
    applyJarvisCostume();

    jarvisBindLiveInput();
    jarvisBindLongPress();

    jarvisLastFrame = performance.now();
    animateJarvis3D();

    window.addEventListener("resize", ()=>{

        if(!jarvisRenderer) return;

        const s = getJarvisSize();

        jarvisRenderer.setSize(s.w, s.h, false);
        jarvisCamera.aspect = s.w/s.h;
        jarvisCamera.updateProjectionMatrix();

    });

}

// ----------------
// «Живість»: погляд, моргання, дії, настрій
// ----------------

const jarvisLive = {
    look: { x:0, y:0 },          // куди дивиться зараз (-1..1)
    lookTarget: { x:0, y:0 },    // куди хоче подивитись
    pointer: null,               // { x, y, t } — останній рух курсора/пальця
    nextSaccade: 0,
    nextBlink: 2,
    blinkStart: -1,
    doubleBlink: false,
    action: null,                // { type, start, dur }
    nextIdleAction: 6,
    talkingUntil: 0,
    hopVel: 0,
    hopY: 0,
    arms: { lz:-JARVIS_ARM_REST, rz:JARVIS_ARM_REST, lx:0, rx:0 },
    lids: { top:0, bottom:0 },
    mood: ""
};

let jarvisLastFrame = 0;

function jarvisBindLiveInput(){

    const onMove = (x, y)=>{ jarvisLive.pointer = { x, y, t: jarvisClock }; };

    window.addEventListener("pointermove", e=> onMove(e.clientX, e.clientY), { passive:true });
    window.addEventListener("pointerdown", e=> onMove(e.clientX, e.clientY), { passive:true });

    document.addEventListener("visibilitychange", ()=>{

        // Повернулись у застосунок — Джарвіз «прокидається» і махає
        if(document.visibilityState === "visible") jarvisDo("wave");

    });

}

// Напрямок від віджета до точки на екрані → координати погляду (-1..1)
function jarvisScreenToLook(x, y){

    const el = document.getElementById("jarvisWidget");

    if(!el) return { x:0, y:0 };

    const r = el.getBoundingClientRect();
    const cx = r.left + r.width/2;
    const cy = r.top + r.height*0.35;

    const dx = (x - cx) / Math.max(120, window.innerWidth*0.35);
    const dy = (cy - y) / Math.max(120, window.innerHeight*0.35);

    return { x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) };

}

function jarvisLerp(a, b, k){ return a + (b - a) * k; }

// Публічний виклик дій: wave, point, celebrate, think, lookAround, hop, yawn, nod
function jarvisDo(type, durOverride){

    const durations = { wave:1.8, point:2.4, celebrate:2.2, think:2.6, lookAround:2.4, hop:0.9, yawn:2.2, nod:1.0, spin:1.0 };

    jarvisLive.action = { type, start: jarvisClock, dur: durOverride || durations[type] || 1.5 };

    if(type === "hop" || type === "celebrate") jarvisLive.hopVel = type === "celebrate" ? 3.4 : 2.6;

}

function jarvisSetTalking(seconds){

    jarvisLive.talkingUntil = jarvisClock + seconds;

}

function animateJarvis3D(){

    requestAnimationFrame(animateJarvis3D);

    if(!jarvisScene || !jarvisRenderer) return;

    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - jarvisLastFrame) / 1000));

    jarvisLastFrame = now;
    jarvisClock += dt;

    const t = jarvisClock;
    const L = jarvisLive;
    const m = getCurrentMovement();
    const calm = jarvisPrefersReducedMotion();
    const act = L.action && (t - L.action.start) < L.action.dur ? L.action : null;
    const ap = act ? (t - act.start) / act.dur : 0;

    if(L.action && !act) L.action = null;

    if(jarvisSpinBoost > 0) jarvisSpinBoost = Math.max(0, jarvisSpinBoost - dt*1.6);

    // ----- Погляд -----
    const pointerFresh = L.pointer && (t - L.pointer.t) < 2.5;

    if(pointerFresh){

        L.lookTarget = jarvisScreenToLook(L.pointer.x, L.pointer.y);

    }else if(t > L.nextSaccade){

        // Сам по собі розглядається: частіше — на сторінку (праворуч-угору), іноді — на тебе
        const r = Math.random();

        if(r < 0.35) L.lookTarget = { x: 0, y: 0 };
        else if(r < 0.7) L.lookTarget = { x: 0.5 + Math.random()*0.5, y: 0.2 + Math.random()*0.6 };
        else L.lookTarget = { x: Math.random()*2 - 1, y: Math.random()*1.2 - 0.4 };

        L.nextSaccade = t + 0.8 + Math.random()*2.6;

    }

    if(act && act.type === "lookAround"){

        L.lookTarget = { x: Math.sin(ap*Math.PI*2) * 0.9, y: 0.25 };

    }

    if(act && act.type === "think") L.lookTarget = { x: 0.45, y: 0.8 };
    if(act && act.type === "point") L.lookTarget = { x: 0.8, y: 0.7 };
    if(t < L.talkingUntil && !pointerFresh) L.lookTarget = { x: 0.1, y: 0.05 };

    // Швидкий «стрибок» погляду, як у живих очей
    const lookK = Math.min(1, dt * (pointerFresh ? 12 : 9));

    L.look.x = jarvisLerp(L.look.x, L.lookTarget.x, lookK);
    L.look.y = jarvisLerp(L.look.y, L.lookTarget.y, lookK);

    if(jarvisIris){

        const max = JARVIS_EYE_R * 0.33;
        let ix = L.look.x * max;
        let iy = L.look.y * max;

        const len = Math.hypot(ix, iy);

        if(len > max){ ix *= max/len; iy *= max/len; }

        // райдужка ковзає по кривині ока
        const surface = Math.sqrt(Math.max(0, JARVIS_EYE_R*JARVIS_EYE_R - ix*ix - iy*iy)) * 0.55;

        jarvisIris.position.set(ix, iy, surface - 0.012);
        jarvisIris.rotation.set(-iy*1.6, ix*1.6, 0);

    }

    // ----- Тіло: стоїть на підставці, підстрибує, повертається до того, на що дивиться -----
    if(jarvisBody){

        const bounce = Math.abs(Math.sin(t * m.bobSpeed * 2.2)) * m.bobAmplitude * (calm ? 0.3 : 0.75);

        // фізика стрибка для дій «hop»/«celebrate»
        if(L.hopVel !== 0 || L.hopY > 0){

            L.hopVel -= 9.8 * dt;
            L.hopY += L.hopVel * dt;

            if(L.hopY <= 0){

                L.hopY = 0;
                L.hopVel = act && act.type === "celebrate" && ap < 0.7 ? 3.0 : 0;

            }

        }

        const y = JARVIS_GROUND_Y + bounce + L.hopY * (calm ? 0.3 : 1);

        jarvisBody.position.y = y;

        // дихання + стиснення при приземленні
        const breath = Math.sin(t*1.7) * 0.012;
        const squash = Math.max(0, 0.05 - (bounce + L.hopY)) * 0.9;

        jarvisBody.scale.set(1 + squash*0.6 - breath*0.4, 1 - squash + breath, 1 + squash*0.6 - breath*0.4);

        let yaw = L.look.x * 0.35 + Math.sin(t * m.rotSpeed) * m.rotAmplitude * 0.25;
        let tilt = -L.look.x * 0.06 + Math.sin(t*0.9) * 0.02;

        if(act && act.type === "spin") yaw += ap * Math.PI * 2;
        if(act && act.type === "celebrate") yaw += Math.sin(ap*Math.PI) * Math.PI * 2;
        if(act && act.type === "nod") jarvisBody.rotation.x = Math.sin(ap*Math.PI*3) * 0.15;
        else jarvisBody.rotation.x = jarvisLerp(jarvisBody.rotation.x, -L.look.y * 0.08, 0.1);
        if(act && act.type === "think") tilt += 0.12;

        yaw += jarvisSpinBoost * Math.PI * 2 * (1 - jarvisSpinBoost);

        jarvisBody.rotation.y = jarvisLerp(jarvisBody.rotation.y, yaw, act && (act.type === "spin" || act.type === "celebrate") ? 1 : 0.12);
        jarvisBody.rotation.z = jarvisLerp(jarvisBody.rotation.z, tilt, 0.1);

        if(jarvisShadow){

            const s = 1 - Math.min(0.5, (bounce + L.hopY) * 1.2);

            jarvisShadow.scale.set(s, s, s);
            jarvisShadow.material.opacity = 0.35 + s*0.65;

        }

    }

    if(jarvisPlatformGlow){

        jarvisPlatformGlow.material.opacity = 0.55 + Math.sin(t*2) * 0.25 + (act && act.type === "celebrate" ? 0.3 : 0);

    }

    // ----- Руки: в спокої опущені, злегка гойдаються вперед-назад -----
    // Кут z: 0 — рука вниз, додатний — кисть убік +x (права рука вгору), від'ємний — ліва рука вгору.
    const A = jarvisArmRest;
    const swingK = (0.06 + m.rotAmplitude*0.08) * jarvisCostumeArmSwing;
    const sway = Math.sin(t * m.rotSpeed * 1.6);

    let lz = -A - Math.abs(sway)*0.04, rz = A + Math.abs(sway)*0.04;
    let lx = sway * swingK * 2, rx = -sway * swingK * 2;

    // у стрибку руки трохи злітають
    const airArms = Math.min(1, L.hopY * 3);

    lz -= airArms * 0.5;
    rz += airArms * 0.5;

    if(act){

        const ease = Math.sin(Math.min(1, ap*1.25) * Math.PI);   // плавно вгору і назад

        if(act.type === "wave"){

            rz = jarvisLerp(A, 2.5, Math.min(1, ap*4)) + Math.sin(t*14) * 0.3 * Math.min(1, ap*3);
            rx = 0;

            if(ap > 0.85) rz = jarvisLerp(rz, A, (ap-0.85)/0.15);

        }else if(act.type === "point"){

            rz = jarvisLerp(A, 1.55, ease);
            rx = -0.35 * ease;

        }else if(act.type === "celebrate"){

            lz = jarvisLerp(-A, -2.6, ease) - Math.sin(t*16) * 0.2 * ease;
            rz = jarvisLerp(A, 2.6, ease) + Math.sin(t*16) * 0.2 * ease;
            lx = rx = 0;

        }else if(act.type === "think"){

            rz = jarvisLerp(A, 0.55, ease);
            rx = jarvisLerp(0, -1.9, ease);

        }else if(act.type === "yawn"){

            lz = jarvisLerp(-A, -2.8, ease);
            rz = jarvisLerp(A, 2.8, ease);
            lx = rx = 0;

        }

    }

    const armK = Math.min(1, dt*10);

    L.arms.lz = jarvisLerp(L.arms.lz, lz, armK);
    L.arms.rz = jarvisLerp(L.arms.rz, rz, armK);
    L.arms.lx = jarvisLerp(L.arms.lx, lx, armK);
    L.arms.rx = jarvisLerp(L.arms.rx, rx, armK);

    if(jarvisArmL && jarvisArmR){

        jarvisArmL.rotation.z = L.arms.lz;
        jarvisArmR.rotation.z = L.arms.rz;
        jarvisArmL.rotation.x = L.arms.lx;
        jarvisArmR.rotation.x = L.arms.rx;

    }

    // ----- Ноги: у стрибку підгинаються, на місці переминаються -----
    if(jarvisLegL && jarvisLegR){

        const air = Math.min(1, L.hopY * 4);
        const shift = Math.sin(t * m.rotSpeed * 1.6) * (0.06 + m.rotAmplitude*0.1);

        jarvisLegL.rotation.x = shift - air*0.5;
        jarvisLegR.rotation.x = -shift - air*0.5;

    }

    // ----- Моргання (випадкові інтервали, іноді двічі) -----
    if(L.blinkStart < 0 && t > L.nextBlink){

        L.blinkStart = t;
        L.doubleBlink = Math.random() < 0.22;

    }

    let blink = 0;

    if(L.blinkStart >= 0){

        const bt = t - L.blinkStart;
        const one = 0.16;
        const total = L.doubleBlink ? one*2 + 0.08 : one;

        if(bt < one) blink = Math.sin(bt/one * Math.PI);
        else if(L.doubleBlink && bt > one + 0.08 && bt < total) blink = Math.sin((bt-one-0.08)/one * Math.PI);

        if(bt >= total){

            L.blinkStart = -1;
            L.nextBlink = t + 1.8 + Math.random()*4.2;

        }

    }

    // Настрій: сонний — повіки напівприкриті, щасливий — «усміхнені» очі
    let topBase = 0, bottomBase = 0;

    if(L.mood === "mood-sleepy") topBase = 0.55;
    if(L.mood === "mood-happy") bottomBase = 0.45;
    if(act && act.type === "think") topBase = Math.max(topBase, 0.3);
    if(act && act.type === "yawn") topBase = Math.max(topBase, 0.8 * Math.sin(ap*Math.PI));
    if(act && act.type === "celebrate") bottomBase = 0.6;
    if(pointerFresh && L.mood === "mood-sleepy") topBase = 0.25;   // помітив тебе — прокинувся

    const lidK = Math.min(1, dt*14);

    L.lids.top = jarvisLerp(L.lids.top, Math.max(topBase, blink * 2.05), blink > 0 ? 1 : lidK);
    L.lids.bottom = jarvisLerp(L.lids.bottom, bottomBase, lidK);

    if(jarvisLidTop) jarvisLidTop.scale.y = Math.max(0.001, L.lids.top);
    if(jarvisLidBottom) jarvisLidBottom.scale.y = Math.max(0.001, L.lids.bottom);

    // ----- Рот: відкривається по складах, коли говорить; широко — коли позіхає;
    // з язичком — коли радіє; трішки — коли махає чи стрибає -----
    if(jarvisMouth){

        let open = 0, wide = 1;

        if(t < L.talkingUntil){

            // «склади»: швидкі відкриття різної висоти з короткими паузами
            const syl = Math.abs(Math.sin(t*13) * Math.sin(t*4.7 + 0.6));

            open = 0.18 + syl * 0.7;

        }

        if(act){

            const ease = Math.sin(Math.min(1, ap) * Math.PI);

            if(act.type === "yawn") open = Math.max(open, 1.0 * ease), wide = 1 - 0.15*ease;
            if(act.type === "celebrate") open = Math.max(open, 0.85 * Math.min(1, ap*4)), wide = 1.12;
            if(act.type === "wave") open = Math.max(open, 0.4 * ease);
            if(act.type === "hop" || act.type === "spin") open = Math.max(open, 0.35 * ease);

        }

        if(L.mood === "mood-happy") wide = Math.max(wide, 1.08);

        const M = jarvisMouth.userData;

        M.open = jarvisLerp(M.open, open, Math.min(1, dt * (open > M.open ? 18 : 10)));
        M.wide = jarvisLerp(M.wide, wide, Math.min(1, dt * 6));
        M.update(M.open, M.wide);

    }

    if(jarvisEyeWhite) jarvisEyeWhite.scale.y = jarvisEyeSizeFactor;

    // Забрало робота: відкривається/закривається натисканням (див. jarvisToggleVisor)
    if(jarvisCostumeVisor) jarvisAnimateVisor(jarvisCostumeVisor, t, dt);

    // моргання очей костюма (кіт, пес…)
    if(jarvisCostumeBlinkEyes.length){

        const blinkFactor = 1 - blink*0.85;

        jarvisCostumeBlinkEyes.forEach(function(eye){

            eye.scale.y = jarvisEyeBaseScaleY * blinkFactor;

        });

    }

    // ----- Випадкові «звички», коли нічого не відбувається -----
    if(!act && t > L.nextIdleAction){

        const pool = L.mood === "mood-sleepy"
            ? ["yawn", "lookAround", "think", "hop"]
            : L.mood === "mood-happy"
                ? ["hop", "spin", "wave", "lookAround", "nod"]
                : ["lookAround", "think", "hop", "nod", "wave"];

        if(!calm) jarvisDo(pool[Math.floor(Math.random()*pool.length)]);

        L.nextIdleAction = t + 7 + Math.random()*9;

    }

    // Деталі костюма, що погойдуються (вуха, хвости) і світяться (вогники робота)
    const excited = act && (act.type === "celebrate" || act.type === "hop") ? 1.8 : 1;

    for(const w of jarvisCostumeWiggles){

        w.obj.rotation[w.axis] = w.base + Math.sin(t * w.speed * excited + w.phase) * w.amp * (calm ? 0.4 : 1);

    }

    for(const p of jarvisCostumePulses){

        p.mat.emissiveIntensity = p.base + (Math.sin(t * p.speed + p.phase) * 0.5 + 0.5) * p.amp;

    }

    if(jarvisAccessory){

        if(jarvisAccessoryType === "crown") jarvisAccessory.rotation.y += dt*0.6;
        else jarvisAccessory.rotation.z += dt*0.5;

    }

    jarvisRenderer.render(jarvisScene, jarvisCamera);

}

// ----------------
// Маска робота: натискання відкриває/закриває, стан запам'ятовується
// ----------------

function jarvisVisorSavedClosed(){

    try{ return localStorage.getItem("jarvisVisor") === "closed"; }catch(e){ return false; }

}

// Пружне згасання з легким «перельотом» — як механізм, що клацає на місце
function jarvisEaseOutBack(p, k){

    const c1 = k || 1.4, c3 = c1 + 1;

    return 1 + c3*Math.pow(p - 1, 3) + c1*Math.pow(p - 1, 2);

}

function jarvisEaseInOut(p){

    return p < 0.5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3)/2;

}

function jarvisAnimateVisor(V, t, dt){

    if(V.anim){

        const A = V.anim;
        const p = Math.min(1, (t - A.start) / A.dur);

        if(A.closing){

            // закривання: короткий ривок угору («звільнення засувки»), потім опускається й клацає з пружинкою
            const lift = 0.12;
            const k = p < 0.18
                ? -lift * jarvisEaseInOut(p/0.18)
                : -lift + (A.to - A.from + lift) * jarvisEaseOutBack((p - 0.18)/0.82, 1.1);

            V.cur = A.from + k;

        }else{

            // відкривання: невелике «підтискання» вниз, потім плавно їде вгору по шолому з м'яким перельотом
            const press = 0.05;
            const k = p < 0.15
                ? press * jarvisEaseInOut(p/0.15)
                : press + (A.to - A.from - press) * jarvisEaseOutBack((p - 0.15)/0.85, 0.9);

            V.cur = A.from + k;

        }

        if(p >= 1){

            V.cur = A.to;
            V.anim = null;

        }

    }

    V.pivot.rotation.x = V.cur;

    // Прорізи «очей» спалахують, коли маска закрита, і гаснуть, коли відкрита.
    // Коли Джарвіз говорить у масці — блимають у такт «складам».
    const shut = V.isClosed && !V.anim;
    let target = shut ? 1 : (V.isClosed ? 0.25 : 0);

    if(shut && t < jarvisLive.talkingUntil) target = 0.6 + Math.abs(Math.sin(t*13) * Math.sin(t*4.7 + 0.6)) * 0.9;

    V.glowLevel = jarvisLerp(V.glowLevel, target, Math.min(1, dt * (target > V.glowLevel ? 5 : 9)));
    V.glow.emissiveIntensity = 0.05 + V.glowLevel * (1.5 + Math.sin(t*2.4) * 0.25);

}

// Короткий механічний звук «пш-клац» (без файлів, через Web Audio)
function jarvisVisorSound(closing){

    try{

        const AC = window.AudioContext || window.webkitAudioContext;

        if(!AC) return;

        const vol = (typeof notifyVolume === "number" ? notifyVolume : 70) / 100 * 0.18;

        if(vol <= 0) return;

        const ctx = jarvisVisorSound.ctx || (jarvisVisorSound.ctx = new AC());
        const now = ctx.currentTime;

        // «пш»: шум крізь смуговий фільтр
        const len = Math.floor(ctx.sampleRate * 0.22);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);

        for(let i = 0; i < len; i++) data[i] = (Math.random()*2 - 1) * Math.pow(1 - i/len, 2);

        const noise = ctx.createBufferSource();
        const band = ctx.createBiquadFilter();
        const g1 = ctx.createGain();

        noise.buffer = buf;
        band.type = "bandpass";
        band.frequency.setValueAtTime(closing ? 2600 : 1400, now);
        band.frequency.exponentialRampToValueAtTime(closing ? 900 : 3200, now + 0.2);
        g1.gain.setValueAtTime(vol, now);

        noise.connect(band).connect(g1).connect(ctx.destination);
        noise.start(now);

        // «клац» у момент, коли маска стає на місце
        const osc = ctx.createOscillator();
        const g2 = ctx.createGain();
        const at = now + (closing ? 0.42 : 0.1);

        osc.type = "square";
        osc.frequency.setValueAtTime(closing ? 180 : 320, at);
        g2.gain.setValueAtTime(0, at);
        g2.gain.linearRampToValueAtTime(vol*0.8, at + 0.005);
        g2.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);

        osc.connect(g2).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.1);

    }catch(e){

        // звук не критичний
    }

}

// Повертає true, якщо натискання «з'їла» маска (тобто зараз костюм робота)
function jarvisToggleVisor(){

    const V = jarvisCostumeVisor;

    if(!V) return false;

    const closing = !V.isClosed;

    V.isClosed = closing;
    V.anim = { from: V.cur, to: closing ? V.closed : V.open, start: jarvisClock, dur: closing ? 0.62 : 0.72, closing };

    try{ localStorage.setItem("jarvisVisor", closing ? "closed" : "open"); }catch(e){}

    jarvisVisorSound(closing);

    if(typeof haptic === "function") haptic(closing ? [12, 40, 20] : 15);

    // реакція: закрив — киває «готовий», відкрив — кліпає й махає
    if(closing){

        jarvisDo("nod", 0.8);

    }else{

        jarvisLive.blinkStart = jarvisClock + 0.5;
        jarvisLive.doubleBlink = true;
        setTimeout(()=> jarvisDo("wave"), 450);

    }

    return true;

}

// Утримання на Джарвізові відкриває чат (для робота натискання зайняте маскою)
let jarvisLongPressFired = false;

function jarvisConsumeLongPress(){

    const fired = jarvisLongPressFired;

    jarvisLongPressFired = false;

    return fired;

}

function jarvisBindLongPress(){

    const el = document.getElementById("jarvisWidget");

    if(!el) return;

    let timer = null;

    const clear = ()=>{ if(timer){ clearTimeout(timer); timer = null; } };

    el.addEventListener("pointerdown", ()=>{

        clear();
        jarvisLongPressFired = false;

        timer = setTimeout(()=>{

            timer = null;

            if(!jarvisCostumeVisor) return;   // для інших костюмів натискання й так відкриває чат

            jarvisLongPressFired = true;

            if(typeof haptic === "function") haptic(25);
            if(typeof openJarvisChat === "function") openJarvisChat();

        }, 480);

    });

    ["pointerup", "pointercancel", "pointerleave"].forEach(ev => el.addEventListener(ev, clear));

    // контекстне меню при довгому натисканні на телефоні не потрібне
    el.addEventListener("contextmenu", e => e.preventDefault());

}

function jarvisTapSpin(){

    jarvisSpinBoost = 1;

    jarvisDo(Math.random() < 0.5 ? "wave" : "hop");

}

function updateJarvis3DMood(){

    const mood = typeof getCompanionMoodClass === "function" ? getCompanionMoodClass() : "";

    jarvisLive.mood = mood;

    if(!jarvisEye) return;

    if(mood === "mood-happy"){

        jarvisEye.material.emissive.set(0xfacc15);
        jarvisEye.material.emissiveIntensity = 0.5;

    }else{

        jarvisEye.material.emissive.set(0x0f172a);
        jarvisEye.material.emissiveIntensity = 0.3;

    }

    // Око більше не сплющується — настрій показують повіки (див. animateJarvis3D)
    jarvisEyeBaseScaleY = 1;

}

// Прибрана з моделі частина (аксесуар, костюм) лишала геометрії й матеріали у відеопам'яті
// при кожній зміні скіна — звільняємо їх явно.
function disposeJarvisObject(obj){

    if(!obj || typeof obj.traverse !== "function") return;

    obj.traverse(function(node){

        if(node.geometry && typeof node.geometry.dispose === "function") node.geometry.dispose();

        const mats = node.material ? (Array.isArray(node.material) ? node.material : [node.material]) : [];

        mats.forEach(function(m){

            if(m && typeof m.dispose === "function") m.dispose();

        });

    });

}

function updateJarvis3DAccessory(){

    if(!jarvisScene) return;

    if(jarvisAccessory){

        disposeJarvisObject(jarvisAccessory);
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

    if(jarvisArmMeshL) jarvisArmMeshL.userData.mat.color.setHex(skin.color);
    if(jarvisArmMeshR) jarvisArmMeshR.userData.mat.color.setHex(skin.color);
    if(jarvisLegL) jarvisLegL.material.color.setHex(skin.color);
    if(jarvisLegR) jarvisLegR.material.color.setHex(skin.color);
    if(jarvisLidTop) jarvisLidTop.material.color.setHex(skin.color);
    if(jarvisLidBottom) jarvisLidBottom.material.color.setHex(skin.color);
    if(jarvisNose) jarvisNose.userData.mat.color.setHex(skin.color).multiplyScalar(0.86);

}

function selectJarvisSkin(id){

    const skin = jarvisSkins.find(s=>s.id===id);

    if(!skin) return;

    if(!jarvisSkinUnlocked(skin)){

        showToast(skin.season
            ? "🔒 Нагорода за пройдений сезон «"+skin.season+"»"
            : "🔒 Розблокується на рівні "+skin.unlockLevel);

        return;

    }

    jarvisSkinId = id;

    localStorage.setItem("jarvisSkin", id);

    applyJarvisSkin();

    // Вушка й хвіст котика — кольору шерсті, тож костюм перебудовуємо
    if(jarvisCostumeId === "cat") applyJarvisCostume();

    renderJarvisSkinPicker();

    showToast("✨ Скін застосовано: "+skin.name);

}

function renderJarvisSkinPicker(){

    const container = document.getElementById("jarvisSkinPicker");

    if(!container) return;

    container.innerHTML = "";

    jarvisSkins.forEach(skin=>{

        const unlocked = jarvisSkinUnlocked(skin);

        const div = document.createElement("div");

        div.className = "skin-swatch" + (skin.id===jarvisSkinId ? " active" : "") + (unlocked ? "" : " locked");
        div.style.background = "#"+skin.color.toString(16).padStart(6,"0");

        if(unlocked){

            div.innerText = skin.id===jarvisSkinId ? "✓" : "";
            div.onclick = ()=> selectJarvisSkin(skin.id);
            div.title = skin.name;

        }else{

            div.innerText = "🔒";
            div.title = skin.season ? skin.name+" — нагорода сезону «"+skin.season+"»" : skin.name+" — рівень "+skin.unlockLevel;
            div.onclick = ()=> selectJarvisSkin(skin.id);

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
let jarvisCostumeArmL = null;
let jarvisCostumeArmR = null;
let jarvisCostumeLegL = null;
let jarvisCostumeLegR = null;

// ----------------
// Інструменти для мультяшних костюмів.
// Тіло Джарвіза — капсула: радіус 0.62, циліндр y ∈ [-0.35, 0.35], півсфери з центрами (0, ±0.35, 0).
// Око — y ≈ 0…0.61 спереду, рот — y ≈ -0.25…-0.47 (коли відкритий), тож одяг спереду починається нижче -0.54.
// Усе з гладких форм з великою кількістю сегментів — без «сходинок» і коробок.
// Одяг завжди має рукави й штани — тоді він читається як костюм, а не як «спідниця».
// ----------------

const JC = { R:0.62, HALF:0.35 };
const J_UP = new THREE.Vector3(0, 1, 0);
const J_FACE_BOTTOM = -0.54;

function cMat(color, opts){

    return new THREE.MeshPhysicalMaterial(Object.assign({
        color: color,
        roughness: 0.48,
        metalness: 0.0,
        clearcoat: 0.45,
        clearcoatRoughness: 0.35,
        side: THREE.DoubleSide
    }, opts || {}));

}

function cMetal(color, opts){

    return cMat(color, Object.assign({ metalness: 0.3, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15 }, opts || {}));

}

function cGlow(color, intensity){

    return new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: intensity || 1, roughness: 0.3 });

}

function jBodyRadiusAt(y, R){

    R = R || JC.R;

    const over = Math.abs(y) - JC.HALF;

    return over <= 0 ? R : Math.sqrt(Math.max(0, R*R - over*over));

}

// Точка на поверхні тіла: theta — кут від фронту (+z) у бік +x
function jSurf(theta, y, out){

    const r = jBodyRadiusAt(y, JC.R + (out || 0));

    return new THREE.Vector3(Math.sin(theta)*r, y, Math.cos(theta)*r);

}

function jNormal(p){

    const c = new THREE.Vector3(0, Math.max(-JC.HALF, Math.min(JC.HALF, p.y)), 0);

    return p.clone().sub(c).normalize();

}

function jHead(dir, out){

    return new THREE.Vector3(0, JC.HALF, 0).add(dir.clone().normalize().multiplyScalar(JC.R + (out || 0)));

}

// Оболонка, що облягає тіло: від yBottom до yTop, сектор phiStart…phiStart+phiLength (0 — фронт)
function jShell(mat, R, yTop, yBottom, phiStart, phiLength){

    const pts = [];
    const steps = 48;

    for(let i = 0; i <= steps; i++){

        const y = yBottom + (yTop - yBottom) * (i/steps);

        pts.push(new THREE.Vector2(Math.max(0.0001, jBodyRadiusAt(y, R)), y));

    }

    return new THREE.Mesh(new THREE.LatheGeometry(pts, 96, phiStart || 0, phiLength === undefined ? Math.PI*2 : phiLength), mat);

}

function jBelt(mat, y, out, tube){

    const r = jBodyRadiusAt(y, JC.R + (out || 0));
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube || 0.04, 20, 128), mat);

    m.rotation.x = Math.PI/2;
    m.position.y = y;

    return m;

}

// Гладка трубка, що звужується: радіус r0 → r1
function jTaper(points, r0, r1, mat, tubular, radial){

    tubular = tubular || 48;
    radial = radial || 20;

    const curve = new THREE.CatmullRomCurve3(points);
    const frames = curve.computeFrenetFrames(tubular, false);
    const pos = [], nor = [], idx = [];

    for(let i = 0; i <= tubular; i++){

        const u = i / tubular;
        const P = curve.getPointAt(u);
        const N = frames.normals[i];
        const B = frames.binormals[i];
        const r = r0 + (r1 - r0) * u;

        for(let j = 0; j <= radial; j++){

            const v = j / radial * Math.PI * 2;
            const nx = Math.cos(v)*N.x + Math.sin(v)*B.x;
            const ny = Math.cos(v)*N.y + Math.sin(v)*B.y;
            const nz = Math.cos(v)*N.z + Math.sin(v)*B.z;

            pos.push(P.x + nx*r, P.y + ny*r, P.z + nz*r);
            nor.push(nx, ny, nz);

        }

    }

    for(let i = 0; i < tubular; i++){

        for(let j = 0; j < radial; j++){

            const a = i*(radial+1) + j, b = (i+1)*(radial+1) + j;

            idx.push(a, b, a+1, b, b+1, a+1);

        }

    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    geo.setIndex(idx);

    const g = new THREE.Group();

    g.add(new THREE.Mesh(geo, mat));

    const capA = new THREE.Mesh(new THREE.SphereGeometry(r0, radial, 12), mat);
    capA.position.copy(points[0]);
    g.add(capA);

    const capB = new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.004, r1), radial, 12), mat);
    capB.position.copy(curve.getPointAt(1));
    g.add(capB);

    return g;

}

// Кант уздовж поверхні тіла: вертикальний (по краю розрізу) на куті theta
function jEdgeTrim(mat, theta, yTop, yBottom, out, r){

    const pts = [];

    for(let i = 0; i <= 16; i++){

        pts.push(jSurf(theta, yTop + (yBottom - yTop)*(i/16), out));

    }

    return jTaper(pts, r, r, mat, 64, 12);

}

// Кант по колу на висоті y від кута a0 до a1
function jRingTrim(mat, y, a0, a1, out, r){

    const pts = [];

    for(let i = 0; i <= 48; i++){

        pts.push(jSurf(a0 + (a1 - a0)*(i/48), y, out));

    }

    return jTaper(pts, r, r, mat, 128, 12);

}

function jSphere(mat, r, pos, scale){

    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), mat);

    if(pos) m.position.copy(pos);
    if(scale) m.scale.set(scale[0], scale[1], scale[2]);

    return m;

}

// Пласка пляма на поверхні (латки, животик, рум'янець)
function jPatch(mat, pos, size, flat, stretchX, stretchY){

    const m = jSphere(mat, size, pos, [stretchX || 1, stretchY || 1, flat || 0.22]);

    m.lookAt(pos.clone().add(jNormal(pos)));

    return m;

}

function jAlign(obj, dir){

    obj.quaternion.setFromUnitVectors(J_UP, dir.clone().normalize());

    return obj;

}

// Плавний профіль вушка: широка основа → закруглений кінчик
function jEarGeo(radius, height, roundness){

    const pts = [];
    const steps = 28;

    for(let i = 0; i <= steps; i++){

        const t = i/steps;
        const x = radius * Math.pow(1 - Math.pow(t, roundness || 1.7), 0.85);

        pts.push(new THREE.Vector2(Math.max(0.0001, x), height * t));

    }

    return new THREE.LatheGeometry(pts, 64);

}

function jWiggle(obj, axis, amp, speed, phase){

    jarvisCostumeWiggles.push({ obj, axis, amp, speed, phase: phase || 0, base: obj.rotation[axis] });

}

function jPulse(mat, base, amp, speed, phase){

    jarvisCostumePulses.push({ mat, base, amp, speed, phase: phase || 0 });

}

function jSkinHex(){

    const skin = jarvisSkins.find(s=>s.id===jarvisSkinId) || jarvisSkins[0];

    return skin.color;

}

// ----- Деталі для рук і ніг (у системі шарніра плеча / ноги) -----

function jGlove(mat, scale){

    return jSphere(mat, 0.128, new THREE.Vector3(0, JARVIS_HAND_Y, 0.01), scale || [1, 0.96, 1.06]);

}

// Рукав на плечі + манжет
function jSleeve(mat, cuffMat){

    const g = new THREE.Group();
    const sleeve = new THREE.Mesh(new THREE.CapsuleGeometry(0.114, 0.17, 10, 24), mat);

    sleeve.position.y = -0.15;
    g.add(sleeve);

    if(cuffMat){

        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.03, 16, 48), cuffMat);

        cuff.rotation.x = Math.PI/2;
        cuff.position.y = -0.29;
        g.add(cuff);

    }

    return g;

}

// Штанина на нозі (видима частина ноги під тілом)
function jPants(mat){

    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.108, 0.1, 10, 24), mat);

    m.position.y = -0.03;

    return m;

}

function jShoe(mat, cuffMat){

    const g = new THREE.Group();

    g.add(jSphere(mat, 0.13, new THREE.Vector3(0, -0.17, 0.05), [1, 0.72, 1.35]));

    if(cuffMat){

        const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.035, 16, 48), cuffMat);

        cuff.rotation.x = Math.PI/2;
        cuff.position.y = -0.08;
        g.add(cuff);

    }

    return g;

}

function jLimbs(sleeveMat, cuffMat, gloveMat){

    const arm = ()=>{

        const g = new THREE.Group();

        if(sleeveMat) g.add(jSleeve(sleeveMat, cuffMat));
        if(gloveMat) g.add(jGlove(gloveMat));

        return g;

    };

    return { armL: arm(), armR: arm() };

}

function jLegs(pantsMat, shoeMat, shoeCuffMat){

    const leg = ()=>{

        const g = new THREE.Group();

        if(pantsMat) g.add(jPants(pantsMat));
        if(shoeMat) g.add(jShoe(shoeMat, shoeCuffMat));

        return g;

    };

    return { legL: leg(), legR: leg() };

}

// Розкльошена спідничка зі складками: від талії yTop до подолу yBottom
function jSkirt(mat, yTop, yBottom, flare, pleats){

    const rTop = jBodyRadiusAt(yTop, JC.R + 0.02);
    const segU = 192, segV = 16;
    const pos = [], idx = [];

    const at = (a, v)=>{

        const y = yTop + (yBottom - yTop)*v;
        const r = (rTop + flare*Math.pow(v, 1.2)) * (1 + 0.05*v*Math.cos(pleats*a));

        return new THREE.Vector3(Math.sin(a)*r, y, Math.cos(a)*r);

    };

    for(let i = 0; i <= segU; i++){

        for(let j = 0; j <= segV; j++){

            const p = at(i/segU*Math.PI*2, j/segV);

            pos.push(p.x, p.y, p.z);

        }

    }

    for(let i = 0; i < segU; i++){

        for(let j = 0; j < segV; j++){

            const a = i*(segV+1) + j, b = (i+1)*(segV+1) + j;

            idx.push(a, b, a+1, b, b+1, a+1);

        }

    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const g = new THREE.Group();

    g.add(new THREE.Mesh(geo, mat));
    g.userData.at = at;

    return g;

}

// Поля треуголки: кільце, загнуте вгору трьома кутами
function jTricornBrim(mat){

    const inner = 0.36, outer = 0.7;
    const segU = 192, segV = 10;
    const pos = [], idx = [];

    for(let i = 0; i <= segU; i++){

        const a = i/segU * Math.PI*2;
        const corner = Math.pow(Math.max(0, Math.cos(3*(a - Math.PI))), 2);
        const rOut = outer * (1 - 0.13*(1 - corner));

        for(let j = 0; j <= segV; j++){

            const v = j/segV;
            const r = inner + (rOut - inner)*v;
            const up = Math.pow(v, 1.6) * (0.3 - corner*0.2);

            pos.push(Math.sin(a)*r, up, Math.cos(a)*r);

        }

    }

    for(let i = 0; i < segU; i++){

        for(let j = 0; j < segV; j++){

            const p = i*(segV+1) + j, q = (i+1)*(segV+1) + j;

            idx.push(p, q, p+1, q, q+1, p+1);

        }

    }

    const geo = new THREE.BufferGeometry();

    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    return new THREE.Mesh(geo, mat);

}

// ----------------
// 🏴‍☠️ Пірат-капітан: треуголка з черепом, червоний камзол із золотим кантом і ґудзиками,
// сорочка з жабо, пояс із пряжкою, рукави з манжетами, штани, чоботи й шабля
// ----------------

function buildPirateCostume(){

    const body = new THREE.Group();

    const hatMat = cMat(0x1f2937, { roughness: 0.6 });
    const goldMat = cMetal(0xfbbf24);
    const bandMat = cMat(0xdc2626);
    const boneMat = cMat(0xfffbeb);
    const coatMat = cMat(0x991b1b, { roughness: 0.55 });
    const shirtMat = cMat(0xfafafa);
    const beltMat = cMat(0x1c1917, { clearcoat: 0.8, roughness: 0.3 });
    const pantsMat = cMat(0xf5ecd7, { roughness: 0.6 });

    // Треуголка
    const hat = new THREE.Group();

    hat.position.set(0, 0.84, 0.02);
    hat.rotation.set(-0.1, 0, 0.08);
    body.add(hat);

    const crownGeo = new THREE.SphereGeometry(0.4, 64, 32, 0, Math.PI*2, 0, Math.PI/2);

    crownGeo.scale(1, 1.25, 0.95);
    hat.add(new THREE.Mesh(crownGeo, hatMat));
    hat.add(jTricornBrim(hatMat));

    const edge = [];

    for(let i = 0; i <= 96; i++){

        const a = i/96 * Math.PI*2;
        const corner = Math.pow(Math.max(0, Math.cos(3*(a - Math.PI))), 2);
        const r = 0.7 * (1 - 0.13*(1 - corner));

        edge.push(new THREE.Vector3(Math.sin(a)*r, 0.3 - corner*0.2, Math.cos(a)*r));

    }

    hat.add(jTaper(edge, 0.016, 0.016, goldMat, 192, 10));

    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.07, 96, 1, true), bandMat);

    band.position.y = 0.035;
    hat.add(band);

    // Череп і кісточки на капелюсі
    const skull = new THREE.Group();

    skull.position.set(0, 0.24, 0.4);
    skull.rotation.x = -0.55;
    skull.scale.setScalar(1.25);
    hat.add(skull);

    skull.add(jSphere(boneMat, 0.075, new THREE.Vector3(0, 0.01, 0.02), [1, 0.95, 0.7]));
    skull.add(jSphere(boneMat, 0.045, new THREE.Vector3(0, -0.055, 0.025), [1, 0.7, 0.6]));

    const socketMat = cMat(0x111827);

    skull.add(jSphere(socketMat, 0.018, new THREE.Vector3(-0.026, 0.015, 0.07)));
    skull.add(jSphere(socketMat, 0.018, new THREE.Vector3(0.026, 0.015, 0.07)));

    [-1, 1].forEach(s=>{

        const bone = jTaper([new THREE.Vector3(-0.11*s, -0.09, 0), new THREE.Vector3(0.11*s, 0.09, 0)], 0.014, 0.014, boneMat, 8, 12);

        bone.add(jSphere(boneMat, 0.022, new THREE.Vector3(-0.11*s, -0.09, 0)));
        bone.add(jSphere(boneMat, 0.022, new THREE.Vector3(0.11*s, 0.09, 0)));
        bone.position.z = -0.02;
        skull.add(bone);

    });

    // Сорочка спереду і жабо під усмішкою
    body.add(jShell(shirtMat, JC.R + 0.012, J_FACE_BOTTOM, -0.975, -0.75, 1.5));

    [[-0.58, 0.13], [-0.65, 0.115], [-0.72, 0.1]].forEach(([y, w])=>{

        body.add(jPatch(shirtMat, jSurf(0, y, 0.03), w, 0.35, 1.25, 0.55));

    });

    // Камзол: відкритий спереду, з золотим кантом по краях, коміром і подолом
    const gap = 0.62;
    const coatTop = 0.14;

    body.add(jShell(coatMat, JC.R + 0.035, coatTop, -0.975, gap, Math.PI*2 - gap*2));

    [-1, 1].forEach(s=>{

        body.add(jEdgeTrim(goldMat, s*gap, coatTop, -0.93, 0.04, 0.022));

        // золоті ґудзики вздовж краю
        [-0.05, -0.25, -0.45, -0.65].forEach(y => body.add(jSphere(goldMat, 0.032, jSurf(s*(gap + 0.15), y, 0.05))));

    });

    body.add(jRingTrim(coatMat, coatTop, gap, Math.PI*2 - gap, 0.05, 0.05));
    body.add(jRingTrim(goldMat, -0.9, gap, Math.PI*2 - gap, 0.04, 0.02));

    // Пояс із квадратною пряжкою — лише спереду, поверх сорочки
    body.add(jShell(beltMat, JC.R + 0.03, -0.74, -0.82, -0.8, 1.6));

    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 12, 4), goldMat);

    buckle.position.copy(jSurf(0, -0.78, 0.055));
    buckle.rotation.set(-0.35, 0, Math.PI/4);
    body.add(buckle);

    // Рукави камзола з золотими манжетами, шабля в правій руці
    const limbs = jLimbs(coatMat, goldMat, null);

    const steel = cMetal(0xe5e7eb, { roughness: 0.18 });
    const grip = cMat(0x78350f);

    limbs.armR.add(jTaper([new THREE.Vector3(0, JARVIS_HAND_Y, -0.06), new THREE.Vector3(0, JARVIS_HAND_Y, 0.08)], 0.03, 0.03, grip, 8, 14));

    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.016, 12, 40), goldMat);

    guard.position.set(0, JARVIS_HAND_Y, 0.1);
    limbs.armR.add(guard);

    const blade = jTaper([
        new THREE.Vector3(0, JARVIS_HAND_Y, 0.11),
        new THREE.Vector3(0, JARVIS_HAND_Y + 0.05, 0.38),
        new THREE.Vector3(0, JARVIS_HAND_Y + 0.17, 0.6)
    ], 0.034, 0.008, steel, 32, 16);

    blade.scale.x = 0.32;
    limbs.armR.add(blade);

    const legs = jLegs(pantsMat, cMat(0x111827, { clearcoat: 0.8, roughness: 0.3 }), cMat(0x92400e));

    return Object.assign({ body }, limbs, legs);

}

// ----------------
// 🐶 Песик: стоячі вушка, плямка на голові, носик, язичок, світлий животик, хвостик і кісточка
// ----------------

function buildDogCostume(){

    const body = new THREE.Group();

    const furMat = cMat(0x92582a, { roughness: 0.62, clearcoat: 0.15 });
    const darkFur = cMat(0x6b3f1d, { roughness: 0.65, clearcoat: 0.1 });
    const creamMat = cMat(0xfdf2dc, { roughness: 0.7, clearcoat: 0.1 });
    const innerEar = cMat(0xf5c9a8, { roughness: 0.6 });
    const noseMat = cMat(0x111111, { clearcoat: 1, roughness: 0.15 });

    // Стоячі закруглені вушка на маківці
    [-1, 1].forEach(s=>{

        const ear = new THREE.Group();

        ear.position.copy(jHead(new THREE.Vector3(s*0.52, 0.83, 0.05), -0.06));
        jAlign(ear, new THREE.Vector3(s*0.58, 0.8, 0.02));
        body.add(ear);

        const outer = new THREE.Mesh(jEarGeo(0.19, 0.4, 2.4), darkFur);

        outer.scale.z = 0.55;
        ear.add(outer);

        const inner = new THREE.Mesh(jEarGeo(0.12, 0.29, 2.4), innerEar);

        inner.scale.z = 0.35;
        inner.position.set(0, 0.04, 0.06);
        ear.add(inner);

        // кінчик трохи загинається вперед — мило й «по-цуценячому»
        jWiggle(ear, "x", 0.07, 2.8, s*1.3);

    });

    // Плямка навколо ока збоку — класичний «песик-плямистик»
    body.add(jPatch(furMat, jHead(new THREE.Vector3(-0.62, 0.45, 0.62), -0.01), 0.24, 0.2));

    // Носик між оком і ротом, з відблиском
    body.add(jSphere(noseMat, 0.075, new THREE.Vector3(0, -0.14, 0.66), [1.25, 0.85, 0.85]));
    body.add(jSphere(cMat(0xffffff), 0.018, new THREE.Vector3(-0.03, -0.115, 0.725)));


    // Джинсові шортики: пояс із ґудзиком, кишеньки, підкочені штанини
    const denim = cMat(0x2563eb, { roughness: 0.7, clearcoat: 0.1 });
    const denimDark = cMat(0x1e40af, { roughness: 0.7, clearcoat: 0.1 });
    const brassMat = cMetal(0xfbbf24);
    const shortsTop = -0.6;

    body.add(jShell(denim, JC.R + 0.03, shortsTop, -0.975));
    body.add(jBelt(denimDark, shortsTop, 0.035, 0.035));
    body.add(jSphere(brassMat, 0.03, jSurf(0, shortsTop - 0.01, 0.075), [1, 1, 0.5]));

    [-1, 1].forEach(s=>{

        body.add(jRingTrim(denimDark, -0.72, s*0.35, s*0.75, 0.04, 0.012));
        body.add(jEdgeTrim(denimDark, s*0.75, shortsTop - 0.04, -0.72, 0.04, 0.012));

    });

    // світлий животик над шортиками
    body.add(jPatch(creamMat, jSurf(0, -0.58, 0.0), 0.11, 0.18, 1.3, 0.5));
    body.add(jPatch(furMat, jSurf(2.2, -0.3, -0.01), 0.24));
    body.add(jPatch(furMat, jSurf(-2.4, 0.05, -0.01), 0.18));

    // Хвостик, що виляє
    const tailPivot = new THREE.Group();

    tailPivot.position.copy(jSurf(Math.PI, -0.55, -0.03));
    body.add(tailPivot);

    tailPivot.add(jTaper([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.02, -0.2),
        new THREE.Vector3(0, 0.18, -0.34),
        new THREE.Vector3(0, 0.36, -0.32)
    ], 0.07, 0.035, furMat));

    jWiggle(tailPivot, "y", 0.55, 9);

    // Лапки і кісточка в лівій лапці
    const limbs = jLimbs(null, null, furMat);
    const bone = new THREE.Group();

    bone.position.set(0, JARVIS_HAND_Y - 0.02, 0.12);
    bone.add(jTaper([new THREE.Vector3(-0.13, 0, 0), new THREE.Vector3(0.13, 0, 0)], 0.028, 0.028, creamMat, 8, 14));

    [-1, 1].forEach(s=>{

        bone.add(jSphere(creamMat, 0.04, new THREE.Vector3(s*0.14, 0.025, 0)));
        bone.add(jSphere(creamMat, 0.04, new THREE.Vector3(s*0.14, -0.025, 0)));

    });

    limbs.armL.add(bone);

    const legs = jLegs(denim, furMat);

    [legs.legL, legs.legR].forEach(leg=>{

        const roll = new THREE.Mesh(new THREE.TorusGeometry(0.108, 0.03, 16, 48), denimDark);

        roll.rotation.x = Math.PI/2;
        roll.position.y = -0.1;
        leg.add(roll);

    });

    return Object.assign({ body, hideNose: true }, limbs, legs);

}

// ----------------
// 🐱 Котик: гострі вушка в колір шерсті, бантик, смужки, рожевий носик, вуса, рум'янець,
// світлий животик, пухнастий хвіст і подушечки на лапках
// ----------------

function buildCatCostume(){

    const body = new THREE.Group();

    const furMat = cMat(jSkinHex(), { roughness: 0.55, clearcoat: 0.3 });
    const innerMat = cMat(0xf9a8d4, { roughness: 0.5 });
    const noseMat = cMat(0xf472b6, { clearcoat: 0.9, roughness: 0.2 });
    const whiskerMat = cMat(0x334155);
    const blushMat = cMat(0xfda4af, { roughness: 0.7, clearcoat: 0 });
    const creamMat = cMat(0xfff7ed, { roughness: 0.7, clearcoat: 0.1 });
    const bowMat = cMat(0xec4899, { clearcoat: 0.9, roughness: 0.25 });
    const stripeMat = cMat(new THREE.Color(jSkinHex()).multiplyScalar(0.75).getHex(), { roughness: 0.55 });

    // Вушка стоять на маківці й вростають основою в голову
    [-1, 1].forEach(s=>{

        const dir = new THREE.Vector3(s*0.5, 0.84, 0.12).normalize();
        const ear = new THREE.Group();

        ear.position.copy(jHead(dir, -0.06));
        jAlign(ear, new THREE.Vector3(s*0.62, 0.8, 0.08));
        body.add(ear);

        const outer = new THREE.Mesh(jEarGeo(0.2, 0.38, 1.6), furMat);

        outer.scale.z = 0.62;
        ear.add(outer);

        const inner = new THREE.Mesh(jEarGeo(0.12, 0.27, 1.6), innerMat);

        inner.scale.z = 0.4;
        inner.position.set(0, 0.04, 0.06);
        ear.add(inner);

        jWiggle(ear, "x", 0.06, 2.4, s*1.7);

    });

    // Бантик біля лівого вушка
    const bow = new THREE.Group();

    bow.position.copy(jHead(new THREE.Vector3(-0.72, 0.66, 0.2), 0.02));
    bow.lookAt(bow.position.clone().add(jNormal(bow.position)));
    body.add(bow);

    [-1, 1].forEach(s=>{

        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.15, 40), bowMat);

        wing.rotation.z = s*Math.PI/2;
        wing.position.x = -s*0.075;
        wing.scale.z = 0.5;
        bow.add(wing);

    });

    bow.add(jSphere(bowMat, 0.036, new THREE.Vector3(0, 0, 0.01)));

    // Смужки на лобі та спинці
    [-0.2, 0, 0.2].forEach(x=>{

        body.add(jPatch(stripeMat, jHead(new THREE.Vector3(x, 0.97, 0.3), -0.012), 0.075 - Math.abs(x)*0.1, 0.18, 0.5, 1.4));

    });

    [-0.1, 0.15, 0.4].forEach(y=>{

        body.add(jPatch(stripeMat, jSurf(Math.PI, y, -0.012), 0.16, 0.18, 1.6, 0.35));

    });

    // Носик, щічки, вуса
    body.add(jSphere(noseMat, 0.055, new THREE.Vector3(0, -0.14, 0.665), [1.35, 0.9, 0.8]));

    [-1, 1].forEach(s=>{

        body.add(jPatch(blushMat, jSurf(s*0.62, -0.22, 0.0), 0.085, 0.25));

        for(let k = 0; k < 3; k++){

            const y0 = -0.18 - k*0.04;
            const start = new THREE.Vector3(s*0.16, y0, 0.625);

            body.add(jTaper([
                start,
                new THREE.Vector3(s*0.36, y0 + 0.02 - k*0.015, 0.62),
                new THREE.Vector3(s*0.58, y0 + 0.06 - k*0.05, 0.5)
            ], 0.011, 0.004, whiskerMat, 20, 8));

        }

    });

    // Пишна рожева спідничка в білий горошок з воланом і бантиком
    const skirtMat = cMat(0xf472b6, { roughness: 0.45, clearcoat: 0.6 });
    const waistY = -0.6;
    const skirt = jSkirt(skirtMat, waistY, -0.92, 0.2, 14);

    body.add(skirt);

    const hem = [];

    for(let i = 0; i <= 140; i++) hem.push(skirt.userData.at(i/140*Math.PI*2, 1));

    body.add(jTaper(hem, 0.028, 0.028, creamMat, 280, 10));

    for(let i = 0; i < 14; i++){

        const a = i/14*Math.PI*2 + (i % 2 ? 0.2 : 0);
        const v = i % 2 ? 0.45 : 0.75;
        const p = skirt.userData.at(a, v);
        const n = new THREE.Vector3(p.x, 0, p.z).normalize();

        const dot = jSphere(creamMat, 0.026, p.clone().add(n.multiplyScalar(0.006)), [1, 1, 0.35]);

        dot.lookAt(dot.position.clone().add(new THREE.Vector3(p.x, 0, p.z)));
        body.add(dot);

    }

    body.add(jBelt(cMat(0xdb2777, { clearcoat: 0.8, roughness: 0.3 }), waistY, 0.035, 0.035));

    const skirtBow = new THREE.Group();

    skirtBow.position.copy(jSurf(0, waistY, 0.07));
    body.add(skirtBow);

    [-1, 1].forEach(s=>{

        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.12, 40), creamMat);

        wing.rotation.z = s*Math.PI/2;
        wing.position.x = -s*0.06;
        wing.scale.z = 0.5;
        skirtBow.add(wing);

    });

    skirtBow.add(jSphere(creamMat, 0.03, new THREE.Vector3(0, 0, 0.01)));

    // світлий животик над спідничкою
    body.add(jPatch(creamMat, jSurf(0, -0.58, 0.0), 0.11, 0.18, 1.3, 0.5));

    // Пухнастий хвіст знаком питання
    const tailPivot = new THREE.Group();

    tailPivot.position.copy(jSurf(Math.PI, -0.62, -0.03));
    body.add(tailPivot);

    tailPivot.add(jTaper([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.12, -0.1, -0.22),
        new THREE.Vector3(0.36, 0.05, -0.32),
        new THREE.Vector3(0.44, 0.38, -0.24),
        new THREE.Vector3(0.3, 0.6, -0.2)
    ], 0.075, 0.06, furMat, 64, 20));

    jWiggle(tailPivot, "z", 0.22, 2.6);

    // Рожеві подушечки на лапках
    const paw = ()=>{

        const g = new THREE.Group();

        g.add(jSphere(innerMat, 0.045, new THREE.Vector3(0, JARVIS_HAND_Y - 0.03, 0.115), [1, 0.8, 0.5]));

        [-1, 0, 1].forEach(k => g.add(jSphere(innerMat, 0.018, new THREE.Vector3(k*0.035, JARVIS_HAND_Y + 0.03 - Math.abs(k)*0.01, 0.12))));

        return g;

    };

    return { body, armL: paw(), armR: paw(), hideNose: true };

}

// ----------------
// 🤖 Робот: броньований костюм власного дизайну — шолом із забралом, що піднімається,
// світні прорізи «очей», нагрудне ядро, наплічники, рукавиці й чоботи з підсвіткою
// ----------------

function buildRobotCostume(){

    const body = new THREE.Group();

    const armor = cMetal(0x1d4ed8, { roughness: 0.25 });
    const silver = cMetal(0xe2e8f0, { roughness: 0.22 });
    const dark = cMetal(0x1e293b, { roughness: 0.35 });
    const cyan = cGlow(0x22d3ee, 1.4);

    // Шолом і забрало — частини сфер. Забрало обертається навколо центру своєї сфери,
    // тому під час відкривання воно плавно ковзає вгору по шолому, а не стирчить пластиною.
    // У Three.js: phi = π/2 — фронт (+z), theta = 0 — верх.
    const helmC = new THREE.Vector3(0, 0.27, 0), helmR = 0.72;
    const visorC = new THREE.Vector3(0, 0.2, 0), visorR = 0.82;
    const win = 0.96;                      // пів-ширина вікна обличчя
    const capTheta = 0.87;                 // нижній край суцільного купола (над оком)
    const backTheta = 2.03;                // низ шолома ззаду (≈ на рівні щік)

    const dome = (mat, c, r, phiStart, phiLen, thStart, thLen)=>{

        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 96, 48, phiStart, phiLen, thStart, thLen), mat);

        m.position.copy(c);

        return m;

    };

    // точка на сфері за (phi, theta) — для кантів
    const onSphere = (c, r, phi, theta)=> new THREE.Vector3(-r*Math.cos(phi)*Math.sin(theta), r*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta)).add(c);

    const latLine = (c, r, theta, p0, p1, mat, tube)=>{

        const pts = [];

        for(let i = 0; i <= 40; i++) pts.push(onSphere(c, r, p0 + (p1 - p0)*(i/40), theta));

        return jTaper(pts, tube, tube, mat, 96, 12);

    };

    const lonLine = (c, r, phi, t0, t1, mat, tube)=>{

        const pts = [];

        for(let i = 0; i <= 24; i++) pts.push(onSphere(c, r, phi, t0 + (t1 - t0)*(i/24)));

        return jTaper(pts, tube, tube, mat, 64, 12);

    };

    const front = Math.PI/2;

    // купол (суцільний) + задня й бічні частини з вікном спереду
    body.add(dome(armor, helmC, helmR, 0, Math.PI*2, 0, capTheta));
    body.add(dome(armor, helmC, helmR, front + win, Math.PI*2 - win*2, capTheta, backTheta - capTheta));

    body.add(latLine(helmC, helmR + 0.005, backTheta, front + win, front + Math.PI*2 - win, dark, 0.028));
    body.add(latLine(helmC, helmR + 0.005, capTheta, front - win, front + win, dark, 0.022));
    body.add(lonLine(helmC, helmR + 0.005, front - win, capTheta, backTheta, dark, 0.022));
    body.add(lonLine(helmC, helmR + 0.005, front + win, capTheta, backTheta, dark, 0.022));

    // гребінь по центру купола
    body.add(lonLine(helmC, helmR + 0.01, front, 0.15, capTheta - 0.05, silver, 0.03));
    body.add(lonLine(helmC, helmR + 0.01, -front, 0.15, 1.6, silver, 0.03));

    // бічні модулі зі світним кільцем
    [-1, 1].forEach(s=>{

        const pod = new THREE.Group();

        pod.position.set(s*(helmR + 0.02), helmC.y, 0);
        pod.rotation.z = s*Math.PI/2;
        body.add(pod);

        pod.add(new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.07, 64), silver));

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 14, 48), cyan);

        ring.rotation.x = Math.PI/2;
        ring.position.y = -s*0.04;
        pod.add(ring);

    });

    // Забрало на шарнірі в центрі своєї сфери
    const visorPivot = new THREE.Group();
    const slitGlow = cGlow(0x22d3ee, 1.6);

    visorPivot.position.copy(visorC);
    body.add(visorPivot);

    const vWin = win + 0.06;
    const vTop = 0.84, vLen = 1.34;      // theta: від ~48° до ~125° (підборіддя над усмішкою)
    const zero = new THREE.Vector3();

    visorPivot.add(dome(silver, zero, visorR, front - vWin, vWin*2, vTop, vLen));

    visorPivot.add(latLine(zero, visorR + 0.006, vTop, front - vWin, front + vWin, armor, 0.02));
    visorPivot.add(latLine(zero, visorR + 0.006, vTop + vLen, front - vWin, front + vWin, armor, 0.022));
    visorPivot.add(lonLine(zero, visorR + 0.006, front - vWin, vTop, vTop + vLen, armor, 0.02));
    visorPivot.add(lonLine(zero, visorR + 0.006, front + vWin, vTop, vTop + vLen, armor, 0.02));

    // світні прорізи «очей» (трохи навскіс), центральна лінія, решітка «рота»
    const eyeTheta = Math.PI/2 - 0.11;

    [-1, 1].forEach(s=>{

        const pts = [
            onSphere(zero, visorR + 0.012, front + s*0.13, eyeTheta + 0.02),
            onSphere(zero, visorR + 0.012, front + s*0.26, eyeTheta),
            onSphere(zero, visorR + 0.012, front + s*0.38, eyeTheta - 0.04)
        ];

        visorPivot.add(jTaper(pts, 0.03, 0.02, slitGlow, 20, 12));

    });

    visorPivot.add(lonLine(zero, visorR + 0.008, front, vTop + 0.02, eyeTheta - 0.12, dark, 0.012));

    [0.33, 0.4].forEach(dt=>{

        visorPivot.add(latLine(zero, visorR + 0.009, Math.PI/2 + dt, front - 0.22, front + 0.22, dark, 0.012));

    });

    jPulse(cyan, 0.8, 1.0, 2.4);

    // Броня тіла: нагрудник із ядром, кант і панелі
    body.add(jShell(armor, JC.R + 0.025, J_FACE_BOTTOM, -0.975));
    body.add(jBelt(cyan, J_FACE_BOTTOM, 0.03, 0.014));
    body.add(jBelt(dark, -0.86, 0.03, 0.03));

    const corePos = jSurf(0, -0.68, 0.035);
    const core = new THREE.Group();

    core.position.copy(corePos);
    core.lookAt(corePos.clone().add(jNormal(corePos)));
    body.add(core);

    const coreGlow = cGlow(0x67e8f9, 1.6);
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 6), coreGlow);

    hex.rotation.x = Math.PI/2;
    core.add(hex);

    const hexRim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.022, 12, 6), silver);

    hexRim.rotation.z = Math.PI/6;
    core.add(hexRim);

    jPulse(coreGlow, 1.0, 1.4, 1.6);

    // Наплічники
    [-1, 1].forEach(s=>{

        body.add(jSphere(armor, 0.17, new THREE.Vector3(s*0.6, 0.14, 0), [1, 0.72, 1]));
        body.add(jSphere(silver, 0.1, new THREE.Vector3(s*0.68, 0.2, 0), [1, 0.5, 1]));

    });

    // Рукавиці зі світною долонею, броньовані штани й чоботи
    const limbs = jLimbs(armor, silver, silver);

    [limbs.armL, limbs.armR].forEach(arm=>{

        arm.add(jSphere(cyan, 0.04, new THREE.Vector3(0, JARVIS_HAND_Y - 0.06, 0.1), [1, 1, 0.4]));

    });

    return Object.assign({
        body,
        visor: (()=>{

            const closed = jarvisVisorSavedClosed();
            const angle = closed ? 0 : -1.38;

            visorPivot.rotation.x = angle;
            slitGlow.emissiveIntensity = closed ? 1.6 : 0.05;

            return { pivot: visorPivot, open: -1.38, closed: 0, cur: angle, isClosed: closed, anim: null, glow: slitGlow, glowLevel: closed ? 1 : 0 };

        })()
    }, limbs, jLegs(armor, silver, cyan));

}

// ----------------
// 🪓 Вікінг: шолом з рогами, руда борода з косичками, хутряний комір і накидка,
// туніка з поясом, рукави з наручами, штани, хутряні чоботи, щит і сокира
// ----------------

function buildVikingCostume(){

    const body = new THREE.Group();

    const helmetMat = cMetal(0x94a3b8);
    const goldMat = cMetal(0xfbbf24);
    const hornMat = cMat(0xfef3c7, { roughness: 0.4 });
    const beardMat = cMat(0xf97316, { roughness: 0.7, clearcoat: 0.1 });
    const furMat = cMat(0xe7d6b8, { roughness: 0.9, clearcoat: 0 });
    const leather = cMat(0x78350f, { roughness: 0.6 });
    const tunicMat = cMat(0x166534, { roughness: 0.65, clearcoat: 0.1 });
    const capeMat = cMat(0x7c2d12, { roughness: 0.75, clearcoat: 0 });
    const pantsMat = cMat(0x57534e, { roughness: 0.7, clearcoat: 0.05 });

    // Шолом
    const helmetAngle = 0.92;

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(JC.R + 0.04, 96, 48, 0, Math.PI*2, 0, helmetAngle), helmetMat);

    helmet.position.y = JC.HALF;
    body.add(helmet);

    const rimY = JC.HALF + (JC.R + 0.04)*Math.cos(helmetAngle);
    const rimR = (JC.R + 0.04)*Math.sin(helmetAngle);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(rimR, 0.045, 20, 128), goldMat);

    rim.rotation.x = Math.PI/2;
    rim.position.y = rimY;
    body.add(rim);

    const ridge = [];

    for(let i = 0; i <= 12; i++){

        const a = -helmetAngle + (i/12)*helmetAngle*2;

        ridge.push(new THREE.Vector3(0, JC.HALF + (JC.R + 0.065)*Math.cos(a), (JC.R + 0.065)*Math.sin(a)));

    }

    body.add(jTaper(ridge, 0.03, 0.03, goldMat, 48, 14));

    for(let i = 0; i < 10; i++){

        const a = i/10 * Math.PI*2;

        body.add(jSphere(goldMat, 0.02, new THREE.Vector3(Math.sin(a)*(rimR + 0.04), rimY, Math.cos(a)*(rimR + 0.04))));

    }

    [-1, 1].forEach(s=>{

        const base = jHead(new THREE.Vector3(s*0.74, 0.66, 0), 0.02);

        body.add(jTaper([
            base,
            base.clone().add(new THREE.Vector3(s*0.18, 0.03, 0)),
            base.clone().add(new THREE.Vector3(s*0.32, 0.18, 0.05)),
            base.clone().add(new THREE.Vector3(s*0.35, 0.42, 0.12))
        ], 0.09, 0.012, hornMat, 48, 24));

    });

    // Туніка (від шиї донизу), кант по подолу й широкий пояс із пряжкою
    body.add(jShell(tunicMat, JC.R + 0.025, J_FACE_BOTTOM, -0.975));
    body.add(jBelt(goldMat, -0.92, 0.03, 0.018));
    body.add(jShell(leather, JC.R + 0.04, -0.66, -0.76));

    const buckle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 12, 40), goldMat);

    buckle.position.copy(jSurf(0, -0.71, 0.065));
    buckle.rotation.x = -0.3;
    body.add(buckle);

    // Хутряний комір на плечах і накидка за спиною з хутряними краями
    const collarArc = Math.PI*2 - 2.3;
    const collarWrap = new THREE.Group();

    collarWrap.rotation.y = Math.PI/2 + collarArc/2;
    collarWrap.position.y = 0.12;
    body.add(collarWrap);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(JC.R + 0.04, 0.085, 24, 128, collarArc), furMat);

    collar.rotation.x = Math.PI/2;
    collarWrap.add(collar);

    [0, collarArc].forEach(a=>{

        collarWrap.add(jSphere(furMat, 0.085, new THREE.Vector3(Math.cos(a)*(JC.R + 0.04), 0, Math.sin(a)*(JC.R + 0.04))));

    });

    const capeA = Math.PI - 1.0;

    body.add(jShell(capeMat, JC.R + 0.06, 0.1, -0.85, capeA, 2.0));
    body.add(jEdgeTrim(furMat, capeA, 0.1, -0.85, 0.07, 0.04));
    body.add(jEdgeTrim(furMat, capeA + 2.0, 0.1, -0.85, 0.07, 0.04));

    // Вуса над усмішкою, борода й косички
    [-1, 1].forEach(s=>{

        body.add(jTaper([
            new THREE.Vector3(0, -0.262, 0.628),
            new THREE.Vector3(s*0.17, -0.285, 0.605),
            new THREE.Vector3(s*0.3, -0.24, 0.52),
            new THREE.Vector3(s*0.34, -0.16, 0.47)
        ], 0.05, 0.018, beardMat, 32, 16));

    });

    body.add(jSphere(beardMat, 1, new THREE.Vector3(0, -0.68, 0.46), [0.36, 0.16, 0.19]));
    body.add(jSphere(beardMat, 1, new THREE.Vector3(0, -0.8, 0.43), [0.24, 0.12, 0.15]));

    [-1, 1].forEach(s=>{

        body.add(jSphere(beardMat, 1, new THREE.Vector3(s*0.31, -0.54, 0.47), [0.13, 0.14, 0.13]));
        body.add(jSphere(beardMat, 1, new THREE.Vector3(s*0.43, -0.34, 0.4), [0.09, 0.14, 0.1]));

        body.add(jTaper([
            new THREE.Vector3(s*0.14, -0.84, 0.48),
            new THREE.Vector3(s*0.16, -0.95, 0.48),
            new THREE.Vector3(s*0.15, -1.04, 0.45)
        ], 0.05, 0.035, beardMat, 24, 16));

        const band = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 10, 32), goldMat);

        band.position.set(s*0.16, -0.94, 0.48);
        band.rotation.x = Math.PI/2;
        body.add(band);

    });

    // Рукави туніки зі шкіряними наручами
    const limbs = jLimbs(tunicMat, leather, null);

    [limbs.armL, limbs.armR].forEach(arm=>{

        const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.112, 0.105, 0.1, 40), leather);

        bracer.position.y = -0.3;
        arm.add(bracer);

    });

    // Щит у лівій руці
    const shield = new THREE.Group();

    shield.position.set(-0.07, JARVIS_HAND_Y + 0.02, 0.04);
    shield.rotation.y = -Math.PI/2 + 0.55;
    shield.scale.setScalar(0.8);
    limbs.armL.add(shield);

    [0xdc2626, 0xfef3c7, 0xdc2626, 0xfef3c7].forEach((c, i)=>{

        const sector = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.045, 32, 1, false, i*Math.PI/2, Math.PI/2), cMat(c, { roughness: 0.55 }));

        sector.rotation.x = Math.PI/2;
        shield.add(sector);

    });

    shield.add(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.03, 16, 96), helmetMat));
    shield.add(jSphere(helmetMat, 0.085, new THREE.Vector3(0, 0, 0.03), [1, 1, 0.6]));

    // Сокира в правій руці
    // Сокира в правій руці — держак угору, лезо над кулаком
    limbs.armR.add(jTaper([
        new THREE.Vector3(0, JARVIS_HAND_Y - 0.12, 0.04),
        new THREE.Vector3(0, JARVIS_HAND_Y + 0.48, 0.12)
    ], 0.026, 0.024, leather, 16, 14));

    const axeHead = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.035, 48, 1, false, 0, Math.PI), cMetal(0xe5e7eb, { roughness: 0.2 }));

    axeHead.rotation.set(0, Math.PI/2, -Math.PI/2);
    axeHead.position.set(0, JARVIS_HAND_Y + 0.38, 0.13);
    limbs.armR.add(axeHead);

    limbs.armR.add(jSphere(cMetal(0x94a3b8), 0.035, new THREE.Vector3(0, JARVIS_HAND_Y + 0.5, 0.12)));

    // Руки більші й трохи відведені від тіла — щит і сокиру добре видно
    return Object.assign({ body, armSwing: 0.6, armScale: 1.3, armRest: 0.42 }, limbs, jLegs(pantsMat, leather, furMat));

}

// ----------------
// 🎩 Смокінг: циліндр, піджак із сорочкою, метелик, ґудзики, вуса, рукави з манжетами,
// штани, рукавички і тростина
// ----------------

function buildTuxedoCostume(){

    const body = new THREE.Group();

    const black = cMat(0x111827, { clearcoat: 0.9, roughness: 0.3 });
    const satin = cMat(0x374151, { clearcoat: 1, roughness: 0.2 });
    const white = cMat(0xfafafa);
    const red = cMat(0xdc2626, { clearcoat: 0.8, roughness: 0.3 });
    const goldMat = cMetal(0xfbbf24);
    const mustacheMat = cMat(0x3f2a1d, { roughness: 0.6 });

    // Циліндр
    const hat = new THREE.Group();

    hat.position.set(0, 0.93, 0);
    hat.rotation.z = -0.12;
    body.add(hat);

    hat.add(new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.035, 96), black));

    const brimRoll = new THREE.Mesh(new THREE.TorusGeometry(0.49, 0.025, 16, 128), black);

    brimRoll.rotation.x = Math.PI/2;
    brimRoll.position.y = 0.01;
    hat.add(brimRoll);

    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.33, 0.46, 96), black);

    crown.position.y = 0.245;
    hat.add(crown);

    const crownTop = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.022, 16, 96), black);

    crownTop.rotation.x = Math.PI/2;
    crownTop.position.y = 0.475;
    hat.add(crownTop);

    const hatBand = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.335, 0.08, 96, 1, true), red);

    hatBand.position.y = 0.07;
    hat.add(hatBand);

    // Сорочка, піджак із розрізом і заокругленими атласними краями
    body.add(jShell(white, JC.R + 0.01, J_FACE_BOTTOM, -0.975, -0.6, 1.2));
    body.add(jShell(black, JC.R + 0.028, J_FACE_BOTTOM, -0.975, 0.5, Math.PI*2 - 1.0));

    [-1, 1].forEach(s => body.add(jEdgeTrim(satin, s*0.5, J_FACE_BOTTOM, -0.96, 0.03, 0.03)));

    body.add(jBelt(satin, J_FACE_BOTTOM, 0.03, 0.035));

    // Метелик
    const bow = new THREE.Group();

    bow.position.copy(jSurf(0, -0.6, 0.06));
    bow.rotation.x = -0.35;
    body.add(bow);

    [-1, 1].forEach(s=>{

        const wing = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.17, 48), red);

        wing.rotation.z = s*Math.PI/2;
        wing.position.x = -s*0.085;
        wing.scale.z = 0.55;
        bow.add(wing);

    });

    bow.add(jSphere(red, 0.04, new THREE.Vector3(0, 0, 0.01), [1, 1, 0.8]));

    [-0.72, -0.84].forEach(y => body.add(jSphere(black, 0.026, jSurf(0, y, 0.015))));

    const pocket = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.09, 24), white);

    pocket.position.copy(jSurf(-0.85, -0.62, 0.05));
    pocket.rotation.set(0, -0.85, Math.PI);
    pocket.scale.z = 0.4;
    body.add(pocket);

    // Закручені вуса над усмішкою
    body.add(jSphere(mustacheMat, 0.04, new THREE.Vector3(0, -0.275, 0.625)));

    [-1, 1].forEach(s=>{

        body.add(jTaper([
            new THREE.Vector3(0, -0.275, 0.63),
            new THREE.Vector3(s*0.15, -0.31, 0.61),
            new THREE.Vector3(s*0.26, -0.27, 0.55),
            new THREE.Vector3(s*0.28, -0.19, 0.51)
        ], 0.04, 0.012, mustacheMat, 32, 16));

    });

    // Рукави з білими манжетами, рукавички, тростина
    const limbs = jLimbs(black, white, white);

    limbs.armR.add(jTaper([
        new THREE.Vector3(0, JARVIS_HAND_Y + 0.06, 0.06),
        new THREE.Vector3(0, JARVIS_HAND_Y - 0.62, 0.1)
    ], 0.022, 0.02, black, 16, 14));
    limbs.armR.add(jSphere(goldMat, 0.05, new THREE.Vector3(0, JARVIS_HAND_Y + 0.1, 0.06)));
    limbs.armR.add(jSphere(goldMat, 0.025, new THREE.Vector3(0, JARVIS_HAND_Y - 0.63, 0.1)));

    return Object.assign({ body }, limbs, jLegs(black, cMat(0x0b0b0f, { clearcoat: 1, roughness: 0.12 }), white));

}

function applyJarvisCostume(){

    if(!jarvisBody) return;

    const detach = (obj, parent)=>{

        if(!obj) return null;

        disposeJarvisObject(obj);

        if(parent) parent.remove(obj);

        return null;

    };

    jarvisCostumeGroup = detach(jarvisCostumeGroup, jarvisBody);
    jarvisCostumeArmL = detach(jarvisCostumeArmL, jarvisArmL);
    jarvisCostumeArmR = detach(jarvisCostumeArmR, jarvisArmR);
    jarvisCostumeLegL = detach(jarvisCostumeLegL, jarvisLegL);
    jarvisCostumeLegR = detach(jarvisCostumeLegR, jarvisLegR);

    if(jarvisLegL){ jarvisLegL.scale.set(1, 1, 1); jarvisLegL.position.y = -0.92; }
    if(jarvisLegR){ jarvisLegR.scale.set(1, 1, 1); jarvisLegR.position.y = -0.92; }

    // Око Джарвіза лишається в усіх костюмах — персонажі схожі між собою
    if(jarvisEyeWhite){

        jarvisEyeWhite.visible = true;
        jarvisEyeWhite.scale.set(1, 1, 1);
        jarvisEyeWhite.position.y = JARVIS_EYE_Y;

    }

    jarvisEyeSizeFactor = 1;
    jarvisCostumeArmSwing = 1;
    jarvisArmRest = JARVIS_ARM_REST;

    if(jarvisArmL) jarvisArmL.scale.setScalar(1);
    if(jarvisArmR) jarvisArmR.scale.setScalar(1);
    if(jarvisNose) jarvisNose.visible = true;

    jarvisTailPivot = null;
    jarvisCostumeBlinkEyes = [];
    jarvisCostumeWiggles = [];
    jarvisCostumePulses = [];
    jarvisCostumeVisor = null;

    const builders = {
        pirate: buildPirateCostume,
        dog: buildDogCostume,
        cat: buildCatCostume,
        robot: buildRobotCostume,
        viking: buildVikingCostume,
        tuxedo: buildTuxedoCostume
    };

    let parts = null;

    try{

        parts = builders[jarvisCostumeId] ? builders[jarvisCostumeId]() : null;

    }catch(e){

        console.error("Jarvis costume:", e);
        parts = null;

    }

    if(!parts){

        updateJarvis3DAccessory();
        return;

    }

    if(parts.body){ jarvisCostumeGroup = parts.body; jarvisBody.add(parts.body); }
    if(parts.armL && jarvisArmL){ jarvisCostumeArmL = parts.armL; jarvisArmL.add(parts.armL); }
    if(parts.armR && jarvisArmR){ jarvisCostumeArmR = parts.armR; jarvisArmR.add(parts.armR); }
    if(parts.legL && jarvisLegL){ jarvisCostumeLegL = parts.legL; jarvisLegL.add(parts.legL); }
    if(parts.legR && jarvisLegR){ jarvisCostumeLegR = parts.legR; jarvisLegR.add(parts.legR); }

    if(parts.armSwing !== undefined) jarvisCostumeArmSwing = parts.armSwing;
    if(parts.armRest !== undefined) jarvisArmRest = parts.armRest;

    if(parts.armScale){

        if(jarvisArmL) jarvisArmL.scale.setScalar(parts.armScale);
        if(jarvisArmR) jarvisArmR.scale.setScalar(parts.armScale);

    }

    if(parts.hideNose && jarvisNose) jarvisNose.visible = false;
    if(parts.visor) jarvisCostumeVisor = parts.visor;

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

    if(id === "robot" && typeof jarvisSay === "function"){

        setTimeout(()=> jarvisSay("Натисни на мене — маска відкриється чи закриється. Утримуй — поговоримо 💬", "point", 7), 600);

    }

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


// ----------------
// Підказки-бульбашки та реакції на дії користувача
// ----------------

const jarvisHints = {
    el: null,
    textEl: null,
    hideTimer: null,
    lastText: "",
    lastShown: 0,
    nextGap: 75,
    dismissed: 0
};

function jarvisHintsEnabled(){

    try{ return localStorage.getItem("jarvisHints") !== "false"; }catch(e){ return true; }

}

function jarvisBubbleBuild(){

    if(jarvisHints.el) return jarvisHints.el;

    const el = document.createElement("div");

    el.id = "jarvisBubble";
    el.className = "jarvis-tip";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");

    const text = document.createElement("button");

    text.type = "button";
    text.className = "jarvis-tip-text";
    text.title = "Поговорити з Джарвізом";

    const close = document.createElement("button");

    close.type = "button";
    close.className = "jarvis-tip-close";
    close.setAttribute("aria-label", "Сховати підказку");
    close.textContent = "✕";

    text.addEventListener("click", ()=>{

        jarvisHideBubble();

        if(typeof openJarvisChat === "function") openJarvisChat();

    });

    close.addEventListener("click", e=>{

        e.stopPropagation();

        jarvisHints.dismissed++;

        jarvisHideBubble();

    });

    el.append(text, close);
    document.body.appendChild(el);

    jarvisHints.el = el;
    jarvisHints.textEl = text;

    return el;

}

function jarvisPositionBubble(){

    const el = jarvisHints.el;
    const w = document.getElementById("jarvisWidget");

    if(!el || !w) return;

    const r = w.getBoundingClientRect();

    el.style.left = Math.max(8, r.left + r.width*0.45) + "px";
    el.style.bottom = Math.max(8, window.innerHeight - r.top - 4) + "px";

}

function jarvisBusyElsewhere(){

    return document.hidden
        || document.body.classList.contains("sheet-open")
        || !!document.querySelector(".jarvis-chat-modal.show, .level-scene.show, .achievement-modal.show, .more-menu.show, .fn-modal.show");

}

// text — що сказати; action — жест (point, wave, celebrate, think, nod, yawn)
function jarvisSay(text, action, seconds){

    if(!text) return;

    const el = jarvisBubbleBuild();

    jarvisHints.textEl.textContent = text;
    jarvisHints.lastText = text;
    jarvisHints.lastShown = jarvisClock;

    jarvisPositionBubble();

    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");

    const talk = Math.min(3.2, 0.8 + text.length * 0.045);

    jarvisSetTalking(talk);
    jarvisDo(action || "point");

    clearTimeout(jarvisHints.hideTimer);

    jarvisHints.hideTimer = setTimeout(jarvisHideBubble, (seconds || Math.max(5, text.length * 0.09)) * 1000);

}

function jarvisHideBubble(){

    if(jarvisHints.el) jarvisHints.el.classList.remove("show");

    clearTimeout(jarvisHints.hideTimer);

}

function jarvisPickHint(list){

    const fresh = list.filter(x => x.text !== jarvisHints.lastText);
    const pool = fresh.length ? fresh : list;

    // Зважений вибір: важливіші підказки випадають частіше
    const total = pool.reduce((sum, x) => sum + (x.w || 1), 0);
    let r = Math.random() * total;

    for(const x of pool){

        r -= (x.w || 1);

        if(r <= 0) return x;

    }

    return pool[0];

}

function jarvisHintCandidates(){

    const safe = (fn, d) => { try{ const v = fn(); return v === undefined ? d : v; }catch(e){ return d; } };

    const s = typeof jarvisSnapshot === "function" ? jarvisSnapshot() : {
        habitsTodo: [], habitsDone: [], goalsActive: [], streak: 0, xp: 0, pomodorosToday: 0, percent: 0, hour: new Date().getHours()
    };

    const out = [];
    const hour = s.hour;
    const pick = arr => arr[Math.floor(Math.random()*arr.length)];
    const bonusReady = safe(()=> dailyBonusReady && !isDailyBonusClaimedToday(), false);
    const totalItems = s.habitsTodo.length + s.habitsDone.length + s.goalsActive.length;

    if(totalItems === 0){

        out.push({ text:"Додай перше завдання — і почнемо прокачуватись 🙂", action:"point", w:4 });

    }

    if(s.habitsTodo.length){

        const name = pick(s.habitsTodo);

        out.push({ text:"Як щодо «" + name + "»? Почнімо разом 💪", action:"point", w:4 });

    }

    if(s.streak > 0 && s.habitsDone.length === 0 && hour >= 17){

        out.push({ text:"Серія " + s.streak + " 🔥 під загрозою — виконай хоча б одне завдання!", action:"wave", w:6 });

    }

    if(bonusReady){

        out.push({ text:"Усе виконано! Забери бонус +50 XP на головній 🎁", action:"celebrate", w:8 });

    }else if(s.habitsTodo.length && s.habitsTodo.length <= 2 && s.habitsDone.length){

        out.push({ text:"Лишилось " + s.habitsTodo.length + " — і бонус дня твій 🎁", action:"point", w:4 });

    }

    if(100 - s.xp <= 25){

        out.push({ text:"Ще " + (100 - s.xp) + " XP — і новий рівень ⭐", action:"nod", w:3 });

    }

    if(s.pomodorosToday === 0 && hour >= 9 && hour <= 21){

        out.push({ text:"Спробуй 25 хвилин фокусу з Pomodoro 🍅", action:"point", w:2 });

    }

    if(s.goalsActive.length){

        out.push({ text:"Маленький крок до «" + pick(s.goalsActive) + "» сьогодні? 🎯", action:"think", w:2 });

    }

    if(hour >= 23 || hour < 5){

        out.push({ text:"Вже пізно… Сон — теж ціль 😴", action:"yawn", w:5 });

    }

    // Сезон, скриня, план дня, енергія — підказки з funnel.js
    if(typeof funnelHints === "function") out.push(...safe(funnelHints, []));

    out.push(
        { text:"Склянка води — і мозок працює краще 💧", action:"nod", w:1 },
        { text:"Дві хвилини розминки? Потягнись разом зі мною 🙆", action:"yawn", w:1 },
        { text:"Натисни на мене — можемо поговорити 🤖", action:"wave", w:1 },
        { text:"Маленькі кроки щодня → великий результат 📈", action:"think", w:1 }
    );

    return out;

}

function jarvisShowHint(){

    if(!jarvisHintsEnabled() || jarvisBusyElsewhere()) return false;

    const hint = jarvisPickHint(jarvisHintCandidates());

    if(!hint) return false;

    jarvisSay(hint.text, hint.action);

    return true;

}

// Реакції на події застосунку: виконав завдання, ціль, новий рівень, перейшов на сторінку
function jarvisReact(type){

    if(!jarvisScene) return;

    const pick = arr => arr[Math.floor(Math.random()*arr.length)];

    if(type === "done"){

        jarvisDo(Math.random() < 0.5 ? "celebrate" : "hop");

        if(Math.random() < 0.35 && !jarvisBusyElsewhere()){

            jarvisSay(pick(["Так тримати! 🎉", "Ще одне — і ти на коні 🔥", "Клас! +10 XP 💪", "Бачу прогрес! 👀"]), "nod", 3);

        }

    }else if(type === "goal"){

        jarvisDo("celebrate");

        if(!jarvisBusyElsewhere()) jarvisSay("Ціль виконано! Пишаюсь тобою 🏆", "celebrate", 4);

    }else if(type === "levelup"){

        jarvisDo("celebrate");

    }else if(type === "page"){

        jarvisHideBubble();
        jarvisDo(Math.random() < 0.5 ? "lookAround" : "nod");

    }

}

function jarvisStartHints(){

    // Привітання — раз за сесію, коли все завантажилось
    let greeted = false;

    try{ greeted = sessionStorage.getItem("jarvisGreeted") === "1"; }catch(e){}

    setTimeout(()=>{

        if(!greeted && jarvisHintsEnabled() && !jarvisBusyElsewhere()){

            const text = typeof jarvisGreeting === "function" ? jarvisGreeting() : "Привіт! Я Джарвіз 👋";

            // Привітання з чату може бути довгим — у бульбашці лишаємо перше речення-два
            const short = text.length > 110 ? text.split(/(?<=[.!?…])\s+/).slice(0, 2).join(" ") : text;

            jarvisSay(short, "wave", 6);

            try{ sessionStorage.setItem("jarvisGreeted", "1"); }catch(e){}

        }else{

            jarvisDo("wave");

        }

    }, 2500);

    setInterval(()=>{

        const gap = jarvisHints.nextGap * (jarvisHints.dismissed >= 3 ? 2.5 : 1);

        if(jarvisClock - jarvisHints.lastShown < gap) return;

        if(jarvisShowHint()) jarvisHints.nextGap = 70 + Math.random()*70;

    }, 5000);

    window.addEventListener("resize", jarvisPositionBubble);

    const toggle = document.getElementById("jarvisHintsToggle");

    if(toggle){

        toggle.checked = jarvisHintsEnabled();

        toggle.addEventListener("change", ()=>{

            try{ localStorage.setItem("jarvisHints", toggle.checked ? "true" : "false"); }catch(e){}

            if(toggle.checked) jarvisSay("Дякую! Підказуватиму, коли буде доречно 😊", "wave", 4);
            else jarvisHideBubble();

        });

    }

}

try{

    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", jarvisStartHints);
    else jarvisStartHints();

}catch(e){

    console.error("Jarvis hints init:", e);

}
