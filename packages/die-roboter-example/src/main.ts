// Import from the local copy of the robot files
import { SO101 } from './robots/SO101';

document.addEventListener('DOMContentLoaded', () => {
  // Create a new SO101 robot
  const robot = new SO101('RoboFriend', 100);
  
  // Get the robot display container
  const robotContainer = document.getElementById('robot-display');
  
  if (!robotContainer) {
    console.error('Robot container not found');
    return;
  }
  
  // Initial render
  robot.render(robotContainer);
  
  // Set up button event listeners
  document.getElementById('power-on')?.addEventListener('click', () => {
    robot.powerOn();
    robot.render(robotContainer);
  });
  
  document.getElementById('power-off')?.addEventListener('click', () => {
    robot.powerOff();
    robot.render(robotContainer);
  });
  
  document.getElementById('move-forward')?.addEventListener('click', () => {
    robot.move('forward', 5);
    robot.render(robotContainer);
  });
  
  document.getElementById('move-backward')?.addEventListener('click', () => {
    robot.move('backward', 5);
    robot.render(robotContainer);
  });
  
  document.getElementById('move-left')?.addEventListener('click', () => {
    robot.move('left', 5);
    robot.render(robotContainer);
  });
  
  document.getElementById('move-right')?.addEventListener('click', () => {
    robot.move('right', 5);
    robot.render(robotContainer);
  });
  
  document.getElementById('recharge')?.addEventListener('click', () => {
    robot.recharge(20);
    robot.render(robotContainer);
  });
  
  console.log('Die Roboter example initialized');
});
