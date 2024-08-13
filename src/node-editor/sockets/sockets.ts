import Rete from "rete";
import { ClassicPreset } from "rete";

const NumSocket = new ClassicPreset.Socket("Number");
const MetaSocket = new ClassicPreset.Socket("Meta");
const MetaKnightSocket = new ClassicPreset.Socket("MetaKnight");
const AbilitySocket = new ClassicPreset.Socket("Ability");
const EventSocket = new ClassicPreset.Socket("Event");
const EntitySocket = new ClassicPreset.Socket("Entity");
const AddonSocket = new ClassicPreset.Socket("Addon");
const ComponentSocket = new ClassicPreset.Socket("Component");
const ButtonSocket = new ClassicPreset.Socket("Button");
const ActionSocket = new ClassicPreset.Socket("Action");
const AnchorSocket = new ClassicPreset.Socket("Anchor");

export {
  ButtonSocket,
  AnchorSocket,
  NumSocket,
  MetaSocket,
  MetaKnightSocket,
  EntitySocket,
  AddonSocket,
  ComponentSocket,
  ActionSocket,
  EventSocket,
  AbilitySocket,
};
