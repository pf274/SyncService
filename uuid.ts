export function generateUuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const digit = (Math.random() * 16) | 0;
    const conformingDigit = character === "x" ? digit : (digit & 0x3) | 0x8;
    return conformingDigit.toString(16);
  });
}