import React, { useState, useEffect } from 'react';
import { findPort, teleoperate, type RobotConnection as LeRobotConnection, type TeleoperationProcess } from '@lerobot/web';
import { Wifi, WifiOff, X } from 'lucide-react';

export class RobotConnection {
  private isWebSerialSupported: boolean;
  private robot: LeRobotConnection | null = null;
  private teleopProcess: TeleoperationProcess | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private statusMessage: string = '';
  private showBrowserWarning: boolean = false;
  private stateUpdateCallbacks: Set<() => void> = new Set();

  constructor() {
    this.isWebSerialSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Subscribe to state updates (for triggering re-renders)
   */
  private subscribe = (callback: () => void) => {
    this.stateUpdateCallbacks.add(callback);
    return () => this.stateUpdateCallbacks.delete(callback);
  };

  /**
   * Notify all subscribers of state change
   */
  private notifyStateChange = () => {
    this.stateUpdateCallbacks.forEach(callback => callback());
  };

  /**
   * Get the current teleoperator for direct motor control
   */
  getRobotTeleoperator = (): any => {
    return this.teleopProcess?.teleoperator || null;
  };

  /**
   * Get the teleoperation process
   */
  getRobotTeleop = (): TeleoperationProcess | null => {
    return this.teleopProcess;
  };

  /**
   * Check if robot is connected
   */
  isRobotConnected = (): boolean => {
    return this.isConnected;
  };

  private handleConnect = async () => {
    if (!this.isWebSerialSupported) {
      this.showBrowserWarning = true;
      this.statusMessage = 'WebSerial not supported. Please use Chrome, Edge, or Opera.';
      this.notifyStateChange();
      return;
    }
    
    this.showBrowserWarning = false;
    this.isConnecting = true;
    this.statusMessage = 'Opening port selection...';
    this.notifyStateChange();

    try {
      // 1. Find and connect to robot
      console.log('🔍 Finding available robot ports...');
      const findProcess = await findPort({
        onMessage: (msg) => {
          this.statusMessage = msg;
          this.notifyStateChange();
        },
      });
      const robots = await findProcess.result;

      if (robots.length === 0) {
        this.statusMessage = '❌ No robots found. Check connections and try again.';
        this.isConnecting = false;
        this.notifyStateChange();
        return;
      }

      console.log(`✅ Found ${robots.length} robot(s). Using first one...`);
      const selectedRobot = robots[0];
      this.robot = selectedRobot;
      this.statusMessage = `Connected to robot (${selectedRobot.serialNumber})`;
      this.notifyStateChange();

      // Configure robot type
      selectedRobot.robotType = 'so100_follower';
      selectedRobot.robotId = 'web_controlled_robot';

      // 2. Start direct teleoperation (no calibration needed)
      console.log('🎮 Starting direct control...');
      this.statusMessage = 'Starting control interface...';
      this.notifyStateChange();
      
      const teleop = await teleoperate({
        robot: selectedRobot,
        teleop: { type: 'direct' }
      });

      teleop.start();
      this.teleopProcess = teleop;
      this.isConnected = true;
      this.statusMessage = '✅ Robot connected! Use controls to move robot.';
      this.notifyStateChange();

    } catch (error) {
      console.log('Failed to connect to robot:', error);
      this.statusMessage = `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.isConnected = false;
      this.notifyStateChange();
    } finally {
      this.isConnecting = false;
      this.notifyStateChange();
    }
  };

  private handleDisconnect = async () => {
    if (this.teleopProcess) {
      try {
        await this.teleopProcess.disconnect();
        this.teleopProcess = null;
        this.robot = null;
        this.isConnected = false;
        this.statusMessage = 'Disconnected from robot';
        this.notifyStateChange();
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  };

  render = () => {
    const RobotConnectionComponent: React.FC = () => {
      const [, forceUpdate] = useState({});

      useEffect(() => {
        const unsubscribe = this.subscribe(() => forceUpdate({}));
        return () => { unsubscribe(); };
      }, []);

      return (
      <div className="flex flex-col items-end gap-1">
        <button
          onClick={this.isConnected ? this.handleDisconnect : this.handleConnect}
          disabled={this.isConnecting}
          className={`flex items-center justify-center gap-1.5 px-2 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
            this.isConnected
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : this.isConnecting
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {this.isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {this.isConnecting ? 'Connecting...' : this.isConnected ? 'Disconnect' : 'Connect Robot'}
        </button>
        
        {this.showBrowserWarning && !this.isWebSerialSupported && (
          <div className="flex items-start justify-between gap-1.5 text-[10px] text-blue-700 p-1.5 bg-blue-50 rounded border border-blue-200 max-w-[180px]">
            <span className="flex-1">WebSerial not supported. Use Chrome, Edge, or Opera.</span>
            <button
              onClick={() => {
                this.showBrowserWarning = false;
                this.notifyStateChange();
              }}
              className="text-blue-500 hover:text-blue-700 cursor-pointer flex-shrink-0"
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
        )}
        
        {this.statusMessage && !this.showBrowserWarning && (
          <div className="flex items-start justify-between gap-1.5 text-[10px] text-gray-600 p-1.5 bg-gray-50 rounded border border-gray-200 max-w-[180px]">
            <span className="flex-1">{this.statusMessage}</span>
            <button
              onClick={() => {
                this.statusMessage = '';
                this.notifyStateChange();
              }}
              className="text-gray-500 hover:text-gray-700 cursor-pointer flex-shrink-0"
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
        )}
      </div>
      );
    };

    return <RobotConnectionComponent />;
  };
}

export type { LeRobotConnection, TeleoperationProcess };
