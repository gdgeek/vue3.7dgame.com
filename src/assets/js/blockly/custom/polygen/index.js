import Type from './type'
import Blockly from 'blockly'
import PolygenEntity from './polygen_entity'
import PlayAnimation from './play_animation'

const PolygenCategory = {
  kind: 'category',
  name: '模型',
  colour: Type.colour,
  contents: [PolygenEntity.toolbox, PlayAnimation.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function PolygenRegister(parameters) {
  RegisterData(PolygenEntity, parameters)
  RegisterData(PlayAnimation, parameters)
}
export { PolygenCategory, PolygenRegister }
