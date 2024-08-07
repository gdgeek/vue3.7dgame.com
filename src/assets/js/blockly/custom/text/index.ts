import Type from './type'
import * as Blockly from 'blockly';
import TextEntity from './text_entity'
import SetText from './set_text'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string | [string, number];
}

const TextCategory = {
  kind: 'category',
  name: '文字',
  colour: Type.colour,
  contents: [TextEntity.toolbox, SetText.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function TextRegister(parameters: any) {
  RegisterData(TextEntity, parameters)
  RegisterData(SetText, parameters)
}
export { TextCategory, TextRegister }
