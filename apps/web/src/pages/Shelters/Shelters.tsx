import React, { useState } from 'react';
import { mockShelters } from '../../data/mockShelters';
import type { Shelter } from '../../types/shelter';
import { Search, Filter, Home, CheckCircle2, User, Phone } from 'lucide-react';
import styles from './Shelters.module.css';

export const Shelters: React.FC = () => {
  const [shelters] = useState<Shelter[]>(mockShelters);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredShelters = shelters.filter(shl => {
    const matchesSearch = shl.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          shl.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || shl.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Shelter & Transit Network</h2>
          <p className={styles.subtext}>Active temporary safe camps, dormitory occupancy levels, and available facilities ledger.</p>
        </div>
        <span className={`${styles.counter} tech-code`}>{filteredShelters.length} Facilities</span>
      </div>

      {/* Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by shelter name or community sector..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <Filter size={14} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Only</option>
              <option value="FULL">Fully Occupied</option>
              <option value="CLOSED">Decommissioned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Shelters */}
      <div className={styles.grid}>
        {filteredShelters.length === 0 ? (
          <div className={styles.noRecords}>No shelter facilities match current criteria.</div>
        ) : (
          filteredShelters.map(shl => {
            const occPct = Math.round((shl.capacityOccupied / shl.capacityTotal) * 100);
            return (
              <div key={shl.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <span className={`${styles.statusLabel} ${styles['status' + shl.status]}`}>
                    {shl.status}
                  </span>
                  <span className="tech-code font-bold">{shl.id}</span>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.titleArea}>
                    <Home size={20} className={styles.homeIcon} />
                    <div>
                      <h3 className={styles.shelterName}>{shl.name}</h3>
                      <span className={styles.shelterLoc}>📍 {shl.locationName}</span>
                    </div>
                  </div>

                  {/* Occupancy Indicator */}
                  <div className={styles.occupancyPanel}>
                    <div className={styles.occupancyText}>
                      <span className={styles.occLabel}>Occupancy Status</span>
                      <span className="tech-code font-bold">{shl.capacityOccupied} / {shl.capacityTotal} Beds ({occPct}%)</span>
                    </div>
                    <div className={styles.capacityBar}>
                      <div 
                        className={`${styles.capacityFill} ${occPct > 90 ? styles.fillRed : occPct > 70 ? styles.fillOrange : styles.fillGreen}`} 
                        style={{ width: `${occPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className={styles.amenities}>
                    <strong>Available Facilities:</strong>
                    <div className={styles.amenitiesGrid}>
                      {shl.resourcesAvailable.length === 0 ? (
                        <span className={styles.noAmenities}>No amenities logged.</span>
                      ) : (
                        shl.resourcesAvailable.map((res, index) => (
                          <div key={index} className={styles.amenityItem}>
                            <CheckCircle2 size={12} className={styles.checkIcon} />
                            <span>{res}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <div className={styles.contactItem}>
                    <User size={12} />
                    <span>{shl.contactPerson}</span>
                  </div>
                  <div className={styles.contactItem}>
                    <Phone size={12} />
                    <span>{shl.contactNumber}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Shelters;
