const { execFileSync } = require('child_process');
const fs = require('fs');

const env = {
  ...process.env,
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:4000/api',
};

const isWindows = process.platform === 'win32';
const command = isWindows ? 'cmd.exe' : 'npx';
const args = isWindows
  ? ['/d', '/s', '/c', 'npx expo export --platform web --output-dir .expo-verify']
  : ['expo', 'export', '--platform', 'web', '--output-dir', '.expo-verify'];

execFileSync(command, args, {
  stdio: 'inherit',
  env,
  shell: false,
});

fs.rmSync('.expo-verify', { recursive: true, force: true });
