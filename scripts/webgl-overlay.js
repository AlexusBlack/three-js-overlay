import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/ShaderPass.js';

import { vertexShader, fragmentShaderHover, fragmentShaderScroll } from './webgl-overlay-shaders.js';

class WebGLOverlay {
    constructor() {
        this.windowWidth = window.innerWidth; 
        this.windowHeight = window.innerHeight;
        this.then = 0;
        this.updateCallbacks = [];

        const threejsoImages = Array.from(document.querySelectorAll('.threejso-image'));
        if(threejsoImages.length > 0) {
            this.initOverlay();
            this.processThreeJsOImages(threejsoImages);
            this.addPostProcessing();
        }
    }

    initOverlay() {
        this.loader = new THREE.TextureLoader();
        this.scene = new THREE.Scene();
        this.scene.background = null; //new THREE.Color(0xffffff);

        this.camera = new THREE.OrthographicCamera(this.windowWidth / - 2, this.windowWidth / 2, this.windowHeight / 2, this.windowHeight / - 2, 1, 1000);
        this.camera.position.set(this.windowWidth/2, -this.windowHeight/2 - window.scrollY, 10);
        this.scene.add(this.camera);

        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(this.windowWidth, this.windowHeight);

        document.body.appendChild(this.renderer.domElement);

        this.renderer.domElement.classList.add('webgl-overlay');

        this.composer = new EffectComposer(this.renderer);
        this.composer.setSize(this.windowWidth, this.windowHeight);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        // Start rendering
        const self = this;
        requestAnimationFrame((now) => this.renderUpdate.call(self, now));
    }

    renderUpdate(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - this.then;
        this.then = now;

        // Keeping camera in alingment with page scroll
        this.camera.position.set(this.windowWidth/2, -this.windowHeight/2 - window.scrollY, 10);

        this.updateCallbacks.forEach(c => c(now, deltaTime));

        //renderer.render(scene, camera);
        this.composer.render(deltaTime)
        const self = this;
        requestAnimationFrame((now) => this.renderUpdate.call(self, now));
    }

    addPostProcessing() {
        const pageInertiaShader = {
            uniforms: {
                tDiffuse: { value: null },
                effectVelocity: { value: 0 }
            },
            vertexShader,
            fragmentShader: fragmentShaderScroll
        };
        const inertiaShaderPass = new ShaderPass(pageInertiaShader);
        inertiaShaderPass.renderToScreen = true;
        this.composer.addPass(inertiaShaderPass)

        let justScrolled = false;
        let justScrolledTimeout = null;
        document.addEventListener('scroll', function() {
            justScrolled = true;
            clearTimeout(justScrolledTimeout);
            justScrolledTimeout = setTimeout(() => justScrolled = false, 10);
        });

        this.updateCallbacks.push(function(now, deltaTime) {
            if(justScrolled) {
                inertiaShaderPass.uniforms.effectVelocity.value += 0.3 * deltaTime;
            } else {
                inertiaShaderPass.uniforms.effectVelocity.value -= 0.3 * deltaTime;
            }
            inertiaShaderPass.uniforms.effectVelocity.value = Math.max(0, Math.min(2, inertiaShaderPass.uniforms.effectVelocity.value));
        });
    }

    async processThreeJsOImages(images) {
        const uniformsTransitions = [];
        const self = this;

        images.forEach(async function(image) {
            const path = image.src;
            const imgSize = {x: image.naturalWidth, y: image.naturalHeight};
            const rect = image.getBoundingClientRect();
            const size = {x: rect.width, y: rect.height}; 
            const position = {x: rect.left + size.x/2, y: ((window.scrollY + rect.top) * -1 - size.y/2)};
            const uniforms = (await self.addImage(path, imgSize, size, position)).uniforms;
            const uniformsTransition = {
                uniforms,
                hover: false
            };
            uniformsTransitions.push(uniformsTransition);
            image.addEventListener('mouseover', () => uniformsTransition.hover = true );
            image.addEventListener('mouseout', () => uniformsTransition.hover = false );
        });

        this.updateCallbacks.push(function(now, deltaTime) {
            uniformsTransitions.forEach(function(uniformTransition) {
                if(uniformTransition.hover) {
                    uniformTransition.uniforms.hover.value += 0.8 * deltaTime;
                } else {
                    uniformTransition.uniforms.hover.value -= 0.8 * deltaTime;
                }
                uniformTransition.uniforms.hover.value = Math.max(0, Math.min(1, uniformTransition.uniforms.hover.value));
            });
        });
    }

    loadTexture(path) {
        const self = this;
        return new Promise(function(resolve) {
            self.loader.load(path, resolve);
        });
    }

    async addImage(path, imgSize, size, position) {
        let texture = await this.loadTexture(path);
        let scaledWidth = imgSize.x * (size.y / imgSize.y);
        
        // geometry for image and clip sides
        let geometry = new THREE.PlaneGeometry(imgSize.x, imgSize.y);

        const uniforms = {
            s_texture: { value: texture },
            hover: { value: 0 },
            opacity: { value: 1 },
        };
        let material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader: fragmentShaderHover,
            uniforms
        });

        // creating meshes for plane and clip sides
        let plane = new THREE.Mesh(geometry, material);

        // positioning the image and its clip sides
        plane.position.set(position.x, position.y);

        // scaleing the image to required size (clips will resize automatically)
        plane.scale.set(scaledWidth / imgSize.x, size.y / imgSize.y, 1);

        this.scene.add(plane);

        return { plane, size, uniforms };
    }
}

const webglOverlay = new WebGLOverlay();