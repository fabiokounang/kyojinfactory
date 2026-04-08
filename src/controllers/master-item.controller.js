const {
  listItems,
  createItem,
  updateItem,
  deleteItem,
} = require("../services/master-item.service");

async function listMasterItemsHandler(req, res) {
  const data = await listItems(req.query.q || "");
  return res.status(200).json({
    success: true,
    data,
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
