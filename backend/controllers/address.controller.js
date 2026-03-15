import Address from '../models/Address.js';
import AppError from '../utils/AppError.js';
import catchAsync from '../utils/catchAsync.js';

// ===== GET ALL ADDRESSES =====
export const getAddresses = catchAsync(async (req, res, next) => {
  const addresses = await Address.find({ customer: req.profileId }).sort({ isDefault: -1 });

  res.status(200).json({
    success: true,
    count: addresses.length,
    addresses,
  });
});

// ===== ADD ADDRESS =====
export const addAddress = catchAsync(async (req, res, next) => {
  const { label, street, city, state, pincode, coordinates, isDefault } = req.body;

  // If this is set as default, unset all others
  if (isDefault) {
    await Address.updateMany(
      { customer: req.profileId },
      { isDefault: false }
    );
  }

  // If this is the first address, make it default
  const count = await Address.countDocuments({ customer: req.profileId });

  const address = await Address.create({
    customer: req.profileId,
    label,
    street,
    city,
    state,
    pincode,
    coordinates,
    isDefault: isDefault || count === 0, // first address is always default
  });

  res.status(201).json({
    success: true,
    address,
  });
});

// ===== UPDATE ADDRESS =====
export const updateAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findOne({
    _id: req.params.id,
    customer: req.profileId,
  });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  const { label, street, city, state, pincode, coordinates } = req.body;

  if (label) address.label = label;
  if (street) address.street = street;
  if (city) address.city = city;
  if (state) address.state = state;
  if (pincode) address.pincode = pincode;
  if (coordinates) address.coordinates = coordinates;

  await address.save();

  res.status(200).json({
    success: true,
    address,
  });
});

// ===== DELETE ADDRESS =====
export const deleteAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findOne({
    _id: req.params.id,
    customer: req.profileId,
  });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  const wasDefault = address.isDefault;
  await address.deleteOne();

  // If deleted address was default, set the first remaining as default
  if (wasDefault) {
    const firstAddress = await Address.findOne({ customer: req.profileId });
    if (firstAddress) {
      firstAddress.isDefault = true;
      await firstAddress.save();
    }
  }

  res.status(200).json({
    success: true,
    message: 'Address deleted',
  });
});

// ===== SET DEFAULT ADDRESS =====
export const setDefaultAddress = catchAsync(async (req, res, next) => {
  const address = await Address.findOne({
    _id: req.params.id,
    customer: req.profileId,
  });

  if (!address) {
    return next(new AppError('Address not found', 404));
  }

  // Unset all others
  await Address.updateMany(
    { customer: req.profileId },
    { isDefault: false }
  );

  address.isDefault = true;
  await address.save();

  res.status(200).json({
    success: true,
    address,
  });
});
