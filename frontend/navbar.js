document.addEventListener("DOMContentLoaded", () => {
    const c = document.getElementById("navbar-container");
    c.innerHTML = `
    <nav class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex justify-around items-center text-black">
      <a href="home_page.html" class="flex flex-col items-center text-gray-500">
        <img src="icons/history-outlined.png" alt="home" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Home</span>
      </a>
      <a href="scan.html" class="flex flex-col items-center text-gray-500">
        <img src="icons/scan-outlined.png" alt="scan" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Scan</span>
      </a>
      <button class="flex flex-col items-center text-gray-500">
        <img src="icons/profile-outlined.png" alt="profile" class="w-6 h-6 mb-1 object-contain"/>
        <span class="text-xs">Profile</span>
      </button>
    </nav>
  `;
});
