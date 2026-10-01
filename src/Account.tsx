import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  Check,
  KeyRound,
  Mail,
  Globe2,
  BookOpen,
} from "lucide-react";
import { useApp, supabase } from "./store";
import { languages } from "./i18n";
import type { Language } from "./i18n";
import { Avatar, SectionTitle } from "./components";
export function LanguageSelect() {
  const { language, setLanguage, t } = useApp();
  return (
    <div className="language-select">
      <Globe2 size={16} />
      <select
        aria-label={t("Select language")}
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
      >
        {languages.map((l) => (
          <option value={l.value} key={l.value}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
export function Login() {
  const { t, loginDemo, settings, notify } = useApp();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [forgot, setForgot] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <div className="login-page">
      <div className="login-art">
        <div className="brand">
          <span className="brand-mark">
            <GraduationCap />
          </span>
          <b>{settings.institution_name}</b>
        </div>
        <div className="login-illustration">
          <div className="floating-card fc1">
            <BookOpen size={36} />
            <b>{t("Learning starts here.")}</b>
            <span>✦ ✦ ✦</span>
          </div>
          <div className="floating-card fc2">
            <GraduationCap size={48} />
          </div>
          <div className="floating-card fc3">
            <ShieldCheck size={30} />
          </div>
          <div className="orbit orbit1" />
          <div className="orbit orbit2" />
        </div>
        <h1>{t("One place for your entire academy.")}</h1>
        <p>{t("Manage your academy with confidence.")}</p>
      </div>
      <div className="login-main">
        <LanguageSelect />
        <div className="login-form">
          <span className="eyebrow">{t("Welcome to Aminzi")}</span>
          <h1>{t(forgot ? "Reset password" : "Sign in")}</h1>
          <p className="muted">{t("Your academy, at a glance.")}</p>
          {error && (
            <div className="error-box" role="alert">
              {error}
            </div>
          )}
          {supabase ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError("");
                try {
                  if (forgot) {
                    const { error } =
                      await supabase!.auth.resetPasswordForEmail(email, {
                        redirectTo: window.location.origin + "/reset-password",
                      });
                    if (error) throw error;
                    notify(
                      "If this email is registered, a password reset link has been sent.",
                    );
                  } else {
                    const { error } = await supabase!.auth.signInWithPassword({
                      email,
                      password,
                    });
                    if (error) throw error;
                    navigate("/");
                  }
                } catch (err: any) {
                  setError(t(err.message));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label className="field">
                <span>{t("Email")}</span>
                <input
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@aminzi.af"
                />
              </label>
              {!forgot && (
                <label className="field">
                  <span>{t("Password")}</span>
                  <div className="password-input">
                    <input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t("Password")}
                      onClick={() => setShow(!show)}
                    >
                      {show ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              <button className="button full-width" disabled={busy}>
                {busy ? (
                  <Loader2 size={18} className="spin" />
                ) : (
                  t(forgot ? "Send reset link" : "Sign in")
                )}
                <ArrowRight size={18} />
              </button>
              <button
                className="text-link center"
                type="button"
                onClick={() => setForgot(!forgot)}
              >
                {t(forgot ? "Back to login" : "Forgot password?")}
              </button>
            </form>
          ) : (
            <div className="demo-login">
              <div className="info-box">
                <b>{t("Demo workspace")}</b>
                <p>
                  {t("You are viewing a local demonstration with sample data.")}
                </p>
              </div>
              <button
                className="button full-width"
                onClick={() => {
                  loginDemo("admin");
                  navigate("/");
                }}
              >
                {t("Enter admin demo")}
                <ArrowRight size={18} />
              </button>
              <button
                className="button secondary full-width"
                onClick={() => {
                  loginDemo("teacher");
                  navigate("/");
                }}
              >
                {t("Enter teacher demo")}
                <ArrowRight size={18} />
              </button>
              <p className="muted small">
                {t("Demo changes are saved on this device.")}
              </p>
            </div>
          )}
          <Link className="text-link center" to="/verify">
            <ShieldCheck size={16} />
            {t("Verify certificate")}
          </Link>
        </div>
        <small className="login-footer">
          © {new Date().getFullYear()} {settings.institution_name}
        </small>
      </div>
    </div>
  );
}
export function ResetPassword({ forced = false }: { forced?: boolean }) {
  const { t, user, setUser, refresh, notify } = useApp();
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <div className="password-page">
      <section className="panel">
        <KeyRound size={35} className="primary-text" />
        <h1>{t("Change password")}</h1>
        <p>
          {t(
            forced
              ? "Please change your temporary password to continue."
              : "Use at least 12 characters.",
          )}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            if (password.length < 12 || password !== confirm) {
              setError(
                t("Passwords must match and contain at least 12 characters."),
              );
              return;
            }
            setBusy(true);
            try {
              if (supabase) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                const { error: pe } = await supabase.rpc(
                  "complete_password_change",
                );
                if (pe) throw pe;
                await refresh();
              } else if (user)
                setUser({ ...user, must_change_password: false });
              notify(t("Saved successfully"));
              navigate("/");
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {error && <div className="error-box">{error}</div>}
          <label className="field">
            <span>{t("New password")}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="field">
            <span>{t("Confirm password")}</span>
            <input
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button className="button full-width" disabled={busy}>
            {busy ? (
              <Loader2 size={16} className="spin" />
            ) : (
              <Check size={16} />
            )}{" "}
            {t("Change password")}
          </button>
        </form>
      </section>
    </div>
  );
}
export function Profile() {
  const { user, t, data, setUser, notify, refresh } = useApp();
  const teacher = data.teachers.find((te) => te.id === user?.id);
  const [name, setName] = useState(user?.full_name || ""),
    [phone, setPhone] = useState(teacher?.phone || ""),
    [address, setAddress] = useState(teacher?.address || ""),
    [email, setEmail] = useState(user?.email || ""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <SectionTitle title="Account settings" />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="profile-hero">
            <Avatar name={user!.full_name} size="large" />
            <div>
              <h2>{user!.full_name}</h2>
              <p>{t(user?.role === "admin" ? "Administrator" : "Teacher")}</p>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                if (supabase) {
                  const { error } = await supabase.rpc("update_own_profile", {
                    display_name: name,
                    phone_number: phone,
                    home_address: address,
                  });
                  if (error) throw error;
                  await refresh();
                } else {
                  setUser({ ...user!, full_name: name, phone, address });
                }
                notify(t("Saved successfully"));
              } catch (e: any) {
                notify(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>{t("Full name")}</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("Phone")}</span>
              <input
                type="tel"
                pattern="\+?[0-9 ()-]{7,20}"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label className="field">
              <span>{t("Address")}</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              {t("Update profile")}
            </button>
          </form>
        </section>
        <section className="panel settings-panel">
          <h2>{t("Security")}</h2>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) {
                notify("Email changes require a connected Supabase account.");
                return;
              }
              try {
                const { error } = await supabase.auth.updateUser(
                  { email },
                  { emailRedirectTo: window.location.origin + "/profile" },
                );
                if (error) throw error;
                notify(
                  "Confirmation links sent. Confirm the change from your email inbox.",
                );
              } catch (e: any) {
                notify(e.message);
              }
            }}
          >
            <label className="field">
              <span>{t("Email")}</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <button className="button secondary">
              <Mail size={16} />
              {t("Change email")}
            </button>
          </form>
          <hr />
          <h3>{t("Password")}</h3>
          <p className="muted">{t("Use at least 12 characters.")}</p>
          <Link className="button secondary" to="/reset-password">
            <KeyRound size={16} />
            {t("Change password")}
          </Link>
        </section>
      </div>
    </>
  );
}
export function Settings() {
  const { settings, saveSettings, t, notify } = useApp();
  const [value, setValue] = useState({ ...settings }),
    [tab, setTab] = useState("institution"),
    [busy, setBusy] = useState(false);
  const fields = [
    ["institution_name", "Institution name"],
    ["address", "Address"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["website", "Website"],
    ["currency", "Currency"],
    ["academic_year", "Academic year"],
    ["logo", "Institution logo"],
  ];
  return (
    <>
      <SectionTitle
        title="Settings"
        description="Make Aminzi feel like your academy."
      />
      <div className="tabs">
        {[
          ["institution", "Institution settings"],
          ["grading", "Grading system"],
          ["certificate", "Certificates"],
          ["providers", "Provider configuration"],
          ["permissions", "Permissions"],
        ].map(([id, name]) => (
          <button
            className={tab === id ? "active" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {t(name)}
          </button>
        ))}
      </div>
      <section className="panel settings-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const thresholds = Object.values(value.grades);
              if (
                thresholds.some(
                  (n) => !Number.isFinite(n) || n < 0 || n > 100,
                ) ||
                new Set(thresholds).size !== thresholds.length ||
                !thresholds.includes(0)
              )
                throw Error(
                  "Grade thresholds must be unique, between 0 and 100, and include 0.",
                );
              await saveSettings(value);
              notify(t("Saved successfully"));
            } catch (e: any) {
              notify(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {tab === "institution" && (
            <div className="form-grid">
              {fields.map(([key, label]) => (
                <label className="field" key={key}>
                  <span>{t(label)}</span>
                  <input
                    required={key === "institution_name" || key === "currency"}
                    type={
                      key === "email"
                        ? "email"
                        : ["website", "logo"].includes(key)
                          ? "url"
                          : "text"
                    }
                    placeholder={key === "logo" ? "https://…" : undefined}
                    value={String(value[key as keyof typeof value])}
                    onChange={(e) =>
                      setValue((v) => ({ ...v, [key]: e.target.value }))
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {tab === "grading" && (
            <div className="form-grid">
              {Object.entries(value.grades).map(([key, min]) => (
                <label className="field" key={key}>
                  <span>
                    {t("Grade")} {key} · {t("Minimum percentage")}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    required
                    value={min}
                    onChange={(e) =>
                      setValue((v) => ({
                        ...v,
                        grades: { ...v.grades, [key]: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          )}
          {tab === "certificate" && (
            <div className="form-grid">
              <label className="field">
                <span>{t("Certificate heading")}</span>
                <input
                  value={value.certificate_heading}
                  onChange={(e) =>
                    setValue((v) => ({
                      ...v,
                      certificate_heading: e.target.value,
                    }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("Authorized signature")}</span>
                <input
                  value={value.signature}
                  onChange={(e) =>
                    setValue((v) => ({ ...v, signature: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
          {tab === "providers" && (
            <>
              <div className="form-grid">
                {[
                  ["whatsapp_provider", "WhatsApp"],
                  ["sms_provider", "SMS"],
                ].map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <select
                      value={value[key as "whatsapp_provider"]}
                      onChange={(e) =>
                        setValue((v) => ({ ...v, [key]: e.target.value }))
                      }
                    >
                      <option value="twilio">Twilio</option>
                    </select>
                  </label>
                ))}
              </div>
              <div className="info-box provider-info">
                <h3>{t("Provider configuration")}</h3>
                <p>
                  {t(
                    "Provider credentials are stored only in Supabase Edge Function secrets.",
                  )}
                </p>
                <code>
                  TWILIO_ACCOUNT_SID
                  <br />
                  TWILIO_AUTH_TOKEN
                  <br />
                  TWILIO_SMS_FROM
                  <br />
                  TWILIO_WHATSAPP_FROM
                  <br />
                  APP_ORIGIN
                </code>
                <p>
                  {t(
                    "Configure email delivery in Supabase Authentication → SMTP settings.",
                  )}
                </p>
                <p>
                  {t("See README.md for setup and deployment instructions.")}
                </p>
              </div>
              <Link className="text-link" to="/communications">
                {t("Templates")}
                <ArrowRight size={15} />
              </Link>
            </>
          )}
          {tab === "permissions" && (
            <>
              <h2>{t("Permissions")}</h2>
              <p className="muted">
                {t(
                  "Teachers can access their assigned classes, attendance, results and their own payroll. Manage announcement permission and account status in Teachers.",
                )}
              </p>
              <Link to="/teachers" className="button secondary">
                {t("Teachers")}
                <ArrowRight size={16} />
              </Link>
            </>
          )}
          {tab !== "permissions" && (
            <div className="settings-footer">
              <button className="button" disabled={busy}>
                {busy ? (
                  <Loader2 size={17} className="spin" />
                ) : (
                  <Check size={17} />
                )}{" "}
                {t("Save settings")}
              </button>
            </div>
          )}
        </form>
      </section>
    </>
  );
}
