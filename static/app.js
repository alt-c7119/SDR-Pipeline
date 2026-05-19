let stages = [];
let leads = [];

const leadRows = document.getElementById("leadRows");
const drawerBody = document.getElementById("drawerBody");
const syncModal = document.getElementById("syncModal");
const leadCount = document.getElementById("leadCount");
const drawer = document.getElementById("drawer");
const drawerToggle = document.getElementById("drawerToggle");
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
          <td>${lead.trepploanid}</td>
          <td>${lead.guarantor}</td>
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

  leads = result.leads;
  stages = result.stages;

  renderTable();
}

bootstrap();
