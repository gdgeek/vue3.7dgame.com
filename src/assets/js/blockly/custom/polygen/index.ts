import Type from './type'
import * as Blockly from 'blockly';
import PolygenEntity from './polygen_entity'
import PlayAnimation from './play_animation'
import 'blockly/lua';
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string | [string, number];
}

const PolygenCategory = {
  kind: 'category',
  name: '模型',
  colour: Type.colour,
  contents: [PolygenEntity.toolbox, PlayAnimation.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function PolygenRegister(parameters: any) {
  RegisterData(PolygenEntity, parameters)
  RegisterData(PlayAnimation, parameters)
}
export { PolygenCategory, PolygenRegister }
