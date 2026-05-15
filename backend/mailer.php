<?php
// ============================================================
//  PETS4PET PORTAL — mailer.php
//  Envio de e-mails via PHPMailer + Gmail SMTP
// ============================================================

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/PHPMailer/src/Exception.php';
require_once __DIR__ . '/PHPMailer/src/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/src/SMTP.php';

if (!defined('MAIL_USER'))      define('MAIL_USER',      getenv('MAIL_USER')      ?: 'porto.dev.gb@gmail.com');
if (!defined('MAIL_PASS'))      define('MAIL_PASS',      getenv('MAIL_PASS')      ?: 'obdkerxwwziqciuk');
if (!defined('MAIL_FROM_NAME')) define('MAIL_FROM_NAME', getenv('MAIL_FROM_NAME') ?: 'Pets4Pet Portal');

/**
 * Envia o e-mail de verificação de conta.
 */
function enviarEmailVerificacao(string $email, string $nome, string $token): bool
{
    $mail = new PHPMailer(true);

    try {
        // ── Configuração SMTP ────────────────────────────
        $mail->isSMTP();
        $mail->Host       = 'smtp.gmail.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = MAIL_USER;
        $mail->Password   = MAIL_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = 587;
        $mail->CharSet    = 'UTF-8';

        // ── Remetente e destinatário ─────────────────────
        $mail->setFrom(MAIL_USER, MAIL_FROM_NAME);
        $mail->addAddress($email, $nome);

        // ── Geração do Link (SOLUÇÃO DO BUG C:\) ──────────
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host   = $_SERVER['HTTP_HOST'] ?? 'localhost';
        
        // SCRIPT_NAME traz o caminho da URL (ex: /pets4pet/backend/cad.php)
        // Forçamos a barra padrão web para evitar conflito no Windows
        $scriptPath = str_replace('\\', '/', $_SERVER['SCRIPT_NAME']);
        $backendDir = str_replace('/cad.php', '', $scriptPath);
        
        $link = "{$scheme}://{$host}{$backendDir}/verificar.php?token=" . urlencode($token);

        // ── Conteúdo do E-mail ───────────────────────────
        $mail->isHTML(true);
        $mail->Subject = '🐾 Confirme seu e-mail — Pets4Pet';

        $mail->Body = "
        <div style='font-family:sans-serif; max-width:520px; margin:0 auto; background:#F8FAFC; padding:32px; border-radius:16px;'>
          <h2 style='color:#1B4B6B;'>Olá, {$nome}! 🐾</h2>
          <p style='color:#475569;'>Clique no botão abaixo para confirmar seu e-mail e ativar sua conta no Pets4Pet:</p>
          <div style='text-align: center; margin: 30px 0;'>
              <a href='{$link}' style='background:#F5C400; color:#0F2E42; font-weight:700; padding:15px 35px; border-radius:50px; text-decoration:none; display:inline-block;'>✅ Confirmar meu e-mail</a>
          </div>
          <p style='color:#94A3B8; font-size:12px;'>Se o botão não funcionar, copie este link: <br> <a href='{$link}'>{$link}</a></p>
        </div>";

        $mail->AltBody = "Olá {$nome}, confirme seu e-mail no link: {$link}";

        return $mail->send();
    } catch (Exception $e) {
        error_log("[Pets4Pet Mailer] Erro: {$mail->ErrorInfo}");
        return false;
    }
}