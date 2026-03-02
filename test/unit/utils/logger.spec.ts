/**
 * Unit tests for src/utils/logger.ts
 * Tests Logger class methods under both dev and non-dev (test) mode.
 *
 * NOTE: In Vitest, import.meta.env.MODE === "test", so isDev is false.
 * That means log/warn/info/debug are silenced; only error is always active.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("createLogger / Logger", () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    debug: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, "log").mockImplementation(() => undefined),
      warn: vi.spyOn(console, "warn").mockImplementation(() => undefined),
      error: vi.spyOn(console, "error").mockImplementation(() => undefined),
      info: vi.spyOn(console, "info").mockImplementation(() => undefined),
      debug: vi.spyOn(console, "debug").mockImplementation(() => undefined),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // error() — always active regardless of MODE
  // -----------------------------------------------------------------------
  describe("error()", () => {
    it("always calls console.error (even in non-dev mode)", async () => {
      const { logger } = await import("@/utils/logger");
      logger.error("boom");
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it("passes arguments to console.error", async () => {
      const { logger } = await import("@/utils/logger");
      logger.error("a", "b", 42);
      expect(consoleSpy.error).toHaveBeenCalledWith("", "a", "b", 42);
    });

    it("prefixed logger includes prefix in error output", async () => {
      const { createLogger } = await import("@/utils/logger");
      const prefixed = createLogger("SCENE");
      prefixed.error("oops");
      expect(consoleSpy.error).toHaveBeenCalledWith("[SCENE]", "oops");
    });
  });

  // -----------------------------------------------------------------------
  // log / warn / info / debug — silenced in test mode (isDev = false)
  // -----------------------------------------------------------------------
  describe("log() in test mode", () => {
    it("does NOT call console.log when MODE !== development", async () => {
      const { logger } = await import("@/utils/logger");
      logger.log("hello");
      expect(consoleSpy.log).not.toHaveBeenCalled();
    });
  });

  describe("warn() in test mode", () => {
    it("does NOT call console.warn when MODE !== development", async () => {
      const { logger } = await import("@/utils/logger");
      logger.warn("caution");
      expect(consoleSpy.warn).not.toHaveBeenCalled();
    });
  });

  describe("info() in test mode", () => {
    it("does NOT call console.info when MODE !== development", async () => {
      const { logger } = await import("@/utils/logger");
      logger.info("fyi");
      expect(consoleSpy.info).not.toHaveBeenCalled();
    });
  });

  describe("debug() in test mode", () => {
    it("does NOT call console.debug when MODE !== development", async () => {
      const { logger } = await import("@/utils/logger");
      logger.debug("trace");
      expect(consoleSpy.debug).not.toHaveBeenCalled();
    });
  });

  // -----------------------------------------------------------------------
  // createLogger — prefix behaviour
  // -----------------------------------------------------------------------
  describe("createLogger(prefix)", () => {
    it("returns a Logger instance (has .error, .log, .warn, .info, .debug)", async () => {
      const { createLogger } = await import("@/utils/logger");
      const l = createLogger("TEST");
      expect(typeof l.error).toBe("function");
      expect(typeof l.log).toBe("function");
      expect(typeof l.warn).toBe("function");
      expect(typeof l.info).toBe("function");
      expect(typeof l.debug).toBe("function");
    });

    it("different instances are independent", async () => {
      const { createLogger } = await import("@/utils/logger");
      const l1 = createLogger("A");
      const l2 = createLogger("B");
      l1.error("from A");
      l2.error("from B");
      expect(consoleSpy.error).toHaveBeenCalledWith("[A]", "from A");
      expect(consoleSpy.error).toHaveBeenCalledWith("[B]", "from B");
    });

    it("empty-prefix logger uses empty string as prefix", async () => {
      const { createLogger } = await import("@/utils/logger");
      const l = createLogger("");
      l.error("msg");
      // empty prefix → first arg is ""
      expect(consoleSpy.error).toHaveBeenCalledWith("", "msg");
    });

    it("logger (default export) has empty prefix", async () => {
      const { logger } = await import("@/utils/logger");
      logger.error("test");
      expect(consoleSpy.error).toHaveBeenCalledWith("", "test");
    });
  });

  // -----------------------------------------------------------------------
  // Multiple arguments
  // -----------------------------------------------------------------------
  describe("variadic arguments", () => {
    it("error() forwards multiple args", async () => {
      const { logger } = await import("@/utils/logger");
      logger.error(1, 2, 3);
      expect(consoleSpy.error).toHaveBeenCalledWith("", 1, 2, 3);
    });

    it("error() with objects", async () => {
      const { logger } = await import("@/utils/logger");
      const obj = { key: "value" };
      logger.error("context", obj);
      expect(consoleSpy.error).toHaveBeenCalledWith("", "context", obj);
    });
  });

  // -----------------------------------------------------------------------
  // createLogger — returns an object with all required methods
  // -----------------------------------------------------------------------
  describe("createLogger — returns full interface", () => {
    it("returns an object with log, warn, error, info, debug methods", async () => {
      const { createLogger } = await import("@/utils/logger");
      const l = createLogger("TEST");
      expect(typeof l.log).toBe("function");
      expect(typeof l.warn).toBe("function");
      expect(typeof l.error).toBe("function");
      expect(typeof l.info).toBe("function");
      expect(typeof l.debug).toBe("function");
    });
  });

  // -----------------------------------------------------------------------
  // Multiple error calls are independently tracked
  // -----------------------------------------------------------------------
  describe("multiple error calls", () => {
    it("each error() call increments call count", async () => {
      const { logger } = await import("@/utils/logger");
      logger.error("first");
      logger.error("second");
      expect(consoleSpy.error).toHaveBeenCalledTimes(2);
    });
  });

  // -----------------------------------------------------------------------
  // Robustness — no-arg calls
  // -----------------------------------------------------------------------
  describe("calling logger methods with no arguments", () => {
    it("error() with no arguments does not throw", async () => {
      const { logger } = await import("@/utils/logger");
      expect(() => logger.error()).not.toThrow();
    });

    it("log() with no arguments does not throw", async () => {
      const { logger } = await import("@/utils/logger");
      expect(() => logger.log()).not.toThrow();
    });
  });

  describe("createLogger returns non-null object", () => {
    it("returns an object (not null)", async () => {
      const { createLogger } = await import("@/utils/logger");
      const l = createLogger("X");
      expect(l).not.toBeNull();
      expect(typeof l).toBe("object");
    });
  });
});
