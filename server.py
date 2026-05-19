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


def lead_by_id(lead_id: int):
    return next((lead for lead in LEADS if lead["id"] == lead_id), None)


@app.get("/")
def index():
    return render_template("index.html", stages=STAGES)


@app.get("/api/leads")
def get_leads():
    return jsonify({"leads": LEADS, "stages": STAGES})


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


if __name__ == "__main__":
    app.run(debug=True)
