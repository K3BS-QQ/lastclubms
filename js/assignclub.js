document.getElementById("assignBtn").addEventListener("click", () => {
    const staffId = document.getElementById("staffSelect").value;
    const clubSelect = document.getElementById("clubSelect");
    const selectedClubs = Array.from(clubSelect.selectedOptions).map(opt => opt.value);

    if (!staffId || selectedClubs.length === 0) {
        alert("Please select a staff and at least one club.");
        return;
    }

    fetch("assign_clubs.php", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            staff_id: staffId,   // ✅ matches PHP
            club_ids: selectedClubs // ✅ must be array
        })
    })
    .then(res => res.json())
    .then(data => {
        alert(data.message);
    })
    .catch(err => console.error("Error:", err));
});
