import * as THREE from 'three'
import { MetaFactory } from './MetaFactory.js'
//import { SceneBuilder } from './SceneBuilder.js'
function MetaLoader(editor) {

	editor.selector = function (object) {
		if (object.userData.type != undefined) {
			return true;
		}
		return true;
	}

	const self = this
	editor.signals.upload.add(function () {
		self.save()
	})


	//const builder = new SceneBuilder(editor)
	const factory = new MetaFactory();

	this.compareObjectsAndPrintDifferences = function (obj1, obj2, path = '', tolerance = 0.0001) {
		if (obj1 == null || obj2 == null) {
			console.log('One of the objects is null');
			return;
		}
		const keys1 = Object.keys(obj1);
		const keys2 = Object.keys(obj2);

		for (let key of keys1) {
			const val1 = obj1[key];
			const val2 = obj2[key];
			const currentPath = path ? `${path}.${key}` : key;

			if (typeof val1 === 'object' && typeof val2 === 'object') {

				self.compareObjectsAndPrintDifferences(val1, val2, currentPath);
			} else if (typeof val1 === 'number' && typeof val2 === 'number') {
				if (Math.abs(val1 - val2) > tolerance) {
					console.log(`Difference found at "${key}":`);
					console.log(`Object 1: ${val1}`);
					console.log(`Object 2: ${val2}`);
				}
			} else if (val1 !== val2) {
				console.log(`Difference found at ${currentPath}:`);
				console.log(`Object 1: ${val1}`);
				console.log(`Object 2: ${val2}`);
			}
		}

		// Check for keys present in obj2 but not in obj1
		for (let key of keys2) {
			if (!keys1.includes(key)) {
				const currentPath = path ? `${path}.${key}` : key;
				console.log(`Key ${currentPath} present in Object 2 but not in Object 1`);
			}
		}
	}

	this.save = async function () {


		const meta = await self.write(editor.scene)

		const data = {
			action: 'save',
			data: JSON.stringify(meta),
			events: JSON.stringify(editor.scene.events)
		}

		editor.signals.messageSend.dispatch(data)

	}
	this.writeEntity = function (node) {

		if (node.userData.type == undefined) {
			return null
		}
		const entity = {}

		entity.type = node.userData.type
		entity.parameters = {}
		entity.parameters.uuid = node.uuid
		entity.parameters.name = node.name
		entity.parameters.transform = {}
		entity.parameters.transform.position = {
			x: node.position.x,
			y: node.position.y,
			z: node.position.z
		}
		entity.parameters.transform.rotate = {
			x: (node.rotation.x / Math.PI) * 180,
			y: (node.rotation.y / Math.PI) * 180,
			z: (node.rotation.z / Math.PI) * 180
		}
		entity.parameters.transform.scale = {
			x: node.scale.x,
			y: node.scale.y,
			z: node.scale.z
		}
		//entity.parameters.transform.active = true
		entity.parameters.active = node.visible



		entity.children = { "entities": [], "components": node.components }
		node.children.forEach(child => {
			const ce = self.writeEntity(child)
			if (ce != null) {
				entity.children.entities.push(ce)
			}
		})
		const exclude = ['type', 'width']
		Object.keys(node.userData).forEach(key => {
			if (!exclude.includes(key)) {
				entity.parameters[key] = node.userData[key]
			}
		})
		if (node.userData['width'] && node instanceof THREE.Mesh) {
			const geometry = node.geometry
			if (geometry instanceof THREE.PlaneGeometry) {
				entity.parameters.width = geometry.parameters.width
			}
		}



		//console.error(entity)
		return entity
	}
	this.write = async function (root) {
		const data = {}
		data.type = "MetaRoot"
		data.parameters = { "uuid": root.uuid }
		const entities = []
		data.children = { "entities": [], "addons": [] }
		root.children.forEach(node => {
			const entity = self.writeEntity(node);
			if (entity != null) {
				entities.push(entity)
			}
		})
		data.children.entities = entities
		return data;
	}


	this.clear = async function () {
		this.editor.clear()
	}

	this.load = async function (meta) {

		let scene = editor.scene;
		if (scene == null) {
			scene = new THREE.Scene();
			scene.name = "Scene"
			editor.setScene(scene)
		}
		if (meta.events == null) {
			scene.events = { inputs: [], outputs: [] };
		} else {
			scene.events = JSON.parse(meta.events)
		}

		editor.signals.sceneGraphChanged.dispatch()
		let lights = editor.scene.getObjectByName("$lights")
		if (lights == null) {
			lights = new THREE.Group();
			lights.name = "$lights";
			const light1 = new THREE.DirectionalLight(0xffffff, 0.5)
			light1.position.set(-0.5, 0, 0.7)
			light1.name = "light1"
			lights.add(light1);
			const light2 = new THREE.AmbientLight(0xffffff, 0.5)

			light2.name = "light2"
			lights.add(light2);
			const light3 = new THREE.PointLight(0xffffff, 1)
			light3.position.set(0, 0, 0)
			light3.name = "light3"
			lights.add(light3);
			scene.add(lights)
			factory.lockNode(lights)
			editor.signals.sceneGraphChanged.dispatch()
		}

		let root = editor.scene;


		if (meta.data !== null) {
			const data = JSON.parse(meta.data)

			const resources = new Map()
			meta.resources.forEach(r => {
				resources.set(r.id, r)
			})

			root.uuid = data.parameters.uuid

			await factory.readMeta(root, data, resources)
			editor.signals.sceneGraphChanged.dispatch()
		}



	}
}
export { MetaLoader }
