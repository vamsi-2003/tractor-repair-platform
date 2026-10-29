const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch monorepo root for pnpm symlinks and shared packages
config.watchFolders = [
  monorepoRoot,
];

// Block transient pnpm lockfiles from crashing the watcher
config.resolver.blockList = [
  /[\\/]\.pnpm-task-run-state-v1[\\/]/,
  /[\\/]\.git[\\/]/,
];

// 2. Let Metro resolve modules from both package node_modules and root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

module.exports = config;
