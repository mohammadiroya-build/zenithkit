const supported = "af ar bg bn ca cs da de el en es et eu fa fi fr gl gu hbs he hi hu id is it ja kn ko lt lv ml mr ms nb nl no pl pt ro ru sk sl sq sv ta te th tr uk ur vi zh zh-Hant".split(" ");
const names = { hbs: "Bosnian / Croatian / Serbian", no: "Norwegian" };
const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

export const requestLanguages = supported.map(code => {
  let label = names[code];
  if (!label) {
    try {
      label = displayNames.of(code);
    } catch {
      label = code;
    }
  }
  return { code, label };
}).sort((a, b) => a.label.localeCompare(b.label, "en"));
