from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

STAGES = [
    "New",
    "Outreach Started",
    "Follow-Up",
    "Not a Fit",
    "Qualified",
]

LEADS = [
    {"id": 1, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "468500055", "guarantor": "10th Street LLC", "loanname": "Enterprise Center - VA", "defeasstatus": "N", "address": "15100 and 15120 Enterprise Court, Chantilly, VA 20151", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 2, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "474300049", "guarantor": "10th Street LLC", "loanname": "Wells Fargo at Stonehall Bethesda", "defeasstatus": "N", "address": "8302 Woodmont Avenue, Bethesda, MD 20814", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 3, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "489500041", "guarantor": "10th Street LLC", "loanname": "Fort Evans Plaza Office Buildings", "defeasstatus": "N", "address": "540 and 552 Fort Evans Road Northeast, Leesburg, VA 20176", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 4, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "489500043", "guarantor": "10th Street LLC", "loanname": "CubeSmart -Leesburg", "defeasstatus": "N", "address": "1601 Battlefield Parkway, NE, Leesburg, VA 20176", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 5, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "506700042", "guarantor": "10th Street LLC", "loanname": "50 Catoctin Circle", "defeasstatus": "N", "address": "50 Catoctin Circle Northeast, Leesburg, VA 20176", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 6, "pipeline_stage": "Qualified", "notes": "", "trepploanid": "520300043", "guarantor": "10th Street LLC", "loanname": "Reston Business Campus", "defeasstatus": "N", "address": "12320, 12330, 12340, 12350 Pinecrest Road, Reston, VA 20191", "salesforceStatus": "Synced", "lastSyncedAt": "5/19/26", "salesforceId": "SF-0002983"},
    {"id": 7, "pipeline_stage": "New", "notes": "", "trepploanid": "562500055", "guarantor": "10th Street LLC", "loanname": "Walgreens - Laurel", "defeasstatus": "N", "address": "600 Washington Boulevard, Laurel, MD 20707", "salesforceStatus": "Not Synced", "lastSyncedAt": "", "salesforceId": ""},
    {"id": 8, "pipeline_stage": "New", "notes": "", "trepploanid": "681500218", "guarantor": "1260 Housing Development Corporation", "loanname": "The Lewis", "defeasstatus": "N", "address": "2901 Toles Park Drive, Suitland, MD 20746", "salesforceStatus": "Not Synced", "lastSyncedAt": "", "salesforceId": ""},
    {"id": 9, "pipeline_stage": "New", "notes": "", "trepploanid": "735300241", "guarantor": "1260 Housing Development Corporation", "loanname": "420 Aisquith Apartments", "defeasstatus": "N", "address": "420 Aisquith Street, Baltimore, MD 21202", "salesforceStatus": "Not Synced", "lastSyncedAt": "", "salesforceId": ""},
    {"id": 10, "pipeline_stage": "New", "notes": "", "trepploanid": "394000064", "guarantor": "1700 LLC", "loanname": "Belle Chasse Self Storage", "defeasstatus": "F", "address": "9526 & 9541 Louisiana Highway 23, Belle Chasse, LA 70037", "salesforceStatus": "Not Synced", "lastSyncedAt": "", "salesforceId": ""},
]

SYNC_LOGS = [
    {"record_identifier": "468500055", "record_name": "Enterprise Center - VA", "object_type": "Lead", "operation": "Upsert", "status": "Success", "synced_at": "2026-05-19 14:22", "triggered_by": "Qualified Lead Sync", "salesforce_record_id": "00Q8b0000AAA101", "message": "Lead synced successfully.", "lead_id": 1, "campaign": "Mid-Atlantic Office"},
    {"record_identifier": "474300049", "record_name": "Wells Fargo at Stonehall Bethesda", "object_type": "Lead", "operation": "Update", "status": "Failed", "synced_at": "2026-05-19 14:23", "triggered_by": "Qualified Lead Sync", "salesforce_record_id": "00Q8b0000AAA102", "message": "Validation error: missing state.", "lead_id": 2, "campaign": "Mid-Atlantic Office"},
    {"record_identifier": "489500041", "record_name": "Fort Evans Plaza Office Buildings", "object_type": "Campaign Member", "operation": "Insert", "status": "Pending", "synced_at": "2026-05-19 14:24", "triggered_by": "Nightly Sync Job", "salesforce_record_id": "", "message": "Queued for retry.", "lead_id": 3, "campaign": "Leesburg Portfolio"},
]

TREPP_FIELDS = """ua.masterloanidtrepp
ua.guarantor
ua.loanname
ua.defeasstatus
complete_address
ua.origborrowername
ua.bloombergname
ua.maturitydt
ua.originationdt
ua.curcpn
ua.currentnoterate
ua.secloanbal
ua.curloanbal
ua.poolnum
ua.masterservicer
ua.originator
ua.prepaydesc
ua.coupontype
ua.affiliatedsponsors
ua.loanpurpose
ua.defeasstatnx
ua.prepaycategory
ua.propname
ua.proptypecode
ua.proptypenorm
ua.propertysubtype
ua.address
ua.city
ua.county
ua.state
ua.zip
ua.msaname
ua.submarket
ua.numprops
ua.ismultiproperty
ua.notename
ua.derivedloanstatus
ua.watchliststatus
ua.loanpurposeraw
ua.maturitymodeldt
ua.modelfirstopendt
ua.derivedmaturitydt
ua.loanprepayenddt
ua.msa
ua.amortterm
ua.curamorttype
ua.curmonlock
ua.curmonpp
ua.curmonymc
ua.daycountmethod
ua.ioperiods
ua.origterm
ua.remterm
ua.defeasableremaintofirst
ua.dlqtot12mons
ua.impliedcapratesecnoi
ua.impliedcapratesecncf
ua.revenues
ua.priorrevenue
ua.prior2revenue
ua.uweffectivegrossincome
ua.expenses
ua.prioropexpense
ua.prior2opexpense
ua.uwtotalopexpense
ua.secnoidscr
ua.curdscr
ua.noidscr
ua.secncfdscr
ua.curnoidebtyield
ua.secdebtyieldnoinew
ua.curncfdebtyield
ua.secdebtyieldncfnew
ua.estdefeasance
ua.ncfdscr
ua.dscrasof
ua.noiasof
ua.mrnoi
ua.noi
ua.priornoi
ua.prior2noi
ua.uwnoi
ua.ncfasof
ua.mrncf
ua.ncf
ua.priorncf
ua.prior2ncf
ua.uwncf
ua.curltv
ua.secltv
ua.occrate
ua.priorphyoccupancy
ua.prior2phyoccupancy
ua.secoccupancyrate
ua.mrphysicaloccupancy
ua.physicaloccupancypct
ua.realestatetaxes
ua.curnetcpn
ua.benchmarktsyindex
ua.benchmarktsyrate
ua.estimatedspreadtotsy
ua.benchmarkswapindex
ua.benchmarkswaprate
ua.estimatedspreadtoswap
ua.estimatedswapratepct
ua.originterestrate
ua.secltvasis
ua.secncfdscrasis
ua.datasource""".splitlines()

DATE_FIELD_HINTS = ("dt", "asof")
NUMERIC_FIELD_HINTS = ("rate", "bal", "term", "dscr", "ltv", "noi", "ncf", "yield", "revenue", "expense", "num", "taxes", "spread", "occupancy", "cpn")


def lead_by_id(lead_id: int):
    return next((lead for lead in LEADS if lead["id"] == lead_id), None)


@app.get("/")
def index():
    return render_template("index.html", stages=STAGES)


@app.get("/api/leads")
def get_leads():
    return jsonify({"leads": LEADS, "stages": STAGES})


@app.get("/api/campaign-metadata")
def campaign_metadata():
    fields = []
    for field in TREPP_FIELDS:
        if field == "ua.ismultiproperty":
            field_type = "boolean"
        elif any(hint in field for hint in DATE_FIELD_HINTS):
            field_type = "date"
        elif any(hint in field for hint in NUMERIC_FIELD_HINTS):
            field_type = "number"
        else:
            field_type = "text"
        fields.append({"key": field, "type": field_type})
    return jsonify({"fields": fields})


def matches_filter(lead: dict, filter_item: dict):
    raw_field = filter_item.get("field", "")
    field = raw_field.replace("ua.", "")
    operator = filter_item.get("operator", "equals")
    filter_value = str(filter_item.get("value", "")).strip()
    lead_value = str(lead.get(field, "")).strip()
    if not filter_value:
        return True
    if operator == "contains":
        return filter_value.lower() in lead_value.lower()
    if operator in ("gt", "lt"):
        try:
            left = float(lead_value)
            right = float(filter_value)
            return left > right if operator == "gt" else left < right
        except ValueError:
            return False
    return lead_value.lower() == filter_value.lower()


@app.post("/api/campaigns")
def create_campaign():
    payload = request.get_json(silent=True) or {}
    campaign_name = (payload.get("campaign_name") or "").strip()
    filters = payload.get("filters") or []
    uploaded_ids = payload.get("uploaded_ids") or []

    if not campaign_name:
        return jsonify({"error": "Campaign name is required."}), 400
    if not filters and not uploaded_ids:
        return jsonify({"error": "Apply filters or upload Trepp Master Loan IDs before creating a campaign."}), 400

    filter_matches = []
    if filters:
        filter_matches = [lead for lead in LEADS if all(matches_filter(lead, item) for item in filters)]
    id_matches = []
    if uploaded_ids:
        normalized = {str(value).strip() for value in uploaded_ids if str(value).strip()}
        if not normalized:
            return jsonify({"error": "Upload must include usable Trepp Master Loan IDs and is used only to match existing records."}), 400
        id_matches = [lead for lead in LEADS if lead.get("trepploanid") in normalized]

    if filters and uploaded_ids:
        match_ids = {lead["id"] for lead in filter_matches} | {lead["id"] for lead in id_matches}
    else:
        match_ids = {lead["id"] for lead in (filter_matches or id_matches)}

    if not match_ids:
        return jsonify({"error": "No matching existing Trepp records were found. Adjust filters or upload corrected IDs."}), 404

    return jsonify({"campaign_name": campaign_name, "record_count": len(match_ids), "lead_ids": sorted(match_ids)})


@app.patch("/api/leads/<int:lead_id>")
def update_lead(lead_id: int):
    lead = lead_by_id(lead_id)
    if lead is None:
        return jsonify({"error": "Lead not found"}), 404

    payload = request.get_json(silent=True) or {}
    if "pipeline_stage" in payload and payload["pipeline_stage"] in STAGES:
        lead["pipeline_stage"] = payload["pipeline_stage"]
    if "notes" in payload:
        lead["notes"] = payload["notes"]
    return jsonify({"lead": lead})


@app.post("/api/sync-qualified")
def sync_qualified():
    qualified = [lead for lead in LEADS if lead["pipeline_stage"] == "Qualified"]
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    for lead in qualified:
        lead["salesforceStatus"] = "Synced"
        lead["lastSyncedAt"] = now
        if not lead["salesforceId"]:
            lead["salesforceId"] = f"SF-{100000 + lead['id']}"
    return jsonify({"synced_count": len(qualified), "leads": LEADS})


@app.get("/api/salesforce-sync-log")
def salesforce_sync_log():
    return jsonify({"entries": SYNC_LOGS})


if __name__ == "__main__":
    app.run(debug=True)
