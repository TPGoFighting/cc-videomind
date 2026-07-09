// Mock for expo-image-picker — 原生模块未编译时的占位
export async function requestMediaLibraryPermissionsAsync() {
  return { status: "denied" };
}
export async function launchImageLibraryAsync() {
  throw new Error("原生模块未加载，请使用 npx expo run:android 重新编译。");
}
export const MediaTypeOptions = { Images: "images", Videos: "videos", All: "all" };
