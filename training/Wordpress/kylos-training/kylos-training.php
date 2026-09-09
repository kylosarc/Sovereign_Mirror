<?php
/**
 * Plugin Name: Kylos ARC Training
 * Description: Training pillar overview and detail pages for Kylos ARC
 * Version: 2.6.1
 * Author: Shan Simmons
 */

if (!defined('ABSPATH')) exit;

define('KYLOS_TRAINING_PATH', plugin_dir_path(__FILE__));
define('KYLOS_TRAINING_URL', plugin_dir_url(__FILE__));

class Kylos_Training {
    private static $instance = null;

    private function __construct() {
        add_filter('theme_page_templates', [$this, 'add_templates']);
        add_filter('template_include', [$this, 'load_template']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
        add_filter('body_class', [$this, 'body_classes']);
        add_shortcode('kylos_pillar_sidebar', [$this, 'shortcode_sidebar']);
        add_shortcode('kylos_pillar_header', [$this, 'shortcode_header']);
        add_shortcode('kylos_pillar_exercises', [$this, 'shortcode_exercises']);
        add_shortcode('kylos_pillar_grid', [$this, 'shortcode_grid']);
        add_shortcode('kylos_badge', [$this, 'shortcode_badge']);
        add_shortcode('kylos_training_app', [$this, 'shortcode_training_app']);
        add_action('wp_ajax_kx_update_score', [$this, 'ajax_update_score']);
        add_action('wp_ajax_nopriv_kx_update_score', [$this, 'ajax_update_score']);
    }

    public function ajax_update_score() {
        check_ajax_referer('kx_nonce', 'nonce');
        $user_id = get_current_user_id();
        if (!$user_id) wp_send_json_error('Not logged in');

        $pillar = sanitize_text_field($_POST['pillar'] ?? '');
        $points = intval($_POST['points'] ?? 0);
        $exercise_type = sanitize_text_field($_POST['exercise_type'] ?? '');

        if ($pillar && $exercise_type) {
            $already = self::is_exercise_complete($user_id, $pillar, $exercise_type);
            if ($already) {
                wp_send_json_success([
                    'total' => self::get_total_score($user_id),
                    'pillar_score' => self::get_user_score($user_id, $pillar),
                    'completed' => self::get_completed_exercises($user_id),
                    'completed_pillars' => array_keys(self::get_user_score($user_id)),
                    'already_scored' => true,
                ]);
                return;
            }
        }

        if ($pillar && $points) {
            self::update_user_score($user_id, $pillar, $points);
        }
        if ($pillar && $exercise_type) {
            self::mark_exercise_complete($user_id, $pillar, $exercise_type);
        }

        wp_send_json_success([
            'total' => self::get_total_score($user_id),
            'pillar_score' => self::get_user_score($user_id, $pillar),
            'completed' => self::get_completed_exercises($user_id),
            'completed_pillars' => array_keys(self::get_user_score($user_id)),
        ]);
    }

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function add_templates($templates) {
        $templates['kylos-training-hub.php'] = 'Kylos Training Hub';
        $templates['kylos-pillar-detail.php'] = 'Kylos Pillar Detail';
        return $templates;
    }

    public function load_template($template) {
        global $post;
        if (!$post) return $template;

        if ($post->post_type !== 'page') return $template;

        $training = get_page_by_path('training', OBJECT, 'page');
        if (!$training || $training->post_status !== 'publish') {
            self::activate();
            $training = get_page_by_path('training', OBJECT, 'page');
        }

        if (!$training) return $template;

        if ($post->ID == $training->ID) {
            update_post_meta($post->ID, '_wp_page_template', 'kylos-training-hub.php');
            $file = KYLOS_TRAINING_PATH . 'templates/training-hub.php';
            if (file_exists($file)) return $file;
        }

        if ($post->post_parent == $training->ID) {
            update_post_meta($post->ID, '_wp_page_template', 'kylos-pillar-detail.php');
            $file = KYLOS_TRAINING_PATH . 'templates/pillar-detail.php';
            if (file_exists($file)) return $file;
        }

        $page_template = get_page_template_slug($post->ID);

        if ($page_template === 'kylos-training-hub.php') {
            $file = KYLOS_TRAINING_PATH . 'templates/training-hub.php';
            if (file_exists($file)) return $file;
        }

        if ($page_template === 'kylos-pillar-detail.php') {
            $file = KYLOS_TRAINING_PATH . 'templates/pillar-detail.php';
            if (file_exists($file)) return $file;
        }

        return $template;
    }

    public function enqueue_assets() {
        global $post;
        if (!$post) return;

        $template = get_page_template_slug($post->ID);
        $is_training = in_array($template, ['kylos-training-hub.php', 'kylos-pillar-detail.php']);

        if (!$is_training) {
            $training = get_page_by_path('training', OBJECT, 'page');
            if ($training && ($post->post_parent == $training->ID || $post->ID == $training->ID)) {
                $is_training = true;
            }
        }

        if (!$is_training && !empty($post->post_content) && has_shortcode($post->post_content, 'kylos_training_app')) {
            $is_training = true;
        }

        if ($is_training) {
            wp_enqueue_style('kylos-training', KYLOS_TRAINING_URL . 'assets/kylos.css', [], '1.8.0');
            wp_enqueue_script('kylos-exercises', KYLOS_TRAINING_URL . 'assets/exercises.js', [], '1.8.0', true);
            wp_enqueue_script('threejs', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.158.0/three.min.js', [], '0.158.0', true);

            wp_localize_script('kylos-exercises', 'kxScore', [
                'ajax_url' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('kx_nonce'),
                'user_id' => get_current_user_id(),
                'total_score' => self::get_total_score(),
                'pillar_scores' => self::get_user_score(),
                'completed' => self::get_completed_exercises(),
                'current_pillar' => self::get_current_pillar_slug(),
                'badge_url' => KYLOS_TRAINING_URL,
            ]);

            // React training app — enqueue only if built dist exists
            $react_js = KYLOS_TRAINING_PATH . 'dist/assets/index.js';
            $react_css = KYLOS_TRAINING_PATH . 'dist/assets/index.css';
            if (file_exists($react_js)) {
                wp_enqueue_script('kylos-training-app', KYLOS_TRAINING_URL . 'dist/assets/index.js', [], '2.6.1', true);
                $slug_to_pillar = [
                'intellectual_veracity'     => '1',
                'relational_integrity'      => '2',
                'environmental_stewardship' => '3',
                'technological_fluency'     => '4',
                'physiological_optimization'=> '5',
                'temporal_discipline'       => '6',
                'creative_synthesis'        => '7',
                'collaborative_governance'  => '8',
                'the_flourishing_metric'    => '9',
            ];
            $pillar_id = strval(get_post_meta($post->ID, '_kylos_pillar_id', true) ?: '');
            if (!$pillar_id && isset($slug_to_pillar[$post->post_name])) {
                $pillar_id = $slug_to_pillar[$post->post_name];
            }
            if (!$pillar_id) $pillar_id = '1';

            wp_localize_script('kylos-training-app', 'kylosTraining', [
                'pillarId'   => $pillar_id,
                'userId'     => get_current_user_id(),
                'nonce'      => wp_create_nonce('kx_nonce'),
                'ajaxUrl'    => admin_url('admin-ajax.php'),
                'apiBase'    => defined('KYLOS_API_BASE') ? KYLOS_API_BASE : '',
                'badgesBase' => KYLOS_TRAINING_URL . 'badge',
                'iconsBase'  => KYLOS_TRAINING_URL . 'assets/icons',
                'logoUrl'    => KYLOS_TRAINING_URL . 'assets/kylos-red-800.png',
                'hubUrl'     => home_url('/training/'),
            ]);
            }
            if (file_exists($react_css)) {
                wp_enqueue_style('kylos-training-app', KYLOS_TRAINING_URL . 'dist/assets/index.css', [], '2.6.1');
            }
        }
    }

    public function body_classes($classes) {
        global $post;
        if (!$post) return $classes;

        $template = get_page_template_slug($post->ID);
        $is_training = in_array($template, ['kylos-training-hub.php', 'kylos-pillar-detail.php']);

        if (!$is_training) {
            $training = get_page_by_path('training', OBJECT, 'page');
            if ($training && ($post->post_parent == $training->ID || $post->ID == $training->ID)) {
                $is_training = true;
            }
        }

        if ($is_training) {
            $classes[] = 'kylos-page';
        }
        return $classes;
    }

    public static function get_db_connection() {
        if (!class_exists('CDBQ_DB_Manager')) return 'wp';
        $db = CDBQ_DB_Manager::get_instance();
        $all = $db->get_all_connections();
        foreach ($all as $key => $conn) {
            if ($key !== 'wp') return $key;
        }
        return 'wp';
    }

    public static function get_pillars() {
        $conn = self::get_db_connection();
        if ($conn === 'wp') return [];
        $db = CDBQ_DB_Manager::get_instance();
        $results = $db->query("SELECT * FROM pillars WHERE is_active = 1 ORDER BY sort_order", $conn);
        if (is_wp_error($results)) return [];
        return is_array($results) ? $results : [];
    }

    public static function get_pillar($slug) {
        $pillars = self::get_pillars();
        foreach ($pillars as $p) {
            if ($p['slug'] === $slug) return $p;
        }
        return null;
    }

    public static function get_current_pillar_slug() {
        $post = get_queried_object();
        if (!$post) return '';
        return str_replace('-', '_', $post->post_name);
    }

    // ============================================
    // Scoring System
    // ============================================
    public static function get_user_score($user_id = 0, $pillar_slug = '') {
        if (!$user_id) $user_id = get_current_user_id();
        if (!$user_id) return 0;
        $scores = get_user_meta($user_id, 'kx_pillar_scores', true);
        if (!is_array($scores)) $scores = [];
        if ($pillar_slug) return isset($scores[$pillar_slug]) ? intval($scores[$pillar_slug]) : 0;
        return $scores;
    }

    public static function update_user_score($user_id, $pillar_slug, $points) {
        if (!$user_id) return false;
        $scores = get_user_meta($user_id, 'kx_pillar_scores', true);
        if (!is_array($scores)) $scores = [];
        if (!isset($scores[$pillar_slug])) $scores[$pillar_slug] = 0;
        $scores[$pillar_slug] += $points;
        if ($scores[$pillar_slug] < 0) $scores[$pillar_slug] = 0;
        return update_user_meta($user_id, 'kx_pillar_scores', $scores);
    }

    public static function get_total_score($user_id = 0) {
        if (!$user_id) $user_id = get_current_user_id();
        if (!$user_id) return 0;
        $scores = self::get_user_score($user_id);
        return array_sum($scores);
    }

    public static function get_completed_exercises($user_id = 0) {
        if (!$user_id) $user_id = get_current_user_id();
        if (!$user_id) return [];
        $completed = get_user_meta($user_id, 'kx_completed_exercises', true);
        return is_array($completed) ? $completed : [];
    }

    public static function mark_exercise_complete($user_id, $pillar_slug, $exercise_type) {
        if (!$user_id) return false;
        $completed = self::get_completed_exercises($user_id);
        $key = $pillar_slug . '_' . $exercise_type;
        if (!in_array($key, $completed)) {
            $completed[] = $key;
            update_user_meta($user_id, 'kx_completed_exercises', $completed);
        }
        return true;
    }

    public static function is_exercise_complete($user_id, $pillar_slug, $exercise_type) {
        $completed = self::get_completed_exercises($user_id);
        return in_array($pillar_slug . '_' . $exercise_type, $completed);
    }

    public static function reset_user_scores($user_id = 0) {
        if (!$user_id) $user_id = get_current_user_id();
        if (!$user_id) return false;
        delete_user_meta($user_id, 'kx_pillar_scores');
        delete_user_meta($user_id, 'kx_completed_exercises');
        return true;
    }

    public function shortcode_sidebar($atts) {
        $all_pillars = self::get_pillars();
        if (empty($all_pillars)) return '';

        $current_slug = self::get_current_pillar_slug();
        $parent_page = get_post(get_queried_object()->post_parent);
        $parent_slug = $parent_page ? $parent_page->post_name : 'training';

        $icons = [
            'psychology' => KYLOS_TRAINING_URL . 'assets/icons/pillar-1.webp',
            'eco' => KYLOS_TRAINING_URL . 'assets/icons/pillar-2.webp',
            'diversity_3' => KYLOS_TRAINING_URL . 'assets/icons/pillar-3.webp',
            'memory' => KYLOS_TRAINING_URL . 'assets/icons/pillar-4.webp',
            'fitness_center' => KYLOS_TRAINING_URL . 'assets/icons/pillar-5.webp',
            'schedule' => KYLOS_TRAINING_URL . 'assets/icons/pillar-6.webp',
            'auto_awesome' => KYLOS_TRAINING_URL . 'assets/icons/pillar-7.webp',
            'account_tree' => KYLOS_TRAINING_URL . 'assets/icons/pillar-8.webp',
            'insights' => KYLOS_TRAINING_URL . 'assets/icons/pillar-9.webp'
        ];

        $output = '<nav class="kx-sidebar">';
        $output .= '<div style="padding:20px 16px;">';
        $output .= '<h2 class="kx-label" style="color:var(--primary);margin:0 0 4px;font-size:23px;font-weight:700;letter-spacing:0.08em">ARC PILLARS</h2>';
        $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0;font-size:18px">Operational Training</p>';
        $output .= '</div>';

        foreach ($all_pillars as $p) {
            $is_active = $p['slug'] === $current_slug;
            $p_url = get_permalink(get_page_by_path($parent_slug . '/' . $p['slug']));
            $active_class = $is_active ? ' active' : '';
            $icon_src = isset($icons[$p['icon']]) ? $icons[$p['icon']] : '';
            $output .= '<a href="' . esc_url($p_url) . '" class="kx-sidebar-link' . $active_class . '">';
            if ($icon_src) {
                $output .= '<img src="' . esc_url($icon_src) . '" alt="' . esc_attr($p['name']) . '" class="kx-sidebar-icon-img" style="width:32px;height:32px;object-fit:contain">';
            } else {
                $output .= '<span class="dashicons dashicons-admin-generic kx-sidebar-icon" style="color:' . esc_attr($p['color']) . ';"></span>';
            }
            $output .= '<span class="kx-sidebar-label" style="font-size:12px;font-weight:700">' . esc_html($p['name']) . '</span>';
            $output .= '</a>';
        }

        $output .= '</nav>';
        return $output;
    }

    public static function get_pillar_content($slug) {
        $content = [
            'intellectual_veracity' => [
                'score_label' => 'Veracity Score',
                'instruction' => 'Welcome to the foundation of the Ultranetic Mesh. Intellectual Veracity is the absolute mastery of logic required to navigate the Veracity Ledger. Before you can exercise civic agency, you must prove your immunity to manipulation. Review the legacy political statements below and identify the specific logical fallacies deployed to trigger Darwinian fear. Only by neutralizing these fallacies can you unlock the objective truth and raise your Resonance Score.',
                'alert_title' => 'Rhetorical Infiltration Detected',
                'alert_desc' => 'Systematic disinformation campaign identified across legacy media channels. Cognitive bias exploitation rate has increased 340% in Q2. Immediate diagnostic intervention required.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Logic Engine Proctor',
                'proctor_desc' => 'Verifying Analysis...',
                'stats' => [
                    ['label' => 'Fallacy Density', 'value' => '+67%', 'percent' => 67, 'tone' => 'error'],
                    ['label' => 'Epistemic Drift', 'value' => '-31%', 'percent' => 31, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Diagnostic Isolation',
                'analysis_desc' => 'Decompose intercepted signals into constituent fallacies. Map rhetorical structures to known manipulation taxonomies.',
                'analysis_icon' => 'dashicons-admin-generic',
                'toolkits' => [
                    ['icon' => 'dashicons-admin-generic', 'icon_bg' => 'primary', 'title' => 'Fallacy Matrix', 'desc' => 'Classify and counter 24 formal and informal fallacies with structured rebuttal protocols.'],
                    ['icon' => 'dashicons-chart-area', 'icon_bg' => 'secondary', 'title' => 'Bias Mapping', 'desc' => 'Identify cognitive bias vectors in real-time discourse using heuristics-based detection.'],
                ],
                'exercise' => [
                    'type' => 'drag-drop',
                    'statement' => '"If we lose our borders, the \'others\' will take everything you have."',
                    'correction' => '"Resources are globally managed; \'others\' is a manufactured construct."',
                    'correct_answer' => 'Appeal to Fear',
                    'options' => ['Appeal to Fear', 'Ad Hominem', 'Sunk Cost', 'Strawman', 'False Authority'],
                    'backlog' => [
                        ['type' => 'Ad Hominem', 'quote' => '"You shouldn\'t trust his plan because of where he went to school."', 'status' => 'pending'],
                        ['type' => 'Sunk Cost', 'quote' => '"We\'ve invested too much to change course now."', 'status' => 'locked'],
                        ['type' => 'Strawman', 'quote' => '"They just want to strip away all your freedoms."', 'status' => 'locked'],
                        ['type' => 'False Authority', 'quote' => '"The celebrity endorses this policy, so it must work."', 'status' => 'locked'],
                    ],
                ],
            ],
            'environmental_stewardship' => [
                'score_label' => 'Stewardship Score',
                'instruction' => 'A Post-Darwinian society relies on the physical remediation of the planetary substrate. Here, you must navigate the Water-Energy-Food-Ecosystem (WEFE) nexus. You will be presented with simulated ecological degradation events. Select the appropriate Megatechture interventions—such as Space-Based Solar Power or precision fermentation—to restore balance without creating a deficit in connected ecological sectors.',
                'alert_title' => 'WEFE Nexus Breach',
                'alert_desc' => 'Severe groundwater depletion in Sector 4 (Sub-Saharan Aquifer). WEFE equilibrium compromised; immediate intervention required.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Ecology Systems Proctor',
                'proctor_desc' => 'Scanning Environmental Vectors...',
                'stats' => [
                    ['label' => 'Water Table', 'value' => '-42%', 'percent' => 42, 'tone' => 'error'],
                    ['label' => 'Energy Cost', 'value' => '+18%', 'percent' => 78, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Thermodynamic Analysis',
                'analysis_desc' => 'Evaluate intervention viability across the Water, Energy, Food, Ecosystems nexus.',
                'analysis_icon' => 'dashicons-chart-area',
                'toolkits' => [
                    ['icon' => 'dashicons-admin-site', 'icon_bg' => 'primary', 'title' => 'Space-Based Solar', 'desc' => 'Deploy orbital arrays to beam zero-emission power, offsetting desalination costs.'],
                    ['icon' => 'dashicons-admin-generic', 'icon_bg' => 'secondary', 'title' => 'Precision Fermentation', 'desc' => 'Decouple protein from agriculture to radically reduce water draw.'],
                ],
                'exercise' => [
                    'type' => 'intervention',
                    'scenario' => 'Sector 4 Sub-Saharan Aquifer: Groundwater depletion rate exceeds recharge by 340%. Agricultural energy subsidies driving extraction. WEFE equilibrium compromised.',
                    'toolkit' => [
                        ['id' => 'sps', 'name' => 'Space-Based Solar Power', 'icon' => 'dashicons-admin-site', 'desc' => 'Deploy orbital arrays to beam zero-emission power for desalination', 'cost' => 'High energy ROI, 10yr deployment'],
                        ['id' => 'pf', 'name' => 'Precision Fermentation', 'icon' => 'dashicons-admin-generic', 'desc' => 'Decouple protein production from agriculture to reduce water draw', 'cost' => 'Low water, medium energy'],
                        ['id' => 'dgg', 'name' => 'Deep Geothermal Gyrotrons', 'icon' => 'dashicons-performance', 'desc' => 'Tap geothermal for baseload power without surface disruption', 'cost' => 'Medium energy, low ecological'],
                        ['id' => 'atmos', 'name' => 'Atmospheric Water Harvesting', 'icon' => 'dashicons-cloud', 'desc' => 'Deploy moisture capture arrays for decentralized water supply', 'cost' => 'Low energy, high maintenance'],
                    ],
                    'correct_sequence' => ['sps', 'pf', 'atmos'],
                    'feedback' => [
                        'correct' => 'WEFE nexus restored. Energy input offsets desalination cost without disrupting green water flows.',
                        'wrong_order' => 'Thermodynamic deficit detected. The sequence creates a deficit in a connected ecological sector.',
                        'wrong_choice' => 'Intervention incompatible with current WEFE state. Reassess interdependency matrix.',
                    ],
                ],
            ],
            'relational_integrity' => [
                'score_label' => 'Trust Score',
                'instruction' => 'The survival of complex systems relies on the transition from zero-sum competition to non-zero-sum cooperation. This module calibrates your Spectrograph of Intent. You will encounter high-friction social scenarios. Your task is to absorb the friction without amplifying the noise, choosing the \'Radiant Stillness\' protocol to optimize the long-term capacity of the network over short-term egoic release.',
                'alert_title' => 'Social Cohesion Fracture',
                'alert_desc' => 'Inter-group trust indices have fallen below critical threshold. Polarization metrics indicate systemic breakdown in collaborative frameworks.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Covenant Protocol Proctor',
                'proctor_desc' => 'Analyzing Friction Patterns...',
                'stats' => [
                    ['label' => 'Trust Index', 'value' => '-53%', 'percent' => 53, 'tone' => 'error'],
                    ['label' => 'Conflict Freq', 'value' => '+41%', 'percent' => 81, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Protocol Diagnostics',
                'analysis_desc' => 'Assess communication breakdown patterns across team and community structures.',
                'analysis_icon' => 'dashicons-groups',
                'toolkits' => [
                    ['icon' => 'dashicons-groups', 'icon_bg' => 'primary', 'title' => 'Consent Frameworks', 'desc' => 'Implement sociocratic decision-making with double-link feedback loops.'],
                    ['icon' => 'dashicons-admin-comments', 'icon_bg' => 'secondary', 'title' => 'Nonviolent Protocol', 'desc' => 'Deploy NVC-based communication layers for high-friction environments.'],
                ],
                'exercise' => [
                    'type' => 'calibration',
                    'has_spiral' => true,
                    'question' => 'Node 7-XR broadcasts: "Your protocol is obsolete. The old ways are the only reason we survived. You are naive to think change won\'t destroy us." How do you classify this response?',
                    'options' => [
                        ['label' => 'Egoic Friction', 'tone' => 'error', 'feedback' => 'Performative outrage detected. Centripetal noise amplifying Darwinian stress response.'],
                        ['label' => 'Protective Resonance', 'tone' => 'primary', 'feedback' => 'Selfless care signal identified. Absorbing friction without amplification.'],
                    ],
                    'metric_label' => 'Spectrograph of Intent',
                    'metric_value' => 24,
                ],
            ],
            'technological_fluency' => [
                'score_label' => 'Fluency Score',
                'instruction' => 'The Ultranetic Mesh operates as a bio-digital hybrid. In this module, you act as the bridge between silicon logic and Organoid Intelligence (OI). When presented with a thermal or metabolic anomaly within the wetware, you must adjust the Boltzmann Temperature and substrate cooling parameters to restore biological homeostasis. You must protect the physical integrity of the biology without crashing the cryptographic zero-knowledge proofs.',
                'alert_title' => 'Alignment Drift Warning',
                'alert_desc' => 'Autonomous system behavior has diverged from intended objective function. Model interpretability below safe threshold. Realignment required.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Alignment Systems Proctor',
                'proctor_desc' => 'Auditing Model Integrity...',
                'stats' => [
                    ['label' => 'Alignment Gap', 'value' => '+28%', 'percent' => 28, 'tone' => 'error'],
                    ['label' => 'System Latency', 'value' => '-15%', 'percent' => 15, 'tone' => 'secondary'],
                ],
                'analysis_title' => 'Architecture Audit',
                'analysis_desc' => 'Map system dependencies and evaluate AI alignment integrity across deployed models.',
                'analysis_icon' => 'dashicons-memory',
                'toolkits' => [
                    ['icon' => 'dashicons-memory', 'icon_bg' => 'primary', 'title' => 'Alignment Harness', 'desc' => 'Constrain model outputs with interpretable reward shaping and oversight layers.'],
                    ['icon' => 'dashicons-networking', 'icon_bg' => 'secondary', 'title' => 'Systems Lattice', 'desc' => 'Visualize and audit multi-model dependency graphs for emergent risk detection.'],
                ],
                'exercise' => [
                    'type' => 'parameter',
                    'scenario' => 'OI Cluster 3 thermal stress detected. Core temp: 41.2°C (critical: 38°C). Boltzmann Temperature elevated. Zero-Knowledge Proof uptime: 99.7% (minimum: 99.5%).',
                    'controls' => [
                        ['id' => 'boltzmann', 'label' => 'Boltzmann Temperature (Ts)', 'min' => 20, 'max' => 60, 'default' => 41, 'unit' => '°C', 'safe_range' => [32, 37]],
                        ['id' => 'cooling', 'label' => 'Substrate Cooling Nexus', 'min' => 0, 'max' => 100, 'default' => 30, 'unit' => '%', 'safe_range' => [40, 70]],
                        ['id' => 'zkp_uptime', 'label' => 'ZKP Uptime', 'min' => 90, 'max' => 100, 'default' => 99.7, 'unit' => '%', 'safe_range' => [99.5, 100]],
                    ],
                    'feedback' => [
                        'success' => 'Homeostasis restored. Wetware integrity maintained. ZKP uptime above threshold.',
                        'overcooled' => 'Thermal shock detected. Cooling exceeded safe bounds — biological substrate at risk.',
                        'zkp_collapse' => 'Zero-Knowledge Proof chain broken. Network validation failed.',
                        'overheated' => 'Core temperature still critical. Increase cooling or reduce Boltzmann Temperature.',
                    ],
                ],
            ],
            'physiological_optimization' => [
                'score_label' => 'Vitality Score',
                'instruction' => 'The abolition of involuntary pain begins with your own biological optimization. This module enforces the Oxygen Mask Paradox: you cannot serve the Mesh if you are in a state of systemic hypoxia. When your node registers metabolic burnout amidst external demands, you must engage the \'Sigh of Relief\' interlock. You must prove that self-maintenance is the mandatory prerequisite for systemic care.',
                'alert_title' => 'Metabolic Cascade Failure',
                'alert_desc' => 'Population-level metabolic flexibility indices have degraded. Sleep architecture disruption correlated with 23% productivity decline.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Biomarker Proctor',
                'proctor_desc' => 'Calibrating Vital Signs...',
                'stats' => [
                    ['label' => 'Sleep Quality', 'value' => '-38%', 'percent' => 38, 'tone' => 'error'],
                    ['label' => 'HRV Baseline', 'value' => '-22%', 'percent' => 22, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Biomarker Analysis',
                'analysis_desc' => 'Evaluate physiological baselines against optimal performance envelopes.',
                'analysis_icon' => 'dashicons-performance',
                'toolkits' => [
                    ['icon' => 'dashicons-performance', 'icon_bg' => 'primary', 'title' => 'Sleep Architecture', 'desc' => 'Optimize circadian entrainment with light protocol, temperature cycling, and wind-down routines.'],
                    ['icon' => 'dashicons-randomize', 'icon_bg' => 'secondary', 'title' => 'Metabolic Switching', 'desc' => 'Train flexible fuel utilization through timed nutrition and cold/heat exposure.'],
                ],
                'exercise' => [
                    'type' => 'calibration',
                    'question' => 'Your node registers Systemic Hypoxia (VO2 max degraded, cortisol elevated). 3 dependent nodes are requesting assistance. What do you do?',
                    'options' => [
                        ['label' => 'Assist Others', 'tone' => 'error', 'feedback' => 'Martyrdom logic detected. Attempting to serve while depleted introduces parasitic friction into the network.'],
                        ['label' => 'Sigh of Relief Interlock', 'tone' => 'primary', 'feedback' => 'Self-optimization activated. Mandatory prerequisite for systemic care confirmed.'],
                    ],
                    'metric_label' => 'Oxygen Mask Protocol',
                    'metric_value' => 35,
                ],
            ],
            'temporal_discipline' => [
                'score_label' => 'Focus Score',
                'instruction' => 'To secure the future, we must permanently deprecate the mechanics of blame. This is the Inverion Divide. You will be presented with a legacy trauma loop. Apply the Remediation Layer protocol to separate the objective causal data from the punitive emotional charge. You must tombstone the error, preserving the immutable historical record while reducing its retaliatory weight to zero.',
                'alert_title' => 'Attention Economy Breach',
                'alert_desc' => 'Deep work capacity has declined across all sectors. Average attention span degraded to sub-8-minute intervals. Urgent restructuring required.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Temporal Systems Proctor',
                'proctor_desc' => 'Mapping Attention Vectors...',
                'stats' => [
                    ['label' => 'Deep Work Hrs', 'value' => '-47%', 'percent' => 47, 'tone' => 'error'],
                    ['label' => 'Context Switch', 'value' => '+63%', 'percent' => 63, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Temporal Audit',
                'analysis_desc' => 'Map attention allocation across task categories and identify fragmentation vectors.',
                'analysis_icon' => 'dashicons-clock',
                'toolkits' => [
                    ['icon' => 'dashicons-clock', 'icon_bg' => 'primary', 'title' => 'Deep Work Blocks', 'desc' => 'Structured 90-minute focus sessions with environmental control and notification quarantine.'],
                    ['icon' => 'dashicons-schedule', 'icon_bg' => 'secondary', 'title' => 'Deadline Architecture', 'desc' => 'Implement artificial urgency structures to counter Parkinson Law expansion.'],
                ],
                'exercise' => [
                    'type' => 'separation',
                    'scenario' => 'Legacy Trauma Loop detected: "The betrayal at Sector 9 caused 47 nodes to go offline. The responsible party must be punished. We will never forgive."',
                    'data_items' => [
                        ['id' => 'causal_1', 'type' => 'causal', 'text' => 'Sector 9 protocol failure at 03:47 UTC'],
                        ['id' => 'causal_2', 'type' => 'causal', 'text' => '47 nodes lost connectivity for 12 minutes'],
                        ['id' => 'causal_3', 'type' => 'causal', 'text' => 'Root cause: misconfigured failover handshake'],
                        ['id' => 'punitive_1', 'type' => 'punitive', 'text' => '"The responsible party must be punished"'],
                        ['id' => 'punitive_2', 'type' => 'punitive', 'text' => '"We will never forgive"'],
                        ['id' => 'punitive_3', 'type' => 'punitive', 'text' => 'Retaliatory weight: 87% (critical)'],
                    ],
                    'feedback' => [
                        'success' => 'Error tombstoned. Historical record preserved. Retaliatory weight deprecated to 0%.',
                        'wrong_separation' => 'Causal data contaminated with punitive currency. Remediation Layer failed.',
                        'incomplete' => 'Not all punitive elements deprecated. Trauma loop still active.',
                    ],
                ],
            ],
            'creative_synthesis' => [
                'score_label' => 'Innovation Score',
                'instruction' => 'Perfect efficiency without human meaning leads to civilizational overfitting. This is the Actualization Layer. You will receive highly optimized, sterile infrastructural outputs from the AI processing layer. Your task is to inject stochastic human variance—art, humanities, and subjective meaning—transforming baseline survival functions into the Emotional Light of Productive Bliss.',
                'alert_title' => 'Innovation Pipeline Stagnation',
                'alert_desc' => 'Novel solution generation has plateaued. Cross-domain transfer rate below baseline. Lateral thinking capacity requires reactivation.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Synthesis Engine Proctor',
                'proctor_desc' => 'Scanning Cross-Domain Bridges...',
                'stats' => [
                    ['label' => 'Novel Ideas', 'value' => '-34%', 'percent' => 34, 'tone' => 'error'],
                    ['label' => 'Transfer Rate', 'value' => '-19%', 'percent' => 19, 'tone' => 'secondary'],
                ],
                'analysis_title' => 'Synthesis Mapping',
                'analysis_desc' => 'Identify cross-domain pattern bridges and evaluate lateral transfer potential.',
                'analysis_icon' => 'dashicons-star-filled',
                'toolkits' => [
                    ['icon' => 'dashicons-star-filled', 'icon_bg' => 'primary', 'title' => 'Analogical Engine', 'desc' => 'Extract structural isomorphs across unrelated domains for novel solution generation.'],
                    ['icon' => 'dashicons-randomize', 'icon_bg' => 'secondary', 'title' => 'Constraint Removal', 'desc' => 'Systematic elimination of assumed limitations to unlock latent solution spaces.'],
                ],
                'exercise' => [
                    'type' => 'calibration',
                    'question' => 'AI Output: "Optimal transit route: Path A (12min, 0 stops, 0 cultural interaction). Path B (18min, 3 stops, 2 public art installations, 1 community garden)." Which coefficient do you apply?',
                    'options' => [
                        ['label' => 'Deterministic Efficiency', 'tone' => 'error', 'feedback' => 'Civilizational overfitting risk. Monolithic optimization creates fragile systems.'],
                        ['label' => 'Stochastic Resonance', 'tone' => 'primary', 'feedback' => 'Beneficial variance injected. Overtones of Productive Bliss detected. Signal resilience improved.'],
                    ],
                    'metric_label' => 'Aesthetic Coefficient',
                    'metric_value' => 41,
                ],
            ],
            'collaborative_governance' => [
                'score_label' => 'Governance Score',
                'instruction' => 'Civic agency in the Mesh is exercised through the Irish Democratic Protocol via tripartite consensus. Evaluate conflicting resource allocation proposals from AI predictive models and Organoid Intelligence. As the Human-in-the-Loop, apply the Synthetic Imperative to ensure the proposal can be universalized without causing systemic collapse. Only when human ethical intent aligns with objective physical capacity will the P-Gate unlock.',
                'alert_title' => 'Decision Latency Critical',
                'alert_desc' => 'Collective decision-making speed has fallen below operational threshold. Consent protocols are stalling critical interventions.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Governance Systems Proctor',
                'proctor_desc' => 'Evaluating Decision Flow...',
                'stats' => [
                    ['label' => 'Decision Speed', 'value' => '-56%', 'percent' => 56, 'tone' => 'error'],
                    ['label' => 'Participation', 'value' => '-29%', 'percent' => 29, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Governance Diagnostics',
                'analysis_desc' => 'Evaluate decision flow efficiency and identify bottlenecks in consent-based processes.',
                'analysis_icon' => 'dashicons-admin-links',
                'toolkits' => [
                    ['icon' => 'dashicons-admin-links', 'icon_bg' => 'primary', 'title' => 'DAO Primitives', 'desc' => 'Deploy lightweight on-chain governance for transparent, auditable collective decisions.'],
                    ['icon' => 'dashicons-groups', 'icon_bg' => 'secondary', 'title' => 'Consent Protocols', 'desc' => 'Implement consent-based decision making with explicit objection windows and fallback.'],
                ],
                'exercise' => [
                    'type' => 'consensus',
                    'scenario' => 'Resource Allocation Proposal #4471: Redistribute 2,400 compute units from Sector 9 (surplus) to Sector 3 (deficit).',
                    'feeds' => [
                        ['source' => 'AI Predictive Model', 'icon' => 'dashicons-memory', 'verdict' => 'APPROVE', 'reasoning' => 'Sector 3 deficit will cascade to Sectors 5 and 7 within 72 hours. Redistribution prevents systemic collapse.'],
                        ['source' => 'Organoid Intelligence', 'icon' => 'dashicons-admin-generic', 'verdict' => 'CONDITIONAL', 'reasoning' => 'Sector 9 surplus is seasonal. Risk of reversal in Q4. Require 20% reserve buffer.'],
                        ['source' => 'Human Intent', 'icon' => 'dashicons-businessman', 'verdict' => 'PENDING', 'reasoning' => 'Awaiting HITL arbitration. Ethical weight: equitable access vs. sector autonomy.'],
                    ],
                    'feedback' => [
                        'success' => 'P-Gate unlocked. Human ethical intent aligned with objective capacity. Tripartite consensus achieved.',
                        'rejected' => 'P-Gate locked. Proposal cannot be universalized without causing systemic collapse.',
                        'partial' => 'Consensus incomplete. All three feeds must align before physicalization.',
                    ],
                ],
            ],
            'flourishing_metric' => [
                'score_label' => 'Flourishing Score',
                'instruction' => 'The ultimate health of the Mesh is measured by the state of its most fragile node. In this module, you will manage a surplus of secondary resources. You must balance Thermodynamic Demurrage with the Vulnerability Pivot, optimizing for a Rawlsian Maximin outcome. Route the resources to raise the operational floor of the most vulnerable node before elevating the peaks of the highest-performing nodes.',
                'alert_title' => 'Wellbeing Index Collapse',
                'alert_desc' => 'Multi-capital accounting reveals systemic degradation across social, ecological, and human capital dimensions. Anti-fragility indicators failing.',
                'video_url' => 'https://www.youtube.com/watch?v=OjNpRbNdR7E',
                'proctor_name' => 'Flourishing Matrix Proctor',
                'proctor_desc' => 'Computing Multi-Capital Indices...',
                'stats' => [
                    ['label' => 'Wellbeing Index', 'value' => '-44%', 'percent' => 44, 'tone' => 'error'],
                    ['label' => 'Anti-Fragility', 'value' => '-37%', 'percent' => 37, 'tone' => 'tertiary'],
                ],
                'analysis_title' => 'Capital Accounting',
                'analysis_desc' => 'Evaluate flourishing across natural, social, human, and manufactured capital stocks.',
                'analysis_icon' => 'dashicons-chart-area',
                'toolkits' => [
                    ['icon' => 'dashicons-chart-area', 'icon_bg' => 'primary', 'title' => 'Multi-Capital Ledger', 'desc' => 'Track and weight progress across six capital dimensions beyond GDP metrics.'],
                    ['icon' => 'dashicons-yes-alt', 'icon_bg' => 'secondary', 'title' => 'Anti-Fragility Test', 'desc' => 'Stress-test interventions against black swan scenarios and systemic shock vectors.'],
                ],
                'exercise' => [
                    'type' => 'calibration',
                    'question' => 'Network surplus: 10,000 compute units. Sector 12 (fragile node) is at 12% operational capacity. Sector 1 (peak node) is at 94%. How do you route resources?',
                    'options' => [
                        ['label' => 'Elevate Peaks', 'tone' => 'error', 'feedback' => 'Rawlsian violation detected. Elevating the highest-performing nodes widens the resilience gap.'],
                        ['label' => 'Vulnerability Pivot', 'tone' => 'primary', 'feedback' => 'Maximin outcome achieved. Operational floor raised. Network anti-fragility increased.'],
                    ],
                    'metric_label' => 'Flourishing Signal',
                    'metric_value' => 52,
                ],
            ],
        ];

        return isset($content[$slug]) ? $content[$slug] : null;
    }

    public function shortcode_header($atts) {
        $slug = self::get_current_pillar_slug();
        $pillar = self::get_pillar($slug);
        if (!$pillar) return '<p>Pillar not found.</p>';

        $content = self::get_pillar_content($slug);
        $score_label = $content ? $content['score_label'] : 'Progress';
        $progress = rand(15, 85);
        $user_id = get_current_user_id();
        $pillar_score = $user_id ? self::get_user_score($user_id, $slug) : 0;
        $total_score = $user_id ? self::get_total_score($user_id) : 0;

        $output = '<div style="position:relative;z-index:1;display:flex;flex-direction:column;gap:12px">';
        $output .= '<div class="kx-score-section" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
        $output .= '<span class="kx-pillar-badge" style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:9999px;background:rgba(255,255,255,0.4);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.5);color:#F43F5E;font-size:20px;font-weight:700;letter-spacing:0.05em;box-shadow:0 2px 8px rgba(0,0,0,0.08),inset 0 1px 0 rgba(255,255,255,0.6)"><span class="dashicons dashicons-star-filled" style="font-size:16px;color:#F43F5E"></span> PILLAR ' . intval($pillar['sort_order']) . ' CORE</span>';
        if ($user_id) {
            $output .= do_shortcode('[kylos_badge]');
            $output .= '<div class="kx-score-box" style="border:1px solid #F43F5E;border-radius:8px;background:rgba(253,246,226,0.85);padding:6px 14px;display:flex;align-items:center;gap:8px;flex-shrink:0">';
            $output .= '<span class="dashicons dashicons-star-filled" style="font-size:14px;color:#4ade80"></span>';
            $output .= '<div style="display:flex;flex-direction:column;line-height:1.2">';
            $output .= '<span style="font-size:22px;font-weight:800;color:#4ade80" id="kx-total-score">' . $total_score . '</span>';
            $output .= '<span style="font-size:10px;font-weight:600;color:#1E293B;text-transform:uppercase;letter-spacing:0.05em">Resonance</span>';
            $output .= '</div>';
            $output .= '</div>';
        }
        $output .= '</div>';
        $output .= '<h1 class="kx-display" style="color:var(--on-background)">' . esc_html($pillar['name']) . '</h1>';
        $output .= '<p class="kx-body-lg" style="color:var(--on-surface-variant);max-width:640px;margin:0">' . esc_html($pillar['description']) . '</p>';
        $output .= '<div style="max-width:640px;margin-top:8px;height:8px;border-radius:var(--radius-full);background:var(--surface-container-high);overflow:hidden">';
        $output .= '<div class="kx-progress-gradient" style="height:100%;width:' . $progress . '%;border-radius:var(--radius-full)"></div>';
        $output .= '</div>';
        $output .= '</div>';

        return $output;
    }

    public function shortcode_exercises($atts) {
        $slug = self::get_current_pillar_slug();
        $pillar = self::get_pillar($slug);
        if (!$pillar) return '';

        $c = self::get_pillar_content($slug);
        if (!$c) return '';

        $ex = isset($c['exercise']) ? $c['exercise'] : null;
        $video_url = isset($c['video_url']) ? $c['video_url'] : '';
        $proctor_name = isset($c['proctor_name']) ? $c['proctor_name'] : 'CU Sphere Proctor';
        $proctor_desc = isset($c['proctor_desc']) ? $c['proctor_desc'] : 'Verifying Analysis...';

        $output = '<div class="kx-bento">';

        // Left column
        $output .= '<div style="display:flex;flex-direction:column;gap:24px">';

        // Alert card
        $output .= '<div class="kx-card kx-card--glow">';
        $output .= '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">';
        $output .= '<span class="kx-pulse" style="width:8px;height:8px;border-radius:50%;background:var(--error)"></span>';
        $output .= '<h2 class="kx-h2">' . esc_html($c['alert_title']) . '</h2>';
        $output .= '</div>';
        $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0 0 16px">' . esc_html($c['alert_desc']) . '</p>';
        $output .= '<div style="display:flex;flex-direction:column;gap:16px">';
        foreach ($c['stats'] as $s) {
            $output .= '<div class="kx-statbar">';
            $output .= '<div class="kx-statbar-header">';
            $output .= '<span class="kx-statbar-label">' . esc_html($s['label']) . '</span>';
            $output .= '<span class="kx-statbar-value" style="color:var(--' . $s['tone'] . ')">' . esc_html($s['value']) . '</span>';
            $output .= '</div>';
            $output .= '<div class="kx-statbar-track">';
            $output .= '<div class="kx-statbar-fill kx-statbar-fill--' . $s['tone'] . '" style="width:' . $s['percent'] . '%"></div>';
            $output .= '</div>';
            $output .= '</div>';
        }
        $output .= '</div>';
        $output .= '</div>';

        // Analysis card
        $output .= '<div class="kx-card">';
        $output .= '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">';
        $output .= '<span class="dashicons ' . esc_attr($c['analysis_icon']) . '" style="font-size:20px;color:var(--primary)"></span>';
        $output .= '<h3 class="kx-h3">' . esc_html($c['analysis_title']) . '</h3>';
        $output .= '</div>';
        $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0 0 16px">' . esc_html($c['analysis_desc']) . '</p>';
        $output .= '<button class="kx-btn kx-btn--secondary kx-btn--full"><span class="dashicons dashicons-performance" style="font-size:16px"></span> Run Diagnostic</button>';
        $output .= '</div>';

        // Video card
        if ($video_url) {
            $output .= '<div class="kx-card" style="border-left:3px solid var(--primary)">';
            $output .= '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">';
            $output .= '<span class="dashicons dashicons-video-alt3" style="font-size:20px;color:var(--primary)"></span>';
            $output .= '<h4 class="kx-label" style="color:var(--primary);margin:0">PILLAR BRIEFING</h4>';
            $output .= '</div>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0 0 12px">Watch the full lecture before proceeding with exercises.</p>';
            $output .= '<a href="' . esc_url($video_url) . '" target="_blank" rel="noopener" class="kx-btn kx-btn--amber kx-btn--full" style="text-decoration:none"><span class="dashicons dashicons-video-alt3" style="font-size:16px;color:inherit"></span> Watch Video Lecture</a>';
            $output .= '</div>';
        }

        $output .= '</div>';

        // Right column - Exercise card
        $output .= '<div class="kx-card kx-card--glass">';

        // Mission Briefing accordion (if instructional text exists)
        if (!empty($c['instruction'])) {
            $output .= '<div class="kx-accordion" style="margin-bottom:20px">';
            $output .= '<button class="kx-accordion-trigger" style="width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:rgba(185,5,56,0.05);border:1px solid rgba(185,5,56,0.15);border-radius:var(--radius-md);cursor:pointer;font-size:13px;font-weight:600;color:#ffffff;text-transform:uppercase;letter-spacing:0.05em;transition:all .2s">';
            $output .= '<span style="display:flex;align-items:center;gap:8px"><span class="dashicons dashicons-info" style="font-size:16px"></span> Mission Briefing</span>';
            $output .= '<span class="dashicons dashicons-arrow-down-alt2 kx-accordion-icon" style="font-size:16px;transition:transform .3s"></span>';
            $output .= '</button>';
            $output .= '<div class="kx-accordion-content" style="max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.4,0,.2,1)">';
            $output .= '<div style="padding:16px;border:1px solid rgba(185,5,56,0.1);border-top:0;border-radius:0 0 var(--radius-md) var(--radius-md);background:rgba(185,5,56,0.02)">';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0;line-height:1.7">' . esc_html($c['instruction']) . '</p>';
            $output .= '</div>';
            $output .= '</div>';
            $output .= '</div>';
        }

        if ($ex && $ex['type'] === 'drag-drop') {
            // Drag & Drop Exercise with sidebar layout
            $output .= '<div class="kx-exercise-dragdrop" style="display:flex;flex-direction:column;gap:20px">';

            // Flip card
            $output .= '<div class="kx-flip-container" style="perspective:1000px;height:280px">';
            $output .= '<div class="kx-flip-inner" style="position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d">';

            // Front
            $output .= '<div class="kx-flip-front" style="position:absolute;width:100%;height:100%;backface-visibility:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px">';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:12px">LEGACY STATEMENT DIAGNOSTICS</span>';
            $output .= '<blockquote class="kx-h3" style="font-style:italic;max-width:400px;margin:0 0 20px;color:var(--on-surface)">' . esc_html($ex['statement']) . '</blockquote>';
            $output .= '<div class="kx-drop-zone" data-correct="' . esc_attr($ex['correct_answer']) . '" style="border:2px dashed var(--outline-variant);border-radius:var(--radius-md);padding:20px 32px;display:flex;flex-direction:column;align-items:center;gap:8px;transition:all .3s">';
            $output .= '<span class="dashicons dashicons-randomize" style="font-size:28px;color:var(--outline)"></span>';
            $output .= '<span class="kx-label" style="color:var(--outline)">Drag Diagnosis Here</span>';
            $output .= '</div>';
            $output .= '</div>';

            // Back
            $output .= '<div class="kx-flip-back" style="position:absolute;width:100%;height:100%;backface-visibility:hidden;transform:rotateY(180deg);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;background:rgba(255,255,255,0.4);border-radius:var(--radius-lg)">';
            $output .= '<span class="kx-label" style="color:var(--primary);margin-bottom:12px">DIAGNOSIS CONFIRMED</span>';
            $output .= '<blockquote class="kx-h3" style="font-style:italic;max-width:400px;margin:0 0 16px;color:var(--on-surface)">' . esc_html($ex['correction']) . '</blockquote>';
            $output .= '<div style="display:flex;align-items:center;gap:8px;color:var(--primary);font-weight:700">';
            $output .= '<span class="dashicons dashicons-yes-alt" style="font-size:18px"></span>';
            $output .= '<span class="kx-label">VERACITY LOGGED</span>';
            $output .= '</div>';
            $output .= '</div>';

            $output .= '</div>';
            $output .= '</div>';

            // Draggable chips
            $output .= '<div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center">';
            foreach ($ex['options'] as $i => $opt) {
                $is_correct = ($opt === $ex['correct_answer']);
                $style = $is_correct
                    ? 'background:var(--primary);color:var(--on-primary);'
                    : 'background:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.4);color:var(--on-surface);';
                $output .= '<div class="kx-chip" draggable="true" data-answer="' . esc_attr($opt) . '" style="' . $style . 'padding:8px 18px;border-radius:9999px;font-size:13px;font-weight:600;cursor:grab;transition:all .2s;display:flex;align-items:center;gap:6px">';
                $output .= '<span class="dashicons dashicons-move" style="font-size:14px"></span> ' . esc_html($opt);
                $output .= '</div>';
            }
            $output .= '</div>';

            $output .= '</div>';

        } elseif ($ex && $ex['type'] === 'calibration') {
            // Calibration Exercise
            $output .= '<div class="kx-exercise-calibration" style="display:flex;flex-direction:column;gap:20px">';

            // Three.js spiral container (for Pillar 3)
            if (!empty($ex['has_spiral'])) {
                $output .= '<div id="kx-spiral-container" style="width:100%;height:280px;border-radius:var(--radius-lg);overflow:hidden;background:rgba(255,255,255,0.2);position:relative">';
                $output .= '<div style="position:absolute;bottom:12px;left:12px;z-index:2;display:flex;flex-direction:column;gap:8px">';
                $output .= '<span class="kx-label" style="color:var(--on-surface-variant)">BOLTZMANN TEMP</span>';
                $output .= '<div id="kx-noise-display" style="font-size:24px;font-weight:700;color:var(--primary);font-family:var(--font-mono)">0.42</div>';
                $output .= '</div>';
                $output .= '<input type="range" id="kx-noise-slider" min="0" max="100" value="42" style="position:absolute;bottom:12px;right:12px;width:120px;z-index:2;accent-color:var(--primary)">';
                $output .= '</div>';
            }

            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:8px;display:block">CALIBRATION REQ.</span>';
            $output .= '<h3 class="kx-h2" style="margin:0">' . esc_html($ex['question']) . '</h3>';
            $output .= '</div>';

            $output .= '<div style="display:flex;flex-direction:column;gap:12px">';
            foreach ($ex['options'] as $opt) {
                $output .= '<button class="kx-btn kx-cal-btn" data-feedback="' . esc_attr($opt['feedback']) . '" data-metric="' . intval($ex['metric_value']) . '" style="width:100%;text-align:left;padding:16px 20px;background:rgba(255,255,255,0.4);border:1px solid rgba(255,255,255,0.4);border-radius:var(--radius-md);font-weight:600;font-size:13px;text-transform:uppercase;cursor:pointer;transition:all .2s;display:flex;justify-content:space-between;align-items:center">';
                $output .= '<span>' . esc_html($opt['label']) . '</span>';
                $output .= '<span class="dashicons dashicons-arrow-right-alt" style="font-size:16px;opacity:0;transition:opacity .2s;color:var(--' . $opt['tone'] . ')"></span>';
                $output .= '</button>';
            }
            $output .= '</div>';

            // Metric bar
            $output .= '<div style="margin-top:12px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.2)">';
            $output .= '<div style="display:flex;justify-content:space-between;margin-bottom:8px">';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant)">' . esc_html($ex['metric_label']) . '</span>';
            $output .= '<span class="kx-label kx-metric-val" style="color:var(--primary)">' . intval($ex['metric_value']) . '%</span>';
            $output .= '</div>';
            $output .= '<div class="kx-statbar-track"><div class="kx-statbar-fill kx-statbar-fill--primary kx-metric-fill" style="width:' . intval($ex['metric_value']) . '%"></div></div>';
            $output .= '</div>';

            $output .= '</div>';

        } elseif ($ex && $ex['type'] === 'intervention') {
            // Intervention Sequencing Exercise (Pillar 2 - WEFE Nexus)
            $output .= '<div class="kx-exercise-intervention" style="display:flex;flex-direction:column;gap:20px">';

            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:8px;display:block">WEFE NEXUS EVENT</span>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface);margin:0;line-height:1.6">' . esc_html($ex['scenario']) . '</p>';
            $output .= '</div>';

            // Intervention toolkit
            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:12px;display:block">AVAILABLE INTERVENTIONS</span>';
            $output .= '<div class="kx-toolkit-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px">';
            foreach ($ex['toolkit'] as $tool) {
                $output .= '<div class="kx-toolkit-item" data-id="' . esc_attr($tool['id']) . '" draggable="true" style="padding:12px;border:1px solid rgba(255,255,255,0.3);border-radius:var(--radius-md);background:rgba(255,255,255,0.3);cursor:grab;transition:all .2s;display:flex;flex-direction:column;gap:6px">';
                $output .= '<div style="display:flex;align-items:center;gap:8px">';
                $output .= '<span class="dashicons ' . esc_attr($tool['icon']) . '" style="font-size:18px;color:var(--primary)"></span>';
                $output .= '<span class="kx-label" style="color:var(--on-surface);font-weight:600">' . esc_html($tool['name']) . '</span>';
                $output .= '</div>';
                $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0;font-size:11px">' . esc_html($tool['desc']) . '</p>';
                $output .= '<span class="kx-body-sm" style="color:var(--outline);font-size:10px">' . esc_html($tool['cost']) . '</span>';
                $output .= '</div>';
            }
            $output .= '</div>';
            $output .= '</div>';

            // Sequence slots
            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:12px;display:block">INTERVENTION SEQUENCE (drop here)</span>';
            $output .= '<div class="kx-sequence-slots" style="display:flex;flex-direction:column;gap:8px">';
            for ($i = 0; $i < 3; $i++) {
                $output .= '<div class="kx-sequence-slot" data-slot="' . $i . '" style="padding:14px 16px;border:2px dashed var(--outline-variant);border-radius:var(--radius-md);display:flex;align-items:center;gap:10px;min-height:48px;transition:all .2s">';
                $output .= '<span class="kx-label" style="color:var(--outline);min-width:20px">' . ($i + 1) . '.</span>';
                $output .= '<span class="kx-label" style="color:var(--outline)">Drop intervention here</span>';
                $output .= '</div>';
            }
            $output .= '</div>';
            $output .= '</div>';

            // Submit button + feedback
            $correct = wp_json_encode($ex['correct_sequence']);
            $feedback = wp_json_encode($ex['feedback']);
            $output .= '<div class="kx-intervention-actions">';
            $output .= '<button class="kx-btn kx-btn--secondary kx-btn--full kx-intervention-submit" disabled style="opacity:0.5;cursor:not-allowed"><span class="dashicons dashicons-yes-alt" style="font-size:16px"></span> Submit Sequence</button>';
            $output .= '<div class="kx-intervention-feedback" style="display:none;margin-top:12px;padding:14px 16px;border-radius:var(--radius-md);font-size:13px;line-height:1.6"></div>';
            $output .= '<input type="hidden" class="kx-intervention-correct" value="' . esc_attr($correct) . '">';
            $output .= '<input type="hidden" class="kx-intervention-feedback-data" value="' . esc_attr($feedback) . '">';
            $output .= '</div>';

            $output .= '</div>';

        } elseif ($ex && $ex['type'] === 'parameter') {
            // Parameter Adjustment Exercise (Pillar 4 - Boltzmann Temperature)
            $output .= '<div class="kx-exercise-parameter" style="display:flex;flex-direction:column;gap:20px">';

            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:8px;display:block">SYSTEM ANOMALY</span>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface);margin:0;line-height:1.6">' . esc_html($ex['scenario']) . '</p>';
            $output .= '</div>';

            // Parameter controls
            $output .= '<div style="display:flex;flex-direction:column;gap:16px">';
            foreach ($ex['controls'] as $ctrl) {
                $safe_min = $ctrl['safe_range'][0];
                $safe_max = $ctrl['safe_range'][1];
                $output .= '<div class="kx-param-control">';
                $output .= '<div style="display:flex;justify-content:space-between;margin-bottom:6px">';
                $output .= '<span class="kx-label" style="color:var(--on-surface)">' . esc_html($ctrl['label']) . '</span>';
                $output .= '<span class="kx-label kx-param-val" style="color:var(--primary);font-weight:700">' . $ctrl['default'] . $ctrl['unit'] . '</span>';
                $output .= '</div>';
                $output .= '<input type="range" class="kx-param-slider" data-param="' . esc_attr($ctrl['id']) . '" data-min="' . $ctrl['min'] . '" data-max="' . $ctrl['max'] . '" data-default="' . $ctrl['default'] . '" data-safe-min="' . $safe_min . '" data-safe-max="' . $safe_max . '" value="' . $ctrl['default'] . '" min="' . $ctrl['min'] . '" max="' . $ctrl['max'] . '" step="0.1" style="width:100%;accent-color:var(--primary)">';
                $output .= '<div style="display:flex;justify-content:space-between;margin-top:4px">';
                $output .= '<span class="kx-body-sm" style="color:var(--outline);font-size:10px">' . $safe_min . $ctrl['unit'] . ' (safe min)</span>';
                $output .= '<span class="kx-body-sm" style="color:var(--outline);font-size:10px">' . $safe_max . $ctrl['unit'] . ' (safe max)</span>';
                $output .= '</div>';
                $output .= '</div>';
            }
            $output .= '</div>';

            $output .= '</div>';

        } elseif ($ex && $ex['type'] === 'separation') {
            // Data Separation Exercise (Pillar 6 - Tombstone)
            $output .= '<div class="kx-exercise-separation" style="display:flex;flex-direction:column;gap:20px">';

            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:8px;display:block">LEGACY TRAUMA LOOP</span>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface);margin:0;line-height:1.6;font-style:italic">' . esc_html($ex['scenario']) . '</p>';
            $output .= '</div>';

            // Two drop zones: Causal Data and Punitive Currency
            $output .= '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">';
            $output .= '<div class="kx-separation-zone" data-zone="causal" style="padding:16px;border:2px dashed var(--outline-variant);border-radius:var(--radius-md);min-height:120px">';
            $output .= '<span class="kx-label" style="color:var(--primary);display:block;margin-bottom:12px">CAUSAL DATA</span>';
            $output .= '<span class="kx-body-sm" style="color:var(--outline);font-style:italic">What happened (immutable record)</span>';
            $output .= '<div class="kx-separation-items" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div>';
            $output .= '</div>';
            $output .= '<div class="kx-separation-zone" data-zone="punitive" style="padding:16px;border:2px dashed var(--outline-variant);border-radius:var(--radius-md);min-height:120px">';
            $output .= '<span class="kx-label" style="color:var(--error);display:block;margin-bottom:12px">PUNITIVE CURRENCY</span>';
            $output .= '<span class="kx-body-sm" style="color:var(--outline);font-style:italic">Emotional/retaliatory charge (to deprecate)</span>';
            $output .= '<div class="kx-separation-items" style="margin-top:12px;display:flex;flex-direction:column;gap:8px"></div>';
            $output .= '</div>';
            $output .= '</div>';

            // Draggable data items
            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:12px;display:block">DATA PACKET — SORT INTO CORRECT ZONE</span>';
            $output .= '<div class="kx-separation-source" style="display:flex;flex-direction:column;gap:8px">';
            foreach ($ex['data_items'] as $item) {
                $tone = $item['type'] === 'causal' ? 'var(--primary)' : 'var(--error)';
                $output .= '<div class="kx-data-item" draggable="true" data-type="' . esc_attr($item['type']) . '" data-id="' . esc_attr($item['id']) . '" style="padding:12px 16px;border:1px solid rgba(255,255,255,0.3);border-left:3px solid ' . $tone . ';border-radius:var(--radius-md);background:rgba(255,255,255,0.3);cursor:grab;transition:all .2s;font-size:13px;color:var(--on-surface)">';
                $output .= esc_html($item['text']);
                $output .= '</div>';
            }
            $output .= '</div>';
            $output .= '</div>';

            // Tombstone button
            $output .= '<button class="kx-btn kx-btn--primary kx-tombstone-btn" style="width:100%"><span class="dashicons dashicons-archive" style="font-size:16px"></span> Tombstone Error</button>';

            $output .= '</div>';

        } elseif ($ex && $ex['type'] === 'consensus') {
            // Three-Way Consensus Exercise (Pillar 8 - P-Gate)
            $output .= '<div class="kx-exercise-consensus" style="display:flex;flex-direction:column;gap:20px">';

            $output .= '<div>';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);margin-bottom:8px;display:block">RESOURCE ALLOCATION PROPOSAL</span>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface);margin:0;line-height:1.6">' . esc_html($ex['scenario']) . '</p>';
            $output .= '</div>';

            // Three data feeds
            $output .= '<div style="display:flex;flex-direction:column;gap:12px">';
            foreach ($ex['feeds'] as $i => $feed) {
                $verdict_color = $feed['verdict'] === 'APPROVE' ? 'var(--primary)' : ($feed['verdict'] === 'CONDITIONAL' ? 'var(--tertiary)' : 'var(--outline)');
                $output .= '<div class="kx-feed-card" style="padding:16px;border:1px solid rgba(255,255,255,0.3);border-radius:var(--radius-md);background:rgba(255,255,255,0.3)">';
                $output .= '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
                $output .= '<div style="display:flex;align-items:center;gap:8px">';
                $output .= '<span class="dashicons ' . esc_attr($feed['icon']) . '" style="font-size:18px;color:var(--primary)"></span>';
                $output .= '<span class="kx-label" style="color:var(--on-surface);font-weight:600">' . esc_html($feed['source']) . '</span>';
                $output .= '</div>';
                $output .= '<span class="kx-label" style="color:' . $verdict_color . ';font-weight:700">' . esc_html($feed['verdict']) . '</span>';
                $output .= '</div>';
                $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0;font-size:12px;line-height:1.5">' . esc_html($feed['reasoning']) . '</p>';
                if ($feed['verdict'] === 'PENDING') {
                    $output .= '<div style="margin-top:12px;display:flex;gap:8px">';
                    $output .= '<button class="kx-btn kx-btn--secondary kx-hitl-approve" style="font-size:11px;padding:6px 12px">Approve</button>';
                    $output .= '<button class="kx-btn kx-btn--secondary kx-hitl-modify" style="font-size:11px;padding:6px 12px">Modify</button>';
                    $output .= '<button class="kx-btn kx-btn--secondary kx-hitl-reject" style="font-size:11px;padding:6px 12px">Reject</button>';
                    $output .= '</div>';
                }
                $output .= '</div>';
            }
            $output .= '</div>';

            // P-Gate
            $output .= '<div style="text-align:center;padding:16px;border:2px solid var(--outline-variant);border-radius:var(--radius-md)">';
            $output .= '<span class="kx-label" style="color:var(--on-surface-variant);display:block;margin-bottom:12px">P-GATE (PHYSICALIZATION GATE)</span>';
            $output .= '<button class="kx-btn kx-btn--primary kx-pgate-btn" style="min-width:200px"><span class="dashicons dashicons-lock" style="font-size:16px"></span> Trigger P-Gate</button>';
            $output .= '</div>';

            $output .= '</div>';

        } else {
            // Fallback
            $output .= '<div style="text-align:center;padding:40px">';
            $output .= '<span class="dashicons dashicons-admin-generic" style="font-size:48px;color:var(--outline);display:block;margin-bottom:16px"></span>';
            $output .= '<p class="kx-body" style="color:var(--on-surface-variant)">Exercise content is being prepared for this pillar.</p>';
            $output .= '</div>';
        }

        // Action buttons
        $output .= '<div style="margin-top:24px;display:flex;justify-content:flex-end;gap:12px">';
        $output .= '<button class="kx-btn kx-btn--secondary">Request Hint</button>';
        $output .= '<button class="kx-btn kx-btn--primary">Begin Exercise <span class="dashicons dashicons-arrow-right-alt" style="font-size:16px"></span></button>';
        $output .= '</div>';

        $output .= '</div>';

        // Diagnostic Backlog sidebar (for drag-drop exercises)
        if ($ex && $ex['type'] === 'drag-drop' && isset($ex['backlog'])) {
            $output .= '<aside style="display:flex;flex-direction:column;gap:24px">';
            $output .= '<div class="kx-card">';
            $output .= '<h3 class="kx-h3" style="margin:0 0 16px">Diagnostic Backlog</h3>';
            $output .= '<div style="display:flex;flex-direction:column;gap:12px;max-height:500px;overflow-y:auto">';
            foreach ($ex['backlog'] as $item) {
                $is_locked = $item['status'] === 'locked';
                $opacity = $is_locked ? 'opacity:0.6' : 'opacity:1';
                $icon = $is_locked ? 'dashicons-lock' : 'dashicons-clock';
                $output .= '<div style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.15);' . $opacity . ';border-radius:var(--radius-md);transition:background .2s">';
                $output .= '<div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:6px">';
                $output .= '<span class="kx-label" style="color:var(--primary)">' . esc_html($item['type']) . '</span>';
                $output .= '<span class="dashicons ' . $icon . '" style="font-size:16px;color:var(--outline)"></span>';
                $output .= '</div>';
                $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);font-style:italic;margin:0">' . esc_html($item['quote']) . '</p>';
                $output .= '</div>';
            }
            $output .= '</div>';

            // Proctor section
            $output .= '<div style="margin-top:24px;padding-top:24px;border-top:1px solid rgba(255,255,255,0.15)">';
            $output .= '<div style="display:flex;align-items:center;gap:12px">';
            $output .= '<div style="width:44px;height:44px;border-radius:50%;background:var(--primary-container);display:flex;align-items:center;justify-content:center">';
            $output .= '<span class="dashicons dashicons-shield" style="font-size:20px;color:var(--on-primary-container)"></span>';
            $output .= '</div>';
            $output .= '<div>';
            $output .= '<p class="kx-label" style="color:var(--on-surface);margin:0">' . esc_html($proctor_name) . '</p>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0">' . esc_html($proctor_desc) . '</p>';
            $output .= '</div>';
            $output .= '</div>';
            $output .= '</div>';
            $output .= '</div>';
            $output .= '</aside>';
        }

        $output .= '</div>';

        return $output;
    }

    public function shortcode_grid($atts) {
        $pillars = self::get_pillars();
        if (empty($pillars)) return '<p>No training pillars found.</p>';

        $parent_page = get_page_by_path('training');
        $parent_slug = $parent_page ? $parent_page->post_name : 'training';

        $icons = [
            'psychology' => KYLOS_TRAINING_URL . 'assets/icons/pillar-1.webp',
            'eco' => KYLOS_TRAINING_URL . 'assets/icons/pillar-2.webp',
            'diversity_3' => KYLOS_TRAINING_URL . 'assets/icons/pillar-3.webp',
            'memory' => KYLOS_TRAINING_URL . 'assets/icons/pillar-4.webp',
            'fitness_center' => KYLOS_TRAINING_URL . 'assets/icons/pillar-5.webp',
            'schedule' => KYLOS_TRAINING_URL . 'assets/icons/pillar-6.webp',
            'auto_awesome' => KYLOS_TRAINING_URL . 'assets/icons/pillar-7.webp',
            'account_tree' => KYLOS_TRAINING_URL . 'assets/icons/pillar-8.webp',
            'insights' => KYLOS_TRAINING_URL . 'assets/icons/pillar-9.webp'
        ];

        $output = '<div class="kx-grid">';
        foreach ($pillars as $p) {
            $url = get_permalink(get_page_by_path($parent_slug . '/' . $p['slug']));
            $icon_src = isset($icons[$p['icon']]) ? $icons[$p['icon']] : '';
            $output .= '<a href="' . esc_url($url) . '" class="kx-card" style="text-decoration:none;position:relative;overflow:hidden;">';
            $output .= '<div style="height:4px;width:100%;position:absolute;top:0;left:0;background:' . esc_attr($p['color']) . ';"></div>';
            $output .= '<div style="margin-top:8px;">';
            if ($icon_src) {
                $output .= '<img src="' . esc_url($icon_src) . '" alt="' . esc_attr($p['name']) . '" style="width:64px;height:64px;object-fit:contain;display:block;margin-bottom:12px">';
            } else {
                $output .= '<span class="dashicons dashicons-admin-generic" style="font-size:40px;color:' . esc_attr($p['color']) . ';display:block;margin-bottom:12px"></span>';
            }
            $output .= '<h3 class="kx-h2" style="margin:0 0 8px">' . esc_html($p['name']) . '</h3>';
            $output .= '<p class="kx-body-sm" style="color:var(--on-surface-variant);margin:0 0 16px">' . esc_html($p['description']) . '</p>';
            $output .= '<span class="kx-label" style="color:var(--secondary)">Enter Training &rarr;</span>';
            $output .= '</div>';
            $output .= '</a>';
        }
        $output .= '</div>';

        return $output;
    }

    public function shortcode_badge($atts) {
        $atts = shortcode_atts(['size' => '50'], $atts);
        $size = intval($atts['size']);
        $user_id = get_current_user_id();
        $all_pillars = self::get_pillars();
        if (empty($all_pillars)) return '';

        $completed = [];
        if ($user_id) {
            $completed = array_keys(self::get_user_score($user_id));
        }

        $highest = 0;
        for ($i = 0; $i < count($all_pillars); $i++) {
            if (in_array($all_pillars[$i]['slug'], $completed)) {
                $highest = $i + 1;
            } else {
                break;
            }
        }

        $output = '<div class="kx-badge-single" style="width:' . $size . 'px;height:' . $size . 'px;border-radius:8px;overflow:hidden;border:1px solid ' . ($highest > 0 ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)') . ';flex-shrink:0;opacity:' . ($highest > 0 ? '1' : '0.35') . ';transition:opacity 0.3s, border-color 0.3s;position:relative">';

        if ($highest > 0) {
            $badge_url = KYLOS_TRAINING_URL . 'assets/badges/pillar' . $highest . '-badge100.png';
            $output .= '<img src="' . esc_url($badge_url) . '" alt="Pillar ' . $highest . ' Badge" style="width:100%;height:100%;object-fit:cover;display:block">';
        } else {
            $output .= '<div style="width:100%;height:100%;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center">';
            $output .= '<span class="dashicons dashicons-awards" style="font-size:20px;color:rgba(255,255,255,0.3)"></span>';
            $output .= '</div>';
        }

        $output .= '</div>';

        return $output;
    }

    public function shortcode_training_app($atts) {
        global $post;
        $atts = shortcode_atts(['pillar' => ''], $atts);
        $pillar_id = $atts['pillar'] ?: (get_post_meta($post->ID ?? 0, '_kylos_pillar_id', true) ?: '1');
        return '<div id="kylos-training-root" data-pillar="' . esc_attr($pillar_id) . '"></div>';
    }

    public static function activate() {
        if (!class_exists('CDBQ_DB_Manager')) {
            deactivate_plugins(plugin_basename(__FILE__));
            wp_die('Kylos ARC Training requires Custom Database Query plugin.');
        }

        $parent_id = wp_insert_post([
            'post_title' => 'Training',
            'post_name' => 'training',
            'post_type' => 'page',
            'post_status' => 'publish',
            'post_content' => '<!-- wp:heading {"level":1} --><h1>Operational Training</h1><!-- /wp:heading --><!-- wp:paragraph --><p>Master the nine domains of post-Darwinian merit through structured diagnostic exercises.</p><!-- /wp:paragraph --><!-- wp:shortcode -->[kylos_pillar_grid]<!-- /wp:shortcode -->',
        ], true);

        if (is_wp_error($parent_id)) {
            $existing = get_page_by_path('training', OBJECT, 'page');
            $parent_id = $existing ? $existing->ID : 0;
            if (!$parent_id) return;
        }
        update_post_meta($parent_id, '_wp_page_template', 'kylos-training-hub.php');

        $pillars = self::get_pillars();
        foreach ($pillars as $pillar) {
            $existing = get_page_by_path($pillar['slug'], OBJECT, 'page');
            $child_id = 0;
            if (!$existing || $existing->post_parent !== $parent_id) {
                $child_id = wp_insert_post([
                    'post_title' => $pillar['name'],
                    'post_name' => $pillar['slug'],
                    'post_type' => 'page',
                    'post_status' => 'publish',
                    'post_parent' => $parent_id,
                    'post_content' => '<!-- wp:shortcode -->[kylos_pillar_header]<!-- /wp:shortcode --><!-- wp:shortcode -->[kylos_pillar_exercises]<!-- /wp:shortcode -->',
                ]);
                if (is_wp_error($child_id)) $child_id = 0;
            } else {
                $child_id = $existing->ID;
            }
            if ($child_id) {
                update_post_meta($child_id, '_wp_page_template', 'kylos-pillar-detail.php');
            }
        }
    }

    public static function deactivate() {
        $parent = get_page_by_path('training', OBJECT, 'page');
        if ($parent) {
            $children = get_children(['post_parent' => $parent->ID, 'post_type' => 'page']);
            foreach ($children as $child) {
                wp_delete_post($child->ID, true);
            }
            wp_delete_post($parent->ID, true);
        }
    }
}

add_action('plugins_loaded', [Kylos_Training::class, 'get_instance']);
register_activation_hook(__FILE__, [Kylos_Training::class, 'activate']);
register_deactivation_hook(__FILE__, [Kylos_Training::class, 'deactivate']);
