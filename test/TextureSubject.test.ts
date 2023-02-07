import test from 'ava';
import { LinearEncoding, MeshStandardMaterial, sRGBEncoding, Texture } from 'three';
import { Document } from '@gltf-transform/core';
import { DocumentView, NullImageProvider } from '@gltf-transform/view';

const imageProvider = new NullImageProvider();

test('TextureBinding', async t => {
	const document = new Document();
	const textureDef = document.createTexture('MyTexture')
		.setImage(new Uint8Array(0))
		.setMimeType('image/png')
		.setExtras({textureExtras: true});
	const materialDef = document.createMaterial()
		.setBaseColorTexture(textureDef)
		.setMetallicRoughnessTexture(textureDef);

	const documentView = new DocumentView(document, {imageProvider});
	const texture = documentView.view(textureDef);
	const material = documentView.view(materialDef) as MeshStandardMaterial;
	const map = material.map as Texture;
	const metalnessMap = material.metalnessMap as Texture;
	const roughnessMap = material.roughnessMap as Texture;

	t.truthy(texture, 'texture');
	t.is(map.encoding, sRGBEncoding, 'sRGB');
	t.is(roughnessMap.encoding, LinearEncoding, 'Linear-sRGB');
	t.is(metalnessMap.encoding, LinearEncoding, 'Linear-sRGB');
	t.true(map.source === metalnessMap.source, 'map.source === metalnessMap.source');
	t.true(metalnessMap === roughnessMap, 'metalnessMap === roughnessMap');
	t.falsy(texture.flipY || map.flipY || roughnessMap.flipY || metalnessMap.flipY, 'flipY=false');

	const disposed = new Set();
	texture.addEventListener('dispose', () => disposed.add(texture));
	map.addEventListener('dispose', () => disposed.add(map));
	metalnessMap.addEventListener('dispose', () => disposed.add(metalnessMap));
	roughnessMap.addEventListener('dispose', () => disposed.add(roughnessMap));

	materialDef.setBaseColorTexture(null);
	documentView.gc();

	t.is(disposed.size, 1, 'dispose count (1/3)');
	t.true(disposed.has(map), 'dispose map');

	materialDef.dispose();
	documentView.gc();

	t.is(disposed.size, 2, 'dispose count (2/3)');
	t.true(disposed.has(map), 'dispose roughnessMap, metalnessMap');

	textureDef.dispose();
	documentView.gc();

	t.is(disposed.size, 3, 'dispose count (3/3)');
	t.true(disposed.has(texture), 'dispose roughnessMap, metalnessMap');
});
