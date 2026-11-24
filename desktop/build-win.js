// Builds the Windows installer (dist/Daruma-N3-Setup-<version>.exe) on Linux without Wine.
// 1. electron-builder normally runs a helper installer under Wine to produce the uninstaller; on macOS it reads the
//    uninstaller straight out of that helper instead (UninstallerReader, plain JavaScript). Use that path here too.
// 2. The installer's own messages (install for whom, app running, uninstall…) have no Vietnamese in electron-builder:
//    add it to the message tables before building, so every page of the installer is in Vietnamese.
const fs = require('fs'), path = require('path');
const mv = require('app-builder-lib/out/util/macosVersion');
mv.isMacOsCatalina = () => true;

const VI = {
  win7Required: 'Cần Windows 7 trở lên',
  x64WinRequired: 'Cần Windows bản 64-bit',
  appRunning: '${PRODUCT_NAME} đang chạy.\\nBấm OK để đóng chương trình.\\nNếu chương trình không tự đóng, hãy đóng nó rồi thử lại.',
  installing: 'Đang cài đặt, vui lòng chờ...',
  areYouSureToUninstall: 'Bạn có chắc muốn gỡ ${PRODUCT_NAME}?',
  decompressionFailed: 'Giải nén tệp không thành công. Hãy chạy lại bộ cài.',
  uninstallFailed: 'Không xóa được tệp của bản cũ. Hãy chạy lại bộ cài.',
  appClosing: 'Đang đóng ${PRODUCT_NAME}...',
  chooseInstallationOptions: 'Chọn cách cài đặt',
  chooseUninstallationOptions: 'Chọn cách gỡ cài đặt',
  whichInstallationShouldBeRemoved: 'Gỡ bản cài nào?',
  whoShouldThisApplicationBeInstalledFor: 'Cài chương trình cho ai?',
  selectUserMode: 'Chọn cài cho mọi người dùng máy tính này hay chỉ cho bạn',
  whichInstallationRemove: 'Chương trình đang được cài cả cho mọi người dùng và cho riêng bạn.\\nBạn muốn gỡ bản nào?',
  freshInstallForAll: 'Cài mới cho mọi người dùng (cần quyền quản trị).',
  freshInstallForCurrent: 'Cài mới chỉ cho người dùng hiện tại.',
  onlyForMe: 'Chỉ cho &tôi',
  forAll: 'Mọi người dùng máy tính này (&tất cả)',
  loginWithAdminAccount: 'Cần đăng nhập bằng tài khoản quản trị để tiếp tục...',
  perUserInstallExists: 'Đã có bản cài cho riêng người dùng này.',
  perUserInstall: 'Có bản cài cho riêng người dùng này.',
  perMachineInstallExists: 'Đã có bản cài cho mọi người dùng.',
  perMachineInstall: 'Có bản cài cho mọi người dùng.',
  reinstallUpgrade: 'Sẽ cài lại hoặc nâng cấp.',
  uninstall: 'Sẽ gỡ cài đặt.'
};
const tdir = path.join(path.dirname(require.resolve('app-builder-lib/package.json')), 'templates', 'nsis');
for (const f of ['messages.yml', 'assistedMessages.yml']) {
  const p = path.join(tdir, f), out = [];
  let key = null, hasVi = false, added = 0;
  const lines = fs.readFileSync(p, 'utf8').split('\n');
  const flush = () => { if (key && !hasVi && VI[key]) { out.push(`  vi: "${VI[key]}"`); added++; } };
  for (const ln of lines) {
    const m = /^([A-Za-z0-9]+):\s*$/.exec(ln);
    if (m) { flush(); key = m[1]; hasVi = false; }
    else if (/^  vi:/.test(ln)) hasVi = true;
    out.push(ln);
  }
  flush();
  if (added) fs.writeFileSync(p, out.join('\n'));
  console.log(`  • ${f}: ${added} Vietnamese messages added`);
}

const { build, Platform, Arch } = require('electron-builder');
build({targets: Platform.WINDOWS.createTarget(['nsis'], Arch.x64), publish: 'never'})
  .then(files => { console.log('built:', files.map(f => path.basename(f)).join(', ')); })
  .catch(e => { console.error(e); process.exit(1); });
