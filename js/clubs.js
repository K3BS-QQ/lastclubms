/* ==========================
   Clubs Management - Full rewrite (with Sub-Club support)
   Drop this whole file in place of your previous clubs JS.
========================== */

(function () {
  // helper: escape single quotes & backslashes for safe use inside onclick attr strings
  function escAttr(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  }

  /* ==========================
     Load Clubs Page
  ========================== */
  function loadClubs() {
    // assumes `user` and `mainContent` exist in the global scope
    if (user.role === "member") {
      mainContent.innerHTML = `
        <h3>Clubs Management</h3>
        <p>Members cannot manage clubs. View only.</p>
        <div id="clubs-list" style="margin-top: 20px;">Loading clubs...</div>
      `;
      fetchClubsList();
      return;
    }

    mainContent.innerHTML = `
      <h3>Clubs Management</h3>

      ${user.role === "admin" ? `

      <form id="add-club-form" class="account-form" enctype="multipart/form-data">
        <input type="text" id="club-name" name="name" placeholder="Club Name" required />
        <input type="text" id="club-description" name="description" placeholder="Description" required />
        <select id="club-parent" name="parent_id">
          <option value="">-- No Parent (Main Club) --</option>
        </select>

        <button type="submit" class="btn-add">Add Club</button>
      </form>
      ` : `<p class="note">⚠️ Staff cannot create clubs. You can only upload files.</p>`}

      <!-- Filters -->
      <div class="account-filters">
        <input type="text" id="search-club" placeholder="🔍 Search club..." oninput="filterClubs()" />
        <select id="filter-status" onchange="filterClubs()">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      <!-- Clubs List -->
      <div id="clubs-list" style="margin-top: 20px;">Loading clubs...</div>

      <!-- Edit Club Modal -->
      <div id="edit-club-modal" class="modal-overlay">
        <div class="modal-content">
          <h3>Edit Club</h3>
          <form id="edit-club-form" class="account-form">
            <input type="hidden" id="edit-club-id" />
            <div class="form-row">
              <label for="edit-club-name">Club Name</label>
              <input type="text" id="edit-club-name" required />
            </div>
            <div class="form-row">
              <label for="edit-club-description">Description</label>
              <input type="text" id="edit-club-description" required />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" onclick="closeClubModal()">Cancel</button>
              <button type="submit" class="btn-save">Save Changes</button>
            </div>
          </form>
        </div>
      </div>

      <!-- NEW: Add Member Modal -->
      <div id="add-member-modal" class="modal-overlay">
        <div class="modal-content">
          <h3>Add Member to <span id="add-member-club-name"></span></h3>
          <form id="add-member-form" class="account-form">
            <input type="hidden" id="add-member-club-id" name="club_id" />
            <div class="form-row">
              <label for="add-member-name">Member Full Name</label>
              <input type="text" id="add-member-name" name="member_name" placeholder="Full Name" required />
            </div>
            <div class="form-row">
              <label for="add-member-role">Role</label>
              <select id="add-member-role" name="role" required>
                <option value="Member">Member</option>
                <option value="Adviser">Adviser</option>
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Auditor">Auditor</option>
                <option value="PRO">PRO</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" onclick="closeAddMemberModal()">Cancel</button>
              <button type="submit" class="btn-save">Add Member</button>
            </div>
          </form>
        </div>
      </div>
      <!-- END NEW: Add Member Modal -->

      <!-- Edit Member Modal -->
      <div id="edit-member-modal" class="modal-overlay">
        <div class="modal-content">
          <h3>Edit Member</h3>
          <form id="edit-member-form" class="account-form">
            <input type="hidden" id="edit-member-id" />
            <div class="form-row">
              <label for="edit-member-name">Name</label>
              <input type="text" id="edit-member-name" required />
            </div>
            <div class="form-row">
              <label for="edit-member-role">Role</label>
              <select id="edit-member-role" required>
                <option value="Adviser">Adviser</option>
                <option value="President">President</option>
                <option value="Vice President">Vice President</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Member">Member</option>
              </select>
            </div>
            <div class="modal-actions">
              <button type="button" class="btn-cancel" onclick="closeMemberModal()">Cancel</button>
              <button type="submit" class="btn-save">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Files Modal (omitted for brevity) -->
      <div id="files-modal" class="modal-overlay">
        <div class="modal-content">
          <h3 id="files-modal-title">Club Files</h3>
          <form id="upload-file-form" enctype="multipart/form-data">
            <input type="hidden" name="club_id" id="file-club-id" />
            <input type="file" name="file" required />
            <button type="submit" class="btn-save">Upload</button>
          </form>
          <div id="files-list" style="margin-top:15px;">Loading...</div>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" onclick="closeFilesModal()">Close</button>
          </div>
        </div>
      </div>

      <!-- File Preview Modal (omitted for brevity) -->
      <div id="preview-modal" class="modal-overlay">
        <div class="modal-content">
          <span class="close" onclick="closePreview()">&times;</span>
          <div id="file-preview" style="height:80vh; overflow:auto;"></div>
        </div>
      </div>
    `;

    // populate parent dropdown (safe: check element exists)
    const parentSelect = document.getElementById("club-parent");
    if (parentSelect) {
      fetch("php/get_clubs.php")
        .then(res => res.json())
        .then(data => {
          if (data && data.success && Array.isArray(data.clubs)) {
            // we only add top-level clubs as parents (those with no parent_id)
            data.clubs.forEach(c => {
              // If your get_clubs returns parent_id please adjust filter if needed
              const opt = document.createElement("option");
              opt.value = c.id;
              opt.textContent = c.name;
              parentSelect.appendChild(opt);
            });
          }
        })
        .catch(err => {
          console.error("Failed to populate parent clubs", err);
        });
    }

    // fetch the list
    fetchClubsList();

    // handle add-club form if present
    const addForm = document.getElementById("add-club-form");
    if (addForm) {
      addForm.addEventListener("submit", e => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("name", document.getElementById("club-name").value.trim());
        formData.append("description", document.getElementById("club-description").value.trim());
        const parentEl = document.getElementById("club-parent");
        if (parentEl) formData.append("parent_id", parentEl.value || '');
        const fileInput = document.getElementById("club-file");
        if (fileInput && fileInput.files.length > 0) {
          formData.append("file", fileInput.files[0]);
        }
        fetch("php/add_club.php", { method: "POST", body: formData })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              alert("Club added!");
              addForm.reset();
              fetchClubsList();
            } else {
              alert("Failed: " + (data.message || "error"));
            }
          })
          .catch(err => {
            console.error("Add club error", err);
            alert("Error adding club.");
          });
      });
    }
    
    // handle add-member form submission
    const addMemberForm = document.getElementById("add-member-form");
    if (addMemberForm) {
        addMemberForm.addEventListener("submit", addMemberToClub);
    }
    
  } // end loadClubs

  /* ==========================
     Fetch Clubs List (renders main clubs and either preloaded children or remote placeholder)
  ========================== */
  function fetchClubsList() {
    const div = document.getElementById("clubs-list");
    if (!div) return;
    div.innerHTML = "Loading clubs...";

    fetch("php/get_clubs.php")
      .then(res => res.json())
      .then(data => {
        if (!(data && data.success && Array.isArray(data.clubs))) {
          div.innerHTML = "<p>No clubs found.</p>";
          return;
        }

        const clubs = data.clubs;

        // utility to detect top-level clubs (adjust depending on your DB representation)
        function isTop(c) {
          return c.parent_id === null || c.parent_id === undefined || c.parent_id === 0 || c.parent_id === '0' || c.parent_id === '';
        }

        const hasParentField = clubs.some(c => c.parent_id !== undefined && c.parent_id !== null);

        if (hasParentField) {
          // group children
          const childrenMap = {};
          clubs.forEach(c => {
            const pid = (c.parent_id === null || c.parent_id === undefined) ? '0' : String(c.parent_id);
            if (!childrenMap[pid]) childrenMap[pid] = [];
            childrenMap[pid].push(c);
          });

          // main/top-level clubs
          const mainClubs = clubs.filter(isTop);

          // render main clubs with their preloaded children (hidden by default)
          div.innerHTML = mainClubs.map(c => {
            const children = childrenMap[String(c.id)] || [];
            const childHtml = children.map(sc => renderClubRowHtml(sc, true)).join('');
            return `
              <div class="account-row" id="club-${c.id}">
                ${renderClubMainHtml(c, /* containsChildContainer */ true, childHtml)}
              </div>
            `;
          }).join('');

        } else {
          // no parent_id provided by backend: render flat list; subclubs button will fetch remote endpoint when clicked
          div.innerHTML = clubs.map(c => {
            return `
              <div class="account-row" id="club-${c.id}">
                ${renderClubMainHtml(c, /* containsChildContainer */ true, '')}
              </div>
            `;
          }).join('');
        }
      })
      .catch(err => {
        console.error("Error loading clubs:", err);
        div.innerHTML = "<p>Error loading clubs.</p>";
      });
  }

  // helper: renders main club HTML (name + tags + subclub container + actions)
  function renderClubMainHtml(c, containsChildContainer, childHtml) {
    const nameEsc = escAttr(c.name);
    const descEsc = escAttr(c.description || '');
    const status = c.status || 'unknown';
    const members = (c.members !== undefined && c.members !== null) ? c.members : '';
    return `
      <div style="display:flex; align-items:flex-start; gap:12px; width:100%;">
        <div class="account-avatar" style="flex:0 0 48px; display:flex; align-items:center; justify-content:center;">
          ${getClubIcon(c.name)}
        </div>

        <div class="account-info" style="flex:1;">
          <div class="account-name" style="font-weight:600;">${c.name}</div>
          <div class="club-tags" style="margin-top:6px;">
            <span class="club-tag">${c.description || "No description"}</span>
            <span class="club-tag ${status}">Status: ${status}</span>
            <span class="club-tag">${members} Members</span>
          </div>

          ${containsChildContainer ? `<div class="subclubs" id="subclubs-${c.id}" data-mode="${childHtml ? 'preloaded' : 'remote'}" data-loaded="${childHtml ? 'true' : 'false'}" style="margin-top:10px; margin-left:8px; display:none;">
            ${childHtml || ''}
          </div>` : ''}
        </div>

        <div class="account-actions" style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
          ${user.role === "admin" ? `
            <div style="display:flex; gap:8px;">
              <button class="btn-edit" onclick="openClubEditModal(${c.id}, '${nameEsc}', '${descEsc}')">Edit</button>
              <button class="btn-delete" onclick="deleteClub(${c.id})">Delete</button>
              <button class="btn-status ${status === 'active' ? 'btn-disable' : 'btn-enable'}" onclick="toggleClubStatus(${c.id}, '${status}')">
                ${status === 'active' ? 'Disable' : 'Enable'}
              </button>
            </div>` : ''}
          <div style="display:flex; gap:8px;">
            <button class="btn-files" onclick="openFilesModal(${c.id}, '${nameEsc}')">Files</button>
            <button class="btn-add-member" onclick="openAddMemberModal(${c.id}, '${nameEsc}')">Add Member</button> <!-- NEW BUTTON -->
            <button class="btn-subclubs" onclick="toggleSubClubs(${c.id})">Sub-Clubs</button>
          </div>
        </div>
      </div>
    `;
  }

  // helper: renders a child club row (used for preloaded children)
function renderClubRowHtml(sc, isChild) {
  const nameEsc = escAttr(sc.name);
  const descEsc = escAttr(sc.description || '');
  const status = sc.status || 'unknown';
  const members = (sc.members !== undefined && sc.members !== null) ? sc.members : '';
  const icon = getClubIcon(sc.name);

  return `
    <div class="subclub-minimal-card ${status === 'active' ? 'active' : 'inactive'}">
      <div class="subclub-info">
        <div class="subclub-header">
          <span class="subclub-icon">${icon}</span>
          <h4>${sc.name}</h4>
        </div>
        <p>${sc.description || "No description provided."}</p>
        <div class="subclub-meta">
          <span>${members} members</span>
          <span class="status ${status}">${status}</span>
        </div>
      </div>

      ${user.role === "admin" ? `
        <div class="subclub-actions">
          <button class="btn-add-member" onclick="openAddMemberModal(${sc.id}, '${nameEsc}')">Add Member</button> <!-- NEW BUTTON -->
          <button class="btn-minimal edit" onclick="openClubEditModal(${sc.id}, '${nameEsc}', '${descEsc}')">Edit</button>
          <button class="btn-minimal delete" onclick="deleteClub(${sc.id})">Delete</button>
        </div>
      ` : ''}
    </div>
  `;
}

  /* ==========================
     Add Member Logic
  ========================== */
  function openAddMemberModal(clubId, clubName) {
    document.getElementById("add-member-club-id").value = clubId;
    document.getElementById("add-member-club-name").textContent = clubName;
    document.getElementById("add-member-modal").classList.add("active");
  }

  function closeAddMemberModal() {
    document.getElementById("add-member-modal").classList.remove("active");
    document.getElementById("add-member-form").reset();
  }

  function addMemberToClub(e) {
    e.preventDefault();
    
    const clubId = document.getElementById("add-member-club-id").value;
    const memberName = document.getElementById("add-member-name").value.trim();
    const role = document.getElementById("add-member-role").value;

    if (!memberName) {
        alert("Please enter the member's full name.");
        return;
    }
    
    fetch("php/add_member_to_club.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ club_id: clubId, member_name: memberName, role: role })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert(`Member ${memberName} added to club!`);
            closeAddMemberModal();
            fetchClubsList(); // Refresh list to update member count
        } else {
            // This is where the 2-club limit rejection will happen
            alert("Failed to add member: " + (data.message || "Unknown error."));
        }
    })
    .catch(err => {
        console.error("Add member error", err);
        alert("Error communicating with server.");
    });
  }
  /* ==========================
     Toggle & Load Sub-Clubs (omitted for brevity)
  ========================== */
  function toggleSubClubs(parentId) {
    const container = document.getElementById(`subclubs-${parentId}`);
    if (!container) return;

    // if already visible just hide
    if (container.style.display === "block") {
      container.style.display = "none";
      return;
    }

    // if container is preloaded -> show immediately
    const mode = container.getAttribute('data-mode') || 'remote';
    const alreadyLoaded = container.getAttribute('data-loaded') === 'true';

    if (mode === 'preloaded' && alreadyLoaded) {
      container.style.display = "block";
      return;
    }

    // otherwise fetch remote sub-clubs (fallback) and populate
    container.style.display = "block";
    container.innerHTML = "<div style='padding:8px;'>Loading sub-clubs...</div>";

    fetch(`php/get_clubs.php?parent_id=${parentId}`)
  .then(res => res.json())
  .then(data => {
    if (data && data.success && Array.isArray(data.clubs) && data.clubs.length > 0) {
      container.innerHTML = data.clubs.map(sc => renderClubRowHtml(sc, true)).join('');
    } else {
      container.innerHTML = "<div style='padding:8px; color:#888;'>No sub-clubs found.</div>";
    }
    container.setAttribute('data-loaded', 'true');
    container.setAttribute('data-mode', 'remote');
  })
;
  }

  /* ==========================
     Edit Club Modal (omitted for brevity)
  ========================== */
  function openClubEditModal(id, name, desc) {
    document.getElementById("edit-club-id").value = id;
    document.getElementById("edit-club-name").value = name;
    document.getElementById("edit-club-description").value = desc;
    document.getElementById("edit-club-modal").classList.add("active");

    document.getElementById("edit-club-form").onsubmit = e => {
      e.preventDefault();
      const newName = document.getElementById("edit-club-name").value.trim();
      const newDesc = document.getElementById("edit-club-description").value.trim();
      fetch("php/update_club.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName, description: newDesc })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Updated!");
            fetchClubsList();
            closeClubModal();
          } else {
            alert("Error updating club.");
          }
        })
        .catch(err => {
          console.error("Update club error", err);
          alert("Error updating club.");
        });
    };
  }
  function closeClubModal() {
    document.getElementById("edit-club-modal").classList.remove("active");
  }

  /* ==========================
     Edit Member Modal (omitted for brevity)
  ========================== */
  function openMemberEditModal(id, name, role) {
    document.getElementById("edit-member-id").value = id;
    document.getElementById("edit-member-name").value = name;
    document.getElementById("edit-member-role").value = role;
    document.getElementById("edit-member-modal").classList.add("active");

    document.getElementById("edit-member-form").onsubmit = e => {
      e.preventDefault();
      const newName = document.getElementById("edit-member-name").value.trim();
      const newRole = document.getElementById("edit-member-role").value.trim();
      fetch("php/update_member.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: newName, role: newRole })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Member updated!");
            if (typeof fetchMembersList === 'function') fetchMembersList();
            closeMemberModal();
          } else {
            alert("Error updating member.");
          }
        })
        .catch(err => {
          console.error("Update member error", err);
          alert("Error updating member.");
        });
    };
  }
  function closeMemberModal() {
    document.getElementById("edit-member-modal").classList.remove("active");
  }

  /* ==========================
     Club Files functions (omitted for brevity)
  ========================== */
 function openFilesModal(clubId, clubName) {
  const modal = document.getElementById("files-modal");
  if (!modal) return;
  modal.style.display = "flex";
  document.getElementById("files-modal-title").textContent = `${clubName} - Files`;
  document.getElementById("file-club-id").value = clubId;

  // Staff can upload, but not delete others' files
  const uploadForm = modal.querySelector("#upload-file-form");
  if (user.role === "staff") {
    uploadForm.style.display = "block"; // allow upload
  } else if (user.role === "member") {
    uploadForm.style.display = "none"; // hide upload for members
  } else {
    uploadForm.style.display = "block"; // admins can upload too
  }

  loadFiles(clubId);
}

  function closeFilesModal() {
    const modal = document.getElementById("files-modal");
    if (!modal) return;
    modal.style.display = "none";
  }
  function loadFiles(clubId) {
    const listDiv = document.getElementById("files-list");
    if (!listDiv) return;
    listDiv.innerHTML = "Loading...";
    fetch("php/get_files.php?club_id=" + clubId)
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.files) && data.files.length > 0) {
          listDiv.innerHTML = data.files.map(f => {
            const ext = f.file_name.split('.').pop().toLowerCase();
            let iconClass = "fa-file file-icon other";
            if (ext === "pdf") iconClass = "fa-file-pdf file-icon pdf";
            else if (["jpg","jpeg","png","gif"].includes(ext)) iconClass = "fa-file-image file-icon image";
            else if (["doc","docx"].includes(ext)) iconClass = "fa-file-word file-icon doc";
            else if (["xls","xlsx","csv"].includes(ext)) iconClass = "fa-file-excel file-icon xls";
            else if (["ppt","pptx"].includes(ext)) iconClass = "fa-file-powerpoint file-icon ppt";
            else if (ext === "txt") iconClass = "fa-file-lines file-icon txt";
            return `
              <div class="file-row">
                <div style="display:flex; align-items:center; gap:5px;">
                  <i class="fa-solid ${iconClass}"></i>
                  <a href="#" onclick="previewFile('${escAttr(f.download_url)}', '${escAttr(f.file_name)}');return false;">
                    ${f.file_name}
                  </a>
                </div>
                <small>(${f.uploader} - ${f.uploaded_at})</small>
                ${user.role === "admin" ? `<button onclick="deleteFile(${f.id}, ${clubId})" class="btn-delete">Delete</button>` : ""}

              </div>
            `;
          }).join("");
        } else {
          listDiv.innerHTML = "<p>No files uploaded yet.</p>";
        }
      })
      .catch(err => {
        console.error("Load files error", err);
        listDiv.innerHTML = "<p>Error loading files.</p>";
      });
  }

  // upload file handler (delegated)
  document.addEventListener("submit", function (e) {
    if (e.target && e.target.id === "upload-file-form") {
      e.preventDefault();
      const formData = new FormData(e.target);
      fetch("php/upload_file.php", { method: "POST", body: formData })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("File uploaded!");
            loadFiles(formData.get("club_id"));
            e.target.reset();
          } else {
            alert("Upload failed: " + (data.message || "error"));
          }
        })
        .catch(err => {
          console.error("Upload file error", err);
          alert("Error uploading file.");
        });
    }
  });

  function deleteFile(fileId, clubId) {
    if (!confirm("Delete this file?")) return;
    const formData = new FormData();
    formData.append("id", fileId);
    fetch("php/delete_file.php", { method: "POST", body: formData })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("File deleted!");
          loadFiles(clubId);
        } else {
          alert("Error: " + (data.message || "error"));
        }
      })
      .catch(err => {
        console.error("Delete file error", err);
        alert("Error deleting file.");
      });
  }

  /* ==========================
     File Preview (omitted for brevity)
  ========================== */
  function previewFile(downloadUrl, fileName) {
    const modal = document.getElementById("preview-modal");
    const preview = document.getElementById("file-preview");
    if (!modal || !preview) return;
    let content = "";
    const lower = fileName.toLowerCase();
    if (lower.match(/\.(jpg|jpeg|png|gif)$/)) {
      content = `<img src="${downloadUrl}" style="max-width:100%; max-height:100%; display:block; margin:auto;">`;
    } else if (lower.endsWith(".pdf")) {
      content = `<iframe src="${downloadUrl}" style="width:100%; height:100%;" frameborder="0"></iframe>`;
    } else {
      content = `<p>Preview not available. <a href="${downloadUrl}" target="_blank" rel="noopener">Download</a></p>`;
    }
    preview.innerHTML = content;
    modal.style.display = "flex";
  }
  function closePreview() {
    const modal = document.getElementById("preview-modal");
    if (modal) modal.style.display = "none";
    const preview = document.getElementById("file-preview");
    if (preview) preview.innerHTML = "";
  }

  /* ==========================
     Helpers: icons, delete, toggle status, filter (omitted for brevity)
  ========================== */
  function getClubIcon(name) {
    const club = String(name || '').toLowerCase();
    if (club.includes("glee") || club.includes("choir")) return '<i class="fa-solid fa-music"></i>';
    if (club.includes("guidance") || club.includes("counsel")) return '<i class="fa-solid fa-hands-helping"></i>';
    if (club.includes("first aid") || club.includes("aider")) return '<i class="fa-solid fa-kit-medical"></i>';
    if (club.includes("english") || club.includes("ella")) return '<i class="fa-solid fa-book-open"></i>';
    if (club.includes("math")) return '<i class="fa-solid fa-square-root-variable"></i>';
    if (club.includes("ministry") || club.includes("campus")) return '<i class="fa-solid fa-church"></i>';
    return '<i class="fa-solid fa-users"></i>';
  }

  function deleteClub(id) {
    if (!confirm("Are you sure?")) return;
    fetch("php/delete_club.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Deleted!");
          fetchClubsList();
        } else alert("Failed!");
      })
      .catch(err => {
        console.error("Delete club error", err);
        alert("Error deleting club.");
      });
  }

  function toggleClubStatus(id, currentStatus) {
    const newStatus = currentStatus === "active" ? "disabled" : "active";
    fetch("php/update_club_status.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert(`Club ${newStatus} successfully!`);
          fetchClubsList();
        } else {
          alert("Failed to update club status: " + (data.message || "error"));
        }
      })
      .catch(err => {
        console.error("Toggle club status error", err);
        alert("Error toggling club status.");
      });
  }

  function filterClubs() {
    const searchEl = document.getElementById("search-club");
    const statusEl = document.getElementById("filter-status");
    const search = searchEl ? searchEl.value.toLowerCase() : '';
    const status = statusEl ? statusEl.value : 'all';
    document.querySelectorAll("#clubs-list .account-row").forEach(row => {
      const nameEl = row.querySelector(".account-name");
      const tagsEl = row.querySelector(".club-tags");
      const name = nameEl ? nameEl.textContent.toLowerCase() : '';
      const tags = tagsEl ? tagsEl.textContent.toLowerCase() : '';
      const hasText = name.includes(search) || tags.includes(search);
      const tagStatus = (tagsEl && tagsEl.querySelector(".club-tag:nth-child(2)")) ? tagsEl.querySelector(".club-tag:nth-child(2)").textContent.toLowerCase() : '';
      const matchesStatus = status === "all" || tagStatus.includes(status);
      row.style.display = (hasText && matchesStatus) ? "flex" : "none";
    });
  }

  /* ==========================
     Expose functions globally that the HTML uses (onclick strings rely on global names)
  ========================== */
  window.loadClubs = loadClubs;
  window.fetchClubsList = fetchClubsList;
  window.toggleSubClubs = toggleSubClubs;
  window.openClubEditModal = openClubEditModal;
  window.closeClubModal = closeClubModal;
  window.openMemberEditModal = openMemberEditModal;
  window.closeMemberModal = closeMemberModal;
  window.openFilesModal = openFilesModal;
  window.closeFilesModal = closeFilesModal;
  window.loadFiles = loadFiles;
  window.deleteFile = deleteFile;
  window.previewFile = previewFile;
  window.closePreview = closePreview;
  window.getClubIcon = getClubIcon;
  window.deleteClub = deleteClub;
  window.toggleClubStatus = toggleClubStatus;
  window.filterClubs = filterClubs;
  window.openAddMemberModal = openAddMemberModal; // EXPOSE NEW FUNCTION
  window.closeAddMemberModal = closeAddMemberModal; // EXPOSE NEW FUNCTION
  window.addMemberToClub = addMemberToClub; // EXPOSE NEW FUNCTION


  // auto-run when script loads (if you prefer explicit call, remove the line below)
  // loadClubs();

})(); // end IIFE
