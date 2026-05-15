<?php
// ============================================================
//  PETS4PET PORTAL — cad.php
//  API REST de Cadastro de Usuários
//  Rota: POST /backend/cad.php
// ============================================================

require_once __DIR__ . '/config.php';
require_once __DIR__ . '/mailer.php';

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
 * Valida os campos de entrada.
 * Retorna array de erros (vazio = OK).
 */
function validarCadastro(array $d): array
{
    $erros = [];

    $nome = trim($d['nome'] ?? '');
    if (strlen($nome) < 2 || strlen($nome) > 120) {
        $erros[] = 'Nome deve ter entre 2 e 120 caracteres.';
    }

    $sobrenome = trim($d['sobrenome'] ?? '');
    if (strlen($sobrenome) < 2 || strlen($sobrenome) > 120) {
        $erros[] = 'Sobrenome deve ter entre 2 e 120 caracteres.';
    }

    $email = trim($d['email'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $erros[] = 'E-mail inválido.';
    }

    $senha = $d['senha'] ?? '';
    if (strlen($senha) < 8) {
        $erros[] = 'A senha deve ter no mínimo 8 caracteres.';
    }
    if (!preg_match('/[A-Z]/', $senha)) {
        $erros[] = 'A senha deve conter ao menos uma letra maiúscula.';
    }
    if (!preg_match('/[0-9]/', $senha)) {
        $erros[] = 'A senha deve conter ao menos um número.';
    }

    $confirmar = $d['confirmar_senha'] ?? '';
    if ($senha !== $confirmar) {
        $erros[] = 'As senhas não coincidem.';
    }

    $tipos = ['tutor', 'profissional', 'petshop'];
    $tipo  = $d['tipo'] ?? 'tutor';
    if (!in_array($tipo, $tipos, true)) {
        $erros[] = 'Tipo de conta inválido.';
    }

    $telefone = trim($d['telefone'] ?? '');
    if ($telefone !== '' && !preg_match('/^\+?[\d\s\-\(\)]{7,20}$/', $telefone)) {
        $erros[] = 'Telefone inválido.';
    }

    if (empty($d['aceitar_termos'])) {
        $erros[] = 'Você precisa aceitar os termos de uso.';
    }

    return $erros;
}

/**
 * Verifica se o e-mail já está cadastrado.
 */
function emailExiste(PDO $pdo, string $email): bool
{
    $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    return (bool) $stmt->fetchColumn();
}

/**
 * Insere o usuário no banco.
 * Retorna ['id' => int, 'token' => string].
 *
 * FIX: Antes buscava o token com um SELECT extra após o INSERT.
 *      Agora o token é gerado aqui e retornado diretamente — sem roundtrip desnecessário.
 */
function cadastrarUsuario(PDO $pdo, array $d): array
{
    $senhaHash = password_hash($d['senha'], PASSWORD_BCRYPT, ['cost' => 12]);
    $token     = bin2hex(random_bytes(32));

    $stmt = $pdo->prepare('
        INSERT INTO usuarios
            (nome, sobrenome, email, senha_hash, telefone, tipo, token_verificacao)
        VALUES
            (:nome, :sobrenome, :email, :senha_hash, :telefone, :tipo, :token)
    ');

    $stmt->execute([
        ':nome'       => trim($d['nome']),
        ':sobrenome'  => trim($d['sobrenome']),
        ':email'      => strtolower(trim($d['email'])),
        ':senha_hash' => $senhaHash,
        ':telefone'   => trim($d['telefone'] ?? '') ?: null,
        ':tipo'       => $d['tipo'] ?? 'tutor',
        ':token'      => $token,
    ]);

    return [
        'id'    => (int) $pdo->lastInsertId(),
        'token' => $token,
    ];
}

/**
 * Registra o log de acesso/ação.
 * Erros de log não interrompem o fluxo principal.
 */
function registrarLog(PDO $pdo, ?int $usuarioId, string $acao, array $detalhes = []): void
{
    // FIX: HTTP_X_FORWARDED_FOR pode conter múltiplos IPs (proxy chain).
    //      Pega apenas o primeiro, que é o IP real do cliente.
    $ipRaw = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? null;
    $ip    = $ipRaw ? trim(explode(',', $ipRaw)[0]) : null;

    try {
        $stmt = $pdo->prepare('
            INSERT INTO logs_acesso (usuario_id, acao, ip, detalhes)
            VALUES (:uid, :acao, :ip, :det)
        ');
        $stmt->execute([
            ':uid'  => $usuarioId,
            ':acao' => $acao,
            ':ip'   => $ip,
            ':det'  => json_encode($detalhes, JSON_UNESCAPED_UNICODE),
        ]);
    } catch (PDOException $e) {
        // Log não deve derrubar o cadastro. Apenas registra no error_log do servidor.
        error_log('[Pets4Pet] Falha ao registrar log: ' . $e->getMessage());
    }
}

// ─── FLUXO PRINCIPAL ──────────────────────────────────────

// 1. Validação
$erros = validarCadastro($body);
if (!empty($erros)) {
    respond(false, 'Dados inválidos.', ['erros' => $erros], 422);
}

$pdo   = db();
$email = strtolower(trim($body['email']));

// 2. E-mail duplicado
if (emailExiste($pdo, $email)) {
    respond(false, 'Este e-mail já está cadastrado. Faça login ou use outro e-mail.', [], 409);
}

// 3. Inserção + envio de e-mail
// Inicializa todas as variáveis usadas fora do try — o analisador estático não sabe
// que os catch sempre terminam com exit via respond().
$novoId       = null;
$token        = null;
$emailEnviado = false;

try {
    $resultado = cadastrarUsuario($pdo, $body);
    $novoId    = $resultado['id'];
    $token     = $resultado['token'];

    registrarLog($pdo, $novoId, 'cadastro', ['tipo' => $body['tipo'] ?? 'tutor']);

    // Envia o e-mail de verificação
    // FIX: captura o retorno — se o e-mail falhar, o usuário ainda foi criado.
    //      Informa na resposta sem reverter o cadastro.
    $emailEnviado = enviarEmailVerificacao($email, trim($body['nome']), $token);

} catch (PDOException $e) {
    $detalhe = P4P_ENV === 'development' ? $e->getMessage() : 'Erro ao salvar usuário.';
    respond(false, $detalhe, [], 500);
} catch (Throwable $e) {
    // FIX: antes só capturava PDOException. Erros do PHPMailer ou outros
    //      passariam direto e quebrariam a resposta sem JSON válido.
    $detalhe = P4P_ENV === 'development' ? $e->getMessage() : 'Erro interno no servidor.';
    respond(false, $detalhe, [], 500);
}

// 4. Resposta de sucesso
$mensagem = $emailEnviado
    ? 'Cadastro realizado! Enviamos um e-mail de confirmação para ' . $email . ' 📧'
    : 'Cadastro realizado! Não conseguimos enviar o e-mail de confirmação — tente reenviar depois.';

respond(true, $mensagem, [
    'usuario_id'     => $novoId,
    'nome'           => trim($body['nome']),
    'email'          => $email,
    'tipo'           => $body['tipo'] ?? 'tutor',
    'email_enviado'  => $emailEnviado,
], 201);