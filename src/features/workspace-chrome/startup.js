// One bounded local repair per mounted brand; no watcher, service or focus changes.
import { appHome, exec, shared, setShared } from "./host.js";

export function restoreFrames(cx) {
  if (String(shared("layout") ?? "").toLowerCase() !== "custom") return;
  cx.spawn(async cx => {
    let error = "Frame startup repair could not start.";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (String(shared("layout") ?? "").toLowerCase() !== "custom") return;
      try {
        const home = appHome();
        const result = await exec("node", [`${home}/.customizations/runtime/scripts/startup-frames.mjs`, home], { on: null, timeout: 15000 });
        if (result.code === 0) {
          const status = JSON.parse(result.stdout);
          setShared("custom.frame-startup", status);
          return; // Conflicts are reported, never retried/overwritten.
        }
        error = result.stderr.trim() || "Frame startup repair is busy or unavailable.";
      } catch { error = "Frame startup repair could not run. Check local Node and the Custom bundle."; }
      if (attempt < 2) await cx.sleep(1000);
    }
    setShared("custom.frame-startup", { ok: false, error });
  });
}
