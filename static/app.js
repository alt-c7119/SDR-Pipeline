let stages = [];
let leads = [];
let treppFilterFields = [];
let campaigns = [];
let selectedCampaignId = null;

const leadRows = document.getElementById("leadRows");
const drawerBody = document.getElementById("drawerBody");
const syncModal = document.getElementById("syncModal");
const leadCount = document.getElementById("leadCount");
const drawer = document.getElementById("drawer");
const drawerToggle = document.getElementById("drawerToggle");
const layout = document.querySelector(".layout");
const filtersContainer = document.getElementById("filtersContainer");
const campaignForm = document.getElementById("campaignForm");
const campaignMessage = document.getElementById("campaignMessage");
const sidebarLinks = document.querySelectorAll(".sidebar-link[data-view]");
const syncLogRows = document.getElementById("syncLogRows");
const campaignRows = document.getElementById("campaignRows");
const campaignRecordsDrawer = document.getElementById("campaignRecordsDrawer");
const campaignDrawerBody = document.getElementById("campaignDrawerBody");
const campaignDrawerTitle = document.getElementById("campaignDrawerTitle");
const campaignDrawerClose = document.getElementById("campaignDrawerClose");

function syncStatusPill(status) {
  if (status === "Success") return '<span class="pill pill-qualified">SUCCESS</span>';
  if (status === "Failed") return '<span class="pill pill-error">FAILED</span>';
  return '<span class="pill pill-sync">PENDING</span>';
}

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
          <td>${lead.guarantor}</td>
          <td>${lead.trepploanid}</td>
          <td>${lead.loanname}</td>
          <td>${lead.defeasstatus}</td>
          <td>${lead.address}</td>
          <td>${statusPill(lead.salesforceStatus)}</td>
          <td>${lead.lastSyncedAt || "-"}</td>
          <td>${lead.salesforceId || "-"}</td>
        </tr>
      `
    )
    .join("");
}



function formatValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  return value;
}

function buildAccordionSections(lead) {
  const activityItems = Array.isArray(lead.activityHistory)
    ? lead.activityHistory
    : lead.lastSyncedAt
      ? [`Last synced at ${lead.lastSyncedAt}`]
      : ["No activity recorded yet."];

  return [
    {
      id: "additional-information",
      title: "Notes & Sync Options",
      items: [["Pipeline Stage", `<select id="drawerStage">${stages.map((stage) => `<option ${stage === lead.pipeline_stage ? "selected" : ""}>${stage}</option>`).join("")}</select>`], ["Notes", `<textarea id="drawerNotes">${lead.notes || ""}</textarea><br><button id="saveNote" class="btn btn-primary">Save Note</button>`], ["Salesforce Status", `${formatValue(lead.salesforceStatus)} <button id="pushOne" class="btn btn-primary">Push to Salesforce</button>`]],
    },
    {
      id: "loan-information",
      title: "Loan Information",
      items: [
        ["Loan Name", lead.loanname],
        ["Pool Number", lead.poolnum],
        ["Origination Date", lead.originationdt],
        ["Maturity Date", lead.maturitydt],
        ["Current Coupon", lead.curcpn],
        ["Current Note Rate", lead.currentnoterate],
        ["Coupon Type", lead.coupontype],
        ["Loan Purpose", lead.loanpurpose],
      ],
    },
    { id: "balances", title: "Balances", items: [["Securities Loan Balance", lead.secloanbal], ["Current Loan Balance", lead.curloanbal]] },
    {
      id: "defeasance-prepay",
      title: "Defeasance / Prepay",
      items: [["Defeasance Status", lead.defeasstatus], ["Defeasance Status Next", lead.defeasstatnx], ["Prepay Category", lead.prepaycategory], ["Prepay Description", lead.prepaydesc]],
    },
    {
      id: "borrower-sponsor",
      title: "Borrower / Sponsor",
      items: [["Original Borrower Name", lead.origborrowername], ["Guarantor", lead.guarantor], ["Bloomberg Name", lead.bloombergname], ["Affiliated Sponsors", lead.affiliatedsponsors]],
    },
    {
      id: "property",
      title: "Property",
      items: [["Property Name", lead.propname], ["Property Type Code", lead.proptypecode], ["Property Type Normalized", lead.proptypenorm], ["Property Subtype", lead.propertysubtype], ["Address", lead.address], ["City", lead.city], ["County", lead.county], ["State", lead.state], ["Zip", lead.zip], ["MSA Name", lead.msaname], ["Submarket", lead.submarket]],
    },
    { id: "servicing", title: "Servicing", items: [["Master Servicer", lead.masterservicer], ["Originator", lead.originator]] },
    {
      id: "activity-history",
      title: "Activity History",
      activityItems,
    },
  ];
}

function renderAccordion(lead) {
  const sections = buildAccordionSections(lead);
  return sections.map((section, idx) => {
    const expanded = idx === 0 || section.id === "activity-history";
    const panelId = `panel-${section.id}`;
    const headerId = `header-${section.id}`;
    const count = section.items ? section.items.length : section.activityItems.length;
    const body = section.items
      ? section.items.map(([label, value]) => `<div class="field"><span class="label">${label}:</span> ${typeof value === "string" && value.includes("<") ? value : formatValue(value)}</div>`).join("")
      : `<ul class="activity-log">${section.activityItems.map((item) => `<li>${formatValue(item)}</li>`).join("")}</ul>`;
    return `<section class="accordion-section">
      <h3>
        <button class="accordion-trigger" id="${headerId}" aria-expanded="${expanded}" aria-controls="${panelId}" data-panel="${panelId}">
          <span class="accordion-title-wrap"><span class="chevron" aria-hidden="true">${expanded ? "▾" : "▸"}</span><span>${section.title}</span></span>
          <span class="count-badge">${count}</span>
        </button>
      </h3>
      <div id="${panelId}" role="region" aria-labelledby="${headerId}" class="accordion-panel ${expanded ? "" : "is-collapsed"}">${body}</div>
    </section>`;
  }).join('');
}


function renderDrawer(lead) {
  drawerBody.innerHTML = `<div class="lead-accordion">${renderAccordion(lead)}</div>`;

  const saveNote = document.getElementById("saveNote");
  const drawerStage = document.getElementById("drawerStage");
  const pushOne = document.getElementById("pushOne");

  if (saveNote) {
    saveNote.onclick = async () => {
      const notes = document.getElementById("drawerNotes").value;
      await api(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      });
      lead.notes = notes;
      renderTable();
    };
  }

  if (drawerStage) {
    drawerStage.onchange = async (event) => {
      const pipeline_stage = event.target.value;
      await api(`/api/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ pipeline_stage }),
      });
      lead.pipeline_stage = pipeline_stage;
      renderTable();
    };
  }

  if (pushOne) {
    pushOne.onclick = syncQualified;
  }
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
    isCollapsed ? "Expand lead details panel" : "Collapse lead details panel"
  );
  drawerToggle.setAttribute("title", isCollapsed ? "Expand" : "Collapse");
}



drawerBody.addEventListener("click", (event) => {
  const trigger = event.target.closest(".accordion-trigger");
  if (!trigger) return;

  const panel = document.getElementById(trigger.dataset.panel);
  const isExpanded = trigger.getAttribute("aria-expanded") === "true";
  trigger.setAttribute("aria-expanded", String(!isExpanded));

  const chevron = trigger.querySelector(".chevron");
  if (chevron) chevron.textContent = isExpanded ? "▸" : "▾";

  if (panel) {
    panel.classList.toggle("is-collapsed", isExpanded);
  }
});

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
  const metadata = await api("/api/campaign-metadata");

  leads = result.leads;
  stages = result.stages;
  treppFilterFields = metadata.fields;

  renderTable();
  addFilterRow();
  showView("campaigns");
}


function setCampaignsState(state) {
  document.getElementById("campaignsLoading").classList.toggle("hidden", state !== "loading");
  document.getElementById("campaignsError").classList.toggle("hidden", state !== "error");
  document.getElementById("campaignsEmpty").classList.toggle("hidden", state !== "empty");
  document.getElementById("campaignsTableWrap").classList.toggle("hidden", state !== "ready");
}

function formatCampaignDate(createdAt) {
  if (!createdAt) return "-";
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) return createdAt;
  return parsed.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function renderCampaigns() {
  campaignRows.innerHTML = campaigns
    .map(
      (campaign) => `<tr class="campaign-row" data-campaign-id="${campaign.id}" data-campaign-name="${campaign.campaign_name}">
        <td>${campaign.campaign_name}</td>
        <td>${campaign.description || "-"}</td>
        <td>${formatCampaignDate(campaign.created_at)}</td>
      </tr>`
    )
    .join("");
}

function closeCampaignDrawer() {
  campaignRecordsDrawer.classList.add("hidden");
  selectedCampaignId = null;
}

function renderCampaignRecords(records) {
  campaignDrawerBody.innerHTML = `<div class="record-list">${records
    .map(
      (record) => `<article class="record-card">
      <h4>${formatValue(record.loanname)}</h4>
      <p class="record-meta"><strong>Trepp Loan ID:</strong> ${formatValue(record.trepploanid)}</p>
      <p class="record-meta"><strong>Guarantor:</strong> ${formatValue(record.guarantor)}</p>
      <p class="record-meta"><strong>Property Name:</strong> ${formatValue(record.property_name)}</p>
      <p class="record-meta"><strong>Address:</strong> ${formatValue(record.address)}</p>
      <p class="record-meta"><strong>Current Loan Balance:</strong> ${formatValue(record.current_loan_balance)}</p>
    </article>`
    )
    .join("")}</div>`;
}

async function openCampaignDrawer(campaignId) {
  const campaign = campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;

  selectedCampaignId = campaignId;
  campaignDrawerTitle.textContent = `Campaign Records: ${campaign.campaign_name}`;
  campaignRecordsDrawer.classList.remove("hidden");
  campaignDrawerBody.innerHTML = '<p class="state-message">Loading campaign records...</p>';

  try {
    const result = await api(`/api/campaigns/${campaignId}/records`);
    if (selectedCampaignId !== campaignId) return;
    const records = Array.isArray(result.records) ? result.records : [];
    if (!records.length) {
      campaignDrawerBody.innerHTML = '<p class="state-message">This campaign has no records.</p>';
      return;
    }
    renderCampaignRecords(records);
  } catch {
    if (selectedCampaignId !== campaignId) return;
    campaignDrawerBody.innerHTML = '<p class="state-message state-error">Campaign records could not be loaded.</p>';
  }
}

async function loadCampaigns() {
  setCampaignsState("loading");
  try {
    const result = await api("/api/campaigns");
    campaigns = Array.isArray(result.campaigns) ? result.campaigns : [];
    if (!campaigns.length) {
      setCampaignsState("empty");
      return;
    }
    renderCampaigns();
    setCampaignsState("ready");
  } catch {
    setCampaignsState("error");
  }
}

function setSyncLogState(state) {
  document.getElementById("syncLogLoading").classList.toggle("hidden", state !== "loading");
  document.getElementById("syncLogError").classList.toggle("hidden", state !== "error");
  document.getElementById("syncLogEmpty").classList.toggle("hidden", state !== "empty");
  document.getElementById("syncLogTableWrap").classList.toggle("hidden", state !== "ready");
}

function renderSyncLog(entries) {
  syncLogRows.innerHTML = entries
    .map(
      (entry) => `<tr>
      <td>${entry.record_identifier || "-"}</td><td>${entry.record_name || "-"}</td><td>${entry.object_type || "-"}</td><td>${entry.operation || "-"}</td>
      <td>${syncStatusPill(entry.status)}</td><td>${entry.synced_at || "-"}</td><td>${entry.triggered_by || "-"}</td><td>${entry.salesforce_record_id || "-"}</td>
      <td>${entry.message || "-"} (Lead ID: ${entry.lead_id || "-"}, Campaign: ${entry.campaign || "-"})</td></tr>`
    )
    .join("");
}

async function loadSyncLog() {
  setSyncLogState("loading");
  try {
    const result = await api("/api/salesforce-sync-log");
    const entries = Array.isArray(result.entries) ? result.entries : [];
    if (!entries.length) {
      setSyncLogState("empty");
      return;
    }
    renderSyncLog(entries);
    setSyncLogState("ready");
  } catch {
    setSyncLogState("error");
  }
}

function showView(viewName) {
  document.getElementById("campaignsView").classList.toggle("hidden", viewName !== "campaigns");
  document.getElementById("campaignView").classList.toggle("hidden", viewName !== "campaign");
  document.getElementById("pipelineView").classList.toggle("hidden", viewName !== "pipeline");
  document.getElementById("salesforceSyncLogView").classList.toggle("hidden", viewName !== "salesforce-sync-log");
  sidebarLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  const showLeadDrawer = viewName === "pipeline";
  drawer.classList.toggle("hidden", !showLeadDrawer);
  layout.classList.toggle("lead-drawer-hidden", !showLeadDrawer);
  if (viewName !== "campaigns") closeCampaignDrawer();
  if (viewName === "salesforce-sync-log") loadSyncLog();
  if (viewName === "campaigns") loadCampaigns();
}

function inputTypeForField(type) {
  if (type === "number") return "number";
  if (type === "date") return "date";
  return "text";
}

function addFilterRow() {
  if (!filtersContainer) return;
  const wrapper = document.createElement("div");
  wrapper.className = "filter-row";

  const fieldSelect = document.createElement("select");
  treppFilterFields.forEach((field) => {
    const option = document.createElement("option");
    option.value = field.key;
    option.textContent = field.key;
    option.dataset.type = field.type;
    fieldSelect.appendChild(option);
  });

  const operatorSelect = document.createElement("select");
  ["equals", "contains", "gt", "lt"].forEach((op) => {
    const option = document.createElement("option");
    option.value = op;
    option.textContent = op;
    operatorSelect.appendChild(option);
  });

  const valueInput = document.createElement("input");
  valueInput.placeholder = "Value";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "btn btn-secondary";
  removeButton.textContent = "Remove";
  removeButton.onclick = () => wrapper.remove();

  const applyType = () => {
    const selected = fieldSelect.options[fieldSelect.selectedIndex];
    const fieldType = selected ? selected.dataset.type : "text";
    valueInput.type = inputTypeForField(fieldType);
  };
  fieldSelect.onchange = applyType;
  applyType();

  wrapper.append(fieldSelect, operatorSelect, valueInput, removeButton);
  filtersContainer.appendChild(wrapper);
}

document.getElementById("addFilter")?.addEventListener("click", addFilterRow);

sidebarLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    showView(link.dataset.view);
  });
});

document.getElementById("openCreateCampaign")?.addEventListener("click", () => showView("campaign"));

campaignForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  campaignMessage.textContent = "";
  const name = document.getElementById("campaignName").value.trim();
  const description = document.getElementById("campaignDescription").value.trim();
  if (!name) {
    campaignMessage.textContent = "Campaign name is required.";
    return;
  }

  const filters = Array.from(document.querySelectorAll(".filter-row"))
    .map((row) => {
      const [field, operator, value] = row.querySelectorAll("select, input");
      return { field: field.value, operator: operator.value, value: value.value.trim() };
    })
    .filter((item) => item.value);

  const fileInput = document.getElementById("loanIdFile");
  const file = fileInput.files[0];
  let uploaded_ids = [];

  if (file) {
    if (!["text/plain", "text/csv", "application/vnd.ms-excel", ""].includes(file.type)) {
      campaignMessage.textContent = "Unsupported file format. Upload .txt or .csv with Trepp Master Loan IDs only.";
      return;
    }
    const raw = await file.text();
    uploaded_ids = raw.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
    if (!uploaded_ids.length) {
      campaignMessage.textContent = "Upload file must contain usable Trepp Master Loan IDs. Upload only matches existing Trepp records.";
      return;
    }
  }

  if (!filters.length && !uploaded_ids.length) {
    campaignMessage.textContent = "Apply at least one filter or upload a Trepp Master Loan ID file.";
    return;
  }

  const result = await api("/api/campaigns", {
    method: "POST",
    body: JSON.stringify({ campaign_name: name, description, filters, uploaded_ids }),
  });

  if (result.error) {
    campaignMessage.textContent = result.error;
    return;
  }

  campaignMessage.textContent = `Campaign "${result.campaign_name}" created successfully with ${result.record_count} records.`;
  document.getElementById("campaignName").value = "";
  document.getElementById("loanIdFile").value = "";
  await loadCampaigns();
});

campaignRows?.addEventListener("click", (event) => {
  const row = event.target.closest(".campaign-row");
  if (!row) return;
  openCampaignDrawer(Number(row.dataset.campaignId));
});

campaignDrawerClose?.addEventListener("click", closeCampaignDrawer);

bootstrap();
