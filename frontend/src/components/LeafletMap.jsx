import { useEffect, useRef, useState } from 'react';
import { MapSkeleton } from './SkeletonLoaders';

const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

const LeafletMap = ({ villages = {}, onVillageClick }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        if (window.L) { setLoading(false); return; }

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
        setError('Failed to load map');
        setLoading(false);
      }
    };
    loadLeaflet();
  }, []);

  useEffect(() => {
    if (loading || error || !window.L || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const map = L.map(mapRef.current, {
      center: [19.15, 72.95],
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
    });

    // Use a cleaner, more professional tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
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

      // Professional color palette
      const colors = {
        critical: '#DC2626',
        high: '#EA580C',
        medium: '#D97706',
        low: '#059669',
        normal: '#10B981',
      };
      const color = colors[riskLevel] || colors.normal;

      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${color};
            border: 2px solid white;
            border-radius: 6px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 11px;
            font-family: 'Inter', sans-serif;
          ">
            ${village.name?.[0] || '?'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(location, { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 160px; font-family: 'Inter', sans-serif;">
            <p style="font-weight: 600; font-size: 13px; margin: 0 0 8px 0; color: #1E293B;">${village.name || 'Unknown'}</p>
            <p style="margin: 4px 0; font-size: 11px; color: #334155;">
              <span style="color: #64748B;">Risk:</span> 
              <span style="color: ${color}; font-weight: 600; text-transform: uppercase;">${riskLevel}</span>
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #334155;">
              <span style="color: #64748B;">Belief:</span> 
              <span style="font-family: 'JetBrains Mono', monospace;">${(belief * 100).toFixed(0)}%</span>
            </p>
            <p style="margin: 4px 0; font-size: 11px; color: #334155;">
              <span style="color: #64748B;">Symptoms:</span> 
              <span style="font-family: 'JetBrains Mono', monospace;">${village.symptom_count || 0}</span>
            </p>
          </div>
        `, { className: 'custom-popup' });

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

  const sortedVillages = Object.entries(villages).sort(([, a], [, b]) => {
    const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, normal: 4 };
    return (riskOrder[a.risk_level] || 4) - (riskOrder[b.risk_level] || 4);
  });

  const getRiskBadge = (level) => {
    const badges = {
      critical: 'badge-critical',
      high: 'badge-high',
      medium: 'badge-medium',
      low: 'badge-low',
      normal: 'badge-low',
    };
    return badges[level] || badges.normal;
  };

  if (loading) return <MapSkeleton />;

  if (error) {
    return (
      <div className="card p-6 text-center">
        <p className="text-sm text-text-muted">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Village Risk Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {sortedVillages.map(([id, village]) => (
          <button
            key={id}
            onClick={() => {
              setSelectedVillage({ id, ...village });
              if (mapInstanceRef.current && village.location) {
                mapInstanceRef.current.setView(village.location, 13);
              }
            }}
            className={`card p-3 text-left transition-all hover:shadow-card ${
              selectedVillage?.id === id ? 'ring-1 ring-accent' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-medium text-text-primary">{village.name}</h3>
              <span className={`badge text-[10px] ${getRiskBadge(village.risk_level)}`}>
                {(village.risk_level || 'normal').toUpperCase()}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Belief</span>
                <span className="font-mono text-text-primary">{((village.outbreak_belief || 0) * 100).toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(village.outbreak_belief || 0) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Symptoms</span>
                <span className="font-mono text-text-primary">{village.symptom_count || 0}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-text-primary">Geographic Distribution</h2>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-500 rounded" />
              <span className="text-text-muted">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded" />
              <span className="text-text-muted">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded" />
              <span className="text-text-muted">Low</span>
            </div>
          </div>
        </div>
        <div ref={mapRef} className="h-80 rounded overflow-hidden border border-border" />
      </div>

      {/* Selected Village Detail */}
      {selectedVillage && (
        <div className="card p-4 border-l-2 border-l-accent">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="text-sm font-medium text-text-primary">{selectedVillage.name}</h3>
              <p className="text-[10px] font-mono text-text-muted">Agent ID: {selectedVillage.id}</p>
            </div>
            <button onClick={() => setSelectedVillage(null)} className="text-text-muted hover:text-text-primary text-xs">
              ✕
            </button>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Risk</p>
              <p className={`text-sm font-medium uppercase ${
                selectedVillage.risk_level === 'high' || selectedVillage.risk_level === 'critical' ? 'text-red-600' :
                selectedVillage.risk_level === 'medium' ? 'text-amber-600' : 'text-emerald-600'
              }`}>{selectedVillage.risk_level || 'Normal'}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Belief</p>
              <p className="text-sm font-mono text-text-primary">{((selectedVillage.outbreak_belief || 0) * 100).toFixed(0)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Symptoms</p>
              <p className="text-sm font-mono text-text-primary">{selectedVillage.symptom_count || 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider">Coords</p>
              <p className="text-xs font-mono text-text-primary">
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
