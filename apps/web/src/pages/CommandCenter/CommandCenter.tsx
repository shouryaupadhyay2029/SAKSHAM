import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  mockIncidents as initialIncidents 
} from '../../data/mockIncidents';
import { 
  mockResources as initialResources 
} from '../../data/mockResources';
import { 
  mockVehicles as initialVehicles 
} from '../../data/mockVehicles';
import { 
  mockShelters as initialShelters 
} from '../../data/mockShelters';
import { MapView } from '../../components/map/MapView';
import type { Incident } from '../../types/incident';
import type { Vehicle } from '../../types/vehicle';
import type { Shelter } from '../../types/shelter';
import { 
  Search, 
  Truck, 
  AlertTriangle, 
  Layers, 
  Navigation, 
  Check, 
  Play, 
  User, 
  Phone,
  X,
  Home
} from 'lucide-react';
import styles from './CommandCenter.module.css';

export const CommandCenter: React.FC = () => {
  // Manage state locally for active interactions
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [resources] = useState(initialResources);
  const [shelters] = useState<Shelter[]>(initialShelters);

  // Selection states
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedShelter, setSelectedShelter] = useState<Shelter | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Layer filters
  const [layerFilters, setLayerFilters] = useState({
    incidents: true,
    resources: true,
    vehicles: true,
    shelters: true,
    routes: true
  });

  // Action: Dispatch Vehicle to Incident
  const handleDispatch = (vehicleId: string, incidentId: string) => {
    const targetIncident = incidents.find(inc => inc.id === incidentId);
    if (!targetIncident) return;

    // Update vehicle destination, status, and cargo
    setVehicles(prevVehicles => 
      prevVehicles.map(veh => 
        veh.id === vehicleId 
          ? {
              ...veh,
              status: 'EN_ROUTE',
              destination: targetIncident.coordinates,
              cargo: `Dispatching for ${targetIncident.type.replace('_', ' ')} relief`,
              speedKmh: 50
            }
          : veh
      )
    );

    // Update incident status to UNDER_RESPONSE
    setIncidents(prevIncidents =>
      prevIncidents.map(inc =>
        inc.id === incidentId
          ? { ...inc, status: 'UNDER_RESPONSE', assignedTeam: `Dispatched ${vehicleId}` }
          : inc
      )
    );

    // Update selected incident detail panel view
    setSelectedIncident(prev => 
      prev && prev.id === incidentId 
        ? { ...prev, status: 'UNDER_RESPONSE', assignedTeam: `Dispatched ${vehicleId}` } 
        : prev
    );
  };

  // Helper: Find matching resources nearby
  const getMatchingResources = (incidentType: string) => {
    switch (incidentType) {
      case 'FLOOD':
        return resources.filter(r => r.category === 'WATER' || r.category === 'RESCUE_EQUIPMENT');
      case 'MEDICAL_EMERGENCY':
        return resources.filter(r => r.category === 'MEDICAL');
      case 'RESOURCE_SHORTAGE':
        return resources.filter(r => r.category === 'FOOD' || r.category === 'CLOTHING' || r.category === 'SHELTER_SUPPLIES');
      default:
        return resources.slice(0, 3);
    }
  };

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesType = typeFilter === 'ALL' || inc.type === typeFilter;
    return matchesSearch && matchesSeverity && matchesType;
  });

  return (
    <div className={styles.container}>
      {/* Sidebar / Left Operations Control Panel */}
      <aside className={styles.controlPanel}>
        <div className={styles.panelHeader}>
          <h3>OPERATIONS PANEL</h3>
          <span className={`${styles.badgeCount} tech-code`}>{filteredIncidents.length} INCIDENTS</span>
        </div>

        {/* Filter Toolbar */}
        <div className={styles.filterToolbar}>
          <div className={styles.searchWrapper}>
            <Search size={16} className={styles.searchIcon} />
            <input 
              type="text" 
              placeholder="Search incidents, zones..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.filterRow}>
            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Severity</option>
              <option value="MEDIUM">Medium Severity</option>
              <option value="LOW">Low Severity</option>
            </select>

            <select 
              value={typeFilter} 
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="ALL">All Types</option>
              <option value="FLOOD">Floods</option>
              <option value="FIRE">Fires</option>
              <option value="MEDICAL_EMERGENCY">Medical</option>
              <option value="STRUCTURAL_COLLAPSE">Collapses</option>
              <option value="RESOURCE_SHORTAGE">Shortages</option>
            </select>
          </div>
        </div>

        {/* Layer Manager */}
        <div className={styles.layerManager}>
          <h4 className={styles.sectionSubtitle}>MAP LAYERS</h4>
          <div className={styles.layerGrid}>
            <button 
              className={`${styles.layerToggle} ${layerFilters.incidents ? styles.layerToggleActive : ''}`}
              onClick={() => setLayerFilters(prev => ({ ...prev, incidents: !prev.incidents }))}
            >
              <AlertTriangle size={14} /> Incidents
            </button>
            <button 
              className={`${styles.layerToggle} ${layerFilters.shelters ? styles.layerToggleActive : ''}`}
              onClick={() => setLayerFilters(prev => ({ ...prev, shelters: !prev.shelters }))}
            >
              <Home size={14} /> Shelters
            </button>
            <button 
              className={`${styles.layerToggle} ${layerFilters.vehicles ? styles.layerToggleActive : ''}`}
              onClick={() => setLayerFilters(prev => ({ ...prev, vehicles: !prev.vehicles }))}
            >
              <Truck size={14} /> Vehicles
            </button>
            <button 
              className={`${styles.layerToggle} ${layerFilters.resources ? styles.layerToggleActive : ''}`}
              onClick={() => setLayerFilters(prev => ({ ...prev, resources: !prev.resources }))}
            >
              <Layers size={14} /> Resources
            </button>
            <button 
              className={`${styles.layerToggle} ${layerFilters.routes ? styles.layerToggleActive : ''}`}
              onClick={() => setLayerFilters(prev => ({ ...prev, routes: !prev.routes }))}
            >
              <Navigation size={14} /> Routes
            </button>
          </div>
        </div>

        {/* Incidents List */}
        <div className={styles.incidentListWrapper}>
          <h4 className={styles.sectionSubtitle}>LIVE ALERTS FEED</h4>
          <div className={styles.incidentList}>
            {filteredIncidents.length === 0 ? (
              <div className={styles.emptyFeed}>No active incidents found.</div>
            ) : (
              filteredIncidents.map((incident) => (
                <div 
                  key={incident.id} 
                  className={`${styles.incidentCard} ${
                    selectedIncident?.id === incident.id ? styles.incidentCardSelected : ''
                  }`}
                  onClick={() => {
                    setSelectedIncident(incident);
                    setSelectedVehicle(null);
                    setSelectedShelter(null);
                  }}
                >
                  <div className={styles.cardHeader}>
                    <span className={`${styles.severityBadge} ${styles['severity' + incident.severity]}`}>
                      {incident.severity}
                    </span>
                    <span className={`${styles.techId} tech-code`}>{incident.id}</span>
                  </div>
                  <h4 className={styles.cardTitle}>{incident.type.replace('_', ' ')}</h4>
                  <p className={styles.cardLoc}>{incident.location}</p>
                  <div className={styles.cardFooter}>
                    <span className={`${styles.statusLabel} ${styles['status' + incident.status]}`}>
                      {incident.status.replace('_', ' ')}
                    </span>
                    <span className={styles.cardTime}>
                      {new Date(incident.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Main Map Workspace Area */}
      <section className={styles.mapWorkspace}>
        <MapView 
          incidents={incidents}
          resources={resources}
          vehicles={vehicles}
          shelters={shelters}
          selectedIncident={selectedIncident}
          selectedVehicle={selectedVehicle}
          onSelectIncident={(inc) => {
            setSelectedIncident(inc);
            setSelectedVehicle(null);
            setSelectedShelter(null);
          }}
          onSelectShelter={(shl) => {
            setSelectedShelter(shl);
            setSelectedIncident(null);
            setSelectedVehicle(null);
          }}
          onSelectVehicle={(veh) => {
            setSelectedVehicle(veh);
            setSelectedIncident(null);
            setSelectedShelter(null);
          }}
          layerFilters={layerFilters}
        />

        {/* Map Legend overlay */}
        <div className={styles.mapLegend}>
          <h5>MAP LEGEND</h5>
          <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.bgCritical}`} /> Critical Incident</div>
          <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.bgWarning}`} /> Warning Incident</div>
          <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.bgSuccess}`} /> Shelter Open</div>
          <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.bgInfo}`} /> Resource Depot</div>
          <div className={styles.legendRow}><span className={`${styles.legendDot} ${styles.bgPrimary}`} /> Vehicle Dispatch</div>
        </div>

        {/* --------------------- INCIDENT DRAWER PANEL --------------------- */}
        <AnimatePresence>
          {selectedIncident && (
            <motion.div 
              className={styles.drawer}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.drawerHeader}>
                <div className={styles.drawerHeaderTitle}>
                  <span className={`${styles.severityBadge} ${styles['severity' + selectedIncident.severity]}`}>
                    {selectedIncident.severity}
                  </span>
                  <h4 className="tech-code">{selectedIncident.id}</h4>
                </div>
                <button onClick={() => setSelectedIncident(null)} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <h3 className={styles.drawerTitle}>{selectedIncident.type.replace('_', ' ')}</h3>
                <p className={styles.drawerLoc}>📍 {selectedIncident.location}</p>
                <div className={styles.drawerSection}>
                  <h5>SITUATION REPORT</h5>
                  <p className={styles.drawerDesc}>{selectedIncident.description}</p>
                </div>

                <div className={styles.drawerContactGrid}>
                  <div>
                    <span className={styles.gridLabel}>REPORTER</span>
                    <span className={styles.gridVal}><User size={12} /> {selectedIncident.reporterName}</span>
                  </div>
                  <div>
                    <span className={styles.gridLabel}>CONTACT</span>
                    <span className={styles.gridVal}><Phone size={12} /> {selectedIncident.reporterContact}</span>
                  </div>
                </div>

                {/* Logistics Allocation Section */}
                <div className={styles.drawerSection}>
                  <h5>DEMAND-SUPPLY MATCHING</h5>
                  <div className={styles.matchingPanel}>
                    <p className={styles.matchHeading}>Nearby Matching Inventory:</p>
                    <div className={styles.matchList}>
                      {getMatchingResources(selectedIncident.type).map(res => (
                        <div key={res.id} className={styles.matchItem}>
                          <div>
                            <span className={styles.matchItemName}>{res.name}</span>
                            <span className={styles.matchItemStock}>{res.quantity} {res.unit} available</span>
                          </div>
                          <span className={styles.matchItemLocation}>{res.locationName.split(',')[0]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Dispatch Section */}
                <div className={styles.drawerSection}>
                  <h5>DISPATCH DISASTER LOGISTICS</h5>
                  {selectedIncident.status === 'UNDER_RESPONSE' ? (
                    <div className={styles.dispatchedBanner}>
                      <Check size={16} />
                      <div>
                        <strong>LOGISTICS DISPATCHED</strong>
                        <p>{selectedIncident.assignedTeam}</p>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.dispatchPanel}>
                      <p className={styles.dispatchText}>Select available emergency fleet truck to dispatch relief supplies:</p>
                      <div className={styles.dispatchList}>
                        {vehicles.filter(v => v.status === 'AVAILABLE').length === 0 ? (
                          <p className={styles.noVehicles}>No vehicles currently available. Release a fleet asset first.</p>
                        ) : (
                          vehicles.filter(v => v.status === 'AVAILABLE').map(vehicle => (
                            <div key={vehicle.id} className={styles.dispatchItem}>
                              <div>
                                <span className={styles.vehName}>{vehicle.name}</span>
                                <span className={styles.vehCap}>Cap: {vehicle.capacity}</span>
                              </div>
                              <button 
                                className={styles.dispatchBtn}
                                onClick={() => handleDispatch(vehicle.id, selectedIncident.id)}
                              >
                                <Play size={10} /> Dispatch
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --------------------- VEHICLE DRAWER PANEL --------------------- */}
        <AnimatePresence>
          {selectedVehicle && (
            <motion.div 
              className={styles.drawer}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.drawerHeader}>
                <div className={styles.drawerHeaderTitle}>
                  <span className={`${styles.statusLabel} ${styles['status' + selectedVehicle.status]}`}>
                    {selectedVehicle.status}
                  </span>
                  <h4 className="tech-code">{selectedVehicle.id}</h4>
                </div>
                <button onClick={() => setSelectedVehicle(null)} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <h3 className={styles.drawerTitle}>{selectedVehicle.name}</h3>
                <p className={styles.drawerLoc}>🚚 Cargo Asset Class: {selectedVehicle.type}</p>
                
                <div className={styles.drawerSection}>
                  <h5>FLEET SPECIFICATIONS</h5>
                  <div className={styles.specGrid}>
                    <div className={styles.specItem}>
                      <span className={styles.gridLabel}>CARGO CAPACITY</span>
                      <span className={styles.gridVal}>{selectedVehicle.capacity}</span>
                    </div>
                    <div className={styles.specItem}>
                      <span className={styles.gridLabel}>CURRENT VELOCITY</span>
                      <span className={styles.gridVal}>{selectedVehicle.speedKmh ? `${selectedVehicle.speedKmh} KM/H` : 'STATIONARY'}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <h5>MISSION STATUS & CARGO</h5>
                  <div className={styles.cargoCard}>
                    <strong>Loaded Cargo:</strong>
                    <p>{selectedVehicle.cargo || 'No cargo loaded. Asset idle.'}</p>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <h5>RESPONSIBLE STAFF</h5>
                  <div className={styles.drawerContactGrid}>
                    <div>
                      <span className={styles.gridLabel}>DRIVER NAME</span>
                      <span className={styles.gridVal}>{selectedVehicle.driverName}</span>
                    </div>
                    <div>
                      <span className={styles.gridLabel}>RADIO CONTACT</span>
                      <span className={styles.gridVal}>{selectedVehicle.driverContact}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --------------------- SHELTER DRAWER PANEL --------------------- */}
        <AnimatePresence>
          {selectedShelter && (
            <motion.div 
              className={styles.drawer}
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.drawerHeader}>
                <div className={styles.drawerHeaderTitle}>
                  <span className={`${styles.statusLabel} ${styles['status' + selectedShelter.status]}`}>
                    SHELTER {selectedShelter.status}
                  </span>
                  <h4 className="tech-code">{selectedShelter.id}</h4>
                </div>
                <button onClick={() => setSelectedShelter(null)} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              <div className={styles.drawerBody}>
                <h3 className={styles.drawerTitle}>{selectedShelter.name}</h3>
                <p className={styles.drawerLoc}>📍 {selectedShelter.locationName}</p>

                <div className={styles.drawerSection}>
                  <h5>CAPACITY LEDGER</h5>
                  <div className={styles.capacityMetric}>
                    <div className={styles.capTextRow}>
                      <span>Occupied Capacity:</span>
                      <strong>{selectedShelter.capacityOccupied} / {selectedShelter.capacityTotal} Beds</strong>
                    </div>
                    <div className={styles.capacityBarLarge}>
                      <div 
                        className={styles.capacityFillLarge} 
                        style={{ width: `${Math.round((selectedShelter.capacityOccupied / selectedShelter.capacityTotal) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <h5>ON-SITE AMENITIES</h5>
                  <div className={styles.amenityList}>
                    {selectedShelter.resourcesAvailable.map((amenity, index) => (
                      <span key={index} className={styles.amenityBadge}>{amenity}</span>
                    ))}
                  </div>
                </div>

                <div className={styles.drawerSection}>
                  <h5>SHELTER REPRESENTATIVE</h5>
                  <div className={styles.drawerContactGrid}>
                    <div>
                      <span className={styles.gridLabel}>IN-CHARGE</span>
                      <span className={styles.gridVal}>{selectedShelter.contactPerson}</span>
                    </div>
                    <div>
                      <span className={styles.gridLabel}>PHONE CONTACT</span>
                      <span className={styles.gridVal}>{selectedShelter.contactNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default CommandCenter;
