import { today, uid } from "./model";
import type { Data, Row } from "./model";
export const demoAdmin = {
  id: "demo-admin",
  full_name: "Amin Zai",
  email: "admin@aminzi.af",
  role: "admin",
  status: "active",
  must_change_password: false,
};
export const defaultSettings = {
  institution_name: "Aminzi Academy",
  address: "Kabul, Afghanistan",
  phone: "+93 700 123 456",
  email: "info@aminzi.af",
  website: "https://aminzi.af",
  currency: "AFN",
  academic_year: "2026",
  logo: "",
  certificate_heading: "Certificate of completion",
  signature: "Amin Zai",
  grades: { "A+": 90, A: 80, B: 70, C: 60, D: 50, F: 0 },
  whatsapp_provider: "twilio",
  sms_provider: "twilio",
};
export function createSeed(): Data {
  const teachers: Row[] = [
    ["Ahmad Khan", "English Language", "ahmad.khan"],
    ["Maryam Ahmadi", "Computer Science", "maryam.ahmadi"],
    ["Farid Safi", "Mathematics", "farid.safi"],
  ].map(([name, subject, email], i) => ({
    id: uid(),
    full_name: name,
    father_name: ["Mohammad Khan", "Abdul Rahman", "Wali Safi"][i],
    email: email + "@aminzi.af",
    phone: "+93 70" + (1234567 + i),
    qualification: "Bachelor’s degree",
    specialization: subject,
    joining_date: "2025-03-01",
    gender: i === 1 ? "female" : "male",
    salary_type: "monthly",
    salary: 18000 + i * 2000,
    status: "active",
    can_announce: true,
    address: "Kabul, Afghanistan",
    photo: "",
    dob: "1992-05-12",
  }));
  const courses: Row[] = [
    [
      "English Language",
      "Build confidence. Find your voice.",
      "6 months",
      500,
      "blue",
      0,
      "Speaking, Reading, Writing, Grammar",
    ],
    [
      "Computer Essentials",
      "Your first step into the digital world.",
      "3 months",
      750,
      "purple",
      1,
      "Windows, Word, Excel, PowerPoint",
    ],
    [
      "Web Development",
      "Turn your ideas into something real.",
      "6 months",
      1500,
      "yellow",
      1,
      "HTML, CSS, JavaScript, React",
    ],
    [
      "Mathematics",
      "Make every problem a possibility.",
      "4 months",
      600,
      "coral",
      2,
      "Algebra, Geometry, Statistics",
    ],
  ].map(([name, description, duration, fee, color, t, mods]) => ({
    id: uid(),
    name,
    description,
    duration,
    fee,
    color,
    teacher_id: teachers[Number(t)].id,
    modules: mods,
    status: "active",
  }));
  const now = new Date();
  const month = now.toISOString().slice(0, 7);
  const day = today();
  const classes: Row[] = courses.map((c, i) => ({
    id: uid(),
    name: [
      "English · Morning A",
      "Computer · Batch B",
      "Web · Afternoon A",
      "Math · Evening A",
    ][i],
    course_id: c.id,
    teacher_id: c.teacher_id,
    room: "Room 0" + (i + 1),
    start_date: month + "-01",
    end_date: new Date(now.getFullYear(), now.getMonth() + 6, 1)
      .toISOString()
      .slice(0, 10),
    days: ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"],
    start_time: ["09:00", "11:00", "14:00", "16:00"][i],
    end_time: ["10:30", "12:30", "15:30", "17:30"][i],
    capacity: [30, 25, 20, 30][i],
    status: "active",
  }));
  const names = [
    "Zahra Mohammadi",
    "Omar Ahmadi",
    "Fatima Rahimi",
    "Bilal Noori",
    "Ayesha Karimi",
    "Hamid Safi",
    "Mariam Habibi",
    "Yousuf Azizi",
    "Nadia Sultani",
    "Ali Hussaini",
    "Sana Wafa",
    "Khalid Wardak",
    "Laila Rahman",
    "Mustafa Akbari",
    "Zainab Niazi",
    "Faisal Popal",
    "Roya Amiri",
    "Jawad Shinwari",
    "Hadia Kamal",
    "Rashid Zadran",
    "Samira Ahmadzai",
    "Nasir Hotak",
    "Shabnam Noor",
    "Wahid Anwari",
    "Hana Rauf",
    "Zubair Kakar",
    "Nargis Sediqi",
    "Tariq Mangal",
    "Sara Naseri",
    "Ehsan Barak",
    "Amina Sherzad",
    "Arman Yousufi",
  ];
  const students: Row[] = names.map((full_name, i) => ({
    id: uid(),
    student_code: "AZ-" + String(2026001 + i),
    full_name,
    father_name: ["Mohammad", "Abdul Rahman", "Ahmad", "Habibullah"][i % 4],
    mother_name: "",
    dob: `200${i % 8}-0${(i % 9) + 1}-12`,
    gender: i % 2 ? "male" : "female",
    phone: "+93 79" + String(1234500 + i),
    guardian_phone: "+93 70" + String(2234500 + i),
    email: full_name.split(" ")[0].toLowerCase() + "@example.com",
    address: "Kabul, Afghanistan",
    photo: "",
    course_id: courses[i % 4].id,
    class_id: classes[i % 4].id,
    enrollment_date:
      month +
      "-" +
      String((i % Math.max(1, now.getDate())) + 1).padStart(2, "0"),
    status: i === 29 ? "inactive" : "active",
  }));
  const fees = students.map((s, i) => ({
    id: uid(),
    student_id: s.id,
    total: Number(courses[i % 4].fee) * 6,
  }));
  const payments = students
    .filter((_, i) => i % 5 !== 0)
    .map((s, i) => ({
      id: uid(),
      student_id: s.id,
      receipt_number: "RC-" + String(2026100 + i),
      amount:
        Number(courses.find((c) => c.id === s.course_id)!.fee) * ((i % 3) + 1),
      date:
        month +
        "-" +
        String((i % Math.max(1, now.getDate())) + 1).padStart(2, "0"),
      method: "Cash",
      received_by: "Amin Zai",
      notes: "",
    }));
  const attendance: Row[] = [];
  for (let d = 0; d < 10; d++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - d);
    for (let i = 0; i < students.length; i++) {
      if (students[i].status === "active")
        attendance.push({
          id: uid(),
          student_id: students[i].id,
          class_id: students[i].class_id,
          date: dt.toISOString().slice(0, 10),
          status:
            (i + d) % 12 === 0
              ? "absent"
              : (i + d) % 15 === 0
                ? "late"
                : "present",
        });
    }
  }
  const subjects = courses.map((c) => ({
    id: uid(),
    name: String(c.modules).split(",")[0],
    course_id: c.id,
    description: "",
  }));
  const exams = classes.map((c, i) => ({
    id: uid(),
    name: [
      "Midterm assessment",
      "Practical assessment",
      "Frontend project",
      "Monthly assessment",
    ][i],
    class_id: c.id,
    subject_id: subjects[i].id,
    date: new Date(now.getTime() + (i - 1) * 86400000 * 5)
      .toISOString()
      .slice(0, 10),
    max_marks: 100,
    passing_marks: 50,
  }));
  const results = students
    .filter((s) => s.class_id === classes[0].id)
    .map((s, i) => ({
      id: uid(),
      student_id: s.id,
      exam_id: exams[0].id,
      marks: 62 + ((i * 7) % 38),
    }));
  const payroll = teachers.map((t, i) => ({
    id: uid(),
    teacher_id: t.id,
    month,
    base_salary: t.salary,
    bonus: i === 0 ? 1500 : 0,
    deductions: 0,
    advances: 0,
    status: i === 0 ? "paid" : "pending",
    paid_on: i === 0 ? day : null,
    notes: "",
  }));
  const certificates = [
    {
      id: uid(),
      number: "AZ-2026-0001",
      student_id: students[0].id,
      course_id: courses[0].id,
      completion_date: day,
      issued_date: day,
      signature: "Amin Zai",
    },
  ];
  const announcements = [
    {
      id: uid(),
      title: "A new month of possibilities",
      message:
        "Welcome to the new academic month. Please review your class schedules and upcoming assessments.",
      audience: "all",
      class_id: null,
      course_id: null,
      date: day,
    },
    {
      id: uid(),
      title: "Teacher development workshop",
      message:
        "Join our collaborative teaching workshop this Thursday at 2:00 PM in the main hall.",
      audience: "teachers",
      class_id: null,
      course_id: null,
      date: day,
    },
  ];
  const templates = [
    {
      id: uid(),
      name: "Fee reminder",
      channel: "WhatsApp",
      message:
        "Dear {student_name}, your remaining course fee is {balance}. Please contact administration for payment.",
    },
    {
      id: uid(),
      name: "Exam notification",
      channel: "SMS",
      message:
        "Dear {student_name}, your {course_name} examination will take place on {exam_date}.",
    },
  ];
  return {
    student_groups: [
      {
        id: uid(),
        name: "English study circle",
        class_id: classes[0].id,
        student_ids: students
          .filter((s) => s.class_id === classes[0].id)
          .map((s) => s.id),
        description: "Collaborative practice and revision",
        status: "active",
      },
    ],
    certificate_templates: [
      {
        id: uid(),
        name: "Academy completion",
        heading: "Certificate of completion",
        description: "",
        signature: "Amin Zai",
        accent: "gold",
        status: "active",
      },
      {
        id: uid(),
        name: "Certificate of excellence",
        heading: "Certificate of excellence",
        description: "In recognition of outstanding academic achievement.",
        signature: "Amin Zai",
        accent: "blue",
        status: "active",
      },
    ],
    teachers,
    courses,
    classes,
    students,
    fees,
    payments,
    attendance,
    subjects,
    exams,
    results,
    payroll,
    certificates,
    announcements,
    templates,
    messages: [],
    activity: [
      {
        id: uid(),
        created_at: new Date().toISOString(),
        actor: "Amin Zai",
        action: "initialized",
        resource: "workspace",
        record_id: "demo",
      },
    ],
  };
}
