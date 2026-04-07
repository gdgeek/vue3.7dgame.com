import SecureLSModule from "secure-ls";

type SecureLSOptions = {
  encodingType?: string;
  isCompression?: boolean;
  encryptionSecret?: string;
  encryptionNamespace?: string;
};

type SecureLSInstance = {
  get: <T = unknown>(key: string) => T;
  set: (key: string, value: unknown) => void;
  remove: (key: string) => void;
  removeAll?: () => void;
  clear?: () => void;
};

type SecureLSConstructor = new (options?: SecureLSOptions) => SecureLSInstance;

const SecureLSCtor =
  (SecureLSModule as unknown as { default?: SecureLSConstructor }).default ||
  (SecureLSModule as unknown as SecureLSConstructor);

export function createSecureLS(options?: SecureLSOptions): SecureLSInstance {
  return new SecureLSCtor(options);
}
