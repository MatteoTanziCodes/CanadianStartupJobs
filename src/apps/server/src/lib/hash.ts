const toUint8Array = (value: string | ArrayBuffer | Uint8Array) => {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  if (value instanceof Uint8Array) {
    return value;
  }

  return new Uint8Array(value);
};

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

export const sha256Hex = async (value: string | ArrayBuffer | Uint8Array) => {
  const digest = await crypto.subtle.digest("SHA-256", toUint8Array(value));
  return toHex(digest);
};
