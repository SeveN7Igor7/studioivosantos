import { spawn } from 'child_process';

const npmProcess = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

npmProcess.on('close', (code) => {
  console.log(`Processo npm finalizou com código ${code}`);
});
