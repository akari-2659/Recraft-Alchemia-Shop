from pathlib import Path
import re

p = Path('facility.html')
s = p.read_text(encoding='utf-8')

old = """  if(!effectiveVersion||facilityNormalizeVersion(effectiveVersion)!==facilityNormalizeVersion(FACILITY_EXPECTED_DB_VERSION)){
    throw new Error(`施設HTML ${FACILITY_EXPECTED_DB_VERSION} に対して共通DBが ${effectiveVersion||'不明'} です。data/public を同じ版へ更新してください。`);
  }
  return{
    manifest,document:masterDocument,data,version:masterVersion||manifestVersion,
    versionWarning:manifestVersion&&masterVersion&&manifestVersion!==masterVersion
      ?`manifest ${manifestVersion} / master ${masterVersion}`:''
  };"""
new = """  if(!effectiveVersion)throw new Error('共通DBのバージョンを確認できません。');
  const manifestMasterMismatch=manifestVersion&&masterVersion&&facilityNormalizeVersion(manifestVersion)!==facilityNormalizeVersion(masterVersion);
  const htmlDbMismatch=facilityNormalizeVersion(effectiveVersion)!==facilityNormalizeVersion(FACILITY_EXPECTED_DB_VERSION);
  return{
    manifest,document:masterDocument,data,version:effectiveVersion,
    versionWarning:manifestMasterMismatch?`manifest ${manifestVersion} / master ${masterVersion}`:'',
    uiVersionWarning:htmlDbMismatch?`施設HTML ${FACILITY_EXPECTED_DB_VERSION} / 共通DB ${effectiveVersion}`:''
  };"""

if old in s:
    s = s.replace(old, new, 1)
elif 'uiVersionWarning:htmlDbMismatch' not in s:
    raise SystemExit('expected strict-version block not found')

s = s.replace("${commonMaster.versionWarning?'（更新反映待ち）':''}`,commonMaster.versionWarning?'':'ok'", "${(commonMaster.versionWarning||commonMaster.uiVersionWarning)?'（版差あり）':''}`,(commonMaster.versionWarning||commonMaster.uiVersionWarning)?'':'ok'")
s = re.sub(r'v90\.8\.(?:731|732)', 'v90.8.733', s)
s = re.sub(r'(?<![\d.])90\.8\.(?:731|732)(?!\d)', '90.8.733', s)
p.write_text(s, encoding='utf-8')
