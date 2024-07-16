import Type from './type'
import Blockly from 'blockly'
import VideoEntity from './video_entity'
import PlayVideo from './play_video'
//import PlayVideoCallback from './play_video_callback'

const VideoCategory = {
  kind: 'category',
  name: '视频',
  colour: Type.colour,
  contents: [
    VideoEntity.toolbox,
    PlayVideo.toolbox /*, PlayVideoCallback.toolbox*/
  ]
}
function RegisterData(data, parameters) {
  Blockly.Blocks[data.title] = data.getBlock(parameters)
  Blockly.Lua[data.title] = data.getLua(parameters)
}
function VideoRegister(parameters) {
  RegisterData(VideoEntity, parameters)
  RegisterData(PlayVideo, parameters)
  // RegisterData(PlayVideoCallback, parameters)
}
export { VideoCategory, VideoRegister }
