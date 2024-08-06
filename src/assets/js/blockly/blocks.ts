import { EntityRegister } from '@/assets/js/blockly/custom/entity/index'
import { DataRegister } from '@/assets/js/blockly/custom/data/index'
import { TriggerRegister } from '@/assets/js/blockly/custom/trigger/index'
import { MetaRegister } from '@/assets/js/blockly/custom/meta/index'
import { ExecuteRegister } from '@/assets/js/blockly/custom/execute/index'
import { TaskRegister } from '@/assets/js/blockly/custom/task/index'
import { TextRegister } from '@/assets/js/blockly/custom/text/index'
import { PolygenRegister } from '@/assets/js/blockly/custom/polygen/index'
import { PictureRegister } from '@/assets/js/blockly/custom/picture/index'
import { HelperRegister } from '@/assets/js/blockly/custom/helper/index'
import { VideoRegister } from '@/assets/js/blockly/custom/video/index'
import { SoundRegister } from '@/assets/js/blockly/custom/sound/index'
import { VoxelRegister } from '@/assets/js/blockly/custom/voxel/index'
import { EventRegister } from '@/assets/js/blockly/custom/event/index'

export const AddBlocks = (parameters: any) => {
  MetaRegister(parameters)
  TriggerRegister(parameters)
  EntityRegister(parameters)
  PolygenRegister(parameters)
  DataRegister(parameters)
  TextRegister(parameters)
  PictureRegister(parameters)
  HelperRegister(parameters)
  VideoRegister(parameters)
  SoundRegister(parameters)
  EventRegister(parameters)
  TaskRegister(parameters)
  VoxelRegister(parameters)
  // ExecuteRegister(parameters)
}
