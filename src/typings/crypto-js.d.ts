declare module "crypto-js" {
  interface WordArray {
    toString(encoder?: Encoder): string;
    words: number[];
    sigBytes: number;
    concat(wordArray: WordArray): WordArray;
    clamp(): void;
    clone(): WordArray;
  }

  interface Encoder {
    stringify(wordArray: WordArray): string;
    parse(str: string): WordArray;
  }

  interface CipherParams {
    toString(encoder?: Formatter): string;
    ciphertext: WordArray;
    key?: WordArray;
    iv?: WordArray;
    salt?: WordArray;
  }

  interface Formatter {
    stringify(cipherParams: CipherParams): string;
    parse(str: string): CipherParams;
  }

  interface AESStatic {
    encrypt(
      message: string | WordArray,
      key: string | WordArray,
      cfg?: object
    ): CipherParams;
    decrypt(
      ciphertext: string | CipherParams,
      key: string | WordArray,
      cfg?: object
    ): WordArray;
  }

  const AES: AESStatic;

  const enc: {
    Utf8: Encoder;
    Hex: Encoder;
    Base64: Encoder;
    Latin1: Encoder;
    Base64url: Encoder;
  };

  const lib: {
    WordArray: {
      random(nBytes: number): WordArray;
    };
  };

  const algo: Record<string, unknown>;

  const mode: Record<string, unknown>;

  const pad: Record<string, unknown>;

  const format: Record<string, Formatter>;

  function MD5(message: string | WordArray): WordArray;
  function SHA1(message: string | WordArray): WordArray;
  function SHA256(message: string | WordArray): WordArray;
  function SHA512(message: string | WordArray): WordArray;
  function HmacSHA256(
    message: string | WordArray,
    key: string | WordArray
  ): WordArray;
  function PBKDF2(
    password: string | WordArray,
    salt: string | WordArray,
    cfg?: object
  ): WordArray;

  const CryptoJS: {
    AES: AESStatic;
    enc: typeof enc;
    lib: typeof lib;
    MD5: typeof MD5;
    SHA256: typeof SHA256;
  };

  export {
    AES,
    enc,
    lib,
    algo,
    mode,
    pad,
    format,
    MD5,
    SHA1,
    SHA256,
    SHA512,
    HmacSHA256,
    PBKDF2,
    CryptoJS,
  };
  export default CryptoJS;
}
