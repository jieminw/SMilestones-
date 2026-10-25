import { describe, expect, it } from "vitest";
import { tableQuote } from "../src/domain/directory";

const q = (priceNote: string, category: "hotel" | "venue" = "hotel") => tableQuote({ category, priceNote });

describe("tableQuote", () => {
  it("uses a quoted table price as it is", () => {
    expect(q("from $1,108 a table, min 18 tables")).toMatchObject({ amount: 1108, plus: false, from: true, derived: false, minTables: 18 });
    expect(q("$1,758 nett a table for a weekday dinner (2026), min 8 tables")).toMatchObject({ amount: 1758, plus: false, derived: false, minTables: 8 });
  });
  it("takes the lowest figure and the plus-plus flag from a range", () => {
    expect(q("2026 lunch from $1,598++, dinner from $1,898++ a table")).toMatchObject({ amount: 1598, plus: true, from: true });
    expect(q("$1,288++ to $1,388++ a table")).toMatchObject({ amount: 1288, plus: true, from: true });
  });
  it("works a per-person price out to a table of 10", () => {
    expect(q("from $178++ a person, minimum spend $10,680++")).toMatchObject({ amount: 1780, derived: true, perPerson: "$178++" });
    expect(q("rooftop package $158++ to $178++ a person")).toMatchObject({ amount: 1580, derived: true });
  });
  it("gives nothing when the note names neither a table nor a person", () => {
    expect(q("lunch $4,760++, dinner $5,160++ (basis not given)")).toBeUndefined();
    expect(q("minimum spend from $16,880++")).toBeUndefined();
  });
  it("only applies to hotels", () => {
    expect(q("from $1,108 a table", "venue")).toBeUndefined();
  });
});
