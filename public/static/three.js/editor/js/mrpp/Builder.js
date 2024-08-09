


class Builder {
	constructor() {
	}
	node(type, name) {
		return {
			type: type,
			children: {
				components: [],
				entities: []
			},
			parameters: {
				name: name,
				transform: {
					position: { x: 0, y: 0, z: 0 },
					scale: { x: 1, y: 1, z: 1 },
					rotate: { x: 0, y: 0, z: 0 }
				},
				uuid: THREE.MathUtils.generateUUID(),
				active: true,
			}
		}
	}
	resource(data) {
		let ret = null;
		switch (data.type.toLowerCase()) {
			case 'voxel':
				ret = this.node("Voxel", "Voxel");
				break;
			case 'picture':
				ret = this.node("Picture", "Picture");
				ret.parameters.width = 0.5;
				break;
			case 'polygen':
				ret = this.node("Polygen", "Polygen");
				break;
			case 'audio':
				ret = this.node("Sound", "Sound");
				break;
			case 'video':
				ret = this.node("Video", "Video");
				ret.parameters.width = 0.5;
				ret.parameters.loop = false;
				ret.parameters.play = true;
				ret.parameters.console = true;

				break;
		}
		if (ret != null) {
			ret.parameters.resource = data.id;
		}
		return ret;
	}
	module(meta_id, title = 'Module') {
		return {
			type: 'Module',
			children: {},
			parameters: {
				meta_id: meta_id,
				title: title,
				transform: {
					position: { x: 0, y: 0, z: 0 },
					scale: { x: 1, y: 1, z: 1 },
					rotate: { x: 0, y: 0, z: 0 }
				},
				uuid: THREE.MathUtils.generateUUID(),
				active: true,
			}
		}
	}
	anchor(title = 'Anchor') {
		return {
			type: 'Anchor',
			children: {},
			parameters: {
				title: title,
				transform: {
					position: { x: 0, y: 0, z: 0 },
					scale: { x: 1, y: 1, z: 1 },
					rotate: { x: 0, y: 0, z: 0 }
				},
				uuid: THREE.MathUtils.generateUUID(),
				active: true,
			}
		}
	}
	text(content = "Hello World") {
		const ret = this.node("Text", "Text");
		ret.parameters.text = content;
		return ret;
	}
	entity() {
		const ret = this.node("Entity", "Entity");
		return ret;
	}
}
export { Builder }
