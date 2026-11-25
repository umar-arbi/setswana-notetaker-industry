/* Home page rep earnings calculator (index.html #rep-calc). Example maths only: P20 per new Standard customer,
   P10 per new Starter customer, once per customer. No network, no storage. */
(function () {
  "use strict";
  var MAX = 100, STANDARD = 20, STARTER = 10;

  function clamp(n) {
    n = Math.round(Number(n) || 0);
    return Math.min(MAX, Math.max(0, n));
  }
  function total(s, t) { return s * STANDARD + t * STARTER; }
  // Set the number of customers, keeping the Standard share as close as possible.
  function setCount(state, n) {
    n = clamp(n);
    var s = Math.round(n * state.share);
    return { s: s, t: n - s, share: state.share };
  }
  // Move one customer between plans: dir > 0 moves one to Standard, dir < 0 moves one to Starter.
  function shift(state, dir) {
    var s = state.s, t = state.t;
    if (dir > 0 && t > 0) { s += 1; t -= 1; }
    if (dir < 0 && s > 0) { s -= 1; t += 1; }
    return { s: s, t: t, share: s + t ? s / (s + t) : state.share };
  }
  function pula(n) { return "P" + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function plural(n, word) { return n + " " + word + (n === 1 ? " customer" : " customers"); }
  function summary(s, t) {
    if (!s && !t) return "Add customers to see a total";
    if (!t) return plural(s, "Standard") + " × P20";
    if (!s) return plural(t, "Starter") + " × P10";
    return s + " Standard × P20 + " + t + " Starter × P10";
  }

  var api = { clamp: clamp, total: total, setCount: setCount, shift: shift, pula: pula, summary: summary };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; return; }

  var root = document.getElementById("rep-calc");
  if (!root) return;
  function $(id) { return document.getElementById(id); }
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var state = { s: 10, t: 0, share: 1 };
  var shown = total(state.s, state.t), frame = 0;
  var chips = root.querySelectorAll(".rc-chip");
  var buttons = root.querySelectorAll("button");
  for (var i = 0; i < buttons.length; i++) buttons[i].disabled = false;

  function animate(to) {
    var from = shown, start = 0, num = $("rc-total-num");
    cancelAnimationFrame(frame);
    if (calm || from === to) { shown = to; num.textContent = pula(to).slice(1); return; }
    function tick(now) {
      if (!start) start = now;
      var k = Math.min(1, (now - start) / 420), e = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (to - from) * e);
      num.textContent = pula(shown).slice(1);
      if (k < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }

  function render() {
    var n = state.s + state.t, sum = total(state.s, state.t);
    $("rc-n").textContent = String(n);
    $("rc-s").textContent = String(state.s);
    $("rc-t").textContent = String(state.t);
    $("rc-sum").textContent = summary(state.s, state.t);
    $("rc-total-sr").textContent = pula(sum) + (n ? " from " + summary(state.s, state.t).replace(/ × P\d+/g, "") : "");
    $("rc-bar-std").style.setProperty("--w", (n ? state.s / n : state.share) * 100 + "%");
    $("rc-dec").disabled = n <= 0;
    $("rc-inc").disabled = n >= MAX;
    $("rc-more-std").disabled = state.t <= 0;
    $("rc-more-sta").disabled = state.s <= 0;
    for (var i = 0; i < chips.length; i++) chips[i].setAttribute("aria-pressed", String(Number(chips[i].getAttribute("data-n")) === n));
    animate(sum);
  }

  // A button that disables itself (for example "−" at 0) hands focus to its partner, so keyboard focus is never lost.
  function on(id, partner, change) {
    $(id).addEventListener("click", function () {
      state = change();
      render();
      if (this.disabled) $(partner).focus();
    });
  }
  on("rc-dec", "rc-inc", function () { return setCount(state, state.s + state.t - 1); });
  on("rc-inc", "rc-dec", function () { return setCount(state, state.s + state.t + 1); });
  on("rc-more-std", "rc-more-sta", function () { return shift(state, 1); });
  on("rc-more-sta", "rc-more-std", function () { return shift(state, -1); });
  for (var c = 0; c < chips.length; c++) {
    chips[c].addEventListener("click", function () { state = setCount(state, this.getAttribute("data-n")); render(); });
  }
  render();
})();
