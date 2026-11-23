import { homeDataState, notificationAction, screenTimeAction } from "../permissions";

describe("permissions", () => {
  test("screen time: request first, re-request after denial, then Settings", () => {
    expect(screenTimeAction("notDetermined", false).kind).toBe("request");
    expect(screenTimeAction("denied", false).kind).toBe("request");
    expect(screenTimeAction("denied", true).kind).toBe("openSettings");
    expect(screenTimeAction("approved", true).kind).toBe("none");
    // Not read yet: no prompt, no button (the read is asynchronous)
    expect(screenTimeAction("checking", false).kind).toBe("none");
  });

  test("notifications: denied can only be changed in Settings", () => {
    expect(notificationAction("undetermined").kind).toBe("request");
    expect(notificationAction("denied").kind).toBe("openSettings");
    expect(notificationAction("granted").kind).toBe("none");
  });

  test("home never shows usage without Screen Time permission", () => {
    expect(homeDataState("denied")).toBe("needsScreenTimePermission");
    expect(homeDataState("notDetermined")).toBe("needsScreenTimePermission");
    expect(homeDataState("unavailable")).toBe("screenTimeUnavailable");
    expect(homeDataState("approved")).toBe("ready");
    expect(homeDataState("checking")).toBe("checking");
  });
});
