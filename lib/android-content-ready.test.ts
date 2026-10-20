import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("android-content-ready", () => {
  beforeEach(() => {
    vi.resetModules();
    const store = new Map<string, string>();
    const docEl = {
      classList: {
        contains: (c: string) => c === "never",
        toggle: () => {},
        add: () => {},
        remove: () => {},
      },
      attrs: {} as Record<string, string>,
      setAttribute(name: string, value: string) {
        this.attrs[name] = value;
      },
      getAttribute(name: string) {
        return this.attrs[name] ?? null;
      },
      removeAttribute(name: string) {
        delete this.attrs[name];
      },
    };

    (globalThis as { window?: unknown }).window = {
      AwpAndroid: {
        getVersionName: () => "1.11.5",
        getVersionCode: () => 41,
        checkUpdate: () => {},
        notifyContentReady: vi.fn(),
      },
    };
    (globalThis as { document?: unknown }).document = {
      documentElement: docEl,
      getElementById: () => null,
    };
    (globalThis as { sessionStorage?: Storage }).sessionStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { document?: unknown }).document;
  });

  it("notifyFirstScreenContentReady ustawia atrybut, woła most i odblokowuje preloadery", async () => {
    const mod = await import("@/lib/android-content-ready");
    mod.resetAndroidContentReadyStateForTests();

    expect(mod.shouldSuppressStartupRoutePreloader()).toBe(true);
    mod.notifyFirstScreenContentReady();

    const docEl = document.documentElement as HTMLElement & {
      getAttribute: (n: string) => string | null;
    };
    expect(docEl.getAttribute("data-awp-content-ready")).toBe("1");
    expect(window.AwpAndroid?.notifyContentReady).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem("awp-android-route-preloader-ok")).toBe("1");
    expect(mod.shouldSuppressStartupRoutePreloader()).toBe(false);

    mod.notifyFirstScreenContentReady();
    expect(window.AwpAndroid?.notifyContentReady).toHaveBeenCalledTimes(1);
  });
});
