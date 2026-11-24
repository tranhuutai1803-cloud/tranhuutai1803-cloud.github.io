// After packing for Windows: put the Daruma icon and the "Details" information (name, version, description) on
// DarumaN3.exe. Done here with resedit (plain JavaScript) because electron-builder's own way needs Wine on Linux.
const path = require('path'), fs = require('fs');

exports.default = async function afterPack(ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const R = await require('resedit/cjs').load();
  const name = ctx.packager.platformSpecificBuildOptions.executableName || ctx.packager.appInfo.productFilename;
  const exe = path.join(ctx.appOutDir, `${name}.exe`);
  const ver = ctx.packager.appInfo.version;                   // 1.0.0
  const nt = R.NtExecutable.from(fs.readFileSync(exe), {ignoreCert: true});
  const res = R.NtExecutableResource.from(nt);

  const ico = R.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'build', 'icon.ico')));
  const groups = R.Resource.IconGroupEntry.fromEntries(res.entries);
  const g = groups[0] || {id: 1, lang: 1033};
  R.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, ico.icons.map(i => i.data));

  const vi = R.Resource.VersionInfo.fromEntries(res.entries)[0] || R.Resource.VersionInfo.createEmpty();
  const langs = vi.getAllLanguagesForStringValues();
  const tr = langs[0] || {lang: 1033, codepage: 1200};
  vi.setFileVersion(ver + '.0', tr.lang);
  vi.setProductVersion(ver + '.0', tr.lang);
  vi.setStringValues(tr, {
    ProductName: 'Daruma N3', FileDescription: 'Daruma N3', CompanyName: 'Daruma N3', InternalName: 'DarumaN3',
    OriginalFilename: `${name}.exe`, LegalCopyright: 'Daruma N3', FileVersion: ver, ProductVersion: ver
  });
  vi.outputToResourceEntries(res.entries);
  res.outputResource(nt);
  fs.writeFileSync(exe, Buffer.from(nt.generate()));
  console.log(`  • afterPack: icon (${ico.icons.length} sizes) and version ${ver} written to ${name}.exe`);
};
