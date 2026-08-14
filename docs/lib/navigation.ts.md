# lib/navigation.ts

## 文件路径
`lib/navigation.ts`

## 功能摘要
底部标签栏导航项配置。

## 关键实现细节
1. `NavItem` - 导航项接口
   - id: 导航 ID
   - label/labelEn: 导航名称
   - href: 路由路径
   - iconName: 图标名称
   - authRequired: 是否需要登录
   - matchPattern: 路径匹配函数

2. `MAIN_NAV_ITEMS` - 主导航项数组
   - home: 首页（不需要登录）
   - history: 历史记录（需要登录）
   - vocabulary: 单词本（需要登录）
   - profile: 我的（需要登录）

## 依赖关系
- 无外部依赖

## 关联的功能模块
- 底部导航栏组件