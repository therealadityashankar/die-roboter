import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Copy, Check, Radio } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { PeerJSWrapper, RobotControlMessage } from '../utils/PeerJSWrapper';
import type { MainSceneHandle } from '../types/scene';

interface RemoteControlProps {
  sceneHandle: MainSceneHandle | null;
}

export const RemoteControl: React.FC<RemoteControlProps> = ({ sceneHandle }) => {
  const [peerWrapper, setPeerWrapper] = useState<PeerJSWrapper | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<string>('Not initialized');
  const [sendPeerId, setSendPeerId] = useState<string | null>(null);
  const [receivePeerId, setReceivePeerId] = useState<string | null>(null);
  const [copiedSend, setCopiedSend] = useState(false);
  const [copiedReceive, setCopiedReceive] = useState(false);

  useEffect(() => {
    const wrapper = new PeerJSWrapper({
      onReceive: (message: RobotControlMessage) => {
        handleIncomingMessage(message);
      },
      onConnectionOpen: (peerId: string) => {
        setIsConnected(true);
        setStatus(`Connected to: ${peerId}`);
      },
      onConnectionClose: () => {
        setIsConnected(false);
        setStatus('Connection closed');
      },
      onError: (error: Error) => {
        setStatus(`Error: ${error.message}`);
      },
    });

    setPeerWrapper(wrapper);

    return () => {
      wrapper.disconnect();
    };
  }, []);

  const handleIncomingMessage = (message: RobotControlMessage) => {
    console.log('Processing incoming message:', message);
    
    const robot = sceneHandle?.getActiveRobot();
    if (!robot || !robot.robot) {
      console.warn('No active robot to control');
      return;
    }

    switch (message.type) {
      case 'move':
        // Handle movement: message.data should have { dx, dz }
        if (message.data.dx !== undefined && message.data.dz !== undefined) {
          robot.robot.position.x += message.data.dx;
          robot.robot.position.z += message.data.dz;
        }
        break;
      
      case 'rotate':
        // Handle rotation: message.data should have { delta }
        if (message.data.delta !== undefined) {
          robot.robot.rotation.z += message.data.delta;
        }
        break;
      
      case 'joint':
        // Handle joint control: message.data should have { jointName, value }
        if (message.data.jointName && message.data.value !== undefined) {
          robot.setPivotValue(message.data.jointName, message.data.value);
        }
        break;
      
      case 'gripper':
        // Handle gripper: message.data should have { value }
        if (message.data.value !== undefined && robot.pivotMap['gripper']) {
          robot.setPivotValue('gripper', message.data.value);
        }
        break;
      
      case 'ping':
        // Respond to ping
        console.log('Received ping');
        break;
      
      default:
        console.warn('Unknown message type:', message.type);
    }
  };

  const handleInitialize = async () => {
    if (!peerWrapper) return;

    try {
      setStatus('Initializing...');
      await peerWrapper.initialize();
      setIsInitialized(true);
      const status = peerWrapper.getStatus();
      setSendPeerId(status.sendPeerId);
      setReceivePeerId(status.receivePeerId);
      setStatus('Initialized. Waiting for connection...');
    } catch (error) {
      setStatus(`Failed to initialize: ${error}`);
    }
  };

  const handleConnect = async () => {
    if (!peerWrapper || !remotePeerId.trim()) return;

    try {
      setStatus('Connecting...');
      await peerWrapper.connectToRemote(remotePeerId.trim());
    } catch (error) {
      setStatus(`Failed to connect: ${error}`);
    }
  };

  const handleDisconnect = () => {
    if (!peerWrapper) return;
    peerWrapper.disconnect();
    setIsInitialized(false);
    setIsConnected(false);
    setSendPeerId(null);
    setReceivePeerId(null);
    setStatus('Disconnected');
  };

  const copyToClipboard = async (text: string, type: 'send' | 'receive') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'send') {
        setCopiedSend(true);
        setTimeout(() => setCopiedSend(false), 2000);
      } else {
        setCopiedReceive(true);
        setTimeout(() => setCopiedReceive(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="w-5 h-5 text-gray-700" />
        <h3 className="text-lg font-semibold text-gray-900 quicksand">Remote Control</h3>
        {isConnected && <Wifi className="w-4 h-4 text-green-500" />}
        {isInitialized && !isConnected && <WifiOff className="w-4 h-4 text-gray-400" />}
      </div>

      {/* Demo Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
        <p className="text-xs text-blue-900 mb-1 font-semibold">🔧 DEMO MODE</p>
        <p className="text-xs text-blue-800 leading-relaxed">
          This interface allows remote control of the robot arm via WebRTC (PeerJS).
          You can control it from Python, another browser tab, or any WebRTC client.
          <br />
          <span className="font-semibold mt-1 block">Note:</span> Full implementation in progress.
        </p>
      </div>

      <div className="space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-gray-700">Status:</span>
          <span className={`${isConnected ? 'text-green-600' : 'text-gray-600'}`}>
            {status}
          </span>
        </div>

        {/* Initialize Button */}
        {!isInitialized && (
          <button
            onClick={handleInitialize}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium quicksand"
          >
            Initialize Peer Connection
          </button>
        )}

        {/* Peer IDs Display */}
        {isInitialized && (
          <>
            <div className="space-y-2">
              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Your Send ID:</span>
                  <button
                    onClick={() => sendPeerId && copyToClipboard(sendPeerId, 'send')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedSend ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-600" />
                    )}
                  </button>
                </div>
                <code className="text-xs text-gray-900 break-all font-mono">{sendPeerId}</code>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-gray-700">Your Receive ID:</span>
                  <button
                    onClick={() => receivePeerId && copyToClipboard(receivePeerId, 'receive')}
                    className="p-1 hover:bg-gray-200 rounded transition-colors"
                    title="Copy to clipboard"
                  >
                    {copiedReceive ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-600" />
                    )}
                  </button>
                </div>
                <code className="text-xs text-gray-900 break-all font-mono">{receivePeerId}</code>
              </div>
            </div>

            {/* Connect to Remote */}
            {!isConnected && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-700">
                  Connect to Remote Peer:
                </label>
                <input
                  type="text"
                  value={remotePeerId}
                  onChange={(e) => setRemotePeerId(e.target.value)}
                  placeholder="Enter remote peer ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleConnect}
                  disabled={!remotePeerId.trim()}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed quicksand"
                >
                  Connect
                </button>
              </div>
            )}

            {/* Disconnect Button */}
            {isConnected && (
              <button
                onClick={handleDisconnect}
                className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium quicksand"
              >
                Disconnect
              </button>
            )}
          </>
        )}

        {/* Python Example */}
        <details open className="text-xs">
          <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900 mb-2">
            Python Example (Demo)
          </summary>
          <div className="mt-2">
            <SyntaxHighlighter 
              language="python" 
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
              }}
            >
{`# Example Python client (requires aiortc)
import asyncio
from aiortc import RTCPeerConnection

async def control_robot():
    pc = RTCPeerConnection()
    # Connect to peer...
    # Send commands:
    data = {
        "type": "move",
        "data": {"dx": 0.1, "dz": 0},
        "timestamp": time.time()
    }
    # Send via data channel...

asyncio.run(control_robot())`}
            </SyntaxHighlighter>
          </div>
        </details>
      </div>
    </div>
  );
};
