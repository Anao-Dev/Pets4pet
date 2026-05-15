<?php
// ============================================================
//  PETS4PET PORTAL — login.php
//  API REST de Autenticação
//  Rota: POST /backend/login.php
// ============================================================

require_once __DIR__ . '/config.php';

setCorsHeaders();

// ─── Aceita apenas POST ────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Método não permitido. Use POST.', [], 405);
}

// ─── Lê o body JSON ───────────────────────────────────────
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE || !is_array($body)) {
    respond(false, 'Corpo da requisição inválido. Envie JSON.', [], 400);
}

// ─── FUNÇÕES INTERNAS ──────────────────────────────────────

/**
 * Valida os campos de login.
 */
function validarLogin(array $d): array
{
    $erros = [];

    $email = trim($d['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erros[] = 'E-mail inválido.';
    }

    $senha = $d['senha'] ?? '';
    if (empty($senha)) {
        $erros[] = 'Senha é obrigatória.';
    }

    return $erros;
}

/**
 * Detecta o IP real do cliente.
 */
function getClientIp(): ?string
{
    $ipRaw = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    return $ipRaw ? trim(explode(',', $ipRaw)[0]) : null;
}

/**
 * Rate limiting simples por IP — máximo 10 tentativas em 15 minutos.
 * Usa a tabela logs_acesso para contar tentativas falhas recentes.
 */
function verificarRateLimit(PDO $pdo, string $ip): void
{
    $stmt = $pdo->prepare("
        SELECT COUNT(*) FROM logs_acesso
        WHERE acao = 'login_falha'
          AND ip = ?
          AND criado_em >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)
    ");
    $stmt->execute([$ip]);
    $tentativas = (int) $stmt->fetchColumn();

    if ($tentativas >= 10) {
        respond(false, 'Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.', [], 429);
    }
}

/**
 * Busca o usuário pelo e-mail.
 */
function buscarUsuario(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare('
        SELECT id, nome, sobrenome, email, senha_hash, tipo,
               avatar_url, ativo, email_verificado
        FROM usuarios
        WHERE email = ?
        LIMIT 1
    ');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    return $user ?: null;
}

/**
 * Gera um JWT simples (HS256) sem dependência externa.
 * Payload: id, nome, email, tipo, exp
 */
function gerarJWT(array $payload): string
{
    $header  = base64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
    $payload = base64url_encode(json_encode($payload));
    $sig     = base64url_encode(hash_hmac('sha256', "$header.$payload", JWT_SECRET, true));
    return "$header.$payload.$sig";
}

function base64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Salva a sessão no banco para controle/blacklist futuro.
 */
function salvarSessao(PDO $pdo, int $usuarioId, string $token): void
{
    $expira = date('Y-m-d H:i:s', time() + JWT_EXPIRY);
    $ip     = getClientIp();
    $ua     = $_SERVER['HTTP_USER_AGENT'] ?? null;

    try {
        $pdo->prepare('
            INSERT INTO sessoes (usuario_id, token, ip, user_agent, expira_em)
            VALUES (:uid, :token, :ip, :ua, :exp)
        ')->execute([
            ':uid'   => $usuarioId,
            ':token' => $token,
            ':ip'    => $ip,
            ':ua'    => $ua,
            ':exp'   => $expira,
        ]);
    } catch (PDOException $e) {
        // Sessão não salva não impede o login — apenas loga
        error_log('[Pets4Pet] Falha ao salvar sessão: ' . $e->getMessage());
    }
}

/**
 * Registra log de acesso.
 */
function registrarLog(PDO $pdo, ?int $usuarioId, string $acao, array $detalhes = []): void
{
    $ip = getClientIp();
    try {
        $pdo->prepare('
            INSERT INTO logs_acesso (usuario_id, acao, ip, detalhes)
            VALUES (:uid, :acao, :ip, :det)
        ')->execute([
            ':uid'  => $usuarioId,
            ':acao' => $acao,
            ':ip'   => $ip,
            ':det'  => json_encode($detalhes, JSON_UNESCAPED_UNICODE),
        ]);
    } catch (PDOException $e) {
        error_log('[Pets4Pet] Falha ao registrar log: ' . $e->getMessage());
    }
}

// ─── FLUXO PRINCIPAL ──────────────────────────────────────

// 1. Validação básica dos campos
$erros = validarLogin($body);
if (!empty($erros)) {
    respond(false, 'Dados inválidos.', ['erros' => $erros], 422);
}

$pdo   = db();
$email = strtolower(trim($body['email']));
$ip    = getClientIp();

// 2. Rate limiting por IP
if ($ip) {
    verificarRateLimit($pdo, $ip);
}

// 3. Busca o usuário
$user = buscarUsuario($pdo, $email);

// 4. Usuário não encontrado ou senha errada
//    Mensagem genérica intencional — não revela se o e-mail existe
if (!$user || !password_verify($body['senha'], $user['senha_hash'])) {
    registrarLog($pdo, $user['id'] ?? null, 'login_falha', [
        'email'  => $email,
        'motivo' => !$user ? 'usuario_nao_encontrado' : 'senha_incorreta',
    ]);
    respond(false, 'E-mail ou senha incorretos.', [], 401);
}

// 5. Conta desativada pelo admin
if (!$user['ativo']) {
    registrarLog($pdo, $user['id'], 'login_falha', ['motivo' => 'conta_inativa']);
    respond(false, 'Sua conta foi desativada. Entre em contato com o suporte.', [], 403);
}

// 6. E-mail ainda não verificado
if (!$user['email_verificado']) {
    registrarLog($pdo, $user['id'], 'login_falha', ['motivo' => 'email_nao_verificado']);
    respond(false, 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.', [
        'email_verificado' => false,
        'email'            => $email,
    ], 403);
}

// 7. Gera o JWT
$agora   = time();
$payload = [
    'sub'   => $user['id'],
    'nome'  => $user['nome'],
    'email' => $user['email'],
    'tipo'  => $user['tipo'],
    'iat'   => $agora,
    'exp'   => $agora + JWT_EXPIRY,
];

$token = gerarJWT($payload);

// 8. Salva sessão + log de sucesso
salvarSessao($pdo, $user['id'], $token);
registrarLog($pdo, $user['id'], 'login_sucesso', ['tipo' => $user['tipo']]);

// 9. Resposta de sucesso
respond(true, 'Login realizado com sucesso!', [
    'token'  => $token,
    'expira' => $payload['exp'],
    'usuario' => [
        'id'         => $user['id'],
        'nome'       => $user['nome'],
        'sobrenome'  => $user['sobrenome'],
        'email'      => $user['email'],
        'tipo'       => $user['tipo'],
        'avatar_url' => $user['avatar_url'],
    ],
], 200);