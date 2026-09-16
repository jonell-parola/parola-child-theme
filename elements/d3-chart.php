<?php
/**
 * Bricks custom element: Parola D3 Chart
 *
 * Compatible with parola-charts.js v1.0.83
 *
 * Place this file at:
 * /wp-content/themes/YOUR-CHILD-THEME/elements/d3-chart.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Parola_Element_D3_Chart extends \Bricks\Element {

	public $category = 'custom';
	public $name     = 'parola-d3-chart';
	public $icon     = 'ti-bar-chart';

	/**
	 * Bricks runs this global JavaScript function whenever the element
	 * renders on the frontend or is updated in the builder preview.
	 */
	public $scripts = array( 'parolaRefreshD3Chart' );

	public function get_label() {
		return esc_html__( 'D3 Chart', 'bricks' );
	}

	public function get_keywords() {
		return array( 'chart', 'csv', 'd3', 'data', 'visualization' );
	}

	public function set_controls() {

		// =========================================================
		// DATA SOURCE
		// =========================================================

		$this->controls['csvFile'] = array(
			'tab'          => 'content',
			'label'        => esc_html__( 'CSV file', 'bricks' ),
			'type'         => 'file',
			'accept'       => array( 'text/csv', '.csv' ),
			'allowedTypes' => array( 'text/csv', '.csv' ),
			'description'  => esc_html__( 'Select an existing CSV or upload a new CSV file.', 'bricks' ),
		);

		// =========================================================
		// CHART TYPE
		// =========================================================

		$this->controls['chartType'] = array(
			'tab'         => 'content',
			'label'       => esc_html__( 'Chart type', 'bricks' ),
			'type'        => 'select',
			'options'     => array(
				'bar'                    => esc_html__( 'Column', 'bricks' ),
				'line'                   => esc_html__( 'Line', 'bricks' ),
				'pie'                    => esc_html__( 'Pie chart', 'bricks' ),
				'stacked-bar'            => esc_html__( 'Stacked column chart', 'bricks' ),
				'horizontal-bar'         => esc_html__( 'Bar', 'bricks' ),
				'horizontal-stacked-bar' => esc_html__( 'Stacked bar chart', 'bricks' ),
				'multi-line'             => esc_html__( 'Multiple line chart', 'bricks' ),
				'stacked-area'           => esc_html__( 'Stacked area chart', 'bricks' ),
				'heatmap'                => esc_html__( 'Heatmap', 'bricks' ),
				'frequency-table'        => esc_html__( 'Frequency Table', 'bricks' ),
			),
			'default'     => 'bar',
			'clearable'   => false,
			'placeholder' => esc_html__( 'Column', 'bricks' ),
			'rerender'   => true,
		);

		// =========================================================
		// LOGO STYLE
		// =========================================================

		$this->controls['logoStyle'] = array(
			'tab'       => 'content',
			'label'     => esc_html__( 'Logo style', 'bricks' ),
			'type'      => 'select',
			'options'   => array(
				'parola logo with text.png' => esc_html__( 'Logo with Text', 'bricks' ),
				'parola logo only.png'      => esc_html__( 'Logo Only', 'bricks' ),
				'parola logo all white.png' => esc_html__( 'All White', 'bricks' ),
			),
			'default'   => 'parola logo with text.png',
			'clearable' => false,
			'rerender'   => true,
		);

		// =========================================================
		// DISPLAY OPTIONS
		// =========================================================

		$this->controls['displayOptionsInfo'] = array(
			'tab'     => 'content',
			'type'    => 'info',
			'content' => esc_html__( 'Display Options', 'bricks' ),
		);

		$this->controls['showLogo'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Logo', 'bricks' ),
			'type'    => 'checkbox',
			'inline'  => true,
			'small'   => true,
			'default' => true,
			'rerender' => true,
		);

		$this->controls['showTitle'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Title', 'bricks' ),
			'type'    => 'checkbox',
			'inline'  => true,
			'small'   => true,
			'default' => true,
			'rerender' => true,
		);

		$this->controls['showSubtitle'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Subtitle', 'bricks' ),
			'type'    => 'checkbox',
			'inline'  => true,
			'small'   => true,
			'default' => true,
			'rerender' => true,
		);

		$this->controls['showAxisLabels'] = array(
			'tab'     => 'content',
			'label'   => esc_html__( 'Show Axis Labels', 'bricks' ),
			'type'    => 'checkbox',
			'inline'  => true,
			'small'   => true,
			'default' => true,
			'rerender' => true,
		);

		// =========================================================
		// STACKED CHART OPTIONS
		// Kept visible in Bricks so the controls are always accessible.
		// =========================================================

		$this->controls['stackedOptionsInfo'] = array(
			'tab'      => 'content',
			'type'     => 'info',
			'content'  => esc_html__( 'Stacked Chart Options', 'bricks' ),
		);

		$this->controls['showDataLabels'] = array(
			'tab'      => 'content',
			'label'    => esc_html__( 'Show Data Labels', 'bricks' ),
			'type'     => 'checkbox',
			'inline'   => true,
			'small'    => true,
			'default'  => false,
			'rerender' => true,
		);

		$this->controls['showStackTotals'] = array(
			'tab'      => 'content',
			'label'    => esc_html__( 'Show Stack Totals', 'bricks' ),
			'type'     => 'checkbox',
			'inline'   => true,
			'small'    => true,
			'default'  => true,
			'rerender' => true,
		);
	}

	/**
	 * Normalize the values returned by Bricks' file control.
	 * The additional shapes keep older saved URL/link values working.
	 */
	private function get_csv_data( $value ) {
		$data = array(
			'id'       => 0,
			'url'      => '',
			'filename' => 'chart.csv',
		);

		if ( is_numeric( $value ) ) {
			$data['id'] = absint( $value );

		} elseif ( is_string( $value ) ) {
			$data['url'] = esc_url_raw( $value );

		} elseif ( is_array( $value ) ) {

			if ( isset( $value['id'] ) ) {
				$data['id'] = absint( $value['id'] );
			}

			foreach ( array( 'url', 'full' ) as $url_key ) {
				if (
					empty( $data['url'] ) &&
					! empty( $value[ $url_key ] ) &&
					is_string( $value[ $url_key ] )
				) {
					$data['url'] = esc_url_raw( $value[ $url_key ] );
				}
			}

			foreach ( array( 'filename', 'name', 'title' ) as $name_key ) {
				if (
					! empty( $value[ $name_key ] ) &&
					is_string( $value[ $name_key ] )
				) {
					$data['filename'] = sanitize_file_name( $value[ $name_key ] );
					break;
				}
			}

			// Some Bricks versions nest the selected media item under "file".
			if ( isset( $value['file'] ) ) {
				$nested = $this->get_csv_data( $value['file'] );

				if ( ! empty( $nested['id'] ) ) {
					$data['id'] = $nested['id'];
				}

				if ( ! empty( $nested['url'] ) ) {
					$data['url'] = $nested['url'];
				}

				if ( ! empty( $nested['filename'] ) && 'chart.csv' !== $nested['filename'] ) {
					$data['filename'] = $nested['filename'];
				}
			}
		}

		// Prefer the current Media Library URL so domain migrations remain safe.
		if ( $data['id'] > 0 ) {
			$attachment_url = wp_get_attachment_url( $data['id'] );

			if ( $attachment_url ) {
				$data['url'] = esc_url_raw( $attachment_url );
			}

			$attachment_file = get_attached_file( $data['id'] );

			if ( $attachment_file ) {
				$data['filename'] = sanitize_file_name( wp_basename( $attachment_file ) );
			}
		}

		// Only allow .csv files.
		if ( $data['url'] ) {
			$url_path = wp_parse_url( $data['url'], PHP_URL_PATH );

			if (
				! $url_path ||
				'csv' !== strtolower( pathinfo( $url_path, PATHINFO_EXTENSION ) )
			) {
				$data['url'] = '';
			}
		}

		return $data;
	}

	/**
	 * Safely resolve a Bricks checkbox value.
	 *
	 * This preserves the JS defaults when an older saved element does not
	 * contain the new setting yet.
	 */
	private function get_checkbox_setting( $settings, $key ) {
		/*
		 * Bricks checkbox controls are considered enabled when the setting
		 * exists and is truthy. When unchecked, Bricks can omit the key.
		 *
		 * This follows Bricks' documented checkbox rendering pattern:
		 * isset( $this->settings['checkboxKey'] ).
		 */
		if ( ! isset( $settings[ $key ] ) ) {
			return false;
		}

		$value = $settings[ $key ];

		if ( true === $value || 1 === $value || '1' === $value ) {
			return true;
		}

		if ( is_string( $value ) ) {
			$value = strtolower( trim( $value ) );

			return in_array(
				$value,
				array( 'true', 'yes', 'on', 'checked' ),
				true
			);
		}

		return (bool) $value;
	}

	public function render() {
		$settings = $this->settings;

		$csv = $this->get_csv_data(
			isset( $settings['csvFile'] )
				? $settings['csvFile']
				: array()
		);

		// Preserve charts saved with the previous URL/link control.
		if ( empty( $csv['url'] ) && isset( $settings['csvUrl'] ) ) {
			$csv = $this->get_csv_data( $settings['csvUrl'] );
		}

		// =========================================================
		// CHART TYPE
		// =========================================================

		$allowed_chart_types = array(
			'bar',
			'line',
			'pie',
			'stacked-bar',
			'horizontal-bar',
			'horizontal-stacked-bar',
			'multi-line',
			'stacked-area',
			'heatmap',
			'frequency-table',
		);

		$chart_type = isset( $settings['chartType'] )
			? sanitize_key( $settings['chartType'] )
			: 'bar';

		if ( ! in_array( $chart_type, $allowed_chart_types, true ) ) {
			$chart_type = 'bar';
		}

		// =========================================================
		// LOGO STYLE
		// =========================================================

		$allowed_logo_styles = array(
			'parola logo with text.png',
			'parola logo only.png',
			'parola logo all white.png',
		);

		$logo_style = isset( $settings['logoStyle'] )
			? sanitize_text_field( $settings['logoStyle'] )
			: 'parola logo with text.png';

		if ( ! in_array( $logo_style, $allowed_logo_styles, true ) ) {
			$logo_style = 'parola logo with text.png';
		}

		// =========================================================
		// DISPLAY / STACKED OPTIONS
		// Defaults intentionally match parola-charts.js v1.0.83.
		// =========================================================

		$show_logo = $this->get_checkbox_setting(
			$settings,
			'showLogo'
		);

		$show_title = $this->get_checkbox_setting(
			$settings,
			'showTitle'
		);

		$show_subtitle = $this->get_checkbox_setting(
			$settings,
			'showSubtitle'
		);

		$show_axis_labels = $this->get_checkbox_setting(
			$settings,
			'showAxisLabels'
		);

		$show_data_labels = $this->get_checkbox_setting(
			$settings,
			'showDataLabels'
		);

		$show_stack_totals = $this->get_checkbox_setting(
			$settings,
			'showStackTotals'
		);

		$bool_attr = static function ( $value ) {
			return $value ? 'true' : 'false';
		};

		// =========================================================
		// ROOT
		// =========================================================

		$this->set_attribute( '_root', 'class', 'parola-d3-chart-element' );

		if ( empty( $csv['url'] ) ) {
			echo '<div ' . $this->render_attributes( '_root' ) . '>';
			echo '<p class="parola-d3-chart-empty">' .
				esc_html__( 'Select or upload a CSV file in the D3 Chart settings.', 'bricks' ) .
			'</p>';
			echo '</div>';

			return;
		}

		// =========================================================
		// D3 CANVAS
		// =========================================================

		$this->set_attribute(
			'canvas',
			'class',
			array(
				'd3-test-canvas',
				'd3-bricks-preview',
			)
		);

		$this->set_attribute(
			'canvas',
			'data-csv-url',
			esc_url( $csv['url'] )
		);

		$this->set_attribute(
			'canvas',
			'data-csv-filename',
			sanitize_file_name( $csv['filename'] )
		);

		$this->set_attribute(
			'canvas',
			'data-chart-type',
			$chart_type
		);

		$this->set_attribute(
			'canvas',
			'data-logo-style',
			$logo_style
		);

		$this->set_attribute(
			'canvas',
			'data-show-logo',
			$bool_attr( $show_logo )
		);

		$this->set_attribute(
			'canvas',
			'data-show-title',
			$bool_attr( $show_title )
		);

		$this->set_attribute(
			'canvas',
			'data-show-subtitle',
			$bool_attr( $show_subtitle )
		);

		$this->set_attribute(
			'canvas',
			'data-show-axis-labels',
			$bool_attr( $show_axis_labels )
		);

		$this->set_attribute(
			'canvas',
			'data-show-data-labels',
			$bool_attr( $show_data_labels )
		);

		$this->set_attribute(
			'canvas',
			'data-show-stack-totals',
			$bool_attr( $show_stack_totals )
		);

		echo '<div ' . $this->render_attributes( '_root' ) . '>';
		echo '<div ' . $this->render_attributes( 'canvas' ) . '></div>';
		echo '</div>';
	}
}
