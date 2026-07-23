# T10 本地性能基线审计

日期：2026-07-23  
状态：只读审计完成；未删除资产、未改动首页实现、未进行网络或生产操作

## 范围与方法

本记录检查的是本地已存在的生产构建产物和当前源码引用图，而不是 Lighthouse 或线上真实传输瀑布图。

- 构建目录：`.next/BUILD_ID` 与 `.next/build-manifest.json` 的修改时间均为 2026-07-23 12:17（本地时区）。
- 静态资产：用 `du -sk`、`find` 和 `stat` 统计 `public/`；Next.js 的 `public/` 文件只有在浏览器请求其 URL 时才会传输，目录总大小不能当作首页首屏下载量。
- 首页客户端：以 `.next/server/app/page_client-reference-manifest.js` 的 `/page` 条目和 `.next/static/chunks/` 文件大小为准；数值为未压缩文件大小，gzip 仅作可比较的本地近似，不等同于 CDN 的实际 Content-Encoding、缓存命中或用户网络条件。
- 可达性：从当前 `app/page.tsx` 开始，使用静态 import 搜索，不把未接入页面的组件或资产计为已加载。

## 实测基线

| 项目 | 本地证据 | 结论 |
| --- | ---: | --- |
| `public/` 总目录 | 26,040 KiB，483 个文件 | 静态资产库存较大；不能由此推导首页传输量。 |
| KayKit 目录 | 9,336 KiB，452 个文件 | 是最大的多格式资产集合之一，主要含 `gltf`、`bin`、`obj`、`fbx` 与两张示例图片。 |
| `three_glb/` | 12,680 KiB，9 个文件 | 存在多份较大 GLB，但当前首页入口没有引用它们。 |
| `original_205862/` | 3,560 KiB | 仅在旧模型常量的 `mysteryModel` 中出现，当前首页入口不可达。 |
| 首页清单列出的 6 个客户端 chunk | 201,192 bytes / 196.5 KiB | 包括页面、导航及其共享客户端依赖；不含 Next 引导/runtime 所需的其它共享文件，不能称为完整首屏传输。 |
| 上述 6 个 chunk 的本地 gzip 总和 | 75,020 bytes / 73.3 KiB | 仅用于后续改动前后的稳定比较。 |
| 首页 CSS | layout 64,670 bytes、page 22,617 bytes；gzip 后分别 12,543、4,998 bytes | 当前构建中有两份首页所需 CSS 资源。 |
| 所有构建 JS 文件 | 1,436,151 bytes / 1.4 MiB | 是所有路由构建产物的库存，不是 `/` 的请求预算。 |

最大的单个静态文件（未压缩）包括：

| 路径 | 大小 |
| --- | ---: |
| `public/three_glb/PrimaryIonDrive.glb` | 5,800,408 bytes |
| `public/three_glb/LittlestTokyo.glb` | 4,133,072 bytes |
| `public/original_205862/ef6202c859fe4f27bd2eaae01361d0ef.glb` | 3,644,092 bytes |
| `public/three_glb/Soldier.glb` | 2,160,468 bytes |
| `public/KayKit_Prototype_Bits_1.1_FREE/KayKit_Prototype_Bits_1.1_FREE/sample.png` | 1,408,511 bytes |
| `public/KayKit_Prototype_Bits_1.1_FREE/KayKit_Prototype_Bits_1.1_FREE/contents.png` | 1,203,876 bytes |

## 当前首页的可达性结论

1. 当前 `app/page.tsx` 只渲染 `Navbar`、`YouTubeStatusAlert` 和 `TasteHomepage`。`TasteHomepage` 静态导入 GSAP、`@gsap/react` 与 `ScrollTrigger`，因此首页的动效代码是当前可达客户端成本的一部分。
2. 当前 `TasteHomepage` 未导入 `GlbDecoration`、`GLB_MODELS`、`@react-three/fiber` 或 `three`。`/page` 的 client-reference manifest 也列出 `components/home/taste-homepage.tsx`，未列出 `components/glb-decoration.tsx`。据此，不能把 3D 模型文件或 React Three 代码归因给当前首页的请求路径。
3. `GlbDecoration` 和 `GLB_MODELS` 目前只被 `components/home/hero-section.tsx` 与 `components/home/why-section.tsx` 引用；这两个旧首页 section 不被当前 `app/page.tsx` 或 `TasteHomepage` 导入。它们仍可能被未来页面重新接入，因此本审计不删除任何文件。
4. `GLB_MODELS` 中列出的大多数键（如 `PrimaryIonDrive`、`LittlestTokyo`、`Soldier`、`Horse`、`SittingBox` 和 `mysteryModel`）在页面组件中没有额外引用。此结论是静态代码引用，不代表服务器目录、历史构建或未来运行时 URL 一定不会使用它们。
5. 根布局对所有页面静态加入 Fontshare 的 `preconnect` 和远程样式表；这是一条外部字体依赖。当前本地审计未请求网络，因此没有记录字体实际字节数、缓存状态或失败回退行为。

## 本机浏览器资产复核

在本机 `http://localhost:3000/` 的当前首页渲染状态中，浏览器资产清单共观察到 16 项文件资产（7 个脚本、3 个样式表、1 个字体、4 个图片和 1 个其它资源）及 21 个内联 SVG；清单中没有 `three_glb`、KayKit、`.glb` 或 `.gltf` 请求。该结果与构建清单的不可达性分析一致，但仍只是本机默认页面状态：不等同于慢网、缓存冷启动、移动设备或生产 CDN 瀑布。

## 风险排序与安全下一步

1. **先获得真实请求瀑布，而不是清理资产。** 在独立的本地生产启动实例，以桌面和 390px 移动视口记录 `/` 的 Network 导出：请求 URL、传输字节、压缩后大小、缓存头、LCP 候选和长任务。然后将这份数据与本记录的 73.3 KiB chunk 对照；不把全目录 26,040 KiB 误报为首屏流量。
2. **给首页写明确预算和回归检查。** 建议先用“首页路由自身选定 chunk gzip <= 90 KiB、首页 CSS gzip <= 20 KiB”作为临时本地回归线；该预算不含 Next runtime、字体、API、图片或 CDN 协商，须在真实瀑布数据到位后调整。
3. **评估动效的延迟加载与降级。** `TasteHomepage` 的 GSAP/ScrollTrigger 为首屏同包静态依赖；在真实慢网或低端机观测到主线程/LCP 压力后，再评估将非首屏滚动动效按需加载或在低性能条件下禁用。现有 reduced-motion 分支已经避免部分动效，但这不是 CPU 预算证据。
4. **在删除前建立资产所有权。** 对 `public/three_glb/` 和 KayKit 多格式源文件，先以全仓静态搜索、部署静态目录清单和一次受控预发布请求证据确认“没有任何可达 URL 请求”后，再单独提交可回滚的资产清理。尤其不要仅因旧首页暂不可达就删除模型。
5. **审查字体策略。** 确认 Fontshare 的 `font-display`、中文字体回退、缓存头和外部服务失败时的文本可读性；若真实瀑布显示它影响首屏，再选择自托管或系统字体回退方案。

## 未覆盖与发布边界

- 没有运行 Lighthouse、WebPageTest、浏览器 DevTools 性能录制或任何生产 URL 请求，因此没有 FCP、LCP、INP、CLS、真实网络传输、缓存命中或设备耗电结论。
- 没有改动当前用户正在进行的 Taste 首页设计文件、3D 组件、公共资产或 `CODEX_EXECUTION_TODO.md`。
- 本地构建文件大小与质量门禁通过不等同于生产性能验收；上线前仍需在目标设备、目标网络和真实 CDN 配置下重新测量。
