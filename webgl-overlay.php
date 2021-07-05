<?php
/*
Plugin Name: WebGL Overlay
Description: WebGL overlay layer to apply WebGL Shader effects and other 3D effects on a web page. 
Version: 1.1
Author: Alex Chernov
Author URI: https://alexchernov.com
*/
define('WEBGL_OVERLAY_VERSION', '1.1');
 
function webgl_overlay_scripts_and_styles() {
    wp_enqueue_style('webgl-overlay-style', plugin_dir_url(__FILE__) . 'styles/webgl-overlay.css', array(), WEBGL_OVERLAY_VERSION);
    wp_enqueue_script('webgl-overlay-script', plugin_dir_url(__FILE__) . 'scripts/webgl-overlay.js', array(), WEBGL_OVERLAY_VERSION, true);
}
function webgl_overlay_scripts_as_module($tag, $handle, $src) {
    if($handle !== 'webgl-overlay-script') return $tag;
    return '<script type="module" src="' . esc_url($src) . '"></script>';
}
add_action('wp_enqueue_scripts', 'webgl_overlay_scripts_and_styles');
add_filter('script_loader_tag', 'webgl_overlay_scripts_as_module', 10, 3);
?>