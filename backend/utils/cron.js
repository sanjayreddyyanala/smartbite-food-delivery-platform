import cron from 'node-cron';
import Order from '../models/Order.js';
import DeliveryProfile from '../models/DeliveryProfile.js';
import { ORDER_STATUS } from '../constants/index.js';
import { emitOrderStatusChanged, emitAvailableOrdersUpdate } from '../sockets/order.socket.js';
import { computeAllPreferences, computePopularItems } from '../services/preferenceComputer.js';

export const startCronJobs = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 1 * 60 * 1000);

      // Find idle orders
      const idleOrders = await Order.find({
        status: { $in: [ORDER_STATUS.READY, ORDER_STATUS.PICKED_UP] },
        deliveryPartner: { $exists: true, $ne: null },
        updatedAt: { $lt: oneHourAgo },
      });

      if (idleOrders.length === 0) return;

      console.log(`[Cron] Found ${idleOrders.length} idle delivery orders. Revoking assignments...`);

      for (const order of idleOrders) {
        const previousPartnerId = order.deliveryPartner;

        // Reset Order
        order.deliveryPartner = null;
        order.pickupCode = null;
        if (order.status === ORDER_STATUS.PICKED_UP) {
          order.status = ORDER_STATUS.READY;
        }
        await order.save();

        // Free the delivery partner
        if (previousPartnerId) {
          await DeliveryProfile.findByIdAndUpdate(previousPartnerId, {
            currentOrder: null,
            isAvailable: true,
          });
        }

        // Notify Restaurant & Partners
        emitOrderStatusChanged(order._id.toString(), order.status);
      }

      emitAvailableOrdersUpdate();
      console.log('[Cron] Idle deliveries revoked successfully.');

    } catch (error) {
      console.error('[Cron] Error running idle delivery revocation job:', error);
    }
  });

  // Run daily at 3 AM — recompute customer preferences & popular items
  cron.schedule('0 3 * * *', async () => {
    try {
      console.log('[Cron] Starting daily preference & popularity computation...');
      await computeAllPreferences();
      await computePopularItems();
      console.log('[Cron] Daily computation complete.');
    } catch (error) {
      console.error('[Cron] Error running daily preference computation:', error);
    }
  });

  console.log('⏳ Cron jobs initialized');
};
