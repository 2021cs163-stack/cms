import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const db = new PGlite();
const admin = "00000000-0000-4000-8000-000000000001",
  teacher = "00000000-0000-4000-8000-000000000002",
  other = "00000000-0000-4000-8000-000000000003";
const course = "10000000-0000-4000-8000-000000000001",
  course2 = "10000000-0000-4000-8000-000000000002",
  cls = "20000000-0000-4000-8000-000000000001",
  cls2 = "20000000-0000-4000-8000-000000000002",
  student = "30000000-0000-4000-8000-000000000001",
  student2 = "30000000-0000-4000-8000-000000000002",
  subject = "40000000-0000-4000-8000-000000000001",
  exam = "50000000-0000-4000-8000-000000000001";
async function asUser(id: string) {
  await db.exec(
    `reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;create table auth.users(id uuid primary key,email text,encrypted_password text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key,name text,bucket_id text);alter table storage.objects enable row level security;create function storage.foldername(name text) returns text[] language sql as $$select string_to_array(name,'/')$$;`,
  );
  const sql = readFileSync(
    new URL("../supabase/all-migrations.sql", import.meta.url),
    "utf8",
  ).replace("create extension if not exists pgcrypto;", "");
  await db.exec(sql);
  await db.exec(
    `insert into auth.users values('${admin}','admin@test.af','hash1'),('${teacher}','teacher@test.af','hash2'),('${other}','other@test.af','hash3');insert into profiles(id,full_name,email,role,must_change_password) values('${admin}','Admin User','admin@test.af','admin',false);`,
  );
  const base = {
    full_name: "Ahmad Khan",
    father_name: "Mohammad",
    dob: "1990-01-01",
    gender: "male",
    phone: "+93700123456",
    address: "Kabul",
    qualification: "Bachelor",
    specialization: "English",
    joining_date: "2026-01-01",
    salary_type: "monthly",
    salary: 18000,
    status: "active",
    can_announce: true,
  };
  await db.query("select register_teacher($1,$2,$3)", [
    teacher,
    "teacher@test.af",
    base,
  ]);
  await db.query("select register_teacher($1,$2,$3)", [
    other,
    "other@test.af",
    { ...base, full_name: "Other Teacher" },
  ]);
  await db.exec(
    `update profiles set must_change_password=false;insert into courses(id,name,duration,fee,teacher_id) values('${course}','English','6 months',3000,'${teacher}'),('${course2}','Math','4 months',2000,'${other}');insert into classes(id,name,course_id,teacher_id,room,start_date,end_date,days,start_time,end_time,capacity) values('${cls}','English A','${course}','${teacher}','1','2026-01-01','2026-12-31',array['Mon'],'09:00','10:00',2),('${cls2}','Math A','${course2}','${other}','2','2026-01-01','2026-12-31',array['Mon'],'11:00','12:00',20);insert into students(id,student_code,full_name,father_name,gender,phone,course_id,class_id,enrollment_date) values('${student}','S001','Student One','Father','female','+93700123456','${course}','${cls}','2026-01-01'),('${student2}','S002','Student Two','Father','male','+93700123457','${course2}','${cls2}','2026-01-01');insert into subjects(id,name,course_id) values('${subject}','Grammar','${course}');insert into exams(id,name,class_id,subject_id,date,max_marks,passing_marks) values('${exam}','Midterm','${cls}','${subject}','2026-09-01',100,50);insert into payroll(teacher_id,month,base_salary) values('${teacher}','2026-09',18000),('${other}','2026-09',19000);insert into certificates(number,student_id,course_id,completion_date,issued_date,signature) values('AZ-2026-VERIFY','${student}','${course}','2026-09-01','2026-09-02','Administrator');`,
  );
}, 60000);
afterAll(async () => await db.close());
describe("PostgreSQL migration and security policies", () => {
  it("updates teacher accounts atomically and rejects nonexistent assignments", async () => {
    await db.exec("reset role");
    const found = await db.query<{ teacher_data: Record<string, unknown> }>(
      "select to_jsonb(t) as teacher_data from teachers t where id=$1",
      [teacher],
    );
    const record = {
      ...found.rows[0].teacher_data,
      class_ids: [cls],
      course_ids: [course],
    };
    await db.query("select admin_update_teacher($1,$2)", [teacher, record]);
    await expect(
      db.query("select admin_update_teacher($1,$2)", [
        teacher,
        { ...record, class_ids: ["00000000-0000-4000-8000-000000000099"] },
      ]),
    ).rejects.toThrow(/Assigned class does not exist/);
    await expect(
      db.query("select admin_update_teacher($1,$2)", [
        teacher,
        { ...record, class_ids: [], full_name: "Must not be saved" },
      ]),
    ).rejects.toThrow(/Reassign classes/);
    expect(
      (await db.query("select full_name from teachers where id=$1", [teacher]))
        .rows[0].full_name,
    ).toBe(record.full_name);
    await db.query("select admin_update_teacher($1,$2)", [
      teacher,
      { ...record, course_ids: [] },
    ]);
    expect(
      (await db.query("select teacher_id from courses where id=$1", [course]))
        .rows[0].teacher_id,
    ).toBeNull();
    await db.query("select admin_update_teacher($1,$2)", [teacher, record]);
  });
  it("validates student groups and isolates their membership", async () => {
    await asUser(admin);
    await expect(
      db.exec(
        `insert into student_groups(name,class_id,student_ids) values('Invalid group','${cls}',array['${student2}']::uuid[])`,
      ),
    ).rejects.toThrow(/selected class/);
    await db.exec(
      `insert into student_groups(name,class_id,student_ids) values('Study circle','${cls}',array['${student}']::uuid[])`,
    );
    await asUser(teacher);
    expect((await db.query("select * from student_groups")).rows).toHaveLength(
      1,
    );
    await asUser(other);
    expect((await db.query("select * from student_groups")).rows).toHaveLength(
      0,
    );
  });
  it("makes certificate templates readable but not writable to teachers", async () => {
    await asUser(teacher);
    expect(
      (await db.query("select * from certificate_templates")).rows,
    ).toHaveLength(2);
    await expect(
      db.exec(
        `insert into certificate_templates(name,heading,signature) values('Unauthorized','Certificate','Teacher')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("validates grading threshold uniqueness", async () => {
    await asUser(admin);
    await expect(
      db.exec(
        `update settings set value=jsonb_set(value,'{grades}','{"A":50,"B":50,"F":0}') where id='institution'`,
      ),
    ).rejects.toThrow(/unique/);
  });
  it("limits teachers to their students, classes, profile and payroll", async () => {
    await asUser(teacher);
    for (const table of ["students", "classes", "teachers", "payroll"]) {
      const r = await db.query(`select * from ${table}`);
      expect(r.rows.length, table).toBe(1);
    }
    expect((await db.query("select * from students")).rows[0]).toHaveProperty(
      "id",
      student,
    );
  });
  it("hides finances and prevents role escalation", async () => {
    await asUser(teacher);
    expect((await db.query("select * from fees")).rows.length).toBe(0);
    expect((await db.query("select * from payments")).rows.length).toBe(0);
    await db.exec(`update profiles set role='admin' where id='${teacher}';`);
    expect(
      (await db.query("select role from profiles")).rows[0],
    ).toHaveProperty("role", "teacher");
    await expect(
      db.query("select require_password_change($1)", [other]),
    ).rejects.toThrow(/permission denied/);
  });
  it("allows assigned attendance and rejects other classes", async () => {
    await asUser(teacher);
    await db.exec(
      `insert into attendance(student_id,class_id,date,status) values('${student}','${cls}',current_date,'present');`,
    );
    await expect(
      db.exec(
        `insert into attendance(student_id,class_id,date,status) values('${student2}','${cls2}',current_date,'present')`,
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("rejects invalid marks and mismatched enrollment at the database boundary", async () => {
    await asUser(admin);
    await expect(
      db.exec(
        `insert into results(student_id,exam_id,marks) values('${student}','${exam}',101)`,
      ),
    ).rejects.toThrow(/maximum marks/);
    await expect(
      db.exec(
        `insert into results(student_id,exam_id,marks) values('${student2}','${exam}',60)`,
      ),
    ).rejects.toThrow(/exam class/);
  });
  it("allows a teacher to record valid results", async () => {
    await asUser(teacher);
    await db.exec(
      `insert into results(student_id,exam_id,marks) values('${student}','${exam}',88)`,
    );
    expect(
      (await db.query("select marks from results")).rows[0],
    ).toHaveProperty("marks", "88.00");
  });
  it("enforces total fees and prevents reducing fees below paid amount", async () => {
    await asUser(admin);
    await db.exec(
      `insert into payments(receipt_number,student_id,amount,date,received_by) values('RC-1','${student}',2000,current_date,'Admin');`,
    );
    await expect(
      db.exec(
        `insert into payments(receipt_number,student_id,amount,date,received_by) values('RC-2','${student}',1001,current_date,'Admin')`,
      ),
    ).rejects.toThrow(/remaining balance/);
    await expect(
      db.exec(`update fees set total=1999 where student_id='${student}'`),
    ).rejects.toThrow(/less than received/);
    await expect(
      db.exec(`delete from fees where student_id='${student}'`),
    ).rejects.toThrow(/received payments/);
  });
  it("makes audit records immutable to administrators", async () => {
    await asUser(admin);
    const count = (await db.query("select * from activity")).rows.length;
    expect(count).toBeGreaterThan(0);
    await db.exec("delete from activity");
    expect((await db.query("select * from activity")).rows.length).toBe(count);
  });
  it("restricts announcement scope for teachers", async () => {
    await asUser(teacher);
    await expect(
      db.exec(
        `insert into announcements(title,message,audience,date) values('Global','Unauthorized','all',current_date)`,
      ),
    ).rejects.toThrow(/row-level security/);
    await db.exec(
      `insert into announcements(title,message,audience,class_id,date) values('My class','Study chapter 2','all','${cls}',current_date)`,
    );
  });
  it("only exposes verification fields to an anonymous caller", async () => {
    await db.exec("reset role;set role anon");
    const result = await db.query(
      `select * from verify_certificate('AZ-2026-VERIFY')`,
    );
    expect(result.rows[0]).toEqual({
      number: "AZ-2026-VERIFY",
      student_name: "Student One",
      course_name: "English",
      completion_date: new Date("2026-09-01T00:00:00Z"),
      institution_name: "Aminzi Academy",
    });
    await expect(db.query("select * from students")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("lets teachers read their class announcements for student groups", async () => {
    await asUser(teacher);
    await db.exec(`insert into announcements(title,message,audience,class_id,date)
      values('Class group notice','Read chapter three','students_group','${cls}',current_date)`);
    expect(
      (
        await db.query(
          "select * from announcements where title='Class group notice'",
        )
      ).rows,
    ).toHaveLength(1);
    await asUser(other);
    expect(
      (
        await db.query(
          "select * from announcements where title='Class group notice'",
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("prevents reducing class capacity below enrollment and future attendance", async () => {
    await asUser(admin);
    await expect(
      db.exec(`update classes set capacity=0 where id='${cls}'`),
    ).rejects.toThrow();
    await expect(
      db.exec(
        `insert into attendance(student_id,class_id,date,status) values('${student}','${cls}',current_date+1,'present')`,
      ),
    ).rejects.toThrow();
    await expect(
      db.exec(`update exams set max_marks=50 where id='${exam}'`),
    ).rejects.toThrow(/maximum marks/);
  });
  it("keeps message sending state server-controlled", async () => {
    await asUser(admin);
    await expect(
      db.exec(
        "insert into messages(recipient,channel,message,status) values('+12025550111','SMS','Test','sent')",
      ),
    ).rejects.toThrow(/row-level security/);
    await db.exec(
      "insert into messages(recipient,channel,message,status) values('+12025550111','SMS','Test draft','draft')",
    );
    await expect(db.exec("update messages set status='sent'")).rejects.toThrow(
      /row-level security/,
    );
  });
  it("blocks disabled accounts even with a valid identity", async () => {
    await db.exec(
      `reset role;update profiles set status='inactive' where id='${other}';`,
    );
    await asUser(other);
    expect((await db.query("select * from students")).rows).toHaveLength(0);
    expect((await db.query("select * from payroll")).rows).toHaveLength(0);
  });
  it("requires a real auth password hash change before clearing reset status", async () => {
    await db.exec(`reset role;select require_password_change('${teacher}');`);
    await asUser(teacher);
    expect((await db.query("select * from students")).rows).toHaveLength(0);
    await expect(db.query("select complete_password_change()")).rejects.toThrow(
      /temporary password first/,
    );
    await db.exec(
      `reset role;update auth.users set encrypted_password='new-hash' where id='${teacher}';`,
    );
    await asUser(teacher);
    await db.query("select complete_password_change()");
    expect((await db.query("select * from students")).rows).toHaveLength(1);
  });
});
