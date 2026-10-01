-- CMS mock data v1. Run this ENTIRE file in Supabase SQL Editor as postgres.
-- Requires migrations 001, 002 and 003 (or the complete installation bundle).
-- Adds 4 teacher logins, 24 students and related records for every data page.
-- Teacher password: admin123; a password change is required on first login.
-- All emails use example.com; all phone numbers are fictional test numbers.
-- No messages are sent. Existing accounts, settings and records are not updated.
-- Atomic and safe to rerun: a completion marker makes subsequent runs a no-op.
begin;
set local search_path = public, extensions;
set local timezone = 'Asia/Kabul';
select pg_advisory_xact_lock(620261001);

create or replace function pg_temp.cms_mock_id(n integer) returns uuid
language sql immutable as $$
  select ('d3a00000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid
$$;

do $seed$
declare
  i integer; j integer; class_no integer;
  teacher_uuid uuid; course_uuid uuid; class_uuid uuid; student_uuid uuid;
  teacher_email text; teacher_name text; course_name text; course_fee numeric;
  names text[] := array['Zahra Mohammadi','Omar Ahmadi','Fatima Rahimi','Bilal Noori',
    'Ayesha Karimi','Hamid Safi','Mariam Habibi','Yousuf Azizi','Nadia Sultani',
    'Ali Hussaini','Sana Wafa','Khalid Wardak','Laila Rahman','Mustafa Akbari',
    'Zainab Niazi','Faisal Popal','Roya Amiri','Jawad Shinwari','Hadia Kamal',
    'Rashid Zadran','Samira Ahmadzai','Nasir Hotak','Shabnam Noor','Wahid Anwari'];
begin
  if exists(select 1 from public.activity where id=pg_temp.cms_mock_id(999999)
      and actor='CMS Mock Seed v1' and resource='mock_seed') then
    raise notice 'Mock seed v1 already installed. Existing mock edits and passwords were preserved.';
    return;
  end if;
  if to_regclass('public.student_groups') is null
     or to_regclass('public.certificate_templates') is null
     or to_regprocedure('public.register_teacher(uuid,text,jsonb)') is null then
    raise exception 'Install the CMS database migrations before running the mock seed.';
  end if;

  for i in 1..4 loop
    teacher_uuid := pg_temp.cms_mock_id(1000+i);
    course_uuid := pg_temp.cms_mock_id(2000+i);
    class_uuid := pg_temp.cms_mock_id(3000+i);
    teacher_email := 'mock.teacher.' || i || '@example.com';
    teacher_name := (array['Mock Ahmad Khan','Mock Maryam Rahimi','Mock Farid Safi','Mock Laila Azizi'])[i];
    course_name := (array['Mock English Language','Mock Computer Essentials','Mock Python Programming','Mock Mathematics'])[i];
    course_fee := (array[3000,4500,6000,2400])[i];
    if exists(select 1 from auth.users where lower(email)=teacher_email or id=teacher_uuid) then
      raise exception 'Mock account % or its reserved ID already exists. No records were changed.',teacher_email;
    end if;

    -- Supabase email/password users need both the Auth user and email identity.
    insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
      confirmation_token,recovery_token,email_change_token_new,email_change,
      email_change_token_current,reauthentication_token,phone_change,phone_change_token)
    values('00000000-0000-0000-0000-000000000000',teacher_uuid,'authenticated','authenticated',
      teacher_email,crypt('admin123',gen_salt('bf',10)),now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name',teacher_name,'cms_mock_seed','v1'),now(),now(),
      '','','','','','','','');
    insert into auth.identities(id,user_id,provider_id,identity_data,provider,created_at,updated_at)
    values(pg_temp.cms_mock_id(9000+i),teacher_uuid,teacher_uuid::text,
      jsonb_build_object('sub',teacher_uuid::text,'email',teacher_email,'email_verified',true,'phone_verified',false),
      'email',now(),now());

    perform public.register_teacher(teacher_uuid,teacher_email,jsonb_build_object(
      'full_name',teacher_name,'father_name','Mock Mohammad','dob','1990-05-12',
      'gender',case when i in (2,4) then 'female' else 'male' end,
      'phone','+1202555010'||i,'address','Mock campus, Kabul',
      'qualification','Bachelor degree','specialization',course_name,
      'joining_date',current_date-90,'salary_type','monthly','salary',16000+i*2000,
      'photo','','status','active','can_announce',true,'class_ids','[]'::jsonb,'course_ids','[]'::jsonb));

    insert into public.courses(id,name,description,duration,fee,teacher_id,modules,color)
    values(course_uuid,course_name,'Mock training course for system testing.','3 months',course_fee,
      teacher_uuid,(array['Speaking, Reading, Grammar','Windows, Word, Excel','Python, Functions, Projects','Algebra, Geometry, Statistics'])[i],
      (array['blue','purple','yellow','coral'])[i]);
    insert into public.classes(id,name,course_id,teacher_id,room,start_date,end_date,days,start_time,end_time,capacity)
    values(class_uuid,'Mock Class '||i,course_uuid,teacher_uuid,'Mock Room '||i,
      current_date-30,current_date+60,array['Sat','Sun','Mon','Tue','Wed','Thu'],
      make_time(7+i*2,0,0),make_time(8+i*2,30,0),20);

    for j in 1..2 loop
      insert into public.subjects(id,name,course_id,description)
      values(pg_temp.cms_mock_id(5000+i*10+j),case when j=1 then 'Mock Fundamentals' else 'Mock Practical Skills' end,
        course_uuid,'Sample subject for '||course_name);
      insert into public.exams(id,name,class_id,subject_id,date,max_marks,passing_marks)
      values(pg_temp.cms_mock_id(6000+i*10+j),case when j=1 then 'Mock Midterm' else 'Mock Practical Exam' end,
        class_uuid,pg_temp.cms_mock_id(5000+i*10+j),current_date-case when j=1 then 7 else 2 end,100,50);
    end loop;

    for j in 0..1 loop
      insert into public.payroll(id,teacher_id,month,base_salary,bonus,deductions,advances,status,paid_on,notes)
      values(pg_temp.cms_mock_id(10000+i*10+j),teacher_uuid,
        to_char(current_date-make_interval(months=>j),'YYYY-MM'),16000+i*2000,500,100,0,
        case when j=1 then 'paid' else 'pending' end,
        case when j=1 then (date_trunc('month',current_date)-interval '1 day')::date else null end,
        'Mock payroll; no money was transferred.');
    end loop;
  end loop;

  insert into public.certificate_templates(id,name,heading,description,signature,accent)
  values(pg_temp.cms_mock_id(11001),'Mock Completion','Certificate of completion','Successfully completed the academy training program.','Mock Academy Director','gold'),
    (pg_temp.cms_mock_id(11002),'Mock Excellence','Certificate of excellence','In recognition of outstanding academic achievement.','Mock Academy Director','blue');

  for i in 1..24 loop
    class_no := ((i-1)/6)+1;
    student_uuid := pg_temp.cms_mock_id(4000+i);
    class_uuid := pg_temp.cms_mock_id(3000+class_no);
    course_uuid := pg_temp.cms_mock_id(2000+class_no);
    select fee into course_fee from public.courses where id=course_uuid;
    insert into public.students(id,student_code,full_name,father_name,dob,gender,phone,guardian_phone,email,address,
      course_id,class_id,enrollment_date,status)
    values(student_uuid,'MOCK-ST-'||lpad(i::text,3,'0'),'Mock '||names[i],'Mock Abdul Rahman',
      make_date(2000+i%8,1+i%12,12),case when i%2=0 then 'male' else 'female' end,
      '+120255501'||lpad((10+i)::text,2,'0'),'+12025550199','mock.student.'||i||'@example.com','Mock campus, Kabul',
      course_uuid,class_uuid,current_date-28,case when i%6=5 then 'completed' when i=24 then 'inactive' else 'active' end);
    -- The student-insert trigger creates the matching fee at the course price.
    if i%3<>0 then
      insert into public.payments(id,receipt_number,student_id,amount,date,received_by,notes)
      values(pg_temp.cms_mock_id(12000+i),'MOCK-RC-'||lpad(i::text,3,'0'),student_uuid,
        case when i%3=1 then course_fee else course_fee/2 end,current_date-(i%14),
        'Mock Cashier','Mock receipt; no money was collected.');
    end if;
    for j in 0..4 loop
      insert into public.attendance(id,student_id,class_id,date,status)
      values(pg_temp.cms_mock_id(13000+i*10+j),student_uuid,class_uuid,current_date-j-case when i%6=5 then 2 else 0 end,
        case when (i+j)%11=0 then 'absent' when (i+j)%7=0 then 'late' when (i+j)%13=0 then 'excused' else 'present' end);
    end loop;
    for j in 1..2 loop
      insert into public.results(id,student_id,exam_id,marks)
      values(pg_temp.cms_mock_id(14000+i*10+j),student_uuid,pg_temp.cms_mock_id(6000+class_no*10+j),
        case when i%6=5 then 95 else 35+(i*7+j*3)%61 end);
    end loop;
    if i%6=5 then
      insert into public.certificates(id,number,student_id,course_id,completion_date,issued_date,signature,template_id)
      values(pg_temp.cms_mock_id(15000+i),'MOCK-CERT-'||lpad(i::text,3,'0'),student_uuid,course_uuid,
        current_date-2,current_date,'Mock Academy Director',pg_temp.cms_mock_id(11001+(class_no%2)));
    end if;
  end loop;

  for i in 1..4 loop
    insert into public.student_groups(id,name,class_id,student_ids,description)
    values(pg_temp.cms_mock_id(16000+i),'Mock Study Group '||i,pg_temp.cms_mock_id(3000+i),
      array[pg_temp.cms_mock_id(4000+(i-1)*6+1),pg_temp.cms_mock_id(4000+(i-1)*6+2),pg_temp.cms_mock_id(4000+(i-1)*6+3)],
      'Sample group for attendance and communication testing.');
  end loop;

  insert into public.announcements(id,title,message,audience,course_id,class_id,date) values
    (pg_temp.cms_mock_id(17001),'Mock Welcome','Welcome to the mock academy workspace.','all',null,null,current_date),
    (pg_temp.cms_mock_id(17002),'Mock Teacher Meeting','Sample staff meeting at 3 PM.','teachers',null,null,current_date),
    (pg_temp.cms_mock_id(17003),'Mock English Study Session','Review the fundamentals before your next class.','students_group',pg_temp.cms_mock_id(2001),pg_temp.cms_mock_id(3001),current_date);
  insert into public.templates(id,name,channel,message) values
    (pg_temp.cms_mock_id(18001),'Mock Fee Reminder','SMS','Dear {student_name}, your balance is {balance}. This is a test draft.'),
    (pg_temp.cms_mock_id(18002),'Mock Exam Reminder','WhatsApp','Dear {student_name}, your exam is on {exam_date}. This is a test draft.');
  insert into public.messages(id,recipient,channel,message,status) values
    (pg_temp.cms_mock_id(19001),'+12025550111','SMS','Mock fee reminder. No message has been sent.','draft'),
    (pg_temp.cms_mock_id(19002),'+12025550112','WhatsApp','Mock class update. No message has been sent.','draft'),
    (pg_temp.cms_mock_id(19003),'+12025550113','SMS','Mock exam reminder. No message has been sent.','draft');

  -- Existing institution settings/profile remain intact. Dashboard, reports and activity
  -- derive their data from the records above and the normal audit triggers.
  insert into public.activity(id,actor,action,resource,record_id)
  values(pg_temp.cms_mock_id(999999),'CMS Mock Seed v1','installed mock data','mock_seed','v1');
end
$seed$;
commit;

-- Result grid: the four seeded teacher accounts (initial password admin123).
select email,full_name,status,must_change_password from public.profiles
where id in (pg_temp.cms_mock_id(1001),pg_temp.cms_mock_id(1002),pg_temp.cms_mock_id(1003),pg_temp.cms_mock_id(1004))
order by email;
