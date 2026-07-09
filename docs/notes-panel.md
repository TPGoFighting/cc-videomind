# notes-panel.tsx

**文件路径**：`components/notes-panel.tsx`

## 功能摘要

视频笔记面板，支持登录用户创建、查看、删除笔记，非登录用户可输入但不可保存。

## 关键实现细节

- **Props**：`videoId`、`compact?`（紧凑模式，无 Card 外壳）
- **CRUD 操作**：
  - 获取：`GET /api/notes?videoId=xxx`
  - 创建：`POST /api/notes`，body 含 videoId 和 body
  - 删除：`DELETE /api/notes`，body 含 noteId
- **认证检查**：`useAuth()` 获取登录状态，未登录时禁用输入和保存按钮
- **状态管理**：notes 数组、body（输入框）、saving、deleting（Set 跟踪删除中状态）
- **日期格式**：`formatDate` 使用 `toLocaleDateString("zh-CN")` 格式化

## 依赖关系

- `lucide-react`（Loader2、NotebookPen、Save、Trash2）
- `@/components/ui/button`、`@/components/ui/card`、`@/components/ui/textarea`
- `@/components/auth-context`（useAuth）
- `@/lib/types`（JsonResponse、UserNote）

## 关联模块

- `sidebar-tabs.tsx`、`mobile-video-tabs.tsx` 中作为标签页内容
