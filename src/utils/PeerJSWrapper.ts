import Peer, { DataConnection } from 'peerjs';

export interface RobotControlMessage {
  type: 'move' | 'rotate' | 'joint' | 'gripper' | 'ping';
  data: any;
  timestamp: number;
}

export interface PeerJSWrapperOptions {
  onReceive?: (message: RobotControlMessage) => void;
  onConnectionOpen?: (peerId: string) => void;
  onConnectionClose?: () => void;
  onError?: (error: Error) => void;
}

/**
 * PeerJS Wrapper for bidirectional communication
 * 
 * Due to a bug in PeerJS that only allows one-way communication,
 * this wrapper creates two separate PeerJS instances:
 * - One for sending data (outbound)
 * - One for receiving data (inbound)
 */
export class PeerJSWrapper {
  private sendPeer: Peer | null = null;
  private receivePeer: Peer | null = null;
  private sendConnection: DataConnection | null = null;
  private receiveConnection: DataConnection | null = null;
  
  private options: PeerJSWrapperOptions;
  private isInitialized = false;
  
  public sendPeerId: string | null = null;
  public receivePeerId: string | null = null;

  constructor(options: PeerJSWrapperOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the wrapper with two peer instances
   * @param sendPeerIdPrefix - Optional prefix for send peer ID
   * @param receivePeerIdPrefix - Optional prefix for receive peer ID
   */
  async initialize(sendPeerIdPrefix = 'robot-send', receivePeerIdPrefix = 'robot-receive'): Promise<void> {
    if (this.isInitialized) {
      throw new Error('PeerJSWrapper is already initialized');
    }

    return new Promise((resolve, reject) => {
      let sendReady = false;
      let receiveReady = false;

      const checkBothReady = () => {
        if (sendReady && receiveReady) {
          this.isInitialized = true;
          resolve();
        }
      };

      // Create send peer
      this.sendPeer = new Peer(`${sendPeerIdPrefix}-${this.generateId()}`);
      
      this.sendPeer.on('open', (id) => {
        this.sendPeerId = id;
        console.log(`Send Peer initialized with ID: ${id}`);
        sendReady = true;
        checkBothReady();
      });

      this.sendPeer.on('error', (err) => {
        console.error('Send Peer error:', err);
        this.options.onError?.(err as Error);
        reject(err);
      });

      // Create receive peer
      this.receivePeer = new Peer(`${receivePeerIdPrefix}-${this.generateId()}`);
      
      this.receivePeer.on('open', (id) => {
        this.receivePeerId = id;
        console.log(`Receive Peer initialized with ID: ${id}`);
        receiveReady = true;
        checkBothReady();
      });

      this.receivePeer.on('connection', (conn) => {
        this.handleIncomingConnection(conn);
      });

      this.receivePeer.on('error', (err) => {
        console.error('Receive Peer error:', err);
        this.options.onError?.(err as Error);
        reject(err);
      });
    });
  }

  /**
   * Connect to a remote peer for sending data
   * @param remotePeerId - The peer ID to connect to
   */
  connectToRemote(remotePeerId: string): Promise<void> {
    if (!this.sendPeer || !this.isInitialized) {
      throw new Error('PeerJSWrapper not initialized. Call initialize() first.');
    }

    return new Promise((resolve, reject) => {
      const conn = this.sendPeer!.connect(remotePeerId, {
        reliable: true,
      });

      conn.on('open', () => {
        this.sendConnection = conn;
        console.log(`Connected to remote peer: ${remotePeerId}`);
        this.options.onConnectionOpen?.(remotePeerId);
        resolve();
      });

      conn.on('error', (err) => {
        console.error('Connection error:', err);
        this.options.onError?.(err as Error);
        reject(err);
      });

      conn.on('close', () => {
        console.log('Send connection closed');
        this.sendConnection = null;
        this.options.onConnectionClose?.();
      });
    });
  }

  /**
   * Handle incoming connection for receiving data
   */
  private handleIncomingConnection(conn: DataConnection): void {
    console.log(`Incoming connection from: ${conn.peer}`);
    
    conn.on('open', () => {
      this.receiveConnection = conn;
      console.log(`Receive connection established with: ${conn.peer}`);
    });

    conn.on('data', (data) => {
      try {
        const message = data as RobotControlMessage;
        console.log('Received message:', message);
        this.options.onReceive?.(message);
      } catch (error) {
        console.error('Error processing received data:', error);
      }
    });

    conn.on('close', () => {
      console.log('Receive connection closed');
      this.receiveConnection = null;
    });

    conn.on('error', (err) => {
      console.error('Receive connection error:', err);
      this.options.onError?.(err as Error);
    });
  }

  /**
   * Send a message to the connected remote peer
   * @param message - The message to send
   */
  send(message: RobotControlMessage): void {
    if (!this.sendConnection || !this.sendConnection.open) {
      console.warn('No active send connection. Message not sent.');
      return;
    }

    try {
      message.timestamp = Date.now();
      this.sendConnection.send(message);
      console.log('Sent message:', message);
    } catch (error) {
      console.error('Error sending message:', error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Check if connected for sending
   */
  isConnectedForSending(): boolean {
    return this.sendConnection !== null && this.sendConnection.open;
  }

  /**
   * Check if connected for receiving
   */
  isConnectedForReceiving(): boolean {
    return this.receiveConnection !== null && this.receiveConnection.open;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.sendConnection) {
      this.sendConnection.close();
      this.sendConnection = null;
    }

    if (this.receiveConnection) {
      this.receiveConnection.close();
      this.receiveConnection = null;
    }

    if (this.sendPeer) {
      this.sendPeer.destroy();
      this.sendPeer = null;
    }

    if (this.receivePeer) {
      this.receivePeer.destroy();
      this.receivePeer = null;
    }

    this.isInitialized = false;
    this.sendPeerId = null;
    this.receivePeerId = null;
    console.log('PeerJSWrapper disconnected and cleaned up');
  }

  /**
   * Generate a random ID suffix
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get connection status
   */
  getStatus(): {
    initialized: boolean;
    sendPeerId: string | null;
    receivePeerId: string | null;
    connectedForSending: boolean;
    connectedForReceiving: boolean;
  } {
    return {
      initialized: this.isInitialized,
      sendPeerId: this.sendPeerId,
      receivePeerId: this.receivePeerId,
      connectedForSending: this.isConnectedForSending(),
      connectedForReceiving: this.isConnectedForReceiving(),
    };
  }
}
