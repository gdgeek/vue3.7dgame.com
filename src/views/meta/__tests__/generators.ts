import fc from "fast-check";
import type { metaInfo, Events, MetaCode } from "@/api/v1/meta";
import type { ResourceInfo } from "@/api/v1/resources/model";
import type { FileType } from "@/api/user/model";
import type { cybersType } from "@/api/v1/cyber";

/**
 * Test data generators for property-based testing
 *
 * These generators create random test data for entity copy tests.
 * They ensure comprehensive coverage including edge cases like null values.
 */

/**
 * Generator for FileType
 * Generates random file information
 */
export const arbitraryFileType: fc.Arbitrary<FileType> = fc.record({
  id: fc.integer({ min: 1 }),
  md5: fc.string({ minLength: 32, maxLength: 32 }),
  type: fc.constantFrom("image/png", "image/jpeg", "image/gif"),
  url: fc.webUrl(),
  filename: fc.string({ minLength: 1 }),
  size: fc.integer({ min: 1 }),
  key: fc.string({ minLength: 1 }),
});

/**
 * Generator for ResourceInfo type
 * Generates random resource information
 */
export const arbitraryResourceInfo: fc.Arbitrary<ResourceInfo> = fc.record({
  id: fc.integer({ min: 1 }),
  name: fc.option(fc.string({ minLength: 1 })),
  uuid: fc.uuid(),
  type: fc.string({ minLength: 1 }),
  image_id: fc.option(fc.integer({ min: 1 })),
  file: arbitraryFileType,
  created_at: fc.string({ minLength: 20, maxLength: 30 }), // ISO date string
  info: fc.string(),
  author: fc.option(
    fc.record({
      id: fc.integer({ min: 1 }),
      nickname: fc.string({ minLength: 1 }),
      email: fc.oneof(fc.constant(null), fc.emailAddress()),
      username: fc.string({ minLength: 1 }),
    })
  ),
});

/**
 * Generator for Events type
 * Generates random event configurations with inputs and outputs arrays
 */
export const arbitraryEvents: fc.Arbitrary<Events> = fc.record({
  inputs: fc.array(fc.anything()),
  outputs: fc.array(fc.anything()),
});

/**
 * Generator for MetaCode type
 * Generates random code configurations with lua, blockly, and optional js
 */
export const arbitraryMetaCode: fc.Arbitrary<MetaCode> = fc.record({
  blockly: fc.string(),
  lua: fc.option(fc.string()),
  js: fc.option(fc.string()),
});

/**
 * Generator for metaInfo type
 * Generates random entity data with all fields including null values for boundary testing
 *
 * This generator creates comprehensive test data that includes:
 * - Required fields (id, title, uuid, prefab)
 * - Nullable fields (data, info, events, image_id) - can be null to test edge cases
 * - Optional fields (metaCode, created_at, custome, author)
 * - Complex nested objects (image, resources, cyber, verseMetas)
 */
export const arbitraryMetaInfo: fc.Arbitrary<metaInfo> = fc.record({
  id: fc.integer({ min: 1 }),
  author_id: fc.integer({ min: 1 }),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  uuid: fc.uuid(),

  // Nullable fields - these can be null to test boundary cases
  data: fc.oneof(fc.constant(null), fc.object()),
  info: fc.oneof(fc.constant(null), fc.string()),
  events: fc.oneof(fc.constant(null), arbitraryEvents),
  image_id: fc.oneof(fc.constant(null), fc.integer({ min: 1 })),

  // Optional metaCode field
  metaCode: fc.option(arbitraryMetaCode),

  // Numeric field
  prefab: fc.integer({ min: 0, max: 1 }),

  // Boolean fields
  editable: fc.boolean(),
  viewable: fc.boolean(),

  // Optional fields
  created_at: fc.option(fc.string({ minLength: 20, maxLength: 30 })), // ISO date string
  custome: fc.option(fc.boolean()),

  // Complex nested objects
  image: arbitraryFileType,

  resources: fc.array(arbitraryResourceInfo),

  cyber: fc.record({
    id: fc.integer({ min: 1 }),
    data: fc.string(),
    script: fc.string(),
  }) as fc.Arbitrary<cybersType>,

  author: fc.option(
    fc.record({
      id: fc.integer({ min: 1 }),
      nickname: fc.string({ minLength: 1 }),
      email: fc.oneof(fc.constant(null), fc.emailAddress()),
      username: fc.string({ minLength: 1 }),
    })
  ),

  verseMetas: fc.array(fc.anything()),
}) as fc.Arbitrary<metaInfo>;

/**
 * Generator for new title strings
 * Generates random title strings for copy operations
 */
export const arbitraryNewTitle: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 100,
});
