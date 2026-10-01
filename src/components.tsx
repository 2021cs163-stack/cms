import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Eye,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Loader2,
  Upload,
  KeyRound,
  Check,
  Send,
} from "lucide-react";
import { useApp, supabase } from "./store";
import {
  modules,
  label,
  uid,
  today,
  validate,
  csv,
  downloadCsv,
  netSalary,
  grade,
  balanceFor,
} from "./model";
import type { Entity, Row, Field } from "./model";
export function Avatar({
  name,
  photo,
  size = "",
}: {
  name: string;
  photo?: string;
  size?: string;
}) {
  const [source, setSource] = useState<string | undefined>();
  useEffect(() => {
    let cancelled = false;
    if (
      photo &&
      supabase &&
      !photo.startsWith("http") &&
      !photo.startsWith("data:")
    ) {
      void supabase.storage
        .from("photos")
        .createSignedUrl(photo, 3600)
        .then(({ data }) => {
          if (!cancelled) setSource(data?.signedUrl);
        });
    } else setSource(photo);
    return () => {
      cancelled = true;
    };
  }, [photo]);
  return source ? (
    <img className={"avatar " + size} src={source} alt={name} />
  ) : (
    <span
      className={"avatar " + size}
      style={{
        background: ["#e8edff", "#f2e6fc", "#ffedda", "#e0f4ef"][
          name.length % 4
        ],
        color: ["#5970bb", "#a16bcc", "#ba874b", "#509480"][name.length % 4],
      }}
    >
      {name
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")}
    </span>
  );
}
export function Badge({ value }: { value: string }) {
  const { t } = useApp();
  return <span className={"badge " + value}>{t(value)}</span>;
}
export function Empty() {
  const { t } = useApp();
  return (
    <div className="empty">
      <Search size={30} />
      <h3>{t("No records found")}</h3>
      <p>{t("Try a different search or add your first record.")}</p>
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prior = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href],[tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = old;
      prior?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={"modal " + (wide ? "wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={ref}
        tabIndex={-1}
      >
        <header>
          <h2>{title}</h2>
          <button className="icon-button" aria-label="Close" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
export function Money({ value }: { value: number }) {
  const { settings, language } = useApp();
  return (
    <>
      {new Intl.NumberFormat(
        language === "en" ? "en-US" : language === "fa" ? "fa-AF" : "ps-AF",
        { maximumFractionDigits: 2 },
      ).format(value)}{" "}
      <small>{settings.currency}</small>
    </>
  );
}
export function useDisplay(entity: Entity) {
  const { data, t, settings } = useApp();
  return (row: Row, key: string): string => {
    const f = modules[entity]?.fields.find((f) => f.key === key);
    if (f?.type === "multi" && f.relation)
      return data[f.relation]
        .filter((r) => (row[key] || []).includes(r.id))
        .map(label)
        .join(", ");
    if (f?.relation)
      return label(data[f.relation].find((r) => r.id === row[key]));
    if (key === "net") return String(netSalary(row));
    if (key === "paid")
      return String(
        data.payments
          .filter((p) => p.student_id === row.student_id)
          .reduce((n, p) => n + Number(p.amount), 0),
      );
    if (key === "balance") return String(balanceFor(row.student_id, data));
    if (["percentage", "grade", "outcome"].includes(key)) {
      const exam = data.exams.find((e) => e.id === row.exam_id);
      const percent = exam ? (Number(row.marks) / exam.max_marks) * 100 : 0;
      return key === "percentage"
        ? percent.toFixed(1) + "%"
        : key === "grade"
          ? grade(percent, settings.grades)
          : t(row.marks >= (exam?.passing_marks ?? 50) ? "Pass" : "Fail");
    }
    if (key === "created_at") return new Date(row[key]).toLocaleString();
    if (Array.isArray(row[key])) return row[key].map(t).join(", ");
    return t(String(row[key] ?? "—"));
  };
}
export function RecordForm({
  entity,
  record,
  onClose,
  onSaved,
}: {
  entity: Entity;
  record?: Row;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { data, t, save, notify, settings, user } = useApp();
  const config = modules[entity]!;
  const [row, setRow] = useState<Row>(() => {
    const defaults: Row = { id: uid() };
    for (const f of config.fields) {
      defaults[f.key] =
        f.type === "number"
          ? 0
          : f.type === "checkbox"
            ? false
            : ["days", "multi"].includes(f.type || "")
              ? []
              : f.type === "select"
                ? f.options?.[0] || ""
                : f.type === "date"
                  ? f.key === "dob" || f.key === "paid_on"
                    ? ""
                    : today()
                  : f.type === "month"
                    ? today().slice(0, 7)
                    : "";
    }
    if (entity === "students")
      defaults.student_code = "AZ-" + Date.now().toString().slice(-7);
    if (entity === "payments") {
      defaults.receipt_number = "RC-" + Date.now().toString().slice(-9);
      defaults.received_by = user?.full_name;
    }
    if (entity === "certificates") {
      defaults.number =
        "AZ-" + today().slice(0, 4) + "-" + uid().slice(0, 8).toUpperCase();
      defaults.signature = settings.signature;
    }
    if (entity === "teachers" && record) {
      return {
        ...record,
        course_ids: data.courses
          .filter((c) => c.teacher_id === record.id)
          .map((c) => c.id),
        class_ids: data.classes
          .filter((c) => c.teacher_id === record.id)
          .map((c) => c.id),
      };
    }
    return record ? { ...record } : defaults;
  });
  const [errors, setErrors] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const update = (f: Field, value: any) => {
    setRow((r) => ({
      ...r,
      [f.key]: value,
      ...(f.key === "class_id" && entity === "student_groups"
        ? { student_ids: [] }
        : {}),
      ...(f.key === "template_id" && entity === "certificates"
        ? {
            signature:
              data.certificate_templates.find(
                (template) => template.id === value,
              )?.signature || settings.signature,
          }
        : {}),
      ...(f.key === "course_id" && entity === "students"
        ? { class_id: "" }
        : {}),
      ...(f.key === "teacher_id" && entity === "payroll"
        ? {
            base_salary: data.teachers.find((t) => t.id === value)?.salary || 0,
          }
        : {}),
      ...(f.key === "status" && entity === "payroll" && value === "paid"
        ? { paid_on: today() }
        : {}),
    }));
  };
  const upload = async (file: File, f: Field) => {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setErrors((e) => ({
        ...e,
        [f.key]: "Use a JPG, PNG or WebP image under 2 MB",
      }));
      return;
    }
    try {
      setBusy(true);
      if (supabase) {
        const path = `${user!.id}/${uid()}.${file.type.split("/")[1]}`;
        const { error } = await supabase.storage
          .from("photos")
          .upload(path, file);
        if (error) throw error;
        update(f, path);
      } else {
        const reader = new FileReader();
        reader.onload = () => update(f, reader.result);
        reader.readAsDataURL(file);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal title={t(record ? "Edit" : config.singular)} onClose={onClose} wide>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const errors = validate(entity, row, data);
          setErrors(errors);
          if (Object.keys(errors).length) return;
          setBusy(true);
          setError("");
          try {
            const saved = await save(entity, row);
            notify(
              entity === "teachers" && !record
                ? t("Saved successfully") + " · " + saved.email
                : t("Saved successfully"),
            );
            onSaved?.();
            onClose();
          } catch (err: any) {
            setError(err.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-body">
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {entity === "teachers" && !record && (
            <div className="info-box">
              {t("Email")}: teachername@aminzi.af ·{" "}
              {t("Please change your temporary password to continue.")}
              <p>
                {t(
                  "Default login is created securely by the server. The initial password is admin123.",
                )}
              </p>
            </div>
          )}
          <div className="form-grid">
            {config.fields.map((f) => (
              <label
                key={f.key}
                className={
                  "field " +
                  (["textarea", "file", "multi", "days"].includes(f.type || "")
                    ? "full"
                    : "")
                }
              >
                <span>
                  {t(f.label)}
                  {f.required && <b> *</b>}
                </span>
                {f.type === "textarea" ? (
                  <textarea
                    value={row[f.key] || ""}
                    onChange={(e) => update(f, e.target.value)}
                    rows={3}
                  />
                ) : f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={!!row[f.key]}
                    onChange={(e) => update(f, e.target.checked)}
                  />
                ) : f.type === "file" ? (
                  <div className="upload-field">
                    {row[f.key] && (
                      <Avatar
                        name={row.full_name || "Photo"}
                        photo={row[f.key]}
                      />
                    )}
                    <Upload size={20} />
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) =>
                        e.target.files?.[0] && void upload(e.target.files[0], f)
                      }
                    />
                  </div>
                ) : f.type === "days" || f.type === "multi" ? (
                  <div className="checkbox-group">
                    {(f.type === "days"
                      ? ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map(
                          (d) => ({ id: d, name: d }),
                        )
                      : data[f.relation!].filter((option) =>
                          f.key === "student_ids"
                            ? option.class_id === row.class_id
                            : true,
                        )
                    ).map((option) => (
                      <label key={option.id}>
                        <input
                          type="checkbox"
                          checked={(row[f.key] || []).includes(option.id)}
                          onChange={(e) =>
                            update(
                              f,
                              e.target.checked
                                ? [...(row[f.key] || []), option.id]
                                : (row[f.key] || []).filter(
                                    (id: string) => id !== option.id,
                                  ),
                            )
                          }
                        />
                        {t(label(option))}
                      </label>
                    ))}
                  </div>
                ) : f.type === "select" || f.type === "relation" ? (
                  <select
                    value={row[f.key] || ""}
                    onChange={(e) => update(f, e.target.value || null)}
                    required={f.required}
                  >
                    <option value="">{t("Select…")}</option>
                    {f.options
                      ? f.options.map((o) => (
                          <option value={o} key={o}>
                            {t(o)}
                          </option>
                        ))
                      : data[f.relation!]
                          .filter((r) =>
                            f.key === "class_id" && row.course_id
                              ? r.course_id === row.course_id
                              : true,
                          )
                          .map((r) => (
                            <option value={r.id} key={r.id}>
                              {t(label(r))}
                            </option>
                          ))}
                  </select>
                ) : (
                  <input
                    type={f.type || "text"}
                    value={row[f.key] ?? ""}
                    min={f.min}
                    max={f.max}
                    step={f.type === "number" ? "0.01" : undefined}
                    required={f.required}
                    onChange={(e) =>
                      update(
                        f,
                        f.type === "number"
                          ? e.target.value === ""
                            ? ""
                            : Number(e.target.value)
                          : e.target.value,
                      )
                    }
                  />
                )}{" "}
                {errors[f.key] && (
                  <small className="field-error">{t(errors[f.key])}</small>
                )}
              </label>
            ))}
          </div>
          {entity === "payroll" && (
            <div className="calculated">
              {t("Net salary")}{" "}
              <strong>
                <Money value={netSalary(row)} />
              </strong>
            </div>
          )}
          {entity === "payments" && row.student_id && (
            <div className="calculated">
              {t("Balance")}{" "}
              <strong>
                <Money value={balanceFor(row.student_id, data)} />
              </strong>
            </div>
          )}
        </div>
        <footer>
          <button type="button" className="button secondary" onClick={onClose}>
            {t("Cancel")}
          </button>
          <button className="button" disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}{" "}
            {t("Save")}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
export function DataTable({
  entity,
  rows,
  editable = true,
  onView,
  onAdd,
  initialSearch = "",
}: {
  entity: Entity;
  rows?: Row[];
  editable?: boolean;
  onView?: (r: Row) => void;
  onAdd?: () => void;
  initialSearch?: string;
}) {
  const { data, t, user, remove, notify, updateTeacher, save, refresh } =
    useApp();
  const config = modules[entity]!;
  const display = useDisplay(entity);
  const [search, setSearch] = useState(initialSearch),
    [sort, setSort] = useState(""),
    [ascending, setAscending] = useState(true),
    [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [course, setCourse] = useState(""),
    [columns, setColumns] = useState(config.columns),
    [showColumns, setShowColumns] = useState(false),
    [edit, setEdit] = useState<Row | null | undefined>(undefined),
    [deleting, setDeleting] = useState<Row | null>(null),
    [busy, setBusy] = useState(false);
  const isAdmin = user?.role === "admin";
  const canEdit =
    editable &&
    (isAdmin ||
      entity === "results" ||
      (entity === "announcements" && user?.can_announce));
  useEffect(() => {
    setPage(1);
  }, [search, status, course]);
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);
  const filtered = (rows || data[entity])
    .filter(
      (r) =>
        (!status || r.status === status) &&
        (!course ||
          r.course_id === course ||
          data.students.find((s) => s.id === r.student_id)?.course_id ===
            course) &&
        (!search ||
          Object.keys(r)
            .map((k) => display(r, k))
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())),
    )
    .sort((a, b) =>
      sort
        ? (typeof a[sort] === "number" && typeof b[sort] === "number"
            ? a[sort] - b[sort]
            : display(a, sort).localeCompare(display(b, sort))) *
          (ascending ? 1 : -1)
        : 0,
    );
  const pages = Math.max(1, Math.ceil(filtered.length / 8)),
    current = Math.min(page, pages);
  const header = (key: string) =>
    t(
      config.fields.find((f) => f.key === key)?.label ||
        (
          {
            net: "Net salary",
            balance: "Balance",
            paid: "Paid amount",
            percentage: "Percentage",
            grade: "Grade",
            outcome: "Outcome",
            created_at: "Date",
            actor: "User",
            action: "Action",
            resource: "Resource",
            record_id: "Student ID",
          } as Record<string, string>
        )[key] ||
        key,
    );
  return (
    <>
      <div className="table-toolbar no-print">
        <div className="table-search">
          <Search size={17} />
          <input
            aria-label={t("Search records…")}
            placeholder={t("Search records…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="table-tools">
          {config.fields.some((f) => f.key === "status") && (
            <select
              aria-label={t("Status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t("All statuses")}</option>
              {config.fields
                .find((f) => f.key === "status")
                ?.options?.map((o) => (
                  <option key={o} value={o}>
                    {t(o)}
                  </option>
                ))}
            </select>
          )}
          {["students", "classes", "fees", "payments", "certificates"].includes(
            entity,
          ) && (
            <select
              aria-label={t("Course")}
              value={course}
              onChange={(e) => setCourse(e.target.value)}
            >
              <option value="">{t("All courses")}</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name)}
                </option>
              ))}
            </select>
          )}
          <button
            className="button secondary compact"
            title={t("Export CSV")}
            onClick={() => downloadCsv(entity, csv(filtered, columns, display))}
          >
            <Download size={16} />
            <span>{t("Export CSV")}</span>
          </button>
          <button
            className="icon-button bordered"
            title={t("Print / PDF")}
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
          <div className="dropdown-anchor">
            <button
              className="icon-button bordered"
              title={t("Columns")}
              onClick={() => setShowColumns(!showColumns)}
            >
              <SlidersHorizontal size={17} />
            </button>
            {showColumns && (
              <div className="dropdown columns">
                <b>{t("Customize columns")}</b>
                {config.columns.map((c) => (
                  <label key={c}>
                    <input
                      type="checkbox"
                      checked={columns.includes(c)}
                      onChange={(e) =>
                        setColumns(
                          e.target.checked
                            ? [...columns, c]
                            : columns.length > 1
                              ? columns.filter((k) => k !== c)
                              : columns,
                        )
                      }
                    />
                    {header(c)}
                  </label>
                ))}
              </div>
            )}
          </div>
          {canEdit && (
            <button
              className="button compact"
              onClick={() => (onAdd ? onAdd() : setEdit(null))}
            >
              <Plus size={17} />
              {t("Add")}
            </button>
          )}
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>
                  <button
                    onClick={() => {
                      setSort(c);
                      setAscending(sort === c ? !ascending : true);
                    }}
                  >
                    {header(c)}{" "}
                    {sort === c ? (
                      ascending ? (
                        <ArrowUp size={12} />
                      ) : (
                        <ArrowDown size={12} />
                      )
                    ) : null}
                  </button>
                </th>
              ))}
              {(onView || canEdit || entity === "messages") && (
                <th className="no-print">{t("Actions")}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((current - 1) * 8, current * 8).map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={c}>
                    {c === "full_name" ? (
                      <div className="person">
                        <Avatar name={row.full_name} photo={row.photo} />
                        <div>
                          <strong>{row.full_name}</strong>
                          {entity === "students" && <small>{row.email}</small>}
                        </div>
                      </div>
                    ) : c === "status" ? (
                      <Badge value={row[c]} />
                    ) : [
                        "amount",
                        "total",
                        "paid",
                        "balance",
                        "base_salary",
                        "bonus",
                        "deductions",
                        "advances",
                        "net",
                        "fee",
                      ].includes(c) ? (
                      <Money value={Number(display(row, c))} />
                    ) : (
                      <span
                        className={
                          c === "student_code" ||
                          c === "receipt_number" ||
                          c === "number"
                            ? "code"
                            : ""
                        }
                      >
                        {display(row, c)}
                      </span>
                    )}
                  </td>
                ))}
                {(onView || canEdit || entity === "messages") && (
                  <td className="no-print">
                    <div className="row-actions">
                      {onView && (
                        <button
                          className="icon-button"
                          title={t("Details")}
                          onClick={() => onView(row)}
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {canEdit &&
                        (entity !== "messages" || row.status === "draft") && (
                          <>
                            <button
                              className="icon-button"
                              title={t("Edit")}
                              onClick={() => setEdit(row)}
                            >
                              <Edit3 size={15} />
                            </button>
                            {entity === "teachers" ? (
                              <button
                                className="icon-button"
                                title={t("Reset teacher password")}
                                onClick={async () => {
                                  try {
                                    const result = await updateTeacher(
                                      row.id,
                                      "reset_password",
                                    );
                                    notify(
                                      result.message ||
                                        "Password reset email sent",
                                    );
                                  } catch (e: any) {
                                    notify(e.message);
                                  }
                                }}
                              >
                                <KeyRound size={15} />
                              </button>
                            ) : (
                              isAdmin && (
                                <button
                                  className="icon-button danger-text"
                                  title={t("Delete")}
                                  onClick={() => setDeleting(row)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )
                            )}
                          </>
                        )}
                      {entity === "payroll" &&
                        isAdmin &&
                        row.status !== "paid" && (
                          <button
                            className="icon-button"
                            title={t("Mark as paid")}
                            onClick={async () => {
                              try {
                                await save("payroll", {
                                  ...row,
                                  status: "paid",
                                  paid_on: today(),
                                });
                                notify(t("Saved successfully"));
                              } catch (e: any) {
                                notify(e.message);
                              }
                            }}
                          >
                            <Check size={17} />
                          </button>
                        )}
                      {entity === "messages" && row.status === "draft" && (
                        <button
                          className="icon-button"
                          title={t("Send message")}
                          onClick={async () => {
                            if (!supabase) {
                              notify(
                                "Demo: delivery is disabled. Connect Supabase and configure your provider to send messages.",
                              );
                              return;
                            }
                            try {
                              const { data, error } =
                                await supabase.functions.invoke(
                                  "send-message",
                                  { body: { message_id: row.id } },
                                );
                              if (error || data?.error)
                                throw Error(error?.message || data.error);
                              notify("Message submitted to provider");
                              await refresh();
                            } catch (e: any) {
                              notify(e.message);
                            }
                          }}
                        >
                          <Send size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <Empty />}
      </div>
      <div className="pagination no-print">
        <span>
          {filtered.length} {t("records")}
        </span>
        <div>
          <button
            className="icon-button bordered"
            aria-label={t("Previous")}
            disabled={current <= 1}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {t("Page")} <b>{current}</b> {t("of")} {pages}
          </span>
          <button
            className="icon-button bordered"
            aria-label={t("Next")}
            disabled={current >= pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      {edit !== undefined && (
        <RecordForm
          entity={entity}
          record={edit || undefined}
          onClose={() => setEdit(undefined)}
        />
      )}{" "}
      {deleting && (
        <Modal
          title={t("Delete this record?")}
          onClose={() => setDeleting(null)}
        >
          <div className="form-body">
            <p>{label(deleting)}</p>
            <p className="muted">
              {t(
                "This action cannot be undone. Linked records may prevent deletion.",
              )}
            </p>
          </div>
          <footer>
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              {t("Cancel")}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await remove(entity, deleting.id);
                  setDeleting(null);
                  notify(t("Deleted successfully"));
                } catch (e: any) {
                  notify(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t("Delete")}
            </button>
          </footer>
        </Modal>
      )}
    </>
  );
}
export function SectionTitle({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useApp();
  return (
    <div className="section-title">
      <div>
        <h1>{t(title)}</h1>
        {description && <p>{t(description)}</p>}
      </div>
      {action}
    </div>
  );
}
