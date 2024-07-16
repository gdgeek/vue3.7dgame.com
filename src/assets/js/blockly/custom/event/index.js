import Type from './type'
import Blockly from 'blockly'

import InputEvent from './input_event.js'
import OutputEvent from './output_event.js'

const EventCategory = {
  kind: 'category',
  name: '事件',
  colour: Type.colour,
  contents: [InputEvent.toolbox, OutputEvent.toolbox]
}

function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function EventRegister(parameters) {
  RegisterData(InputEvent, parameters)
  RegisterData(OutputEvent, parameters)
}
export { EventCategory, EventRegister }
