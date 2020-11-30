export function decodeAuthToken(
  encoded: string
): { username: string; password: string } {
  const text = Buffer.from(encoded, "base64").toString("utf8");
  const match = text.match(/^(.*?)\:(.*)$/);
  if (match == null) {
    throw new Error("invalid auth token");
  }
  const [, username, password] = match;
  return { username, password };
}
