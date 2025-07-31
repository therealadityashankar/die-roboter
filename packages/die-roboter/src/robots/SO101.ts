import { Robot } from './Robot';
import * as URDFLoader from 'urdf-loader';

/**
 * SO101 Robot Implementation
 * The first robot in the Die Roboter series
 */
export class SO101 extends Robot {
  constructor(){
    super("SO101","https://cdn.jsdelivr.net/gh/therealadityashankar/die-roboter/urdf/so101.urdf")
  }
}
