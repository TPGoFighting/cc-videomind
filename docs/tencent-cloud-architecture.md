# 腾讯云自托管架构

Teach Player 的生产数据与认证不再依赖 Supabase。生产环境运行在腾讯云主机上，由 Next.js 服务直接连接该主机的 PostgreSQL。

## 架构

```text
浏览器
  └─ HTTPS / Nginx
       └─ Teach Player（Next.js + PM2）
            ├─ PostgreSQL（腾讯云主机 Docker 容器中的独立 teachplayer 数据库）
            ├─ 认证：邮箱密码 + HttpOnly Cookie Session
            ├─ 视频缓存、历史、笔记、单词、句子、复习、打卡
            └─ AI 与字幕提供方
```

数据库使用独立的 `teachplayer` 数据库及 `teachplayer_app` 最小权限账号；它可以与同一腾讯云主机上的其他 PostgreSQL 数据库共用实例，但不会共用表或账号。

## 必需环境变量

```env
# 只在服务器端使用；不得暴露到 NEXT_PUBLIC_ 前缀变量
DATABASE_URL=postgresql://teachplayer_app:<password>@127.0.0.1:5432/teachplayer
AUTH_SESSION_SECRET=<at-least-32-bytes-random-secret>

# 可选：逗号分隔的初始管理员邮箱
ADMIN_EMAIL=owner@example.com
```

`DATABASE_URL` 和 `AUTH_SESSION_SECRET` 仅应保存在服务器的 `.env.local` 或密钥管理服务中，不能提交到 Git。

## 认证模型

- 注册密码使用 Node.js `scrypt` + 随机盐存储。
- 登录成功后服务器生成随机会话令牌；数据库仅保存其 SHA-256 哈希。
- 浏览器只收到 `HttpOnly`、`SameSite=Lax` 的 Cookie，生产环境同时启用 `Secure`。
- 会话有效期为 30 天；退出登录会删除服务端会话。

该版本不发送验证邮件，也不依赖第三方 OAuth。若后续需要邮箱验证、重置密码或 OAuth，应接入腾讯云邮件服务或企业现有身份提供方，而不是恢复 Supabase。

## 数据模型

首次访问数据库时，应用会幂等创建以下表：

- `app_users`、`app_sessions`
- `video_analyses`、`user_videos`
- `user_notes`、`user_vocabulary`、`user_quotes`
- `user_word_reviews`、`user_checkins`

所有用户数据查询都显式带 `user_id` 条件；不要依赖前端传递的用户 ID。

## 运维

### 备份

每天至少保留一份逻辑备份：

```bash
docker exec <postgres-container> sh -c 'pg_dump -U "$POSTGRES_USER" teachplayer' \
  > /var/backups/teachplayer-$(date +%F).sql
```

备份目录应同步到腾讯云 COS 或另一台主机。恢复前先在隔离环境验证 SQL 文件。

### 发布前检查

```bash
npm run typecheck
npm run build
```

发布后至少验证：注册、登录、`/api/me`、笔记增删、单词/句子收藏、复习与打卡，以及视频解析。

## Supabase 退役

旧的 `lib/supabase/` 与历史迁移文件只用于兼容尚未迁移的非核心功能。不要为新功能增加 Supabase 依赖；新服务端数据访问应通过 `lib/tencent-db.ts`，认证应通过 `lib/tencent-auth.ts`。
