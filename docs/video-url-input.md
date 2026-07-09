# video-url-input.tsx

**文件路径**：`components/video-url-input.tsx`

## 功能摘要

YouTube 视频链接输入表单，提交后调用 `/api/video-info` 验证链接并跳转到视频分析页面。

## 关键实现细节

- **状态**：url（输入值）、error（错误信息）、loading（提交中）
- **提交流程**：POST `/api/video-info`，成功后 `router.push(/video/${videoId})`
- **错误处理**：API 返回错误或网络异常时显示红色错误信息
- **UI**：圆角大输入框（h-16）+ "开始解析" 按钮，加载中显示 Loader2 旋转图标

## 依赖关系

- `lucide-react`（ArrowRight、Loader2）
- `next/navigation`（useRouter）
- `@/components/ui/button`、`@/components/ui/input`
- `@/lib/types`（JsonResponse、VideoMetadata）

## 关联模块

- `hero-section.tsx`、`mobile-home.tsx` 中嵌入使用
