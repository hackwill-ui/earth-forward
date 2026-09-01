async function analyzeItem() {

    const item =
        document.getElementById("itemInput").value.trim();

    const image =
        document.getElementById("wasteImage").files[0];

    // 📷 If an image is selected, identify it first
    if (image && item === "") {
        await identifyWasteImage();
        return;
    }

    if (item === "") {
        alert("Please enter an item first!");
        return;
    }

    const loading = document.getElementById("loading");

    loading.innerText = "Analyzing with AI... 🤖🌱";

    try {

        const response = await fetch("/analyze", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                item: item
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        document.getElementById("disposal").innerText =
            data.disposal;

        document.getElementById("impact").innerText =
            data.impact;

        document.getElementById("ecoTip").innerText =
            data.eco_tip;
        // 🌱 Display Eco Score

        // 🔒 ECO SCORE VALUE FIX START

        document.getElementById("ecoScore").innerText =
            data.eco_score;

// 🔒 ECO SCORE VALUE FIX END

        document.getElementById("ecoLevel").innerText =
            data.eco_level;

        document.getElementById("ecoProgress").style.width =
            `${data.eco_score}%`;

        updateEcoScoreStyle(data.eco_score);
        // 🔒 ECO SCORE FACTORS DISPLAY START

const ecoInfo = document.getElementById("ecoInfo");

ecoInfo.innerHTML = `
    <strong>Why did I get this score?</strong>

    <ul>
    <li>
        ♻️ <b>Recyclability:</b>
        ${data.recyclability}/100
        <br>
        <small>How easily this item can be recycled.</small>
    </li>

    <li>
        🌱 <b>Compostability:</b>
        ${data.compostability}/100
        <br>
        <small>How easily this item can be composted or biodegraded.</small>
    </li>

    <li>
        🌍 <b>Environmental risk:</b>
        ${data.environmental_risk}/100
        <br>
        <small>Higher means greater environmental harm.</small>
    </li>

    <li>
        🗑️ <b>Disposal difficulty:</b>
        ${data.disposal_difficulty}/100
        <br>
        <small>Higher means more difficult to dispose of correctly.</small>
    </li>

    <li>
        ⚠️ <b>Special handling:</b>
        ${data.special_handling ? "Required" : "Not required"}
        <br>
        <small>Whether special collection or treatment is needed.</small>
    </li>
</ul>

<small>
    💡 The final Eco Score combines all five factors.
</small>
`;

// 🔒 ECO SCORE FACTORS DISPLAY END

        loading.innerText = "Analysis complete! 🌍♻️";

    }

    catch (error) {

        console.error(error);

        loading.innerText =
            "Something went wrong. Please try again.";

        alert(error.message);
    }
}
async function findRecycling() {

    const status =
        document.getElementById("locationStatus");

    status.innerText =
        "Finding your location... 📍";

    if (!navigator.geolocation) {
        status.innerText =
            "❌ Your browser does not support location.";
        return;
    }

    navigator.geolocation.getCurrentPosition(

        async function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            status.innerText =
                "📍 Location found! Finding recycling options...";

            try {

                // Reverse geocode coordinates into a location name
                const geocodeResponse = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
                );

                const geocodeData =
                    await geocodeResponse.json();

                const location =
                    geocodeData.display_name ||
                    `${latitude}, ${longitude}`;

                // Ask our Flask backend for recycling places
                const response = await fetch("/recycling", {

                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        location: location
                    })
                });

                const data =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Could not find recycling locations."
                    );
                }

                displayRecyclingResults(data, location);

            }

            catch (error) {

                console.error(error);

                status.innerText =
                    "❌ " + error.message;
            }
        },

        function (error) {

            console.log("Location error:", error);

            if (error.code === 1) {

                status.innerText =
                    "❌ Location permission denied.";

            } else if (error.code === 2) {

                status.innerText =
                    "⚠️ Couldn't determine your location.";

            } else if (error.code === 3) {

                status.innerText =
                    "⚠️ Location request timed out. Please try again.";

            } else {

                status.innerText =
                    "❌ Unable to determine your location.";
            }
        },

        {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
        }
    );
}
function displayRecyclingResults(data, location) {

    const status =
        document.getElementById("locationStatus");

    const map =
    document.getElementById("map");

    const recyclingResults =
        document.getElementById("recyclingResults");

recyclingResults.innerHTML = "";

    status.innerText =
        `♻️ Found ${data.places.length} recycling options near you.`;

    // Remove old map
    if (window.earthMap) {
        window.earthMap.remove();
    }

    // Clear old content
    map.innerHTML = "";

    // Create map
    window.earthMap = L.map("map").setView(
        [data.latitude, data.longitude],
        12
    );

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution:
                "&copy; OpenStreetMap contributors"
        }
    ).addTo(window.earthMap);


    // User location
    L.marker([
        data.latitude,
        data.longitude
    ])
        .addTo(window.earthMap)
        .bindPopup(
            "<b>📍 Your Location</b>"
        )
        .openPopup();


    // Recycling locations
    data.places.forEach(place => {

        L.marker([
            place.latitude,
            place.longitude
        ])
            .addTo(window.earthMap)
            .bindPopup(`
                <b>♻️ ${place.name}</b><br>
                📏 ${place.distance} km away<br>
                📍 ${place.address}
            `);

    });

}

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);

            status.innerText =
                `✅ Location received! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        },

        function (error) {

            console.log("Location error:", error);

            if (error.code === 1) {
                status.innerText =
                    "❌ Location permission denied.";
            }

            else if (error.code === 2) {
                status.innerText =
                    "⚠️ Couldn't get location. Trying again...";

                // Automatically try once more
                setTimeout(() => {
                    retryLocation();
                }, 1000);
            }

            else if (error.code === 3) {
                status.innerText =
                    "⚠️ Location request timed out. Please try again.";
            }

            else {
                status.innerText =
                    "❌ Unable to determine your location.";
            }
        },

        {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
        }
    );
          


function retryLocation() {

    navigator.geolocation.getCurrentPosition(

        function (position) {

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            console.log("Retry successful!");
            console.log("Latitude:", latitude);
            console.log("Longitude:", longitude);

            document.getElementById("locationStatus").innerText =
                `✅ Location received! (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        },

        function (error) {

            console.log("Retry failed:", error);

            document.getElementById("locationStatus").innerText =
                "❌ Location is temporarily unavailable. Please try again.";
        },

        {
            enableHighAccuracy: false,
            timeout: 30000,
            maximumAge: 60000
        }
    );
}
async function findManualLocation() {

    const input =
        document.getElementById("manualLocation");

    const status =
        document.getElementById("locationStatus");

    const location =
        input.value.trim();

    if (location === "") {

        status.innerText =
            "Please enter a city or area.";

        return;
    }

    status.innerText =
        `📍 Searching recycling options near ${location}...`;

    try {

        const response = await fetch("/recycling", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                location: location
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Search failed."
            );
        }


        console.log("Recycling locations:", data);


        if (data.places.length === 0) {

            status.innerText =
                `No recycling locations found near ${location}.`;

            return;
        }


        status.innerText =
            `♻️ Found ${data.places.length} recycling options near ${location}.`;

            document.getElementById(
                "availableLocationsHeading"
            ).style.display = "flex";


        const map =
            document.getElementById("map");
        // 🌍 Create interactive map

        if (window.earthMap) {
            window.earthMap.remove();
        }

        window.earthMap = L.map("map").setView(
            [data.latitude, data.longitude],
            12
        );

        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    '&copy; OpenStreetMap contributors'
            }
        ).addTo(window.earthMap);


        // 📍 User location marker

        L.marker([
            data.latitude,
            data.longitude
        ])
            .addTo(window.earthMap)
            .bindPopup(
                `<b>📍 ${location}</b><br>You searched here.`
            )
            .openPopup();


        data.places.forEach(place => {

            // ♻️ Recycling location marker

            L.marker([
                place.latitude,
                place.longitude
            ])
                .addTo(window.earthMap)
                .bindPopup(`
    <b>♻️ ${place.name}</b><br>
    📏 ${place.distance} km away<br>
    📍 ${place.address}
`);
            const card =
                document.createElement("div");


            card.className =
                "recycling-card";


            const address =
                place.address &&
                place.address !== "Address not available"
                    ? place.address
                    : "Exact address unavailable";

            const distance =
                place.distance !== undefined
                    ? `${place.distance} km away`
                    : "Distance unavailable";

            card.innerHTML = `
                <div class="recycling-icon">♻️</div>

                <div>
                    <h3>${place.name}</h3>

                   <p>📍 ${address}</p>
                    <p>📏 ${distance}</p>

                    <a
                        href="https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}"
                        target="_blank"
                    >
                        🗺️ View on Google Maps
                    </a>
                </div>
            `;


            recyclingResults.appendChild(card);

        });

    }

    catch (error) {

        console.error(error);

        status.innerText =
            "❌ " + error.message;
    }
}

// 🌱 ECO SCORE INFO START

function showEcoInfo() {

    const info = document.getElementById("ecoInfo");

    info.classList.toggle("show");

}

// 🌱 ECO SCORE INFO END
// 🌱 ECO SCORE ENHANCEMENT START

function updateEcoScoreStyle(score) {

    const scoreElement =
        document.getElementById("ecoScore");

    const levelElement =
        document.getElementById("ecoLevel");

    if (!scoreElement || !levelElement) {
        return;
    }

    if (score >= 85) {

        levelElement.innerText =
            "Excellent 🌱";

    } else if (score >= 70) {

        levelElement.innerText =
            "Very Good ♻️";

    } else if (score >= 50) {

        levelElement.innerText =
            "Moderate ⚠️";

    } else if (score >= 30) {

        levelElement.innerText =
            "Needs Improvement";

    } else {

        levelElement.innerText =
            "Needs Special Care ⚠️";
    }
}

// 🌱 ECO SCORE ENHANCEMENT END

// 📷 PHOTO NAME DISPLAY

document.getElementById("wasteImage").addEventListener("change", function () {

    const file = this.files[0];
    const photoName = document.getElementById("photoName");

    if (file) {
        photoName.innerText = `📷 ${file.name}`;
    } else {
        photoName.innerText = "";
    }

});

// 📷 IDENTIFY WASTE FROM PHOTO

async function identifyWasteImage() {

    const fileInput =
        document.getElementById("wasteImage");

    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image first.");
        return;
    }

    const loading =
        document.getElementById("loading");

    loading.innerText =
        "🤖 Identifying waste from image...";

    const formData = new FormData();

    formData.append("image", file);

    try {

        const response = await fetch(
            "/identify-image",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Image identification failed."
            );
        }

        console.log(
            "📷 AI identified:",
            data.item
        );

        // Put identified item into text box
        document.getElementById("itemInput").value =
            data.item;

        document.getElementById("aiDetectedItem").innerText =
            data.item;

        document.getElementById("aiDetectedBox").style.display =
            "block";

        loading.innerText =
            `✅ Identified as "${data.item}". You can edit it if needed.`;


    } catch (error) {

        console.error(error);

        loading.innerText =
            "❌ Could not identify the image.";

        alert(error.message);
    }
}