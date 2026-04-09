const {
  listItemsPaged,
  createItem,
  updateItem,
  deleteItem,
} = require("../services/master-item.service");
const { parsePage, parsePageSize } = require("../lib/pagination");
const { normalizeCategoryFilter } = require("../config/master-item-filters");

async function listMasterItemsHandler(req, res) {
  const q = String(req.query.q || "");
  const category = normalizeCategoryFilter(req.query.category);
  const page = parsePage(req.query.page);
  const pageSize = parsePageSize(req.query.pageSize);

  const result = await listItemsPaged({ q, category, page, pageSize });
  return res.status(200).json({
    success: true,
    data: result.items,
    pagination: {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      from: result.from,
      to: result.to,
    },
  });
}

async function createMasterItemHandler(req, res) {
  const result = await createItem(req.body || {}, req.user?.username);
  if (result.error) {
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Master item created",
    data: result.data,
  });
}

async function updateMasterItemHandler(req, res) {
  const result = await updateItem(req.params.id, req.body || {});
  if (result.error) {
    return res.status(result.status || 400).json({
      success: false,
      message: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Master item updated",
    data: result.data,
  });
}

async function deleteMasterItemHandler(req, res) {
  const result = await deleteItem(req.params.id);
  if (result.error) {
    return res.status(result.status || 400).json({
      success: false,
      message: result.error,
    });
  }

  return res.status(200).json({
    success: true,
    message: "Master item deleted",
    data: result.data,
  });
}

module.exports = {
  listMasterItemsHandler,
  createMasterItemHandler,
  updateMasterItemHandler,
  deleteMasterItemHandler,
};
