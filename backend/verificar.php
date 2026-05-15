<?php
// ============================================================
//  PETS4PET PORTAL — verificar.php
//  Confirmação de e-mail via token
// ============================================================

require_once __DIR__ . '/config.php';

$token = trim($_GET['token'] ?? '');

if (empty($token)) {
    redirectComStatus('token_invalido');
}

try {
    $pdo = db();
    
    // Busca o usuário
    $stmt = $pdo->prepare('SELECT id, email_verificado FROM usuarios WHERE token_verificacao = ? LIMIT 1');
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        redirectComStatus('link_invalido');
    }

    if ($user['email_verificado']) {
        redirectComStatus('ja_verificado');
    }

    // Efetiva a verificação
    $upd = $pdo->prepare('UPDATE usuarios SET email_verificado = 1, token_verificacao = NULL WHERE id = ?');
    $upd->execute([$user['id']]);

    redirectComStatus('verificado');

} catch (PDOException $e) {
    error_log("[Pets4Pet Verify] Erro no banco: " . $e->getMessage());
    redirectComStatus('erro_interno');
}

/**
 * Função de redirecionamento inteligente (Zero C:\ Bug)
 */
function redirectComStatus(string $status): never
{
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
    
    // Pega o caminho virtual da URL (ex: /pets4pet/backend/verificar.php)
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
    
    // Remove '/backend/verificar.php' para voltar à raiz e entrar em /frontend
    $projectRoot = str_replace('/backend/verificar.php', '', $scriptName);
    
    $urlFinal = "{$scheme}://{$host}{$projectRoot}/frontend/login.html?status={$status}";

    header("Location: " . $urlFinal);
    exit;
}