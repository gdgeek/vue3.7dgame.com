import { SignalRegister } from '@/assets/js/blockly/custom/signal/index'
import { TaskRegister } from '../custom/task/index'
import { ParameterRegister } from '../custom/parameter/index'
import { DataRegister } from '../custom/data/index'

export const AddBlocks = (parameters: any) => {
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


