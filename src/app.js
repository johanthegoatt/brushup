// Brushup page glue: read the room, run the plan in core.js, and draw the paint
// to buy for each job (walls, ceiling, woodwork). All the maths lives in
// core.js with no DOM, so the same file runs in the page and under the tests.
(function () {
  "use strict";
  var B = window.Brushup;
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    len: $("len"), wid: $("wid"), hgt: $("hgt"),
    doors: $("doors"), windows: $("windows"), coats: $("coats"),
    paint: $("paint"), price: $("price"), strong: $("strong"),
    doCeiling: $("doCeiling"), doWood: $("doWood"),
    woodArea: $("woodArea"), woodAreaWrap: $("woodAreaWrap"),
    out: $("out"), ceilHint: $("ceilHint")
  };

  function wallPaintOptions() {
    B.PAINTS.filter(function (p) { return p.use === "wall"; }).forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.label + " (" + p.spread + " m²/L)";
      els.paint.appendChild(o);
    });
    els.paint.value = "matt";
  }

  function numVal(el, fallback) {
    var n = Number(el.value);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function fmtL(n) {
    var r = Math.round(n * 10) / 10;
    return (r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)) + " L";
  }
  function fmtTins(tins) {
    return tins.map(function (t) {
      var s = t.size % 1 === 0 ? t.size + " L" : (t.size === 0.75 ? "750 ml" : t.size + " L");
      return t.count + " × " + s;
    }).join(" + ");
  }
  function fmtMoney(n) { return "£" + (Math.round(n * 100) / 100).toFixed(2); }

  function readPlan() {
    var price = els.price.value === "" ? null : numVal(els.price, null);
    return {
      room: {
        length: numVal(els.len, 0), width: numVal(els.wid, 0),
        height: numVal(els.hgt, 2.4)
      },
      openings: {
        doors: Math.floor(numVal(els.doors, 0)),
        windows: Math.floor(numVal(els.windows, 0))
      },
      strongColour: els.strong.checked,
      walls: {
        paint: els.paint.value, coats: Number(els.coats.value) || 2,
        pricePerLitre: price
      },
      ceiling: {
        include: els.doCeiling.checked, paint: "ceiling",
        coats: Number(els.coats.value) || 2, pricePerLitre: price
      },
      woodwork: {
        include: els.doWood.checked, area: numVal(els.woodArea, 0),
        paint: "satinwood", coats: 2, pricePerLitre: price
      }
    };
  }

  function jobCard(title, j) {
    if (!j) return "";
    var html = '<div class="job">';
    html += '<div class="job__head"><h3>' + title + '</h3><span class="job__litres">' + fmtL(j.litres) + '</span></div>';
    var areaLine = "Area " + j.area + " m²";
    if (j.grossArea != null && j.openingsArea > 0) {
      areaLine = j.grossArea + " m² less " + j.openingsArea + " m² of openings = " + j.area + " m²";
    }
    html += '<p class="job__area">' + areaLine + " · " + j.coats + (j.coats === 1 ? " coat" : " coats") + " · " + j.spread + " m²/L</p>";
    html += '<p class="job__buy"><strong>Buy: ' + (j.tins.length ? fmtTins(j.tins) : "nothing") + "</strong>";
    if (j.bought > 0) {
      html += ' <span class="job__sub">(' + fmtL(j.bought) + " total, " + fmtL(j.leftover) + " left over";
      if (j.cost != null) html += ", " + fmtMoney(j.cost);
      html += ")</span>";
    }
    html += "</p></div>";
    return html;
  }

  function compute() {
    var p = readPlan();
    var r = B.plan(p);

    var ceilA = B.ceilingArea(p.room);
    els.ceilHint.textContent = ceilA > 0 ? "(" + (Math.round(ceilA * 10) / 10) + " m²)" : "";
    els.woodAreaWrap.hidden = !els.doWood.checked;

    var html = "";
    html += jobCard("Walls", r.walls);
    if (r.ceiling) html += jobCard("Ceiling", r.ceiling);
    if (r.woodwork) html += jobCard("Woodwork", r.woodwork);

    if (r.totals && (r.ceiling || r.woodwork)) {
      html += '<div class="total"><span>Total paint</span><strong>' + fmtL(r.totals.bought);
      if (r.totals.cost != null) html += " · " + fmtMoney(r.totals.cost);
      html += "</strong></div>";
    }

    if (r.notes.length) {
      html += '<ul class="tips">';
      r.notes.forEach(function (n) { html += "<li>" + n + "</li>"; });
      html += "</ul>";
    }

    els.out.innerHTML = html;

    if (window.Dab) {
      window.Dab.context({
        strongColour: p.strongColour,
        woodwork: els.doWood.checked,
        ceiling: els.doCeiling.checked,
        hasResult: r.walls && r.walls.bought > 0
      });
    }
    writeHash(p);
  }

  // Share link: the whole form lives in the URL's #fragment, which a browser
  // never sends to a server, so nothing you enter is uploaded.
  function writeHash(p) {
    var payload = {
      v: 1,
      l: p.room.length, w: p.room.width, h: p.room.height,
      d: p.openings.doors, wn: p.openings.windows,
      c: p.walls.coats, pt: p.walls.paint, pr: els.price.value,
      sc: p.strongColour ? 1 : 0,
      ce: els.doCeiling.checked ? 1 : 0,
      wd: els.doWood.checked ? 1 : 0, wa: p.woodwork.area
    };
    try {
      var s = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      history.replaceState(null, "", "#" + s);
    } catch (e) { /* ignore */ }
  }

  function readHash() {
    if (!location.hash || location.hash.length < 2) return false;
    try {
      var p = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
      if (!p) return false;
      if (p.l != null) els.len.value = p.l;
      if (p.w != null) els.wid.value = p.w;
      if (p.h != null) els.hgt.value = p.h;
      if (p.d != null) els.doors.value = p.d;
      if (p.wn != null) els.windows.value = p.wn;
      if (p.c != null) els.coats.value = String(p.c);
      if (p.pt) els.paint.value = p.pt;
      if (p.pr != null) els.price.value = p.pr;
      els.strong.checked = !!p.sc;
      els.doCeiling.checked = !!p.ce;
      els.doWood.checked = !!p.wd;
      if (p.wa != null) els.woodArea.value = p.wa;
      return true;
    } catch (e) { return false; }
  }

  // Wire it all up: any change recomputes.
  ["input", "change"].forEach(function (ev) {
    [els.len, els.wid, els.hgt, els.doors, els.windows, els.coats, els.paint,
     els.price, els.strong, els.doCeiling, els.doWood, els.woodArea].forEach(function (el) {
      el.addEventListener(ev, compute);
    });
  });

  $("reset").addEventListener("click", function () {
    location.hash = "";
    els.len.value = "4"; els.wid.value = "3"; els.hgt.value = "2.4";
    els.doors.value = "1"; els.windows.value = "1"; els.coats.value = "2";
    els.paint.value = "matt"; els.price.value = ""; els.strong.checked = false;
    els.doCeiling.checked = false; els.doWood.checked = false; els.woodArea.value = "8";
    compute();
  });

  $("share").addEventListener("click", function () {
    compute();
    var btn = $("share");
    function done(msg) { var old = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = old; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(function () { done("Link copied"); }, function () { done("Copy the URL"); });
    } else { done("Copy the URL"); }
  });

  wallPaintOptions();
  readHash();
  compute();
})();
