import { Texture as TextureDef } from '@gltf-transform/core';
import { CompressedTexture, Texture, WebGLRenderer, REVISION } from 'three';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader';

const TRANSCODER_PATH = `https://unpkg.com/three@0.${REVISION}.x/examples/js/libs/basis/`;

// Singleton KTX2Loader instance to pool Web Workers.
const KTX2_LOADER = (() => {
	const renderer = new WebGLRenderer();
	const loader = new KTX2Loader()
		.detectSupport(renderer)
		.setTranscoderPath(TRANSCODER_PATH);
	renderer.dispose();
	return loader;
})();

// Placeholder image.
const NULL_IMAGE_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAAXNSR0IArs4c6QAAABNJREFUGFdj/M9w9z8DEmAkXQAAyCMLcU6pckIAAAAASUVORK5CYII=';
export const NULL_TEXTURE = (() => {
	const imageEl = document.createElement('img');
	imageEl.src = NULL_IMAGE_URI;
	const texture = new Texture(imageEl);
	texture.name = '__NULL_TEXTURE';
	texture.flipY = false;
	return texture;
})();

export class ImageProvider {
	private _cache = new Map<ArrayBuffer, Texture|CompressedTexture>();

	async update(textureDefs: TextureDef[]): Promise<void> {
		const pending = textureDefs.map(async (textureDef) => {
			const image = textureDef.getImage()!;
			if (this._cache.has(image)) return;

			const mimeType = textureDef.getMimeType();
			const texture = mimeType === 'image/ktx2'
				? await this._loadKTX2Image(image)
				: await this._loadImage(image, mimeType);

			this._cache.set(image, texture);
		});

		await Promise.all(pending);
	}

	get(textureDef: TextureDef): Texture | CompressedTexture {
		const texture = this._cache.get(textureDef.getImage()!);
		if (!texture) {
			throw new Error(`ImageProvider not initialized for texture "${textureDef.getName()}".`);
		}
		return texture;
	}

	clear(): void {
		for (const [_, texture] of this._cache) {
			texture.dispose();
		}
		this._cache.clear();
	}

	/** Load PNG, JPEG, or other browser-suppored image format. */
	private async _loadImage(image: ArrayBuffer, mimeType: string): Promise<Texture> {
		return new Promise((resolve, reject) => {
			const blob = new Blob([image], {type: mimeType});
			const imageURL = URL.createObjectURL(blob);
			const imageEl = document.createElement('img');

			const texture = new Texture(imageEl);
			texture.flipY = false;

			imageEl.src = imageURL;
			imageEl.onload = () => {
				URL.revokeObjectURL(imageURL);
				resolve(texture);
			};
			imageEl.onerror = reject;
		});
	}

	/** Load KTX2 + Basis Universal compressed texture format. */
	private async _loadKTX2Image(image: ArrayBuffer): Promise<CompressedTexture> {
		const blob = new Blob([image], {type: 'image/ktx2'});
		const imageURL = URL.createObjectURL(blob);
		const texture = await KTX2_LOADER.loadAsync(imageURL);
		URL.revokeObjectURL(imageURL);
		return texture;
	}
}

export class NullImageProvider extends ImageProvider {
	get(texture: TextureDef): Texture {
		return NULL_TEXTURE;
	}
}