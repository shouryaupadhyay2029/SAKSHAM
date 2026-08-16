import React, { useState } from 'react';
import { mockResources } from '../../data/mockResources';
import type { ResourceItem } from '../../types/resource';
import { Search, Filter, Package, MapPin } from 'lucide-react';
import styles from './Resources.module.css';

export const Resources: React.FC = () => {
  const [resources] = useState<ResourceItem[]>(mockResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          res.locationName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || res.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || res.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Resource Stock Registry</h2>
          <p className={styles.subtext}>Live inventory tracker for disaster relief supplies stored across Delhi regional depots.</p>
        </div>
        <span className={`${styles.counter} tech-code`}>{filteredResources.length} Records</span>
      </div>

      {/* Registry Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search resources, depots, locations..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <Filter size={14} />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="ALL">All Categories</option>
              <option value="WATER">Water Supply</option>
              <option value="FOOD">Food Rations</option>
              <option value="MEDICAL">Medical Kits</option>
              <option value="SHELTER_SUPPLIES">Shelter Supplies</option>
              <option value="CLOTHING">Clothing & Blankets</option>
              <option value="RESCUE_EQUIPMENT">Rescue Equipment</option>
              <option value="VEHICLES">Response Vehicles</option>
              <option value="OTHER">Other Goods</option>
            </select>
          </div>

          <div className={styles.filterItem}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="LOW">Low Stock</option>
              <option value="RESERVED">Reserved</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="DEPLETED">Depleted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Resource ID</th>
              <th>Material Description</th>
              <th>Category</th>
              <th>Available Stock</th>
              <th>Storage Depot</th>
              <th>Operational Status</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {filteredResources.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.noRecords}>No items match current filters.</td>
              </tr>
            ) : (
              filteredResources.map(res => (
                <tr key={res.id}>
                  <td className="tech-code font-bold">{res.id}</td>
                  <td>
                    <div className={styles.nameCol}>
                      <Package size={16} className={styles.materialIcon} />
                      <div>
                        <strong>{res.name}</strong>
                        <span className={styles.contactInfo}>POC: {res.contactPerson} ({res.contactNumber})</span>
                      </div>
                    </div>
                  </td>
                  <td className="tech-code font-medium">{res.category}</td>
                  <td>
                    <strong className="tech-code">{res.quantity.toLocaleString()}</strong> {res.unit}
                  </td>
                  <td>
                    <div className={styles.depotCol}>
                      <MapPin size={12} />
                      <span>{res.locationName}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.statusLabel} ${styles['status' + res.status]}`}>
                      {res.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="tech-code">{new Date(res.lastUpdated).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Resources;
