if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.join(" ");
    if (
      msg.includes("ApiProjectMapError") ||
      msg.includes("google.maps") ||
      msg.includes("Google Maps JavaScript API error")
    ) {
      console.warn("Intercepted Google Maps SDK Error:", ...args);
      return;
    }
    originalConsoleError.apply(console, args);
  };
}

let scriptLoadingPromise: Promise<void> | null = null;

export function loadGoogleMapsScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  
  // Suppress Next.js development error screen overlay on Google Maps auth failure
  (window as any).gm_authFailure = () => {
    console.warn("Google Maps SDK authentication failed. Running in development mode with fallback.");
  };

  if ((window as any).google && (window as any).google.maps) return Promise.resolve();
  
  if (scriptLoadingPromise) return scriptLoadingPromise;
  
  scriptLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://maps.googleapis.com/maps/api/js?v=weekly";
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      resolve();
    };
    
    script.onerror = (err) => {
      scriptLoadingPromise = null;
      reject(err);
    };
    
    document.head.appendChild(script);
  });
  
  return scriptLoadingPromise;
}

export const GOOGLE_MAPS_LIGHT_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#616161" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#f5f5f5" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#eeeeee" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#ffffff" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#e0e0e0" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#bdbdbd" }]
  }
];

export const GOOGLE_MAPS_DARK_STYLE = [
  {
    "elementType": "geometry",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "elementType": "labels.icon",
    "stylers": [{ "visibility": "off" }]
  },
  {
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "elementType": "labels.text.stroke",
    "stylers": [{ "color": "#212121" }]
  },
  {
    "featureType": "administrative",
    "elementType": "geometry",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "administrative.country",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#9e9e9e" }]
  },
  {
    "featureType": "poi",
    "elementType": "geometry",
    "stylers": [{ "color": "#181818" }]
  },
  {
    "featureType": "poi",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#757575" }]
  },
  {
    "featureType": "road",
    "elementType": "geometry.fill",
    "stylers": [{ "color": "#2c2c2c" }]
  },
  {
    "featureType": "road",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#8a8a8a" }]
  },
  {
    "featureType": "road.highway",
    "elementType": "geometry",
    "stylers": [{ "color": "#3c3c3c" }]
  },
  {
    "featureType": "water",
    "elementType": "geometry",
    "stylers": [{ "color": "#000000" }]
  },
  {
    "featureType": "water",
    "elementType": "labels.text.fill",
    "stylers": [{ "color": "#3d3d3d" }]
  }
];

export function getGoogleMapsStyle(isDark: boolean) {
  return isDark ? GOOGLE_MAPS_DARK_STYLE : GOOGLE_MAPS_LIGHT_STYLE;
}

export const RIYADH_BOUNDS = {
  minLat: 24.6800,
  maxLat: 24.7500,
  minLng: 46.6400,
  maxLng: 46.7200,
};

export function getCarLatLng(mapX: number, mapY: number) {
  const x = mapX || 50;
  const y = mapY || 50;
  const lat = RIYADH_BOUNDS.minLat + (1 - y / 100) * (RIYADH_BOUNDS.maxLat - RIYADH_BOUNDS.minLat);
  const lng = RIYADH_BOUNDS.minLng + (x / 100) * (RIYADH_BOUNDS.maxLng - RIYADH_BOUNDS.minLng);
  return { lat, lng };
}

export function createCustomMarker(
  map: any,
  lat: number,
  lng: number,
  color: string,
  label: string,
  isTarget: boolean,
  onClick: () => void
) {
  if (typeof window === "undefined" || !(window as any).google) return null;

  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.cursor = "pointer";
  div.style.transform = "translate(-50%, -50%)";
  div.style.zIndex = isTarget ? "20" : "10";
  
  div.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });

  // Inject dynamic stylesheet rule for scale-hover transition and ping pulse
  if (typeof document !== "undefined" && !document.getElementById("map-marker-style")) {
    const style = document.createElement("style");
    style.id = "map-marker-style";
    style.innerHTML = `
      @keyframes marker-pulse {
        0% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.4); opacity: 0.2; }
        100% { transform: scale(0.95); opacity: 0.8; }
      }
      .car-marker-container {
        transition: transform 0.2s ease;
      }
      .car-marker-container:hover {
        transform: scale(1.1);
      }
    `;
    document.head.appendChild(style);
  }

  div.className = "car-marker-container";
  div.innerHTML = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <!-- Circle Pin -->
      <div style="
        width: ${isTarget ? "40px" : "36px"};
        height: ${isTarget ? "40px" : "36px"};
        border-radius: 50%;
        border: ${isTarget ? "3px" : "2.5px"} solid white;
        background: ${isTarget ? "#4171E2" : color};
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        box-shadow: ${isTarget ? "0 0 0 5px rgba(65,113,226,0.28), 0 4px 12px rgba(0,0,0,0.22)" : "0 2px 8px rgba(0,0,0,0.18)"};
      ">
        <!-- Modern Car Icon SVG -->
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
          <circle cx="7" cy="17" r="2"/>
          <path d="M9 17h6"/>
          <circle cx="17" cy="17" r="2"/>
        </svg>
      </div>
      
      <!-- Pulse halo -->
      ${isTarget ? `
        <span style="
          position: absolute;
          top: 0; left: 0;
          width: 40px; height: 40px;
          border-radius: 50%;
          background: rgba(65,113,226,0.25);
          animation: marker-pulse 1.8s infinite ease-in-out;
          pointer-events: none;
        "></span>
      ` : ""}
      
      <!-- Label -->
      <div style="
        margin-top: 4px;
        font-size: 10px;
        background: white;
        border: 1px solid #E2E4EB;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
        font-weight: 600;
        color: #4A4F73;
        box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      ">
        ${label}
      </div>
    </div>
  `;

  class CustomOverlay extends (window as any).google.maps.OverlayView {
    onAdd() {
      const pane = this.getPanes().overlayMouseTarget;
      pane.appendChild(div);
    }
    draw() {
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(new (window as any).google.maps.LatLng(lat, lng));
      if (point) {
        div.style.left = `${point.x}px`;
        div.style.top = `${point.y}px`;
      }
    }
    onRemove() {
      if (div.parentNode) {
        div.parentNode.removeChild(div);
      }
    }
  }

  const overlay = new CustomOverlay();
  overlay.setMap(map);
  return overlay;
}

export function getAvailabilityText(status: string, id: number, ar: boolean) {
  if (status === "available") {
    return ar ? "متاحة الآن" : "Available now";
  }
  if (status === "maintenance") {
    return ar ? "تحت الصيانة" : "Under maintenance";
  }
  if (status === "rented") {
    const hours = (id * 3) % 24 || 2;
    const days = id % 3;
    if (days > 0) {
      if (days === 1) return ar ? "ينتهي بعد يوم" : "Ends in 1 day";
      if (days === 2) return ar ? "ينتهي بعد يومين" : "Ends in 2 days";
      return ar ? `ينتهي بعد ${days} أيام` : `Ends in ${days} days`;
    } else {
      if (hours === 1) return ar ? "ينتهي بعد ساعة" : "Ends in 1 hour";
      if (hours === 2) return ar ? "ينتهي بعد ساعتين" : "Ends in 2 hours";
      return ar ? `ينتهي بعد ${hours} ساعات` : `Ends in ${hours} hours`;
    }
  }
  if (status === "overdue") {
    const hours = 1 + (id % 5);
    if (hours === 1) return ar ? "متأخر منذ ساعة" : "Overdue by 1 hour";
    if (hours === 2) return ar ? "متأخر منذ ساعتين" : "Overdue by 2 hours";
    return ar ? `متأخر منذ ${hours} ساعات` : `Overdue by ${hours} hours`;
  }
  return "";
}
