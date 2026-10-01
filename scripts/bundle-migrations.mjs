import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const directory = new URL("../supabase/migrations/", import.meta.url);
const files = readdirSync(directory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const content = files
  .map(
    (name) =>
      `\n-- SOURCE: ${name}\n` +
      readFileSync(new URL(name, directory), "utf8")
        .replace(/^begin;\r?$/gm, "")
        .replace(/^commit;\r?$/gm, ""),
  )
  .join("\n");
writeFileSync(
  new URL("../supabase/all-migrations.sql", import.meta.url),
  `-- AMINZI ACADEMY: COMPLETE DATABASE INSTALLATION\n-- Run this entire file ONCE in a fresh Supabase project's SQL Editor.\n-- Includes ${files.length} ordered migrations in one atomic transaction.\n-- If using supabase db push, use the individual migration files instead.\n-- Do not run both installation methods. No passwords or API keys are included.\nbegin;\n${content}\ncommit;\n`,
);
console.log(
  `Bundled ${files.length} migrations into supabase/all-migrations.sql`,
);
