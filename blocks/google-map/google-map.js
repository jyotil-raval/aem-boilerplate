// @ts-check

// Fill in your own key. This is a public, client-side key by design —
// Google's security model here is an HTTP referrer restriction set in
// Cloud Console (restrict to your domain), not a secret you hide.
// Needs "Maps JavaScript API" and "Geocoding API" both enabled.
const GOOGLE_MAPS_API_KEY = 'YOUR_API_KEY_HERE';

/** @type {Promise<void> | undefined} */
let loaderPromise;

/**
 * Loads the Maps JS SDK exactly once per page, even if several
 * google-map blocks decorate around the same time — later calls all
 * share the same in-flight promise instead of injecting duplicate
 * script tags.
 * @returns {Promise<void>}
 */
function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = '__googleMapsLoaded';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => reject(new Error('Failed to load Google Maps SDK'));
    document.head.append(script);
  });

  return loaderPromise;
}

/**
 * @param {string} address
 * @returns {Promise<{lat: number, lng: number}>}
 */
function geocode(address) {
  return new Promise((resolve, reject) => {
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results[0]) {
        const { location } = results[0].geometry;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
}

/**
 * Reads the authored table: Address (required), Zoom (optional, default
 * 15), Label (optional — shown in the marker's info window on click).
 * @param {HTMLElement} block
 */
function parseConfig(block) {
  const config = {};
  [...block.children].forEach((row) => {
    const [keyCell, valueCell] = row.children;
    const key = keyCell.textContent.trim().toLowerCase();
    config[key] = valueCell.textContent.trim();
  });

  return {
    address: config.address,
    zoom: config.zoom ? Number(config.zoom) : 15,
    label: config.label
  };
}

/**
 * @param {HTMLElement} block
 */
export default async function decorate(block) {
  const { address, zoom, label } = parseConfig(block);
  block.textContent = '';

  const mapEl = document.createElement('div');
  mapEl.className = 'google-map-canvas';
  block.append(mapEl);

  if (!address) {
    mapEl.textContent = 'No address configured for this map.';
    return;
  }

  try {
    await loadGoogleMaps();
    const position = await geocode(address);

    const map = new window.google.maps.Map(mapEl, {
      center: position,
      zoom
    });

    const marker = new window.google.maps.Marker({
      position,
      map,
      title: label || address
    });

    if (label) {
      const infoWindow = new window.google.maps.InfoWindow({
        content: `<strong>${label}</strong>`
      });
      marker.addListener('click', () => infoWindow.open(map, marker));
    }
  } catch (error) {
    mapEl.textContent = 'Unable to load the map right now.';
    // eslint-disable-next-line no-console
    console.error('google-map block error:', error);
  }
}
