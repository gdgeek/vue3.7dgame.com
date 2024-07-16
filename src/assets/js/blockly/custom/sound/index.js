import Type from './type'
import Blockly from 'blockly'
import SoundEntity from './sound_entity'
import PlaySound from './play_sound'

const SoundCategory = {
  kind: 'category',
  name: '音频',
  colour: Type.colour,
  contents: [SoundEntity.toolbox, PlaySound.toolbox]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function SoundRegister(parameters) {
  RegisterData(SoundEntity, parameters)
  RegisterData(PlaySound, parameters)
  // RegisterData(PlaySoundCallback, parameters)
}
export { SoundCategory, SoundRegister }
