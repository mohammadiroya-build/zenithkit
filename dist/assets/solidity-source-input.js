import { aj as React, ak as jsx } from "./index-BOd0iaB5.js";

const privateKeyPattern = /^(?:0x)?[\da-f]{64}$/i;
const privateKeyWarning = "This looks like a private key, paste your Solidity source instead";

export function SoliditySourceInput({ value, change, disabled, locked, ownershipActive, ownershipSource, toggleOwnership }) {
  const blocked = disabled || locked;
  const [message, describe] = React.useState("");
  const area = React.useRef(null);
  const latest = React.useRef({ value, disabled: blocked });
  latest.current = { value, disabled: blocked };
  const pasteId = React.useId();

  function focusForPaste() {
    requestAnimationFrame(() => {
      if (!area.current || latest.current.disabled) return;
      area.current.focus();
      area.current.select();
    });
  }

  async function paste() {
    if (latest.current.disabled) return;
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
        children: [jsx.jsx("button", {
          className: "btn ghost",
          type: "button",
          disabled: blocked,
          onClick: paste,
          title: "Replace the editor contents with code from your clipboard",
          children: "Paste code",
        }), jsx.jsx("button", {
          className: "btn ghost",
          type: "button",
          disabled: blocked,
          onClick: () => {
            describe("");
            toggleOwnership();
          },
          children: ownershipActive ? "Restore previous draft" : "Use ownership example",
        })],
      }),
      jsx.jsx("p", {
        id: pasteId,
        className: "small muted",
        children: locked
          ? "Select a Solidity compiler version to unlock the editor and paste code"
          : "Right-click inside the editor or touch and hold on mobile, then choose Paste",
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
          disabled: locked,
          value,
          onPaste: event => {
            if (blocked) {
              event.preventDefault();
              return;
            }
            const text = event.clipboardData?.getData("text/plain") ?? "";
            if (privateKeyPattern.test(text.trim())) {
              event.preventDefault();
              describe(privateKeyWarning);
            }
          },
          onChange: event => {
            if (blocked) return;
            describe("");
            change(event.target.value);
          },
          readOnly: blocked,
        }),
      }),
      ownershipActive && jsx.jsx("p", {
        className: "small muted",
        role: "status",
        children: ownershipSource
          ? "No imports required. Use direct deployment; only the deployer can change the value."
          : "Restore previous draft to return to the source and settings from before the example.",
      }),
      message && jsx.jsx("p", { className: "small muted", role: "status", children: message }),
    ],
  });
}
