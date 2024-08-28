import { Command } from '../Command.js';

/**
 * @param editor Editor
 * @param object THREE.Object3D
 * @param script javascript object
 * @constructor
 */
class AddEventCommand extends Command {

	constructor(editor, event, mode) {

		super(editor);

		this.type = 'AddEventCommand';
		this.name = 'Add Event';
		this.mode = mode;

		this.event = event;

	}

	execute() {

		if (this.editor.scene.events === undefined) {

			this.editor.scene.events = {};

		}
		if (this.mode == 'input') {
			if (this.editor.scene.events.inputs === undefined) {
				this.editor.scene.events.inputs = [];
			}
			this.editor.scene.events.inputs.push(this.event);
			this.editor.signals.eventAdded.dispatch(this.event);
		}
		if (this.mode == 'output') {
			if (this.editor.scene.events.outputs === undefined) {
				this.editor.scene.events.outputs = [];
			}
			this.editor.scene.events.outputs.push(this.event);
			this.editor.signals.eventAdded.dispatch(this.event);
		}
	}

	undo() {

		if (this.mode == 'input') {
			if (this.editor.scene.events.inputs === undefined) return;
			const index = this.editor.scene.events.inputs.indexOf(this.event);
			if (index !== - 1) {
				this.editor.scene.events.inputs.splice(index, 1);
				this.editor.signals.eventRemoved.dispatch(this.event);
			}
		} else if (this.mode == 'output') {
			if (this.editor.scene.events.outputs === undefined) return;
			const index = this.editor.scene.events.outputs.indexOf(this.event);
			if (index !== - 1) {
				this.editor.scene.events.outputs.splice(index, 1);
				this.editor.signals.eventRemoved.dispatch(this.event);
			}
		}


	}

	toJSON() {

		const output = super.toJSON(this);
		output.event = this.enent;
		output.mode = this.mode;
		return output;

	}

	fromJSON(json) {

		super.fromJSON(json);
		this.event = json.event;
		this.mode = json.mode;

	}

}

export { AddEventCommand };
