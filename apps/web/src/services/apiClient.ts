/**
 * SAKSHAM Centralized API Client Service
 * Bridges React frontend modules to backend REST APIs.
 */

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = 'ApiError';
  }
}

const getApiBaseUrl = () => {
  const url = import.meta.env.VITE_API_URL;
  if (url) {
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  return '/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

const TOKEN_KEY = 'saksham_auth_token';

async function fetchJson<T>(path: string, options?: RequestInit): Promise<{ data: T; meta?: any }> {
  const url = `${API_BASE_URL}${path}`;

  // Automatically inject the officer JWT when present in sessionStorage.
  // authService.ts stores the token under TOKEN_KEY after a successful login.
  const token = sessionStorage.getItem(TOKEN_KEY);
  const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    if (response.status === 401 && sessionStorage.getItem(TOKEN_KEY)) {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem('saksham_auth_session');
      // Redirect to login page to force getting a fresh JWT
      window.location.href = '/officer/login?expired=true';
    }
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody.error?.message || errorBody.detail || `HTTP Error ${response.status}: ${response.statusText}`;
    const code = errorBody.error?.code;
    throw new ApiError(message, response.status, code);
  }


  const json = await response.json();
  if (json && typeof json === 'object' && 'data' in json) {
    return json;
  }
  return { data: json };
}



export const apiClient = {
  // ── Incidents ──
  async getIncidents(params?: { status?: string; severity?: string; search?: string; region?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/incidents${queryString ? `?${queryString}` : ''}`);
  },

  async getIncidentById(id: string) {
    return fetchJson<any>(`/incidents/${id}`);
  },

  async createIncident(data: any) {
    return fetchJson<any>('/incidents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateIncident(id: string, data: any) {
    return fetchJson<any>(`/incidents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateIncidentStatus(id: string, status: string) {
    return fetchJson<any>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getRelatedCandidates(id: string) {
    return fetchJson<any[]>(`/incidents/${id}/candidates`);
  },

  async linkReports(id: string, reportIds: string[]) {
    return fetchJson<any>(`/incidents/${id}/link`, {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    });
  },

  async unlinkReport(id: string, reportId: string, reason: string) {
    return fetchJson<any>(`/incidents/${id}/unlink`, {
      method: 'POST',
      body: JSON.stringify({ reportId, reason }),
    });
  },

  async keepSeparate(id: string, reportIds: string[]) {
    return fetchJson<any>(`/incidents/${id}/keep-separate`, {
      method: 'POST',
      body: JSON.stringify({ reportIds }),
    });
  },

  // ── Demands ──
  async getDemands(params?: { status?: string; priority?: string; incidentId?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/demands${queryString ? `?${queryString}` : ''}`);
  },

  async getDemandById(id: string) {
    return fetchJson<any>(`/demands/${id}`);
  },

  async createDemand(data: any) {
    return fetchJson<any>('/demands', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDemand(id: string, data: any) {
    return fetchJson<any>(`/demands/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async updateDemandStatus(id: string, status: string) {
    return fetchJson<any>(`/demands/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  // ── Resources ──
  async getResources(params?: { category?: string; status?: string; search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/resources${queryString ? `?${queryString}` : ''}`);
  },

  async getResourceById(id: string) {
    return fetchJson<any>(`/resources/${id}`);
  },

  async createResource(data: any) {
    return fetchJson<any>('/resources', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ── Vehicles ──
  async getVehicles(params?: { status?: string; type?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/vehicles${queryString ? `?${queryString}` : ''}`);
  },

  async getVehicleById(id: string) {
    return fetchJson<any>(`/vehicles/${id}`);
  },

  async createVehicle(data: any) {
    return fetchJson<any>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateVehicle(id: string, data: any) {
    return fetchJson<any>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  // ── Shelters ──
  async getShelters(params?: { status?: string; region?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/shelters${queryString ? `?${queryString}` : ''}`);
  },

  async getShelterById(id: string) {
    return fetchJson<any>(`/shelters/${id}`);
  },

  // ── Timelines ──
  async getIncidentTimeline(incidentId: string) {
    return fetchJson<any[]>(`/incidents/${incidentId}/timeline`);
  },

  async createIncidentTimelineEvent(incidentId: string, data: { eventType: string; message: string; actorId?: string; metadata?: any }) {
    return fetchJson<any>(`/incidents/${incidentId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ── Incident Assessment (Officer-only, requires JWT) ──
  async assessIncident(incidentId: string, payload: {
    decision: 'CONFIRMED' | 'NEEDS_INFORMATION' | 'REJECTED';
    assessmentNote: string;
    verificationMethods: string[];
    priorityAssessment?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    rejectionReason?: string;
    infoRequestReason?: string;
  }) {
    return fetchJson<any>(`/incidents/${incidentId}/assess`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getIncidentAssessments(incidentId: string) {
    return fetchJson<any[]>(`/incidents/${incidentId}/assessment`);
  },

  // ── Incident Contact Logs ──
  async getIncidentContacts(incidentId: string) {
    return fetchJson<any[]>(`/incidents/${incidentId}/contacts`);
  },

  async createIncidentContact(incidentId: string, payload: {
    method: 'PHONE' | 'SMS' | 'EMAIL' | 'OTHER';
    outcome: 'CONNECTED' | 'NO_ANSWER' | 'BUSY' | 'INVALID_NUMBER' | 'SENT' | 'FAILED' | 'OTHER';
    note: string;
  }) {
    return fetchJson<any>(`/incidents/${incidentId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Field Verification ──
  async getFieldVerifications(incidentId: string) {
    return fetchJson<any[]>(`/incidents/${incidentId}/field-verification`);
  },

  async createFieldVerification(incidentId: string, payload: { assignedOfficerId: string }) {
    return fetchJson<any>(`/incidents/${incidentId}/field-verification`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateFieldVerification(verificationId: string, payload: {
    status: 'REQUESTED' | 'ASSIGNED' | 'EN_ROUTE' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED';
    observation?: string;
    decision?: 'CONFIRMED' | 'NOT_CONFIRMED' | 'INSUFFICIENT_INFORMATION';
  }) {
    return fetchJson<any>(`/field-verifications/${verificationId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async getAvailableOfficers() {
    return fetchJson<any[]>('/officers/available');
  },

  // ── Matching & Allocations ──
  async getMatchingRecommendations(demandId: string) {
    return fetchJson<any>(`/matching/demands/${demandId}/recommendations`);
  },

  async getAllocations(params?: { status?: string; demandId?: string; resourceId?: string; search?: string; limit?: number; offset?: number }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/allocations${queryString ? `?${queryString}` : ''}`);
  },

  async getAllocation(id: string) {
    return fetchJson<any>(`/allocations/${id}`);
  },

  async createAllocation(data: { demandId: string; resourceId: string; quantity: number; vehicleId?: string }) {
    return fetchJson<any>('/allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async confirmAllocation(data: { demandId: string; resourceId: string; quantity: number }) {
    return fetchJson<{
      allocation: any;
      incident: any;
      demand: any;
      resource: any;
    }>('/allocations/confirm', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },


  async updateAllocationStatus(id: string, status: string, notes?: string) {
    return fetchJson<any>(`/allocations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },

  // ── Optimization & Dispatches ──
  async getDispatchPlan(demandId: string) {
    return fetchJson<any>('/optimization/dispatch-plan', {
      method: 'POST',
      body: JSON.stringify({ demandId }),
    });
  },

  async getDispatches(params?: { status?: string; priority?: string; vehicleId?: string; search?: string }) {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
    }
    const queryString = query.toString();
    return fetchJson<any[]>(`/dispatch${queryString ? `?${queryString}` : ''}`);
  },

  async createDispatch(data: { allocationId: string; vehicleId: string; assignedOfficerId: string; plannedDeparture: string; eta: string; notes?: string }) {
    return fetchJson<any>('/dispatch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateDispatchStatus(id: string, nextStatus: string, notes?: string, officerId?: string) {
    return fetchJson<any>(`/dispatch/${id}/status?nextStatus=${nextStatus}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes, officerId }),
    });
  },

  async updateDispatchRoute(id: string, routeData: any) {
    return fetchJson<any>(`/dispatch/${id}/route`, {
      method: 'PATCH',
      body: JSON.stringify(routeData),
    });
  },

  // ── Deliveries ──
  async getDeliveries() {
    return fetchJson<any[]>('/delivery');
  },

  async updateDeliveryStatus(id: string, status: string, notes?: string, deliveredQty?: number, verifiedBy?: string) {
    return fetchJson<any>(`/delivery/${id}/status?status=${status}`, {
      method: 'PATCH',
      body: JSON.stringify({ notes, deliveredQty, verifiedBy }),
    });
  }
};
export default apiClient;
