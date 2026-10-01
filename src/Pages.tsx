import { useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Plus,
  ArrowUpRight,
  CalendarDays,
  Check,
  Download,
  Printer,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  BookOpen,
  Users,
  Wallet,
  GraduationCap,
  Clock3,
  FileText,
  ExternalLink,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useApp, supabase } from "./store";
import {
  Avatar,
  Badge,
  DataTable,
  Empty,
  Modal,
  Money,
  RecordForm,
  SectionTitle,
} from "./components";
import { CourseCard } from "./Dashboard";
import { TeacherSecurity } from "./Extras";
import {
  attendancePercent,
  balanceFor,
  csv,
  downloadCsv,
  expandTemplate,
  grade,
  label,
  modules,
  netSalary,
  today,
  uid,
} from "./model";
import type { Entity, Row } from "./model";

export function EntityPage({ entity }: { entity: Entity }) {
  const { t, user } = useApp();
  const [params] = useSearchParams();
  const [view, setView] = useState<Row | null>(null);
  return (
    <>
      <SectionTitle
        title={modules[entity]!.title}
        description={
          entity === "students"
            ? "Every learner. Every milestone."
            : entity === "teachers"
              ? "The people behind the progress."
              : undefined
        }
      />
      {["students", "student_groups"].includes(entity) && (
        <div className="tabs">
          <Link to="/students">{t("Students")}</Link>
          <Link to="/student_groups">{t("Student groups")}</Link>
          <Link to="/attendance">{t("Attendance")}</Link>
        </div>
      )}
      {["certificates", "certificate_templates"].includes(entity) && (
        <div className="tabs">
          <Link to="/certificates">{t("Certificates")}</Link>
          {user?.role === "admin" && (
            <Link to="/certificate_templates">
              {t("Certificate templates")}
            </Link>
          )}
          <Link to="/verify">{t("Verify certificate")}</Link>
        </div>
      )}
      {["exams", "results", "subjects"].includes(entity) && (
        <div className="tabs">
          <Link to="/exams">{t("Examinations")}</Link>
          <Link to="/results">{t("Enter results")}</Link>
          <Link to="/subjects">{t("Subjects")}</Link>
        </div>
      )}
      {entity === "payments" && (
        <div className="tabs">
          <Link to="/payments">{t("All payments")}</Link>
          <Link to="/fees">{t("Outstanding fees")}</Link>
          <Link to="/reports?type=payments">{t("Financial reports")}</Link>
        </div>
      )}
      <section className="panel">
        <DataTable
          key={entity}
          entity={entity}
          initialSearch={params.get("q") || ""}
          editable={
            entity !== "activity" &&
            (entity !== "certificates" || user?.role === "admin")
          }
          onView={
            [
              "students",
              "teachers",
              "certificates",
              "payments",
              "payroll",
            ].includes(entity)
              ? setView
              : undefined
          }
        />
      </section>
      {view &&
        (entity === "students" ? (
          <StudentProfile student={view} onClose={() => setView(null)} />
        ) : entity === "certificates" ? (
          <Certificate certificate={view} onClose={() => setView(null)} />
        ) : (
          <RecordDetails
            entity={entity}
            record={view}
            onClose={() => setView(null)}
          />
        ))}
    </>
  );
}
export function StudentProfile({
  student,
  onClose,
}: {
  student: Row;
  onClose: () => void;
}) {
  const { data, t, user, settings } = useApp();
  const results = data.results.filter((r) => r.student_id === student.id);
  const average = results.length
    ? results.reduce(
        (n, r) =>
          n +
          (Number(r.marks) /
            (data.exams.find((e) => e.id === r.exam_id)?.max_marks || 100)) *
            100,
        0,
      ) / results.length
    : 0;
  const cls = data.classes.find((c) => c.id === student.class_id);
  const progress = cls
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((Date.now() - Date.parse(cls.start_date)) /
              (Date.parse(cls.end_date) - Date.parse(cls.start_date))) *
              100,
          ),
        ),
      )
    : 0;
  return (
    <Modal title={t("View profile")} onClose={onClose} wide>
      <div className="form-body profile-content">
        <div className="profile-hero">
          <Avatar name={student.full_name} photo={student.photo} size="large" />
          <div>
            <h2>{student.full_name}</h2>
            <p>
              {student.student_code} ·{" "}
              {t(label(data.courses.find((c) => c.id === student.course_id)))}
            </p>
            <Badge value={student.status} />
          </div>
          <button
            className="icon-button bordered"
            title={t("Print / PDF")}
            onClick={() => window.print()}
          >
            <Printer size={18} />
          </button>
        </div>
        <div className="mini-stats">
          <div>
            <span>{t("Attendance percentage")}</span>
            <b>{attendancePercent(student.id, data)}%</b>
          </div>
          <div>
            <span>{t("Average marks")}</span>
            <b>{average.toFixed(1)}%</b>
          </div>
          <div>
            <span>{t("Course progress")}</span>
            <b>{progress}%</b>
          </div>
          {user?.role === "admin" && (
            <div>
              <span>{t("Balance")}</span>
              <b>
                <Money value={balanceFor(student.id, data)} />
              </b>
            </div>
          )}
        </div>
        <div className="detail-grid">
          {modules
            .students!.fields.filter(
              (f) => !["photo", "full_name"].includes(f.key),
            )
            .map((f) => (
              <div key={f.key}>
                <span>{t(f.label)}</span>
                <strong>
                  {f.relation
                    ? t(
                        label(
                          data[f.relation].find((r) => r.id === student[f.key]),
                        ),
                      )
                    : t(student[f.key] || "—")}
                </strong>
              </div>
            ))}
        </div>
        <h3>{t("Results")}</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("Exam")}</th>
                <th>{t("Marks")}</th>
                <th>{t("Grade")}</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => {
                const exam = data.exams.find((e) => e.id === r.exam_id);
                return (
                  <tr key={r.id}>
                    <td>{exam?.name}</td>
                    <td>
                      {r.marks}/{exam?.max_marks}
                    </td>
                    <td>
                      {grade(
                        (r.marks / (exam?.max_marks || 100)) * 100,
                        settings.grades,
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!results.length && <p className="muted">{t("No data yet")}</p>}
        </div>
        {user?.role === "admin" && (
          <>
            <h3>{t("Payment history")}</h3>
            <table>
              <tbody>
                {data.payments
                  .filter((p) => p.student_id === student.id)
                  .map((p) => (
                    <tr key={p.id}>
                      <td>{p.receipt_number}</td>
                      <td>{p.date}</td>
                      <td>
                        <Money value={p.amount} />
                      </td>
                      <td>{t(p.method)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </>
        )}
        <h3>{t("Certificates")}</h3>
        {data.certificates
          .filter((c) => c.student_id === student.id)
          .map((c) => (
            <p key={c.id}>
              <Link
                className="text-link"
                to={"/verify?number=" + encodeURIComponent(c.number)}
              >
                {c.number}
                <ExternalLink size={14} />
              </Link>
            </p>
          ))}
      </div>
    </Modal>
  );
}
function RecordDetails({
  entity,
  record,
  onClose,
}: {
  entity: Entity;
  record: Row;
  onClose: () => void;
}) {
  const { data, t, settings } = useApp();
  return (
    <Modal title={t(modules[entity]!.singular)} onClose={onClose} wide>
      <div className="form-body printable-document">
        <div className="document-heading">
          <div className="brand-mark">
            <GraduationCap />
          </div>
          <h2>{settings.institution_name}</h2>
          <p>
            {settings.address} · {settings.phone}
          </p>
        </div>
        <h3>
          {t(
            entity === "payments"
              ? "Receipt number"
              : entity === "payroll"
                ? "Payroll"
                : "Teacher",
          )}{" "}
          {record.receipt_number}
        </h3>
        <div className="detail-grid">
          {modules[entity]!.fields.filter(
            (f) => !["photo", "course_ids", "class_ids"].includes(f.key),
          ).map((f) => (
            <div key={f.key}>
              <span>{t(f.label)}</span>
              <strong>
                {f.relation
                  ? label(data[f.relation].find((r) => r.id === record[f.key]))
                  : t(String(record[f.key] ?? "—"))}
              </strong>
            </div>
          ))}
          {entity === "teachers" && (
            <div>
              <span>{t("Email")}</span>
              <strong>{record.email}</strong>
            </div>
          )}
        </div>
        {entity === "payroll" && (
          <div className="calculated">
            {t("Net salary")}
            <b>
              <Money value={netSalary(record)} />
            </b>
          </div>
        )}
        {entity === "payments" && (
          <div className="calculated">
            {t("Amount")}
            <b>
              <Money value={record.amount} />
            </b>
          </div>
        )}
        {entity === "teachers" && <TeacherSecurity teacher={record} />}
      </div>
      <footer>
        <button className="button" onClick={() => window.print()}>
          <Printer size={17} />
          {t("Print / PDF")}
        </button>
      </footer>
    </Modal>
  );
}
export function Courses() {
  const { data, t, user } = useApp();
  const [params] = useSearchParams();
  const selected = data.courses.find((c) => c.id === params.get("course"));
  const [search, setSearch] = useState(selected?.name || ""),
    [tab, setTab] = useState("cards"),
    [form, setForm] = useState<Row | null | undefined>(
      user?.role === "admin" ? selected : undefined,
    );
  return (
    <>
      <SectionTitle
        title="Courses"
        description="A world of learning, thoughtfully organized."
        action={
          user?.role === "admin" && (
            <button className="button" onClick={() => setForm(null)}>
              <Plus size={17} />
              {t("New course")}
            </button>
          )
        }
      />
      <div className="tabs">
        <button
          className={tab === "cards" ? "active" : ""}
          onClick={() => setTab("cards")}
        >
          {t("All courses")}
        </button>
        <button
          className={tab === "table" ? "active" : ""}
          onClick={() => setTab("table")}
        >
          {t("Details")}
        </button>
        <Link to="/subjects">{t("Subjects")}</Link>
        <Link to="/classes">{t("Classes")}</Link>
      </div>
      {tab === "cards" ? (
        <>
          <div className="table-search standalone-search">
            <Search size={17} />
            <input
              placeholder={t("Search records…")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="courses-grid">
            {data.courses
              .filter((c) =>
                (t(c.name) + " " + c.description)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((c, i) => (
                <div className="course-wrapper" key={c.id}>
                  <CourseCard
                    course={c}
                    index={i}
                    onClick={() =>
                      user?.role === "admin" ? setForm(c) : setTab("table")
                    }
                  />
                  <div className="course-meta">
                    <Avatar
                      name={label(
                        data.teachers.find((te) => te.id === c.teacher_id),
                      )}
                    />
                    <span>
                      {label(
                        data.teachers.find((te) => te.id === c.teacher_id),
                      )}
                    </span>
                    <Badge value={c.status} />
                  </div>
                </div>
              ))}
          </div>
        </>
      ) : (
        <section className="panel">
          <DataTable entity="courses" editable={user?.role === "admin"} />
        </section>
      )}
      {form !== undefined && (
        <RecordForm
          entity="courses"
          record={form || undefined}
          onClose={() => setForm(undefined)}
        />
      )}
    </>
  );
}
export function Attendance() {
  const { data, t, saveAttendance, notify } = useApp();
  const [classId, setClassId] = useState(data.classes[0]?.id || ""),
    [date, setDate] = useState(today()),
    [tab, setTab] = useState("take"),
    [marks, setMarks] = useState<Record<string, string>>({}),
    [busy, setBusy] = useState(false),
    [studentSearch, setStudentSearch] = useState("");
  const students = data.students.filter(
    (s) => s.class_id === classId && s.status === "active",
  );
  const existing = data.attendance.filter(
    (a) => a.class_id === classId && a.date === date,
  );
  const status = (id: string) =>
    marks[id] || existing.find((a) => a.student_id === id)?.status || "";
  const records = data.attendance
    .filter((a) => (!classId || a.class_id === classId) && a.date === date)
    .filter((a) =>
      label(data.students.find((s) => s.id === a.student_id))
        .toLowerCase()
        .includes(studentSearch.toLowerCase()),
    );
  return (
    <>
      <SectionTitle
        title="Attendance"
        description="Small check-ins. A big picture of progress."
      />
      <div className="tabs">
        <button
          className={tab === "take" ? "active" : ""}
          onClick={() => setTab("take")}
        >
          {t("Take attendance")}
        </button>
        <button
          className={tab === "records" ? "active" : ""}
          onClick={() => setTab("records")}
        >
          {t("Attendance records")}
        </button>
        <Link to="/reports?type=attendance">{t("Attendance reports")}</Link>
      </div>
      <section className="panel">
        <div className="attendance-filters">
          <label className="field">
            <span>{t("Class")}</span>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setMarks({});
              }}
            >
              <option value="">{t("Select…")}</option>
              {data.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("Date")}</span>
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => {
                setDate(e.target.value);
                setMarks({});
              }}
            />
          </label>
          <label className="field">
            <span>{t("Search")}</span>
            <input
              placeholder={t("Search records…")}
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
          </label>
          <button
            className="button secondary"
            onClick={() =>
              downloadCsv(
                "attendance",
                csv(records, ["student", "date", "status"], (r, k) =>
                  k === "student"
                    ? label(data.students.find((s) => s.id === r.student_id))
                    : r[k],
                ),
              )
            }
          >
            <Download size={16} />
            {t("Export CSV")}
          </button>
        </div>
        {tab === "take" ? (
          <>
            <div className="attendance-summary">
              <span>
                {students.length} {t("students")}
              </span>
              <div>
                {["present", "absent", "late", "excused"].map((s) => (
                  <span key={s}>
                    <i className={"status-dot " + s} />
                    {t(s)}{" "}
                    <b>{students.filter((st) => status(st.id) === s).length}</b>
                  </span>
                ))}
              </div>
              <button
                className="text-link"
                onClick={() =>
                  setMarks(
                    Object.fromEntries(students.map((s) => [s.id, "present"])),
                  )
                }
              >
                {t("Mark all present")}
              </button>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>{t("Student")}</th>
                    <th>{t("Student ID")}</th>
                    <th>{t("Status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students
                    .filter((s) =>
                      s.full_name
                        .toLowerCase()
                        .includes(studentSearch.toLowerCase()),
                    )
                    .map((s) => (
                      <tr key={s.id}>
                        <td>
                          <div className="person">
                            <Avatar name={s.full_name} />
                            <strong>{s.full_name}</strong>
                          </div>
                        </td>
                        <td className="code">{s.student_code}</td>
                        <td>
                          <div className="attendance-buttons">
                            {["present", "absent", "late", "excused"].map(
                              (st) => (
                                <button
                                  key={st}
                                  aria-pressed={status(s.id) === st}
                                  className={
                                    status(s.id) === st ? "selected " + st : ""
                                  }
                                  onClick={() =>
                                    setMarks((m) => ({ ...m, [s.id]: st }))
                                  }
                                >
                                  {t(st)}
                                </button>
                              ),
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!students.length && <Empty />}
            <div className="panel-footer">
              <span className="muted">
                {students.filter((s) => status(s.id)).length} /{" "}
                {students.length}
              </span>
              <button
                className="button"
                disabled={busy || !students.length}
                onClick={async () => {
                  if (!date || date > today()) {
                    notify("Select a valid date no later than today.");
                    return;
                  }
                  if (students.some((s) => !status(s.id))) {
                    notify("Mark attendance for every student before saving.");
                    return;
                  }
                  setBusy(true);
                  try {
                    await saveAttendance(
                      students.map((s) => ({
                        id:
                          existing.find((a) => a.student_id === s.id)?.id ||
                          uid(),
                        student_id: s.id,
                        class_id: classId,
                        date,
                        status: status(s.id),
                      })),
                    );
                    setMarks({});
                    notify(t("Attendance saved"));
                  } catch (e: any) {
                    notify(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Check size={17} />
                )}{" "}
                {t("Save attendance")}
              </button>
            </div>
          </>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("Student")}</th>
                  <th>{t("Date")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {records.map((a) => (
                  <tr key={a.id}>
                    <td>
                      {label(data.students.find((s) => s.id === a.student_id))}
                    </td>
                    <td>{a.date}</td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length && <Empty />}
          </div>
        )}
      </section>
    </>
  );
}
export function Schedule() {
  const { data, t } = useApp();
  return (
    <>
      <SectionTitle
        title="Schedule"
        description="A little structure. A lot of possibility."
      />
      <div className="schedule-list">
        {["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"].map((day) => (
          <section className="panel schedule-day" key={day}>
            <h3>{t(day)}</h3>
            {data.classes
              .filter((c) => c.days.includes(day) && c.status === "active")
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map((c) => (
                <Link
                  to="/classes"
                  className={
                    "schedule-class " +
                    data.courses.find((co) => co.id === c.course_id)?.color
                  }
                  key={c.id}
                >
                  <div>
                    <Clock3 size={15} />
                    <b>
                      {c.start_time} – {c.end_time}
                    </b>
                  </div>
                  <h4>{c.name}</h4>
                  <p>
                    {c.room} ·{" "}
                    {label(data.teachers.find((te) => te.id === c.teacher_id))}
                  </p>
                  <small>
                    {c.start_date} – {c.end_date}
                  </small>
                </Link>
              ))}
            {!data.classes.some(
              (c) => c.days.includes(day) && c.status === "active",
            ) && <p className="muted">{t("No classes today")}</p>}
          </section>
        ))}
      </div>
    </>
  );
}
export function Certificate({
  certificate,
  onClose,
}: {
  certificate: Row;
  onClose: () => void;
}) {
  const { data, t, settings, save, notify, user } = useApp();
  const certificateRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const downloadCertificate = async () => {
    if (!certificateRef.current || downloading) return;
    setDownloading(true);
    try {
      const { downloadCertificatePdf } = await import("./certificate-pdf");
      await downloadCertificatePdf(certificateRef.current, certificate.number);
    } catch {
      notify(t("Could not download the certificate. Please try again."));
    } finally {
      setDownloading(false);
    }
  };
  const student = data.students.find((s) => s.id === certificate.student_id);
  const template = data.certificate_templates.find(
    (template) => template.id === certificate.template_id,
  );
  return (
    <Modal title={t("Certificates")} onClose={onClose} wide>
      <div
        className={"certificate certificate-" + (template?.accent || "gold")}
        ref={certificateRef}
      >
        <div className="certificate-inner">
          <GraduationCap size={40} />
          <div className="certificate-school">{settings.institution_name}</div>
          <h1>{t(template?.heading || settings.certificate_heading)}</h1>
          <span className="certificate-rule" />
          <p>{t("This is to certify that")}</p>
          <h2>{label(student)}</h2>
          <p>{t("has successfully completed")}</p>
          {template?.description && <p>{template.description}</p>}
          <h3>
            {t(label(data.courses.find((c) => c.id === certificate.course_id)))}
          </h3>
          <p>
            {t("Completion date")}: {certificate.completion_date}
          </p>
          <div className="certificate-signatures">
            <div>
              <strong>{certificate.signature}</strong>
              <span>{t("Authorized signature")}</span>
            </div>
            <QRCodeSVG
              value={
                window.location.origin +
                "/verify?number=" +
                encodeURIComponent(certificate.number)
              }
              size={74}
              level="M"
            />
            <div>
              <strong>{certificate.number}</strong>
              <span>{t("Certificate number")}</span>
            </div>
          </div>
        </div>
      </div>
      <footer>
        {user?.role === "admin" && (
          <button
            className="button secondary"
            onClick={async () => {
              try {
                await save("certificates", {
                  ...certificate,
                  issued_date: today(),
                });
                notify(t("Saved successfully"));
              } catch (e: any) {
                notify(e.message);
              }
            }}
          >
            {t("Reissue")}
          </button>
        )}
        <button
          className="button"
          onClick={downloadCertificate}
          disabled={downloading}
          aria-busy={downloading}
        >
          {downloading ? (
            <Loader2 size={17} className="spin" />
          ) : (
            <Download size={17} />
          )}
          {t(downloading ? "Downloading PDF..." : "Download PDF")}
        </button>
      </footer>
    </Modal>
  );
}
export function Verify() {
  const { data, t, settings } = useApp();
  const [params] = useSearchParams();
  const [number, setNumber] = useState(params.get("number") || ""),
    [result, setResult] = useState<Row | null | undefined>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const verify = async () => {
    setBusy(true);
    setError("");
    try {
      if (supabase) {
        const { data: found, error } = await supabase.rpc(
          "verify_certificate",
          { certificate_number: number.trim() },
        );
        if (error) throw error;
        setResult(found?.[0] || null);
      } else {
        const cert = data.certificates.find(
          (c) => c.number.toLowerCase() === number.trim().toLowerCase(),
        );
        setResult(
          cert
            ? {
                ...cert,
                student_name: label(
                  data.students.find((s) => s.id === cert.student_id),
                ),
                course_name: label(
                  data.courses.find((c) => c.id === cert.course_id),
                ),
              }
            : null,
        );
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="verify-page">
      <Link className="brand" to="/">
        <span className="brand-mark">
          <GraduationCap size={25} />
        </span>
        <b>{settings.institution_name}</b>
      </Link>
      <section className="panel verify-card">
        <ShieldCheck size={44} className="primary-text" />
        <h1>{t("Verify certificate")}</h1>
        <p className="muted">{t("Certificate number")}</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <input
            required
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="AZ-2026-0001"
          />
          <button className="button" disabled={busy}>
            {busy ? (
              <Loader2 size={17} className="spin" />
            ) : (
              <Search size={17} />
            )}{" "}
            {t("Verify")}
          </button>
        </form>
        {error && <div className="error-box">{error}</div>}
        {result !== undefined && (
          <div
            className={"verification-result " + (result ? "valid" : "invalid")}
          >
            {result ? (
              <>
                <CheckCircle2 />
                <h3>{t("Certificate verified")}</h3>
                <h2>{result.student_name}</h2>
                <p>{t(result.course_name)}</p>
                <p>{result.institution_name || settings.institution_name}</p>
                <p>{result.completion_date}</p>
                <small>{result.number}</small>
              </>
            ) : (
              <>
                <XCircle />
                <h3>{t("Certificate not found")}</h3>
              </>
            )}
          </div>
        )}
        <Link className="text-link" to="/">
          {t("Back")}
        </Link>
      </section>
    </div>
  );
}
export function Reports() {
  const { data, t, user, settings } = useApp();
  const [params] = useSearchParams();
  const [type, setType] = useState(params.get("type") || "students"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [course, setCourse] = useState(""),
    [teacher, setTeacher] = useState(""),
    [classId, setClassId] = useState(""),
    [statusFilter, setStatusFilter] = useState(""),
    [search, setSearch] = useState("");
  const admin = user?.role === "admin";
  const options = [
    { value: "students", label: "Student reports", icon: Users },
    { value: "attendance", label: "Attendance reports", icon: CheckCircle2 },
    { value: "results", label: "Exam reports", icon: GraduationCap },
    ...(admin
      ? [
          { value: "payments", label: "Financial reports", icon: Wallet },
          { value: "payroll", label: "Payroll reports", icon: FileText },
        ]
      : []),
  ];
  const safeType = options.some((o) => o.value === type) ? type : "students";
  const rows = data[safeType as Entity].filter((r) => {
    const date =
      r.date ||
      r.enrollment_date ||
      (r.month ? r.month + "-01" : "") ||
      data.exams.find((e) => e.id === r.exam_id)?.date ||
      "";
    const student =
      safeType === "students"
        ? r
        : data.students.find((s) => s.id === r.student_id);
    const cls = data.classes.find(
      (c) => c.id === (r.class_id || student?.class_id),
    );
    return (
      (!from || date >= from) &&
      (!to || date <= to) &&
      (!course || r.course_id === course || student?.course_id === course) &&
      (!teacher || r.teacher_id === teacher || cls?.teacher_id === teacher) &&
      (!classId || cls?.id === classId) &&
      (!statusFilter || r.status === statusFilter) &&
      (!search ||
        [
          label(r),
          label(student),
          label(data.teachers.find((te) => te.id === r.teacher_id)),
          r.student_code,
          r.status,
          r.receipt_number,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()))
    );
  });
  const fields =
    safeType === "attendance"
      ? ["student_id", "class_id", "date", "status"]
      : modules[safeType as Entity]!.columns;
  const display = (r: Row, k: string) => {
    if (k === "student_id")
      return label(data.students.find((s) => s.id === r[k]));
    if (k === "class_id") return label(data.classes.find((c) => c.id === r[k]));
    if (k === "teacher_id")
      return label(data.teachers.find((te) => te.id === r[k]));
    if (k === "course_id")
      return t(label(data.courses.find((c) => c.id === r[k])));
    if (k === "exam_id") return label(data.exams.find((e) => e.id === r[k]));
    if (k === "net") return netSalary(r);
    if (["grade", "percentage", "outcome"].includes(k)) {
      const exam = data.exams.find((e) => e.id === r.exam_id);
      const percent = (r.marks / (exam?.max_marks || 100)) * 100;
      return k === "percentage"
        ? percent.toFixed(1) + "%"
        : k === "grade"
          ? grade(percent, settings.grades)
          : t(r.marks >= (exam?.passing_marks ?? 50) ? "Pass" : "Fail");
    }
    return t(String(r[k] ?? ""));
  };
  return (
    <>
      <SectionTitle
        title="Reports"
        description="Clear insights. Better decisions."
      />
      <div className="report-options">
        {options.map((o) => (
          <button
            key={o.value}
            className={"panel " + (safeType === o.value ? "selected" : "")}
            onClick={() => {
              setType(o.value);
              setStatusFilter("");
              setClassId("");
              setTeacher("");
              setCourse("");
            }}
          >
            <o.icon size={23} />
            <span>{t(o.label)}</span>
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="report-filters">
          {admin && (
            <label className="field">
              <span>{t("Teacher")}</span>
              <select
                value={teacher}
                onChange={(e) => setTeacher(e.target.value)}
              >
                <option value="">{t("All teachers")}</option>
                {data.teachers.map((te) => (
                  <option key={te.id} value={te.id}>
                    {te.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {safeType !== "payroll" && (
            <label className="field">
              <span>{t("Class")}</span>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
              >
                <option value="">{t("All classes")}</option>
                {data.classes
                  .filter((c) => !teacher || c.teacher_id === teacher)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </label>
          )}
          {["students", "attendance", "payroll"].includes(safeType) && (
            <label className="field">
              <span>{t("Status")}</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">{t("All statuses")}</option>
                {[
                  ...new Set(
                    data[safeType as Entity].map((r) => String(r.status)),
                  ),
                ].map((status) => (
                  <option value={status} key={status}>
                    {t(status)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            <span>{t("From")}</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("To")}</span>
            <input
              type="date"
              value={to}
              min={from}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("Course")}</span>
            <select value={course} onChange={(e) => setCourse(e.target.value)}>
              <option value="">{t("All courses")}</option>
              {data.courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {t(c.name)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{t("Search")}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search records…")}
            />
          </label>
          <button
            className="button secondary"
            onClick={() =>
              downloadCsv(safeType + "-report", csv(rows, fields, display))
            }
          >
            <Download size={16} />
            {t("Export CSV")}
          </button>
          <button
            className="icon-button bordered"
            title={t("Print / PDF")}
            onClick={() => window.print()}
          >
            <Printer size={17} />
          </button>
        </div>
        <div className="report-total">
          {safeType === "results" && (
            <>
              <div>
                <span>{t("Pass")}</span>
                <strong>
                  {
                    rows.filter(
                      (r) =>
                        r.marks >=
                        (data.exams.find((e) => e.id === r.exam_id)
                          ?.passing_marks ?? 50),
                    ).length
                  }
                </strong>
              </div>
              <div>
                <span>{t("Fail")}</span>
                <strong>
                  {
                    rows.filter(
                      (r) =>
                        r.marks <
                        (data.exams.find((e) => e.id === r.exam_id)
                          ?.passing_marks ?? 50),
                    ).length
                  }
                </strong>
              </div>
            </>
          )}
          <div>
            <span>{t("records")}</span>
            <strong>{rows.length}</strong>
          </div>
          {safeType === "payments" && (
            <div>
              <span>{t("Amount")}</span>
              <strong>
                <Money value={rows.reduce((n, r) => n + Number(r.amount), 0)} />
              </strong>
            </div>
          )}
          {safeType === "payroll" && (
            <div>
              <span>{t("Net salary")}</span>
              <strong>
                <Money value={rows.reduce((n, r) => n + netSalary(r), 0)} />
              </strong>
            </div>
          )}
          {safeType === "attendance" && (
            <div>
              <span>{t("Attendance percentage")}</span>
              <strong>
                {rows.length
                  ? Math.round(
                      (rows.filter((r) => r.status === "present").length /
                        rows.length) *
                        100,
                    )
                  : 0}
                %
              </strong>
            </div>
          )}
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {fields.map((f) => (
                  <th key={f}>
                    {t(
                      modules[safeType as Entity]?.fields.find(
                        (field) => field.key === f,
                      )?.label ||
                        (
                          {
                            student_id: "Student",
                            class_id: "Class",
                            date: "Date",
                            status: "Status",
                            net: "Net salary",
                            percentage: "Percentage",
                            grade: "Grade",
                            outcome: "Outcome",
                          } as Record<string, string>
                        )[f] ||
                        f,
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  {fields.map((f) => (
                    <td key={f}>{display(r, f)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <Empty />}
        </div>
      </section>
    </>
  );
}
export function Communications() {
  const { data, t, save, notify } = useApp();
  const [tab, setTab] = useState("messages"),
    [compose, setCompose] = useState(false),
    [template, setTemplate] = useState(""),
    [recipient, setRecipient] = useState<string[]>([]),
    [group, setGroup] = useState(""),
    [target, setTarget] = useState("student"),
    [channel, setChannel] = useState("WhatsApp"),
    [message, setMessage] = useState(""),
    [examDate, setExamDate] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <SectionTitle
        title="Communications"
        description="Keep your learning community connected."
        action={
          <button className="button" onClick={() => setCompose(true)}>
            <Plus size={17} />
            {t("Compose message")}
          </button>
        }
      />
      <div className="tabs">
        {["messages", "templates", "announcements"].map((k) => (
          <button
            key={k}
            className={tab === k ? "active" : ""}
            onClick={() => setTab(k)}
          >
            {t(
              k === "messages"
                ? "Communications"
                : k === "templates"
                  ? "Templates"
                  : "Announcements",
            )}
          </button>
        ))}
      </div>
      <section className="panel">
        <DataTable
          key={tab}
          entity={tab as Entity}
          onAdd={tab === "messages" ? () => setCompose(true) : undefined}
        />
      </section>
      {compose && (
        <Modal title={t("Compose message")} onClose={() => setCompose(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const recipients = group
                ? data.students.filter(
                    (s) =>
                      (group.startsWith("course:")
                        ? s.course_id === group.slice(7)
                        : group.startsWith("group:")
                          ? data.student_groups
                              .find((g) => g.id === group.slice(6))
                              ?.student_ids.includes(s.id)
                          : s.class_id === group) && s.status === "active",
                  )
                : target === "teacher"
                  ? data.teachers.filter((te) => recipient.includes(te.id))
                  : data.students.filter((s) => recipient.includes(s.id));
              if (!recipients.length) {
                notify("Select at least one recipient");
                return;
              }
              if (message.includes("{exam_date}") && !examDate) {
                notify("Fill in all template placeholders before saving.");
                return;
              }
              const drafts = recipients.map((person) => ({
                id: uid(),
                recipient:
                  target === "guardian" ? person.guardian_phone : person.phone,
                channel,
                message: expandTemplate(message, {
                  student_name: person.full_name,
                  teacher_name:
                    target === "teacher"
                      ? person.full_name
                      : label(
                          data.teachers.find(
                            (te) =>
                              te.id ===
                              data.classes.find((c) => c.id === person.class_id)
                                ?.teacher_id,
                          ),
                        ),
                  course_name: label(
                    data.courses.find((c) => c.id === person.course_id),
                  ),
                  balance: balanceFor(person.id, data),
                  amount: balanceFor(person.id, data),
                  exam_date: examDate,
                }),
              }));
              if (
                drafts.some(
                  (d) =>
                    !/^\+[1-9]\d{7,14}$/.test(
                      d.recipient?.replaceAll(" ", "") || "",
                    ),
                )
              ) {
                notify(
                  "Every recipient needs an international phone number, including +country code.",
                );
                return;
              }
              if (drafts.some((d) => /\{\w+\}/.test(d.message))) {
                notify("Fill in all template placeholders before saving.");
                return;
              }
              setBusy(true);
              try {
                for (const draft of drafts)
                  await save("messages", {
                    ...draft,
                    recipient: draft.recipient.replaceAll(" ", ""),
                  });
                notify(
                  `${drafts.length} ${t("Saved successfully")}. ${t("Use the send action to submit each draft.")}`,
                );
                setCompose(false);
              } catch (err: any) {
                notify(err.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="form-body form-grid">
              <label className="field full">
                <span>{t("Template")}</span>
                <select
                  value={template}
                  onChange={(e) => {
                    setTemplate(e.target.value);
                    const template = data.templates.find(
                      (tp) => tp.id === e.target.value,
                    );
                    if (template) {
                      setMessage(template.message);
                      setChannel(template.channel);
                    }
                  }}
                >
                  <option value="">{t("Select…")}</option>
                  {data.templates.map((tp) => (
                    <option value={tp.id} key={tp.id}>
                      {tp.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("Audience")}</span>
                <select
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setRecipient([]);
                    setGroup("");
                  }}
                >
                  <option value="student">{t("Students")}</option>
                  <option value="guardian">{t("Guardian phone")}</option>
                  <option value="teacher">{t("Teachers")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("Channel")}</span>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                >
                  <option>WhatsApp</option>
                  <option>SMS</option>
                </select>
              </label>
              <label className="field full">
                <span>{t("Recipient")}</span>
                <select
                  multiple
                  size={5}
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(
                      Array.from(
                        e.target.selectedOptions,
                        (option) => option.value,
                      ),
                    );
                    setGroup("");
                  }}
                >
                  {(target === "teacher" ? data.teachers : data.students).map(
                    (p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                      </option>
                    ),
                  )}
                </select>
              </label>
              {target !== "teacher" && (
                <label className="field full">
                  <span>{t("Group")}</span>
                  <select
                    value={group}
                    onChange={(e) => {
                      setGroup(e.target.value);
                      setRecipient([]);
                    }}
                  >
                    <option value="">{t("Select…")}</option>
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    {data.courses.map((c) => (
                      <option key={c.id} value={"course:" + c.id}>
                        {t("Course")}: {t(c.name)}
                      </option>
                    ))}
                    {data.student_groups
                      .filter((g) => g.status === "active")
                      .map((g) => (
                        <option key={g.id} value={"group:" + g.id}>
                          {t("Group")}: {g.name}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              <label className="field full">
                <span>{t("Date")}</span>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                />
              </label>
              <label className="field full">
                <span>{t("Message")}</span>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <small>
                  {
                    "{student_name} · {course_name} · {teacher_name} · {amount} · {balance} · {exam_date}"
                  }
                </small>
              </label>
              <div className="info-box full">
                {t(
                  "Messages are saved as drafts. Sending requires a configured provider.",
                )}
              </div>
            </div>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setCompose(false)}
              >
                {t("Cancel")}
              </button>
              <button className="button" disabled={busy}>
                <Check size={16} />
                {t("Save")}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </>
  );
}
