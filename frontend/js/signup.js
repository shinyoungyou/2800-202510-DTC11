document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nameEl     = document.getElementById("name");
  const emailEl    = document.getElementById("email");
  const passwordEl = document.getElementById("password");

  const name     = nameEl.value.trim();
  const email    = emailEl.value.trim();
  const password = passwordEl.value;

  // Enforce max lengths again in JS
  if (name.length > 30) {
    alert("Name must be 30 characters or fewer.");
    nameEl.focus();
    return;
  }
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

  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (data.success) {
    window.location = "signin.html";
  } else {
    alert(data.error || "Sign up failed.");
  }
});
