import { prisma } from "@/lib/prisma";

const REGISTRATION_LOCKED_KEY = "player_registration_locked";

export class SystemSettingsService {
  /**
   * Check if player registration is globally locked across the platform.
   */
  public static async isRegistrationLocked(): Promise<boolean> {
    try {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: REGISTRATION_LOCKED_KEY },
      });
      return setting?.value === "true";
    } catch (err) {
      console.error("Failed to check registration lock setting:", err);
      return false;
    }
  }

  /**
   * Set the player registration global lock state.
   */
  public static async setRegistrationLocked(locked: boolean): Promise<boolean> {
    const value = locked ? "true" : "false";
    await prisma.systemSetting.upsert({
      where: { key: REGISTRATION_LOCKED_KEY },
      update: { value },
      create: { key: REGISTRATION_LOCKED_KEY, value },
    });
    return locked;
  }
}
