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
  wrapper.className = "bg-white border rounded-xl p-5";
  wrapper.dataset.index = index;

  wrapper.innerHTML = `
    <div class="flex items-center gap-4 mb-4">
      <div class="text-xl font-bold text-blue-700">Item ${index + 1}</div>
      <input class="field cargo-commodity flex-1" placeholder="Commodity">
      <select class="field cargo-type w-40">
        <option>General</option>
        <option>Fragile</option>
        <option>Hazardous</option>
      </select>
    </div>

    <div class="grid grid-cols-12 gap-3 items-end">

      <!-- QTY -->
      <div class="col-span-1">
        <label class="label">Qty</label>
        <input type="number" class="field cargo-qty text-center" value="1">
      </div>

      <!-- PACKAGING -->
      <div class="col-span-2">
        <label class="label">Packaging</label>
        <select class="field cargo-packaging">
          <option>Pallet</option>
          <option>Box</option>
          <option>Crate</option>
        </select>
      </div>

      <!-- WEIGHT -->
      <div class="col-span-3 flex gap-2 items-end">
        <div class="flex-1">
          <label class="label">Weight</label>
          <input type="number" class="field cargo-weight" value="10">
        </div>
        <div class="w-20">
          <label class="label">Unit</label>
          <select class="field cargo-weight-unit">
            <option value="kg">kg</option>
            <option value="lbs">lbs</option>
          </select>
        </div>
      </div>

      <!-- DIMENSIONS -->
      <div class="col-span-5 flex gap-2 items-end">
        <div>
          <label class="label">L</label>
          <input type="number" class="field cargo-length w-20" value="40">
        </div>
        <div class="pt-6">×</div>
        <div>
          <label class="label">W</label>
          <input type="number" class="field cargo-width w-20" value="30">
        </div>
        <div class="pt-6">×</div>
        <div>
          <label class="label">H</label>
          <input type="number" class="field cargo-height w-20" value="20">
        </div>
        <div>
          <label class="label">Unit</label>
          <select class="field cargo-dim-unit w-20">
            <option value="cm">cm</option>
            <option value="inch">inch</option>
          </select>
        </div>
      </div>

    </div>

    <!-- RESULTS -->
    <div class="mt-3 text-sm text-[#8a6247]">
      <div class="cargo-volume">Volume: —</div>
      <div class="cargo-volumetric">Volumetric: —</div>
      <div class="cargo-chargeable">Chargeable: —</div>
    </div>

    <div class="flex justify-end gap-3 mt-3 text-sm">
      <button class="duplicate text-gray-600">Duplicate</button>
      <button class="remove-cargo text-red-600">Remove</button>
    </div>
  `;

  attachUnitConversions(wrapper);

  wrapper.addEventListener("input", () => recalcAllCargo());

  wrapper.querySelector(".remove-cargo").onclick = () => {
    wrapper.remove();
    recalcAllCargo();
  };

  return wrapper;
}
function addCargoItem() {
  cargoItemsEl.appendChild(createCargoItem(cargoIndex));
  cargoIndex++;
  recalcAllCargo();
}

function recalcAllCargo() 
{
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


function attachUnitConversions(wrapper) {

  const weightInput = wrapper.querySelector(".cargo-weight");
  const weightUnit = wrapper.querySelector(".cargo-weight-unit");

  const length = wrapper.querySelector(".cargo-length");
  const width = wrapper.querySelector(".cargo-width");
  const height = wrapper.querySelector(".cargo-height");
  const dimUnit = wrapper.querySelector(".cargo-dim-unit");

  // STORE PREVIOUS UNITS
  weightUnit.dataset.prev = weightUnit.value;
  dimUnit.dataset.prev = dimUnit.value;

  // WEIGHT CONVERSION
  weightUnit.addEventListener("change", () => {
    const oldUnit = weightUnit.dataset.prev;
    const newUnit = weightUnit.value;
    let val = parseFloat(weightInput.value);

    if (!isNaN(val)) {
      if (oldUnit === "kg" && newUnit === "lbs") {
        weightInput.value = (val * 2.20462).toFixed(2);
      } else if (oldUnit === "lbs" && newUnit === "kg") {
        weightInput.value = (val / 2.20462).toFixed(2);
      }
    }

    weightUnit.dataset.prev = newUnit;
    recalcAllCargo();
  });

  // DIMENSION CONVERSION
  dimUnit.addEventListener("change", () => {
    const oldUnit = dimUnit.dataset.prev;
    const newUnit = dimUnit.value;

    [length, width, height].forEach(input => {
      let val = parseFloat(input.value);

      if (!isNaN(val)) {
        if (oldUnit === "cm" && newUnit === "inch") {
          input.value = (val / 2.54).toFixed(2);
        } else if (oldUnit === "inch" && newUnit === "cm") {
          input.value = (val * 2.54).toFixed(2);
        }
      }
    });

    dimUnit.dataset.prev = newUnit;
    recalcAllCargo();
  });
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
