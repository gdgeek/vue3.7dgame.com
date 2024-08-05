import Type from './type'
import * as Blockly from 'blockly';
import SoundEntity from './sound_entity'
import PlaySound from './play_sound'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => string | [string, number];
}

const SoundCategory = {
  kind: 'category',
  name: '音频',
  colour: Type.colour,
  contents: [SoundEntity.toolbox, PlaySound.toolbox]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function SoundRegister(parameters: any) {
  RegisterData(SoundEntity, parameters)
  RegisterData(PlaySound, parameters)
  // RegisterData(PlaySoundCallback, parameters)
}
export { SoundCategory, SoundRegister }
