/*
 * SelfDev — service worker
 * © 2026 Roman Chelyk. Усі права захищено. / All rights reserved.
 * Використання, копіювання та зміна без письмового дозволу автора заборонені.
 */

// Цитати дня беремо з того ж quotes.js, що й застосунок (там window.quotes = [...]).
try{

  self.window = self;
  importScripts("./quotes.js");

}catch(e){

  // Без цитат віджет покаже статичний текст — це не критично
}

// Змінюй номер версії, коли оновлюєш файли, щоб користувачі отримали свіжий кеш
const CACHE = "selfdev-v71";
const WIDGET_CACHE = "selfdev-widget";
const WIDGET_TAG = "selfdev-daily-widget";

// gemini-config.js навмисно НЕ в списку: його немає в репозиторії (там секрет),
// і один відсутній файл раніше валив усю установку кешу через cache.addAll.
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./design.css",
  "./ui.js",
  "./app.js",
  "./quotes.js",
  "./manifest.json",
  "./firebase-config.js",
  "./friends.js",
  "./cloud-sync.js",
  "./jarvis3d.js",
  "./jarvis-chat.js",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", event => {

  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE).then(cache =>
      // Кожен файл кешуємо окремо: відсутній файл не повинен ламати решту
      Promise.all(FILES.map(file => cache.add(file).catch(() => null)))
    )
  );

});

self.addEventListener("activate", event => {

  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          // Чистимо лише старі версії кешу застосунку; кеш віджета лишається
          .filter(key => key.startsWith("selfdev-v") && key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );

});

// Мережа в пріоритеті, кеш — запасний варіант без інтернету.
// Чужі домени (Firebase, Gemini, CDN) і не-GET запити не чіпаємо взагалі.
self.addEventListener("fetch", event => {

  const req = event.request;

  if(req.method !== "GET") return;

  const url = new URL(req.url);

  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(res => {

      if(res && res.ok && res.type === "basic"){

        const copy = res.clone();

        caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});

      }

      return res;

    }).catch(async () => {

      const cached = await caches.match(req, { ignoreSearch: req.mode === "navigate" });

      if(cached) return cached;

      if(req.mode === "navigate"){

        const shell = await caches.match("./index.html");

        if(shell) return shell;

      }

      return Response.error();

    })
  );

});

// ----------------
// Клік по сповіщенню відкриває застосунок
// ----------------

async function openApp(){

  const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

  if(all.length){

    try{ return await all[0].focus(); }catch(e){ /* упали — відкриємо нове вікно */ }

  }

  return self.clients.openWindow("./");

}

self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(openApp());

});

// ----------------
// Віджет Windows/Edge (Widgets API)
// ----------------

function localISODate(d){

  const pad = n => String(n).padStart(2, "0");

  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());

}

async function readWidgetSummary(){

  try{

    const cache = await caches.open(WIDGET_CACHE);
    const res = await cache.match(new URL("widgets/summary.json", self.registration.scope).href);

    if(res) return await res.json();

  }catch(e){

    // немає підсумку — покажемо запасний текст
  }

  return null;

}

async function buildWidgetData(){

  const fallbackGoals = "Відкрий застосунок, щоб побачити цілі на сьогодні 🎯";

  let quoteText = "Кожен день — це новий шанс стати кращою версією себе.";

  try{

    const list = self.quotes;

    if(Array.isArray(list) && list.length){

      // Той самий індекс, що й у застосунку (showDailyQuote)
      // Номер дня за місцевим часом — так само, як localDayNumber() в app.js
      const now = new Date();
      const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);

      quoteText = list[day % list.length].text;

    }

  }catch(e){

    // лишаємо запасну цитату
  }

  const summary = await readWidgetSummary();

  // Підсумок із вчорашнього дня показувати не можна — це вводило б в оману
  const goalsSummary = (summary && summary.date === localISODate(new Date()) && summary.goalsSummary)
    ? summary.goalsSummary
    : fallbackGoals;

  return { quoteText, goalsSummary };

}

async function updateWidget(widget){

  if(!self.widgets || !widget) return;

  try{

    const def = widget.definition || {};
    const tag = def.tag || WIDGET_TAG;

    const templateRes = await fetch(def.msAcTemplate || "widgets/widget-template.json");
    const template = await templateRes.text();

    const data = JSON.stringify(await buildWidgetData());

    await self.widgets.updateByTag(tag, { template, data });

  }catch(e){

    // віджет оновиться наступного разу
  }

}

async function refreshAllWidgets(){

  if(!self.widgets) return;

  try{

    const widgets = await self.widgets.getByTag(WIDGET_TAG);

    await Promise.all((widgets || []).map(updateWidget));

  }catch(e){

    // не критично
  }

}

self.addEventListener("widgetinstall", event => event.waitUntil(updateWidget(event.widget)));
self.addEventListener("widgetresume", event => event.waitUntil(updateWidget(event.widget)));

self.addEventListener("widgetclick", event => {

  if(event.action === "openApp") event.waitUntil(openApp());

});

// Застосунок після змін записує свіжий підсумок і просить оновити віджет
self.addEventListener("message", event => {

  if(event.data && event.data.type === "widget-refresh"){

    event.waitUntil(refreshAllWidgets());

  }

});
