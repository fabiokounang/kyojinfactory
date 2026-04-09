const MASTER_CATEGORY_FILTER_VALUES = ["Raw", "FG", "WIP"];

const MASTER_CATEGORY_FILTER_OPTIONS = [
  { value: "", label: "Semua kategori" },
  { value: "Raw", label: "Raw" },
  { value: "FG", label: "FG" },
  { value: "WIP", label: "WIP" },
];

function normalizeCategoryFilter(value) {
  const v = String(value || "").trim();
  return MASTER_CATEGORY_FILTER_VALUES.includes(v) ? v : "";
}

module.exports = {
  MASTER_CATEGORY_FILTER_VALUES,
  MASTER_CATEGORY_FILTER_OPTIONS,
  normalizeCategoryFilter,
};
