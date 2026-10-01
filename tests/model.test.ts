import { describe, it, expect, vi } from "vitest";
import { createSeed } from "../src/seed";
import {
  grade,
  netSalary,
  balanceFor,
  validate,
  expandTemplate,
  csv,
  today,
} from "../src/model";
describe("Academic and financial rules", () => {
  it("uses the local calendar date for form defaults near midnight", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(2026, 9, 1, 0, 15));
      expect(today()).toBe("2026-10-01");
    } finally {
      vi.useRealTimers();
    }
  });
  it("grades inclusive boundaries and configured thresholds", () => {
    expect(
      [49, 50, 59, 60, 69, 70, 79, 80, 89, 90, 100].map((p) => grade(p)),
    ).toEqual(["F", "D", "D", "C", "C", "B", "B", "A", "A", "A+", "A+"]);
    expect(grade(65, { Excellent: 80, Pass: 60, Fail: 0 })).toBe("Pass");
  });
  it("calculates salary with bonuses, deductions, and advances", () => {
    expect(
      netSalary({
        base_salary: 18000,
        bonus: 1500,
        deductions: 500,
        advances: 2000,
      }),
    ).toBe(17000);
  });
  it("rejects overpayments and edits account for the old payment", () => {
    const d = createSeed(),
      p = d.payments[0];
    expect(
      validate(
        "payments",
        { ...p, amount: balanceFor(p.student_id, d) + Number(p.amount) + 1 },
        d,
      ).amount,
    ).toBeTruthy();
    expect(validate("payments", p, d).amount).toBeUndefined();
  });
  it("rejects an exam result for a student from another class", () => {
    const d = createSeed();
    const e = d.exams[0],
      s = d.students.find((s) => s.class_id !== e.class_id)!;
    expect(
      validate(
        "results",
        { id: "new", student_id: s.id, exam_id: e.id, marks: 101 },
        d,
      ),
    ).toHaveProperty("student_id");
    expect(
      validate(
        "results",
        { id: "new", student_id: s.id, exam_id: e.id, marks: 101 },
        d,
      ),
    ).toHaveProperty("marks");
  });
  it("blocks duplicate result and payroll records", () => {
    const d = createSeed();
    expect(
      validate("results", { ...d.results[0], id: "other" }, d).student_id,
    ).toBeTruthy();
    expect(
      validate("payroll", { ...d.payroll[0], id: "other" }, d).month,
    ).toBeTruthy();
  });
  it("does not treat unsupplied template variables as completed", () => {
    expect(
      expandTemplate("Dear {student_name}: {balance} / {exam_date}", {
        student_name: "Zahra",
        balance: 250,
      }),
    ).toBe("Dear Zahra: 250 / {exam_date}");
  });
  it("quotes CSV text and neutralizes spreadsheet formulas", () => {
    const output = csv(
      [{ id: "x", name: '=HYPERLINK("bad")', notes: "a,b\nc" }],
      ["name", "notes"],
    );
    expect(output).toContain('"\'=HYPERLINK(""bad"")"');
    expect(output).toContain('"a,b\nc"');
  });
});
