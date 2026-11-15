/**
 * Client-side Market Data Service & REST/WebSocket Connector.
 */
import {
  Candle, Quote, Trade, DrawingObject, UserSettings,
  Timeframe, BacktestSession, DataValidationReport,
  EconomicNewsEvent
} from '../types';
import { generateEconomicNewsEvents } from '../utils/economicNews';

export class MarketDataClient {
  private ws: WebSocket | null = null;
  private quoteCallbacks: ((q: Quote) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  private get baseUrl(): string {
    if (typeof window !== 'undefined') {
      return `${window.location.protocol}//${window.location.hostname}:8008`;
    }
    return 'http://127.0.0.1:8008';
  }

  constructor() {
    this.connectWebSocket();
  }

  public subscribeQuote(cb: (q: Quote) => void) {
    this.quoteCallbacks.push(cb);
    return () => {
      this.quoteCallbacks = this.quoteCallbacks.filter(c => c !== cb);
    };
  }

  public subscribeConnection(cb: (connected: boolean) => void) {
    this.connectionCallbacks.push(cb);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(c => c !== cb);
    };
  }

  private connectWebSocket() {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) return;
    this.isConnecting = true;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8008/ws/market`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.connectionCallbacks.forEach(cb => cb(true));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if ((msg.type === 'quote' || msg.type === 'tick') && msg.data) {
            this.quoteCallbacks.forEach(cb => cb(msg.data));
          }
        } catch {
          // Ignore
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.connectionCallbacks.forEach(cb => cb(false));
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
        this.connectionCallbacks.forEach(cb => cb(false));
        if (this.ws) this.ws.close();
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket();
    }, 3000);
  }

  // REST endpoints
  async fetchCandles(timeframe: Timeframe = '1h', range?: string, startTime?: number, endTime?: number): Promise<Candle[]> {
    const params = new URLSearchParams({ timeframe });
    if (range) params.append('range', range);
    if (startTime) params.append('start_time', startTime.toString());
    if (endTime) params.append('end_time', endTime.toString());
    
    const resp = await fetch(`${this.baseUrl}/api/market/candles?${params.toString()}`);
    if (!resp.ok) {
      throw new Error(`Failed to load historical candles: ${resp.statusText}`);
    }
    return resp.json();
  }

  async validateData(timeframe: Timeframe = '1h', range?: string): Promise<DataValidationReport> {
    const params = new URLSearchParams({ timeframe });
    if (range) params.append('range', range);
    const resp = await fetch(`${this.baseUrl}/api/market/validate?${params.toString()}`);
    if (!resp.ok) throw new Error('Validation request failed');
    return resp.json();
  }

  async fetchQuote(): Promise<Quote> {
    const resp = await fetch(`${this.baseUrl}/api/market/quote`);
    if (!resp.ok) throw new Error('Failed to fetch quote');
    return resp.json();
  }

  async fetchNews(startTime: number, endTime: number, minImpact?: string): Promise<EconomicNewsEvent[]> {
    try {
      const params = new URLSearchParams({
        start_time: startTime.toString(),
        end_time: endTime.toString(),
      });
      if (minImpact) params.append('min_impact', minImpact);
      const resp = await fetch(`${this.baseUrl}/api/market/news?${params.toString()}`);
      if (resp.ok) {
        return await resp.json();
      }
    } catch {
      // Fallback
    }
    return generateEconomicNewsEvents(startTime, endTime);
  }

  async fetchTrades(): Promise<Trade[]> {
    const resp = await fetch(`${this.baseUrl}/api/trades`);
    if (!resp.ok) return [];
    return resp.json();
  }

  async saveTrade(trade: Trade): Promise<Trade> {
    const resp = await fetch(`${this.baseUrl}/api/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trade),
    });
    return resp.json();
  }

  async deleteTrade(tradeId: string): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/trades/${tradeId}`, { method: 'DELETE' });
    return resp.ok;
  }

  async fetchDrawings(): Promise<DrawingObject[]> {
    const resp = await fetch(`${this.baseUrl}/api/drawings`);
    if (!resp.ok) return [];
    return resp.json();
  }

  async saveDrawing(drawing: DrawingObject): Promise<DrawingObject> {
    const resp = await fetch(`${this.baseUrl}/api/drawings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(drawing),
    });
    return resp.json();
  }

  async deleteDrawing(drawingId: string): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/drawings/${drawingId}`, { method: 'DELETE' });
    return resp.ok;
  }

  async clearAllDrawings(): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/drawings`, { method: 'DELETE' });
    return resp.ok;
  }

  async fetchSettings(): Promise<UserSettings> {
    const resp = await fetch(`${this.baseUrl}/api/settings`);
    if (!resp.ok) {
      return {
        initial_balance: 10000,
        account_currency: 'USD',
        default_risk_percent: 1,
        default_lot_size: 1,
        spread_pips: 1.2,
        commission_per_lot: 3.5,
        slippage_pips: 0.2,
        active_provider: 'dukascopy',
        timezone: 'UTC',
        time_format: 'adaptive',
        show_seconds: false,
        theme: 'dark',
        conservative_execution: true,
      };
    }
    return resp.json();
  }

  async saveSettings(settings: UserSettings): Promise<UserSettings> {
    const resp = await fetch(`${this.baseUrl}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return resp.json();
  }

  // Sessions API
  async listSessions(): Promise<any[]> {
    const resp = await fetch(`${this.baseUrl}/api/sessions`);
    if (!resp.ok) return [];
    return resp.json();
  }

  async fetchSession(sessionId: string): Promise<BacktestSession> {
    const resp = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`);
    if (!resp.ok) throw new Error('Failed to load session');
    return resp.json();
  }

  async saveSession(session: BacktestSession): Promise<BacktestSession> {
    const resp = await fetch(`${this.baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    return resp.json();
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const resp = await fetch(`${this.baseUrl}/api/sessions/${sessionId}`, { method: 'DELETE' });
    return resp.ok;
  }
}

export const marketClient = new MarketDataClient();
