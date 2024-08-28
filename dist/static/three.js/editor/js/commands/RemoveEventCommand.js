import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param component object
 * @constructor
 */
class RemoveEventCommand extends Command {

	constructor(editor, event, mode) {

		super(editor);
		this.mode = mode;
		this.type = 'RemoveEventCommand';
		this.name = 'Remove Event';


		this.event = event;
		if (this.mode == 'input') {
			this.index = this.editor.scene.events.inputs.findIndex(evt => evt.uuid == this.event.uuid);

		} else if (this.mode == 'output' && this.editor.scene.events.outputs) {
			this.index = this.editor.scene.events.outputs.findIndex(evt => evt.uuid == this.event.uuid);
		}

	}

	execute() {

		if (this.editor.scene.events === undefined) return;
		if (this.mode === 'input' && this.index !== -1) {
			this.editor.scene.events.inputs.splice(this.index, 1);
			this.editor.signals.eventRemoved.dispatch(this.event);
		} else if (this.mode === 'output' && this.index !== -1) {
			this.editor.scene.events.outputs.splice(this.index, 1);
			this.editor.signals.eventRemoved.dispatch(this.event);
		}
	}

	undo() {

		if (this.editor.scene.events === undefined) {
			this.editor.scene.events = {};
		}
		if (this.mode === 'input') {
			if (this.editor.scene.events.inputs === undefined) {
				this.editor.scene.events.inputs = [];
			}
			this.editor.scene.events.inputs.splice(this.index, 0, this.event);
			this.editor.signals.eventAdded.dispatch(this.event);
		}
		if (this.mode === 'output') {
			if (this.editor.scene.events.outputs === undefined) {
				this.editor.scene.events.outputs = [];
			}
			this.editor.scene.events.outputs.splice(this.index, 0, this.event);
			this.editor.signals.eventAdded.dispatch(this.event);
		}

	}

	toJSON() {

		const output = super.toJSON(this);
		output.event = this.event;
		output.mode = this.mode;
		output.index = this.index;

		return output;

	}

	fromJSON(json) {

		super.fromJSON(json);
		this.event = json.event;
		this.mode = json.mode;
		this.index = json.index;
	}

}

export { RemoveEventCommand };
