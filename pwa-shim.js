/* GIF and Memory · PWA — puente que reemplaza a Apps Script
   Hace que las páginas (hechas para google.script.run) funcionen desde GitHub Pages:
   · google.script.run  → POST a tu /exec  (lista permitida en ApiPWA.gs)
   · google.script.url / host
   · Login/registro con Google (ventana de cuentas de Google, un toque)
   · Botón "Instalar" y ventana tamaño celular en computador */
(function () {
  "use strict";
  var C = window.GM_CONFIG || {};
  var EXEC = C.EXEC_URL || "";


  /* ───────── Pantalla IDÉNTICA a la app Android ─────────
     El WebView de la app Android dibuja la página con un ancho de ~1000 px CSS (no 412) y la
     reduce a la pantalla. Todo el diseño está medido para ese ancho. En un navegador/PWA normal
     el ancho es ~412 px, y por eso se veía gigante. Aquí se copia el mismo ancho. */
  var ANCHO = Number(C.ANCHO_PANTALLA) || 1020;
  var VP = "width=" + ANCHO + ", user-scalable=no, viewport-fit=cover";
  function sincronizarViewport() {
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) { vp = document.createElement("meta"); vp.name = "viewport"; (document.head || document.documentElement).appendChild(vp); }
    if (vp.getAttribute("content") !== VP) vp.setAttribute("content", VP);
  }
  sincronizarViewport();
  /* Cuánto hay que agrandar lo que dibuja la propia PWA (botón Instalar) para que se vea de tamaño normal
     (la página mide ~1020 px y el celular la reduce a ~412) */
  function escalaUI() {
    var dw = screen.width || window.innerWidth;
    return Math.max(1, window.innerWidth / dw);
  }
  document.addEventListener("DOMContentLoaded", sincronizarViewport);

  /* ───────── Diagnóstico (abre la app con ?diag=1) ───────── */
  var diagEl = null;
  function mostrarDiag() {
    if (!P.diag || !document.body) return;
    if (!diagEl) {
      diagEl = document.createElement("pre");
      diagEl.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;margin:0;padding:" + (8 * escalaUI()) + "px;max-height:40%;overflow:auto;" +
        "background:rgba(0,0,0,.85);color:#7dffb0;font:" + (11 * escalaUI()) + "px/1.3 monospace;white-space:pre-wrap";
      document.body.appendChild(diagEl);
    }
    diagEl.textContent = "ancho=" + innerWidth + " dpr=" + devicePixelRatio + " pantalla=" + screen.width + "\n" + window.PWA_ERRORES.join("\n");
  }
  document.addEventListener("DOMContentLoaded", mostrarDiag);

  /* Red de seguridad: ningún splash puede quedar tapando la app para siempre */
  window.addEventListener("load", function () {
    setTimeout(function () {
      var sp = document.getElementById("splash-screen");
      if (!sp || document.documentElement.classList.contains("gm-tr-espera")) return;
      if (getComputedStyle(sp).display === "none") return;
      sp.classList.add("hide");
      setTimeout(function () { sp.style.display = "none"; }, 950);
    }, 8000);
  });

  /* ───────── Dirección base de la PWA (reemplaza ScriptApp.getService().getUrl()) ───────── */
  var dir = location.pathname.replace(/[^\/]*$/, "");
  window.PWA_BASE = location.origin + dir;
  window.PWA_APP_URL = window.PWA_BASE + "go.html";   // pequeño enrutador: go.html?page=cuenta → cuenta.html

  /* ───────── Parámetros de la URL ───────── */
  function params() {
    var o = {}, q = location.search.replace(/^\?/, "");
    if (!q) return o;
    q.split("&").forEach(function (p) {
      if (!p) return;
      var i = p.indexOf("="), k = i < 0 ? p : p.slice(0, i), v = i < 0 ? "" : p.slice(i + 1);
      try { k = decodeURIComponent(k.replace(/\+/g, " ")); v = decodeURIComponent(v.replace(/\+/g, " ")); } catch (e) {}
      o[k] = v;
    });
    return o;
  }
  var P = params();
  window.PWA_PARAMS = P;

  /* Datos que antes entregaba el servidor al armar la página */
  function b64urlDecode(s) {
    s = String(s).replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    return decodeURIComponent(escape(atob(s)));
  }
  window.PWA_PREFILL = null;
  try {
    if (P.gp) {
      window.PWA_PREFILL = JSON.parse(b64urlDecode(P.gp));
      var u = new URL(location.href); u.searchParams.delete("gp");
      history.replaceState(null, "", u.pathname + u.search + u.hash);
    }
  } catch (e) { window.PWA_PREFILL = { error: "No se pudo leer la respuesta de Google." }; }
  window.PWA_RETOMAR = P.retomar ? String(P.retomar).trim() : "";
  window.PWA_REGALO_MODE = P.regalo === "1" ? "1" : "0";
  window.PWA_REGALO_PIEZAS = P.piezas ? String(parseInt(P.piezas, 10) || 20) : "20";
  window.PWA_REGALO_PROD = P.prod ? String(P.prod) : "";

  /* ───────── google.script.run ───────── */
  var LOCAL = {
    // En la PWA no existe Google Play Billing: se usan los medios de pago normales
    getPlayBillingActivo: function () { return false; },
    // La "dirección de la app" es la de la propia PWA (nunca la de script.google.com)
    getWebAppUrl: function () { return window.PWA_APP_URL; }
  };

  /* ───────── Todo se queda DENTRO de la PWA ─────────
     Cualquier dirección del servidor de Apps Script (…script.google.com/macros/s/…/exec) que llegue en una
     respuesta (links de redirección, "volver al inicio", etc.) se cambia por la de la PWA (go.html), que
     reenvía a la página correcta (?page=index → index.html). Así nunca se abre la página externa con el sello. */
  var RE_EXEC = /(?:https?:\/\/)?script\.google\.com\/(?:a\/macros\/[^\/\s"']+\/s|macros\/s)\/[\w-]+\/(?:exec|dev)/gi;
  function aPWA(v) {
    if (typeof v === "string") return v.indexOf("script.google.com") < 0 ? v : v.replace(RE_EXEC, window.PWA_APP_URL);
    if (Array.isArray(v)) { for (var i = 0; i < v.length; i++) v[i] = aPWA(v[i]); return v; }
    if (v && typeof v === "object") { Object.keys(v).forEach(function (k) { v[k] = aPWA(v[k]); }); return v; }
    return v;
  }
  window.PWA_ADENTRO = aPWA;
  /* Limpia direcciones viejas que quedaron guardadas en el teléfono (de antes de este arreglo) */
  try {
    for (var li = 0; li < localStorage.length; li++) {
      var lk = localStorage.key(li), lv = localStorage.getItem(lk);
      if (lv && lv.indexOf("script.google.com") >= 0 && lk.indexOf("mys_session") < 0) {
        var nv = lv.replace(RE_EXEC, window.PWA_APP_URL);
        if (nv !== lv) localStorage.setItem(lk, nv);
      }
    }
  } catch (e) {}

  window.PWA_ERRORES = [];
  function registrarError(fn, err) {
    try { window.PWA_ERRORES.push(fn + ": " + (err && err.message ? err.message : err)); mostrarDiag(); } catch (e) {}
  }
  function llamar(fn, args) {
    if (Object.prototype.hasOwnProperty.call(LOCAL, fn)) {
      return Promise.resolve().then(function () { return LOCAL[fn].apply(null, args); });
    }
    function intento(n) {
      return fetch(EXEC, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },   // sin "preflight"
        body: JSON.stringify({ fn: fn, args: args }),
        redirect: "follow", credentials: "omit", cache: "no-store"
      }).then(function (r) { return r.text(); }).then(function (txt) {
        var j;
        try { j = JSON.parse(txt); } catch (e) { throw new Error("Respuesta inválida del servidor."); }
        if (j && j.ok) return aPWA(j.result);
        throw new Error((j && j.error) || "Error del servidor.");
      }, function (err) {
        if (n < 1) return new Promise(function (r) { setTimeout(r, 700); }).then(function () { return intento(n + 1); });
        throw new Error("Sin conexión con el servidor. Revisa tu internet.");
      });
    }
    return intento(0);
  }

  function nuevoRunner(ok, fail, obj) {
    return new Proxy({}, {
      get: function (_, nombre) {
        if (typeof nombre !== "string") return undefined;
        if (nombre === "withSuccessHandler") return function (f) { return nuevoRunner(f, fail, obj); };
        if (nombre === "withFailureHandler") return function (f) { return nuevoRunner(ok, f, obj); };
        if (nombre === "withUserObject") return function (o) { return nuevoRunner(ok, fail, o); };
        if (nombre === "then") return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          llamar(nombre, args).then(function (res) {
            if (typeof ok === "function") { try { ok.call(null, res, obj); } catch (e) { setTimeout(function () { throw e; }, 0); } }
          }, function (err) {
            registrarError(nombre, err);
            if (typeof fail === "function") { try { fail.call(null, err, obj); } catch (e) { setTimeout(function () { throw e; }, 0); } }
            else { try { console.error("[PWA] " + nombre + ":", err && err.message); } catch (e) {} }
          });
        };
      }
    });
  }

  var google = window.google = window.google || {};
  google.script = google.script || {};
  google.script.run = nuevoRunner(null, null, undefined);
  google.script.url = {
    getLocation: function (cb) {
      var par = {}, pars = {};
      Object.keys(P).forEach(function (k) { par[k] = P[k]; pars[k] = [P[k]]; });
      try { cb({ hash: location.hash.replace(/^#/, ""), parameter: par, parameters: pars }); } catch (e) {}
    }
  };
  google.script.host = {
    close: function () { try { history.length > 1 ? history.back() : (location.href = window.PWA_APP_URL); } catch (e) {} },
    setHeight: function () {}, setWidth: function () {}, origin: location.origin,
    editor: { focus: function () {} }
  };

  /* ───────── Login / registro con Google ───────── */
  function cargarGIS() {
    return new Promise(function (res, rej) {
      if (window.google && google.accounts && google.accounts.oauth2) return res();
      var s = document.createElement("script");
      s.src = "https://accounts.google.com/gsi/client"; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error("No se pudo cargar Google. Revisa tu internet.")); };
      document.head.appendChild(s);
    });
  }
  function b64urlEncode(o) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function pedirTokenGoogle() {
    return cargarGIS().then(function () {
      return new Promise(function (res, rej) {
        var cli = google.accounts.oauth2.initTokenClient({
          client_id: C.GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: function (r) { if (r && r.access_token) res(r.access_token); else rej(new Error((r && (r.error_description || r.error)) || "Inicio cancelado.")); },
          error_callback: function (e) { rej(new Error(e && e.type === "popup_closed" ? "Inicio cancelado." : (e && e.message) || "No se pudo abrir Google.")); }
        });
        cli.requestAccessToken({ prompt: "select_account" });
      });
    });
  }
  function toastSimple(msg) {
    var t = document.getElementById("toast1") || document.querySelector(".toast");
    if (t) { t.textContent = msg; t.classList.add("show"); setTimeout(function () { t.classList.remove("show"); }, 4000); }
    else { alert(msg); }
  }
  /* Selector de cuenta DENTRO de la app: Google One Tap / FedCM (hoja nativa del propio Chrome, sin abrir otra página).
     Si el navegador no puede mostrarla, se usa la ventana de Google de antes como respaldo. */
  function pedirCredencialIntegrada() {
    return cargarGIS().then(function () {
      return new Promise(function (res, rej) {
        if (!(window.google && google.accounts && google.accounts.id)) return rej(new Error("sin-integrado"));
        var fin = false;
        function ok(c) { if (!fin) { fin = true; res(c); } }
        function no(m) { if (!fin) { fin = true; rej(new Error(m)); } }
        try {
          google.accounts.id.initialize({
            client_id: C.GOOGLE_CLIENT_ID,
            callback: function (r) { if (r && r.credential) ok(r.credential); else no("sin-integrado"); },
            use_fedcm_for_prompt: true, auto_select: false, cancel_on_tap_outside: false, itp_support: true
          });
          google.accounts.id.prompt(function (n) {
            try {
              if (n.isDismissedMoment && n.isDismissedMoment()) {
                var rz = n.getDismissedReason && n.getDismissedReason();
                if (rz !== "credential_returned") no("Inicio cancelado.");
              } else if ((n.isNotDisplayed && n.isNotDisplayed()) || (n.isSkippedMoment && n.isSkippedMoment())) {
                no("sin-integrado");
              }
            } catch (e) { no("sin-integrado"); }
          });
        } catch (e) { no("sin-integrado"); }
      });
    });
  }
  /* Google mismo comprueba la firma del token (tokeninfo); además se exige que sea para ESTA app y que no esté vencido */
  function verificarCredencial(jwt) {
    return fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(jwt), { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (t) {
        var okAud = t && t.aud === C.GOOGLE_CLIENT_ID, okExp = t && Number(t.exp) * 1000 > Date.now() - 60000;
        var okMail = t && t.email && (t.email_verified === true || t.email_verified === "true");
        if (!okAud || !okExp || !okMail) throw new Error("No se pudo validar tu cuenta de Google.");
        return { email: String(t.email).toLowerCase(), nombre: t.name || "", picture: t.picture || "" };
      });
  }
  function irConGoogle(paginaDestino, r) {
    var gp = b64urlEncode({ email: r.email, nombre: r.nombre || "", picture: r.picture || "" });
    location.href = window.PWA_BASE + paginaDestino + ".html?gp=" + gp;
  }
  function googleFlujo(paginaDestino, boton) {
    if (boton) boton.disabled = true;
    function falla(err) {
      if (boton) boton.disabled = false;
      toastSimple("Google: " + (err && err.message ? err.message : err));
    }
    function respaldoVentana() {
      return pedirTokenGoogle()
        .then(function (tok) { return llamar("pwaVerificarGoogleAcceso", [tok]); })
        .then(function (r) { irConGoogle(paginaDestino, r); });
    }
    pedirCredencialIntegrada()
      .then(verificarCredencial)
      .then(function (r) { irConGoogle(paginaDestino, r); })
      .catch(function (err) {
        if (err && err.message === "sin-integrado") return respaldoVentana().catch(falla);
        falla(err);
      });
  }
  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest("#btnGoogleLogin, #btnGoogle");
    if (!b) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    googleFlujo(b.id === "btnGoogleLogin" ? "ingrezar" : "crearcuenta", b);
  }, true);

  /* ───────── Instalación (botón "Instalar") ───────── */
  var standalone = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone === true;
  var ev = null, btn = null;
  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function crearBoton() {
    if (btn || standalone) return;
    btn = document.createElement("button");
    btn.id = "pwaInstalar"; btn.type = "button";
    btn.innerHTML = '<span style="font-size:15px;line-height:1">⬇</span> Instalar';
    btn.style.cssText = "position:fixed;top:calc(env(safe-area-inset-top,0px) + 8px);right:10px;z-index:2147483000;" +
      "display:none;align-items:center;gap:6px;padding:8px 14px;border:0;border-radius:999px;cursor:pointer;" +
      "font:700 13px/1 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#fff;" +
      "background:linear-gradient(135deg,#a02fd8,#f0287f);box-shadow:0 4px 14px rgba(0,0,0,.35);";
    btn.addEventListener("click", instalar);
    var k = escalaUI();
    if (k > 1.01) { btn.style.transformOrigin = "top right"; btn.style.transform = "scale(" + k + ")"; btn.style.top = "calc(env(safe-area-inset-top,0px) + " + (8 * k) + "px)"; btn.style.right = (10 * k) + "px"; }
    document.body.appendChild(btn);
  }
  function mostrar() { crearBoton(); if (btn) btn.style.display = "inline-flex"; }
  function ocultar() { if (btn) btn.style.display = "none"; }
  function instalar() {
    if (ev) {
      ev.prompt();
      ev.userChoice.then(function (c) { if (c && c.outcome === "accepted") ocultar(); ev = null; });
    } else if (esIOS) {
      alert("Para instalar: toca el botón Compartir (⬆) de Safari y elige «Agregar a pantalla de inicio».");
    } else {
      alert("Para instalar: abre el menú del navegador (⋮) y elige «Instalar aplicación» o «Agregar a pantalla de inicio».");
    }
  }
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); ev = e; if (document.body) mostrar(); else document.addEventListener("DOMContentLoaded", mostrar); });
  window.addEventListener("appinstalled", function () { ocultar(); ev = null; });
  document.addEventListener("DOMContentLoaded", function () {
    if (standalone) return;
    // iPhone no avisa: se muestra el botón con las instrucciones
    if (esIOS) mostrar();
    // Otros navegadores: si pasados unos segundos no hubo aviso, igual se ofrece el botón
    setTimeout(function () { if (!btn || btn.style.display === "none") mostrar(); }, 2500);
  });

  /* Ventana tamaño celular al abrir la app instalada en computador */
  if (standalone && C.VENTANA_ESCRITORIO && !/android|iphone|ipad|ipod/i.test(navigator.userAgent)) {
    try {
      if (!sessionStorage.getItem("pwa_win") && window.outerWidth > 700) {
        sessionStorage.setItem("pwa_win", "1");
        var w = C.VENTANA_ESCRITORIO.ancho, h = Math.min(C.VENTANA_ESCRITORIO.alto, screen.availHeight);
        window.resizeTo(w + (window.outerWidth - window.innerWidth), h + (window.outerHeight - window.innerHeight));
        window.moveTo(Math.max(0, (screen.availWidth - w) / 2), Math.max(0, (screen.availHeight - h) / 2));
      }
    } catch (e) {}
  }

  /* ───────── Service worker ───────── */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register(window.PWA_BASE + "sw.js", { scope: window.PWA_BASE }).catch(function () {});
    });
  }
})();
