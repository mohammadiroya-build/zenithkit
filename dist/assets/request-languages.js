// Languages with a direct model to English in the bundled translation catalog.
// English goes straight to the existing request parser.
const supported = "af ar bg bn ca cs da de el en es et eu fa fi fr gl gu hbs he hi hu id is it ja kn ko lt lv ml mr ms nb nl no pl pt ro ru sk sl sq sv ta te th tr uk ur vi zh zh-Hant".split(" ");
const names = { hbs: "Bosanski / Hrvatski / Srpski", no: "Norsk (generelt)" };

export const requestLanguages = supported.map(code => {
  let label = names[code];
  if (!label) {
    try {
      label = new Intl.DisplayNames([code], { type: "language" }).of(code);
    } catch {
      label = code;
    }
  }
  return { code, label };
});

export function translationLanguage(code) {
  if (/^(?:bs|hr|sh|sr)(?:-|$)/.test(code)) return "hbs";
  return code === "zlm" ? "ms" : code;
}
