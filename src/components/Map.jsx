import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { supabase } from '../supabaseClient';
import ReportModal from './ReportModal';

const Map = ({ onReportAdded, selectedReport, user }) => {
    const mapContainer = useRef(null);
    const map = useRef(null);
    const [clickedCoords, setClickedCoords] = useState(null);
    const [reports, setReports] = useState([]);
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
        });

        // Click handler for two-step pin placement
        map.current.on('click', (e) => {
            // If there's already a temp marker, don't create a new one on map click
            if (tempMarker.current) return;

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
            el.addEventListener('click', () => {
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

    // Fetch reports from Supabase
    useEffect(() => {
        fetchReports();
    }, [onReportAdded, user]);

    const fetchReports = async () => {
        let query = supabase
            .from('reports')
            .select('*')
            .order('created_at', { ascending: false });

        // If not in admin mode, only fetch current user's reports
        if (!isAdminMode && user) {
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

        // Only show markers in admin view
        if (onReportAdded === undefined) return;

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
            el.style.backgroundColor = report.status === 'resolved' ? '#22C55E' : '#EF4444';
            el.style.cursor = 'pointer';

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([report.lng, report.lat])
                .setPopup(
                    new maplibregl.Popup({ offset: 25 }).setHTML(
                        `<div style="font-family: Inter, sans-serif;">
              <strong>${report.category}</strong><br/>
              ${report.description || 'No description'}<br/>
              <em>Status: ${report.status}</em><br/>
              <small>IP: ${report.user_ip || 'N/A'}</small>
            </div>`
                    )
                )
                .addTo(map.current);

            markers.current.push(marker);
        });
    }, [reports, onReportAdded]);

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
        <>
            <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
            {clickedCoords && (
                <ReportModal
                    coords={clickedCoords}
                    onClose={handleModalClose}
                    onSubmit={handleReportSubmit}
                />
            )}
        </>
    );
};

export default Map;
