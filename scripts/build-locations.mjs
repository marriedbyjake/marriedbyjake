import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'src/content/weddingtestimonials');
const DATA_FILE = path.join(PROJECT_ROOT, 'src/data/locations.json');
const USER_AGENT = 'MarriedByJake-Site-Builder/1.0';

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Load existing data
let locationsData = {};
if (fs.existsSync(DATA_FILE)) {
  try {
    locationsData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.warn("Could not parse existing locations.json, starting fresh.");
  }
}

// Regex for frontmatter
const FM_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

function parseFrontmatter(content) {
  const match = content.match(FM_REGEX);
  if (!match) return {};
  
  const fm = {};
  const lines = match[1].split('\n');
  for (const line of lines) {
    const parts = line.split(':');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join(':').trim();
      // Simple quote removal
      fm[key] = val.replace(/^["'](.*)["']$/, '$1');
    }
  }
  return fm;
}

// Load API Key from .env
let GOOGLE_API_KEY = process.env.PUBLIC_GOOGLE_MAPS_API_KEY;

// Try to read .env file if not in process.env
if (!GOOGLE_API_KEY) {
    const envPath = path.join(PROJECT_ROOT, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const match = envContent.match(/PUBLIC_GOOGLE_MAPS_API_KEY=(.*)/);
        if (match) {
            GOOGLE_API_KEY = match[1].trim();
        }
    }
}

function fetchCoordinates(query) {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_API_KEY) {
        // Fallback to Nominatim if no API key (or warn user)
        console.warn("⚠️ No Google Maps API Key found. Falling back to Nominatim (less accurate).");
        return fetchCoordinatesNominatim(query).then(resolve).catch(reject);
    }

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.append('address', query);
    url.searchParams.append('key', GOOGLE_API_KEY);

    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status ${res.statusCode}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.status === 'OK' && json.results.length > 0) {
            const result = json.results[0];
            resolve({
              lat: result.geometry.location.lat,
              lon: result.geometry.location.lng,
              display_name: result.formatted_address,
              place_id: result.place_id // Store place_id for better linking later
            });
          } else if (json.status === 'ZERO_RESULTS') {
            resolve(null);
          } else {
            // Over_query_limit, request_denied, etc.
            console.error(`Google Geocoding API Error: ${json.status} - ${json.error_message || ''}`);
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
  });
}

function fetchCoordinatesNominatim(query) {
  return new Promise((resolve, reject) => {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('limit', '1');

    const req = https.get(url, {
      headers: { 'User-Agent': USER_AGENT }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Status ${res.statusCode}`));
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            resolve({
              lat: parseFloat(json[0].lat),
              lon: parseFloat(json[0].lon),
              display_name: json[0].display_name
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
  });
}

async function main() {
  console.log("📍 Building Locations Data...");
  
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`Content directory not found: ${CONTENT_DIR}`);
    return;
  }

  // Iterate through all MD files
  const files = fs.readdirSync(CONTENT_DIR);
  console.log(`Found ${files.length} testimonial files.`);

  const uniqueLocations = new Set();

  // 1. Collect all unique locations
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const fm = parseFrontmatter(content);
    
    const venue = fm.venue || '';
    const location = fm.location || '';
    
    const parts = [venue, location].filter(p => p && p.trim().length > 0);
    if (parts.length === 0) continue;
    
    const query = parts.join(', ');
    uniqueLocations.add(query);
  }

  console.log(`Found ${uniqueLocations.size} unique locations.`);

  // 2. Geocode missing locations and prune old ones
  let updated = false;
  let processedCount = 0;
  const finalLocationsData = {};

  for (const query of Array.from(uniqueLocations).sort()) {
    // If we already have it in the loaded cache, keep it
    if (locationsData[query]) {
      finalLocationsData[query] = locationsData[query];
      continue; 
    }

    console.log(`Geocoding: "${query}"...`);
    
    try {
      // Rate limiting: sleep 1.1s (Google allows more, but staying safe/consistent)
      await new Promise(r => setTimeout(r, 200)); 
      
      let coords = await fetchCoordinates(query);
      
      // Fallback: try just the location part if "Venue, Location" fails
      if (!coords) {
        const parts = query.split(', ');
        if (parts.length > 1) {
           const locationOnly = parts.slice(1).join(', '); // simplistic fallback
           if (locationOnly.length > 3) { // sanity check
               console.log(`    ↳ Retrying with: "${locationOnly}"...`);
               await new Promise(r => setTimeout(r, 200));
               coords = await fetchCoordinates(locationOnly);
           }
        }
      }

      if (coords) {
        finalLocationsData[query] = coords;
        console.log(`  ✅ Found: ${coords.lat}, ${coords.lon}`);
        updated = true;
      } else {
        console.log(`  ❌ Not found.`);
      }
    } catch (e) {
      console.error(`  ⚠️ Error geocoding "${query}": ${e.message}`);
    }
    
    processedCount++;
    // We don't save periodically anymore because we are rebuilding the object
  }

  // 3. Save final (Always save to ensure we prune old keys)
  // Check if anything actually changed in terms of content
  // But simplistic approach: just write it if we processed anything or if count differs
  
  // We should always write if we want to prune old keys that are no longer in uniqueLocations
  // But to avoid unnecessary IO, let's compare keys or stringify
  
  // Actually, we must save to prune.
  fs.writeFileSync(DATA_FILE, JSON.stringify(finalLocationsData, null, 2));
  console.log(`Saved ${Object.keys(finalLocationsData).length} locations to ${DATA_FILE} (Pruned ${Object.keys(locationsData).length - Object.keys(finalLocationsData).length} old entries).`);
}

main().catch(console.error);
