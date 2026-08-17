import React, { useState } from 'react';
import { Search, Filter, FileText } from 'lucide-react';
import { useOperationalState } from '../../context/OperationalStateContext';
import styles from './Requests.module.css';

export const Requests: React.FC = () => {
  const { requests } = useOperationalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.zoneName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          req.itemNeeded.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          req.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'ALL' || req.priority === priorityFilter;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  return (
    <div className={`${styles.container} textureCream`}>
      <div className={styles.header}>
        <div>
          <h2>Civilian Demand Requests Ledger</h2>
          <p className={styles.subtext}>Consolidated log of civilian emergency requests, matched allocations, and ETA logistics.</p>
        </div>
        <span className={`${styles.counter} tech-code`}>{filteredRequests.length} Records</span>
      </div>

      {/* Registry Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search request ID, zone name, item needed..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <Filter size={14} />
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
          </div>

          <div className={styles.filterItem}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ALLOCATED">Allocated</option>
              <option value="DISPATCHED">Dispatched</option>
              <option value="FULFILLED">Fulfilled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Affected Zone</th>
              <th>Demanded Relief Material</th>
              <th>Priority</th>
              <th>Est. Affected People</th>
              <th>Matching Status</th>
              <th>ETA / Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.noRecords}>No demand requests match current criteria.</td>
              </tr>
            ) : (
              filteredRequests.map(req => (
                <tr key={req.id}>
                  <td className="tech-code font-bold">{req.id}</td>
                  <td>{req.zoneName}</td>
                  <td>
                    <div className={styles.itemCol}>
                      <FileText size={14} className={styles.itemIcon} />
                      <strong>{req.quantity.toLocaleString()} {req.unit}</strong> of {req.itemNeeded}
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.priorityBadge} ${styles['priority' + req.priority]}`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="tech-code font-medium">{req.affectedCount.toLocaleString()}</td>
                  <td>
                    <span className={`${styles.statusLabel} ${styles['status' + req.status]}`}>
                      {req.status}
                    </span>
                  </td>
                  <td>
                    {req.status === 'FULFILLED' ? (
                      <span className={styles.fulfilledText}>✓ Mission Fulfilled</span>
                    ) : req.eta ? (
                      <span className={styles.etaText}>🕒 En Route (ETA: {req.eta})</span>
                    ) : (
                      <span className={styles.pendingText}>Awaiting Matching Depot</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Requests;
