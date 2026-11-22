// Match the whole request so a fast template never ignores extra requirements.
function persianStorageForms(value) {
  const contract = "(?:لطفا(?:ً)? )?(?:(?:یک|یه) )?قرارداد(?: هوشمند)?";
  const create = "(?:بساز(?:ید)?|بنویس(?:ید)?|(?:ایجاد|طراحی) کن(?:ید)?)";
  const item = `(?:(?:یک|یه) )?(?:${value})`;
  return [
    new RegExp(`^${contract} ${create} که ${item} (?:(?:را|رو) )?(?:ذخیره (?:کند|کنه)|نگه[‌ ]?دار[ده])$`, "u"),
    new RegExp(`^${contract} برای ذخیره(?:\\u0654|\\u200c?ی)? ${item} ${create}$`, "u"),
  ];
}

const requests = [
  {
    type: "uint256",
    forms: [
      /^(?:(?:create|write|build|make) (?:a |an )?(?:simple )?(?:smart )?contract (?:that stores|to store)|(?:store|save)) (?:a |an )?(?:(?:unsigned )?(?:integer|number)|uint256)(?:(?:,| and)? with (?:a )?(?:getter and setter|setter and getter)| and (?:read it back|read it))?$/iu,
      /^(?:crea|scrivi|genera) un contratto(?: intelligente)? (?:che (?:memorizza|memorizzi|salva|salvi)|per (?:memorizzare|salvare)) un numero(?:,? con funzioni per (?:aggiornare e leggere|leggere e aggiornare) il numero)?$/iu,
      /^(?:crea|escribe|genera) un contrato(?: inteligente)? (?:que (?:almacene|guarde)|para (?:almacenar|guardar)) un número$/iu,
      /^(?:crée|écris|génère) un contrat(?: intelligent)? (?:qui (?:stocke|enregistre)|pour (?:stocker|enregistrer)) un nombre$/iu,
      /^(?:erstelle|schreibe) einen (?:smart contract|vertrag),? der eine zahl speichert$/iu,
      /^(?:أنشئ|اكتب|صمم) (?:عقدًا|عقدا|عقد)(?: ذكيًا| ذكيا| ذكي)? (?:يخزن|يحفظ|لتخزين|لحفظ) (?:رقمًا|رقما|رقم|عددًا|عددا|عدد)$/u,
      /^(?:crie|escreva) um contrato(?: inteligente)? (?:que (?:armazene|guarde)|para (?:armazenar|guardar)) um número$/iu,
      /^(?:создай|напиши) (?:смарт-контракт|контракт),? который хранит число$/iu,
      /^(?:创建|建立|编写|撰寫)(?:一个|一個)?(?:(?:存储|储存|儲存|保存)(?:数字|數字|数值|數值)的)(?:智能合约|智慧合約|合约|合約)$/u,
      /^(?:数値|数字)を保存する(?:スマート)?(?:コントラクト|契約)を(?:作成してください|作ってください)$/u,
    ],
    persian: persianStorageForms("عدد"),
  },
  {
    type: "string",
    forms: [
      /^(?:(?:create|write|build|make) (?:a )?(?:simple )?(?:smart )?contract (?:that stores|to store)|(?:store|save)) (?:a )?(?:text|message|string)(?:(?:,| and)? with (?:a )?(?:getter and setter|setter and getter)| and (?:read it back|read it))?$/iu,
      /^(?:crea|scrivi|genera) un contratto(?: intelligente)? (?:che (?:memorizza|memorizzi|salva|salvi)|per (?:memorizzare|salvare)) un (?:testo|messaggio)$/iu,
      /^(?:crea|escribe|genera) un contrato(?: inteligente)? (?:que (?:almacene|guarde)|para (?:almacenar|guardar)) un (?:texto|mensaje)$/iu,
      /^(?:crée|écris|génère) un contrat(?: intelligent)? (?:qui (?:stocke|enregistre)|pour (?:stocker|enregistrer)) un (?:texte|message)$/iu,
      /^(?:erstelle|schreibe) einen (?:smart contract|vertrag),? der eine nachricht speichert$/iu,
      /^(?:أنشئ|اكتب|صمم) (?:عقدًا|عقدا|عقد)(?: ذكيًا| ذكيا| ذكي)? (?:يخزن|يحفظ|لتخزين|لحفظ) (?:نصًا|نصا|نص|رسالة)$/u,
      /^(?:crie|escreva) um contrato(?: inteligente)? (?:que (?:armazene|guarde)|para (?:armazenar|guardar)) uma mensagem$/iu,
      /^(?:создай|напиши) (?:смарт-контракт|контракт),? который хранит (?:текст|сообщение)$/iu,
      /^(?:创建|建立|编写|撰寫)(?:一个|一個)?(?:(?:存储|储存|儲存|保存)(?:文本|文字|消息|訊息)的)(?:智能合约|智慧合約|合约|合約)$/u,
      /^(?:文章|文字列|メッセージ)を保存する(?:スマート)?(?:コントラクト|契約)を(?:作成してください|作ってください)$/u,
    ],
    persian: persianStorageForms("متن|پیام|رشته"),
  },
];

export function matchStorageRequest(request, compilerVersion) {
  if (typeof request !== "string" || request.length > 1600) return null;
  let text = request.replace(/\s+/gu, " ").trim();
  const nameMatch = /(?:^|\s)(?:contract name|solidity name|نام قرارداد|اسم قرارداد)\s*[:：]\s*([A-Za-z_]\w{0,63})[.!؟۔。]?$/iu.exec(text);
  if (nameMatch && !/^[A-Za-z_][A-Za-z0-9_]{0,63}$/.test(nameMatch[1])) return null;
  if (nameMatch) text = text.slice(0, nameMatch.index).trim();
  text = text.normalize("NFC").replace(/[.!؟۔。]+$/u, "").trim();

  const persianText = text.replace(/ي/g, "ی").replace(/ك/g, "ک");
  const spec = requests.find(({ forms, persian }) => forms.some(form => form.test(text)) ||
    persian.some(form => form.test(persianText)));
  if (!spec) return null;
  const isText = spec.type === "string";
  const name = nameMatch?.[1] ?? (isText ? "TextStore" : "NumberStore");
  const source = `// SPDX-License-Identifier: MIT
pragma solidity ${compilerVersion};

contract ${name} {
    ${spec.type} private storedValue;

    function setValue(${spec.type}${isText ? " calldata" : ""} newValue) external {
        storedValue = newValue;
    }

    function getValue() external view returns (${spec.type}${isText ? " memory" : ""}) {
        return storedValue;
    }
}
`;
  return {
    title: isText ? "Text storage · Fast template" : "Number storage · Fast template",
    name,
    source,
    details: [
      ["Value", isText ? "Text (string)" : "Non-negative integer (uint256)"],
      ["Write access", "Any account can update the value"],
      ["Read access", "Any account can read the value"],
    ],
    generated: false,
    editable: true,
  };
}
