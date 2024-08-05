import Type from './type'
import * as Blockly from 'blockly';
import VoxelEntity from './voxel_entity'
//import PlayVideoCallback from './play_video_callback'

const VoxelCategory = {
  kind: 'category',
  name: '体素',
  colour: Type.colour,
  contents: [
    VoxelEntity.toolbox,
  ]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function VoxelRegister(parameters) {
  RegisterData(VoxelEntity, parameters)
  // RegisterData(PlayVideoCallback, parameters)
}
export { VoxelCategory, VoxelRegister }
