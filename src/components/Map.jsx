import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase } from '../supabaseClient';
import ReportModal from './ReportModal';

const getConvexHull = (points) => {
    if (points.length <= 2) return points;
    const sorted = points.slice().sort((a, b) => a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1]);
    const crossProduct = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (let p of sorted) {
        while (lower.length >= 2 && crossProduct(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
        lower.push(p);
    }
    const upper = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
        let p = sorted[i];
        while (upper.length >= 2 && crossProduct(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
};

const Map = ({ onReportAdded, selectedReport, selectedHotspot, user }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [clickedCoords, setClickedCoords] = useState(null);
    const [reports, setReports] = useState([]);
    const [isGlobalMode, setIsGlobalMode] = useState(false);
    const markers = useRef([]);
    const tempMarker = useRef(null); // Temporary draggable marker

    // Determine if we should show all reports (admin mode) or just user's reports
    const isAdminMode = onReportAdded !== undefined;

    // Initialize map
    useEffect(() => {
        if (map.current) return; // Initialize map only once

        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: 'https://tiles.openfreemap.org/styles/bright',
            center: [79.1595, 12.9698], // VIT Vellore coordinates
            zoom: 16, // Adjusted zoom for campus view
        });

        // Apply Swiss/Toon style overrides after map loads
        map.current.on('load', () => {
            // Roads: White with grey casing
            const roadLayers = [
                'road_motorway',
                'road_trunk',
                'road_primary',
                'road_secondary',
                'road_tertiary',
                'road_minor',
                'road_service',
                'road_street',
            ];

            roadLayers.forEach((layer) => {
                if (map.current.getLayer(layer)) {
                    map.current.setPaintProperty(layer, 'line-color', '#FFFFFF');
                }
                // Casing layers
                const casingLayer = `${layer}_casing`;
                if (map.current.getLayer(casingLayer)) {
                    map.current.setPaintProperty(casingLayer, 'line-color', '#CCCCCC');
                }
            });

            // Land: Pastel Grey
            if (map.current.getLayer('landcover')) {
                map.current.setPaintProperty('landcover', 'fill-color', '#F0F2F5');
            }
            if (map.current.getLayer('landuse')) {
                map.current.setPaintProperty('landuse', 'fill-color', '#F0F2F5');
            }

            // Buildings: Light grey with black outline
            if (map.current.getLayer('building')) {
                map.current.setPaintProperty('building', 'fill-color', '#E0E0E0');
                map.current.setPaintProperty('building', 'fill-outline-color', '#000000');
            }

            // Add building outline layer for "Toon" effect
            if (map.current.getSource('openmaptiles')) {
                map.current.addLayer({
                    id: 'building-outline',
                    type: 'line',
                    source: 'openmaptiles',
                    'source-layer': 'building',
                    paint: {
                        'line-color': '#000000',
                        'line-width': 1,
                    },
                });
            }

            // Water: Deep Swiss Blue
            const waterLayers = ['water', 'waterway'];
            waterLayers.forEach((layer) => {
                if (map.current.getLayer(layer)) {
                    map.current.setPaintProperty(layer, 'fill-color', '#0055A4');
                }
            });

            // Add GPS location control
            map.current.addControl(
                new maplibregl.GeolocateControl({
                    positionOptions: {
                        enableHighAccuracy: true,
                    },
                    trackUserLocation: true,
                    showUserHeading: true,
                }),
                'top-right'
            );

            // Add empty source for hotspots
            map.current.addSource('hotspots', {
                type: 'geojson',
                data: { type: 'FeatureCollection', features: [] }
            });

            // Add layer for hotspot fill
            map.current.addLayer({
                id: 'hotspot-fill',
                type: 'fill',
                source: 'hotspots',
                paint: {
                    'fill-color': [
                        'case',
                        ['>=', ['get', 'severity'], 4], '#EF4444',
                        ['>=', ['get', 'severity'], 3], '#F97316',
                        '#3B82F6'
                    ],
                    'fill-opacity': 0.15
                }
            });

            // Add layer for hotspot border
            map.current.addLayer({
                id: 'hotspot-border',
                type: 'line',
                source: 'hotspots',
                paint: {
                    'line-color': [
                        'case',
                        ['>=', ['get', 'severity'], 4], '#B91C1C',
                        ['>=', ['get', 'severity'], 3], '#C2410C',
                        '#1D4ED8'
                    ],
                    'line-width': 2,
                    'line-dasharray': [2, 2]
                }
            });
        });

        // Click handler for two-step pin placement
        map.current.on('click', (e) => {
            // If there's already a temp marker, remove it first
            if (tempMarker.current) {
                tempMarker.current.remove();
                tempMarker.current = null;
            }

            // Create draggable temporary marker
            const el = document.createElement('div');
            el.style.width = '32px';
            el.style.height = '32px';
            el.style.borderRadius = '50% 50% 50% 0';
            el.style.backgroundColor = '#3B82F6';
            el.style.border = '3px solid #FFFFFF';
            el.style.transform = 'rotate(-45deg)';
            el.style.cursor = 'move';
            el.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
            el.title = 'Drag to adjust position, click to confirm';

            tempMarker.current = new maplibregl.Marker({
                element: el,
                draggable: true,
            })
                .setLngLat([e.lngLat.lng, e.lngLat.lat])
                .addTo(map.current);

            // Click on marker to confirm and open modal
            el.addEventListener('click', (ev) => {
                ev.stopPropagation(); // Prevent map click from firing and creating a new marker
                const lngLat = tempMarker.current.getLngLat();
                setClickedCoords({ lat: lngLat.lat, lng: lngLat.lng });
                tempMarker.current.remove();
                tempMarker.current = null;
            });
        });

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    // Global deletion handler for popup buttons
    useEffect(() => {
        window.deleteReport = async (reportId) => {
            if (window.confirm('🗑️ Are you sure you want to delete your report?')) {
                const { error } = await supabase.from('reports').delete().eq('id', reportId);
                if (error) {
                    console.error('Error deleting report:', error);
                    alert('❌ Failed to delete report');
                } else {
                    fetchReports();
                }
            }
        };
        return () => {
            delete window.deleteReport;
        };
    }, [isGlobalMode]); // Re-bind if global mode changes

    // Fetch reports from Supabase
    useEffect(() => {
        fetchReports();
    }, [onReportAdded, user, isGlobalMode]);

    const fetchReports = async () => {
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // Use user's ID for filtering ONLY if global mode is OFF
        // If in admin mode, always show everything
        if (!isGlobalMode && !isAdminMode && user) {
            query = query.eq('user_id', user.id);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching reports:', error);
        } else {
            setReports(data || []);
        }
    };

    // Render markers on map (only for admin dashboard)
    useEffect(() => {
        if (!map.current) return;

        // Show markers for both admin and user view
        // if (onReportAdded === undefined) return;

        // Clear existing markers
        markers.current.forEach((marker) => marker.remove());
        markers.current = [];

        // Add new markers
        reports.forEach((report) => {
            const el = document.createElement('div');
            el.className = 'report-marker';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.borderRadius = '50%';
            el.style.border = '2px solid #000';
            const isOwnReport = user && report.user_id === user.id;
            el.style.backgroundColor = isOwnReport ? '#8B5CF6' : (report.status === 'resolved' ? '#22C55E' : '#EF4444');
            el.style.cursor = 'pointer';

            const deleteButtonHtml = isOwnReport
                ? `<button 
                    onclick="window.deleteReport('${report.id}')" 
                    style="margin-top: 10px; width: 100%; padding: 6px; background-color: #EF4444; color: white; border: none; border-radius: 4px; cursor: pointer; font-family: Inter, sans-serif; font-weight: 600; font-size: 11px; transition: background 0.2s;"
                    onmouseover="this.style.backgroundColor='#DC2626'"
                    onmouseout="this.style.backgroundColor='#EF4444'"
                  >Delete My Report</button>`
                : '';

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([report.lng, report.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 }).setHTML(
                        `<div style="font-family: Inter, sans-serif;">
              <strong>${report.category}</strong><br/>
              ${report.description || 'No description'}<br/>
              <em>Status: ${report.status}</em><br/>
              <small>IP: ${report.user_ip || 'N/A'}</small>
              ${deleteButtonHtml}
            </div>`
                    )
                )
                .addTo(map.current);

            markers.current.push(marker);
        });
    }, [reports, onReportAdded, isGlobalMode]);

    // Zoom to selected report (for admin dashboard)
    useEffect(() => {
        if (selectedReport && map.current) {
            map.current.flyTo({
                center: [selectedReport.lng, selectedReport.lat],
                zoom: 18,
                duration: 1500,
            });
        }
    }, [selectedReport]);

    // Update hotspots visualization
    useEffect(() => {
        if (!map.current) return;

        const updateHotspots = async () => {
            const { data, error } = await supabase
                .from('transportation_hotspots')
                .select('*, hotspot_reports(reports(lat, lng))');
            
            if (error) {
                console.error('Error fetching hotspots for map:', error);
                return;
            }

            // Helper to generate a small circle (for fallback)
            const createCircle = (center, radiusInMeters, points = 32) => {
                const km = radiusInMeters / 1000;
                const distanceX = km / (111.32 * Math.cos(center[1] * Math.PI / 180));
                const distanceY = km / 110.574;
                const ret = [];
                for (let i = 0; i <= points; i++) {
                    const theta = (i / points) * (2 * Math.PI);
                    ret.push([center[0] + distanceX * Math.cos(theta), center[1] + distanceY * Math.sin(theta)]);
                }
                return [ret];
            };

            const features = (data || []).map(h => {
                const coords = h.hotspot_reports
                    ?.map(link => [link.reports.lng, link.reports.lat])
                    .filter(c => c && c[0] && c[1]) || [];
                
                let geometry;
                if (coords.length >= 3) {
                    // ORGANIC: Convex Hull
                    const hull = getConvexHull(coords);
                    hull.push(hull[0]); // Close polygon
                    geometry = { type: 'Polygon', coordinates: [hull] };
                } else if (coords.length === 2) {
                    // ORGANIC: Thick line capsule
                    const center = [(coords[0][0] + coords[1][0]) / 2, (coords[0][1] + coords[1][1]) / 2];
                    geometry = { type: 'Polygon', coordinates: createCircle(center, 40) }; // Fallback circle
                } else if (coords.length === 1) {
                    // ORGANIC: Simple circle
                    geometry = { type: 'Polygon', coordinates: createCircle(coords[0], 30) };
                } else {
                    // Fallback to legacy boundary if no reports found (should not happen)
                    geometry = { type: 'Polygon', coordinates: createCircle(h.boundary_data.center, h.boundary_data.radius) };
                }

                return {
                    type: 'Feature',
                    properties: { 
                        id: h.id, 
                        title: h.theme_title, 
                        severity: h.severity,
                        isSelected: selectedHotspot?.id === h.id
                    },
                    geometry
                };
            });

            const source = map.current.getSource('hotspots');
            if (source) {
                source.setData({ type: 'FeatureCollection', features });
            }

            // Update visibility/focus based on selection
            if (map.current.getLayer('hotspot-fill')) {
                map.current.setPaintProperty('hotspot-fill', 'fill-opacity', [
                    'case',
                    ['==', ['get', 'id'], selectedHotspot?.id || ''], 0.45,
                    0 // Filter: Hide unselected
                ]);
            }
            if (map.current.getLayer('hotspot-border')) {
                map.current.setPaintProperty('hotspot-border', 'line-opacity', [
                    'case',
                    ['==', ['get', 'id'], selectedHotspot?.id || ''], 1,
                    0 // Filter: Hide unselected
                ]);
            }
        };

        if (map.current.isStyleLoaded()) {
            updateHotspots();
        } else {
            map.current.on('load', updateHotspots);
        }
    }, [selectedHotspot]);

    // Fly to selected hotspot
    useEffect(() => {
        if (selectedHotspot && map.current) {
            map.current.flyTo({
                center: selectedHotspot.boundary_data.center,
                zoom: 17,
                duration: 2000,
                essential: true
            });
        }
    }, [selectedHotspot]);

    const handleReportSubmit = () => {
        // Clear the temporary marker
        if (tempMarker.current) {
            tempMarker.current.remove();
            tempMarker.current = null;
        }

        setClickedCoords(null);
        fetchReports(); // Refresh reports to show the new one

        if (onReportAdded) onReportAdded();
    };

    const handleModalClose = () => {
        setClickedCoords(null);
        // Clean up temp marker if user closes modal without submitting
        if (tempMarker.current) {
            tempMarker.current.remove();
            tempMarker.current = null;
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

            {/* Global Mode Toggle Button */}
            {user && (
                <button
                    onClick={() => {
                        setIsGlobalMode(!isGlobalMode);
                    }}
                    className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-6 py-3 rounded-full font-bold shadow-2xl transition-all flex items-center gap-2 border-2 ${isGlobalMode
                            ? 'bg-white text-black border-black scale-105'
                            : 'bg-black text-white border-white hover:scale-105'
                        }`}
                >
                    {isGlobalMode ? (
                        <>
                            <span className="text-lg">👤</span> My Private Map
                        </>
                    ) : (
                        <>
                            <span className="text-lg">🌍</span> Show Global Data
                        </>
                    )}
                </button>
            )}

            {clickedCoords && (
                <ReportModal
                    coords={clickedCoords}
                    onClose={handleModalClose}
                    onSubmit={handleReportSubmit}
                />
            )}
        </div>
    );
};

export default Map;
