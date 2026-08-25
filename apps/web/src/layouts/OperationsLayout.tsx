import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  Clock,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  LogOut,
  User,
} from 'lucide-react';
import styles from './OperationsLayout.module.css';
import { ConnectionIndicator } from '../components/ui/SystemStates';
import { useOperationalState, normalizeIncident } from '../context/OperationalStateContext';
import type { DispatchMission, ReliefDelivery } from '../context/OperationalStateContext';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher/LanguageSwitcher';
import { ShaderBackground } from '../components/ui/ShaderBackground';
import { websocketService } from '../services/websocketService';
import type { RealtimeEvent } from '../services/websocketService';
import type { DemandRequest } from '../types/request';

export const OperationsLayout: React.FC = () => {
  const { t } = useTranslation();
  const [time, setTime] = useState(new Date());
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const {
    isOffline,
    addToast,
    incidents,
    setIncidents,
    setRequests,
    setResources,
    setVehicles,
    setMissions,
    setDeliveries,
  } = useOperationalState();
  const { authUser, logout } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('saksham_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = (id: string) => {
    const updated = [...new Set([...readNotifIds, id])];
    setReadNotifIds(updated);
    localStorage.setItem('saksham_read_notifications', JSON.stringify(updated));
  };

  // Sync notifications based on real incidents from DB
  useEffect(() => {
    const reportedIncidents = incidents.filter(
      (inc) => inc.status === 'REPORTED' || inc.status === 'VERIFIED' || inc.status === 'PRIORITIZED'
    );
    const incidentNotifs = reportedIncidents.map((inc) => {
      const notifId = `notif-${inc.id}`;
      return {
        id: notifId,
        title: 'NEW INCIDENT REPORTED',
        message: `${inc.id} · ${inc.type.replace(/_/g, ' ')}`,
        location: inc.location,
        severity: inc.severity,
        time: 'Active',
        incidentId: inc.id,
        read: readNotifIds.includes(notifId) || readNotifIds.includes(inc.id)
      };
    });

    const systemNotifs = [
      {
        id: 'system-notif-2',
        title: 'DEMAND NOTICE',
        message: 'South Depot trauma kit stocks running LOW.',
        time: 'System Alert',
        severity: 'HIGH',
        read: readNotifIds.includes('system-notif-2')
      }
    ];

    // Deduplicate notifications by ID
    const combined = [...incidentNotifs, ...systemNotifs];
    const unique = Array.from(new Map(combined.map(n => [n.id, n])).values());
    setNotifications(unique);
  }, [incidents, readNotifIds]);

  // ─── Single Global WebSocket Connection Lifecycle ─────────────────────────────
  const handleEventRef = useRef<(event: RealtimeEvent) => void>(() => {});

  handleEventRef.current = (event: RealtimeEvent) => {
    console.log('⚡ [Global Realtime Event]:', event);

    switch (event.event) {
      case 'INCIDENT_CREATED': {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        const incData = event.data;
        if (incData && incData.id) {
          const newIncident = normalizeIncident(incData);
          (newIncident as any).uuid = String(incData.id);
          setIncidents((prev) => {
            if (prev.some((item) => item.id === newIncident.id || (item as any).uuid === (newIncident as any).uuid)) return prev;
            return [newIncident, ...prev];
          });

        }
        addToast('WARNING', `CRITICAL INCIDENT: ${incData?.title || event.entityId || 'New Incident Reported'}`);
        break;
      }

      case 'INCIDENT_UPDATED': {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        const incData = event.data;
        if (incData && incData.id) {
          setIncidents((prev) =>
            prev.map((item) =>
              item.id === String(incData.id) || (item as any).uuid === String(incData.id) || item.id === incData.incidentId
                ? {
                    ...item,
                    type: incData.type ?? item.type,
                    severity: incData.severity ?? item.severity,
                    location: incData.location ?? item.location,
                    description: incData.description ?? item.description,
                    status: ((incData.status === 'AWAITING_RESPONSE' || incData.status === 'AWAITING_MATCH') 
                      ? 'PRIORITIZED' 
                      : (incData.status === 'MATCHED' ? 'RESOURCE_MATCHED' : incData.status)) ?? item.status,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );
        }
        break;
      }

      case 'INCIDENT_STATUS_CHANGED': {
        queryClient.invalidateQueries({ queryKey: ['incidents'] });
        const incData = event.data;
        if (incData && incData.id) {
          const mappedStatus = (incData.status === 'AWAITING_RESPONSE' || incData.status === 'AWAITING_MATCH') 
            ? 'PRIORITIZED' 
            : (incData.status === 'MATCHED' ? 'RESOURCE_MATCHED' : incData.status);
          setIncidents((prev) =>
            prev.map((item) =>
              item.id === String(incData.id) || (item as any).uuid === String(incData.id) || item.id === incData.incidentId
                ? {
                    ...item,
                    status: mappedStatus,
                    updatedAt: new Date().toISOString(),
                  }
                : item
            )
          );
          addToast('INFO', `INCIDENT STATUS: ${incData.incidentId || incData.id} is now ${mappedStatus}`);
        }
        break;
      }

      case 'DEMAND_CREATED': {
        queryClient.invalidateQueries({ queryKey: ['demands'] });
        const demData = event.data;
        if (demData && demData.id) {
          const newRequest: DemandRequest = {
            id: demData.requestId || String(demData.id),
            incidentId: demData.incidentId || 'INC-GENERAL',
            zoneName: demData.affectedZone || 'Delhi Relief Zone',
            coordinates: { lat: 28.6139, lng: 77.2090 },
            itemNeeded: demData.requestedType || 'Supplies',
            category: demData.requestedType || 'FOOD',
            quantity: demData.quantity || 100,
            unit: demData.unit || 'Units',
            priority: demData.priority || 'HIGH',
            affectedCount: demData.affectedPeople || 50,
            status: demData.status || 'PENDING',
            requestedAt: demData.createdAt || new Date().toISOString(),
          };
          (newRequest as any).uuid = String(demData.id);
          setRequests((prev) => {
            if (prev.some((r) => r.id === newRequest.id || (r as any).uuid === (newRequest as any).uuid)) return prev;
            return [newRequest, ...prev];
          });
          addToast('INFO', `DEMAND REQUEST: New ${demData.requestedType || 'supply'} demand logged (${demData.requestId || demData.id})`);
        }
        break;
      }

      case 'DEMAND_UPDATED': {
        queryClient.invalidateQueries({ queryKey: ['demands'] });
        const demData = event.data;
        if (demData && demData.id) {
          setRequests((prev) =>
            prev.map((r) =>
              r.id === String(demData.id) || (r as any).uuid === String(demData.id) || r.id === demData.requestId
                ? {
                    ...r,
                    status: demData.status ?? r.status,
                    quantity: demData.quantity ?? r.quantity,
                    priority: demData.priority ?? r.priority,
                  }
                : r
            )
          );
        }
        break;
      }

      case 'ALLOCATION_CREATED': {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
        queryClient.invalidateQueries({ queryKey: ['matching'] });
        addToast('INFO', `ALLOCATION REQUESTED: Matching allocation ${event.entityId}`);
        break;
      }

      case 'ALLOCATION_APPROVED': {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
        queryClient.invalidateQueries({ queryKey: ['demands'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        const allocData = event.data;
        addToast('SUCCESS', `ALLOCATION APPROVED: Allocation ${allocData?.allocationId || event.entityId} confirmed`);
        break;
      }

      case 'ALLOCATION_REJECTED': {
        queryClient.invalidateQueries({ queryKey: ['allocations'] });
        queryClient.invalidateQueries({ queryKey: ['demands'] });
        addToast('WARNING', `ALLOCATION REJECTED: Allocation ${event.entityId} rejected`);
        break;
      }

      case 'DISPATCH_CREATED': {
        queryClient.invalidateQueries({ queryKey: ['dispatches'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        const dispData = event.data;
        if (dispData && dispData.id) {
          const newMission: DispatchMission = {
            id: String(dispData.id),
            requestId: dispData.allocationId || 'ALLOC-GEN',
            vehicleId: dispData.vehicleId || 'VEH-TR-101',
            status: dispData.status || 'DISPATCHED',
            destinationName: dispData.destination || 'Relief Target',
            resourceType: 'Emergency Cargo',
            quantity: 1000,
            unit: 'Units',
            etaMinutes: 20,
            operatorName: dispData.assignedOfficer || 'Officer',
            speedKmh: 45,
            distanceKm: 5.0,
            signalStrength: 95,
            fuelPct: 80,
            trafficLevel: 'MODERATE',
            routePath: [dispData.origin || 'Depot', dispData.destination || 'Site'],
            timeline: [
              {
                time: new Date().toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'Asia/Kolkata',
                }),
                title: 'DISPATCH AUTHORIZED',
                done: true,
              },
            ],
          };
          setMissions((prev) => {
            if (prev.some((m) => m.id === newMission.id)) return prev;
            return [newMission, ...prev];
          });
        }
        addToast('INFO', `DISPATCH INITIATED: Mission ${dispData?.dispatchId || event.entityId} authorized`);
        break;
      }

      case 'DISPATCH_STATUS_CHANGED': {
        queryClient.invalidateQueries({ queryKey: ['dispatches'] });
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        const dispData = event.data;
        if (dispData && dispData.id) {
          setMissions((prev) =>
            prev.map((m) =>
              m.id === String(dispData.id)
                ? {
                    ...m,
                    status: dispData.status,
                  }
                : m
            )
          );
          addToast('INFO', `DISPATCH STATUS: Mission ${dispData.dispatchId || dispData.id} status is now ${dispData.status}`);
        }
        break;
      }

      case 'DELIVERY_CREATED': {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        const delData = event.data;
        if (delData && delData.id) {
          const newDelivery: ReliefDelivery = {
            id: String(delData.id),
            dispatchId: delData.dispatchId || 'DSP-001',
            demandId: 'DEM-001',
            incidentId: 'INC-001',
            resourceId: 'RES-001',
            vehicleId: 'VEH-001',
            requestedQty: delData.quantity || 100,
            allocatedQty: delData.quantity || 100,
            deliveredQty: 0,
            unit: delData.unit || 'Units',
            status: delData.status || 'PENDING',
            resourceType: 'Relief Cargo',
            destinationName: 'Relief Site',
          };
          setDeliveries((prev) => {
            if (prev.some((d) => d.id === newDelivery.id)) return prev;
            return [newDelivery, ...prev];
          });
        }
        break;
      }

      case 'DELIVERY_STATUS_CHANGED': {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        const delData = event.data;
        if (delData && delData.id) {
          setDeliveries((prev) =>
            prev.map((d) =>
              d.id === String(delData.id) || (d as any).uuid === String(delData.id) || d.id === delData.deliveryId
                ? {
                    ...d,
                    status: delData.status,
                  }
                : d
            )
          );
          addToast('SUCCESS', `DELIVERY UPDATE: ${delData.deliveryId || delData.id} status changed to ${delData.status}`);
        }
        break;
      }

      case 'RESOURCE_UPDATED': {
        queryClient.invalidateQueries({ queryKey: ['resources'] });
        const resData = event.data;
        if (resData && resData.id) {
          setResources((prev) =>
            prev.map((r) =>
              r.id === String(resData.id) || (r as any).uuid === String(resData.id) || r.id === resData.resourceId
                ? {
                    ...r,
                    quantity: resData.availableQuantity ?? r.quantity,
                    status: resData.status ?? r.status,
                    lastUpdated: new Date().toISOString(),
                  }
                : r
            )
          );
        }
        break;
      }

      case 'VEHICLE_STATUS_CHANGED': {
        queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        const vehData = event.data;
        if (vehData && vehData.id) {
          setVehicles((prev) =>
            prev.map((v) =>
              v.id === String(vehData.id) || (v as any).uuid === String(vehData.id) || v.id === vehData.vehicleId
                ? {
                    ...v,
                    status: vehData.status ?? v.status,
                    speedKmh: vehData.speed ?? v.speedKmh,
                  }
                : v
            )
          );
        }
        break;
      }

      default:
        break;
    }
  };

  useEffect(() => {
    // Connect single WebSocket client on layout mount
    websocketService.connect((event) => handleEventRef.current(event));

    return () => {
      // Disconnect cleanly when OperationsLayout unmounts
      websocketService.disconnect();
    };
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close popovers on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDelhiTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  const formatDelhiDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      timeZone: 'Asia/Kolkata'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems: { path: string; label: string; badge?: string }[] = [
    { path: '/operations/command-center', label: t('navigation.commandCenter') },
    { path: '/operations/matching', label: t('navigation.matching') },
    { path: '/operations/dispatch', label: t('navigation.dispatch') },
    { path: '/operations/delivery', label: t('navigation.delivery') }
  ];

  // Role display label
  const roleLabel = authUser?.role === 'REGIONAL_AUTHORITY'
    ? 'REG. AUTHORITY'
    : authUser?.role ?? 'OFFICER';

  return (
    <div className={styles.layout}>

      {/* Top navigation system */}
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          {/* Main Horizontal Operations Menu */}
          <nav className={styles.navMenu}>
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `${styles.navMenuLink} ${isActive ? styles.navMenuLinkActive : ''}`
                }
              >
                {item.label}
                {item.badge && <span className={styles.navMenuBadge}>{item.badge}</span>}
                <span className={styles.activeIndicator} />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.topbarRight}>
          <LanguageSwitcher variant="navbar" />
          <ConnectionIndicator isOffline={isOffline} />

          {/* Delhi Operational Clock */}
          <div className={styles.clockArea}>
            <Clock size={13} className={styles.clockIcon} />
            <span className={`${styles.clockTime} tech-code`}>{formatDelhiTime(time)}</span>
            <span className={styles.clockZone}>IST</span>
            <span className={styles.clockDivider}>|</span>
            <span className={styles.clockDate}>{formatDelhiDate(time)}</span>
          </div>

          {/* Notifications */}
          <div className={styles.actionBtnWrapper} ref={notifRef}>
            <button
              className={styles.iconBtn}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={t('navigation.systemAlerts')}
            >
              <Bell size={15} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className={styles.notificationBadge}>{notifications.filter(n => !n.read).length}</span>
              )}
            </button>

            <div className={`${styles.notificationsDropdown} ${notificationsOpen ? styles.notificationsDropdownOpen : ''}`}>
              <div className={styles.dropdownHeader}>
                <h4>{t('alertsDrawer.title')}</h4>
                <button onClick={() => setNotificationsOpen(false)}>{t('common.close')}</button>
              </div>
              <div className={styles.dropdownContent} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.alertItem} ${
                      item.severity === 'CRITICAL' ? styles.alertCritical : item.severity === 'HIGH' ? styles.alertWarning : styles.alertInfo
                    }`}
                    style={{ cursor: item.incidentId ? 'pointer' : 'default', opacity: item.read ? 0.55 : 1 }}
                    onClick={() => {
                      markAsRead(item.id);
                      if (item.incidentId) {
                        navigate(`/operations/incidents/${item.incidentId}`);
                        setNotificationsOpen(false);
                      }
                    }}
                  >
                    {!item.read && <span className={styles.alertDot} />}
                    <div className={styles.alertBody}>
                      <p><strong>{item.title} {item.read && '(Read)'}</strong></p>
                      <p>{item.message}</p>
                      {item.location && <p style={{ fontSize: '10px', opacity: 0.7 }}>📍 {item.location}</p>}
                      <span className={styles.alertTime}>{item.time}</span>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div style={{ padding: '16px', textAlign: 'center', opacity: 0.6 }}>No new notifications</div>
                )}
              </div>
            </div>
          </div>

          {/* User profile dropdown */}
          <div className={styles.actionBtnWrapper} ref={profileRef}>
            <button
              className={styles.profileTrigger}
              onClick={() => setProfileOpen(!profileOpen)}
              aria-expanded={profileOpen}
              aria-label="User profile and logout"
            >
              <div className={styles.profileBadge}>
                <ShieldCheck size={12} className={styles.shieldIcon} />
                <span>{roleLabel}</span>
              </div>
              <div className={styles.profileAvatar}>
                <User size={13} />
              </div>
              <ChevronDown size={11} className={`${styles.profileChevron} ${profileOpen ? styles.profileChevronOpen : ''}`} />
            </button>

            {/* Profile dropdown */}
            <div className={`${styles.profileDropdown} ${profileOpen ? styles.profileDropdownOpen : ''}`}>
              <div className={styles.profileDropdownInfo}>
                <span className={styles.profileName}>{authUser?.name ?? t('navigation.officialRole')}</span>
                <span className={styles.profileRole}>{authUser?.role?.replace('_', ' ') ?? 'OPERATOR'}</span>
                <span className={styles.profileRegion}>{authUser?.region ?? '—'}</span>
                <span className={styles.profileOrg}>{authUser?.organization ?? '—'}</span>
              </div>
              <div className={styles.profileDropdownDivider} />
              <button
                className={styles.logoutBtn}
                onClick={handleLogout}
              >
                <LogOut size={13} />
                <span>{t('navigation.logout')}</span>
              </button>
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            className={styles.mobileMenuToggle}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-expanded={isMobileOpen}
            aria-label="Toggle navigation"
          >
            {isMobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <div className={`${styles.mobileDrawer} ${isMobileOpen ? styles.mobileDrawerOpen : ''}`}>
        <ShaderBackground style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.85, pointerEvents: 'none', zIndex: 0 }} />
        <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', width: '100%', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <LanguageSwitcher variant="mobile" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `${styles.mobileNavLink} ${isActive ? styles.mobileNavLinkActive : ''}`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
          <button className={styles.mobileLogoutBtn} onClick={handleLogout}>
            <LogOut size={13} />
            {t('navigation.logout')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.bodyContainer}>
        <main className={styles.mainContent}>
          <div
            key={location.pathname}
            className={`${styles.contentWrapper} ${styles.animatePageIn}`}
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default OperationsLayout;
