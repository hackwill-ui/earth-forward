from flask import Flask, render_template, request, jsonify
from google import genai
from google.genai import types
import sqlite3
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
import requests

app = Flask(__name__)

# 🌱 ECO SCORE SYSTEM

# 🔒 ECO SCORE SYSTEM START

def calculate_eco_score(
    recyclability,
    compostability,
    environmental_risk,
    disposal_difficulty,
    special_handling
):

    # Keep AI-generated factors between 0 and 100
    recyclability = max(0, min(100, recyclability))
    compostability = max(0, min(100, compostability))
    environmental_risk = max(0, min(100, environmental_risk))
    disposal_difficulty = max(0, min(100, disposal_difficulty))

    # Special handling:
    # False = no special handling → better score
    # True = special handling required → lower score
    special_handling_score = 0 if special_handling else 100

   # Best end-of-life option:
    # An item can be recycled OR composted.
    end_of_life = max(recyclability, compostability)

    score = (
        end_of_life * 0.45
        + (100 - environmental_risk) * 0.30
        + (100 - disposal_difficulty) * 0.15
        + special_handling_score * 0.10
    )
    score = round(score)

    if score >= 85:
        level = "Excellent"
    elif score >= 70:
        level = "Very Good"
    elif score >= 50:
        level = "Moderate"
    elif score >= 30:
        level = "Needs Improvement"
    else:
        level = "Needs Special Care"

    return score, level

# 🔒 ECO SCORE SYSTEM END

client = genai.Client()


# ---------------- DATABASE ----------------

def init_db():

    conn = sqlite3.connect("earth_forward.db")

    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item TEXT NOT NULL,
            disposal TEXT,
            impact TEXT,
            eco_tip TEXT,
            created_at TEXT
        )
    """)

    conn.commit()
    conn.close()


# ---------------- HOME ----------------

@app.route("/")
def home():
    return render_template("index.html")


# ---------------- AI ANALYSIS ----------------

@app.route("/analyze", methods=["POST"])
def analyze():

    data = request.get_json()

    item = data.get("item", "").strip()

    if not item:
        return jsonify({
            "error": "Please enter an item."
        }), 400

    prompt = f"""
You are Earth Forward, an AI environmental assistant.

Analyze this waste item:

{item}

Return exactly these sections:

DISPOSAL:
Explain how this item should be disposed of safely.

ENVIRONMENTAL IMPACT:
Explain its environmental impact in simple language.

ECO TIP:
Give one practical eco-friendly tip.

SCORE_FACTORS:
recyclability: number from 0 to 100
compostability: number from 0 to 100
environmental_risk: number from 0 to 100
disposal_difficulty: number from 0 to 100
special_handling: true or false

SCORING GUIDELINES:

recyclability:
100 = highly recyclable
0 = not recyclable

compostability:
100 = easily compostable or biodegradable
0 = not compostable or biodegradable

environmental_risk:
100 = very harmful to the environment
0 = very low environmental risk

disposal_difficulty:
100 = very difficult or complicated to dispose of correctly
0 = very easy to dispose of correctly

special_handling:
true = requires special collection, hazardous-waste handling, or specialist disposal
false = normal recycling, composting, reuse, or regular disposal is appropriate

Keep the answer concise.

Do not invent nearby recycling locations.
"""

    try:

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
            config={
                "thinking_config": {
                    "thinking_level": "minimal"
                }
            }
        )

        answer = response.text

        # ---------------- SEPARATE AI RESPONSE ----------------

        disposal = answer.split("ENVIRONMENTAL IMPACT:")[0]

        remaining = answer.split(
            "ENVIRONMENTAL IMPACT:"
        )[1]

        impact = remaining.split("ECO TIP:")[0]

        eco_section = remaining.split("ECO TIP:")[1]

        eco_tip = eco_section.split("SCORE_FACTORS:")[0]


        disposal = disposal.replace(
            "DISPOSAL:",
            ""
        ).strip()

        impact = impact.strip()

        eco_tip = eco_tip.strip()


        # ---------------- EXTRACT SCORE FACTORS ----------------

        score_factors = answer.split(
            "SCORE_FACTORS:"
        )[1]

        import re


        def get_number(name):

            match = re.search(
                rf"{name}\s*:\s*(\d+)",
                score_factors,
                re.IGNORECASE
            )

            if match:
                return int(match.group(1))

            return 50
       

        recyclability = get_number(
            "recyclability"
        )

        # 🔒 COMPOSTABILITY EXTRACTION START
        compostability = get_number(
            "compostability"
        )
        # 🔒 COMPOSTABILITY EXTRACTION END

        environmental_risk = get_number(
            "environmental_risk"
        )

        disposal_difficulty = get_number(
            "disposal_difficulty"
        )

        special_match = re.search(
            r"special_handling\s*:\s*(true|false)",
            score_factors,
            re.IGNORECASE
        )

        special_handling = (
            special_match.group(1).lower() == "true"
            if special_match
            else False
        )


        # ---------------- CALCULATE ECO SCORE ----------------

        eco_score, eco_level = calculate_eco_score(
            recyclability,
            compostability,
            environmental_risk,
            disposal_difficulty,
            special_handling
        )
        # 🔒 ECO SCORE DEBUG START

        print("----- ECO SCORE DEBUG -----")
        print("Item:", item)
        print("Recyclability:", recyclability)
        print("Compostability:", compostability)
        print("Environmental Risk:", environmental_risk)
        print("Disposal Difficulty:", disposal_difficulty)
        print("Special Handling:", special_handling)
        print("Final Eco Score:", eco_score)
        print("Eco Level:", eco_level)
        print("--------------------------")

# 🔒 ECO SCORE DEBUG END


        # ---------------- SAVE TO DATABASE ----------------


        conn = sqlite3.connect("earth_forward.db")

        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO analyses
            (item, disposal, impact, eco_tip, created_at)
            VALUES (?, ?, ?, ?, ?)
        """, (
            item,
            disposal,
            impact,
            eco_tip,
            datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        ))

        conn.commit()
        conn.close()


        # ---------------- RETURN RESULT ----------------

        # 🔒 ECO SCORE FACTORS RESPONSE START

        return jsonify({
            "disposal": disposal,
            "impact": impact,
            "eco_tip": eco_tip,

            "eco_score": eco_score,
            "eco_level": eco_level,

            "recyclability": recyclability,
            "compostability": compostability,
            "environmental_risk": environmental_risk,
            "disposal_difficulty": disposal_difficulty,
            "special_handling": special_handling
        })

        # 🔒 ECO SCORE FACTORS RESPONSE END

    except Exception as e:

        print("Gemini Error:", e)

        return jsonify({
            "error": "AI service is currently unavailable."
        }), 500

    # ---------------- IMAGE IDENTIFICATION ----------------

@app.route("/identify-image", methods=["POST"])
def identify_image():

    if "image" not in request.files:
        return jsonify({
            "error": "No image uploaded."
        }), 400

    image = request.files["image"]

    if image.filename == "":
        return jsonify({
            "error": "Please select an image."
        }), 400

    try:

        image_bytes = image.read()

        prompt = """
You are Earth Forward, an AI waste identification assistant.

Look at this image and identify the main waste item.

Return ONLY the name of the item.
Do not give explanations.
Do not give multiple possibilities.

Examples:
plastic bottle
banana peel
glass bottle
battery
paper
plastic bag
"""

        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=image.content_type
                ),
                prompt
            ]
        )

        item = response.text.strip()

        print("📷 Identified item:", item)

        return jsonify({
            "item": item
        })

    except Exception as e:

        print("🔥 IMAGE ERROR:", repr(e))

        return jsonify({
            "error": str(e)
        }), 500



# ---------------- RECYCLING LOCATIONS ----------------


@app.route("/recycling", methods=["POST"])
def recycling():

    data = request.get_json()

    location = data.get("location", "").strip()

    if not location:
        return jsonify({
            "error": "Please enter a city or area."
        }), 400

    try:

        # ---------------- FIND COORDINATES ----------------

        geocode_url = "https://nominatim.openstreetmap.org/search"

        geocode_params = {
            "q": location,
            "format": "json",
            "limit": 1
        }

        headers = {
            "User-Agent": "EarthForward/1.0"
        }

        print("🔎 Geocoding location:", location)

        geocode_response = requests.get(
            geocode_url,
            params=geocode_params,
            headers=headers,
            timeout=10
        )

        geocode_response.raise_for_status()

        places = geocode_response.json()

        if not places:
            return jsonify({
                "error": f"Could not find {location}."
            }), 404

        latitude = float(places[0]["lat"])
        longitude = float(places[0]["lon"])

        print("✅ Geocoding successful:", latitude, longitude)


        # ---------------- SEARCH OPENSTREETMAP ----------------

        overpass_url = "https://overpass.private.coffee/api/interpreter"

        query = f"""
        [out:json][timeout:30];

        (
          nwr["amenity"="recycling"](around:25000,{latitude},{longitude});
          nwr["amenity"="waste_transfer_station"](around:25000,{latitude},{longitude});
          nwr["amenity"="waste_disposal"](around:25000,{latitude},{longitude});
          nwr["shop"="second_hand"](around:25000,{latitude},{longitude});
        );

        out center tags;
        """


        overpass_response = requests.post(
            overpass_url,
            data=query,
            headers=headers,
            timeout=40
        )

        print("✅ Overpass response received")

        overpass_response.raise_for_status()

        result = overpass_response.json()


        # ---------------- FORMAT RESULTS ----------------

        recycling_places = []


        def calculate_distance(lat1, lon1, lat2, lon2):

            earth_radius = 6371

            dlat = radians(lat2 - lat1)
            dlon = radians(lon2 - lon1)

            a = (
                sin(dlat / 2) ** 2
                + cos(radians(lat1))
                * cos(radians(lat2))
                * sin(dlon / 2) ** 2
            )

            c = 2 * atan2(
                sqrt(a),
                sqrt(1 - a)
            )

            return earth_radius * c


        for element in result.get("elements", []):

            tags = element.get("tags", {})

            name = tags.get(
                "name",
                "Recycling / Waste Facility"
            )


            address_parts = [
                tags.get("addr:housenumber", ""),
                tags.get("addr:street", ""),
                tags.get("addr:city", ""),
                tags.get("addr:postcode", "")
            ]

            address = ", ".join(
                part
                for part in address_parts
                if part
            )


            if element["type"] == "node":

                lat = element.get("lat")
                lon = element.get("lon")

            else:

                center = element.get("center", {})

                lat = center.get("lat")
                lon = center.get("lon")


            if lat is None or lon is None:
                continue


            distance = calculate_distance(
                latitude,
                longitude,
                float(lat),
                float(lon)
            )


            recycling_places.append({

                "name": name,

                "address":
                    address
                    if address
                    else "Address not available",

                "latitude": lat,

                "longitude": lon,

                "distance": round(distance, 2)

            })


        # ---------------- SORT BY DISTANCE ----------------

        recycling_places.sort(
            key=lambda place: place["distance"]
        )


        # Keep nearest 10 locations

        recycling_places = recycling_places[:10]


        # ---------------- RESPONSE ----------------

        return jsonify({

            "location": location,

            "latitude": latitude,

            "longitude": longitude,

            "places": recycling_places

        })


    except Exception as e:

        print("Recycling Search Error:", e)

        return jsonify({

            "error":
                "Could not find recycling locations right now."

        }), 500
# ---------------- START APP ----------------

# Initialize database when the application starts
init_db()

if __name__ == "__main__":
    app.run(debug=True)