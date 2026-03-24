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
  wrapper.dataset.index = index;

  wrapper.innerHTML = `
    <input class="cargo-qty" type="number" value="1">
    <input class="cargo-weight" type="number" value="10">
    <input class="cargo-length" type="number" value="40">
    <input class="cargo-width" type="number" value="30">
    <input class="cargo-height" type="number" value="20">
    <div class="cargo-volume"></div>
    <div class="cargo-volumetric"></div>
    <div class="cargo-chargeable"></div>
    <button class="remove-cargo">Remove</button>
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
