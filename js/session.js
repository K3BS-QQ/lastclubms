document.addEventListener("DOMContentLoaded", function () {
    fetch("php/check_session.php")
        .then(res => res.json())
        .then(data => {
            if (data.loggedIn) {
                // 🔥 Always keep sessionStorage in sync
                sessionStorage.setItem("user", JSON.stringify(data));

                const footer = document.querySelector("div.sidebar-footer");
                
                if (data.role === "member") {
                    document.querySelector("#nav-members")?.style.setProperty("display", "none");
                    document.querySelector("#nav-clubs")?.style.setProperty("display", "none");
                    document.querySelector("#nav-accounts")?.style.setProperty("display", "none");
                }

                let clubBox = document.querySelector("#assigned-clubs");
                if (!clubBox) {
                    clubBox = document.createElement("div");
                    clubBox.id = "assigned-clubs";
                    clubBox.style.color = "white";
                    clubBox.style.padding = "10px";
                    footer.insertAdjacentElement("beforebegin", clubBox);
                }

                if (data.clubs && data.clubs.length > 0) {
                    const clubNames = data.clubs.map(c => c.name);
                    clubBox.innerHTML = "You are assigned to: " + clubNames.join(", ");
                } else {
                    clubBox.innerHTML = "You are not assigned to any clubs yet.";
                }

            } else {
                window.location.href = "index.html";
            }
        })
        .catch(err => console.error("Session check failed", err));
});
