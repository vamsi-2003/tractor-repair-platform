const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('🔍 Fetching latest Android build from EAS...');

try {
  const output = execSync('npx eas-cli build:list --platform android --limit 1 --json --non-interactive', {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'ignore']
  });

  // Extract JSON array from output (ignoring npm warnings if any)
  const jsonStart = output.indexOf('[');
  const jsonEnd = output.lastIndexOf(']') + 1;
  if (jsonStart === -1 || jsonEnd === 0) {
    throw new Error('Could not parse EAS build output.');
  }

  const builds = JSON.parse(output.substring(jsonStart, jsonEnd));
  if (!builds || builds.length === 0) {
    console.log('❌ No builds found.');
    process.exit(1);
  }

  const latest = builds[0];
  const apkUrl = latest.artifacts?.buildUrl || latest.artifacts?.applicationArchiveUrl;

  console.log('\n======================================================');
  console.log('✅ LATEST ANDROID BUILD FOUND:');
  console.log(`📱 App: ${latest.app?.name || 'tractor-repair'}`);
  console.log(`🆔 Build ID: ${latest.id}`);
  console.log(`📊 Status: ${latest.status}`);
  console.log(`📅 Created: ${latest.createdAt}`);
  console.log('------------------------------------------------------');
  if (apkUrl) {
    console.log('🔗 DIRECT APK DOWNLOAD LINK:');
    console.log(`\x1b[36m${apkUrl}\x1b[0m`);
    console.log('------------------------------------------------------');
    console.log('💡 How to install on your phone:');
    console.log('1. Copy the link above and open it in Google Chrome on your phone.');
    console.log('2. Tap "Download anyway", then tap "Open" and "Install".');
    console.log('   (Do not open with Expo Go - this is a standalone APK!)');
    console.log('======================================================\n');
  } else {
    console.log('⚠️ No APK artifact available yet (build may still be in progress).');
    console.log(`Check status at: https://expo.dev/accounts/${latest.app?.ownerAccount?.name}/projects/${latest.app?.slug}/builds/${latest.id}`);
  }
} catch (error) {
  console.error('❌ Error fetching build:', error.message);
  process.exit(1);
}
