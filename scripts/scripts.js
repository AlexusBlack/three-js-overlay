import * as THREE from 'https://cdn.skypack.dev/three@0.129.0';
import { EffectComposer } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/postprocessing/ShaderPass.js';

(async function() {
    const pageImages = Array.from(document.querySelectorAll('.threejso-image'));

    // If no images need the WebGL overlay then doing nothing
    if(pageImages.length == 0) return;

    let windowWidth = window.innerWidth; 
    let windowHeight = window.innerHeight;

    const loader = new THREE.TextureLoader();
    const scene = new THREE.Scene();
    scene.background = null; //new THREE.Color(0xffffff);

    const camera = new THREE.OrthographicCamera(windowWidth / - 2, windowWidth / 2, windowHeight / 2, windowHeight / - 2, 1, 1000);
    camera.position.set(windowWidth/2, -windowHeight/2 - window.scrollY, 10);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer( { alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(windowWidth, windowHeight);
    document.body.appendChild(renderer.domElement);
    renderer.domElement.classList.add('three-js-overlay');

    const composer = new EffectComposer(renderer);
    composer.setSize(windowWidth, windowHeight);
    composer.addPass(new RenderPass(scene, camera));

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
    composer.addPass(inertiaShaderPass)

    const uniformsTransitions = [];

    pageImages.forEach(async function(image) {
        const path = image.src;
        const imgSize = {x: image.naturalWidth, y: image.naturalHeight};
        const rect = image.getBoundingClientRect();
        const size = {x: rect.width, y: rect.height}; 
        const position = {x: rect.left + size.x/2, y: ((window.scrollY + rect.top) * -1 - size.y/2)};
        const uniforms = (await addImage(path, imgSize, size, position)).uniforms;
        const uniformsTransition = {
            uniforms,
            hover: false
        };
        uniformsTransitions.push(uniformsTransition);
        image.addEventListener('mouseover', () => uniformsTransition.hover = true );
        image.addEventListener('mouseout', () => uniformsTransition.hover = false );
    });

    let justScrolled = false;
    let justScrolledTimeout = null;
    document.addEventListener('scroll', function() {
        camera.position.set(windowWidth/2, -windowHeight/2 - window.scrollY, 10);

        justScrolled = true;
        clearTimeout(justScrolledTimeout);
        justScrolledTimeout = setTimeout(() => justScrolled = false, 10);
    });

    let then = 0;
    function update(now) {
        now *= 0.001;  // convert to seconds
        const deltaTime = now - then;
        then = now;

        uniformsTransitions.forEach(function(uniformTransition) {
            if(uniformTransition.hover) {
                uniformTransition.uniforms.hover.value += 0.8 * deltaTime;
            } else {
                uniformTransition.uniforms.hover.value -= 0.8 * deltaTime;
            }
            uniformTransition.uniforms.hover.value = Math.max(0, Math.min(1, uniformTransition.uniforms.hover.value));
        });

        if(justScrolled) {
            inertiaShaderPass.uniforms.effectVelocity.value += 0.3 * deltaTime;
        } else {
            inertiaShaderPass.uniforms.effectVelocity.value -= 0.3 * deltaTime;
        }
        inertiaShaderPass.uniforms.effectVelocity.value = Math.max(0, Math.min(1, inertiaShaderPass.uniforms.effectVelocity.value));

        //renderer.render(scene, camera);
        composer.render(deltaTime)
        requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    /* Utils */
    function loadTexture(path) {
        return new Promise(function(resolve) {
            loader.load(path, resolve);
        });
    }

    async function addImage(path, imgSize, size, position) {
        let texture = await loadTexture(path);
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
            fragmentShader: fragmentShaderOwn,
            uniforms
        });

        // creating meshes for plane and clip sides
        let plane = new THREE.Mesh(geometry, material);

        // positioning the image and its clip sides
        plane.position.set(position.x, position.y);

        // scaleing the image to required size (clips will resize automatically)
        plane.scale.set(scaledWidth / imgSize.x, size.y / imgSize.y, 1);

        scene.add(plane);

        return { plane, size, uniforms };
    }
})();