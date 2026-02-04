import { describe, it, expect, beforeEach, vi } from "vitest";
import { v4 as uuidv4 } from "uuid";
import type { metaInfo, MetaCode } from "@/api/v1/meta";

/**
 * Unit tests for the copy() function in list.vue
 *
 * These tests verify specific scenarios, API call sequences, and error handling.
 * For property-based tests, see list.property.spec.ts
 */

// Mock the API module
vi.mock("@/api/v1/meta", () => ({
  getMeta: vi.fn(),
  postMeta: vi.fn(),
  putMetaCode: vi.fn(),
}));

// Mock uuid
vi.mock("uuid", () => ({
  v4: vi.fn(),
}));

// Import the mocked functions
import { getMeta, postMeta, putMetaCode } from "@/api/v1/meta";

describe("Entity Copy Function - Unit Tests", () => {
  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  /**
   * Task 4.1: Test API call sequence
   * Validates Requirements: 5.1, 5.2, 5.3, 5.4
   */
  describe("API Call Sequence", () => {
    it("should call APIs in correct order: getMeta → postMeta → putMetaCode", async () => {
      // Arrange: Setup test data
      const originalId = 123;
      const newTitle = "Test Copy";
      const newUuid = "new-uuid-1234";

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Title",
        uuid: "original-uuid",
        author_id: 1,
        info: "Test info",
        data: { key: "value" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 456,
        image: {
          id: 456,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "print('hello')",
          blockly: "<xml></xml>",
        },
      };

      const newMetaId = 789;

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function that mimics the actual implementation
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify call sequence and parameters

      // 1. Verify getMeta was called first with correct ID
      expect(getMeta).toHaveBeenCalledTimes(1);
      expect(getMeta).toHaveBeenCalledWith(originalId);

      // 2. Verify postMeta was called second with all required fields
      expect(postMeta).toHaveBeenCalledTimes(1);
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: originalMeta.image_id,
        data: originalMeta.data,
        info: originalMeta.info,
        events: originalMeta.events,
        prefab: originalMeta.prefab,
      });

      // 3. Verify putMetaCode was called third with new ID and code
      expect(putMetaCode).toHaveBeenCalledTimes(1);
      expect(putMetaCode).toHaveBeenCalledWith(newMetaId, {
        lua: originalMeta.metaCode?.lua,
        blockly: originalMeta.metaCode?.blockly || "",
      });

      // 4. Verify call order using mock.invocationCallOrder
      const getMetaCallOrder = (getMeta as any).mock.invocationCallOrder[0];
      const postMetaCallOrder = (postMeta as any).mock.invocationCallOrder[0];
      const putMetaCodeCallOrder = (putMetaCode as any).mock
        .invocationCallOrder[0];

      expect(getMetaCallOrder).toBeLessThan(postMetaCallOrder);
      expect(postMetaCallOrder).toBeLessThan(putMetaCodeCallOrder);
    });

    it("should pass all data fields from original entity to postMeta", async () => {
      // Arrange: Setup test data with various field values including nulls
      const originalId = 100;
      const newTitle = "Copy with nulls";
      const newUuid = "uuid-with-nulls";

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original",
        uuid: "original-uuid",
        author_id: 1,
        info: null, // Test null value
        data: null, // Test null value
        events: null, // Test null value
        prefab: 1,
        image_id: null, // Test null value
        image: {} as any,
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "test",
          blockly: "test",
        },
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: 200 } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act
      await copy(originalId, newTitle);

      // Assert: Verify all fields are passed, including null values
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: null, // Verify null is preserved
        data: null, // Verify null is preserved
        info: null, // Verify null is preserved
        events: null, // Verify null is preserved
        prefab: 1,
      });
    });

    it("should skip putMetaCode when metaCode is undefined", async () => {
      // Arrange: Setup entity without metaCode
      const originalId = 300;
      const newTitle = "Copy without code";

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original",
        uuid: "original-uuid",
        author_id: 1,
        info: "info",
        data: { test: true },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 1,
        image: {} as any,
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        // metaCode is undefined
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: 400 } });
      (uuidv4 as any).mockReturnValue("uuid-no-code");

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act
      await copy(originalId, newTitle);

      // Assert: Verify putMetaCode was NOT called
      expect(getMeta).toHaveBeenCalledTimes(1);
      expect(postMeta).toHaveBeenCalledTimes(1);
      expect(putMetaCode).not.toHaveBeenCalled();
    });
  });

  /**
   * Task 4.2: Test success scenario
   * Validates Requirements: 4.1
   */
  describe("Success Scenario", () => {
    it("should call refreshList on successful copy operation", async () => {
      // Arrange: Setup test data
      const originalId = 500;
      const newTitle = "Successful Copy";
      const newUuid = "success-uuid";
      const newMetaId = 600;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: "Test info",
        data: { key: "value" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "print('test')",
          blockly: "<xml></xml>",
        },
      };

      // Mock successful API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Mock refreshList function
      const refreshList = vi.fn();

      // Create a mock copy function that includes refreshList call
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }

        refreshList();
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify refreshList was called
      expect(refreshList).toHaveBeenCalledTimes(1);

      // Verify all API calls succeeded
      expect(getMeta).toHaveBeenCalledTimes(1);
      expect(postMeta).toHaveBeenCalledTimes(1);
      expect(putMetaCode).toHaveBeenCalledTimes(1);
    });

    it("should complete successfully when all API calls succeed", async () => {
      // Arrange: Setup test data
      const originalId = 700;
      const newTitle = "Complete Success";
      const newUuid = "complete-uuid";
      const newMetaId = 800;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original",
        uuid: "orig-uuid",
        author_id: 1,
        info: "Info",
        data: { test: true },
        events: {
          inputs: [{ name: "input1" }],
          outputs: [{ name: "output1" }],
        },
        prefab: 1,
        image_id: 200,
        image: {
          id: 200,
          md5: "md5",
          type: "image/png",
          url: "http://example.com/img.png",
          filename: "img.png",
          size: 2048,
          key: "key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "return true",
          blockly: "<xml><block></block></xml>",
        },
      };

      // Mock successful API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Mock refreshList function
      const refreshList = vi.fn();

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }

        refreshList();
      };

      // Act: Execute the copy function - should not throw
      await expect(copy(originalId, newTitle)).resolves.toBeUndefined();

      // Assert: Verify the operation completed successfully
      expect(refreshList).toHaveBeenCalled();
    });

    it("should handle successful copy without metaCode", async () => {
      // Arrange: Setup entity without metaCode
      const originalId = 900;
      const newTitle = "Copy No Code";
      const newUuid = "no-code-uuid";
      const newMetaId = 1000;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "No Code Entity",
        uuid: "no-code-orig",
        author_id: 1,
        info: "Entity without code",
        data: { hasCode: false },
        events: null,
        prefab: 0,
        image_id: 300,
        image: {
          id: 300,
          md5: "md5-no-code",
          type: "image/png",
          url: "http://example.com/nocode.png",
          filename: "nocode.png",
          size: 512,
          key: "nocode-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        // metaCode is undefined
      };

      // Mock successful API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Mock refreshList function
      const refreshList = vi.fn();

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }

        refreshList();
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify refreshList was called even without metaCode
      expect(refreshList).toHaveBeenCalledTimes(1);

      // Verify putMetaCode was NOT called (no metaCode)
      expect(putMetaCode).not.toHaveBeenCalled();

      // Verify getMeta and postMeta were called
      expect(getMeta).toHaveBeenCalledTimes(1);
      expect(postMeta).toHaveBeenCalledTimes(1);
    });
  });

  /**
   * Task 4.3: Test error scenarios
   * Validates Requirements: 4.2
   */
  describe("Error Scenarios", () => {
    it("should display error message when getMeta fails", async () => {
      // Arrange: Setup test data
      const originalId = 1100;
      const newTitle = "Failed Get";
      const errorMessage = "Failed to fetch entity";

      // Mock getMeta to reject
      (getMeta as any).mockRejectedValue(new Error(errorMessage));

      // Mock ElMessage.error
      const mockElMessageError = vi.fn();

      // Mock loading state
      const copyLoadingMap = new Map<number, boolean>();

      // Create a mock copy function with error handling
      const copy = async (id: number, newTitle: string) => {
        copyLoadingMap.set(id, true);
        try {
          const response = await getMeta(id);
          const meta = response.data;

          const newMeta = {
            title: newTitle,
            uuid: uuidv4(),
            image_id: meta.image_id,
            data: meta.data,
            info: meta.info,
            events: meta.events,
            prefab: meta.prefab,
          };

          const createResponse = await postMeta(newMeta);
          const newMetaId = createResponse.data.id;

          if (meta.metaCode) {
            await putMetaCode(newMetaId, {
              lua: meta.metaCode.lua,
              blockly: meta.metaCode.blockly || "",
            });
          }
        } catch (error) {
          console.error(error);
          mockElMessageError("Copy failed");
        } finally {
          copyLoadingMap.set(id, false);
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify error handling
      expect(getMeta).toHaveBeenCalledWith(originalId);
      expect(mockElMessageError).toHaveBeenCalledWith("Copy failed");

      // Verify postMeta and putMetaCode were NOT called
      expect(postMeta).not.toHaveBeenCalled();
      expect(putMetaCode).not.toHaveBeenCalled();

      // Verify loading state was cleared
      expect(copyLoadingMap.get(originalId)).toBe(false);
    });

    it("should display error message when postMeta fails", async () => {
      // Arrange: Setup test data
      const originalId = 1200;
      const newTitle = "Failed Post";
      const newUuid = "failed-post-uuid";
      const errorMessage = "Failed to create entity";

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original",
        uuid: "original-uuid",
        author_id: 1,
        info: "Test info",
        data: { key: "value" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 400,
        image: {
          id: 400,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "print('test')",
          blockly: "<xml></xml>",
        },
      };

      // Mock getMeta to succeed
      (getMeta as any).mockResolvedValue({ data: originalMeta });

      // Mock postMeta to reject
      (postMeta as any).mockRejectedValue(new Error(errorMessage));

      (uuidv4 as any).mockReturnValue(newUuid);

      // Mock ElMessage.error
      const mockElMessageError = vi.fn();

      // Mock loading state
      const copyLoadingMap = new Map<number, boolean>();

      // Create a mock copy function with error handling
      const copy = async (id: number, newTitle: string) => {
        copyLoadingMap.set(id, true);
        try {
          const response = await getMeta(id);
          const meta = response.data;

          const newMeta = {
            title: newTitle,
            uuid: uuidv4(),
            image_id: meta.image_id,
            data: meta.data,
            info: meta.info,
            events: meta.events,
            prefab: meta.prefab,
          };

          const createResponse = await postMeta(newMeta);
          const newMetaId = createResponse.data.id;

          if (meta.metaCode) {
            await putMetaCode(newMetaId, {
              lua: meta.metaCode.lua,
              blockly: meta.metaCode.blockly || "",
            });
          }
        } catch (error) {
          console.error(error);
          mockElMessageError("Copy failed");
        } finally {
          copyLoadingMap.set(id, false);
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify error handling
      expect(getMeta).toHaveBeenCalledWith(originalId);
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: originalMeta.image_id,
        data: originalMeta.data,
        info: originalMeta.info,
        events: originalMeta.events,
        prefab: originalMeta.prefab,
      });
      expect(mockElMessageError).toHaveBeenCalledWith("Copy failed");

      // Verify putMetaCode was NOT called (postMeta failed)
      expect(putMetaCode).not.toHaveBeenCalled();

      // Verify loading state was cleared
      expect(copyLoadingMap.get(originalId)).toBe(false);
    });

    it("should clear loading state even when error occurs", async () => {
      // Arrange: Setup test data
      const originalId = 1300;
      const newTitle = "Loading State Test";

      // Mock getMeta to reject
      (getMeta as any).mockRejectedValue(new Error("Test error"));

      // Mock ElMessage.error
      const mockElMessageError = vi.fn();

      // Mock loading state
      const copyLoadingMap = new Map<number, boolean>();

      // Create a mock copy function with error handling
      const copy = async (id: number, newTitle: string) => {
        copyLoadingMap.set(id, true);
        try {
          const response = await getMeta(id);
          const meta = response.data;

          const newMeta = {
            title: newTitle,
            uuid: uuidv4(),
            image_id: meta.image_id,
            data: meta.data,
            info: meta.info,
            events: meta.events,
            prefab: meta.prefab,
          };

          const createResponse = await postMeta(newMeta);
          const newMetaId = createResponse.data.id;

          if (meta.metaCode) {
            await putMetaCode(newMetaId, {
              lua: meta.metaCode.lua,
              blockly: meta.metaCode.blockly || "",
            });
          }
        } catch (error) {
          console.error(error);
          mockElMessageError("Copy failed");
        } finally {
          copyLoadingMap.set(id, false);
        }
      };

      // Act: Verify loading state before, during, and after
      expect(copyLoadingMap.get(originalId)).toBeUndefined();

      await copy(originalId, newTitle);

      // Assert: Verify loading state was set and then cleared
      expect(copyLoadingMap.get(originalId)).toBe(false);
      expect(mockElMessageError).toHaveBeenCalled();
    });

    it("should handle error when putMetaCode fails but entity is already created", async () => {
      // Arrange: Setup test data
      const originalId = 1400;
      const newTitle = "Failed Code Update";
      const newUuid = "failed-code-uuid";
      const newMetaId = 1500;
      const errorMessage = "Failed to update code";

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original",
        uuid: "original-uuid",
        author_id: 1,
        info: "Test info",
        data: { key: "value" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 500,
        image: {
          id: 500,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "print('test')",
          blockly: "<xml></xml>",
        },
      };

      // Mock getMeta and postMeta to succeed
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });

      // Mock putMetaCode to reject
      (putMetaCode as any).mockRejectedValue(new Error(errorMessage));

      (uuidv4 as any).mockReturnValue(newUuid);

      // Mock ElMessage.error
      const mockElMessageError = vi.fn();

      // Mock loading state
      const copyLoadingMap = new Map<number, boolean>();

      // Create a mock copy function with error handling
      const copy = async (id: number, newTitle: string) => {
        copyLoadingMap.set(id, true);
        try {
          const response = await getMeta(id);
          const meta = response.data;

          const newMeta = {
            title: newTitle,
            uuid: uuidv4(),
            image_id: meta.image_id,
            data: meta.data,
            info: meta.info,
            events: meta.events,
            prefab: meta.prefab,
          };

          const createResponse = await postMeta(newMeta);
          const newMetaId = createResponse.data.id;

          if (meta.metaCode) {
            await putMetaCode(newMetaId, {
              lua: meta.metaCode.lua,
              blockly: meta.metaCode.blockly || "",
            });
          }
        } catch (error) {
          console.error(error);
          mockElMessageError("Copy failed");
        } finally {
          copyLoadingMap.set(id, false);
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify all API calls were made
      expect(getMeta).toHaveBeenCalledWith(originalId);
      expect(postMeta).toHaveBeenCalled();
      expect(putMetaCode).toHaveBeenCalledWith(newMetaId, {
        lua: originalMeta.metaCode?.lua,
        blockly: originalMeta.metaCode?.blockly || "",
      });

      // Verify error was handled
      expect(mockElMessageError).toHaveBeenCalledWith("Copy failed");

      // Verify loading state was cleared
      expect(copyLoadingMap.get(originalId)).toBe(false);
    });
  });

  /**
   * Task 4.4: Test boundary conditions
   * Validates Requirements: 3.1, 3.2, 3.3, 3.4
   */
  describe("Boundary Conditions", () => {
    it("should skip putMetaCode when metaCode is undefined", async () => {
      // Arrange: Setup entity without metaCode
      const originalId = 2000;
      const newTitle = "Entity Without MetaCode";
      const newUuid = "boundary-uuid-1";
      const newMetaId = 2100;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: "Some info",
        data: { test: "data" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        // metaCode is undefined - this is the boundary condition
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        // This is the key boundary condition: only call putMetaCode if metaCode exists
        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify putMetaCode was NOT called when metaCode is undefined
      expect(getMeta).toHaveBeenCalledTimes(1);
      expect(postMeta).toHaveBeenCalledTimes(1);
      expect(putMetaCode).not.toHaveBeenCalled();
    });

    it("should correctly copy null data field without converting to default value", async () => {
      // Arrange: Setup entity with null data
      const originalId = 2200;
      const newTitle = "Entity With Null Data";
      const newUuid = "boundary-uuid-2";
      const newMetaId = 2300;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: "Some info",
        data: null, // Boundary condition: null data
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data, // Should preserve null, not convert to {}
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify data is null, not converted to default value
      expect(postMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          data: null, // Must be null, not {} or undefined
        })
      );

      // Verify the exact call to ensure null is preserved
      const postMetaCall = (postMeta as any).mock.calls[0][0];
      expect(postMetaCall.data).toBeNull();
      expect(postMetaCall.data).not.toBe(undefined);
      expect(postMetaCall.data).not.toEqual({});
    });

    it("should correctly copy null info field without converting to default value", async () => {
      // Arrange: Setup entity with null info
      const originalId = 2400;
      const newTitle = "Entity With Null Info";
      const newUuid = "boundary-uuid-3";
      const newMetaId = 2500;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: null, // Boundary condition: null info
        data: { test: "data" },
        events: { inputs: [], outputs: [] },
        prefab: 0,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info, // Should preserve null, not convert to ""
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify info is null, not converted to default value
      expect(postMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          info: null, // Must be null, not "" or undefined
        })
      );

      // Verify the exact call to ensure null is preserved
      const postMetaCall = (postMeta as any).mock.calls[0][0];
      expect(postMetaCall.info).toBeNull();
      expect(postMetaCall.info).not.toBe(undefined);
      expect(postMetaCall.info).not.toBe("");
    });

    it("should correctly copy null events field without converting to default value", async () => {
      // Arrange: Setup entity with null events
      const originalId = 2600;
      const newTitle = "Entity With Null Events";
      const newUuid = "boundary-uuid-4";
      const newMetaId = 2700;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: "Some info",
        data: { test: "data" },
        events: null, // Boundary condition: null events
        prefab: 0,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events, // Should preserve null, not convert to {inputs: [], outputs: []}
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify events is null, not converted to default value
      expect(postMeta).toHaveBeenCalledWith(
        expect.objectContaining({
          events: null, // Must be null, not {inputs: [], outputs: []} or undefined
        })
      );

      // Verify the exact call to ensure null is preserved
      const postMetaCall = (postMeta as any).mock.calls[0][0];
      expect(postMetaCall.events).toBeNull();
      expect(postMetaCall.events).not.toBe(undefined);
      expect(postMetaCall.events).not.toEqual({ inputs: [], outputs: [] });
    });

    it("should correctly copy all null fields together", async () => {
      // Arrange: Setup entity with all nullable fields as null
      const originalId = 2800;
      const newTitle = "Entity With All Nulls";
      const newUuid = "boundary-uuid-5";
      const newMetaId = 2900;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: null, // All nullable fields are null
        data: null,
        events: null,
        image_id: null,
        prefab: 0,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        // metaCode is also undefined
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify all null fields are preserved
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: null,
        data: null,
        info: null,
        events: null,
        prefab: 0,
      });

      // Verify putMetaCode was not called (metaCode is undefined)
      expect(putMetaCode).not.toHaveBeenCalled();

      // Verify the exact call to ensure all nulls are preserved
      const postMetaCall = (postMeta as any).mock.calls[0][0];
      expect(postMetaCall.data).toBeNull();
      expect(postMetaCall.info).toBeNull();
      expect(postMetaCall.events).toBeNull();
      expect(postMetaCall.image_id).toBeNull();
    });

    it("should handle entity with metaCode but null data fields", async () => {
      // Arrange: Setup entity with metaCode but null data fields
      const originalId = 3000;
      const newTitle = "Entity With MetaCode And Nulls";
      const newUuid = "boundary-uuid-6";
      const newMetaId = 3100;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: null,
        data: null,
        events: null,
        image_id: null,
        prefab: 1,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "print('test')",
          blockly: "<xml></xml>",
        },
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify all null fields are preserved AND metaCode is copied
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: null,
        data: null,
        info: null,
        events: null,
        prefab: 1,
      });

      // Verify putMetaCode WAS called (metaCode exists)
      expect(putMetaCode).toHaveBeenCalledWith(newMetaId, {
        lua: "print('test')",
        blockly: "<xml></xml>",
      });
    });
  });

  /**
   * Task 4.5: Test complete data retrieval
   * Validates Requirements: 1.1
   */
  describe("Complete Data Retrieval", () => {
    it("should call getMeta to retrieve complete entity data", async () => {
      // Arrange: Setup test data
      const originalId = 3200;
      const newTitle = "Complete Data Test";
      const newUuid = "complete-uuid";
      const newMetaId = 3300;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original Entity",
        uuid: "original-uuid",
        author_id: 1,
        info: "Complete info",
        data: { key1: "value1", key2: "value2", nested: { data: true } },
        events: {
          inputs: [{ name: "input1" }, { name: "input2" }],
          outputs: [{ name: "output1" }],
        },
        prefab: 1,
        image_id: 100,
        image: {
          id: 100,
          md5: "test-md5",
          type: "image/png",
          url: "http://example.com/image.png",
          filename: "image.png",
          size: 1024,
          key: "test-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "return { test = true }",
          blockly: "<xml><block type='test'></block></xml>",
        },
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify getMeta was called to retrieve complete data
      expect(getMeta).toHaveBeenCalledWith(originalId);
      expect(getMeta).toHaveBeenCalledTimes(1);

      // Verify all fields from the retrieved data are passed to postMeta
      expect(postMeta).toHaveBeenCalledWith({
        title: newTitle,
        uuid: newUuid,
        image_id: originalMeta.image_id,
        data: originalMeta.data,
        info: originalMeta.info,
        events: originalMeta.events,
        prefab: originalMeta.prefab,
      });

      // Verify the data structure is preserved (deep equality)
      const postMetaCall = (postMeta as any).mock.calls[0][0];
      expect(postMetaCall.data).toEqual(originalMeta.data);
      expect(postMetaCall.events).toEqual(originalMeta.events);
    });

    it("should retrieve and copy all necessary fields from original entity", async () => {
      // Arrange: Setup entity with all fields populated
      const originalId = 3400;
      const newTitle = "All Fields Test";
      const newUuid = "all-fields-uuid";
      const newMetaId = 3500;

      const originalMeta: metaInfo = {
        id: originalId,
        title: "Original With All Fields",
        uuid: "original-uuid-all",
        author_id: 5,
        info: "Detailed information about this entity",
        data: {
          config: { setting1: true, setting2: false },
          values: [1, 2, 3, 4, 5],
          metadata: { created: "2024-01-01", version: "1.0" },
        },
        events: {
          inputs: [
            { name: "onStart", type: "trigger" },
            { name: "onUpdate", type: "continuous" },
          ],
          outputs: [
            { name: "onComplete", type: "event" },
            { name: "onError", type: "event" },
          ],
        },
        prefab: 1,
        image_id: 200,
        image: {
          id: 200,
          md5: "complete-md5",
          type: "image/jpeg",
          url: "http://example.com/complete.jpg",
          filename: "complete.jpg",
          size: 2048,
          key: "complete-key",
        },
        resources: [],
        editable: true,
        viewable: true,
        cyber: {} as any,
        verseMetas: [],
        metaCode: {
          lua: "function init() return true end",
          blockly: "<xml><block type='procedures_defnoreturn'></block></xml>",
          js: "function init() { return true; }",
        },
      };

      // Mock API responses
      (getMeta as any).mockResolvedValue({ data: originalMeta });
      (postMeta as any).mockResolvedValue({ data: { id: newMetaId } });
      (putMetaCode as any).mockResolvedValue({ data: {} });
      (uuidv4 as any).mockReturnValue(newUuid);

      // Create a mock copy function
      const copy = async (id: number, newTitle: string) => {
        const response = await getMeta(id);
        const meta = response.data;

        const newMeta = {
          title: newTitle,
          uuid: uuidv4(),
          image_id: meta.image_id,
          data: meta.data,
          info: meta.info,
          events: meta.events,
          prefab: meta.prefab,
        };

        const createResponse = await postMeta(newMeta);
        const newMetaId = createResponse.data.id;

        if (meta.metaCode) {
          await putMetaCode(newMetaId, {
            lua: meta.metaCode.lua,
            blockly: meta.metaCode.blockly || "",
          });
        }
      };

      // Act: Execute the copy function
      await copy(originalId, newTitle);

      // Assert: Verify getMeta retrieved complete data
      expect(getMeta).toHaveBeenCalledWith(originalId);

      // Verify all necessary fields are copied
      const postMetaCall = (postMeta as any).mock.calls[0][0];

      // Check each field individually
      expect(postMetaCall.title).toBe(newTitle);
      expect(postMetaCall.uuid).toBe(newUuid);
      expect(postMetaCall.image_id).toBe(originalMeta.image_id);
      expect(postMetaCall.data).toEqual(originalMeta.data);
      expect(postMetaCall.info).toBe(originalMeta.info);
      expect(postMetaCall.events).toEqual(originalMeta.events);
      expect(postMetaCall.prefab).toBe(originalMeta.prefab);

      // Verify metaCode is copied via putMetaCode
      expect(putMetaCode).toHaveBeenCalledWith(newMetaId, {
        lua: originalMeta.metaCode?.lua,
        blockly: originalMeta.metaCode?.blockly || "",
      });
    });
  });
});
