import { aj as React, ak as jsx } from "./index-BOd0iaB5.js";

const privateKeyPattern = /^(?:0x)?[\da-f]{64}$/i;
const privateKeyWarning = "This looks like a private key, paste your Solidity source instead";

export function SoliditySourceInput({ value, change, disabled }) {
  const [message, describe] = React.useState("");
  const area = React.useRef(null);
  const latest = React.useRef({ value, disabled });
  latest.current = { value, disabled };
  const pasteId = React.useId();

  function focusForPaste() {
    requestAnimationFrame(() => {
      if (!area.current || latest.current.disabled) return;
      area.current.focus();
      area.current.select();
    });
  }

  async function paste() {
    const original = latest.current.value;
    describe("");
    try {
      if (typeof navigator.clipboard?.readText !== "function") throw new Error();
      const text = await navigator.clipboard.readText();
      if (latest.current.disabled || latest.current.value !== original) return;
      if (!text.trim()) {
        describe("Nothing to paste, copy your Solidity or Standard JSON first");
        return;
      }
      if (privateKeyPattern.test(text.trim())) {
        describe(privateKeyWarning);
        return;
      }
      change(text);
      describe("Code pasted");
    } catch {
      if (latest.current.disabled) return;
      describe("Use your browser’s Paste menu or keyboard shortcut to replace the selected code");
      focusForPaste();
    }
  }

  return jsx.jsxs("div", {
    className: "contract-editor",
    children: [
      jsx.jsx("div", {
        className: "action-row contract-editor-actions",
        children: jsx.jsx("button", {
          className: "btn ghost",
          type: "button",
          disabled,
          onClick: paste,
          title: "Replace the editor contents with code from your clipboard",
          children: "Paste code",
        }),
      }),
      jsx.jsx("p", {
        id: pasteId,
        className: "small muted",
        children: "Right-click inside the editor or touch and hold on mobile, then choose Paste",
      }),
      jsx.jsx("div", {
        className: "contract-editor-surface",
        children: jsx.jsx("textarea", {
          ref: area,
          "aria-label": "Solidity source editor",
          "aria-describedby": pasteId,
          className: "contract-plain-source mono",
          rows: 14,
          spellCheck: false,
          autoCapitalize: "off",
          autoCorrect: "off",
          autoComplete: "off",
          value,
          onPaste: event => {
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (privateKeyPattern.test(text.trim())) {
              event.preventDefault();
              describe(privateKeyWarning);
            }
          },
          onChange: event => {
            describe("");
            change(event.target.value);
          },
          readOnly: disabled,
        }),
      }),
      message && jsx.jsx("p", { className: "small muted", role: "status", children: message }),
    ],
  });
}
