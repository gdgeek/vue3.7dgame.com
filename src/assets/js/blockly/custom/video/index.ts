import Type from './type'
import * as Blockly from 'blockly';
import VideoEntity from './video_entity'
import PlayVideo from './play_video'
//import PlayVideoCallback from './play_video_callback'
import { LuaGenerator } from 'blockly/lua';

const luaGeneratorInstance = new LuaGenerator() as any;

interface Data {
  title: string;
  getBlock: (parameters: any) => Blockly.Block;
  getLua: (parameters: any) => (block: Blockly.Block) => string | [string, number];
}

const VideoCategory = {
  kind: 'category',
  name: '视频',
  colour: Type.colour,
  contents: [
    VideoEntity.toolbox,
    PlayVideo.toolbox /*, PlayVideoCallback.toolbox*/
  ]
}
function RegisterData(data: Data, parameters: any) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  luaGeneratorInstance[data.title] = data.getLua(parameters)
}
function VideoRegister(parameters: any) {
  RegisterData(VideoEntity, parameters)
  RegisterData(PlayVideo, parameters)
  // RegisterData(PlayVideoCallback, parameters)
}
export { VideoCategory, VideoRegister }
