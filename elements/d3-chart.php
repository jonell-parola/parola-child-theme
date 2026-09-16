<?php
/**
 * Bricks custom element: Parola D3 Chart
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

	public function get_label() {
		return esc_html__( 'D3 Chart', 'bricks' );
	}

	public function get_keywords() {
		return array( 'chart', 'csv', 'd3', 'data', 'visualization' );
	}

	public function set_controls() {
		$this->controls['csvFile'] = array(
			'tab'         => 'content',
			'label'       => esc_html__( 'CSV file', 'bricks' ),
			'type'        => 'file',
			'accept'      => array( 'text/csv', '.csv' ),
			'allowedTypes'=> array( 'text/csv', '.csv' ),
			'description' => esc_html__( 'Select an existing CSV or upload a new CSV file.', 'bricks' ),
		);

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
			),
			'default'     => 'bar',
			'clearable'   => false,
			'placeholder' => esc_html__( 'Column', 'bricks' ),
		);

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
		);
	}

	/**
	 * Normalize the values returned by Bricks' file control. The additional
	 * shapes keep older saved URL/link values working during migration.
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
				if ( empty( $data['url'] ) && ! empty( $value[ $url_key ] ) && is_string( $value[ $url_key ] ) ) {
					$data['url'] = esc_url_raw( $value[ $url_key ] );
				}
			}

			foreach ( array( 'filename', 'name', 'title' ) as $name_key ) {
				if ( ! empty( $value[ $name_key ] ) && is_string( $value[ $name_key ] ) ) {
					$data['filename'] = sanitize_file_name( $value[ $name_key ] );
					break;
				}
			}

			// Some Bricks versions nest the selected media item under "file".
			if ( isset( $value['file'] ) ) {
				$nested = $this->get_csv_data( $value['file'] );
				$data   = array_merge( $data, array_filter( $nested ) );
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

		if ( $data['url'] && 'csv' !== strtolower( pathinfo( wp_parse_url( $data['url'], PHP_URL_PATH ), PATHINFO_EXTENSION ) ) ) {
			$data['url'] = '';
		}

		return $data;
	}

	public function render() {
		$settings = $this->settings;
		$csv      = $this->get_csv_data( isset( $settings['csvFile'] ) ? $settings['csvFile'] : array() );

		// Preserve charts saved with the previous URL/link control.
		if ( empty( $csv['url'] ) && isset( $settings['csvUrl'] ) ) {
			$csv = $this->get_csv_data( $settings['csvUrl'] );
		}

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
		);

		$chart_type = isset( $settings['chartType'] ) ? sanitize_key( $settings['chartType'] ) : 'bar';
		if ( ! in_array( $chart_type, $allowed_chart_types, true ) ) {
			$chart_type = 'bar';
		}

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

		$this->set_attribute( '_root', 'class', 'parola-d3-chart-element' );

		if ( empty( $csv['url'] ) ) {
			echo '<div ' . $this->render_attributes( '_root' ) . '>';
			echo '<p class="parola-d3-chart-empty">' . esc_html__( 'Select or upload a CSV file in the D3 Chart settings.', 'bricks' ) . '</p>';
			echo '</div>';
			return;
		}

		$this->set_attribute( 'canvas', 'class', 'd3-test-canvas' );
		$this->set_attribute( 'canvas', 'data-csv-url', esc_url( $csv['url'] ) );
		$this->set_attribute( 'canvas', 'data-csv-filename', sanitize_file_name( $csv['filename'] ) );
		$this->set_attribute( 'canvas', 'chart-type', $chart_type );
		$this->set_attribute( 'canvas', 'logo-style', $logo_style );

		echo '<div ' . $this->render_attributes( '_root' ) . '>';
		echo '<div ' . $this->render_attributes( 'canvas' ) . '></div>';
		echo '</div>';
	}
}
