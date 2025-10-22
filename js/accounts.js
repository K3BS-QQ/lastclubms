/* ======================
   Load Accounts Page
====================== */
function loadAccounts() {
  const mainContent = document.getElementById("content");
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user) return;

  mainContent.innerHTML = `
    <h3>Accounts Management</h3>

    ${
      user.role === "admin"
        ? `
        <!-- Admin Add Account Form -->
        <form id="add-account-form" class="account-form">
          <div class="form-row">
            <input type="text" id="account-username" placeholder="Username" required />
            <input type="password" id="account-password" placeholder="Password" required />
            <select id="account-role">
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
            <label>Assign Clubs:</label>
            <select id="account-clubs">
              <option value="" disabled selected>Select a club...</option>
            </select>
            <div id="selected-clubs"></div>
          </div>
          <small class="club-limit-note">⚠ Max 2 clubs allowed</small>
          <button type="submit" class="btn-add">Add Account</button>
        </form>
      `
        : user.role === "staff"
        ? `
        <!-- Staff Add Member Form -->
        <form id="add-account-form" class="account-form">
          <input type="text" id="account-username" placeholder="Member Username" required />
          <input type="password" id="account-password" placeholder="Password" required />
          <input type="hidden" id="account-role" value="member" />
          <label for="account-clubs">Assign to Club:</label>
          <select id="account-clubs"></select>
          <div id="selected-clubs"></div>
          <button type="submit" class="btn-add">Add Member</button>
        </form>
      `
        : ""
    }

    <!-- Filters -->
    <div class="account-filters">
      <input type="text" id="search-account" placeholder="🔍 Search by username or club..." />
      <select id="filter-role">
        <option value="">All Roles</option>
        <option value="admin">Admin</option>
        <option value="staff">Staff</option>
        <option value="member">Member</option>
      </select>
    </div>
    
    <!-- Accounts List -->
    <div id="accounts-list" class="accounts-container">Loading accounts...</div>

    <!-- Edit Modal -->
    <div id="edit-modal" class="modal-overlay">
      <div class="modal-box">
        <h3>Edit Account</h3>
        <form id="edit-account-form">
          <input type="hidden" id="edit-id" />
          <label>Username:</label>
          <input type="text" id="edit-username" required />
          <label>Role:</label>
          <select id="edit-role">
            <option value="member">Member</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>

          <label>Assign Clubs:</label>
          <select id="edit-clubs">
            <option value="" disabled selected>Select a club...</option>
          </select>
          <div id="edit-selected-clubs"></div>
          <small class="club-limit-note">⚠ Max 2 clubs allowed</small>

          <div class="modal-actions">
  <button type="button" class="action-btn delete-btn" onclick="closeEditModal()">Cancel</button>
  <button type="submit" class="action-btn edit-btn">Save</button>
</div>

        </form>
      </div>
    </div>
  `;

  /* ======================
     Load Clubs for Dropdowns
  ====================== */
  if (user.role === "admin") {
    fetch("php/get_clubs.php")
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const select = document.getElementById("account-clubs");
          data.clubs.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            select.appendChild(opt);
          });
          initClubSelect("account-clubs", "selected-clubs", "add");

          // For edit modal
          const editSelect = document.getElementById("edit-clubs");
          data.clubs.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c.id;
            opt.textContent = c.name;
            editSelect.appendChild(opt);
          });
          initClubSelect("edit-clubs", "edit-selected-clubs", "edit");
        }
      });
  } else if (user.role === "staff") {
    const select = document.getElementById("account-clubs");
    const clubs = user.clubs || [];
    clubs.forEach(club => {
      const opt = document.createElement("option");
      opt.value = club.id;
      opt.textContent = club.name;
      select.appendChild(opt);
    });
    initClubSelect("account-clubs", "selected-clubs", "add");
  }

  /* ======================
     Submit Add Account
  ====================== */
  const addForm = document.getElementById("add-account-form");
  if (addForm) {
    addForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const username = document.getElementById("account-username").value.trim();
      const password = document.getElementById("account-password").value;
      const role = document.getElementById("account-role")
        ? document.getElementById("account-role").value
        : "member";

      const clubIds = getSelectedClubIds("add");

      if ((role === "member" || role === "staff") && clubIds.length === 0) {
        alert("Please assign at least 1 club before creating this account.");
        return;
      }
      if (clubIds.length > 2) {
        alert("⚠ You can assign a maximum of 2 clubs.");
        return;
      }

      fetch("php/add_account.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role, club_ids: clubIds }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            alert("Account added!");
            addForm.reset();
            resetClubSelect("add");
            fetchAccounts();
          } else {
            alert("Failed: " + (data.message || "Cannot add account"));
          }
        })
        .catch(err => console.error(err));
    });
  }

  fetchAccounts();
}

/* ======================
   Club Select Handler
====================== */
const selectedClubsStore = { add: [], edit: [] };

function initClubSelect(selectId, displayId, key, max = 2) {
  const select = document.getElementById(selectId);
  const display = document.getElementById(displayId);

  select.addEventListener("change", () => {
    const selectedValue = select.value;
    const selectedText = select.options[select.selectedIndex].text;

    if (!selectedValue) return;
    if (selectedClubsStore[key].some(c => c.id === selectedValue)) {
      select.value = "";
      return;
    }

    if (selectedClubsStore[key].length >= max) {
      alert(`⚠ You can only assign up to ${max} clubs.`);
      select.value = "";
      return;
    }

    selectedClubsStore[key].push({ id: selectedValue, name: selectedText });
    updateDisplay();
    select.value = "";
  });

  function updateDisplay() {
    display.innerHTML = selectedClubsStore[key]
      .map(c => `<span class="club-tag">${c.name} <button type="button" onclick="removeClub('${c.id}', '${key}', '${displayId}')">x</button></span>`)
      .join("");
  }

  window.removeClub = function (id, key, displayId) {
    selectedClubsStore[key] = selectedClubsStore[key].filter(c => c.id !== id);
    document.getElementById(displayId).innerHTML = selectedClubsStore[key]
      .map(c => `<span class="club-tag">${c.name} <button type="button" onclick="removeClub('${c.id}', '${key}', '${displayId}')">x</button></span>`)
      .join("");
  };
}

function getSelectedClubIds(key) {
  return selectedClubsStore[key].map(c => c.id);
}

function resetClubSelect(key) {
  selectedClubsStore[key] = [];
  if (key === "add") document.getElementById("selected-clubs").innerHTML = "";
  if (key === "edit") document.getElementById("edit-selected-clubs").innerHTML = "";
}

/* ======================
   Fetch Accounts + Filters
====================== */
function fetchAccounts() {
  fetch("php/get_accounts.php")
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById("accounts-list");
      const user = JSON.parse(sessionStorage.getItem("user"));

      if (data.success && Array.isArray(data.accounts)) {
        let accounts = data.accounts;

        if (user.role === "staff") {
          const staffClubIds = (user.clubs || []).map(c => String(c.id));
          accounts = accounts.filter(a => a.role === "member" && a.clubs?.some(c => staffClubIds.includes(String(c.id))));
        }

        div.innerHTML = accounts.map(a => {
          let roleBadge = `<span class="account-role member">Member</span>`;
          if (a.role.toLowerCase() === "admin") {
            roleBadge = `<span class="account-role admin">Admin</span>`;
          } else if (a.role.toLowerCase() === "staff") {
            roleBadge = `<span class="account-role staff">Staff</span>`;
          }

          let actions = "";
          if (user.role === "admin") {
            actions = `
              <button class="action-btn edit-btn" onclick='openEditModal(${a.id}, "${a.username}", "${a.role}", ${JSON.stringify(a.clubs || [])})'>Edit</button>
              <button class="action-btn delete-btn" onclick="deleteAccount(${a.id})">Delete</button>
            `;
          } else if (user.role === "staff" && a.role === "member") {
            actions = `<button class="action-btn edit-btn" onclick='openEditModal(${a.id}, "${a.username}", "${a.role}", ${JSON.stringify(a.clubs || [])})'>Edit</button>`;
          }

          return `
            <div class="account-row" id="account-${a.id}">
              <div class="account-avatar">${a.username.charAt(0).toUpperCase()}</div>
              <div class="account-info">
                <div class="account-name">${a.username} ${roleBadge}</div>
                <div class="joined-date">🕒 ${new Date(a.created_at).toLocaleString()}</div>
                <div class="club-tags">
                  ${
                    a.role.toLowerCase() === "admin"
                      ? `<span class="club-tag">Access to all clubs</span>`
                      : a.clubs && a.clubs.length > 0
                        ? a.clubs.map(c => `<span class="club-tag">${c.name}</span>`).join("")
                        : `<span class="club-tag">No club assigned</span>`
                  }
                </div>
              </div>
              <div class="account-actions">${actions}</div>
            </div>
          `;
        }).join("");

        /* Apply Search & Filters */
        const searchInput = document.getElementById("search-account");
        const filterRole = document.getElementById("filter-role");

        function applyFilters() {
          const keyword = searchInput.value.toLowerCase();
          const roleFilter = filterRole.value;

          document.querySelectorAll(".account-row").forEach(row => {
            const name = row.querySelector(".account-name").textContent.toLowerCase();
            const clubs = row.querySelector(".club-tags").textContent.toLowerCase();
            const role = row.querySelector(".account-role").textContent.toLowerCase();

            const matchesSearch = name.includes(keyword) || clubs.includes(keyword);
            const matchesRole = roleFilter === "" || role.includes(roleFilter);

            row.style.display = matchesSearch && matchesRole ? "flex" : "none";
          });
        }

        searchInput.addEventListener("input", applyFilters);
        filterRole.addEventListener("change", applyFilters);

      } else {
        div.innerHTML = "<p>No accounts found.</p>";
      }
    })
    .catch(err => {
      console.error(err);
      document.getElementById("accounts-list").innerHTML = "<p>Error loading accounts.</p>";
    });
}

/* ======================
   Delete Account
====================== */
function deleteAccount(id) {
  if (!confirm("⚠ Are you sure you want to delete this account? This action cannot be undone.")) {
    return;
  }

  fetch("php/delete_account.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Account deleted successfully.");
        const row = document.getElementById(`account-${id}`);
        if (row) row.remove();
      } else {
        alert("Failed: " + (data.message || "Could not delete account"));
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error: Could not connect to server.");
    });
}


/* ======================
   Open Edit Modal
====================== */
function openEditModal(id, username, role, clubs = []) {
  document.getElementById("edit-id").value = id;
  document.getElementById("edit-username").value = username;
  document.getElementById("edit-role").value = role;

  resetClubSelect("edit");
  selectedClubsStore.edit = clubs.map(c => ({ id: String(c.id), name: c.name }));
  document.getElementById("edit-selected-clubs").innerHTML = clubs
    .map(c => `<span class="club-tag">${c.name} <button type="button" onclick="removeClub('${c.id}', 'edit', 'edit-selected-clubs')">x</button></span>`)
    .join("");

  document.getElementById("edit-modal").style.display = "flex";

  const form = document.getElementById("edit-account-form");
  form.onsubmit = (e) => {
    e.preventDefault();

    const id = document.getElementById("edit-id").value;
    const username = document.getElementById("edit-username").value.trim();
    const role = document.getElementById("edit-role").value;
    const clubIds = getSelectedClubIds("edit");

    if ((role === "member" || role === "staff") && clubIds.length === 0) {
      alert("Please assign at least 1 club.");
      return;
    }
    if (clubIds.length > 2) {
      alert("⚠ You can assign a maximum of 2 clubs.");
      return;
    }

    fetch("php/update_account.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, username, role, club_ids: clubIds }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Account updated!");
          closeEditModal();
          fetchAccounts();
        } else {
          alert("Failed: " + (data.message || "Cannot update account"));
        }
      })
      .catch(err => console.error(err));
  };
}

function closeEditModal() {
  document.getElementById("edit-modal").style.display = "none";
}
