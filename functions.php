<?php 
/**
 * Register/enqueue custom scripts and styles
 */
add_action( 'wp_enqueue_scripts', function() {
	// Enqueue your files on the canvas & frontend, not the builder panel. Otherwise custom CSS might affect builder)
	if ( ! bricks_is_builder_main() ) {
		wp_enqueue_style( 'bricks-child', get_stylesheet_uri(), ['bricks-frontend'], filemtime( get_stylesheet_directory() . '/style.css' ) );
	}
} );

/**
 * Register custom elements
 */
add_action( 'init', function() {
  $element_files = [
    __DIR__ . '/elements/title.php',
  ];

  foreach ( $element_files as $file ) {
    \Bricks\Elements::register_element( $file );
  }
}, 11 );

/**
 * Add text strings to builder
 */
add_filter( 'bricks/builder/i18n', function( $i18n ) {
  // For element category 'custom'
  $i18n['custom'] = esc_html__( 'Custom', 'bricks' );

  return $i18n;
} );


// OLD CODE // Blog post prefix /blog
// function add_rewrite_rules( $wp_rewrite )
// {
//     $new_rules = array(
//         'blog/(.+?)/?$' => 'index.php?post_type=post&name='. $wp_rewrite->preg_index(1),
//     );

//     $wp_rewrite->rules = $new_rules + $wp_rewrite->rules;
// }
// add_action('generate_rewrite_rules', 'add_rewrite_rules'); 

// function change_blog_links($post_link, $id=0){

//     $post = get_post($id);

//     if( is_object($post) && $post->post_type == 'post'){
//         return home_url('/blog/'. $post->post_name.'/');
//     }

//     return $post_link;
// }
// add_filter('post_link', 'change_blog_links', 1, 3);

// Populate content type to download request form
add_filter('gform_field_value_content_type', 'populate_acf_content_type');
function populate_acf_content_type($value) {
    $post_id = get_the_ID();
    $value = get_field('content_type', $post_id);

    return $value;
}


/** 02.24.2026
 * ---------------------------------------------------------
 * Rewrite rules ONLY for default Posts
 * New: /parolanews/post-name/
 * Old: /blog/post-name/
 * ---------------------------------------------------------
 */
function parolanews_post_rewrite_rules() {

    add_rewrite_rule(
        '^parolanews/(?!latest$)([^/]+)/?$',
        'index.php?post_type=post&name=$matches[1]',
        'top'
    );

    add_rewrite_rule(
        '^blog/([^/]+)/?$',
        'index.php?post_type=post&name=$matches[1]',
        'top'
    );

}
add_action( 'init', 'parolanews_post_rewrite_rules' );


/**
 * ---------------------------------------------------------
 * Force Post permalinks to use /parolanews/
 * ---------------------------------------------------------
 */
function parolanews_change_post_links( $post_link, $post ) {

    if ( $post->post_type === 'post' ) {
        return home_url( '/parolanews/' . $post->post_name . '/' );
    }

    return $post_link;
}
add_filter( 'post_link', 'parolanews_change_post_links', 10, 2 );


/**
 * ---------------------------------------------------------
 * Redirect old /blog/post-name/ to /parolanews/post-name/
 * ---------------------------------------------------------
 */
function parolanews_redirect_old_blog() {

    if ( preg_match('#^blog/([^/]+)/?$#', trim($_SERVER['REQUEST_URI'], '/'), $matches) ) {

        $post = get_page_by_path($matches[1], OBJECT, 'post');

        if ($post) {
            wp_redirect(home_url('/parolanews/' . $post->post_name . '/'), 301);
            exit;
        }
    }
}
add_action('template_redirect', 'parolanews_redirect_old_blog');


/**
 * ---------------------------------------------------------
 * Redirect /blogs/ to /parolanews/
 * ---------------------------------------------------------
 */
function parolanews_redirect_archive() {

    if ( trim($_SERVER['REQUEST_URI'], '/') === 'blogs' ) {
        wp_redirect(home_url('/parolanews/'), 301);
        exit;
    }
}
add_action('template_redirect', 'parolanews_redirect_archive');

/**
 * Redirect /blog/page/X/ → /parolanews/page/X/
 */
function parolanews_redirect_old_blog_pagination() {
    $request = trim($_SERVER['REQUEST_URI'], '/');

    if ( preg_match('#^blog/page/(\d+)/?$#', $request, $matches) ) {
        $page = $matches[1];
        wp_redirect( home_url('/parolanews/page/' . $page . '/'), 301 );
        exit;
    }
}
add_action('template_redirect', 'parolanews_redirect_old_blog_pagination');


/**
 * ---------------------------------------------------------
 * Shortcode: [view_counter]
 * ---------------------------------------------------------
 */
function my_view_counter_shortcode() {
    if (!is_singular()) return '';

    global $post;

    $post_id = $post->ID;
    $meta_key = 'my_view_count';

    // Get current count
    $count = get_post_meta($post_id, $meta_key, true);

    // If empty, start at 1000
    if ($count === '') {
        $count = 1000;
    }

    // Increment
    $count++;

    // Update meta
    update_post_meta($post_id, $meta_key, $count);

    return number_format($count);
}
add_shortcode('view_counter', 'my_view_counter_shortcode');


/**
 * ---------------------------------------------------------
 * Increment counter on successful Gravity Form submission (Form ID 10)
 * ---------------------------------------------------------
 */
add_action('gform_after_submission_10', 'my_lr_submission_counter', 10, 2);

function my_lr_submission_counter($entry, $form) {

    // Try to get current post ID (works if form is embedded in the post)
    $post_id = get_the_ID();

    // Fallback: check if post ID is passed via query (?post_id=123)
    if (!$post_id && isset($_GET['post_id'])) {
        $post_id = intval($_GET['post_id']);
    }

    // Stop if no post or not 'lr' post type
    if (!$post_id || get_post_type($post_id) !== 'lr') return;

    $meta_key = 'lr_submission_count';

    // Get current count
    $count = get_post_meta($post_id, $meta_key, true);

    // Default = 1000
    if ($count === '') {
        $count = 1000;
    }

    // Increment
    $count++;

    // Save
    update_post_meta($post_id, $meta_key, $count);
}

// Shortcode: [lr_submission_count]
function lr_submission_count_shortcode() {
    if (!is_singular('lr')) return '';

    global $post;

    $count = get_post_meta($post->ID, 'lr_submission_count', true);

    if ($count === '') {
        $count = 1000;
    }

    return number_format($count);
}
add_shortcode('lr_submission_count', 'lr_submission_count_shortcode');

/**
 * Parola Visualization Pipeline: CDN Loading & Dependency Injection
 */
function parola_enqueue_visualization_assets() {
    // 1. Inject PapaParse from CDN
    wp_enqueue_script(
        'papaparse-cdn', 
        'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js', 
        array(), 
        '5.4.1', 
        true
    );

    // 2. Inject D3.js from cdnjs safe public repository
    wp_enqueue_script(
        'd3-cdn', 
        'https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js', 
        array(), 
        '7.9.0', 
        true
    );

    // 3. Load custom engine (Requires BOTH libraries to be processed completely first)
    wp_enqueue_script(
        'parola-charts', 
        get_stylesheet_directory_uri() . '/js/parola-charts.js', 
        array('papaparse-cdn', 'd3-cdn'), 
        '1.0.14', // Bumped version string to override any aggressive cache memory
        true
    );
}
add_action( 'wp_enqueue_scripts', 'parola_enqueue_visualization_assets' );