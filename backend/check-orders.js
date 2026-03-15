import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/food_delivery')
  .then(async () => {
    const Order = (await import('./models/Order.js')).default;
    const orders = await Order.find().populate('restaurant').sort({createdAt: -1}).limit(5);
    orders.forEach(o => {
      console.log('Order ID:', o._id.toString());
      console.log('Restaurant Coords:', JSON.stringify(o.restaurant?.address?.coordinates));
      console.log('Delivery Coords:', JSON.stringify(o.deliveryAddress?.coordinates));
    });
    mongoose.disconnect();
  })
  .catch(console.error);
