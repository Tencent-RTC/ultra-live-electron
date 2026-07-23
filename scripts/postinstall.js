const { exec, execFileSync } = require('child_process');
const path = require('path');

const { arch, platform } = process;

if (platform === 'darwin') {
  console.log('postinstall:', process.cwd());
  // Sync TRTC SDK frameworks into Electron.app so they are available at runtime.
  exec(`rsync -a ./node_modules/trtc-electron-sdk/build/mac-framework/${arch}/ ./node_modules/electron/dist/Electron.app/Contents/Frameworks`, (err) => {
    if (err) {
      console.warn('postinstall rsync warning:', err.message);
    }
    // Ad-hoc codesign all third-party dylibs/frameworks for dev mode.
    // Required on Apple Silicon; also protects Intel with Hardened Runtime.
    try {
      execFileSync('node', [path.join(__dirname, 'codesign-dev.js')], { stdio: 'inherit' });
    } catch (e) {
      console.warn('postinstall codesign-dev warning:', e.message);
    }
  });
}
