// Brushup core: how much paint to buy for a room. Measure the walls (and the
// ceiling and woodwork if you're doing them), say how many coats, and Brushup
// works out the paintable area, the litres each job needs, and the tins to buy
// with the least left over. No DOM in here, so the same file runs in the page
// and under `node --test`.
//
// The method is the trade one: litres = area x coats / spread rate, where the
// spread rate is how many square metres a litre covers in one coat. Emulsion
// for walls and ceilings covers roughly 12 square metres per litre per coat;
// most jobs want two coats, and a strong colour change can want three. Primer
// and exterior masonry paint cover less; gloss and satinwood for trim cover a
// lot but go on small areas. Door and window openings come off the wall area
// because you don't paint the glass or the door with wall paint.
//
// Figures are typical manufacturer spread rates (Dulux, Crown) rounded to
// honest round numbers; the exact figure is on the tin and depends on the
// surface, so Brushup adds a touch-up allowance on top and rounds up to whole
// tins. Sources: Dulux and Crown product coverage, and standard decorating
// guidance on openings and coats.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Brushup = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Spread rate is square metres covered by one litre in one coat. These are
  // deliberately a little conservative so you don't come up short.
  var PAINTS = [
    { id: "matt",       label: "Matt emulsion",         spread: 12, use: "wall" },
    { id: "silk",       label: "Silk / vinyl emulsion", spread: 13, use: "wall" },
    { id: "durable",    label: "Kitchen & bathroom",    spread: 12, use: "wall" },
    { id: "primer",     label: "Primer / mist coat",    spread: 10, use: "wall" },
    { id: "masonry",    label: "Exterior masonry",      spread: 6,  use: "wall" },
    { id: "ceiling",    label: "Ceiling matt",          spread: 12, use: "ceiling" },
    { id: "gloss",      label: "Gloss (wood/metal)",    spread: 15, use: "wood" },
    { id: "satinwood",  label: "Satinwood (wood)",      spread: 15, use: "wood" },
    { id: "eggshell",   label: "Eggshell (wood)",       spread: 14, use: "wood" },
    { id: "woodprimer", label: "Wood primer",           spread: 11, use: "wood" }
  ];
  var PAINT_BY_ID = {};
  PAINTS.forEach(function (p) { PAINT_BY_ID[p.id] = p; });

  // Tin sizes stocked for emulsion (litres), largest first. Trim paint also
  // comes in 750 ml, added in when the job is woodwork.
  var TIN_SIZES = [10, 5, 2.5, 1];
  var TRIM_TINS = [2.5, 1, 0.75];

  // Typical opening sizes in square metres: a standard internal door is about
  // 1.5 m2 (1981 x 762 mm); a window averages around 1.4 m2. Both are editable.
  var DOOR_AREA = 1.5;
  var WINDOW_AREA = 1.4;

  function num(v, fallback) {
    var n = Number(v);
    return isFinite(n) && n >= 0 ? n : fallback;
  }

  function spreadOf(id) {
    var p = PAINT_BY_ID[id];
    return p ? p.spread : 12;
  }

  // The wall area you actually paint: the room's perimeter times its height,
  // less the door and window openings. Give either room dimensions (length,
  // width, height in metres) or a wall area directly.
  function wallArea(room) {
    room = room || {};
    if (room.wallArea != null) return Math.max(0, num(room.wallArea, 0));
    var l = num(room.length, 0), w = num(room.width, 0), h = num(room.height, 2.4);
    return Math.max(0, 2 * (l + w) * h);
  }

  function ceilingArea(room) {
    room = room || {};
    if (room.ceilingArea != null) return Math.max(0, num(room.ceilingArea, 0));
    var l = num(room.length, 0), w = num(room.width, 0);
    return Math.max(0, l * w);
  }

  function openingsArea(openings) {
    openings = openings || {};
    var doors = Math.max(0, Math.floor(num(openings.doors, 0)));
    var windows = Math.max(0, Math.floor(num(openings.windows, 0)));
    var da = openings.doorArea != null ? num(openings.doorArea, DOOR_AREA) : DOOR_AREA;
    var wa = openings.windowArea != null ? num(openings.windowArea, WINDOW_AREA) : WINDOW_AREA;
    return doors * da + windows * wa;
  }

  // Pick the tins that cover `litres` with the least paint left over, breaking a
  // tie by the fewest tins. Brute force over the few sizes available, which is
  // tiny for any real room.
  function pickTins(litres, sizes) {
    sizes = (sizes && sizes.length ? sizes : TIN_SIZES).slice().sort(function (a, b) { return b - a; });
    if (litres <= 0) return { tins: [], bought: 0, leftover: 0 };
    var caps = sizes.map(function (s) { return Math.floor(litres / s) + 1; });
    var best = null;

    function search(i, counts, bought) {
      if (bought >= litres) {
        var totalTins = counts.reduce(function (a, b) { return a + b; }, 0);
        var leftover = bought - litres;
        if (!best ||
            bought < best.bought - 1e-9 ||
            (Math.abs(bought - best.bought) < 1e-9 && totalTins < best.tins)) {
          best = { counts: counts.slice(), bought: bought, tins: totalTins, leftover: leftover };
        }
        return;
      }
      if (i >= sizes.length) return;
      for (var c = caps[i]; c >= 0; c--) {
        counts[i] = c;
        search(i + 1, counts, bought + c * sizes[i]);
      }
      counts[i] = 0;
    }
    search(0, sizes.map(function () { return 0; }), 0);

    var tins = [];
    if (best) {
      best.counts.forEach(function (c, i) { if (c > 0) tins.push({ size: sizes[i], count: c }); });
    }
    return { tins: tins, bought: best ? best.bought : 0, leftover: best ? best.leftover : 0 };
  }

  function round1(n) { return Math.round(n * 10) / 10; }
  function round2(n) { return Math.round(n * 100) / 100; }

  // Work out one job (walls, ceiling or woodwork): net area, litres for the
  // coats, the touch-up allowance on top, and the tins to buy.
  function job(opts) {
    opts = opts || {};
    var net = Math.max(0, num(opts.area, 0));
    var coats = Math.max(1, Math.floor(num(opts.coats, 2)));
    var spread = opts.spread != null ? Math.max(1, num(opts.spread, 12)) : spreadOf(opts.paint);
    var extraPct = opts.extraPercent != null ? num(opts.extraPercent, 10) : 10;

    var litresBare = net * coats / spread;
    var litres = litresBare * (1 + extraPct / 100);
    var sizes = PAINT_BY_ID[opts.paint] && PAINT_BY_ID[opts.paint].use === "wood" ? TRIM_TINS : TIN_SIZES;
    var picked = pickTins(litres, opts.tinSizes || sizes);

    var price = opts.pricePerLitre != null ? num(opts.pricePerLitre, 0) : null;
    var cost = price != null ? round2(picked.bought * price) : null;

    return {
      paint: opts.paint || null,
      area: round2(net),
      coats: coats,
      spread: spread,
      litres: round2(litres),
      litresExact: litres,
      tins: picked.tins,
      bought: round2(picked.bought),
      leftover: round2(picked.leftover),
      cost: cost
    };
  }

  // The whole plan for a room. Walls are on by default; ceiling and woodwork are
  // opt-in. Returns each job plus the totals, and a few plain-word notes.
  function plan(opts) {
    opts = opts || {};
    var room = opts.room || {};
    var extraPct = opts.extraPercent != null ? num(opts.extraPercent, 10) : 10;
    var out = { walls: null, ceiling: null, woodwork: null, notes: [], totals: null };

    var jobs = [];

    if (!opts.walls || opts.walls.include !== false) {
      var w = opts.walls || {};
      var gross = wallArea(room);
      var openings = openingsArea(opts.openings);
      var netWall = Math.max(0, gross - openings);
      out.walls = job({
        area: netWall, coats: w.coats != null ? w.coats : 2,
        paint: w.paint || "matt", extraPercent: extraPct,
        pricePerLitre: w.pricePerLitre, tinSizes: opts.tinSizes
      });
      out.walls.grossArea = round2(gross);
      out.walls.openingsArea = round2(openings);
      jobs.push(out.walls);
    }

    if (opts.ceiling && opts.ceiling.include) {
      var c = opts.ceiling;
      out.ceiling = job({
        area: ceilingArea(room), coats: c.coats != null ? c.coats : 2,
        paint: c.paint || "ceiling", extraPercent: extraPct,
        pricePerLitre: c.pricePerLitre
      });
      jobs.push(out.ceiling);
    }

    if (opts.woodwork && opts.woodwork.include) {
      var wd = opts.woodwork;
      out.woodwork = job({
        area: Math.max(0, num(wd.area, 0)), coats: wd.coats != null ? wd.coats : 2,
        paint: wd.paint || "satinwood", extraPercent: extraPct,
        pricePerLitre: wd.pricePerLitre
      });
      jobs.push(out.woodwork);
    }

    var totalLitres = 0, totalBought = 0, totalCost = 0, anyCost = false;
    jobs.forEach(function (j) {
      totalLitres += j.litresExact;
      totalBought += j.bought;
      if (j.cost != null) { totalCost += j.cost; anyCost = true; }
    });
    out.totals = {
      litres: round2(totalLitres),
      bought: round2(totalBought),
      cost: anyCost ? round2(totalCost) : null
    };

    // Plain-word guidance.
    if (out.walls && out.walls.coats < 2) {
      out.notes.push("One coat rarely covers. Two is the norm unless you're going over the same colour in good condition.");
    }
    if (out.walls && out.walls.paint === "matt" && (opts.strongColour)) {
      out.notes.push("Big colour change? A dark-to-light switch often needs a third coat or a tinted primer first.");
    }
    if (out.walls && out.walls.leftover >= 2.5) {
      out.notes.push("A fair bit left over here. The tins round up, so keep the spare for touch-ups rather than buying a size down.");
    }
    return out;
  }

  return {
    PAINTS: PAINTS,
    TIN_SIZES: TIN_SIZES,
    TRIM_TINS: TRIM_TINS,
    DOOR_AREA: DOOR_AREA,
    WINDOW_AREA: WINDOW_AREA,
    spreadOf: spreadOf,
    wallArea: wallArea,
    ceilingArea: ceilingArea,
    openingsArea: openingsArea,
    pickTins: pickTins,
    job: job,
    plan: plan
  };
});
