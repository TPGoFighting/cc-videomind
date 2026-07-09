const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo: 告诉 Metro 监视工作区根目录，以解析 hoisted 的 node_modules
config.watchFolders = [workspaceRoot];

// 项目根目录必须指向 apps/mobile，这样 ./index 才能找到 index.ts
config.projectRoot = projectRoot;

// 同时允许 Metro 解析 workspace root 下的模块
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@opentelemetry/api") {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "mocks/@opentelemetry/api.js"),
    };
  }
  if (platform === "web") {
    if (moduleName === "expo-document-picker") {
      return {
        type: "sourceFile",
        filePath: path.resolve(projectRoot, "mocks/expo-document-picker/index.js"),
      };
    }
    if (moduleName === "expo-image-picker") {
      return {
        type: "sourceFile",
        filePath: path.resolve(projectRoot, "mocks/expo-image-picker/index.js"),
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
