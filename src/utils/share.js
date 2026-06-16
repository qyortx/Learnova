// Utility for encoding/decoding game configuration to/from URL safe Base64 strings

export function encodeGame(config) {
  try {
    const jsonStr = JSON.stringify(config);
    // Encode UTF-8 safely and convert to Base64
    const base64 = btoa(encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    }));
    // Make URL safe: replace + with -, / with _, remove padding =
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (e) {
    console.error("Failed to encode game config:", e);
    return '';
  }
}

export function decodeGame(encodedStr) {
  try {
    if (!encodedStr) return null;
    // Restore standard Base64: replace - with +, _ with /
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
    // Restore padding
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const jsonStr = decodeURIComponent(Array.prototype.map.call(binary, (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to decode game config:", e);
    return null;
  }
}
