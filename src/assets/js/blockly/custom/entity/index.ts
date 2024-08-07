import Type from './type'
import * as Blockly from 'blockly';
//import PolygenEntity from './polygen_entity'
//import PictureEntity from './picture_entity'
//import VideoEntity from './video_entity'
//import TextEntity from './text_entity'
import LineExecute from './line_execute'
import Entity from './entity'

import EntityExplode from './entity_explode'
import EntityUnxploded from './entity_unexploded'

import TweenExecute from './tween_execute'
import VisualExecute from './visual_execute'
import { LuaGenerator, Order } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as LuaGenerator & { [key: string]: any };

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.BlockSvg;
  getLua: (parameters: any) => (block: Blockly.BlockSvg) => string | [string, number];
}

const EntityCategory = {
  kind: 'category',
  name: '实体',
  colour: Type.colour,
  contents: [
    Entity.toolbox,
    //  LineExecute.toolbox,
    TweenExecute.toolbox,
    VisualExecute.toolbox,
    EntityExplode.toolbox,
    EntityUnxploded.toolbox
  ]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function EntityRegister(parameters: any) {
  RegisterData(Entity, parameters)
  // RegisterData(LineExecute, parameters)
  RegisterData(TweenExecute, parameters)
  RegisterData(VisualExecute, parameters)
  RegisterData(EntityExplode, parameters)
  RegisterData(EntityUnxploded, parameters)
  //RegisterData(root, index, TextEntity)
}
export { EntityCategory, EntityRegister }
