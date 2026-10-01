import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Users,
  BookOpen,
  GraduationCap,
  Wallet,
  TrendingUp,
  Clock3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  MoreHorizontal,
  Sparkles,
  Monitor,
  Code2,
  Languages,
  Sigma,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useApp } from "./store";
import { Avatar, Badge, Money, RecordForm } from "./components";
import { today, label, netSalary } from "./model";
import type { Entity, Row } from "./model";
const illustrations = [Languages, Monitor, Code2, Sigma];
export function CourseCard({
  course,
  index = 0,
  onClick,
}: {
  course: Row;
  index?: number;
  onClick: () => void;
}) {
  const { data, t } = useApp();
  const Icon = illustrations[index % 4];
  const students = data.students.filter(
    (s) => s.course_id === course.id && s.status === "active",
  ).length;
  const capacity = data.classes
    .filter((c) => c.course_id === course.id)
    .reduce((n, c) => n + c.capacity, 0);
  return (
    <button className={"course-card " + course.color} onClick={onClick}>
      <div className="course-top">
        <div className="course-art">
          <Icon size={34} strokeWidth={1.5} />
          <span className="art-dot" />
          <span className="art-square" />
          <Sparkles className="art-sparkle" size={16} />
        </div>
        <div className="course-enrolled">
          <b>{students}</b>
          <span>{t("Enrolled")}</span>
        </div>
      </div>
      <h3>{t(course.name)}</h3>
      <p>{t(course.description)}</p>
      <div className="course-bottom">
        <span>{t(course.duration)}</span>
        <ArrowUpRight size={20} />
      </div>
      <div className="course-progress">
        <span
          style={{
            width: Math.min(100, (students / (capacity || 1)) * 100) + "%",
          }}
        />
      </div>
    </button>
  );
}
export default function Dashboard() {
  const { data, user, t, settings, language } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState<Entity | null>(null),
    [weekOffset, setWeekOffset] = useState(0);
  const admin = user?.role === "admin";
  const day = today(),
    month = day.slice(0, 7);
  const payments = data.payments.filter((p) => p.date.startsWith(month));
  const revenue = payments.reduce((s, p) => s + Number(p.amount), 0);
  const attendance = data.attendance.filter((a) => a.date === day);
  const att = attendance.length
    ? Math.round(
        (attendance.filter((a) => a.status === "present").length /
          attendance.length) *
          100,
      )
    : 0;
  const outstanding =
    data.fees.reduce((s, f) => s + Number(f.total), 0) -
    data.payments.reduce((s, p) => s + Number(p.amount), 0);
  const stats = admin
    ? [
        {
          label: "Total students",
          value: data.students.length,
          icon: Users,
          color: "blue",
          sub: `${data.students.filter((s) => s.status === "active").length} ${t("Active students")}`,
          to: "/students",
        },
        {
          label: "Active courses",
          value: data.courses.filter((c) => c.status === "active").length,
          icon: BookOpen,
          color: "purple",
          sub: `${data.classes.length} ${t("Classes")}`,
          to: "/courses",
        },
        {
          label: "Monthly revenue",
          value: revenue,
          icon: Wallet,
          color: "green",
          sub: `${payments.length} ${t("Recent payments")}`,
          to: "/payments",
          money: true,
        },
        {
          label: "Today’s attendance",
          value: att + "%",
          icon: CheckCircle2,
          color: "orange",
          sub: `${attendance.filter((a) => a.status === "present").length} ${t("Present")}`,
          to: "/attendance",
        },
      ]
    : [
        {
          label: "Classes",
          value: data.classes.length,
          icon: BookOpen,
          color: "blue",
          sub: t("Assigned classes"),
          to: "/classes",
        },
        {
          label: "Total students",
          value: data.students.length,
          icon: Users,
          color: "purple",
          sub: t("Enrolled"),
          to: "/students",
        },
        {
          label: "Today’s attendance",
          value: att + "%",
          icon: CheckCircle2,
          color: "green",
          sub: t("Take attendance"),
          to: "/attendance",
        },
        {
          label: "Upcoming exams",
          value: data.exams.filter((e) => e.date >= day).length,
          icon: GraduationCap,
          color: "orange",
          sub: t("Examinations"),
          to: "/exams",
        },
      ];
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5 + i);
    const m = d.toISOString().slice(0, 7);
    return {
      name: d.toLocaleDateString(language === "en" ? "en-US" : "fa-AF", {
        month: "short",
      }),
      revenue: data.payments
        .filter((p) => p.date.startsWith(m))
        .reduce((n, p) => n + Number(p.amount), 0),
    };
  });
  const start = new Date();
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) + weekOffset * 7);
  const week = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <>
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">{t("Your academy, at a glance.")}</div>
          <h1>
            {t("Welcome back")}, {user?.full_name?.split(" ")[0]}{" "}
            <span className="wave">✦</span>
          </h1>
          <p>
            {t(
              admin
                ? "Here’s what’s happening at your academy today."
                : "Your teaching, in focus.",
            )}
          </p>
        </div>
        <div className="date-pill">
          <CalendarDays size={17} />
          {new Date().toLocaleDateString(
            language === "en" ? "en-GB" : language === "fa" ? "fa-AF" : "ps-AF",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        </div>
      </div>
      <div className="stats-grid">
        {stats.map((stat) => (
          <Link className="stat-card" to={stat.to} key={stat.label}>
            <div className="stat-top">
              <span className={"stat-icon " + stat.color}>
                <stat.icon size={21} />
              </span>
              <ArrowUpRight size={16} className="muted" />
            </div>
            <p>{t(stat.label)}</p>
            <h2>
              {stat.money ? <Money value={Number(stat.value)} /> : stat.value}
            </h2>
            <span className="stat-sub">{stat.sub}</span>
          </Link>
        ))}
      </div>
      <div className="dashboard-columns">
        <section className="course-panel">
          <div className="panel-heading">
            <div>
              <h2>{t("Course activity")}</h2>
              <p>{t("Learning starts here.")}</p>
            </div>
            {admin && (
              <button
                className="square-add"
                title={t("New course")}
                onClick={() => setForm("courses")}
              >
                <Plus size={20} />
              </button>
            )}
          </div>
          <div className="course-panel-label">
            <span>{t("Active courses")}</span>
            <Link to="/courses">
              {t("View all")} <ArrowRight size={14} />
            </Link>
          </div>
          <div className="dashboard-course-list">
            {data.courses
              .filter((c) => c.status === "active")
              .slice(0, 4)
              .map((course, i) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  index={i}
                  onClick={() => navigate("/courses?course=" + course.id)}
                />
              ))}
          </div>
          <Link to="/courses" className="all-courses">
            {t("All courses")} <ArrowRight size={16} />
          </Link>
        </section>
        <div className="dashboard-main">
          <div className="overview-two">
            <section className="panel learning-panel">
              <div className="panel-heading">
                <h2>{t("Learning overview")}</h2>
                <Link to="/reports" title={t("Reports")}>
                  <MoreHorizontal size={20} />
                </Link>
              </div>
              {data.courses.slice(0, 3).map((course, i) => {
                const enrolled = data.students.filter(
                  (s) => s.course_id === course.id,
                );
                const a = data.attendance.filter((a) =>
                  enrolled.some((s) => s.id === a.student_id),
                );
                const pct = a.length
                  ? Math.round(
                      (a.filter((r) => r.status === "present").length /
                        a.length) *
                        100,
                    )
                  : 0;
                const Icon = illustrations[i];
                return (
                  <Link
                    to="/attendance"
                    className="learning-item"
                    key={course.id}
                  >
                    <span className={"learning-icon " + course.color}>
                      <Icon size={21} />
                    </span>
                    <div>
                      <strong>{t(course.name)}</strong>
                      <small>
                        {enrolled.length} {t("students")} · {t("Attendance")}
                      </small>
                    </div>
                    <div
                      className={"progress-ring " + course.color}
                      style={{
                        background: `conic-gradient(var(--ring-color) ${pct * 3.6}deg, #f2f3f8 0deg)`,
                      }}
                    >
                      <span>
                        {pct}
                        <small>%</small>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </section>
            <section className="panel quick-panel">
              <div className="panel-heading">
                <h2>{t("Quick actions")}</h2>
                <Sparkles size={17} />
              </div>
              <div className="quick-actions">
                {(admin
                  ? [
                      {
                        text: "Register student",
                        icon: Users,
                        entity: "students",
                      },
                      {
                        text: "Record payment",
                        icon: Wallet,
                        entity: "payments",
                      },
                      {
                        text: "Issue certificate",
                        icon: GraduationCap,
                        entity: "certificates",
                      },
                    ]
                  : [
                      {
                        text: "Enter results",
                        icon: GraduationCap,
                        entity: "results",
                      },
                    ]
                ).map((a) => (
                  <button
                    key={a.text}
                    onClick={() => setForm(a.entity as Entity)}
                  >
                    <a.icon size={17} />
                    {t(a.text)}
                    <Plus size={15} />
                  </button>
                ))}
                <Link to="/attendance">
                  <CheckCircle2 size={17} />
                  {t("Take attendance")}
                  <ArrowUpRight size={15} />
                </Link>
              </div>
            </section>
          </div>
          <section className="panel schedule-panel">
            <div className="panel-heading">
              <div>
                <h2>{t("Weekly schedule")}</h2>
                <p>{t("Schedule & classes")}</p>
              </div>
              <Link className="text-link" to="/schedule">
                {t("View schedule")} <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="schedule-controls">
              <button
                className={"schedule-tab " + (!weekOffset ? "selected" : "")}
                onClick={() => setWeekOffset(0)}
              >
                {t("This week")}
              </button>
              <span>
                {week[0].toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}{" "}
                –{" "}
                {week[5].toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })}
              </span>
              <div>
                <button
                  className="icon-button"
                  aria-label={t("Previous")}
                  onClick={() => setWeekOffset(weekOffset - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t("Next")}
                  onClick={() => setWeekOffset(weekOffset + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
            <div className="calendar-grid">
              <div className="time-labels">
                <span />
                <span>09:00</span>
                <span>11:00</span>
                <span>14:00</span>
                <span>16:00</span>
              </div>
              {week.map((date) => {
                const name = date.toLocaleDateString("en-US", {
                    weekday: "short",
                  }),
                  iso = date.toISOString().slice(0, 10);
                return (
                  <div
                    className={
                      "calendar-day " + (iso === day ? "is-today" : "")
                    }
                    key={iso}
                  >
                    <div className="day-heading">
                      <span>{t(name)}</span>
                      <b>{date.getDate()}</b>
                    </div>
                    {["09", "11", "14", "16"].map((hour) => {
                      const cls = data.classes.find(
                        (c) =>
                          c.days.includes(name) &&
                          c.start_time.startsWith(hour) &&
                          c.start_date <= iso &&
                          c.end_date >= iso,
                      );
                      const course = data.courses.find(
                        (c) => c.id === cls?.course_id,
                      );
                      return (
                        <div className="calendar-slot" key={hour}>
                          {cls && (
                            <Link
                              to="/schedule"
                              className={"schedule-event " + course?.color}
                            >
                              <strong>{t(course?.name || "")}</strong>
                              <span>
                                {cls.start_time} · {cls.room}
                              </span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </section>
          <section className="panel chart-panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {t(admin ? "Revenue overview" : "Enrollment by course")}
                </h2>
                <p>{admin ? settings.currency : t("Students")}</p>
              </div>
              <span className="chart-legend">
                <i />
                {t(admin ? "Monthly revenue" : "Enrolled")}
              </span>
            </div>
            <div className="chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={
                    admin
                      ? chartData
                      : data.courses.map((c) => ({
                          name: t(c.name),
                          revenue: data.students.filter(
                            (s) => s.course_id === c.id,
                          ).length,
                        }))
                  }
                  margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="revenue-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#0876ff"
                        stopOpacity={0.18}
                      />
                      <stop offset="100%" stopColor="#0876ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    vertical={false}
                    stroke="#edf0f7"
                    strokeDasharray="4 4"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#9399ad" }}
                    dy={8}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: "#9399ad" }}
                  />
                  <Tooltip
                    contentStyle={{
                      border: "1px solid #eef0f6",
                      borderRadius: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name={t(admin ? "Monthly revenue" : "Enrolled")}
                    stroke="#0876ff"
                    strokeWidth={3}
                    fill="url(#revenue-fill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>
      <div className="dashboard-bottom">
        <section className="panel recent-panel">
          <div className="panel-heading">
            <h2>{t(admin ? "Recent payments" : "Recent registrations")}</h2>
            <Link className="text-link" to={admin ? "/payments" : "/students"}>
              {t("View all")} <ArrowRight size={15} />
            </Link>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{t("Student")}</th>
                  <th>{t("Course")}</th>
                  <th>{t(admin ? "Amount" : "Enrollment date")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {(admin
                  ? [...data.payments]
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 4)
                  : data.students.slice(0, 4)
                ).map((row) => {
                  const student = admin
                    ? data.students.find((s) => s.id === row.student_id)
                    : row;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="person">
                          <Avatar name={label(student)} />
                          <div>
                            <strong>{label(student)}</strong>
                            <small>{student?.student_code}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {t(
                          label(
                            data.courses.find(
                              (c) => c.id === student?.course_id,
                            ),
                          ),
                        )}
                      </td>
                      <td>
                        {admin ? (
                          <Money value={row.amount} />
                        ) : (
                          row.enrollment_date
                        )}
                      </td>
                      <td>
                        <Badge value={admin ? "paid" : row.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel announcement-panel">
          <div className="panel-heading">
            <h2>{t("Announcements")}</h2>
            <Link to="/announcements" aria-label={t("View all")}>
              <ArrowUpRight size={18} />
            </Link>
          </div>
          {data.announcements.slice(0, 2).map((a, i) => (
            <div className="announcement" key={a.id}>
              <span className={"announcement-dot " + (i ? "purple" : "blue")} />
              <div>
                <h4>{a.title}</h4>
                <p>{a.message}</p>
                <small>
                  <Clock3 size={11} />
                  {a.date}
                </small>
              </div>
            </div>
          ))}
        </section>
      </div>
      {admin && (
        <div className="summary-strip">
          {[
            { label: "Total teachers", value: data.teachers.length },
            {
              label: "Outstanding fees",
              value: outstanding.toLocaleString() + " " + settings.currency,
            },
            {
              label: "Upcoming exams",
              value: data.exams.filter((e) => e.date >= day).length,
            },
            { label: "Certificates issued", value: data.certificates.length },
            {
              label: "Teacher payroll",
              value:
                data.payroll
                  .filter((p) => p.month === month)
                  .reduce((n, p) => n + netSalary(p), 0)
                  .toLocaleString() +
                " " +
                settings.currency,
            },
          ].map((s) => (
            <div key={s.label}>
              <span>{t(s.label)}</span>
              <b>{s.value}</b>
            </div>
          ))}
        </div>
      )}
      {form && <RecordForm entity={form} onClose={() => setForm(null)} />}
    </>
  );
}
