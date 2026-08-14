import { z } from "zod";

export const ACCOUNT_DELETION_CONFIRMATION_TEXT = "删除我的账户";
export const ACCOUNT_DELETION_GRACE_DAYS = 7;

export const AccountDeletionRequestSchema = z.object({
  password: z.string().min(8).max(128),
  confirmation: z.literal(ACCOUNT_DELETION_CONFIRMATION_TEXT),
}).strict();

export const AccountDeletionStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "cancelled",
  "failed",
]);

export type AccountDeletionStatus = z.infer<typeof AccountDeletionStatusSchema>;

export const ACCOUNT_DELETION_SCOPE = {
  deletes: [
    "登录会话与个人 AI 配置",
    "视频历史、笔记、收藏词句与复习记录",
    "待处理任务和产品分析同意状态",
  ],
  retains: [
    "为防止欺诈和履行财务义务而最小化保留的付款状态与不可逆摘要",
    "不含邮箱和学习正文的账户删除处理记录",
    "在保留期内已经去标识化的产品聚合事件",
  ],
} as const;

export function getAccountDeletionProcessAfter(now = new Date()): Date {
  return new Date(now.getTime() + ACCOUNT_DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000);
}

export function canCancelAccountDeletion(input: {
  status: AccountDeletionStatus;
  processAfter: Date;
  now?: Date;
}): boolean {
  return input.status === "pending" && (input.now ?? new Date()) < input.processAfter;
}
