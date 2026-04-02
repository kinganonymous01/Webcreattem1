import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let devProcess:           any                 = null;
let backendProcess:       any                 = null;
let previewUrl:           string | null       = null;

function buildMountStructure(files: FileItem[]): object {
  const root: any = {};
  for (const file of files) {
    const parts = file.path.split('/');
    let node = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) {
        node[parts[i]] = { directory: {} };
      }
      node = node[parts[i]].directory;
    }
    node[parts[parts.length - 1]] = { file: { contents: file.content } };
  }
  return root;
}

export async function startContainer(files: FileItem[]): Promise<string> {
  if (webcontainerInstance !== null && previewUrl !== null) {
    return previewUrl;
  }

  if (webcontainerInstance !== null && previewUrl === null) {
    const stale = webcontainerInstance;
    webcontainerInstance = null;
    devProcess           = null;
    backendProcess       = null;
    try {
      stale.teardown();
    } catch (teardownErr) {
      console.error('Failed to teardown stale WebContainer:', teardownErr);
    }
  }

  webcontainerInstance = await WebContainer.boot();

  const mountStructure = buildMountStructure(files);
  await webcontainerInstance.mount(mountStructure as any);

  const backendInstall = await webcontainerInstance.spawn('npm', ['install'], {
    cwd: '/backend'
  });
  const backendInstallExit = await backendInstall.exit;
  if (backendInstallExit !== 0) {
    throw new Error('Backend npm install failed');
  }

  backendProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], {
    cwd: '/backend'
  });
  backendProcess.output.pipeTo(new WritableStream({
    write(data) { console.log('[backend]', data); }
  }));

  const frontendInstall = await webcontainerInstance.spawn('npm', ['install'], {
    cwd: '/frontend'
  });
  const frontendInstallExit = await frontendInstall.exit;
  if (frontendInstallExit !== 0) {
    throw new Error('Frontend npm install failed');
  }

  devProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], {
    cwd: '/frontend'
  });
  devProcess.output.pipeTo(new WritableStream({
    write(data) { console.log('[frontend]', data); }
  }));

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('WebContainer server-ready timeout after 30s'));
    }, 30_000);

    const unsubscribe = webcontainerInstance!.on('server-ready', (port, serverUrl) => {
      if (port === 5173) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(serverUrl);
      }
    });
  });

  previewUrl = url;
  return url;
}

export async function restart(files: FileItem[]): Promise<string> {
  if (!webcontainerInstance) {
    return startContainer(files);
  }

  if (devProcess) {
    devProcess.kill();
    devProcess = null;
  }

  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }

  try {
    await webcontainerInstance.fs.rm('/frontend/src', { recursive: true });
  } catch { }

  try {
    await webcontainerInstance.fs.rm('/backend/src', { recursive: true });
  } catch { }

  const mountStructure = buildMountStructure(files);
  await webcontainerInstance.mount(mountStructure as any);

  const backendInstall = await webcontainerInstance.spawn('npm', ['install'], { cwd: '/backend' });
  await backendInstall.exit;

  backendProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], { cwd: '/backend' });
  backendProcess.output.pipeTo(new WritableStream({ write(data) { console.log('[backend]', data); } }));

  const frontendInstall = await webcontainerInstance.spawn('npm', ['install'], { cwd: '/frontend' });
  await frontendInstall.exit;

  devProcess = await webcontainerInstance.spawn('npm', ['run', 'dev'], { cwd: '/frontend' });
  devProcess.output.pipeTo(new WritableStream({ write(data) { console.log('[frontend]', data); } }));

  previewUrl = null;

  const url = await new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Restart timeout'));
    }, 30_000);

    const unsubscribe = webcontainerInstance!.on('server-ready', (port, serverUrl) => {
      if (port === 5173) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(serverUrl);
      }
    });
  });

  previewUrl = url;
  return url;
}

export function cleanup(): void {
  const instance      = webcontainerInstance;
  const proc          = devProcess;
  const backendProc   = backendProcess;

  webcontainerInstance = null;
  devProcess           = null;
  backendProcess       = null;
  previewUrl           = null;

  if (proc) { try { proc.kill(); } catch {} }
  if (backendProc) { try { backendProc.kill(); } catch {} }
  if (instance) {
    try { instance.teardown(); } catch (err) { console.error('WebContainer teardown error:', err); }
  }
}
