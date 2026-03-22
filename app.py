from flask import Flask, render_template, request, jsonify
import os
import json
import time

# To be used when live path is connected
# import openai

app = Flask(__name__)

# ---------------------------------------------------------------------------
# Demo / fake data used when "demo mode" is active
# ---------------------------------------------------------------------------

DEMO_TEXT = """Heavy flooding has struck the Somerset Levels overnight, with the A361 between Taunton and Glastonbury reported as completely impassable due to standing water reaching up to one metre in places. Emergency services mounted a rescue operation in the early hours, recovering three people stranded on the roof of a vehicle near Burrowbridge. The Environment Agency has confirmed river levels on the River Parrett are at their highest since 2014. Approximately 40 properties in the Langport area are currently flooded and residents have been evacuated to a rest centre at Langport Town Hall. Somerset Council has declared a major incident. Power outages are affecting around 500 homes in the Bridgwater and Taunton areas. Network Rail has suspended services between Taunton and Castle Cary due to flooding of the track at Cogload Junction. [Source: BBC News, 18 March 2026]"""

DEMO_RELEVANCY = {
    "checks": [
        {
            "id": "hydro_flood",
            "label": "Real hydrological flooding",
            "result": True,
            "reasoning": "Text explicitly describes river flooding, standing water on roads, and Environment Agency river level data — clearly hydrological in nature."
        },
        {
            "id": "impact_info",
            "label": "Actual impact information",
            "result": True,
            "reasoning": "Multiple concrete impacts identified: A361 impassable, 3-person rescue, 40 properties flooded, 500 homes without power, rail line suspended."
        },
        {
            "id": "not_warning_rehash",
            "label": "New information (not rehashed warning)",
            "result": True,
            "reasoning": "While an EA statement is referenced, the article primarily reports observed impacts and emergency response actions — not just forecast warnings."
        },
        {
            "id": "recency",
            "label": "Recent impacts (within 2 days)",
            "result": True,
            "reasoning": "Article dateline is 18 March 2026, consistent with current date. Events described as occurring overnight and in the early hours."
        }
    ],
    "overall": True,
    "summary": "Text is relevant. Hydrological flooding with confirmed impacts, rescue operations, and current recency."
}

DEMO_EXTRACTION = {
    "source_id": "BBC-20260318-001",
    "source_quality": "High",
    "source_label": "BBC News",
    "geojson": {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "id": "IMP-001",
                "geometry": {"type": "Point", "coordinates": [-2.924, 51.108]},
                "properties": {
                    "impact_id": "IMP-001",
                    "source_id": "BBC-20260318-001",
                    "location_name": "A361, near Burrowbridge, Somerset",
                    "location_resolution": "Road segment",
                    "impact_type": "Road closure",
                    "impact_description": "A361 between Taunton and Glastonbury completely impassable. Water depth up to 1 metre.",
                    "impact_category": "Transport"
                }
            },
            {
                "type": "Feature",
                "id": "IMP-002",
                "geometry": {"type": "Point", "coordinates": [-2.924, 51.108]},
                "properties": {
                    "impact_id": "IMP-002",
                    "source_id": "BBC-20260318-001",
                    "location_name": "Burrowbridge, Somerset",
                    "location_resolution": "Village",
                    "impact_type": "Search and rescue",
                    "impact_description": "Emergency services rescued 3 people stranded on roof of vehicle.",
                    "impact_category": "Communities"
                }
            },
            {
                "type": "Feature",
                "id": "IMP-003",
                "geometry": {"type": "Point", "coordinates": [-2.828, 51.044]},
                "properties": {
                    "impact_id": "IMP-003",
                    "source_id": "BBC-20260318-001",
                    "location_name": "Langport, Somerset",
                    "location_resolution": "Town",
                    "impact_type": "Property flooding & evacuation",
                    "impact_description": "~40 properties flooded. Residents evacuated to rest centre at Langport Town Hall.",
                    "impact_category": "Communities"
                }
            },
            {
                "type": "Feature",
                "id": "IMP-004",
                "geometry": {"type": "Point", "coordinates": [-3.1, 51.13]},
                "properties": {
                    "impact_id": "IMP-004",
                    "source_id": "BBC-20260318-001",
                    "location_name": "Bridgwater and Taunton area, Somerset",
                    "location_resolution": "District",
                    "impact_type": "Power outage",
                    "impact_description": "~500 homes without power due to flooding-related infrastructure disruption.",
                    "impact_category": "Utilities"
                }
            },
            {
                "type": "Feature",
                "id": "IMP-005",
                "geometry": {"type": "Point", "coordinates": [-3.063, 51.032]},
                "properties": {
                    "impact_id": "IMP-005",
                    "source_id": "BBC-20260318-001",
                    "location_name": "Cogload Junction, Somerset",
                    "location_resolution": "Rail junction",
                    "impact_type": "Rail suspension",
                    "impact_description": "Network Rail suspended services Taunton–Castle Cary due to track flooding at Cogload Junction.",
                    "impact_category": "Transport"
                }
            }
        ]
    }
}

DEMO_SEVERITY = {
    "assessments": [
        {
            "impact_id": "IMP-001",
            "location": "A361, near Burrowbridge",
            "category": "Transport",
            "description": "A361 completely impassable, 1m water depth",
            "severity": "Significant",
            "severity_level": 3,
            "rationale": "Widespread or long duration disruption to travel with route closures. Major arterial road fully closed."
        },
        {
            "impact_id": "IMP-002",
            "location": "Burrowbridge",
            "category": "Communities / Risk to Life",
            "description": "3-person rescue from stranded vehicle roof",
            "severity": "Significant",
            "severity_level": 3,
            "rationale": "Danger to life from fast-flowing/deep water. Active rescue operation required."
        },
        {
            "impact_id": "IMP-003",
            "location": "Langport",
            "category": "Communities",
            "description": "~40 properties flooded, evacuation underway",
            "severity": "Severe",
            "severity_level": 4,
            "rationale": "Flooding affecting large numbers of properties with evacuation. Major incident declared."
        },
        {
            "impact_id": "IMP-004",
            "location": "Bridgwater & Taunton",
            "category": "Utilities",
            "description": "~500 homes without power",
            "severity": "Significant",
            "severity_level": 3,
            "rationale": "Disruption to utilities and services affecting multiple communities."
        },
        {
            "impact_id": "IMP-005",
            "location": "Cogload Junction",
            "category": "Transport",
            "description": "Taunton–Castle Cary rail line suspended",
            "severity": "Significant",
            "severity_level": 3,
            "rationale": "Long duration disruption to travel. Rail route closure affecting inter-regional connectivity."
        }
    ],
    "overall_severity": "Severe",
    "confidence": {
        "rating": "High",
        "score": 85,
        "rationale": "Source is BBC News — a high-quality, professionally edited national outlet. Direct reporting of observed impacts with named locations and specific figures. No significant vagueness or unverified claims."
    },
    "consensus": {
        "judges": [
            {
                "model": "GPT-5.3",
                "severity": "Severe",
                "confidence": 88,
                "notes": "Multiple concurrent impacts including property flooding, rescue operations, and utility failures strongly indicate Severe classification."
            },
            {
                "model": "Claude Opus 4.6",
                "severity": "Severe",
                "confidence": 91,
                "notes": "Declared major incident with evacuations, widespread power loss and transport disruption aligns clearly with Severe threshold."
            },
            {
                "model": "Gemini 3.1 Pro",
                "severity": "Severe",
                "confidence": 84,
                "notes": "Scale of property flooding and multi-sector disruption exceeds Significant. Agree with Severe given evacuation scale."
            }
        ],
        "agreement": "Unanimous",
        "final_severity": "Severe",
        "summary": "All three judges independently assessed the overall impact as Severe with high confidence. No disagreement on classification."
    }
}

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/demo/relevancy', methods=['POST'])
def api_demo_relevancy():
    """Return pre-baked demo relevancy result with a short artificial delay."""
    time.sleep(0.3)
    return jsonify(DEMO_RELEVANCY)


@app.route('/api/demo/extraction', methods=['POST'])
def api_demo_extraction():
    """Return pre-baked demo extraction result."""
    time.sleep(0.3)
    return jsonify(DEMO_EXTRACTION)


@app.route('/api/demo/severity', methods=['POST'])
def api_demo_severity():
    """Return pre-baked demo severity assessment."""
    time.sleep(0.3)
    return jsonify(DEMO_SEVERITY)


@app.route('/api/live/relevancy', methods=['POST'])
def api_live_relevancy():
    """Placeholder for live OpenAI relevancy check."""
    # TODO: hook up to OpenAI
    return jsonify({"error": "Live path not yet connected to API."}), 501


@app.route('/api/live/extraction', methods=['POST'])
def api_live_extraction():
    return jsonify({"error": "Live path not yet connected to API."}), 501


@app.route('/api/live/severity', methods=['POST'])
def api_live_severity():
    return jsonify({"error": "Live path not yet connected to API."}), 501


if __name__ == '__main__':
    app.run(debug=True, port=8000)
