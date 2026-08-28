const CACHE = "selfdev-v11";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./quotes.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./widgets/widget-template.json",
  "./widgets/widget-data.json",
  "./widgets/widget-screenshot.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Клік по сповіщенню — відкрити (або сфокусувати) застосунок
self.addEventListener("notificationclick", event => {

  event.notification.close();

  event.waitUntil(

    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {

      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }

      if (clients.openWindow) {
        return clients.openWindow("./");
      }

    })

  );

});

// Фонове нагадування (лише Chrome/Edge на Android і Windows — Periodic Background Sync).
// Текст тут загальний, бо service worker не має доступу до localStorage застосунку.
self.addEventListener("periodicsync", event => {

  if(event.tag === "selfdev-daily-reminder"){

    event.waitUntil(

      self.registration.showNotification("🚀 SelfDev", {
        body: "Відкрий застосунок — нова цитата дня та цілі на сьогодні чекають ✅",
        icon: "icon-192.png",
        badge: "icon-192.png",
        tag: "selfdev-daily"
      })

    );

  }

});

// ----------------
// Windows Widgets Board (експериментальна фіча Edge)
// ----------------

// Застосунок (app.js) надсилає сюди свіжі дані через postMessage,
// бо service worker сам не має доступу до localStorage сторінки.
self.addEventListener("message", event => {

  if(event.data && event.data.type === "update-widget"){

    event.waitUntil(updateSelfDevWidget(event.data.payload));

  }

});

async function updateSelfDevWidget(payload){

  if(!("widgets" in self)) return;

  try{

    await self.widgets.updateByTag("selfdev-daily-widget", {
      data: JSON.stringify(payload)
    });

  }catch(e){

    // API віджетів недоступний (не Edge / не Windows 11) — це очікувано

  }

}

// Коли ОС щойно встановила віджет — одразу підставляємо актуальні дані,
// якщо вони вже відомі застосунку (сторінка відкрита в іншій вкладці)
self.addEventListener("widgetinstall", event => {

  event.waitUntil(

    self.clients.matchAll({ type: "window" }).then(clientList => {

      if(clientList.length > 0){
        clientList[0].postMessage({ type: "widget-installed" });
      }

    })

  );

});

// Клік по кнопці "Відкрити SelfDev" у самому віджеті
self.addEventListener("widgetclick", event => {

  if(event.action === "openApp"){

    event.waitUntil(

      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {

        for(const client of clientList){
          if("focus" in client) return client.focus();
        }

        if(self.clients.openWindow){
          return self.clients.openWindow("./");
        }

      })

    );

  }

});