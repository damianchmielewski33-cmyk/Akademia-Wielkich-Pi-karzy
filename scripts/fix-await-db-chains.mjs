import fs from "fs";
import path from "path";

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
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
  if (f.endsWith(`lib${path.sep}db.ts`)) continue;
  let s = fs.readFileSync(f, "utf8");
  const orig = s;
  // const x = db \n .prepare(  →  const x = await db \n .prepare(
  s = s.replace(/(const \w+ = )db(\s*\n\s*\.prepare\()/g, "$1await db$2");
  // const x = db \n .prepare — already done
  if (s !== orig) fs.writeFileSync(f, s);
}
console.log("done");
