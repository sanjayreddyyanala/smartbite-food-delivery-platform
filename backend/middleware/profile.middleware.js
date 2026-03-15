import CustomerProfile from '../models/CustomerProfile.js';
import DeliveryProfile from '../models/DeliveryProfile.js';
import NGOProfile from '../models/NGOProfile.js';
import Restaurant from '../models/Restaurant.js';

/**
 * Middleware that attaches the role-specific profile to req.profile
 * after authentication. This avoids repeated profile lookups in controllers.
 *
 * Must be used AFTER protect middleware.
 */
export const attachProfile = (role) => async (req, res, next) => {
  try {
    let profile;

    switch (role) {
      case 'customer':
        profile = await CustomerProfile.findOne({ user: req.user._id });
        break;
      case 'delivery':
        profile = await DeliveryProfile.findOne({ user: req.user._id });
        break;
      case 'ngo':
        profile = await NGOProfile.findOne({ user: req.user._id });
        break;
      case 'restaurant':
        profile = await Restaurant.findOne({ owner: req.user._id });
        break;
      default:
        break;
    }

    if (profile) {
      req.profile = profile;
      req.profileId = profile._id;
    }

    next();
  } catch (err) {
    next(err);
  }
};
