const BASE = "/three_glb";
const P = (name: string) => `${BASE}/${name}.glb`;

const KK_BASE = "/KayKit_Prototype_Bits_1.1_FREE/KayKit_Prototype_Bits_1.1_FREE/Assets/gltf";
const KK = (name: string) => `${KK_BASE}/${name}.gltf`;

export const GLB_MODELS: Record<string, string> = {
  // 原有动物模型
  parrot: P("Parrot"),
  stork: P("Stork"),
  flamingo: P("Flamingo"),
  horse: P("Horse"),
  sittingBox: P("SittingBox"),
  // KayKit 科技/学习道具
  coin: KK("Coin_A"),
  coinB: KK("Coin_B"),
  coinC: KK("Coin_C"),
  box: KK("Box_C"),
  boxA: KK("Box_A"),
  boxB: KK("Box_B"),
  can: KK("Can_A"),
  canB: KK("Can_B"),
  table: KK("table_medium_Decorated"),
  tableLong: KK("table_medium_long"),
  target: KK("target_stand_A_Decorated"),
  targetSmall: KK("target_small"),
  door: KK("Door_A_Decorated"),
  cube: KK("Cube_Prototype_Large_A"),
  cubeSmall: KK("Cube_Prototype_Small"),
  pallet: KK("Pallet_Large"),
  palletDecorated: KK("Pallet_Small_Decorated_A"),
  // 外部下载的独立模型
  mysteryModel: "/original_205862/ef6202c859fe4f27bd2eaae01361d0ef.glb",
};
