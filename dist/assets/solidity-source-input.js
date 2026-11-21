import { aj as React, ak as jsx } from "./index-BOd0iaB5.js";

export function SoliditySourceInput({ value, change, disabled, renderHighlighted }) {
  const [highlighted, setHighlighted] = React.useState(false);
  const [message, describe] = React.useState("");
  const area = React.useRef(null);
  const latest = React.useRef({ value, disabled });
  latest.current = { value, disabled };
  const pasteId = React.useId();

  function focusForPaste() {
    setHighlighted(false);
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
      if (/^(?:0x)?[\da-f]{64}$/i.test(text.trim())) {
        describe("This looks like a private key, copy your Solidity source instead");
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
      jsx.jsxs("div", {
        className: "action-row contract-editor-actions",
        children: [
          jsx.jsx("button", {
            className: "btn ghost",
            type: "button",
            disabled,
            onClick: paste,
            title: "Replace the editor contents with code from your clipboard",
            children: "Paste code",
          }),
          renderHighlighted && jsx.jsx("button", {
            className: "btn ghost",
            type: "button",
            disabled,
            "aria-pressed": highlighted,
            onClick: () => {
              describe("");
              setHighlighted(current => !current);
            },
            children: highlighted ? "Use plain text" : "Syntax highlighting",
          }),
        ],
      }),
      jsx.jsx("p", {
        id: pasteId,
        className: "small muted",
        children: highlighted
          ? "Use Paste code to replace the source, or switch to plain text for the browser’s Paste menu"
          : "Use Paste code to replace the source, or right-click or touch and hold in the editor to paste at the cursor",
      }),
      jsx.jsx("div", {
        className: "contract-editor-surface",
        children: highlighted && renderHighlighted ? renderHighlighted() : jsx.jsx("textarea", {
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
