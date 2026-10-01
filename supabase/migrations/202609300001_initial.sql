-- Run once in the Supabase SQL editor, or with `supabase db push`.
begin;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users on delete cascade,
 full_name text not null check(length(trim(full_name)) between 2 and 200),
 email text not null unique,
 role text not null check(role in ('admin','teacher')),
 status text not null default 'active' check(status in ('active','inactive')),
 must_change_password boolean not null default true,
 can_announce boolean not null default false,
 created_at timestamptz not null default now()
);
create table private.password_resets (user_id uuid primary key references auth.users on delete cascade, password_hash text not null);
create table public.teachers (
 id uuid primary key references public.profiles on delete restrict,
 full_name text not null check(length(trim(full_name)) between 2 and 200),
 email text not null unique,
 father_name text not null, dob date, gender text check(gender in ('male','female')),
 phone text not null check(phone ~ '^\+?[0-9 ()-]{7,20}$'), address text not null default '',
 qualification text not null, specialization text not null, joining_date date not null,
 salary_type text not null check(salary_type in ('monthly','hourly','per_class')),
 salary numeric(14,2) not null check(salary >= 0), photo text not null default '',
 status text not null default 'active' check(status in ('active','inactive')),
 can_announce boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.courses (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 200),
 description text not null default '', duration text not null, fee numeric(14,2) not null check(fee>=0),
 teacher_id uuid references public.teachers on delete restrict, modules text not null default '',
 color text not null default 'blue' check(color in ('blue','purple','yellow','coral')),
 status text not null default 'active' check(status in ('active','inactive','completed')),
 created_at timestamptz not null default now()
);
create table public.classes (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 2 and 200),
 course_id uuid not null references public.courses on delete restrict,
 teacher_id uuid not null references public.teachers on delete restrict,
 room text not null, start_date date not null, end_date date not null check(end_date>=start_date),
 days text[] not null check(cardinality(days)>0 and days <@ array['Sat','Sun','Mon','Tue','Wed','Thu','Fri']),
 start_time time not null, end_time time not null check(end_time>start_time),
 capacity integer not null check(capacity between 1 and 500),
 status text not null default 'active' check(status in ('active','inactive','completed')),
 created_at timestamptz not null default now()
);
create table public.students (
 id uuid primary key default gen_random_uuid(), student_code text not null unique check(length(trim(student_code))>0),
 full_name text not null check(length(trim(full_name)) between 2 and 200), father_name text not null, mother_name text not null default '',
 dob date, gender text not null check(gender in ('male','female')),
 phone text not null check(phone ~ '^\+?[0-9 ()-]{7,20}$'), guardian_phone text not null default '',
 email text not null default '' check(email='' or email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
 address text not null default '', photo text not null default '',
 course_id uuid not null references public.courses on delete restrict,
 class_id uuid not null references public.classes on delete restrict,
 enrollment_date date not null,
 status text not null default 'active' check(status in ('active','inactive','completed')),
 created_at timestamptz not null default now()
);
create table public.subjects(id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0), course_id uuid not null references public.courses on delete restrict, description text not null default '', created_at timestamptz not null default now());
create table public.attendance(
 id uuid primary key default gen_random_uuid(), student_id uuid not null references public.students on delete restrict,
 class_id uuid not null references public.classes on delete restrict, date date not null check(date<=current_date),
 status text not null check(status in ('present','absent','late','excused')),
 created_at timestamptz not null default now(), unique(student_id,class_id,date)
);
create table public.exams(
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 class_id uuid not null references public.classes on delete restrict, subject_id uuid not null references public.subjects on delete restrict,
 date date not null, max_marks numeric(8,2) not null check(max_marks>0), passing_marks numeric(8,2) not null check(passing_marks>=0 and passing_marks<=max_marks), created_at timestamptz not null default now()
);
create table public.results(id uuid primary key default gen_random_uuid(),student_id uuid not null references public.students on delete restrict,exam_id uuid not null references public.exams on delete restrict,marks numeric(8,2) not null check(marks>=0),created_at timestamptz not null default now(),unique(student_id,exam_id));
create table public.fees(id uuid primary key default gen_random_uuid(),student_id uuid not null unique references public.students on delete restrict,total numeric(14,2) not null check(total>=0),created_at timestamptz not null default now());
create table public.payments(
 id uuid primary key default gen_random_uuid(),receipt_number text not null unique check(length(trim(receipt_number))>0),
 student_id uuid not null references public.students on delete restrict,amount numeric(14,2) not null check(amount>0),
 date date not null,method text not null default 'Cash' check(method='Cash'),received_by text not null check(length(trim(received_by))>0),notes text not null default '',created_at timestamptz not null default now()
);
create table public.payroll(
 id uuid primary key default gen_random_uuid(),teacher_id uuid not null references public.teachers on delete restrict,
 month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),base_salary numeric(14,2) not null check(base_salary>=0),
 bonus numeric(14,2) not null default 0 check(bonus>=0),deductions numeric(14,2) not null default 0 check(deductions>=0),advances numeric(14,2) not null default 0 check(advances>=0),
 status text not null default 'pending' check(status in ('pending','paid')),paid_on date,notes text not null default '',created_at timestamptz not null default now(),
 unique(teacher_id,month),check(base_salary+bonus-deductions-advances>=0),check(status<>'paid' or paid_on is not null)
);
create table public.certificates(
 id uuid primary key default gen_random_uuid(),number text not null unique check(length(trim(number))>=8),
 student_id uuid not null references public.students on delete restrict,course_id uuid not null references public.courses on delete restrict,
 completion_date date not null,issued_date date not null,signature text not null check(length(trim(signature))>0),created_at timestamptz not null default now()
);
create table public.announcements(
 id uuid primary key default gen_random_uuid(),title text not null check(length(trim(title))>0),message text not null check(length(trim(message))>0),
 audience text not null default 'all' check(audience in ('all','teachers','students_group')),
 course_id uuid references public.courses on delete restrict,class_id uuid references public.classes on delete restrict,date date not null,created_at timestamptz not null default now()
);
create table public.templates(id uuid primary key default gen_random_uuid(),name text not null check(length(trim(name))>0),channel text not null check(channel in ('WhatsApp','SMS')),message text not null check(length(trim(message))>0),created_at timestamptz not null default now());
create table public.messages(
 id uuid primary key default gen_random_uuid(),recipient text not null check(recipient ~ '^\+[1-9][0-9]{7,14}$'),
 channel text not null check(channel in ('WhatsApp','SMS')),message text not null check(length(message) between 1 and 1600),
 status text not null default 'draft' check(status in ('draft','sending','sent','failed','unknown')),
 provider_id text,error text,created_at timestamptz not null default now()
);
create table public.activity(id uuid primary key default gen_random_uuid(),actor text not null,action text not null,resource text not null,record_id text,created_at timestamptz not null default now());
create table public.settings(id text primary key check(id='institution'),value jsonb not null default '{}');
insert into public.settings values('institution','{"institution_name":"Aminzi Academy","address":"Kabul, Afghanistan","currency":"AFN","academic_year":"2026","grades":{"A+":90,"A":80,"B":70,"C":60,"D":50,"F":0},"signature":"Amin Zai","certificate_heading":"Certificate of completion","whatsapp_provider":"twilio","sms_provider":"twilio"}');

create index students_class_idx on public.students(class_id);
create index classes_teacher_idx on public.classes(teacher_id);
create index payments_student_date_idx on public.payments(student_id,date);
create index attendance_class_date_idx on public.attendance(class_id,date);
create index results_exam_idx on public.results(exam_id);
create index payroll_teacher_month_idx on public.payroll(teacher_id,month);
create index activity_date_idx on public.activity(created_at desc);

-- Security-definer predicates avoid recursive policies and expose no table data.
create function public.account_active() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and status='active' and not must_change_password);
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from profiles where id=auth.uid() and role='admin' and status='active' and not must_change_password);
$$;
create function public.teaches(class_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select account_active() and exists(select 1 from classes where id=class_uuid and teacher_id=auth.uid());
$$;
create function public.teaches_course(course_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select account_active() and exists(select 1 from classes where course_id=course_uuid and teacher_id=auth.uid());
$$;
create function public.teaches_student(student_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from students where id=student_uuid and teaches(class_id));
$$;
create function public.teaches_exam(exam_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from exams where id=exam_uuid and teaches(class_id));
$$;
create function public.can_announce(class_uuid uuid) returns boolean language sql stable security definer set search_path=public as $$
 select teaches(class_uuid) and exists(select 1 from profiles where id=auth.uid() and can_announce);
$$;

do $$ declare name text; begin
 foreach name in array array['profiles','teachers','courses','classes','students','subjects','attendance','exams','results','fees','payments','payroll','certificates','announcements','templates','messages','activity','settings'] loop
 execute format('alter table public.%I enable row level security',name);
 execute format('revoke all on public.%I from anon, authenticated',name);
 execute format('grant select, insert, update, delete on public.%I to authenticated',name);
 end loop;
end $$;
create policy profiles_read on public.profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy teachers_read on public.teachers for select to authenticated using(is_admin() or (id=auth.uid() and account_active()));
create policy courses_read on public.courses for select to authenticated using(is_admin() or teaches_course(id));
create policy classes_read on public.classes for select to authenticated using(is_admin() or teaches(id));
create policy students_read on public.students for select to authenticated using(is_admin() or teaches(class_id));
create policy subjects_read on public.subjects for select to authenticated using(is_admin() or teaches_course(course_id));
create policy exams_read on public.exams for select to authenticated using(is_admin() or teaches(class_id));
create policy results_read on public.results for select to authenticated using(is_admin() or (teaches_exam(exam_id) and teaches_student(student_id)));
create policy attendance_read on public.attendance for select to authenticated using(is_admin() or teaches(class_id));
create policy payroll_read on public.payroll for select to authenticated using(is_admin() or (teacher_id=auth.uid() and account_active()));
create policy certificates_read on public.certificates for select to authenticated using(is_admin() or teaches_student(student_id));
create policy announcements_read on public.announcements for select to authenticated using(is_admin() or (account_active() and audience in ('all','teachers') and (class_id is null or teaches(class_id)) and (course_id is null or teaches_course(course_id))));
create policy settings_read on public.settings for select to authenticated using(account_active());
create policy activity_read on public.activity for select to authenticated using(is_admin());
create policy messages_read on public.messages for select to authenticated using(is_admin());
create policy messages_insert on public.messages for insert to authenticated with check(is_admin() and status='draft' and provider_id is null and error is null);
create policy messages_update on public.messages for update to authenticated using(is_admin() and status='draft') with check(is_admin() and status='draft' and provider_id is null and error is null);
create policy messages_delete on public.messages for delete to authenticated using(is_admin() and status='draft');
do $$ declare name text; begin
 foreach name in array array['courses','classes','students','subjects','exams','results','attendance','payroll','certificates','announcements','settings'] loop
 execute format('create policy admin_insert on public.%I for insert to authenticated with check(is_admin())',name);
 execute format('create policy admin_update on public.%I for update to authenticated using(is_admin()) with check(is_admin())',name);
 execute format('create policy admin_delete on public.%I for delete to authenticated using(is_admin())',name);
 end loop;
 foreach name in array array['fees','payments','templates'] loop
 execute format('create policy admin_only on public.%I for all to authenticated using(is_admin()) with check(is_admin())',name);
 end loop;
end $$;
create policy teacher_attendance_insert on public.attendance for insert to authenticated with check(teaches(class_id) and teaches_student(student_id));
create policy teacher_attendance_update on public.attendance for update to authenticated using(teaches(class_id)) with check(teaches(class_id) and teaches_student(student_id));
create policy teacher_results_insert on public.results for insert to authenticated with check(teaches_exam(exam_id) and teaches_student(student_id));
create policy teacher_results_update on public.results for update to authenticated using(teaches_exam(exam_id) and teaches_student(student_id)) with check(teaches_exam(exam_id) and teaches_student(student_id));
create policy teacher_announcement_insert on public.announcements for insert to authenticated with check(can_announce(class_id) and (course_id is null or teaches_course(course_id)));
create policy teacher_announcement_update on public.announcements for update to authenticated using(can_announce(class_id)) with check(can_announce(class_id) and (course_id is null or teaches_course(course_id)));

-- Validate cross-table invariants on the server, including concurrent payments/enrollment.
create function private.validate_record() returns trigger language plpgsql security definer set search_path=public as $$
declare cls classes%rowtype; ex exams%rowtype; total_due numeric; already_paid numeric; begin
 if tg_table_name='students' then
  select * into cls from classes where id=new.class_id for update;
  if cls.course_id<>new.course_id then raise exception 'Class must belong to the selected course'; end if;
  if new.dob>current_date then raise exception 'Date of birth cannot be in the future'; end if;
  if new.status='active' and (select count(*) from students where class_id=new.class_id and status='active' and id<>new.id)>=cls.capacity then raise exception 'Class is at capacity'; end if;
  if tg_op='UPDATE' and (old.class_id<>new.class_id or old.course_id<>new.course_id) and (exists(select 1 from attendance where student_id=old.id) or exists(select 1 from results where student_id=old.id) or exists(select 1 from certificates where student_id=old.id)) then raise exception 'Students with academic history cannot be moved to another class; create a new enrollment record'; end if;
 elsif tg_table_name='classes' and tg_op='UPDATE' then
  if new.capacity<(select count(*) from students where class_id=new.id and status='active') then raise exception 'Capacity is below current enrollment'; end if;
  if new.course_id<>old.course_id and exists(select 1 from students where class_id=new.id) then raise exception 'An enrolled class cannot change course'; end if;
 elsif tg_table_name='attendance' then
  if not exists(select 1 from students where id=new.student_id and class_id=new.class_id) then raise exception 'Student does not belong to this class'; end if;
 elsif tg_table_name='exams' then
  if not exists(select 1 from classes c join subjects s on s.course_id=c.course_id where c.id=new.class_id and s.id=new.subject_id) then raise exception 'Exam subject must match the class course'; end if;
  if tg_op='UPDATE' and exists(select 1 from results where exam_id=new.id) and (new.class_id<>old.class_id or new.max_marks<old.max_marks) then raise exception 'Cannot change class or reduce maximum marks after results exist'; end if;
 elsif tg_table_name='results' then
  select * into ex from exams where id=new.exam_id;
  if new.marks>ex.max_marks then raise exception 'Marks exceed maximum marks'; end if;
  if not exists(select 1 from students where id=new.student_id and class_id=ex.class_id) then raise exception 'Student must belong to the exam class'; end if;
 elsif tg_table_name in ('payments','fees') then
  perform id from students where id=new.student_id for update;
  if tg_op='UPDATE' and new.student_id<>old.student_id then raise exception 'Student on a financial record cannot be changed'; end if;
  if tg_table_name='payments' then
   select total into total_due from fees where student_id=new.student_id;
   select coalesce(sum(amount),0) into already_paid from payments where student_id=new.student_id and id<>new.id;
   if total_due is null or new.amount+already_paid>total_due then raise exception 'Payment exceeds remaining balance'; end if;
  else
   select coalesce(sum(amount),0) into already_paid from payments where student_id=new.student_id;
   if new.total<already_paid then raise exception 'Fee cannot be less than received payments'; end if;
  end if;
 elsif tg_table_name='certificates' then
  if not exists(select 1 from students where id=new.student_id and course_id=new.course_id) then raise exception 'Certificate course must match enrollment'; end if;
 elsif tg_table_name='teachers' then
  if new.dob>current_date then raise exception 'Date of birth cannot be in the future'; end if;
 elsif tg_table_name='settings' then
  if jsonb_typeof(new.value->'grades')<>'object' or not exists(select 1 from jsonb_each_text(new.value->'grades') where value::numeric=0) or exists(select 1 from jsonb_each_text(new.value->'grades') where value::numeric<0 or value::numeric>100) then raise exception 'Invalid grading thresholds'; end if;
  if length(trim(new.value->>'institution_name'))<1 then raise exception 'Institution name is required'; end if;
 end if;
 return new;
end $$;
do $$ declare name text; begin foreach name in array array['students','classes','attendance','exams','results','payments','fees','certificates','teachers','settings'] loop
 execute format('create trigger validate_record before insert or update on public.%I for each row execute function private.validate_record()',name);
end loop; end $$;
create function private.create_student_fee() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into fees(student_id,total) select new.id,fee from courses where id=new.course_id; return new;
end $$;
create trigger create_student_fee after insert on public.students for each row execute function private.create_student_fee();
create function private.prevent_fee_delete() returns trigger language plpgsql security definer set search_path=public as $$begin
 perform id from students where id=old.student_id for update;
 if exists(select 1 from payments where student_id=old.student_id) then raise exception 'Cannot delete fees with received payments'; end if;return old;
end $$;
create trigger prevent_fee_delete before delete on public.fees for each row execute function private.prevent_fee_delete();

-- Audit is append-only to clients and contains no passwords or full record snapshots.
create function private.audit_change() returns trigger language plpgsql security definer set search_path=public as $$declare record_key text; actor_name text; begin
 record_key:=case when tg_op='DELETE' then old.id::text else new.id::text end;
 select full_name into actor_name from profiles where id=auth.uid();
 insert into activity(actor,action,resource,record_id) values(coalesce(actor_name,'Server'),lower(tg_op),tg_table_name,record_key);
 return case when tg_op='DELETE' then old else new end;
end $$;
do $$ declare name text; begin foreach name in array array['teachers','students','courses','classes','subjects','attendance','exams','results','fees','payments','payroll','certificates','announcements','templates','messages','settings'] loop
 execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function private.audit_change()',name);
end loop; end $$;

create function public.update_own_profile(display_name text,phone_number text,home_address text) returns void language plpgsql security definer set search_path=public as $$begin
 if not account_active() then raise exception 'Access denied'; end if;
 if length(trim(display_name))<2 or length(display_name)>200 or (phone_number<>'' and phone_number !~ '^\+?[0-9 ()-]{7,20}$') then raise exception 'Invalid profile'; end if;
 update profiles set full_name=trim(display_name) where id=auth.uid();
 update teachers set full_name=trim(display_name),phone=phone_number,address=home_address where id=auth.uid();
end $$;
create function public.complete_password_change() returns void language plpgsql security definer set search_path=public as $$begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if exists(select 1 from private.password_resets r join auth.users u on u.id=r.user_id where r.user_id=auth.uid() and r.password_hash=u.encrypted_password) then raise exception 'Change the temporary password first'; end if;
 update profiles set must_change_password=false where id=auth.uid() and status='active';
 delete from private.password_resets where user_id=auth.uid();
end $$;
create function private.sync_auth_email() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.email is distinct from old.email then
 update profiles set email=new.email where id=new.id;
 update teachers set email=new.email where id=new.id;
 end if; return new;
end $$;
create trigger sync_auth_email after update of email on auth.users for each row execute function private.sync_auth_email();

-- Used only by the service-role teacher function, never by a browser.
create function public.register_teacher(teacher_id uuid,teacher_email text,teacher_data jsonb) returns void language plpgsql security definer set search_path=public as $$begin
 insert into profiles(id,full_name,email,role,status,must_change_password,can_announce) values(teacher_id,teacher_data->>'full_name',teacher_email,'teacher',teacher_data->>'status',true,coalesce((teacher_data->>'can_announce')::boolean,false));
 insert into teachers(id,full_name,email,father_name,dob,gender,phone,address,qualification,specialization,joining_date,salary_type,salary,photo,status,can_announce)
 values(teacher_id,teacher_data->>'full_name',teacher_email,teacher_data->>'father_name',nullif(teacher_data->>'dob','')::date,teacher_data->>'gender',teacher_data->>'phone',coalesce(teacher_data->>'address',''),teacher_data->>'qualification',teacher_data->>'specialization',(teacher_data->>'joining_date')::date,teacher_data->>'salary_type',(teacher_data->>'salary')::numeric,coalesce(teacher_data->>'photo',''),teacher_data->>'status',coalesce((teacher_data->>'can_announce')::boolean,false));
 insert into private.password_resets select teacher_id,encrypted_password from auth.users where id=teacher_id;
 update classes set teacher_id=register_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]'))::uuid);
 update courses set teacher_id=register_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]'))::uuid);
end $$;
create function public.admin_update_teacher(teacher_id uuid,teacher_data jsonb) returns void language plpgsql security definer set search_path=public as $$begin
 if not exists(select 1 from teachers where id=teacher_id) then raise exception 'Teacher not found'; end if;
 update teachers set full_name=teacher_data->>'full_name',father_name=teacher_data->>'father_name',dob=nullif(teacher_data->>'dob','')::date,gender=teacher_data->>'gender',phone=teacher_data->>'phone',address=coalesce(teacher_data->>'address',''),qualification=teacher_data->>'qualification',specialization=teacher_data->>'specialization',joining_date=(teacher_data->>'joining_date')::date,salary_type=teacher_data->>'salary_type',salary=(teacher_data->>'salary')::numeric,photo=coalesce(teacher_data->>'photo',''),status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 update profiles set full_name=teacher_data->>'full_name',status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 update classes set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]'))::uuid);
 update courses set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]'))::uuid);
end $$;
create function public.require_password_change(teacher_id uuid) returns void language plpgsql security definer set search_path=public as $$begin
 update profiles set must_change_password=true where id=teacher_id and role='teacher';
 insert into private.password_resets select teacher_id,encrypted_password from auth.users where id=teacher_id on conflict(user_id) do update set password_hash=excluded.password_hash;
 insert into activity(actor,action,resource,record_id) values('Administrator','password reset required','teachers',teacher_id::text);
end $$;
revoke all on function public.register_teacher(uuid,text,jsonb),public.admin_update_teacher(uuid,jsonb),public.require_password_change(uuid) from public,anon,authenticated;
grant execute on function public.register_teacher(uuid,text,jsonb),public.admin_update_teacher(uuid,jsonb),public.require_password_change(uuid) to service_role;
revoke all on function public.update_own_profile(text,text,text),public.complete_password_change() from public,anon;
grant execute on function public.update_own_profile(text,text,text),public.complete_password_change() to authenticated;
create function public.verify_certificate(certificate_number text) returns table(number text,student_name text,course_name text,completion_date date,institution_name text) language sql stable security definer set search_path=public as $$
 select c.number,s.full_name,co.name,c.completion_date,(select value->>'institution_name' from settings where id='institution')
 from certificates c join students s on s.id=c.student_id join courses co on co.id=c.course_id
 where lower(c.number)=lower(trim(certificate_number)) and length(certificate_number) between 8 and 100 limit 1;
$$;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('photos','photos',false,2097152,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy photos_insert on storage.objects for insert to authenticated with check(bucket_id='photos' and is_admin() and (storage.foldername(name))[1]=auth.uid()::text);
create policy photos_read on storage.objects for select to authenticated using(bucket_id='photos' and (is_admin() or (account_active() and (exists(select 1 from students where photo=name and teaches(class_id)) or exists(select 1 from teachers where id=auth.uid() and photo=name)))));
create policy photos_delete on storage.objects for delete to authenticated using(bucket_id='photos' and is_admin());
commit;
