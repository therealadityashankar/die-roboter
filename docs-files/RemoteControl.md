# Remote Control Documentation

## Overview

The Die Roboter project now supports remote control via WebRTC using PeerJS. This allows you to control the robot arm from Python scripts, other browser tabs, or any WebRTC-compatible client.

## Features

- **Bidirectional Communication**: Uses two PeerJS instances to work around PeerJS one-way communication bug
- **WebRTC-based**: Low-latency peer-to-peer communication
- **Multiple Control Types**: 
  - Movement (XZ plane)
  - Rotation (yaw)
  - Joint control
  - Gripper control

## How It Works

### Architecture

The `PeerJSWrapper` class creates two separate PeerJS instances:
- **Send Peer**: For sending commands to remote clients
- **Receive Peer**: For receiving commands from remote clients

This dual-peer approach works around a known PeerJS limitation where single connections only support one-way data flow.

### Movement with Rotation

The movement controls now respect the robot's current rotation. When you press W (forward), the robot moves in the direction it's facing, not always along the global Z-axis. This is achieved using 2D rotation matrix transformation:

```
x' = x * cos(θ) - z * sin(θ)
z' = x * sin(θ) + z * cos(θ)
```

Where θ is the robot's current rotation angle.

## Usage

### In the Web UI

1. Open the Control Panel
2. Scroll to the "Remote Control" section
3. Click "Initialize Peer Connection"
4. Share your **Receive ID** with the remote controller
5. Enter the remote peer's **Send ID** and click "Connect"

### Message Format

All messages follow this structure:

```typescript
interface RobotControlMessage {
  type: 'move' | 'rotate' | 'joint' | 'gripper' | 'ping';
  data: any;
  timestamp: number;
}
```

### Control Types

#### Movement
```json
{
  "type": "move",
  "data": { "dx": 0.1, "dz": 0.05 },
  "timestamp": 1234567890
}
```

#### Rotation
```json
{
  "type": "rotate",
  "data": { "delta": 0.1 },
  "timestamp": 1234567890
}
```

#### Joint Control
```json
{
  "type": "joint",
  "data": { 
    "jointName": "shoulder_pan",
    "value": 50
  },
  "timestamp": 1234567890
}
```

#### Gripper Control
```json
{
  "type": "gripper",
  "data": { "value": 25 },
  "timestamp": 1234567890
}
```

#### Ping
```json
{
  "type": "ping",
  "data": {},
  "timestamp": 1234567890
}
```

## Python Client Example (Demo)

```python
# Note: This is a simplified example. Full implementation requires aiortc or similar
import asyncio
import json
from datetime import datetime

async def control_robot(peer_id):
    """
    Connect to the robot and send control commands
    
    Args:
        peer_id: The robot's receive peer ID
    """
    # Initialize PeerJS connection (requires JavaScript bridge or aiortc)
    
    # Example: Move forward
    command = {
        "type": "move",
        "data": {"dx": 0, "dz": 0.1},
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
    
    # Send via data channel
    # await send_to_peer(peer_id, json.dumps(command))
    
    # Example: Rotate
    command = {
        "type": "rotate",
        "data": {"delta": 0.05},
        "timestamp": int(datetime.now().timestamp() * 1000)
    }
    
    # await send_to_peer(peer_id, json.dumps(command))

# Run
# asyncio.run(control_robot("robot-receive-abc123"))
```

## JavaScript Client Example

```javascript
// In another browser tab or Node.js application
import Peer from 'peerjs';

const peer = new Peer();

peer.on('open', (myId) => {
  console.log('My peer ID:', myId);
  
  // Connect to robot's receive peer
  const conn = peer.connect('robot-receive-xyz789');
  
  conn.on('open', () => {
    console.log('Connected to robot!');
    
    // Send a movement command
    conn.send({
      type: 'move',
      data: { dx: 0.1, dz: 0 },
      timestamp: Date.now()
    });
    
    // Send a rotation command after 1 second
    setTimeout(() => {
      conn.send({
        type: 'rotate',
        data: { delta: 0.1 },
        timestamp: Date.now()
      });
    }, 1000);
  });
});
```

## Security Considerations

⚠️ **Important**: This is a demo implementation. For production use, consider:

- Implementing authentication
- Adding encryption for sensitive commands
- Rate limiting to prevent abuse
- Input validation on all received commands
- Secure peer ID generation and distribution

## Troubleshooting

### Connection fails
- Ensure both peers are initialized
- Check that peer IDs are correct
- Verify firewall settings allow WebRTC connections
- Try using a different STUN/TURN server

### Commands not working
- Check browser console for errors
- Verify message format matches expected structure
- Ensure robot is active and loaded in the scene

### One-way communication only
- This is expected with single PeerJS instances
- The wrapper uses two instances to enable bidirectional communication
- Make sure both send and receive peers are properly initialized

## API Reference

### PeerJSWrapper

```typescript
class PeerJSWrapper {
  // Initialize with two peer instances
  async initialize(sendPeerIdPrefix?: string, receivePeerIdPrefix?: string): Promise<void>
  
  // Connect to remote peer for sending
  connectToRemote(remotePeerId: string): Promise<void>
  
  // Send a message
  send(message: RobotControlMessage): void
  
  // Check connection status
  isConnectedForSending(): boolean
  isConnectedForReceiving(): boolean
  
  // Get full status
  getStatus(): object
  
  // Clean up
  disconnect(): void
}
```

### Constructor Options

```typescript
interface PeerJSWrapperOptions {
  onReceive?: (message: RobotControlMessage) => void;
  onConnectionOpen?: (peerId: string) => void;
  onConnectionClose?: () => void;
  onError?: (error: Error) => void;
}
```

## Future Improvements

- [ ] Add video streaming support
- [ ] Implement command queue for smoother control
- [ ] Add telemetry data feedback
- [ ] Support for multiple simultaneous controllers
- [ ] WebSocket fallback for networks that block WebRTC
- [ ] Mobile app client

## Contributing

Contributions are welcome! Please see the main README for contribution guidelines.
