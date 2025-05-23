document.addEventListener("DOMContentLoaded", () => {
    const path = window.location.pathname.split("/").pop();
    const isHome =
        path === "" ||
        path === "index.html" ||
        path === "detail.html" ||
        path === "alternatives_detail.html";
    const isScan = path === "scan.html";
    const isProfile = path === "profile.html";
    const c = document.getElementById("navbar-container");
    c.innerHTML = `
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center text-black">
      <a href="index.html" class="flex flex-col items-center ${
          isHome ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Home</span>
      </a>
      <a href="scan.html" class="flex flex-col items-center ${
          isScan ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Scan</span>
      </a>
      <a href="profile.html" class="flex flex-col items-center ${
          isProfile ? "text-blue-600" : "text-gray-500"
      }">
        <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Profile</span>
      </a>
    </nav>
  `;
});
