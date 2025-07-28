import { describe, it, expect } from "vitest";
import { calculateTotal } from "./calculateTotal";

describe("calculateTotal", () => {
  it("should calculate total from comma-separated amounts", () => {
    expect(calculateTotal("1,2,3")).toBe(6);
    expect(calculateTotal("10.5,20.3,30.2")).toBe(61);
    expect(calculateTotal("0.1,0.2,0.3")).toBeCloseTo(0.6);
  });

  it("should calculate total from newline-separated amounts", () => {
    expect(calculateTotal("1\n2\n3")).toBe(6);
    expect(calculateTotal("10.5\n20.3\n30.2")).toBe(61);
  });

  it("should calculate total from mixed separators", () => {
    expect(calculateTotal("1,2\n3,4")).toBe(10);
    expect(calculateTotal("1.5\n2.5,3.5\n4.5")).toBe(12);
  });

  it("should handle empty strings and whitespace", () => {
    expect(calculateTotal("")).toBe(0);
    expect(calculateTotal("   ")).toBe(0);
    expect(calculateTotal("1, ,2,  ,3")).toBe(6);
    expect(calculateTotal("1\n\n2\n\n3")).toBe(6);
  });

  it("should ignore non-numeric values", () => {
    expect(calculateTotal("1,abc,2,def,3")).toBe(6);
    expect(calculateTotal("1.5,invalid,2.5,test,3.5")).toBeCloseTo(7.5);
  });

  it("should handle single values", () => {
    expect(calculateTotal("5")).toBe(5);
    expect(calculateTotal("10.5")).toBeCloseTo(10.5);
  });

  it("should handle negative numbers", () => {
    expect(calculateTotal("-1,2,-3")).toBe(-2);
    expect(calculateTotal("-10.5,20.3,-30.2")).toBeCloseTo(-20.4);
  });

  it("should handle zero values", () => {
    expect(calculateTotal("0,1,0,2,0")).toBe(3);
    expect(calculateTotal("0.0,1.5,0.0,2.5")).toBe(4);
  });

  it("should handle large numbers", () => {
    expect(calculateTotal("1000000,2000000,3000000")).toBe(6000000);
    expect(calculateTotal("999999.99,0.01")).toBeCloseTo(1000000);
  });
});
