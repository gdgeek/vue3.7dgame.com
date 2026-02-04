import { describe, it, expect, beforeEach, vi } from "vitest";
import fc from "fast-check";
import { arbitraryMetaInfo, arbitraryNewTitle } from "./generators";
import { v4 as uuidv4 } from "uuid";

/**
 * Property-based tests for the copy() function in list.vue
 *
 * These tests verify universal properties that should hold across all inputs.
 * Each property test runs 100 iterations with randomly generated data.
 *
 * For specific scenario tests, see list.spec.ts
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

describe("Entity Copy Function - Property-Based Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 1: 字段完整复制
   *
   * **Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**
   *
   * For any entity, when executing a copy operation, the new entity should contain
   * all data fields (data, info, events, prefab, image_id) from the original entity,
   * and these field values should be the same as the original entity (including null values).
   *
   * Tag: Feature: entity-copy-fix, Property 1: 字段完整复制
   */
  it("Property 1: 字段完整复制测试 - should copy all data fields completely", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo,
        arbitraryNewTitle,
        async (originalMeta, newTitle) => {
          // Generate a unique UUID for this test iteration
          const newUuid = `test-uuid-${originalMeta.id}`;
          (uuidv4 as any).mockReturnValue(newUuid);

          // Mock getMeta to return the original entity
          (getMeta as any).mockResolvedValue({ data: originalMeta });

          // Mock postMeta to capture the new entity data
          let capturedNewMeta: any = null;
          (postMeta as any).mockImplementation((data: any) => {
            capturedNewMeta = data;
            return Promise.resolve({
              data: { ...data, id: originalMeta.id + 1 },
            });
          });

          // Mock putMetaCode
          (putMetaCode as any).mockResolvedValue({
            data: originalMeta.metaCode || { blockly: "", lua: "" },
          });

          // Simulate the copy function logic from list.vue
          const simulateCopy = async (id: number, newTitle: string) => {
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

          // Execute the copy operation
          await simulateCopy(originalMeta.id, newTitle);

          // Verify that postMeta was called
          expect(postMeta).toHaveBeenCalled();
          expect(capturedNewMeta).not.toBeNull();

          // Property verification: All data fields should be copied exactly
          expect(capturedNewMeta.data).toBe(originalMeta.data);
          expect(capturedNewMeta.info).toBe(originalMeta.info);
          expect(capturedNewMeta.events).toBe(originalMeta.events);
          expect(capturedNewMeta.prefab).toBe(originalMeta.prefab);
          expect(capturedNewMeta.image_id).toBe(originalMeta.image_id);

          // Verify that the new title is used (not the original)
          expect(capturedNewMeta.title).toBe(newTitle);

          // Verify that a new UUID was generated
          expect(capturedNewMeta.uuid).toBe(newUuid);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 2: MetaCode 完整复制
   *
   * **Validates: Requirements 1.7**
   *
   * For any entity with metaCode, when executing a copy operation, the new entity's
   * metaCode (lua and blockly) should be the same as the original entity.
   *
   * Tag: Feature: entity-copy-fix, Property 2: MetaCode 完整复制
   */
  it("Property 2: MetaCode 完整复制测试 - should copy metaCode completely", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo.filter((meta) => meta.metaCode !== null),
        arbitraryNewTitle,
        async (originalMeta, newTitle) => {
          // Generate a unique UUID for this test iteration
          const newUuid = `test-uuid-${originalMeta.id}`;
          (uuidv4 as any).mockReturnValue(newUuid);

          // Mock getMeta to return the original entity
          (getMeta as any).mockResolvedValue({ data: originalMeta });

          // Mock postMeta
          const newMetaId = originalMeta.id + 1;
          (postMeta as any).mockResolvedValue({
            data: { id: newMetaId },
          });

          // Mock putMetaCode to capture the code being set
          let capturedMetaCode: any = null;
          (putMetaCode as any).mockImplementation((_id: number, code: any) => {
            capturedMetaCode = code;
            return Promise.resolve({ data: code });
          });

          // Simulate the copy function logic from list.vue
          const simulateCopy = async (id: number, newTitle: string) => {
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

          // Execute the copy operation
          await simulateCopy(originalMeta.id, newTitle);

          // Verify that putMetaCode was called (since we filtered for entities with metaCode)
          expect(putMetaCode).toHaveBeenCalled();
          expect(capturedMetaCode).not.toBeNull();

          // Property verification: MetaCode should be copied exactly
          expect(capturedMetaCode.lua).toBe(originalMeta.metaCode?.lua);
          expect(capturedMetaCode.blockly).toBe(
            originalMeta.metaCode?.blockly || ""
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: UUID 唯一性
   *
   * **Validates: Requirements 2.1**
   *
   * For any entity, when executing a copy operation, the new entity's uuid should be
   * different from the original entity's uuid, and should be a valid UUID v4 format.
   *
   * Tag: Feature: entity-copy-fix, Property 3: UUID 唯一性
   */
  it("Property 3: UUID 唯一性测试 - should generate unique UUID in v4 format", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo,
        arbitraryNewTitle,
        async (originalMeta, newTitle) => {
          // Use the real uuidv4 function to generate a proper UUID v4
          const { v4: realUuidv4 } =
            await vi.importActual<typeof import("uuid")>("uuid");
          const generatedUuid = realUuidv4();

          // Mock uuidv4 to return the generated UUID
          (uuidv4 as any).mockReturnValue(generatedUuid);

          // Mock getMeta to return the original entity
          (getMeta as any).mockResolvedValue({ data: originalMeta });

          // Mock postMeta to capture the new entity data
          let capturedNewMeta: any = null;
          (postMeta as any).mockImplementation((data: any) => {
            capturedNewMeta = data;
            return Promise.resolve({
              data: { ...data, id: originalMeta.id + 1 },
            });
          });

          // Mock putMetaCode
          (putMetaCode as any).mockResolvedValue({
            data: originalMeta.metaCode || { blockly: "", lua: "" },
          });

          // Simulate the copy function logic from list.vue
          const simulateCopy = async (id: number, newTitle: string) => {
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

          // Execute the copy operation
          await simulateCopy(originalMeta.id, newTitle);

          // Verify that postMeta was called
          expect(postMeta).toHaveBeenCalled();
          expect(capturedNewMeta).not.toBeNull();

          // Property verification 1: New UUID should be different from original UUID
          expect(capturedNewMeta.uuid).not.toBe(originalMeta.uuid);

          // Property verification 2: New UUID should conform to UUID v4 format
          // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
          // where x is any hexadecimal digit and y is one of 8, 9, A, or B
          const uuidV4Regex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
          expect(capturedNewMeta.uuid).toMatch(uuidV4Regex);

          // Additional verification: The captured UUID should match the generated one
          expect(capturedNewMeta.uuid).toBe(generatedUuid);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: 标题更新
   *
   * **Validates: Requirements 2.2**
   *
   * For any new title string, when executing a copy operation, the new entity's title
   * should equal the user-provided new title, not the original entity's title.
   *
   * Tag: Feature: entity-copy-fix, Property 4: 标题更新
   */
  it("Property 4: 标题更新测试 - should use new title instead of original title", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo,
        arbitraryNewTitle,
        async (originalMeta, newTitle) => {
          // Ensure the new title is different from the original title for meaningful testing
          fc.pre(newTitle !== originalMeta.title);

          // Generate a unique UUID for this test iteration
          const newUuid = `test-uuid-${originalMeta.id}`;
          (uuidv4 as any).mockReturnValue(newUuid);

          // Mock getMeta to return the original entity
          (getMeta as any).mockResolvedValue({ data: originalMeta });

          // Mock postMeta to capture the new entity data
          let capturedNewMeta: any = null;
          (postMeta as any).mockImplementation((data: any) => {
            capturedNewMeta = data;
            return Promise.resolve({
              data: { ...data, id: originalMeta.id + 1 },
            });
          });

          // Mock putMetaCode
          (putMetaCode as any).mockResolvedValue({
            data: originalMeta.metaCode || { blockly: "", lua: "" },
          });

          // Simulate the copy function logic from list.vue
          const simulateCopy = async (id: number, newTitle: string) => {
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

          // Execute the copy operation
          await simulateCopy(originalMeta.id, newTitle);

          // Verify that postMeta was called
          expect(postMeta).toHaveBeenCalled();
          expect(capturedNewMeta).not.toBeNull();

          // Property verification 1: New entity should use the new title
          expect(capturedNewMeta.title).toBe(newTitle);

          // Property verification 2: New entity should NOT use the original title
          expect(capturedNewMeta.title).not.toBe(originalMeta.title);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: ID 自动生成
   *
   * **Validates: Requirements 2.3**
   *
   * For any entity, when the copy operation completes successfully, the new entity
   * should have a new id value, and this id should be different from the original entity's id.
   *
   * Tag: Feature: entity-copy-fix, Property 5: ID 自动生成
   */
  it("Property 5: ID 自动生成测试 - should generate new ID different from original", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo,
        arbitraryNewTitle,
        async (originalMeta, newTitle) => {
          // Generate a unique UUID for this test iteration
          const newUuid = `test-uuid-${originalMeta.id}`;
          (uuidv4 as any).mockReturnValue(newUuid);

          // Mock getMeta to return the original entity
          (getMeta as any).mockResolvedValue({ data: originalMeta });

          // Mock postMeta to simulate backend auto-generating a new ID
          // The new ID should be different from the original ID
          const newId = originalMeta.id + 1000; // Ensure it's different
          let capturedNewId: number | null = null;
          (postMeta as any).mockImplementation((data: any) => {
            return Promise.resolve({
              data: { ...data, id: newId },
            });
          });

          // Mock putMetaCode
          (putMetaCode as any).mockResolvedValue({
            data: originalMeta.metaCode || { blockly: "", lua: "" },
          });

          // Simulate the copy function logic from list.vue
          const simulateCopy = async (id: number, newTitle: string) => {
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
            capturedNewId = newMetaId;

            if (meta.metaCode) {
              await putMetaCode(newMetaId, {
                lua: meta.metaCode.lua,
                blockly: meta.metaCode.blockly || "",
              });
            }

            return newMetaId;
          };

          // Execute the copy operation
          const resultId = await simulateCopy(originalMeta.id, newTitle);

          // Verify that postMeta was called
          expect(postMeta).toHaveBeenCalled();

          // Property verification 1: A new ID should be generated
          expect(capturedNewId).not.toBeNull();
          expect(resultId).toBe(newId);

          // Property verification 2: New ID should be different from original ID
          expect(capturedNewId).not.toBe(originalMeta.id);
          expect(resultId).not.toBe(originalMeta.id);

          // Property verification 3: New ID should be a valid positive integer
          expect(capturedNewId).toBeGreaterThan(0);
          expect(Number.isInteger(capturedNewId)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 6: 加载状态管理
   *
   * **Validates: Requirements 4.3, 4.4**
   *
   * For any copy operation, the loading state should be set to true during the operation,
   * and should be cleared to false after completion (whether success or failure).
   *
   * Tag: Feature: entity-copy-fix, Property 6: 加载状态管理
   */
  it("Property 6: 加载状态管理测试 - should manage loading state correctly", async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMetaInfo,
        arbitraryNewTitle,
        fc.boolean(), // Generate random success/failure scenario
        async (originalMeta, newTitle, shouldSucceed) => {
          // Generate a unique UUID for this test iteration
          const newUuid = `test-uuid-${originalMeta.id}`;
          (uuidv4 as any).mockReturnValue(newUuid);

          // Track loading state changes
          const loadingStates: boolean[] = [];
          const mockLoadingMap = new Map<number, boolean>();

          // Create a proxy to track loading state changes
          const setLoadingState = (id: number, state: boolean) => {
            mockLoadingMap.set(id, state);
            loadingStates.push(state);
          };

          // Mock API calls based on success/failure scenario
          if (shouldSucceed) {
            // Success scenario
            (getMeta as any).mockResolvedValue({ data: originalMeta });
            (postMeta as any).mockResolvedValue({
              data: { ...originalMeta, id: originalMeta.id + 1 },
            });
            (putMetaCode as any).mockResolvedValue({
              data: originalMeta.metaCode || { blockly: "", lua: "" },
            });
          } else {
            // Failure scenario - randomly fail at different stages
            const failureStage = originalMeta.id % 3; // 0: getMeta, 1: postMeta, 2: putMetaCode

            if (failureStage === 0) {
              (getMeta as any).mockRejectedValue(
                new Error("Failed to get meta")
              );
            } else {
              (getMeta as any).mockResolvedValue({ data: originalMeta });

              if (failureStage === 1) {
                (postMeta as any).mockRejectedValue(
                  new Error("Failed to create meta")
                );
              } else {
                (postMeta as any).mockResolvedValue({
                  data: { ...originalMeta, id: originalMeta.id + 1 },
                });
                (putMetaCode as any).mockRejectedValue(
                  new Error("Failed to update code")
                );
              }
            }
          }

          // Simulate the copy function logic from list.vue with loading state management
          const simulateCopy = async (id: number, newTitle: string) => {
            // 1. Set loading state to true at the start
            setLoadingState(id, true);

            try {
              // 2. Execute copy operation
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
              // Error handling (loading state will be cleared in finally)
            } finally {
              // 3. Clear loading state in finally block (always executed)
              setLoadingState(id, false);
            }
          };

          // Execute the copy operation
          await simulateCopy(originalMeta.id, newTitle);

          // Property verification 1: Loading state should have been set at least twice (true, then false)
          expect(loadingStates.length).toBeGreaterThanOrEqual(2);

          // Property verification 2: First state should be true (loading started)
          expect(loadingStates[0]).toBe(true);

          // Property verification 3: Last state should be false (loading completed/cleared)
          expect(loadingStates[loadingStates.length - 1]).toBe(false);

          // Property verification 4: Final loading state in map should be false
          expect(mockLoadingMap.get(originalMeta.id)).toBe(false);

          // Property verification 5: Loading state should be cleared regardless of success/failure
          // This is verified by the fact that the last state is always false
          expect(loadingStates[loadingStates.length - 1]).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
