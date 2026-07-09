export function normalizeBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");

  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55")) {
    return `55${digits}`;
  }

  return digits;
}
