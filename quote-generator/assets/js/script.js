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
    .sort((a, b) => {
      const aStarts = a.code.toLowerCase().startsWith(query);
      const bStarts = b.code.toLowerCase().startsWith(query);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    })
    .slice(0, 8);
}

function attachAutocomplete(inputId, nameId, countryId) {
  const input = document.getElementById(inputId);
  const nameField = document.getElementById(nameId);
  const countryField = document.getElementById(countryId);

  const dropdown = document.createElement("div");

  Object.assign(dropdown.style, {
    position: "absolute",
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "8px",
    zIndex: "999",
    width: input.offsetWidth + "px",
    maxHeight: "220px",
    overflowY: "auto"
  });

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

      option.style.padding = "8px 10px";
      option.style.cursor = "pointer";
      option.style.fontSize = "13px";

      option.innerHTML = `<b>${loc.code}</b> — ${loc.name} (${loc.country})`;

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

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// ==============================
// UI STATE & TOGGLES
// ==============================

function setGroupActive(group, value) {
  document.querySelectorAll(`[data-group="${group}"]`).forEach(btn => {
    btn.classList.toggle("active", btn.dataset.value === value);
  });
}

function syncConditionalSections() {
  const loadTypeWrap = document.getElementById("loadTypeWrap");
  const containerTypeWrap = document.getElementById("containerTypeWrap");
  const routeAirOceanSection = document.getElementById("routeAirOceanSection");
  const routeGroundSection = document.getElementById("routeGroundSection");
  const inlandAirOceanSection = document.getElementById("inlandAirOceanSection");
  const tradeDirectionWrap = document.getElementById("tradeDirectionWrap");

  if (state.transportMode === "ocean") {
    loadTypeWrap.classList.remove("hidden");
  } else {
    loadTypeWrap.classList.add("hidden");
    containerTypeWrap.classList.add("hidden");
  }

  if (state.transportMode === "ocean" && state.loadType === "fcl") {
    containerTypeWrap.classList.remove("hidden");
  } else {
    containerTypeWrap.classList.add("hidden");
  }

  if (state.transportMode === "ground") {
    routeAirOceanSection.classList.add("hidden");
    routeGroundSection.classList.remove("hidden");
    inlandAirOceanSection.classList.add("hidden");
    document.getElementById("inlandSection").classList.add("hidden");
    document.getElementById("includeInlandFreight").checked = false;
    tradeDirectionWrap.classList.add("hidden");
  } else {
    routeAirOceanSection.classList.remove("hidden");
    routeGroundSection.classList.add("hidden");
    inlandAirOceanSection.classList.remove("hidden");
    tradeDirectionWrap.classList.remove("hidden");
  }
}

// ==============================
// CARGO SYSTEM
// ==============================

const cargoItemsEl = document.getElementById("cargoItems");
const addCargoBtn = document.getElementById("addCargoBtn");
let cargoIndex = 0;

// (ALL YOUR EXISTING CARGO FUNCTIONS HERE — unchanged)
// createCargoItem()
// addCargoItem()
// renumberCargoItems()
// recalcCargo()
// recalcAllCargo()

// 👉 KEEP THEM EXACTLY AS YOU HAVE THEM

// ==============================
// UTILITIES
// ==============================

function generateQuoteNumber() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MIP-${yyyy}${mm}${dd}-${rand}`;
}

// ==============================
// PAYLOAD BUILDERS
// ==============================

// getCargoPayload()
// getPayload()

// 👉 KEEP THEM EXACTLY AS YOU HAVE THEM

// ==============================
// EVENTS & INIT
// ==============================

document.addEventListener("DOMContentLoaded", () => {
  attachAutocomplete("originCode", "originName", "originCountryManual");
  attachAutocomplete("destinationCode", "destinationName", "destinationCountryManual");

  addCargoBtn.addEventListener("click", addCargoItem);
  addCargoItem();
  syncConditionalSections();
});

document.querySelectorAll(".toggle-btn[data-group]").forEach(btn => {
  btn.addEventListener("click", () => {
    const group = btn.dataset.group;
    const value = btn.dataset.value;
    state[group] = value;
    setGroupActive(group, value);
    syncConditionalSections();
    recalcAllCargo();
  });
});

document.getElementById("includeInlandFreight").addEventListener("change", function () {
  document.getElementById("inlandSection").classList.toggle("hidden", !this.checked);
});

// ==============================
// FORM SUBMISSION
// ==============================

document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const statusBox = document.getElementById("statusBox");
  statusBox.classList.remove("hidden");
  statusBox.innerHTML = `<div class="text-sm text-[#8a6247] font-medium">Submitting quote request...</div>`;

  try {
    const payload = getPayload();

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Webhook request failed");

    statusBox.innerHTML = `
      <div class="text-sm font-bold text-[#0f6fa6]">Quote request sent successfully.</div>
      <div class="text-sm text-[#8a6247] mt-2">Quote Number: <strong>${payload.quoteNumber}</strong></div>
      <div class="text-sm text-[#8a6247] mt-1">A confirmation email will be sent to <strong>${payload.email}</strong>.</div>
    `;
  } catch (err) {
    statusBox.innerHTML = `
      <div class="text-sm font-bold text-red-600">Something went wrong while submitting the quote.</div>
      <div class="text-sm text-[#8a6247] mt-1">Please try again.</div>
    `;
  }
});
