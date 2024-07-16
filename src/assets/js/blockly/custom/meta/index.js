import Type from './type'
import Blockly from 'blockly'

import MetaAction from './meta_action.js'
import RunTask from './run_task'

const MetaCategory = {
  kind: 'category',
  name: 'Meta',
  colour: Type.colour,
  contents: [
    MetaAction.toolbox,
    RunTask.toolbox,
  ]
}

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function MetaRegister(parameters) {
  RegisterData(MetaAction, parameters)
  RegisterData(RunTask, parameters)
}
export { MetaCategory, MetaRegister }
