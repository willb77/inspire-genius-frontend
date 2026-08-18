/**
 * Asset-failure recovery. Loaded as a plain classic script from index.html,
 * BEFORE the app's module script.
 *
 * WHY THIS FILE EXISTS (incident 2026-08-17)
 * ------------------------------------------
 * The app already had a stale-bundle detector: `checkForUpdate()` in
 * src/lib/buildVersion.ts. It compares the compiled build SHA against a live
 * /version.json and, on mismatch, tears down the service worker, clears caches
 * and reloads. It works — but it ships INSIDE the bundle it is meant to rescue.
 *
 * When the bundle itself fails to load, the recovery code fails to load with
 * it. The devices that most need self-healing are exactly the ones that can
 * never run it. On 2026-08-17 a classroom of Chromebooks hit precisely this:
 * requests for hashed chunks came back as blocked/missing, the module never
 * executed, and the page rendered blank with no path back.
 *
 * This script closes that gap. It is:
 *   - a CLASSIC script, so it runs to completion before the deferred module
 *     script, and its listeners are registered before any module can fail;
 *   - served from a STABLE, un-hashed URL, so it never goes stale;
 *   - referenced from index.html, which is deployed with
 *     `Cache-Control: no-store`, so a device always gets the current copy.
 *
 * It deliberately does NOT replace checkForUpdate(). That handles the healthy
 * case (app runs, newer build exists). This handles the broken case (app cannot
 * start at all).
 */
(function () {
  "use strict";

  // Guard against reload loops. If recovery has already run this tab session,
  // do not run it again — a second failure after a clean slate is a real
  // outage, not a stale cache, and reloading forever would hide it.
  var GUARD = "__ig_asset_recovery_attempted";

  function alreadyTried() {
    try {
      return sessionStorage.getItem(GUARD) === "1";
    } catch (e) {
      // Private mode / storage disabled: refuse to act rather than risk a loop.
      return true;
    }
  }

  function markTried() {
    try {
      sessionStorage.setItem(GUARD, "1");
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Only act on failures of THIS origin's build output. An unrelated resource
   * (a third-party pixel, a missing avatar) must never trigger a cache wipe.
   */
  function isBuildAsset(url) {
    if (!url) return false;
    try {
      var u = new URL(url, window.location.href);
      if (u.origin !== window.location.origin) return false;
      return u.pathname.indexOf("/assets/") === 0;
    } catch (e) {
      return false;
    }
  }

  function recover(reason) {
    if (alreadyTried()) return;
    if (!markTried()) return;

    if (window.console && console.warn) {
      console.warn("[ig-recovery] build asset failed to load (" + reason + "). " +
        "Clearing service worker + caches and reloading once.");
    }

    var tasks = [];

    if ("serviceWorker" in navigator) {
      tasks.push(
        navigator.serviceWorker
          .getRegistrations()
          .then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          })
          .catch(function () { /* best effort */ })
      );
    }

    if (typeof caches !== "undefined") {
      tasks.push(
        caches
          .keys()
          .then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          })
          .catch(function () { /* best effort */ })
      );
    }

    var reload = function () {
      // Cache-busting query so the reload cannot be answered from the HTTP
      // cache by the same broken document.
      var u = new URL(window.location.href);
      u.searchParams.set("__ig_r", String(Date.now()));
      window.location.replace(u.toString());
    };

    // Never hang: reload even if the teardown promises stall.
    var done = false;
    var finish = function () {
      if (done) return;
      done = true;
      reload();
    };
    setTimeout(finish, 4000);
    Promise.all(tasks).then(finish, finish);
  }

  // 1. Resource load failures (<script src>, <link rel=stylesheet>).
  //    These do NOT bubble, so the listener must be registered in the
  //    CAPTURE phase on window.
  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (!target || target === window) return;
      var tag = target.tagName;
      if (tag !== "SCRIPT" && tag !== "LINK") return;
      var url = target.src || target.href;
      if (isBuildAsset(url)) recover(tag.toLowerCase() + " " + url);
    },
    true
  );

  // 2. Dynamic import failures (code-split route chunks). These surface as an
  //    unhandled promise rejection, not a resource error event.
  window.addEventListener("unhandledrejection", function (event) {
    var reason = event && event.reason;
    var message = (reason && (reason.message || reason.toString())) || "";
    if (
      message.indexOf("Failed to fetch dynamically imported module") !== -1 ||
      message.indexOf("error loading dynamically imported module") !== -1 ||
      message.indexOf("Importing a module script failed") !== -1
    ) {
      recover("dynamic import: " + message);
    }
  });
})();
