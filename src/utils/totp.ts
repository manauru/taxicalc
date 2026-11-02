import QRCode from 'qrcode';

// RFC 4648 Base32 alphabet for Google Authenticator
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random Base32 secret (16 chars, 80 bits of entropy)
 */
export function generateBase32Secret(length = 16): string {
  let secret = '';
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : null;
  const randomBytes = new Uint8Array(length);
  if (cryptoObj && cryptoObj.getRandomValues) {
    cryptoObj.getRandomValues(randomBytes);
  } else {
    for (let i = 0; i < length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[randomBytes[i] % 32];
  }
  return secret;
}

/**
 * Decode Base32 string to Uint8Array
 */
export function base32ToBytes(base32: string): Uint8Array {
  const cleanBase32 = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < cleanBase32.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleanBase32[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }
  return bytes;
}

/**
 * Pure TypeScript SHA-1 implementation (RFC 3174)
 */
function sha1(bytes: Uint8Array): Uint8Array {
  // Pre-processing
  const bitLength = bytes.length * 8;
  const newByteLen = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(newByteLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;

  // Append 64-bit big-endian length
  const view = new DataView(padded.buffer);
  view.setUint32(newByteLen - 4, bitLength, false);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const w = new Uint32Array(80);

  for (let i = 0; i < newByteLen; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 80; j++) {
      const val = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (val << 1) | (val >>> 31);
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;

    for (let j = 0; j < 80; j++) {
      let f = 0;
      let k = 0;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const result = new Uint8Array(20);
  const outView = new DataView(result.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  return result;
}

/**
 * Synchronous HMAC-SHA1 (RFC 2104)
 */
function hmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Uint8Array {
  const blockSize = 64;
  let key = keyBytes;

  if (key.length > blockSize) {
    key = sha1(key);
  }
  if (key.length < blockSize) {
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(key);
    key = paddedKey;
  }

  const oPad = new Uint8Array(blockSize + 20);
  const iPad = new Uint8Array(blockSize + messageBytes.length);

  for (let i = 0; i < blockSize; i++) {
    oPad[i] = key[i] ^ 0x5c;
    iPad[i] = key[i] ^ 0x36;
  }
  iPad.set(messageBytes, blockSize);

  const innerHash = sha1(iPad);
  oPad.set(innerHash, blockSize);

  return sha1(oPad);
}

/**
 * Generate 6-digit TOTP code for a given secret and counter
 */
export function generateTotpCode(secret: string, counter?: number): string {
  if (counter === undefined) {
    counter = Math.floor(Date.now() / 1000 / 30);
  }

  const secretBytes = base32ToBytes(secret);
  if (secretBytes.length === 0) return '000000';

  // 8-byte big-endian counter
  const counterBytes = new Uint8Array(8);
  const view = new DataView(counterBytes.buffer);
  view.setUint32(4, counter, false);

  const hmac = hmacSha1(secretBytes, counterBytes);

  // Dynamic truncation (RFC 4226)
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = binary % 1000000;
  return code.toString().padStart(6, '0');
}

/**
 * Verify TOTP code with window drift tolerance (±1 step = ±30 seconds)
 */
export function verifyTotpCode(secret: string, candidateCode: string, windowSteps = 1): boolean {
  const cleanCode = candidateCode.replace(/\s+/g, '').trim();
  if (cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return false;
  }

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let step = -windowSteps; step <= windowSteps; step++) {
    const validCode = generateTotpCode(secret, currentCounter + step);
    if (validCode === cleanCode) {
      return true;
    }
  }
  return false;
}

/**
 * Get remaining seconds in current 30s TOTP cycle (0 to 29)
 */
export function getTotpRemainingSeconds(): number {
  const epochSeconds = Math.floor(Date.now() / 1000);
  return 30 - (epochSeconds % 30);
}

/**
 * Generate Emergency Backup Codes (8 codes like XXXX-XXXX)
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  for (let i = 0; i < count; i++) {
    let p1 = '';
    let p2 = '';
    for (let j = 0; j < 4; j++) {
      p1 += chars[Math.floor(Math.random() * chars.length)];
      p2 += chars[Math.floor(Math.random() * chars.length)];
    }
    codes.push(`${p1}-${p2}`);
  }
  return codes;
}

/**
 * Standard Key URI for Google Authenticator / Authy / 1Password
 */
export function getTotpKeyUri(secret: string, email: string, issuer = 'TaxiCalc PRO'): string {
  const encodedIssuer = encodeURIComponent(issuer);
  const encodedEmail = encodeURIComponent(email);
  return `otpauth://totp/${encodedIssuer}:${encodedEmail}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

/**
 * Generate QR code data URL (PNG) from URI using qrcode package
 */
export async function generateQrCodeDataUrl(uri: string): Promise<string> {
  try {
    return await QRCode.toDataURL(uri, {
      width: 260,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('Failed to generate QR code data URL:', err);
    return '';
  }
}

export interface Admin2FAConfig {
  enabled: boolean;
  secret: string;
  adminEmail: string;
  createdAt: number;
  backupCodes: string[];
  usedBackupCodes: string[];
  lastVerifiedAt?: number;
}

const STORAGE_KEY_2FA = 'taxicalc_admin_2fa_config_v1';

export function getAdmin2FAConfig(): Admin2FAConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_2FA);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.enabled === 'boolean' && parsed.secret) {
        return parsed;
      }
    }
  } catch {
    // fallback
  }

  return {
    enabled: false,
    secret: '',
    adminEmail: 'imartynov04@gmail.com',
    createdAt: 0,
    backupCodes: [],
    usedBackupCodes: [],
  };
}

export function saveAdmin2FAConfig(config: Admin2FAConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_2FA, JSON.stringify(config));
  } catch (err) {
    console.error('Failed to save 2FA config:', err);
  }
}

/**
 * Validate either 6-digit TOTP code or an unused backup code
 */
export function verifyAdmin2FACode(candidateCode: string): {
  success: boolean;
  isBackupCode: boolean;
  error?: string;
} {
  const config = getAdmin2FAConfig();
  if (!config.enabled || !config.secret) {
    // 2FA is not enabled
    return { success: true, isBackupCode: false };
  }

  const clean = candidateCode.trim().toUpperCase();

  // 1. Check if it's a 6-digit TOTP code
  if (/^\d{6}$/.test(clean)) {
    if (verifyTotpCode(config.secret, clean)) {
      config.lastVerifiedAt = Date.now();
      saveAdmin2FAConfig(config);
      return { success: true, isBackupCode: false };
    }
    return { success: false, isBackupCode: false, error: 'Неверный или устаревший 6-значный код Google Authenticator' };
  }

  // 2. Check if it's an emergency backup code
  const formattedBackup = clean.replace(/[^A-Z0-9]/g, '');
  for (const bCode of config.backupCodes) {
    const cleanBCode = bCode.replace(/[^A-Z0-9]/g, '');
    if (cleanBCode === formattedBackup) {
      if (config.usedBackupCodes.includes(bCode)) {
        return { success: false, isBackupCode: true, error: 'Этот резервный код уже был использован ранее' };
      }
      // Mark code as used
      config.usedBackupCodes.push(bCode);
      config.lastVerifiedAt = Date.now();
      saveAdmin2FAConfig(config);
      return { success: true, isBackupCode: true };
    }
  }

  return { success: false, isBackupCode: false, error: 'Код не распознан. Введите 6 цифр из приложения или резервный код' };
}
