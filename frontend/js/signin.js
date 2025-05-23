// public/signin.js
document.getElementById("signinForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const emailEl    = document.getElementById("email");
  const passwordEl = document.getElementById("password");

  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  // Re‑enforce max length
  if (email.length > 30) {
    alert("Email must be 30 characters or fewer.");
    emailEl.focus();
    return;
  }
  if (password.length > 20) {
    alert("Password must be 20 characters or fewer.");
    passwordEl.focus();
    return;
  }

  const res = await fetch("/api/auth/signin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.success) {
    window.location = "profile.html";
  } else {
    alert(data.error || "Sign in failed.");
  }
});
