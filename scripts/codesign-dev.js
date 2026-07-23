/**
 * codesign-dev.js
 *
 * Ad-hoc codesign third-party dynamic libraries that lack valid signatures
 * before launching Electron in development mode.
 *
 * Apple Silicon (arm64) unconditionally requires valid code signatures for all
 * code loaded via dlopen; Intel may also enforce this when Hardened Runtime or
 * library validation is enabled. Since the SDK/plugin ships as a PaaS product
 * without pre-applied signatures (or signatures may become invalid during npm
 * packaging / zip extraction), this script ensures all .dylib and .framework
 * binaries carry a valid ad-hoc signature before the app starts.
 *
 * Only runs on macOS; exits immediately on other platforms.
 * Idempotent: already-valid signatures are skipped.
 *
 * Usage:
 *   node scripts/codesign-dev.js
 */
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const { platform } = process;

if (platform !== 'darwin') {
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..');

// Directories to scan for unsigned / invalidly-signed binaries.
const SCAN_DIRS = [
  // Beauty plugin (XMagic)
  'node_modules/trtc-electron-plugin-xmagic/plugin/XMagic/mac',
  // TRTC SDK frameworks (synced by postinstall.js into Electron.app)
  'node_modules/electron/dist/Electron.app/Contents/Frameworks',
];

let signed = 0;
let skipped = 0;

for (const relDir of SCAN_DIRS) {
  const dir = path.join(projectRoot, relDir);
  if (!fs.existsSync(dir)) continue;
  codesignDir(dir);
}

if (signed > 0) {
  console.log(`[codesign-dev] Done: ${signed} binaries signed, ${skipped} already valid.`);
} else if (skipped > 0) {
  console.log(`[codesign-dev] All ${skipped} binaries already have valid signatures.`);
}

/**
 * Scan a directory for .framework bundles and standalone .dylib files,
 * ad-hoc sign any that do not pass strict verification.
 */
function codesignDir(dir) {
  // Sign .framework bundles first (inner dependencies before outer)
  const frameworks = findByExt(dir, '.framework', true);
  for (const fw of frameworks) {
    if (isValidSignature(fw)) { skipped++; continue; }
    try {
      execFileSync('codesign', ['--force', '--sign', '-', '--deep', fw], { stdio: 'pipe' });
      console.log(`[codesign-dev] signed: ${path.relative(projectRoot, fw)}`);
      signed++;
    } catch (e) {
      console.warn(`[codesign-dev] warn: ${path.basename(fw)}: ${e.message}`);
    }
  }

  // Sign standalone .dylib files (skip those nested inside .framework)
  const dylibs = findByExt(dir, '.dylib', false);
  for (const dylib of dylibs) {
    if (dylib.includes('.framework')) continue;
    if (isValidSignature(dylib)) { skipped++; continue; }
    try {
      execFileSync('codesign', ['--force', '--sign', '-', dylib], { stdio: 'pipe' });
      console.log(`[codesign-dev] signed: ${path.relative(projectRoot, dylib)}`);
      signed++;
    } catch (e) {
      console.warn(`[codesign-dev] warn: ${path.basename(dylib)}: ${e.message}`);
    }
  }
}

/**
 * Returns true if the file/bundle passes strict codesign verification.
 */
function isValidSignature(filePath) {
  try {
    execFileSync('codesign', ['--verify', '--strict', filePath], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively find entries matching a given extension.
 * @param {string} dir - Root directory to search.
 * @param {string} ext - Extension to match (e.g. '.framework', '.dylib').
 * @param {boolean} isDir - true to match directories, false to match files.
 * @returns {string[]} Absolute paths of matched entries.
 */
function findByExt(dir, ext, isDir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  (function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.name.endsWith(ext)) {
        if ((isDir && entry.isDirectory()) || (!isDir && entry.isFile())) {
          results.push(fullPath);
        }
        // Do not recurse into .framework internals
        if (entry.name.endsWith('.framework')) continue;
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) walk(fullPath);
    }
  })(dir);
  return results;
}
