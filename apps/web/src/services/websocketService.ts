export type RealtimeEvent = {
  event: string;
  timestamp: string;
  entityType: string;
  entityId?: string | null;
  data: any;
};

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/api/v1/ws';

class WebSocketService {
  private socket: WebSocket | null = null;

  connect(
    onMessage: (event: RealtimeEvent) => void,
    onError?: (error: Event) => void,
    onClose?: () => void
  ) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    // Read token from sessionStorage or localStorage to support authentication handshake
    const token = sessionStorage.getItem('saksham_auth_token') || '';
    const url = token ? `${WS_BASE_URL}?token=${token}` : WS_BASE_URL;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('Frontend WebSocket connected');
    };

    this.socket.onmessage = (message) => {
      try {
        const event: RealtimeEvent = JSON.parse(message.data);
        console.log('Realtime event received:', event);
        onMessage(event);
      } catch (error) {
        console.error('Failed to parse WebSocket event:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Frontend WebSocket error:', error);

      if (onError) {
        onError(error);
      }
    };

    this.socket.onclose = () => {
      console.log('Frontend WebSocket disconnected');

      if (onClose) {
        onClose();
      }
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const websocketService = new WebSocketService();

export default websocketService;
