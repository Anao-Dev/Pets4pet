<?php
// ============================================================
//  PETS4PET PORTAL — config.php
//  Configuração de banco de dados e constantes globais
// ============================================================

// ─── Ambiente ─────────────────────────────────────────────
define('P4P_ENV', getenv('P4P_ENV') ?: 'development'); // 'development' | 'production'

// ─── Banco de dados ────────────────────────────────────────
define('DB_HOST',    getenv('DB_HOST')    ?: 'localhost');
define('DB_PORT',    getenv('DB_PORT')    ?: '3306');
define('DB_NAME',    getenv('DB_NAME')    ?: 'pets4pet');
define('DB_USER',    getenv('DB_USER')    ?: 'root');
define('DB_PASS',    getenv('DB_PASS')    ?: '');
define('DB_CHARSET', 'utf8mb4');

// ─── JWT / Sessão ──────────────────────────────────────────
define('JWT_SECRET',    getenv('JWT_SECRET')    ?: 'TROQUE_ESTA_CHAVE_NO_PRODUCAO_!@#');
define('JWT_EXPIRY',    60 * 60 * 24 * 7);   // 7 dias em segundos

// ─── App ───────────────────────────────────────────────────
define('APP_NAME',    'Pets4Pet Portal');
define('APP_VERSION', '1.0.0');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost');

// ─── CORS ──────────────────────────────────────────────────
// Em produção, substitua '*' pelo domínio real do frontend
define('CORS_ORIGIN', getenv('CORS_ORIGIN') ?: '*');

// ─── Funções de utilidade ──────────────────────────────────

/**
 * Retorna uma conexão PDO ao banco de dados (singleton simples).
 */
function db(): PDO
{
    static $pdo = null;
    if ($pdo !== null) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=%s',
        DB_HOST, DB_PORT, DB_NAME, DB_CHARSET
    );

    try {
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        // Nunca expõe detalhes em produção
        $msg = P4P_ENV === 'development'
            ? 'Erro de conexão: ' . $e->getMessage()
            : 'Erro interno no servidor. Tente novamente mais tarde.';
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => $msg]);
        exit;
    }

    return $pdo;
}

/**
 * Define os headers CORS e JSON padrão da API.
 */
function setCorsHeaders(): void
{
    header('Access-Control-Allow-Origin: '  . CORS_ORIGIN);
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Max-Age: 86400');
    header('Content-Type: application/json; charset=utf-8');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

/**
 * Envia resposta JSON padronizada e encerra a execução.
 */
function respond(bool $success, string $message, array $data = [], int $httpCode = 200): void
{
    http_response_code($httpCode);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}