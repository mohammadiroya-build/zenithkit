import { ak as jsx } from "./index-BOd0iaB5.js";
import { compilerBuilds } from "./compiler-versions.js";

export function CompilerVersionField({ value, change, disabled, hint }) {
  return jsx.jsxs("label", {
    className: "field compiler-version-field",
    children: [
      jsx.jsx("span", { children: "Solidity compiler version (required)" }),
      jsx.jsxs("select", {
        value,
        required: true,
        disabled,
        onChange: (event) => change(event.target.value),
        children: [
          jsx.jsx("option", { value: "", disabled: true, children: "Select a version" }),
          ...Object.keys(compilerBuilds).map((version) =>
            jsx.jsx("option", { value: version, children: version }, version),
          ),
        ],
      }),
      jsx.jsx("span", { className: "small muted", children: hint }),
    ],
  });
}

export function ContractHelpButton({ label, buttonRef, open }) {
  return jsx.jsx("button", {
    ref: buttonRef,
    type: "button",
    className: "icon-btn contract-help-button",
    "aria-label": label,
    "aria-haspopup": "dialog",
    title: label,
    onClick: open,
    children: "?",
  });
}
