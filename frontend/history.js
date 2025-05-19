const historyList = document.getElementById("history-list");
const clearBtn = document.getElementById("clear-btn");
let selectionMode = false;
let selectedSet = new Set();
const API_BASE = "http://localhost:3000/scan";
document.addEventListener("DOMContentLoaded", () => {
    clearBtn.addEventListener("click", onClearClick);
    loadScannedProducts();
});
async function onClearClick() {
    if (!selectionMode) {
        selectionMode = true;
        clearBtn.classList.replace("fa-trash-alt", "fa-check");
        clearBtn.classList.add("text-red-500");
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
        .slice()
        .reverse()
        .forEach((product) => {
            const thumb = product.thumbUrl || "icons/allergen-placeholder.svg";
            const aiSummary = product.processedData?.summary;
            const aiLine = aiSummary
                ? `<p class="text-xs text-gray-500 truncate">${aiSummary}</p>`
                : "";
            const item = document.createElement("div");
            item.className = "flex items-start space-x-4 history-item";
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
                }
            });
            item.innerHTML = `
      <img src="${thumb}" class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0">
      <div class="flex-1 space-y-1 overflow-hidden">
        <p class="font-semibold leading-tight truncate">${
            product.productName || "Unknown Product"
        }</p>
        <p class="text-sm text-gray-500 truncate">${
            product.brand || "Unknown Brand"
        }</p>
        <p class="text-xs text-gray-400 truncate">${product.allergens
            .map((a) => `#${a}`)
            .join(" ")}</p>
        ${aiLine}
      </div>
    `;
            historyList.appendChild(item);
        });
}
