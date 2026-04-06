import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      walk(p, acc);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".d.ts")) {
      acc.push(p);
    }
  }
  return acc;
}

const root = process.cwd();
const files = walk(path.join(root, "app")).concat(walk(path.join(root, "lib")));

for (const f of files) {
  if (f.includes("db.ts") && f.endsWith("lib\\db.ts")) continue;
  let s = fs.readFileSync(f, "utf8");
  const orig = s;
  s = s.replace(/const db = getDb\(\);/g, "const db = await getDb();");
  s = s.replace(/(?<!await )db\.prepare\(/g, "await db.prepare(");
  if (s !== orig) {
    fs.writeFileSync(f, s);
    console.log("updated", path.relative(root, f));
  }
}
