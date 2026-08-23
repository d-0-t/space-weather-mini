// Maps a Kp value (0–9, possibly fractional) to its storm-scale token class.
// The kp01–kp9 range classes are the app's sole color-token mechanism
// (see Tables.scss); each class covers a unit band, e.g. 2–3 → kp23.
export function kpClass(kp: number): string {
  if (Number.isNaN(kp) || kp < 1) return "kp01";
  if (kp >= 9) return "kp9";
  const a = Math.floor(kp);
  const b = Math.ceil(kp);
  return a === b ? `kp${a}${a + 1}` : `kp${a}${b}`;
}