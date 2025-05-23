document.addEventListener("DOMContentLoaded", () => {
    // Auth check
    fetch("/api/auth/status", { credentials: "include" })
        .then((r) => r.json())
        .then((status) => {
            if (!status.authenticated) {
                window.location = "signin.html";
                throw "redirect";
            }
            return fetch("/api/auth/user-preferences", { credentials: "include" });
        })
        .then((r) => r.json())
        .then((prefs) => {
            const avatarEl = document.getElementById("avatarSmall");
            if (prefs.profilePicture) {
                avatarEl.style.backgroundImage = `url(${prefs.profilePicture})`;
            }
            document.getElementById("profileName").textContent =
                prefs.name || "";
            const emailEl = document.getElementById("profileEmail");
            emailEl.textContent = prefs.email || "";
            emailEl.href = prefs.email ? `mailto:${prefs.email}` : "#";
        })
        .catch((e) => e !== "redirect" && console.error(e));

    // Logout
    document.getElementById("logoutBtn").addEventListener("click", () => {
        fetch("/api/auth/signout", {
            method: "POST",
            credentials: "include",
        }).then(() => (window.location = "signin.html"));
    });
});
