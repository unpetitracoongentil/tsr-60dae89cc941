/**
 * Hand the finished PDF to the platform.
 *
 * `env` is injected so this is testable without a browser:
 *   nav.canShare(data) -> boolean, nav.share(data) -> Promise
 *   download(name, bytes), makeFile(bytes, name) -> File
 *
 * Returns 'shared' | 'cancelled' | 'downloaded'.
 */
export async function deliver(bytes, filename, env) {
  const file = env.makeFile(bytes, filename);

  if (env.nav.canShare({ files: [file] })) {
    try {
      await env.nav.share({ files: [file], title: filename });
      return 'shared';
    } catch (err) {
      // The user dismissing the sheet is a decision, not a failure — quietly
      // downloading behind their back would be wrong.
      if (err?.name === 'AbortError') return 'cancelled';
    }
  }

  env.download(filename, bytes);
  return 'downloaded';
}

/** The real browser environment. */
export function browserEnv() {
  return {
    nav: {
      canShare: (data) => Boolean(navigator.canShare?.(data)),
      share: (data) => navigator.share(data),
    },
    makeFile: (bytes, name) =>
      new File([bytes], name, { type: 'application/pdf' }),
    download: (name, bytes) => {
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
}
