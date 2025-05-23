const allergenIcons = {
  celery: "icons/celery.png",
  crustaceans: "icons/shrimp.png",
  eggs: "icons/egg.png",
  fish: "icons/fish.png",
  gluten: "icons/wheat.png",
  lupin: "icons/lupin.png",
  milk: "icons/milk.png",
  molluscs: "icons/mussel.png",
  mustard: "icons/mustard.png",
  nuts: "icons/nut.png",
  peanuts: "icons/peanut.png",
  sesameseeds: "icons/sesame.png",
  soybeans: "icons/soy.png",
  sulphites: "icons/sulphite.png",
};
const allergenMap = {
  celery: ["celery"],
  crustaceans: ["crab", "lobster", "shrimp", "prawn", "crustacean"],
  eggs: ["egg", "egg-yolk", "whole-egg"],
  fish: ["fish", "anchovy", "salmon", "tuna", "cod", "haddock"],
  gluten: ["gluten", "wheat", "barley", "rye", "oats", "spelt"],
  lupin: ["lupin"],
  milk: ["milk", "cheese", "butter", "cream", "yoghurt"],
  molluscs: ["mussel", "clam", "oyster", "scallop", "snail"],
  mustard: ["mustard"],
  nuts: ["almond", "hazelnut", "walnut", "pistachio", "cashew"],
  peanuts: ["peanut", "groundnut"],
  sesameseeds: ["sesame", "tahini"],
  soybeans: ["soy", "soya", "soybean", "tofu", "soya-oil"],
  sulphites: [
    "sulphite",
    "sulfite",
    "sulphur-dioxide",
    "sulphur-dioxide-and-sulphites",
  ],
};
const norm = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
const video = document.getElementById("video");
const barcodeBox = document.getElementById("barcode-box");
const bottomSheet = document.getElementById("bottom-sheet");
const prodNameEl = document.getElementById("prod-name");
const prodBrandEl = document.getElementById("prod-brand");
const prodTagsEl = document.getElementById("prod-tags");
const prodThumbEl = document.getElementById("prod-thumb");
const allergensListEl = document.getElementById("allergens-list");
const altListEl = document.getElementById("alt-list");
const seeAllBtn = document.getElementById("see-all");
let currentBarcode = "";
let currentScanId = "";
document.addEventListener("DOMContentLoaded", () => {
  const scanButton = document.querySelector(".scan-nav");
  if (scanButton) {
    scanButton.addEventListener(
      "click",
      () => (window.location.href = "scan.html")
    );
  }
  if (seeAllBtn) {
    seeAllBtn.addEventListener("click", () => {
      if (currentBarcode) {
        window.location.href = `alternatives.html?barcode=${currentBarcode}`;
      }
    });
  }
});
let isExpanded = false;
function toggleSheet(expand = !isExpanded) {
  isExpanded = expand;
  if (isExpanded) {
    bottomSheet.classList.remove("h-24");
    bottomSheet.classList.add("h-[80%]");
  } else {
    bottomSheet.classList.remove("h-[80%]");
    bottomSheet.classList.add("h-24");
  }
}
bottomSheet.addEventListener("click", () => toggleSheet());
const codeReader = new ZXing.BrowserBarcodeReader();
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = stream;
    await video.play();
  } catch {
    alert("Unable to use the camera.");
  }
}
async function fetchProduct(barcode) {
  const res = await fetch(
      `https://two800-202510-dtc11.onrender.com/product/${barcode}`
  );
  if (!res.ok) throw new Error(res.statusText);
  return await res.json();
}
async function fetchAlternatives(barcode, limit = 2) {
  try {
    const res = await fetch(
        `https://two800-202510-dtc11.onrender.com/alternatives/${barcode}?limit=${limit}`
    );
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return [];
  }
}
async function saveScanToDB(scanDoc) {
  const res = await fetch("https://two800-202510-dtc11.onrender.com/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scanDoc),
  });
  if (!res.ok) console.warn("Save responded with HTTP", res.status);
  else {
    const data = await res.json();
    return data;
  }
}
function saveScanToLocal(scanDoc) {
  let savedProducts = JSON.parse(localStorage.getItem("scannedProducts")) || [];
  if (savedProducts.find((p) => p.barcode === scanDoc.barcode)) return;
  savedProducts.push(scanDoc);
  localStorage.setItem("scannedProducts", JSON.stringify(savedProducts));
}
async function scanLoop() {
  try {
    const result = await codeReader.decodeOnceFromVideoDevice(undefined, video);
    const points = result.getResultPoints();
    const xs = points.map((p) => p.x),
      ys = points.map((p) => p.y);
    const x = Math.min(...xs),
      y = Math.min(...ys),
      width = Math.max(...xs) - x,
      height = Math.max(...ys) - y;
    drawBox({ x, y, width, height });
    await handleCode(result.getText());
    setTimeout(scanLoop, 2000);
  } catch {
    requestAnimationFrame(scanLoop);
  }
}
function drawBox({ x, y, width, height }) {
  barcodeBox.style.cssText = `left:${x}px; top:${y}px; width:${width}px; height:${height}px;`;
  barcodeBox.classList.remove("hidden");
}
async function getProcessedData(text) {
  const res = await fetch("https://two800-202510-dtc11.onrender.com/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(res.statusText);
  return await res.json();
}
async function handleCode(barcode) {
  try {
    prodNameEl.textContent = "Loading…";
    prodBrandEl.textContent = "";
    prodTagsEl.textContent = "";
    toggleSheet(false);
    const product = await fetchProduct(barcode);
    prodThumbEl.src = product.thumbUrl;
    const allergens = product.allergens;
    const percentByAllergen = Object.fromEntries(
      allergens.map(({ name }) => [name, null])
    );
    if (Array.isArray(product.ingredients)) {
      product.ingredients.forEach((ing) => {
        const id = norm(ing.id || ""),
          text = norm(ing.text || "");
        allergens.forEach(({ name }) => {
          const words = allergenMap[name] || [name];
          if (
            words.some((w) => id.includes(w) || text.includes(w)) &&
            ing.percent_estimate > 0
          ) {
            percentByAllergen[name] = Math.max(
              percentByAllergen[name] || 0,
              ing.percent_estimate
            );
          }
        });
      });
    }
    prodNameEl.textContent = product.productName || "Unknown product";
    prodBrandEl.textContent = product.brand || "Unknown";
    prodTagsEl.textContent = allergens.map(({ name }) => `#${name}`).join(" ");
    allergensListEl.innerHTML = "";
    allergens.forEach(({ name, source }) => {
      const gKey = `${name.replace(/\s+/g, "_").toLowerCase()}_100g`;
      const grams = product.nutriments?.[gKey];
      const pct = percentByAllergen[name];
      const right =
        grams != null
          ? `${grams} g/100g`
          : pct != null
          ? `${pct.toFixed(1)} %`
          : "—";
      const li = document.createElement("li");
      li.className = "flex justify-between py-2";
      const iconSrc = allergenIcons[name] || "icons/allergen-placeholder.svg";
      li.innerHTML = `<div class="flex items-center space-x-2 flex-1"><img src="${iconSrc}" class="w-6 h-6"/><span>${name}</span></div><div><span>${right}</span></div>`;
      allergensListEl.appendChild(li);
    });
    if (!allergens.length) {
      const li = document.createElement("li");
      li.className = "py-2";
      li.textContent = "None";
      allergensListEl.appendChild(li);
    }
    let processedData = {};
    try {
      const aiInput = (product.ingredients || [])
        .map((ing) => ing.text || ing.id || "")
        .join(" ");
      processedData = await getProcessedData(aiInput);
    } catch {}
    const scanDoc = {
      barcode,
      productName: product.productName || "",
      brand: product.brand || "",
      allergens: allergens.map(({ name }) => name),
      allergenPercents: percentByAllergen,
      thumbUrl: product.thumbUrl,
      processedData,
    };
    const saved = await saveScanToDB(scanDoc);
    currentScanId = saved._id;
    saveScanToLocal(saved);
    toggleSheet(true);
    currentBarcode = barcode;
    altListEl.innerHTML =
      "<p class='text-gray-500'>Loading alternatives...</p>";
    const alts = await fetchAlternatives(barcode, 2);
    altListEl.innerHTML = "";
    alts.forEach((p) => {
      const li = document.createElement("li");
      li.className = "flex-shrink-0 snap-start w-56 cursor-pointer";
      li.addEventListener("click", () => {
        window.location.href = `alternatives_detail.html?barcode=${p.barcode}`;
      });
      li.innerHTML = `<div class="flex space-x-4"><img src="${
        p.thumbUrl
      }" class="w-20 h-20 rounded"/><div class="flex flex-col justify-center"><p class="">${
        p.productName
      }</p><p class="text-xs truncate">${
        p.brand
      }</p><p class="text-xs truncate">${p.allergens
        .map((a) => `#${a}`)
        .join(" ")}</p></div></div>`;
      altListEl.appendChild(li);
    });
    if (currentScanId) {
      await fetch(
          `https://two800-202510-dtc11.onrender.com/scan/${currentScanId}/alternatives`,
          {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ alternatives: alts }),
          }
      );
    }
  } catch (err) {
    alert(`Failed to fetch product info:\n${err.message}`);
  }
}
startCamera().then(() => {
  scanLoop();
});
