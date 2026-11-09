// Dab, the friendly paintbrush in the corner. Dab offers a tip when tapped and
// changes the tip to match what you're measuring: starting out, adding a
// ceiling, doing woodwork, or a big colour change. The app tells Dab the
// context; Dab never changes it on a timer of its own. Everything Dab says goes
// through the bubble's live region so a screen reader hears it, and Dab holds
// still if you have asked for reduced motion.
(function () {
  "use strict";
  var btn = document.getElementById("dab");
  var bubble = document.getElementById("dab-bubble");
  if (!btn) { window.Dab = { react: function () {}, context: function () {}, say: function () {} }; return; }

  var still = matchMedia("(prefers-reduced-motion: reduce)");
  var tipKey = "start";
  var bubbleTimer = null, taps = [];

  var TIPS = {
    start: [
      "Hi, I'm Dab. Pop in the room size and I'll tell you how much paint to buy and which tins.",
      "Walls are perimeter times height. I take the doors and windows off, since you don't paint those.",
      "Most walls want two coats. One only covers if you're going over the same colour in good nick."
    ],
    ceiling: [
      "Ceiling's its own tin. Its area is just the floor: length times width.",
      "Ceiling paint is matt so it doesn't show roller marks. Two coats there too."
    ],
    wood: [
      "Skirting, doors and frames use gloss or satinwood, not wall paint, so that's a separate tin.",
      "Trim paint covers a lot of ground, but you're only painting thin strips, so a small tin usually does it."
    ],
    colour: [
      "Dark going light? Budget a third coat, or a tinted primer first, or it'll grin through.",
      "I add a bit on top for touch-ups and rolling up the tin. Better than running out two metres from the end."
    ],
    tins: [
      "I pick the tins that leave the least paint over. Keep the spare for scuffs later.",
      "The real spread rate's on the tin and depends on the surface. Bare plaster drinks the first coat."
    ]
  };

  function pick(key) {
    var list = TIPS[key] || TIPS.start;
    return list[Math.floor(Math.random() * list.length)];
  }

  function say(text) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add("show");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(function () { bubble.classList.remove("show"); }, 7000);
  }

  // The app calls this to keep Dab's tip in step with what's being measured.
  function context(info) {
    if (!info) return;
    if (info.strongColour) { tipKey = "colour"; return; }
    if (info.woodwork) { tipKey = "wood"; return; }
    if (info.ceiling) { tipKey = "ceiling"; return; }
    if (info.hasResult) { tipKey = "tins"; return; }
    tipKey = "start";
  }

  function react() {
    say(pick(tipKey));
    taps.push(Date.now());
    taps = taps.filter(function (t) { return Date.now() - t < 1500; });
    if (taps.length >= 5 && !still.matches) {
      btn.classList.add("wiggle");
      setTimeout(function () { btn.classList.remove("wiggle"); }, 600);
      taps = [];
    }
  }

  btn.addEventListener("click", react);
  btn.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); react(); }
  });

  window.Dab = { react: react, context: context, say: say };
})();
