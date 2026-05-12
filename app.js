const stages = ["New", "Researching", "Contact Identified", "Outreach Started", "Engaged", "Needs Follow-Up", "Not a Fit", "Qualified"];
const leads = [
  { id: 1, pipeline_stage: "New", notes: "", loanname: "JPMC 2014-C8", propname: "Riverside Plaza", origborrowername: "Terreno Realty", guarantor: "Terreno Realty", maturitydt: "2029-04-15", defeasstatus: "Not Defeased", defeasstatnx: "N/A", prepaycategory: "None", prepaydesc: "None", curloanbal: "$24,850,000", secloanbal: "$24,200,000", coupontype: "Fixed", currentnoterate: "5.12%", state: "CA", city: "San Diego", masterservicer: "Wells", originator: "JPMC", poolnum: "C8", originationdt: "2014-02-01", curcpn: "5.25", loanpurpose: "Acquisition", bloombergname: "Terreno", affiliatedsponsors: "N/A", proptypecode: "OF", proptypenorm: "Office", propertysubtype: "CBD", address: "100 Main St", county: "San Diego", zip: "92101", msaname: "San Diego", submarket: "Downtown", salesforceStatus: "Not Synced", lastSyncedAt: "", salesforceId: "" },
  { id: 2, pipeline_stage: "Qualified", notes: "Ready to sync", loanname: "WELLS 2014-C7", propname: "Parkview Office Tower", origborrowername: "Brookfield", guarantor: "Brookfield", maturitydt: "2028-07-01", defeasstatus: "Not Defeased", defeasstatnx: "Likely", prepaycategory: "Refinance", prepaydesc: "Upcoming refinance", curloanbal: "$41,650,000", secloanbal: "$41,200,000", coupontype: "Fixed", currentnoterate: "4.9%", state: "NY", city: "New York", masterservicer: "KeyBank", originator: "Wells Fargo", poolnum: "C7", originationdt: "2014-05-22", curcpn: "4.95", loanpurpose: "Refinance", bloombergname: "Brookfield", affiliatedsponsors: "Brookfield AM", proptypecode: "OF", proptypenorm: "Office", propertysubtype: "Class A", address: "22 Park Ave", county: "New York", zip: "10016", msaname: "NYC", submarket: "Midtown", salesforceStatus: "Synced", lastSyncedAt: "2026-05-12 09:14", salesforceId: "SF-0002983" }
];

const leadRows = document.getElementById("leadRows");
const drawerBody = document.getElementById("drawerBody");
const syncModal = document.getElementById("syncModal");

function statusPill(status) {
  if (status === "Synced") return '<span class="pill pill-qualified">SYNCED</span>';
  if (status === "Error") return '<span class="pill pill-error">SYNC ERROR</span>';
  return '<span class="pill pill-sync">NOT SYNCED</span>';
}

function renderTable() {
  leadRows.innerHTML = leads.map((l) => `
    <tr data-id="${l.id}">
      <td><input type="checkbox"></td>
      <td><select class="stage-select" data-id="${l.id}">${stages.map(s => `<option ${s===l.pipeline_stage ? 'selected':''}>${s}</option>`).join('')}</select></td>
      <td><a href="#" class="open-drawer" data-id="${l.id}">View</a></td>
      <td>${l.loanname}</td><td>${l.propname}</td><td>${l.origborrowername}</td><td>${l.guarantor}</td><td>${l.maturitydt}</td>
      <td>${l.defeasstatus}</td><td>${l.defeasstatnx}</td><td>${l.prepaycategory}</td><td>${l.prepaydesc}</td><td>${l.curloanbal}</td>
      <td>${l.secloanbal}</td><td>${l.coupontype}</td><td>${l.currentnoterate}</td><td>${l.state}</td><td>${l.city}</td><td>${l.masterservicer}</td><td>${l.originator}</td>
      <td>${statusPill(l.salesforceStatus)}</td><td>${l.lastSyncedAt || '-'}</td><td>${l.salesforceId ? `<a href="#">${l.salesforceId}</a>` : '-'}</td>
    </tr>`).join('');
}

function renderDrawer(lead) {
  drawerBody.innerHTML = `
    <h3>Pipeline Stage</h3>
    <select id="drawerStage">${stages.map(s => `<option ${s===lead.pipeline_stage ? 'selected':''}>${s}</option>`).join('')}</select>
    <h3>Notes</h3><textarea id="drawerNotes">${lead.notes || ''}</textarea><br><button id="saveNote" class="btn btn-primary">Save Note</button>
    <h3>Salesforce</h3><div class="field">Status: ${lead.salesforceStatus}</div><button id="pushOne" class="btn btn-primary">Push to Salesforce</button>
    <h3>Loan Information</h3><div class="field">Loan Name: ${lead.loanname}</div><div class="field">Pool Number: ${lead.poolnum}</div><div class="field">Origination Date: ${lead.originationdt}</div><div class="field">Maturity Date: ${lead.maturitydt}</div><div class="field">Current Coupon: ${lead.curcpn}</div><div class="field">Current Note Rate: ${lead.currentnoterate}</div><div class="field">Coupon Type: ${lead.coupontype}</div><div class="field">Loan Purpose: ${lead.loanpurpose}</div>
    <h3>Balances</h3><div class="field">Securities Loan Balance: ${lead.secloanbal}</div><div class="field">Current Loan Balance: ${lead.curloanbal}</div>
    <h3>Defeasance / Prepay</h3><div class="field">Defeasance Status: ${lead.defeasstatus}</div><div class="field">Defeasance Status Next: ${lead.defeasstatnx}</div><div class="field">Prepay Category: ${lead.prepaycategory}</div><div class="field">Prepay Description: ${lead.prepaydesc}</div>
    <h3>Borrower / Sponsor</h3><div class="field">Original Borrower Name: ${lead.origborrowername}</div><div class="field">Guarantor: ${lead.guarantor}</div><div class="field">Bloomberg Name: ${lead.bloombergname}</div><div class="field">Affiliated Sponsors: ${lead.affiliatedsponsors}</div>
    <h3>Property</h3><div class="field">Property Name: ${lead.propname}</div><div class="field">Property Type Code: ${lead.proptypecode}</div><div class="field">Property Type Normalized: ${lead.proptypenorm}</div><div class="field">Property Subtype: ${lead.propertysubtype}</div><div class="field">Address: ${lead.address}</div><div class="field">City: ${lead.city}</div><div class="field">County: ${lead.county}</div><div class="field">State: ${lead.state}</div><div class="field">Zip: ${lead.zip}</div><div class="field">MSA Name: ${lead.msaname}</div><div class="field">Submarket: ${lead.submarket}</div>
    <h3>Servicing</h3><div class="field">Master Servicer: ${lead.masterservicer}</div><div class="field">Originator: ${lead.originator}</div>
  `;

  document.getElementById("saveNote").onclick = () => { lead.notes = document.getElementById("drawerNotes").value; renderTable(); };
  document.getElementById("drawerStage").onchange = (e) => { lead.pipeline_stage = e.target.value; renderTable(); };
  document.getElementById("pushOne").onclick = () => syncLeads([lead]);
}

function syncLeads(records) {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 16);
  records.forEach((l) => {
    l.salesforceStatus = "Synced";
    l.lastSyncedAt = now;
    l.salesforceId = l.salesforceId || `SF-${String(100000 + l.id)}`;
  });
  renderTable();
}

leadRows.addEventListener("click", (e) => {
  const row = e.target.closest("tr");
  if (!row) return;
  const lead = leads.find(l => l.id === Number(row.dataset.id));
  if (!lead) return;
  renderDrawer(lead);
});

leadRows.addEventListener("change", (e) => {
  if (!e.target.classList.contains("stage-select")) return;
  const lead = leads.find(l => l.id === Number(e.target.dataset.id));
  if (lead) lead.pipeline_stage = e.target.value;
});

document.getElementById("syncQualified").onclick = () => {
  const qualified = leads.filter(l => l.pipeline_stage === "Qualified");
  document.getElementById("syncMessage").textContent = `You are about to sync ${qualified.length} qualified leads to Salesforce.`;
  syncModal.showModal();
  document.getElementById("confirmSync").onclick = () => { syncLeads(qualified); syncModal.close(); };
};
document.getElementById("cancelSync").onclick = () => syncModal.close();

renderTable();
