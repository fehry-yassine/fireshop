import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: Transporter | null;
  private readonly from: string;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT ?? '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.from = process.env.SMTP_FROM ?? 'FireShop <noreply@fireshop.com>';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
    } catch (error) {
      console.error('[EmailService] Failed to send email to', to, ':', error);
    }
  }

  async sendOrderPlacedEmail(
    buyerEmail: string,
    orderId: string,
    storeName: string,
    total: number,
  ): Promise<void> {
    const subject = 'Votre commande FireShop a bien été reçue';
    const html = this.template(
      'Commande confirmée',
      `<p>Merci pour votre commande auprès de <strong>${this.escape(storeName)}</strong>.</p>
       <p>Montant total : <strong>${total.toFixed(2)} TND</strong></p>
       <p>Votre vendeur va préparer votre commande et vous contacter pour la livraison en espèces (COD).</p>
       <p style="margin-top:20px">Référence commande : <code>${this.escape(orderId)}</code></p>`,
    );

    await this.sendMail(buyerEmail, subject, html);
  }

  async sendOrderStatusEmail(
    buyerEmail: string,
    orderId: string,
    nextStatus: string,
  ): Promise<void> {
    const isCancelled = nextStatus === 'CANCELLED';
    const subject = isCancelled
      ? 'Votre commande FireShop a été annulée'
      : 'Mise à jour de votre commande FireShop';
    const statusLabel = this.statusLabel(nextStatus);
    const html = this.template(
      isCancelled ? 'Commande annulée' : 'Statut mis à jour',
      `<p>${isCancelled
        ? 'Votre commande a été annulée.'
        : `Le statut de votre commande est maintenant : <strong>${this.escape(statusLabel)}</strong>.`
      }</p>
       <p style="margin-top:20px">Référence commande : <code>${this.escape(orderId)}</code></p>`,
    );

    await this.sendMail(buyerEmail, subject, html);
  }

  async sendVendorApprovedEmail(
    vendorEmail: string,
    storeName: string,
  ): Promise<void> {
    const subject = 'Votre candidature vendeur FireShop a été approuvée';
    const html = this.template(
      'Candidature approuvée 🎉',
      `<p>Félicitations ! Votre boutique <strong>${this.escape(storeName)}</strong> a été approuvée.</p>
       <p>Vous pouvez maintenant vous connecter et commencer à publier vos produits.</p>`,
    );

    await this.sendMail(vendorEmail, subject, html);
  }

  async sendVendorRejectedEmail(
    vendorEmail: string,
    storeName: string,
    adminNote: string,
  ): Promise<void> {
    const subject = 'Mise à jour de votre candidature vendeur FireShop';
    const html = this.template(
      'Candidature non approuvée',
      `<p>Votre candidature pour la boutique <strong>${this.escape(storeName)}</strong> n'a pas été approuvée.</p>
       ${adminNote
         ? `<p>Motif : <em>${this.escape(adminNote)}</em></p>`
         : ''
       }
       <p>Vous pouvez soumettre une nouvelle candidature avec les informations corrigées.</p>`,
    );

    await this.sendMail(vendorEmail, subject, html);
  }

  async sendProductApprovedEmail(
    vendorEmail: string,
    productName: string,
  ): Promise<void> {
    const subject = `Produit approuvé : ${productName}`;
    const html = this.template(
      'Produit approuvé',
      `<p>Votre produit <strong>${this.escape(productName)}</strong> a été approuvé et est maintenant visible sur FireShop.</p>`,
    );

    await this.sendMail(vendorEmail, subject, html);
  }

  async sendProductRejectedEmail(
    vendorEmail: string,
    productName: string,
    reason: string,
  ): Promise<void> {
    const subject = `Produit non approuvé : ${productName}`;
    const html = this.template(
      'Produit non approuvé',
      `<p>Votre produit <strong>${this.escape(productName)}</strong> n'a pas été approuvé.</p>
       <p>Motif : <em>${this.escape(reason)}</em></p>
       <p>Veuillez corriger les informations et soumettre à nouveau.</p>`,
    );

    await this.sendMail(vendorEmail, subject, html);
  }

  private template(heading: string, content: string): string {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${this.escape(heading)}</title>
  <style>
    body{margin:0;padding:24px;background:#f8fafc;font-family:Arial,Helvetica,sans-serif}
    .card{max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 4px 24px rgba(15,23,42,.08)}
    .logo{font-size:22px;font-weight:800;color:#ff6a2d;margin-bottom:24px;letter-spacing:-.5px}
    h1{margin:0 0 16px;font-size:20px;color:#0f172a}
    p{margin:0 0 12px;font-size:15px;color:#475569;line-height:1.6}
    code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:13px;color:#0f172a}
    .footer{margin-top:32px;font-size:12px;color:#94a3b8;border-top:1px solid #f1f5f9;padding-top:16px}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">🔥 FireShop</div>
    <h1>${this.escape(heading)}</h1>
    ${content}
    <div class="footer">Vous recevez cet email en tant qu'utilisateur FireShop. Ne pas répondre à cet email.</div>
  </div>
</body>
</html>`;
  }

  private statusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'En attente',
      CONFIRMED: 'Confirmée',
      SHIPPED: 'En cours de livraison',
      DELIVERED: 'Livrée',
      RETURNED: 'Retournée',
      CANCELLED: 'Annulée',
    };

    return labels[status] ?? status;
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
