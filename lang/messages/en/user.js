// ChatGPT 5 was used to generate documentation and comments for this file.
// Messages displayed to the user (EN)
// Keep all user-visible strings here to avoid hardcoded strings in code.

(function () {
  const msgs = {
    LABEL_HOW_MANY: "How many buttons to create?",
    BTN_GO: "Go",
    MSG_ENTER_VALID_RANGE: "Please enter a number between 3 and 7.",
    MSG_MEMORIZE_ORDER: "Memorize the order.",
    MSG_SCRAMBLING: "Scrambling...",
    MSG_GET_READY: "Get ready...",
    MSG_CLICK_IN_ORDER: "Now click buttons in the original order.",
    MSG_WRONG_ORDER: "Wrong order!",
    MSG_EXCELLENT: "Excellent memory!",
  };
  // Expose as a single global
  window.USER_MESSAGES = Object.freeze(msgs);
})();
