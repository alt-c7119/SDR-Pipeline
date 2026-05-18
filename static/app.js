let stages = [];
let leads = [];

const leadRows = document.getElementById("leadRows");
const drawerBody = document.getElementById("drawerBody");
const syncModal = document.getElementById("syncModal");
const leadCount = document.getElementById("leadCount");
const drawer = document.getElementById("drawer");
const drawerToggle = document.getElementById("drawerToggle");
const toggleText = document.querySelector(".toggle-text");
const layout = document.querySelector(".layout");

function statusPill(status) {
  if (status === "Synced") return '<span class="pill pill-qualified">SYNCED</span>';
  if (status === "Error") return '<span class="pill pill-error">SYNC ERROR</span>';
  return '<span class="pill pill-sync">NOT SYNCED</span>';
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  return response.json();
}

function renderTable() {
  leadCount.textContent = `${leads.length} leads`;

  leadRows.innerHTML = leads
    .map(
      (lead) => `
        <tr data-id="${lead.id}">
          <td><input type="checkbox"></td>
          <td>
            <select class="stage-select" data-id="${lead.id}">
              ${stages
                .map(
                  (stage) =>
                    `<option ${stage === lead.pipeline_stage ? "selected" : ""}>${stage}</option>`
                )
                .join("")}
            </select>
          </td>
          <td><a href="#" data-id="${lead.id}">View</a></td>
          <td>${lead.loanname}</td>
          <td>${lead.propname}</td>
          <td>${lead.origborrowername}</td>
          <td>${lead.guarantor}</td>
          <td>${lead.maturitydt}</td>
          <td>${lead.defeasstatus}</td>
          <td>${lead.defeasstatnx}</td>
          <td>${lead.prepaycategory}</td>
          <td>${lead.prepaydesc}</td>
          <td>${lead.curloanbal}</td>
          <td>${lead.secloanbal}</td>
          <td>${lead.coupontype}</td>
          <td>${lead.currentnoterate}</td>
          <td>${lead.state}</td>
          <td>${lead.city}</td>
          <td>${lead.masterservicer}</td>
          <td>${lead.originator}</td>
          <td>${statusPill(lead.salesforceStatus)}</td>
          <td>${lead.lastSyncedAt || "-"}</td>
          <td>${lead.salesforceId ? `<a href="#">${lead.salesforceId}</a>` : "-"}</td>
        </tr>
      `
    )
    .join("");
}

function renderDrawer(lead) {
  drawerBody.innerHTML = `
    <h3>Pipeline Stage</h3>
    <select id="drawerStage">
      ${stages
        .map(
          (stage) =>
            `<option ${stage === lead.pipeline_stage ? "selected" : ""}>${stage}</option>`
        )
        .join("")}
    </select>

    <h3>Notes</h3>
    <textarea id="drawerNotes">${lead.notes || ""}</textarea>
    <br>
    <button id="saveNote" class="btn btn-primary">Save Note</button>

    <h3>Salesforce</h3>
    <div class="field">Status: ${lead.salesforceStatus}</div>
    <button id="pushOne" class="btn btn-primary">Push to Salesforce</button>

    <h3>Loan Information</h3>
    <div class="field">Loan Name: ${lead.loanname}</div>
    <div class="field">Pool Number: ${lead.poolnum}</div>
    <div class="field">Origination Date: ${lead.originationdt}</div>
    <div class="field">Maturity Date: ${lead.maturitydt}</div>
    <div class="field">Current Coupon: ${lead.curcpn}</div>
    <div class="field">Current Note Rate: ${lead.currentnoterate}</div>
    <div class="field">Coupon Type: ${lead.coupontype}</div>
    <div class="field">Loan Purpose: ${lead.loanpurpose}</div>

    <h3>Balances</h3>
    <div class="field">Securities Loan Balance: ${lead.secloanbal}</div>
    <div class="field">Current Loan Balance: ${lead.curloanbal}</div>

    <h3>Defeasance / Prepay</h3>
    <div class="field">Defeasance Status: ${lead.defeasstatus}</div>
    <div class="field">Defeasance Status Next: ${lead.defeasstatnx}</div>
    <div class="field">Prepay Category: ${lead.prepaycategory}</div>
    <div class="field">Prepay Description: ${lead.prepaydesc}</div>

    <h3>Borrower / Sponsor</h3>
    <div class="field">Original Borrower Name: ${lead.origborrowername}</div>
    <div class="field">Guarantor: ${lead.guarantor}</div>
    <div class="field">Bloomberg Name: ${lead.bloombergname}</div>
    <div class="field">Affiliated Sponsors: ${lead.affiliatedsponsors}</div>

    <h3>Property</h3>
    <div class="field">Property Name: ${lead.propname}</div>
    <div class="field">Property Type Code: ${lead.proptypecode}</div>
    <div class="field">Property Type Normalized: ${lead.proptypenorm}</div>
    <div class="field">Property Subtype: ${lead.propertysubtype}</div>
    <div class="field">Address: ${lead.address}</div>
    <div class="field">City: ${lead.city}</div>
    <div class="field">County: ${lead.county}</div>
    <div class="field">State: ${lead.state}</div>
    <div class="field">Zip: ${lead.zip}</div>
    <div class="field">MSA Name: ${lead.msaname}</div>
    <div class="field">Submarket: ${lead.submarket}</div>

    <h3>Servicing</h3>
    <div class="field">Master Servicer: ${lead.masterservicer}</div>
    <div class="field">Originator: ${lead.originator}</div>
  `;

  document.getElementById("saveNote").onclick = async () => {
    const notes = document.getElementById("drawerNotes").value;

    await api(`/api/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });

    lead.notes = notes;
    renderTable();
  };

  document.getElementById("drawerStage").onchange = async (event) => {
    const pipeline_stage = event.target.value;

    await api(`/api/leads/${lead.id}`, {
      method: "PATCH",
      body: JSON.stringify({ pipeline_stage }),
    });

    lead.pipeline_stage = pipeline_stage;
    renderTable();
  };

  document.getElementById("pushOne").onclick = syncQualified;
}

async function syncQualified() {
  const qualified = leads.filter((lead) => lead.pipeline_stage === "Qualified");

  document.getElementById(
    "syncMessage"
  ).textContent = `You are about to sync ${qualified.length} qualified leads to Salesforce.`;

  syncModal.showModal();

  document.getElementById("confirmSync").onclick = async () => {
    const result = await api("/api/sync-qualified", { method: "POST" });

    leads = result.leads;
    renderTable();
    syncModal.close();
  };
}

function updateDrawerToggleState(isCollapsed) {
  if (!drawerToggle) return;

  drawerToggle.setAttribute("aria-expanded", String(!isCollapsed));
  drawerToggle.setAttribute(
    "aria-label",
    isCollapsed ? "Expand lead details" : "Collapse lead details"
  );

  if (toggleText) {
    toggleText.textContent = isCollapsed ? "Expand" : "Collapse";
  }
}

leadRows.addEventListener("click", (event) => {
  const row = event.target.closest("tr");
  if (!row) return;

  const lead = leads.find((item) => item.id === Number(row.dataset.id));
  if (lead) renderDrawer(lead);
});

leadRows.addEventListener("change", async (event) => {
  if (!event.target.classList.contains("stage-select")) return;

  const lead = leads.find((item) => item.id === Number(event.target.dataset.id));
  if (!lead) return;

  const pipeline_stage = event.target.value;

  await api(`/api/leads/${lead.id}`, {
    method: "PATCH",
    body: JSON.stringify({ pipeline_stage }),
  });

  lead.pipeline_stage = pipeline_stage;
});

document.getElementById("syncQualified").onclick = syncQualified;
document.getElementById("cancelSync").onclick = () => syncModal.close();

if (drawer && drawerToggle) {
  const isInitiallyCollapsed = drawer.classList.contains("collapsed");

  if (layout) {
    layout.classList.toggle("drawer-collapsed", isInitiallyCollapsed);
  }

  updateDrawerToggleState(isInitiallyCollapsed);

  drawerToggle.onclick = () => {
    const isCollapsed = drawer.classList.toggle("collapsed");

    if (layout) {
      layout.classList.toggle("drawer-collapsed", isCollapsed);
    }

    updateDrawerToggleState(isCollapsed);
  };
}

async function bootstrap() {
  const result = await api("/api/leads");

  leads = result.leads;
  stages = result.stages;

  renderTable();
}

bootstrap();
