"use strict";
const test = require("node:test");
const assert = require("node:assert");
const B = require("../src/core.js");

test("wall area is perimeter times height", () => {
  // 4m x 3m room, 2.4m high: perimeter 14m x 2.4 = 33.6 m2
  assert.ok(Math.abs(B.wallArea({ length: 4, width: 3, height: 2.4 }) - 33.6) < 1e-9);
});

test("ceiling area is length times width", () => {
  assert.ok(Math.abs(B.ceilingArea({ length: 4, width: 3 }) - 12) < 1e-9);
});

test("a direct wall area is used as given", () => {
  assert.strictEqual(B.wallArea({ wallArea: 40 }), 40);
});

test("openings subtract a door and a window", () => {
  // default door 1.5 + window 1.4 = 2.9 m2
  assert.ok(Math.abs(B.openingsArea({ doors: 1, windows: 1 }) - 2.9) < 1e-9);
});

test("litres follow area x coats / spread with a touch-up allowance", () => {
  // 36 m2 of walls, 2 coats, matt spread 12 = 6 L bare; +10% = 6.6 L
  const j = B.job({ area: 36, coats: 2, paint: "matt", extraPercent: 10 });
  assert.ok(Math.abs(j.litresExact - 6.6) < 1e-9);
  assert.strictEqual(j.coats, 2);
  assert.strictEqual(j.spread, 12);
});

test("tins are picked to cover the litres with least left over", () => {
  // need 6.6 L: a 5 + 1 + 1 = 7 (0.4 left) beats a 5 + 2.5 (0.9) and a 10 (3.4)
  const p = B.pickTins(6.6);
  assert.strictEqual(p.bought, 7);
  assert.ok(p.leftover < 0.5);
  const tenL = p.tins.find((t) => t.size === 10);
  assert.ok(!tenL, "should not jump straight to a 10 L tin");
});

test("pickTins prefers fewer tins on a tie", () => {
  // need exactly 5 L: one 5 beats five 1s and beats 2.5+2.5
  const p = B.pickTins(5);
  assert.strictEqual(p.bought, 5);
  assert.strictEqual(p.tins.length, 1);
  assert.strictEqual(p.tins[0].size, 5);
  assert.strictEqual(p.tins[0].count, 1);
});

test("a small job buys a single 1 L tin", () => {
  const p = B.pickTins(0.7);
  assert.strictEqual(p.bought, 1);
  assert.strictEqual(p.tins[0].size, 1);
});

test("plan: a standard bedroom in two coats of matt", () => {
  const r = B.plan({
    room: { length: 4, width: 3, height: 2.4 },
    openings: { doors: 1, windows: 1 },
    walls: { paint: "matt", coats: 2 }
  });
  // gross 33.6 - 2.9 openings = 30.7 net; x2 /12 = 5.117 +10% = 5.628 L
  assert.ok(Math.abs(r.walls.grossArea - 33.6) < 0.01);
  assert.ok(Math.abs(r.walls.area - 30.7) < 0.01);
  assert.ok(r.walls.litres > 5.5 && r.walls.litres < 5.8);
  // needs more than a 5 L tin, so a 5 + a 1 (6 L) or similar
  assert.ok(r.walls.bought >= 5.6);
  assert.strictEqual(r.totals.bought, r.walls.bought);
});

test("plan: ceiling and woodwork add their own tins", () => {
  const r = B.plan({
    room: { length: 4, width: 3, height: 2.4 },
    walls: { paint: "matt", coats: 2 },
    ceiling: { include: true, paint: "ceiling", coats: 2 },
    woodwork: { include: true, area: 8, paint: "satinwood", coats: 2 }
  });
  assert.ok(r.ceiling && r.ceiling.bought > 0);
  assert.ok(r.woodwork && r.woodwork.bought > 0);
  // ceiling 12 m2 x2 /12 = 2 L +10% = 2.2 L -> a 2.5 tin
  assert.ok(Math.abs(r.ceiling.area - 12) < 0.01);
  // woodwork uses trim tin sizes (incl. 750 ml)
  const smallTrim = r.woodwork.tins.some((t) => t.size === 0.75 || t.size === 1 || t.size === 2.5);
  assert.ok(smallTrim);
  assert.ok(r.totals.bought > r.walls.bought);
});

test("masonry covers far less, so needs more paint", () => {
  const matt = B.job({ area: 60, coats: 2, paint: "matt" });
  const masonry = B.job({ area: 60, coats: 2, paint: "masonry" });
  assert.ok(masonry.litresExact > matt.litresExact * 1.5);
});

test("cost uses the litres actually bought", () => {
  const r = B.plan({
    room: { wallArea: 30 },
    walls: { paint: "matt", coats: 2, pricePerLitre: 6 }
  });
  assert.ok(r.walls.cost != null);
  assert.ok(Math.abs(r.walls.cost - r.walls.bought * 6) < 0.01);
  assert.strictEqual(r.totals.cost, r.walls.cost);
});

test("one coat raises a note to use two", () => {
  const r = B.plan({ room: { wallArea: 30 }, walls: { paint: "matt", coats: 1 } });
  assert.ok(r.notes.some((n) => /two/i.test(n)));
});

test("paints are well-formed", () => {
  assert.ok(B.PAINTS.length >= 8);
  B.PAINTS.forEach((p) => {
    assert.ok(typeof p.id === "string" && p.id.length > 0);
    assert.ok(typeof p.label === "string" && p.label.length > 0);
    assert.ok(typeof p.spread === "number" && p.spread > 0);
    assert.ok(["wall", "ceiling", "wood"].indexOf(p.use) >= 0);
  });
});

test("an empty room needs no paint", () => {
  const r = B.plan({ room: { wallArea: 0 }, walls: { paint: "matt", coats: 2 } });
  assert.strictEqual(r.walls.area, 0);
  assert.strictEqual(r.walls.bought, 0);
  assert.strictEqual(r.walls.tins.length, 0);
});
