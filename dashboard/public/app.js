/* Bảng điều khiển metadata — chỉ một tệp, không phụ thuộc thư viện ngoài. */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const state = {
  data: null,
  activeTab: "posts",
  selectedPost: null,
  selectedLibrary: null,
  creatingPost: false,
  postQuery: "",
  libraryQuery: "",
  libraryType: "all",
  dirty: false,
};

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]
  );

const searchKey = (value) => String(value ?? "").toLocaleLowerCase("vi");

function formatDate(iso) {
  if (!iso) return "Chưa có ngày";
  const [year, month, day] = String(iso).split("-").map(Number);
  if (!year || !month || !day) return String(iso);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function todayISO() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

async function request(url, options = {}) {
  let response;

  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      ...options,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ dashboard.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Lỗi ${response.status}`);
  return data;
}

/* -------------------------------------------------------------------------- */
/* rendering                                                                  */
/* -------------------------------------------------------------------------- */

function renderAll() {
  if (!state.data) return;

  renderHeader();
  renderTabs();
  renderOptions();
  renderPostList();
  renderLibraryList();
  renderPostEditor();
  renderLibraryEditor();
  renderPanels();
}

function renderHeader() {
  const { site, counts, metaError } = state.data;

  $("#site-name").textContent = site.name;
  $("#status-note").textContent =
    `${counts.posts} bài viết · ${counts.drafts} nháp · ` +
    `${counts.photos} ảnh · ${counts.documents} tài liệu`;

  const preview = $("#preview-link");
  preview.hidden = !state.data.previewUrl;
  preview.href = state.data.previewUrl ? `${state.data.previewUrl}/` : "#";

  const alert = $("#meta-alert");
  alert.hidden = !metaError;
  alert.textContent = metaError
    ? `meta.json đang lỗi nên chưa thể lưu metadata thư viện: ${metaError}`
    : "";
}

function renderTabs() {
  $$("[data-tab]").forEach((tab) => {
    const active = tab.dataset.tab === state.activeTab;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  $("#post-count").textContent = state.data.posts.length;
  $("#library-count").textContent = state.data.library.length;
}

function renderOptions() {
  const options = (values) =>
    values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join("");

  $("#category-options").innerHTML = options(state.data.categories);
  $("#collection-options").innerHTML = options(state.data.collections);
}

function renderPanels() {
  $("#posts-panel").hidden = state.activeTab !== "posts";
  $("#library-panel").hidden = state.activeTab !== "library";
}

function renderPostList() {
  const query = searchKey(state.postQuery);
  const posts = state.data.posts.filter((post) => {
    if (!query) return true;
    const haystack = searchKey(
      [post.meta.title, post.meta.category, post.meta.tags.join(" "), post.file].join(" ")
    );
    return haystack.includes(query);
  });

  $("#post-list").innerHTML = posts
    .map((post) => {
      const selected = !state.creatingPost && post.file === state.selectedPost;
      const badges = [
        post.meta.draft ? '<span class="badge badge--draft">Nháp</span>' : "",
        post.meta.featured ? '<span class="badge badge--star">Nổi bật</span>' : "",
        !post.meta.title ? '<span class="badge badge--warn">Thiếu tiêu đề</span>' : "",
      ].join("");

      return `<li>
        <button class="item ${selected ? "is-selected" : ""}" type="button" data-file="${escapeHtml(post.file)}">
          <span class="item__title">${escapeHtml(post.meta.title || "Chưa có tiêu đề")}</span>
          <span class="item__meta">${escapeHtml(formatDate(post.meta.date))}${
            post.meta.category ? ` · ${escapeHtml(post.meta.category)}` : ""
          }</span>
          ${badges ? `<span class="badges">${badges}</span>` : ""}
        </button>
      </li>`;
    })
    .join("");

  $("#post-empty").hidden = posts.length > 0;
}

function renderLibraryList() {
  const query = searchKey(state.libraryQuery);
  const items = state.data.library.filter((item) => {
    if (state.libraryType !== "all" && item.type !== state.libraryType) return false;
    if (!query) return true;
    const haystack = searchKey(
      [item.meta.title, item.meta.collection, item.meta.tags.join(" "), item.file, item.ext].join(" ")
    );
    return haystack.includes(query);
  });

  $("#library-list").innerHTML = items
    .map((item) => {
      const selected = item.file === state.selectedLibrary;
      const typeLabel = item.type === "photo" ? "Ảnh" : "PDF";
      return `<li>
        <button class="item ${selected ? "is-selected" : ""}" type="button" data-file="${escapeHtml(item.file)}">
          <span class="item__title">${escapeHtml(item.meta.title || item.name)}</span>
          <span class="item__meta">${typeLabel} · ${escapeHtml(formatDate(item.meta.date))}${
            item.meta.collection ? ` · ${escapeHtml(item.meta.collection)}` : ""
          }</span>
          ${item.hasMeta ? "" : '<span class="badges"><span class="badge badge--muted">Chưa metadata</span></span>'}
        </button>
      </li>`;
    })
    .join("");

  $("#library-empty").hidden = items.length > 0;
}

function previewHref(relativePath) {
  if (!state.data?.previewUrl) return "";
  return state.data.previewUrl + relativePath;
}

function renderPostEditor() {
  if (state.creatingPost) {
    renderNewPostEditor();
    return;
  }

  const post = state.data.posts.find((item) => item.file === state.selectedPost);
  const root = $("#post-editor");

  if (!post) {
    root.innerHTML = `<p class="empty-editor">Chọn một bài viết ở cột bên trái để sửa metadata.</p>`;
    return;
  }

  const meta = post.meta;
  const link = previewHref(`/${encodeURIComponent(post.slug)}`);
  const missingFrontMatter = post.hasMeta
    ? ""
    : `<p class="notice">Bài viết chưa có front matter. Lần lưu đầu tiên sẽ tạo phần metadata ở đầu tệp; nội dung bên dưới được giữ nguyên.</p>`;

  root.innerHTML = `<form class="editor" id="post-form" novalidate>
    <div class="editor__head">
      <div>
        <p class="eyebrow">Bài viết</p>
        <h2>${escapeHtml(meta.title || "Chưa có tiêu đề")}</h2>
        <p class="file">content/posts/${escapeHtml(post.file)}</p>
      </div>
      ${
        link
          ? `<a class="button button--ghost" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Xem bài ↗</a>`
          : ""
      }
    </div>

    ${missingFrontMatter}

    <div class="form-grid">
      <label class="field field--full">
        <span>Tiêu đề <b>*</b></span>
        <input name="title" type="text" value="${escapeHtml(meta.title)}" required autocomplete="off">
      </label>

      <label class="field field--full">
        <span>Phụ đề</span>
        <input name="subtitle" type="text" value="${escapeHtml(meta.subtitle)}" autocomplete="off">
      </label>

      <label class="field">
        <span>Ngày</span>
        <input name="date" type="date" value="${escapeHtml(meta.date)}">
      </label>

      <label class="field">
        <span>Ngày cập nhật</span>
        <input name="updated" type="date" value="${escapeHtml(meta.updated)}">
      </label>

      <label class="field">
        <span>Nhóm</span>
        <input name="category" type="text" value="${escapeHtml(meta.category)}" list="category-options" autocomplete="off">
      </label>

      <label class="field">
        <span>Thẻ</span>
        <input name="tags" type="text" value="${escapeHtml(meta.tags.join(", "))}" placeholder="Cách nhau bằng dấu phẩy" autocomplete="off">
      </label>

      <label class="field field--full">
        <span>Tóm tắt</span>
        <textarea name="summary" rows="3">${escapeHtml(meta.summary)}</textarea>
      </label>

      <div class="field field--full checks">
        <label><input name="featured" type="checkbox" ${meta.featured ? "checked" : ""}> Bài nổi bật</label>
        <label><input name="draft" type="checkbox" ${meta.draft ? "checked" : ""}> Bản nháp (ẩn khỏi site)</label>
      </div>
    </div>

    <div class="editor__foot">
      <p class="save-status" data-status></p>
      <div class="editor__buttons">
        <button class="button button--danger" type="button" data-action="delete-post">Xóa bài viết</button>
        <button class="button button--primary" type="submit">Lưu thay đổi</button>
      </div>
    </div>
  </form>`;
}

function renderNewPostEditor() {
  const root = $("#post-editor");
  const date = todayISO();

  root.innerHTML = `<form class="editor" id="new-post-form" novalidate>
    <div class="editor__head">
      <div>
        <p class="eyebrow">Bài viết mới</p>
        <h2>Tạo bài viết</h2>
        <p class="file">Tên tệp sẽ được tạo tự động từ tiêu đề.</p>
      </div>
    </div>

    <p class="notice">Dashboard tạo tệp và metadata. Nội dung bài viết được viết tiếp trong ứng dụng soạn Markdown của bạn.</p>

    <div class="form-grid">
      <label class="field field--full">
        <span>Tiêu đề <b>*</b></span>
        <input name="title" type="text" value="" required autofocus autocomplete="off">
      </label>

      <label class="field field--full">
        <span>Phụ đề</span>
        <input name="subtitle" type="text" value="" autocomplete="off">
      </label>

      <label class="field">
        <span>Ngày</span>
        <input name="date" type="date" value="${date}">
      </label>

      <label class="field">
        <span>Nhóm</span>
        <input name="category" type="text" value="" list="category-options" autocomplete="off">
      </label>

      <label class="field">
        <span>Thẻ</span>
        <input name="tags" type="text" value="" placeholder="Cách nhau bằng dấu phẩy" autocomplete="off">
      </label>

      <label class="field field--full">
        <span>Tóm tắt</span>
        <textarea name="summary" rows="3"></textarea>
      </label>

      <div class="field field--full checks">
        <label><input name="featured" type="checkbox"> Bài nổi bật</label>
        <label><input name="draft" type="checkbox" checked> Bản nháp (ẩn khỏi site)</label>
      </div>
    </div>

    <div class="editor__foot">
      <p class="save-status" data-status></p>
      <div class="editor__buttons">
        <button class="button button--ghost" type="button" data-action="cancel-new-post">Hủy</button>
        <button class="button button--primary" type="submit">Tạo bài viết</button>
      </div>
    </div>
  </form>`;
}

function renderLibraryEditor() {
  const item = state.data.library.find((entry) => entry.file === state.selectedLibrary);
  const root = $("#library-editor");

  if (!item) {
    root.innerHTML = `<p class="empty-editor">Chọn một ảnh hoặc PDF ở cột bên trái để sửa metadata.</p>`;
    return;
  }

  const meta = item.meta;
  const typeLabel = item.type === "photo" ? "Ảnh" : "PDF";
  const encodedFile = item.file.split("/").map(encodeURIComponent).join("/");
  const link = previewHref(`/content/library/${encodedFile}`);

  root.innerHTML = `<form class="editor" id="library-form" novalidate>
    <div class="editor__head">
      <div>
        <p class="eyebrow">${typeLabel} · ${escapeHtml(item.ext)}</p>
        <h2>${escapeHtml(meta.title || item.name)}</h2>
        <p class="file">content/library/${escapeHtml(item.file)}</p>
      </div>
      ${
        link
          ? `<a class="button button--ghost" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">Mở tệp ↗</a>`
          : ""
      }
    </div>

    ${
      item.hasMeta
        ? ""
        : `<p class="notice">Tệp này chưa có metadata. Các giá trị dưới đây là mặc định lấy từ tên tệp và ngày sửa.</p>`
    }

    <div class="form-grid">
      <label class="field field--full">
        <span>Tiêu đề</span>
        <input name="title" type="text" value="${escapeHtml(meta.title)}" autocomplete="off">
      </label>

      <label class="field">
        <span>Ngày</span>
        <input name="date" type="date" value="${escapeHtml(meta.date)}">
      </label>

      <label class="field">
        <span>Bộ sưu tập</span>
        <input name="collection" type="text" value="${escapeHtml(meta.collection)}" list="collection-options" autocomplete="off">
      </label>

      <label class="field field--full">
        <span>Mô tả</span>
        <textarea name="description" rows="3">${escapeHtml(meta.description)}</textarea>
      </label>

      <label class="field field--full">
        <span>Thẻ</span>
        <input name="tags" type="text" value="${escapeHtml(meta.tags.join(", "))}" placeholder="Cách nhau bằng dấu phẩy" autocomplete="off">
      </label>
    </div>

    <div class="editor__foot">
      <p class="save-status" data-status></p>
      <div class="editor__buttons">
        <button class="button button--danger" type="button" data-action="delete-library-file">Xóa tệp</button>
        ${
          item.hasMeta
            ? '<button class="button button--danger" type="button" data-action="delete-library-meta">Xóa metadata</button>'
            : ""
        }
        <button class="button button--primary" type="submit">Lưu thay đổi</button>
      </div>
    </div>
  </form>`;
}

/* -------------------------------------------------------------------------- */
/* loading and saving                                                         */
/* -------------------------------------------------------------------------- */

async function loadState({ discard = false } = {}) {
  if (discard) state.dirty = false;
  state.creatingPost = false;

  const data = await request("/api/state");
  state.data = data;

  if (state.selectedPost && !data.posts.some((post) => post.file === state.selectedPost)) {
    state.selectedPost = null;
  }
  if (state.selectedLibrary && !data.library.some((item) => item.file === state.selectedLibrary)) {
    state.selectedLibrary = null;
  }

  if (!state.selectedPost && data.posts.length) state.selectedPost = data.posts[0].file;
  if (!state.selectedLibrary && data.library.length) state.selectedLibrary = data.library[0].file;

  renderAll();
}

function formStatus(form, message, isError = false) {
  const status = $("[data-status]", form);
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function setBusy(form, busy) {
  $$("button, input, textarea", form).forEach((element) => {
    element.disabled = busy;
  });
}

function saveToast(done, result) {
  if (result.build?.skipped) {
    toast(`${done}.`, "ok");
  } else if (result.build?.ok) {
    toast(`${done} và cập nhật site.`, "ok");
  } else {
    toast(`${done}, nhưng build site bị lỗi. Xem terminal.`, "warn");
  }
}

async function savePostForm(form) {
  const title = form.elements.title.value.trim();
  if (!title) {
    formStatus(form, "Tiêu đề không được để trống.", true);
    form.elements.title.focus();
    return;
  }

  const meta = {
    title,
    subtitle: form.elements.subtitle.value,
    date: form.elements.date.value,
    updated: form.elements.updated.value,
    category: form.elements.category.value,
    tags: form.elements.tags.value,
    summary: form.elements.summary.value,
    featured: form.elements.featured.checked,
    draft: form.elements.draft.checked,
  };

  setBusy(form, true);
  formStatus(form, "Đang lưu…");

  try {
    const result = await request("/api/posts", {
      method: "PUT",
      body: JSON.stringify({ file: state.selectedPost, meta }),
    });

    state.dirty = false;
    state.data = result.state;
    renderAll();
    saveToast("Đã lưu bài viết", result);
  } catch (error) {
    setBusy(form, false);
    formStatus(form, error.message, true);
    toast(error.message, "error");
  }
}

async function createPostForm(form) {
  const title = form.elements.title.value.trim();
  if (!title) {
    formStatus(form, "Tiêu đề không được để trống.", true);
    form.elements.title.focus();
    return;
  }

  const meta = {
    title,
    subtitle: form.elements.subtitle.value,
    date: form.elements.date.value,
    category: form.elements.category.value,
    tags: form.elements.tags.value,
    summary: form.elements.summary.value,
    featured: form.elements.featured.checked,
    draft: form.elements.draft.checked,
  };

  setBusy(form, true);
  formStatus(form, "Đang tạo…");

  try {
    const result = await request("/api/posts", {
      method: "POST",
      body: JSON.stringify({ meta }),
    });

    state.creatingPost = false;
    state.selectedPost = result.file;
    state.dirty = false;
    state.data = result.state;
    renderAll();
    saveToast("Đã tạo bài viết", result);
  } catch (error) {
    setBusy(form, false);
    formStatus(form, error.message, true);
    toast(error.message, "error");
  }
}

async function saveLibraryForm(form) {
  const meta = {
    title: form.elements.title.value,
    date: form.elements.date.value,
    description: form.elements.description.value,
    tags: form.elements.tags.value,
    collection: form.elements.collection.value,
  };

  setBusy(form, true);
  formStatus(form, "Đang lưu…");

  try {
    const result = await request("/api/library", {
      method: "PUT",
      body: JSON.stringify({ file: state.selectedLibrary, meta }),
    });

    state.dirty = false;
    state.data = result.state;
    renderAll();
    saveToast("Đã lưu metadata", result);
  } catch (error) {
    setBusy(form, false);
    formStatus(form, error.message, true);
    toast(error.message, "error");
  }
}

async function deleteLibraryMeta(item) {
  const title = item.meta.title || item.name;
  if (!window.confirm(`Xóa metadata của “${title}”? Tệp ảnh/PDF vẫn được giữ nguyên.`)) return;

  try {
    const result = await request("/api/library", {
      method: "PUT",
      body: JSON.stringify({ file: item.file, meta: null }),
    });

    state.dirty = false;
    state.data = result.state;
    renderAll();
    saveToast("Đã xóa metadata; site dùng lại giá trị mặc định", result);
  } catch (error) {
    toast(error.message, "error");
  }
}

function applyDeletion(result, kind, file) {
  const previous = kind === "post" ? state.data.posts : state.data.library;
  const index = Math.max(0, previous.findIndex((item) => item.file === file));

  state.data = result.state;

  const nextList = kind === "post" ? result.state.posts : result.state.library;
  const next = nextList[Math.min(index, nextList.length - 1)] || null;

  if (kind === "post") state.selectedPost = next?.file || null;
  else state.selectedLibrary = next?.file || null;

  state.dirty = false;
  renderAll();
}

async function deletePost(item) {
  const title = item.meta.title || item.file;
  const confirmed = window.confirm(
    `Xóa vĩnh viễn bài viết “${title}”?\n\n` +
      `Tệp content/posts/${item.file} sẽ bị xóa. Ảnh/PDF được tham chiếu trong bài không bị xóa. ` +
      "Thao tác này không thể hoàn tác."
  );
  if (!confirmed) return;

  try {
    const result = await request("/api/posts", {
      method: "DELETE",
      body: JSON.stringify({ file: item.file }),
    });

    applyDeletion(result, "post", item.file);
    saveToast("Đã xóa bài viết", result);
  } catch (error) {
    toast(error.message, "error");
  }
}

async function deleteLibraryFile(item) {
  const title = item.meta.title || item.name;
  const confirmed = window.confirm(
    `Xóa vĩnh viễn tệp “${title}”?\n\n` +
      `Tệp content/library/${item.file} và metadata của nó sẽ bị xóa. ` +
      "Nếu tệp đang được dùng trong bài viết, ảnh/liên kết đó sẽ mất. Thao tác này không thể hoàn tác."
  );
  if (!confirmed) return;

  try {
    const result = await request("/api/library", {
      method: "DELETE",
      body: JSON.stringify({ file: item.file }),
    });

    applyDeletion(result, "library", item.file);
    if (result.warning) toast(result.warning, "warn");
    else saveToast("Đã xóa tệp", result);
  } catch (error) {
    toast(error.message, "error");
  }
}

async function uploadLibraryFile(file) {
  let response;

  try {
    response = await fetch(`/api/library/upload?name=${encodeURIComponent(file.name)}`, {
      method: "POST",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
  } catch {
    throw new Error("Không kết nối được máy chủ dashboard.");
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Lỗi ${response.status}`);
  return data;
}

async function handleLibraryUploads(fileList) {
  const files = [...fileList];
  if (!files.length) return;

  const status = $("#upload-status");
  status.hidden = false;
  const uploaded = [];
  const failed = [];

  for (let index = 0; index < files.length; index += 1) {
    status.textContent = `Đang nhập ${index + 1}/${files.length}: ${files[index].name}`;

    try {
      const result = await uploadLibraryFile(files[index]);
      uploaded.push(result.file);
    } catch (error) {
      failed.push(`${files[index].name}: ${error.message}`);
    }
  }

  if (uploaded.length) {
    status.textContent = "Đang cập nhật site…";

    try {
      const build = await request("/api/rebuild", { method: "POST" });
      const data = await request("/api/state");
      state.data = data;

      const last = uploaded[uploaded.length - 1];
      if (data.library.some((item) => item.file === last)) state.selectedLibrary = last;

      state.dirty = false;
      renderAll();

      if (build.build?.ok) toast(`Đã nhập ${uploaded.length} tệp và cập nhật site.`);
      else toast(`Đã nhập ${uploaded.length} tệp, nhưng build site bị lỗi. Xem terminal.`, "warn");
    } catch (error) {
      toast(`Đã nhập ${uploaded.length} tệp, nhưng chưa cập nhật được site: ${error.message}`, "warn");

      try {
        await loadState({ discard: true });
      } catch {
        /* The import itself succeeded; the status line still says what happened. */
      }
    }
  }

  if (failed.length) {
    status.textContent = `Không nhập được: ${failed.join("; ")}`;
    toast(`Không nhập được ${failed.length} tệp. Xem chi tiết trong cột thư viện.`, "error");
  } else {
    status.hidden = true;
  }

  $("#library-upload").value = "";
}

/* -------------------------------------------------------------------------- */
/* interactions                                                               */
/* -------------------------------------------------------------------------- */

let toastTimer = null;

function toast(message, kind = "ok") {
  const element = $("#toast");
  element.textContent = message;
  element.className = `toast toast--${kind}`;
  element.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    element.hidden = true;
  }, kind === "ok" ? 3500 : 8000);
}

function maybeDiscard() {
  if (!state.dirty) return true;
  const ok = window.confirm("Bạn có thay đổi chưa lưu. Bỏ các thay đổi đó?");
  if (ok) state.dirty = false;
  return ok;
}

function bindEvents() {
  $$("[data-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      if (tab.dataset.tab !== state.activeTab && !maybeDiscard()) return;
      state.activeTab = tab.dataset.tab;
      renderTabs();
      renderPanels();
    });
  });

  $("#post-search").addEventListener("input", (event) => {
    state.postQuery = event.target.value;
    renderPostList();
  });

  $("#new-post-button").addEventListener("click", () => {
    if (state.creatingPost) return;
    if (!maybeDiscard()) return;

    state.creatingPost = true;
    state.dirty = false;
    renderPostList();
    renderPostEditor();
  });

  $("#upload-button").addEventListener("click", () => {
    if (!maybeDiscard()) return;
    $("#library-upload").click();
  });

  $("#library-upload").addEventListener("change", (event) => {
    handleLibraryUploads(event.target.files);
  });

  $("#library-search").addEventListener("input", (event) => {
    state.libraryQuery = event.target.value;
    renderLibraryList();
  });

  $$("[data-library-type]").forEach((button) => {
    button.addEventListener("click", () => {
      state.libraryType = button.dataset.libraryType;
      $$("[data-library-type]").forEach((other) => {
        other.classList.toggle("is-active", other === button);
      });
      renderLibraryList();
    });
  });

  $("#post-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-file]");
    if (!button) return;
    if (!state.creatingPost && button.dataset.file === state.selectedPost) return;
    if (!maybeDiscard()) return;

    state.creatingPost = false;
    state.selectedPost = button.dataset.file;
    $$("#post-list .item").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.file === state.selectedPost);
    });
    renderPostEditor();
  });

  $("#library-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-file]");
    if (!button || button.dataset.file === state.selectedLibrary) return;
    if (!maybeDiscard()) return;

    state.selectedLibrary = button.dataset.file;
    $$("#library-list .item").forEach((item) => {
      item.classList.toggle("is-selected", item.dataset.file === state.selectedLibrary);
    });
    renderLibraryEditor();
  });

  $("#reload-button").addEventListener("click", async () => {
    if (!maybeDiscard()) return;
    try {
      await loadState({ discard: true });
      toast("Đã tải lại dữ liệu.");
    } catch (error) {
      toast(error.message, "error");
    }
  });

  document.addEventListener("input", (event) => {
    if (event.target.closest("form")) state.dirty = true;
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;

    if (form.id === "post-form") {
      event.preventDefault();
      savePostForm(form);
    } else if (form.id === "new-post-form") {
      event.preventDefault();
      createPostForm(form);
    } else if (form.id === "library-form") {
      event.preventDefault();
      saveLibraryForm(form);
    }
  });

  $("#post-editor").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    if (button.dataset.action === "cancel-new-post") {
      if (!maybeDiscard()) return;
      state.creatingPost = false;
      renderPostList();
      renderPostEditor();
      return;
    }

    if (button.dataset.action === "delete-post") {
      const item = state.data.posts.find((post) => post.file === state.selectedPost);
      if (item) deletePost(item);
    }
  });

  $("#library-editor").addEventListener("click", (event) => {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const item = state.data.library.find((entry) => entry.file === state.selectedLibrary);
    if (!item) return;

    if (button.dataset.action === "delete-library-meta") deleteLibraryMeta(item);
    else if (button.dataset.action === "delete-library-file") deleteLibraryFile(item);
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;

    const form =
      state.activeTab === "posts"
        ? state.creatingPost
          ? $("#new-post-form")
          : $("#post-form")
        : $("#library-form");
    if (!form) return;

    event.preventDefault();
    form.requestSubmit();
  });

  window.addEventListener("beforeunload", (event) => {
    if (!state.dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });
}

async function init() {
  bindEvents();

  try {
    await loadState();
  } catch (error) {
    $("#status-note").textContent = `Không tải được dữ liệu: ${error.message}`;
    toast(`Không tải được dữ liệu: ${error.message}`, "error");
  }
}

init();
