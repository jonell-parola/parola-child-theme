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
        '1.0.60', // Multi-instance + robust CSV parsing (no NaN bars)
        // EXPERIMENTAL VERSIONS: "1.0.52","1.0.53","1.0.54", "1.0.56", "1.0.57", "1.0.58", "1.0.59", "1.0.60"
		// STABLE VERSIONS: "1.0.51", "1.0.55", "1.0.60"
        true
    );
}
add_action( 'wp_enqueue_scripts', 'parola_enqueue_visualization_assets' );

/**Gutenberg editor control*/
/**
 * Custom D3 Chart Gutenberg Block
 *
 * Paste this entire block into your active child theme's functions.php.
 * No separate files, no build step, no plugin required.
 *
 * Supports MULTIPLE instances per page/post. Each block renders a canvas
 * with a unique ID plus a shared ".d3-test-canvas" class. The D3 engine,
 * the front-end CSV loader, and the guest control-hider below are all
 * scoped per-canvas, so instances no longer collide. The CSV upload /
 * Media Library selection behaviour is unchanged.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/* =========================================================================
 * 1. CSV UPLOAD SUPPORT
 * ========================================================================= */

/**
 * Allow .csv uploads through the Media Library.
 */
add_filter( 'upload_mimes', 'custom_d3_allow_csv_upload_mimes' );
function custom_d3_allow_csv_upload_mimes( $mimes ) {
	$mimes['csv'] = 'text/csv';
	return $mimes;
}

/**
 * WordPress sometimes second-guesses the mime type of .csv files
 * (they can be sniffed as text/plain). Only correct it when the
 * actual file extension is .csv, so we don't loosen validation for
 * anything else.
 */
add_filter( 'wp_check_filetype_and_ext', 'custom_d3_fix_csv_filetype', 10, 5 );
function custom_d3_fix_csv_filetype( $data, $file, $filename, $mimes, $real_mime = '' ) {
	$filetype = wp_check_filetype( $filename, $mimes );

	if ( 'csv' === strtolower( $filetype['ext'] ) ) {
		$data['ext']             = 'csv';
		$data['type']            = 'text/csv';
		$data['proper_filename'] = $filename;
	}

	return $data;
}

/* =========================================================================
 * 2. BLOCK REGISTRATION
 * ========================================================================= */

add_action( 'init', 'custom_d3_register_block' );
function custom_d3_register_block() {

	register_block_type(
		'custom-d3/chart-block',
		array(
			'attributes'      => array(
				'csvId'       => array(
					'type'    => 'number',
					'default' => 0,
				),
				'csvUrl'      => array(
					'type'    => 'string',
					'default' => '',
				),
				'csvFilename' => array(
					'type'    => 'string',
					'default' => '',
				),
				'chartType'   => array(
					'type'    => 'string',
					'default' => 'bar',
				),
			),
			'supports'        => array(
				'multiple' => true,
			),
			'render_callback' => 'custom_d3_render_block',
		)
	);
}

/* =========================================================================
 * 3. DYNAMIC PHP RENDER CALLBACK
 * ========================================================================= */

function custom_d3_render_block( $attributes ) {

	// Unique, incrementing ID per block instance so multiple charts on the
	// same page never share the same element ID. The shared "d3-test-canvas"
	// class is what the front-end scripts select on.
	static $instance = 0;
	$instance++;
	$canvas_id = 'd3-test-canvas-' . $instance;

	$csv_id       = isset( $attributes['csvId'] ) ? absint( $attributes['csvId'] ) : 0;
	$csv_filename = isset( $attributes['csvFilename'] ) ? sanitize_file_name( $attributes['csvFilename'] ) : '';

	$allowed_chart_types = array(
		'bar',
		'line',
		'pie',
		'stacked-bar',
		'horizontal-bar',
		'horizontal-stacked-bar',
	);

	$chart_type = isset( $attributes['chartType'] )
		? sanitize_key( $attributes['chartType'] )
		: 'bar';

	if ( ! in_array( $chart_type, $allowed_chart_types, true ) ) {
		$chart_type = 'bar';
	}

	// Never trust the stored URL blindly — re-resolve it from the
	// attachment ID every time the block renders.
	$csv_url = '';
	if ( $csv_id > 0 ) {
		$fresh_url = wp_get_attachment_url( $csv_id );
		if ( $fresh_url ) {
			$csv_url = esc_url_raw( $fresh_url );
		}
	}

	$wrapper_attributes = get_block_wrapper_attributes();

	if ( empty( $csv_url ) ) {
		return sprintf(
			'<div %1$s><div id="%2$s" class="d3-test-canvas"></div><p style="color:#b32d2e;font-style:italic;">%3$s</p></div>',
			$wrapper_attributes,
			esc_attr( $canvas_id ),
			esc_html__( 'No CSV file has been selected for this D3 chart yet. Edit this block and choose a CSV file.', 'custom-d3' )
		);
	}

	return sprintf(
		'<div %1$s><div id="%2$s" class="d3-test-canvas" data-csv-url="%3$s" data-csv-filename="%4$s" chart-type="%5$s"></div></div>',
		$wrapper_attributes,
		esc_attr( $canvas_id ),
		esc_url( $csv_url ),
		esc_attr( $csv_filename ),
		esc_attr( $chart_type )
	);
}

/* =========================================================================
 * 4. BLOCK EDITOR SCRIPT (registered "virtually" via wp_add_inline_script)
 * ========================================================================= */

add_action( 'enqueue_block_editor_assets', 'custom_d3_enqueue_editor_script' );
function custom_d3_enqueue_editor_script() {

	// Register a handle with no actual src file, then attach the whole
	// script body as an inline script. This avoids needing FTP access
	// to create a separate .js file.
	wp_register_script(
		'custom-d3-editor-script',
		'',
		array( 'wp-blocks', 'wp-element', 'wp-components', 'wp-block-editor', 'wp-i18n' ),
		'1.0.0',
		true
	);

	wp_add_inline_script( 'custom-d3-editor-script', custom_d3_get_editor_js() );

	wp_enqueue_script( 'custom-d3-editor-script' );
}

function custom_d3_get_editor_js() {
	ob_start();
	?>
( function ( blocks, element, components, blockEditor, i18n ) {
	var el              = element.createElement;
	var registerBlockType = blocks.registerBlockType;
	var useBlockProps    = blockEditor.useBlockProps;
	var MediaUpload      = blockEditor.MediaUpload;
	var MediaUploadCheck = blockEditor.MediaUploadCheck;
	var Button           = components.Button;
	var Notice           = components.Notice;
	var SelectControl    = components.SelectControl;
	var __               = i18n.__;

	registerBlockType( 'custom-d3/chart-block', {
		title: __( 'D3 Chart', 'custom-d3' ),
		description: __( 'Displays a D3.js chart generated from an uploaded CSV file. Multiple charts per page are supported.', 'custom-d3' ),
		icon: 'chart-bar',
		category: 'widgets',
		supports: {
			multiple: true
		},
		attributes: {
			csvId: {
				type: 'number',
				default: 0
			},
			csvUrl: {
				type: 'string',
				default: ''
			},
			csvFilename: {
				type: 'string',
				default: ''
			},
			chartType: {
				type: 'string',
				default: 'bar'
			}
		},

		edit: function ( props ) {
			var attributes   = props.attributes;
			var setAttributes = props.setAttributes;
			var blockProps   = useBlockProps();

			function onSelectCsv( media ) {
				if ( ! media || ! media.url ) {
					return;
				}
				setAttributes( {
					csvId: media.id || 0,
					csvUrl: media.url || '',
					csvFilename: media.filename || media.title || ''
				} );
			}

			function onRemoveCsv() {
				setAttributes( {
					csvId: 0,
					csvUrl: '',
					csvFilename: ''
				} );
			}

			var hasCsv = !! attributes.csvId && !! attributes.csvUrl;

			var children = [];

			if ( ! hasCsv ) {
				children.push(
					el( Notice, {
						key: 'no-csv-notice',
						status: 'warning',
						isDismissible: false
					}, __( 'No CSV file selected. Please upload or choose a CSV file below.', 'custom-d3' ) )
				);
			} else {
				children.push(
					el( 'p', { key: 'csv-filename' },
						__( 'Selected CSV: ', 'custom-d3' ) + attributes.csvFilename
					)
				);
			}

			children.push(
				el( MediaUploadCheck, { key: 'media-upload-check' },
					el( MediaUpload, {
						onSelect: onSelectCsv,
						allowedTypes: [ 'text/csv', '.csv' ],
						value: attributes.csvId,
						render: function ( openProps ) {
							return el( Button, {
								variant: 'primary',
								onClick: openProps.open
							}, hasCsv
								? __( 'Replace CSV', 'custom-d3' )
								: __( 'Select or Upload CSV', 'custom-d3' )
							);
						}
					} )
				)
			);

			if ( hasCsv ) {
				children.push(
					el( Button, {
						key: 'remove-csv',
						variant: 'secondary',
						isDestructive: true,
						onClick: onRemoveCsv,
						style: { marginLeft: '8px' }
					}, __( 'Remove CSV', 'custom-d3' ) )
				);
			}

			children.push(
				el( SelectControl, {
					key: 'chart-type',
					label: __( 'Chart Type', 'custom-d3' ),
					value: attributes.chartType || 'bar',
					options: [
						{ label: __( 'Bar', 'custom-d3' ), value: 'bar' },
						{ label: __( 'Line', 'custom-d3' ), value: 'line' },
						{ label: __( 'Pie Chart', 'custom-d3' ), value: 'pie' },
						{ label: __( 'Stacked Bar Chart', 'custom-d3' ), value: 'stacked-bar' },
						{ label: __( 'Horizontal Bar Chart', 'custom-d3' ), value: 'horizontal-bar' },
						{ label: __( 'Horizontal Stacked Bar Chart', 'custom-d3' ), value: 'horizontal-stacked-bar' }
					],
					onChange: function ( value ) {
						setAttributes( {
							chartType: value
						} );
					}
				} )
			);

			return el( 'div', blockProps,
				el( 'div', { className: 'custom-d3-editor-notice-wrap' }, children )
			);
		},

		save: function () {
			// Dynamic block — rendering is handled entirely by PHP.
			return null;
		}
	} );

} )(
	window.wp.blocks,
	window.wp.element,
	window.wp.components,
	window.wp.blockEditor,
	window.wp.i18n
);
	<?php
	return ob_get_clean();
}

/* =========================================================================
 * 5. FRONT-END SCRIPT
 *    Waits for the third-party generator's #csv-file input to appear,
 *    then fetches the CSV from the Media Library and injects it as if
 *    the user had picked it manually.
 * ========================================================================= */

add_action( 'wp_footer', 'custom_d3_print_frontend_script' );
function custom_d3_print_frontend_script() {

	// Only bother printing this if the block's markup is actually on
	// the page. A cheap, safe way to check without extra globals.
	if ( ! is_singular() ) {
		return;
	}

	global $post;
	if ( ! $post || false === strpos( $post->post_content, 'wp:custom-d3/chart-block' ) ) {
		return;
	}
	?>
	<script>
	( function () {
		// Handle every chart instance on the page independently.
		var canvases = document.querySelectorAll( '.d3-test-canvas' );
		if ( ! canvases.length ) {
			return;
		}

		canvases.forEach( function ( canvas ) {

			var csvUrl      = canvas.getAttribute( 'data-csv-url' );
			var csvFilename = canvas.getAttribute( 'data-csv-filename' ) || 'chart.csv';

			if ( ! csvUrl ) {
				return; // Nothing selected for this block instance.
			}

			var alreadyAssigned = false;

			function assignCsvToInput( fileInput ) {
				if ( alreadyAssigned ) {
					return;
				}

				fetch( csvUrl )
					.then( function ( response ) {
						if ( ! response.ok ) {
							throw new Error( 'custom-d3: failed to fetch CSV, status ' + response.status );
						}
						return response.blob();
					} )
					.then( function ( blob ) {
						var file = new File( [ blob ], csvFilename, { type: 'text/csv' } );
						var transfer = new DataTransfer();
						transfer.items.add( file );

						fileInput.files = transfer.files;
						fileInput.dispatchEvent( new Event( 'input', { bubbles: true } ) );
						fileInput.dispatchEvent( new Event( 'change', { bubbles: true } ) );

						alreadyAssigned = true;
					} )
					.catch( function ( error ) {
						console.error( 'custom-d3: error assigning CSV to file input.', error );
					} );
			}

			// The D3 script creates this canvas's file input after this script
			// runs, so check immediately and also observe for it being added
			// later. The lookup is scoped to THIS canvas (not a global ID), so
			// each block wires up to its own file input.
			var existingInput = canvas.querySelector( 'input[type="file"]' );
			if ( existingInput ) {
				assignCsvToInput( existingInput );
				return;
			}

			var observer = new MutationObserver( function ( mutations, obs ) {
				var fileInput = canvas.querySelector( 'input[type="file"]' );
				if ( fileInput ) {
					assignCsvToInput( fileInput );
					obs.disconnect();
				}
			} );

			observer.observe( canvas, {
				childList: true,
				subtree: true
			} );

			// Safety net: stop observing after 20 seconds even if the
			// input never appears, so we don't watch forever.
			setTimeout( function () {
				observer.disconnect();
			}, 20000 );
		} );
	} )();
	</script>
	<?php
}

/* =========================================================================
 * 6. HIDE SETTINGS/CONTROLS PANEL FOR LOGGED-OUT VISITORS
 *    The controls panel is reliably the first child div appended to
 *    #d3-test-canvas by the third-party script (before the tooltip and
 *    #chart-wrapper), so it can be targeted and hidden without touching
 *    the actual chart output. This runs client-side (cookie check)
 *    rather than via PHP conditionals, so it still works correctly
 *    behind a caching plugin/CDN that serves the same cached HTML to
 *    every logged-out visitor.
 * ========================================================================= */

add_action( 'wp_footer', 'custom_d3_hide_controls_for_guests_js', 100 );

function custom_d3_hide_controls_for_guests_js() {

	?>
	<script>
	(function () {
		function initD3GuestControls() {
			// Handle every chart instance on the page, not just the first.
			var canvases = document.querySelectorAll('.d3-test-canvas');

			if (!canvases.length) {
				return;
			}

			canvases.forEach(function (canvas) {

				function hideControls() {
					/*
					 * Hides the first direct child inside this canvas.
					 * This assumes the first child is the controls panel.
					 */
					var controls = canvas.firstElementChild;

					if (!controls) {
						return false;
					}

					controls.style.setProperty('display', 'none', 'important');

					return true;
				}

				// Try immediately in case the D3 controls already exist.
				if (hideControls()) {
					return;
				}

				// Watch for controls dynamically inserted by the D3 script.
				var observer = new MutationObserver(function () {
					if (hideControls()) {
						observer.disconnect();
					}
				});

				observer.observe(canvas, {
					childList: true,
					subtree: true
				});

				// Stop watching after 20 seconds.
				window.setTimeout(function () {
					observer.disconnect();
				}, 20000);
			});
		}

		if (document.readyState === 'loading') {
			document.addEventListener('DOMContentLoaded', initD3GuestControls);
		} else {
			initD3GuestControls();
		}
	})();
	</script>
	<?php
}