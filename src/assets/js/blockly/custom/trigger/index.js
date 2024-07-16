import Type from './type'
import Blockly from 'blockly'

import ActionTrigger from './action_trigger'
import ActionExecute from './action_execute'
import DestroyTrigger from './destroy_trigger'
import InitTrigger from './init_trigger'
import UpdateTrigger from './update_trigger'

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

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function TriggerRegister(parameters) {
  RegisterData(ActionTrigger, parameters)
  RegisterData(DestroyTrigger, parameters)
  RegisterData(InitTrigger, parameters)
  RegisterData(UpdateTrigger, parameters)
  RegisterData(ActionExecute, parameters)
}
export { TriggerCategory, TriggerRegister }
