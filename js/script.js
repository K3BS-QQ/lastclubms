// -------------------- LOGIN HANDLING --------------------
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("login-btn");
  const messageBox = document.getElementById("login-message");

  if (loginBtn) {
    // We're on the login page
    loginBtn.addEventListener("click", () => {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;

      if (!username || !password) {
        messageBox.textContent = "Please fill in all fields";
        return;
      }

      fetch("php/login.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            // ✅ Save user data in sessionStorage
            sessionStorage.setItem("user", JSON.stringify({
              id: data.id,
              username: data.username,
              role: data.role
            }));

            // Redirect to dashboard
            window.location.href = "dashboard.html";
          } else {
            messageBox.textContent = data.message || "Login failed";
          }
        })
        .catch(() => {
          messageBox.textContent = "Error connecting to server";
        });
    });
  } else {
    // We're on dashboard.html or another page
    initDashboard();
  }
});

// -------------------- APP INITIALIZATION --------------------
function initDashboard() {
  const user = JSON.parse(sessionStorage.getItem("user"));
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const userInfoEl = document.getElementById("user-info");
  const logoutBtn = document.getElementById("logout-btn");
  const navDashboard = document.getElementById("nav-dashboard");
  const navClubs = document.getElementById("nav-clubs");
  const navMembers = document.getElementById("nav-members");
  const navAccounts = document.getElementById("nav-accounts");
  const mainContent = document.getElementById("content");
  const navButtons = [navDashboard, navClubs, navMembers, navAccounts];

  // Display username & role
  userInfoEl.textContent = `${user.username} (${user.role})`;

  // Role-based access
  if (user.role === "staff") navAccounts.style.display = "none";
  if (user.role === "user") {
    navClubs.style.display = "none";
    navMembers.style.display = "none";
    navAccounts.style.display = "none";
  }

  function clearActive() {
    navButtons.forEach(btn => btn.classList.remove("active"));
  }

  // -------------------- NAVIGATION --------------------
  navDashboard.addEventListener("click", () => {
    clearActive();
    navDashboard.classList.add("active");
    loadDashboard();
  });
  navClubs.addEventListener("click", () => {
    clearActive();
    navClubs.classList.add("active");
    loadClubs();
  });
  navMembers.addEventListener("click", () => {
    clearActive();
    navMembers.classList.add("active");
    loadMembers();
  });
  navAccounts.addEventListener("click", () => {
    clearActive();
    navAccounts.classList.add("active");
    loadAccounts();
  });

  // -------------------- LOGOUT --------------------
  logoutBtn.addEventListener("click", () => {
    sessionStorage.removeItem("user");
    alert("Logout successful!");
    window.location.href = "index.html";
  });

  // -------------------- DEFAULT LOAD --------------------
  loadDashboard();
}
