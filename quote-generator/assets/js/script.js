let logisticsLocations = []
fetch('assets/data/logistics-locations.json')
.then(res => res.json())
.then(data => {

logisticsLocations = data

console.log("Locations loaded:", logisticsLocations.length)

})
.catch(err => {

console.error("Failed to load locations JSON", err)

})




const webhookUrl = "https://n8n-n10ai.onrender.com/webhook/aa85e69c-a50a-4177-a95d-692ab0c141fc";

    const state = {
      transportMode: "air",
      tradeDirection: "import",
      loadType: "lcl"
    };

/* ------------------------------
LOCATION AUTOCOMPLETE
------------------------------ */

function searchLocations(query) {

  query = query.toLowerCase()

  let typeFilter = null

  if(state.transportMode === "air") typeFilter = "airport"
  if(state.transportMode === "ocean") typeFilter = "seaport"

  return logisticsLocations
    .filter(loc => !typeFilter || loc.type === typeFilter)
    .filter(loc =>
      loc.code.toLowerCase().includes(query) ||
      loc.name.toLowerCase().includes(query) ||
      loc.city.toLowerCase().includes(query) ||
      loc.country.toLowerCase().includes(query)
    )
    .sort((a,b)=>{

      const aStarts = a.code.toLowerCase().startsWith(query)
      const bStarts = b.code.toLowerCase().startsWith(query)

      if(aStarts && !bStarts) return -1
      if(!aStarts && bStarts) return 1

      return 0

    })
    .slice(0,8)

}

function attachAutocomplete(inputId, nameId, countryId){

  const input = document.getElementById(inputId)
  const nameField = document.getElementById(nameId)
  const countryField = document.getElementById(countryId)

  const dropdown = document.createElement("div")

  dropdown.style.position = "absolute"
  dropdown.style.background = "white"
  dropdown.style.border = "1px solid #ddd"
  dropdown.style.borderRadius = "8px"
  dropdown.style.zIndex = "999"
  dropdown.style.width = input.offsetWidth + "px"
  dropdown.style.maxHeight = "220px"
  dropdown.style.overflowY = "auto"
  dropdown.classList.add("hidden")

  input.parentElement.appendChild(dropdown)

  input.addEventListener("input", ()=>{

    const query = input.value.trim()

    if(query.length < 2){
      dropdown.classList.add("hidden")
      return
    }

    const results = searchLocations(query)

    dropdown.innerHTML = ""

    results.forEach(loc=>{

      const option = document.createElement("div")

      option.style.padding = "8px 10px"
      option.style.cursor = "pointer"
      option.style.fontSize = "13px"

      option.innerHTML = `<b>${loc.code}</b> — ${loc.name} (${loc.country})`

      option.onclick = ()=>{

        input.value = loc.code
        nameField.value = loc.name
        countryField.value = loc.country

        dropdown.classList.add("hidden")

      }

      dropdown.appendChild(option)

    })

    dropdown.classList.remove("hidden")

  })

  document.addEventListener("click", (e)=>{

    if(!input.contains(e.target) && !dropdown.contains(e.target)){
      dropdown.classList.add("hidden")
    }

  })

}

/* activate */

document.addEventListener("DOMContentLoaded", ()=>{

  attachAutocomplete(
    "originCode",
    "originName",
    "originCountryManual"
  )

  attachAutocomplete(
    "destinationCode",
    "destinationName",
    "destinationCountryManual"
  )

})
    function generateQuoteNumber() {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const rand = Math.floor(1000 + Math.random() * 9000);
      return `MIP-${yyyy}${mm}${dd}-${rand}`;
    }

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

      const isAir = state.transportMode === "air";

      document.getElementById("originCodeLabel").textContent = isAir ? "Origin Airport Code" : "Origin Port Code";
      document.getElementById("originNameLabel").textContent = isAir ? "Origin Airport Name" : "Origin Port Name";
      document.getElementById("destinationCodeLabel").textContent = isAir ? "Destination Airport Code" : "Destination Port Code";
      document.getElementById("destinationNameLabel").textContent = isAir ? "Destination Airport Name" : "Destination Port Name";

      document.getElementById("originCode").placeholder = isAir ? "e.g. MIA" : "e.g. CNSHA";
      document.getElementById("originName").placeholder = isAir ? "e.g. Miami International Airport" : "e.g. Port of Shanghai";
      document.getElementById("destinationCode").placeholder = isAir ? "e.g. UIO" : "e.g. USMIA";
      document.getElementById("destinationName").placeholder = isAir ? "e.g. Mariscal Sucre Airport" : "e.g. Port of Miami";
    }

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
            <label class="label">Commodity</label>
            <input class="field cargo-commodity" placeholder="e.g. Electronics, Clothing">
          </div>

          <div>
            <label class="label">Packaging Type</label>
            <select class="field cargo-packaging">
              <option value="Pallet">Pallet</option>
              <option value="Box">Box</option>
              <option value="Crate">Crate</option>
              <option value="Drum">Drum</option>
              <option value="Bag">Bag</option>
            </select>
          </div>

          <div>
            <label class="label">Cargo Type</label>
            <select class="field cargo-type">
              <option value="General">General</option>
              <option value="Fragile">Fragile</option>
              <option value="Hazardous">Hazardous</option>
              <option value="Refrigerated">Refrigerated</option>
              <option value="Oversized">Oversized</option>
            </select>
          </div>

          <div>
            <label class="label">Qty</label>
            <input type="number" class="field cargo-qty" value="1" min="1">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
          <div>
            <label class="label">Weight</label>
            <input type="number" step="any" class="field cargo-weight" value="10">
          </div>

          <div>
            <label class="label">Weight Unit</label>
            <select class="field cargo-weight-unit">
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>

          <div>
            <label class="label">Length</label>
            <input type="number" step="any" class="field cargo-length" value="40">
          </div>

          <div>
            <label class="label">Width</label>
            <input type="number" step="any" class="field cargo-width" value="30">
          </div>

          <div>
            <label class="label">Height</label>
            <input type="number" step="any" class="field cargo-height" value="20">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label class="label">Dimension Unit</label>
            <select class="field cargo-dim-unit">
              <option value="inch">inch</option>
              <option value="cm">cm</option>
            </select>
          </div>
        </div>

        <div class="text-xs text-[#8a6247] cargo-volume">Volume: —</div>
        <div class="text-xs text-[#8a6247] cargo-volumetric">Volumetric Weight: —</div>
        <div class="text-xs text-[#8a6247] cargo-chargeable">Chargeable Weight: —</div>

        <button type="button" class="mt-3 text-sm text-red-600 font-medium remove-cargo">Remove</button>
      `;

      const weightUnitEl = wrapper.querySelector(".cargo-weight-unit");
      const dimUnitEl = wrapper.querySelector(".cargo-dim-unit");

      weightUnitEl.dataset.prevUnit = weightUnitEl.value;
      dimUnitEl.dataset.prevUnit = dimUnitEl.value;

      wrapper.addEventListener("input", () => {
  recalcAllCargo();
});

      weightUnitEl.addEventListener("change", () => {
        const weightInput = wrapper.querySelector(".cargo-weight");
        const oldUnit = weightUnitEl.dataset.prevUnit || "kg";
        const newUnit = weightUnitEl.value;
        const value = parseFloat(weightInput.value);

        if (!Number.isNaN(value)) {
          if (oldUnit === "kg" && newUnit === "lbs") {
            weightInput.value = (value * 2.20462).toFixed(2);
          } else if (oldUnit === "lbs" && newUnit === "kg") {
            weightInput.value = (value / 2.20462).toFixed(2);
          }
        }

        weightUnitEl.dataset.prevUnit = newUnit;
        recalcCargo(wrapper);
      });

      dimUnitEl.addEventListener("change", () => {
        const oldUnit = dimUnitEl.dataset.prevUnit || "inch";
        const newUnit = dimUnitEl.value;
        const dimFields = [
          wrapper.querySelector(".cargo-length"),
          wrapper.querySelector(".cargo-width"),
          wrapper.querySelector(".cargo-height")
        ];

        dimFields.forEach(input => {
          const value = parseFloat(input.value);
          if (!Number.isNaN(value)) {
            if (oldUnit === "cm" && newUnit === "inch") {
              input.value = (value / 2.54).toFixed(2);
            } else if (oldUnit === "inch" && newUnit === "cm") {
              input.value = (value * 2.54).toFixed(2);
            }
          }
        });

        dimUnitEl.dataset.prevUnit = newUnit;
        recalcCargo(wrapper);
      });

      wrapper.querySelector(".remove-cargo").addEventListener("click", () => {
        wrapper.remove();
        renumberCargoItems();
      });

      return wrapper;
    }

    function addCargoItem() {
      cargoItemsEl.appendChild(createCargoItem(cargoIndex));
      cargoIndex++;
      renumberCargoItems();
      recalcAllCargo();
    }

    function renumberCargoItems() {
      const items = cargoItemsEl.querySelectorAll("[data-index]");
      items.forEach((item, i) => {
        item.querySelector(".text-sm.font-semibold").textContent = `Item ${i + 1}`;
      });
    }

    function recalcCargo(wrapper) {
      const qty = parseFloat(wrapper.querySelector(".cargo-qty").value) || 0;
      const weight = parseFloat(wrapper.querySelector(".cargo-weight").value) || 0;
      const weightUnit = wrapper.querySelector(".cargo-weight-unit").value;

      let length = parseFloat(wrapper.querySelector(".cargo-length").value) || 0;
      let width = parseFloat(wrapper.querySelector(".cargo-width").value) || 0;
      let height = parseFloat(wrapper.querySelector(".cargo-height").value) || 0;
      const dimUnit = wrapper.querySelector(".cargo-dim-unit").value;

      let actualWeightKg = weightUnit === "lbs" ? weight / 2.20462 : weight;

      let lCm = length;
      let wCm = width;
      let hCm = height;

      if (dimUnit === "inch") {
        lCm = length * 2.54;
        wCm = width * 2.54;
        hCm = height * 2.54;
      }

      const cbm = (lCm * wCm * hCm) / 1000000;
      const totalCbm = cbm * qty;

      let volumetricWeightKg = 0;

      if (state.transportMode === "air") {
        volumetricWeightKg = ((lCm * wCm * hCm) / 6000) * qty;
      } else if (state.transportMode === "ground") {
        volumetricWeightKg = ((lCm * wCm * hCm) / 5000) * qty;
      } else {
        volumetricWeightKg = totalCbm * 1000;
      }

      const totalActualWeightKg = actualWeightKg * qty;
      const chargeableKg = Math.max(totalActualWeightKg, volumetricWeightKg);

      wrapper.querySelector(".cargo-volume").textContent = `Volume: ${totalCbm.toFixed(3)} CBM`;
      wrapper.querySelector(".cargo-volumetric").textContent = `Volumetric Weight: ${volumetricWeightKg.toFixed(2)} kg`;
      wrapper.querySelector(".cargo-chargeable").textContent = `Chargeable Weight: ${chargeableKg.toFixed(2)} kg`;
    }

    function recalcAllCargo() {

  let totalVolume = 0
  let totalVolumetric = 0
  let totalChargeable = 0

  cargoItemsEl.querySelectorAll("[data-index]").forEach(wrapper => {

    const qty = parseFloat(wrapper.querySelector(".cargo-qty").value) || 0
    const weight = parseFloat(wrapper.querySelector(".cargo-weight").value) || 0
    const weightUnit = wrapper.querySelector(".cargo-weight-unit").value

    let length = parseFloat(wrapper.querySelector(".cargo-length").value) || 0
    let width = parseFloat(wrapper.querySelector(".cargo-width").value) || 0
    let height = parseFloat(wrapper.querySelector(".cargo-height").value) || 0
    const dimUnit = wrapper.querySelector(".cargo-dim-unit").value

    let actualWeightKg = weightUnit === "lbs" ? weight / 2.20462 : weight

    let lCm = dimUnit === "inch" ? length * 2.54 : length
    let wCm = dimUnit === "inch" ? width * 2.54 : width
    let hCm = dimUnit === "inch" ? height * 2.54 : height

    const cbm = (lCm * wCm * hCm) / 1000000
    const totalCbm = cbm * qty

    let volumetricWeightKg = 0

    if (state.transportMode === "air") {
      volumetricWeightKg = ((lCm * wCm * hCm) / 6000) * qty
    } else if (state.transportMode === "ground") {
      volumetricWeightKg = ((lCm * wCm * hCm) / 5000) * qty
    } else {
      volumetricWeightKg = totalCbm * 1000
    }

    const totalActualWeightKg = actualWeightKg * qty
    const chargeableKg = Math.max(totalActualWeightKg, volumetricWeightKg)

    // ACCUMULATE TOTALS
    totalVolume += totalCbm
    totalVolumetric += volumetricWeightKg
    totalChargeable += chargeableKg

    // UPDATE EACH ITEM DISPLAY
    wrapper.querySelector(".cargo-volume").textContent =
      `Volume: ${totalCbm.toFixed(3)} CBM`

    wrapper.querySelector(".cargo-volumetric").textContent =
      `Volumetric Weight: ${volumetricWeightKg.toFixed(2)} kg`

    wrapper.querySelector(".cargo-chargeable").textContent =
      `Chargeable Weight: ${chargeableKg.toFixed(2)} kg`

  })

  // UPDATE TOTALS UI
  document.getElementById("totalVolume").textContent =
    `Total Volume: ${totalVolume.toFixed(3)} CBM`

  document.getElementById("totalVolumetricWeight").textContent =
    `Total Volumetric Weight: ${totalVolumetric.toFixed(2)} kg`

  document.getElementById("totalChargeableWeight").textContent =
    `Total Chargeable Weight: ${totalChargeable.toFixed(2)} kg`

}
    addCargoBtn.addEventListener("click", addCargoItem);
    addCargoItem();
    syncConditionalSections();

    function getCargoPayload() {
      const items = [];
      cargoItemsEl.querySelectorAll("[data-index]").forEach(wrapper => {
        const qty = parseFloat(wrapper.querySelector(".cargo-qty").value) || 0;
        const weight = parseFloat(wrapper.querySelector(".cargo-weight").value) || 0;
        const weightUnit = wrapper.querySelector(".cargo-weight-unit").value;
        const length = parseFloat(wrapper.querySelector(".cargo-length").value) || 0;
        const width = parseFloat(wrapper.querySelector(".cargo-width").value) || 0;
        const height = parseFloat(wrapper.querySelector(".cargo-height").value) || 0;
        const dimUnit = wrapper.querySelector(".cargo-dim-unit").value;

        let actualWeightKg = weightUnit === "lbs" ? weight / 2.20462 : weight;
        let lCm = dimUnit === "inch" ? length * 2.54 : length;
        let wCm = dimUnit === "inch" ? width * 2.54 : width;
        let hCm = dimUnit === "inch" ? height * 2.54 : height;

        const cbmPerUnit = (lCm * wCm * hCm) / 1000000;
        const totalCbm = cbmPerUnit * qty;

        let volumetricWeightKg = 0;
        if (state.transportMode === "air") {
          volumetricWeightKg = ((lCm * wCm * hCm) / 6000) * qty;
        } else if (state.transportMode === "ground") {
          volumetricWeightKg = ((lCm * wCm * hCm) / 5000) * qty;
        } else {
          volumetricWeightKg = totalCbm * 1000;
        }

        const totalActualWeightKg = actualWeightKg * qty;
        const chargeableWeightKg = Math.max(totalActualWeightKg, volumetricWeightKg);

        items.push({
          commodity: wrapper.querySelector(".cargo-commodity").value,
          packagingType: wrapper.querySelector(".cargo-packaging").value,
          cargoType: wrapper.querySelector(".cargo-type").value,
          qty,
          weight,
          weightUnit,
          length,
          width,
          height,
          dimUnit,
          totalActualWeightKg: Number(totalActualWeightKg.toFixed(2)),
          volumetricWeightKg: Number(volumetricWeightKg.toFixed(2)),
          chargeableWeightKg: Number(chargeableWeightKg.toFixed(2)),
          totalVolumeCbm: Number(totalCbm.toFixed(3))
        });
      });
      return items;
    }

    function getPayload() {
      const quoteNumber = generateQuoteNumber();
      const includeInland = state.transportMode !== "ground" && document.getElementById("includeInlandFreight").checked;

      const payload = {
        quoteNumber,
        referenceNumber: document.querySelector('[name="referenceNumber"]').value,
        email: document.querySelector('[name="email"]').value,
        transportMode: state.transportMode,
        tradeDirection: state.transportMode === "ground" ? "" : state.tradeDirection,
        loadType: state.transportMode === "ocean" ? state.loadType : "",
        containerType: (state.transportMode === "ocean" && state.loadType === "fcl")
          ? document.getElementById("containerType").value
          : "",
        cargo: getCargoPayload(),

        originCode: state.transportMode === "ground" ? "" : document.getElementById("originCode").value,
        originName: state.transportMode === "ground" ? "" : document.getElementById("originName").value,
        originCountry: state.transportMode === "ground" ? "" : document.getElementById("originCountryManual").value,

        destinationCode: state.transportMode === "ground" ? "" : document.getElementById("destinationCode").value,
        destinationName: state.transportMode === "ground" ? "" : document.getElementById("destinationName").value,
        destinationCountry: state.transportMode === "ground" ? "" : document.getElementById("destinationCountryManual").value,

        groundOriginCompany: state.transportMode === "ground" ? document.getElementById("groundOriginCompany").value : "",
        groundOriginAddress: state.transportMode === "ground" ? document.getElementById("groundOriginAddress").value : "",
        groundOriginCity: state.transportMode === "ground" ? document.getElementById("groundOriginCity").value : "",
        groundOriginState: state.transportMode === "ground" ? document.getElementById("groundOriginState").value : "",
        groundOriginZip: state.transportMode === "ground" ? document.getElementById("groundOriginZip").value : "",
        groundOriginCountry: state.transportMode === "ground" ? document.getElementById("groundOriginCountry").value : "",

        groundDestinationCompany: state.transportMode === "ground" ? document.getElementById("groundDestinationCompany").value : "",
        groundDestinationAddress: state.transportMode === "ground" ? document.getElementById("groundDestinationAddress").value : "",
        groundDestinationCity: state.transportMode === "ground" ? document.getElementById("groundDestinationCity").value : "",
        groundDestinationState: state.transportMode === "ground" ? document.getElementById("groundDestinationState").value : "",
        groundDestinationZip: state.transportMode === "ground" ? document.getElementById("groundDestinationZip").value : "",
        groundDestinationCountry: state.transportMode === "ground" ? document.getElementById("groundDestinationCountry").value : "",

        inlandFreight: includeInland,
        pickupCompany: includeInland ? document.getElementById("pickupCompany").value : "",
        pickupPhone: includeInland ? document.getElementById("pickupPhone").value : "",
        pickupAddress: includeInland ? document.getElementById("pickupAddress").value : "",
        pickupCity: includeInland ? document.getElementById("pickupCity").value : "",
        pickupState: includeInland ? document.getElementById("pickupState").value : "",
        pickupZip: includeInland ? document.getElementById("pickupZip").value : "",
        pickupCountry: includeInland ? document.getElementById("pickupCountry").value : "",

        deliveryCompany: includeInland ? document.getElementById("deliveryCompany").value : "",
        deliveryPhone: includeInland ? document.getElementById("deliveryPhone").value : "",
        deliveryAddress: includeInland ? document.getElementById("deliveryAddress").value : "",
        deliveryCity: includeInland ? document.getElementById("deliveryCity").value : "",
        deliveryState: includeInland ? document.getElementById("deliveryState").value : "",
        deliveryZip: includeInland ? document.getElementById("deliveryZip").value : "",
        deliveryCountry: includeInland ? document.getElementById("deliveryCountry").value : "",
        inlandNotes: includeInland ? document.getElementById("inlandNotes").value : ""
      };

      return payload;
    }

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

        if (!res.ok) {
          throw new Error("Webhook request failed");
        }

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
