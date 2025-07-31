import { SO101 } from './robots/SO101';

console.log("Die Roboter project is running!");

// Create a new SO101 robot
const robot = new SO101('RoboFriend');
console.log('Robot created:', robot.getStatus());

// Power on the robot
robot.powerOn();

// Move the robot around
robot.move('forward', 5);
robot.move('right', 3);
robot.move('backward', 2);

// Check status
console.log('Current status:', robot.getStatus());

// Recharge and continue
robot.recharge(20);
robot.move('left', 10);

// Power off
robot.powerOff();

