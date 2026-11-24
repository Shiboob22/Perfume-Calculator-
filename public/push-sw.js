/* global self */
// Web push for the Journal (J2b). Loaded by the app's service worker (scripts/build-sw.mjs,
// importScripts). The push carries no payload: the server only says "something is due", and
// the words are written here, in the phone's language, so nothing about a batch crosses the
// push service.
self.addEventListener("push", (event) => {
  const ar = String(self.navigator.language || "").toLowerCase().startsWith("ar");
  event.waitUntil(self.registration.showNotification(ar ? "تذكير الدفتر" : "Journal reminder", {
    body: ar ? "حان وقت شمّ إحدى دفعاتك. أضف ملاحظة في الدفتر." : "A batch is ready to smell. Add a note in your Journal.",
    icon: "/brand/icon.svg",
    tag: "kyphira-journal",
    lang: ar ? "ar" : "en",
    dir: ar ? "rtl" : "ltr",
    data: { url: ar ? "/ar/journal" : "/journal" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/journal";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if (c.url.includes("/journal") && "focus" in c) return c.focus();
    return self.clients.openWindow(url);
  }));
});
