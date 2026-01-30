/**
 * Account management for Digital Will SDK
 *
 * Handles private keys, view keys, addresses, signing, and record decryption.
 * Pattern follows ProvableHQ/sdk Account implementation.
 */

import { AleoAddress, AleoField } from './types';
import { DigitalWillError, ErrorCode } from './errors';

/**
 * Private key ciphertext for encrypted storage
 */
export interface PrivateKeyCiphertext {
  ciphertext: string;
  nonce: string;
  salt: string;
}

/**
 * Parameters for creating an Account
 */
export interface AccountParams {
  /**
   * Private key string (starts with APrivateKey1)
   */
  privateKey?: string;

  /**
   * Seed bytes for deterministic key derivation
   */
  seed?: Uint8Array;
}

/**
 * Aleo Account class
 *
 * Manages private key, view key, and address derivation.
 * Provides signing and decryption capabilities.
 *
 * @example
 * ```typescript
 * // Create from private key
 * const account = new Account({ privateKey: 'APrivateKey1...' });
 *
 * // Create random account
 * const randomAccount = new Account();
 *
 * // Get address
 * console.log(account.address); // aleo1...
 *
 * // Sign a message
 * const signature = account.sign(messageBytes);
 * ```
 */
export class Account {
  private readonly _privateKey: string;
  private readonly _viewKey: string;
  private readonly _address: AleoAddress;

  /**
   * Create a new Account
   *
   * @param params - Account creation parameters
   * @throws DigitalWillError if private key is invalid
   */
  constructor(params?: AccountParams) {
    if (params?.privateKey) {
      // Validate and use provided private key
      if (!this.isValidPrivateKey(params.privateKey)) {
        throw new DigitalWillError(ErrorCode.INVALID_PRIVATE_KEY, 'Invalid private key format');
      }
      this._privateKey = params.privateKey;
    } else if (params?.seed) {
      // Derive from seed
      this._privateKey = this.derivePrivateKeyFromSeed(params.seed);
    } else {
      // Generate random private key
      this._privateKey = this.generateRandomPrivateKey();
    }

    // Derive view key and address from private key
    this._viewKey = this.deriveViewKey(this._privateKey);
    this._address = this.deriveAddress(this._privateKey);
  }

  /**
   * Get the private key
   *
   * SECURITY: Handle with care. Never log or expose.
   */
  get privateKey(): string {
    return this._privateKey;
  }

  /**
   * Get the view key
   *
   * Used to decrypt records owned by this account.
   */
  get viewKey(): string {
    return this._viewKey;
  }

  /**
   * Get the public address
   *
   * Safe to share publicly.
   */
  get address(): AleoAddress {
    return this._address;
  }

  /**
   * Sign a message with the private key
   *
   * @param message - Message bytes to sign
   * @returns Signature string
   *
   * @example
   * ```typescript
   * const message = new TextEncoder().encode('Hello, Aleo!');
   * const signature = account.sign(message);
   * ```
   */
  sign(message: Uint8Array): string {
    // NOTE: In production, this uses Aleo SDK's signing functionality
    // This is a placeholder that generates a deterministic mock signature
    const messageHash = this.hashBytes(message);
    const keyHash = this.hashString(this._privateKey);
    return `sign1${this.combineHashes(messageHash, keyHash)}`;
  }

  /**
   * Verify a signature against a message
   *
   * @param message - Original message bytes
   * @param signature - Signature to verify
   * @returns True if signature is valid
   */
  verify(message: Uint8Array, signature: string): boolean {
    // NOTE: In production, uses Aleo SDK's signature verification
    const expectedSignature = this.sign(message);
    return signature === expectedSignature;
  }

  /**
   * Decrypt a record ciphertext
   *
   * @param ciphertext - Encrypted record ciphertext
   * @returns Decrypted record as JSON string
   * @throws DigitalWillError if decryption fails
   *
   * @example
   * ```typescript
   * const record = account.decryptRecord(encryptedRecord);
   * const parsed = JSON.parse(record);
   * ```
   */
  decryptRecord(ciphertext: string): string {
    // NOTE: In production, uses Aleo SDK's record decryption
    // Validate ciphertext format
    if (!ciphertext || typeof ciphertext !== 'string') {
      throw new DigitalWillError(ErrorCode.RECORD_DECRYPTION_FAILED, 'Invalid ciphertext');
    }

    // Check if this is a record we can decrypt (mock check)
    if (!ciphertext.includes('record')) {
      throw new DigitalWillError(
        ErrorCode.RECORD_DECRYPTION_FAILED,
        'Unable to decrypt record with provided view key'
      );
    }

    // Placeholder: return mock decrypted record
    return JSON.stringify({
      owner: this._address,
      data: 'decrypted_data',
    });
  }

  /**
   * Encrypt the account with a password for secure storage
   *
   * @param password - Password to encrypt with
   * @returns Encrypted private key ciphertext
   *
   * @example
   * ```typescript
   * const encrypted = account.encryptAccount('my-secure-password');
   * // Store encrypted.ciphertext safely
   *
   * // Later, decrypt:
   * const restored = Account.decryptAccount(encrypted, 'my-secure-password');
   * ```
   */
  encryptAccount(password: string): PrivateKeyCiphertext {
    if (!password || password.length < 8) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        'Password must be at least 8 characters'
      );
    }

    // Generate random salt and nonce
    const salt = this.generateRandomHex(32);
    const nonce = this.generateRandomHex(24);

    // NOTE: In production, use proper encryption (e.g., AES-GCM with PBKDF2)
    // This is a placeholder XOR-based "encryption"
    const key = this.deriveEncryptionKey(password, salt);
    const ciphertext = this.xorEncrypt(this._privateKey, key, nonce);

    return {
      ciphertext,
      nonce,
      salt,
    };
  }

  /**
   * Decrypt an encrypted account
   *
   * @param encrypted - Encrypted private key ciphertext
   * @param password - Password to decrypt with
   * @returns Restored Account
   * @throws DigitalWillError if decryption fails
   */
  static decryptAccount(encrypted: PrivateKeyCiphertext, password: string): Account {
    if (!password) {
      throw new DigitalWillError(ErrorCode.INVALID_PARAMETER, 'Password is required');
    }

    try {
      // Derive the same key
      const key = new Account().deriveEncryptionKey(password, encrypted.salt);
      const privateKey = new Account().xorDecrypt(encrypted.ciphertext, key, encrypted.nonce);

      return new Account({ privateKey });
    } catch (error) {
      throw new DigitalWillError(
        ErrorCode.RECORD_DECRYPTION_FAILED,
        'Failed to decrypt account. Wrong password?'
      );
    }
  }

  /**
   * Create account from mnemonic phrase
   *
   * @param mnemonic - BIP39 mnemonic phrase
   * @returns Account derived from mnemonic
   */
  static fromMnemonic(mnemonic: string): Account {
    // NOTE: In production, use proper BIP39 derivation
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12 && words.length !== 24) {
      throw new DigitalWillError(
        ErrorCode.INVALID_PARAMETER,
        'Mnemonic must be 12 or 24 words'
      );
    }

    // Convert mnemonic to seed
    const encoder = new TextEncoder();
    const seed = encoder.encode(mnemonic);
    const paddedSeed = new Uint8Array(32);
    paddedSeed.set(seed.slice(0, 32));

    return new Account({ seed: paddedSeed });
  }

  /**
   * Export account to JSON (encrypted)
   *
   * @param password - Password to encrypt with
   * @returns JSON string of encrypted account
   */
  exportToJson(password: string): string {
    const encrypted = this.encryptAccount(password);
    return JSON.stringify({
      version: 1,
      address: this._address,
      encrypted,
    });
  }

  /**
   * Import account from JSON
   *
   * @param json - JSON string of encrypted account
   * @param password - Password to decrypt with
   * @returns Restored Account
   */
  static importFromJson(json: string, password: string): Account {
    try {
      const data = JSON.parse(json);
      if (data.version !== 1 || !data.encrypted) {
        throw new Error('Invalid account format');
      }
      return Account.decryptAccount(data.encrypted, password);
    } catch (error) {
      throw new DigitalWillError(
        ErrorCode.RECORD_PARSE_ERROR,
        'Failed to import account from JSON'
      );
    }
  }

  /**
   * Compute commitment for a value (for Merkle trees, etc.)
   *
   * @param value - Value to commit
   * @returns Field commitment
   */
  computeCommitment(value: string): AleoField {
    const hash = this.hashString(`${this._address}:${value}`);
    return `${hash}field`;
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private isValidPrivateKey(key: string): boolean {
    return typeof key === 'string' &&
           key.startsWith('APrivateKey1') &&
           key.length > 50;
  }

  private generateRandomPrivateKey(): string {
    // Generate 32 random bytes
    const randomBytes = new Uint8Array(32);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes);
    } else {
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }

    // Convert to base58-like string
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = 'APrivateKey1';
    for (let i = 0; i < 47; i++) {
      const byteValue = randomBytes[i % 32] ?? 0;
      result += chars[byteValue % chars.length];
    }
    return result;
  }

  private derivePrivateKeyFromSeed(seed: Uint8Array): string {
    // Deterministically derive private key from seed
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = 'APrivateKey1';
    for (let i = 0; i < 47; i++) {
      const seedByte = seed[i % seed.length] ?? 0;
      const idx = (seedByte + i) % chars.length;
      result += chars[idx];
    }
    return result;
  }

  private deriveViewKey(privateKey: string): string {
    // NOTE: In production, use proper Aleo SDK derivation
    const hash = this.hashString(privateKey + ':viewkey');
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let result = 'AViewKey1';
    for (let i = 0; i < 47; i++) {
      const idx = parseInt(hash.slice(i * 2, i * 2 + 2) || '0', 16) % chars.length;
      result += chars[idx];
    }
    return result;
  }

  private deriveAddress(privateKey: string): AleoAddress {
    // NOTE: In production, use proper Aleo SDK derivation
    const hash = this.hashString(privateKey + ':address');
    const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
    let result = 'aleo1';
    for (let i = 0; i < 58; i++) {
      const idx = parseInt(hash.slice(i * 2, i * 2 + 2) || '0', 16) % chars.length;
      result += chars[idx];
    }
    return result;
  }

  private hashString(input: string): string {
    let hash = 0n;
    for (let i = 0; i < input.length; i++) {
      hash = (hash * 31n + BigInt(input.charCodeAt(i))) % (2n ** 256n);
    }
    return hash.toString(16).padStart(64, '0');
  }

  private hashBytes(bytes: Uint8Array): string {
    let hash = 0n;
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i] ?? 0;
      hash = (hash * 31n + BigInt(byte)) % (2n ** 256n);
    }
    return hash.toString(16).padStart(64, '0');
  }

  private combineHashes(hash1: string, hash2: string): string {
    const combined = BigInt('0x' + hash1) ^ BigInt('0x' + hash2);
    return combined.toString(16).padStart(64, '0');
  }

  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }

  private deriveEncryptionKey(password: string, salt: string): string {
    // NOTE: In production, use PBKDF2 or Argon2
    return this.hashString(password + salt);
  }

  private xorEncrypt(data: string, key: string, nonce: string): string {
    // Simple XOR encryption (placeholder - use proper encryption in production)
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const nonceChar = nonce.charCodeAt(i % nonce.length);
      const encrypted = data.charCodeAt(i) ^ keyChar ^ nonceChar;
      result += encrypted.toString(16).padStart(2, '0');
    }
    return result;
  }

  private xorDecrypt(ciphertext: string, key: string, nonce: string): string {
    // Reverse the XOR encryption
    let result = '';
    for (let i = 0; i < ciphertext.length; i += 2) {
      const encrypted = parseInt(ciphertext.slice(i, i + 2), 16);
      const keyChar = key.charCodeAt((i / 2) % key.length);
      const nonceChar = nonce.charCodeAt((i / 2) % nonce.length);
      const decrypted = encrypted ^ keyChar ^ nonceChar;
      result += String.fromCharCode(decrypted);
    }
    return result;
  }
}

/**
 * Generate a random account for testing
 */
export function generateRandomAccount(): Account {
  return new Account();
}

/**
 * Validate an Aleo private key format
 */
export function isValidPrivateKey(key: string): boolean {
  return typeof key === 'string' &&
         key.startsWith('APrivateKey1') &&
         key.length > 50;
}

/**
 * Validate an Aleo view key format
 */
export function isValidViewKey(key: string): boolean {
  return typeof key === 'string' &&
         key.startsWith('AViewKey1') &&
         key.length > 50;
}
