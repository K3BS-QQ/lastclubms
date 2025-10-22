/* ==========================
   MEMBER MANAGEMENT
========================== */
function loadMembers() {
  const mainContent = document.getElementById("content");

  fetch("php/check_session.php")
    .then(res => res.json())
    .then(sessionData => {
      if (!sessionData.loggedIn) return;

      const isAdmin = sessionData.role === "admin";
      const assignedClubs = sessionData.clubs || [];

      const fetchClubs = isAdmin
        ? fetch("php/get_clubs.php").then(r => r.json())
        : Promise.resolve({ success: true, clubs: assignedClubs });

      fetchClubs.then(data => {
        const clubOptions =
          data.success && Array.isArray(data.clubs)
            ? data.clubs.map(c => `<option value="${c.id}">${c.name}</option>`).join("")
            : '<option value="">No clubs available</option>';

        mainContent.innerHTML = `
          <h3>Member Management</h3>

          ${
            isAdmin || sessionData.role === "staff"
              ? `
            <!-- Add Member Form -->
            <form id="add-member-form" class="account-form inline-form">
              <input type="text" id="member-name" placeholder="Member Name" required />

              <select id="member-role" required>
                <option value="">Select Role</option>
                ${memberRolesOptions()}
              </select>

              <select id="member-club" required>
                <option value="">Select Club</option>
                ${clubOptions}
              </select>

              <button type="submit" class="btn-add">Add Member</button>
            </form>
          `
              : ""
          }

          <!-- 🔍 Search and Filter -->
          <div class="account-filters">
            <input type="text" id="member-search" placeholder="🔍 Search by name, role, or club...">
            <select id="role-filter">
              <option value="">Filter by Role</option>
              ${memberRolesOptions()}
            </select>
          </div>

          <!-- Members List -->
          <div id="members-list" style="margin-top: 20px;">Loading members...</div>

          <!-- Edit Member Modal -->
          <div id="edit-member-modal" class="modal-overlay">
            <div class="modal-content">
              <h3>Edit Member</h3>
              <form id="edit-member-form" class="account-form">
                
                <input type="hidden" id="edit-member-id" />

                <div class="form-row">
                  <label for="edit-member-name">Full Name</label>
                  <input type="text" id="edit-member-name" required />
                </div>

                <div class="form-row">
                  <label for="edit-member-role">Role</label>
                  <select id="edit-member-role">
                    ${memberRolesOptions()}
                  </select>
                </div>

                <div class="form-row">
                  <label for="edit-member-club">Club</label>
                  <select id="edit-member-club">
                    ${clubOptions}
                  </select>
                </div>

                <div class="modal-actions">
                  <button type="button" class="btn-cancel" onclick="closeMemberModal()">Cancel</button>
                  <button type="submit" class="btn-save">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        `;

        // Auto-select club if only one is available
        if (!isAdmin && assignedClubs.length === 1) {
          document.getElementById("member-club").value = assignedClubs[0].id;
        }

        // Load members list
        fetchMembers(sessionData);

        // Handle Add Member
        if (isAdmin || sessionData.role === "staff") {
          document.getElementById("add-member-form").addEventListener("submit", e => {
            e.preventDefault();
            const name = document.getElementById("member-name").value.trim();
            const role = document.getElementById("member-role").value;
            const clubId = document.getElementById("member-club").value;

            if (!clubId) return alert("Please select a club");

            fetch("php/add_member.php", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name, role, club_id: clubId }),
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  alert("Member added!");
                  document.getElementById("add-member-form").reset();
                  if (!isAdmin && assignedClubs.length === 1) {
                    document.getElementById("member-club").value = assignedClubs[0].id;
                  }
                  fetchMembers(sessionData);
                } else {
                  alert("Failed: " + (data.message || "Cannot add member"));
                }
              })
              .catch(() => alert("Error connecting to server"));
          });
        }

        // 🔍 Search & Filter
        document.getElementById("member-search").addEventListener("input", () => fetchMembers(sessionData));
        document.getElementById("role-filter").addEventListener("change", () => fetchMembers(sessionData));
      });
    });
}

/* ==========================
   MEMBER ROLES LIST
========================== */
function memberRolesOptions() {
  const roles = [
    "Adviser","President","Vice President Internal","Vice President EX",
    "Secretary","Assistant Secretary","Treasurer","Assistant Treasurer",
    "Business Manager","Assistant Business Manager","P.I.O","Historian",
    "Music Material Officer","Music Coordinator","Spirit Leader","Social Coordinator",
    "Program Coordinator","Refreshment Coordinator","Technical Head/IT Head",
    "Quality Assurance Officer","Multimedia officer/Creative Director","Social Media Manager",
    "Club Manager","Event Manager","Logistic Officer","Public Relation Officer",
    "Documentation Officer","Auditor","Member"
  ];
  return roles.map(r => `<option value="${r}">${r}</option>`).join("");
}

/* ==========================
   FETCH MEMBERS
========================== */
function fetchMembers(sessionData) {
  const div = document.getElementById("members-list");
  div.innerHTML = "Loading members...";

  const searchQuery = document.getElementById("member-search")?.value.toLowerCase() || "";
  const roleFilter = document.getElementById("role-filter")?.value || "";

  fetch("php/get_members.php")
    .then(res => res.json())
    .then(data => {
      if (data.success && Array.isArray(data.members)) {
        let visibleMembers =
          sessionData.role === "admin"
            ? data.members
            : data.members.filter(m => sessionData.clubs.some(c => c.id == m.club_id));

        // Apply filters
        visibleMembers = visibleMembers.filter(m => {
          const matchesSearch =
            m.name.toLowerCase().includes(searchQuery) ||
            (m.club_name || "").toLowerCase().includes(searchQuery);
          const matchesRole = roleFilter ? m.role === roleFilter : true;
          return matchesSearch && matchesRole;
        });

        if (visibleMembers.length === 0) {
          div.innerHTML = "<p>No members found.</p>";
          return;
        }

        div.innerHTML = visibleMembers.map(m => `
          <div class="account-row" id="member-${m.id}">
            <div class="account-avatar">${m.name.charAt(0).toUpperCase()}</div>
            <div class="account-info">
              <div class="account-name">${m.name}</div>
              <div class="club-tags">
                <span class="club-tag">${m.role}</span>
                <span class="club-tag">Club: ${m.club_name || "N/A"}</span>
              </div>
            </div>
            ${
              sessionData.role === "admin" || sessionData.role === "staff"
                ? `
              <div class="account-actions">
                <button class="btn-edit"
                  onclick="openMemberEditModal(${m.id}, '${m.name.replace(/'/g,"\\'")}', '${m.role.replace(/'/g,"\\'")}', '${m.club_id}')">
                  Edit
                </button>
                <button class="btn-delete" onclick="deleteMember(${m.id})">Delete</button>
              </div>
            `
                : ""
            }
          </div>
        `).join("");
      } else {
        div.innerHTML = "<p>No members found.</p>";
      }
    })
    .catch(() => div.innerHTML = "<p>Error loading members.</p>");
}

/* ==========================
   DELETE MEMBER
========================== */
function deleteMember(id) {
  if (!confirm("Are you sure you want to delete this member?")) return;

  fetch("php/delete_member.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        alert("Member deleted!");
        fetch("php/check_session.php")
          .then(res => res.json())
          .then(sessionData => fetchMembers(sessionData));
      } else {
        alert("Failed: " + (data.message || "Could not delete member"));
      }
    })
    .catch(() => alert("Error connecting to server"));
}

/* ==========================
   EDIT MEMBER MODAL
========================== */
function openMemberEditModal(id, currentName, currentRole, currentClubId) {
  document.getElementById("edit-member-id").value = id;
  document.getElementById("edit-member-name").value = currentName;

  const roleSelect = document.getElementById("edit-member-role");
  Array.from(roleSelect.options).forEach(opt => opt.selected = opt.value === currentRole);

  const clubSelect = document.getElementById("edit-member-club");
  Array.from(clubSelect.options).forEach(opt => opt.selected = opt.value == currentClubId);

  document.getElementById("edit-member-modal").classList.add("active");

  document.getElementById("edit-member-form").onsubmit = e => {
    e.preventDefault();
    const newName = document.getElementById("edit-member-name").value.trim();
    const newRole = document.getElementById("edit-member-role").value;
    const newClubId = document.getElementById("edit-member-club").value;

    fetch("php/edit_member.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: newName, role: newRole, club_id: newClubId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          alert("Member updated!");
          fetch("php/check_session.php")
            .then(res => res.json())
            .then(sessionData => fetchMembers(sessionData));
          closeMemberModal();
        } else {
          alert("Failed: " + (data.message || "Could not update member"));
        }
      })
      .catch(() => alert("Error connecting to server"));
  };
}

function closeMemberModal() {
  document.getElementById("edit-member-modal").classList.remove("active");
}
