"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export { GLB_MODELS } from "@/lib/glb-models";

interface GlbDecorationProps {
  model: string;
  className?: string;
  style?: React.CSSProperties;
  /** 模型在视口中的目标尺寸（世界单位），默认 2.2 */
  targetSize?: number;
  rotateSpeed?: number;
  floatAmount?: number;
  floatSpeed?: number;
  mouseFollow?: number;
  /** 初始 Y 轴旋转偏移（弧度），用于调整模型朝向 */
  initialRotationY?: number;
}

// ═══════════════════════════════════════════════════════════════
// 环境贴图 — 暗色调工作室灯光，匹配网站黑底 + 蓝紫强调色
// ═══════════════════════════════════════════════════════════════
function EnvironmentLight() {
  const { gl, scene } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);

    const envScene = new THREE.Scene();

    // 暗色天空球（匹配黑底页面）
    const skyGeo = new THREE.SphereGeometry(50, 32, 32);
    const skyMat = new THREE.MeshBasicMaterial({ color: "#0a0a14", side: THREE.BackSide });
    envScene.add(new THREE.Mesh(skyGeo, skyMat));

    // 品牌蓝方向光 — 模拟主光源
    const blueLight = new THREE.DirectionalLight("#3388cc", 2.0);
    blueLight.position.set(5, 4, 5);
    envScene.add(blueLight);

    // 品牌紫方向光 — 模拟补光
    const purpleLight = new THREE.DirectionalLight("#6644aa", 1.2);
    purpleLight.position.set(-5, 1, -3);
    envScene.add(purpleLight);

    const envMap = pmrem.fromScene(envScene, 0.04).texture;
    // eslint-disable-next-line react-hooks/immutability -- R3F 中直接修改 scene 是标准做法
    scene.environment = envMap;
    scene.background = null;

    return () => {
      envMap.dispose();
      pmrem.dispose();
      skyGeo.dispose();
      skyMat.dispose();
    };
  }, [gl, scene]);

  return null;
}

function Model({
  model,
  targetSize = 2.2,
  rotateSpeed = 0.003,
  floatAmount = 0.12,
  floatSpeed = 0.5,
  mouseFollow = 0.25,
  initialRotationY = 0,
}: Omit<GlbDecorationProps, "className" | "style">) {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const groupRef = useRef<THREE.Group>(null);
  const baselineY = useRef(0);
  const scaleRef = useRef(1);

  useEffect(() => {
    if (!model) return;
    let cancelled = false;
    const loader = new GLTFLoader();
    const url = model.startsWith("http") ? model : window.location.origin + model;
    // 截取目录路径（以 / 结尾），供 GLTFLoader 解析 .bin / 纹理等外部资源
    const resourcePath = url.substring(0, url.lastIndexOf("/") + 1);

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (cancelled) return;
        loader.parse(buffer, resourcePath, (gltf) => {
          if (cancelled) return;

          const box = new THREE.Box3().setFromObject(gltf.scene);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0 && maxDim < 1000) {
            scaleRef.current = targetSize / maxDim;
          }

          setScene(gltf.scene);
        });
      })
      .catch((err) => {
        console.error("[GlbDecoration] 模型加载失败:", url, err);
      });
    return () => {
      cancelled = true;
    };
  }, [model, targetSize]);

  useFrame((state) => {
    if (!groupRef.current) return;

    // 首帧居中（先缩放再算包围盒）
    if (baselineY.current === 0 && groupRef.current.children.length > 0) {
      const s = scaleRef.current;
      groupRef.current.scale.setScalar(s);
      groupRef.current.updateWorldMatrix(true, true);
      const box = new THREE.Box3().setFromObject(groupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      groupRef.current.position.set(-center.x, -center.y, -center.z);
      groupRef.current.rotation.y = initialRotationY;
      baselineY.current = groupRef.current.position.y;
    }

    const t = state.clock.elapsedTime;

    // 自转
    groupRef.current.rotation.y += rotateSpeed;

    // 上下浮动
    if (baselineY.current !== 0) {
      groupRef.current.position.y = baselineY.current + Math.sin(t * floatSpeed) * floatAmount;
    }

    // 鼠标跟随视差
    if (mouseFollow > 0) {
      const targetRotY = state.pointer.x * mouseFollow;
      const targetRotX = state.pointer.y * mouseFollow * 0.5;
      groupRef.current.rotation.y +=
        (targetRotY - (groupRef.current.rotation.y % (Math.PI * 2))) * 0.04;
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.04;
    }
  });

  if (!scene) return null;

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export function GlbDecoration({
  model,
  className,
  style,
  targetSize,
  ...modelProps
}: GlbDecorationProps) {
  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
      aria-hidden
    >
      <Canvas
        camera={{ position: [0, 0.3, 3.5], fov: 40 }}
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 2.0,
        }}
        dpr={[1, 1.5]}
        performance={{ min: 0.3 }}
      >
        {/* 暗色指数雾 — 模型边缘柔和融入黑背景 */}
        <fog attach="fog" args={["#0a0a0f", 4, 10]} />

        <EnvironmentLight />
        <Suspense fallback={null}>
          {/* 环境光 — 冷暗调基底 */}
          <ambientLight intensity={1.1} color="#1a1a3a" />
          {/* 半球光 — 上方品牌蓝，下方暗紫 */}
          <hemisphereLight args={["#334466", "#0f0f1e", 0.5]} />
          {/* 主光 — 品牌蓝方向 */}
          <directionalLight position={[5, 8, 5]} intensity={2.8} color="#aaccff" />
          {/* 补光 — 品牌紫侧后方 */}
          <directionalLight position={[-5, 3, -3]} intensity={1.4} color="#ccaaff" />
          {/* 正面柔光 */}
          <directionalLight position={[0, 0, 5]} intensity={1.2} color="#8899cc" />
          <Model model={model} targetSize={targetSize} {...modelProps} />
        </Suspense>
      </Canvas>
    </div>
  );
}
