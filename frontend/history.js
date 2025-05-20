console.log('▶ history.js loaded');

/* ---------- DOM elements ---------- */
const historyList = document.getElementById("history-list");

// Load scanned products (for history page)
document.addEventListener("DOMContentLoaded", () => {
    if (historyList) {
        loadScannedProducts();
    }
});

function saveScanToLocal(scanDoc) {
    let savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    // Prevent duplicate products by barcode
    const existingProduct = savedProducts.find(product => product.barcode === scanDoc.barcode);
    if (existingProduct) {
        console.log("Product already scanned. Skipping duplicate.");
        return;
    }

    savedProducts.push(scanDoc);
    localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));
}


// Load saved products from local storage
function loadScannedProducts() {
    if (!historyList) return;

    historyList.innerHTML = "";
    const savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    if (savedProducts.length === 0) {
        historyList.innerHTML = `<p class="text-gray-500">No scanned products yet.</p>`;
        return;
    }

    savedProducts.reverse().forEach((product) => {
        const item = document.createElement("div");
        item.className = "flex items-center space-x-4";
        item.innerHTML = `
            <img src="${product.thumbUrl || 'icons/allergen-placeholder.svg'}" 
                 class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0" />
            <div class="flex-1">
                <p class="font-semibold leading-tight truncate">${product.productName || "Unknown Product"}</p>
                <p class="text-sm text-gray-500 truncate">${product.brand || "Unknown Brand"}</p>
                <p class="text-xs text-gray-400 truncate">${product.allergens.map(a => `#${a}`).join(" ")}</p>
            </div>
        `;
        historyList.appendChild(item);
    });
}



// Clear history
function clearHistory() {
    if (confirm("Are you sure you want to clear history?")) {
        localStorage.removeItem("scannedProducts");
        loadScannedProducts(); // Reload to clear the list
    }
}
