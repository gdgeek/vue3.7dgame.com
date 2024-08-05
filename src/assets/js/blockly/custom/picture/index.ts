import Type from './type'
import * as Blockly from 'blockly';
import PictureEntity from './picture_entity'
import { LuaGenerator } from 'blockly/lua';
const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => [string, number];
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
