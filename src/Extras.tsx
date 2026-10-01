import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search,
  ArrowUpRight,
  KeyRound,
  Mail,
  Copy,
  Check,
} from "lucide-react";
import { useApp, supabase } from "./store";
import { balanceFor, label, modules } from "./model";
import type { Entity, Row } from "./model";
import { DataTable, Money, SectionTitle } from "./components";
export function TeacherSecurity({ teacher }: { teacher: Row }) {
  const { t, updateTeacher, notify } = useApp();
  const [temporary, setTemporary] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <div className="teacher-security no-print">
      <h3>{t("Security")}</h3>
      <p className="muted">
        {t("Email")}: {teacher.email}
      </p>
      <div className="security-actions">
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await updateTeacher(teacher.id, "reset_password");
              notify(result.message || t("Password reset email sent"));
            } catch (e: any) {
              notify(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Mail size={16} />
          {t("Send reset link")}
        </button>
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            if (!supabase) {
              notify(
                "Temporary credentials are only generated for connected Supabase accounts.",
              );
              return;
            }
            setBusy(true);
            try {
              const result = await updateTeacher(
                teacher.id,
                "temporary_password",
              );
              setTemporary(result.temporary_password);
            } catch (e: any) {
              notify(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <KeyRound size={16} />
          {t("Generate temporary password")}
        </button>
      </div>
      {temporary && (
        <div className="info-box">
          <b>{t("Temporary password")}</b>
          <code className="temporary-password">{temporary}</code>
          <p>{t("Shown once. Share it securely with this teacher.")}</p>
          <button className="text-link" onClick={() => setTemporary("")}>
            {t("Close")}
          </button>
        </div>
      )}
    </div>
  );
}
export function FeesPage() {
  const { data, t } = useApp();
  const [status, setStatus] = useState("all");
  const total = data.fees.reduce((n, f) => n + Number(f.total), 0),
    paid = data.payments.reduce((n, p) => n + Number(p.amount), 0);
  const rows = data.fees.filter((f) => {
    const balance = balanceFor(f.student_id, data);
    return (
      status === "all" ||
      (status === "unpaid"
        ? balance === Number(f.total) && balance > 0
        : status === "fully_paid"
          ? balance === 0
          : balance > 0 && balance < Number(f.total))
    );
  });
  return (
    <>
      <SectionTitle title="Outstanding fees" />
      <div className="tabs">
        <Link to="/payments">{t("All payments")}</Link>
        <button className="active">{t("Outstanding fees")}</button>
        <Link to="/reports?type=payments">{t("Financial reports")}</Link>
      </div>
      <div className="mini-stats fee-totals">
        <div>
          <span>{t("Total fee")}</span>
          <b>
            <Money value={total} />
          </b>
        </div>
        <div>
          <span>{t("Paid amount")}</span>
          <b>
            <Money value={paid} />
          </b>
        </div>
        <div>
          <span>{t("Balance")}</span>
          <b>
            <Money value={total - paid} />
          </b>
        </div>
      </div>
      <div className="fees-status-filter">
        <label>
          {t("Paid status")}{" "}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {["all", "unpaid", "partially_paid", "fully_paid"].map((s) => (
              <option value={s} key={s}>
                {t(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <section className="panel">
        <DataTable entity="fees" rows={rows} />
      </section>
    </>
  );
}
export function SearchPage() {
  const { data, t, user } = useApp();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const entities = Object.keys(modules).filter(
    (e) =>
      !["activity", "messages", "templates"].includes(e) &&
      (!modules[e as Entity]?.admin || user?.role === "admin"),
  ) as Entity[];
  const hits = entities.flatMap((entity) =>
    data[entity]
      .filter((r) =>
        Object.values(r)
          .filter((v) => typeof v === "string")
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      )
      .slice(0, 15)
      .map((record) => ({ entity, record })),
  );
  return (
    <>
      <SectionTitle title="Search" description={q} />
      <div className="search-results">
        {hits.map(({ entity, record }) => {
          const name =
            record.full_name ||
            record.name ||
            record.title ||
            record.number ||
            record.receipt_number ||
            label(data.students.find((s) => s.id === record.student_id)) ||
            entity;
          return (
            <Link
              className="panel search-result"
              key={record.id}
              to={
                entity === "courses"
                  ? "/courses?course=" + record.id
                  : "/" +
                    entity +
                    "?q=" +
                    encodeURIComponent(name === "—" ? "" : name)
              }
            >
              <span className="stat-icon blue">
                <Search size={20} />
              </span>
              <div>
                <h3>{t(name)}</h3>
                <p>{t(modules[entity]!.title)}</p>
              </div>
              <ArrowUpRight size={18} />
            </Link>
          );
        })}
        {!hits.length && <p className="muted">{t("No records found")}</p>}
      </div>
    </>
  );
}
