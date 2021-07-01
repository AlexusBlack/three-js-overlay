<?php
/*
Plugin Name: Three JS Overlay
Description: Three.js overlay layer to apply WebGL Shader effects and other 3D effects on a web page. 
Version: 1.1
Author: Alex Chernov
Author URI: https://alexchernov.com
*/
define('THREE_JS_OVERLAY_VERSION', '1.0');
 
function three_js_overlay_scripts_and_styles() {
    wp_enqueue_style('three-js-overlay-style', plugin_dir_url(__FILE__) . 'styles/three-js-overlay.css', array(), THREE_JS_OVERLAY_VERSION);
    wp_enqueue_script('three-js-overlay-script', plugin_dir_url(__FILE__) . 'scripts/three-js-overlay.js', array(), THREE_JS_OVERLAY_VERSION, true);
}
function three_js_overlay_scripts_as_module($tag, $handle, $src) {
    if($handle !== 'three-js-overlay-script') return $tag;
    return '<script type="module" src="' . esc_url($src) . '"></script>';
}
add_action('wp_enqueue_scripts', 'three_js_overlay_scripts_and_styles');
add_filter('script_loader_tag', 'three_js_overlay_scripts_as_module', 10, 3);
?>