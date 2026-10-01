begin;

-- Empty strings are not valid substitutes for required values, even via direct API calls.
create function private.require_nonempty_strings() returns trigger language plpgsql security definer set search_path=public as $$
declare field_name text; begin
 foreach field_name in array tg_argv loop
  if nullif(trim(to_jsonb(new)->>field_name),'') is null then raise exception '% is required',field_name; end if;
 end loop;
 return new;
end $$;
create trigger required_strings before insert or update on public.students for each row execute function private.require_nonempty_strings('full_name','father_name','student_code','phone');
create trigger required_strings before insert or update on public.teachers for each row execute function private.require_nonempty_strings('full_name','father_name','qualification','specialization','phone');
create trigger required_strings before insert or update on public.courses for each row execute function private.require_nonempty_strings('name','duration');
create trigger required_strings before insert or update on public.classes for each row execute function private.require_nonempty_strings('name','room');
alter table public.students add constraint guardian_phone_format check(guardian_phone='' or guardian_phone ~ '^\+?[0-9 ()-]{7,20}$');

-- Reject impossible assignment IDs atomically when administrators submit teacher forms.
create function private.check_teacher_assignments(teacher_data jsonb) returns void language plpgsql security definer set search_path=public as $$begin
 if exists(select 1 from jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]')) selected_id where not exists(select 1 from classes where id=selected_id::uuid)) then raise exception 'Assigned class does not exist'; end if;
 if exists(select 1 from jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]')) selected_id where not exists(select 1 from courses where id=selected_id::uuid)) then raise exception 'Assigned course does not exist'; end if;
end $$;

create or replace function public.register_teacher(teacher_id uuid,teacher_email text,teacher_data jsonb) returns void language plpgsql security definer set search_path=public as $$begin
 perform private.check_teacher_assignments(teacher_data);
 insert into profiles(id,full_name,email,role,status,must_change_password,can_announce) values(teacher_id,teacher_data->>'full_name',teacher_email,'teacher',teacher_data->>'status',true,coalesce((teacher_data->>'can_announce')::boolean,false));
 insert into teachers(id,full_name,email,father_name,dob,gender,phone,address,qualification,specialization,joining_date,salary_type,salary,photo,status,can_announce)
 values(teacher_id,teacher_data->>'full_name',teacher_email,teacher_data->>'father_name',nullif(teacher_data->>'dob','')::date,teacher_data->>'gender',teacher_data->>'phone',coalesce(teacher_data->>'address',''),teacher_data->>'qualification',teacher_data->>'specialization',(teacher_data->>'joining_date')::date,teacher_data->>'salary_type',(teacher_data->>'salary')::numeric,coalesce(teacher_data->>'photo',''),teacher_data->>'status',coalesce((teacher_data->>'can_announce')::boolean,false));
 insert into private.password_resets select teacher_id,encrypted_password from auth.users where id=teacher_id;
 update classes set teacher_id=register_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]'))::uuid);
 update courses set teacher_id=register_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]'))::uuid);
end $$;
create or replace function public.admin_update_teacher(teacher_id uuid,teacher_data jsonb) returns void language plpgsql security definer set search_path=public as $$begin
 perform private.check_teacher_assignments(teacher_data);
 if not exists(select 1 from teachers where id=teacher_id) then raise exception 'Teacher not found'; end if;
 update teachers set full_name=teacher_data->>'full_name',father_name=teacher_data->>'father_name',dob=nullif(teacher_data->>'dob','')::date,gender=teacher_data->>'gender',phone=teacher_data->>'phone',address=coalesce(teacher_data->>'address',''),qualification=teacher_data->>'qualification',specialization=teacher_data->>'specialization',joining_date=(teacher_data->>'joining_date')::date,salary_type=teacher_data->>'salary_type',salary=(teacher_data->>'salary')::numeric,photo=coalesce(teacher_data->>'photo',''),status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 update profiles set full_name=teacher_data->>'full_name',status=teacher_data->>'status',can_announce=coalesce((teacher_data->>'can_announce')::boolean,false) where id=teacher_id;
 update classes set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'class_ids','[]'))::uuid);
 update courses set teacher_id=admin_update_teacher.teacher_id where id in (select jsonb_array_elements_text(coalesce(teacher_data->'course_ids','[]'))::uuid);
end $$;
revoke all on function public.register_teacher(uuid,text,jsonb),public.admin_update_teacher(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.register_teacher(uuid,text,jsonb),public.admin_update_teacher(uuid,jsonb) to service_role;

-- Backend housekeeping: expired profile photo URLs are never stored; only private object paths.
-- Existing external photo URLs remain accepted for manually imported records.
create index certificates_student_idx on public.certificates(student_id);
create index exams_class_date_idx on public.exams(class_id,date);
create index announcements_class_idx on public.announcements(class_id);
create index messages_status_date_idx on public.messages(status,created_at);
create unique index students_code_casefold_idx on public.students(lower(student_code));
create unique index certificates_number_casefold_idx on public.certificates(lower(number));
create unique index payments_receipt_casefold_idx on public.payments(lower(receipt_number));
create unique index teachers_email_casefold_idx on public.teachers(lower(email));

create function private.protect_exam_course() returns trigger language plpgsql security definer set search_path=public as $$begin
 if new.course_id<>old.course_id then
  if tg_table_name='subjects' and exists(select 1 from exams where subject_id=old.id) then raise exception 'A subject with examinations cannot change course'; end if;
  if tg_table_name='classes' and exists(select 1 from exams where class_id=old.id) then raise exception 'A class with examinations cannot change course'; end if;
 end if;return new;
end $$;
create trigger protect_exam_course before update on public.subjects for each row execute function private.protect_exam_course();
create trigger protect_exam_course before update on public.classes for each row execute function private.protect_exam_course();

-- Explicit server privileges avoid relying on project-specific default grants.
do $$ declare table_name text; begin
 foreach table_name in array array['profiles','teachers','students','courses','classes','subjects','attendance','exams','results','fees','payments','payroll','certificates','announcements','templates','messages','activity','settings','student_groups','certificate_templates'] loop
  execute format('grant select,insert,update,delete on public.%I to service_role',table_name);
 end loop;
end $$;

commit;
