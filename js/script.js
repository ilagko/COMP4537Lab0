// ChatGPT 5 was used to generate documentation and comments for this file.
// ChatGPT 5 also authored the simple randInt helper used below.
/*
  Memory Order Game

  Disclosure: This code was authored with help from an AI assistant (ChatGPT).
  The developer reviewed and understands the implementation.

  Minimal overview: show numbered buttons, scramble their positions, then ask
  the user to click them in order. Kept intentionally simple with light checks
  and minimal comments.
*/

// Messages are provided via global USER_MESSAGES (see lang/messages/...)
// Destructure for convenient access; undefined values are fine for minimal UI.
const {
  LABEL_HOW_MANY,
  BTN_GO,
  MSG_ENTER_VALID_RANGE,
  MSG_MEMORIZE_ORDER,
  MSG_SCRAMBLING,
  MSG_GET_READY,
  MSG_CLICK_IN_ORDER,
  MSG_WRONG_ORDER,
  MSG_EXCELLENT,
} = window.USER_MESSAGES || {};

// Simple helper for random ints: inclusive of both ends
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

class LayoutManager {
  constructor(margin = 8) {
    this.margin = margin; // keep elements away from viewport edges
  }

  getViewportSize() {
    return { width: window.innerWidth, height: window.innerHeight }; // current view size
  }

  computeRandomPositionFor(element) {
    const { width: vw, height: vh } = this.getViewportSize(); // fresh each time
    const rect = element.getBoundingClientRect(); // use actual size on screen
    const maxLeft = Math.max(0, vw - rect.width - this.margin); // stay in bounds
    const maxTop = Math.max(0, vh - rect.height - this.margin);
    const minLeft = Math.min(this.margin, maxLeft); // handle tiny viewports
    const minTop = Math.min(this.margin, maxTop);
    const left = randInt(minLeft, maxLeft); // pick a random slot horizontally
    const top = randInt(minTop, maxTop); // pick a random slot vertically
    return { left, top };
  }
}

class GameButton {
  constructor(id, color) {
    this.id = id; // 1..n as the original order
    this.color = color;
    this.isRevealed = true;
    this.el = document.createElement("button");
    this.el.className = "memory-btn";
    this.el.style.backgroundColor = color;
    this.el.textContent = String(id);
    this._clickHandler = null;
  }

  render(parent) {
    parent.appendChild(this.el);
  }

  setRowMode() {
    this.el.style.position = "static";
  }

  setAbsoluteModeFromCurrent() {
    // Freeze current visual position before switching to fixed positioning
    const r = this.el.getBoundingClientRect(); // current x/y in pixels
    this.el.style.position = "fixed";
    this.el.style.left = `${r.left}px`;
    this.el.style.top = `${r.top}px`;
  }

  setPosition(left, top) {
    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;
  }

  hideNumber() {
    this.isRevealed = false;
    this.el.textContent = "";
  }

  revealNumber() {
    this.isRevealed = true;
    this.el.textContent = String(this.id);
  }

  enable(onClick) {
    this.el.classList.add("clickable");
    this._clickHandler = (e) => onClick(this, e); // pass instance to handler
    this.el.addEventListener("click", this._clickHandler);
  }

  disable() {
    this.el.classList.remove("clickable");
    if (this._clickHandler) {
      this.el.removeEventListener("click", this._clickHandler);
      this._clickHandler = null;
    }
  }

  remove() {
    this.disable();
    this.el.remove();
  }
}

class MemoryGame {
  constructor({ playfieldEl, messageEl, goBtnEl, countInputEl, labelEl }) {
    this.playfieldEl = playfieldEl;
    this.messageEl = messageEl;
    this.goBtnEl = goBtnEl;
    this.countInputEl = countInputEl;
    this.labelEl = labelEl;

    this.layout = new LayoutManager(8);
    this.buttons = [];
    this.expectedNext = 1;
    this.scrambleLeft = 0;
    this.timer = null; // single timer for simplicity (no arrays of timeouts)
    this.rowContainer = null;

    this._wireUIStrings();
    this._wireGoButton();
  }

  _wireUIStrings() {
    if (LABEL_HOW_MANY) this.labelEl.textContent = LABEL_HOW_MANY;
    if (BTN_GO) this.goBtnEl.textContent = BTN_GO;
  }

  _wireGoButton() {
    this.goBtnEl.addEventListener("click", () => {
      // Keep it simple: parse and clamp to [3,7]; default to 3.
      let n = parseInt(this.countInputEl.value, 10); // read from input box
      if (!Number.isInteger(n)) n = 3; // default if empty/invalid
      if (n < 3) n = 3; // clamp low
      if (n > 7) n = 7; // clamp high
      this.start(n);
    });
  }

  _setMessage(msg) {
    this.messageEl.textContent = msg;
  }

  reset() {
    // stop timer (if a round was in progress)
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // remove buttons
    for (const b of this.buttons) b.remove();
    this.buttons = [];
    this.expectedNext = 1;
    this.scrambleLeft = 0;

    // clear row container if present
    if (this.rowContainer) {
      this.rowContainer.remove();
      this.rowContainer = null;
    }
  }

  /**
   * Begin a new round with `n` buttons.
   * Flow:
   * 1) Reset state and show the ordered row with labels visible.
   * 2) After `n` seconds (memorization window), start the scramble phase.
   * @param {number} n - Number of buttons (3..7) to generate.
   */
  start(n) {
    this.reset();
    this._setMessage(MSG_MEMORIZE_ORDER);
    this._createRow(n);

    // After n seconds, begin scrambling
    this.timer = setTimeout(() => this._beginScrambling(n), n * 1000); // memorize window
  }

  _createRow(n) {
    const row = document.createElement("div");
    row.className = "row-container";
    this.rowContainer = row;
    this.playfieldEl.appendChild(row);

    const colors = this._generateColors(n);
    for (let i = 1; i <= n; i++) {
      const btn = new GameButton(i, colors[i - 1]);
      btn.setRowMode();
      btn.render(row);
      this.buttons.push(btn);
    }
  }

  _generateColors(n) {
    // Simple deterministic palette: evenly spaced hues, fixed saturation/light
    const colors = [];
    for (let i = 0; i < n; i++) {
      const hue = Math.round((360 / n) * i); // distribute around the color wheel
      const sat = 70; // fixed saturation for consistency
      const light = 60; // fixed lightness for readability
      colors.push(`hsl(${hue} ${sat}% ${light}%)`);
    }
    return colors;
  }

  _beginScrambling(n) {
    this._setMessage(MSG_GET_READY);
    // Switch each button to fixed positioning at its current visual spot
    for (const btn of this.buttons) btn.setAbsoluteModeFromCurrent();
    // Re-parent buttons to playfield to keep them on screen when removing row container
    for (const btn of this.buttons) this.playfieldEl.appendChild(btn.el);
    // Remove the row container now
    if (this.rowContainer) {
      this.rowContainer.remove();
      this.rowContainer = null;
    }

    this.scrambleLeft = n; // scramble n times, every 2 seconds
    this._setMessage(MSG_SCRAMBLING);
    this._scrambleLoop();
  }

  _scrambleLoop() {
    if (this.scrambleLeft <= 0) {
      this._finishScrambling();
      return;
    }

    // Re-read window size and position within bounds each time
    this._scrambleOnce();
    this.scrambleLeft -= 1;

    this.timer = setTimeout(() => this._scrambleLoop(), 2000); // wait, then repeat
  }

  _scrambleOnce() {
    for (const btn of this.buttons) {
      const { left, top } = this.layout.computeRandomPositionFor(btn.el); // random slot
      btn.setPosition(left, top); // apply to element
    }
  }

  _finishScrambling() {
    // Hide numbers and enable clicking in order
    for (const btn of this.buttons) {
      btn.hideNumber();
      btn.disable();
    }
    this.expectedNext = 1;
    this._setMessage(MSG_CLICK_IN_ORDER);
    for (const btn of this.buttons) {
      btn.enable((b) => this._onGuess(b));
    }
  }

  _onGuess(button) {
    if (button.id === this.expectedNext) {
      button.revealNumber();
      button.disable();
      this.expectedNext += 1;
      if (this.expectedNext > this.buttons.length) {
        this._win();
      }
    } else {
      this._lose();
    }
  }

  _win() {
    this._setMessage(MSG_EXCELLENT);
    for (const b of this.buttons) b.disable();
  }

  _lose() {
    this._setMessage(MSG_WRONG_ORDER);
    for (const b of this.buttons) {
      b.revealNumber();
      b.disable();
    }
  }
}

// Bootstrap
document.addEventListener("DOMContentLoaded", () => {
  const playfieldEl = document.getElementById("playfield");
  const messageEl = document.getElementById("message");
  const goBtnEl = document.getElementById("goBtn");
  const countInputEl = document.getElementById("btnCount");
  const labelEl = document.getElementById("label-count");

  // Initialize game controller
  const game = new MemoryGame({ playfieldEl, messageEl, goBtnEl, countInputEl, labelEl });
});
