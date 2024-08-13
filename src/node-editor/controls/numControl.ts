import Rete from "rete";
import VueNumControl from "./numControl.vue";

export class NumControl extends Rete.Control {
  constructor(emitter, key, readonly) {
    super(key);
    this.component = VueNumControl;
    this.props = { emitter, ikey: key, readonly };
    setTimeout(() => {
      this.vueContext.value = 12;
    }, 1000);
  }

  setValue(val) {
    this.vueContext.value = val;
    this.vueContext.update;
  }
}
