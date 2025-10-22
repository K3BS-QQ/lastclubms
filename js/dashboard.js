function loadDashboard() {
  const user = JSON.parse(sessionStorage.getItem('user'));

  // 🔒 Hide menu items based on role
  if (user?.role === 'member') {
    document.getElementById('nav-accounts')?.classList.add('hidden');
    document.getElementById('nav-clubs')?.classList.add('hidden');
  } else if (user?.role === 'staff') {
    document.getElementById('nav-accounts')?.classList.remove('hidden');
    document.getElementById('nav-clubs')?.classList.add('hidden');
  } else if (user?.role === 'admin') {
    document.getElementById('nav-accounts')?.classList.remove('hidden');
    document.getElementById('nav-clubs')?.classList.remove('hidden');
  }

  mainContent.innerHTML = `
    <header>
      <h1>Club Member Record Management System</h1>
      <p id="assigned-clubs" style="font-size:14px; color:#bbb; margin-top:5px;"></p>
    </header>

    <section id="system-overview" class="card-grid">
      <div class="card stat">
        <i class="fa fa-users"></i>
        <div>
          <h2 id="total-members">0</h2>
          <p>Overall Members</p>
        </div>
      </div>
      <div class="card stat">
        <i class="fa fa-building"></i>
        <div>
          <h2 id="total-clubs">0</h2>
          <p>Total Clubs</p>
        </div>
      </div>
    </section>

    <!-- Clubs Overview (Full Width) -->
    <section id="clubs-overview" class="main-section">
      <h2>Clubs Overview</h2>
      <div class="card-grid" id="club-cards"><p>Loading clubs...</p></div>
    </section>

    <!-- Sub-Clubs (Full Width, Styled like Club Cards) -->
    <section id="subclubs-management" class="main-section">
      <!-- Renamed title as requested -->
      <h2>Sub-Clubs</h2> 
      <div class="card-grid" id="subclub-list">
          <p>Loading sub-clubs...</p>
      </div>
    </section>


    <!-- Club Info Modal -->
    <div id="clubModal" class="modal">
      <div class="modal-content">
        <span id="closeModal" class="close">&times;</span>
        <h2 id="modalClubName"></h2>
        <img id="modalClubLogo" src="" alt="Club Logo">
        <p id="modalClubDescription"></p>
        <p><strong>Status:</strong> <span id="modalClubStatus"></span></p>
        <p><strong>Total Members:</strong> <span id="modalClubMembers"></span></p>

        <!-- The container for member items (using the new, safe class) -->
        <div id="modalMemberList" class="member-list-wrapper">
          <div class="member-item">Loading...</div>
        </div>
        
        <!-- ❌ SUB-CLUBS SECTION REMOVED FROM HERE ❌ -->
        
      </div>
    </div>
  `;
  
  // New function call to load sub-clubs
  loadSubClubs();

  // ✅ Fetch fresh session (with clubs)
  fetch('php/check_session.php')
    .then(res => res.json())
    .then(sessionData => {
      if (sessionData.loggedIn) {
        sessionStorage.setItem('user', JSON.stringify(sessionData));

        const userRole = sessionData.role;
        const assignedEl = document.getElementById('assigned-clubs');

        if (userRole === 'admin') {
          assignedEl.textContent = "You have access to all clubs.";
        } else if (Array.isArray(sessionData.clubs) && sessionData.clubs.length > 0) {
          const clubNames = sessionData.clubs.map(c => c.name);
          assignedEl.textContent = `You are assigned to: ${clubNames.join(', ')}`;
        } else {
          assignedEl.textContent = "You are not assigned to any clubs yet.";
        }
      }
    });

  // ✅ Load clubs
  fetch('php/get_clubs_overview.php')
    .then(res => res.json())
    .then(data => {
      const clubCards = document.getElementById('club-cards');
      if (data.success && Array.isArray(data.clubs)) {
        const activeClubs = data.clubs.filter(c => c.enabled === 1);

        document.getElementById('total-clubs').textContent = activeClubs.length;
        document.getElementById('total-members').textContent =
          activeClubs.reduce((sum, c) => sum + (c.members || 0), 0);

        if (activeClubs.length > 0) {
  clubCards.innerHTML = ""; // clear first

  activeClubs.forEach(c => {
    const card = document.createElement("div");
    card.className = "card club";
    card.dataset.id = c.id;

    card.innerHTML = `
      <div class="club-logo">
        <img src="${c.logo || 'img/default.png'}" alt="${c.name} Logo">
      </div>
      <h3>${c.name}</h3>
      <p class="club-desc"></p>
      <p>
        <strong>Status:</strong>
        <span class="status-dot ${c.enabled === 1 ? 'active' : 'disabled'}"></span>
        ${c.enabled === 1 ? 'Active' : 'Disabled'}
      </p>
      <div class="members">${c.members || 0} member${c.members === 1 ? '' : 's'}</div>
    `;

    // 🔥 Insert description safely so it never breaks HTML
    card.querySelector(".club-desc").textContent = c.description || "No description available.";

    clubCards.appendChild(card);
  });


          // 🎯 Apply glow
          setTimeout(() => {
            document.querySelectorAll('.club-logo img').forEach(img => {
              if (img.complete) {
                applyGlow(img);
              } else {
                img.addEventListener('load', () => applyGlow(img));
              }
            });
          }, 100);

          // 🎯 Modal logic
          document.querySelectorAll('.card.club').forEach((card) => {
            card.addEventListener('click', () => {
              const clubId = card.getAttribute('data-id');
              const club = activeClubs.find(c => c.id == clubId);

              document.getElementById('modalClubName').textContent = club.name;
              document.getElementById('modalClubLogo').src = club.logo || 'img/default.png';
              document.getElementById('modalClubDescription').textContent = club.description || 'No description available.';
              document.getElementById('modalClubStatus').textContent = club.enabled === 1 ? 'Active' : 'Disabled';
              document.getElementById('modalClubMembers').textContent = `${club.members || 0} member${club.members === 1 ? '' : 's'}`;

              const memberList = document.getElementById('modalMemberList');
              memberList.innerHTML = `<div class="member-item">Loading members...</div>`;

              // ============================
              // ✅ Fetch members & render (dedupe, badges, hierarchy sort)
              // ============================
              fetch(`php/get_club_members.php?club_id=${clubId}`)
                .then(res => res.json())
                .then(memberData => {
                  memberList.innerHTML = "";

                  // basic guard
                  if (!memberData.success || !Array.isArray(memberData.members) || memberData.members.length === 0) {
                    memberList.innerHTML = `<div class="member-item">No members found.</div>`;
                    return;
                  }

                  // combine rows per person (in case PHP returned multiple rows per person)
                  const combined = {};
                  memberData.members.forEach(row => {
                    const key = row.id ?? row.name;
                    if (!combined[key]) {
                      combined[key] = {
                        id: row.id ?? key,
                        name: row.name ?? 'Unknown',
                        rolesSet: new Set(),
                        status: row.status ?? '',
                        joined_at: row.joined_at ?? ''
                      };
                    }

                    // accept either `roles` (comma list from GROUP_CONCAT) or `role` (single)
                    const rolesStr = String(row.roles ?? row.role ?? '');
                    rolesStr.split(/\s*,\s*/)
                      .map(r => r.trim())
                      .filter(Boolean)
                      .forEach(r => combined[key].rolesSet.add(r));
                  });

                  const members = Object.values(combined).map(m => {
                    const roles = Array.from(m.rolesSet);
                    return {
                      id: m.id,
                      name: m.name,
                      roles,
                      rolesStr: roles.join(', '),
                      status: m.status,
                      joined_at: m.joined_at
                    };
                  });

                  // role priority matcher (robust substring checks)
                 function getRolePriority(role) {
  if (!role) return 999;
  const r = role.toLowerCase().trim();

  if (r.includes('adviser') || r.includes('advisor')) return 1;
  if (r.includes('president') && !r.includes('vice')) return 2;
  if (r.includes('vice')) return 3;
  if (r.includes('secretary')) return 4;
  if (r.includes('treasurer')) return 5;
  if (r.includes('auditor')) return 6;
  if (r.includes('public relation') || r.includes('p.i.o') || r.includes('publicrelation') || r === 'pro') return 7;
  if (r.includes('club manager') || r.includes('clubmanager')) return 8;
  if (r.includes('documentation')) return 9;
  if (r.includes('social media') || r.includes('social')) return 10;
  if (r.includes('coordinator') || r.includes('manager') || r.includes('officer') || r.includes('head') || r.includes('director')) return 20;

  // ✅ Force plain "member" to bottom
  if (r === 'member') return 999;

  return 50; // everything else (unspecified roles) goes here
}



                  // compute best rank for each member (lowest = highest priority)
                  members.forEach(m => {
                    const ranks = m.roles.length ? m.roles.map(getRolePriority) : [999];
                    m.rank = Math.min(...ranks);
                  });

                  // sort by rank then name
                  members.sort((a, b) => {
                    if (a.rank !== b.rank) return a.rank - b.rank;
                    return a.name.localeCompare(b.name);
                  });

                  // render
                  members.forEach((m, i) => {
                    const roleBadges = m.roles.map(r => `<span class="role-badge">${r}</span>`).join(' ');
                    memberList.innerHTML += `
                      <div class="member-item" style="animation: fadeGlowIn 0.55s ease forwards; animation-delay: ${i * 0.05}s;">
                        <span class="member-name">${m.name}</span>
                        ${roleBadges}
                      </div>
                    `;
                  });
                })
                .catch(err => {
                  console.error('Error loading members:', err);
                  memberList.innerHTML = `<div class="member-item">Error loading members.</div>`;
                });
                
                
              // ❌ REMOVED SUB-CLUBS FETCH/RENDER BLOCK HERE
              // This logic is no longer needed since sub-clubs are viewed in the main dashboard section.


              // show modal
              document.getElementById('clubModal').classList.add('show');
            });
          });

          document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('clubModal').classList.remove('show');
          });

          window.addEventListener('click', (e) => {
            if (e.target.id === 'clubModal') {
              document.getElementById('clubModal').classList.remove('show');
            }
          });
        } else {
          clubCards.innerHTML = '<p>No active clubs found.</p>';
        }
      } else {
        clubCards.innerHTML = '<p>No clubs found.</p>';
      }
    })
    .catch(() => {
      document.getElementById('club-cards').innerHTML = '<p>Error loading clubs.</p>';
    });
}

// New function to load and render sub-clubs in the dashboard side section
function loadSubClubs() {
    const subClubList = document.getElementById('subclub-list');
    if (!subClubList) return;

    fetch('php/get_sub_clubs_all.php') // Assuming a PHP endpoint to get all sub-clubs
        .then(res => res.json())
        .then(data => {
            if (data.success && Array.isArray(data.subclubs) && data.subclubs.length > 0) {
                subClubList.innerHTML = "";
                data.subclubs.forEach(sc => {
                    // Structure mimics the main club card: club-logo, h3, status, members.
                    const card = document.createElement("div");
                    card.className = "card club subclub-view-card"; // Add subclub-view-card for unique styling
                    
                    // Use parent_club_color set in PHP for the accent, if available
                    const accentColor = sc.parent_club_color || '#3498db'; 
                    card.style.setProperty('--accent-color', accentColor);
                    
                    card.innerHTML = `
                        <div class="club-logo subclub-logo-wrapper" style="box-shadow: 0 0 15px ${accentColor};">
                            <img src="${sc.logo || 'img/default.png'}" alt="${sc.name} Logo">
                        </div>
                        
                        <h3>${sc.name}</h3>
                        
                        <p class="subclub-parent-tag">
                            Parent: <strong style="color: ${accentColor};">${sc.parent_name}</strong>
                        </p>
                        
                        <p>
                            <strong>Status:</strong>
                            <span class="status-dot ${sc.enabled === 1 ? 'active' : 'disabled'}"></span>
                            ${sc.enabled === 1 ? 'Active' : 'Disabled'}
                        </p>
                        
                        <div class="members subclub-members">${sc.members || 0} member${sc.members === 1 ? '' : 's'}</div>
                    `;
                    subClubList.appendChild(card);
                });
            } else {
                subClubList.innerHTML = '<p style="text-align:center; color:#aaa;">No sub-clubs currently listed.</p>';
            }
        })
        .catch(err => {
            console.error('Error loading dashboard sub-clubs:', err);
            subClubList.innerHTML = '<p style="text-align:center; color:#e74c3c;">Failed to load sub-clubs.</p>';
        });
}


// 🎨 Glow
const colorThief = new ColorThief();
function applyGlow(img) {
  try {
    if (!img.complete) {
      img.addEventListener("load", () => applyGlow(img));
      return;
    }
    const color = colorThief.getColor(img);
    const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;

    const wrapper = img.closest(".club-logo");
    if (wrapper) {
      wrapper.style.boxShadow = `
        0 0 8px rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.6),
        0 0 16px rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.4),
        0 0 24px rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.2)
      `;
      wrapper.style.borderRadius = "50%";
    }
    img.style.border = `2px solid ${rgb}`;
    img.style.borderRadius = "50%";
  } catch (err) {
    console.error("Color extraction failed:", img.src, err);
  }
}

// ✅ Sidebar toggle
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("show");
}
