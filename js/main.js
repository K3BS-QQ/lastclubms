// -------------------- USER & ELEMENTS --------------------
const user = JSON.parse(sessionStorage.getItem('user'));
if(!user) window.location.href = 'index.html';

const userInfoEl = document.getElementById('user-info');
const logoutBtn = document.getElementById('logout-btn');
const navDashboard = document.getElementById('nav-dashboard');
const navClubs = document.getElementById('nav-clubs');
const navMembers = document.getElementById('nav-members');
const navAccounts = document.getElementById('nav-accounts');
const mainContent = document.getElementById('content');
const navButtons = [navDashboard, navClubs, navMembers, navAccounts];

userInfoEl.textContent = `${user.username} (${user.role})`;

// Role-based access
if(user.role==='staff') navAccounts.style.display='none';
if(user.role==='user'){ navClubs.style.display='none'; navMembers.style.display='none'; navAccounts.style.display='none'; }

function clearActive(){ navButtons.forEach(btn=>btn.classList.remove('active')); }

// -------------------- NAVIGATION --------------------
navDashboard.addEventListener('click',()=>{ clearActive(); navDashboard.classList.add('active'); loadDashboard(); });
navClubs.addEventListener('click',()=>{ clearActive(); navClubs.classList.add('active'); loadClubs(); });
navMembers.addEventListener('click',()=>{ clearActive(); navMembers.classList.add('active'); loadMembers(); });
navAccounts.addEventListener('click',()=>{ clearActive(); navAccounts.classList.add('active'); loadAccounts(); });

// -------------------- LOGOUT --------------------
logoutBtn.addEventListener('click',()=>{
  sessionStorage.removeItem('user');
  alert('Logout successful!');
  window.location.href='index.html';
});

// Load dashboard initially
loadDashboard();
