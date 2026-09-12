// ----------------
// Джарвіз — чат через Google Gemini
// ----------------

let jarvisChatHistory = [];

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

    if(modal) modal.classList.remove("show");

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

    const reply = await askGemini();

    jarvisChatHistory.pop();

    if(thinkingBubble) thinkingBubble.remove();

    addJarvisMessage("bot", reply);

}

async function askGemini(){

    if(typeof geminiConfig === "undefined" || !geminiConfig.apiKey || geminiConfig.apiKey === "YOUR_GEMINI_API_KEY"){

        return "Я поки не підключений до розумної розмови 🔑 Заповни файл gemini-config.js своїм безкоштовним ключем з aistudio.google.com/apikey";

    }

    const systemContext = "Ти — Джарвіз, дружній компаньйон-помічник у застосунку SelfDev для саморозвитку та звичок. Відповідай коротко (1-3 речення), українською мовою, тепло і підтримуюче. Можеш давати практичні поради щодо звичок, цілей, продуктивності та мотивації.";

    const contents = jarvisChatHistory
        .filter(m => m.text !== "…")
        .map(m => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.text }]
        }));

    try{

        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key="+geminiConfig.apiKey,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    system_instruction: { parts: [{ text: systemContext }] },
                    contents: contents
                })
            }
        );

        const data = await response.json();

        if(data.candidates && data.candidates[0] && data.candidates[0].content){

            return data.candidates[0].content.parts[0].text;

        }

        if(data.error){

            console.error("Gemini API error:", data.error);

            return "Помилка від Gemini: "+data.error.message+" (код "+data.error.code+")";

        }

        if(data.candidates && data.candidates[0] && data.candidates[0].finishReason === "SAFETY"){

            return "Це питання відхилено фільтром безпеки Gemini. Спробуй перефразувати.";

        }

        console.error("Gemini response (unexpected format):", data);

        return "Хм, отримав дивну відповідь від Gemini 🤔 Подробиці в консолі браузера (F12).";

    }catch(e){

        console.error("Gemini error:", e);

        return "Не можу зараз відповісти — перевір інтернет-з'єднання 📡";

    }

}
