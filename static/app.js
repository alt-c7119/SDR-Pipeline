let stages = [];
let leads = [];
let filteredLeads = [];
let treppFilterFields = [];
let campaigns = [];
let activeSearchTerm = "";
let searchDebounceTimer = null;

const SEARCH_DEBOUNCE_MS = 200;
const SEARCHABLE_LEAD_FIELDS = [
  "masterloanidtrepp", "guarantor", "loanname", "defeasstatus", "complete_address", "origborrowername",
  "bloombergname", "poolnum", "masterservicer", "originator", "prepaydesc", "coupontype",
  "affiliatedsponsors", "loanpurpose", "defeasstatnx", "prepaycategory", "propname", "proptypecode",
  "proptypenorm", "propertysubtype", "address", "city", "county", "state", "zip", "msaname",
  "submarket", "notename", "derivedloanstatus", "watchliststatus", "loanpurposeraw", "msa", "datasource",
];
const HIGH_PRIORITY_FIELDS = new Set([
  "loanname", "guarantor", "origborrowername", "propname", "complete_address", "address", "city",
  "county", "state", "zip", "masterloanidtrepp", "poolnum",
]);

const leadRows = document.getElementById("leadRows");
const drawerBody = document.getElementById("drawerBody");
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
const pipelineSearchInput = document.getElementById("pipelineSearchInput");
const pipelineFilters = document.getElementById("pipelineFilters");
const toggleFiltersButton = document.getElementById("toggleFilters");
const clearFiltersButton = document.getElementById("clearFilters");

let filterState = {
  stage: "",
  defeasanceStatus: "",
  prepayCategory: "",
  maturityRange: "",
  state: "",
  masterServicer: "",
};
let filtersExpanded = true;

const MATURITY_OPTIONS = ["", "Past Due", "0–6 Months", "6–12 Months", "12–24 Months", "24+ Months", "Unknown"];

function normalizeFilterValue(value) {
  return String(value ?? "").trim().toLowerCase();
}

function toTitleCase(value) {
  return String(value || "").toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function getReadableDefeasanceStatus(lead) {
  const raw = lead.defeasstatus ?? lead.defeasstatnx;
  const value = normalizeFilterValue(raw);
  if (!value) return "Unknown";
  if (["d", "defeased", "yes", "y", "1", "true"].includes(value)) return "Defeased";
  if (["n", "not defeased", "no", "0", "false"].includes(value)) return "Not Defeased";
  if (value.includes("partial") || value === "p") return "Partial";
  return toTitleCase(raw);
}

function getMaturityDate(lead) {
  const candidates = [lead.derivedmaturitydt, lead.maturitydt, lead.maturitymodeldt];
  for (const item of candidates) {
    if (!item) continue;
    const parsed = new Date(item);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function getMaturityRange(lead) {
  const maturityDate = getMaturityDate(lead);
  if (!maturityDate) return "Unknown";
  const now = new Date();
  const diffMonths = (maturityDate.getFullYear() - now.getFullYear()) * 12 + (maturityDate.getMonth() - now.getMonth());
  if (maturityDate < now) return "Past Due";
  if (diffMonths < 6) return "0–6 Months";
  if (diffMonths < 12) return "6–12 Months";
  if (diffMonths < 24) return "12–24 Months";
  return "24+ Months";
}

function getUniqueOptions(values) {
  const map = new Map();
  values.forEach((value) => {
    const normalized = normalizeFilterValue(value);
    if (!normalized) return;
    if (!map.has(normalized)) map.set(normalized, String(value).trim());
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}



function normalizeForSearch(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, idx) => idx);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const temp = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + cost);
      diagonal = temp;
    }
  }
  return prev[b.length];
}

function evaluateFieldMatch(query, value) {
  if (!value) return null;
  if (value === query) return 100;
  if (value.startsWith(query)) return 80;
  if (value.includes(query)) return 60;

  const tokens = value.split(" ");
  const nearToken = tokens.some((token) => {
    if (!token) return false;
    if (Math.abs(token.length - query.length) > 2) return false;
    return levenshteinDistance(token, query) <= 1;
  });
  return nearToken ? 40 : null;
}

function getSearchScore(lead, normalizedQuery) {
  let score = null;
  for (const field of SEARCHABLE_LEAD_FIELDS) {
    const normalizedValue = normalizeForSearch(lead[field]);
    const fieldScore = evaluateFieldMatch(normalizedQuery, normalizedValue);
    if (fieldScore === null) continue;
    const weighted = fieldScore + (HIGH_PRIORITY_FIELDS.has(field) ? 10 : 0);
    score = score === null ? weighted : Math.max(score, weighted);
  }
  return score;
}

function getStageValue(lead) {
  return normalizeFilterValue(lead.pipeline_stage);
}

function applySearchAndRender() {
  const normalizedQuery = normalizeForSearch(activeSearchTerm);
  const matchesSearch = (lead) => !normalizedQuery || getSearchScore(lead, normalizedQuery) !== null;
  const matchesStage = (lead) => !filterState.stage || getStageValue(lead) === normalizeFilterValue(filterState.stage);
  const matchesDefeasanceStatus = (lead) => !filterState.defeasanceStatus || normalizeFilterValue(getReadableDefeasanceStatus(lead)) === normalizeFilterValue(filterState.defeasanceStatus);
  const matchesPrepayCategory = (lead) => !filterState.prepayCategory || normalizeFilterValue(lead.prepaycategory) === normalizeFilterValue(filterState.prepayCategory);
  const matchesMaturityRange = (lead) => !filterState.maturityRange || getMaturityRange(lead) === filterState.maturityRange;
  const matchesState = (lead) => !filterState.state || normalizeFilterValue(lead.state) === normalizeFilterValue(filterState.state);
  const matchesMasterServicer = (lead) => !filterState.masterServicer || normalizeFilterValue(lead.masterservicer) === normalizeFilterValue(filterState.masterServicer);

  filteredLeads = leads.filter((lead) => matchesSearch(lead)
    && matchesStage(lead)
    && matchesDefeasanceStatus(lead)
    && matchesPrepayCategory(lead)
    && matchesMaturityRange(lead)
    && matchesState(lead)
    && matchesMasterServicer(lead));

  renderTable();
}

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

  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error || "Request failed");
    error.payload = data;
    throw error;
  }

  return data;
}

function renderTable() {
  leadCount.textContent = `${filteredLeads.length} leads`;

  if (!filteredLeads.length) {
    const hasActiveFilters = Object.values(filterState).some(Boolean);
    leadRows.innerHTML = `<tr><td colspan="10">${hasActiveFilters && activeSearchTerm ? "No leads match your search and selected filters." : hasActiveFilters ? "No leads match the selected filters." : "No leads match your search."}</td></tr>`;
    return;
  }

  leadRows.innerHTML = filteredLeads
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
      title: "Notes",
      items: [["Pipeline Stage", `<select id="drawerStage">${stages.map((stage) => `<option ${stage === lead.pipeline_stage ? "selected" : ""}>${stage}</option>`).join("")}</select>`], ["Notes", `<textarea id="drawerNotes">${lead.notes || ""}</textarea><br><button id="saveNote" class="btn btn-primary">Save Note</button>`], ["Salesforce Status", `${formatValue(lead.salesforceStatus)}`]],
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

  const lead = filteredLeads.find((item) => item.id === Number(row.dataset.id));
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
  filteredLeads = [...leads];
  initializePipelineFilters();
  stages = result.stages;
  treppFilterFields = metadata.fields;

  renderTable();
  addFilterRow();
  showView("campaigns");
}


function populateSelectOptions(selectEl, defaultLabel, options) {
  if (!selectEl) return;
  selectEl.innerHTML = "";
  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = defaultLabel;
  selectEl.appendChild(defaultOption);
  options.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

function initializePipelineFilters() {
  const stageOptions = getUniqueOptions(leads.map((lead) => lead.pipeline_stage));
  const defeasanceOptions = getUniqueOptions(leads.map((lead) => getReadableDefeasanceStatus(lead)));
  const prepayOptions = getUniqueOptions(leads.map((lead) => lead.prepaycategory));
  const stateOptions = getUniqueOptions(leads.map((lead) => lead.state));
  const servicerOptions = getUniqueOptions(leads.map((lead) => lead.masterservicer));

  populateSelectOptions(document.getElementById("stageFilter"), "All Stages", stageOptions);
  populateSelectOptions(document.getElementById("defeasanceStatusFilter"), "All Defeasance Statuses", defeasanceOptions);
  populateSelectOptions(document.getElementById("prepayCategoryFilter"), "All Prepay Categories", prepayOptions);
  populateSelectOptions(document.getElementById("maturityRangeFilter"), "All Maturity Ranges", MATURITY_OPTIONS.filter(Boolean));
  populateSelectOptions(document.getElementById("stateFilter"), "All States", stateOptions);
  populateSelectOptions(document.getElementById("masterServicerFilter"), "All Master Servicers", servicerOptions);

  Object.entries({
    stage: "stageFilter",
    defeasanceStatus: "defeasanceStatusFilter",
    prepayCategory: "prepayCategoryFilter",
    maturityRange: "maturityRangeFilter",
    state: "stateFilter",
    masterServicer: "masterServicerFilter",
  }).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (filterState[key] && !Array.from(el.options).some((option) => option.value === filterState[key])) {
      filterState[key] = "";
    }
    el.value = filterState[key] || "";
    el.onchange = (event) => {
      filterState[key] = event.target.value;
      updateFilterVisibility();
      applySearchAndRender();
    };
  });

  updateFilterVisibility();
}

function updateFilterVisibility() {
  const hasActiveFilters = Object.values(filterState).some(Boolean);
  clearFiltersButton?.classList.toggle("hidden", !hasActiveFilters);
  toggleFiltersButton.textContent = hasActiveFilters && !filtersExpanded ? "Filters (Active)" : "Filters";
}

clearFiltersButton?.addEventListener("click", () => {
  filterState = { stage: "", defeasanceStatus: "", prepayCategory: "", maturityRange: "", state: "", masterServicer: "" };
  initializePipelineFilters();
  applySearchAndRender();
});

toggleFiltersButton?.addEventListener("click", () => {
  filtersExpanded = !filtersExpanded;
  pipelineFilters?.classList.toggle("hidden", !filtersExpanded);
  updateFilterVisibility();
});

if (pipelineSearchInput) {
  pipelineSearchInput.addEventListener("input", (event) => {
    activeSearchTerm = event.target.value || "";
    if (searchDebounceTimer) {
      window.clearTimeout(searchDebounceTimer);
    }
    searchDebounceTimer = window.setTimeout(applySearchAndRender, SEARCH_DEBOUNCE_MS);
  });
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
  sidebarLinks.forEach((link) => link.classList.toggle("active", link.dataset.view === viewName));
  const showLeadDrawer = viewName === "pipeline";
  drawer.classList.toggle("hidden", !showLeadDrawer);
  layout.classList.toggle("lead-drawer-hidden", !showLeadDrawer);
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

  let result;
  try {
    result = await api("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({ campaign_name: name, description, filters, uploaded_ids }),
    });
  } catch (error) {
    campaignMessage.textContent = error?.payload?.error || "Campaign could not be created.";
    return;
  }

  campaignMessage.textContent = `Campaign "${result.campaign_name}" created successfully with ${result.record_count} records.`;
  document.getElementById("campaignName").value = "";
  document.getElementById("loanIdFile").value = "";
  await loadCampaigns();
});


bootstrap();
