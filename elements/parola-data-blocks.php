<?php

/**
 * Bricks custom element: Parola Data Blocks
 *
 * CSV-driven KPI/data blocks.
 *
 * Expected CSV columns:
 * label,value,subtext,type,url
 *
 * Example:
 *
 * "Patents Filed / Prosecuted (2025)","2,775","▲ 12% YoY","stat",""
 * "Grant efficiency (3-Year Grant Data)","58%","How is this calculated?","stat",""
 * "Average time to grant (days)","1050.67","▲ 45 this year","stat",""
 * "Minimum time to grant (days)","95","▲ 22 this year","stat",""
 * "Patents Filed / Prosecuted","1,845","▲ 8% this year","stat",""
 * "Firm Patent Intelligence Report","Get in touch","Premium content","premium","/contact/"
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}


/**
 * Allow CSV uploads in WordPress Media Library.
 */
add_filter( 'upload_mimes', function( $mimes ) {

	$mimes['csv'] = 'text/csv';

	return $mimes;
} );


/**
 * WordPress may detect CSV files as text/plain.
 * Correct the MIME when the actual extension is .csv.
 */
add_filter(
	'wp_check_filetype_and_ext',
	function( $data, $file, $filename, $mimes, $real_mime = '' ) {

		$filetype = wp_check_filetype(
			$filename,
			$mimes
		);

		if (
			! empty( $filetype['ext'] ) &&
			'csv' === strtolower( $filetype['ext'] )
		) {

			$data['ext']             = 'csv';
			$data['type']            = 'text/csv';
			$data['proper_filename'] = $filename;
		}

		return $data;

	},
	10,
	5
);



class Parola_Data_Blocks_Element extends \Bricks\Element {

	public $category = 'custom';

	public $name = 'parola-data-blocks';

	public $icon = 'ti-layout-grid3';


	/**
	 * Element label.
	 */
	public function get_label() {

		return esc_html__(
			'Parola Data Blocks',
			'bricks'
		);
	}


	/**
	 * Bricks search keywords.
	 */
	public function get_keywords() {

		return array(
			'data',
			'blocks',
			'csv',
			'kpi',
			'stats',
			'parola',
		);
	}


	/**
	 * =========================================================
	 * CONTROLS
	 * =========================================================
	 */
	public function set_controls() {

		/**
		 * Native Bricks file control.
		 *
		 * Same setup as the working D3 Chart element.
		 */
		$this->controls['csvFile'] = array(

			'tab' => 'content',

			'label' => esc_html__(
				'CSV file',
				'bricks'
			),

			'type' => 'file',

			'accept' => array(
				'text/csv',
				'.csv',
			),

			'allowedTypes' => array(
				'text/csv',
				'.csv',
			),

			'description' => esc_html__(
				'Select an existing CSV or upload a new CSV file.',
				'bricks'
			),
		);


		/**
		 * Desktop columns.
		 */
		$this->controls['columnsDesktop'] = array(

			'tab' => 'content',

			'label' => esc_html__(
				'Desktop columns',
				'bricks'
			),

			'type' => 'number',

			'default' => 6,

			'min' => 1,

			'max' => 12,
		);


		/**
		 * Tablet columns.
		 */
		$this->controls['columnsTablet'] = array(

			'tab' => 'content',

			'label' => esc_html__(
				'Tablet columns',
				'bricks'
			),

			'type' => 'number',

			'default' => 3,

			'min' => 1,

			'max' => 12,
		);


		/**
		 * Mobile columns.
		 */
		$this->controls['columnsMobile'] = array(

			'tab' => 'content',

			'label' => esc_html__(
				'Mobile columns',
				'bricks'
			),

			'type' => 'number',

			'default' => 2,

			'min' => 1,

			'max' => 12,
		);
	}



	/**
	 * =========================================================
	 * BUILT-IN ELEMENT CSS
	 * =========================================================
	 *
	 * Loaded automatically whenever this element is used.
	 */
	public function enqueue_scripts() {

		wp_register_style(
			'parola-data-blocks',
			false,
			array(),
			'1.0.0'
		);


		wp_enqueue_style(
			'parola-data-blocks'
		);


		$css = '

			.parola-data-blocks {

				display: grid;

				grid-template-columns:
					repeat(
						var(--parola-desktop, 6),
						minmax(0, 1fr)
					);

				gap: 0.5px;

				width: 100%;

				background-color: #787a7d;

				border:
					0.5px solid
					#787a7d;
			}


			.parola-data-block {

				display: flex;

				flex-direction: column;

				gap: 10px;

				min-width: 0;

				padding: 15px;

				background-color: #ffffff;
			}


			.parola-data-block__label {

				color:
					var(
						--primary-dark,
						#222222
					);

				font-size: 12px;

				font-weight: 400;

				line-height: 1.4;

				text-transform: uppercase;
			}


			.parola-data-block__value {

				font-size: 28px;

				font-weight: 500;

				line-height: 1.2;
			}


			.parola-data-block__subtext {

				color:
					var(
						--primary-dark,
						#222222
					);

				font-size: 12px;

				font-weight: 400;

				line-height: 1.4;
			}


			.parola-data-block__button {

				display: inline-flex;

				align-items: center;

				justify-content: center;

				width: fit-content;

				padding: 3px 10px;

				color:
					var(
						--primary-dark,
						#222222
					);

				background: transparent;

				border:
					0.5px solid
					var(
						--primary-dark,
						#222222
					);

				border-radius: 3px;

				font-size: 12px;

				font-weight: 400;

				line-height: 1.4;

				text-decoration: none;

				transition:
					background-color 0.2s ease,
					color 0.2s ease;
					    width: 100%;
    background: #263238;
    color: #ffffff;
    padding: 6px 10px;
			}


			.parola-data-block__button:hover {

				color: #ffffff;

				background:
					var(
						--primary-dark,
						#222222
					);
			}


			.parola-data-block__premium {

				display: flex;

				align-items: center;

				gap: 5px;

				color:
					var(
						--primary-dark,
						#222222
					);

				font-size: 12px;

				font-weight: 400;

				line-height: 1.4;
			}


			.parola-data-block__lock {

				display: inline-flex;

				align-items: center;

				justify-content: center;
			}


			.parola-data-block__lock svg {

				display: block;

				width: 13px;

				height: 13px;

				fill: currentColor;
			}


			.parola-data-blocks__notice {

				grid-column: 1 / -1;

				padding: 15px;

				background-color: #ffffff;

				font-size: 13px;

				line-height: 1.5;
			}


			@media (max-width: 991px) {

				.parola-data-blocks {

					grid-template-columns:
						repeat(
							var(--parola-tablet, 3),
							minmax(0, 1fr)
						);
				}
			}


			@media (max-width: 478px) {

				.parola-data-blocks {

					grid-template-columns:
						repeat(
							var(--parola-mobile, 2),
							minmax(0, 1fr)
						);
				}


				.parola-data-block__value {

					font-size: 20px;
				}
			}

		';


		wp_add_inline_style(
			'parola-data-blocks',
			$css
		);
	}



	/**
	 * =========================================================
	 * NORMALIZE BRICKS FILE CONTROL VALUE
	 * =========================================================
	 *
	 * Bricks file controls may return:
	 *
	 * attachment ID
	 * URL
	 * array
	 * nested file array
	 *
	 * Same concept as the working D3 element.
	 */
	private function get_csv_data( $value ) {

		$data = array(

			'id' => 0,

			'url' => '',

			'filename' => 'data.csv',

			'path' => '',
		);


		/**
		 * Attachment ID.
		 */
		if ( is_numeric( $value ) ) {

			$data['id'] =
				absint(
					$value
				);
		}


		/**
		 * Direct URL.
		 */
		elseif ( is_string( $value ) ) {

			$data['url'] =
				esc_url_raw(
					$value
				);
		}


		/**
		 * Bricks file/media array.
		 */
		elseif ( is_array( $value ) ) {


			if ( isset( $value['id'] ) ) {

				$data['id'] =
					absint(
						$value['id']
					);
			}


			/**
			 * Find URL.
			 */
			foreach (
				array(
					'url',
					'full',
				)
				as $url_key
			) {

				if (
					empty( $data['url'] ) &&
					! empty( $value[ $url_key ] ) &&
					is_string( $value[ $url_key ] )
				) {

					$data['url'] =
						esc_url_raw(
							$value[ $url_key ]
						);
				}
			}


			/**
			 * Find filename.
			 */
			foreach (
				array(
					'filename',
					'name',
					'title',
				)
				as $name_key
			) {

				if (
					! empty( $value[ $name_key ] ) &&
					is_string( $value[ $name_key ] )
				) {

					$data['filename'] =
						sanitize_file_name(
							$value[ $name_key ]
						);

					break;
				}
			}


			/**
			 * Some Bricks versions nest the
			 * selected media under "file".
			 */
			if ( isset( $value['file'] ) ) {

				$nested =
					$this->get_csv_data(
						$value['file']
					);


				if (
					! empty(
						$nested['id']
					)
				) {

					$data['id'] =
						$nested['id'];
				}


				if (
					! empty(
						$nested['url']
					)
				) {

					$data['url'] =
						$nested['url'];
				}


				if (
					! empty(
						$nested['filename']
					)
				) {

					$data['filename'] =
						$nested['filename'];
				}


				if (
					! empty(
						$nested['path']
					)
				) {

					$data['path'] =
						$nested['path'];
				}
			}
		}


		/**
		 * Prefer attachment ID.
		 *
		 * This keeps things safe if the site domain changes.
		 */
		if ( $data['id'] > 0 ) {


			$attachment_url =
				wp_get_attachment_url(
					$data['id']
				);


			if ( $attachment_url ) {

				$data['url'] =
					esc_url_raw(
						$attachment_url
					);
			}


			$attachment_file =
				get_attached_file(
					$data['id']
				);


			if ( $attachment_file ) {

				$data['path'] =
					$attachment_file;


				$data['filename'] =
					sanitize_file_name(
						wp_basename(
							$attachment_file
						)
					);
			}
		}


		/**
		 * If no filesystem path exists yet,
		 * convert the Media Library URL into one.
		 */
		if (
			empty( $data['path'] ) &&
			! empty( $data['url'] )
		) {


			$uploads =
				wp_upload_dir();


			if (
				! empty( $uploads['baseurl'] ) &&
				! empty( $uploads['basedir'] ) &&
				strpos(
					$data['url'],
					$uploads['baseurl']
				) === 0
			) {

				$relative =
					substr(
						$data['url'],
						strlen(
							$uploads['baseurl']
						)
					);


				$data['path'] =
					$uploads['basedir'] .
					$relative;
			}
		}


		/**
		 * Validate CSV extension.
		 */
		$extension = '';


		if ( ! empty( $data['path'] ) ) {

			$extension =
				strtolower(
					pathinfo(
						$data['path'],
						PATHINFO_EXTENSION
					)
				);

		} elseif ( ! empty( $data['url'] ) ) {

			$extension =
				strtolower(
					pathinfo(
						wp_parse_url(
							$data['url'],
							PHP_URL_PATH
						),
						PATHINFO_EXTENSION
					)
				);
		}


		if ( $extension !== 'csv' ) {

			$data['url']  = '';

			$data['path'] = '';
		}


		return $data;
	}



	/**
	 * =========================================================
	 * NORMALIZE CSV HEADER
	 * =========================================================
	 */
	private function normalize_header( $header ) {

		$header =
			trim(
				(string) $header
			);


		/**
		 * Remove UTF-8 BOM.
		 */
		$header =
			preg_replace(
				'/^\xEF\xBB\xBF/',
				'',
				$header
			);


		$header =
			strtolower(
				$header
			);


		$header =
			preg_replace(
				'/[^a-z0-9]+/',
				'_',
				$header
			);


		return trim(
			$header,
			'_'
		);
	}



	/**
	 * =========================================================
	 * PARSE CSV
	 * =========================================================
	 */
	private function parse_csv( $file ) {

		$rows = array();


		if (
			empty( $file ) ||
			! file_exists( $file )
		) {

			return $rows;
		}


		$handle =
			fopen(
				$file,
				'r'
			);


		if ( ! $handle ) {

			return $rows;
		}


		/**
		 * First row = headers.
		 */
		$headers =
			fgetcsv(
				$handle
			);


		if ( empty( $headers ) ) {


			fclose(
				$handle
			);


			return $rows;
		}


		$headers =
			array_map(
				array(
					$this,
					'normalize_header',
				),
				$headers
			);


		/**
		 * Read remaining rows.
		 */
		while (
			( $data = fgetcsv( $handle ) )
			!== false
		) {


			/**
			 * Ignore empty rows.
			 */
			$has_content = false;


			foreach ( $data as $cell ) {

				if (
					trim(
						(string) $cell
					) !== ''
				) {

					$has_content = true;

					break;
				}
			}


			if ( ! $has_content ) {

				continue;
			}


			/**
			 * Ensure same number of cells
			 * as headers.
			 */
			$data =
				array_pad(
					$data,
					count( $headers ),
					''
				);


			$data =
				array_slice(
					$data,
					0,
					count( $headers )
				);


			$row =
				array_combine(
					$headers,
					$data
				);


			if ( $row ) {

				$rows[] = $row;
			}
		}


		fclose(
			$handle
		);


		return $rows;
	}



	/**
	 * =========================================================
	 * GET ROW VALUE
	 * =========================================================
	 */
	private function row_value(
		$row,
		$key,
		$default = ''
	) {

		if (
			isset(
				$row[ $key ]
			)
		) {

			return trim(
				(string) $row[ $key ]
			);
		}


		return $default;
	}



	/**
	 * =========================================================
	 * LOCK ICON
	 * =========================================================
	 */
	private function lock_icon() {

		return '
			<svg
				viewBox="0 0 24 24"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="
						M17 8h-1V6
						c0-2.21-1.79-4-4-4
						S8 3.79 8 6v2H7
						c-1.1 0-2 .9-2 2v10
						c0 1.1.9 2 2 2h10
						c1.1 0 2-.9 2-2V10
						c0-1.1-.9-2-2-2zm-5 9
						c-1.1 0-2-.9-2-2
						s.9-2 2-2
						2 .9 2 2
						-.9 2-2 2zm2.1-9H9.9V6
						c0-1.16.94-2.1 2.1-2.1
						s2.1.94 2.1 2.1v2z
					"
				/>
			</svg>
		';
	}



	/**
	 * =========================================================
	 * RENDER NORMAL KPI BLOCK
	 * =========================================================
	 */
	private function render_stat_block( $row ) {

		$label =
			$this->row_value(
				$row,
				'label'
			);


		$value =
			$this->row_value(
				$row,
				'value'
			);


		$subtext =
			$this->row_value(
				$row,
				'subtext'
			);


		echo '<div class="parola-data-block">';


		if ( $label !== '' ) {

			echo '<div class="parola-data-block__label">';

			echo esc_html(
				$label
			);

			echo '</div>';
		}


		if ( $value !== '' ) {

			echo '<div class="parola-data-block__value">';

			echo esc_html(
				$value
			);

			echo '</div>';
		}


		if ( $subtext !== '' ) {

			echo '<div class="parola-data-block__subtext">';

			echo esc_html(
				$subtext
			);

			echo '</div>';
		}


		echo '</div>';
	}



	/**
	 * =========================================================
	 * RENDER PREMIUM BLOCK
	 * =========================================================
	 */
	private function render_premium_block( $row ) {

		$label =
			$this->row_value(
				$row,
				'label'
			);


		$button_text =
			$this->row_value(
				$row,
				'value',
				'Get in touch'
			);


		$subtext =
			$this->row_value(
				$row,
				'subtext',
				'Premium content'
			);


		$url =
			$this->row_value(
				$row,
				'url',
				'#'
			);


		echo '
			<div
				class="
					parola-data-block
					parola-data-block--premium
				"
			>
		';


		if ( $label !== '' ) {

			echo '<div class="parola-data-block__label">';

			echo esc_html(
				$label
			);

			echo '</div>';
		}


		if ( $button_text !== '' ) {

			echo '
				<a
					class="parola-data-block__button"
					href="' .
						esc_url( $url ) .
					'"
				>
			';

			echo esc_html(
				$button_text
			);

			echo '</a>';
		}


		if ( $subtext !== '' ) {

			echo '<div class="parola-data-block__premium">';


			echo '<span class="parola-data-block__lock">';

			echo $this->lock_icon();

			echo '</span>';


			echo '<span>';

			echo esc_html(
				$subtext
			);

			echo '</span>';


			echo '</div>';
		}


		echo '</div>';
	}



	/**
	 * =========================================================
	 * RENDER ELEMENT
	 * =========================================================
	 */
	public function render() {

		$settings =
			$this->settings;


		/**
		 * Normalize Bricks native file-control value.
		 */
		$csv =
			$this->get_csv_data(
				isset(
					$settings['csvFile']
				)
					? $settings['csvFile']
					: array()
			);


		/**
		 * Responsive columns.
		 */
		$desktop =
			! empty(
				$settings['columnsDesktop']
			)
				? max(
					1,
					absint(
						$settings['columnsDesktop']
					)
				)
				: 6;


		$tablet =
			! empty(
				$settings['columnsTablet']
			)
				? max(
					1,
					absint(
						$settings['columnsTablet']
					)
				)
				: 3;


		$mobile =
			! empty(
				$settings['columnsMobile']
			)
				? max(
					1,
					absint(
						$settings['columnsMobile']
					)
				)
				: 2;


		/**
		 * Root class.
		 */
		$this->set_attribute(
			'_root',
			'class',
			'parola-data-blocks'
		);


		/**
		 * Responsive column CSS variables.
		 */
		$this->set_attribute(
			'_root',
			'style',
			sprintf(
				'--parola-desktop:%d;--parola-tablet:%d;--parola-mobile:%d;',
				$desktop,
				$tablet,
				$mobile
			)
		);


		echo '<div ' .
			$this->render_attributes(
				'_root'
			) .
		'>';


		/**
		 * No valid CSV selected.
		 */
		if (
			empty(
				$csv['path']
			)
		) {

			echo '
				<div
					class="
						parola-data-blocks__notice
					"
				>

					<strong>
						Parola Data Blocks
					</strong>

					<br>

					Select or upload a CSV file
					in the element settings.

				</div>
			';


			echo '</div>';


			return;
		}


		/**
		 * Parse CSV.
		 */
		$rows =
			$this->parse_csv(
				$csv['path']
			);


		if ( empty( $rows ) ) {

			echo '
				<div
					class="
						parola-data-blocks__notice
					"
				>

					No data was found
					in the selected CSV.

				</div>
			';


			echo '</div>';


			return;
		}


		/**
		 * One CSV row = one data block.
		 */
		foreach (
			$rows as $row
		) {

			$type =
				strtolower(
					$this->row_value(
						$row,
						'type',
						'stat'
					)
				);


			if (
				$type === 'premium'
			) {

				$this->render_premium_block(
					$row
				);

			} else {

				$this->render_stat_block(
					$row
				);
			}
		}


		echo '</div>';
	}
}
