(function () {
  function initMasterItemPage() {
    const createModal = document.getElementById("masterCreateModal");
    const editModal = document.getElementById("masterEditModal");
    const editForm = document.getElementById("masterEditForm");
    const deleteModal = document.getElementById("deleteWarnModal");
    const deleteForm = document.getElementById("deleteWarnForm");
    const deleteText = document.getElementById("deleteWarnText");
    if (!editModal || !editForm || !deleteModal || !deleteForm || !deleteText) return;

    document.querySelector(".js-open-create-master")?.addEventListener("click", () => {
      createModal?.showModal();
    });
    document.querySelector(".js-close-create-master")?.addEventListener("click", () => {
      createModal?.close();
    });

    document.querySelectorAll(".js-edit-master").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        editForm.action = `/master-items/${id}/update`;
        document.getElementById("edit-itemCode").value = btn.dataset.itemCode || "";
        document.getElementById("edit-itemName").value = btn.dataset.itemName || "";
        document.getElementById("edit-category").value = btn.dataset.category || "";
        document.getElementById("edit-quantity").value = btn.dataset.quantity || "";
        document.getElementById("edit-unit").value = btn.dataset.unit || "";
        document.getElementById("edit-stdSize").value = btn.dataset.stdSize || "";
        document.getElementById("edit-unitMin").value = btn.dataset.unitMin || "";
        document.getElementById("edit-minStock").value = btn.dataset.minStock || "";
        document.getElementById("edit-maxStock").value = btn.dataset.maxStock || "";
        document.getElementById("edit-reorderLevel").value = btn.dataset.reorderLevel || "";
        document.getElementById("edit-defaultStorageLoc").value = btn.dataset.defaultStorageLoc || "";
        document.getElementById("edit-supplier").value = btn.dataset.supplier || "";
        editModal.showModal();
      });
    });

    document.querySelector(".js-close-master-modal")?.addEventListener("click", () => editModal.close());
    initDeleteModal(deleteModal, deleteForm, deleteText);
  }

  function initBomPage() {
    const createModal = document.getElementById("bomCreateModal");
    const editModal = document.getElementById("bomEditModal");
    const editForm = document.getElementById("bomEditForm");
    const deleteModal = document.getElementById("deleteWarnModal");
    const deleteForm = document.getElementById("deleteWarnForm");
    const deleteText = document.getElementById("deleteWarnText");
    if (!editModal || !editForm || !deleteModal || !deleteForm || !deleteText) return;

    document.querySelector(".js-open-create-bom")?.addEventListener("click", () => {
      createModal?.showModal();
    });
    document.querySelector(".js-close-create-bom")?.addEventListener("click", () => {
      createModal?.close();
    });

    document.querySelectorAll(".js-edit-bom").forEach((btn) => {
      btn.addEventListener("click", () => {
        editForm.action = `/bom-structure/${btn.dataset.id}/update`;
        document.getElementById("edit-bom-fgCode").value = btn.dataset.fgCode || "";
        document.getElementById("edit-bom-parentCode").value = btn.dataset.parentCode || "";
        document.getElementById("edit-bom-componentCode").value = btn.dataset.componentCode || "";
        document.getElementById("edit-bom-componentName").value = btn.dataset.componentName || "";
        document.getElementById("edit-bom-qtyPerParent").value = btn.dataset.qtyPerParent || "";
        document.getElementById("edit-bom-unit").value = btn.dataset.unit || "";
        document.getElementById("edit-bom-lengthM").value = btn.dataset.lengthM || "";
        document.getElementById("edit-bom-wastePct").value = btn.dataset.wastePct || "";
        document.getElementById("edit-bom-rawMaterialCode").value = btn.dataset.rawMaterialCode || "";
        editModal.showModal();
      });
    });

    document.querySelector(".js-close-bom-modal")?.addEventListener("click", () => editModal.close());
    initDeleteModal(deleteModal, deleteForm, deleteText);
  }

  function initDeleteModal(deleteModal, deleteForm, deleteText) {
    document.querySelectorAll(".js-open-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        deleteForm.action = btn.dataset.action;
        deleteText.textContent = `Yakin ingin menghapus ${btn.dataset.label || "data ini"}?`;
        deleteModal.showModal();
      });
    });

    document.querySelector(".js-close-delete-modal")?.addEventListener("click", () => deleteModal.close());
  }

  initMasterItemPage();
  initBomPage();
})();
