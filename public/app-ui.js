(function () {
  function initPageLoader() {
    const loader = document.createElement("div");
    loader.id = "globalPageLoader";
    loader.className = "global-loader";
    loader.innerHTML =
      '<div class="global-loader-card"><div class="global-loader-spinner"></div><p>Loading, mohon tunggu...</p></div>';
    document.body.appendChild(loader);

    let timer = null;
    const showLoader = () => {
      if (timer) return;
      timer = window.setTimeout(() => {
        loader.classList.add("show");
      }, 250);
    };

    const hideLoader = () => {
      if (timer) {
        window.clearTimeout(timer);
        timer = null;
      }
      loader.classList.remove("show");
    };

    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", () => {
        showLoader();
      });
    });

    window.addEventListener("pageshow", () => {
      hideLoader();
    });
  }

  function initPageSizeSelect() {
    document.querySelectorAll(".page-size-select").forEach((sel) => {
      sel.addEventListener("change", () => {
        const formId = sel.getAttribute("form");
        const form = formId ? document.getElementById(formId) : sel.closest("form");
        if (!form) return;
        let pageField = form.querySelector('input[name="page"]');
        if (!pageField) {
          pageField = document.createElement("input");
          pageField.type = "hidden";
          pageField.name = "page";
          form.appendChild(pageField);
        }
        pageField.value = "1";
        form.submit();
      });
    });
  }

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

  function initAdminUsersPage() {
    const createModal = document.getElementById("adminCreateModal");
    const editModal = document.getElementById("adminEditModal");
    const editForm = document.getElementById("adminEditForm");
    const deleteModal = document.getElementById("adminDeleteWarnModal");
    const deleteForm = document.getElementById("adminDeleteWarnForm");
    const deleteText = document.getElementById("adminDeleteWarnText");
    if (!createModal && !editModal) return;

    document.querySelector(".js-open-create-admin")?.addEventListener("click", () => {
      createModal?.showModal();
    });
    document.querySelector(".js-close-create-admin")?.addEventListener("click", () => {
      createModal?.close();
    });

    document.querySelectorAll(".js-edit-admin").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!editForm || !editModal) return;
        editForm.action = `/admin/users/${btn.dataset.id}/update`;
        const u = document.getElementById("admin-edit-username");
        const p = document.getElementById("admin-edit-password");
        if (u) u.value = btn.dataset.username || "";
        if (p) p.value = "";
        editModal.showModal();
      });
    });

    document.querySelector(".js-close-edit-admin")?.addEventListener("click", () => {
      editModal?.close();
    });

    if (deleteModal && deleteForm && deleteText) {
      document.querySelectorAll(".js-open-delete-admin").forEach((btn) => {
        btn.addEventListener("click", () => {
          deleteForm.action = btn.dataset.action;
          deleteText.textContent = `Yakin ingin menghapus ${btn.dataset.label || "admin ini"}?`;
          deleteModal.showModal();
        });
      });
      document.querySelector(".js-close-admin-delete-modal")?.addEventListener("click", () => {
        deleteModal.close();
      });
    }
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
  initAdminUsersPage();
  initPageLoader();
  initPageSizeSelect();
})();
