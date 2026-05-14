from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

STAGES = [
    "New",
    "Researching",
    "Contact Identified",
    "Outreach Started",
    "Engaged",
    "Needs Follow-Up",
    "Not a Fit",
    "Qualified",
]

LEADS = [
    {
        "id": 1,
        "pipeline_stage": "New",
        "notes": "",
        "loanname": "JPMC 2014-C8",
        "propname": "Riverside Plaza",
        "origborrowername": "Terreno Realty",
        "guarantor": "Terreno Realty",
        "maturitydt": "2029-04-15",
        "defeasstatus": "Not Defeased",
        "defeasstatnx": "N/A",
        "prepaycategory": "None",
        "prepaydesc": "None",
        "curloanbal": "$24,850,000",
        "secloanbal": "$24,200,000",
        "coupontype": "Fixed",
        "currentnoterate": "5.12%",
        "state": "CA",
        "city": "San Diego",
        "masterservicer": "Wells",
        "originator": "JPMC",
        "poolnum": "C8",
        "originationdt": "2014-02-01",
        "curcpn": "5.25",
        "loanpurpose": "Acquisition",
        "bloombergname": "Terreno",
        "affiliatedsponsors": "N/A",
        "proptypecode": "OF",
        "proptypenorm": "Office",
        "propertysubtype": "CBD",
        "address": "100 Main St",
        "county": "San Diego",
        "zip": "92101",
        "msaname": "San Diego",
        "submarket": "Downtown",
        "salesforceStatus": "Not Synced",
        "lastSyncedAt": "",
        "salesforceId": "",
    },
    {
        "id": 2,
        "pipeline_stage": "Qualified",
        "notes": "Ready to sync",
        "loanname": "WELLS 2014-C7",
        "propname": "Parkview Office Tower",
        "origborrowername": "Brookfield",
        "guarantor": "Brookfield",
        "maturitydt": "2028-07-01",
        "defeasstatus": "Not Defeased",
        "defeasstatnx": "Likely",
        "prepaycategory": "Refinance",
        "prepaydesc": "Upcoming refinance",
        "curloanbal": "$41,650,000",
        "secloanbal": "$41,200,000",
        "coupontype": "Fixed",
        "currentnoterate": "4.9%",
        "state": "NY",
        "city": "New York",
        "masterservicer": "KeyBank",
        "originator": "Wells Fargo",
        "poolnum": "C7",
        "originationdt": "2014-05-22",
        "curcpn": "4.95",
        "loanpurpose": "Refinance",
        "bloombergname": "Brookfield",
        "affiliatedsponsors": "Brookfield AM",
        "proptypecode": "OF",
        "proptypenorm": "Office",
        "propertysubtype": "Class A",
        "address": "22 Park Ave",
        "county": "New York",
        "zip": "10016",
        "msaname": "NYC",
        "submarket": "Midtown",
        "salesforceStatus": "Synced",
        "lastSyncedAt": "2026-05-12 09:14",
        "salesforceId": "SF-0002983",
    },
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
