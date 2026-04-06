import Database from "better-sqlite3";
import { LibsqlError } from "@libsql/core/api";

/** Rozpoznaje kolizję UNIQUE niezależnie od sterownika (better-sqlite3 / libsql). */
export function isUniqueConstraintError(e: unknown): boolean {
  if (e instanceof Database.SqliteError && e.code === "SQLITE_CONSTRAINT_UNIQUE") {
    return true;
  }
  if (e instanceof LibsqlError) {
    const ext = e.extendedCode ?? "";
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE" || ext.includes("UNIQUE") || ext.includes("PRIMARYKEY")) {
      return true;
    }
  }
  return false;
}
