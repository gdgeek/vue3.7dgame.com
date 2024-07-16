import { SignalRegister } from '@/assets/js/blockly/custom/signal'
import { TaskRegister } from '../custom/task'
import { ParameterRegister } from '../custom/parameter'
import { DataRegister } from '../custom/data'

function AddBlocks(parameters) {
  SignalRegister(parameters)
  TaskRegister(parameters)
  ParameterRegister(parameters)
  DataRegister(parameters)
  /*EntityRegister(parameters)
  PolygenRegister(parameters)
  DataRegister(parameters)
  TextRegister(parameters)
  PictureRegister(parameters)
  HelperRegister(parameters)
  VideoRegister(parameters)
  SoundRegister(parameters)
  EventRegister(parameters)*/
}

export { AddBlocks }
