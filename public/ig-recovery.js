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

  function hardReload() {
    // Cache-busting query so the reload cannot be answered from the HTTP
    // cache by the same broken document.
    var u = new URL(window.location.href);
    u.searchParams.set("__ig_r", String(Date.now()));
    window.location.replace(u.toString());
  }

  /**
   * Last resort: recovery has already run once this session and a build asset
   * STILL failed. Reloading again would loop, so surface a real error instead.
   *
   * Before this existed the page simply stayed white — which is exactly how
   * the 2026-08-17 outage presented to a room of students: no message, no
   * error, nothing to act on. A blank screen is the worst failure mode there
   * is, because it is indistinguishable from "still loading".
   */
  function showFailure() {
    if (document.getElementById("ig-asset-failure")) return;

    var panel = document.createElement("div");
    panel.id = "ig-asset-failure";
    panel.setAttribute("role", "alert");
    panel.style.cssText = [
      "position:fixed", "inset:0", "z-index:2147483647",
      "display:flex", "align-items:center", "justify-content:center",
      "padding:24px", "background:#f8fafc",
      "font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif",
      "color:#0B1F3A"
    ].join(";");

    var card = document.createElement("div");
    card.style.cssText = [
      "max-width:520px", "width:100%", "background:#fff", "border-radius:12px",
      "border:1px solid #e2e8f0", "box-shadow:0 4px 24px rgba(11,31,58,.08)",
      "padding:28px 30px", "text-align:left"
    ].join(";");

    var h = document.createElement("h1");
    h.textContent = "We couldn't finish loading Inspire Genius";
    h.style.cssText = "margin:0 0 10px;font-size:20px;font-weight:700;line-height:1.3";

    var p1 = document.createElement("p");
    p1.textContent =
      "Part of the app failed to download, so the page could not start. " +
      "This is a problem on our side, not with your device or your account.";
    p1.style.cssText = "margin:0 0 14px;font-size:15px;line-height:1.55;color:#334155";

    var p2 = document.createElement("p");
    p2.textContent =
      "Try the button below. If it happens again, tell your teacher and show them this screen.";
    p2.style.cssText = "margin:0 0 18px;font-size:15px;line-height:1.55;color:#334155";

    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Try again";
    btn.style.cssText = [
      "appearance:none", "border:0", "cursor:pointer", "background:#127A8A",
      "color:#fff", "font-size:15px", "font-weight:600", "padding:11px 20px",
      "border-radius:8px"
    ].join(";");
    btn.onclick = function () {
      // Clear the one-shot guard so the full teardown runs again.
      try {
        sessionStorage.removeItem(GUARD);
      } catch (e) {}
      hardReload();
    };

    var detail = document.createElement("p");
    detail.textContent = "Reference: asset-load-failure";
    detail.style.cssText = "margin:18px 0 0;font-size:12px;color:#94a3b8";

    card.appendChild(h);
    card.appendChild(p1);
    card.appendChild(p2);
    card.appendChild(btn);
    card.appendChild(detail);
    panel.appendChild(card);

    var mount = function () {
      document.body.appendChild(panel);
    };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount);
  }

  function recover(reason) {
    // Already tried once this session, or storage is unavailable so we cannot
    // guard against a loop. Either way: do not reload again — show the error.
    if (alreadyTried()) {
      showFailure();
      return;
    }
    if (!markTried()) {
      showFailure();
      return;
    }

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

    var reload = hardReload;

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
