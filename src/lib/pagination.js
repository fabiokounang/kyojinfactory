const ALLOWED_PAGE_SIZES = [10, 25, 50, 100];

function parsePage(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function parsePageSize(value, { defaultSize = 25, max = 100 } = {}) {
  const n = Number(value);
  if (ALLOWED_PAGE_SIZES.includes(n)) return n;
  if (Number.isFinite(n) && n >= 1 && n <= max) return Math.floor(n);
  return defaultSize;
}

function computePaginationMeta(total, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const pageClamped = Math.min(Math.max(1, page), totalPages);
  const offset = (pageClamped - 1) * pageSize;
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + pageSize, total);
  return {
    total,
    page: pageClamped,
    pageSize,
    totalPages,
    offset,
    from,
    to,
  };
}

function buildQueryString(params) {
  const u = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    u.set(key, String(value));
  });
  return u.toString();
}

function buildPageHref(basePath, queryParams, page) {
  const u = new URLSearchParams();
  Object.entries(queryParams || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    u.set(key, String(value));
  });
  u.set("page", String(page));
  const qs = u.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageNumbersAround(current, totalPages, neighbor = 2) {
  if (totalPages <= 0) return [];
  const start = Math.max(1, current - neighbor);
  const end = Math.min(totalPages, current + neighbor);
  const nums = [];
  for (let i = start; i <= end; i += 1) nums.push(i);
  return nums;
}

function buildPaginationView(basePath, queryParams, meta, neighbor = 2) {
  const { page, pageSize, total, totalPages, from, to } = meta;
  const nums = pageNumbersAround(page, totalPages, neighbor);
  return {
    page,
    pageSize,
    total,
    totalPages,
    from,
    to,
    prevHref: page > 1 ? buildPageHref(basePath, queryParams, page - 1) : null,
    nextHref: page < totalPages ? buildPageHref(basePath, queryParams, page + 1) : null,
    firstHref: page > 1 ? buildPageHref(basePath, queryParams, 1) : null,
    lastHref: page < totalPages ? buildPageHref(basePath, queryParams, totalPages) : null,
    pageHrefs: nums.map((num) => ({
      num,
      href: buildPageHref(basePath, queryParams, num),
      active: num === page,
    })),
    allowedPageSizes: ALLOWED_PAGE_SIZES,
  };
}

module.exports = {
  ALLOWED_PAGE_SIZES,
  parsePage,
  parsePageSize,
  computePaginationMeta,
  buildQueryString,
  buildPageHref,
  pageNumbersAround,
  buildPaginationView,
};
