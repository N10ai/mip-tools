// ==============================
// GLOBAL STATE & CONFIG
// ==============================

let logisticsLocations = [];

const webhookUrl = "https://n8n-n10ai.onrender.com/webhook/aa85e69c-a50a-4177-a95d-692ab0c141fc";

const state = {
  transportMode: "air",
  tradeDirection: "import",
  loadType: "lcl"
};

// ==============================
// DATA LOADING
// ==============================

fetch('assets/data/logistics-locations.json')
  .then(res => res.json())
  .then(data => {
    logisticsLocations = data;
    console.log("Locations loaded:", logisticsLocations.length);
  })
  .catch(err => {
    console.error("Failed to load locations JSON", err);
  });

// ==============================
// LOCATION AUTOCOMPLETE
// ==============================

function searchLocations(query) {
  query = query.toLowerCase();

  let typeFilter = null;

  if (state.transportMode === "air") typeFilter = "airport";
  if (state.transportMode === "ocean") typeFilter = "seaport";

  return logisticsLocations
    .filter(loc => !typeFilter || loc.type === typeFilter)
    .filter(loc =>
      loc.code.toLowerCase().includes(query) ||
      loc.name.toLowerCase().includes(query) ||
      loc.city.toLowerCase().includes(query) ||
      loc.country.toLowerCase().includes(query)
    )
    .slice(0, 8);
}

function attachAutocomplete(inputId, nameId, countryId) {
  const input = document.getElementById(inputId);
  const nameField = document.getElementById(nameId);
  const countryField = document.getElementById(countryId);

  const dropdown = document.createElement("div");
  dropdown.classList.add("hidden");
  input.parentElement.appendChild(dropdown);

  input.addEventListener("input", () => {
    const query = input.value.trim();

    if (query.length < 2) {
      dropdown.classList.add("hidden");
      return;
    }

    const results = searchLocations(query);
    dropdown.innerHTML = "";

    results.forEach(loc => {
      const option = document.createElement("div");

      option.innerHTML = `<b>${loc.code}</b> — ${loc.name}`;

      option.onclick = () => {
        input.value = loc.code;
        nameField.value = loc.name;
        countryField.value = loc.country;
        dropdown.classList.add("hidden");
      };

      dropdown.appendChild(option);
    });

    dropdown.classList.remove("hidden");
  });
}

// ==============================
// CARGO SYSTEM
// ==============================

const cargoItemsEl = document.getElementById("cargoItems");
const addCargoBtn = document.getElementById("addCargoBtn");
let cargoIndex = 0;
function createCargoItem(index) {
  const wrapper = document.createElement("div");
  wrapper.className = "bg-white border border-[#e2d4c8] rounded-xl p-4";
  wrapper.dataset.index = index;

  wrapper.innerHTML = `
    <div class="text-sm font-semibold text-[#0f6fa6] mb-4">Item ${index + 1}</div>

    <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
      <div>
        <label class="label">Qty</label>
        <input type="number" class="field cargo-qty" value="1" min="1">
      </div>

      <div>
        <label class="label">Weight</label>
        <input type="number" class="field cargo-weight" value="10">
      </div>

      <div>
        <label class="label">Length</label>
        <input type="number" class="field cargo-length" value="40">
      </div>

      <div>
        <label class="label">Width</label>
        <input type="number" class="field cargo-width" value="30">
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
      <div>
        <label class="label">Height</label>
        <input type="number" class="field cargo-height" value="20">
      </div>
    </div>

    <div class="text-xs text-[#8a6247] cargo-volume">Volume: —</div>
    <div class="text-xs text-[#8a6247] cargo-volumetric">Volumetric Weight: —</div>
    <div class="text-xs text-[#8a6247] cargo-chargeable">Chargeable Weight: —</div>

    <button type="button" class="mt-3 text-sm text-red-600 font-medium remove-cargo">Remove</button>
  `;

  wrapper.addEventListener("input", () => recalcAllCargo());

  wrapper.querySelector(".remove-cargo").addEventListener("click", () => {
    wrapper.remove();
    recalcAllCargo();
  });

  return wrapper;
}

function addCargoItem() {
  cargoItemsEl.appendChild(createCargoItem(cargoIndex));
  cargoIndex++;
  recalcAllCargo();
}

function recalcAllCargo() {
  let totalVolume = 0;
  let totalVolumetric = 0;
  let totalChargeable = 0;

  cargoItemsEl.querySelectorAll("[data-index]").forEach(wrapper => {
    const qty = Number(wrapper.querySelector(".cargo-qty").value) || 0;
    const weight = Number(wrapper.querySelector(".cargo-weight").value) || 0;
    const length = Number(wrapper.querySelector(".cargo-length").value) || 0;
    const width = Number(wrapper.querySelector(".cargo-width").value) || 0;
    const height = Number(wrapper.querySelector(".cargo-height").value) || 0;

    const volume = (length * width * height) / 1000000;
    const totalVol = volume * qty;

    const volumetric = (length * width * height) / 6000 * qty;
    const actual = weight * qty;
    const chargeable = Math.max(volumetric, actual);

    totalVolume += totalVol;
    totalVolumetric += volumetric;
    totalChargeable += chargeable;

    wrapper.querySelector(".cargo-volume").textContent = `Volume: ${totalVol.toFixed(2)}`;
    wrapper.querySelector(".cargo-volumetric").textContent = `Volumetric: ${volumetric.toFixed(2)}`;
    wrapper.querySelector(".cargo-chargeable").textContent = `Chargeable: ${chargeable.toFixed(2)}`;
  });

  document.getElementById("totalVolume").textContent = totalVolume.toFixed(2);
  document.getElementById("totalChargeableWeight").textContent = totalChargeable.toFixed(2);
}

// ==============================
// UTILITIES
// ==============================

function generateQuoteNumber() {
  return "MIP-" + Date.now();
}

// ==============================
// PAYLOAD
// ==============================

function getPayload() {
  return {
    quoteNumber: generateQuoteNumber(),
    email: document.querySelector('[name="email"]').value
  };
}

// ==============================
// EVENTS & INIT
// ==============================

document.addEventListener("DOMContentLoaded", () => {

  attachAutocomplete("originCode", "originName", "originCountryManual");
  attachAutocomplete("destinationCode", "destinationName", "destinationCountryManual");

  addCargoBtn.addEventListener("click", addCargoItem);
  addCargoItem();

});

// ==============================
// FORM SUBMIT
// ==============================

document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = getPayload();

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  alert("Quote sent!");
});
