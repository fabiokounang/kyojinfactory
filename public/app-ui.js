(function () {
  function initPageLoader() {
    let loader = document.getElementById("globalPageLoader");
    if (!loader) {
      loader = document.createElement("div");
      loader.id = "globalPageLoader";
      loader.className = "global-loader";
      loader.setAttribute("aria-live", "polite");
      loader.setAttribute("aria-busy", "false");
      loader.innerHTML =
        '<div class="global-loader-card"><div class="global-loader-spinner"></div><p>Loading, mohon tunggu...</p></div>';
      document.body.appendChild(loader);
    }

    const showLoader = () => {
      loader.classList.add("show");
      loader.setAttribute("aria-busy", "true");
    };

    const hideLoader = () => {
      loader.classList.remove("show");
      loader.setAttribute("aria-busy", "false");
    };

    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener(
        "submit",
        () => {
          showLoader();
        },
        true
      );
    });

    window.addEventListener("pageshow", () => {
      hideLoader();
    });

    window.kyoShowPageLoader = showLoader;
    window.kyoHidePageLoader = hideLoader;
  }

  /**
   * Loader otomatis untuk semua panggilan ke /api/* (fetch & XHR).
   * - Upload (FormData / multipart): loader langsung.
   * - Selain itu: loader hanya jika respons > ~280ms (hindari kedip di API cepat).
   * - /api/health diabaikan (cocok untuk polling).
   */
  function initApiGlobalLoader() {
    const origFetch = window.fetch;
    if (typeof origFetch !== "function" || origFetch.__kyoPatched) {
      return;
    }

    const API_PREFIX = "/api/";
    const SLOW_SHOW_MS = 280;

    let inFlight = 0;
    let delayTimerId = null;
    let loaderVisible = false;

    function pathnameFromFetchInput(input) {
      try {
        if (typeof input === "string") {
          const u = new URL(input, window.location.origin);
          if (u.origin !== window.location.origin) {
            return null;
          }
          return u.pathname + u.search;
        }
        if (input instanceof Request) {
          const u = new URL(input.url);
          if (u.origin !== window.location.origin) {
            return null;
          }
          return u.pathname + u.search;
        }
      } catch (_e) {
        return null;
      }
      return null;
    }

    function shouldShowLoaderForApiPath(pathWithQuery) {
      if (!pathWithQuery || !pathWithQuery.startsWith(API_PREFIX)) {
        return false;
      }
      const pathOnly = pathWithQuery.split("?")[0];
      if (pathOnly === "/api/health") {
        return false;
      }
      return true;
    }

    function isUploadFetch(input, init) {
      if (init && init.body instanceof FormData) {
        return true;
      }
      if (input instanceof Request && input.body instanceof FormData) {
        return true;
      }
      const headers = init?.headers || (input instanceof Request ? input.headers : null);
      if (headers) {
        const ct =
          typeof headers.get === "function"
            ? headers.get("content-type") || ""
            : headers["Content-Type"] || headers["content-type"] || "";
        if (String(ct).toLowerCase().includes("multipart/form-data")) {
          return true;
        }
      }
      return false;
    }

    function showLoader() {
      if (loaderVisible) {
        return;
      }
      loaderVisible = true;
      window.kyoShowPageLoader?.();
    }

    function hideLoaderIfIdle() {
      if (inFlight > 0) {
        return;
      }
      if (delayTimerId) {
        window.clearTimeout(delayTimerId);
        delayTimerId = null;
      }
      if (loaderVisible) {
        loaderVisible = false;
        window.kyoHidePageLoader?.();
      }
    }

    function armDelayedShow() {
      if (delayTimerId) {
        return;
      }
      delayTimerId = window.setTimeout(() => {
        delayTimerId = null;
        if (inFlight > 0) {
          showLoader();
        }
      }, SLOW_SHOW_MS);
    }

    function patchedFetch(input, init) {
      const pathWithQuery = pathnameFromFetchInput(input);
      if (!shouldShowLoaderForApiPath(pathWithQuery)) {
        return origFetch.apply(window, arguments);
      }

      inFlight += 1;
      const upload = isUploadFetch(input, init);

      if (upload) {
        if (delayTimerId) {
          window.clearTimeout(delayTimerId);
          delayTimerId = null;
        }
        showLoader();
      } else {
        armDelayedShow();
      }

      return origFetch.apply(window, arguments).finally(() => {
        inFlight -= 1;
        if (inFlight < 0) {
          inFlight = 0;
        }
        hideLoaderIfIdle();
      });
    }
    patchedFetch.__kyoPatched = true;
    window.fetch = patchedFetch;

    const XHR = window.XMLHttpRequest;
    if (!XHR || XHR.prototype.__kyoXhrPatched) {
      return;
    }
    const origOpen = XHR.prototype.open;
    const origSend = XHR.prototype.send;

    XHR.prototype.open = function (method, url, ...rest) {
      try {
        const u = new URL(String(url), window.location.origin);
        const full = u.pathname + u.search;
        this.__kyoHitApiLoader = u.origin === window.location.origin && shouldShowLoaderForApiPath(full);
      } catch (_e) {
        this.__kyoHitApiLoader = false;
      }
      return origOpen.apply(this, [method, url, ...rest]);
    };

    XHR.prototype.send = function (body) {
      if (this.__kyoHitApiLoader) {
        inFlight += 1;
        const upload = body instanceof FormData;
        if (upload) {
          if (delayTimerId) {
            window.clearTimeout(delayTimerId);
            delayTimerId = null;
          }
          showLoader();
        } else {
          armDelayedShow();
        }

        const onEnd = () => {
          this.removeEventListener("loadend", onEnd);
          inFlight -= 1;
          if (inFlight < 0) {
            inFlight = 0;
          }
          hideLoaderIfIdle();
        };
        this.addEventListener("loadend", onEnd);
      }
      return origSend.apply(this, arguments);
    };
    XHR.prototype.__kyoXhrPatched = true;
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
        const curLabel = document.getElementById("admin-edit-current-password-label");
        const curInput = document.getElementById("admin-edit-current-password");
        const titleEl = document.getElementById("admin-edit-modal-title");
        const hintEl = document.getElementById("admin-edit-modal-hint");
        const requireCurrent = btn.dataset.requireCurrent === "1";

        if (u) u.value = btn.dataset.username || "";
        if (p) p.value = "";
        if (curInput) curInput.value = "";

        if (curLabel && curInput) {
          if (requireCurrent) {
            curLabel.hidden = false;
            curInput.required = true;
          } else {
            curLabel.hidden = true;
            curInput.required = false;
          }
        }

        if (titleEl) {
          titleEl.textContent = requireCurrent ? "Edit akun superadmin" : "Edit admin";
        }
        if (hintEl) {
          hintEl.textContent = requireCurrent
            ? "Isi password saat ini untuk konfirmasi. Username dan password baru bisa diubah (password baru opsional)."
            : "Kosongkan password baru jika tidak ingin mengganti.";
        }

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
  initApiGlobalLoader();
  initPageSizeSelect();
})();
