import Type from './type'
// import * as Blockly from 'blockly';
import * as Blockly from 'blockly';
import InputEvent from './input_event'
import OutputEvent from './output_event'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => string;
}


const EventCategory = {
  kind: 'category',
  name: '事件',
  colour: Type.colour,
  contents: [InputEvent.toolbox, OutputEvent.toolbox]
}

function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function EventRegister(parameters: any) {
  RegisterData(InputEvent, parameters)
  RegisterData(OutputEvent, parameters)
}
export { EventCategory, EventRegister }
