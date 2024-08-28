import * as THREE from 'three'
/*
import { MetaFactory } from './MetaFactory.js'
class SceneBuilder {
	constructor(editor) {
		this.editor = editor
		this.factory = new MetaFactory()
	}

	async readMeta(root, data, resources) {


		if (data.children) {
			for (let i = 0; i < data.children.entities.length; ++i) {
				if (data.children.entities[i] != null) {
					try {
						const node = await this.factory.building(data.children.entities[i], resources)

						if (node != null) {
							this.lockNode(node)
							root.add(node)
							this.editor.signals.sceneGraphChanged.dispatch()
						}
					} catch (error) {

						console.error(error)
					}
				}
			}
		}
	}

	setTransform(node, transform) {
		const p = transform.position
		const s = transform.scale
		const r = transform.rotate
		node.position.set(p.x, p.y, p.z)
		node.scale.set(s.x, s.y, s.z)
		node.rotation.set(
			THREE.Math.degToRad(r.x),
			THREE.Math.degToRad(r.y),
			THREE.Math.degToRad(r.z)
		)
	}
	getMatrix4(transform) {
		const p = transform.position
		const s = transform.scale
		const r = transform.rotate
		const rotate = new THREE.Matrix4().makeRotationFromEuler(
			new THREE.Euler(
				THREE.Math.degToRad(r.x),
				THREE.Math.degToRad(r.y),
				THREE.Math.degToRad(r.z),
				'XYZ'
			)
		)
		const scale = new THREE.Matrix4().makeScale(s.x, s.y, s.z)

		rotate.multiply(scale).setPosition(p.x, p.y, p.z)
		return rotate
	}

	lockNode(node) {
		this.factory.lockNode(node)
	}


	async addEntity(entity, resources) {

		return await this.factory.building(entity, resources)

	}


	async lights() {
		const light = {
			metadata: {
				version: 4.5,
				type: 'Object',
				generator: 'Object3D.toJSON'
			},
			object: {
				uuid: '10331223-0128-441b-b358-c3016a6ecc2f',
				type: 'Group',
				name: 'Lights',
				layers: 1,
				matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
				children: [
					{
						uuid: 'f4c131be-dac2-4a72-8e72-fbabc4e430bb',
						type: 'PointLight',
						name: 'PointLight',
						layers: 1,
						matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
						color: 16777215,
						intensity: 1,
						distance: 0,
						decay: 1
					},
					{
						uuid: '9d42f72e-d9f3-4f4b-beff-069ab0922a89',
						type: 'DirectionalLight',
						name: 'DirectionalLight',
						layers: 1,
						matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 5, 10, 7.5, 1],
						color: 16777215,
						intensity: 1
					},
					{
						uuid: '8b6b5b36-c5ed-4c21-9453-a8dd04ca53fe',
						type: 'AmbientLight',
						name: 'AmbientLight',
						layers: 1,
						matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
						color: 2236962,
						intensity: 2
					}
				]
			}
		}

		let node = await this.parseNode(light)
		return node
	}
	async parseNode(json) {
		return new Promise(async (resolve, reject) => {
			try {
				var loader = new THREE.ObjectLoader()
				const data = await loader.parseAsync(json)
				resolve(data)
			} catch (e) {
				alert(e)
				reject(e)
			}
		})
	}

	addNode(node) {
		self.editor.addObject(node)
	}
}


export { SceneBuilder }
*/