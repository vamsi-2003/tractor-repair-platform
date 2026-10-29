const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Extra node modules alias for self-contained shared code
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@tractor-repair/shared': path.resolve(projectRoot, 'shared'),
};

// 2. Watch monorepo root and shared folder
config.watchFolders = [
  path.resolve(projectRoot, 'shared'),
  monorepoRoot,
];

// Block transient pnpm lockfiles from crashing the watcher
config.resolver.blockList = [
  /[\\/]\.pnpm-task-run-state-v1[\\/]/,
  /[\\/]\.git[\\/]/,
];

// 3. Let Metro resolve modules from both package node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
