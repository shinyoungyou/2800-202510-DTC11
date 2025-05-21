console.log('▶ history.js loaded');

/* ---------- DOM elements ---------- */
const historyList = document.getElementById("history-list");
const trashIcon = document.getElementById("trash-icon");
let checkboxesVisible = false;

// Load scanned products (for history page)
document.addEventListener("DOMContentLoaded", () => {
    if (historyList) {
        loadScannedProducts();
    }
});

trashIcon.addEventListener("click", toggleCheckboxes);

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
        item.setAttribute("data-barcode", product.barcode);

        item.style.cursor = "pointer";
        item.addEventListener("click", () => {
            window.location.href = `product_page.html?id=${product.barcode}`;
        });


        item.innerHTML = `
            <div class="flex items-center">
                <input type="checkbox" class="delete-checkbox hidden mr-3 w-4 h-4" />
                <img src="${product.thumbUrl || 'icons/allergen-placeholder.svg'}" 
                    class="w-16 h-16 rounded object-cover bg-gray-300 flex-shrink-0" />
            </div>
            <div class="flex-1">
                <p class="font-semibold leading-tight truncate">${product.productName || "Unknown Product"}</p>
                <p class="text-sm text-gray-500 truncate">${product.brand || "Unknown Brand"}</p>
                <p class="text-xs text-gray-400 truncate">${product.allergens.map(a => `#${a}`).join(" ")}</p>
            </div>
        `;
        historyList.appendChild(item);
    });
}

function toggleCheckboxes() {
    const checkboxes = document.querySelectorAll(".delete-checkbox");
    checkboxesVisible = !checkboxesVisible;

    checkboxes.forEach(checkbox => {
        checkbox.classList.toggle("hidden", !checkboxesVisible)
    })

    if (checkboxesVisible) {
        // Create a red delete button with white text
        trashIcon.innerHTML = `
            <button id="delete-button" 
                    class="bg-red-500 text-white px-2 py-1 rounded-md text-sm hover:bg-red-600 transition">
                Delete
            </button>
        `;

        // Attach click event to the delete button
        document.getElementById("delete-button").onclick = deleteSelectedItems;
    } else {
        trashIcon.innerHTML = '';
        trashIcon.appendChild(createTrashIcon());
    }
}

// Delete selected items
function deleteSelectedItems() {
    const checkboxes = document.querySelectorAll(".delete-checkbox");
    let savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            const productElement = checkbox.closest("div[data-barcode]");
            const barcode = productElement.getAttribute("data-barcode")
            
            // Remove product from localStorage
            savedProducts = savedProducts.filter(product => product.barcode !== barcode);
            
            // Remove product from DOM
            productElement.remove();
        }
    })

    // Update localStorage
    localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));

    // Reset the icon back to trash
    toggleCheckboxes();

}