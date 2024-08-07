import Type from './type'
import * as Blockly from 'blockly';
import VoxelEntity from './voxel_entity'
//import PlayVideoCallback from './play_video_callback'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => [string, number];
}

const VoxelCategory = {
  kind: 'category',
  name: '体素',
  colour: Type.colour,
  contents: [
    VoxelEntity.toolbox,
  ]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function VoxelRegister(parameters: any) {
  RegisterData(VoxelEntity, parameters)
  // RegisterData(PlayVideoCallback, parameters)
}
export { VoxelCategory, VoxelRegister }
