const historyList = document.getElementById("history-list");
const clearBtn = document.getElementById("clear-btn");
const resetBtn = document.getElementById("reset-button");

let selectionMode = false;
let selectedSet = new Set();
const API_BASE = "https://two800-202510-dtc11.onrender.com/scan";

document.addEventListener("DOMContentLoaded", () => {
    clearBtn.addEventListener("click", onClearClick);
    loadScannedProducts();
});

resetBtn.addEventListener("click", async () => {
    const confirmReset = confirm("Are you sure you want to delete all saved items?");
    if (!confirmReset) return;

    try {
        // Get all items from backend
        const res = await fetch(API_BASE);
        const products = await res.json();

        // Delete all of them
        await Promise.all(
            products.map(product =>
                fetch(`${API_BASE}/${product._id}`, { method: "DELETE" })
            )
        );

        // Clear localStorage
        localStorage.removeItem("scannedProducts");

        // Clear the UI
        historyList.innerHTML = `<p class="text-gray-500">No scanned products yet.</p>`;
    } catch (err) {
        console.error("Failed to reset items:", err);
        alert("Something went wrong while resetting. Please try again.");
    }
});


async function onClearClick() {
    if (!selectionMode) {
        selectionMode = true;
        clearBtn.classList.replace("fa-trash-alt", "fa-check");
        clearBtn.classList.add("text-red-500");
        loadScannedProducts();
    } else {
        const ids = Array.from(selectedSet);
        await Promise.all(
            ids.map((id) => fetch(`${API_BASE}/${id}`, { method: "DELETE" }))
        );
        selectionMode = false;
        selectedSet.clear();
        clearBtn.classList.replace("fa-check", "fa-trash-alt");
        clearBtn.classList.remove("text-red-500");
        loadScannedProducts();
    }
}

async function loadScannedProducts() {
    historyList.innerHTML = "";
    const res = await fetch(API_BASE);
    const savedProducts = await res.json();
    if (savedProducts.length === 0) {
        historyList.innerHTML = `<p class="text-gray-500">No scanned products yet.</p>`;
        return;
    }

    savedProducts
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .forEach((product) => {
            const thumb = product.thumbUrl || "icons/allergen-placeholder.svg";
            const datetime = new Date(product.createdAt).toLocaleString();
            const aiSummary = product.processedData?.summary;
            const aiLine = aiSummary
                ? `<p class="text-xs text-gray-500 truncate">${aiSummary}</p>`
                : "";
            const item = document.createElement("div");
            item.className =
                "flex items-center justify-between py-4 cursor-pointer";
            item.dataset.id = product._id;
            item.addEventListener("click", () => {
                if (selectionMode) {
                    if (selectedSet.has(product._id)) {
                        selectedSet.delete(product._id);
                        item.classList.remove("bg-gray-200");
                    } else {
                        selectedSet.add(product._id);
                        item.classList.add("bg-gray-200");
                    }
                } else {
                    window.location.href = `detail.html?id=${product._id}`;
                }
            });

            const leftContent = document.createElement("div");
            leftContent.className = "flex items-center space-x-4 flex-1";

            if (selectionMode) {
                const checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.checked = selectedSet.has(product._id);
                checkbox.className = "w-5 h-5 text-blue-600";
                checkbox.addEventListener("change", () => {
                    if (checkbox.checked) selectedSet.add(product._id);
                    else selectedSet.delete(product._id);
                });
                leftContent.appendChild(checkbox);
            }

            const img = document.createElement("img");
            img.src = thumb;
            img.className =
                "w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0";
            leftContent.appendChild(img);

            const info = document.createElement("div");
            info.className = "flex-1 space-y-1 overflow-hidden";
            info.innerHTML = `
      <p class="font-semibold leading-tight truncate">${
          product.productName || "Unknown Product"
      }</p>
      <p class="text-sm text-gray-500 truncate">${
          product.brand || "Unknown Brand"
      }</p>
      <p class="text-xs text-gray-400 truncate">${product.allergens
          .map((a) => `#${a}`)
          .join(" ")}</p>
      <p class="text-xs text-gray-400 truncate">${datetime}</p>
      ${aiLine}
    `;
            leftContent.appendChild(info);
            item.appendChild(leftContent);

            const arrow = document.createElement("span");
            arrow.className = "text-gray-400 ml-4 flex-shrink-0";
            arrow.textContent = ">";
            item.appendChild(arrow);

            historyList.appendChild(item);
        });
}
