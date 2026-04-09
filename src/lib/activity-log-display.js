const TIMEZONE_JAKARTA = "Asia/Jakarta";

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * created_at disimpan sebagai ISO UTC (Z). Ditampilkan di WIB (UTC+7, tanpa DST).
 * Format: DD / NamaBulan / YYYY HH:mm:ss WIB
 */
function formatActivityTimeJakarta(isoUtcString) {
  if (!isoUtcString) return "—";
  const d = new Date(isoUtcString);
  if (Number.isNaN(d.getTime())) {
    return String(isoUtcString);
  }

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE_JAKARTA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(d);

  const pick = (type) => parts.find((p) => p.type === type)?.value || "";
  const dd = pick("day");
  const mm = pick("month");
  const yyyy = pick("year");
  const hh = pick("hour");
  const mi = pick("minute");
  const ss = pick("second");
  const monthIdx = Math.max(0, Math.min(11, parseInt(mm, 10) - 1));
  const monthName = MONTHS_ID[monthIdx] || mm;

  return `${dd} / ${monthName} / ${yyyy} ${hh}:${mi}:${ss} WIB`;
}

const ACTION_LABELS = {
  "login.success": { label: "Login berhasil", badge: "action-badge--auth-ok" },
  "login.failed": { label: "Login gagal", badge: "action-badge--auth-fail" },
  logout: { label: "Logout", badge: "action-badge--auth" },
  "master-item.create": { label: "Master item · tambah", badge: "action-badge--master" },
  "master-item.update": { label: "Master item · ubah", badge: "action-badge--master" },
  "master-item.delete": { label: "Master item · hapus", badge: "action-badge--master-del" },
  "master-item.import": { label: "Master item · import Excel", badge: "action-badge--master" },
  "bom.create": { label: "BOM · tambah baris", badge: "action-badge--bom" },
  "bom.update": { label: "BOM · ubah baris", badge: "action-badge--bom" },
  "bom.delete": { label: "BOM · hapus baris", badge: "action-badge--bom-del" },
  "bom.import": { label: "BOM · import Excel", badge: "action-badge--bom" },
  "admin.permission.update": { label: "Admin · ubah hak menu", badge: "action-badge--admin" },
  "admin.user.create": { label: "Admin · tambah akun", badge: "action-badge--admin" },
  "admin.user.update": { label: "Admin · ubah akun", badge: "action-badge--admin" },
  "admin.user.delete": { label: "Admin · hapus akun", badge: "action-badge--admin-del" },
  "admin.superadmin.self.update": { label: "Superadmin · ubah profil sendiri", badge: "action-badge--admin" },
};

function describeActivityAction(raw) {
  const key = String(raw || "").trim();
  const mapped = ACTION_LABELS[key];
  if (mapped) {
    return {
      label: mapped.label,
      badgeClass: `action-badge ${mapped.badge}`,
      raw: key,
    };
  }

  const human = key
    .replace(/\./g, " · ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    label: human || "—",
    badgeClass: "action-badge action-badge--generic",
    raw: key,
  };
}

module.exports = {
  formatActivityTimeJakarta,
  describeActivityAction,
  TIMEZONE_JAKARTA,
};
