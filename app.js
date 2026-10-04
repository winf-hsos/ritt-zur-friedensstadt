/* Ritt zur Friedensstadt – Lernapp zur Osnabrücker Stadtgeschichte für die 4. Klasse. Reines HTML/CSS/JS, läuft auch per Doppelklick (file://). */
(function () {
  "use strict";
  const D = window.RITT;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const mischen = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const RUNDE = 10;
  const SPEICHER = "ritt-friedensstadt-v1";
  const RAENGE = [[0, "Neuling"], [30, "Marktbesucher"], [90, "Bürger"], [180, "Ratsherr"], [300, "Reitender Bote"], [450, "Gesandter"], [650, "Friedensmacher"]];
  const STATION = Object.fromEntries(D.stationen.map((s) => [s.id, s]));
  const SONDER = { zeit: "Jahreszahlen-Profi", probe: "Probearbeit: Leitfragen", fehler: "Fehler-Training", mix: "Gemischte Runde" };

  /* ───── Speicher ───── */
  let S = { fragen: {}, taler: 0, tage: [], ton: true, verlauf: [], name: "" };
  try { const roh = localStorage.getItem(SPEICHER); if (roh) S = Object.assign(S, JSON.parse(roh)); } catch (e) { /* ohne Speicher weiter */ }
  const sichern = () => { try { localStorage.setItem(SPEICHER, JSON.stringify(S)); } catch (e) { /* ignorieren */ } };
  const stand = (id) => S.fragen[id] || (S.fragen[id] = { n: 0, r: 0, w: 0, box: 0, last: null, tipp: 0 });
  const heute = () => new Date().toISOString().slice(0, 10);

  /* ───── Auswertung ───── */
  const fragenVon = (st) => D.fragen.filter((q) => q.st === st);
  const sicherheit = (q) => Math.min((S.fragen[q.id] || {}).box || 0, 3) / 3;
  const meisterschaft = (st) => { const qs = fragenVon(st); return qs.reduce((s, q) => s + sicherheit(q), 0) / qs.length; };
  const sichereAnzahl = (st) => fragenVon(st).filter((q) => ((S.fragen[q.id] || {}).box || 0) >= 2).length;
  const medaille = (m) => (m >= 0.95 ? "gold" : m >= 0.7 ? "silber" : m >= 0.4 ? "bronze" : "");
  const rang = () => RAENGE.filter(([t]) => S.taler >= t).pop()[1];
  const fehlerFragen = () => D.fragen.filter((q) => q.typ !== "erklaer" && S.fragen[q.id] && S.fragen[q.id].last === false);
  const serieTage = () => {
    let n = 0; const d = new Date();
    for (;;) { const k = d.toISOString().slice(0, 10); if (S.tage.includes(k)) { n++; d.setDate(d.getDate() - 1); } else break; }
    return n;
  };

  /* ───── Ton ───── */
  let ctx = null;
  function ton(art) {
    if (!S.ton) return;
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const folgen = { ok: [[660, 0], [880, 0.09]], nein: [[300, 0], [240, 0.12]], fanfare: [[523, 0], [659, 0.12], [784, 0.24], [1046, 0.38]], klick: [[520, 0]] };
      (folgen[art] || []).forEach(([f, t]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = art === "nein" ? "triangle" : "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(art === "klick" ? 0.05 : 0.18, ctx.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + (art === "fanfare" ? 0.3 : 0.18));
        o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.35);
      });
    } catch (e) { /* kein Ton möglich */ }
  }

  /* ───── Konfetti ───── */
  const leiseBewegung = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function konfetti(menge) {
    if (leiseBewegung) return;
    const c = $("#konfetti"), g = c.getContext("2d");
    c.width = innerWidth; c.height = innerHeight;
    const farben = ["#c3272c", "#1d6a87", "#eab12a", "#2c8a4e", "#ffffff"];
    const teile = Array.from({ length: menge }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.55,
      vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 6, r: Math.random() * Math.PI,
      f: farben[Math.floor(Math.random() * farben.length)], w: 6 + Math.random() * 6 }));
    let t = 0;
    (function schritt() {
      g.clearRect(0, 0, c.width, c.height);
      teile.forEach((p) => { p.vy += 0.5; p.x += p.vx; p.y += p.vy; p.r += 0.2; g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.f; g.fillRect(-p.w / 2, -3, p.w, 6); g.restore(); });
      if (++t < 75) requestAnimationFrame(schritt); else g.clearRect(0, 0, c.width, c.height);
    })();
  }

  /* ───── Seiten ───── */
  const SEITEN = ["start", "quiz", "ende", "eltern"];
  function zeige(name) { SEITEN.forEach((s) => ($("#seite-" + s).hidden = s !== name)); window.scrollTo(0, 0); }
  function kontoAnzeigen(hops) {
    $("#taler").textContent = S.taler; $("#rang").textContent = rang();
    if (hops) { const t = $(".talerzahl"); t.classList.remove("hops"); void t.offsetWidth; t.classList.add("hops"); }
  }

  /* ───── Startseite ───── */
  function empfohleneStation() {
    return D.stationen.filter((s) => !s.extra).find((s) => meisterschaft(s.id) < 0.7) || D.stationen.find((s) => meisterschaft(s.id) < 0.95) || null;
  }
  function startseite() {
    kontoAnzeigen();
    const emp = empfohleneStation();
    const liste = $("#stationen"); liste.innerHTML = "";
    D.stationen.forEach((s) => {
      const m = meisterschaft(s.id), n = fragenVon(s.id).length, ok = sichereAnzahl(s.id);
      const li = el("li", "station" + (emp && emp.id === s.id ? " empfohlen" : ""));
      li.append(el("div", "station-zeit", s.zeit));
      const med = el("div", "medaille " + medaille(m)); med.title = { gold: "Gold", silber: "Silber", bronze: "Bronze", "": "noch keine Medaille" }[medaille(m)];
      li.append(med);
      const karte = el("div", "station-karte");
      const bild = el("img", "station-bild"); bild.src = s.bild; bild.alt = "";
      const text = el("div");
      const name = el("div", "station-name", s.name);
      if (s.extra) name.append(el("span", "station-zusatz", "Zusatz"));
      text.append(name, el("div", "station-kurz", s.kurz));
      const balken = el("div", "balken"); const fuell = el("span"); fuell.style.width = Math.round(m * 100) + "%"; balken.append(fuell);
      text.append(balken, el("div", "balken-text", ok + " von " + n + " Fragen sitzen sicher"));
      const knopf = el("button", "knopf" + (emp && emp.id === s.id ? " haupt" : ""), m > 0 ? "Weiter üben" : "Starten"); knopf.type = "button";
      knopf.addEventListener("click", () => starteRunde(s.id));
      karte.append(bild, text, knopf); li.append(karte); liste.append(li);
    });
    const zahlFehler = fehlerFragen().length;
    $("#fehler-text").textContent = zahlFehler ? zahlFehler + " Fragen haben beim letzten Mal nicht geklappt" : "Super, gerade gibt es nichts zu wiederholen";
    $("#modus-fehler").disabled = zahlFehler === 0;
    const bisher = Object.keys(S.fragen).length;
    const anrede = S.name ? " " + S.name : "";
    $("#hallo").textContent = bisher ? "Hallo" + anrede + ", schön, dass du wieder da bist!" : "Hallo" + anrede + "!";
    $("#namensform").hidden = !!S.name || !!S.gefragt || bisher > 0; $("#startknoepfe").hidden = !$("#namensform").hidden;
    $("#empfehlung").textContent = emp
      ? (bisher ? "Mein Vorschlag für heute: „" + emp.name + "“. Oder du wählst unten selbst eine Station." : "Ich bin dein Steckenpferd. Wir reiten zusammen durch die Geschichte von Osnabrück, von der Furt an der Hase bis zur Friedensstadt. Fang am besten mit der ersten Station an!")
      : "Wow, alle Stationen sitzen! Mach zur Sicherheit noch die Probearbeit mit den Leitfragen.";
    $("#los").textContent = emp ? (bisher ? "Weiter mit „" + emp.name + "“" : "Los geht's!") : "Probearbeit starten";
    const st = serieTage(); $("#serie").hidden = st < 2; $("#serie").textContent = st + " Tage hintereinander geübt";
    $("#ton").textContent = "Ton: " + (S.ton ? "an" : "aus");
    zeige("start");
  }

  /* ───── Runde zusammenstellen ───── */
  let R = null; // aktuelle Runde
  function auswahl(qs, anzahl) {
    const bewertet = qs.map((q) => { const s = S.fragen[q.id]; return { q, w: (s ? s.box * 10 + (s.last === false ? -15 : 0) : -5) + Math.random() * 8 }; });
    return mischen(bewertet.sort((a, b) => a.w - b.w).slice(0, anzahl).map((x) => x.q));
  }
  function starteRunde(modus) {
    let qs;
    if (modus === "probe") qs = fragenVon("probe");
    else if (modus === "fehler") qs = auswahl(fehlerFragen(), RUNDE);
    else if (modus === "zeit") qs = auswahl(D.fragen.filter((q) => q.st === "zeit" || q.typ === "jahr" || (q.typ === "reihe" && q.st !== "stadtleben")), RUNDE);
    else if (modus === "mix") qs = auswahl(D.fragen.filter((q) => q.lf && q.typ !== "erklaer"), RUNDE);
    else qs = auswahl(fragenVon(modus), RUNDE);
    if (!qs.length) { startseite(); return; }
    R = { modus, fragen: qs, i: 0, ergebnisse: [], taler: 0, folge: 0 };
    $("#quiz-titel").textContent = STATION[modus] ? STATION[modus].name : SONDER[modus];
    zeige("quiz"); frageZeigen();
  }

  /* ───── Frage anzeigen ───── */
  let A = null; // Antwortzustand der aktuellen Frage
  function punkteAnzeigen() {
    const p = $("#punkte"); p.innerHTML = "";
    R.fragen.forEach((_, i) => { const d = el("i"); if (i < R.ergebnisse.length) d.className = R.ergebnisse[i].ok ? "ok" : "nein"; else if (i === R.i) d.className = "jetzt"; p.append(d); });
  }
  function bildSetzen(fig, pfad) {
    if (!pfad) { fig.hidden = true; return; }
    fig.hidden = false; const img = fig.querySelector("img"); img.src = pfad;
  }
  function frageZeigen() {
    const q = R.fragen[R.i];
    A = { q, tipp: false, fertig: false, pruefen: null };
    punkteAnzeigen();
    $("#frage-nr").textContent = "Frage " + (R.i + 1) + " von " + R.fragen.length + (STATION[q.st] && !STATION[R.modus] ? " · " + STATION[q.st].name : "");
    $("#lf-hinweis").hidden = !q.lf && q.typ !== "erklaer";
    $("#frage").textContent = q.f;
    bildSetzen($("#fragebild"), q.b);
    $("#tipp").hidden = true; $("#rueckmeldung").hidden = true; $("#aktionen").hidden = false;
    $("#tipp-knopf").hidden = !q.t; $("#tipp-knopf").disabled = false;
    const pr = $("#pruefen"); pr.disabled = true; pr.hidden = false; pr.textContent = "Prüfen"; pr.onclick = null;
    const box = $("#antwort"); box.innerHTML = "";
    BAUER[q.typ](q, box);
    window.scrollTo(0, 0);
  }
  const bereit = (ja) => { $("#pruefen").disabled = !ja; };

  /* ───── Antwortarten ───── */
  const BAUER = {
    mc(q, box) {
      const liste = el("div", "optionen");
      const opts = q.o.length === 2 && q.o.includes("Richtig") ? ["Richtig", "Falsch"] : mischen(q.o);
      opts.forEach((o, i) => {
        const b = el("button", "option"); b.type = "button";
        b.append(el("span", "buchstabe", "ABCDEF"[i]), el("span", null, o));
        b.addEventListener("click", () => { if (A.fertig) return; auswerten(o === q.o[0], q.o[0], () => {
          liste.querySelectorAll(".option").forEach((x) => { x.disabled = true; const t = x.lastChild.textContent; if (t === q.o[0]) x.classList.add("richtig"); else if (x === b) x.classList.add("falsch"); });
        }); });
        liste.append(b);
      });
      box.append(liste); $("#pruefen").hidden = true;
    },

    jahr(q, box) {
      const wrap = el("div", "jahr-feld");
      const feld = el("input", "jahr-anzeige"); feld.id = "jahr-eingabe"; feld.inputMode = "numeric"; feld.autocomplete = "off"; feld.maxLength = 4; feld.placeholder = "____"; feld.setAttribute("aria-label", "Jahreszahl");
      feld.addEventListener("input", () => { feld.value = feld.value.replace(/\D/g, "").slice(0, 4); bereit(feld.value.length > 0); });
      feld.addEventListener("keydown", (e) => { if (e.key === "Enter" && feld.value) $("#pruefen").click(); });
      const tasten = el("div", "ziffern");
      ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "OK"].forEach((z) => {
        const t = el("button", null, z); t.type = "button";
        if (z === "⌫") t.setAttribute("aria-label", "Löschen");
        t.addEventListener("click", () => {
          if (A.fertig) return; ton("klick");
          if (z === "⌫") feld.value = feld.value.slice(0, -1);
          else if (z === "OK") { if (feld.value) $("#pruefen").click(); return; }
          else if (feld.value.length < 4) feld.value += z;
          bereit(feld.value.length > 0);
        });
        tasten.append(t);
      });
      wrap.append(feld, tasten); box.append(wrap);
      A.pruefen = () => {
        const wert = parseInt(feld.value, 10), ok = wert === q.a;
        let zusatz = "";
        if (!ok && Math.abs(wert - q.a) <= 20 && q.a > 100) zusatz = " Knapp daneben!";
        auswerten(ok, String(q.a), () => { feld.disabled = true; feld.classList.add(ok ? "richtig" : "falsch"); tasten.querySelectorAll("button").forEach((b) => (b.disabled = true)); }, zusatz);
      };
      if (!matchMedia("(pointer: coarse)").matches) setTimeout(() => feld.focus(), 50);
    },

    wort(q, box) {
      const feld = el("input", "wort-feld"); feld.id = "wort-eingabe"; feld.autocomplete = "off"; feld.spellcheck = false; feld.placeholder = "Hier schreiben …"; feld.setAttribute("aria-label", "Antwort");
      feld.addEventListener("input", () => bereit(feld.value.trim().length > 0));
      feld.addEventListener("keydown", (e) => { if (e.key === "Enter" && feld.value.trim()) $("#pruefen").click(); });
      box.append(feld);
      A.pruefen = () => {
        const urteil = wortPruefen(feld.value, q.a);
        auswerten(urteil.ok, q.a[0], () => { feld.disabled = true; feld.classList.add(urteil.ok ? "richtig" : "falsch"); },
          urteil.ok && urteil.tippfehler ? " So schreibt man es richtig: „" + q.a[0] + "“." : "");
      };
      setTimeout(() => feld.focus(), 50);
    },

    reihe(q, box) {
      box.append(el("p", "hinweiszeile", "Tippe die Kärtchen in der richtigen Reihenfolge an. Zum Zurücknehmen tippst du oben auf ein Kärtchen."));
      const ziel = el("ol", "reihe-ziel"), pool = el("div", "chips");
      const gewaehlt = [];
      const slots = q.o.map(() => { const li = el("li"); ziel.append(li); return li; });
      const chips = mischen(q.o).map((t) => { const c = el("button", "chip", t); c.type = "button"; pool.append(c); return c; });
      function malen() {
        slots.forEach((li, i) => { li.textContent = gewaehlt[i] || ""; li.classList.toggle("voll", !!gewaehlt[i]); });
        chips.forEach((c) => (c.disabled = gewaehlt.includes(c.textContent)));
        bereit(gewaehlt.length === q.o.length);
      }
      chips.forEach((c) => c.addEventListener("click", () => { if (A.fertig) return; ton("klick"); gewaehlt.push(c.textContent); malen(); }));
      slots.forEach((li, i) => li.addEventListener("click", () => { if (A.fertig || !gewaehlt[i]) return; gewaehlt.splice(i, 1); malen(); }));
      box.append(ziel, pool); malen();
      A.pruefen = () => {
        const ok = gewaehlt.every((t, i) => t === q.o[i]);
        auswerten(ok, q.o.join(" → "), () => {
          slots.forEach((li, i) => { const r = gewaehlt[i] === q.o[i]; li.classList.add(r ? "richtig" : "falsch"); if (!r) li.append(el("span", "soll", "richtig: " + q.o[i])); });
          chips.forEach((c) => (c.disabled = true));
        });
      };
    },

    paare(q, box) {
      box.append(el("p", "hinweiszeile", "Tippe links etwas an und dann rechts das Passende dazu. Nochmal tippen löst die Verbindung."));
      const farben = ["#1d6a87", "#c3272c", "#2c8a4e", "#b8743c", "#7a4fa3", "#0f8a8a"];
      const wrap = el("div", "paare"), links = el("div", "paare-spalte"), rechts = el("div", "paare-spalte");
      const verb = {}; let aktiv = q.p[0][0];
      const lk = q.p.map(([l]) => { const b = el("button", "paar-knopf"); b.type = "button"; b.append(el("span", "marke-nr"), el("span", null, l)); b.dataset.w = l; links.append(b); return b; });
      const rk = mischen(q.p.map(([, r]) => r)).map((r) => { const b = el("button", "paar-knopf"); b.type = "button"; b.append(el("span", "marke-nr"), el("span", null, r)); b.dataset.w = r; rechts.append(b); return b; });
      function malen() {
        lk.forEach((b, i) => {
          const r = verb[b.dataset.w]; const m = b.querySelector(".marke-nr");
          b.classList.toggle("aktiv", aktiv === b.dataset.w);
          m.textContent = r ? i + 1 : ""; m.style.background = r ? farben[i % farben.length] : ""; m.style.borderStyle = r ? "solid" : "dashed"; m.style.borderColor = r ? farben[i % farben.length] : "";
        });
        rk.forEach((b) => {
          const l = Object.keys(verb).find((k) => verb[k] === b.dataset.w); const m = b.querySelector(".marke-nr");
          const i = l ? q.p.findIndex(([x]) => x === l) : -1;
          m.textContent = l ? i + 1 : ""; m.style.background = l ? farben[i % farben.length] : ""; m.style.borderStyle = l ? "solid" : "dashed"; m.style.borderColor = l ? farben[i % farben.length] : "";
        });
        bereit(Object.keys(verb).length === q.p.length);
      }
      lk.forEach((b) => b.addEventListener("click", () => { if (A.fertig) return; ton("klick"); const w = b.dataset.w; if (verb[w]) delete verb[w]; aktiv = w; malen(); }));
      rk.forEach((b) => b.addEventListener("click", () => {
        if (A.fertig) return; ton("klick"); const w = b.dataset.w;
        const besitzer = Object.keys(verb).find((k) => verb[k] === w);
        if (!aktiv) { if (besitzer) { delete verb[besitzer]; aktiv = besitzer; } }
        else { if (besitzer) delete verb[besitzer]; verb[aktiv] = w; aktiv = lk.map((x) => x.dataset.w).find((x) => !verb[x]) || null; }
        malen();
      }));
      wrap.append(links, rechts); box.append(wrap); malen();
      A.pruefen = () => {
        const ok = q.p.every(([l, r]) => verb[l] === r);
        auswerten(ok, q.p.map(([l, r]) => l + " – " + r).join(" · "), () => {
          lk.forEach((b) => { const soll = q.p.find(([x]) => x === b.dataset.w)[1]; const r = verb[b.dataset.w] === soll; b.classList.add(r ? "richtig" : "falsch"); if (!r) b.append(el("small", null, "gehört zu: " + soll)); b.disabled = true; });
          rk.forEach((b) => (b.disabled = true));
        });
      };
    },

    gruppen(q, box) {
      const wahl = {};
      const liste = el("div", "gruppen");
      const zeilen = mischen(q.i).map(([name]) => {
        const z = el("div", "gruppe-zeile"); z.append(el("span", null, name));
        const sch = el("div", "schalter"); sch.setAttribute("role", "group"); sch.setAttribute("aria-label", name);
        q.g.forEach((g, gi) => {
          const b = el("button", null, g); b.type = "button";
          b.addEventListener("click", () => { if (A.fertig) return; ton("klick"); wahl[name] = gi; sch.querySelectorAll("button").forEach((x, xi) => x.classList.toggle("an", xi === gi)); bereit(Object.keys(wahl).length === q.i.length); });
          sch.append(b);
        });
        z.append(sch); liste.append(z); return { z, name, sch };
      });
      box.append(liste);
      A.pruefen = () => {
        const ok = q.i.every(([n, g]) => wahl[n] === g);
        auswerten(ok, q.g.map((g, gi) => g + ": " + q.i.filter(([, x]) => x === gi).map(([n]) => n).join(", ")).join(" · "), () => {
          zeilen.forEach(({ z, name, sch }) => { const soll = q.i.find(([n]) => n === name)[1]; z.classList.add(wahl[name] === soll ? "richtig" : "falsch"); sch.querySelectorAll("button").forEach((b) => (b.disabled = true)); });
        });
      };
    },

    luecke(q, box) {
      const satz = el("p", "luecken-satz"); const teile = q.s.split("___"); const fuell = q.a.map(() => null); const lk = [];
      teile.forEach((t, i) => {
        satz.append(document.createTextNode(t));
        if (i < teile.length - 1) {
          const b = el("button", "luecke", " "); b.type = "button"; b.setAttribute("aria-label", "Lücke " + (i + 1));
          b.addEventListener("click", () => { if (A.fertig || !fuell[i]) return; fuell[i] = null; malen(); });
          lk.push(b); satz.append(b);
        }
      });
      const pool = el("div", "chips");
      const chips = mischen(q.o).map((w) => { const c = el("button", "chip", w); c.type = "button"; pool.append(c);
        c.addEventListener("click", () => { if (A.fertig) return; const frei = fuell.indexOf(null); if (frei < 0) return; ton("klick"); fuell[frei] = w; malen(); }); return c; });
      function malen() { lk.forEach((b, i) => (b.textContent = fuell[i] || " ")); chips.forEach((c) => (c.disabled = fuell.includes(c.textContent))); bereit(fuell.every(Boolean)); }
      box.append(satz, el("p", "hinweiszeile", "Tippe die Wörter an. Sie füllen die Lücken der Reihe nach."), pool); malen();
      A.pruefen = () => {
        const ok = q.a.every((w, i) => fuell[i] === w);
        auswerten(ok, q.a.join(", "), () => { lk.forEach((b, i) => { b.classList.add(fuell[i] === q.a[i] ? "richtig" : "falsch"); b.disabled = true; }); chips.forEach((c) => (c.disabled = true)); });
      };
    },

    mehrfach(q, box) {
      const an = new Set();
      const liste = el("div", "optionen");
      const knoepfe = mischen(q.o.map((t, i) => ({ t, i }))).map(({ t, i }) => {
        const b = el("button", "option"); b.type = "button"; b.setAttribute("aria-pressed", "false");
        b.append(el("span", "buchstabe", "✓"), el("span", null, t)); b.querySelector(".buchstabe").style.color = "transparent";
        b.addEventListener("click", () => { if (A.fertig) return; ton("klick"); if (an.has(i)) an.delete(i); else an.add(i); b.classList.toggle("gewaehlt", an.has(i)); b.setAttribute("aria-pressed", an.has(i)); b.querySelector(".buchstabe").style.color = an.has(i) ? "" : "transparent"; bereit(an.size > 0); });
        liste.append(b); return { b, i };
      });
      box.append(liste);
      A.pruefen = () => {
        const ok = q.r.length === an.size && q.r.every((i) => an.has(i));
        auswerten(ok, q.r.map((i) => q.o[i]).join(" · "), () => {
          knoepfe.forEach(({ b, i }) => { b.disabled = true; b.classList.remove("gewaehlt"); const soll = q.r.includes(i);
            if (soll) b.classList.add("richtig"); else if (an.has(i)) b.classList.add("falsch");
            b.querySelector(".buchstabe").style.color = ""; b.querySelector(".buchstabe").textContent = soll ? "✓" : an.has(i) ? "✗" : ""; });
        });
      };
    },

    erklaer(q, box) {
      const feld = el("textarea", "erklaer-feld"); feld.id = "erklaer-" + q.id; feld.placeholder = "Schreib deine Antwort in ganzen Sätzen auf – oder sag sie laut und tippe dann auf „Lösung zeigen“."; feld.setAttribute("aria-label", "Deine Antwort");
      box.append(feld);
      const pr = $("#pruefen"); pr.disabled = false; pr.textContent = "Lösung zeigen";
      A.pruefen = () => {
        if (A.selbst) return;
        A.selbst = true; pr.textContent = "Fertig"; feld.readOnly = true;
        const teil = el("div");
        teil.append(el("p", "hinweiszeile", "Hake ab, was in deiner Antwort vorkam. Sei ehrlich – das hilft dir beim Lernen!"));
        const ul = el("ul", "punkteliste"); const boxen = q.k.map((k, i) => { const li = el("li"); const lab = el("label"); const cb = el("input"); cb.type = "checkbox"; cb.id = q.id + "-k" + i; lab.append(cb, el("span", null, k)); li.append(lab); ul.append(li); return cb; });
        const muster = el("div", "muster"); muster.append(el("b", null, "So könnte deine Antwort lauten: "), document.createTextNode(q.m));
        teil.append(ul, muster); box.append(teil);
        pr.onclick = () => {
          pr.onclick = null;
          const zahl = boxen.filter((b) => b.checked).length, ok = zahl >= Math.ceil(q.k.length / 2);
          boxen.forEach((b) => (b.disabled = true));
          auswerten(ok, zahl + " von " + q.k.length + " Punkten", null, "", zahl);
        };
      };
    }
  };

  /* ───── Text vergleichen (großzügig bei Tippfehlern) ───── */
  function norm(s) {
    return s.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
      .replace(/^(der|die|das|den|dem)\s+/, "").replace(/[^a-z0-9]/g, "");
  }
  function abstand(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function wortPruefen(eingabe, erlaubt) {
    const e = norm(eingabe);
    for (const w of erlaubt) {
      const n = norm(w);
      if (e === n) return { ok: true, tippfehler: eingabe.trim() !== w };
      const grenze = n.length >= 8 ? 2 : n.length >= 4 ? 1 : 0;
      if (abstand(e, n) <= grenze) return { ok: true, tippfehler: true };
    }
    return { ok: false };
  }

  /* ───── Auswerten und Rückmeldung ───── */
  const LOB = ["Richtig!", "Super!", "Klasse!", "Genau!", "Stark!", "Prima!", "Volltreffer!"];
  const TROST = ["Nicht ganz.", "Fast!", "Knapp vorbei.", "Das war knifflig."];
  function auswerten(ok, loesungText, markieren, zusatz, probePunkte) {
    if (A.fertig) return; A.fertig = true;
    const q = A.q, s = stand(q.id);
    s.n++; if (ok) s.r++; else s.w++; s.last = ok; if (A.tipp) s.tipp++;
    if (ok) s.box = A.tipp ? Math.max(s.box, 1) : Math.min(s.box + 1, 5); else s.box = 0;
    let gewinn = 0;
    if (q.typ === "erklaer") gewinn = probePunkte || 0;
    else if (ok) gewinn = A.tipp ? 2 : 3;
    R.folge = ok ? R.folge + 1 : 0;
    let bonus = 0;
    if (ok && R.folge > 0 && R.folge % 5 === 0) bonus = 5;
    S.taler += gewinn + bonus; R.taler += gewinn + bonus;
    if (!S.tage.includes(heute())) S.tage.push(heute());
    R.ergebnisse.push({ q, ok });
    sichern();
    if (markieren) markieren();
    kontoAnzeigen(gewinn + bonus > 0);
    ton(ok ? "ok" : "nein");
    if (ok) konfetti(bonus ? 140 : 45);

    const rm = $("#rueckmeldung");
    rm.classList.toggle("nein", !ok);
    $("#rm-bild").src = ok ? (bonus ? "bilder/m_party.png" : "bilder/m_froh.png") : "bilder/m_traurig.png";
    $("#rm-bild").alt = ok ? "Das Steckenpferd freut sich" : "Das Steckenpferd ist ein bisschen traurig";
    let titel = ok ? LOB[Math.floor(Math.random() * LOB.length)] : TROST[Math.floor(Math.random() * TROST.length)];
    if (q.typ === "erklaer") titel = ok ? "Gut erklärt!" : "Das üben wir noch.";
    if (gewinn + bonus) titel += "  +" + (gewinn + bonus) + " Taler";
    if (bonus) titel += " (5 richtig in Folge!)";
    $("#rm-titel").textContent = titel;
    $("#rm-loesung").textContent = q.typ === "erklaer" ? "Du hattest " + loesungText + "." : (ok ? (zusatz || "").trim() : "Richtig ist: " + loesungText + "." + (zusatz || ""));
    $("#rm-loesung").hidden = !$("#rm-loesung").textContent;
    const merke = $("#rm-merke"); merke.innerHTML = "";
    if (q.e) { merke.append(el("b", null, "Merke: "), document.createTextNode(q.e)); }
    merke.hidden = !q.e;
    $("#aktionen").hidden = true; rm.hidden = false;
    $("#weiter").textContent = R.i + 1 < R.fragen.length ? "Weiter" : "Ergebnis ansehen";
    setTimeout(() => { rm.scrollIntoView({ behavior: leiseBewegung ? "auto" : "smooth", block: "nearest" }); $("#weiter").focus({ preventScroll: true }); }, 60);
  }

  function tippZeigen() {
    const q = A.q; if (!q.t || A.fertig) return;
    A.tipp = true; ton("klick");
    $("#tipp-text").textContent = q.t.x; $("#tipp-quelle").textContent = q.t.q ? "Aus: " + q.t.q : "";
    const tb = $("#tipp-bild"); if (q.t.b) { tb.hidden = false; tb.querySelector("img").src = q.t.b; } else tb.hidden = true;
    $("#tipp").hidden = false; $("#tipp-knopf").disabled = true;
    $("#tipp").scrollIntoView({ behavior: leiseBewegung ? "auto" : "smooth", block: "nearest" });
  }

  function weiter() {
    if (R.i + 1 < R.fragen.length) { R.i++; frageZeigen(); } else rundenende();
  }

  function rundenende() {
    const ok = R.ergebnisse.filter((x) => x.ok).length, n = R.ergebnisse.length, quote = n ? ok / n : 0;
    S.verlauf.push({ d: new Date().toISOString(), m: R.modus, ok, n, t: R.taler }); S.verlauf = S.verlauf.slice(-40); sichern();
    $("#ende-bild").src = quote >= 0.8 ? "bilder/m_party.png" : quote >= 0.5 ? "bilder/m_froh.png" : "bilder/m_denkt.png";
    $("#ende-titel").textContent = quote === 1 ? "Alles richtig – Wahnsinn!" : quote >= 0.8 ? "Super geritten!" : quote >= 0.5 ? "Gut gemacht!" : "Weiter üben lohnt sich!";
    $("#ende-text").textContent = ok + " von " + n + (R.modus === "probe" ? " Leitfragen gut erklärt." : " Fragen richtig.") + (STATION[R.modus] ? " Station „" + STATION[R.modus].name + "“: " + sichereAnzahl(R.modus) + " von " + fragenVon(R.modus).length + " Fragen sitzen sicher." : "");
    $("#ende-taler").textContent = "+" + R.taler + " Taler · Rang: " + rang();
    const box = $("#ende-fehler"); box.innerHTML = "";
    const falsch = R.ergebnisse.filter((x) => !x.ok && x.q.typ !== "erklaer");
    if (falsch.length) {
      box.append(el("h3", null, "Das schauen wir uns nochmal an"));
      const ul = el("ul");
      falsch.forEach(({ q }) => { const li = el("li"); li.append(el("div", null, q.f), el("div", "loes", "Richtig: " + loesungKurz(q))); ul.append(li); });
      box.append(ul); box.hidden = false;
    } else box.hidden = true;
    $("#ende-fehler-knopf").hidden = fehlerFragen().length === 0;
    zeige("ende");
    ton(quote >= 0.8 ? "fanfare" : "ok"); if (quote >= 0.8) konfetti(160);
  }

  function loesungKurz(q) {
    switch (q.typ) {
      case "mc": return q.o[0];
      case "jahr": return String(q.a);
      case "wort": return q.a[0];
      case "reihe": return q.o.join(" → ");
      case "paare": return q.p.map(([l, r]) => l + " – " + r).join(" · ");
      case "gruppen": return q.g.map((g, gi) => g + ": " + q.i.filter(([, x]) => x === gi).map(([n]) => n).join(", ")).join(" · ");
      case "luecke": return q.a.join(", ");
      case "mehrfach": return q.r.map((i) => q.o[i]).join(" · ");
      default: return q.m || "";
    }
  }

  /* ───── Elternbereich ───── */
  function eltern() {
    const alle = D.fragen.filter((q) => S.fragen[q.id]);
    const r = alle.reduce((s, q) => s + S.fragen[q.id].r, 0), w = alle.reduce((s, q) => s + S.fragen[q.id].w, 0);
    const z = $("#eltern-zahlen"); z.innerHTML = "";
    [[alle.length + " / " + D.fragen.length, "Fragen schon gesehen"], [r, "richtige Antworten"], [w, "falsche Antworten"], [(r + w ? Math.round((r / (r + w)) * 100) : 0) + " %", "Trefferquote"]]
      .forEach(([zahl, text]) => { const d = el("div", "zahl"); d.append(el("b", null, String(zahl)), el("span", null, text)); z.append(d); });
    const t = $("#eltern-tabelle"); t.innerHTML = "";
    const kopf = el("tr"); ["Station", "Fragen", "gesehen", "sitzen sicher", "richtig", "falsch", "Medaille"].forEach((h) => kopf.append(el("th", null, h))); t.append(kopf);
    [...D.stationen, { id: "zeit", name: "Jahreszahlen-Profi" }, { id: "probe", name: "Probearbeit (Selbsteinschätzung)" }].forEach((s) => {
      const qs = fragenVon(s.id), ges = qs.filter((q) => S.fragen[q.id]);
      const rr = ges.reduce((a, q) => a + S.fragen[q.id].r, 0), ww = ges.reduce((a, q) => a + S.fragen[q.id].w, 0);
      const tr = el("tr");
      [s.name + (s.extra ? " (Zusatz)" : ""), qs.length, ges.length, sichereAnzahl(s.id), rr, ww, { gold: "Gold", silber: "Silber", bronze: "Bronze", "": "–" }[medaille(meisterschaft(s.id))]].forEach((v) => tr.append(el("td", null, String(v))));
      t.append(tr);
    });
    const schwer = D.fragen.filter((q) => S.fragen[q.id] && S.fragen[q.id].w > 0 && q.typ !== "erklaer")
      .sort((a, b) => (S.fragen[b.id].w - S.fragen[b.id].r) - (S.fragen[a.id].w - S.fragen[a.id].r)).slice(0, 20);
    const ol = $("#eltern-schwer"); ol.innerHTML = "";
    if (!schwer.length) ol.append(el("li", null, "Noch keine falschen Antworten."));
    schwer.forEach((q) => { const s = S.fragen[q.id]; const li = el("li");
      li.append(el("div", null, q.f), el("div", "loes", "Lösung: " + loesungKurz(q)), el("div", "statistik", s.w + "× falsch, " + s.r + "× richtig" + (s.last === false ? " · zuletzt falsch" : " · zuletzt richtig") + (STATION[q.st] ? " · " + STATION[q.st].name : "")));
      ol.append(li); });
    const v = $("#eltern-verlauf"); v.innerHTML = "";
    if (!S.verlauf.length) v.append(el("li", null, "Noch keine Runde gespielt."));
    S.verlauf.slice(-12).reverse().forEach((x) => {
      const d = new Date(x.d);
      v.append(el("li", null, d.toLocaleDateString("de-DE") + " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) + " · " + (STATION[x.m] ? STATION[x.m].name : SONDER[x.m]) + ": " + x.ok + " von " + x.n + " richtig, +" + x.t + " Taler"));
    });
    $("#reset-frage").hidden = true; $("#reset-1").hidden = false;
    zeige("eltern");
  }

  /* ───── Bildlupe ───── */
  function lupe(src) { $("#lupe-bild").src = src; $("#lupe").hidden = false; $("#lupe-zu").focus(); }
  document.addEventListener("click", (e) => { const b = e.target.closest(".bildknopf"); if (b) lupe(b.querySelector("img").src); });
  $("#lupe-zu").addEventListener("click", () => ($("#lupe").hidden = true));
  $("#lupe").addEventListener("click", (e) => { if (e.target.id === "lupe") $("#lupe").hidden = true; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("#lupe").hidden = true; });

  /* ───── Verdrahtung ───── */
  $("#los").addEventListener("click", () => { const emp = empfohleneStation(); starteRunde(emp ? emp.id : "probe"); });
  $("#modus-probe").addEventListener("click", () => starteRunde("probe"));
  $("#modus-zeit").addEventListener("click", () => starteRunde("zeit"));
  $("#modus-fehler").addEventListener("click", () => starteRunde("fehler"));
  $("#pruefen").addEventListener("click", () => { if (A && A.pruefen && !A.fertig && !$("#pruefen").onclick) A.pruefen(); });
  $("#tipp-knopf").addEventListener("click", tippZeigen);
  $("#weiter").addEventListener("click", weiter);
  $("#quiz-ende").addEventListener("click", startseite);
  $("#zur-karte").addEventListener("click", startseite);
  $("#ende-karte").addEventListener("click", startseite);
  $("#nochmal").addEventListener("click", () => starteRunde(R.modus === "fehler" ? "mix" : R.modus));
  $("#ende-fehler-knopf").addEventListener("click", () => starteRunde("fehler"));
  $("#zu-eltern").addEventListener("click", eltern);
  $("#eltern-zurueck").addEventListener("click", startseite);
  $("#ton").addEventListener("click", () => { S.ton = !S.ton; sichern(); $("#ton").textContent = "Ton: " + (S.ton ? "an" : "aus"); });
  $("#reset-1").addEventListener("click", () => { $("#reset-frage").hidden = false; $("#reset-1").hidden = true; });
  $("#reset-nein").addEventListener("click", () => { $("#reset-frage").hidden = true; $("#reset-1").hidden = false; });
  $("#reset-2").addEventListener("click", () => { S = { fragen: {}, taler: 0, tage: [], ton: S.ton, verlauf: [], name: S.name }; sichern(); eltern(); kontoAnzeigen(); });
  $("#namensform").addEventListener("submit", (e) => { e.preventDefault(); S.name = $("#name-eingabe").value.trim().slice(0, 20); S.gefragt = true; sichern(); startseite(); });
  $("#name-aendern").addEventListener("click", () => { $("#name-eingabe").value = S.name || ""; $("#namensform").hidden = false; $("#startknoepfe").hidden = true; window.scrollTo(0, 0); $("#name-eingabe").focus(); });

  startseite();
})();
