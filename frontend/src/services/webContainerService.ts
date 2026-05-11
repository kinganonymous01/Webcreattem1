import { WebContainer } from '@webcontainer/api';

let webcontainerInstance: WebContainer | null = null;
let bootPromise:          Promise<WebContainer> | null = null;
let devProcess:           any                 = null;
let backendProcess:       any                 = null;
let previewUrl:           string | null       = null;

type PrerequisiteStatus = PreviewPrerequisite['status'];
type PrerequisiteReporter = (step: PreviewPrerequisite) => void;

const PREREQUISITES: Omit<PreviewPrerequisite, 'status'>[] = [
  { id: 'mount-files',       label: 'Mount generated files' },
  { id: 'backend-install',   label: 'Install backend dependencies (npm install)' },
  { id: 'backend-dev',       label: 'Start backend dev server (npm run dev)' },
  { id: 'frontend-install',  label: 'Install frontend dependencies (npm install)' },
  { id: 'frontend-dev',      label: 'Start frontend dev server (npm run dev)' },
  { id: 'preview-ready',     label: 'Wait for preview server' }
];

export function getPrerequisiteTemplate(): PreviewPrerequisite[] {
  return PREREQUISITES.map(step => ({ ...step, status: 'pending' }));
}

function reportStep(
  onStep: PrerequisiteReporter | undefined,
  id: string,
  status: PrerequisiteStatus
): void {
  const step = PREREQUISITES.find(item => item.id === id);
  if (step) onStep?.({ ...step, status });
}

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

export async function bootContainer(): Promise<WebContainer> {
  if (webcontainerInstance) return webcontainerInstance;
  if (!bootPromise) {
    bootPromise = WebContainer.boot().then(instance => {
      webcontainerInstance = instance;
      return instance;
    }).catch(err => {
      bootPromise = null;
      throw err;
    });
  }
  return bootPromise;
}

async function runProcess(
  command: string,
  args: string[],
  cwd: string,
  logPrefix: string
): Promise<any> {
  const instance = await bootContainer();
  const proc = await instance.spawn(command, args, { cwd });
  proc.output.pipeTo(new WritableStream({
    write(data) { console.log(`[${logPrefix}]`, data); }
  }));
  return proc;
}

async function waitForPreview(): Promise<string> {
  const instance = await bootContainer();

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('WebContainer server-ready timeout after 30s'));
    }, 30_000);

    const unsubscribe = instance.on('server-ready', (port, serverUrl) => {
      if (port === 5173) {
        clearTimeout(timeout);
        unsubscribe();
        resolve(serverUrl);
      }
    });
  });
}

export async function startContainer(
  files: FileItem[],
  onStep?: PrerequisiteReporter
): Promise<string> {
  if (files.length === 0) {
    throw new Error('Cannot run WebContainer npm commands before project files exist');
  }

  if (webcontainerInstance !== null && previewUrl !== null) {
    return previewUrl;
  }

  const instance = await bootContainer();

  reportStep(onStep, 'mount-files', 'running');
  const mountStructure = buildMountStructure(files);
  await instance.mount(mountStructure as any);
  reportStep(onStep, 'mount-files', 'complete');

  reportStep(onStep, 'backend-install', 'running');
  const backendInstall = await instance.spawn('npm', ['install'], {
    cwd: '/backend'
  });
  const backendInstallExit = await backendInstall.exit;
  if (backendInstallExit !== 0) {
    reportStep(onStep, 'backend-install', 'error');
    throw new Error('Backend npm install failed');
  }
  reportStep(onStep, 'backend-install', 'complete');

  reportStep(onStep, 'backend-dev', 'running');
  backendProcess = await runProcess('npm', ['run', 'dev'], '/backend', 'backend');
  reportStep(onStep, 'backend-dev', 'complete');

  reportStep(onStep, 'frontend-install', 'running');
  const frontendInstall = await instance.spawn('npm', ['install'], {
    cwd: '/frontend'
  });
  const frontendInstallExit = await frontendInstall.exit;
  if (frontendInstallExit !== 0) {
    reportStep(onStep, 'frontend-install', 'error');
    throw new Error('Frontend npm install failed');
  }
  reportStep(onStep, 'frontend-install', 'complete');

  reportStep(onStep, 'frontend-dev', 'running');
  devProcess = await runProcess('npm', ['run', 'dev'], '/frontend', 'frontend');
  reportStep(onStep, 'frontend-dev', 'complete');

  reportStep(onStep, 'preview-ready', 'running');
  const url = await waitForPreview();
  reportStep(onStep, 'preview-ready', 'complete');

  previewUrl = url;
  return url;
}

export async function restart(
  files: FileItem[],
  onStep?: PrerequisiteReporter
): Promise<string> {
  if (files.length === 0) {
    throw new Error('Cannot restart WebContainer before project files exist');
  }

  if (!webcontainerInstance) {
    return startContainer(files, onStep);
  }

  if (devProcess) {
    devProcess.kill();
    devProcess = null;
  }

  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }

  previewUrl = null;

  try {
    await webcontainerInstance.fs.rm('/frontend', { recursive: true });
  } catch { }

  try {
    await webcontainerInstance.fs.rm('/backend', { recursive: true });
  } catch { }

  return startContainer(files, onStep);
}

export function cleanup(): void {
  const instance      = webcontainerInstance;
  const proc          = devProcess;
  const backendProc   = backendProcess;

  webcontainerInstance = null;
  bootPromise          = null;
  devProcess           = null;
  backendProcess       = null;
  previewUrl           = null;

  if (proc) { try { proc.kill(); } catch {} }
  if (backendProc) { try { backendProc.kill(); } catch {} }
  if (instance) {
    try { instance.teardown(); } catch (err) { console.error('WebContainer teardown error:', err); }
  }
}
