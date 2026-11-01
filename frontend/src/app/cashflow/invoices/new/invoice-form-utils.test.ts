import { describe, expect, it } from "bun:test";
import { recalculateLines, type InvoiceLine } from "./invoice-form-utils";

const product: InvoiceLine = {
  localId: "sample", date: "", taskDescription: "Sample hardware", quantity: 3,
  unitPrice: 19.99, totalCost: 0, type: "product", discountType: "percentage", discountValue: 0,
};

describe("product invoice lines", () => {
  it("calculates a fixed price per product rounded to cents", () => {
    expect(recalculateLines([product])[0].totalCost).toBe(59.97);
    expect(recalculateLines([{ ...product, quantity: 1 }])[0].totalCost).toBe(19.99);
  });

  it("includes products in the subtotal for percentage discounts", () => {
    const discount: InvoiceLine = { ...product, localId: "discount", type: "discount", discountValue: 10 };
    const lines = recalculateLines([product, discount]);
    expect(lines[1].totalCost).toBeCloseTo(-5.997);
  });
});
