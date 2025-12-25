import { useEffect, useRef, useState } from 'react';
import { MapSkeleton } from './SkeletonLoaders';

// Leaflet CSS and JS are loaded dynamically
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const LeafletMap = ({ villages = {}, onVillageClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        if (window.L) {
          setLoading(false);
          return;
        }

        if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = LEAFLET_CSS;
          document.head.appendChild(link);
        }

        await new Promise((resolve, reject) => {
          if (window.L) { resolve(); return; }
          const script = document.createElement('script');
          script.src = LEAFLET_JS;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        setLoading(false);
      } catch (err) {
        setError('Failed to load map library');
        setLoading(false);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (loading || error || !window.L || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [19.15, 72.95],
      zoom: 11,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [loading, error]);

  // Update markers when villages change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    Object.entries(villages).forEach(([id, village]) => {
      const location = village.location || [19.15, 72.95];
      const riskLevel = village.risk_level || 'normal';
      const belief = village.outbreak_belief || 0;

      const colors = {
        critical: '#dc2626',
        high: '#dc2626',
        medium: '#f59e0b',
        low: '#22c55e',
        normal: '#22c55e',
      };
      const color = colors[riskLevel] || colors.normal;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 40px;
            height: 40px;
            background: ${color};
            border: 4px solid white;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            cursor: pointer;
          ">
            ${village.name?.[0] || '?'}
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });

      const marker = L.marker(location, { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 180px; padding: 4px;">
            <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 8px;">${village.name || 'Unknown'}</h3>
            <p style="margin: 6px 0;"><strong>Risk Level:</strong> 
              <span style="color: ${color}; text-transform: uppercase; font-weight: bold;">${riskLevel}</span>
            </p>
            <p style="margin: 6px 0;"><strong>Outbreak Belief:</strong> ${(belief * 100).toFixed(0)}%</p>
            <p style="margin: 6px 0;"><strong>Symptoms:</strong> ${village.symptom_count || 0}</p>
          </div>
        `);

      marker.on('click', () => {
        setSelectedVillage({ id, ...village });
        if (onVillageClick) onVillageClick(id, village);
      });

      markersRef.current.push(marker);
    });

    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }, [villages, onVillageClick]);

  // Sort villages by risk for the summary panel
  const sortedVillages = Object.entries(villages).sort(([, a], [, b]) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, normal: 4 };
    return (riskOrder[a.risk_level] || 4) - (riskOrder[b.risk_level] || 4);
  });

  const getRiskColor = (riskLevel) => {
    const colors = {
      critical: 'bg-red-500',
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500',
      normal: 'bg-green-500',
    };
    return colors[riskLevel] || colors.normal;
  };

  const getRiskBgColor = (riskLevel) => {
    const colors = {
      critical: 'bg-red-50 border-red-200',
      high: 'bg-red-50 border-red-200',
      medium: 'bg-yellow-50 border-yellow-200',
      low: 'bg-green-50 border-green-200',
      normal: 'bg-green-50 border-green-200',
    };
    return colors[riskLevel] || colors.normal;
  };

  if (loading) return <MapSkeleton />;

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6" role="alert" aria-live="polite">
        <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Village Risk Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sortedVillages.map(([id, village]) => (
          <button
            key={id}
            onClick={() => {
              setSelectedVillage({ id, ...village });
              if (mapInstanceRef.current && village.location) {
                mapInstanceRef.current.setView(village.location, 13);
              }
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              selectedVillage?.id === id ? 'ring-2 ring-indigo-500' : ''
            } ${getRiskBgColor(village.risk_level)}`}
            aria-label={`${village.name}: ${village.risk_level} risk, ${(village.outbreak_belief * 100).toFixed(0)}% outbreak belief`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{village.name}</h3>
              <span className={`w-3 h-3 rounded-full ${getRiskColor(village.risk_level)}`} aria-hidden="true" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                Risk: <span className={`font-semibold uppercase ${
                  village.risk_level === 'high' || village.risk_level === 'critical' ? 'text-red-600' :
                  village.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>{village.risk_level || 'normal'}</span>
              </p>
              <p className="text-sm text-gray-600">
                Belief: <span className="font-semibold">{((village.outbreak_belief || 0) * 100).toFixed(0)}%</span>
              </p>
              <p className="text-sm text-gray-600">
                Symptoms: <span className="font-semibold">{village.symptom_count || 0}</span>
              </p>
            </div>
            {/* Mini progress bar */}
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${getRiskColor(village.risk_level)}`}
                style={{ width: `${(village.outbreak_belief || 0) * 100}%` }}
              />
            </div>
          </button>
        ))}
      </div>

      {/* Map Container */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4" id="map-title">
          Village Risk Map
        </h2>
        <div 
          ref={mapRef}
          className="h-96 rounded-lg overflow-hidden"
          role="application"
          aria-labelledby="map-title"
          aria-describedby="map-description"
          tabIndex={0}
        />
        <p id="map-description" className="sr-only">
          Interactive map showing village locations and their outbreak risk levels.
          Use mouse or touch to pan and zoom. Click on markers for details.
        </p>
        
        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-6 flex-wrap" role="legend" aria-label="Map legend">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full" aria-hidden="true" />
            <span className="text-sm text-gray-600">High/Critical Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" aria-hidden="true" />
            <span className="text-sm text-gray-600">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" aria-hidden="true" />
            <span className="text-sm text-gray-600">Low/Normal Risk</span>
          </div>
        </div>
      </div>

      {/* Selected Village Detail Panel */}
      {selectedVillage && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-indigo-600">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{selectedVillage.name}</h3>
              <p className="text-sm text-gray-500">Agent ID: {selectedVillage.id}</p>
            </div>
            <button 
              onClick={() => setSelectedVillage(null)}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close details"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Risk Level</p>
              <p className={`text-lg font-bold uppercase ${
                selectedVillage.risk_level === 'high' || selectedVillage.risk_level === 'critical' ? 'text-red-600' :
                selectedVillage.risk_level === 'medium' ? 'text-yellow-600' : 'text-green-600'
              }`}>{selectedVillage.risk_level || 'Normal'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Outbreak Belief</p>
              <p className="text-lg font-bold text-gray-900">{((selectedVillage.outbreak_belief || 0) * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Symptoms Reported</p>
              <p className="text-lg font-bold text-gray-900">{selectedVillage.symptom_count || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Location</p>
              <p className="text-sm font-medium text-gray-900">
                {selectedVillage.location ? `${selectedVillage.location[0].toFixed(2)}, ${selectedVillage.location[1].toFixed(2)}` : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeafletMap;
