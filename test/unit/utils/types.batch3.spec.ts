import { describe, expectTypeOf, it } from "vitest";
import type { CardInfo, DataInput, DataOutput } from "@/utils/types";

describe("utils/types batch3", () => {
  it("CardInfo requires id as number", () => {
    expectTypeOf<CardInfo>().toHaveProperty("id").toEqualTypeOf<number>();
  });

  it("CardInfo image can be null", () => {
    expectTypeOf<CardInfo>().toHaveProperty("image").toEqualTypeOf<
      { id?: number; url: string } | null
    >();
  });

  it("CardInfo context is unknown", () => {
    expectTypeOf<CardInfo>().toHaveProperty("context").toEqualTypeOf<unknown>();
  });

  it("DataInput has paging and filter fields", () => {
    expectTypeOf<DataInput>().toMatchTypeOf<{
      type: string;
      sorted: string;
      searched: string;
      current: number;
    }>();
  });

  it("DataOutput items is CardInfo array", () => {
    expectTypeOf<DataOutput>().toHaveProperty("items").toEqualTypeOf<
      CardInfo[]
    >();
  });

  it("DataOutput pagination fields are numbers", () => {
    expectTypeOf<DataOutput>().toHaveProperty("pagination").toMatchTypeOf<{
      current: number;
      count: number;
      size: number;
      total: number;
    }>();
  });
});
