import React, { useState } from 'react';
import { mockIncidents } from '../../data/mockIncidents';
import type { Incident } from '../../types/incident';
import { Search, Filter, AlertTriangle } from 'lucide-react';
import styles from './Incidents.module.css';

export const Incidents: React.FC = () => {
  const [incidents] = useState<Incident[]>(mockIncidents);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredIncidents = incidents.filter(inc => {
    const matchesSearch = inc.location.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          inc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          inc.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === 'ALL' || inc.severity === severityFilter;
    const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2>Incident Reports Registry</h2>
          <p className={styles.subtext}>Master operational ledger of reported emergency incidents across the Delhi NCR region.</p>
        </div>
        <span className={`${styles.counter} tech-code`}>{filteredIncidents.length} Records</span>
      </div>

      {/* Registry Controls */}
      <div className={styles.controls}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Search by ID, location, or report description..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.filterGroup}>
          <div className={styles.filterItem}>
            <Filter size={14} />
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)}>
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className={styles.filterItem}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_RESPONSE">Under Response</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Registry Grid / Table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Incident ID</th>
              <th>Incident Category</th>
              <th>Severity</th>
              <th>Geographic Location</th>
              <th>Report Timestamp</th>
              <th>Assigned Team</th>
              <th>Operation Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredIncidents.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.noRecords}>No incidents match current operational filters.</td>
              </tr>
            ) : (
              filteredIncidents.map(inc => (
                <tr key={inc.id}>
                  <td className="tech-code font-bold">{inc.id}</td>
                  <td>
                    <div className={styles.typeCol}>
                      <AlertTriangle size={14} className={styles['icon' + inc.severity]} />
                      <span>{inc.type.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.severityBadge} ${styles['severity' + inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td>{inc.location}</td>
                  <td className="tech-code">{new Date(inc.time).toLocaleString()}</td>
                  <td>{inc.assignedTeam || 'UNASSIGNED'}</td>
                  <td>
                    <span className={`${styles.statusLabel} ${styles['status' + inc.status]}`}>
                      {inc.status.replace('_', ' ')}
                    </span>
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

export default Incidents;
