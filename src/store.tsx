import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Data, Entity, Row } from "./model";
import { uid, today, modules } from "./model";
import { createSeed, defaultSettings, demoAdmin } from "./seed";
import { translate } from "./i18n";
import type { Language } from "./i18n";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
let configurationError = "";
function initializeClient() {
  if (import.meta.env.DEV && import.meta.env.MODE === "demo") return null;
  if (!url && !key) return null;
  if (!url || !key) {
    configurationError = "Both Supabase environment variables are required.";
    return null;
  }
  try {
    let role = "";
    if (key.startsWith("eyJ")) {
      try {
        role = JSON.parse(
          atob(key.split(".")[1].replaceAll("-", "+").replaceAll("_", "/")),
        ).role;
      } catch {
        throw Error("Invalid Supabase key.");
      }
    }
    if (key.startsWith("sb_secret_") || role === "service_role")
      throw Error(
        "Use the Supabase public anon or publishable key in VITE_SUPABASE_ANON_KEY. Never use a service-role key in the browser.",
      );
    return createClient(url, key);
  } catch (e) {
    configurationError =
      e instanceof Error ? e.message : "Invalid Supabase configuration.";
    return null;
  }
}
export const supabase = initializeClient();
const entities: Entity[] = [
  "students",
  "teachers",
  "courses",
  "classes",
  "subjects",
  "attendance",
  "exams",
  "results",
  "fees",
  "payments",
  "payroll",
  "certificates",
  "announcements",
  "templates",
  "messages",
  "activity",
  "student_groups",
  "certificate_templates",
];
const empty = () =>
  Object.fromEntries(entities.map((e) => [e, []])) as unknown as Data;
const storageKey = "aminzi-demo-v1";
const loadDemo = () => {
  try {
    const value = localStorage.getItem(storageKey);
    return value
      ? ({ ...empty(), ...JSON.parse(value) } as Data)
      : createSeed();
  } catch {
    return createSeed();
  }
};
type Store = {
  data: Data;
  user: Row | null;
  settings: typeof defaultSettings;
  language: Language;
  setLanguage: (l: Language) => void;
  t: (s: string) => string;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  save: (e: Entity, r: Row) => Promise<Row>;
  remove: (e: Entity, id: string) => Promise<void>;
  saveAttendance: (rows: Row[]) => Promise<void>;
  saveSettings: (v: typeof defaultSettings) => Promise<void>;
  loginDemo: (role: string) => void;
  logout: () => Promise<void>;
  notify: (s: string) => void;
  toast: string;
  setUser: (u: Row | null) => void;
  updateTeacher: (id: string, action: string, payload?: any) => Promise<any>;
};
const Context = createContext<Store>(null!);
export const useApp = () => useContext(Context);
export function Provider({ children }: { children: ReactNode }) {
  const [raw, setRaw] = useState<Data>(() => (supabase ? empty() : loadDemo()));
  const [user, setUser] = useState<Row | null>(null);
  const [settings, setSettings] = useState(() => {
    try {
      return {
        ...defaultSettings,
        ...JSON.parse(localStorage.getItem("aminzi-settings") || "{}"),
      };
    } catch {
      return defaultSettings;
    }
  });
  const [language, setLanguage] = useState<Language>(
    (localStorage.getItem("aminzi-language") as Language) || "en",
  );
  const [loading, setLoading] = useState(!!supabase);
  const [error, setError] = useState(configurationError);
  const [toast, setToast] = useState("");
  const notify = (s: string) => setToast(translate(s, language));
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    localStorage.setItem("aminzi-language", language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "en" ? "ltr" : "rtl";
  }, [language]);
  useEffect(() => {
    if (!supabase) localStorage.setItem(storageKey, JSON.stringify(raw));
  }, [raw]);
  const refresh = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setRaw(empty());
        return;
      }
      const { data: profile, error: pe } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();
      if (pe) throw pe;
      if (profile.status !== "active")
        throw Error("Your account is disabled. Contact your administrator.");
      setUser({ ...profile, email: authUser.email });
      const allowed = entities.filter(
        (e) =>
          profile.role === "admin" ||
          !["fees", "payments", "messages", "templates", "activity"].includes(
            e,
          ),
      );
      const loaded = await Promise.all(
        allowed.map(async (e) => {
          const rows: Row[] = [];
          for (let page = 0; ; page++) {
            const { data, error } = await supabase!
              .from(e)
              .select("*")
              .order("id")
              .range(page * 1000, (page + 1) * 1000 - 1);
            if (error) throw error;
            rows.push(...data);
            if (data.length < 1000) break;
          }
          return [e, rows] as const;
        }),
      );
      setRaw({ ...empty(), ...Object.fromEntries(loaded) });
      const { data: s, error: se } = await supabase
        .from("settings")
        .select("value")
        .eq("id", "institution")
        .single();
      if (se && se.code !== "PGRST116") throw se;
      if (s) setSettings({ ...defaultSettings, ...s.value });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!supabase) return;
    void refresh();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setTimeout(() => void refresh(), 0);
    });
    return () => subscription.unsubscribe();
  }, [refresh]);
  const audit = (
    data: Data,
    action: string,
    entity: string,
    id: string,
  ): Data => ({
    ...data,
    activity: [
      {
        id: uid(),
        created_at: new Date().toISOString(),
        actor: user?.full_name || "Administrator",
        action,
        resource: entity,
        record_id: id,
      },
      ...data.activity,
    ].slice(0, 1000),
  });
  const updateTeacher = async (
    id: string,
    action: string,
    payload: any = {},
  ) => {
    if (!supabase) {
      if (user?.role !== "admin") throw Error("Access denied");
      if (action === "reset_password" || action === "temporary_password") {
        setRaw((d) =>
          audit(
            {
              ...d,
              teachers: d.teachers.map((t) =>
                t.id === id ? { ...t, must_change_password: true } : t,
              ),
            },
            action,
            "teachers",
            id,
          ),
        );
        return {
          message:
            "Demo: password reset recorded. No credentials were created.",
        };
      }
      return {};
    }
    const { data, error } = await supabase.functions.invoke("manage-teacher", {
      body: { id, action, ...payload },
    });
    if (error) {
      if (error.context instanceof Response) {
        const details = await error.context
          .clone()
          .json()
          .catch(() => null);
        throw Error(details?.error || details?.message || error.message);
      }
      throw Error(
        "Cannot reach the manage-teacher Edge Function. Deploy it to this Supabase project and check APP_ORIGIN in Edge Function secrets and your network connection.",
      );
    }
    if (data?.error) throw Error(data.error);
    await refresh();
    return data;
  };
  const save = async (entity: Entity, row: Row) => {
    const copy = { ...row };
    delete copy.created_at;
    for (const f of modules[entity]?.fields || []) {
      if ((f.type === "date" || f.type === "relation") && copy[f.key] === "")
        copy[f.key] = null;
    }
    const existing = raw[entity].some((r) => r.id === copy.id);
    if (!copy.id) copy.id = uid();
    if (
      user?.role !== "admin" &&
      !["attendance", "results", "announcements"].includes(entity)
    )
      throw Error("Access denied");
    if (entity === "messages") {
      copy.status = "draft";
      copy.created_at = new Date().toISOString();
    }
    if (
      entity === "teachers" &&
      Array.isArray(copy.class_ids) &&
      raw.classes.some(
        (c) => c.teacher_id === copy.id && !copy.class_ids.includes(c.id),
      )
    )
      throw Error(
        "Reassign classes to another teacher before removing them from this teacher",
      );
    if (supabase) {
      if (entity === "teachers") {
        const result = await updateTeacher(
          copy.id,
          existing ? "update" : "create",
          { teacher: copy },
        );
        copy.id = result.id;
        copy.email = result.email;
      } else {
        const { error } = await supabase.from(entity).upsert(copy);
        if (error) throw error;
        await refresh();
      }
    } else {
      if (entity === "teachers" && !existing) {
        const base =
          String(copy.full_name)
            .toLowerCase()
            .normalize("NFKD")
            .replace(/[^a-z0-9 ]/g, "")
            .trim()
            .replace(/\s+/g, ".") || "teacher";
        let email = base + "@aminzi.af";
        let n = 2;
        while (raw.teachers.some((t) => t.email === email))
          email = base + "." + n++ + "@aminzi.af";
        copy.email = email;
        copy.must_change_password = true;
      }
      setRaw((d) => {
        let next = {
          ...d,
          [entity]: existing
            ? d[entity].map((r) => (r.id === copy.id ? copy : r))
            : [copy, ...d[entity]],
        };
        if (entity === "students" && !existing) {
          next.fees = [
            ...d.fees,
            {
              id: uid(),
              student_id: copy.id,
              total: Number(
                d.courses.find((c) => c.id === copy.course_id)?.fee || 0,
              ),
            },
          ];
        }
        if (entity === "teachers") {
          const selected = copy.class_ids as string[] | undefined;
          if (selected)
            next.classes = d.classes.map((c) =>
              selected.includes(c.id) ? { ...c, teacher_id: copy.id } : c,
            );
          const selectedCourses = copy.course_ids as string[] | undefined;
          if (selectedCourses)
            next.courses = d.courses.map((c) =>
              selectedCourses.includes(c.id)
                ? { ...c, teacher_id: copy.id }
                : c.teacher_id === copy.id
                  ? { ...c, teacher_id: null }
                  : c,
            );
        }
        return audit(next, existing ? "updated" : "created", entity, copy.id);
      });
    }
    return copy;
  };
  const remove = async (entity: Entity, id: string) => {
    if (user?.role !== "admin") throw Error("Access denied");
    if (entity === "teachers")
      throw Error("Deactivate teacher accounts to preserve their records.");
    if (supabase) {
      const { error } = await supabase.from(entity).delete().eq("id", id);
      if (error) throw error;
      await refresh();
    } else {
      const refs: Partial<Record<Entity, string[]>> = {
        students: ["student_id"],
        teachers: ["teacher_id"],
        courses: ["course_id"],
        classes: ["class_id"],
        exams: ["exam_id"],
        subjects: ["subject_id"],
      };
      if (
        refs[entity] &&
        entities.some(
          (e) =>
            e !== entity &&
            raw[e].some((r) => refs[entity]!.some((k) => r[k] === id)),
        )
      )
        throw Error("This record has linked records. Deactivate it instead.");
      setRaw((d) =>
        audit(
          { ...d, [entity]: d[entity].filter((r) => r.id !== id) },
          "deleted",
          entity,
          id,
        ),
      );
    }
  };
  const saveAttendance = async (rows: Row[]) => {
    if (supabase) {
      const { error } = await supabase
        .from("attendance")
        .upsert(rows, { onConflict: "student_id,class_id,date" });
      if (error) throw error;
      await refresh();
    } else
      setRaw((d) =>
        audit(
          {
            ...d,
            attendance: [
              ...d.attendance.filter(
                (a) =>
                  !rows.some(
                    (r) =>
                      r.student_id === a.student_id &&
                      r.class_id === a.class_id &&
                      r.date === a.date,
                  ),
              ),
              ...rows,
            ],
          },
          "recorded",
          "attendance",
          rows[0]?.class_id || "",
        ),
      );
  };
  const saveSettings = async (value: typeof defaultSettings) => {
    if (user?.role !== "admin") throw Error("Access denied");
    if (supabase) {
      const { error } = await supabase
        .from("settings")
        .upsert({ id: "institution", value });
      if (error) throw error;
    } else localStorage.setItem("aminzi-settings", JSON.stringify(value));
    setSettings(value);
  };
  const loginDemo = (role: string) =>
    setUser(
      role === "admin"
        ? demoAdmin
        : { ...raw.teachers[0], role: "teacher", must_change_password: false },
    );
  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
  };
  let data = raw;
  if (user?.role === "teacher" && !supabase) {
    const classes = raw.classes.filter((c) => c.teacher_id === user.id),
      classIds = classes.map((c) => c.id),
      students = raw.students.filter((s) => classIds.includes(s.class_id)),
      studentIds = students.map((s) => s.id),
      courses = raw.courses.filter((c) =>
        classes.some((cl) => cl.course_id === c.id),
      ),
      courseIds = courses.map((c) => c.id),
      exams = raw.exams.filter((e) => classIds.includes(e.class_id));
    data = {
      ...empty(),
      teachers: raw.teachers.filter((t) => t.id === user.id),
      classes,
      students,
      courses,
      subjects: raw.subjects.filter((s) => courseIds.includes(s.course_id)),
      attendance: raw.attendance.filter((a) => classIds.includes(a.class_id)),
      exams,
      results: raw.results.filter((r) => studentIds.includes(r.student_id)),
      payroll: raw.payroll.filter((p) => p.teacher_id === user.id),
      certificates: raw.certificates.filter((c) =>
        studentIds.includes(c.student_id),
      ),
      student_groups: raw.student_groups.filter((g) =>
        classIds.includes(g.class_id),
      ),
      certificate_templates: raw.certificate_templates.filter(
        (template) => template.status === "active",
      ),
      announcements: raw.announcements.filter(
        (a) =>
          (a.audience === "all" ||
            a.audience === "teachers" ||
            (a.audience === "students_group" && (a.class_id || a.course_id))) &&
          (!a.class_id || classIds.includes(a.class_id)) &&
          (!a.course_id || courseIds.includes(a.course_id)),
      ),
    };
  }
  return (
    <Context.Provider
      value={{
        data,
        user,
        settings,
        language,
        setLanguage,
        t: (s) => translate(s, language),
        loading,
        error,
        refresh,
        save,
        remove,
        saveAttendance,
        saveSettings,
        loginDemo,
        logout,
        notify,
        toast,
        setUser,
        updateTeacher,
      }}
    >
      {children}
    </Context.Provider>
  );
}
