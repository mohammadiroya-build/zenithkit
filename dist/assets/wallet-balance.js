const ZTH_SCALE = 10n ** 18n;
const DISPLAY_SCALE = 10n ** 5n;
const DISPLAY_UNIT = ZTH_SCALE / DISPLAY_SCALE;

function formatUnits(value, scale, places) {
  const whole = (value / scale).toString().replace(/\B(?=(\d{3})+$)/g, ",");
  const fraction = (value % scale).toString().padStart(places, "0").replace(/0+$/, "");
  return `${whole}${fraction ? `.${fraction}` : ""} ZTH`;
}

export function formatWalletBalance(wei) {
  const exact = formatUnits(wei, ZTH_SCALE, 18);
  if (wei > 0n && wei < DISPLAY_UNIT) return { text: "<0.00001 ZTH", exact };

  const rounded = (wei + DISPLAY_UNIT / 2n) / DISPLAY_UNIT;
  return { text: formatUnits(rounded, DISPLAY_SCALE, 5), exact };
}
