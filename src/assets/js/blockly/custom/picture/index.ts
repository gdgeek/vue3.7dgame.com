import Type from './type'
import * as Blockly from 'blockly';
import PictureEntity from './picture_entity'
import { LuaGenerator, Order } from 'blockly/lua';
const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => [string, number];
}

const PictureCategory = {
  kind: 'category',
  name: '图片',
  colour: Type.colour,
  contents: [PictureEntity.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function PictureRegister(parameters: any) {
  RegisterData(PictureEntity, parameters)
}
export { PictureCategory, PictureRegister }
