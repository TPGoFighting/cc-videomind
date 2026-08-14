/**
 * 本地模式开关：设置 LOCAL_MODE=1（服务端）或 NEXT_PUBLIC_LOCAL_MODE=1（客户端/构建期）
 * 后，应用跳过远程 auth / quota / cache，改为本地存储（由数据层 Agent 用 sql.js 实现）。
 */
export function isLocalMode(): boolean {
  return process.env.LOCAL_MODE === "1" || process.env.NEXT_PUBLIC_LOCAL_MODE === "1";
}
