import Rete from "rete";

import ActionControl from "./actionControl.vue";
import VueNumControl from "./numControl.vue";
import MetaControl from "./metaControl.vue";
import ModuleControl from "./moduleControl.vue";
import TransformControl from "./transformControl.vue";
import StringControl from "./stringControl.vue";
import SelectControl from "./selectControl.vue";
import BoolControl from "./boolControl.vue";
import ResourceControl from "./resourceControl.vue";
import Vector2Control from "./vector2Control.vue";
import Vector3Control from "./vector3Control.vue";
import IconsControl from "./iconsControl.vue";
import VerseNameControl from "./verseNameControl.vue";
import UUIDControl from "./uuidControl.vue";
import CodeControl from "./codeControl.vue";
import ButtonControl from "./buttonControl.vue";
import SpaceControl from "./spaceControl.vue";
//import ScriptControl from './scriptControl.vue'
import StoryControl from "./storyControl.vue";
//import EventControl from './_eventControl.vue'

export class Control extends Rete.Control {
  constructor(emitter, { data, root, node }) {
    super(data.key);

    //data.type)
    switch (data.type) {
      case "select":
        this.component = SelectControl;
        break;
      //case 'event':
      //  this.component = EventControl
      //  break
      case "meta":
        this.component = MetaControl;
        break;
      case "resource":
        this.component = ResourceControl;
        break;
      case "action":
        this.component = ActionControl;
        break;
      case "num":
        this.component = VueNumControl;
        break;
      case "transform":
        this.component = TransformControl;
        break;
      case "string":
        this.component = StringControl;
        break;
      case "module":
        this.component = ModuleControl;
        break;
      case "polygen-reset":
        this.component = PolygenResetControl;
        break;
      case "bool":
        this.component = BoolControl;
        break;
      case "story":
        this.component = StoryControl;
        break;
      case "space":
        this.component = SpaceControl;
        break;
      case "vector3":
        this.component = Vector3Control;
        break;
      case "vector2":
        this.component = Vector2Control;
        break;
      case "icons":
        this.component = IconsControl;
        break;
      case "verse-name":
        this.component = VerseNameControl;
        break;
      case "uuid":
        this.component = UUIDControl;
        break;
      case "code":
        this.component = CodeControl;
        break;
      case "button":
        this.component = ButtonControl;
        break;
      default:
        this.component = VueNumControl;
    }

    this.props = {
      emitter,
      data,
      root,
      node,
    };
  }

  setValue(val) {
    this.vueContext.value = val;
    this.vueContext.refresh();
  }
  $emit(action, value) {
    if (this.vueContext) {
      this.vueContext.$emit(action, value);
    }
  }
}
