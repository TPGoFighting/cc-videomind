/**
 * 执行 Supabase 数据库迁移
 *
 * 由于当前环境 Node.js dns 模块受限，使用 curl 风格的 TCP 直连
 * 替代方案：通过 Next.js API 路由执行迁移
 *
 * 用法：node scripts/run-migration.mjs <sql文件路径>
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { config } from "dotenv";

config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("缺少 Supabase 环境变量");
  process.exit(1);
}

const ref = new URL(supabaseUrl).hostname.split(".")[0];

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error("用法: node scripts/run-migration.mjs <sql文件路径>");
  process.exit(1);
}

const sql = readFileSync(sqlFile, "utf-8");
console.log(`执行迁移: ${sqlFile}`);
console.log(`项目: ${ref}`);

// 方案：使用 Supabase Management API 执行 SQL
// 需要 Supabase Personal Access Token (PAT)
// 创建 PAT: https://supabase.com/dashboard/account/tokens
// 然后设置环境变量 SUPABASE_ACCESS_TOKEN

const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

if (!accessToken) {
  console.log();
  console.log("=".repeat(60));
  console.log("⚠️  未设置 SUPABASE_ACCESS_TOKEN 环境变量");
  console.log("=".repeat(60));
  console.log();
  console.log("需要通过 Supabase Management API 执行迁移。");
  console.log("请执行以下步骤：");
  console.log();
  console.log("1. 打开 https://supabase.com/dashboard/account/tokens");
  console.log("2. 生成一个新的 Personal Access Token");
  console.log("3. 设置环境变量：");
  console.log('   set SUPABASE_ACCESS_TOKEN="your-token-here"');
  console.log("4. 重新运行此脚本");
  console.log();
  console.log("或直接在 Supabase SQL Editor 中执行以下 SQL：");
  console.log("   https://supabase.com/dashboard/project/" + ref + "/sql/new");
  console.log();
  console.log("--- SQL 内容 ---");
  console.log(sql);
  console.log("--- 结束 ---");
  process.exit(0);
}

// 使用 Management API 执行 SQL
console.log("通过 Supabase Management API 执行迁移...\n");

try {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (response.ok) {
    console.log("✅ 迁移执行成功\n");
    // 验证表结构
    const verify = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_results_cache' ORDER BY ordinal_position;`,
        }),
      }
    );

    if (verify.ok) {
      const columns = await verify.json();
      if (Array.isArray(columns) && columns.length > 0) {
        console.log("ai_results_cache 表结构:");
        for (const col of columns) {
          console.log(`  ${col.column_name}: ${col.data_type}`);
        }
      }
    }
  } else {
    const err = await response.text();
    console.error("❌ 迁移失败:", response.status, err);
    process.exit(1);
  }
} catch (error) {
  console.error("❌ 请求失败:", error instanceof Error ? error.message : error);
  process.exit(1);
}
