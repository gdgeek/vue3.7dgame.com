import Type from './type'
import * as Blockly from 'blockly';

import ActionTrigger from './action_trigger'
import ActionExecute from './action_execute'
import DestroyTrigger from './destroy_trigger'
import InitTrigger from './init_trigger'
import UpdateTrigger from './update_trigger'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string;
}

const TriggerCategory = {
  kind: 'category',
  name: '触发',
  colour: Type.colour,
  contents: [
    ActionTrigger.toolbox,
    DestroyTrigger.toolbox,
    InitTrigger.toolbox,
    UpdateTrigger.toolbox,
    ActionExecute.toolbox
  ]
}

function RegisterData(data: Data, parameters: any): void {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function TriggerRegister(parameters: any): void {
  RegisterData(ActionTrigger, parameters)
  RegisterData(DestroyTrigger, parameters)
  RegisterData(InitTrigger, parameters)
  RegisterData(UpdateTrigger, parameters)
  RegisterData(ActionExecute, parameters)
}
export { TriggerCategory, TriggerRegister }
