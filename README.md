# Aminzi Academy — Course Management System

React 19, TypeScript, Vite, Tailwind CSS 4, Supabase, Recharts and Lucide. The interface follows the supplied reference: white rounded workspace, quiet navigation, a pale lilac course panel, and blue, purple, yellow and coral course cards.

English, Afghanistan Dari and Afghanistan Pashto are available from the language selector. Dari and Pashto switch the entire layout to RTL. User-entered names, course descriptions and announcements remain in their original language.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

The URL is printed in the terminal. Vite chooses the next port if the requested port is occupied.

For an isolated demo, even when `.env` already has real Supabase credentials:

```sh
npm run dev:demo
```

The demo starts on port 5174 or the next available port. Choose **Enter admin demo** or **Enter teacher demo**. Demo records persist in this browser's local storage. Demo role switching is a demonstration, not authentication. Do not enter real student information in the demo. Live Supabase mode does not import local demo records or offer demo account buttons.

```sh
npm test          # Business rules and PostgreSQL/RLS integration tests
npm run build    # TypeScript check and production build
npm run preview  # Serve the compiled build
npm run format   # Format source files
```

## Supabase installation — exact order

### 1. Install the complete database

Open **Supabase → SQL Editor → New query**. Copy the **entire contents** of:

**[`supabase/all-migrations.sql`](supabase/all-migrations.sql)**

Run it once in a fresh Supabase project. This bundle creates all application tables, relationships, indexes, server validation, audit triggers, authorization policies, private photo storage and SQL functions, inside one transaction. It contains no passwords or API keys. If anything fails, the whole bundle rolls back.

Do **not** also run the individual migration files after running the bundle. They are the same installation, provided separately for version control and the Supabase CLI:

1. `supabase/migrations/202609300001_initial.sql`
2. `supabase/migrations/202609300002_groups_and_certificate_templates.sql`
3. `supabase/migrations/202609300003_validation_hardening.sql`
4. `supabase/migrations/202610010001_workflow_fixes.sql`

For a CLI-managed fresh project, use `supabase link --project-ref YOUR_PROJECT_REF` and `supabase db push` instead of copying the bundle. If you previously ran only migration 001, run the remaining migrations in order; do not rerun 001. Existing installations with migrations 001–003 need only `202610010001_workflow_fixes.sql`. An unrelated existing database needs its schema reviewed before installation.

### Optional mock data and system checks

After installation, run the entire [`supabase/05-seed-mock-data.sql`](supabase/05-seed-mock-data.sql) in Supabase SQL Editor. It adds 4 teachers, 24 students, 4 courses/classes, 8 subjects/exams, 120 attendance records, 48 results, 24 fees, 16 payments, 8 payroll records, 4 certificates, 4 groups, 2 certificate templates, 3 announcements, 2 message templates and 3 unsent message drafts. Dashboard, schedule, reports and activity derive their content from these linked records. Existing settings and the administrator profile stay intact.

The mock teacher logins are `mock.teacher.1@example.com` through `mock.teacher.4@example.com`, initially using `admin123`. Teachers must change that password on first login. These are fictional email addresses; test password changes in the app, not email delivery. The script hashes passwords with PostgreSQL pgcrypto, installs email identities, runs in one transaction and skips subsequent runs using an audit marker. It does not overwrite edits or reset existing passwords. IDs and record labels identify the mock dataset.

Read [`docs/system-check-2026-10-01.md`](docs/system-check-2026-10-01.md) for the verified workflows and remaining hosted-service checks. `npm test` includes the seed script, database policies, Edge Function handlers and PDF export logic.

For deployment through Supabase's browser editor, run `node scripts/bundle-functions.mjs` after editing Edge Functions. Copy the generated `docs/manage-teacher-dashboard.ts` or `docs/send-message-dashboard.ts` into the matching function and disable the gateway **Verify JWT** toggle: each handler validates the user token and admin access itself.

### 2. Create your first administrator

1. In **Authentication → Users → Add user**, create your administrator with your real email and a strong password. Ensure the email is confirmed, or complete its confirmation flow.
2. Open [`supabase/02-create-first-admin.sql`](supabase/02-create-first-admin.sql).
3. Replace `REPLACE_WITH_YOUR_ADMIN_EMAIL` with that exact Auth user's email. Change the display name if desired.
4. Run the whole SQL block in the SQL Editor.

The script grants the first administrator role to an existing Auth identity. It does not create or store a password. Do not use a teacher account for this step. Public self-registration is unnecessary; turn off **Allow new users to sign up** in the project's Auth settings. Teacher accounts are created by the administrator's server function.

### 3. Set browser environment variables

Copy `.env.example` to `.env` if you do not already have one:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_OR_PUBLISHABLE_KEY
```

Use the project's **public anon** key or **publishable** key. Never use `service_role`, a secret key, or provider credentials in a `VITE_` variable. The client rejects recognized secret/service-role keys. Restart Vite after changing `.env`. The `.env` file is ignored by Git.

### 4. Configure Auth URLs and email

In **Authentication → URL Configuration**, set your production Site URL and add these redirect URLs for the environments you use:

```text
http://localhost:5173/reset-password
http://localhost:5173/profile
https://YOUR_DOMAIN/reset-password
https://YOUR_DOMAIN/profile
```

Use the actual local port printed by Vite if different. Configure a real SMTP sender in Supabase Auth for password recovery and email changes. Leave secure email-change confirmation enabled. Initial `teachername@aminzi.af` addresses require a working mailbox to receive recovery emails; otherwise, the administrator can generate a new temporary password from **Teachers → Details → Security**, and the teacher can change their email after signing in.

### 5. Deploy server functions

The SQL installation does **not** deploy Edge Functions. These are required for teacher account creation/reset and sending notifications:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set APP_ORIGIN=http://localhost:5173
supabase functions deploy manage-teacher --no-verify-jwt
supabase functions deploy send-message --no-verify-jwt
```

Set `APP_ORIGIN` to the exact frontend origin, including its actual development port, or your HTTPS production domain. Multiple origins can be comma-separated. If unset, browser origins are accepted; every POST still requires a valid user token and an active administrator profile. Configured origins are enforced on POST, while preflight and error responses include CORS headers so errors remain readable. Gateway JWT verification is disabled because the handler validates the bearer token with `auth.getUser()` itself, including projects using newer signing keys. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions; do not put the service key in frontend files.

For SMS and WhatsApp, configure these **Edge Function secrets** in the Supabase dashboard:

```text
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_SMS_FROM
TWILIO_WHATSAPP_FROM
APP_ORIGIN
```

The app creates drafts first. The send action submits a draft through Twilio. Missing credentials leave it unsent. A network timeout records an unknown delivery state instead of automatically retrying and risking duplicate messages. `sent` means the provider accepted the message; final delivery must be checked in Twilio. This adapter sends text messages; WhatsApp free-form messaging requires an eligible conversation/session. Business-initiated approved template messages can be added to the provider adapter using your Twilio Content templates. Provider consent, account setup, sender registration and charges are external configuration.

### 6. Verify the installation

Run [`supabase/03-verify-installation.sql`](supabase/03-verify-installation.sql). It checks the 20 application tables, RLS, administrator, private photo bucket and RPC permissions without changing data.

Then sign in to the application and create records in this order: teachers, courses, classes, subjects, students, exams. Courses and classes can also be assigned when editing an existing teacher. Registering a student automatically creates their initial fee using the selected course's fee. Edit that student's fee record when applying a different total or discount.

Before using real records, verify two actual teacher accounts in your Supabase project: each should only see its own classes/students and payroll, and a disabled account must lose access. Test your SMTP recovery and provider sandbox delivery. Local tests do not replace these hosted integration checks.

## Database coverage

| Area                | Tables / resources                                       |
| ------------------- | -------------------------------------------------------- |
| Identity            | `profiles`, `teachers`, Supabase `auth.users`            |
| Student records     | `students`, `student_groups`                             |
| Academics           | `courses`, `classes`, `subjects`                         |
| Attendance          | `attendance`                                             |
| Examinations        | `exams`, `results`                                       |
| Finance             | `fees`, `payments`, `payroll`                            |
| Certificates        | `certificates`, `certificate_templates`                  |
| Communication       | `announcements`, `templates`, `messages`                 |
| Administration      | `settings`, `activity`                                   |
| Private server data | `private.password_resets`                                |
| Files               | Private `photos` storage bucket, 2 MB JPG/PNG/WebP limit |

## Working features

- Administrator and teacher dashboards; scoped role navigation and protected routes.
- Student and teacher forms, private photos, account activation, generated unique teacher emails, and first-login password changes.
- Course cards, course/subject/class CRUD, capacity checks, student groups and teaching schedules.
- Present/absent/late/excused attendance with bulk marking, history and reports.
- Exam creation, result entry, configurable grade thresholds and pass/fail calculations.
- Student profiles with attendance, marks, course time progress, certificates and administrator-only payment history.
- Fee totals, outstanding/partial/full payment filters, cash payment entry, printable receipts and overpayment prevention.
- Salary, bonus, deduction and advance calculation, own-payroll access, paid status and printable slips.
- Certificate template CRUD, issuance, reissuance, printable certificates and QR links to `/verify`.
- Student, parent/guardian, teacher, class, course and selected student-group message drafts, templates and provider submission.
- Announcements scoped to all users, teachers, students, courses or classes.
- Reports with date, course, class, teacher, status and text filters; CSV exports compatible with Excel; printing and browser Save as PDF.
- Search, sorting, pagination, column controls, form validation, confirmation dialogs and activity history.
- Institution, currency, grading, certificate, notification and account settings.

## Security and data behavior

- Supabase Auth hashes passwords. Existing passwords are never returned to the app or displayed to administrators. The requested initial password `admin123` is only sent to Auth when provisioning a teacher; the database holds the Auth hash, never a plaintext password column. A newly generated temporary password is shown once and not persisted in application tables.
- Required password changes are enforced by RLS, not only the login screen. The completion RPC confirms that the Auth password hash changed before it removes the reset requirement.
- Teacher account writes use an admin-authorized Edge Function; browsers cannot directly edit profile roles, activation or salary.
- Teachers cannot query fee/payment tables, another teacher's payroll or records outside their assigned classes. Authorization is rechecked from the profile on every database request, so disabling an account applies even while its JWT remains valid.
- Important changes are written to an append-only client audit log. The public verification RPC returns only certificate number, student name, course, completion date and institution.
- Fee mutations lock the student's database row. Duplicate student IDs, receipts, student/exam results and teacher/month payroll are constrained in PostgreSQL. Class/course alignment and exam mark limits are checked server-side.
- Each student record represents one course/class enrollment. After academic history exists, changing that enrollment is blocked to preserve history; an additional course uses a new enrollment record and unique student ID. Groups are class-based. A separate cross-course person/enrollment model is a future extension.
- Course progress is elapsed time within the class dates, not a record of individual lessons completed. Attendance percentage is `present / all recorded sessions`, matching the requested example; late/excused are recorded separately.
- Hourly/per-class salary types are stored, while the administrator supplies the month's base amount before bonuses and deductions. This is not an automatic staff time-clock calculation.
- PDF export uses the browser print dialog's **Save as PDF**. CSV is the spreadsheet export format; native `.xlsx` generation is not included.
- Teachers have the standard academic permissions plus a configurable class-announcement permission; arbitrary custom role/permission matrices are not implemented.

## Project structure

```text
src/App.tsx              Routes, role guards, sidebar and top navigation
src/Dashboard.tsx        Dashboard, real-data charts and course cards
src/Pages.tsx            Academic, finance, attendance, reports and communication pages
src/components.tsx       Forms, tables, validation display, dialogs and private-photo rendering
src/Account.tsx          Login, recovery, profile and settings
src/Extras.tsx           Teacher security, fee views and global search
src/model.ts             Entity definitions and business calculations
src/store.tsx            Supabase repository, auth state and separate demo repository
src/seed.ts              Local sample data
src/i18n*.ts             English / Dari / Pashto interface dictionaries
src/styles.css          Shared responsive design, RTL and print styles
supabase/migrations/    Versioned database migrations
supabase/functions/     Authorized teacher management and notification adapters
tests/                  Business-rule and PostgreSQL policy tests
```

The app retrieves authorized records in pages of 1,000 to avoid Supabase's default response cap, then filters/paginates in the browser. Larger installations should move these queries to server-side filtered pages and aggregated reporting RPCs. Configure backups, HTTPS, hosting headers, retention and monitoring for your deployment.

## Production hosting

Run `npm run build` with the production public Supabase variables configured. Deploy `dist/` to a static host. Configure an SPA fallback to `index.html` for routes such as `/students` and `/verify`, update Auth redirect URLs, and set the Edge Function `APP_ORIGIN` to that domain. Do not publish `.env`, Supabase secrets, or the development server.

The application builds and its local tests pass. Your live Auth, Storage, SMTP and notification-provider integrations still need the installation and hosted acceptance checks above; the project has not been deployed or independently security-audited.

