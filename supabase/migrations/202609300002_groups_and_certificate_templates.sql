begin;

create table public.student_groups (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 200),
 class_id uuid not null references public.classes on delete restrict,
 student_ids uuid[] not null default '{}' check(cardinality(student_ids)>0),
 description text not null default '',
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now()
);
create index student_groups_class_idx on public.student_groups(class_id);
create index student_groups_students_idx on public.student_groups using gin(student_ids);
alter table public.student_groups enable row level security;
revoke all on public.student_groups from anon,authenticated;
grant select,insert,update,delete on public.student_groups to authenticated;
create policy group_read on public.student_groups for select to authenticated using(is_admin() or teaches(class_id));
create policy group_admin_insert on public.student_groups for insert to authenticated with check(is_admin());
create policy group_admin_update on public.student_groups for update to authenticated using(is_admin()) with check(is_admin());
create policy group_admin_delete on public.student_groups for delete to authenticated using(is_admin());

create function private.validate_group() returns trigger language plpgsql security definer set search_path=public as $$begin
 if exists(select 1 from unnest(new.student_ids) member_id where not exists(select 1 from students where id=member_id and class_id=new.class_id)) then raise exception 'Every group member must belong to the selected class'; end if;
 if cardinality(new.student_ids)<>(select count(distinct member_id) from unnest(new.student_ids) member_id) then raise exception 'Group members must be unique'; end if;
 return new;
end $$;
create trigger validate_group before insert or update on public.student_groups for each row execute function private.validate_group();
create trigger audit_change after insert or update or delete on public.student_groups for each row execute function private.audit_change();
create function private.protect_group_membership() returns trigger language plpgsql security definer set search_path=public as $$begin
 if tg_op='DELETE' then
  if exists(select 1 from student_groups where old.id=any(student_ids)) then raise exception 'Remove the student from groups before deleting'; end if;
  return old;
 end if;
 if new.class_id<>old.class_id and exists(select 1 from student_groups where old.id=any(student_ids)) then raise exception 'Remove the student from groups before changing class'; end if;
 return new;
end $$;
create trigger protect_group_membership before update or delete on public.students for each row execute function private.protect_group_membership();

create table public.certificate_templates (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 200),
 heading text not null check(length(trim(heading)) between 2 and 200),
 description text not null default '',
 signature text not null check(length(trim(signature)) between 2 and 200),
 accent text not null default 'gold' check(accent in ('gold','blue','purple')),
 status text not null default 'active' check(status in ('active','inactive')),
 created_at timestamptz not null default now()
);
alter table public.certificates add column template_id uuid references public.certificate_templates on delete restrict;
alter table public.certificate_templates enable row level security;
revoke all on public.certificate_templates from anon,authenticated;
grant select,insert,update,delete on public.certificate_templates to authenticated;
create policy template_read on public.certificate_templates for select to authenticated using(is_admin() or account_active());
create policy template_admin_insert on public.certificate_templates for insert to authenticated with check(is_admin());
create policy template_admin_update on public.certificate_templates for update to authenticated using(is_admin()) with check(is_admin());
create policy template_admin_delete on public.certificate_templates for delete to authenticated using(is_admin());
create trigger audit_change after insert or update or delete on public.certificate_templates for each row execute function private.audit_change();
insert into public.certificate_templates(name,heading,description,signature,accent) values
 ('Academy completion','Certificate of completion','','Authorized administrator','gold'),
 ('Academic excellence','Certificate of excellence','In recognition of outstanding academic achievement.','Authorized administrator','blue');

-- Confirm all required grading thresholds are numeric, unique, and anchored at zero.
create function private.validate_settings() returns trigger language plpgsql security definer set search_path=public as $$declare grades jsonb; begin
 grades:=new.value->'grades';
 if grades is null or jsonb_typeof(grades)<>'object' then raise exception 'Grading system is required'; end if;
 if exists(select 1 from jsonb_each(grades) where jsonb_typeof(value)<>'number') then raise exception 'Grade thresholds must be numeric'; end if;
 if (select count(*) from jsonb_each_text(grades))<>(select count(distinct value::numeric) from jsonb_each_text(grades)) then raise exception 'Grade thresholds must be unique'; end if;
 if nullif(trim(new.value->>'institution_name'),'') is null then raise exception 'Institution name is required'; end if;
 return new;
end $$;
create trigger validate_settings before insert or update on public.settings for each row execute function private.validate_settings();

-- Application helpers are not anonymously callable (certificate verification is the exception).
revoke all on function public.account_active(),public.is_admin(),public.teaches(uuid),public.teaches_course(uuid),public.teaches_student(uuid),public.teaches_exam(uuid),public.can_announce(uuid) from public,anon;
grant execute on function public.account_active(),public.is_admin(),public.teaches(uuid),public.teaches_course(uuid),public.teaches_student(uuid),public.teaches_exam(uuid),public.can_announce(uuid) to authenticated,service_role;

commit;
