import nodemailer from 'nodemailer';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Food Delivery" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};

// ===== Email Templates =====

export const sendPasswordResetEmail = async (email, name, resetURL) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>Hi ${name},</p>
      <p>You requested a password reset. Click the button below to reset your password:</p>
      <a href="${resetURL}" 
         style="display: inline-block; padding: 12px 24px; background-color: #f97316; 
                color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #666; font-size: 14px;">
        This link is valid for <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Food Delivery App</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Password Reset — Food Delivery',
    html,
  });
};

export const sendDeliveryOtpEmail = async (email, name, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Delivery OTP</h2>
      <p>Hi ${name},</p>
      <p>Your delivery partner has picked up your order. Share this OTP with them upon delivery:</p>
      <div style="font-size: 32px; font-weight: bold; color: #f97316; 
                  letter-spacing: 8px; text-align: center; padding: 20px; 
                  background: #fff7ed; border-radius: 8px; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 14px;">
        This OTP is valid for <strong>30 minutes</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Food Delivery App</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Your Delivery OTP — Food Delivery',
    html,
  });
};

export const sendNgoClaimEmail = async (email, ngoName, foodDescription, otp) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Leftover Food Claimed</h2>
      <p>Hi ${ngoName},</p>
      <p>You have successfully claimed the following leftover food:</p>
      <blockquote style="border-left: 4px solid #f97316; padding: 8px 16px; 
                         background: #fff7ed; margin: 16px 0;">
        ${foodDescription}
      </blockquote>
      <p>Show this OTP to the restaurant staff when you pick up the food:</p>
      <div style="font-size: 32px; font-weight: bold; color: #f97316; 
                  letter-spacing: 8px; text-align: center; padding: 20px; 
                  background: #fff7ed; border-radius: 8px; margin: 16px 0;">
        ${otp}
      </div>
      <p style="color: #666; font-size: 14px;">
        This OTP is valid for <strong>24 hours</strong>.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Food Delivery App</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: 'Food Claimed — Pickup OTP Inside',
    html,
  });
};

export const sendLeftoverFoodAlertEmail = async (email, ngoName, restaurantName, foodDescription, quantity) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">New Leftover Food Available</h2>
      <p>Hi ${ngoName},</p>
      <p><strong>${restaurantName}</strong> has posted leftover food:</p>
      <blockquote style="border-left: 4px solid #22c55e; padding: 8px 16px; 
                         background: #f0fdf4; margin: 16px 0;">
        ${foodDescription}${quantity ? ` — <strong>${quantity}</strong>` : ''}
      </blockquote>
      <p>Log in to your dashboard to claim it before it's gone!</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px;">Food Delivery App</p>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `Leftover Food from ${restaurantName} — Claim Now`,
    html,
  });
};

export const sendOrderStatusEmail = async (email, customerName, orderId, restaurantName, status) => {
  const statusConfig = {
    accepted: { icon: '✅', title: 'Order Accepted!', color: '#22c55e', message: 'Great news! The restaurant has accepted your order and will start preparing it shortly.' },
    preparing: { icon: '👨‍🍳', title: 'Order Being Prepared', color: '#f97316', message: 'Your order is now being prepared by the restaurant.' },
    ready: { icon: '📦', title: 'Order Ready for Pickup', color: '#3b82f6', message: 'Your order is ready and waiting for a delivery partner to pick it up.' },
    picked_up: { icon: '🚴', title: 'Order Picked Up!', color: '#8b5cf6', message: 'Your order has been picked up by the delivery partner and is on its way to you!' },
    delivered: { icon: '🎉', title: 'Order Delivered!', color: '#22c55e', message: 'Your order has been delivered. Enjoy your meal!' },
  };

  const cfg = statusConfig[status];
  if (!cfg) return; // Unknown status, skip

  const shortId = orderId.toString().slice(-8).toUpperCase();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="text-align: center; padding: 24px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 12px 12px 0 0;">
        <span style="font-size: 48px;">${cfg.icon}</span>
        <h2 style="color: #fff; margin: 12px 0 4px;">${cfg.title}</h2>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Order #${shortId}</p>
      </div>
      <div style="padding: 24px; background: #fff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #333;">Hi ${customerName},</p>
        <p style="color: #555;">${cfg.message}</p>
        <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid ${cfg.color};">
          <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Restaurant:</strong> ${restaurantName}</p>
          <p style="margin: 4px 0 0; font-size: 14px; color: #64748b;"><strong>Status:</strong> <span style="color: ${cfg.color}; font-weight: 600;">${cfg.title}</span></p>
        </div>
        ${status === 'delivered' ? '<p style="color: #555;">Thank you for ordering with FoodDash! We hope you enjoy your meal. 🍽️</p>' : ''}
      </div>
      <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #999; font-size: 12px; margin: 0;">FoodDash — Food Delivery App</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `${cfg.icon} ${cfg.title} — Order #${shortId}`,
    html,
  });
};

// ===== GROUP ORDER INVITE =====
export const sendGroupInviteEmail = async (email, hostName, restaurantName, joinLink) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f97316, #fb923c); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 22px;">🍕 You're Invited to a Group Order!</h1>
      </div>
      <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #333; font-size: 16px;">Hey there!</p>
        <p style="color: #555; font-size: 14px;">
          <strong>${hostName}</strong> has invited you to join a group order
          ${restaurantName ? ` from <strong>${restaurantName}</strong>` : ''} on FoodDash.
        </p>
        <p style="color: #555; font-size: 14px;">
          Click the button below to join the group, add your items, and order together!
        </p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${joinLink}" style="display: inline-block; padding: 12px 32px; background: #f97316; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px;">
            Join Group Order
          </a>
        </div>
        <p style="color: #999; font-size: 12px; text-align: center;">
          Or copy this link: <a href="${joinLink}" style="color: #f97316;">${joinLink}</a>
        </p>
      </div>
      <div style="text-align: center; padding: 16px; background: #f8fafc; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="color: #999; font-size: 12px; margin: 0;">FoodDash — Food Delivery App</p>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `🍕 ${hostName} invited you to a Group Order!`,
    html,
  });
};

export default sendEmail;
