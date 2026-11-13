export function etagMatches(header: string | null, current: string | null) {
  if (!header || !current) return false;
  return header.split(",").map((value) => value.trim()).some((value) => value === "*" || value === current || value === `W/${current}`);
}
