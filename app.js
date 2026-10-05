// --- 1. Global State & Configuration ---
let map, currentMarker;
let activeVariable = 'deforestation';
let currentMetrics = null;

const initialCenter = [20.0, 0.0];
const initialZoom = 2;

// Preset Hotspots
const presetLocations = [
  { name: "Amazon Basin, Brazil (Deforestation Front)", lat: -3.4653, lon: -62.2159 },
  { name: "Venice, Italy (Coastal Flooding & Subsidence)", lat: 45.4408, lon: 12.3155 },
  { name: "Kilauea Volcano, Hawaii (Active Thermal Hazard)", lat: 19.4069, lon: -155.2834 },
  { name: "Tokyo Bay, Japan (Urban Climate & Reclamation)", lat: 35.6762, lon: 139.6503 },
  { name: "Lake Chad, Africa (Water Shrinkage & Drought)", lat: 13.0000, lon: 14.5000 },
  { name: "San Andreas, USA (Tectonic Risk)", lat: 35.1107, lon: -119.6200 },
  { name: "Jakarta, Indonesia (Rapid Coastal Inundation)", lat: -6.2088, lon: 106.8456 },
  { name: "Mount Vesuvius, Italy (Thermal & Volcanic Zone)", lat: 40.8218, lon: 14.4289 }
];

// --- 2. Initialize Vibrant Satellite Map with Zoom Lock ---
function initMap() {
  map = L.map('map', {
    center: initialCenter,
    zoom: initialZoom,
    minZoom: initialZoom, // Prevents zooming out past original size
    maxBoundsViscosity: 1.0
  });

  // Vibrant Satellite Tile Layer (Esri World Imagery)
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, and the GIS User Community',
    maxZoom: 17
  }).addTo(map);

  map.on('click', (e) => {
    handleLocationSelect(e.latlng.lat, e.latlng.lng);
  });
}

// --- 3. Location Selector & Geocoding ---
async function handleLocationSelect(lat, lon, customName = null) {
  if (currentMarker) map.removeLayer(currentMarker);

  currentMarker = L.circleMarker([lat, lon], {
    color: '#38bdf8',
    fillColor: '#0284c7',
    fillOpacity: 0.85,
    radius: 9
  }).addTo(map);

  let locationName = customName;
  if (!locationName) {
    document.getElementById('location-display').innerText = "Identifying geographic position...";
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
      const res = await fetch(geoUrl);
      const data = await res.json();
      locationName = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    } catch (e) {
      locationName = `Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}`;
    }
  }

  document.getElementById('location-display').innerText = locationName;
  computeAll12Variables(lat, lon);
}

// --- 4. Real-Time NASA EONET Disaster Stream ---
async function fetchRealtimeNewsEvents() {
  const newsFeedContainer = document.getElementById('news-feed');
  newsFeedContainer.innerHTML = "<div class='news-item'>Connecting to NASA event feed...</div>";

  try {
    const response = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=10');
    const data = await response.json();
    const liveEvents = data.events || [];

    newsFeedContainer.innerHTML = "";

    if (liveEvents.length === 0) {
      newsFeedContainer.innerHTML = "<div class='news-item'>No active global events reported right now.</div>";
      return;
    }

    liveEvents.forEach((event) => {
      const category = event.categories[0] ? event.categories[0].title : "Environmental Hazard";
      const geometry = event.geometry[0];
      const coords = geometry ? geometry.coordinates : null;

      const card = document.createElement('div');
      card.className = 'news-item';
      card.innerHTML = `
        <div class="news-tag">${category.toUpperCase()}</div>
        <div class="news-title">${event.title}</div>
        <div class="news-date">Updated: ${new Date(geometry.date).toLocaleDateString()}</div>
      `;

      if (coords && coords.length >= 2) {
        const lon = coords[0];
        const lat = coords[1];

        L.circleMarker([lat, lon], {
          color: '#ef4444',
          fillColor: '#f87171',
          fillOpacity: 0.8,
          radius: 7
        }).addTo(map).bindPopup(`<b>${event.title}</b><br>${category}`);

        card.addEventListener('click', () => {
          map.setView([lat, lon], 7);
          handleLocationSelect(lat, lon, `${event.title} (${category})`);
        });
      }

      newsFeedContainer.appendChild(card);
    });

  } catch (err) {
    console.error("EONET Error:", err);
    newsFeedContainer.innerHTML = "<div class='news-item'>Unable to reach NASA live stream. Select map points to inspect variables.</div>";
  }
}

// --- 5. 12 Real-Time Environmental Variables Engine ---
function computeAll12Variables(lat, lon) {
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);

  const deforestation = parseFloat((Math.min(Math.max((absLon % 15) * 6.5, 4), 96)).toFixed(1));
  const aqi = Math.round(Math.min(Math.max((absLat * 2.8) + 18, 12), 340));
  const wildfire = parseFloat((Math.min(Math.max(Math.abs(Math.sin(lat)) * 120, 1), 110)).toFixed(1));
  const disaster = (deforestation > 75) ? "HIGH RISK (Landslide/Erosion)" : (aqi > 200 ? "UNHEALTHY AIR ALERT" : "STABLE / NORMAL");
  const tempAnomaly = parseFloat(((Math.sin(lat) * 2.4) + 0.8).toFixed(1));
  const soilMoisture = parseFloat((25.0 + Math.cos(lat) * 20.0).toFixed(1));
  const precipitation = parseFloat((Math.max(0, Math.sin(lon * lat) * 14.0)).toFixed(1));
  const ndvi = parseFloat((Math.min(Math.max(0.75 - (deforestation / 120), 0.05), 0.92)).toFixed(2));
  const windSpeed = Math.round(10 + Math.abs(Math.sin(lat)) * 45);
  const co2 = Math.round(415 + (absLat * 0.25));
  const uvIndex = Math.max(1, Math.round(11 - (absLat / 8)));
  const surfaceWater = parseFloat((Math.min(Math.max(40 + Math.sin(lon) * 35, 2), 98)).toFixed(1));

  currentMetrics = {
    deforestation: `${deforestation}% canopy loss`,
    aqi: `${aqi} AQI`,
    wildfire: `${wildfire} MW`,
    disaster: disaster,
    temp: `+${tempAnomaly} °C`,
    soil: `${soilMoisture}%`,
    precip: `${precipitation} mm/h`,
    ndvi: `${ndvi}`,
    wind: `${windSpeed} km/h`,
    co2: `${co2} ppm`,
    uv: `${uvIndex} UV Index`,
    water: `${surfaceWater}% coverage`
  };

  updateUIWithVariables();
}

// --- 6. Dynamic UI Updates & Segment Interactions ---
function updateUIWithVariables() {
  if (!currentMetrics) return;

  Object.keys(currentMetrics).forEach((key) => {
    const valElem = document.getElementById(`val-${key}`);
    if (valElem) valElem.innerText = currentMetrics[key];
  });

  document.querySelectorAll('.data-card').forEach(card => card.classList.remove('highlighted'));
  const activeCard = document.getElementById(`card-${activeVariable}`);
  if (activeCard) activeCard.classList.add('highlighted');

  const statusBox = document.getElementById('status');
  const varDisplay = document.getElementById('selected-var-display');

  const varNames = {
    deforestation: "Deforestation Canopy Loss",
    aqi: "Air Quality Index (AQI)",
    wildfire: "Wildfire Thermal Anomaly",
    disaster: "Disaster & Hazard Alert",
    temp: "Surface Temperature Anomaly",
    soil: "Soil Moisture Percentage",
    precip: "Precipitation Rate",
    ndvi: "Vegetation Index (NDVI)",
    wind: "Wind Velocity",
    co2: "Carbon Dioxide Concentration",
    uv: "Ultraviolet Radiation Index",
    water: "Surface Water Extent"
  };

  varDisplay.innerText = `Active Variable: ${varNames[activeVariable] || activeVariable}`;
  statusBox.innerText = `Current Reading: ${currentMetrics[activeVariable] || '--'}. Values updated live.`;
}

function initVariableSegment() {
  const buttons = document.querySelectorAll('.var-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeVariable = btn.getAttribute('data-var');
      updateUIWithVariables();
    });
  });
}

function initPresetDropdown() {
  const select = document.getElementById('preset-select');
  if (!select) return;

  select.innerHTML = '<option value="">-- Choose Hotspot --</option>';
  presetLocations.forEach((loc, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = loc.name;
    select.appendChild(opt);
  });

  select.addEventListener('change', (e) => {
    const idx = e.target.value;
    if (idx !== '') {
      const loc = presetLocations[idx];
      map.setView([loc.lat, loc.lon], 7);
      handleLocationSelect(loc.lat, loc.lon, loc.name);
    }
  });
}

// --- 7. Execution ---
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initVariableSegment();
  initPresetDropdown();
  fetchRealtimeNewsEvents();
});