# glb-decoration.tsx

**文件路径**：`components/glb-decoration.tsx`

## 功能摘要

Three.js 3D 模型装饰组件，加载 GLB/GLTF 格式的 3D 模型并在 Canvas 中渲染，支持自转、上下浮动、鼠标跟随视差效果。

## 关键实现细节

- **Props**：`model`（模型 URL）、`targetSize`（目标尺寸，默认 2.2）、`rotateSpeed`、`floatAmount`、`floatSpeed`、`mouseFollow`、`initialRotationY`
- **环境光照**：`EnvironmentLight` 用 PMREMGenerator 生成暗色调环境贴图，品牌蓝 + 品牌紫双方向光
- **模型加载**：GLTFLoader 解析 ArrayBuffer，自动计算包围盒缩放至 targetSize
- **动画循环**（useFrame）：
  - 首帧自动居中定位
  - 持续自转（rotateSpeed）
  - sin 函数驱动上下浮动
  - 鼠标位置驱动旋转视差（smooth lerp）
- **Canvas 配置**：ACESFilmic 色调映射、指数雾、DPR 1-1.5、性能降级 min 0.3
- **导出 GLB_MODELS**：从 `@/lib/glb-models` 重导出模型 URL 常量

## 依赖关系

- `@react-three/fiber`（Canvas、useFrame、useThree）
- `three`（THREE、GLTFLoader、PMREMGenerator）
- `react`（Suspense、useRef、useEffect、useState）

## 关联模块

- `hero-section.tsx`（parrot 模型装饰）
- `why-section.tsx`（stork、flamingo、parrot、table 模型场景）
