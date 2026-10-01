import { useState } from "react";
import {
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  GraduationCap,
  ClipboardCheck,
  FilePenLine,
  Wallet,
  Award,
  CreditCard,
  MessageSquare,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Menu,
  X,
  ArrowUpRight,
  CalendarDays,
  Layers,
  Activity,
  CircleHelp,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { Provider, useApp, supabase } from "./store";
import Dashboard from "./Dashboard";
import {
  Attendance,
  Communications,
  Courses,
  EntityPage,
  Reports,
  Schedule,
  Verify,
} from "./Pages";
import {
  LanguageSelect,
  Login,
  Profile,
  ResetPassword,
  Settings,
} from "./Account";
import { Avatar } from "./components";
import { FeesPage, SearchPage } from "./Extras";
import type { Entity } from "./model";
const nav = [
  {
    label: "Dashboard",
    path: "/",
    icon: LayoutDashboard,
    section: "Workspace",
  },
  { label: "Students", path: "/students", icon: Users },
  { label: "Student groups", path: "/student_groups", icon: Users },
  { label: "Courses", path: "/courses", icon: BookOpen },
  { label: "Classes", path: "/classes", icon: Layers },
  { label: "Teachers", path: "/teachers", icon: GraduationCap, admin: true },
  { label: "Schedule", path: "/schedule", icon: CalendarDays },
  {
    label: "Attendance",
    path: "/attendance",
    icon: ClipboardCheck,
    section: "Management",
  },
  { label: "Examinations", path: "/exams", icon: FilePenLine },
  { label: "Results", path: "/results", icon: BarChart3 },
  { label: "Fees & payments", path: "/payments", icon: Wallet, admin: true },
  { label: "Outstanding fees", path: "/fees", icon: CreditCard, admin: true },
  { label: "Certificates", path: "/certificates", icon: Award },
  { label: "Payroll", path: "/payroll", icon: CreditCard },
  {
    label: "Communications",
    path: "/communications",
    icon: MessageSquare,
    admin: true,
  },
  { label: "Announcements", path: "/announcements", icon: Bell },
  {
    label: "Reports",
    path: "/reports",
    icon: BarChart3,
    section: "Administration",
  },
  { label: "Settings", path: "/settings", icon: SettingsIcon, admin: true },
  { label: "Activity log", path: "/activity", icon: Activity, admin: true },
];
function Guard({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { user, t } = useApp();
  return admin && user?.role !== "admin" ? (
    <section className="panel empty">
      <h1>{t("Access denied")}</h1>
      <p>{t("You do not have permission to view this page.")}</p>
      <Link className="button" to="/">
        {t("Dashboard")}
      </Link>
    </section>
  ) : (
    <>{children}</>
  );
}
function Shell() {
  const { user, t, settings, logout, loading, error, refresh } = useApp();
  const [open, setOpen] = useState(false),
    [profile, setProfile] = useState(false),
    [search, setSearch] = useState("");
  const location = useLocation(),
    navigate = useNavigate();
  if (loading)
    return (
      <div className="app-loading">
        <span className="brand-mark">
          <GraduationCap />
        </span>
        <p>{t("Loading…")}</p>
      </div>
    );
  if (error)
    return (
      <div className="error-page">
        <h2>{t("Error")}</h2>
        <p>{error}</p>
        <button className="button" onClick={() => void refresh()}>
          {t("Retry")}
        </button>
        <button className="button secondary" onClick={() => void logout()}>
          {t("Sign out")}
        </button>
      </div>
    );
  if (!user) return <Login />;
  if (user.must_change_password) return <ResetPassword forced />;
  const title =
    nav.find((n) => n.path === location.pathname)?.label || "Account";
  return (
    <div className="app-shell">
      {open && <div className="sidebar-scrim" onClick={() => setOpen(false)} />}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <Link className="brand" to="/" onClick={() => setOpen(false)}>
          {settings.logo ? (
            <img src={settings.logo} alt="" className="brand-mark" />
          ) : (
            <span className="brand-mark">
              <GraduationCap size={25} />
            </span>
          )}
          <div>
            <b>
              {settings.institution_name.split(" ")[0]}
              <span className="brand-period">.</span>
            </b>
            <small>
              {settings.institution_name.split(" ").slice(1).join(" ") ||
                "Academy"}
            </small>
          </div>
        </Link>
        <button
          className="mobile-close icon-button"
          onClick={() => setOpen(false)}
          aria-label={t("Close")}
        >
          <X />
        </button>
        <nav>
          {nav
            .filter((n) => !n.admin || user.role === "admin")
            .map((n) => (
              <div key={n.path}>
                {n.section && <div className="nav-section">{t(n.section)}</div>}
                <NavLink
                  end={n.path === "/"}
                  to={n.path}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    "nav-item " + (isActive ? "active" : "")
                  }
                >
                  <n.icon size={18} strokeWidth={1.7} />
                  <span>{t(n.label)}</span>
                  {n.path === "/students" && <i>↗</i>}
                </NavLink>
              </div>
            ))}
        </nav>
        <div className="sidebar-footer">
          <div className="academy-card">
            <span className="academy-card-icon">✦</span>
            <h4>{t("Learning starts here.")}</h4>
            <p>{t("One place for your entire academy.")}</p>
            <Link to="/schedule">
              {t("View schedule")}
              <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="connection">
            <i className={supabase ? "live" : ""} />
            {t(supabase ? "Connected to Supabase" : "Local demo")}
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Menu")}
              onClick={() => setOpen(true)}
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumbs">
              <span>{t("Workspace")}</span>
              <ChevronRight size={13} />
              <b>{t(title)}</b>
            </div>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              onSubmit={(e) => {
                e.preventDefault();
                navigate("/search?q=" + encodeURIComponent(search));
              }}
            >
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("Search anything…")}
                aria-label={t("Search")}
              />
              <kbd>↵</kbd>
            </form>
            <LanguageSelect />
            <Link
              className="notification-button"
              aria-label={t("Notifications")}
              to="/announcements"
            >
              <Bell size={20} />
              <i />
            </Link>
            <span className="topbar-divider" />
            <div className="dropdown-anchor">
              <button
                className="profile-button"
                onClick={() => setProfile(!profile)}
              >
                <Avatar name={user.full_name} />
                <div>
                  <strong>{user.full_name}</strong>
                  <small>
                    {t(user.role === "admin" ? "Administrator" : "Teacher")}
                  </small>
                </div>
                <ChevronDown size={14} />
              </button>
              {profile && (
                <div className="dropdown profile-dropdown">
                  <Link to="/profile" onClick={() => setProfile(false)}>
                    {t("Profile")}
                  </Link>
                  <Link to="/reset-password" onClick={() => setProfile(false)}>
                    {t("Change password")}
                  </Link>
                  <button
                    onClick={() => {
                      setProfile(false);
                      setOpen(false);
                      void logout();
                    }}
                  >
                    <LogOut size={15} />
                    {t("Sign out")}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main key={location.pathname}>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="courses" element={<Courses />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="reports" element={<Reports />} />
            <Route
              path="settings"
              element={
                <Guard admin>
                  <Settings />
                </Guard>
              }
            />
            <Route
              path="communications"
              element={
                <Guard admin>
                  <Communications />
                </Guard>
              }
            />
            <Route path="profile" element={<Profile />} />
            <Route path="search" element={<SearchPage />} />
            <Route
              path="fees"
              element={
                <Guard admin>
                  <FeesPage />
                </Guard>
              }
            />
            {(
              [
                "students",
                "teachers",
                "classes",
                "subjects",
                "exams",
                "results",
                "payments",
                "payroll",
                "certificates",
                "announcements",
                "activity",
                "student_groups",
                "certificate_templates",
              ] as Entity[]
            ).map((entity) => (
              <Route
                key={entity}
                path={entity}
                element={
                  <Guard
                    admin={[
                      "teachers",
                      "payments",
                      "fees",
                      "activity",
                      "certificate_templates",
                    ].includes(entity)}
                  >
                    <EntityPage entity={entity} />
                  </Guard>
                }
              />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <div className="workspace-footer">
            <span>
              © {new Date().getFullYear()} {settings.institution_name}
            </span>
            <span>
              {t("Learning starts here.")} <span className="tiny-star">✦</span>
            </span>
          </div>
        </main>
      </div>
    </div>
  );
}
function AppContent() {
  const { toast } = useApp();
  return (
    <>
      <Routes>
        <Route path="verify" element={<Verify />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="*" element={<Shell />} />
      </Routes>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={19} />
          {toast}
        </div>
      )}
    </>
  );
}
export default function App() {
  return (
    <Provider>
      <AppContent />
    </Provider>
  );
}
