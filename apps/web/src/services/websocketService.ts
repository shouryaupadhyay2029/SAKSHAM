export type RealtimeEvent = {
  event: string;
  timestamp: string;
  entityType: string;
  entityId?: string | null;
  data: any;
};

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL ||
  ((window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host + '/api/v1/ws');

class WebSocketService {
  private socket: WebSocket | null = null;

  connect(
    onMessage: (event: RealtimeEvent) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ) {
    // 1. Guard against duplicate connection attempts if active or connecting
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    // 2. Retrieve token from canonical storage key
    const token = sessionStorage.getItem('saksham_auth_token') || '';

    // 3. Defer connection if unauthenticated
    if (!token) {
      console.warn('[WebSocket] Unauthenticated: No saksham_auth_token found. Connection deferred.');
      return;
    }

    const url = `${WS_BASE_URL}?token=${encodeURIComponent(token)}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('⚡ [WebSocket] Connection established successfully');
    };

    this.socket.onmessage = (message) => {
      try {
        const event: RealtimeEvent = JSON.parse(message.data);
        console.log('⚡ [WebSocket] Event received:', event.event, event.entityId || '');
        onMessage(event);
      } catch (error) {
        console.error('[WebSocket] Failed to parse event payload:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('[WebSocket] Connection error:', error);
      if (onError) {
        onError(error);
      }
    };

    this.socket.onclose = (evt) => {
      console.log(`[WebSocket] Connection closed (code: ${evt.code})`);
      this.socket = null;
      if (onClose) {
        onClose();
      }
    };
  }

  disconnect() {
    if (this.socket) {
      const sock = this.socket;
      this.socket = null;

      // Detach listeners to prevent spurious 1006 abnormal close logs on intentional disconnect
      sock.onopen = null;
      sock.onmessage = null;
      sock.onerror = null;
      sock.onclose = null;

      if (sock.readyState === WebSocket.OPEN || sock.readyState === WebSocket.CONNECTING) {
        try {
          sock.close(1000, 'Normal Closure');
        } catch {
          // ignore
        }
      }
    }
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();

export default websocketService;
