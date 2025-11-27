
import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Maximize, Crosshair, Loader2, AlertTriangle, Building, Trash2, Settings } from 'lucide-react';
import { Branch } from '../types';
import { useNavigate } from 'react-router-dom';
import Autocomplete from './Autocomplete'; // Import the new Autocomplete component

const BranchForm: React.FC = () => {
  const navigate = useNavigate();
  const [branchName, setBranchName] = useState('');
  const [address, setAddress] = useState('');
  const [radius, setRadius] = useState('100');
  
  // Determine Session Context
  const getSessionKey = () => {
    const sessionId = localStorage.getItem('app_session_id') || 'admin';
    return sessionId === 'admin' ? 'branches_data' : `branches_data_${sessionId}`;
  };

  const isSuperAdmin = (localStorage.getItem('app_session_id') || 'admin') === 'admin';

  // Branch List State with Mock Data fallback only for Super Admin
  const [branches, setBranches] = useState<Branch[]>(() => {
    const key = getSessionKey();
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved);
    
    return isSuperAdmin ? [
      {
        id: 'B001',
        name: 'Main Head Office',
        address: 'Connaught Place, New Delhi, Delhi 110001',
        radius: 100,
        lat: 28.6304,
        lng: 77.2177
      },
      {
        id: 'B002',
        name: 'Gurgaon Hub',
        address: 'Cyber City, DLF Phase 2, Gurgaon, Haryana 122002',
        radius: 200,
        lat: 28.4950,
        lng: 77.0895
      }
    ] : [];
  });
  
  // Save to namespaced localStorage whenever branches state changes
  useEffect(() => {
    const key = getSessionKey();
    localStorage.setItem(key, JSON.stringify(branches));
  }, [branches]);
  
  // Map State
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [markerInstance, setMarkerInstance] = useState<any>(null);
  const [location, setLocation] = useState<google.maps.LatLngLiteral>({ lat: 28.6139, lng: 77.2090 }); // Default: New Delhi
  const [isMapReady, setIsMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Callback from Autocomplete component when a place is selected
  const handleNewPlaceSelected = (newPos: google.maps.LatLngLiteral) => {
    setLocation(newPos);
    if (mapInstance && markerInstance) {
      mapInstance.panTo(newPos);
      markerInstance.setPosition(newPos);
      mapInstance.setZoom(17);
    }
    // Also fetch address for the selected place
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results: any, status: any) => {
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          console.warn("Geocoding failed for new place:", status);
        }
      });
    }
  };


  // Load Google Maps Script
  useEffect(() => {
    // 1. Check global failure flag first
    if (window.gm_authFailure_detected) {
      setMapError("Map API Error: Please check required APIs in Google Cloud.");
      return;
    }

    // 2. Handle Missing API Key - Explicitly check LocalStorage only
    const apiKey = localStorage.getItem('maps_api_key');
    if (!apiKey) {
      setMapError("API Key is missing. Please add it in Settings > Integrations.");
      return;
    }

    // 3. Define global auth failure handler
    const originalAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      window.gm_authFailure_detected = true;
      setMapError("Map Load Error: API Key invalid or APIs not enabled (Maps JS, Places, Geocoding).");
      if (originalAuthFailure) originalAuthFailure();
    };

    // 4. Validate Existing Script
    const scriptId = 'google-maps-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement;

    if (script) {
       const src = script.getAttribute('src') || '';
       // CRITICAL FIX: If script exists but key doesn't match the current one in storage,
       // force a reload to clear the old google object and load the new one.
       if (!src.includes(`key=${apiKey}`)) {
          script.remove();
          if (window.google) {
             // We can't safely un-load the Google Maps object, so we must reload the page.
             window.location.reload();
             return;
          }
       }
    }

    // 5. Check if script is already fully loaded
    if (window.google && window.google.maps) {
      setIsMapReady(true);
      return;
    }

    // 6. Inject Script if not present
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        setIsMapReady(true);
      };
      
      script.onerror = () => {
        setMapError("Network error: Failed to load Google Maps script.");
      };

      document.head.appendChild(script);
    } else {
        // Script exists and is correct, just wait for load if not ready
        script.addEventListener('load', () => setIsMapReady(true));
    }

    return () => {
      // Cleanup listeners if needed, though usually harmless to leave
    };
  }, []);

  // Initialize Map
  useEffect(() => {
    if (mapError) return;

    if (isMapReady && mapRef.current && !mapInstance && window.google) {
      try {
        const map = new window.google.maps.Map(mapRef.current, {
          center: location,
          zoom: 15,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        });

        const marker = new window.google.maps.Marker({
          position: location,
          map: map,
          draggable: true,
          animation: window.google.maps.Animation.DROP,
        });

        marker.addListener("dragend", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          setLocation(newPos);
          map.panTo(newPos);
        });

        map.addListener("click", (e: any) => {
          const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
          marker.setPosition(newPos);
          setLocation(newPos);
          map.panTo(newPos);
        });

        setMapInstance(map);
        setMarkerInstance(marker);

      } catch (e) {
        console.error("Error initializing map:", e);
        setMapError("Error initializing map interface. Check Settings.");
      }
    }
  }, [isMapReady, mapError, location]);

  const handleGetAddress = () => {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder || mapError) {
      alert("Map services are currently unavailable. Please enter address manually.");
      return;
    }
    
    setLoadingAddress(true);
    try {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location }, (results: any, status: any) => {
        setLoadingAddress(false);
        if (status === "OK" && results[0]) {
          setAddress(results[0].formatted_address);
        } else {
          console.warn("Geocoding failed:", status);
          alert("Could not fetch address. Please enable 'Geocoding API' in Google Cloud Console.");
        }
      });
    } catch (e) {
      setLoadingAddress(false);
      alert("Error accessing Geocoding service.");
    }
  };

  const handleCurrentLocation = () => {
    if (mapError) return;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(pos);
          if (mapInstance && markerInstance) {
            mapInstance.setCenter(pos);
            markerInstance.setPosition(pos);
            mapInstance.setZoom(17);
          }
        },
        () => {
          alert("Error: The Geolocation service failed or is disabled.");
        }
      );
    } else {
      alert("Error: Your browser doesn't support geolocation.");
    }
  };

  const handleSaveBranch = () => {
    if (!branchName.trim() || !address.trim()) {
      alert("Please enter both branch name and address.");
      return;
    }

    // Check Limit for Franchise Users
    if (!isSuperAdmin && branches.length >= 2) {
        alert("Franchise Plan Limit: You can only create a maximum of 2 branches. Please contact Super Admin to upgrade.");
        return;
    }

    const newBranch: Branch = {
      id: `B${Date.now()}`,
      name: branchName,
      address: address,
      radius: parseInt(radius) || 100,
      lat: location.lat,
      lng: location.lng
    };

    setBranches([...branches, newBranch]);
    setBranchName('');
    setAddress('');
    setRadius('100');
    alert("Branch added successfully!");
  };

  const handleDeleteBranch = (id: string) => {
    if (window.confirm("Are you sure you want to delete this branch?")) {
      setBranches(branches.filter(b => b.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Form Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-medium text-gray-800">Create New Branch</h2>
            {!isSuperAdmin && (
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${branches.length >= 2 ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                    {branches.length} / 2 Branches Used
                </span>
            )}
        </div>
        
        <div className="space-y-6">
          {/* Branch Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
            <input 
              type="text" 
              placeholder="Enter Branch Name"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Branch Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch Address</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={mapError ? "Enter address manually" : "Select location on map or enter manually"}
                className={`flex-1 border border-gray-300 rounded-md px-4 py-3 transition-colors ${mapError ? 'bg-white' : 'bg-gray-50 focus:bg-white'}`}
              />
              <button 
                onClick={handleGetAddress}
                disabled={loadingAddress || !isMapReady || !!mapError}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors shadow-sm whitespace-nowrap flex items-center gap-2"
              >
                {loadingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                Get Address
              </button>
            </div>
            {mapError && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Map services unavailable. Please enter address manually.
              </p>
            )}
          </div>

          {/* Radius */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Radius (in metre)</label>
            <input 
              type="number" 
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Location Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Pin Location on Map</label>
            
            {/* Autocomplete Search - Moved OUTSIDE overflow-hidden container to fix clipping */}
            {!mapError && isMapReady && (
              <div className="relative z-20"> 
                <Autocomplete setNewPlace={handleNewPlaceSelected} />
              </div>
            )}
            
            {/* Map Container */}
            <div className={`border border-gray-300 rounded-lg overflow-hidden shadow-sm ${mapError ? 'bg-gray-50' : ''} relative h-96 w-full`}>
              {mapError ? (
                <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50 p-6 text-center z-10">
                  <div className="flex flex-col items-center gap-3 max-w-sm">
                    <AlertTriangle className="w-10 h-10 text-red-400" />
                    <h3 className="font-medium text-gray-900">Map Loading Failed</h3>
                    <p className="text-sm text-gray-600">{mapError}</p>
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded text-xs text-amber-800 mt-2 text-left w-full">
                       <strong>Troubleshooting "ApiNotActivated":</strong>
                       <ul className="list-disc list-inside mt-1 space-y-1">
                          <li>Enable "Maps JavaScript API"</li>
                          <li>Enable "Places API"</li>
                          <li>Enable "Geocoding API"</li>
                       </ul>
                    </div>
                    <button 
                      onClick={() => navigate('/admin/settings')} 
                      className="mt-2 text-xs flex items-center gap-1 bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="w-3 h-3" /> Configure in Settings
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {!isMapReady && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 bg-gray-50">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span>Loading Google Maps...</span>
                      </div>
                    </div>
                  )}
                  <div ref={mapRef} className="w-full h-full" />
                  
                  {isMapReady && (
                    <div className="absolute top-2 right-2 z-10 flex flex-col gap-2">
                        <button 
                          onClick={handleCurrentLocation}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Use Current Location"
                        >
                          <Crosshair className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => mapInstance?.setZoom(mapInstance.getZoom() + 1)}
                          className="p-2 bg-white rounded-lg text-gray-600 shadow-md hover:bg-gray-50"
                          title="Zoom In"
                        >
                            <Maximize className="w-5 h-5" />
                        </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
              <button 
                onClick={handleSaveBranch}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-md font-medium shadow-md transition-all"
              >
                Save Branch
              </button>
          </div>
        </div>
      </div>

      {/* Branch List Section */}
      <div>
        <h3 className="text-xl font-bold text-gray-800 mb-4">Existing Branches</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {branches.map(branch => (
                <div key={branch.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex justify-between items-start hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-emerald-100 p-2 rounded-lg">
                                <Building className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-lg">{branch.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mb-3 flex items-start gap-2 leading-relaxed">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-400" />
                            {branch.address}
                        </p>
                        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium border border-gray-200">
                            Geofence Radius: {branch.radius}m
                        </span>
                    </div>
                    <button 
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete Branch"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}
            
            {branches.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500 bg-white rounded-xl border border-dashed border-gray-300">
                    No branches added yet. Create one above.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default BranchForm;
