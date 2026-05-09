const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// --- GLOBAL CONSTANTS ---
// Average Global Grid Carbon Intensity (grams of CO2 per kWh)
// Note: This can be made dynamic later using APIs based on user's country.
const GLOBAL_CARBON_INTENSITY = 450; 

// Estimated Phantom Load in Watts per device type
const PHANTOM_LOAD_WATTS = {
  'mobile': 0.5,    // Phone charger left plugged in
  'laptop': 2.5,    // Laptop adapter without load
  'desktop': 5.0,   // PC in shutdown state but still plugged to wall
  'tv': 15.0        // Android TV in standby mode
};

/**
 * Calculate and log the sustainability impact when a device is unplugged.
 * * @param {string} deviceId - The UUID of the device
 * @param {number} unplugDurationHours - How long the device was kept unplugged
 * @param {string} actionType - 'unplugged_manual' or 'auto_cutoff'
 * @returns {Object} The saved log data
 */
async function logSustainabilityImpact(deviceId, unplugDurationHours, actionType) {
  try {
    // 1. Fetch the device to get its type and associated user
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { user: true }
    });

    if (!device) throw new Error("Device not found in the database.");

    // 2. Calculate Energy Saved (Watt-hours)
    // Formula: Phantom Load (Watts) * Time (Hours)
    const load = PHANTOM_LOAD_WATTS[device.deviceType] || 1.0;
    const energySavedWh = load * unplugDurationHours;

    // 3. Calculate Carbon Reduced (grams of CO2)
    // Formula: (Wh / 1000) * Carbon Intensity
    const carbonSaved = (energySavedWh / 1000) * GLOBAL_CARBON_INTENSITY;

    // 4. Save the impact log to the database
    const log = await prisma.sustainabilityLog.create({
      data: {
        deviceId: device.id,
        actionType: actionType,
        energySavedWh: energySavedWh,
        carbonSaved: carbonSaved
      }
    });

    // 5. Update user's global Eco Points (Gamification)
    // Rule: 1 point for every 10 Wh saved. Minimum 1 point for the effort.
    const pointsEarned = Math.floor(energySavedWh / 10);
    
    await prisma.user.update({
      where: { id: device.userId },
      data: {
        totalEcoPoints: {
          increment: pointsEarned > 0 ? pointsEarned : 1
        }
      }
    });

    console.log(`[Neoxy Impact] Saved ${energySavedWh.toFixed(2)} Wh and ${carbonSaved.toFixed(2)}g CO2.`);
    return log;

  } catch (error) {
    console.error("[Neoxy Error] Failed to log sustainability impact:", error);
    throw error;
  }
}

module.exports = {
  logSustainabilityImpact
};