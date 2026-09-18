// ----------------
// Джарвіз — чат через Google Gemini
// ----------------

let jarvisChatHistory = [];

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

try{

    setupJarvisKeyboardFix();

}catch(e){

    console.error("Jarvis keyboard fix init:", e);

}

function jarvisWidgetTap(el){

    if(typeof jarvisTapSpin === "function"){

        jarvisTapSpin();

    }

    if(el){

        el.classList.add("tapped");

        setTimeout(()=> el.classList.remove("tapped"), 400);

    }

    openJarvisChat();

}

function openJarvisChat(){

    const modal = document.getElementById("jarvisChatModal");

    if(!modal) return;

    modal.classList.add("show");

    updateJarvisViewportOffset();

    if(jarvisChatHistory.length === 0){

        const phrase = typeof companionPhrases !== "undefined"
            ? companionPhrases[Math.floor(Math.random()*companionPhrases.length)]
            : "Привіт! Чим можу допомогти?";

        addJarvisMessage("bot", phrase);

    }

    const input = document.getElementById("jarvisChatInput");

    if(input) setTimeout(()=> input.focus(), 200);

}

function closeJarvisChat(){

    const modal = document.getElementById("jarvisChatModal");

    if(modal){

        modal.classList.remove("show");
        modal.style.paddingBottom = "";

    }

}

function addJarvisMessage(role, text){

    jarvisChatHistory.push({ role, text });

    const container = document.getElementById("jarvisChatMessages");

    if(!container) return;

    const bubble = document.createElement("div");

    bubble.className = "jarvis-bubble " + (role === "user" ? "user" : "bot");

    bubble.innerText = text;

    container.appendChild(bubble);

    container.scrollTop = container.scrollHeight;

    return bubble;

}

async function sendJarvisMessage(){

    const input = document.getElementById("jarvisChatInput");

    if(!input || input.value.trim()==="") return;

    const userText = input.value.trim();

    input.value = "";

    addJarvisMessage("user", userText);

    const thinkingBubble = addJarvisMessage("bot", "…");

    jarvisChatHistory.pop();

    const result = await askGemini();

    if(result.rateLimited){

        await handleJarvisRateLimit(thinkingBubble, result.waitSeconds);

        return;

    }

    if(thinkingBubble) thinkingBubble.remove();

    addJarvisMessage("bot", result.text);

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

    }else{

        bubble.innerText = retry.text;

    }

    jarvisChatHistory.push({ role:"bot", text: bubble.innerText });

}

async function askGemini(retryCount){

    retryCount = retryCount || 0;

    if(typeof geminiConfig === "undefined" || !geminiConfig.apiKey || geminiConfig.apiKey === "YOUR_GEMINI_API_KEY"){

        return { text: "Я поки не підключений до розумної розмови 🔑 Заповни файл gemini-config.js своїм безкоштовним ключем з aistudio.google.com/apikey" };

    }

    const systemContext = "Ти — Джарвіз, дружній компаньйон-помічник у застосунку SelfDev для саморозвитку та завдань. Відповідай коротко (1-3 речення), українською мовою, тепло і підтримуюче. Можеш давати практичні поради щодо завдань, цілей, продуктивності та мотивації.";

    const contents = jarvisChatHistory
        .filter(m => m.text !== "…")
        .map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }]
        }));

    try{

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": geminiConfig.apiKey
                },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemContext }] },
                    contents: contents
                })
            }
        );

        const data = await response.json();

        if(data.candidates && data.candidates[0] && data.candidates[0].content){

            return { text: data.candidates[0].content.parts[0].text };

        }

        if(data.error){

            const isOverloaded = data.error.code === 503 || (data.error.status === "UNAVAILABLE");

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

            return { text: "Помилка від Gemini: "+data.error.message+" (код "+data.error.code+")" };

        }

        if(data.candidates && data.candidates[0] && data.candidates[0].finishReason === "SAFETY"){

            return { text: "Це питання відхилено фільтром безпеки Gemini. Спробуй перефразувати." };

        }

        console.error("Gemini response (unexpected format):", data);

        return { text: "Хм, отримав дивну відповідь від Gemini 🤔 Подробиці в консолі браузера (F12)." };

    }catch(e){

        console.error("Gemini error:", e);

        return { text: "Не можу зараз відповісти — перевір інтернет-з'єднання 📡" };

    }

}
