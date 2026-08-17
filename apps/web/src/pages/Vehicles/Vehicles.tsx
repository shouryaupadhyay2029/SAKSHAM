import React, { useState } from 'react';
import { Search, Filter, Truck, Radio, MapPin } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Vehicles.module.css';

export const Vehicles: React.FC = () => {
  const { vehicles } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredVehicles = vehicles.filter(veh => {
    const matchesSearch = veh.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          veh.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          veh.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || veh.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={`${styles.container} textureCream`}>
      <div className={styles.header}>
        <div>
          <h2>Emergency Fleet Log</h2>
          <p className={styles.subtext}>Live GPS monitoring and mission dispatch database for NDRF & SDRF transportation units.</p>
        </div>
        <span className={`${styles.counter} tech-code`}>{filteredVehicles.length} Units</span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by vehicle ID, name, driver..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className={styles.grid}>
        {filteredVehicles.length === 0 ? (
          <div className={styles.noRecords}>No fleet vehicles found.</div>
        ) : (
          filteredVehicles.map(veh => (
            <div key={veh.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={`${styles.statusLabel} ${styles['status' + veh.status]}`}>
                  {veh.status.replace('_', ' ')}
                </span>
                <span className="tech-code font-bold">{veh.id}</span>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.titleWrapper}>
                  <Truck size={20} className={styles.truckIcon} />
                  <div>
                    <h3 className={styles.vehName}>{veh.name}</h3>
                    <span className={styles.vehType}>{veh.type} • Capacity: {veh.capacity}</span>
                  </div>
                </div>

                <div className={styles.cargoSection}>
                  <strong>Active Cargo Manifest:</strong>
                  <p>{veh.cargo || 'Empty / No cargo loaded.'}</p>
                </div>

                <div className={styles.gpsSection}>
                  <div className={styles.gpsRow}>
                    <MapPin size={14} className={styles.gpsIcon} />
                    <span>Location: {veh.location.lat.toFixed(4)}° N, {veh.location.lng.toFixed(4)}° E</span>
                  </div>
                  {veh.speedKmh && (
                    <div className={styles.speedBadge}>
                      Speed: <strong>{veh.speedKmh} km/h</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div className={styles.comms}>
                  <Radio size={14} />
                  <span>Radio: {veh.driverContact}</span>
                </div>
                <div className={styles.driverName}>
                  <strong>{veh.driverName}</strong>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Vehicles;
