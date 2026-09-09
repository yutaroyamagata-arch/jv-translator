const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

try {
  execSync('taskkill /F /IM JV-Translator.exe', { stdio: 'ignore' });
} catch (e) {}

const src = 'C:\\Users\\yutar\\.gemini\\antigravity\\scratch\\viet_japan_translator\\build_v3\\win-unpacked';
const userProfile = process.env.USERPROFILE;
const localAppData = process.env.LOCALAPPDATA;
const desktop = path.join(userProfile, 'Desktop');

const targetDesktopDir = path.join(desktop, '日涋英軞設訃_最新版');
const targetLocalDir = path.join(localAppData, 'Programs', 'JV-Translator');
const zipFile = path.join(userProfile, 'Downloads', '日涋英軞設訃_最新版.zip');

console.log('Copying to Desktop:', targetDesktopDir);
fs.cpSync(src, targetDesktopDir, { recursive: true, force: true });

console.log('Copying to LocalAppData:', targetLocalDir);
fs.cpSync(src, targetLocalDirectory || targetLocalDir, { recursive: true, force: true });

console.log('Creating ZIP archive...');
try {
  execSync('tar.exe -a -c -f "' + zipFile + '" -C "' + targetDesktopDir + '" .', { stdio: 'inherit' });
  console.log('ZIP created at:', zipFile);
} catch (e) {
  console.log('ZIP error:', e.message);
}

const exe = path.join(targetDesktopDir, 'JV-Translator.exe');
console.log('Launching: ', exe);
const child = spawn(exe, [], { detached: true, stdio: 'ignore', cwd: targetDesktopDir });
child.unref();
console.log('Deployment finished successfully!');
