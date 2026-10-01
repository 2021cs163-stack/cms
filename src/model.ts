export type Row = { id: string; [key: string]: any };
export type Entity =
  | "students"
  | "teachers"
  | "courses"
  | "classes"
  | "subjects"
  | "attendance"
  | "exams"
  | "results"
  | "fees"
  | "payments"
  | "payroll"
  | "certificates"
  | "announcements"
  | "templates"
  | "messages"
  | "activity"
  | "student_groups"
  | "certificate_templates";
export type Data = Record<Entity, Row[]>;
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: string[];
  relation?: Entity;
  min?: number;
  max?: number;
};
export type Module = {
  title: string;
  singular: string;
  fields: Field[];
  columns: string[];
  admin?: boolean;
};
const field = (
  key: string,
  label: string,
  type = "text",
  required = false,
  extra: Partial<Field> = {},
): Field => ({ key, label, type, required, ...extra });
const relation = (
  key: string,
  label: string,
  entity: Entity,
  required = true,
) => field(key, label, "relation", required, { relation: entity });
const status = field("status", "Status", "select", true, {
  options: ["active", "inactive", "completed"],
});
export const modules: Partial<Record<Entity, Module>> = {
  student_groups: {
    title: "Student groups",
    singular: "Group",
    columns: ["name", "class_id", "student_ids", "status"],
    fields: [
      field("name", "Name", "text", true),
      relation("class_id", "Class", "classes"),
      field("student_ids", "Students", "multi", true, { relation: "students" }),
      field("description", "Description", "textarea"),
      field("status", "Status", "select", true, {
        options: ["active", "inactive"],
      }),
    ],
  },
  certificate_templates: {
    title: "Certificate templates",
    singular: "Certificate template",
    admin: true,
    columns: ["name", "heading", "signature", "accent", "status"],
    fields: [
      field("name", "Name", "text", true),
      field("heading", "Certificate heading", "text", true),
      field("description", "Description", "textarea"),
      field("signature", "Authorized signature", "text", true),
      field("accent", "Color", "select", true, {
        options: ["gold", "blue", "purple"],
      }),
      field("status", "Status", "select", true, {
        options: ["active", "inactive"],
      }),
    ],
  },
  students: {
    title: "Students",
    singular: "Student",
    columns: [
      "student_code",
      "full_name",
      "course_id",
      "class_id",
      "phone",
      "status",
    ],
    fields: [
      field("student_code", "Student ID", "text", true),
      field("full_name", "Full name", "text", true),
      field("father_name", "Father’s name", "text", true),
      field("mother_name", "Mother’s name"),
      field("dob", "Date of birth", "date"),
      field("gender", "Gender", "select", true, {
        options: ["male", "female"],
      }),
      field("phone", "Phone", "tel", true),
      field("guardian_phone", "Guardian phone", "tel"),
      field("email", "Email", "email"),
      field("address", "Address", "textarea"),
      field("photo", "Photo", "file"),
      relation("course_id", "Course", "courses"),
      relation("class_id", "Class", "classes"),
      field("enrollment_date", "Enrollment date", "date", true),
      status,
    ],
  },
  teachers: {
    title: "Teachers",
    singular: "Teacher",
    admin: true,
    columns: ["full_name", "email", "specialization", "phone", "status"],
    fields: [
      field("full_name", "Full name", "text", true),
      field("father_name", "Father’s name", "text", true),
      field("dob", "Date of birth", "date"),
      field("gender", "Gender", "select", true, {
        options: ["male", "female"],
      }),
      field("phone", "Phone", "tel", true),
      field("address", "Address", "textarea"),
      field("qualification", "Qualification", "text", true),
      field("specialization", "Specialization", "text", true),
      field("joining_date", "Joining date", "date", true),
      field("salary_type", "Salary type", "select", true, {
        options: ["monthly", "hourly", "per_class"],
      }),
      field("salary", "Base salary", "number", true, { min: 0 }),
      field("course_ids", "Assigned courses", "multi", false, {
        relation: "courses",
      }),
      field("class_ids", "Assigned classes", "multi", false, {
        relation: "classes",
      }),
      field("photo", "Photo", "file"),
      field("can_announce", "Allow class announcements", "checkbox"),
      field("status", "Status", "select", true, {
        options: ["active", "inactive"],
      }),
    ],
  },
  courses: {
    title: "Courses",
    singular: "Course",
    columns: ["name", "duration", "fee", "teacher_id", "status"],
    fields: [
      field("name", "Name", "text", true),
      field("description", "Description", "textarea"),
      field("duration", "Duration", "text", true),
      field("fee", "Course fee", "number", true, { min: 0 }),
      relation("teacher_id", "Teacher", "teachers", false),
      field("modules", "Modules", "textarea"),
      field("color", "Color", "select", true, {
        options: ["blue", "purple", "yellow", "coral"],
      }),
      status,
    ],
  },
  classes: {
    title: "Classes",
    singular: "Class",
    columns: [
      "name",
      "course_id",
      "teacher_id",
      "room",
      "start_time",
      "capacity",
    ],
    fields: [
      field("name", "Name", "text", true),
      relation("course_id", "Course", "courses"),
      relation("teacher_id", "Teacher", "teachers"),
      field("room", "Room", "text", true),
      field("start_date", "Start date", "date", true),
      field("end_date", "End date", "date", true),
      field("days", "Days", "days", true),
      field("start_time", "Start time", "time", true),
      field("end_time", "End time", "time", true),
      field("capacity", "Capacity", "number", true, { min: 1, max: 500 }),
      status,
    ],
  },
  subjects: {
    title: "Subjects",
    singular: "Subject",
    columns: ["name", "course_id", "description"],
    fields: [
      field("name", "Name", "text", true),
      relation("course_id", "Course", "courses"),
      field("description", "Description", "textarea"),
    ],
  },
  exams: {
    title: "Examinations",
    singular: "Exam",
    columns: [
      "name",
      "class_id",
      "subject_id",
      "date",
      "max_marks",
      "passing_marks",
    ],
    fields: [
      field("name", "Name", "text", true),
      relation("class_id", "Class", "classes"),
      relation("subject_id", "Subject", "subjects"),
      field("date", "Date", "date", true),
      field("max_marks", "Maximum marks", "number", true, { min: 1 }),
      field("passing_marks", "Passing marks", "number", true, { min: 0 }),
    ],
  },
  results: {
    title: "Results",
    singular: "Results",
    columns: [
      "student_id",
      "exam_id",
      "marks",
      "percentage",
      "grade",
      "outcome",
    ],
    fields: [
      relation("student_id", "Student", "students"),
      relation("exam_id", "Exam", "exams"),
      field("marks", "Marks", "number", true, { min: 0 }),
    ],
  },
  fees: {
    title: "Outstanding fees",
    singular: "Course fee",
    admin: true,
    columns: ["student_id", "total", "paid", "balance"],
    fields: [
      relation("student_id", "Student", "students"),
      field("total", "Total fee", "number", true, { min: 0 }),
    ],
  },
  payments: {
    title: "Fees & payments",
    singular: "Record payment",
    admin: true,
    columns: [
      "receipt_number",
      "student_id",
      "amount",
      "date",
      "method",
      "received_by",
    ],
    fields: [
      field("receipt_number", "Receipt number", "text", true),
      relation("student_id", "Student", "students"),
      field("amount", "Amount", "number", true, { min: 0.01 }),
      field("date", "Date", "date", true),
      field("method", "Payment method", "select", true, { options: ["Cash"] }),
      field("received_by", "Received by", "text", true),
      field("notes", "Notes", "textarea"),
    ],
  },
  payroll: {
    title: "Payroll",
    singular: "Generate payroll",
    columns: [
      "teacher_id",
      "month",
      "base_salary",
      "bonus",
      "deductions",
      "advances",
      "net",
      "status",
    ],
    fields: [
      relation("teacher_id", "Teacher", "teachers"),
      field("month", "Month", "month", true),
      field("base_salary", "Base salary", "number", true, { min: 0 }),
      field("bonus", "Bonus", "number", false, { min: 0 }),
      field("deductions", "Deductions", "number", false, { min: 0 }),
      field("advances", "Advances", "number", false, { min: 0 }),
      field("status", "Status", "select", true, {
        options: ["pending", "paid"],
      }),
      field("paid_on", "Paid on", "date"),
      field("notes", "Notes", "textarea"),
    ],
  },
  certificates: {
    title: "Certificates",
    singular: "Issue certificate",
    columns: [
      "number",
      "student_id",
      "course_id",
      "completion_date",
      "issued_date",
    ],
    fields: [
      field("number", "Certificate number", "text", true),
      relation(
        "template_id",
        "Certificate template",
        "certificate_templates",
        false,
      ),
      relation("student_id", "Student", "students"),
      relation("course_id", "Course", "courses"),
      field("completion_date", "Completion date", "date", true),
      field("issued_date", "Issued date", "date", true),
      field("signature", "Authorized signature", "text", true),
    ],
  },
  announcements: {
    title: "Announcements",
    singular: "Announcements",
    columns: ["title", "audience", "class_id", "date"],
    fields: [
      field("title", "Title", "text", true),
      field("message", "Message", "textarea", true),
      field("audience", "Audience", "select", true, {
        options: ["all", "teachers", "students_group"],
      }),
      relation("course_id", "Course", "courses", false),
      relation("class_id", "Class", "classes", false),
      field("date", "Date", "date", true),
    ],
  },
  templates: {
    title: "Templates",
    singular: "Template",
    admin: true,
    columns: ["name", "channel", "message"],
    fields: [
      field("name", "Name", "text", true),
      field("channel", "Channel", "select", true, {
        options: ["WhatsApp", "SMS"],
      }),
      field("message", "Message", "textarea", true),
    ],
  },
  messages: {
    title: "Communications",
    singular: "Compose message",
    admin: true,
    columns: ["recipient", "channel", "message", "status", "created_at"],
    fields: [
      field("recipient", "Recipient", "tel", true),
      field("channel", "Channel", "select", true, {
        options: ["WhatsApp", "SMS"],
      }),
      field("message", "Message", "textarea", true),
    ],
  },
  activity: {
    title: "Activity log",
    singular: "Activity log",
    admin: true,
    columns: ["created_at", "actor", "action", "resource", "record_id"],
    fields: [],
  },
};
export const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
export const uid = () => crypto.randomUUID();
export const label = (row: Row | undefined) =>
  row?.full_name || row?.name || row?.title || row?.number || "—";
export function grade(
  percentage: number,
  grades: Record<string, number> = {
    "A+": 90,
    A: 80,
    B: 70,
    C: 60,
    D: 50,
    F: 0,
  },
) {
  return (
    Object.entries(grades)
      .sort((a, b) => b[1] - a[1])
      .find(([, min]) => percentage >= min)?.[0] || "F"
  );
}
export function netSalary(row: Partial<Row>) {
  return (
    Number(row.base_salary || 0) +
    Number(row.bonus || 0) -
    Number(row.deductions || 0) -
    Number(row.advances || 0)
  );
}
export function balanceFor(studentId: string, data: Data) {
  return (
    data.fees
      .filter((f) => f.student_id === studentId)
      .reduce((n, f) => n + Number(f.total), 0) -
    data.payments
      .filter((p) => p.student_id === studentId)
      .reduce((n, p) => n + Number(p.amount), 0)
  );
}
export function attendancePercent(studentId: string, data: Data) {
  const rows = data.attendance.filter((a) => a.student_id === studentId);
  return rows.length
    ? Math.round(
        (rows.filter((a) => a.status === "present").length / rows.length) * 100,
      )
    : 0;
}
export function expandTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    values[key] === undefined ? match : String(values[key]),
  );
}
export function csv(
  rows: Row[],
  columns: string[],
  get: (row: Row, col: string) => unknown = (r, c) => r[c],
) {
  return (
    "\ufeff" +
    [columns, ...rows.map((r) => columns.map((c) => get(r, c)))]
      .map((row) =>
        row
          .map(
            (v) =>
              '"' +
              String(v ?? "")
                .replace(/^(?=\s*[=+@\-])|^(?=[\t\r\n])/, "'")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n")
  );
}
export function downloadCsv(name: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8;" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  URL.revokeObjectURL(url);
}
export function validate(
  entity: Entity,
  row: Row,
  data: Data,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (
    entity === "student_groups" &&
    (row.student_ids || []).some(
      (id: string) =>
        !data.students.some((s) => s.id === id && s.class_id === row.class_id),
    )
  )
    errors.student_ids = "Student must belong to the selected class";
  for (const f of modules[entity]?.fields || []) {
    const v = row[f.key];
    if (
      f.required &&
      (v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && !v.length))
    )
      errors[f.key] = "Required";
    if (v && f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      errors[f.key] = "Enter a valid email address";
    if (v && f.type === "tel" && !/^\+?[\d\s()-]{7,20}$/.test(v))
      errors[f.key] = "Enter a valid phone number";
    if (
      f.type === "number" &&
      v !== "" &&
      v !== undefined &&
      (!Number.isFinite(Number(v)) ||
        (f.min !== undefined && Number(v) < f.min) ||
        (f.max !== undefined && Number(v) > f.max))
    )
      errors[f.key] = `Value must be between ${f.min ?? 0} and ${f.max ?? "∞"}`;
    if (
      f.relation &&
      v &&
      f.type === "relation" &&
      !data[f.relation].some((r) => r.id === v)
    )
      errors[f.key] = "Select a valid record";
  }
  const unique: Partial<Record<Entity, string>> = {
    students: "student_code",
    teachers: "email",
    certificates: "number",
    payments: "receipt_number",
  };
  const u = unique[entity];
  if (
    u &&
    row[u] &&
    data[entity].some(
      (r) =>
        r.id !== row.id &&
        String(r[u]).toLowerCase() === String(row[u]).toLowerCase(),
    )
  )
    errors[u] = "This value already exists";
  if (row.dob && row.dob > today())
    errors.dob = "Date of birth cannot be in the future";
  if (entity === "classes") {
    if (row.end_date < row.start_date)
      errors.end_date = "End date must follow start date";
    if (row.end_time <= row.start_time)
      errors.end_time = "End time must follow start time";
    if (
      Number(row.capacity) <
      data.students.filter(
        (s) => s.class_id === row.id && s.status === "active",
      ).length
    )
      errors.capacity = "Capacity is below current enrollment";
  }
  if (entity === "students") {
    const cls = data.classes.find((c) => c.id === row.class_id);
    if (cls && cls.course_id !== row.course_id)
      errors.class_id = "Class must belong to the selected course";
    if (
      cls &&
      row.status === "active" &&
      data.students.filter(
        (s) =>
          s.class_id === cls.id && s.status === "active" && s.id !== row.id,
      ).length >= cls.capacity
    )
      errors.class_id = "This class is full";
  }
  if (entity === "exams") {
    if (Number(row.passing_marks) > Number(row.max_marks))
      errors.passing_marks = "Passing marks cannot exceed maximum marks";
    const cls = data.classes.find((c) => c.id === row.class_id);
    const sub = data.subjects.find((s) => s.id === row.subject_id);
    if (cls && sub && cls.course_id !== sub.course_id)
      errors.subject_id = "Subject must belong to the class course";
  }
  if (entity === "results") {
    const exam = data.exams.find((e) => e.id === row.exam_id);
    if (exam && Number(row.marks) > Number(exam.max_marks))
      errors.marks = "Marks exceed maximum marks";
    if (
      exam &&
      data.students.find((s) => s.id === row.student_id)?.class_id !==
        exam.class_id
    )
      errors.student_id = "Student must belong to the exam class";
    if (
      data.results.some(
        (r) =>
          r.id !== row.id &&
          r.student_id === row.student_id &&
          r.exam_id === row.exam_id,
      )
    )
      errors.student_id = "Results already exist for this student and exam";
  }
  if (entity === "payments") {
    const remaining =
      balanceFor(row.student_id, data) +
      Number(data.payments.find((p) => p.id === row.id)?.amount || 0);
    if (Number(row.amount) > remaining)
      errors.amount = "Payment exceeds remaining balance";
  }
  if (entity === "fees") {
    if (
      data.fees.some((f) => f.id !== row.id && f.student_id === row.student_id)
    )
      errors.student_id = "A fee record already exists for this student";
    if (
      Number(row.total) <
      data.payments
        .filter((p) => p.student_id === row.student_id)
        .reduce((n, p) => n + Number(p.amount), 0)
    )
      errors.total = "Total cannot be less than payments already received";
  }
  if (entity === "payroll") {
    if (netSalary(row) < 0) errors.deductions = "Net salary cannot be negative";
    if (
      data.payroll.some(
        (p) =>
          p.id !== row.id &&
          p.teacher_id === row.teacher_id &&
          p.month === row.month,
      )
    )
      errors.month = "Payroll already exists for this month";
    if (row.status === "paid" && !row.paid_on) errors.paid_on = "Required";
  }
  if (
    entity === "certificates" &&
    data.students.find((s) => s.id === row.student_id)?.course_id !==
      row.course_id
  )
    errors.course_id = "Course must match student enrollment";
  return errors;
}
